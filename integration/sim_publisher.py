"""Publish djibouti_aligned flight data row-by-row to MQTT topic telemetry/engine."""

import argparse
import json
import sys
import time
from pathlib import Path

import pandas as pd
import paho.mqtt.client as mqtt

DEFAULT_DATA_PATH = Path(__file__).resolve().parent.parent / "djibouti_data" / "djibouti_flight_path" / "djibouti_aligned.parquet"
TOPIC = "telemetry/engine"


def load_data(path: Path) -> pd.DataFrame:
    if path.suffix == ".parquet":
        return pd.read_parquet(path)
    return pd.read_csv(path)


def publish_telemetry(host: str, port: int, data_path: Path, speed: float):
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect(host, port)
    client.loop_start()

    df = load_data(data_path)
    print(f"Loaded {len(df)} rows from {data_path.name}")
    print(f"Publishing to {TOPIC} at {speed}x speed")

    times = df["time"].values
    for i, row in df.iterrows():
        payload = json.dumps(row.to_dict())
        client.publish(TOPIC, payload)

        if i + 1 < len(df):
            dt = float(times[i + 1] - times[i])
            time.sleep(dt / speed)

        if (i + 1) % 500 == 0:
            print(f"  Published {i + 1}/{len(df)} rows")

    print(f"Done — published {len(df)} rows")
    client.loop_stop()
    client.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Simulate MQTT telemetry playback")
    parser.add_argument("--host", default="localhost", help="MQTT broker host")
    parser.add_argument("--port", type=int, default=1883, help="MQTT broker port")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH, help="Path to parquet or CSV data file")
    parser.add_argument("--speed", type=float, default=10.0, help="Playback speed factor (default: 10x)")
    args = parser.parse_args()

    if not args.data.exists():
        print(f"Error: data file not found: {args.data}", file=sys.stderr)
        sys.exit(1)

    publish_telemetry(args.host, args.port, args.data, args.speed)


if __name__ == "__main__":
    main()
