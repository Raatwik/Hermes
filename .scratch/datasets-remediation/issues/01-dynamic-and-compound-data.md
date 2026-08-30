# 01 — Dynamic Missions & Compound Faults

**What to build:** Updates the dataset generation pipeline to produce training distributions that resolve ML false alarms and masking. First, a new `dynamic_maneuvers.yaml` mission template is added to simulate aggressive, safe transient engine behavior. Second, the pipeline explicitly dispatches a `compound` fault class, modifying the scheduler to guarantee the injection of 2 overlapping faults. This ensures balanced dataset distributions for both transient dynamics and compound fault signatures.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `dynamic_maneuvers.yaml` is created with short, aggressive alternating phases.
- [ ] The mission parser correctly loads `dynamic_maneuvers.yaml` without schema errors.
- [ ] `generate_datasets.py` includes `"compound"` in its bulk `all_classes` list.
- [ ] `FaultScheduler` guarantees a secondary fault injection (100% probability) when explicitly passed `force_fault_class="compound"`.
- [ ] Running the orchestrator successfully generates and exports Parquet files for both the new dynamic missions and the explicitly compounded faults.
