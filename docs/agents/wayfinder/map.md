# Wayfinder Map

## Destination

Deliver a fully functional MVP of the MALE-UAV Digital Twin, complete with the synthetic telemetry generator, baseline ML pipeline, and the operator dashboard, divided across 6 domain-specific roles.

## Notes

- Domain: MALE-UAV aero-piston engines (focusing on a naturally aspirated Rotax 914 baseline).
- The effort relies on a hybrid data/physics approach: building physical simulation, extracting residuals, and applying ML for fault and Remaining Useful Life (RUL) prediction.

## Decisions so far

- [01-researcher.md](01-researcher.md) — Stage advanced PINN-GAT-ODE after baseline XGBoost/LSTM; integrate as secondary AI module consuming physical residuals, not replacing base physics.
- [04-simulation.md](04-simulation.md) — Architecture finalized: empirical maps with lag filters, centralized FaultManager, and a Python API for explicit time-stepping and runtime fault injection.
- [05-datasets.md](05-datasets.md) — Telemetry generation pipeline finalized: YAML mission sequences, exponential fault degradation scheduler, automated RUL labeling, and partitioned Parquet export.
- [.scratch/datasets/issues/01-baseline-pipeline.md](../../../.scratch/datasets/issues/01-baseline-pipeline.md) — Built generate_baseline.py orchestrator script to export partitioned Parquet healthy telemetry.
- [.scratch/datasets/issues/02-fault-scheduler.md](../../../.scratch/datasets/issues/02-fault-scheduler.md) — Implemented dynamic exponential fault scheduler in generate_mission.py.
- [.scratch/datasets/issues/03-rul-labeling.md](../../../.scratch/datasets/issues/03-rul-labeling.md) — Added RUL logic with capping to prevent NaN targets in datasets.
- [.scratch/datasets/issues/04-bulk-orchestrator.md](../../../.scratch/datasets/issues/04-bulk-orchestrator.md) — Added multiprocessing CLI to rapidly generate perfectly balanced datasets.

## Open Tickets (The Frontier)

- [05.1-datasets.md](05.1-datasets.md) — Datasets Phase 2: Operational Bounds, Noise, and Environment
- [02-frontend.md](02-frontend.md) — Frontend: Operator Dashboard MVP
- [03-ml-engineer.md](03-ml-engineer.md) — ML Engineer: Diagnostics & RUL Models (Unblocked)
- [06-integration.md](06-integration.md) — Integration: Real-Time Backend & MQTT (Blocked by 02, 03, 04)

## Not yet specified

- The precise fault severity mappings (e.g., how injector flow coefficient maps to physical wear).
- The exact layout and state management approach for the What-If sandbox in the frontend.
- The deployment architecture for the live backend components (e.g., Dockerization strategy).

## Out of scope

*(None yet)*
