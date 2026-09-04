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
    from backend.main import OptimizeRequest, _evaluate_all_strategies

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
        results = await asyncio.get_running_loop().run_in_executor(
            None,
            _evaluate_all_strategies,
            req.current_time,
            req.current_state,
        )
        return results

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
    def test_returns_array_with_all_strategies(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={"current_time": 0.0})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 3
        actions = [d["action"] for d in data]
        assert actions == ["Maintain Profile", "Drop 500ft", "Drop 1000ft"]

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
        assert len(data) == 3
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


class TestAltitudeStrategies:
    def test_apply_altitude_offset_zero(self):
        from backend.main import _apply_altitude_offset
        traj = [{"time": 0.0, "throttle": 0.7, "altitude": 10000.0}]
        result = _apply_altitude_offset(traj, 0)
        assert result is traj

    def test_apply_altitude_offset_negative(self):
        from backend.main import _apply_altitude_offset
        traj = [
            {"time": 0.0, "throttle": 0.7, "altitude": 10000.0},
            {"time": 1.0, "throttle": 0.7, "altitude": 8000.0},
        ]
        result = _apply_altitude_offset(traj, -500)
        assert result[0]["altitude"] == 9500.0
        assert result[1]["altitude"] == 7500.0

    def test_altitude_floor_at_zero(self):
        from backend.main import _apply_altitude_offset
        traj = [
            {"time": 0.0, "throttle": 0.7, "altitude": 300.0},
            {"time": 1.0, "throttle": 0.7, "altitude": 100.0},
        ]
        result = _apply_altitude_offset(traj, -500)
        assert result[0]["altitude"] == 0.0
        assert result[1]["altitude"] == 0.0

    def test_altitude_floor_partial(self):
        from backend.main import _apply_altitude_offset
        traj = [
            {"time": 0.0, "throttle": 0.7, "altitude": 800.0},
            {"time": 1.0, "throttle": 0.7, "altitude": 200.0},
        ]
        result = _apply_altitude_offset(traj, -500)
        assert result[0]["altitude"] == 300.0
        assert result[1]["altitude"] == 0.0

    def test_drop_strategies_have_sim_params(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={"current_time": 0.0})
        data = resp.json()
        assert data[1]["simParams"]["altitudeOffset"] == -500
        assert data[2]["simParams"]["altitudeOffset"] == -1000

    def test_maintain_profile_has_empty_sim_params(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={"current_time": 0.0})
        data = resp.json()
        assert data[0]["simParams"] == {}

    def test_all_strategies_have_valid_schema(self, client, mock_scenario):
        resp = client.post("/api/optimize", json={"current_time": 0.0})
        data = resp.json()
        for option in data:
            assert "action" in option
            assert "description" in option
            assert "simParams" in option
            result = option["simResult"]
            assert "simulatedRisk" in result
            assert "rul" in result
            assert "engineAlive" in result

    def test_evaluate_strategy_unit(self, mock_scenario):
        from backend.main import _evaluate_strategy
        result = _evaluate_strategy(
            0.0, None,
            altitude_offset=-500,
            action="Drop 500ft",
            description="Test",
        )
        assert result["action"] == "Drop 500ft"
        assert result["simParams"]["altitudeOffset"] == -500
        assert isinstance(result["simResult"]["simulatedRisk"], (int, float))
