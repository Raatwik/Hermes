"""FastAPI WebSocket gateway + What-If sandbox REST API."""

from __future__ import annotations

import asyncio
import json
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

import pandas as pd
import paho.mqtt.client as mqtt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from simulation.engine import Simulation, INITIAL_VALUES, TIME_CONSTANTS

RESIDUAL_SENSORS = (
    list(TIME_CONSTANTS.keys())
    + ["vibration_index", "engine_load", "injection_timing"]
    + [f"egt_{i}" for i in range(1, 5)]
)

WHAT_IF_HORIZON_S = 300  # 5 minutes
WHAT_IF_DT = 1.0  # 1-second steps
WINDOW_SIZE = 60

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
SCENARIO_DATA_PATH = Path(__file__).resolve().parent.parent / "djibouti_data" / "djibouti_flight_path" / "djibouti_aligned.parquet"
OPTIMIZE_HORIZON_S = 300


class WhatIfRequest(BaseModel):
    throttle: float = Field(..., ge=0.0, le=1.0)
    altitude: float = Field(..., ge=0.0, le=50000.0)
    current_state: Optional[dict[str, float]] = None


class OptimizeRequest(BaseModel):
    current_time: float = Field(..., ge=0.0)
    current_state: Optional[dict[str, float]] = None


def _load_lstm(path: Path, input_size: int):
    try:
        import torch
        from ml_pipeline.models import ProbabilisticLSTM
        model = ProbabilisticLSTM(input_size=input_size, hidden_size=64, num_layers=2)
        state_dict = torch.load(path, map_location="cpu", weights_only=True)
        model.load_state_dict(state_dict)
        model.eval()
        return model
    except Exception:
        return None


def _init_sim_from_state(sim: Simulation, state: dict[str, float]) -> None:
    for key, filt in sim._filters.items():
        if key in state:
            filt.value = float(state[key])


def _run_what_if_simulation(
    throttle: float,
    altitude: float,
    current_state: dict[str, float] | None,
    lstm_model: Any,
) -> dict:
    sim = Simulation(throttle=throttle, altitude=altitude, noise_seed=42)
    baseline_sim = Simulation(throttle=throttle, altitude=altitude, noise_seed=None)

    if current_state:
        _init_sim_from_state(sim, current_state)
        _init_sim_from_state(baseline_sim, current_state)

    trajectory: list[dict[str, float]] = []
    residual_window: deque[dict[str, float]] = deque(maxlen=WINDOW_SIZE)
    steps = int(WHAT_IF_HORIZON_S / WHAT_IF_DT)

    for i in range(steps):
        sim.step(WHAT_IF_DT)
        baseline_sim.step(WHAT_IF_DT)

        state = sim.get_state()
        expected = baseline_sim.get_state()

        if i % 10 == 0 or i == steps - 1:
            trajectory.append(state)

        residuals: dict[str, float] = {}
        for sensor in RESIDUAL_SENSORS:
            actual_val = float(state.get(sensor, 0.0))
            exp_val = float(expected.get(sensor, 0.0))
            residuals[f"{sensor}_residual"] = actual_val - exp_val
            residuals[sensor] = actual_val
        residual_window.append(residuals)

        if not sim.is_alive:
            break

    rul_mean: float | None = None
    rul_std: float | None = None

    if lstm_model is not None and len(residual_window) >= WINDOW_SIZE:
        try:
            import torch
            window_data = []
            for r in residual_window:
                row = []
                for s in RESIDUAL_SENSORS:
                    row.append(r.get(s, 0.0))
                for s in RESIDUAL_SENSORS:
                    row.append(r.get(f"{s}_residual", 0.0))
                window_data.append(row)

            x = torch.tensor([window_data], dtype=torch.float32)
            with torch.no_grad():
                mu, sigma = lstm_model(x)
            scale_factor = 1000.0
            rul_mean = float(mu[0]) * scale_factor
            rul_std = float(sigma[0]) * scale_factor
        except Exception:
            pass

    return {
        "trajectory": trajectory,
        "rul_mean": rul_mean,
        "rul_std": rul_std,
        "engine_alive": sim.is_alive,
        "failure_reason": sim.failure_reason,
        "steps_completed": len(trajectory),
    }

def _load_scenario_data(path: Path = SCENARIO_DATA_PATH) -> pd.DataFrame:
    if path.suffix == ".parquet":
        return pd.read_parquet(path)
    return pd.read_csv(path)


