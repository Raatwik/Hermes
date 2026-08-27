# Phase 2 — Advanced Data Generation Extensions

Extensions to the Rotax 914 MVEM simulation adding environmental context and derived engine metrics. Both features build on the existing `Simulation` class in `simulation/engine.py` — no new modules were introduced.

## What Was Added

### 1. ISA Environment Model (`get_environment()`)

A new public method deriving standard atmosphere conditions from the drone's current altitude using ISA troposphere formulas.

```python
from simulation.engine import Simulation

sim = Simulation(throttle=0.5, altitude=10000.0)
sim.step(1.0)
env = sim.get_environment()
# {'ambient_temperature': -4.81, 'ambient_pressure': 69.68, 'air_density': 0.904}
```

| Key | Unit | Sea level value | Formula |
|---|---|---|---|
| `ambient_temperature` | °C | 15.0 | `288.15 - 0.0065 * altitude_m` (converted to °C) |
| `ambient_pressure` | kPa | 101.325 | `101325 * (T_K / 288.15)^5.2561` (converted to kPa) |
| `air_density` | kg/m³ | 1.225 | `P / (287.058 * T_K)` |

Valid for the troposphere (altitude <= ~36,089 ft). The MALE-UAV operational ceiling is well within this range.

The environment tracks the simulation's current altitude — if a mission profile is loaded, `get_environment()` reflects the profile-interpolated altitude after each `step()`.

### 2. Dynamic Telemetry Extensions (`engine_load`, `injection_timing`)

Two new keys in the `get_state()` dictionary, computed instantaneously from throttle and RPM with no lag filters.

```python
sim = Simulation(throttle=0.8, altitude=0.0)
for _ in range(200):
    sim.step(0.1)
state = sim.get_state()
print(state["engine_load"])       # ~0.66
print(state["injection_timing"])  # ~31.1
```

| Key | Unit | Range | Formula |
|---|---|---|---|
| `engine_load` | 0.0–1.0 | 0.0 (idle) to 1.0 (full power) | `min(throttle * rpm / 5500, 1.0)` |
| `injection_timing` | degrees BTDC | 24.0–32.0 | `24.0 + 8.0 * (rpm / 5500)` |

## Using in Data Generation

The data generation loop from the main README can be extended to include these new fields:

```python
FIELDS = ["time", "rpm", "cht", "egt", "oil_pressure", "oil_temp",
          "fuel_flow", "battery_voltage", "vibration_index",
          "engine_load", "injection_timing",
          "ambient_temperature", "ambient_pressure", "air_density",
          "mission", "fault_type", "fault_severity"]

# Inside the sampling loop:
state = sim.get_state()            # includes engine_load, injection_timing
env = sim.get_environment()        # ambient_temperature, ambient_pressure, air_density
row = {**state, **env}
row["mission"] = mission["name"]
row["fault_type"] = fault_label
row["fault_severity"] = fault_sev
rows.append(row)
```

## Tests

```bash
pytest tests/unit/test_environment.py tests/unit/test_dynamic_telemetry.py -v
```

| Test file | Tests | Covers |
|---|---|---|
| `test_environment.py` | 6 | Sea-level values, altitude decrease, 10k ft temp, altitude change, profile tracking, key presence |
| `test_dynamic_telemetry.py` | 6 | Key presence, load min/max, load scaling, injection timing type |

## Issue Tracker

Both phase 2 issues are complete:

- `.scratch/simulation/issues/phase2/01-isa-environment-model.md` — done
- `.scratch/simulation/issues/phase2/02-dynamic-telemetry-extensions.md` — done

Spec: `docs/agents/wayfinder/04.1-simulation.md`
