# 06 — Broadcast and Render Dynamic Physics Baselines

**What to build:** 
The System Status correctly reports "NOMINAL" instead of "CRITICAL" during healthy maneuvers. The backend ML subscriber is updated to extract and broadcast expected physics metrics (`expected_rpm`, `expected_oil_pressure`, etc.) into the JSON payload, and the frontend consumes these live values to power its Twin Comparison deviations instead of relying on hardcoded static numbers.

**Blocked by:** 
None — can start immediately.

**Status:** ready-for-agent

- [ ] The ML subscriber (`integration/ml_subscriber.py`) extracts `expected_rpm`, `expected_oil_pressure`, `expected_oil_temp`, `expected_cht`, and `expected_egt_1..4` from its local simulation and includes them in the published predictions payload.
- [ ] The ML subscriber (`tests/test_ml_subscriber.py`) and WebSocket Gateway (`tests/test_ws_gateway.py`) test suites are updated to assert the presence and correctness of these new `expected_*` keys.
- [ ] The frontend store (`frontend/src/store/useEngineStore.js`) routes these incoming `expected_*` variables into the `twinComparisonData` objects, overriding the hardcoded fallbacks.
- [ ] The dashboard System Status no longer triggers false "CRITICAL" alarms when the engine operates healthily across varying throttle levels.
