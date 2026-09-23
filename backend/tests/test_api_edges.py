"""Ensure HTTP clients cannot bypass the deterministic engine's constraints."""

from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.test_api import DEMO

client = TestClient(app)


def selection(measure_id, district_id=None):
    return {"measure_id": measure_id, "district_id": district_id}


@pytest.mark.parametrize(("selections", "code"), [
    (DEMO[:4], "too_few_measures"),
    ([*DEMO, selection("M14")], "too_many_measures"),
    ([*DEMO[:4], selection("M7", "esil")], "duplicate_measure"),
    ([*DEMO[:4], selection("M9", "esil")], "category_limit"),
    ([selection("M7"), *DEMO[1:]], "district_required"),
    ([selection("M7", "moon"), *DEMO[1:]], "unknown_district"),
    ([selection("M99"), *DEMO[1:]], "unknown_measure"),
    ([*DEMO[:3], selection("M12", "nura"), DEMO[4]], "district_not_allowed"),
    ([*DEMO[:3], selection("M12", ""), DEMO[4]], "district_not_allowed"),
    ([selection("M1", "almaty"), selection("M3", "nura"), *DEMO[2:]], "conflict"),
    ([*DEMO[:4], selection("M4", "nura")], "conflict_same_district"),
    ([selection("M13", "saryarka"), *DEMO[1:]], "conflict_same_district"),
    ([selection("M3", "nura"), *DEMO[1:]], "budget_exceeded"),
])
def test_invalid_scenarios_are_rejected_and_never_scored(selections, code):
    validation = client.post("/api/simulation/validate", json={"selections": selections})
    assert validation.status_code == 200
    assert validation.json()["valid"] is False
    assert code in {issue["code"] for issue in validation.json()["issues"]}

    calculation = client.post("/api/simulation/calculate", json={"selections": selections})
    assert calculation.status_code == 422
    assert code in {issue["code"] for issue in calculation.json()["detail"]["issues"]}
    assert "score" not in calculation.json()
    assert "scenario" not in calculation.json()
    assert "score" not in calculation.json()["detail"]


@pytest.mark.parametrize("payload", [
    {"selections": None},
    {"selections": "M7"},
    {"selections": [None]},
    {"selections": [{}]},
    {"selections": [{"measure_id": 7}]},
    {"selections": [{"measure_id": "M7", "district_id": []}]},
])
def test_malformed_selections_return_422(payload):
    response = client.post("/api/simulation/calculate", json=payload)
    assert response.status_code == 422
    assert "scenario" not in response.json()


def test_client_numbers_cannot_override_catalog_or_score():
    forged = deepcopy(DEMO)
    forged[0].update(cost=0, effects={"S1": 100}, lag=0)
    response = client.post("/api/simulation/calculate", json={
        "selections": forged, "score": 100, "budget": 1000, "spent": 0,
    })
    assert response.status_code == 200
    body = response.json()
    assert body["budget"] == 100
    assert body["spent"] == 95
    assert body["scenario"]["score"] == pytest.approx(56.5431, abs=0.001)
    nura = next(district for district in body["districts"] if district["id"] == "nura")
    assert nura["after"]["S1"] == 48


def test_comparison_with_invalid_alternative_never_assigns_it_score():
    response = client.post("/api/simulation/compare", json={
        "base": {"selections": DEMO}, "alternative": {"selections": DEMO[:4]},
    })
    assert response.status_code == 200
    body = response.json()
    assert body["base"]["valid"] is True
    assert body["alternative"]["valid"] is False
    assert body["alternative"]["scenario"] is None
    assert body["alternative"]["score_delta"] is None
    assert body["score_difference"] is None


def test_game_state_is_identical_after_simulation():
    before = client.get("/api/game").json()
    assert client.post("/api/simulation/calculate", json={"selections": DEMO}).status_code == 200
    assert client.get("/api/game").json() == before
