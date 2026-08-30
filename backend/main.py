"""FastAPI WebSocket gateway: bridges MQTT telemetry/predictions to frontend."""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any

import paho.mqtt.client as mqtt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    bridge.start(asyncio.get_running_loop())
    yield
    bridge.stop()


app = FastAPI(lifespan=lifespan)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await _handle_ws(ws, bridge)


def create_app(mqtt_host: str = MQTT_HOST, mqtt_port: int = MQTT_PORT) -> FastAPI:
    """Factory for testing — returns an app with a custom bridge."""
    b = MQTTBridge(host=mqtt_host, port=mqtt_port)

    @asynccontextmanager
    async def _lifespan(a: FastAPI):
        b.start(asyncio.get_running_loop())
        yield
        b.stop()

    test_app = FastAPI(lifespan=_lifespan)

    @test_app.websocket("/ws")
    async def ws_endpoint(ws: WebSocket):
        await _handle_ws(ws, b)

    test_app._bridge = b
    return test_app
