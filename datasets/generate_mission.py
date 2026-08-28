import os
import yaml
import pandas as pd
import random
import math
import uuid
from typing import Optional

from simulation.engine import Simulation
from simulation.fault_manager import KNOWN_FAULTS

RUL_MAX = 500.0

class FaultScheduler:
    def __init__(self, max_time: float, force_fault_class: Optional[str] = None):
        self.max_time = max_time
        
        if force_fault_class is not None:
            self.fault_class = force_fault_class
        else:
            # 50% chance of healthy vs faulty
            if random.random() < 0.5:
                self.fault_class = "healthy"
            else:
                self.fault_class = random.choice(list(KNOWN_FAULTS))
            
        self.injection_time = (
            random.uniform(0.0, self.max_time)
            if self.fault_class != "healthy"
            else self.max_time + 1.0
        )
        
        # Configuration for specific faults that need extra params
        self.fault_kwargs = {}
        if self.fault_class == "sensor_drift":
            self.fault_kwargs["sensor"] = random.choice(["cht", "egt", "rpm", "oil_pressure"])
            self.max_offset = 50.0

    def get_severity(self, current_time: float) -> float:
        if current_time < self.injection_time:
            return 0.0
            
        time_remaining = self.max_time - self.injection_time
        if time_remaining <= 0:
            return 1.0
            
        time_since_inj = current_time - self.injection_time
        alpha = math.log(2) / time_remaining
        severity = math.exp(alpha * time_since_inj) - 1.0
        return min(max(severity, 0.0), 1.0)
        
    def inject_to(self, sim: Simulation, current_time: float) -> None:
        if self.fault_class == "healthy" or current_time < self.injection_time:
            return
            
        severity = self.get_severity(current_time)
        kwargs = dict(self.fault_kwargs)
        
        if self.fault_class == "sensor_drift":
            kwargs["offset"] = severity * self.max_offset
            
        sim.inject_fault(self.fault_class, severity=severity, **kwargs)


def parse_mission_config(config_path: str) -> dict:
    """
    Parses a YAML mission configuration file containing basic phase definitions
    (duration, altitude, throttle) and converts it to a setpoints profile.
    """
    with open(config_path, "r") as f:
        data = yaml.safe_load(f)

    phases = data.get("phases", [])
    if not phases:
        raise ValueError("YAML config must contain 'phases'.")

    def sample_val(val):
        if isinstance(val, list) and len(val) == 2:
            return random.uniform(val[0], val[1])
        return val

    setpoints = []
    phase_intervals = []
    current_time = 0.0

    for i, phase in enumerate(phases):
        phase_name = phase.get("name", f"Phase_{i+1}")
        duration = sample_val(phase["duration"])
        throttle = sample_val(phase["throttle"])
        altitude = sample_val(phase["altitude"])
        
        start_time = current_time
        setpoints.append({
            "time": start_time,
            "throttle": throttle,
            "altitude": altitude
        })
        current_time += duration
        setpoints.append({
            "time": current_time,
            "throttle": throttle,
            "altitude": altitude
        })
        
        phase_intervals.append({
            "name": phase_name,
            "start_time": start_time,
            "end_time": current_time
        })

    ambient_temp_offset = data.get("ambient_temp_offset", 0.0)
    ambient_temp_offset = sample_val(ambient_temp_offset)

    return {
        "setpoints": setpoints, 
        "ambient_temp_offset": ambient_temp_offset,
        "phase_intervals": phase_intervals
    }


def run_pipeline(config_path: Optional[str] = None, output_dir: str = "data", dt: float = 0.1, scheduler: Optional[FaultScheduler] = None, profile: Optional[dict] = None, noise_seed: Optional[int] = 42) -> None:
    """
    Initializes and steps the core simulation over the interpolated mission profile.
    Schedules an exponential severity curve, and exports to a partitioned Parquet file.
    """
    if profile is None:
        if config_path is None:
            raise ValueError("Must provide either config_path or profile")
        profile = parse_mission_config(config_path)
    
    ambient_temp_offset = profile.get("ambient_temp_offset", 0.0)
    sim = Simulation(noise_seed=noise_seed, ambient_temp_offset=ambient_temp_offset)
    sim.load_profile(profile)
    sim.step(dt=0.0)
    
    max_time = profile["setpoints"][-1]["time"]
    
    if scheduler is None:
        scheduler = FaultScheduler(max_time)
        
    def get_phase_name(t: float) -> str:
        for p in profile.get("phase_intervals", []):
            if p["start_time"] <= t <= p["end_time"]:
                return p["name"]
        return "Unknown"

    records = []
    
    def record_state(current_time: float):
        state = sim.get_state()
        environment = sim.get_environment()
        row = {**state, **environment}
        row["fault_class"] = scheduler.fault_class
        row["fault_severity"] = scheduler.get_severity(current_time)
        row["flight_phase"] = get_phase_name(current_time)
        records.append(row)
    
    record_state(0.0)
    
    num_steps = int(max_time / dt)
    for i in range(1, num_steps + 1):
        current_time = i * dt
        
        sim.clear_faults()
        scheduler.inject_to(sim, current_time)
        
        sim.step(dt)
        record_state(current_time)
        
    df = pd.DataFrame(records)
    
    # Post-processing RUL Calculation
    if scheduler.fault_class == "healthy":
        df["Remaining_Useful_Life"] = RUL_MAX
        df["time_since_fault_injection"] = 0.0
    else:
        # Capped at RUL_MAX before injection time
        # Monotonically decreasing after injection time based on max_time - current_time
        # But we ensure it anchors properly.
        def calc_rul(t):
            if t < scheduler.injection_time:
                return RUL_MAX
            else:
                return min(RUL_MAX, max_time - t)
        
        def calc_tsfi(t):
            if t < scheduler.injection_time:
                return 0.0
            else:
                return t - scheduler.injection_time
        
        df["Remaining_Useful_Life"] = df["time"].apply(calc_rul)
        df["time_since_fault_injection"] = df["time"].apply(calc_tsfi)
    
    os.makedirs(output_dir, exist_ok=True)
    df.to_parquet(
        output_dir,
        engine='pyarrow',
        partition_cols=['fault_class'],
        basename_template=f"part-{uuid.uuid4().hex[:8]}-{{i}}.parquet"
    )
    print(f"Exported telemetry to {output_dir}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python generate_mission.py <config.yaml> [output_dir]")
        sys.exit(1)
        
    config = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else "data"
    run_pipeline(config, out)

