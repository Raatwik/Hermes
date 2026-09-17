# 01 — Core E2E Optimization Tracer Bullet (Maintain Profile)

**What to build:** The foundational end-to-end connection for dynamic optimization. Instead of showing hardcoded text, the application will evaluate the active mission's future trajectory and return a single, dynamically calculated "Maintain Profile" strategy. The operator will see real risk and RUL numbers based on their actual planned flight path.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The frontend accurately tracks the current simulation time from incoming telemetry.
- [ ] The sandbox widget triggers a request to the backend with the current time and state instead of relying on a hardcoded list of options.
- [ ] The backend exposes a new optimization endpoint that accepts this payload.
- [ ] The backend reads the active scenario dataset, extracts the future trajectory, and runs a forward simulation (up to 300 seconds) without any offsets.
- [ ] The endpoint returns the "Maintain Profile" strategy in a standardized JSON schema containing the action title, description, and calculated Risk/RUL impact.
- [ ] The frontend renders this dynamic response successfully in the UI.
