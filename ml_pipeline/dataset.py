import os
import glob
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import GroupShuffleSplit
from typing import List, Tuple
from dataclasses import dataclass
from enum import Enum

class Split(Enum):
    TRAIN = "train"
    VAL = "val"

@dataclass
class DatasetConfig:
    window_size: int = 60
    downsample_rate: int = 10

def discover_and_split(data_dir: str, test_size: float = 0.2, random_state: int = 42) -> Tuple[List[str], List[str]]:
    """
    Discovers all parquet files in data_dir and performs a train/val split
    strictly grouped by Mission ID (filename).
    """
    files = glob.glob(os.path.join(data_dir, "**/*.parquet"), recursive=True)
    if not files:
        raise ValueError(f"No parquet files found in {data_dir}")
        
    file_mission_ids = [os.path.basename(f).replace(".parquet", "") for f in files]
    df_files = pd.DataFrame({'file': files, 'mission_id': file_mission_ids})
    groups = df_files['mission_id']
    
    if df_files['mission_id'].nunique() < 2:
        raise ValueError("Not enough missions to perform a strict train/val split.")
        
    gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_idx, val_idx = next(gss.split(df_files, groups=groups))
    
    train_files = df_files.iloc[train_idx]['file'].tolist()
    val_files = df_files.iloc[val_idx]['file'].tolist()
    
    return train_files, val_files

class TelemetryDataset(Dataset):
    """
    PyTorch Dataset for engine telemetry and residuals.
    Reads provided Parquet files, downsamples, and generates sliding windows.
    Returns only the concatenated features (base + residuals).
    """
    def __init__(self, file_paths: List[str], config: DatasetConfig):
        self.config = config
        self.data_windows = []
        self.targets = []
        self.feature_cols = None
        
        # Load and slice into sliding windows
        for f in file_paths:
            df = pd.read_parquet(f)
            
            # Downsample
            df = df.iloc[::self.config.downsample_rate].reset_index(drop=True)
            
            # Identify columns on first file
            if self.feature_cols is None:
                residual_cols = [c for c in df.columns if c.endswith("_residual")]
                base_cols = [c.replace("_residual", "") for c in residual_cols if c.replace("_residual", "") in df.columns]
                self.feature_cols = base_cols + residual_cols
            
            if not self.feature_cols:
                continue
                
            features = df[self.feature_cols].values
            num_steps = len(features)
            
            # RUL (Remaining Useful Life) in hours
            if num_steps > 0:
                if 'time' in df.columns:
                    max_time = df['time'].iloc[-1]
                    # Assuming time is in seconds, convert to hours
                    rul_values = (max_time - df['time']).values / 3600.0
                else:
                    # Fallback: assume 1 Hz downsampled frequency = seconds
                    rul_values = pd.Series(range(num_steps))[::-1].values / 3600.0
            else:
                rul_values = []
            
            # Create sliding windows
            num_windows = num_steps - self.config.window_size + 1
            for i in range(num_windows):
                window = features[i:i + self.config.window_size]
                target = rul_values[i + self.config.window_size - 1]
                self.data_windows.append(window)
                self.targets.append(target)
                
    def __len__(self) -> int:
        return len(self.data_windows)
        
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        window = self.data_windows[idx]
        target = self.targets[idx]
        return torch.tensor(window, dtype=torch.float32), torch.tensor(target, dtype=torch.float32)

def get_dataloaders(data_dir: str, batch_size: int = 32, config: DatasetConfig = None, num_workers: int = 0) -> Tuple[DataLoader, DataLoader]:
    if config is None:
        config = DatasetConfig()
        
    train_files, val_files = discover_and_split(data_dir)
    
    train_dataset = TelemetryDataset(train_files, config)
    val_dataset = TelemetryDataset(val_files, config)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    
    return train_loader, val_loader
