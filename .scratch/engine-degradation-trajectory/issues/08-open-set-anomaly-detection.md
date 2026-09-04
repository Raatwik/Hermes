# 08 — Open-Set Anomaly Detection

**What to build:** When residual patterns don't match any of the 6 known fault signatures, the system flags "UNKNOWN ABNORMAL BEHAVIOR" instead of forcing a known-fault classification. Uses an anomaly detector (LSTM autoencoder or isolation forest) running in parallel with the supervised fault classifier. The propulsion engineer view clearly distinguishes known faults from unknown anomalies.

**Blocked by:** 02 — Sensor vs Engine Fault Discrimination (the anomaly path must first confirm the divergence is not a sensor or model issue before flagging it as an unknown engine anomaly).

**Status:** ready-for-agent

- [ ] Anomaly detector runs alongside the known-fault classifier — two parallel paths per master.md §15
- [ ] Known-fault classifier maps to one of the 6 fault types when confidence exceeds threshold
- [ ] When no known fault matches above threshold AND anomaly detector flags abnormal → "UNKNOWN ABNORMAL BEHAVIOR"
- [ ] Dashboard shows the distinction: known fault (with type and confidence), unknown anomaly (with residual pattern evidence), or normal
- [ ] Does not force an unknown condition into an incorrect known category
- [ ] Anomaly detector choice (autoencoder vs isolation forest) is swappable behind a common interface
