# 07 — Base Mission Templates & Bulk Orchestrator Update

**What to build:** Creation of the actual standard mission YAML templates (e.g., `takeoff_cruise.yaml`, `loiter.yaml`) with wide physical bounds. The bulk multiprocessing orchestrator (`generate_datasets.py`) is updated to pull randomly from these YAML templates instead of hardcoding python random variables, yielding the final structurally-realistic ML dataset.

**Blocked by:** 06 — Weather & Operational Bounds Randomization

**Status:** ready-for-agent

- [ ] Create `datasets/missions/takeoff_cruise.yaml` containing realistic operational bounds for takeoff, climb, cruise, and descent phases.
- [ ] Create `datasets/missions/loiter.yaml` containing bounds representing a prolonged high-altitude loitering mission.
- [ ] Refactor `generate_random_profile` inside `generate_datasets.py` to select a random template from `datasets/missions/`, parse it (sampling bounds), and use it for the mission run.
- [ ] Test the bulk generation pipeline to verify it cleanly runs over the new YAML configurations and exports successfully.
