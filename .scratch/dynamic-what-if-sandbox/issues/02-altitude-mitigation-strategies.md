# 02 — Altitude Mitigation Strategies

**What to build:** Adds altitude-specific tactical adjustments to the optimization suite. The operator will be presented with actionable options to drop altitude by specific increments, complete with accurately simulated predictions of how that physical change impacts engine health over the remaining flight path.

**Blocked by:** 01 — Core E2E Optimization Tracer Bullet

**Status:** ready-for-agent

- [ ] The backend optimization endpoint evaluates additional candidate strategies: dropping altitude by 500ft and 1000ft.
- [ ] The backend simulation logic correctly applies these negative offsets step-by-step across the future trajectory sequence.
- [ ] The simulation respects physical minimums (e.g., altitude does not drop below 0).
- [ ] The frontend UI automatically renders these new options alongside the baseline profile, displaying their distinct calculated Risk and RUL impacts.
