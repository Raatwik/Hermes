import os
import tempfile
import pandas as pd
import numpy as np
import pytest
from sklearn.metrics import accuracy_score

from ml_pipeline.train_xgboost import train_model, load_data

def test_xgboost_pipeline_overfit():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a tiny toy dataset
        # 2 missions of healthy, 2 missions of faulty
        
        def create_mission(mission_id, fault_class, base_rpm):
            return pd.DataFrame({
                "time": np.arange(10),
                "rpm_roll_10_mean": np.random.normal(base_rpm, 1.0, 10),
                "cht_roll_10_mean": np.random.normal(base_rpm * 0.5, 1.0, 10),
                "rpm_residual": np.random.normal(0 if fault_class == "healthy" else 50, 1.0, 10),
                "fault_class": [fault_class] * 10
            })
            
        m1 = create_mission("m1", "healthy", 1000)
        m2 = create_mission("m2", "healthy", 1000)
        m3 = create_mission("m3", "sensor_drift", 1100)
        m4 = create_mission("m4", "sensor_drift", 1100)
        
        # Save to temp dir
        os.makedirs(os.path.join(tmpdir, "fault_class=healthy"))
        os.makedirs(os.path.join(tmpdir, "fault_class=sensor_drift"))
        
        m1.to_parquet(os.path.join(tmpdir, "fault_class=healthy", "m1.parquet"))
        m2.to_parquet(os.path.join(tmpdir, "fault_class=healthy", "m2.parquet"))
        m3.to_parquet(os.path.join(tmpdir, "fault_class=sensor_drift", "m3.parquet"))
        m4.to_parquet(os.path.join(tmpdir, "fault_class=sensor_drift", "m4.parquet"))
        
        # Train model (using small n_estimators)
        model_path = os.path.join(tmpdir, "model.json")
        model = train_model(data_dir=tmpdir, output_model=model_path, n_estimators=5)
        
        assert model is not None
        assert os.path.exists(model_path)
        
        # Load and test prediction
        df = load_data(tmpdir)
        # Assuming feature columns are ones except time, fault_class, mission_id
        feature_cols = [c for c in df.columns if c not in ["time", "fault_class", "mission_id"]]
        
        X = df[feature_cols]
        probs = model.predict_proba(X)
        
        # Probs should be output
        assert probs.shape == (40, 2)
        
        preds = model.predict(X)
        
        # Ensure it learned the basic signature (accuracy > 0.8)
        import joblib
        classes = joblib.load(model_path.replace(".json", "_classes.joblib"))
        y_true = df["fault_class"].map(classes)
        
        acc = accuracy_score(y_true, preds)
        assert acc > 0.8
