"""Tests for integration broker and sim_publisher."""

import json
import time
from pathlib import Path

import paho.mqtt.client as mqtt
import pandas as pd

from integration.sim_publisher import TOPIC, load_data, publish_telemetry

DATA_PATH = Path(__file__).resolve().parent.parent / "djibouti_data" / "djibouti_flight_path" / "djibouti_aligned.parquet"
ACCIDENT_CSV_PATH = Path(__file__).resolve().parent.parent / "djibouti_data" / "djibouti_accident_telemetry.csv"


def test_load_parquet():
    df = load_data(DATA_PATH)
    assert len(df) > 0
    assert "time" in df.columns
    assert "rpm" in df.columns


def test_load_accident_csv():
    """Verify the accident telemetry CSV loads and has the columns the frontend needs."""
    df = load_data(ACCIDENT_CSV_PATH)
    assert len(df) > 0
    assert "time" in df.columns
    for col in ("rpm", "cht", "egt", "egt_1", "egt_2", "egt_3", "egt_4",
                "oil_pressure", "oil_temp", "fuel_flow", "battery_voltage",
                "vibration_index", "engine_load", "throttle", "altitude"):
        assert col in df.columns, f"Missing column: {col}"


def _publish_and_collect(broker_port, data_path, n_rows):
    """Helper: publish n_rows from data_path via MQTT and return received messages."""
    received = []

    def on_message(_client, _userdata, msg):
        received.append(json.loads(msg.payload))

    sub = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    sub.on_message = on_message
    sub.connect("localhost", broker_port)
    sub.subscribe(TOPIC)
    sub.loop_start()
    time.sleep(1)

    df = load_data(data_path).head(n_rows)
    tmp_path = Path("/tmp/test_mqtt_small.csv")
    df.to_csv(tmp_path, index=False)

    publish_telemetry("localhost", broker_port, tmp_path, speed=10.0)
    time.sleep(3)

    sub.loop_stop()
    sub.disconnect()
    tmp_path.unlink(missing_ok=True)
    return received


def test_broker_and_publish(broker_port):
    received = _publish_and_collect(broker_port, DATA_PATH, 5)

    assert len(received) == 5
    assert "rpm" in received[0]
    assert "time" in received[0]


def test_accident_csv_publishes_all_sensor_fields(broker_port):
    """Publish accident telemetry CSV rows and verify every field the frontend
    needs arrives in the MQTT payload — this is the path that was static."""
    received = _publish_and_collect(broker_port, ACCIDENT_CSV_PATH, 5)

    assert len(received) == 5

    frontend_fields = [
        "time", "rpm", "cht", "egt", "egt_1", "egt_2", "egt_3", "egt_4",
        "oil_pressure", "oil_temp", "fuel_flow", "battery_voltage",
        "vibration_index", "engine_load", "throttle", "altitude",
    ]
    for field in frontend_fields:
        assert field in received[0], f"Missing field in MQTT payload: {field}"

    for msg in received:
        assert isinstance(msg["rpm"], (int, float))
        assert msg["rpm"] > 0
        assert isinstance(msg["engine_load"], (int, float))
