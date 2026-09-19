# 07 — Progressive TTF & Concurrent Fault Handling

**What to build:** Extend the RUL calculation to handle progressive faults and concurrent attacks. Progressive faults should use the user's defined "Target Time to Failure" (TTF) as their starting RUL instead of default lookup values. When multiple concurrent faults are active, the final outputted RUL must represent the most critical (minimum) value among all active countdowns.

**Blocked by:** 06 — Single Attack Countdown & 10-second Steps

**Status:** ready-for-agent

- [ ] Progressive faults initialize their RUL using the provided `TTF` integer.
- [ ] In a compound simulation scenario with multiple faults injected, the RUL accurately reflects the lowest value across all active faults.
- [ ] Unit tests verify progressive TTF logic and the "minimum active RUL" selection logic for compound scenarios.
