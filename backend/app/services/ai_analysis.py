"""AI City Strategy Analyst.

The analyst is an *interpreter*, never a calculator:

* Every number it can see comes from tool calls that read the deterministic
  engine's output (``simulation.simulate`` / ``compare`` / ``best_single_swaps``).
* It returns a fixed JSON schema (structured outputs).
* After it answers, a grounding check extracts every number from its text and
  flags any that does not appear in the engine data it was given.

When no Anthropic credentials are configured (or the API call fails), a
transparent rule-based analyst builds the same report directly from engine
output and the response is labelled ``source="rule_based"``.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any

from pydantic import BaseModel, Field

from app.models.schemas import Selection, SimulationResult
from app.services.catalog import Catalog, load_catalog
from app.services.simulation import best_single_swaps, compare, simulate

log = logging.getLogger(__name__)

DEFAULT_MODEL = "claude-opus-5"
MAX_TOOL_TURNS = 4


# ------------------------------------------------------------------ schema --


class DistrictImpact(BaseModel):
    district: str
    impact: str


class AnalysisReport(BaseModel):
    summary: str
    strengths: list[str]
    tradeoffs: list[str]
    risks: list[str]
    district_impacts: list[DistrictImpact]
    recommendations: list[str]
    alternative_verdict: str = ""
    data_sufficient: bool = True


class Grounding(BaseModel):
    checked_numbers: int
    unverified_numbers: list[str]


class AnalysisResponse(BaseModel):
    source: str  # "llm" | "rule_based"
    model: str | None = None
    note: str | None = None
    tool_calls: list[str] = Field(default_factory=list)
    report: AnalysisReport
    grounding: Grounding


REPORT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "tradeoffs": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},
        "district_impacts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"district": {"type": "string"}, "impact": {"type": "string"}},
                "required": ["district", "impact"],
                "additionalProperties": False,
            },
        },
        "recommendations": {"type": "array", "items": {"type": "string"}},
        "alternative_verdict": {"type": "string"},
        "data_sufficient": {"type": "boolean"},
    },
    "required": [
        "summary", "strengths", "tradeoffs", "risks", "district_impacts",
        "recommendations", "alternative_verdict", "data_sufficient",
    ],
    "additionalProperties": False,
}


# --------------------------------------------------- engine-backed views --


def _r(x: float) -> float:
    return round(x, 2)


def _district_name(catalog: Catalog, district_id: str | None) -> str | None:
    d = catalog.district(district_id) if district_id else None
    return d.name if d else None


def city_state_view(catalog: Catalog) -> dict:
    rules = catalog.rules
    baseline = simulate([], catalog).baseline
    return {
        "budget": rules.budget,
        "required_decisions": rules.required_decisions,
        "max_per_category": rules.max_per_category,
        "horizon_quarters": rules.horizon_quarters,
        "critical_threshold": rules.critical_threshold,
        "score_weights_percent": {
            "city_average": rules.score.avg_weight * 100,
            "weakest_district": rules.score.min_weight * 100,
        },
        "indicators": [{"id": i.id, "name": i.name, "weight": i.weight} for i in rules.indicators],
        "districts": [
            {
                "id": d.id,
                "name": d.name,
                "profile": d.profile,
                "population_share": d.population_share,
                "indicators": d.indicators,
                "district_score": _r(baseline.district_scores[d.id]),
            }
            for d in catalog.districts
        ],
        "baseline_score": _r(baseline.score),
    }


def scenario_view(result: SimulationResult, catalog: Catalog) -> dict:
    measures = []
    for eff in result.applied_effects:
        m = catalog.initiative(eff.measure_id)
        measures.append({
            "id": m.id,
            "name": m.name,
            "category": m.category,
            "type": m.type,
            "district": _district_name(catalog, eff.district_ids[0]) if m.type == "district" else "весь город",
            "cost": m.cost,
            "lag_quarters": m.lag,
            "realized_share": eff.realized_share,
            "realized_percent": eff.realized_share * 100,
            "full_effects": m.effects,
            "realized_effects_per_district": {k: _r(v) for k, v in eff.realized_effects.items()},
        })
    return {
        "measures": measures,
        "synergies": [
            {"id": s.id, "measures": s.measures, "district": _district_name(catalog, s.district_id),
             "indicator": s.indicator, "bonus": s.bonus}
            for s in result.applied_synergies
        ],
        "spent": result.spent,
        "remaining": result.remaining,
        "budget": result.budget,
    }


def result_view(result: SimulationResult, catalog: Catalog) -> dict:
    if not result.valid:
        return {"valid": False, "issues": [i.message for i in result.issues]}
    s, b = result.scenario, result.baseline
    return {
        "valid": True,
        "score": _r(s.score),
        "baseline_score": _r(b.score),
        "score_delta": _r(result.score_delta),
        "d_avg": _r(s.d_avg),
        "baseline_d_avg": _r(b.d_avg),
        "d_min": _r(s.d_min),
        "d_min_district": _district_name(catalog, s.d_min_district),
        "baseline_d_min": _r(b.d_min),
        "n_crit": s.n_crit,
        "baseline_n_crit": b.n_crit,
        "critical_after": [{"district": c.district_name, "indicator": c.indicator, "value": _r(c.value)} for c in s.critical],
        "critical_before": [{"district": c.district_name, "indicator": c.indicator, "value": _r(c.value)} for c in b.critical],
        "districts": [
            {"name": d.name, "score_before": _r(d.score_before), "score_after": _r(d.score_after),
             "score_delta": _r(d.score_delta)}
            for d in result.districts
        ],
        "spent": result.spent,
        "remaining": result.remaining,
    }


def indicator_changes_view(result: SimulationResult) -> dict:
    if not result.valid:
        return {"valid": False}
    return {
        "city_weighted_deltas": {k: _r(v) for k, v in result.indicator_deltas.items()},
        "by_district": [
            {
                "name": d.name,
                "changes": {k: {"before": _r(d.before[k]), "after": _r(d.after[k]), "delta": _r(d.delta[k])}
                            for k in d.delta if abs(d.delta[k]) > 1e-9},
                "lowest_after": sorted(({"indicator": k, "value": _r(v)} for k, v in d.after.items()),
                                       key=lambda x: x["value"])[:3],
            }
            for d in result.districts
        ],
    }


def comparison_view(base: list[Selection], alternative: list[Selection], catalog: Catalog) -> dict:
    cmp = compare(base, alternative, catalog)
    return {
        "base": result_view(cmp.base, catalog),
        "alternative": result_view(cmp.alternative, catalog),
        "alternative_measures": scenario_view(cmp.alternative, catalog)["measures"] if cmp.alternative.valid else [],
        "score_difference": _r(cmp.score_difference) if cmp.score_difference is not None else None,
        "district_score_differences": {
            _district_name(catalog, k): _r(v) for k, v in cmp.district_differences.items()
        },
        "indicator_differences": {k: _r(v) for k, v in cmp.indicator_differences.items()},
    }


def swaps_view(selections: list[Selection], catalog: Catalog) -> dict:
    swaps = best_single_swaps(selections, catalog, limit=3)
    return {
        "best_single_swaps": [
            {
                "replace": s["replace"],
                "replace_district": _district_name(catalog, s["replace_district"]),
                "with": s["with"],
                "with_name": s["with_name"],
                "with_district": _district_name(catalog, s["with_district"]) or "весь город",
                "score": _r(s["score"]),
                "score_gain": _r(s["score_gain"]),
                "spent": s["spent"],
            }
            for s in swaps
        ]
    }


# ------------------------------------------------------------------ tools --


SELECTIONS_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "measure_id": {"type": "string"},
            "district_id": {"type": ["string", "null"]},
        },
        "required": ["measure_id", "district_id"],
        "additionalProperties": False,
    },
}

TOOLS = [
    {
        "name": "get_city_state",
        "description": "Исходное состояние города: районы, их профили, доли населения, 10 показателей, веса и правила игры.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "get_selected_scenario",
        "description": "Выбранные мэром 5 мероприятий: район, стоимость, лаг, доля реализованного эффекта, эффекты после лага, сработавшие синергии, бюджет.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "get_simulation_result",
        "description": "Результат детерминированной симуляции: Score, baseline, дельта, D_avg, min(D_d), критические показатели, score по районам до/после.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "get_indicator_changes",
        "description": "Изменения каждого показателя: взвешенно по городу и по районам (до/после/дельта), три самых слабых показателя района после сценария.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "compare_scenarios",
        "description": (
            "Прогоняет альтернативный набор из 5 мероприятий через тот же детерминированный движок и сравнивает с текущим. "
            "district_id — id района (esil, almaty, saryarka, baikonur, nura) для районных мер и null для городских "
            "(M2, M6, M12, M14). Если набор нарушает правила, вернётся список нарушений."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"selections": SELECTIONS_SCHEMA},
            "required": ["selections"],
            "additionalProperties": False,
        },
    },
    {
        "name": "find_best_swaps",
        "description": "Движок перебирает все допустимые замены одной меры в текущем сценарии и возвращает три лучшие по приросту Score.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
]

SYSTEM_PROMPT = """Ты — AI City Strategy Analyst в симуляторе «Аким на 5 часов» (условная Астана, 5 районов, бюджет 100, ровно 5 решений, горизонт 8 кварталов).

