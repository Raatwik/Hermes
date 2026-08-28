# 02 — Feature Engineering (Rolling Statistics)

**What to build:** A data transformation module that applies sliding windows to the telemetry, calculating rolling statistical features so that the ML models can interpret temporal trends and engine degradation over time.

**Blocked by:** 01 — Baseline State-Estimator & Residual Generator

**Status:** ready-for-agent

- [ ] A feature engineering function/script loads the augmented residual datasets.
- [ ] Rolling mean, variance, min, and max are calculated for both raw sensors and residuals over fixed time windows (e.g., 10s and 30s).
- [ ] The script outputs the final engineered datasets ready for ML ingestion.
- [ ] A test verifies the rolling window math against a mocked DataFrame with a known, predictable trend.
