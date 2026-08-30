# 03 — FastAPI WebSocket Gateway & Frontend Integration

**What to build:** A FastAPI server (`backend/main.py`) that subscribes to both MQTT topics, cleanly merges the telemetry and predictions in memory, and pushes a unified JSON state to the `/ws` WebSocket endpoint. The React frontend's `api/websocket.js` is updated to consume this live stream, replacing the mock data with the end-to-end pipeline.

**Blocked by:** 02 — ML Subscriber with Live Physics Residuals and AI Inference

**Status:** done

- [x] A FastAPI application (`backend/main.py`) exposes a `/ws` WebSocket endpoint.
- [x] The FastAPI app maintains an internal MQTT client that subscribes to `telemetry/engine` and `telemetry/predictions`.
- [x] Incoming prediction payloads are cached in memory.
- [x] When new telemetry arrives, it is merged with the cached predictions and broadcast to all connected WebSocket clients.
- [x] The React frontend (`frontend/src/api/websocket.js`) connects to `ws://localhost:8000/ws` and correctly parses the merged payload.
- [x] The Operator Dashboard renders the live data without relying on hardcoded mock intervals.
