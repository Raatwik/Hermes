# 04: Bulk Orchestration & Multiprocessing CLI

**What to build:** A robust CLI entry point that wraps the pipeline in a multiprocessing pool, allowing testers or CI to rapidly generate hundreds or thousands of statistically balanced mission datasets on demand.

**Blocked by:** 03: RUL Retroactive Labeling & Capping

**Status:** completed

- [x] A CLI script (e.g., `generate_datasets.py`) is provided that takes arguments for output directory and number of missions to generate.
- [x] The script utilizes Python multiprocessing to generate multiple mission profiles and simulations in parallel.
- [x] A statistically balanced dataset (across all fault classes) is correctly generated and partitioned into the output directory upon completion.

## Resolution

Created `generate_datasets.py` which uses `multiprocessing.Pool` to run `generate_mission.run_pipeline` in parallel. It handles statistical balancing explicitly by computing an exact distribution across all classes (1/6 for healthy and 1/6 for each of the 5 faults). It dynamically generates randomly varied flight profiles instead of requiring a static YAML config. Data class `MissionTask` encapsulates the parameters to prevent primitive obsession.
