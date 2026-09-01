"""Tests for the FastAPI WebSocket gateway (Issue 03).

Tests the seam: MQTT messages in -> merged JSON out via WebSocket.
"""

import json
import time

import paho.mqtt.client as mqtt
from starlette.testclient import TestClient

from backend.main import create_app


SAMPLE_TELEMETRY = {
    "time": 1.0,
    "throttle": 0.7,
    "altitude": 5000,
    "rpm": 2400,
    "cht": 150,
    "egt": 620,
    "egt_1": 618,
    "egt_2": 622,
    "egt_3": 625,
    "egt_4": 619,
    "oil_pressure": 65,
    "oil_temp": 95,
    "fuel_flow": 24,
    "battery_voltage": 13.8,
    "vibration_index": 0.3,
    "engine_load": 0.68,
    "ambient_temperature": 15,
    "ambient_pressure": 1013,
    "air_density": 1.1,
    "injection_timing": 25,
}

SAMPLE_PREDICTIONS = {
    "tick": 1,
    "time": 0.9,
    "twin_drift_score": 0.05,
    "xgboost_faults": {},
    "lstm_rul_mean": 145.0,
    "lstm_rul_std": 8.2,
    "isolation_forest_anomaly": False,
    "expected_rpm": 2420.0,
    "expected_oil_pressure": 64.5,
    "expected_oil_temp": 94.0,
    "expected_cht": 160.0,
    "expected_egt_1": 615.0,
    "expected_egt_2": 615.0,
    "expected_egt_3": 615.0,
    "expected_egt_4": 615.0,
}


def test_ws_receives_merged_payload(broker_port):
    """Publish predictions then telemetry via MQTT; assert the WS client
    receives a merged JSON payload containing fields from both."""
    app = create_app(mqtt_host="localhost", mqtt_port=broker_port)

    with TestClient(app) as client:
        with client.websocket_connect("/ws") as ws:
            pub = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            pub.connect("localhost", broker_port)
            pub.loop_start()

            pub.publish("telemetry/predictions", json.dumps(SAMPLE_PREDICTIONS))
            time.sleep(0.3)

            pub.publish("telemetry/engine", json.dumps(SAMPLE_TELEMETRY))

            data = json.loads(ws.receive_text())

            assert data["rpm"] == 2400
            assert data["oil_pressure"] == 65
            assert data["twin_drift_score"] == 0.05
            assert data["lstm_rul_mean"] == 145.0
            assert data["xgboost_faults"] == {}
            assert data["isolation_forest_anomaly"] is False
            # Telemetry's time wins over prediction's stale time
            assert data["time"] == 1.0
            assert data["expected_rpm"] == 2420.0
            assert data["expected_oil_pressure"] == 64.5
            assert data["expected_egt_1"] == 615.0

            pub.loop_stop()
            pub.disconnect()


def test_ws_telemetry_without_predictions(broker_port):
    """If no predictions have arrived yet, telemetry is still broadcast."""
    app = create_app(mqtt_host="localhost", mqtt_port=broker_port)

    with TestClient(app) as client:
        with client.websocket_connect("/ws") as ws:
            pub = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            pub.connect("localhost", broker_port)
            pub.loop_start()

            pub.publish("telemetry/engine", json.dumps(SAMPLE_TELEMETRY))

            data = json.loads(ws.receive_text())

            assert data["rpm"] == 2400
            assert "twin_drift_score" not in data

            pub.loop_stop()
            pub.disconnect()
