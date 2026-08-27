# 01: Baseline "Healthy" Generation Pipeline

**What to build:** An orchestrator script that reads randomized mission phases from a YAML config, steps through the core `Simulation`, tags the resulting telemetry with `fault_class="healthy"`, and exports the timeseries to a Parquet file partitioned correctly on disk.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Pipeline successfully parses a YAML mission configuration file containing basic phase definitions (duration, altitude, throttle).
- [ ] Pipeline initializes and steps the core simulation over the interpolated mission profile.
- [ ] Pipeline automatically appends a `fault_class` column set to `"healthy"` for every row of telemetry.
- [ ] Pipeline exports the resulting telemetry dataframe to a Parquet file located in a partitioned directory (e.g., `data/fault_class=healthy/`).
