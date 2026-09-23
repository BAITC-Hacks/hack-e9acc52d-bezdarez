"""Conversation and proposed-action boundaries; no API keys or network required."""

from copy import deepcopy
from datetime import datetime
import io
import json
import urllib.error

import pytest
from fastapi.testclient import TestClient

from app import explain as ex
from app.llm import DEFAULT_API_URL, LLMChain, LLMClient, LLMError, extract_json
from app.main import app

CATEGORIES = ["transport", "greening", "social", "safety", "services"]


class FakeClient:
    configured = True
    model = "test/local-model"

    def __init__(self, answer=None):
        self.answer = answer if answer is not None else {"answer": "Сравним проекты и их компромиссы."}
        self.calls = []

    def chat_json(self, messages, **kwargs):
        self.calls.append((messages, kwargs))
        if isinstance(self.answer, Exception):
            raise self.answer
        return self.answer


@pytest.fixture
def provider(monkeypatch):
    client = FakeClient()
    monkeypatch.setattr(ex, "get_client", lambda: client)
    monkeypatch.setattr(ex, "limiter", ex.RateLimiter(limit=100))
    return client


@pytest.fixture
def request_body():
    effects = {"mobility": 8, "ecology": -2, "social": 1, "safety": 2, "services": 4}
    scores = {"mobility": 62, "ecology": 53.2, "social": 64.2, "safety": 73.1, "services": 81.7}
    outcome = {"scores": scores, "overall": 64.1, "penaltyTotal": 0, "penalties": [], "positiveEffects": [], "risks": []}
    return {
        "question": "Как улучшить этот план?",
        "history": [{"role": "user", "content": "Хочу улучшить экологию."}, {"role": "assistant", "content": "Рассмотрим озеленение."}],
        "lang": "kk",
        "context": {
            "decisions": [{"category": c, "projectId": c + "-project", "allocatedBudget": 20} for c in CATEGORIES],
            "allocated": 100,
            "budgets": {c: 20 for c in CATEGORIES},
            "catalog": [{
                "id": c + "-project", "category": c, "title": "Проект " + c,
                "shortDescription": "Описание", "fullDescription": "Подробное описание",
                "minBudget": 10, "recommendedBudget": 20, "maxBudget": 35,
                "effects": effects, "longTermMultiplier": 1.2, "maintenanceCost": 2,
                "speed": "fast", "benefits": ["Польза"], "risks": ["Компромисс"], "tags": ["Город"],
            } for c in CATEGORIES],
            "synergies": [{"id": "pair", "projects": ["transport-project", "greening-project"], "bonus": {"ecology": 2}, "description": "Бонус экологии"}],
            "forecast": {"overallBefore": 58.3, "oneYear": outcome, "threeYears": {**outcome, "overall": 68.3}},
            "screen": "result", "incomplete": False,
        },
    }


def ask(body):
    response = TestClient(app).post("/api/assist", json=body)
    assert response.status_code == 200
    return response.json()


def test_history_and_fresh_context_reach_provider(provider, request_body):
    request_body["question"] = "  А через три года?  "
    response = ask(request_body)
    assert response["success"] and response["actions"] == []
    messages, options = provider.calls[0]
    assert [m["role"] for m in messages] == ["system", "user", "assistant", "user"]
    assert messages[1:3] == request_body["history"]
    assert "қазақ" in messages[0]["content"]
    latest = json.loads(messages[-1]["content"])
    assert latest["question"] == "А через три года?"
    context = latest["context"]
    assert context["forecast"] == request_body["context"]["forecast"]
    assert context["decisions"] == request_body["context"]["decisions"]
    assert context["synergies"] == request_body["context"]["synergies"]
    assert context["catalogIncluded"] is True
    assert [p["id"] for p in context["catalog"]] == [p["id"] for p in request_body["context"]["catalog"]]
    assert context["catalog"][0]["effects"] == request_body["context"]["catalog"][0]["effects"]
    assert "fullDescription" not in context["catalog"][0]
    assert "longTermMultiplier" in context["catalog"][0]
    assert options["max_tokens"] > 400


