# 02 — Dynamic Telemetry Extensions

**What to build:** The `sim.get_state()` method is expanded to automatically calculate and include `engine_load` and `injection_timing` using instantaneous throttle and RPM values.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The dictionary returned by `Simulation.get_state()` includes new `engine_load` and `injection_timing` keys.
- [ ] The new values are calculated instantaneously based on the current throttle and RPM (no lag filters required).
- [ ] A test asserts that when stepped at 0% throttle, engine load is near its minimum value.
- [ ] A test asserts that when stepped at 100% throttle, engine load is near its maximum (1.0 or 100%).
