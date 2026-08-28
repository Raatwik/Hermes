import os
import glob
import multiprocessing
import pandas as pd
from typing import List, Tuple

from simulation.engine import Simulation, TIME_CONSTANTS

def compute_residuals_for_file(filepath: str, output_dir: str) -> None:
    """
    Reads a single parquet file, runs a clean Simulation step-by-step
    to generate expected values, computes residuals, and saves the augmented dataset.
    """
    df = pd.read_parquet(filepath)
    
    # Extract ambient temp offset from the first row's environment data
    first_row = df.iloc[0]
    alt_m = first_row["altitude"] * 0.3048
    std_temp_k = 288.15 - 0.0065 * alt_m
    ambient_temp_offset = (first_row["ambient_temperature"] + 273.15) - std_temp_k
    
    # Initialize a clean simulation with no faults and no noise
    sim = Simulation(ambient_temp_offset=ambient_temp_offset, noise_seed=None)
    
    expected_records = []
    prev_time = 0.0
    
    for _, row in df.iterrows():
        current_time = row["time"]
        dt = current_time - prev_time
        
        sim.set_throttle(row["throttle"])
        sim.set_altitude(row["altitude"])
        
        if dt > 0:
            sim.step(dt)
        elif current_time == 0.0:
            # Step with dt=0 to initialize
            sim.step(0.0)
            
        expected_records.append(sim.get_state())
        prev_time = current_time
        
    expected_df = pd.DataFrame(expected_records)
    
    # Compute residuals for all relevant engine parameters
    sensor_cols = list(TIME_CONSTANTS.keys()) + ["vibration_index", "engine_load", "injection_timing"]
    
    for col in sensor_cols:
        df[f"{col}_expected"] = expected_df[col]
        df[f"{col}_residual"] = df[col] - expected_df[col]
        
    # Extract partition info if it exists in the path
    fault_class = "healthy"
    path_parts = filepath.split(os.sep)
    for part in path_parts:
        if part.startswith("fault_class="):
            fault_class = part.split("=")[1]
            break
            
    # Always keep the fault_class in the dataframe
    if "fault_class" not in df.columns:
        df["fault_class"] = fault_class
        
    # Output to partitioned directory structure
    out_path = os.path.join(output_dir, f"fault_class={fault_class}")
    os.makedirs(out_path, exist_ok=True)
    out_file = os.path.join(out_path, os.path.basename(filepath))
    
    df.to_parquet(out_file, engine="pyarrow")

def _process_file_wrapper(args: Tuple[str, str]) -> bool:
    filepath, output_dir = args
    try:
        compute_residuals_for_file(filepath, output_dir)
        return True
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def generate_residuals(data_dir: str = "data", output_dir: str = "data_residuals", workers: int = None) -> None:
    if workers is None:
        workers = multiprocessing.cpu_count()
        
    files = glob.glob(os.path.join(data_dir, "**/*.parquet"), recursive=True)
    if not files:
        print(f"No parquet files found in {data_dir}")
        return
        
    print(f"Found {len(files)} files to process for residuals.")
    tasks = [(f, output_dir) for f in files]
    
    with multiprocessing.Pool(workers) as pool:
        results = pool.map(_process_file_wrapper, tasks)
        
    success_count = sum(results)
    print(f"Successfully processed {success_count} / {len(results)} files into {output_dir}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate residual datasets")
    parser.add_argument("--data_dir", type=str, default="data", help="Input dataset directory")
    parser.add_argument("--out", type=str, default="data_residuals", help="Output directory")
    parser.add_argument("--workers", type=int, default=multiprocessing.cpu_count(), help="Number of parallel workers")
    
    args = parser.parse_args()
    generate_residuals(data_dir=args.data_dir, output_dir=args.out, workers=args.workers)
