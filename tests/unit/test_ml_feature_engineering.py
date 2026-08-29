import pandas as pd
import numpy as np
import pytest

from ml_pipeline.feature_engineering import compute_rolling_features

def test_compute_rolling_features_math():
    time_steps = 50
    # dt = 1.0s to make it easy. time ranges from 0 to 49
    df = pd.DataFrame({
        "time": np.arange(time_steps, dtype=float),
        "rpm": np.linspace(1000, 1049, time_steps),
        "rpm_residual": np.ones(time_steps) * 5.0,
        "fault_class": ["healthy"] * time_steps
    })

    windows_s = [10, 30]
    sensor_cols = ["rpm"]
    residual_cols = ["rpm_residual"]

    out_df = compute_rolling_features(df, time_col="time", windows_s=windows_s, sensor_cols=sensor_cols, residual_cols=residual_cols)

    assert "rpm_roll_10_mean" in out_df.columns
    assert "rpm_residual_roll_30_var" in out_df.columns
    assert "rpm_roll_10_min" in out_df.columns
    assert "rpm_roll_10_max" in out_df.columns

    # check lengths
    assert len(out_df) == time_steps

    # test window = 10 at index 9 (time 9.0). Contains times 0 to 9 (10 points)
    # The mean of 1000 to 1009 is 1004.5
    assert np.isclose(out_df.loc[9, "rpm_roll_10_mean"], 1004.5)
    assert np.isclose(out_df.loc[9, "rpm_roll_10_min"], 1000.0)
    assert np.isclose(out_df.loc[9, "rpm_roll_10_max"], 1009.0)
    
    # pandas sample variance of 1000 to 1009
    expected_var = np.var(np.arange(1000, 1010), ddof=1)
    assert np.isclose(out_df.loc[9, "rpm_roll_10_var"], expected_var)

    # residual is constant
    assert np.isclose(out_df.loc[29, "rpm_residual_roll_30_var"], 0.0)
    assert np.isclose(out_df.loc[29, "rpm_residual_roll_30_mean"], 5.0)

    # test the padding/NaNs
    # Before the window is fully formed, pandas still computes for the partial window if we don't set min_periods,
    # or it sets NaN. Let's assume we want min_periods=1, so index 0 has a mean of 1000.
    assert np.isclose(out_df.loc[0, "rpm_roll_10_mean"], 1000.0)

