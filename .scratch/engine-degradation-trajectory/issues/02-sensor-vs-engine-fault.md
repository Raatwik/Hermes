# 02 — Sensor vs Engine Fault Discrimination

**What to build:** When residuals diverge, the system classifies the divergence as one of three causes: sensor fault (single sensor anomaly while others remain normal), engine fault (correlated multi-sensor pattern consistent with a physical mechanism), or model drift (systematic deviation across all sensors suggesting the twin is stale). The propulsion engineer view shows which classification applies with supporting evidence.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Classification logic examines multi-sensor residual patterns — isolated single-sensor divergence → sensor fault; correlated multi-sensor divergence matching known physical coupling → engine fault; broad systematic offset → model drift
- [ ] Each classification includes a confidence indicator and the residual evidence that led to it
- [ ] Propulsion engineer dashboard displays the active classification with its evidence
- [ ] Sensor fault classification does not trigger engine-level RUL degradation
- [ ] Covers the three-way distinction from master.md §12
