import os
import shutil
import tempfile
import pytest
import pandas as pd
from unittest import mock

from datasets.generate_mission import run_pipeline, MissionProfile
from ml_pipeline.compute_residuals import compute_residuals_for_file

@pytest.fixture
def temp_data_dir():
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d)

def test_residual_generation_healthy_run(temp_data_dir):
    # 1. Generate a tiny healthy mission
    profile = MissionProfile(
        setpoints=[
            {"time": 0.0, "throttle": 0.5, "altitude": 0.0},
            {"time": 1.0, "throttle": 0.5, "altitude": 0.0},
        ],
        ambient_temp_offset=0.0,
        phase_intervals=[]
    )
    
    mock_scheduler = mock.Mock()
    mock_scheduler.fault_class = "healthy"
    mock_scheduler.injection_time = 10.0
    mock_scheduler.get_severity.return_value = 0.0
    
    run_pipeline(
        profile=profile,
        output_dir=os.path.join(temp_data_dir, "raw"),
        dt=0.1,
        scheduler=mock_scheduler,
        noise_seed=None # Clean deterministic run
    )
    
    # 2. Find the generated file
    raw_files = []
    for root, _, files in os.walk(os.path.join(temp_data_dir, "raw")):
        for f in files:
            if f.endswith(".parquet"):
                raw_files.append(os.path.join(root, f))
                
    assert len(raw_files) == 1
    input_file = raw_files[0]
    
    # 3. Compute residuals
    out_dir = os.path.join(temp_data_dir, "residuals")
    compute_residuals_for_file(input_file, out_dir)
    
    # 4. Check the output
    res_files = []
    for root, _, files in os.walk(out_dir):
        for f in files:
            if f.endswith(".parquet"):
                res_files.append(os.path.join(root, f))
                
    assert len(res_files) == 1
    output_file = res_files[0]
    
    df = pd.read_parquet(output_file)
    
    # 5. Assert that a clean healthy run without noise yields ~0.0 residuals
    assert "rpm_expected" in df.columns
    assert "rpm_residual" in df.columns
    
    # Since we used the exact same clean simulation logic, residuals should be virtually zero
    assert df["rpm_residual"].abs().max() < 1e-3
    assert df["cht_residual"].abs().max() < 1e-3
    assert df["fault_class"].iloc[0] == "healthy"
