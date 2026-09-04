# 03 — Model-Driven Degradation Curve

**What to build:** `DegradationCauseGraph` renders a live severity trajectory derived from the actual fault state (λ_f progression over time) instead of the current hardcoded 0.05→0.90 curve over 0–450 flight hours. The graph updates in real-time as faults evolve during a simulation or replay, reflecting the true `λ_f ∈ [0,1]` degradation per master.md §19.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Degradation curve data comes from live simulation state (fault severity λ_f over time), not a hardcoded array
- [ ] Supports multiple concurrent faults — each shown as its own trace or the composite worst-case is shown
- [ ] Severity bands labeled: Healthy (0), Mild (0.25), Moderate (0.50), Severe (0.75), Critical (1.0)
- [ ] Graph updates at the same cadence as other live widgets (≤200ms throttle)
- [ ] Paired FaultProbabilityMatrix also reflects live fault state rather than static data
