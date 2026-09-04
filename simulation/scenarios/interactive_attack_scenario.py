#!/usr/bin/env python3
"""
Interactive Attack Scenario Generator

This script runs a standard flight profile (takeoff, climb, cruise, loiter, return, land)
and allows the user to interactively choose a type of engine fault ("attack") to inject.
The telemetry is exported to a CSV file. The simulation terminates if the mission
completes or an EngineFailureException is caught.
"""

import argparse
import csv
import math
import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from simulation.engine import Simulation, EngineFailureException

DEGRADATION_THRESHOLD = 0.95

MISSION_PHASES = [
    (0, 120, "Takeoff"),
    (120, 600, "Climb"),
    (600, 1800, "Cruise"),
    (1800, 2400, "Loiter"),
    (2400, 3000, "Descent"),
    (3000, 3600, "Landing"),
]

def get_mission_phase(t):
    for start, end, name in MISSION_PHASES:
        if start <= t < end:
            phase_progress = (t - start) / (end - start) * 100
            return name, round(phase_progress, 1)
    return MISSION_PHASES[-1][2], 100.0

def get_mission_progress(t, total):
    return round(t / total * 100, 1)

def compute_degradation_severity(elapsed, ttf):
    k = -math.log(1.0 - DEGRADATION_THRESHOLD) / ttf
    return min(1.0 - math.exp(-k * elapsed), 1.0)

def get_user_choice(prompt, options):
    print(prompt)
    for i, opt in enumerate(options):
        print(f"  {i + 1}. {opt}")
    while True:
        try:
            choice = int(input("Enter choice (number): "))
            if 1 <= choice <= len(options):
                return choice - 1
            print("Invalid choice.")
        except ValueError:
            print("Invalid input.")
        except KeyboardInterrupt:
            print("\nAborted.")
            sys.exit(0)

def get_float_input(prompt, min_val, max_val):
    while True:
        try:
            val = float(input(f"{prompt} ({min_val}-{max_val}): "))
            if min_val <= val <= max_val:
                return val
            print(f"Out of range. Must be between {min_val} and {max_val}.")
        except ValueError:
            print("Invalid input.")
        except KeyboardInterrupt:
            print("\nAborted.")
            sys.exit(0)

def get_int_input(prompt, min_val, max_val):
    while True:
        try:
            val = int(input(f"{prompt} ({min_val}-{max_val}): "))
            if min_val <= val <= max_val:
                return val
            print(f"Out of range. Must be between {min_val} and {max_val}.")
        except ValueError:
            print("Invalid input.")
        except KeyboardInterrupt:
            print("\nAborted.")
            sys.exit(0)

def _configure_single_fault(total_mission_time, chosen_fault):
    timing_options = [
        "Interactive (prompt for injection time and severity)",
        "Fixed phase, random severity (e.g., inject randomly during Cruise)",
        "Fixed time, fixed severity",
        "Progressive degradation (ramp severity over time to failure)"
    ]
    print("")
    timing_idx = get_user_choice("How should the timing and severity be determined?", timing_options)

    inject_time = None
    severity = None
    sensor_drift_target = None
    cylinder_target = None
    offset = None
    progressive = False
    ttf = None

    if timing_idx == 0:
        print("")
        inject_time = get_int_input("Enter injection time in seconds", 0, total_mission_time)
        severity = get_float_input("Enter fault severity", 0.0, 1.0)
    elif timing_idx == 1:
        inject_time = random.randint(600, 1800)
        severity = round(random.uniform(0.3, 1.0), 2)
        print(f"\n[Info] Randomly selected inject time: {inject_time}s (Cruise phase), severity: {severity}")
    elif timing_idx == 2:
        inject_time = 1200
        severity = 0.8
        print(f"\n[Info] Fixed inject time: {inject_time}s, severity: {severity}")
    elif timing_idx == 3:
        progressive = True
        print("")
        inject_time = get_int_input("Enter injection start time in seconds", 0, total_mission_time)
        ttf = get_int_input("Enter Target Time to Failure in seconds", 10, total_mission_time)
        severity = 0.0
        print(f"\n[Info] Progressive degradation: starts at {inject_time}s, target failure at {inject_time + ttf}s")

    if chosen_fault == "sensor_drift":
        sensor_drift_options = ["egt", "cht", "rpm", "oil_pressure", "oil_temp", "fuel_flow"]
        print("")
        sensor_idx = get_user_choice("Select sensor to drift:", sensor_drift_options)
        sensor_drift_target = sensor_drift_options[sensor_idx]
        
        if sensor_drift_target in ["egt", "cht"]:
            print("")
            cyl_choice = get_user_choice(f"Target specific cylinder for {sensor_drift_target.upper()}?", ["No (Global Average)", "Yes (Specific Cylinder)"])
            if cyl_choice == 1:
                cyl_target = get_int_input("Enter cylinder number", 1, 4)
                sensor_drift_target = f"{sensor_drift_target}_{cyl_target}"
        if progressive:
            offset = 0.0
            print(f"[Info] Sensor drift will target {sensor_drift_target} (progressive ramp)")
        else:
            offset = severity * 100
            print(f"[Info] Sensor drift will target {sensor_drift_target} with offset {offset}")
    elif chosen_fault == "cylinder_failure":
        cylinder_target = random.randint(1, 4)
        print(f"[Info] Cylinder failure will target cylinder {cylinder_target}")

    return {
        "fault": chosen_fault,
        "inject_time": inject_time,
        "severity": severity,
        "sensor_drift_target": sensor_drift_target,
        "cylinder_target": cylinder_target,
        "offset": offset,
        "progressive": progressive,
        "ttf": ttf,
    }


