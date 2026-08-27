# 02: Automated Exponential Fault Scheduler

**What to build:** Extends the orchestrator to randomly pick a fault class per mission (or keep it healthy). It calculates an exponential severity curve starting at a random timestamp and drives the simulation's `FaultManager` step-by-step with this dynamic degradation, ultimately exporting the data into the correct fault partition.

**Blocked by:** 01: Baseline "Healthy" Generation Pipeline

**Status:** ready-for-agent

- [ ] A scheduler rolls a random probability per mission to determine the assigned fault class (or healthy).
- [ ] If faulty, the scheduler randomly selects an injection timestamp within the mission bounds.
- [ ] The scheduler calculates an exponential degradation curve from the injection point up to a severity of 1.0 (failure).
- [ ] The core simulation is stepped using this dynamically increasing severity via the `FaultManager`.
- [ ] The final Parquet file is exported into the correct partition directory corresponding to the chosen `fault_class`.
