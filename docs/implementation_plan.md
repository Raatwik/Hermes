# Implementation Plan: MALE-UAV Aero-Piston Engine Digital Twin

Based on our design discussions, here is the finalized technical architecture and implementation roadmap for the project, grounded in the principles defined in `master.md`.

## 1. Core Architecture Decisions

| Component | Decision | Rationale |
| :--- | :--- | :--- |
| **Initial Focus** | Synthetic Fault & Telemetry Generator | Real MALE-UAV data is scarce; a robust data generator is a strict prerequisite for training the AI models. |
| **Target Engine** | Rotax 914 (Naturally Aspirated Approx.) | A representative engine. We will treat it as naturally aspirated to simplify altitude physics in the prototype, dropping power linearly with air density. |
| **Physics Calibration** | Approximated from Literature | Standard air-standard cycles and typical specs will be used and tuned until outputs are realistic for the AI pipeline. |
| **Physics Fidelity** | Mean-Value Engine Model (MVEM) | Captures continuous thermodynamic states (RPM, temps, pressures) with a good balance of execution speed and physical realism. |
| **Telemetry Specs** | 10 Hz + Gaussian Noise | 10 Hz captures transients well for onboard AI. Gaussian noise simulates DAQ imperfections. |
| **Data Labels** | EHI + RUL_hours | The generator will output true Engine Health Index and Remaining Useful Life as supervised labels for training. |
| **Digital Twin Realism**| Intentional Model Mismatch | The Digital Twin will use slightly miscalibrated physics compared to the Generator to force the AI to learn real-world baseline residuals. |
| **Fault Mechanisms** | Continuous Degradation & Discrete Faults | Essential for both RUL forecasting and open-set anomaly detection. |
| **Telemetry Delivery** | CSV/Parquet & MQTT/WebSocket | CSV/Parquet for offline PyTorch model training; MQTT/WebSockets to simulate live GCS telemetry streams. |
| **Generator Interface** | Python Library + CLI | Enables easy automation and scripting for generating diverse mission datasets. |
| **Mission Config** | YAML / JSON | Allows defining varied flight profiles (Takeoff, Climb, Cruise) dynamically without altering code. |
| **AI/ML Framework** | PyTorch | Industry standard for time-series forecasting, Neural ODEs, and the advanced PINN-GAT-ODE architecture. |
| **Dashboard Stack** | Next.js (React) + FastAPI | Provides the robust, multi-role (Operator/Engineer/Maintenance) complex UI required. |

---

## 2. Roadmap

### Phase 1: The Synthetic Telemetry Generator (Current Focus)
1. **Define the Rotax 914 MVEM:** Implement the Python classes for the baseline thermodynamic and physical relationships (Throttle $\rightarrow$ RPM, Fuel Flow, CHT, EGT, Oil P/T).
2. **Implement Mission Profiles:** Build the YAML parser to ingest mission profiles (altitude, ambient temp, throttle over time) and step the physics engine through them.
3. **Build the Fault Injector:** Implement hooks in the MVEM to alter physical parameters (e.g., injector flow coefficient, thermal transfer efficiency) dynamically over the mission to simulate wear or failure.
4. **Data Exporters:** Add CSV/Parquet offline exporters and an MQTT real-time streaming script.

### Phase 2: Digital Twin Core & Baseline ML
1. Develop the `Telemetry Adapter` to ingest the generated data.
2. Build the baseline state-estimator (hybrid model) to generate real-time residuals (Actual vs Expected).
3. Implement Stage 1 ML (Random Forest/XGBoost) for basic fault classification.

### Phase 3: Advanced Prognostics & Dashboards
1. Develop PyTorch models (LSTM/TCN) for continuous degradation and RUL prediction.
2. Implement the FastAPI backend and Next.js frontend to visualize the Engine Health Index and Counterfactual Mission Risk.

---

## 3. Dashboard UI/UX Design (MVP)

Based on our design discussion, the MVP Dashboard will be heavily tailored for the **GCS Mission Commander / Operator**. The goal is to minimize cognitive load while maximizing actionable decision support.

| UI/UX Feature | Design Decision | Rationale |
| :--- | :--- | :--- |
| **Primary Persona** | Mission Commander / Operator | Focuses on real-time go/no-go decisions rather than deep-dive thermodynamic engineering. |
| **Alert Abstraction** | Actionable Prescriptions | Instead of showing raw residuals, the AI will output prescriptive commands (e.g., *"WARNING: 75% Mission Failure Risk. Recommend reducing altitude to 15,000 ft"*). |
| **What-If Sandbox** | Auto-Top 3 + Manual Sandbox | The UI will automatically present the 3 safest alternative mission profiles, but will also include a sandbox for the operator to manually test custom altitudes/loads. |
| **Explainable AI (XAI)**| Plain-English Ranked List | XAI will be hidden behind a collapsible "Why?" panel, showing human-readable contributing factors (e.g., *"1. Sustained high CHT at current altitude"*) rather than complex node graphs. |
| **Fleet Management** | Deferred to V2 | The MVP will focus purely on proving the single-engine Digital Twin concept to keep scope manageable. |

---

## 4. Machine Learning Pipeline (MVP)

While the theoretical spec proposes a complex PINN-GAT-ODE, we will implement a pragmatic, staged ML pipeline to ensure end-to-end functionality first.

| ML Component | Design Decision | Rationale |
| :--- | :--- | :--- |
| **MVP Starting Point**| Stage 1 & 2 Models | We will build the XGBoost (fault classification) and LSTM (RUL) models first, deferring the PINN-GAT-ODE to a later research phase. |
| **Physics Integration**| Feature-Level Hybrid | The ML models will consume both the raw sensor data AND the physics residuals (Actual - Expected). This combines the strengths of data-driven and physics-based approaches without the complexity of custom physics-loss functions. |
| **Unknown Faults** | Confidence Thresholding | For MVP open-set anomaly detection, we will use probability thresholds on the XGBoost classifier (e.g., if max class probability < 0.6, output 'Unknown Fault') rather than training a separate unsupervised model. |
| **RUL Prediction** | Probabilistic LSTM | The LSTM will output distribution parameters (Mean and Variance) instead of a single scalar. This provides crucial confidence intervals (e.g., $145 \pm 20$ hours) for the Mission Risk calculations. |

---

## Next Steps

If you are satisfied with this plan, we can immediately begin writing the Python code for **Phase 1: The Synthetic Telemetry Generator**. I will set up the Python project structure and create the baseline Mean-Value Engine Model (MVEM) for the Rotax 914.
