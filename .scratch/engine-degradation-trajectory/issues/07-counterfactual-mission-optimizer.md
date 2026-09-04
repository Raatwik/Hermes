# 07 — Counterfactual Mission Optimizer

**What to build:** The Mission Sandbox widget runs parameter sweeps over altitude, load, duration, and throttle profile. Each alternative scenario is simulated through the degradation model, filtered by operational constraints (minimum duration, required altitude range, fuel endurance), and ranked by predicted mission completion risk. Results shown as a comparison table so the engineer can answer: "Which feasible operating change reduces predicted risk the most?"

**Blocked by:** 05 — LSTM-Driven RUL Trajectory (counterfactual scenarios need model-driven RUL to evaluate risk under alternative profiles).

**Status:** ready-for-agent

- [ ] Sweep parameters: altitude (±steps), load (±steps), duration (±steps), throttle profile variants
- [ ] Each scenario runs through the degradation/RUL model to produce predicted end-of-mission health and risk
- [ ] Constraint filter removes infeasible scenarios (below min duration, outside altitude envelope, insufficient fuel)
- [ ] Results ranked by mission completion risk, displayed as a sortable table with columns: scenario description, predicted EHI at end, predicted RUL at end, mission risk %
- [ ] Current/planned mission shown as the baseline row for comparison
- [ ] System provides decision support only — no autonomous flight-control commands (master.md §25)
