# Domain: MALE-UAV Aero-Piston Engine Digital Twin

## 1. Ubiquitous Language (Glossary)
- **Digital Twin (DT):** A virtual, continuous state-estimation loop that predicts expected engine behavior based on real-time physics, providing a reference baseline for the actual engine.
- **MVEM (Mean-Value Engine Model):** A reduced-order thermodynamic/physics model that calculates continuous engine states (RPM, CHT, EGT, Pressures) without the computational overhead of CFD.
- **Residual:** The delta between the physical engine's actual measurement and the DT's expected physics prediction (`Actual - Expected`). This is the primary diagnostic signal.
- **EHI (Engine Health Index):** A continuous, trackable metric representing the current health/degradation state of the engine.
- **RUL (Remaining Useful Life):** A probabilistic prediction of the time remaining (in hours) before critical engine failure.
- **Drift:** A statistically significant, persistent divergence between the physical engine and the Digital Twin's expected baseline.
- **Synthetic Fault Injection:** Modifying underlying physical parameters (e.g., injector flow coefficient) in the MVEM to generate emergent faulty telemetry, rather than manually adding noise to sensor outputs.
- **Counterfactual Mission ("What-If"):** Running the Digital Twin forward in time against an alternative mission profile (e.g., lower altitude) to evaluate if doing so reduces predicted risk.

## 2. Core Business Invariants
- **Residual-First AI:** Machine Learning models MUST ingest physics residuals (`Actual - Expected`) as primary features, not just raw sensor data.
- **Probabilistic Forecasting:** Remaining Useful Life (RUL) outputs MUST include confidence intervals/variances; scalar point-estimates are invalid for mission-critical risk assessment.
- **Fault Source Isolation:** The system MUST distinguish between a sensor fault (measurement offset) and a physical engine fault (thermodynamic state change).
- **Physical Bounding:** The MVEM MUST strictly constrain the Digital Twin; the ML component is restricted to learning residuals and unmodeled real-world deviations, never replacing the physics engine entirely.
- **Open-Set Anomaly Detection:** The system MUST safely classify unrecognized residual patterns as "Unknown Faults" rather than forcing them into known categories.

## 3. Module Boundaries
- **Simulation Domain (Data Source):** Owns the Rotax 914 MVEM and synthetic fault injection logic. Emits mission-driven synthetic telemetry. 
- **Integration Domain (Transport/Backend):** Owns the FastAPI server and MQTT/WebSocket pipelines. Acts as the orchestrator passing telemetry from the engine/simulator to the Estimator, and predictions to the UI.
- **Twin Core Domain (State Estimator):** Consumes raw telemetry and mission profiles. Emits expected baseline values and computes the Residuals.
- **ML/Prognostics Domain (AI):** Consumes Residuals. Owns the XGBoost (classification) and LSTM (RUL) models. Emits Engine Health Index, fault predictions, and RUL distributions.
- **Frontend Domain (UI):** Consumes telemetry, EHI, RUL, and predictions. Owns the Mission Commander Operator Dashboard, actionable prescriptions, and What-If sandbox rendering.
