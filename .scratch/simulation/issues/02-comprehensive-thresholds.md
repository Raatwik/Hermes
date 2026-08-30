# 02 — Comprehensive Thermal & Mechanical Thresholds

**What to build:** Expands the engine failure mechanics established in ticket 01. The simulation will now also check and terminate if any of the following critical physical limits are breached: CHT > 250°C, Oil Pressure < 20 psi, EGT > 900°C, or Vibration Index > 0.9. This ensures comprehensive coverage for catastrophic faults across all subsystems.

**Blocked by:** 01 — End-to-End Engine Stall Termination.

**Status:** ready-for-agent

- [ ] Simulation engine successfully registers a dead state if CHT exceeds 250°C.
- [ ] Simulation engine successfully registers a dead state if Oil Pressure drops below 20 psi.
- [ ] Simulation engine successfully registers a dead state if EGT exceeds 900°C (across any cylinder).
- [ ] Simulation engine successfully registers a dead state if Vibration Index exceeds 0.9.
- [ ] Unit tests assert that forcing any of these parameters beyond their threshold correctly triggers the failure mechanism.
