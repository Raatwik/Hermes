"""ML subscriber: listens to telemetry/engine, computes physics residuals,
runs AI inference, and publishes predictions to telemetry/predictions."""

from __future__ import annotations

import argparse
import json
import sys
from collections import deque
from pathlib import Path
from typing import Optional

import numpy as np
import paho.mqtt.client as mqtt

from simulation.engine import Simulation, TIME_CONSTANTS

TELEMETRY_TOPIC = "telemetry/engine"
PREDICTIONS_TOPIC = "telemetry/predictions"

RESIDUAL_SENSORS = (
    list(TIME_CONSTANTS.keys())
    + ["vibration_index", "engine_load", "injection_timing"]
    + [f"egt_{i}" for i in range(1, 5)]
)

WINDOW_SIZE = 60

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def _load_xgboost(path: Path):
    try:
        import joblib
        bundle = joblib.load(path)
        return bundle["model"], bundle["labels"]
    except Exception:
        return None, []


def _load_isolation_forest(model_path: Path, features_path: Path):
    try:
        import joblib
        model = joblib.load(model_path)
        feature_cols = joblib.load(features_path)
        return model, feature_cols
    except Exception:
        return None, []


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


class MLSubscriber:
    def __init__(
        self,
        host: str = "localhost",
        port: int = 1883,
        models_dir: Optional[Path] = None,
    ):
        self._host = host
        self._port = port
        self._models_dir = models_dir or MODELS_DIR

        self._sim = Simulation(noise_seed=None)
        self._prev_time = 0.0
        self._tick = 0
        self._residual_window: deque[dict[str, float]] = deque(maxlen=WINDOW_SIZE)

        self._xgb_model = None
        self._xgb_labels: list[str] = []
        self._iso_model = None
        self._iso_features: list[str] = []
        self._lstm_model = None

        self._load_models()

        self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._running = False

    def _load_models(self):
        d = self._models_dir
        xgb_path = d / "xgb_model.joblib"
        iso_path = d / "iso_forest.joblib"
        iso_feat_path = d / "iso_forest_features.joblib"
        lstm_path = d / "best_lstm_model.pt"

        if xgb_path.exists():
            self._xgb_model, self._xgb_labels = _load_xgboost(xgb_path)

        if iso_path.exists() and iso_feat_path.exists():
            self._iso_model, self._iso_features = _load_isolation_forest(iso_path, iso_feat_path)

        lstm_input_size = len(RESIDUAL_SENSORS) * 2
        if lstm_path.exists():
            self._lstm_model = _load_lstm(lstm_path, lstm_input_size)

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        client.subscribe(TELEMETRY_TOPIC)

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload)
            prediction = self._process_tick(payload)
            client.publish(PREDICTIONS_TOPIC, json.dumps(prediction))
        except Exception as e:
            print(f"[ml_subscriber] error processing tick: {e}", file=sys.stderr)

    def _process_tick(self, telemetry: dict) -> dict:
        self._tick += 1

        current_time = float(telemetry.get("time", 0.0))
        throttle = float(telemetry.get("throttle", 0.0))
        altitude = float(telemetry.get("altitude", 0.0))

        self._sim.set_throttle(throttle)
        self._sim.set_altitude(altitude)

        dt = current_time - self._prev_time
        if dt > 0:
            self._sim.step(dt)
        elif current_time == 0.0:
            self._sim.step(0.0)
        self._prev_time = current_time

        expected = self._sim.get_state()

        residuals: dict[str, float] = {}
        for sensor in RESIDUAL_SENSORS:
            actual = float(telemetry.get(sensor, 0.0))
            exp = float(expected.get(sensor, 0.0))
            residuals[f"{sensor}_residual"] = actual - exp

        self._residual_window.append(residuals)

        drift_score = self._compute_drift_score()
        xgb_faults = self._run_xgboost(telemetry, residuals)
        rul_mean, rul_std = self._run_lstm()
        is_anomaly = self._run_isolation_forest(telemetry, residuals)

        result = self._apply_anomaly_override(is_anomaly, xgb_faults, rul_mean, rul_std)

        return {
            "tick": self._tick,
            "time": current_time,
            "twin_drift_score": drift_score,
            "xgboost_faults": result["xgboost_faults"],
            "lstm_rul_mean": result["lstm_rul_mean"],
            "lstm_rul_std": result["lstm_rul_std"],
            "isolation_forest_anomaly": is_anomaly,
        }

    def _compute_drift_score(self) -> float:
        if not self._residual_window:
            return 0.0
        arr = np.array(
            [[r.get(f"{s}_residual", 0.0) for s in RESIDUAL_SENSORS] for r in self._residual_window]
        )
        mse_per_sensor = np.mean(arr ** 2, axis=0)
        ranges = np.array([
            _sensor_range(s) for s in RESIDUAL_SENSORS
        ])
        normalized = mse_per_sensor / (ranges ** 2 + 1e-9)
        return float(np.mean(normalized))

    def _run_xgboost(self, telemetry: dict, residuals: dict) -> list[str]:
        if self._xgb_model is None:
            return []
        try:
            features = {**telemetry, **residuals}
            exclude = {
                "time", "fault_class", "mission_id", "throttle", "altitude",
                "ambient_temperature", "ambient_pressure", "air_density",
                "flight_phase", "time_since_fault_injection", "fault_severity",
                "Remaining_Useful_Life", "secondary_fault_class",
                "secondary_fault_severity",
            }
            cols = [c for c in features if c not in exclude and isinstance(features[c], (int, float))]
            X = np.array([[features[c] for c in cols]])
            preds = self._xgb_model.predict(X)
            active = [self._xgb_labels[i] for i, v in enumerate(preds[0]) if v == 1]
            return active
        except Exception:
            return []

    def _run_lstm(self) -> tuple[Optional[float], Optional[float]]:
        if self._lstm_model is None or len(self._residual_window) < WINDOW_SIZE:
            return None, None
        try:
            import torch
            window_data = []
            for r in self._residual_window:
                row = []
                for s in RESIDUAL_SENSORS:
                    row.append(r.get(f"{s}_residual", 0.0))
                window_data.append(row)
            sensor_values = []
            for r_dict, orig in zip(self._residual_window, self._residual_window):
                row = [orig.get(f"{s}_residual", 0.0) for s in RESIDUAL_SENSORS]
                sensor_values.append(row)

            full_features = []
            for i in range(len(window_data)):
                full_features.append(sensor_values[i] + window_data[i])

            x = torch.tensor([full_features], dtype=torch.float32)
            with torch.no_grad():
                mu, sigma = self._lstm_model(x)
            return float(mu[0]), float(sigma[0])
        except Exception:
            return None, None

    def _run_isolation_forest(self, telemetry: dict, residuals: dict) -> bool:
        if self._iso_model is None:
            return False
        try:
            features = {**telemetry, **residuals}
            X = np.array([[features.get(c, 0.0) for c in self._iso_features]])
            pred = self._iso_model.predict(X)
            return bool(pred[0] == -1)
        except Exception:
            return False

    @staticmethod
    def _apply_anomaly_override(
        is_anomaly: bool,
        xgb_faults: list[str],
        rul_mean: Optional[float],
        rul_std: Optional[float],
    ) -> dict:
        if is_anomaly:
            return {
                "xgboost_faults": ["UNKNOWN_ANOMALY"],
                "lstm_rul_mean": None,
                "lstm_rul_std": None,
            }
        return {
            "xgboost_faults": xgb_faults,
            "lstm_rul_mean": rul_mean,
            "lstm_rul_std": rul_std,
        }

    def run(self):
        self._running = True
        self._client.connect(self._host, self._port)
        self._client.loop_start()
        try:
            while self._running:
                pass
        except KeyboardInterrupt:
            pass
        finally:
            self._client.loop_stop()
            self._client.disconnect()

    def stop(self):
        self._running = False


