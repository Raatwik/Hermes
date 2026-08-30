"""Tests for integration broker and sim_publisher."""

import json
import time
from pathlib import Path

import paho.mqtt.client as mqtt

from integration.sim_publisher import TOPIC, load_data, publish_telemetry

DATA_PATH = Path(__file__).resolve().parent.parent / "djibouti_data" / "djibouti_flight_path" / "djibouti_aligned.parquet"


def test_load_parquet():
    df = load_data(DATA_PATH)
    assert len(df) > 0
    assert "time" in df.columns
    assert "rpm" in df.columns


def test_broker_and_publish(broker_port):
    received = []

    def on_message(_client, _userdata, msg):
        received.append(json.loads(msg.payload))

    sub = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    sub.on_message = on_message
    sub.connect("localhost", broker_port)
    sub.subscribe(TOPIC)
    sub.loop_start()
    time.sleep(1)

    df = load_data(DATA_PATH).head(5)
    small_path = Path("/tmp/test_mqtt_small.parquet")
    df.to_parquet(small_path)

    publish_telemetry("localhost", broker_port, small_path, speed=1000.0)
    time.sleep(2)

    sub.loop_stop()
    sub.disconnect()
    small_path.unlink(missing_ok=True)

    assert len(received) == 5
    assert "rpm" in received[0]
    assert "time" in received[0]
