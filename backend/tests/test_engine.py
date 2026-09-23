"""Unit tests for the deterministic engine (no HTTP, no LLM)."""

import pytest

from app.models.schemas import Selection
from app.services.catalog import load_catalog
from app.services.simulation import apply_measures, best_single_swaps, simulate
from app.services.validation import availability, validate

S = Selection

DEMO = [
    S(measure_id="M7", district_id="nura"),
    S(measure_id="M8", district_id="nura"),
    S(measure_id="M10", district_id="nura"),
    S(measure_id="M12"),
    S(measure_id="M5", district_id="saryarka"),
]


def codes(selections):
    return {i.code for i in validate(selections).issues}


# --- 1-2: reference values -----------------------------------------------------

def test_01_baseline_score():
    base = simulate([]).baseline
    assert base.d_avg == pytest.approx(56.8624, abs=1e-4)
    assert base.d_min == pytest.approx(49.18, abs=1e-4)
    assert base.d_min_district == "nura"
    assert base.n_crit == 2
    assert base.score == pytest.approx(52.55728, abs=1e-3)
    # The brief's reference is off by 0.0004. Keep the specified formula and
    # dataset exact, while also satisfying its requested +/- 0.001 tolerance.
    assert base.score == pytest.approx(52.55768, abs=1e-10)
    assert round(base.score, 2) == 52.56
    assert {(c.district_id, c.indicator) for c in base.critical} == {("nura", "S1"), ("nura", "S2")}


def test_01b_baseline_district_scores():
    scores = simulate([]).baseline.district_scores
    expected = {"esil": 62.99, "almaty": 57.06, "saryarka": 54.65, "baikonur": 56.63, "nura": 49.18}
    for d, v in expected.items():
        assert round(scores[d], 2) == v


def test_02_demo_scenario():
    r = simulate(DEMO)
    assert r.valid
    assert r.spent == 95 and r.remaining == 5
    assert r.scenario.d_avg == pytest.approx(58.0776, abs=1e-3)
    assert r.scenario.d_min == pytest.approx(52.9625, abs=1e-3)
    assert r.scenario.n_crit == 0
    assert r.scenario.score == pytest.approx(56.5431, abs=1e-3)
    assert round(r.scenario.score, 2) == 56.54
    assert round(r.score_delta, 2) == 3.99


def test_order_does_not_matter():
    assert simulate(list(reversed(DEMO))).scenario.score == pytest.approx(simulate(DEMO).scenario.score)


def test_minimum_valid_scenario():
    sel = [
        S(measure_id="M9", district_id="nura"),
        S(measure_id="M11", district_id="almaty"),
        S(measure_id="M10", district_id="nura"),
        S(measure_id="M12"),
        S(measure_id="M4", district_id="saryarka"),
    ]
    report = validate(sel)
    assert report.valid, report.issues
    assert report.spent == 61
    assert simulate(sel).scenario is not None


# --- 3-8: rules ----------------------------------------------------------------

def test_03_budget_overflow():
    sel = [
        S(measure_id="M3", district_id="nura"),       # 30
        S(measure_id="M13", district_id="almaty"),    # 28
        S(measure_id="M5", district_id="saryarka"),   # 25
        S(measure_id="M7", district_id="esil"),       # 24
        S(measure_id="M10", district_id="nura"),      # 12  -> 119
    ]
    assert "budget_exceeded" in codes(sel)
    r = simulate(sel)
    assert not r.valid and r.scenario is None and r.score_delta is None


def test_04_less_than_five():
    assert "too_few_measures" in codes(DEMO[:4])
    assert not simulate(DEMO[:4]).valid


def test_05_more_than_five():
    assert "too_many_measures" in codes([*DEMO, S(measure_id="M14")])


def test_06_duplicate_measure():
    sel = [*DEMO[:4], S(measure_id="M7", district_id="esil")]
    assert "duplicate_measure" in codes(sel)


def test_07_three_from_same_category():
    sel = [
        S(measure_id="M7", district_id="nura"),
        S(measure_id="M8", district_id="nura"),
        S(measure_id="M9", district_id="esil"),
        S(measure_id="M12"),
        S(measure_id="M10", district_id="nura"),
    ]
    assert "category_limit" in codes(sel)


def test_08_m1_m3_conflict():
    sel = [
        S(measure_id="M1", district_id="almaty"),
        S(measure_id="M3", district_id="nura"),
        S(measure_id="M12"),
        S(measure_id="M10", district_id="nura"),
        S(measure_id="M9", district_id="nura"),
    ]
    assert "conflict" in codes(sel)


# --- 9-12: district-scoped conflicts ------------------------------------------

BASE_FILL = [S(measure_id="M12"), S(measure_id="M10", district_id="nura"), S(measure_id="M9", district_id="esil")]


def test_09_m4_m7_same_district_conflict():
    sel = [S(measure_id="M4", district_id="esil"), S(measure_id="M7", district_id="esil"), *BASE_FILL]
    assert "conflict_same_district" in codes(sel)


def test_10_m4_m7_different_districts_allowed():
    sel = [S(measure_id="M4", district_id="saryarka"), S(measure_id="M7", district_id="esil"), *BASE_FILL]
    assert validate(sel).valid


def test_11_m5_m13_same_district_conflict():
    sel = [S(measure_id="M5", district_id="saryarka"), S(measure_id="M13", district_id="saryarka"),
           S(measure_id="M10", district_id="nura"), S(measure_id="M9", district_id="nura"),
           S(measure_id="M11", district_id="nura")]
    assert "conflict_same_district" in codes(sel)


