# 05 — Sensor Noise & Metadata Integration

**What to build:** The core `Simulation` applies deterministic Gaussian noise based on a defined `SENSOR_NOISE_STD` profile, giving telemetry realistic sensor jitter. The dataset export pipeline simultaneously adds the new `time_since_fault_injection` column, providing ML models with explicit prognostic targets alongside RUL.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Define `SENSOR_NOISE_STD` dictionary in `simulation/engine.py` with standard deviations for each telemetry parameter.
- [ ] Add an optional `noise_seed` to `Simulation` to apply Gaussian noise to the `get_state()` output without modifying the underlying physics state.
- [ ] Update `generate_mission.py` to calculate and export `time_since_fault_injection` in the output Parquet dataset (defaulting to 0.0 prior to injection).
- [ ] Write unit tests to assert that noise variance roughly matches `SENSOR_NOISE_STD` and metadata columns are correctly populated.
