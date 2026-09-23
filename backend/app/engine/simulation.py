"""Compatibility entry point backed by the authoritative simulation service.

Older callers used plain dictionaries and this compact result shape. Keeping
the adapter avoids maintaining a second implementation of the scoring rules.
"""

from app.engine.validator import _selections, validate
from app.services.simulation import simulate as simulate_scenario


def simulate(decisions):
    errors = validate(decisions)
    if errors:
        return {"valid": False, "violations": errors}

    result = simulate_scenario(_selections(decisions))
    scenario = result.scenario
    return {
        "valid": True,
        "violations": [],
        "score": scenario.score,
        "weighted_average": scenario.d_avg,
        "minimum_district_score": scenario.d_min,
        "critical_count": scenario.n_crit,
        "cost": result.spent,
        "districts": [
            {
                "id": district.id,
                "name": district.name,
                "indicators": district.after,
                "score": district.score_after,
                "critical_count": sum(
                    value.district_id == district.id for value in scenario.critical
                ),
            }
            for district in result.districts
        ],
    }
