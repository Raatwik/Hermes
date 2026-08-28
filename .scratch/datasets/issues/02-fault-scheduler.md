# 02: Automated Exponential Fault Scheduler

**What to build:** Extends the orchestrator to randomly pick a fault class per mission (or keep it healthy). It calculates an exponential severity curve starting at a random timestamp and drives the simulation's `FaultManager` step-by-step with this dynamic degradation, ultimately exporting the data into the correct fault partition.

**Blocked by:** 01: Baseline "Healthy" Generation Pipeline

**Status:** completed

- [x] A scheduler rolls a random probability per mission to determine the assigned fault class (or healthy).
- [x] If faulty, the scheduler randomly selects an injection timestamp within the mission bounds.
- [x] The scheduler calculates an exponential degradation curve from the injection point up to a severity of 1.0 (failure).
- [x] The core simulation is stepped using this dynamically increasing severity via the `FaultManager`.
- [x] The final Parquet file is exported into the correct partition directory corresponding to the chosen `fault_class`.

## Resolution

Extended `generate_mission.py` to randomly pick from `KNOWN_FAULTS` (or `healthy`). If a fault is chosen, it randomly selects an injection time and computes an exponential degradation curve that reaches a severity of 1.0 by the end of the mission. The fault is cleared and re-injected with the updated severity at each simulation step to ensure dynamic scaling. The dataset correctly exports partitioned by `fault_class`.
