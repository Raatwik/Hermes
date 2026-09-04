# 01 — Core Simulation Loop & Telemetry Export

**What to build:** A basic CLI script (`simulation/scenarios/interactive_attack_scenario.py`) that initializes the 1-hour standardized baseline mission profile (Takeoff, Climb, Cruise, Loiter, Return, Land). It runs a healthy engine simulation, safely catches any `EngineFailureException` (so it terminates cleanly if an anomaly were present), and exports the raw telemetry row-by-row to a CSV matching the ML pipeline schema (with no RUL metadata).

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] Create the new CLI script replacing `djibouti_accident.py`.
- [x] Define the 1-hour mission setpoints (takeoff, climb, cruise, loiter, return, land).
- [x] Implement the core simulation loop capturing telemetry step-by-step.
- [x] Save output to `attack_scenario_telemetry.csv` using the raw telemetry schema.
- [x] Handle `EngineFailureException` to ensure a clean exit.