_scenario_cache: pd.DataFrame | None = None


def _get_scenario_data() -> pd.DataFrame:
    global _scenario_cache
    if _scenario_cache is None:
        _scenario_cache = _load_scenario_data()
    return _scenario_cache


def _extract_future_trajectory(
    df: pd.DataFrame, current_time: float, horizon_s: float = OPTIMIZE_HORIZON_S,
) -> list[dict[str, float]]:
    time_col = "time" if "time" in df.columns else "time_sec"
    mask = (df[time_col] >= current_time) & (df[time_col] <= current_time + horizon_s)
    future = df.loc[mask, [time_col, "throttle", "altitude"]]
    return [
        {"time": float(r[time_col]), "throttle": float(r["throttle"]), "altitude": float(r["altitude"])}
        for _, r in future.iterrows()
    ]


def _run_optimization_simulation(
    trajectory: list[dict[str, float]],
    current_state: dict[str, float] | None,
) -> dict:
    if not trajectory:
        return {"risk": 50.0, "rul": 0.0, "engine_alive": True, "steps_completed": 0}

    sim = Simulation(
        throttle=trajectory[0]["throttle"],
        altitude=trajectory[0]["altitude"],
        noise_seed=42,
    )
    baseline_sim = Simulation(
        throttle=trajectory[0]["throttle"],
        altitude=trajectory[0]["altitude"],
        noise_seed=None,
    )

    if current_state:
        _init_sim_from_state(sim, current_state)

    for i in range(len(trajectory) - 1):
        dt = trajectory[i + 1]["time"] - trajectory[i]["time"]
        if dt <= 0:
            continue

        sim.set_throttle(trajectory[i + 1]["throttle"])
        sim.set_altitude(trajectory[i + 1]["altitude"])

        sim.step(dt)

        if not sim.is_alive:
            break

    final_state = sim.get_state()
    cht = final_state.get("cht", 165)
    egt = final_state.get("egt", 620)
    risk = round(min(95, max(5, (cht / 250) * 50 + (egt / 900) * 50)), 1)

    rul = round(final_state.get("rul", 5000.0), 1)

    return {
        "risk": risk,
        "rul": rul,
        "engine_alive": sim.is_alive,
        "failure_reason": sim.failure_reason,
        "steps_completed": len(trajectory),
    }


def _apply_altitude_offset(
    trajectory: list[dict[str, float]], offset: float,
) -> list[dict[str, float]]:
    if offset == 0:
        return trajectory
    return [
        {**step, "altitude": max(0.0, step["altitude"] + offset)}
        for step in trajectory
    ]


def _evaluate_strategy(
    current_time: float,
    current_state: dict[str, float] | None,
    altitude_offset: float,
    action: str,
    description: str,
) -> dict:
    df = _get_scenario_data()
    trajectory = _extract_future_trajectory(df, current_time)
    trajectory = _apply_altitude_offset(trajectory, altitude_offset)

    sim_result = _run_optimization_simulation(trajectory, current_state)

    sim_params = {}
    if altitude_offset != 0:
        sim_params["altitudeOffset"] = altitude_offset

    return {
        "action": action,
        "description": description,
        "simParams": sim_params,
        "simResult": {
            "simulatedRisk": sim_result["risk"],
            "rul": sim_result["rul"],
            "engineAlive": sim_result["engine_alive"],
            "failureReason": sim_result.get("failure_reason"),
            "stepsCompleted": sim_result["steps_completed"],
        },
    }


def _evaluate_maintain_profile(
    current_time: float,
    current_state: dict[str, float] | None,
) -> dict:
    return _evaluate_strategy(
        current_time, current_state,
        altitude_offset=0,
        action="Maintain Profile",
        description=(
            "Continue with the current planned flight path. "
            "No parameters are changed. Risk and RUL reflect the upcoming "
            "trajectory as defined by the active mission scenario."
        ),
    )


ALTITUDE_STRATEGIES = [
    {
        "offset": -500,
        "action": "Drop 500ft",
        "description": (
            "Reduce altitude by 500ft across the remaining trajectory. "
            "Lower altitude reduces thermal stress on the engine, potentially "
            "extending remaining useful life."
        ),
    },
    {
        "offset": -1000,
        "action": "Drop 1000ft",
        "description": (
            "Reduce altitude by 1000ft across the remaining trajectory. "
            "A more aggressive altitude reduction for greater engine stress relief, "
            "trading altitude margin for improved engine health."
        ),
    },
]


