# Simulation — Rotax 914 MVEM Engine

Mean-Value Engine Model generating synthetic telemetry for a naturally aspirated Rotax 914. Uses empirical lookup maps and first-order lag filters — no CFD, no ODEs.

## Setup

Requires Python 3.10+. From the project root (`DIH/`):

```bash
pip install pytest   # only needed for tests
```

## Quick Run

```bash
python run_demo.py
```

Runs four demos (baseline, transient, mission profile, all faults) and prints telemetry to stdout.

## Files

| File | What it does |
|---|---|
| `engine.py` | `Simulation` class — the only thing you import |
| `lag_filter.py` | Exponential moving average for smooth transients |
| `fault_manager.py` | Stores active faults, computes modifiers per step |

## API

```python
from simulation.engine import Simulation

sim = Simulation(throttle=0.5, altitude=0.0)  # throttle: 0.0–1.0, altitude: ft
sim.step(dt=0.1)                               # advance by dt seconds
sim.get_state()                                # returns telemetry dict (see below)
sim.get_environment()                          # returns ISA atmosphere dict
sim.set_throttle(0.8)                          # manual override (clears profile)
sim.set_altitude(5000.0)                       # manual override (clears profile)
sim.load_profile(profile_dict)                 # auto-interpolates throttle/altitude
sim.inject_fault("misfire", severity=0.5)      # inject a fault
sim.clear_faults()                             # remove all faults
```

## Telemetry Output

`get_state()` returns:

| Key | Unit | Typical range (healthy, 50% throttle) |
|---|---|---|
| `time` | seconds | — |
| `rpm` | RPM | 3400 |
| `cht` | °C | 164 |
| `egt` | °C | 620 |
| `oil_pressure` | psi | 65 |
| `oil_temp` | °C | 95 |
| `fuel_flow` | L/hr | 20 |
| `battery_voltage` | V | 13.6 |
| `vibration_index` | 0.0–1.0 | 0.04 |
| `engine_load` | 0.0–1.0 | 0.31 |
| `injection_timing` | degrees BTDC | 28.9 |

### Environment Output

`get_environment()` returns ISA atmosphere conditions derived from the current altitude:

| Key | Unit | Sea level value |
|---|---|---|
| `ambient_temperature` | °C | 15.0 |
| `ambient_pressure` | kPa | 101.3 |
| `air_density` | kg/m³ | 1.225 |

## Mission Profiles

Dict with a `"setpoints"` list. Each setpoint needs `time`, `throttle`, `altitude`. The sim interpolates linearly between them and holds the last value past the end.

```python
sim.load_profile({"setpoints": [
    {"time": 0,   "throttle": 0.3, "altitude": 0},
    {"time": 300, "throttle": 0.8, "altitude": 8000},
    {"time": 600, "throttle": 0.4, "altitude": 2000},
]})
```

Calling `set_throttle()` or `set_altitude()` clears the profile.

## Faults

| Fault type | Parameters | Effect |
|---|---|---|
| `sensor_drift` | `sensor` (str), `offset` (float) | Shifts one sensor's output reading |
| `cooling_degradation` | `severity` (0.0–1.0) | CHT and oil temp targets rise |
| `misfire` | `severity` (0.0–1.0) | RPM drops, EGT rises, vibration spikes |
| `injector_abnormalities` | `severity` (0.0–1.0) | Fuel flow drops, EGT rises |
| `lubrication_issues` | `severity` (0.0–1.0) | Oil pressure drops, oil temp rises |

Multiple faults can be active simultaneously. `clear_faults()` removes all.

## Generating Synthetic Data

The primary purpose of this simulator is to produce labeled training datasets for ML models (fault classification, RUL prediction). The workflow is: define missions, run them healthy, run them again with faults injected, collect the telemetry, label it, and export.

### Step 1: Define mission profiles

Create varied profiles representing real operational scenarios — takeoff, cruise, descent, loiter. Vary throttle curves and altitudes to cover the operating envelope.

```python
missions = [
    {"name": "cruise_5k", "setpoints": [
        {"time": 0,    "throttle": 0.4, "altitude": 0},
        {"time": 120,  "throttle": 0.7, "altitude": 5000},
        {"time": 600,  "throttle": 0.7, "altitude": 5000},
        {"time": 720,  "throttle": 0.3, "altitude": 0},
    ]},
    {"name": "high_alt_patrol", "setpoints": [
        {"time": 0,    "throttle": 0.5, "altitude": 0},
        {"time": 180,  "throttle": 0.9, "altitude": 9000},
        {"time": 900,  "throttle": 0.6, "altitude": 9000},
        {"time": 1080, "throttle": 0.3, "altitude": 0},
    ]},
]
```

