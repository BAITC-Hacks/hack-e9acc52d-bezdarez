from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.schemas import (
    ComparisonRequest,
    ComparisonResult,
    Scenario,
    SimulationResult,
    ValidationReport,
)
from app.services.ai_analysis import AnalysisResponse, analyze
from app.services.catalog import load_catalog
from app.services.simulation import compare, simulate
from app.services.validation import validate

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/game")
def game() -> dict:
    """Everything the client needs to render a new game, incl. the engine-computed baseline."""
    catalog = load_catalog()
    return {
        "rules": catalog.rules.model_dump(),
        "districts": [d.model_dump() for d in catalog.districts],
        "initiatives": [m.model_dump() for m in catalog.initiatives],
        "baseline": simulate([], catalog).baseline.model_dump(),
        "demo_scenario": [
            {"measure_id": "M7", "district_id": "nura"},
            {"measure_id": "M8", "district_id": "nura"},
            {"measure_id": "M10", "district_id": "nura"},
            {"measure_id": "M12", "district_id": None},
            {"measure_id": "M5", "district_id": "saryarka"},
        ],
    }


@router.post("/simulation/validate", response_model=ValidationReport)
def validate_scenario(scenario: Scenario) -> ValidationReport:
    return validate(scenario.selections)


@router.post("/simulation/calculate", response_model=SimulationResult)
def calculate(scenario: Scenario) -> SimulationResult:
    result = simulate(scenario.selections)
    if not result.valid:
        raise HTTPException(status_code=422, detail={
            "message": "Сценарий недопустим и не получает Score.",
            "issues": [i.model_dump() for i in result.issues],
        })
    return result


@router.post("/simulation/compare", response_model=ComparisonResult)
def compare_scenarios(req: ComparisonRequest) -> ComparisonResult:
    return compare(req.base.selections, req.alternative.selections)


class AnalyzeRequest(BaseModel):
    scenario: Scenario
    alternative: Scenario | None = None


@router.post("/ai/analyze", response_model=AnalysisResponse)
def ai_analyze(req: AnalyzeRequest) -> AnalysisResponse:
    # The analyst never receives client-side numbers: the engine recomputes
    # the scenario from the raw selections.
    try:
        return analyze(req.scenario.selections, req.alternative.selections if req.alternative else None)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc
