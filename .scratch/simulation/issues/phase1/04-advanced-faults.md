# 04 — Advanced Engine Faults & Vibration Index

**What to build:** Adds the remaining complex physical faults to the `FaultManager`: misfires, injector abnormalities, and lubrication issues. Also introduces the abstract 0.0-1.0 "vibration severity index" to the telemetry output, which remains low during normal operation but rises significantly when these mechanical faults occur.

**Blocked by:** 03 — Fault Injection Manager & Simple Faults

**Status:** ready-for-agent

- [ ] Implement "misfire" fault (causes RPM instability, EGT changes, and high vibration).
- [ ] Implement "injector abnormalities" (alters fuel flow and EGT).
- [ ] Implement "lubrication issues" (drops oil pressure, spikes oil temperature).
- [ ] Add `vibration_index` to telemetry output, derived from RPM and active mechanical faults.
- [ ] Test: Inject a misfire fault and assert that the vibration index increases and RPM destabilizes compared to baseline.
