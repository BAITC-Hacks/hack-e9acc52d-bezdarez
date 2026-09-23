"""Structured replies and bounded format negotiation without network calls."""

from copy import deepcopy
import json
from unittest.mock import Mock

import pytest

from app.assistant import AssistAnswer
from app.llm import LLMChain, LLMClient, LLMError


SCHEMA = AssistAnswer.model_json_schema()
MESSAGES = [{"role": "user", "content": "Сколько будет 17 × 23?"}]
ANSWER = {"answer": "17 × 23 = 391.", "actions": []}


def completion():
    return {"choices": [{"finish_reason": "stop", "message": {"content": json.dumps(ANSWER)}}]}


def client_for(endpoint):
    return LLMClient(api_url=endpoint, api_key="test-private-key", model="test-model", retries=0)


@pytest.mark.parametrize("endpoint", [
    "http://127.0.0.1:18089/v1", "http://localhost:18089/v1", "http://[::1]:18089/v1",
])
def test_local_payload_includes_schema_and_preserves_chat_options(monkeypatch, endpoint):
    client = client_for(endpoint)
    post = Mock(return_value=completion())
    monkeypatch.setattr(client, "_post", post)
    assert client.chat_json(MESSAGES, temperature=0.3, max_tokens=2200, response_schema=SCHEMA) == ANSWER
    post.assert_called_once()
    path, payload = post.call_args.args
    assert path == "/chat/completions"
    assert payload == {
        "model": "test-model", "messages": MESSAGES, "temperature": 0.3,
        "max_tokens": 2200, "response_format": {"type": "json_object", "schema": SCHEMA},
    }
    assert "test-private-key" not in json.dumps(payload)


def test_remote_provider_receives_standard_named_json_schema(monkeypatch):
    client = client_for("https://example.com/v1")
    post = Mock(return_value=completion())
    monkeypatch.setattr(client, "_post", post)
    assert client.chat_json(MESSAGES, response_schema=SCHEMA) == ANSWER
    assert post.call_args.args[1]["response_format"] == {
        "type": "json_schema",
        "json_schema": {"name": "assistant_reply", "schema": SCHEMA, "strict": True},
    }


@pytest.mark.parametrize("endpoint", ["http://127.0.0.1:18089/v1", "https://example.com/v1"])
def test_unsupported_schema_degrades_to_object_then_plain_json(monkeypatch, endpoint):
    client = client_for(endpoint)
    calls = []

    def post(path, payload):
        calls.append((path, deepcopy(payload)))
        if len(calls) < 3:
            raise LLMError("HTTP 400" if len(calls) == 1 else "HTTP 422")
        return completion()

    monkeypatch.setattr(client, "_post", post)
    assert client.chat_json(MESSAGES, max_tokens=2200, response_schema=SCHEMA) == ANSWER
    assert len(calls) == 3
    first_format = calls[0][1]["response_format"]
    assert first_format.get("schema", first_format.get("json_schema", {}).get("schema")) == SCHEMA
    assert calls[1][1]["response_format"] == {"type": "json_object"}
    assert "response_format" not in calls[2][1]
    for path, payload in calls:
        assert path == "/chat/completions"
        assert payload["messages"] == MESSAGES
        assert payload["max_tokens"] == 2200


def test_failed_format_negotiation_stops_after_three_attempts(monkeypatch):
    client = client_for("http://127.0.0.1:18089/v1")
    post = Mock(side_effect=LLMError("HTTP 400"))
    monkeypatch.setattr(client, "_post", post)
    with pytest.raises(LLMError, match="HTTP 400"):
        client.chat_json(MESSAGES, response_schema=SCHEMA)
    assert post.call_count == 3


@pytest.mark.parametrize("error", ["HTTP 401", "HTTP 403", "HTTP 404", "HTTP 429", "HTTP 500", "HTTP 503", "TimeoutError", "URLError"])
def test_nonformat_errors_do_not_retry_with_weaker_format(monkeypatch, error):
    client = client_for("http://127.0.0.1:18089/v1")
    post = Mock(side_effect=LLMError(error))
    monkeypatch.setattr(client, "_post", post)
    with pytest.raises(LLMError, match=error):
        client.chat_json(MESSAGES, response_schema=SCHEMA)
    post.assert_called_once()
    assert post.call_args.args[1]["response_format"] == {"type": "json_object", "schema": SCHEMA}


def test_call_without_schema_keeps_existing_explain_format_and_defaults(monkeypatch):
    client = client_for("http://127.0.0.1:18089/v1")
    post = Mock(return_value=completion())
    monkeypatch.setattr(client, "_post", post)
    assert client.chat_json(MESSAGES) == ANSWER
    payload = post.call_args.args[1]
    assert payload["response_format"] == {"type": "json_object"}
    assert payload["max_tokens"] == 1200
    assert payload["temperature"] == 0.2


def test_object_only_mode_has_single_plain_json_fallback(monkeypatch):
    client = client_for("https://example.com/v1")
    formats = []

    def post(_path, payload):
        formats.append(deepcopy(payload.get("response_format")))
        if len(formats) == 1:
            raise LLMError("HTTP 422")
        return completion()

    monkeypatch.setattr(client, "_post", post)
    assert client.chat_json(MESSAGES) == ANSWER
    assert formats == [{"type": "json_object"}, None]


def test_provider_chain_forwards_schema_to_fallback_provider():
    # Construct only the provider chain needed here; no environment or credentials.
    chain = LLMChain.__new__(LLMChain)
    first = Mock(model="first-model")
    first.chat_json.side_effect = LLMError("HTTP 503")
    second = Mock(model="second-model")
    second.chat_json.return_value = ANSWER
    chain.providers = [first, second]
    chain.model = first.model
    assert chain.chat_json(MESSAGES, max_tokens=2200, response_schema=SCHEMA) == ANSWER
    first.chat_json.assert_called_once_with(MESSAGES, max_tokens=2200, response_schema=SCHEMA)
    second.chat_json.assert_called_once_with(MESSAGES, max_tokens=2200, response_schema=SCHEMA)
    assert chain.model == "second-model"
