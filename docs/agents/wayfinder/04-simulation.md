---
labels: ["ready-for-agent"]
---
# [wayfinder:task] Simulation: Engine Physics & Twin Core

## Problem Statement

The user needs a physically plausible simulation of a Rotax 914 engine to generate baseline telemetry and synthetic fault data. This data is critical for training and evaluating predictive analytics models (such as diagnostics and Remaining Useful Life (RUL)) for a MALE-UAV Digital Twin, as relying solely on real-world anomalous flight data is impractical, scarce, and dangerous to acquire.

## Solution

A Python-based simulation engine using a Mean-Value Engine Model (MVEM) approach. It will use empirical lookup tables combined with first-order lag filters to model steady-state and transient behaviors without the computational overhead of solving complex ODEs. The simulation will provide a Python API to explicitly step through time, driven by scriptable mission profiles. A centralized `FaultManager` will allow users to dynamically inject faults at runtime, predictably altering the telemetry to reflect conditions like misfires, sensor drift, and cooling degradation.

## User Stories

1. As an ML Engineer, I want the simulation to output baseline telemetry (RPM, CHT, EGT, Oil Press/Temp, Fuel Flow, Vibration, Battery, Injection), so that I can train models on normal operating conditions.
2. As a Data Scientist, I want to load scriptable mission profiles (throttle, altitude, ambient temp), so that I can generate reproducible operational scenarios.
3. As an ML Engineer, I want to explicitly step the simulation time forward via a `step(dt)` API, so that I can generate training datasets significantly faster than real-time.
4. As an ML Engineer, I want to query the current telemetry state via a `get_state()` API, so that I can capture the output at any point in the time series.
5. As an Operator, I want the simulation to realistically model transient responses using first-order lag filters, so that the engine doesn't instantly snap to new states when throttle changes.
6. As a Tester, I want to dynamically inject a "sensor drift" fault via the API, so that I can evaluate if the predictive model catches gradual sensor degradation over time.
7. As a Tester, I want to dynamically inject a "cooling degradation" fault, so that I can simulate a blocked radiator and see CHT and Oil Temp rise.
8. As a Tester, I want to dynamically inject a "misfire" fault, so that I can observe the effect on RPM stability, EGT, and vibration.
9. As a Tester, I want to inject "injector abnormalities", so that I can see corresponding changes in fuel flow and EGT.
10. As a Tester, I want to simulate "lubrication issues", so that I can observe drops in oil pressure and spikes in oil temperature.
11. As an ML Engineer, I want vibration to be modeled as an abstract 0.0-1.0 severity index, so that I have a lightweight representation of mechanical health without the overhead of processing high-frequency audio/accelerometer data.

## Implementation Decisions

- A main `Simulation` class will serve as the primary API boundary, exposing `load_profile(profile_data)`, `step(dt)`, `get_state()`, and `inject_fault(fault_type, **kwargs)` methods.
- The core physics will rely on empirical maps (e.g., dictionaries or data structures mapping throttle and altitude to steady-state target values for temperatures and pressures).
- Transient states (like temperatures taking time to heat up/cool down) will be managed by a `LagFilter` utility class that implements an exponential moving average based on the time step `dt` and a physical time constant.
- A centralized `FaultManager` will intercept calculations. When `step(dt)` is called, the `Simulation` will ask the `FaultManager` for active fault modifiers and apply them to the current state (e.g., adding an offset to the final sensor output, or changing the time constant of a lag filter).
- Mission profiles will be defined as structured objects (e.g., parsed from JSON or YAML) containing arrays of timestamped setpoints. The simulation will linearly interpolate between these setpoints during `step(dt)`.
- Vibration will not use FFTs or time-domain waveforms; it will simply be a derived value based on engine speed and active mechanical faults.

## Testing Decisions

- **What makes a good test**: Tests will solely assert against the external behavior (the telemetry dictionary output from `get_state()`) in response to public API inputs (`step`, `inject_fault`, `load_profile`). We will avoid testing the internal state of the `FaultManager`, the precise values inside the empirical maps, or the internal state variables of the filters.
- **Tested Modules**: The public interface of the `Simulation` engine package.
- **Prior Art**: (None yet; this is the foundational simulation component).
- **Test Scenarios**:
  - *Baseline Test*: Initialize simulation, step for 100 seconds at a constant 50% throttle, assert CHT and EGT stabilize within plausible bounds and do not oscillate.
  - *Transient Test*: Step at 50% throttle until stable, instantly change throttle to 80%, step for 5 seconds, assert CHT is rising but has not instantly snapped to the new maximum (verifying lag filters).
  - *Fault Test*: Step to steady state, invoke `sim.inject_fault('cooling_degradation')`, step for another 50 seconds, assert CHT and Oil Temp are strictly greater than the baseline steady state.

## Out of Scope

- Real-time message brokering (MQTT/ZeroMQ). The simulation only provides a synchronous Python API. A separate integration script/module will be responsible for calling `step()` and publishing the outputs to a broker.
- Full 3D kinematic modeling of the drone airframe (we are exclusively modeling the engine).
- High-frequency time-domain vibration audio/accelerometer data.
- Solving complex differential equations for physical thermodynamics (we are substituting this with maps and filters).

## Further Notes

- The simulation must remain fully deterministic. Given the same random seed (if any statistical noise is applied) and the exact same mission profile and fault injection sequence, the engine must produce an identical telemetry timeseries on every execution.
