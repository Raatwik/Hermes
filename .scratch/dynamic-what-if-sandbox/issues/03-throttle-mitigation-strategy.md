# 03 — Throttle Mitigation Strategy

**What to build:** Adds an engine load reduction strategy to the optimization suite. The operator will have the option to see the risk and RUL impact of backing off the throttle, providing a mechanical mitigation alternative if altitude changes are restricted by airspace or terrain.

**Blocked by:** 01 — Core E2E Optimization Tracer Bullet

**Status:** ready-for-agent

- [ ] The backend optimization endpoint evaluates an additional candidate strategy: reducing throttle by 10%.
- [ ] The backend simulation logic correctly applies a 0.9x multiplier to the throttle value step-by-step across the future trajectory sequence.
- [ ] The frontend UI automatically renders this throttle reduction option.
- [ ] The returned option correctly reflects a distinct Risk and RUL calculation compared to the baseline and altitude mitigation strategies.
