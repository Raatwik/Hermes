import os
import glob
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import GroupShuffleSplit
from sklearn.multioutput import MultiOutputClassifier
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score
import joblib

ALL_FAULT_LABELS = sorted([
    "cooling_degradation", "cylinder_failure", "injector_abnormalities",
    "lubrication_issues", "misfire", "sensor_drift",
])

def load_data(data_dir: str, downsample_rate: int = 1) -> pd.DataFrame:
    files = glob.glob(os.path.join(data_dir, "**/*.parquet"), recursive=True)
    dfs = []
    for f in files:
        df = pd.read_parquet(f)

        if downsample_rate > 1:
            df = df.iloc[::downsample_rate].copy()

        float_cols = df.select_dtypes(include=['float64']).columns
        if len(float_cols) > 0:
            df[float_cols] = df[float_cols].astype('float32')

        mission_id = os.path.basename(f).replace(".parquet", "")

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

        if "fault_severity" in df.columns:
            df.loc[df["fault_severity"] == 0.0, "fault_class"] = "healthy"
        elif "time_since_fault_injection" in df.columns:
            df.loc[df["time_since_fault_injection"] == 0.0, "fault_class"] = "healthy"

        if "secondary_fault_class" not in df.columns:
            df["secondary_fault_class"] = "none"
        if "secondary_fault_severity" not in df.columns:
            df["secondary_fault_severity"] = 0.0

        df.loc[df["secondary_fault_severity"] == 0.0, "secondary_fault_class"] = "none"

        df = df.assign(mission_id=mission_id)
        dfs.append(df)

    if not dfs:
        return pd.DataFrame()

    return pd.concat(dfs, ignore_index=True)


def _build_onehot(df: pd.DataFrame, label_names: list[str]) -> np.ndarray:
    # "compound" rows: fault_class="compound" won't match any label, so only
    # secondary_fault_class is captured. The primary fault name is not stored
    # in the dataset — a data-generation limitation, not a model one.
    y = np.zeros((len(df), len(label_names)), dtype=np.int32)
    for i, label in enumerate(label_names):
        is_primary = df["fault_class"] == label
        is_secondary = df["secondary_fault_class"] == label
        y[:, i] = (is_primary | is_secondary).astype(np.int32)
    return y


def train_model(
    data_dir: str = "data_features",
    output_model: str = "models/xgb_model.joblib",
    n_estimators: int = 100,
    downsample_rate: int = 1,
) -> MultiOutputClassifier | None:
    df = load_data(data_dir, downsample_rate=downsample_rate)
    if df.empty:
        print("No data found")
        return None

    group_col = "mission_id"

    exclude_cols = [
        "time", "fault_class", group_col, "throttle", "altitude",
        "ambient_temperature", "ambient_pressure", "air_density",
        "flight_phase", "time_since_fault_injection", "fault_severity",
        "Remaining_Useful_Life",
        "secondary_fault_class", "secondary_fault_severity",
    ]

    feature_cols = [
        c for c in df.columns
        if c not in exclude_cols and pd.api.types.is_numeric_dtype(df[c])
    ]

    X = df[feature_cols]
    y = _build_onehot(df, ALL_FAULT_LABELS)
    groups = df[group_col]

    num_groups = groups.nunique()
    if num_groups < 3:
        X_train, y_train = X, y
        X_val, y_val = X, y
        X_test, y_test = X, y
    else:
        gss = GroupShuffleSplit(n_splits=1, train_size=0.7, random_state=42)
        train_idx, temp_idx = next(gss.split(X, y, groups))

        X_train, y_train = X.iloc[train_idx], y[train_idx]
        X_temp, y_temp = X.iloc[temp_idx], y[temp_idx]
        groups_temp = groups.iloc[temp_idx]

        num_temp_groups = groups_temp.nunique()
        if num_temp_groups < 2:
            X_val, y_val = X_temp, y_temp
            X_test, y_test = X_temp, y_temp
        else:
            gss_test = GroupShuffleSplit(n_splits=1, train_size=0.5, random_state=42)
            val_idx, test_idx = next(gss_test.split(X_temp, y_temp, groups_temp))
            X_val, y_val = X_temp.iloc[val_idx], y_temp[val_idx]
            X_test, y_test = X_temp.iloc[test_idx], y_temp[test_idx]

    print(f"Train samples: {len(X_train)}, Val samples: {len(X_val)}, Test samples: {len(X_test)}")

    # Some label columns may be constant in small datasets; swap in a
    # DummyClassifier for those columns so XGBoost doesn't error.
    per_label_estimators: list = []
    for i in range(y_train.shape[1]):
        col = y_train[:, i]
        if len(np.unique(col)) < 2:
            est = DummyClassifier(strategy="constant", constant=int(col[0]))
            est.fit(X_train, col)
            per_label_estimators.append(est)
        else:
            est = xgb.XGBClassifier(
                n_estimators=n_estimators,
                max_depth=6,
                learning_rate=0.1,
                objective="binary:logistic",
                eval_metric="logloss",
                random_state=42,
            )
            est.fit(X_train, col)
            per_label_estimators.append(est)

    model = MultiOutputClassifier(xgb.XGBClassifier())
    model.estimators_ = per_label_estimators

    preds = model.predict(X_test)

    for i, label in enumerate(ALL_FAULT_LABELS):
        acc = accuracy_score(y_test[:, i], preds[:, i])
        print(f"  {label}: accuracy={acc:.3f}")

    os.makedirs(os.path.dirname(output_model) or ".", exist_ok=True)
    joblib.dump({"model": model, "labels": ALL_FAULT_LABELS}, output_model)

    return model


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Train Multi-Label XGBoost Classifier")
    parser.add_argument("--data_dir", type=str, default="data_features", help="Input dataset directory")
    parser.add_argument("--out", type=str, default="models/xgb_model.joblib", help="Output model path")
    parser.add_argument("--downsample_rate", type=int, default=5, help="Row downsampling stride for memory safety")

    args = parser.parse_args()
    train_model(data_dir=args.data_dir, output_model=args.out, downsample_rate=args.downsample_rate)
