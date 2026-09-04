"""Per-engine fingerprinting: learns a normal baseline from healthy-operation
telemetry and computes fingerprint residuals against it."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Optional


DEFAULT_STORE_DIR = Path(__file__).resolve().parent.parent / "data" / "fingerprints"

FINGERPRINT_SENSORS = [
    "rpm", "cht", "egt", "oil_pressure", "oil_temp", "fuel_flow",
    "battery_voltage", "vibration_index", "engine_load", "injection_timing",
    "egt_1", "egt_2", "egt_3", "egt_4",
]

MIN_SAMPLES_READY = 120


class EngineFingerprint:
    """Accumulates per-sensor running statistics for one engine and persists
    the baseline to a JSON file keyed by engine_id."""

    def __init__(
        self,
        engine_id: str = "default",
        store_dir: Optional[Path] = None,
        min_samples: int = MIN_SAMPLES_READY,
    ):
        self._engine_id = engine_id
        self._store_dir = store_dir or DEFAULT_STORE_DIR
        self._min_samples = min_samples

        self._count: int = 0
        self._mean: dict[str, float] = {s: 0.0 for s in FINGERPRINT_SENSORS}
        self._m2: dict[str, float] = {s: 0.0 for s in FINGERPRINT_SENSORS}

        self._load()

    @property
    def engine_id(self) -> str:
        return self._engine_id

    @property
    def is_ready(self) -> bool:
        return self._count >= self._min_samples

    @property
    def status(self) -> str:
        if self._count == 0:
            return "new"
        if not self.is_ready:
            return "learning"
        return "ready"

    @property
    def sample_count(self) -> int:
        return self._count

    @property
    def progress(self) -> float:
        return min(1.0, self._count / self._min_samples)

    def update(self, telemetry: dict, is_healthy: bool = True) -> None:
        if not is_healthy:
            return
        self._count += 1
        for sensor in FINGERPRINT_SENSORS:
            val = telemetry.get(sensor)
            if val is None:
                continue
            val = float(val)
            delta = val - self._mean[sensor]
            self._mean[sensor] += delta / self._count
            delta2 = val - self._mean[sensor]
            self._m2[sensor] += delta * delta2

    def get_baseline(self) -> dict[str, dict[str, float]]:
        result = {}
        for sensor in FINGERPRINT_SENSORS:
            mean = self._mean[sensor]
            variance = self._m2[sensor] / self._count if self._count > 1 else 0.0
            result[sensor] = {
                "mean": round(mean, 4),
                "std": round(math.sqrt(max(0.0, variance)), 4),
            }
        return result

    def compute_residuals(self, telemetry: dict) -> dict[str, float]:
        if not self.is_ready:
            return {}
        residuals: dict[str, float] = {}
        for sensor in FINGERPRINT_SENSORS:
            val = telemetry.get(sensor)
            if val is None:
                continue
            val = float(val)
            mean = self._mean[sensor]
            variance = self._m2[sensor] / self._count if self._count > 1 else 0.0
            std = math.sqrt(max(0.0, variance))
            residuals[sensor] = round((val - mean) / std, 4) if std > 1e-9 else 0.0
        return residuals

    def compute_deviation_score(self, telemetry: dict) -> float:
        residuals = self.compute_residuals(telemetry)
        if not residuals:
            return 0.0
        squared = [r ** 2 for r in residuals.values()]
        return round(math.sqrt(sum(squared) / len(squared)), 4)

    def save(self) -> None:
        self._store_dir.mkdir(parents=True, exist_ok=True)
        path = self._store_dir / f"{self._engine_id}.json"
        data = {
            "engine_id": self._engine_id,
            "count": self._count,
            "mean": self._mean,
            "m2": self._m2,
        }
        path.write_text(json.dumps(data, indent=2))

    def _load(self) -> None:
        path = self._store_dir / f"{self._engine_id}.json"
        if not path.exists():
            return
        try:
            data = json.loads(path.read_text())
            self._count = int(data["count"])
            for sensor in FINGERPRINT_SENSORS:
                self._mean[sensor] = float(data["mean"].get(sensor, 0.0))
                self._m2[sensor] = float(data["m2"].get(sensor, 0.0))
        except (json.JSONDecodeError, KeyError, ValueError):
            pass

    def to_status_dict(self, telemetry: dict | None = None) -> dict:
        result: dict = {
            "engine_id": self._engine_id,
            "status": self.status,
            "sample_count": self._count,
            "min_samples": self._min_samples,
            "progress": round(self.progress, 3),
        }
        if self.is_ready and telemetry is not None:
            result["deviation_score"] = self.compute_deviation_score(telemetry)
            result["residuals"] = self.compute_residuals(telemetry)
            result["baseline"] = self.get_baseline()
        return result
