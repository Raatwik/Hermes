# 03: RUL Retroactive Labeling & Capping

**What to build:** A post-processing step before Parquet export that calculates the `Remaining_Useful_Life` (RUL) column for the mission. It accurately counts down to failure from the moment of injection and guarantees that perfectly healthy segments are capped at a logical maximum constant to prevent `NaN` targets during PyTorch training.

**Blocked by:** 02: Automated Exponential Fault Scheduler

**Status:** completed

- [x] Telemetry includes a `Remaining_Useful_Life` column for all generated rows.
- [x] Following a fault injection, RUL decreases monotonically down to 0 at the point where severity reaches 1.0.
- [x] Prior to fault injection (or for entirely healthy missions), RUL is capped at a specified logical maximum constant.

## Resolution

Added a `RUL_MAX` constant (500.0s) and calculation logic in `generate_mission.py`'s state recording loop. Healthy runs consistently output `RUL_MAX`, while faulty runs decrease down to 0.0 at `max_time`, capped by `RUL_MAX` during their healthy prefix.
