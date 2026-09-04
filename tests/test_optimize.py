"""Tests for the POST /api/optimize endpoint."""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

import pandas as pd


def _make_test_app():
    from contextlib import asynccontextmanager
    import asyncio
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from backend.main import OptimizeRequest, _evaluate_maintain_profile

    @asynccontextmanager
    async def _lifespan(a: FastAPI):
        yield

    test_app = FastAPI(lifespan=_lifespan)
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @test_app.post("/api/optimize")
    async def optimize(req: OptimizeRequest):
        result = await asyncio.get_running_loop().run_in_executor(
            None,
            _evaluate_maintain_profile,
            req.current_time,
            req.current_state,
        )
        return [result]

    return test_app


@pytest.fixture
def client():
    return TestClient(_make_test_app())


@pytest.fixture
def mock_scenario():
    df = pd.DataFrame({
        "time": [float(t) for t in range(0, 310)],
        "throttle": [0.7] * 310,
        "altitude": [10000.0] * 310,
    })
    with patch("backend.main._get_scenario_data", return_value=df):
        yield df


class TestOptimizeEndpoint:
    def test_returns_array_with_maintain_profile(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={"current_time": 0.0})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1
        option = data[0]
        assert option["action"] == "Maintain Profile"

    def test_response_schema(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={"current_time": 0.0})
        data = resp.json()
        option = data[0]
        assert "action" in option
        assert "description" in option
        assert "simParams" in option
        assert "simResult" in option
        result = option["simResult"]
        assert "simulatedRisk" in result
        assert "rul" in result
        assert "engineAlive" in result

    def test_risk_is_numeric(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={"current_time": 0.0})
        option = resp.json()[0]
        assert isinstance(option["simResult"]["simulatedRisk"], (int, float))
        assert 5 <= option["simResult"]["simulatedRisk"] <= 95

    def test_rul_is_numeric(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={"current_time": 0.0})
        option = resp.json()[0]
        assert isinstance(option["simResult"]["rul"], (int, float))
        assert option["simResult"]["rul"] >= 0

    def test_with_current_state(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={
            "current_time": 50.0,
            "current_state": {"rpm": 3500.0, "cht": 180.0, "egt": 700.0},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["simResult"]["engineAlive"] is True

    def test_mid_flight_time(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={"current_time": 200.0})
        assert resp.status_code == 200
        data = resp.json()
        assert data[0]["simResult"]["stepsCompleted"] > 0

    def test_negative_time_rejected(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={"current_time": -1.0})
        assert resp.status_code == 422


class TestOptimizeSimulationUnit:
    def test_extract_future_trajectory(self, mock_scenario):
        from backend.main import _extract_future_trajectory
        traj = _extract_future_trajectory(mock_scenario, 100.0, 300.0)
        assert len(traj) > 0
        assert all(t["time"] >= 100.0 for t in traj)
        assert all(t["time"] <= 400.0 for t in traj)

    def test_extract_no_future_data(self, mock_scenario):
        from backend.main import _extract_future_trajectory
        traj = _extract_future_trajectory(mock_scenario, 99999.0, 300.0)
        assert len(traj) == 0

    def test_run_optimization_simulation(self, mock_scenario):
        from backend.main import _run_optimization_simulation
        trajectory = [
            {"time": float(t), "throttle": 0.7, "altitude": 10000.0}
            for t in range(0, 100)
        ]
        result = _run_optimization_simulation(trajectory, None)
        assert "risk" in result
        assert "rul" in result
        assert "engine_alive" in result
        assert result["engine_alive"] is True

    def test_run_optimization_empty_trajectory(self):
        from backend.main import _run_optimization_simulation
        result = _run_optimization_simulation([], None)
        assert result["steps_completed"] == 0
