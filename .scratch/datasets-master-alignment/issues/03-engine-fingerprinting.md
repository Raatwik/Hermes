# 03: Individual Engine Fingerprinting

**What to build:** Introduce an `engine_id` to simulate a fleet of distinct physical engines. The simulation should apply consistent, randomized static offsets to the steady-state baseline for each unique `engine_id`, and the bulk orchestrator should generate unique UUIDs for each flight.

**Blocked by:** 02: Add Flight Phase Metadata

**Status:** ready-for-agent

- [ ] `Simulation` accepts an optional `engine_id` parameter.
- [ ] If an `engine_id` is provided, deterministic baseline offsets are calculated and applied to the engine's sensor outputs.
- [ ] The bulk orchestrator generates and passes a unique UUID (`engine_id`) for each mission in the dataset.
- [ ] The `engine_id` is explicitly recorded as a column in the output dataset.
- [ ] Tests verify that two identical flights with different `engine_id`s produce slightly different baseline telemetry.
