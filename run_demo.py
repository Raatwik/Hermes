#!/usr/bin/env python3
"""
Rotax 914 MVEM Simulation Demo
Run from the project root:  python run_demo.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simulation.engine import Simulation


def divider(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


def print_state(state: dict[str, float]) -> None:
    print(f"  Time:        {state['time']:8.1f} s")
    print(f"  RPM:         {state['rpm']:8.0f}")
    print(f"  CHT:         {state['cht']:8.1f} °C")
    print(f"  EGT:         {state['egt']:8.1f} °C")
    print(f"  Oil Press:   {state['oil_pressure']:8.1f} psi")
    print(f"  Oil Temp:    {state['oil_temp']:8.1f} °C")
    print(f"  Fuel Flow:   {state['fuel_flow']:8.1f} L/hr")
    print(f"  Battery:     {state['battery_voltage']:8.2f} V")
    print(f"  Vibration:   {state['vibration_index']:8.3f}")
    print(f"  Eng Load:    {state['engine_load']:8.3f}")
    print(f"  Inj Timing:  {state['injection_timing']:8.1f} °BTDC")


def print_environment(env: dict[str, float]) -> None:
    print(f"  Ambient T:   {env['ambient_temperature']:8.1f} °C")
    print(f"  Ambient P:   {env['ambient_pressure']:8.1f} kPa")
    print(f"  Air Density: {env['air_density']:8.4f} kg/m³")


def demo_baseline() -> None:
    divider("1. Baseline — 50% throttle, sea level, 100s warm-up")
    sim = Simulation(throttle=0.5, altitude=0.0)
    for _ in range(1000):
        sim.step(dt=0.1)
    print_state(sim.get_state())
    print()
    print_environment(sim.get_environment())


def demo_transient() -> None:
    divider("2. Transient — throttle jump from 30% to 80%")
    sim = Simulation(throttle=0.3, altitude=0.0)
    for _ in range(1000):
        sim.step(dt=0.1)
    print("  Before (30% throttle, stabilized):")
    print(f"    RPM={sim.get_state()['rpm']:.0f}  CHT={sim.get_state()['cht']:.1f}")

    sim.set_throttle(0.8)
    for _ in range(50):
        sim.step(dt=0.1)
    print("  After 5s at 80% throttle (values rising, not snapped):")
    print(f"    RPM={sim.get_state()['rpm']:.0f}  CHT={sim.get_state()['cht']:.1f}")

    for _ in range(1950):
        sim.step(dt=0.1)
    print("  After 200s at 80% throttle (stabilized):")
    print(f"    RPM={sim.get_state()['rpm']:.0f}  CHT={sim.get_state()['cht']:.1f}")


def demo_mission_profile() -> None:
    divider("3. Mission Profile — 10-minute flight")
    profile = {"setpoints": [
        {"time": 0,   "throttle": 0.3, "altitude": 0},
        {"time": 60,  "throttle": 0.7, "altitude": 3000},
        {"time": 300, "throttle": 0.9, "altitude": 8000},
        {"time": 500, "throttle": 0.5, "altitude": 4000},
        {"time": 600, "throttle": 0.3, "altitude": 0},
    ]}
    sim = Simulation()
    sim.load_profile(profile)

    print(f"  {'Time':>6s}  {'RPM':>6s}  {'CHT':>6s}  {'EGT':>6s}  {'Vib':>6s}  {'Load':>6s}  {'AmbT':>6s}")
    print(f"  {'-'*6}  {'-'*6}  {'-'*6}  {'-'*6}  {'-'*6}  {'-'*6}  {'-'*6}")
    for i in range(1, 6001):
        sim.step(dt=0.1)
        if i % 600 == 0:
            s = sim.get_state()
            e = sim.get_environment()
            print(f"  {s['time']:6.0f}  {s['rpm']:6.0f}  {s['cht']:6.1f}  {s['egt']:6.1f}  {s['vibration_index']:6.3f}  {s['engine_load']:6.3f}  {e['ambient_temperature']:6.1f}")


def demo_faults() -> None:
    divider("4. Fault Injection")
    faults = [
        ("misfire",                 {"severity": 0.5}),
        ("cooling_degradation",     {"severity": 0.5}),
        ("injector_abnormalities",  {"severity": 0.5}),
        ("lubrication_issues",      {"severity": 0.5}),
        ("sensor_drift",            {"sensor": "cht", "offset": 20.0}),
    ]

    sim = Simulation(throttle=0.5, altitude=0.0)
    for _ in range(1000):
        sim.step(dt=0.1)
    baseline = sim.get_state()
    print("  Baseline (healthy engine):")
    print(f"    RPM={baseline['rpm']:.0f}  CHT={baseline['cht']:.1f}  EGT={baseline['egt']:.1f}"
          f"  OilP={baseline['oil_pressure']:.1f}  FF={baseline['fuel_flow']:.1f}"
          f"  Vib={baseline['vibration_index']:.3f}")

    for fault_name, params in faults:
        sim_f = Simulation(throttle=0.5, altitude=0.0)
        for _ in range(1000):
            sim_f.step(dt=0.1)
        sim_f.inject_fault(fault_name, **params)
        for _ in range(500):
            sim_f.step(dt=0.1)
        s = sim_f.get_state()
        label = f"{fault_name}({', '.join(f'{k}={v}' for k, v in params.items())})"
        print(f"\n  {label}:")
        print(f"    RPM={s['rpm']:.0f}  CHT={s['cht']:.1f}  EGT={s['egt']:.1f}"
              f"  OilP={s['oil_pressure']:.1f}  FF={s['fuel_flow']:.1f}"
              f"  Vib={s['vibration_index']:.3f}")


def main() -> None:
    print("Rotax 914 MVEM Simulation Demo")
    print("Python", sys.version.split()[0])

    demo_baseline()
    demo_transient()
    demo_mission_profile()
    demo_faults()

    divider("Done")
    print("  All demos completed. See simulation/README.md for full API docs.\n")


if __name__ == "__main__":
    main()
