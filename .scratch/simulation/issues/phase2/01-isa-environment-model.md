# 01 — ISA Environment Model

**What to build:** Data Scientists can call `sim.get_environment()` to retrieve mathematically derived standard atmospheric conditions (ambient temperature, pressure, air density) corresponding to the drone's current altitude.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `Simulation` exposes a new `get_environment()` public method returning a dictionary with keys `ambient_temperature`, `ambient_pressure`, and `air_density`.
- [ ] The values are correctly derived from the simulation's current `altitude` using standard ISA formulas.
- [ ] A test asserts that at altitude 0, standard sea-level values are returned (e.g. ~15°C and 101.3 kPa).
- [ ] A test asserts that at a higher altitude (e.g. 10,000 ft), temperature and pressure drop accordingly.
