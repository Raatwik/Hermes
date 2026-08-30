# 02 — ML Subscriber with Live Physics Residuals and AI Inference

**What to build:** A `ml_subscriber.py` service that listens to the live `telemetry/engine` feed. For each tick, it locally instantiates the physics engine to compute `Actual - Expected` residuals, maintains a 60-step rolling window, runs the data through the XGBoost, LSTM, and Isolation Forest models. It overrides XGBoost and suppresses LSTM if an open-set anomaly is found, computes the Twin Drift score, and publishes the final diagnostic state to `telemetry/predictions`.

**Blocked by:** 01 — Standalone MQTT Broker and Simulation Playback

**Status:** ready-for-agent

- [ ] A subscriber script (`integration/ml_subscriber.py`) listens to the `telemetry/engine` topic.
- [ ] On each tick, it queries a local `Simulation` instance to compute `Actual - Expected` residuals for key sensors.
- [ ] It computes a Twin Drift score using a normalized rolling mean-squared-error of the residuals.
- [ ] It feeds the residuals and rolling statistics into the XGBoost and LSTM models.
- [ ] It feeds the data into the Isolation Forest; if an anomaly is detected, XGBoost's output is overridden to `UNKNOWN_ANOMALY` and the LSTM's RUL is suppressed to `None`.
- [ ] The unified prediction object is published as JSON to `telemetry/predictions`.
- [ ] The script automatically loads updated model weights (`.pt`/`.joblib`) upon restart without code changes.
