# Handoff — Engine Degradation Trajectory (Issue 03)

## Context

**Repo:** `/home/linuxsextips/Desktop/SIH/DIH` (GitHub: `Raatwik/Hermes`)
**Branch:** `fix/engine-deg-trajectory` — pushed to origin, tracking remote.
**Base branch for PRs:** `main`

Digital Twin + propulsion health monitoring system. Backend: FastAPI + MQTT (Python). Frontend: React + Zustand (Vite).

## Completed Issues

### Issue 01 — Multi-Input EHI (commit `56a6809`)
- Backend sends per-group residual scores (`ehi_components`) via MQTT
- Frontend computes weighted EHI from 6 factors with configurable `EHI_WEIGHTS`
- `EhiBreakdownWidget` on engineer dashboard with per-factor penalty bars

### Issue 02 — Sensor vs Engine Fault Discrimination (commit `cb9469e`)
- Three-way classification: `sensor_fault` / `engine_fault` / `model_drift`
- Uses physical coupling definitions (`PHYSICAL_COUPLINGS` in `ml_subscriber.py`)
- `DivergenceClassificationWidget` with confidence + residual evidence
- Sensor fault suppresses RUL degradation (both backend and frontend)

Full specs: `.scratch/engine-degradation-trajectory/issues/01-*.md` and `02-*.md`

## What's Next (Issue 03 — Model-Driven Degradation Curve)

Full spec: `.scratch/engine-degradation-trajectory/issues/03-model-driven-degradation-curve.md`

Key deliverables:
- `DegradationCauseGraph` must render live severity trajectory from actual fault state (`lambda_f` progression), not hardcoded data
- Support multiple concurrent faults — each as its own trace or composite worst-case
- Severity bands: Healthy (0), Mild (0.25), Moderate (0.50), Severe (0.75), Critical (1.0)
- Live updates at ≤200ms throttle (same as other widgets)
- `FaultProbabilityMatrix` must also reflect live fault state

### Key files to investigate

| Area | File |
|------|------|
| DegradationCauseGraph widget | `frontend/src/components/widgets/DegradationCauseGraph.jsx` |
| FaultProbabilityMatrix widget | `frontend/src/components/widgets/FaultProbabilityMatrix.jsx` |
| Engine simulation (fault model) | `simulation/engine.py` — contains `lambda_f`, fault injection, `TIME_CONSTANTS` |
| Fault manager | `simulation/fault_manager.py` — manages fault scheduling and severity |
| ML predictions pipeline | `integration/ml_subscriber.py` — produces prediction payloads over MQTT |
| Frontend store | `frontend/src/store/useEngineStore.js` — `_applyTelemetry()` consumes WS data |
| Backend gateway | `backend/main.py` — merges telemetry + predictions → WebSocket |

### Architecture notes

- Telemetry flow: Simulation → MQTT (`telemetry/engine`) → `ml_subscriber.py` → MQTT (`telemetry/predictions`) → `backend/main.py` merges both → WebSocket → frontend store
- `simulation/engine.py` has `lambda_f` / fault severity tracking — this is what the degradation curve needs to expose
- The simulation likely publishes `fault_severity`, `fault_class`, or similar fields in telemetry; check `simulation/engine.py` for `get_state()` to see what's available
- `_applyTelemetry()` in `useEngineStore.js` already handles `xgboost_faults` as `faultProbabilities` — Issue 03 needs to also pipe through the severity timeline
- The store already throttles at 200ms via `THROTTLE_MS`
- `RESIDUAL_SENSORS` is defined in both `integration/ml_subscriber.py` and `backend/main.py` — keep in sync

## Remaining issues (04–08)

See `.scratch/engine-degradation-trajectory/issues/` — all `ready-for-agent`.

## Dirty state

- `simulation/scenarios/interactive_attack_scenario.py` has unstaged modifications (pre-existing)
- `.scratch/engine-degradation-trajectory/` directory is untracked

## Suggested skills

- `/implement` — for building Issue 03
- `/code-review` — after implementation
- `/tdd` — for testable seams on the degradation curve data pipeline
