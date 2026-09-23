"""Deterministic simulation engine.

    I'_(d,k) = clip(I_(d,k) + Σ_m effect_(m,k)·(H − L_m)/H + synergy_(d,k), 0, 100)

Everything here is a pure function of (selections, catalog): no I/O, no
randomness, no LLM. The HTTP layer and the AI analyst only consume its output.
"""

from __future__ import annotations

from collections import defaultdict

from app.models.schemas import (
    AppliedEffect,
    AppliedSynergy,
    ComparisonResult,
    DistrictResult,
    Indicators,
    Selection,
    SimulationResult,
)
from app.services.catalog import Catalog, load_catalog
from app.services.scoring import score_city
from app.services.validation import validate


def clip(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return min(hi, max(lo, value))


def realized_share(lag: int, horizon: int) -> float:
    """Share of an initiative's effect realised within the horizon."""
    return max(0, horizon - lag) / horizon


def baseline_state(catalog: Catalog | None = None) -> dict[str, Indicators]:
    catalog = catalog or load_catalog()
    return {d.id: dict(d.indicators) for d in catalog.districts}


def apply_measures(
    selections: list[Selection], catalog: Catalog | None = None
) -> tuple[dict[str, Indicators], list[AppliedEffect], list[AppliedSynergy]]:
    """Apply lag-scaled effects and synergies. Assumes a validated selection."""
    catalog = catalog or load_catalog()
    rules = catalog.rules
    base = baseline_state(catalog)
    increments: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    applied: list[AppliedEffect] = []

    for sel in selections:
        m = catalog.initiative(sel.measure_id)
        targets = catalog.district_ids if m.type == "city" else [sel.district_id]
        share = realized_share(m.lag, rules.horizon_quarters)
        realized = {k: v * share for k, v in m.effects.items()}
        for d in targets:
            for k, v in realized.items():
                increments[d][k] += v
        applied.append(AppliedEffect(
            measure_id=m.id,
            measure_name=m.name,
            district_ids=targets,
            lag=m.lag,
            realized_share=share,
            full_effects=m.effects,
            realized_effects=realized,
        ))

    # Synergies are not lag-scaled. They land in the anchor measure's district
    # (or in every district if the anchor is a city-wide measure).
    by_id = {s.measure_id: s for s in selections}
    synergies: list[AppliedSynergy] = []
    for syn in rules.synergies:
        if not all(mid in by_id for mid in syn.measures):
            continue
        anchor = catalog.initiative(syn.anchor)
        targets = catalog.district_ids if anchor.type == "city" else [by_id[syn.anchor].district_id]
        for d in targets:
            increments[d][syn.indicator] += syn.bonus
            synergies.append(AppliedSynergy(
                id=syn.id, measures=syn.measures, district_id=d,
                indicator=syn.indicator, bonus=syn.bonus,
            ))

    state = {
        d: {k: clip(v + increments[d][k]) for k, v in indicators.items()}
        for d, indicators in base.items()
    }
    return state, applied, synergies


def simulate(selections: list[Selection], catalog: Catalog | None = None) -> SimulationResult:
    catalog = catalog or load_catalog()
    report = validate(selections, catalog)
    base_state = baseline_state(catalog)
    baseline = score_city(base_state, catalog)

    common = dict(
        budget=report.budget,
        spent=report.spent,
        remaining=report.remaining,
        selections=selections,
        baseline=baseline,
    )
    if not report.valid:
        # Invalid scenarios never receive a score.
        return SimulationResult(valid=False, issues=report.issues, **common)

    state, applied, synergies = apply_measures(selections, catalog)
    scenario = score_city(state, catalog)

    districts = [
        DistrictResult(
            id=d.id,
            name=d.name,
            population_share=d.population_share,
            before=base_state[d.id],
            after=state[d.id],
            delta={k: state[d.id][k] - base_state[d.id][k] for k in base_state[d.id]},
            score_before=baseline.district_scores[d.id],
            score_after=scenario.district_scores[d.id],
            score_delta=scenario.district_scores[d.id] - baseline.district_scores[d.id],
        )
        for d in catalog.districts
    ]
    # City-level change per indicator, population-weighted.
    indicator_deltas = {
        k: sum(dr.population_share * dr.delta[k] for dr in districts)
        for k in catalog.rules.weights
    }
    return SimulationResult(
        valid=True,
        scenario=scenario,
        score_delta=scenario.score - baseline.score,
        districts=districts,
        indicator_deltas=indicator_deltas,
        applied_effects=applied,
        applied_synergies=synergies,
        **common,
    )


def compare(base: list[Selection], alternative: list[Selection], catalog: Catalog | None = None) -> ComparisonResult:
    catalog = catalog or load_catalog()
    a = simulate(base, catalog)
    b = simulate(alternative, catalog)
    both = a.valid and b.valid
    return ComparisonResult(
        base=a,
        alternative=b,
        score_difference=(b.scenario.score - a.scenario.score) if both else None,
        district_differences=(
            {d.id: b.scenario.district_scores[d.id] - a.scenario.district_scores[d.id] for d in catalog.districts}
            if both else {}
        ),
        indicator_differences=(
            {k: b.indicator_deltas[k] - a.indicator_deltas[k] for k in catalog.rules.weights}
            if both else {}
        ),
    )


def best_single_swaps(selections: list[Selection], catalog: Catalog | None = None, limit: int = 3) -> list[dict]:
    """Exhaustively try replacing one measure (any unused measure × any district).

    Returns the top valid swaps ranked by score gain. Used by the analyst to
    ground recommendations in engine output rather than LLM intuition.
    """
    catalog = catalog or load_catalog()
    current = simulate(selections, catalog)
    if not current.valid:
        return []
    used = {s.measure_id for s in selections}
    candidates: list[dict] = []
    for i, old in enumerate(selections):
        for m in catalog.initiatives:
            if m.id in used:
                continue
            for district_id in (catalog.district_ids if m.type == "district" else [None]):
                trial = [*selections[:i], Selection(measure_id=m.id, district_id=district_id), *selections[i + 1:]]
                result = simulate(trial, catalog)
                if not result.valid:
                    continue
                candidates.append({
                    "replace": old.measure_id,
                    "replace_district": old.district_id,
                    "with": m.id,
                    "with_name": m.name,
                    "with_district": district_id,
                    "score": result.scenario.score,
                    "score_gain": result.scenario.score - current.scenario.score,
                    "spent": result.spent,
                })
    candidates.sort(key=lambda c: c["score_gain"], reverse=True)
    return candidates[:limit]