### Step 2: Define fault scenarios

Each scenario is a fault type, its parameters, and when to inject it (in seconds from mission start). Use `None` for healthy baselines.

```python
fault_scenarios = [
    None,                                                        # healthy baseline
    ("misfire", {"severity": 0.3}, 300),                         # mild misfire at 5min
    ("misfire", {"severity": 0.7}, 300),                         # severe misfire at 5min
    ("cooling_degradation", {"severity": 0.4}, 200),
    ("injector_abnormalities", {"severity": 0.5}, 250),
    ("lubrication_issues", {"severity": 0.6}, 200),
    ("sensor_drift", {"sensor": "cht", "offset": 10.0}, 100),   # gradual sensor bias
]
```

### Step 3: Run the generation loop

For each mission × fault combination, run the sim and collect timestamped rows.

```python
import csv
from simulation.engine import Simulation

DT = 0.1
FIELDS = ["time", "rpm", "cht", "egt", "oil_pressure", "oil_temp",
          "fuel_flow", "battery_voltage", "vibration_index",
          "engine_load", "injection_timing",
          "ambient_temperature", "ambient_pressure", "air_density",
          "mission", "fault_type", "fault_severity"]

rows = []

for mission in missions:
    for scenario in fault_scenarios:
        sim = Simulation()
        sim.load_profile(mission)

        # Determine total mission duration from last setpoint
        duration = mission["setpoints"][-1]["time"]
        fault_injected = False

        # Label for this run
        if scenario is None:
            fault_label, fault_sev = "healthy", 0.0
        else:
            fault_label = scenario[0]
            fault_sev = scenario[1].get("severity", scenario[1].get("offset", 0.0))
            inject_time = scenario[2]

        steps = int(duration / DT)
        for i in range(1, steps + 1):
            # Inject fault at the right time
            if scenario and not fault_injected and sim.get_state()["time"] >= inject_time:
                sim.inject_fault(scenario[0], **scenario[1])
                fault_injected = True

            sim.step(dt=DT)

            # Sample every 1 second (every 10 steps at dt=0.1)
            if i % 10 == 0:
                state = sim.get_state()
                env = sim.get_environment()
                row = {**state, **env}
                row["mission"] = mission["name"]
                row["fault_type"] = fault_label
                row["fault_severity"] = fault_sev
                rows.append(row)

# Write to CSV
with open("synthetic_telemetry.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerows(rows)

print(f"Generated {len(rows)} rows -> synthetic_telemetry.csv")
```

### Step 4: Scale it up

To build a full training dataset:

- **Vary severity** — sweep severity from 0.1 to 1.0 in 0.1 increments per fault type.
- **Vary injection time** — inject early, mid-mission, and late to capture different degradation windows.
- **Stack faults** — call `inject_fault` multiple times to simulate compound failures (e.g., misfire + lubrication issues).
- **Vary missions** — create 10–20 distinct profiles with different throttle/altitude curves.
- **Sample rate** — adjust the `if i % N` sampling interval: every step (0.1s) for high-res data, every 10 steps (1s) for standard, every 100 steps (10s) for compressed datasets.

A typical dataset structure for ML training:

| Rows per run | Missions | Fault combos | Total rows |
|---|---|---|---|
| 720 (12min @ 1Hz) | 15 | 30 (5 types × 6 severities) | ~330,000 |
| + 15 healthy baselines | | | +10,800 |

### Output format

The CSV columns map directly to ML input features:

```
time,rpm,cht,egt,oil_pressure,oil_temp,fuel_flow,battery_voltage,vibration_index,engine_load,injection_timing,ambient_temperature,ambient_pressure,air_density,mission,fault_type,fault_severity
1.0,2440.3,132.1,498.2,50.1,78.3,12.0,13.0,0.036,0.177,27.5,15.0,101.3,1.225,cruise_5k,healthy,0.0
...
```

The `fault_type` column is your classification label. For RUL models, compute `time_to_failure = mission_end - time` as an additional target column.

## Tests

```bash
pytest tests/unit/
```

50 tests covering baseline stabilization, transient lag, mission profiles, all fault types, ISA environment model, and dynamic telemetry extensions.

See `simulation/phase2/README.md` for details on the phase 2 additions.
