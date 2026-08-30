# Issue Tracker & Project Milestones

## 1. High-Level Milestones
- **Milestone 1: Synthetic Data Pipeline Operational.** (COMPLETE) The Simulation engine successfully parses YAML mission profiles, applies fault injections, and outputs bulk CSV/Parquet telemetry for ML training.
- **Milestone 2: Twin Core & Diagnostics Live.** (COMPLETE) The XGBoost and LSTM models are trained, validated against the residuals, and wrapped into an inference pipeline. 
- **Milestone 3: Operator Dashboard MVP.** The Next.js frontend is actively subscribing to live MQTT/WebSocket streams, rendering the What-If sandbox and EHI telemetry.
- **Milestone 4: End-to-End Integration.** The FastAPI backend seamlessly glues the data generator, ML inference, and frontend together in real-time.

## 2. Cross-Stream Blockers
- **04.3-Simulation** is COMPLETE. Engine failure thresholds implemented (`EngineFailureException` raised on RPM < 1000, CHT > 250°C, Oil Pressure < 20 psi, EGT > 900°C, Vibration > 0.9). Simulations now physically terminate on catastrophic faults, and `run_pipeline` anchors RUL to the true moment of engine death.
- **05.4-Datasets** is COMPLETE. `dynamic_maneuvers.yaml` added with 9 aggressive alternating phases for transient training data. `"compound"` added to `all_classes` in `generate_datasets.py`. `FaultScheduler` guarantees 2 overlapping fault injections at 100% probability when `force_fault_class="compound"`.
- **03.3-ML Engineer** is COMPLETE. XGBoost `MultiOutputClassifier` migration is DONE (issue 01). Isolation Forest tightened to healthy-only training with `0.001` contamination is DONE (issue 02). LSTM retrained on physically-terminating datasets is DONE (issue 03): `TelemetryDataset` now uses the pre-computed `Remaining_Useful_Life` column anchored to engine death instead of a naive countdown, and the model weights are saved to `models/best_lstm_model.pt`.
- **Integration** issue 01 (MQTT Broker & Sim Playback) is COMPLETE. Embedded `amqtt` broker in `integration/broker.py` and `integration/sim_publisher.py` reads `djibouti_aligned.parquet` row-by-row, publishing JSON to `telemetry/engine` with adjustable speed factor.
- **Integration** issue 02 (ML Subscriber) is COMPLETE. `integration/ml_subscriber.py` subscribes to `telemetry/engine`, computes physics residuals via local `Simulation`, maintains a 60-step rolling window, computes Twin Drift score, runs XGBoost/LSTM/IsolationForest inference (graceful degradation when models absent), applies anomaly override logic, and publishes unified predictions to `telemetry/predictions`. Remaining integration issues (FastAPI gateway, What-If API) are blocked by **Frontend**.

## 3. Wayfinder Team Tracks Index

| Track | Domain | Focus / Responsibility |
| :--- | :--- | :--- |
| **01-Researcher** | Advanced Prognostics | Planning the post-MVP transition to PINN-GAT-ODE. |
| **02-Frontend** | UI / UX | Operator Dashboard, Prescriptive Alerts, What-If Sandbox. |
| **03-ML Engineer** | AI / ML | XGBoost Fault Classification & Probabilistic LSTM RUL. |
| **04-Simulation** | Physics Engine | Python Rotax 914 MVEM & Physical Fault Injection. |
| **05-Datasets** | Data Engineering | Mission Profiles & Bulk Telemetry Generation (CSV/Parquet). |
| **06-Integration** | Backend / Systems | FastAPI Orchestration & MQTT/WebSocket Telemetry Adapters. |
