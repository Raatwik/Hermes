# [wayfinder:research] Researcher: Advanced Prognostics (PINN-GAT-ODE)

## Question

What are the architectural requirements, data dependencies, and theoretical boundaries for implementing a Physics-Informed Neural Network with Graph Attention (PINN-GAT-ODE) for this engine twin, and how should we stage the transition from our MVP models (XGBoost/LSTM) to this architecture?

## Blocked By
*(None)*

## Resolution

**Architectural Requirements:**
- **Spatio-Temporal Graph Attention:** The engine sensors (CHT, EGT, RPM, MAP, etc.) act as nodes, and physical/thermodynamic relationships act as edges. This extracts a continuous latent engine state `z(t)`.
- **Physics-Guided Neural ODE:** Models latent dynamics as `dz/dt = f_thermo(z, u) + N_theta(z, u)`, separating known thermodynamic rules from learned neural network residuals.
- **Prediction Heads:** An Open-Set/Anomaly head (using EVT/OpenMax for unknown faults) and a Probabilistic RUL head (outputting Weibull parameters and confidence bounds).
- **Subsystem Role:** PINN-GAT-ODE should function as an advanced AI/state-dynamics module inside the Digital Twin, acting on residuals or states from the main physics/EKF estimator, rather than replacing the core physics model entirely.

**Data Dependencies:**
- Requires defined graph structures representing physical sensor linkages.
- Needs streaming multivariate engine telemetry and control inputs.
- Heavily depends on the physics-based synthetic fault and degradation generator to provide continuous degradation trajectories and sufficient training data for known/unknown fault conditions.

**Theoretical Boundaries:**
- The architecture is highly advanced and research-heavy. It must maintain strict separation from the EKF/UKF baseline state estimator to avoid duplicating state-estimation efforts.
- Its open-set anomaly detection capabilities are theoretical and require validation.

**Transition Strategy (MVP to PINN-GAT-ODE):**
The project mandates a staged Machine Learning approach to avoid unmanageable complexity:
1. **Stage 1 (Baseline):** Implement XGBoost/Random Forest for baseline fault classification and feature importance on the physics residuals.
2. **Stage 2 (Time-Series):** Adopt LSTM/GRU for MVP degradation and RUL modeling.
3. **Stage 3/4:** Add LSTM Autoencoders or Isolation Forests for simpler anomaly detection.
4. **Stage 5 (Advanced):** Once the core hybrid residual pipeline (`Actual - Expected = Residual -> AI`) is stable, introduce PINN-GAT-ODE in parallel as an advanced research comparison model. It should not be the initial primary architecture due to SIH timeline constraints.
