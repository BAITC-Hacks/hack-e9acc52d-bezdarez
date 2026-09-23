"""Scenario validation: the single source of truth for game rules.

The frontend never re-implements these rules; it asks the backend for a
``ValidationReport`` (which includes per-measure availability) and renders it.
"""

from __future__ import annotations

from collections import Counter

from app.models.schemas import (
    MeasureAvailability,
    Selection,
    ValidationIssue,
    ValidationReport,
)
from app.services.catalog import Catalog, load_catalog


def _label(catalog: Catalog, measure_id: str) -> str:
    m = catalog.initiative(measure_id)
    return f"{measure_id} «{m.name}»" if m else measure_id


def _district_name(catalog: Catalog, district_id: str | None) -> str:
    d = catalog.district(district_id) if district_id else None
    return d.name if d else str(district_id)


def _category_name(catalog: Catalog, category_id: str) -> str:
    return next((c.name for c in catalog.rules.categories if c.id == category_id), category_id)


def validate(selections: list[Selection], catalog: Catalog | None = None) -> ValidationReport:
    catalog = catalog or load_catalog()
    rules = catalog.rules
    issues: list[ValidationIssue] = []

    # --- structural checks per selection -------------------------------------
    seen: set[str] = set()
    known: list[Selection] = []
    for sel in selections:
        measure = catalog.initiative(sel.measure_id)
        if measure is None:
            issues.append(ValidationIssue(
                code="unknown_measure",
                message=f"Неизвестное мероприятие {sel.measure_id}.",
                measure_ids=[sel.measure_id],
            ))
            continue
        if sel.measure_id in seen:
            issues.append(ValidationIssue(
                code="duplicate_measure",
                message=f"{_label(catalog, sel.measure_id)} выбрано более одного раза.",
                measure_ids=[sel.measure_id],
            ))
            continue
        seen.add(sel.measure_id)
        known.append(sel)

        if measure.type == "district":
            if not sel.district_id:
                issues.append(ValidationIssue(
                    code="district_required",
                    message=f"Для {_label(catalog, sel.measure_id)} нужно выбрать район.",
                    measure_ids=[sel.measure_id],
                ))
            elif catalog.district(sel.district_id) is None:
                issues.append(ValidationIssue(
                    code="unknown_district",
                    message=f"Неизвестный район {sel.district_id}.",
                    measure_ids=[sel.measure_id],
                ))
        elif sel.district_id is not None:
            issues.append(ValidationIssue(
                code="district_not_allowed",
                message=f"{_label(catalog, sel.measure_id)} — городская мера, район не указывается.",
                measure_ids=[sel.measure_id],
            ))

    # --- count ---------------------------------------------------------------
    n = len(selections)
    if n < rules.required_decisions:
        issues.append(ValidationIssue(
            code="too_few_measures",
            message=f"Нужно ровно {rules.required_decisions} решений, выбрано {n}.",
        ))
    elif n > rules.required_decisions:
        issues.append(ValidationIssue(
            code="too_many_measures",
            message=f"Нужно ровно {rules.required_decisions} решений, выбрано {n}.",
        ))

    # --- budget --------------------------------------------------------------
    spent = sum(catalog.initiative(s.measure_id).cost for s in known)
    if spent > rules.budget:
        issues.append(ValidationIssue(
            code="budget_exceeded",
            message=f"Бюджет превышен: {spent} из {rules.budget}.",
            measure_ids=[s.measure_id for s in known],
        ))

    # --- category limit ------------------------------------------------------
    category_counts = Counter(catalog.initiative(s.measure_id).category for s in known)
    for category_id, count in category_counts.items():
        if count > rules.max_per_category:
            ids = [s.measure_id for s in known if catalog.initiative(s.measure_id).category == category_id]
            issues.append(ValidationIssue(
                code="category_limit",
                message=(
                    f"Направление «{_category_name(catalog, category_id)}»: {count} меры, "
                    f"допускается не более {rules.max_per_category}."
                ),
                measure_ids=ids,
            ))

    # --- incompatibilities ---------------------------------------------------
    by_id = {s.measure_id: s for s in known}
    for conflict in rules.conflicts:
        a, b = conflict.measures
        if a not in by_id or b not in by_id:
            continue
        if conflict.scope == "global":
            issues.append(ValidationIssue(
                code="conflict",
                message=f"{_label(catalog, a)} и {_label(catalog, b)} несовместимы.",
                measure_ids=[a, b],
            ))
        elif by_id[a].district_id and by_id[a].district_id == by_id[b].district_id:
            issues.append(ValidationIssue(
                code="conflict_same_district",
                message=(
                    f"{_label(catalog, a)} и {_label(catalog, b)} нельзя размещать в одном районе "
                    f"({_district_name(catalog, by_id[a].district_id)})."
                ),
                measure_ids=[a, b],
            ))

    all_counts = {c.id: category_counts.get(c.id, 0) for c in rules.categories}
    return ValidationReport(
        valid=not issues,
        complete=n == rules.required_decisions,
        issues=issues,
        decisions=n,
        required_decisions=rules.required_decisions,
        budget=rules.budget,
        spent=spent,
        remaining=rules.budget - spent,
        category_counts=all_counts,
        availability=availability(known, catalog),
    )


def availability(selections: list[Selection], catalog: Catalog | None = None) -> dict[str, MeasureAvailability]:
    """For each measure: can it be added to ``selections`` (and in which districts)?

    For already selected measures the check is made against the *other*
    selections, so the UI can tell which districts it may be moved to.
    """
    catalog = catalog or load_catalog()
    rules = catalog.rules
    result: dict[str, MeasureAvailability] = {}

    for measure in catalog.initiatives:
        is_selected = any(s.measure_id == measure.id for s in selections)
        others = [s for s in selections if s.measure_id != measure.id]
        other_ids = {s.measure_id: s for s in others}
        spent = sum(catalog.initiative(s.measure_id).cost for s in others)
        remaining = rules.budget - spent
        reasons: list[str] = []

        if len(others) >= rules.required_decisions:
            reasons.append(f"Уже принято {rules.required_decisions} решений из {rules.required_decisions}.")
        if measure.cost > remaining:
            reasons.append(f"Стоимость {measure.cost} больше остатка бюджета ({remaining}).")
        same_category = sum(1 for s in others if catalog.initiative(s.measure_id).category == measure.category)
        if same_category >= rules.max_per_category:
            reasons.append(
                f"Лимит направления «{_category_name(catalog, measure.category)}»: "
                f"уже выбрано {rules.max_per_category} меры."
            )

        blocked: dict[str, str] = {}
        for conflict in rules.conflicts:
            if measure.id not in conflict.measures:
                continue
            partner_id = next(x for x in conflict.measures if x != measure.id)
            partner = other_ids.get(partner_id)
            if partner is None:
                continue
            if conflict.scope == "global":
                reasons.append(f"{_label(catalog, partner_id)} уже выбрано — меры несовместимы.")
            elif partner.district_id:
                blocked[partner.district_id] = (
                    f"В районе {_district_name(catalog, partner.district_id)} уже выбрано "
                    f"{_label(catalog, partner_id)} — несовместимо в одном районе."
                )
        if measure.type == "district" and len(blocked) == len(catalog.districts):
            reasons.append("Нет района, где мера совместима с уже выбранными.")

        result[measure.id] = MeasureAvailability(
            available=is_selected or not reasons,
            selected=is_selected,
            reasons=reasons,
            blocked_districts=blocked,
        )
    return result
