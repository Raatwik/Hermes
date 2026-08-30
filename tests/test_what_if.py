"""Tests for the POST /api/what-if endpoint."""

import pytest
from fastapi.testclient import TestClient

from backend.main import _run_what_if_simulation, WHAT_IF_DT, WHAT_IF_HORIZON_S


@pytest.fixture
def app_no_broker():
    """Create an app that skips the MQTT broker (only testing the REST endpoint)."""
    from contextlib import asynccontextmanager
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from backend.main import WhatIfRequest, _run_what_if_simulation
    import asyncio

    _app_lstm = [None]

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

    @test_app.post("/api/what-if")
    async def test_what_if(req: WhatIfRequest):
        result = await asyncio.get_running_loop().run_in_executor(
            None,
            _run_what_if_simulation,
            req.throttle,
            req.altitude,
            req.current_state,
            _app_lstm[0],
        )
        return result

    return test_app


@pytest.fixture
def client(app_no_broker):
    return TestClient(app_no_broker)


class TestWhatIfEndpoint:
    def test_returns_trajectory_without_lstm(self, client):
        resp = client.post("/api/what-if", json={
            "throttle": 0.5,
            "altitude": 5000.0,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "trajectory" in data
        assert isinstance(data["trajectory"], list)
        assert len(data["trajectory"]) > 0
        assert data["rul_mean"] is None
        assert data["rul_std"] is None
        assert data["engine_alive"] is True

    def test_trajectory_contains_expected_keys(self, client):
        resp = client.post("/api/what-if", json={
            "throttle": 0.5,
            "altitude": 0.0,
        })
        data = resp.json()
        point = data["trajectory"][0]
        for key in ["time", "throttle", "rpm", "cht", "egt", "oil_pressure"]:
            assert key in point, f"Missing key: {key}"

    def test_trajectory_length(self, client):
        resp = client.post("/api/what-if", json={
            "throttle": 0.3,
            "altitude": 0.0,
        })
        data = resp.json()
        expected_samples = int(WHAT_IF_HORIZON_S / WHAT_IF_DT / 10) + 1
        assert len(data["trajectory"]) == expected_samples

    def test_throttle_validation(self, client):
        resp = client.post("/api/what-if", json={
            "throttle": 1.5,
            "altitude": 0.0,
        })
        assert resp.status_code == 422

    def test_idle_throttle(self, client):
        resp = client.post("/api/what-if", json={
            "throttle": 0.0,
            "altitude": 0.0,
        })
        data = resp.json()
        assert data["engine_alive"] is True
        last = data["trajectory"][-1]
        assert last["rpm"] < 1000

    def test_high_altitude(self, client):
        resp = client.post("/api/what-if", json={
            "throttle": 0.5,
            "altitude": 30000.0,
        })
        data = resp.json()
        assert data["engine_alive"] is True
        assert len(data["trajectory"]) > 0


class TestWhatIfSimulationUnit:
    def test_run_returns_dict(self):
        result = _run_what_if_simulation(0.5, 5000.0, None, None)
        assert isinstance(result, dict)
        assert "trajectory" in result
        assert "rul_mean" in result
        assert "engine_alive" in result

    def test_no_model_returns_null_rul(self):
        result = _run_what_if_simulation(0.5, 0.0, None, None)
        assert result["rul_mean"] is None
        assert result["rul_std"] is None

    def test_current_state_initializes_simulation(self):
        state = {"rpm": 3000.0, "cht": 180.0, "egt": 700.0, "oil_temp": 100.0}
        result = _run_what_if_simulation(0.5, 0.0, state, None)
        first = result["trajectory"][0]
        assert first["rpm"] > 2500
        assert first["cht"] > 150

    def test_current_state_via_endpoint(self, client):
        resp = client.post("/api/what-if", json={
            "throttle": 0.5,
            "altitude": 0.0,
            "current_state": {"rpm": 4000.0, "cht": 200.0, "egt": 750.0},
        })
        assert resp.status_code == 200
        data = resp.json()
        first = data["trajectory"][0]
        assert first["rpm"] > 3000