def test_partial_draft_preserves_budgets_of_unselected_categories(provider, request_body):
    request_body["context"]["decisions"] = request_body["context"]["decisions"][:1]
    assert ask(request_body)["success"]
    context = json.loads(provider.calls[0][0][-1]["content"])["context"]
    assert context["allocated"] == 100
    assert len(context["decisions"]) == 1
    assert len(context["budgets"]) == 5
    assert context["incomplete"] is True


@pytest.mark.parametrize("action", [
    {"type": "goto", "category": "social"},
    {"type": "select", "category": "transport", "projectId": "transport-project"},
    {"type": "budget", "category": "greening", "amount": 27},
    {"type": "balance"},
    {"type": "run"},
])
def test_valid_actions_are_returned_as_proposals(provider, request_body, action):
    provider.answer = {"answer": "Можно применить это предложение.", "actions": [{"label": "Применить", "do": action}]}
    response = ask(request_body)
    assert response["success"]
    assert response["actions"][0]["do"] == action


def test_complete_plan_preserves_validated_project_ids_and_budgets(provider, request_body):
    action = {"type": "plan", "decisions": request_body["context"]["decisions"]}
    provider.answer = {"answer": "Предлагаю полный план на 100 единиц.", "actions": [{"label": "Применить план", "do": action}]}
    assert ask(request_body)["actions"][0]["do"] == action


@pytest.mark.parametrize("action", [
    {"type": "select", "category": "transport", "projectId": "invented"},
    {"type": "select", "category": "social", "projectId": "transport-project"},
    {"type": "goto", "category": "invented"},
    {"type": "budget", "category": "transport", "amount": 41},
    {"type": "budget", "category": "transport", "amount": 4},
    {"type": "budget", "category": "transport", "amount": 20.5},
    {"type": "budget", "category": "transport", "amount": "20"},
    {"type": "execute", "command": "anything"},
    {"type": "balance", "extra": True},
])
def test_invalid_action_rejects_the_whole_response(provider, request_body, action):
    provider.answer = {"answer": "Совет", "actions": [{"label": "Применить", "do": action}]}
    response = ask(request_body)
    assert response["useFallback"] is True
    assert "actions" not in response and "answer" not in response


@pytest.mark.parametrize("failure", ["sum", "duplicate", "missing", "unknown", "category", "range"])
def test_invalid_full_plan_is_never_returned(provider, request_body, failure):
    decisions = deepcopy(request_body["context"]["decisions"])
    if failure == "sum":
        decisions[0]["allocatedBudget"] = 21
    elif failure == "duplicate":
        decisions[1] = decisions[0]
    elif failure == "missing":
        decisions.pop()
    elif failure == "unknown":
        decisions[0]["projectId"] = "invented"
    elif failure == "category":
        decisions[0]["projectId"] = decisions[1]["projectId"]
    else:
        decisions[0]["allocatedBudget"] = 4
        decisions[1]["allocatedBudget"] = 36
    provider.answer = {"answer": "План", "actions": [{"label": "Применить", "do": {"type": "plan", "decisions": decisions}}]}
    assert ask(request_body)["useFallback"] is True


def test_run_requires_a_complete_valid_draft(provider, request_body):
    request_body["context"]["decisions"].pop()
    provider.answer = {"answer": "Запустить", "actions": [{"label": "Запустить", "do": {"type": "run"}}]}
    assert ask(request_body)["useFallback"] is True


@pytest.mark.parametrize("failure", ["blank", "long", "role", "history", "message", "catalog", "duplicate", "budgets", "synergy", "effects"])
def test_invalid_input_is_rejected_before_provider_call(provider, request_body, failure):
    if failure == "blank":
        request_body["question"] = "  \n "
    elif failure == "long":
        request_body["question"] = "x" * 2001
    elif failure == "role":
        request_body["history"][0]["role"] = "system"
    elif failure == "history":
        request_body["history"] *= 9
    elif failure == "message":
        request_body["history"][0]["content"] = "x" * 6001
    elif failure == "catalog":
        request_body["context"]["decisions"][0]["projectId"] = "unknown"
    elif failure == "duplicate":
        request_body["context"]["decisions"][1] = request_body["context"]["decisions"][0]
    elif failure == "budgets":
        del request_body["context"]["budgets"]["social"]
    elif failure == "synergy":
        request_body["context"]["synergies"][0]["projects"][0] = "unknown"
    elif failure == "effects":
        request_body["context"]["catalog"][0]["effects"] = {"invented": 100}
    assert ask(request_body)["useFallback"] is True
    assert provider.calls == []


