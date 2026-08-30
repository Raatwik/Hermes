# Handoff — Implement Simulation Issue 02 (Comprehensive Thermal & Mechanical Thresholds)

## Task for next session

Implement `.scratch/simulation/issues/02-comprehensive-thresholds.md` on branch
`fix/dynamic-training`. It extends the engine-failure mechanism from Issue 01
(just completed, commit `30de91e`) to four more catastrophic limits:

- CHT > 250 °C
- Oil Pressure < 20 psi
- EGT > 900 °C (base `egt` **or** any of `egt_1`..`egt_4`)
- Vibration Index > 0.9

Broader design context: `docs/agents/wayfinder/04.3-simulation-remediation.md`
(the full remediation spec — Issue 02 covers its User Stories 2–5).

## What Issue 01 already built (don't redo)

See commit `30de91e` diff. Key pieces in `simulation/engine.py`:

- `EngineFailureException` + `Simulation.is_alive` / `.failure_reason` properties.
- `step()` raises `EngineFailureException` when a dead state is latched.
- `_update_liveness()` — called at end of `step()`, currently only checks the
  RPM stall (gated on `_has_run` latch + `throttle > STALL_THROTTLE_FLOOR`).
  **This is the method to extend.** Add the four absolute checks here — they
  need no gating (healthy telemetry never approaches them).
- `_raw_state()` — noise-free state dict; `_update_liveness` must keep using
  this (not `get_state()`) so checks stay deterministic.
- `datasets/generate_mission.py` `run_pipeline` already catches the exception,
  breaks early, and anchors RUL to `effective_end_time`. No pipeline change
  needed unless a test demands it.

## Critical constraint discovered in Issue 01

Adding `EGT > 900` naively **breaks an existing passing test**:
`tests/unit/test_advanced_faults.py::TestVibrationIndex::test_bounded_zero_to_one`
injects `misfire` severity 1.0 at throttle 1.0, which drives base EGT to ~930
and steps for 50 s — it would now raise `EngineFailureException`.

Options for the next agent (decide + note in commit):
1. Lower that test's severity / throttle, or adjust its intent (it only cares
   about vibration bounding, not EGT).
2. Re-scope the EGT threshold (spec says 900; don't change lightly).
Recommend option 1 — the test's fault scenario is genuinely catastrophic and
early termination there is arguably correct behaviour.

Also re-check `tests/unit/test_cylinder_faults.py::test_cylinder_failure_fault`
(throttle 0.8, `cylinder_failure` sev 1.0): vibration reaches ~0.85 — close to
the 0.9 limit. Verify it stays under after your change; adjust if it trips.

## Approach

Use `/tdd`. Add tests to a new `tests/unit/test_engine_failure.py` section (file
already exists from Issue 01) or extend it:
- Simulation-level: manually `inject_fault` at severity 1.0 (e.g.
  `cooling_degradation` for CHT, `lubrication_issues` for oil pressure,
  `injector_abnormalities`/`misfire` for EGT, `misfire`+`cylinder_failure` for
  vibration), step until `not sim.is_alive`, assert the breached value.
- Consider adding named constants (`CHT_LIMIT`, `OIL_PRESSURE_LIMIT`,
  `EGT_LIMIT`, `VIBRATION_LIMIT`) mirroring the existing `RPM_STALL_THRESHOLD`.

Fault → telemetry mapping is in `simulation/fault_manager.py::get_modifiers`.

## Verification

- `python -m pytest -q --ignore=tests/unit/test_ml_xgboost.py --ignore=tests/unit/test_ml_isolation_forest.py`
  (those two error at collection on a **pre-existing** missing `xgboost` dep —
  not your problem). Baseline before Issue 01 work: 74 passed.
- No typechecker configured (no mypy/ruff/pyright).
- Optional smoke: `python -m datasets.generate_datasets --out <scratch>/ds --num_missions 7 --workers 2`.

## Wrap-up

- Mark checkboxes in `.scratch/simulation/issues/02-comprehensive-thresholds.md`
  and set status to done (pattern: see Issue 01 file).
- Run `/code-review` (args: `since main` — but note branch already carries much
  unrelated drift from `main`; review `git diff HEAD` of your own files).
- Commit to `fix/dynamic-training` with the standard footer lines.

## Suggested skills

- `tdd` — build the threshold checks test-first.
- `code-review` — review before committing.
