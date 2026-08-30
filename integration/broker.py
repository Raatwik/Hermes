"""Embedded MQTT broker using amqtt, runs on localhost:1883."""

import asyncio
import signal
import sys

from amqtt.broker import Broker

BROKER_CONFIG = {
    "listeners": {
        "default": {
            "type": "tcp",
            "bind": "0.0.0.0:1883",
        },
    },
    "auth": {
        "allow-anonymous": True,
    },
    "topic-check": {
        "enabled": False,
    },
}


async def run_broker():
    broker = Broker(BROKER_CONFIG)
    await broker.start()
    print("MQTT broker listening on 0.0.0.0:1883")

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    await stop.wait()
    print("\nShutting down broker...")
    await broker.shutdown()


def main():
    try:
        asyncio.run(run_broker())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
