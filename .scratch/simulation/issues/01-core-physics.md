# 01 — Core Physics & Baseline API

**What to build:** The foundational `Simulation` class and a `LagFilter` utility. The engine can be initialized with a static throttle and altitude. Calling the `step(dt)` API advances time, causing the engine's telemetry (RPM, CHT, EGT, Oil Press/Temp, Fuel Flow, Battery) to smoothly approach their empirically mapped steady-state values without instantly snapping. The current telemetry state can be retrieved via `get_state()`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Create empirical steady-state lookup maps for baseline throttle/altitude combinations.
- [ ] Implement `LagFilter` class for exponential moving average transitions.
- [ ] Implement `Simulation` class with `step(dt)` and `get_state()` methods.
- [ ] Baseline Test: Step 100 seconds at constant 50% throttle, assert temperatures and pressures stabilize within plausible bounds.
- [ ] Transient Test: Step at 50% throttle until stable, instantly change throttle to 80%, step for 5 seconds, assert values are rising but haven't instantly snapped to maximums.
