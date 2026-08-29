import os
import glob
import multiprocessing
import pandas as pd
from typing import List, Tuple

def compute_rolling_features(
    df: pd.DataFrame, 
    time_col: str, 
    windows_s: List[int], 
    sensor_cols: List[str], 
    residual_cols: List[str]
) -> pd.DataFrame:
    """
    Computes rolling mean, variance, min, and max for specified columns over fixed time windows.
    Returns a new DataFrame with the engineered features.
    """
    out_df = df.copy()
    
    # We can use pd.TimedeltaIndex based on the time_col to use pandas time-aware rolling windows.
    # Convert time in seconds to timedelta
    time_index = pd.to_timedelta(df[time_col].values, unit='s') # type: ignore
    
    # Temporary DataFrame to hold the rolling operations
    temp_df = df.copy()
    temp_df.index = time_index
    
    cols_to_roll = sensor_cols + residual_cols
    
    for window in windows_s:
        # e.g., '10s'
        window_str = f"{window}s"
        
        # Calculate rolling statistics
        rolled = temp_df[cols_to_roll].rolling(window=window_str, min_periods=1)
        
        means = rolled.mean() # type: ignore
        variances = rolled.var() # type: ignore
        mins = rolled.min() # type: ignore
        maxs = rolled.max() # type: ignore
        
        # Reset index to align back with integer index of out_df
        means.reset_index(drop=True, inplace=True) # type: ignore
        variances.reset_index(drop=True, inplace=True) # type: ignore
        mins.reset_index(drop=True, inplace=True) # type: ignore
        maxs.reset_index(drop=True, inplace=True) # type: ignore
        
        # For variance, a window of size 1 yields NaN. Fill with 0.
        variances.fillna(0.0, inplace=True) # type: ignore
        
        # Add to out_df
        for col in cols_to_roll:
            out_df[f"{col}_roll_{window}_mean"] = means[col] # type: ignore
            out_df[f"{col}_roll_{window}_var"] = variances[col] # type: ignore
            out_df[f"{col}_roll_{window}_min"] = mins[col] # type: ignore
            out_df[f"{col}_roll_{window}_max"] = maxs[col] # type: ignore
            
    return out_df

def process_file_features(filepath: str, output_dir: str, windows_s: List[int]) -> None:
    df = pd.read_parquet(filepath)
    
    # Infer sensor columns and residual columns
    residual_cols = [c for c in df.columns if c.endswith("_residual")]
    # Assuming standard sensors are those that have a corresponding expected value
    sensor_cols = [c.replace("_residual", "") for c in residual_cols]
    
    out_df = compute_rolling_features(df, "time", windows_s, sensor_cols, residual_cols)
    
    fault_class = out_df["fault_class"].iloc[0] if "fault_class" in out_df.columns else "unknown"
    
    out_path = os.path.join(output_dir, f"fault_class={fault_class}")
    os.makedirs(out_path, exist_ok=True)
    out_file = os.path.join(out_path, os.path.basename(filepath))
    
    out_df.to_parquet(out_file, engine="pyarrow")

def _process_wrapper(args: Tuple[str, str, List[int]]) -> bool:
    filepath, output_dir, windows = args
    try:
        process_file_features(filepath, output_dir, windows)
        return True
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def generate_features(data_dir: str = "data_residuals", output_dir: str = "data_features", workers: int | None = None) -> None:
    if workers is None:
        workers = multiprocessing.cpu_count()
        
    files = glob.glob(os.path.join(data_dir, "**/*.parquet"), recursive=True)
    if not files:
        print(f"No parquet files found in {data_dir}")
        return
        
    print(f"Found {len(files)} files to process for feature engineering.")
    
    windows_s = [10, 30]
    tasks = [(f, output_dir, windows_s) for f in files]
    
    with multiprocessing.Pool(workers) as pool:
        results = pool.map(_process_wrapper, tasks)
        
    success_count = sum(results)
    print(f"Successfully processed {success_count} / {len(results)} files into {output_dir}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate feature engineered datasets")
    parser.add_argument("--data_dir", type=str, default="data_residuals", help="Input dataset directory")
    parser.add_argument("--out", type=str, default="data_features", help="Output directory")
    parser.add_argument("--workers", type=int, default=multiprocessing.cpu_count(), help="Number of parallel workers")
    
    args = parser.parse_args()
    generate_features(data_dir=args.data_dir, output_dir=args.out, workers=args.workers)
