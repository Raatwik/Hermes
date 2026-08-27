# Simulation — Rotax 914 MVEM Engine

A Python-based Mean-Value Engine Model for generating synthetic telemetry (RPM, CHT, EGT, oil pressure/temp, fuel flow, battery voltage, vibration index) driven by empirical lookup maps and first-order lag filters.

## Files

- **`engine.py`** — `Simulation` class. Core API: `step(dt)`, `get_state()`, `set_throttle()`, `set_altitude()`, `load_profile()`, `inject_fault()`, `clear_faults()`.
- **`lag_filter.py`** — `LagFilter` class. Exponential moving average for smooth transient transitions between steady states.
- **`fault_manager.py`** — `FaultManager` class. Stores active faults and computes target offsets, output offsets, tau multipliers, and vibration severity. Supports: `sensor_drift`, `cooling_degradation`, `misfire`, `injector_abnormalities`, `lubrication_issues`.

## Quick Start

```python
from simulation.engine import Simulation

sim = Simulation(throttle=0.5, altitude=0.0)

# Step 100 seconds
for _ in range(1000):
    sim.step(dt=0.1)

print(sim.get_state())

# Load a mission profile
sim.load_profile({"setpoints": [
    {"time": 0, "throttle": 0.3, "altitude": 0},
    {"time": 300, "throttle": 0.8, "altitude": 5000},
]})

# Inject a fault
sim.inject_fault("misfire", severity=0.5)
```

## Running Tests

```bash
pytest tests/unit/
```
