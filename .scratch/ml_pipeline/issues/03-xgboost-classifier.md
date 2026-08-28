# 03 — XGBoost Supervised Fault Classifier

**What to build:** The primary supervised machine learning training loop. This trains an XGBoost model on the engineered features to accurately classify known discrete engine faults, ensuring no data leaks across missions.

**Blocked by:** 02 — Feature Engineering (Rolling Statistics)

**Status:** ready-for-agent

- [ ] Dataset splitting logic guarantees Train/Validation/Test splits are strictly grouped by `mission_id` (file UUID) to prevent temporal leakage.
- [ ] An XGBoost classifier is defined and trained on the rolling features and residuals.
- [ ] The model accurately predicts the `fault_class` target.
- [ ] The model outputs class probabilities (via `predict_proba`) rather than just hard predictions.
- [ ] A test runs the full pipeline on a tiny toy dataset to assert the model can successfully overfit and learn a basic fault signature.
