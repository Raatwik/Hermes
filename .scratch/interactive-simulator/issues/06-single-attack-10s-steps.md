# 06 — Single Attack Countdown & 10-second Steps

**What to build:** Implement the hardcoded countdown logic for single static faults based on attack type (e.g. `misfire=1500`, `cylinder_failure=600`). When the attack is injected, the RUL should drop from the healthy state to the initial attack value and count down smoothly in 10-second bucketed intervals (dropping by 10 every 10 seconds), keeping the frontend visualization stable.

**Blocked by:** 05 — Basic RUL framework & Healthy State

**Status:** ready-for-agent

- [ ] A lookup dictionary exists for attack-specific initial RUL values.
- [ ] Upon injection of a single static fault, the RUL correctly switches from `5000` to the calculated attack value.
- [ ] The RUL value drops by `10` precisely every 10 simulation seconds based on elapsed time, not every single second.
- [ ] Unit tests verify the 10-second stepwise countdown behavior accurately against simulated time.
