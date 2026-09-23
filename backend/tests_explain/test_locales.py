from __future__ import annotations

import copy

import pytest
from fastapi.testclient import TestClient

from app import explain as ex
from app.assistant import AssistRequest, build_messages, needs_simulation_context
from app.main import app
from tests_explain.test_explain import FakeClient, GOOD, PAYLOAD


@pytest.fixture(autouse=True)
def clean_locale_state(monkeypatch):
    ex._cache.clear()
    monkeypatch.setattr(ex, "limiter", ex.RateLimiter(limit=100))


@pytest.mark.parametrize("lang, guidance", [("kk", "табиғи қазақ тілінде"), ("en", "natural, clear English")])
def test_chat_language_is_explicit_without_rewriting_history(lang, guidance):
    req = AssistRequest.model_validate({
        "question": "Continue, please", "lang": lang,
        "history": [
            {"role": "user", "content": "Меня зовут Алина."},
            {"role": "assistant", "content": "Танысқаныма қуаныштымын, Алина!"},
        ],
    })
    messages = build_messages(req)
    assert guidance in messages[0]["content"]
    assert "Язык старых сообщений не меняет" in messages[0]["content"]
    assert "явная просьба пользователя ответить на другом языке" in messages[0]["content"]
    assert messages[1:3] == [item.model_dump() for item in req.history]


@pytest.mark.parametrize("question, lang", [
    ("Көлік қолжетімділігін қалай жақсартамын?", "kk"),
    ("Қаржыны теңестіріп бер", "kk"),
    ("How can I reduce traffic?", "en"),
    ("Suggest a synergy", "en"),
])
def test_localized_simulator_queries_receive_simulator_evidence(question, lang):
    assert needs_simulation_context(AssistRequest(question=question, lang=lang))


@pytest.mark.parametrize("lang, expected", [("kk", "Қоғамдық көлік жолаушысы"), ("en", "Public transport passenger")])
def test_explanation_prompt_has_one_language_and_localized_roles(monkeypatch, lang, expected):
    class CapturingClient(FakeClient):
        def chat_json(self, messages, **kwargs):
            self.messages = messages
            return super().chat_json(messages, **kwargs)

    client = CapturingClient(GOOD)
    monkeypatch.setattr(ex, "get_client", lambda: client)
    response = TestClient(app).post("/api/explain", json={"simulationResult": PAYLOAD, "lang": lang}).json()
    assert response["success"]
    system = client.messages[0]["content"]
    assert "нейтральным языком на русском" not in system
    assert expected in system
    assert "Keep JSON keys and numeric values unchanged" in system


def test_explanation_cache_is_separate_per_language(monkeypatch):
    client = FakeClient(GOOD)
    monkeypatch.setattr(ex, "get_client", lambda: client)
    api = TestClient(app)
    for lang in ["ru", "kk", "en", "kk", "en", "ru"]:
        assert api.post("/api/explain", json={"simulationResult": PAYLOAD, "lang": lang}).json()["success"]
    assert client.calls == 3
    assert len(ex._cache) == 3


@pytest.mark.parametrize("claim", [
    "According to official statistics, AQLS is 64.1.",
    "The official forecast is 64.1.",
    "Ресми деректер бойынша AQLS 64.1.",
    "Әкімдіктің деректері бойынша AQLS 64.1.",
])
def test_official_claim_guard_applies_in_english_and_kazakh(claim):
    response = copy.deepcopy(GOOD)
    response["summary"] = claim
    with pytest.raises(ValueError, match="официальных"):
        ex.validate_explanation(response, ex.SimulationPayload.model_validate(PAYLOAD))


@pytest.mark.parametrize("lang, summary", [("kk", "Көрсеткіш 999 ұпай болды."), ("en", "The score reached 999 points.")])
def test_numeric_grounding_remains_strict_in_both_languages(monkeypatch, lang, summary):
    client = FakeClient({**GOOD, "summary": summary})
    monkeypatch.setattr(ex, "get_client", lambda: client)
    response = TestClient(app).post("/api/explain", json={"simulationResult": PAYLOAD, "lang": lang}).json()
    assert response == {"success": False, "useFallback": True, "reason": "invalid_response"}


def test_backend_failure_reason_is_a_language_neutral_code(monkeypatch):
    monkeypatch.setattr(ex, "get_client", lambda: FakeClient(configured=False))
    for lang in ["ru", "kk", "en"]:
        response = TestClient(app).post("/api/explain", json={"simulationResult": PAYLOAD, "lang": lang}).json()
        assert response["reason"] == "not_configured"


def test_assistant_keeps_mixed_language_history_and_uses_stable_generation(monkeypatch):
    class CapturingClient(FakeClient):
        def chat_json(self, messages, **kwargs):
            self.messages, self.kwargs = messages, kwargs
            return super().chat_json(messages, **kwargs)

    history = [
        {"role": "user", "content": "Үйде суды үнемдеудің үш жолын айт."},
        {"role": "assistant", "content": "Кранды жабуды ұмытпаңыз. Ақауларды жөндеңіз. Душ уақытын қысқартыңыз."},
        {"role": "user", "content": "Менің атым Айдана. Интернет қалай жұмыс істейді?"},
        {"role": "assistant", "content": "Айдана, интернет құрылғыларды байланыстырады."},
    ]
    client = CapturingClient({"answer": "Your name is Aidana. We last discussed how the internet works.", "actions": []})
    monkeypatch.setattr(ex, "get_client", lambda: client)
    question = "What is my name, and what did we discuss most recently?"
    response = TestClient(app).post("/api/assist", json={"question": question, "history": history, "lang": "en"}).json()
    assert response["success"]
    assert client.messages[1:-1] == history
    assert question in client.messages[-1]["content"]
    assert "natural, clear English" in client.messages[0]["content"]
    assert client.kwargs["temperature"] == 0.3
    assert client.kwargs["response_schema"]["properties"]["actions"]
