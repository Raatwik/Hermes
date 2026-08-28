import os
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib

# We can reuse load_data from train_xgboost
from ml_pipeline.train_xgboost import load_data

def train_isolation_forest(data_dir: str = "data_features", output_model: str = "models/iso_forest.joblib", contamination: float | str = "auto") -> IsolationForest | None:
    """
    Trains an Isolation Forest model on a mixed dataset of healthy and faulty missions
    to detect out-of-distribution behaviors.
    """
    df = load_data(data_dir)
    if df.empty:
        print("No data found")
        return None
        
    # Exclude non-feature columns
    exclude_cols = [
        "time", "fault_class", "mission_id", "throttle", "altitude", 
        "ambient_temperature", "ambient_pressure", "air_density", 
        "flight_phase", "time_since_fault_injection"
    ]
    
    feature_cols = [c for c in df.columns if c not in exclude_cols and pd.api.types.is_numeric_dtype(df[c])]
    
    X = df[feature_cols]
    
    print(f"Training Isolation Forest on {len(X)} samples with {len(feature_cols)} features...")
    
    model = IsolationForest(
        n_estimators=100,
        contamination=contamination, # type: ignore
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X)
    
    # Check predictions on training data to log metrics
    preds = model.predict(X)
    num_outliers = (preds == -1).sum()
    print(f"Training complete. Flagged {num_outliers}/{len(X)} ({num_outliers/len(X)*100:.2f}%) samples as anomalies in the training set.")
    
    os.makedirs(os.path.dirname(output_model), exist_ok=True)
    joblib.dump(model, output_model)
    
    # Save the feature columns so inference code knows what to pass
    joblib.dump(feature_cols, output_model.replace(".joblib", "_features.joblib"))
    
    return model

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Train Isolation Forest Anomaly Detector")
    parser.add_argument("--data_dir", type=str, default="data_features", help="Input dataset directory")
    parser.add_argument("--out", type=str, default="models/iso_forest.joblib", help="Output model path")
    parser.add_argument("--contamination", type=float, default=0.01, help="Expected proportion of outliers")
    
    args = parser.parse_args()
    train_isolation_forest(data_dir=args.data_dir, output_model=args.out, contamination=args.contamination)