def _sensor_range(sensor: str) -> float:
    ranges = {
        "rpm": 5500.0,
        "cht": 220.0,
        "egt": 850.0,
        "egt_1": 850.0,
        "egt_2": 850.0,
        "egt_3": 850.0,
        "egt_4": 850.0,
        "oil_pressure": 90.0,
        "oil_temp": 125.0,
        "fuel_flow": 35.0,
        "battery_voltage": 14.1,
        "vibration_index": 1.0,
        "engine_load": 1.0,
        "injection_timing": 32.0,
    }
    return ranges.get(sensor, 1.0)


def main():
    parser = argparse.ArgumentParser(description="ML subscriber for live predictions")
    parser.add_argument("--host", default="localhost", help="MQTT broker host")
    parser.add_argument("--port", type=int, default=1883, help="MQTT broker port")
    parser.add_argument(
        "--models-dir",
        type=Path,
        default=MODELS_DIR,
        help="Directory containing trained model files",
    )
    args = parser.parse_args()

    print(f"Connecting to MQTT broker at {args.host}:{args.port}")
    print(f"Models directory: {args.models_dir}")

    subscriber = MLSubscriber(
        host=args.host, port=args.port, models_dir=args.models_dir
    )
    subscriber.run()


if __name__ == "__main__":
    main()
