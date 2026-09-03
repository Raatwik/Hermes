# 03 — Progressive Degradation & Target Time to Failure

**What to build:** Replaces fixed-severity fault injection with exponential degradation logic. It prompts the user for a "Target Time to Failure" input and uses it to automatically calculate the degradation curve. Running the script will now show the anomaly gradually worsening from 0 severity until it crosses physical thresholds and triggers an engine seizure.

**Blocked by:** 02 — Interactive Single-Fault Selection

**Status:** ready-for-agent

- [ ] Prompt the user to input a "Target Time to Failure" in seconds.
- [ ] Implement or integrate the exponential degradation calculation to ramp severity dynamically over time.
- [ ] Apply the dynamically scaling severity to the injected fault during the simulation loop.
- [ ] Verify the simulation successfully degrades and ultimately triggers the `EngineFailureException` near the target time.