def test_12_m5_m13_different_districts_allowed():
    sel = [S(measure_id="M5", district_id="saryarka"), S(measure_id="M13", district_id="almaty"),
           S(measure_id="M10", district_id="nura"), S(measure_id="M9", district_id="nura"),
           S(measure_id="M11", district_id="nura")]
    assert validate(sel).valid


# --- 13-14: synergies ----------------------------------------------------------

def test_13_m10_m12_synergy():
    r = simulate(DEMO)
    nura = next(d for d in r.districts if d.id == "nura")
    # B1: 55 + 12·7/8 + 2 (synergy, not lag-scaled)
    assert nura.after["B1"] == pytest.approx(55 + 10.5 + 2)
    assert [(s.id, s.district_id) for s in r.applied_synergies] == [("SYN_M10_M12", "nura")]
    esil = next(d for d in r.districts if d.id == "esil")
    assert esil.after["B1"] == esil.before["B1"]


def test_14_m5_m6_synergy():
    sel = [S(measure_id="M5", district_id="saryarka"), S(measure_id="M6"),
           S(measure_id="M10", district_id="nura"), S(measure_id="M9", district_id="nura"),
           S(measure_id="M11", district_id="nura")]
    state, _, syn = apply_measures(sel)
    # E2 Saryarka: 40 + 14·5/8 + 3·4/8 + 2
    assert state["saryarka"]["E2"] == pytest.approx(40 + 8.75 + 1.5 + 2)
    # Other districts get only M6: E2 + 1.5
    assert state["esil"]["E2"] == pytest.approx(72 + 1.5)
    assert [s.id for s in syn] == ["SYN_M5_M6"]


def test_m1_m2_synergy():
    sel = [S(measure_id="M1", district_id="almaty"), S(measure_id="M2"),
           S(measure_id="M10", district_id="nura"), S(measure_id="M9", district_id="nura"),
           S(measure_id="M12")]
    state, _, _ = apply_measures(sel)
    # T1 Almaty: 40 + 6·6/8 + 4·6/8 + 2
    assert state["almaty"]["T1"] == pytest.approx(40 + 4.5 + 3 + 2)
    assert state["esil"]["T1"] == pytest.approx(45 + 3)


def test_no_synergy_without_pair():
    _, _, syn = apply_measures([S(measure_id="M10", district_id="nura")])
    assert syn == []


# --- 15-17: application mechanics ---------------------------------------------

def test_15_values_clipped(monkeypatch):
    catalog = load_catalog()
    m3 = catalog.initiative("M3")
    monkeypatch.setitem(m3.effects, "T1", 500)
    monkeypatch.setitem(m3.effects, "E2", -500)
    state, _, _ = apply_measures([S(measure_id="M3", district_id="nura")], catalog)
    assert state["nura"]["T1"] == 100
    assert state["nura"]["E2"] == 0


def test_15b_lag_scaling():
    _, applied, _ = apply_measures([S(measure_id="M7", district_id="nura")])
    assert applied[0].realized_share == pytest.approx(5 / 8)
    assert applied[0].realized_effects["S1"] == pytest.approx(10)


def test_16_city_measure_affects_all_districts():
    state, applied, _ = apply_measures([S(measure_id="M12")])
    base = {d.id: d.indicators for d in load_catalog().districts}
    assert len(applied[0].district_ids) == 5
    for d, ind in state.items():
        assert ind["C2"] == pytest.approx(base[d]["C2"] + 5 * 7 / 8)


def test_17_district_measure_affects_only_selected():
    state, _, _ = apply_measures([S(measure_id="M8", district_id="nura")])
    base = {d.id: d.indicators for d in load_catalog().districts}
    assert state["nura"]["S2"] == pytest.approx(35 + 8.75)
    for d in ("esil", "almaty", "saryarka", "baikonur"):
        assert state[d] == base[d]


# --- district field rules -----------------------------------------------------

def test_district_required_for_district_measure():
    sel = [S(measure_id="M7"), *DEMO[1:]]
    assert "district_required" in codes(sel)


def test_city_measure_rejects_district():
    sel = [*DEMO[:3], S(measure_id="M12", district_id="nura"), DEMO[4]]
    assert "district_not_allowed" in codes(sel)


def test_unknown_ids():
    assert "unknown_measure" in codes([S(measure_id="M99")])
    assert "unknown_district" in codes([S(measure_id="M7", district_id="moon")])


# --- availability (drives live UI validation) ---------------------------------

def test_availability_global_conflict():
    av = availability([S(measure_id="M1", district_id="almaty")])
    assert not av["M3"].available
    assert any("M1" in r for r in av["M3"].reasons)


def test_availability_same_district_conflict_blocks_only_that_district():
    av = availability([S(measure_id="M7", district_id="nura")])
    assert av["M4"].available
    assert set(av["M4"].blocked_districts) == {"nura"}


def test_availability_budget_and_category():
    av = availability(DEMO[:4])  # 70 spent, social ×2
    assert not av["M9"].available          # social limit
    assert av["M3"].available              # cost 30 == remaining 30 is fine
    av = availability([S(measure_id="M3", district_id="nura"), S(measure_id="M13", district_id="almaty"),
                       S(measure_id="M5", district_id="saryarka")])  # 83 spent
    assert not av["M7"].available
    assert any("остатка" in r for r in av["M7"].reasons)
    assert av["M10"].available


def test_best_swaps_are_valid_improvements_or_ranked():
    swaps = best_single_swaps(DEMO)
    assert swaps
    assert swaps == sorted(swaps, key=lambda s: s["score_gain"], reverse=True)
    for s in swaps:
        trial = [x if x.measure_id != s["replace"] else S(measure_id=s["with"], district_id=s["with_district"]) for x in DEMO]
        assert simulate(trial).scenario.score == pytest.approx(s["score"])
