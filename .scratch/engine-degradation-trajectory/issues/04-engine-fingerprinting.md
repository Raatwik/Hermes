# 04 — Individual Engine Fingerprinting

**What to build:** The system learns and stores a per-engine normal baseline — its own vibration range, temperature profile, efficiency curve, and other characteristic operating signatures. Residual analysis compares against this personalized baseline alongside the physics model's expected values. The dashboard shows fingerprint deviation so the engineer can distinguish "unusual for this specific engine" from "unusual for any engine."

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A fingerprint is built from a configurable window of healthy-operation telemetry (per-parameter mean + variance)
- [ ] Fingerprint persists across sessions (stored to disk or database)
- [ ] Residual analysis produces both physics-model residuals and fingerprint residuals
- [ ] Dashboard shows fingerprint deviation as a separate indicator from DT drift
- [ ] New/unknown engines operate in a "learning" mode until sufficient baseline data is collected, falling back to physics-only comparison
- [ ] Aligns with master.md §13 — personalized monitoring, fewer false alarms, earlier subtle-change detection
