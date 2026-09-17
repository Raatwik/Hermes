# Handoff: Implement Issue 03 — Throttle Mitigation Strategy

## What the next session should do

Implement `.scratch/dynamic-what-if-sandbox/issues/03-throttle-mitigation-strategy.md` — adding a throttle reduction strategy (0.9x multiplier) to the optimization endpoint built in issues 01–02.

## Current state

- **Branch:** `fix/engine-deg-trajectory`
- **Last commit:** `0c8ea72` — `feat: altitude mitigation strategies (-500ft, -1000ft) for optimization endpoint`
- **Issues 01 and 02 are complete and committed.** The endpoint currently returns 3 strategies (Maintain Profile, Drop 500ft, Drop 1000ft). All 19 optimize tests pass.

## Architecture (what issues 01–02 built)

### Backend (`backend/main.py`)

- `POST /api/optimize` accepts `{ current_time: float, current_state: dict | null }`.
- Returns a JSON **array** of strategy options. Currently returns three: "Maintain Profile", "Drop 500ft", "Drop 1000ft".
- Key functions:
  - `_extract_future_trajectory(df, current_time, horizon_s)` — slices the Djibouti dataset into trajectory dicts.
  - `_apply_altitude_offset(trajectory, offset)` — applies altitude offset per-step with `max(0.0, ...)` floor. **This is the pattern to follow for throttle.**
  - `_run_optimization_simulation(trajectory, current_state)` — steps the `Simulation` engine through a trajectory.
  - `_evaluate_strategy(current_time, current_state, altitude_offset, action, description)` — general strategy evaluator. **This function needs a `throttle_mult` parameter added.**
  - `_evaluate_maintain_profile(current_time, current_state)` — thin wrapper calling `_evaluate_strategy` with offset=0.
  - `ALTITUDE_STRATEGIES` — list of `{offset, action, description}` dicts.
  - `_evaluate_all_strategies(current_time, current_state)` — builds the full list; loops over `ALTITUDE_STRATEGIES`. **This is the function to extend** with the throttle strategy.
- The endpoint handler (`optimize_endpoint`, line ~438) calls `_evaluate_all_strategies` and returns the result directly.

### Frontend

- No changes needed — the UI already renders arrays of arbitrary length with Risk and RUL Impact.

### Tests (`tests/test_optimize.py`)

- 19 tests in three classes: `TestOptimizeEndpoint` (7), `TestOptimizeSimulationUnit` (4), `TestAltitudeStrategies` (8).
- Uses `mock_scenario` fixture that patches `_get_scenario_data` with a synthetic DataFrame (310 rows, constant throttle=0.7, altitude=10000).
- Test app mirrors the real endpoint via `_evaluate_all_strategies`.

## What issue 03 requires (from the spec)

1. The backend optimization endpoint evaluates an additional candidate strategy: reducing throttle by 10%.
2. The backend simulation logic correctly applies a 0.9x multiplier to the throttle value step-by-step across the future trajectory sequence.
3. The frontend UI automatically renders this throttle reduction option.
4. The returned option correctly reflects a distinct Risk and RUL calculation compared to the baseline and altitude mitigation strategies.

## Suggested implementation approach

1. **Add `_apply_throttle_multiplier(trajectory, multiplier)`** — analogous to `_apply_altitude_offset`. Apply `step["throttle"] * multiplier` per-step. Throttle should be clamped to `[0.0, 1.0]`.
2. **Extend `_evaluate_strategy`** — add a `throttle_mult: float = 1.0` parameter. After `_apply_altitude_offset`, call `_apply_throttle_multiplier`. Update `sim_params` to include `throttleMultiplier` when != 1.0.
3. **Add the throttle strategy** — either as a standalone entry or appended to a combined strategies list in `_evaluate_all_strategies`.
4. **Update `_evaluate_all_strategies`** to return 4 strategies total.
5. **Update existing tests** — `len(data) == 3` assertions become `len(data) == 4`, action list assertions gain "Reduce Throttle 10%".
6. **Add new tests** — throttle multiplier unit tests (identity at 1.0, correct multiplication, clamping), endpoint schema for the new strategy, `simParams` contains `throttleMultiplier`.

## Code review findings to keep in mind

- `_evaluate_maintain_profile` is a thin Middle Man wrapper — acceptable for backward compat but don't add another one for throttle. Just add the throttle strategy to the data/loop pattern.
- The `(offset, action, description)` data clump was noted — issue 03 may be the right time to unify altitude and throttle strategies into a single list with a shared shape, or keep them separate if the structure diverges (throttle uses a multiplier, altitude uses an offset).

## Files to read first

| File | Why |
|------|-----|
| `.scratch/dynamic-what-if-sandbox/issues/03-throttle-mitigation-strategy.md` | The spec |
| `backend/main.py` (lines ~214–308) | Optimization functions to extend |
| `tests/test_optimize.py` | Test patterns to follow |

## Suggested skills

- `/implement` with `@.scratch/dynamic-what-if-sandbox/issues/03-throttle-mitigation-strategy.md`
- `/code-review` after implementation