Все показатели, Score, стоимости и эффекты рассчитывает детерминированный движок. Ты — интерпретатор, а не калькулятор:
- Исходный запрос уже содержит результаты get_city_state, get_simulation_result, get_selected_scenario и get_indicator_changes. Получай дополнительные данные только через инструменты.
- Любое число в ответе должно быть дословно взято из результатов инструментов (они уже округлены). Не пересчитывай Score, не складывай и не вычитай сам, не придумывай эффекты, стоимости или показатели.
- Если хочешь предложить улучшение с числом — сначала проверь его через find_best_swaps или compare_scenarios и цитируй результат движка. Без проверки формулируй рекомендацию без чисел.
- Если данных недостаточно для вывода, прямо скажи об этом и поставь data_sufficient=false.

Пиши по-русски, коротко и предметно, как аналитическая записка для акима: 2–4 пункта в каждом списке, каждый пункт — одно-два предложения. Называй районы и меры по именам (можно с кодом, например «M7 Школа + детсад»). district_impacts — по одному пункту на каждый из 5 районов. Если в запросе есть альтернативный сценарий, в alternative_verdict объясни, какой из двух лучше и за счёт чего; иначе оставь alternative_verdict пустой строкой."""


class _Context:
    def __init__(self, selections: list[Selection], alternative: list[Selection] | None, catalog: Catalog):
        self.selections = selections
        self.alternative = alternative
        self.catalog = catalog
        self.result = simulate(selections, catalog)
        self.seen_numbers: list[float] = []
        self.reset_numbers()

    def reset_numbers(self) -> None:
        self.seen_numbers.clear()

    def run_tool(self, name: str, args: dict) -> dict:
        c = self.catalog
        if name == "get_city_state":
            out = city_state_view(c)
        elif name == "get_selected_scenario":
            out = scenario_view(self.result, c)
        elif name == "get_simulation_result":
            out = result_view(self.result, c)
        elif name == "get_indicator_changes":
            out = indicator_changes_view(self.result)
        elif name == "compare_scenarios":
            raw = args.get("selections")
            if not isinstance(raw, list):
                raise ValueError("selections must be a list")
            if len(raw) > c.rules.required_decisions:
                raise ValueError("too many selections")
            alt = [Selection(**s) for s in raw]
            out = comparison_view(self.selections, alt, c)
        elif name == "find_best_swaps":
            out = swaps_view(self.selections, c)
        else:
            raise ValueError(f"unknown tool {name}")
        self.seen_numbers.extend(_numbers_in(out))
        return out


# -------------------------------------------------------------- grounding --


_NUM_RE = re.compile(
    r"(?<![A-Za-zА-Яа-яЁё\d.,_])[-+−]?"
    r"(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)"
    r"(?:[.,]\d+)?(?:[eE][+−-]?\d+)?"
)


def _numbers_in(obj: Any) -> list[float]:
    if isinstance(obj, bool):
        return []
    if isinstance(obj, (int, float)):
        return [float(obj)]
    if isinstance(obj, dict):
        return [n for v in obj.values() for n in _numbers_in(v)]
    if isinstance(obj, (list, tuple)):
        return [n for v in obj for n in _numbers_in(v)]
    if isinstance(obj, str):
        return [_parse_num(m) for m in _NUM_RE.findall(obj)]
    return []


def _parse_num(token: str) -> float:
    return float(token.replace("−", "-").replace(",", ".")
                 .replace(" ", "").replace("\u00a0", "").replace("\u202f", ""))


def grounding_check(report: AnalysisReport, allowed: list[float]) -> Grounding:
    """Check numeric presence, not the semantic attribution of each claim.

    Preserve signs and accept only source values or their two-decimal display
    form. Percentages must be explicitly supplied by the deterministic views.
    """
    pool = {value for v in allowed for value in (float(v), round(float(v), 2))}

    text = json.dumps(report.model_dump(), ensure_ascii=False)
    tokens = _NUM_RE.findall(text)
    unverified: list[str] = []
    for tok in tokens:
        n = _parse_num(tok)
        if not any(abs(n - p) < 1e-8 for p in pool):
            unverified.append(tok)
    return Grounding(checked_numbers=len(tokens), unverified_numbers=sorted(set(unverified)))


# ----------------------------------------------------------- LLM analyst --


def _llm_available() -> bool:
    if os.getenv("AI_DISABLED", "").lower() in {"1", "true", "yes"}:
        return False
    return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))


def _run_llm(ctx: _Context) -> AnalysisResponse:
    import anthropic

    model = os.getenv("ANTHROPIC_MODEL", DEFAULT_MODEL)
    timeout = max(1, min(float(os.getenv("AI_TIMEOUT_SECONDS", "120")), 180))
    deadline = time.monotonic() + timeout

    request = "Проанализируй выбранный сценарий развития города."
    if ctx.alternative is not None:
        alt = ", ".join(f"{s.measure_id}/{s.district_id or 'город'}" for s in ctx.alternative)
        request += (
            f" Пользователь также рассматривает альтернативный набор: {alt}. "
            "Сравни его с текущим через compare_scenarios и дай вердикт в alternative_verdict."
        )
    # Supply the essential engine outputs before the model can make any claim.
    # This also keeps the common path to a single provider request.
    initial = {name: ctx.run_tool(name, {}) for name in (
        "get_city_state", "get_simulation_result", "get_selected_scenario", "get_indicator_changes",
    )}
    if ctx.alternative is not None:
        initial["comparison"] = ctx.run_tool("compare_scenarios", {
            "selections": [s.model_dump() for s in ctx.alternative],
        })
    request += "\nРезультаты детерминированного движка:\n" + json.dumps(initial, ensure_ascii=False)
    messages: list[dict] = [{"role": "user", "content": request}]
    tool_calls: list[str] = []

    with anthropic.Anthropic(timeout=timeout, max_retries=0) as client:
        for _ in range(MAX_TOOL_TURNS):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("analyst exceeded time budget")
            response = client.messages.create(
                model=model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
                timeout=remaining,
                output_config={"format": {"type": "json_schema", "schema": REPORT_SCHEMA}},
            )
            if time.monotonic() > deadline:
                raise TimeoutError("analyst exceeded time budget")
            if response.stop_reason == "refusal":
                raise RuntimeError("model declined the request")
            if response.stop_reason != "tool_use":
                break

            messages.append({"role": "assistant", "content": response.content})
            results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                tool_calls.append(block.name)
                try:
                    payload = ctx.run_tool(block.name, block.input or {})
                    results.append({"type": "tool_result", "tool_use_id": block.id,
                                    "content": json.dumps(payload, ensure_ascii=False)})
                except Exception as exc:  # noqa: BLE001 - reported back to the model
                    results.append({"type": "tool_result", "tool_use_id": block.id,
                                    "content": f"Ошибка: {exc}", "is_error": True})
            messages.append({"role": "user", "content": results})
            if time.monotonic() > deadline:
                raise TimeoutError("analyst exceeded time budget")
        else:
            raise RuntimeError("analyst exceeded tool-call limit")

    if response.stop_reason == "max_tokens":
        raise RuntimeError("analysis truncated")
    text = next((b.text for b in response.content if b.type == "text"), None)
    if not text:
        raise RuntimeError("empty analysis")
    report = AnalysisReport(**json.loads(text))
    grounding = grounding_check(report, ctx.seen_numbers)
    if grounding.unverified_numbers:
        raise ValueError("analysis contains numbers absent from engine output")
    if not report.data_sufficient:
        raise ValueError("analyst reported insufficient data")
    if (len(report.district_impacts) != len(ctx.catalog.districts)
            or {d.district for d in report.district_impacts} != {d.name for d in ctx.catalog.districts}
            or any(not d.impact.strip() for d in report.district_impacts)):
        raise ValueError("analysis does not cover the supplied districts")
    sections = [report.strengths, report.tradeoffs, report.risks, report.recommendations]
    if not report.summary.strip() or any(not items or not all(item.strip() for item in items) for items in sections):
        raise ValueError("analysis is incomplete")
    if ctx.alternative is not None and not report.alternative_verdict.strip():
        raise ValueError("analysis omitted comparison")
    return AnalysisResponse(
        source="llm",
        model=response.model,
        tool_calls=tool_calls,
        report=report,
        grounding=grounding,
    )


# ---------------------------------------------------- rule-based analyst --


def _fmt(x: float) -> str:
    return f"{x:+.2f}"


def _rule_based(ctx: _Context) -> AnalysisReport:
    c, res = ctx.catalog, ctx.result
    ind_names = {i.id: i.name for i in c.rules.indicators}
    sv = result_view(res, c)
    ic = indicator_changes_view(res)
    sc = scenario_view(res, c)
    ctx.seen_numbers.extend(_numbers_in(city_state_view(c)))
    ctx.seen_numbers.extend(_numbers_in(sv) + _numbers_in(ic) + _numbers_in(sc))

    best = max(res.districts, key=lambda d: d.score_delta)
    summary = (
        f"Сценарий меняет Score с {_r(res.baseline.score)} до {_r(res.scenario.score)} "
        f"({_fmt(res.score_delta)}), израсходовано {res.spent} из {res.budget}. "
        f"Больше всего выигрывает район {best.name} ({_fmt(best.score_delta)} к оценке района)."
    )

    deltas = sorted(ic["city_weighted_deltas"].items(), key=lambda kv: kv[1], reverse=True)
    strengths = [
        f"{k} «{ind_names[k]}»: {_fmt(v)} в среднем по городу (с учётом долей населения)."
        for k, v in deltas[:3] if v > 0
    ]
    if res.baseline.n_crit > res.scenario.n_crit:
        strengths.append(
            f"Критических показателей (<40) стало {res.scenario.n_crit} вместо {res.baseline.n_crit} — "
            f"штраф снижен до {_r(res.scenario.penalty)}."
        )
    for s in sc["synergies"]:
        strengths.append(f"Сработала синергия {' + '.join(s['measures'])}: {s['indicator']} +{s['bonus']} в районе {s['district']}.")

    tradeoffs = []
    for m in sc["measures"]:
        if m["lag_quarters"] >= 3:
            tradeoffs.append(
                f"{m['id']} «{m['name']}» имеет лаг {m['lag_quarters']} кв., за горизонт реализуется только "
                f"{m['realized_percent']:g}% эффекта."
            )
    untouched = [d.name for d in res.districts if abs(d.score_delta) < 1e-9]
    if untouched:
        tradeoffs.append(f"Районы без изменений: {', '.join(untouched)} — ресурсы сконцентрированы в других районах.")
    if res.remaining > 0:
        tradeoffs.append(f"Остаток бюджета {res.remaining} не даёт бонуса к Score.")
    zero_cats = [cat.name for cat in c.rules.categories
                 if all(abs(res.indicator_deltas[k]) < 1e-9 for k in cat.indicators)]
    if zero_cats:
        tradeoffs.append(f"Без улучшений остались направления: {', '.join(zero_cats)}.")

    risks = []
    if res.scenario.critical:
        for crit in res.scenario.critical:
            risks.append(f"{crit.district_name} / {crit.indicator} остаётся критическим: {_r(crit.value)}.")
    near = sorted(
        ((d.name, k, v) for d in res.districts for k, v in d.after.items() if 40 <= v < 45),
        key=lambda x: x[2],
    )
    for name, k, v in near[:3]:
        risks.append(f"{name} / {k} «{ind_names[k]}» = {_r(v)} — близко к критическому порогу 40.")
    risks.append(
        f"Самый слабый район после сценария — {sv['d_min_district']} ({sv['d_min']}); "
        "он весит 30% в итоговом Score."
    )
    negatives = [(k, v) for k, v in ic["city_weighted_deltas"].items() if v < 0]
    for k, v in negatives:
        risks.append(f"{k} «{ind_names[k]}» ухудшается: {_fmt(v)} по городу.")

    impacts = []
    for d, dv in zip(res.districts, ic["by_district"]):
        if not dv["changes"]:
            impacts.append({"district": d.name, "impact": f"Без изменений, оценка района {_r(d.score_after)}."})
            continue
        top = max(dv["changes"].items(), key=lambda kv: kv[1]["delta"])
        impacts.append({
            "district": d.name,
            "impact": (
                f"{_r(d.score_before)} → {_r(d.score_after)} ({_fmt(d.score_delta)}); главный драйвер — "
                f"{top[0]} {top[1]['before']} → {top[1]['after']}."
            ),
        })

    sw = swaps_view(ctx.selections, c)
    ctx.seen_numbers.extend(_numbers_in(sw))
    recs = []
    for s in sw["best_single_swaps"]:
        if s["score_gain"] <= 0:
            continue
        recs.append(
            f"Заменить {s['replace']} на {s['with']} «{s['with_name']}» ({s['with_district']}): "
            f"движок даёт Score {s['score']} ({_fmt(s['score_gain'])})."
        )
    if not recs:
        recs.append("Движок не нашёл ни одной замены одной меры, которая повышала бы Score — сценарий локально оптимален.")

    return AnalysisReport(
        summary=summary,
        strengths=strengths[:4] or ["Существенных улучшений не обнаружено."],
        tradeoffs=tradeoffs[:4] or ["Явных компромиссов не выявлено."],
        risks=risks[:4],
        district_impacts=[DistrictImpact(**i) for i in impacts],
        recommendations=recs,
        alternative_verdict=_rule_based_alternative(ctx),
    )


def _rule_based_alternative(ctx: _Context) -> str:
    if ctx.alternative is None:
        return ""
    cv = comparison_view(ctx.selections, ctx.alternative, ctx.catalog)
    ctx.seen_numbers.extend(_numbers_in(cv))
    if cv["score_difference"] is None:
        issues = cv["alternative"].get("issues") or cv["base"].get("issues") or []
        return "Альтернатива недопустима: " + "; ".join(issues)
    diff = cv["score_difference"]
    ranked = sorted(cv["district_score_differences"].items(), key=lambda kv: kv[1])
    better = "Альтернатива лучше" if diff > 0 else "Текущий сценарий лучше" if diff < 0 else "Сценарии равноценны"
    details = []
    if ranked[-1][1] > 0:
        details.append(f"Сильнее всего выигрывает {ranked[-1][0]} ({_fmt(ranked[-1][1])}).")
    if ranked[0][1] < 0:
        details.append(f"Больше всего теряет {ranked[0][0]} ({_fmt(ranked[0][1])}).")
    if not details:
        details.append("Оценки всех районов совпадают.")
    return f"{better}: Score {cv['alternative']['score']} против {cv['base']['score']} ({_fmt(diff)}). " + " ".join(details)


# -------------------------------------------------------------- entrypoint --


def analyze(selections: list[Selection], alternative: list[Selection] | None = None,
            catalog: Catalog | None = None) -> AnalysisResponse:
    catalog = catalog or load_catalog()
    ctx = _Context(selections, alternative, catalog)
    if not ctx.result.valid:
        raise ValueError("; ".join(i.message for i in ctx.result.issues))

    note = None
    if _llm_available():
        try:
            return _run_llm(ctx)
        except Exception as exc:  # noqa: BLE001 - degrade to deterministic analyst
            log.warning("LLM analysis failed (%s)", type(exc).__name__)
            note = "LLM недоступна или ответ не прошёл проверку; показан детерминированный анализ движка."
            ctx.reset_numbers()
    else:
        note = "LLM отключена или ключ не задан — показан детерминированный анализ движка."

    report = _rule_based(ctx)
    return AnalysisResponse(
        source="rule_based",
        note=note,
        report=report,
        grounding=grounding_check(report, ctx.seen_numbers),
    )
