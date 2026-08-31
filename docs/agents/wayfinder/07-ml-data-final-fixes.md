---
labels: ["ready-for-implementation", "datasets", "ml-engineer", "07"]
---

# Spec: 07 Final ML & Datasets Logic Fixes

> [!WARNING]
> **CRITICAL INSTRUCTION FOR IMPLEMENTING AGENT:** 
> Your ONLY task is to implement the code changes described in this document. 
> **DO NOT** run the data generation scripts (`generate_datasets.py`, `generate_mission.py`).
> **DO NOT** run the machine learning training scripts.
> The user will manually handle data generation and model training later. ONLY modify the code.

## Context & Theoretical Validation
The ML models (XGBoost, Isolation Forest, and LSTM) are designed to learn from a universal synthetic dataset and eventually predict real-world anomalies like the Djibouti MQ-1B accident. 

When cross-referencing industry standards for Prognostics and Health Management (PHM) and Remaining Useful Life (RUL) prediction (such as the NASA C-MAPSS turbofan dataset), a core rule is that RUL must linearly degrade to zero **only** at the true point of catastrophic failure. For trajectories that do not reach failure (right-censored data), the RUL must not falsely drop to zero. Furthermore, for multi-label classification tasks (XGBoost), all concurrent fault states must be distinctly preserved in the label matrix.

Testing has revealed lingering bugs violating these principles in how labels are generated for non-fatal faults and compound scenarios. This document outlines the exact, meticulously verified logic changes required to unblock the ML models.

---

## Problem 1: LSTM RUL Contradiction for Non-Fatal Faults
**Module:** `datasets/generate_mission.py`

**The Flaw (Right-Censored Data Contamination):**
Currently, if a fault is injected but is not severe enough to crash the engine (e.g., a minor sensor drift), the simulation successfully runs to `max_time`. However, the RUL logic blindly calculates `effective_end_time - t` (which equates to `max_time - t`). This forces the target RUL to drop to `0` at the end of the simulation, incorrectly teaching the LSTM that perfectly surviving, stable engines spontaneously die at the end of every flight. This contradictory labeling completely ruins LSTM convergence.

**The Solution:**
Only drop the RUL to 0 if the engine actually suffered a catastrophic failure (caught via `EngineFailureException`). If the engine survived the mission, its RUL should remain at `RUL_MAX`.

**Exact Implementation Instructions:**
1. In `run_pipeline`, locate the simulation loop. Initialize an `engine_failed = False` flag before the loop:
```python
    engine_failed = False
    for i in range(1, num_steps + 1):
```

2. Inside the `except EngineFailureException as exc:` block, set `engine_failed = True`:
```python
        except EngineFailureException as exc:
            print(
                f"Engine failure at t={current_time - dt:.1f}s ({exc.reason}); "
                f"terminating mission early"
            )
            effective_end_time = current_time - dt
            engine_failed = True
            break
```

3. Update the `calc_rul(t)` function inside the Post-processing section:
```python
        # Capped at RUL_MAX before injection time
        # Monotonically decreasing after injection time based on max_time - current_time
        # But we ensure it anchors properly.
        def calc_rul(t):
            if t < scheduler.injection_time:
                return RUL_MAX
            else:
                if engine_failed:
                    return min(RUL_MAX, max(0.0, effective_end_time - t))
                else:
                    return RUL_MAX
```

---

## Problem 2: XGBoost Masking Primary Fault in Compound Scenarios
**Module:** `datasets/generate_mission.py`

**The Flaw (Multi-Label Classification Masking):**
When generating compound missions, `FaultScheduler` explicitly sets `self.fault_class = "compound"`. As noted in `ml_pipeline/train_xgboost.py`, this permanently erases the actual name of the primary fault from the dataset. Because XGBoost relies on `fault_class` and `secondary_fault_class` to build its one-hot target matrix, setting the class to the string `"compound"` makes the model completely blind to the primary fault in any compound scenario.

**The Solution:**
Do not overwrite the primary fault name. 

**Exact Implementation Instructions:**
1. In `FaultScheduler.__init__`, locate the `if is_compound:` block. Change `self.fault_class = "compound"` to `self.fault_class = faults[0]`:
```python
        if is_compound:
            self._primary_real_fault = faults[0]
            self.fault_class = faults[0]  # <--- CHANGED FROM "compound"
            self.secondary_fault_class = faults[1]
            self.secondary_injection_time = random.uniform(self.injection_time, self.max_time)
            self._configure_secondary_kwargs()
```

---

## Problem 3: Djibouti Case Misaligned RUL Anchor
**Module:** `simulation/scenarios/djibouti_accident.py`

**The Flaw (Time-of-Death Misalignment):**
The Djibouti accident script is hardcoded to run a simulation loop for 9 hours (`32400` seconds). However, the engine actually seizes at 8.83 hours (`31800` seconds). Because the script keeps logging "dead" telemetry for another 10 minutes, the downstream dataset loader (`ml_pipeline/dataset.py`) anchors the RUL countdown to 9 hours instead of 8.83 hours, shifting all LSTM targets away from the true physical failure point.

**The Solution:**
Truncate the simulation exactly when the engine dies, aligning the final row of the CSV with the true time of death.

**Exact Implementation Instructions:**
1. In `run_scenario()`, locate the `elif t == 31800:` block where the engine seizure is simulated.
2. Add a `break` statement **after** the state is recorded and written to the CSV. The best way is to check if `t >= 31800` at the very end of the loop, right after `writer.writerow(...)`.

```python
            writer.writerow({
                "time_sec": state["time"],
                # ... other fields ...
                "engine_load": round(state["engine_load"], 4)
            })

            # <--- ADD THIS BLOCK --->
            # Terminate simulation immediately after recording the catastrophic seizure.
            # This ensures the dataset's final row perfectly aligns with the time of death,
            # providing a mathematically accurate RUL anchor of 0.
            if t >= 31800:
                break
```