def _configure_fault_injection(total_mission_time):
    all_fault_types = [
        "misfire",
        "sensor_drift",
        "cooling_degradation",
        "injector_abnormalities",
        "lubrication_issues",
        "cylinder_failure"
    ]
    configs = []
    selected_types = set()

    while True:
        available = [f for f in all_fault_types if f not in selected_types]
        if not available:
            print("\n[Info] All fault types selected.")
            break

        menu_options = available + ["Done — start simulation"]
        if selected_types:
            print(f"\n--- Fault Selection ({len(configs)} selected: {', '.join(sorted(selected_types))}) ---")
        else:
            print("\n--- Fault Selection ---")
        choice_idx = get_user_choice("Select a fault to add (or Done):", menu_options)

        if choice_idx == len(available):
            if not configs:
                print("[Warning] No faults selected. Please select at least one fault.")
                continue
            break

        chosen_fault = available[choice_idx]
        config = _configure_single_fault(total_mission_time, chosen_fault)
        configs.append(config)
        selected_types.add(chosen_fault)
        print(f"\n[Info] Added {chosen_fault}. {len(configs)} fault(s) queued.")

    return configs


def run_scenario(healthy=False):
    total_mission_time = 3600

    fault_configs = []
    if healthy:
        print("=== Healthy Baseline Simulation ===\n")
    else:
        print("=== Interactive Attack Simulator ===\n")
        fault_configs = _configure_fault_injection(total_mission_time)

    print("Initializing standard mission profile...")
    profile = {
        "setpoints": [
            {"time": 0, "throttle": 0.9, "altitude": 0},          # Takeoff
            {"time": 120, "throttle": 0.9, "altitude": 5000},     # Climb
            {"time": 600, "throttle": 0.6, "altitude": 10000},    # Cruise
            {"time": 1800, "throttle": 0.6, "altitude": 10000},   # Loiter
            {"time": 2400, "throttle": 0.4, "altitude": 10000},   # Descent
            {"time": 3000, "throttle": 0.3, "altitude": 5000},    # Return
            {"time": 3600, "throttle": 0.1, "altitude": 0}        # Land
        ]
    }
    
    sim = Simulation()
    sim.load_profile(profile)
    
    csv_filename = "attack_scenario_telemetry.csv"
    dt = 1.0
    
    with open(csv_filename, 'w', newline='') as csvfile:
        fieldnames = [
            "time_sec", "throttle", "altitude", "ambient_temperature", "ambient_pressure",
            "rpm", "cht", "cht_1", "cht_2", "cht_3", "cht_4",
            "egt", "egt_1", "egt_2", "egt_3", "egt_4",
            "oil_pressure", "oil_temp", "fuel_flow", "battery_voltage",
            "vibration_index", "engine_load", "injection_timing", "rul",
            "mission_phase", "phase_progress_pct", "mission_progress_pct"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        print(f"Running simulation for {total_mission_time} seconds (dt={dt}s)...")

        injected = set()
        try:
            for t in range(total_mission_time + 1):
                for fc in fault_configs:
                    if t < fc["inject_time"]:
                        continue
                    fault_key = fc["fault"]
                    if fault_key not in injected:
                        print(f"\n>>> [{t}s] INJECTING ATTACK: {fc['fault'].upper()}"
                              + (" (progressive)" if fc["progressive"] else "") + " <<<")
                        if fc["fault"] == "sensor_drift":
                            sim.inject_fault("sensor_drift", sensor=fc["sensor_drift_target"], offset=fc["offset"])
                        elif fc["fault"] == "cylinder_failure":
                            sim.inject_fault("cylinder_failure", cylinder=fc["cylinder_target"], severity=fc["severity"])
                        else:
                            sim.inject_fault(fc["fault"], severity=fc["severity"])
                        injected.add(fault_key)

                    if fc["progressive"]:
                        elapsed = t - fc["inject_time"]
                        severity = compute_degradation_severity(elapsed, fc["ttf"])
                        if fc["fault"] == "sensor_drift":
                            sim.update_fault_params("sensor_drift", offset=severity * 100)
                        else:
                            sim.update_fault_severity(fc["fault"], severity)
                        if t > 0 and t % 60 == 0:
                            print(f"  [{t}s] {fc['fault']} severity: {severity:.3f}")

                sim.step(dt)
                state = sim.get_state()
                env = sim.get_environment()

                phase, phase_pct = get_mission_phase(t)
                mission_pct = get_mission_progress(t, total_mission_time)

                writer.writerow({
                    "time_sec": round(state["time"], 2),
                    "throttle": round(state["throttle"], 2),
                    "altitude": round(env["altitude"], 2),
                    "ambient_temperature": round(env["ambient_temperature"], 2),
                    "ambient_pressure": round(env["ambient_pressure"], 2),
                    "rpm": round(state.get("rpm", 0), 2),
                    "cht": round(state.get("cht", 0), 2),
                    "cht_1": round(state.get("cht_1", 0), 2),
                    "cht_2": round(state.get("cht_2", 0), 2),
                    "cht_3": round(state.get("cht_3", 0), 2),
                    "cht_4": round(state.get("cht_4", 0), 2),
                    "egt": round(state.get("egt", 0), 2),
                    "egt_1": round(state.get("egt_1", 0), 2),
                    "egt_2": round(state.get("egt_2", 0), 2),
                    "egt_3": round(state.get("egt_3", 0), 2),
                    "egt_4": round(state.get("egt_4", 0), 2),
                    "oil_pressure": round(state.get("oil_pressure", 0), 2),
                    "oil_temp": round(state.get("oil_temp", 0), 2),
                    "fuel_flow": round(state.get("fuel_flow", 0), 2),
                    "battery_voltage": round(state.get("battery_voltage", 0), 2),
                    "vibration_index": round(state.get("vibration_index", 0), 4),
                    "engine_load": round(state.get("engine_load", 0), 4),
                    "injection_timing": round(state.get("injection_timing", 0), 2),
                    "rul": round(state.get("rul", 5000.0), 1),
                    "mission_phase": phase,
                    "phase_progress_pct": phase_pct,
                    "mission_progress_pct": mission_pct,
                })
                
                # Print progress every 600s
                if t > 0 and t % 600 == 0:
                    print(f"  ... {t}s simulated")
                    
        except EngineFailureException as e:
            print(f"\n[!] SIMULATION TERMINATED: Engine failure occurred at {t}s.")
            print(f"Reason: {e}")
            
    print(f"\nScenario complete! Telemetry saved to {csv_filename}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the 1-hour mission profile simulation.")
    parser.add_argument("--healthy", action="store_true",
                        help="Run a healthy baseline with no fault injection.")
    args = parser.parse_args()
    try:
        run_scenario(healthy=args.healthy)
    except KeyboardInterrupt:
        print("\nSimulation aborted by user.")
