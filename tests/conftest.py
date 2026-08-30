"""Shared test fixtures for integration tests."""

import asyncio
import socket
import threading
import time

import pytest


def _free_port():
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="module")
def broker_port():
    """Start an embedded MQTT broker on a random free port."""
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

    thread = threading.Thread(target=lambda: loop.run_until_complete(_run()), daemon=True)
    thread.start()
    time.sleep(1)
    yield port
    loop.call_soon_threadsafe(stop_event.set)
    thread.join(timeout=5)
