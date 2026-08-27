import os
import yaml
import pandas as pd

from simulation.engine import Simulation


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


def run_pipeline(config_path: str, output_dir: str, dt: float = 0.1) -> None:
    """
    Initializes and steps the core simulation over the interpolated mission profile.
    Tags telemetry with fault_class="healthy" and exports to a Parquet file.
    """
    profile = parse_mission_config(config_path)
    
    sim = Simulation()
    sim.load_profile(profile)
    
    # Initialize state properly by doing a zero-dt step
    sim.step(dt=0.0)
    
    max_time = profile["setpoints"][-1]["time"]
    records = []
    
    def record_state():
        state = sim.get_state()
        environment = sim.get_environment()
        row = {**state, **environment}
        row["fault_class"] = "healthy"
        records.append(row)
    
    # Record initial state
    record_state()
    
    num_steps = int(max_time / dt)
    for _ in range(num_steps):
        sim.step(dt)
        record_state()
        
    df = pd.DataFrame(records)
    
    # Save to parquet partitioned by fault_class
    os.makedirs(output_dir, exist_ok=True)
    
    df.to_parquet(
        output_dir,
        engine='pyarrow',
        partition_cols=['fault_class'],
        basename_template="part-baseline-{i}.parquet"
    )
    print(f"Exported baseline telemetry to {output_dir}")

if __name__ == "__main__":
    run_pipeline(".scratch/datasets/issues/01-baseline-pipeline.md", "data")
