import os
import glob
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import classification_report, accuracy_score
import joblib

def load_data(data_dir: str, downsample_rate: int = 1) -> pd.DataFrame:
    """
    Loads all parquet files from data_dir, downsamples rows and casts float64 to float32
    to stay well within memory limits, extracts mission_id, and returns a DataFrame.
    """
    files = glob.glob(os.path.join(data_dir, "**/*.parquet"), recursive=True)
    dfs = []
    for f in files:
        df = pd.read_parquet(f)
        
        if downsample_rate > 1:
            df = df.iloc[::downsample_rate].copy()
            
        float_cols = df.select_dtypes(include=['float64']).columns
        if len(float_cols) > 0:
            df[float_cols] = df[float_cols].astype('float32')

        # Extract mission_id from filename
        mission_id = os.path.basename(f).replace(".parquet", "")
        
        # Ensure fault_class is present
        fault_class = "healthy"
        if "fault_class" in df.columns:
            fault_class = df["fault_class"].iloc[0]
        else:
            parts = f.split(os.sep)
            for p in parts:
                if p.startswith("fault_class="):
                    fault_class = p.split("=")[1]
                    break
            df["fault_class"] = fault_class
            
        # Dynamically set healthy label for pre-injection periods
        if "fault_severity" in df.columns:
            df.loc[df["fault_severity"] == 0.0, "fault_class"] = "healthy"
        elif "time_since_fault_injection" in df.columns:
            df.loc[df["time_since_fault_injection"] == 0.0, "fault_class"] = "healthy"

        df = df.assign(mission_id=mission_id)
        dfs.append(df)
        
    if not dfs:
        return pd.DataFrame()
        
    return pd.concat(dfs, ignore_index=True)

def train_model(data_dir: str = "data_features", output_model: str = "models/xgb_model.json", n_estimators: int = 100, downsample_rate: int = 1) -> xgb.XGBClassifier | None:
    df = load_data(data_dir, downsample_rate=downsample_rate)
    if df.empty:
        print("No data found")
        return None
        
    target_col = "fault_class"
    group_col = "mission_id"
    
    exclude_cols = [
        "time", target_col, group_col, "throttle", "altitude", 
        "ambient_temperature", "ambient_pressure", "air_density", 
        "flight_phase", "time_since_fault_injection", "fault_severity",
        "Remaining_Useful_Life",
        "secondary_fault_class", "secondary_fault_severity"
    ]
    
    feature_cols = [c for c in df.columns if c not in exclude_cols and pd.api.types.is_numeric_dtype(df[c])]
    
    X = df[feature_cols]
    y = df[target_col]
    groups = df[group_col]
    
    classes = np.unique(y)
    class_to_idx = {str(c): i for i, c in enumerate(classes)}
    y_encoded = y.map(class_to_idx) # type: ignore
    
    # Split using GroupShuffleSplit based on mission_id
    # To handle cases where we have very few groups (e.g. tests), 
    # we need to ensure we don't request more splits than available groups.
    num_groups = groups.nunique()
    if num_groups < 3:
        # For tiny toy datasets in tests, fallback to simple split without val set
        # Or just use the same train set for val
        X_train, y_train, groups_train = X, y_encoded, groups
        X_val, y_val = X, y_encoded
        X_test, y_test = X, y_encoded
    else:
        gss = GroupShuffleSplit(n_splits=1, train_size=0.7, random_state=42)
        train_idx, temp_idx = next(gss.split(X, y_encoded, groups))
        
        X_train, y_train, groups_train = X.iloc[train_idx], y_encoded.iloc[train_idx], groups.iloc[train_idx]
        X_temp, y_temp, groups_temp = X.iloc[temp_idx], y_encoded.iloc[temp_idx], groups.iloc[temp_idx]
        
        # Second split for val/test
        num_temp_groups = groups_temp.nunique()
        if num_temp_groups < 2:
            X_val, y_val = X_temp, y_temp
            X_test, y_test = X_temp, y_temp
        else:
            gss_test = GroupShuffleSplit(n_splits=1, train_size=0.5, random_state=42)
            val_idx, test_idx = next(gss_test.split(X_temp, y_temp, groups_temp))
            X_val, y_val = X_temp.iloc[val_idx], y_temp.iloc[val_idx]
            X_test, y_test = X_temp.iloc[test_idx], y_temp.iloc[test_idx]
    
    print(f"Train samples: {len(X_train)}, Val samples: {len(X_val)}, Test samples: {len(X_test)}")
    
    # Map back to int type
    y_train = y_train.astype(int)
    y_val = y_val.astype(int)
    y_test = y_test.astype(int)
    
    # Determine objective based on number of classes
    objective = "multi:softprob" if len(classes) > 2 else "binary:logistic"
    
    model = xgb.XGBClassifier(
        n_estimators=n_estimators,
        max_depth=6,
        learning_rate=0.1,
        objective=objective,
        eval_metric="mlogloss" if len(classes) > 2 else "logloss",
        random_state=42,
        early_stopping_rounds=10
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )
    
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)
    
    print("Test Accuracy:", accuracy_score(y_test, preds))
    if len(classes) > 1:
        target_names = [c for c, i in sorted(class_to_idx.items(), key=lambda x: x[1])]
        # classification_report handles both binary and multiclass
        try:
            print(classification_report(y_test, preds, target_names=target_names))
        except ValueError:
            pass # Ignore if not all classes are present in test set
            
    os.makedirs(os.path.dirname(output_model), exist_ok=True)
    model.save_model(output_model)
    joblib.dump(class_to_idx, output_model.replace(".json", "_classes.joblib"))
    
    return model

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Train XGBoost Classifier")
    parser.add_argument("--data_dir", type=str, default="data_features", help="Input dataset directory")
    parser.add_argument("--out", type=str, default="models/xgb_model.json", help="Output model path")
    parser.add_argument("--downsample_rate", type=int, default=5, help="Row downsampling stride for memory safety")
    
    args = parser.parse_args()
    train_model(data_dir=args.data_dir, output_model=args.out, downsample_rate=args.downsample_rate)
