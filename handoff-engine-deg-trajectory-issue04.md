# Handoff — Engine Degradation Trajectory (Issue 04)

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

### Issue 03 — Model-Driven Degradation Curve (commits `596eb9b`, `85871aa`)
- `FaultManager.get_active_faults()` exposes fault types with unique keys + severity
- `engine.py` `get_state()` includes `fault_severities` dict in telemetry
- `useEngineStore.js` accumulates `degradationTimeline` (capped at 200 points, 200ms throttle)
- `DegradationCauseGraph` renders live per-fault traces + worst-case overlay + 5 severity bands
- `FaultProbabilityMatrix` shows live λ severity alongside XGBoost probability
- Shared `severityUtils.js` for band definitions, labels, colors
- `sensor_drift` severity derived from offset magnitude; duplicate fault types get unique keys (e.g. `sensor_drift_egt`, `cylinder_failure_cyl3`)

Full specs: `.scratch/engine-degradation-trajectory/issues/01-*.md`, `02-*.md`, and `03-*.md`

### Additional work on branch (commits `f37bd02`, `0c8ea72`, `a012cfb`)
- Dynamic optimization endpoint with trajectory-based forward simulation
- Altitude mitigation strategies for optimization
- Fix for `fault_severities` dict excluded from parquet export

## What's Next (Issue 04 — Individual Engine Fingerprinting)

Full spec: `.scratch/engine-degradation-trajectory/issues/04-engine-fingerprinting.md`

Key deliverables:
- Build per-engine normal baseline from healthy-operation telemetry (mean + variance per parameter)
- Fingerprint persists across sessions (stored to disk or database)
- Residual analysis produces both physics-model residuals and fingerprint residuals
- Dashboard shows fingerprint deviation as a separate indicator from DT drift
- New/unknown engines run in "learning" mode until sufficient baseline is collected

### Key files to investigate

| Area | File |
|------|------|
| ML predictions pipeline | `integration/ml_subscriber.py` — produces residuals, computes drift score; this is where fingerprint residuals should be added |
| Engine simulation | `simulation/engine.py` — `get_state()` returns telemetry including `fault_severities` |
| Frontend store | `frontend/src/store/useEngineStore.js` — `_applyTelemetry()` consumes WS data; now also has `simulationTime`, `degradationTimeline` |
| Severity utils | `frontend/src/components/widgets/severityUtils.js` — shared severity bands/labels/colors |
| Backend gateway | `backend/main.py` — merges telemetry + predictions → WebSocket |
| Widget directory | `frontend/src/components/widgets/` — all dashboard widgets |

### Architecture notes

- Telemetry flow: Simulation → MQTT (`telemetry/engine`) → `ml_subscriber.py` → MQTT (`telemetry/predictions`) → `backend/main.py` merges both → WebSocket → frontend store
- `ml_subscriber.py` already computes per-sensor residuals in `_process_tick()` and drift scores in `_compute_drift_score()` — fingerprint baseline could extend this
- The store's `_applyTelemetry()` already handles `degradationTimeline`, `divergenceClassification`, `ehiContributions` — fingerprint deviation would follow the same pattern
- `RESIDUAL_SENSORS` is defined in both `integration/ml_subscriber.py` and `backend/main.py` — keep in sync
- Fingerprint persistence needs a storage decision: a JSON file per engine ID, or a lightweight DB (sqlite). The spec says "stored to disk or database"

## Remaining issues (05–08)

See `.scratch/engine-degradation-trajectory/issues/` — all `ready-for-agent`.

## Dirty state

- `simulation/scenarios/interactive_attack_scenario.py` has unstaged modifications (pre-existing)
- `.scratch/engine-degradation-trajectory/` directory is untracked
- `.scratch/dynamic-what-if-sandbox/` directory is untracked
- Several untracked handoff/constraint files in repo root

## Suggested skills

- `/implement` — for building Issue 04
- `/code-review` — after implementation
- `/tdd` — for testable seams on the fingerprint data pipeline (baseline collection, residual computation, persistence layer)
