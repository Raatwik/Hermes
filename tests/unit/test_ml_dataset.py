import os
import pandas as pd
import numpy as np
import pytest
import tempfile
import torch

from ml_pipeline.dataset import TelemetryDataset, get_dataloaders, DatasetConfig, discover_and_split

@pytest.fixture
def dummy_dataset_dir():
    # Create a temporary directory with some dummy parquet files
    with tempfile.TemporaryDirectory() as temp_dir:
        num_missions = 4
        # At 10Hz, let's create 15 seconds of data = 150 rows.
        # This will downsample to 15 rows.
        rows_per_mission = 150
        
        # Mission IDs
        mission_ids = ["mission_A", "mission_B", "mission_C", "mission_D"]
        
        for mission_id in mission_ids:
            time_arr = np.linspace(0, 14.9, rows_per_mission)
            df = pd.DataFrame({
                "time": time_arr,
                "rpm": np.random.rand(rows_per_mission),
                "rpm_residual": np.random.rand(rows_per_mission),
                "cht": np.random.rand(rows_per_mission),
                "throttle": np.ones(rows_per_mission),
                "fault_class": ["healthy"] * rows_per_mission,
                "ambient_temperature": np.ones(rows_per_mission),
                "mission_id": [mission_id] * rows_per_mission
            })
            
            file_path = os.path.join(temp_dir, f"{mission_id}.parquet")
            df.to_parquet(file_path)
            
        yield temp_dir

def test_telemetry_dataset_shapes_and_split(dummy_dataset_dir):
    config = DatasetConfig(window_size=5, downsample_rate=10)
    
    # 4 missions total, test_size=0.25 means 3 train, 1 val
    train_files, val_files = discover_and_split(dummy_dataset_dir, test_size=0.25, random_state=42)
    
    train_dataset = TelemetryDataset(file_paths=train_files, config=config)
    val_dataset = TelemetryDataset(file_paths=val_files, config=config)
    
    # 150 rows downsampled by 10 = 15 rows per file.
    # window_size = 5.
    # Windows per file = 15 - 5 + 1 = 11.
    # 3 train files -> 33 windows.
    # 1 val file -> 11 windows.
    assert len(train_dataset) == 33
    assert len(val_dataset) == 11
    
    # Check item
    features, target = train_dataset[0]
    
    # Based on the feature logic:
    # base_cols + residual_cols
    # residual_cols = ["rpm_residual"]
    # base_cols = ["rpm"]
    # Total features = 2
    assert features.shape == (config.window_size, 2)
    assert isinstance(features, torch.Tensor)
    assert isinstance(target, torch.Tensor)
    assert target.shape == ()

def test_dataloaders(dummy_dataset_dir):
    batch_size = 8
    config = DatasetConfig(window_size=10, downsample_rate=10)
    
    train_loader, val_loader = get_dataloaders(
        data_dir=dummy_dataset_dir,
        batch_size=batch_size,
        config=config
    )
    
    # Check shapes from dataloader
    batch_features, batch_targets = next(iter(train_loader))
    
    # features shape should be [batch_size, sequence_length, num_features]
    assert batch_features.shape == (batch_size, config.window_size, 2)
    assert batch_targets.shape == (batch_size,)
