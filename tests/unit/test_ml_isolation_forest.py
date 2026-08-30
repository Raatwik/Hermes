import os
import tempfile
import pandas as pd
import numpy as np
import pytest
from tests.unit.conftest import make_test_mission
from ml_pipeline.train_isolation_forest import train_isolation_forest
from ml_pipeline.train_xgboost import load_data

def test_isolation_forest_flags_outlier():
    with tempfile.TemporaryDirectory() as tmpdir:
        def create_mission(mission_id, fault_class, base_rpm):
            return pd.DataFrame({
                "time": np.arange(20),
                "rpm_roll_10_mean": np.random.normal(base_rpm, 2.0, 20),
                "cht_roll_10_mean": np.random.normal(base_rpm * 0.5, 2.0, 20),
                "rpm_residual": np.random.normal(0 if fault_class == "healthy" else 30, 2.0, 20),
                "fault_class": [fault_class] * 20
            })
            
        m1 = create_mission("m1", "healthy", 1000)
        m2 = create_mission("m2", "healthy", 1000)
        m3 = create_mission("m3", "sensor_drift", 1100)
        
        # Save training data
        os.makedirs(os.path.join(tmpdir, "fault_class=healthy"))
        os.makedirs(os.path.join(tmpdir, "fault_class=sensor_drift"))
        
        m1.to_parquet(os.path.join(tmpdir, "fault_class=healthy", "m1.parquet"))
        m2.to_parquet(os.path.join(tmpdir, "fault_class=healthy", "m2.parquet"))
        m3.to_parquet(os.path.join(tmpdir, "fault_class=sensor_drift", "m3.parquet"))
        
        # Train model
        model_path = os.path.join(tmpdir, "iso_forest.joblib")
        model = train_isolation_forest(data_dir=tmpdir, output_model=model_path, contamination=0.05)
        
        assert model is not None
        assert os.path.exists(model_path)
        
        # Create an extreme outlier (RPM=5000, which is totally unseen)
        outlier_df = pd.DataFrame({
            "time": [0, 1],
            "rpm_roll_10_mean": [5000, 5000],
            "cht_roll_10_mean": [2500, 2500],
            "rpm_residual": [1000, 1000],
            "fault_class": ["unknown", "unknown"],
            "mission_id": ["outlier1", "outlier1"]
        })
        
        normal_df = pd.DataFrame({
            "time": [0, 1],
            "rpm_roll_10_mean": [1000, 1000],
            "cht_roll_10_mean": [500, 500],
            "rpm_residual": [0, 0],
            "fault_class": ["healthy", "healthy"],
            "mission_id": ["normal1", "normal1"]
        })
        
        test_df = pd.concat([normal_df, outlier_df], ignore_index=True)
        feature_cols = [c for c in test_df.columns if c not in ["time", "fault_class", "mission_id"]]
        
        X_test = test_df[feature_cols]
        
        # Predict: 1 for normal, -1 for outlier
        preds = model.predict(X_test)
        
        # Normal data should be 1
        assert (preds[0:2] == 1).all()
        # Outlier data should be -1
        assert (preds[2:4] == -1).all()
        
        # Ensure we can also get the scores
        scores = model.decision_function(X_test)
        # Scores are lower for outliers
        assert scores[2] < scores[0]


def test_tightened_isolation_forest_detects_faulty_rows():
    with tempfile.TemporaryDirectory() as tmpdir:
        np.random.seed(42)

        healthy1 = make_test_mission("h1", "healthy", n=50)
        healthy2 = make_test_mission("h2", "healthy", n=50)
        faulty = make_test_mission("f1", "sensor_drift", n=20)

        os.makedirs(os.path.join(tmpdir, "fault_class=healthy"))
        os.makedirs(os.path.join(tmpdir, "fault_class=sensor_drift"))

        healthy1.to_parquet(os.path.join(tmpdir, "fault_class=healthy", "h1.parquet"))
        healthy2.to_parquet(os.path.join(tmpdir, "fault_class=healthy", "h2.parquet"))
        faulty.to_parquet(os.path.join(tmpdir, "fault_class=sensor_drift", "f1.parquet"))

        model_path = os.path.join(tmpdir, "iso_forest.joblib")
        model = train_isolation_forest(data_dir=tmpdir, output_model=model_path)

        assert model is not None

        feature_cols = [
            c for c in healthy1.columns
            if c not in [
                "time", "fault_class", "mission_id", "fault_severity",
                "secondary_fault_class", "secondary_fault_severity",
            ]
            and pd.api.types.is_numeric_dtype(healthy1[c])
        ]

        healthy_preds = model.predict(healthy1[feature_cols])
        faulty_preds = model.predict(faulty[feature_cols])

        assert (healthy_preds == 1).sum() > len(healthy_preds) * 0.8
        assert (faulty_preds == -1).sum() > len(faulty_preds) * 0.5