def test_maximum_question_and_history_are_supported(provider):
    response = ask({"question": "я" * 2000, "history": [{"role": "user", "content": "а" * 6000}] * 16})
    assert response["success"]


@pytest.mark.parametrize("answer", [
    {},
    {"answer": None},
    {"answer": ["not a string"]},
    {"answer": "   "},
    {"answer": "x" * 6001},
    {"answer": "Совет", "actions": [{"label": "Перейти", "do": {"type": "balance"}}] * 4},
    LLMError("provider unavailable"),
])
def test_unusable_provider_response_has_an_explicit_fallback(provider, request_body, answer):
    provider.answer = answer
    response = ask(request_body)
    assert response["success"] is False and response["useFallback"] is True
    assert "model" not in response


def test_grounded_deltas_and_proposed_budget_are_accepted(provider, request_body):
    provider.answer = {
        "answer": "В модели AQLS 64.1, рост на 5.8. Предлагаю увеличить бюджет озеленения на 7 до 27.",
        "actions": [{"label": "Бюджет 27", "do": {"type": "budget", "category": "greening", "amount": 27}}],
    }
    assert ask(request_body)["success"]


@pytest.mark.parametrize("question,answer", [
    ("Сколько будет 17 умножить на 23?", "17 × 23 = 391."),
    ("Напиши функцию сложения на Python.", "```python\ndef add(a, b):\n    return a + b\n\nprint(add(123, 456))  # 579\n```"),
    ("Когда появился язык Python?", "Первая версия Python вышла в 1991 году, 20 февраля."),
    ("Запиши сто тысяч и скорость света числами.", "Сто тысяч — 100 000. Скорость света в вакууме — 299792458 м/с."),
    ("Что такое официальная статистика?", "Официальная статистика — данные, публикуемые уполномоченными государственными органами."),
    ("Объясни нейропластичность простыми словами.", "Мозг способен изменять связи между нейронами по мере обучения."),
])
def test_free_questions_reach_llm_and_accept_general_knowledge(provider, request_body, question, answer):
    request_body["question"] = question
    provider.answer = {"answer": answer, "actions": []}
    response = ask(request_body)
    assert response == {"success": True, "answer": answer, "actions": [], "model": provider.model}
    assert len(provider.calls) == 1
    messages = provider.calls[0][0]
    latest = json.loads(messages[-1]["content"])
    assert latest["question"] == question
    assert "catalog" not in latest["context"]
    assert latest["context"]["catalogIncluded"] is False
    # Prior game discussion must not turn unrelated maths or code into a game-only answer.
    assert messages[1:3] == request_body["history"]
    assert "универсальный AI-помощник" in messages[0]["content"]
    assert "Форматы do" not in messages[0]["content"]


def test_server_date_and_no_browsing_limit_reach_the_model(provider):
    assert ask({"question": "Какая сегодня дата?"})["success"]
    system = provider.calls[0][0][0]["content"]
    assert datetime.now().astimezone().date().isoformat() in system
    assert "нет доступа к интернету" in system


def test_newest_whole_history_turns_fit_local_context(provider):
    history = [
        {"role": "user", "content": "старый вопрос " + "я" * 5986},
        {"role": "assistant", "content": "старый ответ " + "я" * 5986},
        {"role": "user", "content": "Я учу Python. " + "я" * 900},
        {"role": "assistant", "content": "Начнём с функций. " + "я" * 900},
    ]
    assert ask({"question": "Объясни проще", "history": history})["success"]
    messages = provider.calls[0][0]
    assert messages[1:-1] == history[-2:]
    assert json.loads(messages[-1]["content"])["question"] == "Объясни проще"


