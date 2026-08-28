# [wayfinder:task] ML Engineer: Diagnostics & RUL Models

## Question

What are the optimal hyperparameters and feature engineering steps for the XGBoost classifier (discrete faults) and probabilistic LSTM (RUL), and how well do they perform on the synthetic datasets? (Train and validate the models).

## Status
- **ACTIVE**: Datasets are generated (500 missions in `data/`). The next step is to build the baseline fault classifier (Stage 1).

## Implementation Plan (Finalized via /grill-me)
- **Directory Structure:** Code will reside in a new `ml_pipeline/` directory.
- **Digital Twin Expected State:** Re-use the thermodynamic maps and filters from `simulation/engine.py` as the pure Physics-Based Digital Twin expected state to calculate `Actual - Expected` residuals.
- **Residual Computation:** Pre-compute the residuals for all generated missions and save them to `data_residuals/`. This optimizes iteration speed for the ML training loop over computing on-the-fly.
- **XGBoost Feature Set (Stage 1):** The baseline multi-class classifier will consume the sensor residuals PLUS the environmental and control context (throttle, altitude, ambient temp) to predict the specific `fault_class`.
- **Train/Test Splitting:** Dataset splits (80/20) will group by mission (file) rather than randomized rows to strictly prevent time-series data leakage.
- **Unknown Faults:** For MVP open-set anomaly detection, we will use probability thresholds on the XGBoost classifier (e.g., if max class probability < 0.6, output 'Unknown Fault') rather than training a separate unsupervised model.
- **RUL Prediction (Stage 2):** The subsequent LSTM will output distribution parameters (Mean and Variance) instead of a single scalar to provide crucial confidence intervals (e.g., $145 \pm 20$ hours).

## Blocked By
- None. (Previously blocked by [05-datasets.md](05-datasets.md), which is now complete).
