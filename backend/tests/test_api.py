import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import ai_analysis

client = TestClient(app)

DEMO = [
    {"measure_id": "M7", "district_id": "nura"},
    {"measure_id": "M8", "district_id": "nura"},
    {"measure_id": "M10", "district_id": "nura"},
    {"measure_id": "M12", "district_id": None},
    {"measure_id": "M5", "district_id": "saryarka"},
]


@pytest.fixture(autouse=True)
def no_llm(monkeypatch):
    monkeypatch.setenv("AI_DISABLED", "1")


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_game():
    body = client.get("/api/game").json()
    assert body["rules"]["budget"] == 100
    assert len(body["districts"]) == 5
    assert len(body["initiatives"]) == 14
    assert round(body["baseline"]["score"], 2) == 52.56


def test_validate_partial_returns_availability():
    body = client.post("/api/simulation/validate", json={"selections": DEMO[:2]}).json()
    assert body["valid"] is False and body["complete"] is False
    assert body["spent"] == 44 and body["remaining"] == 56
    assert body["availability"]["M9"]["available"] is False  # social limit reached
    assert body["availability"]["M4"]["blocked_districts"] == {"nura": body["availability"]["M4"]["blocked_districts"]["nura"]}


def test_calculate_demo():
    body = client.post("/api/simulation/calculate", json={"selections": DEMO}).json()
    assert round(body["scenario"]["score"], 2) == 56.54
    assert round(body["score_delta"], 2) == 3.99


def test_calculate_rejects_invalid_even_if_frontend_bypassed():
    bad = [*DEMO[:4], {"measure_id": "M3", "district_id": "nura"}, {"measure_id": "M1", "district_id": "nura"}]
    r = client.post("/api/simulation/calculate", json={"selections": bad})
    assert r.status_code == 422
    codes = {i["code"] for i in r.json()["detail"]["issues"]}
    assert {"too_many_measures", "conflict", "budget_exceeded"} <= codes


def test_compare():
    alt = [*DEMO[:4], {"measure_id": "M4", "district_id": "saryarka"}]
    body = client.post("/api/simulation/compare", json={"base": {"selections": DEMO}, "alternative": {"selections": alt}}).json()
    diff = body["alternative"]["scenario"]["score"] - body["base"]["scenario"]["score"]
    assert body["score_difference"] == pytest.approx(diff)


def test_analyze_rule_based_is_grounded():
    body = client.post("/api/ai/analyze", json={"scenario": {"selections": DEMO}}).json()
    assert body["source"] == "rule_based"
    rep = body["report"]
    assert rep["summary"] and rep["strengths"] and rep["risks"] and rep["tradeoffs"] and rep["recommendations"]
    assert len(rep["district_impacts"]) == 5
    assert body["grounding"]["unverified_numbers"] == []


def test_analyze_with_alternative():
    alt = [*DEMO[:4], {"measure_id": "M4", "district_id": "saryarka"}]
    body = client.post("/api/ai/analyze", json={"scenario": {"selections": DEMO}, "alternative": {"selections": alt}}).json()
    assert body["report"]["alternative_verdict"]
    assert body["grounding"]["unverified_numbers"] == []


def test_analyze_rejects_invalid():
    r = client.post("/api/ai/analyze", json={"scenario": {"selections": DEMO[:3]}})
    assert r.status_code == 422


def test_grounding_flags_invented_numbers():
    rep = ai_analysis.AnalysisReport(
        summary="Score вырос до 56.54, а бюджет M7 составил 999.",
        strengths=[], tradeoffs=[], risks=[], district_impacts=[], recommendations=[],
    )
    g = ai_analysis.grounding_check(rep, [56.5431])
    assert g.unverified_numbers == ["999"]


def test_llm_tools_are_engine_backed():
    from app.models.schemas import Selection
    from app.services.catalog import load_catalog

    ctx = ai_analysis._Context([Selection(**s) for s in DEMO], None, load_catalog())
    res = ctx.run_tool("get_simulation_result", {})
    assert res["score"] == 56.54 and res["baseline_score"] == 52.56
    cmp = ctx.run_tool("compare_scenarios", {"selections": [*DEMO[:4], {"measure_id": "M6", "district_id": None}]})
    assert cmp["alternative"]["valid"] is True
    bad = ctx.run_tool("compare_scenarios", {"selections": DEMO[:2]})
    assert bad["alternative"]["valid"] is False
