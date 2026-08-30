import pytest
import os
import shutil
import pandas as pd
from datasets.generate_mission import FaultScheduler
from datasets.generate_datasets import main as bulk_generate
from unittest.mock import patch

def test_fault_scheduler_cascading():
    # Force primary fault
    scheduler = FaultScheduler(max_time=100.0, force_fault_class="lubrication_issues")
    
    # Mock random to force a secondary fault
    with patch("random.random", return_value=0.1): # 10% < 30% chance
        with patch("random.choice", return_value="cylinder_failure"):
            with patch("random.uniform", return_value=50.0): # secondary injection at 50s
                # Re-initialize to trigger the mock
                scheduler = FaultScheduler(max_time=100.0, force_fault_class="lubrication_issues")
                # Need to manually set this since our mocks intercepted the init
                scheduler.injection_time = 10.0
                scheduler.secondary_fault_class = "cylinder_failure"
                scheduler.secondary_injection_time = 50.0

    # Before primary injection
    assert scheduler.get_severity(5.0, scheduler.injection_time) == 0.0
    assert scheduler.get_severity(5.0, scheduler.secondary_injection_time) == 0.0
    
    # After primary, before secondary
    assert scheduler.get_severity(25.0, scheduler.injection_time) > 0.0
    assert scheduler.get_severity(25.0, scheduler.secondary_injection_time) == 0.0
    
    # After secondary
    assert scheduler.get_severity(75.0, scheduler.injection_time) > 0.0
    assert scheduler.get_severity(75.0, scheduler.secondary_injection_time) > 0.0

def test_schema_and_clean_generation(tmp_path):
    output_dir = str(tmp_path / "data")
    
    # Write dummy file to ensure it gets wiped
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "dummy.txt"), "w") as f:
        f.write("test")
        
    with patch("sys.argv", ["generate_datasets.py", "--out", output_dir, "--num_missions", "2", "--workers", "1"]):
        bulk_generate()
        
    assert not os.path.exists(os.path.join(output_dir, "dummy.txt")), "Output directory was not wiped"
    
    # Find generated parquet file
    parquet_files = []
    for root, _, files in os.walk(output_dir):
        for f in files:
            if f.endswith(".parquet"):
                parquet_files.append(os.path.join(root, f))
                
    assert len(parquet_files) > 0, "No parquet files generated"
    
    # Check schema
    df = pd.read_parquet(parquet_files[0])
    expected_cols = [
        "egt_1", "egt_2", "egt_3", "egt_4",
        "secondary_fault_class", "secondary_fault_severity"
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing column {col} in generated dataset"
