# 02: Add Flight Phase Metadata

**What to build:** Parse human-readable phase names (e.g., "Takeoff", "Cruise") from the mission YAML templates, and record the active phase as a string column named `flight_phase` in the generated telemetry dataset.

**Blocked by:** 01: Expose Core Control Inputs and Fault Severity

**Status:** ready-for-agent

- [ ] Mission YAML templates include a `name` key for every phase.
- [ ] The `parse_mission_config` function successfully parses and returns the phase names along with the setpoints.
- [ ] The simulation loop correctly interpolates or maps the current time to the active phase name.
- [ ] The `flight_phase` string is correctly recorded in the dataset dataframe.
