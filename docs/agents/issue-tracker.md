# Issue Tracker & Project Milestones

## 1. High-Level Milestones
- **Milestone 1: Synthetic Data Pipeline Operational.** (COMPLETE) The Simulation engine successfully parses YAML mission profiles, applies fault injections, and outputs bulk CSV/Parquet telemetry for ML training.
- **Milestone 2: Twin Core & Diagnostics Live.** (COMPLETE) The XGBoost and LSTM models are trained, validated against the residuals, and wrapped into an inference pipeline. 
- **Milestone 3: Operator Dashboard MVP.** The Next.js frontend is actively subscribing to live MQTT/WebSocket streams, rendering the What-If sandbox and EHI telemetry.
- **Milestone 4: End-to-End Integration.** The FastAPI backend seamlessly glues the data generator, ML inference, and frontend together in real-time.

## 2. Cross-Stream Blockers
- **Datasets** is complete — **Simulation** and **Datasets** have successfully combined to provide a functional MVEM engine and a highly realistic telemetry generation pipeline. Milestone 1 is fully operational. We have successfully generated 1,000 mission profiles across healthy and faulty classes and stored them in `data/`.
- **ML Engineer** is now COMPLETE for MVP. The Stage 1 anomaly detection (XGBoost/Isolation Forest) and Stage 2 RUL forecasting (Probabilistic LSTM) are fully operational and have been wrapped into an inference pipeline.
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
