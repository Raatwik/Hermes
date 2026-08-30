# 01 — Standalone MQTT Broker and Simulation Playback

**What to build:** A local Python-based MQTT broker running in the background, paired with a `sim_publisher.py` script that reads the historical `djibouti_aligned.parquet` flight data and successfully broadcasts raw JSON telemetry to the `telemetry/engine` topic at an adjustable speed factor.

**Blocked by:** None — can start immediately

**Status:** done

- [x] A standalone script (`integration/broker.py`) starts an embedded MQTT broker on a local port.
- [x] A publisher script (`integration/sim_publisher.py`) reads `djibouti_aligned.parquet` (or CSV) row-by-row.
- [x] The publisher broadcasts each row as a JSON payload to the `telemetry/engine` MQTT topic.
- [x] The publisher supports an adjustable speed factor (e.g., via CLI argument) to control the playback rate.
