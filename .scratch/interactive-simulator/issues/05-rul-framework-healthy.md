# 05 — Basic RUL framework & Healthy State

**What to build:** Modify the interactive simulator to export a new `rul` column in the telemetry CSV that outputs a healthy baseline default of `5000` prior to any fault injection. This provides downstream components with a stable ground-truth target for healthy operation.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A new `rul` field is appended to the CSV header and telemetry output rows.
- [ ] Before any fault is injected (or running in healthy baseline mode), the RUL column reliably outputs `5000.0`.
- [ ] Unit tests verify the presence of the `rul` column and the correct healthy default value in the output.
