# 01 — Baseline State-Estimator & Residual Generator

**What to build:** An offline pre-processing pipeline that takes the raw engine telemetry datasets, calculates the "Expected" physics baseline using a pristine simulation, and outputs augmented datasets containing `Actual - Expected` residuals.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A script iterates through all raw Parquet files in the `data/` directory.
- [ ] For each mission, a fresh `Simulation` instance is initialized.
- [ ] The script steps the pristine simulation through the exact throttle and altitude sequences found in the mission data.
- [ ] `Actual - Expected` residuals are computed for all relevant engine parameters.
- [ ] The augmented datasets (including the new residual columns) are saved to disk in Parquet format.
- [ ] A test verifies that a healthy deterministic run produces ~0.0 residuals (accounting for noise).
