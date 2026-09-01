"""Tests for the ML subscriber integration pipeline.

Verifies: telemetry published to telemetry/engine flows through the
subscriber and produces valid prediction JSON on telemetry/predictions.
"""

import asyncio
import json
import socket
import threading
import time
from pathlib import Path

import paho.mqtt.client as mqtt
import pytest

from integration.sim_publisher import load_data

DATA_PATH = (
    Path(__file__).resolve().parent.parent
    / "djibouti_data"
    / "djibouti_flight_path"
    / "djibouti_aligned.parquet"
)

TELEMETRY_TOPIC = "telemetry/engine"
PREDICTIONS_TOPIC = "telemetry/predictions"


def _free_port():
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="module")
def broker_port():
    port = _free_port()
    loop = asyncio.new_event_loop()
    stop_event = asyncio.Event()

    async def _run():
        from amqtt.broker import Broker

        cfg = {
            "listeners": {"default": {"type": "tcp", "bind": f"0.0.0.0:{port}"}},
            "auth": {"allow-anonymous": True},
            "topic-check": {"enabled": False},
        }
        b = Broker(cfg)
        await b.start()
        await stop_event.wait()
        await b.shutdown()

    thread = threading.Thread(
        target=lambda: loop.run_until_complete(_run()), daemon=True
    )
    thread.start()
    time.sleep(1)
    yield port
    loop.call_soon_threadsafe(stop_event.set)
    thread.join(timeout=5)


def test_subscriber_produces_predictions(broker_port):
    """Publish a few telemetry rows, verify predictions appear with correct schema."""
    from integration.ml_subscriber import MLSubscriber

    sub = MLSubscriber(host="localhost", port=broker_port)
    sub_thread = threading.Thread(target=sub.run, daemon=True)
    sub_thread.start()
    time.sleep(1)

    predictions = []

    def on_message(_client, _userdata, msg):
        predictions.append(json.loads(msg.payload))

    listener = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    listener.on_message = on_message
    listener.connect("localhost", broker_port)
    listener.subscribe(PREDICTIONS_TOPIC)
    listener.loop_start()
    time.sleep(0.5)

    pub = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    pub.connect("localhost", broker_port)
    pub.loop_start()

    df = load_data(DATA_PATH).head(10)
    for _, row in df.iterrows():
        pub.publish(TELEMETRY_TOPIC, json.dumps(row.to_dict()))
        time.sleep(0.05)

    time.sleep(2)

    pub.loop_stop()
    pub.disconnect()
    listener.loop_stop()
    listener.disconnect()
    sub.stop()

    assert len(predictions) == 10, f"Expected 10 predictions, got {len(predictions)}"

    for pred in predictions:
        assert "tick" in pred
        assert "twin_drift_score" in pred
        assert "xgboost_faults" in pred
        assert "lstm_rul_mean" in pred
        assert "lstm_rul_std" in pred
        assert "isolation_forest_anomaly" in pred
        assert isinstance(pred["twin_drift_score"], (int, float))
        assert isinstance(pred["xgboost_faults"], dict)
        assert isinstance(pred["isolation_forest_anomaly"], bool)

        for key in [
            "expected_rpm", "expected_oil_pressure", "expected_oil_temp",
            "expected_cht", "expected_egt_1", "expected_egt_2",
            "expected_egt_3", "expected_egt_4",
        ]:
            assert key in pred, f"Missing {key} in prediction payload"
            assert isinstance(pred[key], (int, float)), f"{key} should be numeric"


def test_anomaly_override_logic(broker_port):
    """When Isolation Forest detects anomaly, XGBoost should contain UNKNOWN_ANOMALY."""
    from integration.ml_subscriber import MLSubscriber

    sub = MLSubscriber(host="localhost", port=broker_port)

    result = sub._apply_anomaly_override(
        is_anomaly=True,
        xgb_faults={"misfire": {"probability": 0.8, "ci": [0.75, 0.85]}},
        rul_mean=42.0,
        rul_std=5.0,
    )
    assert "UNKNOWN_ANOMALY" in result["xgboost_faults"]
    assert result["xgboost_faults"]["UNKNOWN_ANOMALY"]["probability"] == 0.99
    assert result["lstm_rul_mean"] == 42.0
    assert result["lstm_rul_std"] == 5.0

    result_normal = sub._apply_anomaly_override(
        is_anomaly=False,
        xgb_faults={"misfire": {"probability": 0.8, "ci": [0.75, 0.85]}},
        rul_mean=42.0,
        rul_std=5.0,
    )
    assert "UNKNOWN_ANOMALY" not in result_normal["xgboost_faults"]
    assert "misfire" in result_normal["xgboost_faults"]
    assert result_normal["lstm_rul_mean"] == 42.0
