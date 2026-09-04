# 06 — Composite DriftScore Metric

**What to build:** Implements the composite DriftScore = αD* + β|s| + γP (magnitude + trend + persistence) as the master diagnostic metric per master.md §11. The propulsion engineer view exposes all three components and the composite score, replacing the simple `twin_drift_score` as the primary anomaly signal.

**Blocked by:** 01 — Multi-Input EHI (the multi-input residuals feed the drift score components).

**Status:** ready-for-agent

- [ ] D* (rolling normalized residual) computed as (1/N) Σ D_i using Mahalanobis-style D_k = r_kᵀ S⁻¹ r_k
- [ ] s (trend) computed as dr/dt over a configurable sliding window
- [ ] P (persistence) tracks how long D* has exceeded τ_D
- [ ] α, β, γ weights and τ_D threshold are configurable
- [ ] Dashboard shows all three components individually plus the composite DriftScore
- [ ] EHI (from ticket 01) can optionally consume DriftScore instead of raw twin_drift_score
- [ ] Noted as a project-proposed metric, not an industry standard — thresholds need experimental tuning
