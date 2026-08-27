---
labels: ["ready-for-agent"]
---
# [wayfinder:task] Datasets: Mission Profiles & Telemetry Generation

## Problem Statement

The ML Engineering team needs a large, balanced, and structurally realistic dataset of engine telemetry to train predictive maintenance models (Diagnostics and Remaining Useful Life (RUL)). Generating this data manually or waiting for real-world anomalies is impractical. They need an automated pipeline that can orchestrate the core simulation to generate thousands of varied mission profiles, probabilistically inject faults over time, label the resulting telemetry accurately, and output the data in an optimized format for PyTorch training.

## Solution

A Python-based telemetry generation pipeline that reads randomized flight phases from YAML mission profiles. The pipeline runs the simulation over these phases, probabilistically injects and exponentially degrades faults using an automated scheduler, appends ML-ready labels (`fault_class` and `Remaining_Useful_Life`), and exports the final dataset into Parquet files partitioned by fault class for optimized DataLoader consumption.

## User Stories

1. As a Data Scientist, I want to define base mission structures (Takeoff, Climb, Cruise, Loiter) in YAML files, so that I can easily read and manually tweak the operational bounds.
2. As a Data Scientist, I want the mission generator to randomize duration, altitude, and throttle within physical bounds for each phase, so that the dataset covers a wide variety of operational scenarios rather than identical repeated flights.
3. As an ML Engineer, I want the pipeline to roll a random probability to assign a fault class per mission, so that the resulting dataset is statistically balanced across healthy and faulty states via the Law of Large Numbers.
4. As an ML Engineer, I want injected faults to follow an exponential degradation curve over time, so that the telemetry realistically models mechanical wear accelerating towards failure (severity = 1.0).
5. As an ML Engineer, I want every row of the generated telemetry to automatically include a `fault_class` column, so that I can train classification models for diagnostics.
6. As an ML Engineer, I want every row to include a `Remaining_Useful_Life` (RUL) column, so that I can train regression models for prognostics.
7. As an ML Engineer, I want the RUL for perfectly healthy states (prior to fault injection) to be capped at a maximum logical constant (e.g., 100 hours), so that I avoid `NaN` issues or infinite targets during PyTorch model training.
8. As a Data Engineer, I want the telemetry exported in Parquet format, so that the dataset is compressed, columnar, and fast to read.
9. As a Data Engineer, I want the exported Parquet files to be partitioned on disk by `fault_class` (e.g., `data/fault_class=misfire/...`), so that PyTorch `DataLoader`s can easily balance batches during training.
10. As a Tester, I want to execute the dataset generation pipeline via a single high-level function or CLI command, so that I can generate new datasets on demand in CI/CD or local environments.

## Implementation Decisions

- **Mission Definitions:** Mission templates will be stored in YAML. The pipeline will parse these and interpolate the phases to drive the simulation's `load_profile` and `step` APIs.
- **Fault Scheduling:** A standalone scheduler module will wrap the core simulation `FaultManager`. It will randomly select a timestamp to begin degradation and scale the fault severity exponentially until failure or mission end.
- **Labeling Logic:** The pipeline will calculate the RUL retroactively after the mission completes by measuring the time remaining from the current step until the fault severity reaches 1.0 (or capping it for healthy portions).
- **Exporting:** We will use `pandas` and `pyarrow` (or `fastparquet`) to save the resulting timeseries data directly to partitioned directories.
- **Seams:** The primary interface being built is the orchestration script. The core simulation (from `04-simulation`) will not be modified.

## Testing Decisions

- **What makes a good test:** Tests should assert against the final artifacts (the Parquet files) produced by the highest-level pipeline function, rather than testing internal schedulers or YAML parsers.
- **Modules Tested:** The main data generation orchestrator/CLI.
- **Prior Art:** (None yet; first dataset generation pipeline).
- **Test Scenarios:**
  - Mock a YAML config, run the generation function, and assert using Pandas that the output Parquet files are written to the correct partition folders.
  - Assert that the `fault_class` column matches the partition folder.
  - Assert that `Remaining_Useful_Life` is present, capped correctly before fault injection, and decreases monotonically after fault injection.
  - Assert that fault values (if visible in telemetry) follow an exponential curve (no sudden snaps).

## Out of Scope

- Core simulation physics updates (e.g., adding new engine parameters).
- Training the actual PyTorch models (this is strictly for data generation).
- Real-time data streaming or MQTT publishing.

## Further Notes

- Relying on the Law of Large Numbers for dataset balancing means we need to generate hundreds or thousands of runs. The generation script should ideally support multiprocessing or fast execution to ensure the pipeline runs in a reasonable amount of time.
