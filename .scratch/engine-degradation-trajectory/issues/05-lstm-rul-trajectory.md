# 05 — LSTM-Driven RUL Trajectory

**What to build:** RUL prediction uses the trained ProbabilisticLSTM output end-to-end instead of simulation countdown timers. The frontend shows the LSTM's (μ ± 2σ) trajectory over time as a chart — not just a static number — so the engineer can see how RUL is evolving. The simulation's timer-based RUL becomes a fallback when the LSTM model is unavailable.

**Blocked by:** 03 — Model-Driven Degradation Curve (the degradation state feeds the LSTM input features).

**Status:** ready-for-agent

- [ ] RUL source priority: LSTM prediction (primary) → simulation countdown (fallback), with clear indicator of which source is active
- [ ] Frontend displays a time-series chart of RUL(μ) with shaded ±2σ confidence band
- [ ] RUL trajectory chart appears in the propulsion engineer dashboard alongside existing widgets
- [ ] LSTM inference runs at a sustainable cadence (not every 200ms — batch or downsample as needed)
- [ ] Store tracks RUL history (not just latest value) so the trajectory can be rendered
- [ ] Aligns with master.md §30 — never present a single RUL number as exact truth
