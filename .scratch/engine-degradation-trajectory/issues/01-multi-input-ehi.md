# 01 — Multi-Input EHI Computation

**What to build:** EHI computed from multiple residual inputs (temperature, pressure, vibration, RPM deviation, fuel efficiency, Digital Twin residuals) instead of only `twin_drift_score`. The propulsion engineer dashboard shows the richer EHI with a contributing-factor breakdown so the engineer can see which subsystem is dragging health down.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] EHI accepts weighted inputs from at least: temperature residual, pressure residual, vibration index, RPM deviation, fuel efficiency deviation, and DT drift score
- [ ] Weights are configurable (not hardcoded magic numbers)
- [ ] Propulsion engineer dashboard displays EHI with per-factor contribution percentages
- [ ] EHI remains on 0–100 scale, clamped, matching master.md §31 conceptual bands (100=Healthy, 80=Watch, 60=Degraded, 40=Critical)
- [ ] Existing `useEngineStore` consumers continue to work with the new EHI value
