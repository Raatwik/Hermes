---
labels: ["in-progress"]
---
# [wayfinder:task] Integration: Real-Time Backend & MQTT

## Progress

- **Issue 01 (MQTT Broker & Sim Playback):** COMPLETE — `integration/broker.py`, `integration/sim_publisher.py`
- **Issue 02 (ML Subscriber):** COMPLETE — `integration/ml_subscriber.py`
- **Issue 03 (FastAPI WebSocket Gateway):** COMPLETE — `backend/main.py`, `frontend/src/api/websocket.js`, store + dashboard wired to live data
- **Issue 04 (What-If Sandbox REST API):** UNBLOCKED, ready-for-agent — `POST /api/what-if` endpoint with simulation fast-forward and LSTM projection

## Problem Statement

The user needs a Real-Time Backend Integration layer that connects the physical simulation data, the machine learning diagnostic models, and the frontend dashboard. Currently, these pieces exist in isolation: the frontend uses mock data, the physics engine produces offline data, and the ML models are trained offline. We need a live pipeline to ingest real-time telemetry, compute Digital Twin residuals and drift, serve ML predictions synchronously and asynchronously, and stream this unified state to the dashboard.

## Solution

We will implement a distributed microservices architecture using an embedded MQTT broker. A simulation publisher will play back historical flight data to mimic a live UAV. An ML subscriber will act as the live Digital Twin: computing residuals on-the-fly, generating a Twin Drift score, and running the telemetry through the LSTM/XGBoost models. A FastAPI gateway will merge these streams and push them to the frontend via WebSockets, while also exposing a REST endpoint for "What-If" sandbox queries that run forward simulations.

## User Stories

1. As a System Architect, I want an embedded Python MQTT broker, so that I can route messages between microservices locally without relying on Docker or external infrastructure.
2. As a Data Engineer, I want a simulation publisher script that reads `djibouti_aligned.parquet` row-by-row, so that I can play back a historical flight path and mimic live UAV telemetry.
3. As a Data Engineer, I want to control the playback speed of the simulation publisher, so that I can test the system in strict real-time or accelerated time.
4. As an ML Engineer, I want an ML subscriber that instantiates the physics Simulation, so that it can compute expected baseline behavior and Actual vs Expected residuals on every incoming telemetry tick.
5. As an ML Engineer, I want the ML subscriber to maintain a rolling sliding window of the last 60 residual states, so that the LSTM model has the required temporal context for RUL prediction.
6. As a Propulsion Engineer, I want the system to compute a Digital Twin Drift score based on the residuals, so that I can monitor long-term divergence between the physical engine and the model.
7. As an ML Engineer, I want the subscriber to publish the diagnostic fault probabilities, RUL, and drift score to a predictions topic, so that the dashboard can consume them in real-time.
8. As a Frontend Developer, I want a FastAPI WebSocket gateway that subscribes to both telemetry and predictions, so that it can merge the data in-memory and send a single unified JSON payload to the React client.
9. As a Propulsion Engineer, I want to submit hypothetical throttle and altitude changes via a What-If REST API, so that I can see how the engine would react.
10. As a Propulsion Engineer, I want the What-If API to fast-forward a new Simulation instance for a fixed 5-minute horizon, so that I can observe the immediate thermal and mechanical transient responses.
11. As a Propulsion Engineer, I want the What-If API to also evaluate the fast-forwarded trajectory through the ML models, so that I can see if my proposed changes improve the Remaining Useful Life (RUL).
12. As a System Administrator, I want to be able to hot-swap ML models by replacing the `.pt` or `.joblib` files and restarting the subscriber process, so that I can deploy retrained models seamlessly.
13. As an Operator, I want the system to run an Isolation Forest to detect open-set anomalies, so that if the engine exhibits out-of-distribution behavior, it overrides the XGBoost fault class to `UNKNOWN_ANOMALY` and suppresses the LSTM's unreliable RUL prediction.

## Implementation Decisions

- We will build the integration layer using a microservices architecture.
- `integration/broker.py`: An embedded Python MQTT broker (e.g., using `amqtt`).
- `integration/sim_publisher.py`: A publisher that reads the parquet file and publishes to `telemetry/engine`.
- `integration/ml_subscriber.py`: Subscribes to `telemetry/engine`. It will instantiate the `Simulation` class locally to compute residuals (`Actual - Expected`). It will maintain a rolling state buffer, run the loaded XGBoost, LSTM, and Isolation Forest models. If the Isolation Forest detects an anomaly, it overrides the XGBoost fault class to `UNKNOWN_ANOMALY` and sets the LSTM RUL to `None`. It will compute a normalized MSE for the Twin Drift score, and publish to `telemetry/predictions`.
- `backend/main.py`: A FastAPI application that subscribes to the MQTT broker, caches predictions, merges them with incoming telemetry, and broadcasts via WebSockets to `/ws`.
- The FastAPI application will also expose `POST /api/what-if`, which takes the current state and proposed changes, runs a localized 5-minute `Simulation` loop, computes the resulting telemetry, passes it through the LSTM model (which will be loaded in the FastAPI memory as well), and returns the results.
- `frontend/src/api/websocket.js` will be modified to connect to the FastAPI WebSocket instead of using mock intervals.

## Testing Decisions

- What makes a good test: We will test the external behavior at the highest possible seams, avoiding deep mocking of internal state variables. Due to the acknowledged low quality of the initial ML models, tests should assert on pipeline flow, schema correctness, and deterministic physics output rather than strict ML accuracy.
- **MQTT Pipeline Seam**: Test `ml_subscriber.py` by publishing a known telemetry sequence to `telemetry/engine` and verifying that the output on `telemetry/predictions` contains valid schema fields (fault probabilities, RUL, drift score) without crashing.
- **WebSocket Gateway Seam**: Connect a mock WebSocket client to `/ws`, simulate incoming MQTT messages to the FastAPI broker client, and assert the mock client receives properly merged JSON payloads.
- **REST Sandbox Seam**: Send a `POST /api/what-if` request with a static baseline state, and verify the response contains a 5-minute trajectory array with computed RUL values.

## Out of Scope

- Training new ML models or improving the accuracy of the existing LSTM/XGBoost models.
- Complex authentication or authorization for the WebSockets.
- Individual Engine Fingerprinting.

## Further Notes

- The "Twin Drift" score formula is not strictly defined by a standard; a normalized rolling mean-squared-error of key residuals (e.g., EGT, CHT, RPM) will be used as a proxy.
