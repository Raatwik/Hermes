# 04 — Compound Fault Support & Menu Looping

**What to build:** Upgrades the CLI menu to loop iteratively, allowing the user to stack multiple different anomalies until they select "Done". Verifies that the core fault manager degrades all selected faults simultaneously and outputs their combined signatures into the raw telemetry CSV.

**Blocked by:** 03 — Progressive Degradation & Target Time to Failure

**Status:** ready-for-agent

- [ ] Update the CLI menu to loop, allowing multiple fault selections.
- [ ] Add a "Done" option to finish selection and begin the simulation.
- [ ] Store multiple selected faults and inject them concurrently.
- [ ] Ensure the exponential degradation scales appropriately for all concurrent faults.
- [ ] Verify the CSV output contains signatures of all selected faults overlapping.
