import json
from types import SimpleNamespace

import pytest

from app.models.schemas import Selection
from app.services import ai_analysis as ai
from app.services.catalog import load_catalog


DEMO = [
    Selection(measure_id="M7", district_id="nura"),
    Selection(measure_id="M8", district_id="nura"),
    Selection(measure_id="M10", district_id="nura"),
    Selection(measure_id="M12"),
    Selection(measure_id="M5", district_id="saryarka"),
]


@pytest.fixture
def ctx():
    return ai._Context(DEMO, None, load_catalog())


def fake_provider(monkeypatch, responses):
    import anthropic

    calls = []

    class Client:
        def __init__(self, **kwargs):
            assert kwargs["max_retries"] == 0
            self.messages = self

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def create(self, **kwargs):
            calls.append(kwargs)
            response = next(responses)
            if isinstance(response, Exception):
                raise response
            return response

    monkeypatch.setattr(anthropic, "Anthropic", Client)
    return calls


def completion(report, stop_reason="end_turn"):
    return SimpleNamespace(
        stop_reason=stop_reason,
        model="test-model",
        content=[SimpleNamespace(type="text", text=report.model_dump_json())],
    )


def test_stable_provider_receives_engine_results_before_answer(monkeypatch, ctx):
    report = ai._rule_based(ctx)
    # Recommendations require the corresponding tool data; use qualitative text
    # here to exercise the valid single-request path.
    report.recommendations = ["Сравните альтернативу через движок."]
    ctx.reset_numbers()
    calls = fake_provider(monkeypatch, iter([completion(report)]))
    response = ai._run_llm(ctx)
    assert response.source == "llm"
    assert response.grounding.unverified_numbers == []
    args = calls[0]
    assert "betas" not in args and "fallbacks" not in args
    assert args["output_config"]["format"]["type"] == "json_schema"
    prompt = args["messages"][0]["content"]
    payload = json.loads(prompt.split("Результаты детерминированного движка:\n")[1])
    assert payload["get_simulation_result"]["score"] == 56.54
    assert payload["get_selected_scenario"]["spent"] == 95
    assert len(payload["get_indicator_changes"]["by_district"]) == 5


def test_tool_call_runs_engine_and_passes_result_to_provider(monkeypatch, ctx):
    report = ai._rule_based(ctx)
    ctx.reset_numbers()
    tool_response = SimpleNamespace(
        stop_reason="tool_use", model="test-model",
        content=[SimpleNamespace(type="tool_use", name="find_best_swaps", input={}, id="tool-1")],
    )
    calls = fake_provider(monkeypatch, iter([tool_response, completion(report)]))
    response = ai._run_llm(ctx)
    assert response.tool_calls == ["find_best_swaps"]
    tool_result = calls[1]["messages"][-1]["content"][0]
    assert tool_result["tool_use_id"] == "tool-1"
    assert json.loads(tool_result["content"])["best_single_swaps"]


@pytest.mark.parametrize("failure", ["invented_number", "incomplete", "truncated", "unavailable", "insufficient"])
def test_unreliable_llm_is_replaced_by_labelled_engine_report(monkeypatch, ctx, failure):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.delenv("AI_DISABLED", raising=False)
    report = ai._rule_based(ctx)
    report.recommendations = ["Проверьте альтернативу через движок."]
    if failure == "invented_number":
        report.summary = "Итоговая оценка 999.99."
    elif failure == "incomplete":
        report.district_impacts = []
    elif failure == "insufficient":
        report.data_sufficient = False
    response = RuntimeError("provider unavailable") if failure == "unavailable" else completion(
        report, "max_tokens" if failure == "truncated" else "end_turn",
    )
    fake_provider(monkeypatch, iter([response]))
    result = ai.analyze(DEMO)
    assert result.source == "rule_based"
    assert result.note
    assert "999.99" not in result.report.summary
    assert "56.54" in result.report.summary
    assert result.grounding.unverified_numbers == []


@pytest.mark.parametrize("text,allowed", [
    ("Score 9", [56.54]),
    ("Изменение -3.99", [3.99]),
    ("Доля 6250%", [62.5]),
    ("Score 56.55", [56.54]),
    ("Score 56.54e9", [56.54]),
    ("Бюджет 1 000", [1, 0]),
    ("Бюджет 1\u202f000", [1, 0]),
])
def test_numeric_guard_does_not_invent_allowances(text, allowed):
    report = ai.AnalysisReport(summary=text, strengths=[], tradeoffs=[], risks=[], district_impacts=[], recommendations=[])
    assert ai.grounding_check(report, allowed).unverified_numbers


def test_fallback_preserves_exact_lag_fraction(monkeypatch):
    monkeypatch.setenv("AI_DISABLED", "true")
    result = ai.analyze(DEMO)
    assert any("62.5%" in item for item in result.report.tradeoffs)
    assert not any("62%" in item for item in result.report.tradeoffs)
    assert result.grounding.unverified_numbers == []


def test_empty_alternative_is_reported_invalid(monkeypatch):
    monkeypatch.setenv("AI_DISABLED", "true")
    result = ai.analyze(DEMO, alternative=[])
    assert "недопустима" in result.report.alternative_verdict


def test_equal_alternative_does_not_claim_a_losing_district(monkeypatch):
    monkeypatch.setenv("AI_DISABLED", "true")
    verdict = ai.analyze(DEMO, alternative=DEMO).report.alternative_verdict
    assert "равноценны" in verdict
    assert "теряет" not in verdict


def test_provider_response_after_deadline_is_rejected(monkeypatch, ctx):
    monkeypatch.setenv("AI_TIMEOUT_SECONDS", "120")
    report = ai._rule_based(ctx)
    fake_provider(monkeypatch, iter([completion(report)]))
    ticks = iter([0, 1, 181])
    monkeypatch.setattr(ai.time, "monotonic", lambda: next(ticks))
    with pytest.raises(TimeoutError, match="time budget"):
        ai._run_llm(ctx)
