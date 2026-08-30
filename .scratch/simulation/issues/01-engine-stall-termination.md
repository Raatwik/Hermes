# 01 — End-to-End Engine Stall Termination

**What to build:** The core mechanism for catastrophic engine failure. When the engine RPM drops below 1000, the simulation explicitly registers a dead state (e.g. by setting an `is_alive` flag to false or throwing an `EngineFailureException`). The telemetry pipeline loop must catch this state change, gracefully halt its time-stepping loop, and export the shortened dataset. This natively resolves the RUL static countdown flaw for engine stalls.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Simulation engine accurately identifies an engine stall when RPM drops below 1000.
- [x] Simulation step refuses to advance further once a stall is registered.
- [x] The data generation pipeline gracefully catches the stall, halts the loop early, and exports a valid Parquet dataset.
- [x] Pipeline tests assert that injecting a catastrophic fault (forcing RPM < 1000) produces a dataset shorter than the scheduled `max_time`.
