# Comprehensive Model Diagnostic & Remediation Plan

## 1. Executive Summary
An extensive adversarial evaluation of the Hermes trained models was conducted against the explicit requirements outlined in `docs/archive/master.md`. While the models achieved >99% accuracy on the static test set, they fail critically when exposed to the real-world complexities of a MALE UAV mission. 

The models currently cannot handle transient maneuvers, fail to distinguish sensor drift from physical faults, mask compound faults, fail to predict dynamic Remaining Useful Life (RUL), and completely miss anomalies via the Isolation Forest.

This document details exactly why the models fail and provides the required technical fixes for the data generation and ML pipelines.

---

## 2. Identified Issues & Root Causes

### A. False Alarms During Transient Operations
* **Requirement:** Evaluate constraint-aware mission risk and what-if analysis.
* **The Failure:** When a perfectly healthy engine undergoes a sudden throttle jump or altitude change, XGBoost throws massive false alarms, predicting cylinder failures and sensor drifts.
* **Root Cause:** The training data lacks transient, dynamic missions. The models were trained on steady-state flights. When rolling window features encounter a transient spike in the physical residuals during a throttle jump, XGBoost misinterprets it as a fault.

### B. Masking of Compound Faults
* **Requirement:** Real-world health monitoring where multiple issues can co-occur.
* **The Failure:** When Misfire and Lubrication Issues were injected simultaneously, XGBoost only predicted Misfire. It is entirely blind to the second fault.
* **Root Cause:** XGBoost is currently trained using a `multi:softprob` objective, which enforces a single-label multiclass prediction. It forces the model to pick only one fault bucket per timestamp.

### C. Sensor vs. Physical Fault Confusion
* **Requirement:** Distinguish between a faulty sensor (e.g., CHT drift) and a physical engine fault (Cooling degradation).
* **The Failure:** XGBoost frequently misclassifies CHT Sensor Drift as physical Cooling Degradation.
* **Root Cause:** The model struggles to correlate multi-sensor residuals. Cooling degradation affects both CHT and Oil Temperature, while CHT drift only affects CHT. The current feature engineering or tree depth may not be isolating these cross-sensor dependencies effectively.

### D. RUL Insensitivity (The "Countdown Timer" Flaw)
* **Requirement:** Dynamic Remaining Useful Life estimation that reacts to degradation.
* **The Failure:** Injecting a catastrophic Severity=1.0 fault causes the LSTM RUL prediction to barely drop (e.g., from 0.99 hours to 0.88 hours).
* **Root Cause:** The RUL labels in `ml_pipeline/dataset.py` are calculated as simply `max_time - time` for every parquet file. However, the synthetic data generator currently runs for a fixed duration regardless of what faults are injected! Therefore, a catastrophic fault doesn't shorten the dataset length, so the LSTM is trained to believe that engines with catastrophic faults survive just as long as healthy engines. 

### E. Isolation Forest Complete Failure
* **Requirement:** Unknown-fault/open-set anomaly detection.
* **The Failure:** The Isolation Forest achieved 0% recall on anomalies, predicting all anomalous data as healthy.
* **Root Cause:** `train_isolation_forest.py` feeds a heavily mixed dataset (containing hundreds of thousands of fault states) into the `IsolationForest` with a very low `contamination` parameter (e.g., 0.01). The model establishes its "normal" boundary so wide that it encompasses the faults as well. 

---

## 3. The Remediation Plan (Fixing the Pipeline)

To achieve the vision outlined in `master.md`, the following pipeline updates must be implemented:

### Step 1: Overhaul Synthetic Data Generation
1. **Dynamic Mission Profiles:** Update `generate_datasets.py` to include highly transient missions (aggressive throttle changes, steep altitude climbs) for **healthy** engines. This forces the ML models to learn that transient residual spikes are normal.
2. **Failure Thresholds for RUL:** Modify the `Simulation` engine so that it terminates immediately if critical physical thresholds are breached (e.g., RPM drops below 1000, or CHT exceeds 250°C). This ensures that files involving severe faults are physically shorter, allowing `dataset.py` to calculate accurate, responsive `max_time - time` RUL labels.
3. **Compound Fault Data:** Generate training datasets where multiple faults are injected at varying severities to provide training examples of overlapping signatures.

### Step 2: Fix XGBoost (Multi-Label Classification)
XGBoost must be migrated from a single-class predictor to a multi-label predictor so it can detect compound faults.
* **Implementation:** Wrap XGBoost in scikit-learn's `MultiOutputClassifier` or train independent binary XGBoost models (one for each fault class). 
* **Target Schema:** The target `y` must be a one-hot encoded matrix where `[1, 0, 1, 0, 0]` means both Fault A and Fault C are currently active.

### Step 3: Fix the Isolation Forest
The anomaly detector must learn what a *truly healthy* engine looks like, including healthy transients, so it can flag anything out of distribution.
* **Implementation:** Change `train_isolation_forest.py` to **only** load data from `fault_class=healthy` directories during the `.fit()` phase. 
* **Parameter Tuning:** Use a realistic `contamination` rate (e.g., `0.001` or `0.01`) on the healthy data to account for extreme but normal noise. Test the fitted model by predicting on the fault datasets to ensure it flags them as `-1` (anomaly). Alternatively, replace it with a One-Class SVM (`sklearn.svm.OneClassSVM`).

### Step 4: Retrain and Re-Evaluate
1. Generate the new dynamic dataset.
2. Recompute residuals (`compute_residuals.py`).
3. Retrain XGBoost (Multi-label), LSTM (on the new physically-terminated RUL labels), and Isolation Forest (on healthy data only).
4. Re-run the extensive adversarial test script to verify that transient throttle maneuvers no longer trigger false positives and that RUL actively collapses when critical faults are injected.
