# 04 — Isolation Forest Anomaly Detector

**What to build:** An unsupervised outlier detection script that trains an Isolation Forest on the full mixed dataset to act as a broad safety net, flagging extreme, unseen, or out-of-distribution engine behaviors.

**Blocked by:** 02 — Feature Engineering (Rolling Statistics)

**Status:** ready-for-agent

- [ ] An Isolation Forest model is defined and trained on the engineered features.
- [ ] The model is trained on a mixed dataset (healthy + known faults).
- [ ] The model outputs an anomaly score/flag for out-of-distribution data.
- [ ] A test runs the pipeline on a toy dataset and asserts that the Isolation Forest successfully flags an extreme, artificially injected outlier that falls outside the training distribution.
