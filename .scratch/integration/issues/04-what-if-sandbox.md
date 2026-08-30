# 04 — What-If Sandbox REST API with ML Projection

**What to build:** A new `POST /api/what-if` endpoint on the FastAPI server that allows the Propulsion Engineer to submit hypothetical throttle/altitude changes. The backend spins up a temporary physics simulation, fast-forwards 5 minutes, feeds the trajectory through the in-memory LSTM model, and returns the projected physical response and "What-If RUL" to the frontend.

**Blocked by:** 03 — FastAPI WebSocket Gateway & Frontend Integration

**Status:** complete

- [x] A new FastAPI endpoint `POST /api/what-if` accepts a JSON body with the engine's current state and proposed throttle/altitude values.
- [x] The endpoint spins up a new localized `Simulation` instance initialized to the current telemetry state.
- [x] The simulation is run in a fast-forward loop for a fixed 5-minute horizon, generating a physical trajectory of expected temperatures/pressures.
- [x] The trajectory is evaluated synchronously by the LSTM model (loaded in the FastAPI memory space) to project a "What-If RUL".
- [x] The endpoint returns the physical trajectory array and projected RUL as a JSON response.
- [x] The frontend What-If widget triggers this API and displays the result correctly.
