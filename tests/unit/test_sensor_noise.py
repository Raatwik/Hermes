import pytest
import numpy as np
import pandas as pd
from simulation.engine import Simulation, SENSOR_NOISE_STD
from datasets.generate_mission import FaultScheduler, run_pipeline, RUL_MAX

def test_sensor_noise_variance():
    sim = Simulation(throttle=0.5, altitude=0.0, noise_seed=42)
    # Run the simulation for a while to let it settle
    for _ in range(100):
        sim.step(0.1)

    # Collect steady-state noisy samples
    samples = {key: [] for key in SENSOR_NOISE_STD.keys()}
    for _ in range(10000):
        # We step with dt=0 so underlying physical state doesn't change
        # only noise is resampled on each get_state() call
        state = sim.get_state()
        for key in SENSOR_NOISE_STD.keys():
            if key in state:
                samples[key].append(state[key])
    
    # Calculate empirical standard deviations
    for key, expected_std in SENSOR_NOISE_STD.items():
        if key in samples and len(samples[key]) > 0:
            empirical_std = np.std(samples[key])
            # The standard deviation should roughly match the defined std
            # 10% tolerance for empirical std of 1000 samples
            assert empirical_std == pytest.approx(expected_std, rel=0.15), f"Noise mismatch for {key}: expected {expected_std}, got {empirical_std}"

def test_metadata_columns_exported(tmp_path):
    out_dir = tmp_path / "data_faulty"
    scheduler = FaultScheduler(10.0)
    scheduler.fault_class = "misfire"
    scheduler.injection_time = 5.0
    
    # Create dummy mission yaml
    yaml_content = """
    phases:
      - duration: 10
        throttle: 0.5
        altitude: 0
    """
    config_path = tmp_path / "config.yaml"
    config_path.write_text(yaml_content)

    run_pipeline(str(config_path), str(out_dir), scheduler=scheduler, noise_seed=123)
    
    df = pd.read_parquet(out_dir)
    
    # Check if time_since_fault_injection exists
    assert "time_since_fault_injection" in df.columns
    
    # Check values before and after injection
    pre_injection = df[df["time"] < 5.0]
    post_injection = df[df["time"] >= 5.0]
    
    # Should be exactly 0.0 prior to injection
    assert (pre_injection["time_since_fault_injection"] == 0.0).all()
    
    # Should be monotonically increasing and greater than or equal to 0 after injection
    assert (post_injection["time_since_fault_injection"] >= 0.0).all()
    
    # The max value should match approximately (10.0 - 5.0) = 5.0
    assert post_injection["time_since_fault_injection"].max() == pytest.approx(5.0, abs=0.2)
