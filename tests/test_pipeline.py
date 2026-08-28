import os
import tempfile
import yaml
import pandas as pd
import pytest

from datasets.generate_mission import parse_mission_config, run_pipeline, FaultScheduler, RUL_MAX


@pytest.fixture
def dummy_mission_yaml(tmp_path):
    yaml_content = """
    phases:
      - duration: 10
        throttle: 0.5
        altitude: 0
    """
    config_path = tmp_path / "config.yaml"
    config_path.write_text(yaml_content)
    return config_path


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
        assert hasattr(profile, "setpoints")
        setpoints = profile.setpoints
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

def test_parse_mission_config_with_ranges():
    yaml_content = """
    ambient_temp_offset: [-10.0, 10.0]
    phases:
      - duration: [50, 70]
        throttle: [0.2, 0.4]
        altitude: [0, 1000]
    """
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.yaml') as f:
        f.write(yaml_content)
        temp_path = f.name
    
    try:
        profile = parse_mission_config(temp_path)
        assert hasattr(profile, "setpoints")
        assert hasattr(profile, "ambient_temp_offset")
        
        amb_temp = profile.ambient_temp_offset
        assert -10.0 <= amb_temp <= 10.0
        
        setpoints = profile.setpoints
        assert len(setpoints) == 2
        
        # t=0
        assert setpoints[0]["time"] == 0
        assert 0.2 <= setpoints[0]["throttle"] <= 0.4
        assert 0 <= setpoints[0]["altitude"] <= 1000
        
        # t=end
        duration = setpoints[1]["time"]
        assert 50 <= duration <= 70
        assert setpoints[1]["throttle"] == setpoints[0]["throttle"]
        assert setpoints[1]["altitude"] == setpoints[0]["altitude"]
    finally:
        os.remove(temp_path)


def assert_expected_columns(df):
    assert "time" in df.columns
    assert "rpm" in df.columns
    assert "throttle" in df.columns
    assert "altitude" in df.columns
    assert "fault_class" in df.columns
    assert "fault_severity" in df.columns
    assert "flight_phase" in df.columns
    assert "Remaining_Useful_Life" in df.columns


def test_run_pipeline_healthy(tmp_path, dummy_mission_yaml):
    out_dir = tmp_path / "data"
    scheduler = FaultScheduler(10.0)
    scheduler.fault_class = "healthy"
    
    run_pipeline(str(dummy_mission_yaml), str(out_dir), scheduler=scheduler)
    
    partition_dir = out_dir / "fault_class=healthy"
    assert partition_dir.exists()
    
    df = pd.read_parquet(out_dir)
    assert_expected_columns(df)
    assert df["fault_class"].iloc[0] == "healthy"
    
    # RUL should be RUL_MAX for healthy
    assert df["Remaining_Useful_Life"].iloc[0] == RUL_MAX
    
    assert len(df) > 50


def test_run_pipeline_faulty(tmp_path, dummy_mission_yaml):
    out_dir = tmp_path / "data_faulty"
    scheduler = FaultScheduler(10.0)
    scheduler.fault_class = "misfire"
    scheduler.injection_time = 5.0
    
    run_pipeline(str(dummy_mission_yaml), str(out_dir), scheduler=scheduler)
    
    partition_dir = out_dir / "fault_class=misfire"
    assert partition_dir.exists()
    
    df = pd.read_parquet(out_dir)
    assert df["fault_class"].iloc[0] == "misfire"
    assert_expected_columns(df)
    
    # The initial RUL should be capped or correctly calculated
    # For a 10s mission, if max RUL is 500, it'll start at 10.0 and count down.
    # Because injection time is 5.0, at t=0, it should be capped at RUL_MAX (or rather just RUL_MAX since t < 5.0)
    assert df["Remaining_Useful_Life"].iloc[0] == RUL_MAX
    
    # And at the last row (t=10.0), it should be 0.0
    assert df["Remaining_Useful_Life"].iloc[-1] == pytest.approx(0.0, abs=1e-5)
    
    assert len(df) > 50
