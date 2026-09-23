"""Quality-of-life scoring. Pure functions over indicator tables.

    D_d     = Σ_k w_k · I'_(d,k)
    D_avg   = Σ_d share_d · D_d
    N_crit  = #{(d,k) : I'_(d,k) < 40}
    Score   = clip(0.7·D_avg + 0.3·min_d D_d − 1.0·N_crit, 0, 100)
"""

from __future__ import annotations

from app.models.schemas import CriticalValue, Indicators, ScoreBreakdown
from app.services.catalog import Catalog, load_catalog


def district_score(indicators: Indicators, weights: dict[str, float]) -> float:
    return sum(weights[k] * indicators[k] for k in weights)


def score_city(state: dict[str, Indicators], catalog: Catalog | None = None) -> ScoreBreakdown:
    """``state`` maps district_id -> indicator values (already clipped)."""
    catalog = catalog or load_catalog()
    rules = catalog.rules
    weights = rules.weights

    scores = {d.id: district_score(state[d.id], weights) for d in catalog.districts}
    d_avg = sum(d.population_share * scores[d.id] for d in catalog.districts)
    d_min_district = min(scores, key=scores.get)
    d_min = scores[d_min_district]

    critical = [
        CriticalValue(district_id=d.id, district_name=d.name, indicator=k, value=state[d.id][k])
        for d in catalog.districts
        for k in weights
        if state[d.id][k] < rules.critical_threshold
    ]
    n_crit = len(critical)
    penalty = rules.score.critical_penalty * n_crit

    raw = rules.score.avg_weight * d_avg + rules.score.min_weight * d_min - penalty
    return ScoreBreakdown(
        score=min(100.0, max(0.0, raw)),
        d_avg=d_avg,
        d_min=d_min,
        d_min_district=d_min_district,
        n_crit=n_crit,
        penalty=penalty,
        district_scores=scores,
        critical=critical,
    )
