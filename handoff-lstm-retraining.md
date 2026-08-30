# Handoff: LSTM RUL Retraining

## Context

Working directory: `/home/linuxsextips/Desktop/SIH/DIH`
Branch: `fix/dynamic-training`
Project: UAV engine simulation with ML fault-detection pipeline.

## What just happened

Issues `01-multi-label-xgboost` and `02-tightened-isolation-forest` from the `03.3-ml-remediation` spec are both **complete and committed**. The working tree is clean. All 85 tests collected, 84 pass (1 pre-existing flaky failure in `tests/unit/test_sensor_noise.py::test_metadata_columns_exported` — engine terminates early due to vibration threshold, unrelated to ML work).

Key commits on `fix/dynamic-training`:
- `7916628` — XGBoost multi-label migration + Isolation Forest healthy-only training + tests
- `ea19c8c` — Updated issue tracker and wayfinder to reflect issues 01 & 02 as done

## What the next session should focus on

Implement issue `03-lstm-retraining-execution`. The spec is at:
`.scratch/ml-remediation/issues/03-lstm-retraining-execution.md`

Three checklist items:
1. `train_lstm_rul.py` is successfully executed against the new parquet dataset partition.
2. No shape mismatch or NaN errors are thrown during training on the variable-length sequences.
3. The updated `.pt` model weights are saved successfully to the models directory.

The parent spec at `docs/agents/wayfinder/03.3-ml-remediation.md` provides full context (user story 5, testing seam 3).

Key files to read first:
- `ml_pipeline/train_lstm_rul.py` — current LSTM training script
- `tests/unit/test_ml_lstm_overfitting.py` — existing LSTM test (micro-epoch overfitting check)
- `ml_pipeline/train_xgboost.py` — reference for `load_data()` (shared data loader)
- `tests/unit/conftest.py` — shared `make_test_mission` helper

The core issue: the LSTM was trained on non-terminating datasets, making it act as a static countdown timer. The simulation engine now raises `EngineFailureException` on catastrophic faults (RPM < 1000, CHT > 250°C, etc.), and `run_pipeline` anchors RUL to the true moment of engine death. The LSTM just needs to be retrained on these physically-terminating datasets so it learns dynamic degradation curves.

## Known constraints

- The user has asked **not to use git commands** for committing. Do not commit unless explicitly asked.
- `docs/RULES.md` documents agent operating rules (atomic commits, conventional commits, consult docs first).
- Shared test helper `make_test_mission` is available at `tests/unit/conftest.py`.
- The full test suite (85 tests collected) should pass at the end: `python -m pytest tests/ -v`
- 1 pre-existing failure in `test_sensor_noise.py::test_metadata_columns_exported` is known and unrelated.
- After implementation, update `.scratch/ml-remediation/issues/03-lstm-retraining-execution.md` status and checklist.
- After all three issues are done, update `docs/agents/issue-tracker.md` and `docs/agents/wayfinder/map.md` to move 03.3 to completed.

## Suggested skills

- `/implement` — to implement the issue spec
- `/code-review` — to review the work after implementation
- `/tdd` — if the next agent wants to write tests first
