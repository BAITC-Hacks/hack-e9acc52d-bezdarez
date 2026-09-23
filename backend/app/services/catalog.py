"""Loads the immutable game dataset (districts, initiatives, rules) from JSON."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.models.schemas import INDICATORS, District, Initiative, Rules

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@dataclass(frozen=True)
class Catalog:
    rules: Rules
    districts: tuple[District, ...]
    initiatives: tuple[Initiative, ...]

    def district(self, district_id: str) -> District | None:
        return next((d for d in self.districts if d.id == district_id), None)

    def initiative(self, measure_id: str) -> Initiative | None:
        return next((m for m in self.initiatives if m.id == measure_id), None)

    @property
    def district_ids(self) -> list[str]:
        return [d.id for d in self.districts]


def _read(name: str):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_catalog() -> Catalog:
    rules = Rules(**_read("rules.json"))
    districts = tuple(
        District(
            id=raw["id"],
            name=raw["name"],
            profile=raw.get("profile", ""),
            population_share=raw["population_share"],
            indicators={k: float(raw[k]) for k in INDICATORS},
        )
        for raw in _read("districts.json")
    )
    initiatives = tuple(Initiative(**raw) for raw in _read("initiatives.json"))

    total_weight = sum(rules.weights.values())
    total_share = sum(d.population_share for d in districts)
    if abs(total_weight - 1.0) > 1e-9:
        raise ValueError(f"Indicator weights must sum to 1.0, got {total_weight}")
    if abs(total_share - 1.0) > 1e-9:
        raise ValueError(f"Population shares must sum to 1.0, got {total_share}")
    return Catalog(rules=rules, districts=districts, initiatives=initiatives)
