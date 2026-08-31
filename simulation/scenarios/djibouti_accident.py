#!/usr/bin/env python3
"""
Djibouti MQ-1B Accident Scenario Generator
Based on the 14 Jan 2011 USAF Accident Investigation Board Report.

This script simulates the flight up to engine seizure at 8.83 hours
(31800s), injecting the progressive oil system and cylinder failures
as described in the report. The simulation terminates at the exact
moment of engine death to provide an accurate RUL anchor for ML
training. Exports telemetry to a CSV file.
"""

import csv
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from simulation.engine import Simulation

def run_scenario():
    print("Initializing Djibouti MQ-1B Accident Scenario...")
    
    # 9 hour simulation at 1 second intervals
    dt = 1.0
    total_time_sec = 9 * 3600  # 9 hours = 32400 seconds
    
    sim = Simulation(throttle=0.0, altitude=0.0)
    
    csv_filename = "djibouti_accident_telemetry.csv"
    
    with open(csv_filename, 'w', newline='') as csvfile:
        fieldnames = [
            "time_sec", "throttle", "altitude", "rpm", "cht", 
            "egt", "egt_1", "egt_2", "egt_3", "egt_4",
            "oil_pressure", "oil_temp", "fuel_flow", "battery_voltage", 
            "vibration_index", "engine_load"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        print(f"Running {total_time_sec} seconds of simulation. This may take a moment...")
        
        for t in range(total_time_sec):
            # Baseline Flight Profile
            if t == 0:
                # Takeoff
                sim.set_throttle(0.9)
                sim.set_altitude(0)
            elif t == 1800:
                # 30 mins: reached cruise altitude 18,000 ft
                sim.set_throttle(0.65)
                sim.set_altitude(18000)
            
            # --- The Accident Timeline ---
            
            # 6.5 hours (23400s): MCE notices 3 momentary spikes of low oil pressure
            elif t == 23400:
                sim.inject_fault("lubrication_issues", severity=0.8)
            elif t == 23405:
                sim.clear_faults()
            elif t == 23415:
                sim.inject_fault("lubrication_issues", severity=0.8)
            elif t == 23420:
                sim.clear_faults()
            elif t == 23430:
                sim.inject_fault("lubrication_issues", severity=0.8)
            elif t == 23435:
                sim.clear_faults()
                
            # ~7.5 hours (27000s): MC assumes control, begins descent to 15,500 ft
            elif t == 27000:
                sim.set_throttle(0.3)
                sim.set_altitude(15500)
                
            # ~7.75 hours (27900s): Level off at 15,500 ft. Oil pressure fluctuates heavily
            elif t == 27900:
                sim.set_throttle(0.55)
                sim.inject_fault("lubrication_issues", severity=0.5)
            elif t == 28000:
                sim.inject_fault("lubrication_issues", severity=0.8)
            elif t == 28005:
                sim.clear_faults()
                sim.inject_fault("lubrication_issues", severity=0.4)
                
            # ~7.8 hours (28080s): Descend to 12,500 ft
            elif t == 28080:
                sim.set_throttle(0.3)
                sim.set_altitude(12500)
                
            # ~7.9 hours (28440s): Level off at 12,500 ft
            elif t == 28440:
                sim.set_throttle(0.5)
                
            # 8.76 hours (31560s): Engine becomes erratic
            elif t == 31560:
                sim.inject_fault("misfire", severity=0.7)
                sim.inject_fault("lubrication_issues", severity=0.9)
                
            # 8.80 hours (31680s): #3 Cylinder catastrophic failure 
            # In report: EGT on cylinder #3 dropped to 574F.
            elif t == 31680:
                sim.inject_fault("misfire", severity=1.0)
                # We calculate roughly how much to drop it. Cruise EGT is around 800F. 
                # Let's drop egt_3 by 250 degrees explicitly to hit ~574F (approx 300C). 
                sim.inject_fault("sensor_drift", sensor="egt_3", offset=-300.0) 
                
            # 8.83 hours (31800s): Engine seized, windmilling at 1000 RPM.
            elif t == 31800:
                sim.set_throttle(0.0)
                # Override the natural coast-down by explicitly setting RPM to windmilling speed
                sim.inject_fault("sensor_drift", sensor="rpm", offset=-4500.0) 
                
            sim.step(dt)
            
            # Record state every second
            state = sim.get_state()
            
            # Clamp RPM to minimum 1000 if windmilling (t >= 31800)
            if t >= 31800:
                state["rpm"] = max(1000.0, state["rpm"])

            writer.writerow({
                "time_sec": state["time"],
                "throttle": sim._throttle,
                "altitude": sim._altitude,
                "rpm": round(state["rpm"], 2),
                "cht": round(state["cht"], 2),
                "egt": round(state["egt"], 2),
                "egt_1": round(state["egt_1"], 2),
                "egt_2": round(state["egt_2"], 2),
                "egt_3": round(state["egt_3"], 2),
                "egt_4": round(state["egt_4"], 2),
                "oil_pressure": round(state["oil_pressure"], 2),
                "oil_temp": round(state["oil_temp"], 2),
                "fuel_flow": round(state["fuel_flow"], 2),
                "battery_voltage": round(state["battery_voltage"], 2),
                "vibration_index": round(state["vibration_index"], 4),
                "engine_load": round(state["engine_load"], 4)
            })

            # Terminate simulation immediately after recording the catastrophic seizure.
            # This ensures the dataset's final row perfectly aligns with the time of death,
            # providing a mathematically accurate RUL anchor of 0.
            if t >= 31800:
                break

    print(f"Scenario complete! Telemetry saved to {csv_filename}")

if __name__ == "__main__":
    run_scenario()
