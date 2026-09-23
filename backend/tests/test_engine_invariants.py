"""Boundary and isolation checks for reproducible, order-independent results."""

from copy import deepcopy
from dataclasses import replace
from itertools import permutations

import pytest

from app.engine.simulation import simulate as legacy_simulate
from app.models.schemas import Selection
from app.services.catalog import load_catalog
from app.services.scoring import score_city
from app.services.simulation import apply_measures, baseline_state, compare, simulate
from app.services.validation import validate
from tests.test_engine import DEMO


def test_every_selection_order_produces_identical_city_state():
    reference = simulate(DEMO)
    for ordered in permutations(DEMO):
        result = simulate(list(ordered))
        assert result.scenario == reference.scenario
        assert result.districts == reference.districts
        assert result.indicator_deltas == reference.indicator_deltas
        assert result.applied_synergies == reference.applied_synergies


def test_critical_threshold_is_strictly_below_forty():
    state = baseline_state()
    state["nura"]["S1"] = 40
    state["nura"]["S2"] = 40
    assert score_city(state).n_crit == 0

    state["nura"]["S2"] = 39.999
    score = score_city(state)
    assert score.n_crit == 1
    assert score.penalty == 1
    assert [(value.district_id, value.indicator) for value in score.critical] == [("nura", "S2")]


@pytest.mark.parametrize("value,expected", [(0, 0), (100, 100)])
def test_final_score_stays_in_bounds(value, expected):
    state = {district: {indicator: value for indicator in values}
             for district, values in baseline_state().items()}
    assert score_city(state).score == pytest.approx(expected)


def test_effects_are_summed_before_clipping():
    catalog = deepcopy(load_catalog())
    catalog.district("nura").indicators["T1"] = 99
    positive = Selection(measure_id="M1", district_id="nura")
    negative = Selection(measure_id="M11", district_id="nura")
    forward, _, _ = apply_measures([positive, negative], catalog)
    backward, _, _ = apply_measures([negative, positive], catalog)
    # 99 + 4.5 - 1.75 = 101.75, clipped once to 100.
    # Clipping after each measure would incorrectly produce 98.25.
    assert forward["nura"]["T1"] == backward["nura"]["T1"] == 100


def test_simulation_does_not_mutate_inputs_or_catalog():
    catalog = load_catalog()
    original_catalog = deepcopy(catalog)
    selections = deepcopy(DEMO)
    original_selections = deepcopy(selections)
    first = simulate(selections, catalog)
    second = simulate(selections, catalog)
    assert first == second
    assert selections == original_selections
    assert catalog == original_catalog

    # Responses and preview states cannot overwrite the shared city dataset.
    first.districts[0].before["T1"] = 0
    first.districts[0].after["T1"] = 0
    first.applied_effects[0].full_effects["S1"] = 1000
    baseline_state(catalog)["nura"]["S1"] = 0
    assert catalog == original_catalog
    assert simulate(selections, catalog) == second


def test_unused_budget_never_changes_score():
    catalog = load_catalog()
    generous_rules = catalog.rules.model_copy(update={"budget": 1000}, deep=True)
    generous_catalog = replace(catalog, rules=generous_rules)
    standard = simulate(DEMO, catalog)
    generous = simulate(DEMO, generous_catalog)
    assert generous.remaining == standard.remaining + 900
    assert generous.scenario == standard.scenario


def test_exact_budget_is_valid():
    selections = [*DEMO[:4], Selection(measure_id="M3", district_id="nura")]
    report = validate(selections)
    assert report.spent == 100
    assert report.remaining == 0
    assert report.valid
    assert simulate(selections).scenario is not None


def test_indicator_deltas_are_population_weighted():
    result = simulate(DEMO)
    # Nura alone receives S1 +10 and S2 +8.75; city M12 gives C2 +4.375.
    assert result.indicator_deltas["S1"] == pytest.approx(1.6)
    assert result.indicator_deltas["S2"] == pytest.approx(1.4)
    assert result.indicator_deltas["C2"] == pytest.approx(4.375)


def test_negative_effect_can_create_new_critical_indicator():
    selections = [Selection(measure_id="M11", district_id="almaty"), *DEMO[1:]]
    result = simulate(selections)
    assert result.valid
    assert ("almaty", "T1", 38.25) in {
        (critical.district_id, critical.indicator, critical.value)
        for critical in result.scenario.critical
    }


def test_invalid_comparison_has_no_score_difference():
    result = compare(DEMO, DEMO[:4])
    assert result.base.valid
    assert not result.alternative.valid
    assert result.alternative.scenario is None
    assert result.score_difference is None
    assert result.district_differences == result.indicator_differences == {}


def test_legacy_entry_point_uses_authoritative_engine():
    legacy = legacy_simulate([selection.model_dump() for selection in DEMO])
    result = simulate(DEMO)
    assert legacy["score"] == result.scenario.score
    assert legacy["weighted_average"] == result.scenario.d_avg
    assert legacy["critical_count"] == result.scenario.n_crit
    assert legacy["cost"] == result.spent
    assert {district["id"]: district["indicators"] for district in legacy["districts"]} == {
        district.id: district.after for district in result.districts
    }


@pytest.mark.parametrize("decisions", [[], [{"measure_id": []}], None])
def test_legacy_entry_point_rejects_invalid_without_score(decisions):
    result = legacy_simulate(decisions)
    assert result["valid"] is False
    assert result["violations"]
    assert "score" not in result
