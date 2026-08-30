# 01 — Multi-Label XGBoost & Inference

**What to build:** Migrates the XGBoost fault classifier from single-label to multi-label to correctly identify compound, overlapping faults. The model will be wrapped in scikit-learn's `MultiOutputClassifier` and trained on a one-hot matrix. The downstream `inference.py` script must be updated to parse this new 2D array output and return a clean list of all concurrently active faults.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `train_xgboost.py` processes the target `y` into a 2D one-hot encoded matrix.
- [x] XGBoost is wrapped in `sklearn.multioutput.MultiOutputClassifier` during `.fit()`.
- [x] `inference.py` correctly parses the `MultiOutputClassifier` output array and maps it back to multiple active fault strings (e.g. `["sensor_drift", "cylinder_failure"]`).
- [x] Mock data unit tests verify the model correctly predicts multiple labels simultaneously.
