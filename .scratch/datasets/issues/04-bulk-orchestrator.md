# 04: Bulk Orchestration & Multiprocessing CLI

**What to build:** A robust CLI entry point that wraps the pipeline in a multiprocessing pool, allowing testers or CI to rapidly generate hundreds or thousands of statistically balanced mission datasets on demand.

**Blocked by:** 03: RUL Retroactive Labeling & Capping

**Status:** ready-for-agent

- [ ] A CLI script (e.g., `generate_datasets.py`) is provided that takes arguments for output directory and number of missions to generate.
- [ ] The script utilizes Python multiprocessing to generate multiple mission profiles and simulations in parallel.
- [ ] A statistically balanced dataset (across all fault classes) is correctly generated and partitioned into the output directory upon completion.
