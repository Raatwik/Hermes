# 02 — Tightened Isolation Forest Anomaly Detection

**What to build:** Hardens the anomaly detector to ensure it has an extremely tight and accurate boundary of "normal" behavior. The training script will be updated to explicitly filter out any fault data before fitting, and the `contamination` parameter will be lowered to a realistic baseline (e.g. `0.001`), completely resolving the current 0% recall flaw on anomalies.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `train_isolation_forest.py` explicitly filters the loaded dataset to include only rows where `fault_class == "healthy"`.
- [x] Isolation Forest `contamination` parameter is updated to `0.001` (or equivalent tuned value).
- [x] Mock data unit test asserts that a dataset containing both healthy and anomalous rows correctly results in the faulty rows being predicted as anomalies (`-1`).
