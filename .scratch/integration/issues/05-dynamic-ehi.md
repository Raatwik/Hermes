# 05 — Implement Dynamic Engine Health Index (EHI)

**What to build:** 
The Engine Health Index (EHI) score on the Operator Dashboard actively fluctuates based on the live `twin_drift_score` streaming from MQTT (dynamically mapped to a 0-100 scale), permanently fixing the frozen `0/100` state.

**Blocked by:** 
None — can start immediately.

**Status:** ready-for-agent

- [ ] The `useEngineStore.js` `_applyTelemetry` function computes `ehi` dynamically based on the incoming `twin_drift_score` (e.g., `Math.max(0, Math.round(100 - (data.twin_drift_score * 100)))`).
- [ ] The EHI widget on the frontend reflects the 0-100 score in real time when live telemetry is streaming.
