# 03 — Fault Injection Manager & Simple Faults

**What to build:** The centralized `FaultManager` and the `inject_fault(fault_type, **kwargs)` API on the `Simulation` class. This implements basic faults like "sensor drift" (which adds offsets to final outputs without changing engine physics) and "cooling degradation" (which alters thermal steady-states and lag filter time constants). The `Simulation` will ask the `FaultManager` for active modifiers on every `step(dt)`.

**Blocked by:** 01 — Core Physics & Baseline API

**Status:** ready-for-agent

- [ ] Implement `FaultManager` class to store active faults and calculate their current modifiers.
- [ ] Implement `inject_fault` API on `Simulation` class.
- [ ] Update core physics calculations to apply `FaultManager` modifiers before returning `get_state()`.
- [ ] Implement "sensor drift" fault logic.
- [ ] Implement "cooling degradation" fault logic.
- [ ] Test: Step to steady state, inject 'cooling_degradation', step for 50s, assert CHT is strictly greater than the baseline steady state.
