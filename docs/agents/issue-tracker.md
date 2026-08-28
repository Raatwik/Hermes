# Issue Tracker & Project Milestones

## 1. High-Level Milestones
- **Milestone 1: Synthetic Data Pipeline Operational.** The Simulation engine successfully parses YAML mission profiles, applies fault injections, and outputs bulk CSV/Parquet telemetry for ML training.
- **Milestone 2: Twin Core & Diagnostics Live.** The XGBoost and LSTM models are trained, validated against the residuals, and wrapped into an inference pipeline. 
- **Milestone 3: Operator Dashboard MVP.** The Next.js frontend is actively subscribing to live MQTT/WebSocket streams, rendering the What-If sandbox and EHI telemetry.
- **Milestone 4: End-to-End Integration.** The FastAPI backend seamlessly glues the data generator, ML inference, and frontend together in real-time.

## 2. Cross-Stream Blockers
- **Datasets** is complete — **Simulation** and **Datasets** have successfully combined to provide a functional MVEM engine and a telemetry generation pipeline (mission profiles, fault injection, automated RUL labeling, multiprocessing bulk generation, and Parquet export). Milestone 1 is fully operational.
- **ML Engineer** is now UNBLOCKED. The pipeline can generate the robust, balanced training data for both healthy and faulty conditions needed to train diagnostics and RUL models.
- **Integration** is blocked by **Frontend**, **Simulation**, and **ML Engineer**; it requires the interfaces from all three to build the final API/MQTT orchestration layer.

## 3. Wayfinder Team Tracks Index

| Track | Domain | Focus / Responsibility |
| :--- | :--- | :--- |
| **01-Researcher** | Advanced Prognostics | Planning the post-MVP transition to PINN-GAT-ODE. |
| **02-Frontend** | UI / UX | Operator Dashboard, Prescriptive Alerts, What-If Sandbox. |
| **03-ML Engineer** | AI / ML | XGBoost Fault Classification & Probabilistic LSTM RUL. |
| **04-Simulation** | Physics Engine | Python Rotax 914 MVEM & Physical Fault Injection. |
| **05-Datasets** | Data Engineering | Mission Profiles & Bulk Telemetry Generation (CSV/Parquet). |
| **06-Integration** | Backend / Systems | FastAPI Orchestration & MQTT/WebSocket Telemetry Adapters. |