def _evaluate_all_strategies(
    current_time: float,
    current_state: dict[str, float] | None,
) -> list[dict]:
    strategies = [_evaluate_maintain_profile(current_time, current_state)]
    for s in ALTITUDE_STRATEGIES:
        strategies.append(
            _evaluate_strategy(
                current_time, current_state,
                altitude_offset=s["offset"],
                action=s["action"],
                description=s["description"],
            )
        )
    return strategies


MQTT_HOST = "localhost"
MQTT_PORT = 1883
TELEMETRY_TOPIC = "telemetry/engine"
PREDICTIONS_TOPIC = "telemetry/predictions"


class MQTTBridge:
    def __init__(self, host: str = MQTT_HOST, port: int = MQTT_PORT):
        self._host = host
        self._port = port
        self._latest_predictions: dict[str, Any] = {}
        self._clients: set[WebSocket] = set()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._mqtt = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self._mqtt.on_connect = self._on_connect
        self._mqtt.on_message = self._on_message

    def start(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        self._mqtt.connect(self._host, self._port)
        self._mqtt.loop_start()

    def stop(self):
        self._mqtt.loop_stop()
        self._mqtt.disconnect()

    def register(self, ws: WebSocket):
        self._clients.add(ws)

    def unregister(self, ws: WebSocket):
        self._clients.discard(ws)

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        client.subscribe(TELEMETRY_TOPIC)
        client.subscribe(PREDICTIONS_TOPIC)

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return

        if msg.topic == PREDICTIONS_TOPIC:
            self._latest_predictions = payload
            return

        # Predictions overlay on telemetry, but telemetry's shared keys win
        merged = {**self._latest_predictions, **payload}
        if self._loop and self._clients:
            self._loop.call_soon_threadsafe(
                asyncio.ensure_future,
                self._broadcast(merged),
            )

    async def _broadcast(self, data: dict):
        payload = json.dumps(data)
        stale: list[WebSocket] = []
        for ws in self._clients:
            try:
                await ws.send_text(payload)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self._clients.discard(ws)


async def _handle_ws(ws: WebSocket, b: MQTTBridge):
    await ws.accept()
    b.register(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        b.unregister(ws)


bridge = MQTTBridge()
_lstm_model = None


def _try_load_lstm(models_dir: Path = MODELS_DIR):
    lstm_path = models_dir / "best_lstm_model.pt"
    if lstm_path.exists():
        return _load_lstm(lstm_path, len(RESIDUAL_SENSORS) * 2)
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _lstm_model
    bridge.start(asyncio.get_running_loop())
    _lstm_model = _try_load_lstm()
    yield
    bridge.stop()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _register_routes(
    target_app: FastAPI,
    get_bridge: Any,
    get_lstm: Any,
) -> None:
    @target_app.websocket("/ws")
    async def ws_endpoint(ws: WebSocket):
        await _handle_ws(ws, get_bridge())

    @target_app.post("/api/what-if")
    async def what_if_endpoint(req: WhatIfRequest):
        result = await asyncio.get_running_loop().run_in_executor(
            None,
            _run_what_if_simulation,
            req.throttle,
            req.altitude,
            req.current_state,
            get_lstm(),
        )
        return result

    @target_app.post("/api/optimize")
    async def optimize_endpoint(req: OptimizeRequest):
        results = await asyncio.get_running_loop().run_in_executor(
            None,
            _evaluate_all_strategies,
            req.current_time,
            req.current_state,
        )
        return results


_register_routes(app, lambda: bridge, lambda: _lstm_model)


def create_app(
    mqtt_host: str = MQTT_HOST,
    mqtt_port: int = MQTT_PORT,
    models_dir: Path | None = None,
) -> FastAPI:
    """Factory for testing — returns an app with a custom bridge."""
    b = MQTTBridge(host=mqtt_host, port=mqtt_port)
    _models = models_dir or MODELS_DIR
    _app_lstm = [None]

    @asynccontextmanager
    async def _lifespan(a: FastAPI):
        b.start(asyncio.get_running_loop())
        _app_lstm[0] = _try_load_lstm(_models)
        yield
        b.stop()

    test_app = FastAPI(lifespan=_lifespan)
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    _register_routes(test_app, lambda: b, lambda: _app_lstm[0])

    test_app._bridge = b
    return test_app
