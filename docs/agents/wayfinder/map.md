# Wayfinder Map

## Destination

Deliver a fully functional MVP of the MALE-UAV Digital Twin, complete with the synthetic telemetry generator, baseline ML pipeline, and the operator dashboard, divided across 6 domain-specific roles.

## Notes

- Domain: MALE-UAV aero-piston engines (focusing on a naturally aspirated Rotax 914 baseline).
- The effort relies on a hybrid data/physics approach: building physical simulation, extracting residuals, and applying ML for fault and Remaining Useful Life (RUL) prediction.

## Decisions so far

- [01-researcher.md](01-researcher.md) — Stage advanced PINN-GAT-ODE after baseline XGBoost/LSTM; integrate as secondary AI module consuming physical residuals, not replacing base physics.
- [04-simulation.md](04-simulation.md) — Architecture finalized: empirical maps with lag filters, centralized FaultManager, and a Python API for explicit time-stepping and runtime fault injection.
- [04.1-simulation.md](04.1-simulation.md) — Phase 2 completed: added ISA atmosphere environment model and dynamic telemetry parameters (`engine_load`, `injection_timing`).
- [05-datasets.md](05-datasets.md) — Telemetry generation pipeline finalized: YAML mission sequences, exponential fault degradation scheduler, automated RUL labeling, and partitioned Parquet export.
- [.scratch/datasets/issues/01-baseline-pipeline.md](../../../.scratch/datasets/issues/01-baseline-pipeline.md) — Built generate_baseline.py orchestrator script to export partitioned Parquet healthy telemetry.
- [.scratch/datasets/issues/02-fault-scheduler.md](../../../.scratch/datasets/issues/02-fault-scheduler.md) — Implemented dynamic exponential fault scheduler in generate_mission.py.
- [.scratch/datasets/issues/03-rul-labeling.md](../../../.scratch/datasets/issues/03-rul-labeling.md) — Added RUL logic with capping to prevent NaN targets in datasets.
- [.scratch/datasets/issues/04-bulk-orchestrator.md](../../../.scratch/datasets/issues/04-bulk-orchestrator.md) — Added multiprocessing CLI to rapidly generate perfectly balanced datasets.
- [05.1-datasets.md](05.1-datasets.md) — Datasets Phase 2: Operational Bounds, Noise, and Environment completed.
- [.scratch/datasets/issues/phase 2/05-sensor-noise.md](../../../.scratch/datasets/issues/phase 2/05-sensor-noise.md) — Added sensor noise to simulation and `time_since_fault_injection` metadata.
- [.scratch/datasets/issues/phase 2/06-weather-bounds.md](../../../.scratch/datasets/issues/phase 2/06-weather-bounds.md) — Enabled `ambient_temp_offset` and bounds sampling `[min, max]` for mission configurations.
- [.scratch/datasets/issues/phase 2/07-base-missions.md](../../../.scratch/datasets/issues/phase 2/07-base-missions.md) — Created `takeoff_cruise.yaml` & `loiter.yaml` and refactored bulk generator to use them.
- [03-ml-engineer.md](03-ml-engineer.md) — ML pipeline Stage 1 completed: scripts written for residual generation, feature engineering, and training XGBoost/Isolation Forest.
- [03.1-ml-engineer-stage-2.md](03.1-ml-engineer-stage-2.md) — ML Stage 2 completed: implemented probabilistic LSTM for RUL prediction using PyTorch, optimized via Negative Log-Likelihood.
- [03.2-ml-training-guide.md](03.2-ml-training-guide.md) — ML Training Execution Guide: documented step-by-step commands, time estimates, default hyperparams, and RAM limits for offline model training.

- [04.2-simulation-cylinder-faults.md](04.2-simulation-cylinder-faults.md) — Simulation Phase 3 completed: added individual cylinder EGTs and windmilling.
- [05.3-datasets-cascading-faults.md](05.3-datasets-cascading-faults.md) — Datasets Phase 3 completed: cascading secondary faults and updated ML schema generation.

- [04.3-simulation-remediation.md](04.3-simulation-remediation.md) — Simulation Remediation completed: added `EngineFailureException` with physical failure thresholds (RPM < 1000, CHT > 250°C, Oil Pressure < 20 psi, EGT > 900°C, Vibration > 0.9) that terminate simulations early, and `run_pipeline` catches the exception to anchor RUL to the true moment of engine death.
- [05.4-datasets-remediation.md](05.4-datasets-remediation.md) — Datasets Remediation completed: added `dynamic_maneuvers.yaml` with 9 short aggressive alternating phases for transient training data, added `"compound"` to `all_classes` in the bulk orchestrator, and updated `FaultScheduler` to guarantee 2 overlapping fault injections (100% probability) when `force_fault_class="compound"`.
- [03.3-ml-remediation.md](03.3-ml-remediation.md) — ML Remediation completed: XGBoost migrated to `MultiOutputClassifier`, Isolation Forest tightened to healthy-only training, LSTM retrained on physically-terminating datasets with `TelemetryDataset` using pre-computed `Remaining_Useful_Life` column.
- [07-ml-data-final-fixes.md](07-ml-data-final-fixes.md) — Final Logic Fixes completed: fixed right-censored RUL contamination for LSTM, prevented primary fault masking in compound scenarios for XGBoost, and aligned Djibouti scenario RUL anchor with exact engine seizure time.
- [02-frontend.md](02-frontend.md) — Frontend: Operator Dashboard MVP completed: Vite-based React application created and fully configured by user.

## Open Tickets (The Frontier)

- [06-integration.md](06-integration.md) — Integration: Real-Time Backend & MQTT (Issues 01–06 COMPLETE)
  - [.scratch/integration/issues/01-mqtt-broker-sim-playback.md](../../../.scratch/integration/issues/01-mqtt-broker-sim-playback.md) — DONE: Embedded MQTT broker (`integration/broker.py`) and simulation publisher (`integration/sim_publisher.py`) with adjustable speed playback of `djibouti_aligned.parquet`.
  - [.scratch/integration/issues/05-dynamic-ehi.md](../../../.scratch/integration/issues/05-dynamic-ehi.md) — DONE: Dynamic EHI computed from `twin_drift_score` in `useEngineStore.js`.
  - [.scratch/integration/issues/06-dynamic-physics-baselines.md](../../../.scratch/integration/issues/06-dynamic-physics-baselines.md) — DONE: ML subscriber broadcasts dynamic `expected_*` baselines; frontend consumes them, eliminating false CRITICAL alarms.
- [06.1-integration-ehi-fix.md](06.1-integration-ehi-fix.md) — Integration: EHI & Dashboard Critical Status Fix (COMPLETE)

## Not yet specified

- The precise fault severity mappings (e.g., how injector flow coefficient maps to physical wear).
- The exact layout and state management approach for the What-If sandbox in the frontend.
- The deployment architecture for the live backend components (e.g., Dockerization strategy).

## Out of scope

*(None yet)*
