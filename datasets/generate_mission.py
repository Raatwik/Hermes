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
    def __init__(self, max_time: float):
        self.max_time = max_time
        
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

    setpoints = []
    current_time = 0.0

    for phase in phases:
        setpoints.append({
            "time": current_time,
            "throttle": phase["throttle"],
            "altitude": phase["altitude"]
        })
        current_time += phase["duration"]
        setpoints.append({
            "time": current_time,
            "throttle": phase["throttle"],
            "altitude": phase["altitude"]
        })

    return {"setpoints": setpoints}


def run_pipeline(config_path: str, output_dir: str, dt: float = 0.1, scheduler: Optional[FaultScheduler] = None) -> None:
    """
    Initializes and steps the core simulation over the interpolated mission profile.
    Schedules an exponential severity curve, and exports to a partitioned Parquet file.
    """
    profile = parse_mission_config(config_path)
    
    sim = Simulation()
    sim.load_profile(profile)
    sim.step(dt=0.0)
    
    max_time = profile["setpoints"][-1]["time"]
    
    if scheduler is None:
        scheduler = FaultScheduler(max_time)
        
    records = []
    
    def record_state():
        state = sim.get_state()
        environment = sim.get_environment()
        row = {**state, **environment}
        row["fault_class"] = scheduler.fault_class
        records.append(row)
    
    record_state()
    
    num_steps = int(max_time / dt)
    for i in range(1, num_steps + 1):
        current_time = i * dt
        
        sim.clear_faults()
        scheduler.inject_to(sim, current_time)
        
        sim.step(dt)
        record_state()
        
    df = pd.DataFrame(records)
    
    # Post-processing RUL Calculation
    if scheduler.fault_class == "healthy":
        df["Remaining_Useful_Life"] = RUL_MAX
    else:
        # Capped at RUL_MAX before injection time
        # Monotonically decreasing after injection time based on max_time - current_time
        # But we ensure it anchors properly.
        def calc_rul(t):
            if t < scheduler.injection_time:
                return RUL_MAX
            else:
                return min(RUL_MAX, max_time - t)
        
        df["Remaining_Useful_Life"] = df["time"].apply(calc_rul)
    
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

