# Issue Tracker & Project Milestones

## 1. High-Level Milestones
- **Milestone 1: Synthetic Data Pipeline Operational.** (COMPLETE) The Simulation engine successfully parses YAML mission profiles, applies fault injections, and outputs bulk CSV/Parquet telemetry for ML training.
- **Milestone 2: Twin Core & Diagnostics Live.** (COMPLETE) The XGBoost and LSTM models are trained, validated against the residuals, and wrapped into an inference pipeline. 
- **Milestone 3: Operator Dashboard MVP.** The Next.js frontend is actively subscribing to live MQTT/WebSocket streams, rendering the What-If sandbox and EHI telemetry.
- **Milestone 4: End-to-End Integration.** The FastAPI backend seamlessly glues the data generator, ML inference, and frontend together in real-time.

## 2. Cross-Stream Blockers
- **Datasets / Simulation** is BLOCKED. The simulation engine must be updated to physically terminate when critical thresholds are reached (e.g., CHT > 250, RPM < 1000) so LSTM RUL labels are dynamic. It also needs to generate healthy transient missions (throttle/altitude jumps) and compound faults to fix XGBoost false alarms.
- **ML Engineer** is BLOCKED. An extensive evaluation against the master spec revealed critical flaws: XGBoost fails on healthy transient maneuvers and masks compound faults (requires MultiOutputClassifier), LSTM RUL acts as a static countdown timer due to non-terminating simulations, and Isolation Forest fails entirely due to contamination from faulty training data. Models must be retrained on new dynamic datasets.
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
