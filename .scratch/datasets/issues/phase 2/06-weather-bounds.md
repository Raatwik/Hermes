# 06 — Weather & Operational Bounds Randomization

**What to build:** The `Simulation` engine natively supports an `ambient_temp_offset` to simulate weather. The YAML parser in `generate_mission.py` natively handles `[min, max]` arrays for `throttle`, `altitude`, `duration`, and `ambient_temp_offset`, uniformly sampling them to generate diverse, climate-varied telemetry profiles.

**Blocked by:** 05 — Sensor Noise & Metadata Integration

**Status:** ready-for-agent

- [ ] Update `Simulation` to accept an `ambient_temp_offset` and apply it to the standard atmosphere temperature calculation.
- [ ] Update `parse_mission_config` in `generate_mission.py` to parse ranges `[min, max]` for phase parameters (`throttle`, `altitude`, `duration`) and sample uniformly from them.
- [ ] Parse `ambient_temp_offset` as an optional range `[min, max]` in the mission YAML and pass the sampled value into the `Simulation` during dataset generation.
- [ ] Update existing YAML loading tests to assert that parsed setpoints fall strictly within defined bounds and that the ambient temperature offset affects engine outputs.
