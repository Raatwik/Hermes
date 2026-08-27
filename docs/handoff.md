# Handoff — Simulation Data Generation Readiness Check

**Date:** 2026-08-27
**Branch:** `feature/simulation-foundation`
**Repo:** `~/Desktop/SIH/DIH`

## Context

This project is **Hermes**, a Digital Twin for a Rotax 914 aero-piston engine on a MALE-UAV. The simulation module generates synthetic telemetry for training ML models (fault classification, RUL prediction).

This session implemented all four simulation issues (01–04) on the `feature/simulation-foundation` branch. The user's next focus is **verifying that all parameters needed for synthetic data generation are covered**.

## What Was Built (all committed except last README update + run_demo.py)

| Issue | Commit | What |
|---|---|---|
| 01 — Core Physics | `fd4d2ea` | `Simulation`, `LagFilter`, empirical steady-state maps, `step(dt)`, `get_state()` |
| 02 — Mission Profiles | `99831d9` | `load_profile()`, time-interpolated throttle/altitude from setpoints |
| 03 — Fault Manager | `28aa803` | `FaultManager`, `inject_fault()`, `clear_faults()`, sensor_drift, cooling_degradation |
| 04 — Advanced Faults | `24657e6` | misfire, injector_abnormalities, lubrication_issues, vibration_index |

**Uncommitted:** Updated `simulation/README.md` (expanded with synthetic data generation guide) and new `run_demo.py`.

**Tests:** 38 passing — `pytest tests/unit/`

## Key Files

- `simulation/engine.py` — `Simulation` class, all API methods, empirical maps
- `simulation/lag_filter.py` — first-order exponential lag filter
- `simulation/fault_manager.py` — fault registry and modifier computation
- `simulation/README.md` — full docs including synthetic data generation walkthrough
- `run_demo.py` — cross-platform demo script
- `tests/unit/test_core_physics.py` — 9 tests (baseline, transient, lag filter)
- `tests/unit/test_mission_profiles.py` — 8 tests (profile loading, interpolation, full mission)
- `tests/unit/test_fault_manager.py` — 11 tests (sensor drift, cooling degradation, API)
- `tests/unit/test_advanced_faults.py` — 10 tests (misfire, injector, lubrication, vibration)

## Current Telemetry Parameters

`get_state()` returns these keys:

| Parameter | Unit | Source |
|---|---|---|
| `time` | seconds | sim clock |
| `rpm` | RPM | empirical map + lag filter |
| `cht` | °C | empirical map + lag filter |
| `egt` | °C | empirical map + lag filter |
| `oil_pressure` | psi | empirical map + lag filter |
| `oil_temp` | °C | empirical map + lag filter |
| `fuel_flow` | L/hr | empirical map + lag filter |
| `battery_voltage` | V | empirical map + lag filter |
| `vibration_index` | 0.0–1.0 | derived from RPM + fault severity |

## What the Next Session Should Check

The user wants to verify **all parameters are met for data generation**. Specifically:

### Parameters present and working
- All 9 telemetry channels above ✓
- 5 fault types with severity control ✓
- Mission profile loading with time interpolation ✓
- Fault injection at arbitrary times during a run ✓
- Multiple simultaneous faults ✓
- CSV export pattern documented in README ✓

### Potential gaps to investigate
1. **Ambient temperature** — the spec (`04-simulation.md`) mentions mission profiles with "throttle, altitude, ambient temperature" but the current implementation only interpolates throttle and altitude. The steady-state maps don't use ambient temp as an input axis. Decide: is this needed for data gen, or is altitude-based density sufficient?
2. **Determinism / random seed** — the spec requires the simulation be "fully deterministic" given the same inputs. Currently it IS deterministic (no randomness anywhere), but there's no noise model. If the ML team needs sensor noise, a seeded RNG will need to be added.
3. **Injection timing metadata** — the README's data gen guide shows labeling rows with fault_type and severity, but doesn't emit the exact injection timestamp as a column. RUL models may need `time_since_fault_injection` or `time_to_failure` as targets.
4. **Parquet output** — the tech stack doc (`docs/agents/tech-stack.md`) lists "Parquet/CSV (Offline Training)" as the data format. Current guide only shows CSV. Parquet export may be needed for larger datasets.
5. **Profile from YAML/JSON files** — `load_profile` takes a dict. The spec mentions "parsed from JSON or YAML". A file-loading convenience (reading from disk) isn't implemented yet — the user builds the dict in Python. May or may not matter.

## Specs & Domain Docs

- `.scratch/simulation/issues/01-core-physics.md` through `04-advanced-faults.md`
- `docs/agents/wayfinder/04-simulation.md` — full problem statement, user stories, implementation decisions
- `docs/agents/domain.md` — ubiquitous language and module boundaries
- `docs/agents/tech-stack.md` — approved stack and anti-patterns

## Suggested Skills

- `/grilling` — to interrogate whether the current parameter set is complete for downstream ML/dataset consumers
- `/implement` — if gaps are found and need to be built (e.g., ambient temp axis, noise model, Parquet export)
- `/tdd` — for any new features added to close gaps
