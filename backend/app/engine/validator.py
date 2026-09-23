"""Compatibility adapter for the original dictionary-based validator."""

from pydantic import ValidationError

from app.models.schemas import Scenario, Selection
from app.services.validation import validate as validate_scenario


_LEGACY_CODES = {
    "too_few_measures": "DECISION_COUNT",
    "too_many_measures": "DECISION_COUNT",
    "duplicate_measure": "DUPLICATE",
    "budget_exceeded": "BUDGET",
    "category_limit": "CATEGORY_LIMIT",
    "unknown_measure": "UNKNOWN_MEASURE",
    "district_required": "DISTRICT_REQUIRED",
    "unknown_district": "UNKNOWN_DISTRICT",
    "district_not_allowed": "CITY_DISTRICT_FORBIDDEN",
    "conflict": "INCOMPATIBLE",
    "conflict_same_district": "INCOMPATIBLE",
}


def _selections(decisions) -> list[Selection]:
    return Scenario(selections=decisions).selections


def validate(decisions):
    try:
        selections = _selections(decisions)
    except ValidationError:
        return [{"code": "INVALID_SELECTION", "message": "Некорректный формат решений."}]

    return [
        {"code": _LEGACY_CODES.get(issue.code, issue.code.upper()), "message": issue.message}
        for issue in validate_scenario(selections).issues
    ]
