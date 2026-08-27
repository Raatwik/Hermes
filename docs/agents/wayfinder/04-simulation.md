# [wayfinder:task] Simulation: Engine Physics & Twin Core

## Question

How do we implement the Rotax 914 Mean-Value Engine Model (MVEM) in Python such that it produces physically plausible baseline telemetry and supports dynamic parameter alteration for fault injection? Specifically, the simulator MUST produce telemetry covering the following parameters:
* RPM
* Cylinder Head Temperature (CHT)
* Exhaust Gas Temperature (EGT)
* Oil Pressure & Temperature
* Fuel flow
* Vibration signatures
* Battery / Alternator health
* Injection timing parameters

Additionally, the simulation must support fault injection to enable the detection/prediction of the following conditions for predictive analytics:
* Misfire conditions
* Injector abnormalities
* Cooling degradation
* Lubrication issues
* Sensor drift/failure
* Combustion instability
* Overheating trends
* Abnormal vibration patterns

## Blocked By
*(None)*

## Resolution

The simulation engine architecture is finalized with the following decisions:
1. **Core Modeling**: Empirical lookup tables (maps) combined with first-order lag filters for transient behavior.
2. **Fault Management**: A centralized `FaultManager` to cleanly modify inputs/outputs without cluttering the core engine physics.
3. **Telemetry API**: A Python API that the Digital Twin can import and query directly.
4. **Vibration**: Modeled simply as an abstract "severity index" (0.0 to 1.0).
5. **Operational Input**: A scriptable mission profile handles baseline flight data.
6. **Time Progression**: A caller-driven `step(dt)` method for execution speed control.
7. **Fault Triggering**: Handled exclusively via the Python API at runtime (`sim.inject_fault(...)`).
