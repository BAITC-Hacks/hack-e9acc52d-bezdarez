"""Pydantic models shared by the engine and the HTTP layer."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

INDICATORS = ("T1", "T2", "E1", "E2", "S1", "S2", "B1", "B2", "C1", "C2")

Indicators = dict[str, float]


# ---------------------------------------------------------------- catalog --


class District(BaseModel):
    id: str
    name: str
    profile: str = ""
    population_share: float
    indicators: Indicators


class Initiative(BaseModel):
    id: str
    category: str
    name: str
    type: Literal["district", "city"]
    cost: int
    lag: int
    effects: Indicators


class IndicatorMeta(BaseModel):
    id: str
    name: str
    weight: float


class Category(BaseModel):
    id: str
    name: str
    indicators: list[str]


class Synergy(BaseModel):
    id: str
    measures: list[str]
    anchor: str
    indicator: str
    bonus: float


class Conflict(BaseModel):
    measures: list[str]
    scope: Literal["global", "same_district"]


class ScoreWeights(BaseModel):
    avg_weight: float
    min_weight: float
    critical_penalty: float


class Rules(BaseModel):
    budget: int
    required_decisions: int
    max_per_category: int
    horizon_quarters: int
    critical_threshold: float
    score: ScoreWeights
    categories: list[Category]
    indicators: list[IndicatorMeta]
    synergies: list[Synergy]
    conflicts: list[Conflict]

    @property
    def weights(self) -> dict[str, float]:
        return {i.id: i.weight for i in self.indicators}


# --------------------------------------------------------------- scenario --


class Selection(BaseModel):
    measure_id: str
    district_id: str | None = None


class Scenario(BaseModel):
    selections: list[Selection] = Field(default_factory=list)


# ------------------------------------------------------------- validation --


class ValidationIssue(BaseModel):
    code: str
    message: str
    measure_ids: list[str] = Field(default_factory=list)


class MeasureAvailability(BaseModel):
    """Whether a measure can be added to the current selection, and why not."""

    available: bool
    selected: bool
    reasons: list[str] = Field(default_factory=list)
    blocked_districts: dict[str, str] = Field(default_factory=dict)


class ValidationReport(BaseModel):
    valid: bool
    complete: bool
    issues: list[ValidationIssue]
    decisions: int
    required_decisions: int
    budget: int
    spent: int
    remaining: int
    category_counts: dict[str, int]
    availability: dict[str, MeasureAvailability]


# ------------------------------------------------------------- simulation --


class AppliedEffect(BaseModel):
    measure_id: str
    measure_name: str
    district_ids: list[str]
    lag: int
    realized_share: float
    full_effects: Indicators
    realized_effects: Indicators


class AppliedSynergy(BaseModel):
    id: str
    measures: list[str]
    district_id: str
    indicator: str
    bonus: float


class CriticalValue(BaseModel):
    district_id: str
    district_name: str
    indicator: str
    value: float


class DistrictResult(BaseModel):
    id: str
    name: str
    population_share: float
    before: Indicators
    after: Indicators
    delta: Indicators
    score_before: float
    score_after: float
    score_delta: float


class ScoreBreakdown(BaseModel):
    score: float
    d_avg: float
    d_min: float
    d_min_district: str
    n_crit: int
    penalty: float
    district_scores: dict[str, float]
    critical: list[CriticalValue]


class SimulationResult(BaseModel):
    valid: bool
    issues: list[ValidationIssue] = Field(default_factory=list)
    budget: int
    spent: int
    remaining: int
    selections: list[Selection]
    baseline: ScoreBreakdown
    scenario: ScoreBreakdown | None = None
    score_delta: float | None = None
    districts: list[DistrictResult] = Field(default_factory=list)
    indicator_deltas: Indicators = Field(default_factory=dict)
    applied_effects: list[AppliedEffect] = Field(default_factory=list)
    applied_synergies: list[AppliedSynergy] = Field(default_factory=list)


class ComparisonRequest(BaseModel):
    base: Scenario
    alternative: Scenario


class ComparisonResult(BaseModel):
    base: SimulationResult
    alternative: SimulationResult
    score_difference: float | None
    district_differences: dict[str, float]
    indicator_differences: Indicators