def test_conversational_follow_up_keeps_the_prior_topic(provider):
    history = [
        {"role": "user", "content": "Объясни, что такое функция в Python."},
        {"role": "assistant", "content": "Функция — переиспользуемый фрагмент кода."},
    ]
    provider.answer = {"answer": "Например, def square(x): return x * x. square(17) вернёт 289."}
    response = ask({"question": "Покажи пример", "history": history})
    assert response["success"]
    assert provider.calls[0][0][1:-1] == history


def test_catalog_project_name_retrieves_simulation_context(provider, request_body):
    request_body["context"]["catalog"][0]["title"] = "Адаптивные светофоры"
    request_body["question"] = "Чем полезны светофоры?"
    assert ask(request_body)["success"]
    latest = json.loads(provider.calls[0][0][-1]["content"])
    assert latest["context"]["catalogIncluded"] is True
    assert latest["context"]["catalog"][0]["title"] == "Адаптивные светофоры"


def test_maximum_answer_length_is_preserved(provider):
    provider.answer = {"answer": "я" * 6000}
    response = ask({"question": "Напиши подробное объяснение"})
    assert response["success"] and response["answer"] == "я" * 6000


def test_offline_status_does_not_masquerade_as_ai(provider):
    provider.configured = False
    response = ask({"question": "Привет"})
    assert response["useFallback"] and "answer" not in response
    assert provider.calls == []


def test_assistant_rate_limit_avoids_second_provider_call(provider, monkeypatch):
    monkeypatch.setattr(ex, "limiter", ex.RateLimiter(limit=1))
    assert ask({"question": "Привет"})["success"]
    assert ask({"question": "Ещё вопрос"})["useFallback"]
    assert len(provider.calls) == 1


def test_provider_errors_are_not_echoed_into_response_or_logs(provider, caplog):
    provider.answer = LLMError("secret-key-123 response body")
    response = ask({"question": "Привет"})
    assert response["useFallback"]
    assert "secret-key-123" not in json.dumps(response) + caplog.text


@pytest.mark.parametrize("endpoint,configured", [("", False), (DEFAULT_API_URL, False), ("http://127.0.0.1:11434/v1", True)])
def test_provider_configuration_requires_a_key_for_public_nvidia(monkeypatch, endpoint, configured):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    monkeypatch.setenv("LLM_API_URL", endpoint)
    assert LLMChain().configured is configured
    assert TestClient(app).get("/api/health").json()["llm"]["configured"] is configured


def test_nvidia_fallback_key_is_not_sent_to_local_provider(monkeypatch):
    monkeypatch.setenv("LLM_API_URL", "http://127.0.0.1:11434/v1")
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.setenv("NVIDIA_API_KEY", "test-fallback-key")
    chain = LLMChain()
    assert chain.providers[0].api_key == ""
    assert chain.providers[1].api_key == "test-fallback-key"


def test_http_error_does_not_expose_provider_body(monkeypatch):
    client = LLMClient(api_key="test-key", retries=0)
    def fail(*args, **kwargs):
        raise urllib.error.HTTPError(DEFAULT_API_URL, 401, "Unauthorized", {}, io.BytesIO(b"echo-secret-key"))
    monkeypatch.setattr("urllib.request.urlopen", fail)
    with pytest.raises(LLMError, match=r"^HTTP 401$"):
        client.chat_json([])


@pytest.mark.parametrize("content", [None, [], {"answer": "hello"}, 3])
def test_nontext_provider_content_is_a_handled_llm_error(content):
    with pytest.raises(LLMError):
        extract_json(content)


def test_truncated_provider_completion_is_rejected(monkeypatch):
    client = LLMClient(api_key="test-key")
    monkeypatch.setattr(client, "_post", lambda *args: {"choices": [{"finish_reason": "length", "message": {"content": '{"answer":"cut short"}'}}]})
    with pytest.raises(LLMError, match="неполный"):
        client.chat_json([])
