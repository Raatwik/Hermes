import os
import tempfile
import yaml
import pandas as pd
import pytest

from datasets.generate_baseline import parse_mission_config, run_pipeline

def test_parse_mission_config():
    yaml_content = """
    phases:
      - duration: 60
        throttle: 0.3
        altitude: 0
      - duration: 240
        throttle: 0.8
        altitude: 3000
      - duration: 100
        throttle: 0.5
        altitude: 3000
    """
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.yaml') as f:
        f.write(yaml_content)
        temp_path = f.name
    
    try:
        profile = parse_mission_config(temp_path)
        assert "setpoints" in profile
        setpoints = profile["setpoints"]
        assert len(setpoints) == 6
        # t=0
        assert setpoints[0]["time"] == 0
        assert setpoints[0]["throttle"] == 0.3
        assert setpoints[0]["altitude"] == 0
        # t=60
        assert setpoints[1]["time"] == 60
        assert setpoints[1]["throttle"] == 0.3
        assert setpoints[1]["altitude"] == 0
        # t=60 (phase 2 start)
        assert setpoints[2]["time"] == 60
        assert setpoints[2]["throttle"] == 0.8
        assert setpoints[2]["altitude"] == 3000
        # t=300 (phase 2 end)
        assert setpoints[3]["time"] == 300
        assert setpoints[3]["throttle"] == 0.8
        assert setpoints[3]["altitude"] == 3000
        # t=300 (phase 3 start)
        assert setpoints[4]["time"] == 300
        assert setpoints[4]["throttle"] == 0.5
        assert setpoints[4]["altitude"] == 3000
        # t=400 (phase 3 end)
        assert setpoints[5]["time"] == 400
        assert setpoints[5]["throttle"] == 0.5
        assert setpoints[5]["altitude"] == 3000
    finally:
        os.remove(temp_path)

def test_run_pipeline(tmp_path):
    yaml_content = """
    phases:
      - duration: 10
        throttle: 0.5
        altitude: 0
    """
    config_path = tmp_path / "config.yaml"
    config_path.write_text(yaml_content)
    
    out_dir = tmp_path / "data"
    
    run_pipeline(str(config_path), str(out_dir))
    
    # Check that parquet file was created in partition
    partition_dir = out_dir / "fault_class=healthy"
    assert partition_dir.exists()
    
    parquet_files = list(partition_dir.glob("*.parquet"))
    assert len(parquet_files) > 0
    
    # Read the data and check via pyarrow dataset to keep partition columns
    df = pd.read_parquet(out_dir)
    assert "time" in df.columns
    assert "rpm" in df.columns
    assert "ambient_temperature" in df.columns
    assert "fault_class" in df.columns
    assert df["fault_class"].iloc[0] == "healthy"
    
    # We should have approximately 100 rows since duration=10 and dt=0.1
    # Plus maybe the initial row at t=0
    assert len(df) > 50
