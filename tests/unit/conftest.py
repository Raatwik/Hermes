import numpy as np
import pandas as pd


def make_test_mission(mission_id, fault_class, secondary_fault_class="none", n=20):
    base_rpm = 1000 if fault_class == "healthy" else 1100
    secondary_bump = 30 if secondary_fault_class != "none" else 0
    return pd.DataFrame({
        "time": np.arange(n, dtype=float),
        "rpm_roll_10_mean": np.random.normal(base_rpm, 1.0, n).astype("float32"),
        "cht_roll_10_mean": np.random.normal(base_rpm * 0.5, 1.0, n).astype("float32"),
        "rpm_residual": np.random.normal(
            0 if fault_class == "healthy" else 50 + secondary_bump, 1.0, n
        ).astype("float32"),
        "fault_class": [fault_class] * n,
        "fault_severity": [0.0 if fault_class == "healthy" else 0.5] * n,
        "secondary_fault_class": [secondary_fault_class] * n,
        "secondary_fault_severity": [0.0 if secondary_fault_class == "none" else 0.4] * n,
    })
