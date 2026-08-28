# 01: Expose Core Control Inputs and Fault Severity

**What to build:** Ensure that the final Parquet dataset explicitly includes the `throttle`, `altitude`, and a continuous `fault_severity` (0.0 to 1.0) column for every timestep, allowing downstream ML models to properly condition expected behavior on the operating state.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `Simulation.get_state()` returns the current `throttle`
- [ ] `Simulation.get_environment()` returns the current `altitude`
- [ ] The pipeline orchestrator extracts continuous fault severity from the `FaultScheduler` and adds it to the recorded state.
- [ ] Pipeline tests assert that all three columns exist in the output dataset.
