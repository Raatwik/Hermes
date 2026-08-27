# 02 — Mission Profile Execution

**What to build:** The ability to parse JSON or YAML mission profiles containing arrays of timestamped setpoints (throttle, altitude, ambient temperature). The `Simulation` class's `load_profile(profile_data)` method will parse this, and subsequent calls to `step(dt)` will automatically interpolate the current inputs based on elapsed time, allowing the engine to "fly" a full scenario dynamically without manual input updates per tick.

**Blocked by:** 01 — Core Physics & Baseline API

**Status:** ready-for-agent

- [ ] Define mission profile schema (JSON/YAML).
- [ ] Implement `load_profile` in the `Simulation` class to parse and store the profile.
- [ ] Update `step(dt)` to calculate total elapsed time and interpolate the current throttle/altitude/temp from the mission profile.
- [ ] Test: Load a 10-minute mission profile, step through it, and assert that the internal throttle state correctly tracks the profile's interpolations.
