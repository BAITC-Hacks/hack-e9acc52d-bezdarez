"""POST /api/explain — AI-объяснение уже рассчитанного результата (п. 13, 18 ТЗ).

AI получает только посчитанные клиентским Simulation Engine данные и возвращает
строгий JSON. Ответ проходит три проверки: схему, запрет на выдуманные числа и
запрет на заявления об официальности. Любой провал → {"success": false,
"useFallback": true}, и фронтенд показывает шаблонное объяснение.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field, ValidationError, field_validator

from app.llm import LLMClient, LLMError

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

SYSTEM_PROMPT = """Ты объясняешь результат демонстрационного симулятора управления городом.

Используй только данные, переданные во входном JSON.
Не изменяй рассчитанные показатели.
Не придумывай официальную статистику.
Не утверждай, что результат является реальным прогнозом для Астаны.
Не ссылайся на исследования и источники.
Объясняй последствия простым и нейтральным языком на русском.
Обязательно упоминай как преимущества, так и компромиссы.
Числа бери только из входного JSON (можно округлять до целых).

Возвращай только JSON такого формата:
{
  "summary": "2–3 предложения: что изменилось и почему",
  "positives": ["ровно 3 положительных последствия"],
  "risks": ["2 или 3 риска или компромисса"],
  "recommendation": "одна конкретная рекомендация по перераспределению бюджета между направлениями",
  "citizenReactions": [
    {"persona": "Пассажир", "text": "реакция от первого лица, 1 предложение"},
    {"persona": "Родитель", "text": "..."},
    {"persona": "Предприниматель", "text": "..."},
    {"persona": "Житель района", "text": "..."}
  ]
}
Пассажир реагирует на мобильность, Родитель — на социальный комфорт, Предприниматель — на городские сервисы, Житель района — на экологию и безопасность."""

FORBIDDEN_CLAIMS = re.compile(r"официальн\w* (данн|статист|прогноз)|по данным (акимата|исследован)|исследовани[ея] показ", re.I)


# ---------- схемы ----------

class Scores(BaseModel):
    mobility: float = Field(ge=0, le=100)
    ecology: float = Field(ge=0, le=100)
    social: float = Field(ge=0, le=100)
    safety: float = Field(ge=0, le=100)
    services: float = Field(ge=0, le=100)


class SelectedProject(BaseModel):
    category: str = Field(max_length=20)
    title: str = Field(max_length=80)
    allocatedBudget: int = Field(ge=0, le=100)
    recommendedBudget: int = Field(ge=0, le=100)
    efficiencyPercent: int = Field(ge=0, le=200)
    speed: str = Field(max_length=10)
    maintenanceCost: int = Field(ge=0, le=10)
    risks: list[str] = Field(default_factory=list, max_length=5)


class SimulationPayload(BaseModel):
    horizon: str = Field(pattern=r"^(1_year|3_years)$")
    overallBefore: float = Field(ge=0, le=100)
    overallAfter: float = Field(ge=0, le=100)
    scoresBefore: Scores
    scoresAfter: Scores
    selectedProjects: list[SelectedProject] = Field(min_length=1, max_length=5)
    synergies: list[str] = Field(default_factory=list, max_length=10)
    penalties: list[str] = Field(default_factory=list, max_length=10)
    strategyProfile: str = Field(default="", max_length=60)

    @field_validator("synergies", "penalties")
    @classmethod
    def _short(cls, v: list[str]) -> list[str]:
        return [s[:200] for s in v]


class ExplainRequest(BaseModel):
    simulationResult: SimulationPayload


class CitizenReaction(BaseModel):
    persona: str = Field(min_length=1, max_length=60)
    text: str = Field(min_length=1, max_length=400)


class Explanation(BaseModel):
    summary: str = Field(min_length=1, max_length=1200)
    positives: list[str] = Field(min_length=3, max_length=3)
    risks: list[str] = Field(min_length=2, max_length=3)
    recommendation: str = Field(min_length=1, max_length=600)
    citizenReactions: list[CitizenReaction] = Field(min_length=4, max_length=4)


# ---------- проверки ответа ----------

NUMBER = re.compile(r"(?<![\w.])[-−+]?\d+(?:[.,]\d+)?")


def allowed_numbers(p: SimulationPayload) -> set[float]:
    """Все числа, которые AI вправе упомянуть: входные значения, дельты и их округления."""
    raw: list[float] = [p.overallBefore, p.overallAfter, p.overallAfter - p.overallBefore, 1, 3, 100]
    for m in Scores.model_fields:
        b, a = getattr(p.scoresBefore, m), getattr(p.scoresAfter, m)
        raw += [b, a, a - b]
    for sp in p.selectedProjects:
        raw += [sp.allocatedBudget, sp.recommendedBudget, sp.efficiencyPercent, sp.maintenanceCost]
    for text in [*p.synergies, *p.penalties]:
        raw += [float(x.replace(",", ".").replace("−", "-")) for x in NUMBER.findall(text)]
    out: set[float] = set()
    for v in raw:
        for x in (v, abs(v)):
            out |= {round(x, 1), float(round(x)), float(int(x))}
    return out


def ungrounded_numbers(expl: Explanation, p: SimulationPayload) -> list[str]:
    allowed = allowed_numbers(p)
    text = " ".join([expl.summary, *expl.positives, *expl.risks, expl.recommendation, *(r.text for r in expl.citizenReactions)])
    bad = []
    for tok in NUMBER.findall(text):
        v = abs(float(tok.replace(",", ".").replace("−", "-")))
        if v <= 5 and v == int(v):
            continue  # «2 риска», «3 года», «на 3–5 единиц» — служебные малые числа
        if round(v, 1) not in allowed and float(round(v)) not in allowed:
            bad.append(tok)
    return bad


def validate_explanation(data: dict, p: SimulationPayload) -> Explanation:
    expl = Explanation.model_validate(data)
    bad = ungrounded_numbers(expl, p)
    if bad:
        raise ValueError(f"числа не из входных данных: {bad[:5]}")
    if FORBIDDEN_CLAIMS.search(expl.model_dump_json()):
        raise ValueError("заявление об официальных данных")
    return expl


# ---------- rate limit ----------

class RateLimiter:
    def __init__(self, limit: int = 20, window: float = 60.0) -> None:
        self.limit, self.window = limit, window
        self.hits: dict[str, deque[float]] = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self.lock:
            q = self.hits[key]
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.limit:
                return False
            q.append(now)
            return True


limiter = RateLimiter()
_cache: dict[str, dict] = {}


def get_client() -> LLMClient:
    return LLMClient()


def fallback(reason: str) -> dict:
    return {"success": False, "useFallback": True, "reason": reason}


@router.get("/health")
def health() -> dict:
    client = get_client()
    return {"status": "ok", "llm": {"configured": client.configured, "model": client.model if client.configured else None}}


@router.post("/explain")
def explain(body: dict, request: Request) -> dict:
    ip = request.client.host if request.client else "unknown"
    if not limiter.allow(ip):
        return fallback("слишком много запросов, попробуйте через минуту")
    try:
        payload = ExplainRequest.model_validate(body).simulationResult
    except ValidationError:
        return fallback("некорректные входные данные")

    client = get_client()
    if not client.configured:
        return fallback("LLM не настроен (LLM_API_KEY / LLM_API_URL)")

    key = payload.model_dump_json()
    if key in _cache:
        return _cache[key]

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(payload.model_dump(), ensure_ascii=False)},
    ]
    try:
        expl = validate_explanation(client.chat_json(messages), payload)
    except (LLMError, ValidationError, ValueError) as e:
        log.warning("explain fallback: %s", str(e)[:200])
        return fallback("ответ AI не прошёл проверку")

    result = {"success": True, "data": expl.model_dump(), "model": client.model}
    if len(_cache) < 500:
        _cache[key] = result
    return result
