# Handoff — Engine Degradation Trajectory (Issue 05)

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

### Issue 04 — Individual Engine Fingerprinting (commits `a7d241d`, `4dc97c8`)
- `EngineFingerprint` class in `integration/engine_fingerprint.py` — Welford's online mean+variance, persists to JSON under `data/fingerprints/`
- `ml_subscriber.py` integrates fingerprint: updates baseline on each tick, computes z-score residuals, emits via MQTT
- Low fingerprint deviation (< 1.5σ) suppresses physics drift score by 30% (false alarm reduction)
- Relaxed healthy-tick gating: only `engine_fault` classification excluded from baseline collection
- `EngineFingerprintWidget` on engineer dashboard: learning progress bar or per-sensor z-score deviation bars
- `--engine-id` CLI argument on `ml_subscriber.py`
- 12 unit tests in `tests/unit/test_engine_fingerprint.py`

Full specs: `.scratch/engine-degradation-trajectory/issues/01-*.md` through `04-*.md`

### Additional work on branch (commits `f37bd02`, `0c8ea72`, `a012cfb`)
- Dynamic optimization endpoint with trajectory-based forward simulation
- Altitude mitigation strategies for optimization
- Fix for `fault_severities` dict excluded from parquet export

## What's Next (Issue 05 — LSTM-Driven RUL Trajectory)

Full spec: `.scratch/engine-degradation-trajectory/issues/05-lstm-rul-trajectory.md`

Key deliverables:
- RUL prediction uses ProbabilisticLSTM output end-to-end (not simulation countdown timers)
- Frontend shows LSTM's (μ ± 2σ) trajectory over time as a chart
- Simulation timer-based RUL becomes fallback when LSTM model is unavailable
- Blocked by Issue 03 (now complete)

### Key files to investigate

| Area | File |
|------|------|
| ML predictions pipeline | `integration/ml_subscriber.py` — `_run_lstm()` already produces `rul_mean`, `rul_std`; these need to become the primary RUL source |
| Engine simulation | `simulation/engine.py` — `_raw_state()` has timer-based `rul` via `_rul_countdowns`; this becomes the fallback |
| Frontend store | `frontend/src/store/useEngineStore.js` — `_applyTelemetry()` already consumes `lstm_rul_mean`/`lstm_rul_std`; needs RUL timeline accumulation |
| Backend gateway | `backend/main.py` — merges telemetry + predictions → WebSocket; LSTM-based what-if already exists |
| Widget directory | `frontend/src/components/widgets/` — new RUL trajectory chart widget needed |
| Severity utils | `frontend/src/components/widgets/severityUtils.js` — shared severity bands/labels/colors |
| Engineer dashboard | `frontend/src/views/Engineer/EngineerDashboard.jsx` — wire new widget |

### Architecture notes

- Telemetry flow: Simulation → MQTT (`telemetry/engine`) → `ml_subscriber.py` → MQTT (`telemetry/predictions`) → `backend/main.py` merges both → WebSocket → frontend store
- `ml_subscriber.py` `_run_lstm()` already runs the LSTM and scales output by 1000x — RUL trajectory is about accumulating these over time, not running a new model
- The store's `_applyTelemetry()` already handles `degradationTimeline` accumulation pattern — RUL trajectory would follow the same approach
- `missionContext.rul` already prefers `lstm_rul_mean` when available (line ~114 of useEngineStore.js) — the trajectory chart is the new piece
- `RESIDUAL_SENSORS` is defined in both `integration/ml_subscriber.py` and `backend/main.py` — keep in sync
- The what-if endpoint in `backend/main.py` already runs LSTM for forward simulation RUL — coordinate with that

## Remaining issues (06–08)

See `.scratch/engine-degradation-trajectory/issues/` — all `ready-for-agent`.

## Dirty state

- `simulation/scenarios/interactive_attack_scenario.py` has unstaged modifications (pre-existing)
- `.scratch/engine-degradation-trajectory/` directory is untracked
- `.scratch/dynamic-what-if-sandbox/` directory is untracked
- Several untracked handoff/constraint files in repo root
- Branch is ahead of origin by 5 commits (unpushed: `f37bd02`, `0c8ea72`, `a012cfb`, `a7d241d`, `4dc97c8`)

## Suggested skills

- `/implement` — for building Issue 05
- `/code-review` — after implementation
- `/tdd` — for testable seams on the RUL trajectory pipeline (timeline accumulation, LSTM fallback logic, chart data shape)
