# 02 — Interactive Single-Fault Selection

**What to build:** Introduces an interactive command-line menu prompting the user to select a single engine anomaly from the supported list (e.g., misfire, sensor drift, cylinder failure). Once selected, it injects the fault into the simulation at a fixed severity and verifies its signature appears in the exported telemetry CSV.

**Blocked by:** 01 — Core Simulation Loop & Telemetry Export

**Status:** ready-for-agent

- [ ] Present an interactive CLI menu listing all supported engine faults.
- [ ] Capture the user's selection and inject the chosen fault into the simulation.
- [ ] Verify the fault correctly alters the physics simulation (e.g., RPM drop, EGT spike).
- [ ] Verify the fault signature is recorded in the exported CSV.
