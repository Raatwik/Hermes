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

## Open Tickets (The Frontier)

- [02-frontend.md](02-frontend.md) — Frontend: Operator Dashboard MVP
- [06-integration.md](06-integration.md) — Integration: Real-Time Backend & MQTT (Blocked by 02, 04)

## Not yet specified

- The precise fault severity mappings (e.g., how injector flow coefficient maps to physical wear).
- The exact layout and state management approach for the What-If sandbox in the frontend.
- The deployment architecture for the live backend components (e.g., Dockerization strategy).

## Out of scope

*(None yet)*
