from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app import explain as ex
from app.llm import LLMError, extract_json
from app.main import app

PAYLOAD = {
    "horizon": "1_year",
    "overallBefore": 58.3,
    "overallAfter": 64.1,
    "scoresBefore": {"mobility": 54, "ecology": 50, "social": 61, "safety": 68, "services": 60},
    "scoresAfter": {"mobility": 62, "ecology": 53.2, "social": 64.2, "safety": 73.1, "services": 81.7},
    "selectedProjects": [
        {"category": "transport", "title": "Адаптивные светофоры", "allocatedBudget": 20, "recommendedBudget": 20,
         "efficiencyPercent": 100, "speed": "fast", "maintenanceCost": 2, "risks": []},
    ],
    "synergies": ["Адаптивные светофоры + Цифровая платформа обращений: +2 к городским сервисам"],
    "penalties": [],
    "strategyProfile": "Сбалансированный управленец",
}

GOOD = {
    "summary": "AQLS вырос с 58.3 до 64.1: сильнее всего выросли городские сервисы (+21.7).",
    "positives": ["Мобильность выросла до 62.", "Сервисы 81.7.", "Безопасность 73.1."],
    "risks": ["Экология выросла слабо — всего до 53.2.", "Социальная сфера получила меньше внимания."],
    "recommendation": "Переведите 3–5 единиц из сервисов в озеленение.",
    "citizenReactions": [
        {"persona": "Пассажир", "text": "Автобусы едут быстрее."},
        {"persona": "Родитель", "text": "У школы почти без изменений."},
        {"persona": "Предприниматель", "text": "Заявки решаются быстрее."},
        {"persona": "Житель района", "text": "Во дворе светлее."},
    ],
}


class FakeClient:
    def __init__(self, response=None, error: Exception | None = None, configured=True):
        self.response, self.error, self.configured, self.model, self.calls = response, error, configured, "fake/model", 0

    def chat_json(self, messages, **kw):
        self.calls += 1
        if self.error:
            raise self.error
        return self.response


@pytest.fixture(autouse=True)
def fresh_state(monkeypatch):
    ex._cache.clear()
    monkeypatch.setattr(ex, "limiter", ex.RateLimiter(limit=100))


def use(monkeypatch, client):
    monkeypatch.setattr(ex, "get_client", lambda: client)
    return TestClient(app)


def test_success(monkeypatch):
    r = use(monkeypatch, FakeClient(GOOD)).post("/api/explain", json={"simulationResult": PAYLOAD}).json()
    assert r["success"] is True
    assert r["data"]["positives"][0] == "Мобильность выросла до 62."


def test_not_configured_uses_fallback(monkeypatch):
    r = use(monkeypatch, FakeClient(configured=False)).post("/api/explain", json={"simulationResult": PAYLOAD}).json()
    assert r == {"success": False, "useFallback": True, "reason": r["reason"]}


def test_llm_error_uses_fallback(monkeypatch):
    r = use(monkeypatch, FakeClient(error=LLMError("HTTP 503"))).post("/api/explain", json={"simulationResult": PAYLOAD}).json()
    assert r["useFallback"] is True


def test_invented_numbers_rejected(monkeypatch):
    bad = {**GOOD, "summary": "По модели качество жизни выросло на 37% за 12 месяцев."}
    r = use(monkeypatch, FakeClient(bad)).post("/api/explain", json={"simulationResult": PAYLOAD}).json()
    assert r["useFallback"] is True


def test_official_claim_rejected(monkeypatch):
    bad = {**GOOD, "summary": "Согласно официальным данным, AQLS 64.1."}
    r = use(monkeypatch, FakeClient(bad)).post("/api/explain", json={"simulationResult": PAYLOAD}).json()
    assert r["useFallback"] is True


def test_wrong_schema_rejected(monkeypatch):
    bad = {**GOOD, "positives": ["только один"]}
    r = use(monkeypatch, FakeClient(bad)).post("/api/explain", json={"simulationResult": PAYLOAD}).json()
    assert r["useFallback"] is True


def test_bad_input_rejected_without_llm_call(monkeypatch):
    client = FakeClient(GOOD)
    r = use(monkeypatch, client).post("/api/explain", json={"simulationResult": {**PAYLOAD, "overallAfter": 999}}).json()
    assert r["useFallback"] is True and client.calls == 0


def test_cache_avoids_second_llm_call(monkeypatch):
    client = FakeClient(GOOD)
    api = use(monkeypatch, client)
    api.post("/api/explain", json={"simulationResult": PAYLOAD})
    api.post("/api/explain", json={"simulationResult": PAYLOAD})
    assert client.calls == 1


def test_rate_limit(monkeypatch):
    monkeypatch.setattr(ex, "limiter", ex.RateLimiter(limit=1))
    api = use(monkeypatch, FakeClient(GOOD))
    api.post("/api/explain", json={"simulationResult": PAYLOAD})
    assert api.post("/api/explain", json={"simulationResult": PAYLOAD}).json()["useFallback"] is True


def test_health_does_not_leak_key(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "nvapi-secret")
    body = TestClient(app).get("/api/health").text
    assert "nvapi-secret" not in body


def test_extract_json_tolerates_wrappers():
    assert extract_json('<think>hmm</think>```json\n{"a": 1}\n```') == {"a": 1}
    with pytest.raises(LLMError):
        extract_json("нет json")


def test_assist_success(monkeypatch):
    r = use(monkeypatch, FakeClient({"answer": "Возьмите автобусные полосы."})).post(
        "/api/assist", json={"question": "Как снизить пробки?", "context": {"decisions": [], "allocated": 0}}
    ).json()
    assert r["success"] is True and "автобусные" in r["answer"]


def test_assist_fallbacks(monkeypatch):
    api = use(monkeypatch, FakeClient(configured=False))
    assert api.post("/api/assist", json={"question": "привет"}).json()["useFallback"] is True
    api = use(monkeypatch, FakeClient({"answer": ""}))
    assert api.post("/api/assist", json={"question": "привет"}).json()["useFallback"] is True
    assert api.post("/api/assist", json={"question": "x" * 301}).json()["useFallback"] is True
