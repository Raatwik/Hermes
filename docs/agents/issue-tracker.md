# Issue Tracker & Project Milestones

## 1. High-Level Milestones
- **Milestone 1: Synthetic Data Pipeline Operational.** (COMPLETE) The Simulation engine successfully parses YAML mission profiles, applies fault injections, and outputs bulk CSV/Parquet telemetry for ML training.
- **Milestone 2: Twin Core & Diagnostics Live.** (COMPLETE) The XGBoost and LSTM models are trained, validated against the residuals, and wrapped into an inference pipeline. 
- **Milestone 3: Operator Dashboard MVP.** The Next.js frontend is actively subscribing to live MQTT/WebSocket streams, rendering the What-If sandbox and EHI telemetry.
- **Milestone 4: End-to-End Integration.** The FastAPI backend seamlessly glues the data generator, ML inference, and frontend together in real-time.

## 2. Cross-Stream Blockers
- **04.3-Simulation** is BLOCKED. The simulation engine must be updated with Failure Thresholds to physically terminate when critical states are reached (RPM < 1000, CHT > 250°C, Oil Pressure < 20 psi, EGT > 900°C, Vibration > 0.9). This inherently fixes the LSTM RUL countdown timer flaw.
- **05.4-Datasets** is BLOCKED. Needs a new `dynamic_maneuvers.yaml` to generate healthy transient missions (steep throttle/altitude jumps), and `generate_datasets.py` must explicitly guarantee compound fault injection (2+ faults) to balance training data.
- **03.3-ML Engineer** is BLOCKED. XGBoost must be wrapped in `MultiOutputClassifier` for compound faults. Isolation Forest must be retrained purely on healthy data with `0.001` contamination. LSTM must be retrained on the physically terminating datasets.
- **Integration** is blocked by **Frontend**; it requires the UI interfaces and ML endpoints to build the final API/MQTT orchestration layer. (Simulation and ML Engineer interfaces are now ready for consumption).

## 3. Wayfinder Team Tracks Index

| Track | Domain | Focus / Responsibility |
| :--- | :--- | :--- |
| **01-Researcher** | Advanced Prognostics | Planning the post-MVP transition to PINN-GAT-ODE. |
| **02-Frontend** | UI / UX | Operator Dashboard, Prescriptive Alerts, What-If Sandbox. |
| **03-ML Engineer** | AI / ML | XGBoost Fault Classification & Probabilistic LSTM RUL. |
| **04-Simulation** | Physics Engine | Python Rotax 914 MVEM & Physical Fault Injection. |
| **05-Datasets** | Data Engineering | Mission Profiles & Bulk Telemetry Generation (CSV/Parquet). |
| **06-Integration** | Backend / Systems | FastAPI Orchestration & MQTT/WebSocket Telemetry Adapters. |
