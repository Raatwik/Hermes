import os
import joblib
import pandas as pd
import numpy as np
import torch
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import os
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(base_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ml_pipeline.inference import InferenceWrapper, XGBoostInferenceWrapper

def evaluate():
    print("Loading Djibouti features...")
    df = pd.read_parquet(os.path.join(base_dir, "djibouti_eval/data_features/fault_class=compound/djibouti_aligned.parquet"))
    
    # 1. XGBoost Inference
    print("Running XGBoost Inference...")
    xgb_wrapper = XGBoostInferenceWrapper(os.path.join(project_root, "models/xgb_model.joblib"))
    
    exclude_cols = [
        "time", "fault_class", "mission_id", "throttle", "altitude",
        "ambient_temperature", "ambient_pressure", "air_density",
        "flight_phase", "time_since_fault_injection", "fault_severity",
        "Remaining_Useful_Life",
        "secondary_fault_class", "secondary_fault_severity",
    ]
    xgb_feature_cols = [
        c for c in df.columns
        if c not in exclude_cols and pd.api.types.is_numeric_dtype(df[c])
    ]
    
    X_xgb = df[xgb_feature_cols].values
    xgb_preds = xgb_wrapper.predict(X_xgb)
    
    # 2. Isolation Forest Inference
    print("Running Isolation Forest Inference...")
    iso_model = joblib.load(os.path.join(project_root, "models/iso_forest.joblib"))
    iso_features = joblib.load(os.path.join(project_root, "models/iso_forest_features.joblib"))
    
    X_iso = df[iso_features].values
    iso_scores = iso_model.decision_function(X_iso)
    iso_preds = iso_model.predict(X_iso) # -1 is anomaly, 1 is normal
    
    # 3. LSTM RUL Inference
    print("Running LSTM Inference...")
    residual_cols = [c for c in df.columns if c.endswith("_residual")]
    base_cols = [c.replace("_residual", "") for c in residual_cols if c.replace("_residual", "") in df.columns]
    lstm_feature_cols = base_cols + residual_cols
    
    input_size = len(lstm_feature_cols)
    lstm_wrapper = InferenceWrapper(os.path.join(project_root, "models/best_lstm_model.pt"), input_size=input_size)
    
    window_size = 60
    lstm_data = df[lstm_feature_cols].values
    
    rul_means = [np.nan] * (window_size - 1)
    rul_stds = [np.nan] * (window_size - 1)
    
    windows = []
    for i in range(len(lstm_data) - window_size + 1):
        windows.append(lstm_data[i : i + window_size])
    
    # Batch predict
    batch_size = 128
    windows_tensor = torch.tensor(np.array(windows), dtype=torch.float32)
    
    for i in range(0, len(windows_tensor), batch_size):
        batch = windows_tensor[i : i + batch_size]
        means, stds = lstm_wrapper.predict(batch)
        rul_means.extend(means)
        rul_stds.extend(stds)
        
    df["RUL_Pred"] = rul_means
    df["RUL_Std"] = rul_stds
    df["Anomaly_Score"] = iso_scores
    
    # XGBoost predictions into a single string for plotting
    df["Predicted_Faults"] = [", ".join(p) if p else "Healthy" for p in xgb_preds]
    
    print("Generating Plot for the Judges...")
    
    fig, axs = plt.subplots(4, 1, figsize=(14, 16), sharex=True)
    
    time_hrs = df["time"] / 3600.0
    
    # Subplot 1: Altitude and Throttle
    ax1 = axs[0]
    ax1.plot(time_hrs, df["altitude"], label="Altitude (ft)", color="blue")
    ax1.set_ylabel("Altitude (ft)", color="blue")
    ax1.tick_params(axis="y", labelcolor="blue")
    
    ax1b = ax1.twinx()
    ax1b.plot(time_hrs, df["throttle"] * 100, label="Throttle (%)", color="green", alpha=0.6)
    ax1b.set_ylabel("Throttle (%)", color="green")
    ax1b.tick_params(axis="y", labelcolor="green")
    ax1.set_title("Djibouti Incident: Flight Profile (Altitude & Throttle)")
    ax1.grid(True, linestyle="--", alpha=0.5)
    
    # Subplot 2: Engine Metrics (RPM, Oil Pressure)
    ax2 = axs[1]
    ax2.plot(time_hrs, df["rpm"], label="RPM", color="purple")
    ax2.set_ylabel("RPM", color="purple")
    ax2.tick_params(axis="y", labelcolor="purple")
    
    ax2b = ax2.twinx()
    ax2b.plot(time_hrs, df["oil_pressure"], label="Oil Pressure (psi)", color="orange")
    ax2b.set_ylabel("Oil Pressure (psi)", color="orange")
    ax2b.tick_params(axis="y", labelcolor="orange")
    
    # Mark the ground truth incident points
    ax2.axvline(6.5, color='red', linestyle='--', alpha=0.7) # 23400s
    ax2.text(6.5, 4000, " Oil Pressure\n Spikes (6.5h)", color='red')
    
    ax2.axvline(7.75, color='red', linestyle='--', alpha=0.7) # 27900s
    ax2.text(7.75, 4500, " Oil Press\n Fluctuates (7.75h)", color='red')
    
    ax2.axvline(8.76, color='red', linestyle='--', alpha=0.7) # 31560s
    ax2.text(8.76, 3000, " Engine\n Erratic\n (8.76h)", color='red')
    
    ax2.set_title("Engine Telemetry & Actual Failure Events")
    ax2.grid(True, linestyle="--", alpha=0.5)
    
    # Subplot 3: XGBoost Fault Classification
    ax3 = axs[2]
    healthy_mask = df["Predicted_Faults"] == "Healthy"
    ax3.scatter(time_hrs[healthy_mask], [1]*sum(healthy_mask), color="green", label="Healthy", s=5)
    
    fault_mask = ~healthy_mask
    if sum(fault_mask) > 0:
        ax3.scatter(time_hrs[fault_mask], [1]*sum(fault_mask), color="red", label="Fault Detected", s=15)
        
        # Annotate some detected faults
        last_fault = ""
        for idx, row in df[fault_mask].iterrows():
            if row["Predicted_Faults"] != last_fault:
                ax3.text(row["time"]/3600.0, 1.05, row["Predicted_Faults"], color="red", rotation=45, fontsize=8)
                last_fault = row["Predicted_Faults"]
                
    ax3.set_yticks([])
    ax3.set_ylabel("Predicted State")
    ax3.set_title("XGBoost Fault Diagnostics (What the ML predicted)")
    ax3.legend(loc="upper left")
    
    # Subplot 4: LSTM Remaining Useful Life & Anomaly Score
    ax4 = axs[3]
    ax4.plot(time_hrs, df["RUL_Pred"], label="Predicted RUL (hrs)", color="blue")
    ax4.fill_between(time_hrs, 
                     df["RUL_Pred"] - df["RUL_Std"], 
                     df["RUL_Pred"] + df["RUL_Std"], 
                     color="blue", alpha=0.2, label="RUL Uncertainty")
                     
    ax4.set_ylabel("Remaining Useful Life (hrs)", color="blue")
    ax4.tick_params(axis="y", labelcolor="blue")
    
    ax4b = ax4.twinx()
    ax4b.plot(time_hrs, df["Anomaly_Score"], label="Anomaly Score (IsoForest)", color="red", alpha=0.5)
    ax4b.set_ylabel("Anomaly Score (Lower = More Anomalous)", color="red")
    ax4b.tick_params(axis="y", labelcolor="red")
    
    ax4.axhline(0, color='black', linewidth=1)
    ax4.set_title("LSTM RUL Prediction & Isolation Forest Anomaly Detection")
    
    lines1, labels1 = ax4.get_legend_handles_labels()
    lines2, labels2 = ax4b.get_legend_handles_labels()
    ax4.legend(lines1 + lines2, labels1 + labels2, loc="upper right")
    
    plt.xlabel("Time (Hours)")
    plt.tight_layout()
    out_path = os.path.join(base_dir, "djibouti_prediction_results.png")
    plt.savefig(out_path, dpi=300, bbox_inches="tight")
    print(f"Saved plot to {out_path}")
    
if __name__ == "__main__":
    evaluate()
