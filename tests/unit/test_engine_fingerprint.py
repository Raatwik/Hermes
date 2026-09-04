"""Tests for the per-engine fingerprinting module."""

import math
import tempfile
from pathlib import Path

import pytest

from integration.engine_fingerprint import EngineFingerprint, FINGERPRINT_SENSORS


def _make_telemetry(**overrides):
    base = {
        "rpm": 2400, "cht": 160, "egt": 600, "oil_pressure": 65,
        "oil_temp": 95, "fuel_flow": 20, "battery_voltage": 13.5,
        "vibration_index": 0.05, "engine_load": 0.5, "injection_timing": 28,
        "egt_1": 600, "egt_2": 601, "egt_3": 599, "egt_4": 602,
    }
    base.update(overrides)
    return base


@pytest.fixture
def tmp_store(tmp_path):
    return tmp_path


class TestFingerprintLifecycle:
    def test_new_engine_starts_in_new_status(self, tmp_store):
        fp = EngineFingerprint(engine_id="eng-1", store_dir=tmp_store)
        assert fp.status == "new"
        assert fp.sample_count == 0
        assert not fp.is_ready

    def test_learning_mode_during_collection(self, tmp_store):
        fp = EngineFingerprint(engine_id="eng-1", store_dir=tmp_store, min_samples=10)
        for _ in range(5):
            fp.update(_make_telemetry(), is_healthy=True)
        assert fp.status == "learning"
        assert fp.sample_count == 5
        assert fp.progress == 0.5

    def test_ready_after_min_samples(self, tmp_store):
        fp = EngineFingerprint(engine_id="eng-1", store_dir=tmp_store, min_samples=10)
        for _ in range(10):
            fp.update(_make_telemetry(), is_healthy=True)
        assert fp.status == "ready"
        assert fp.is_ready

    def test_unhealthy_ticks_are_skipped(self, tmp_store):
        fp = EngineFingerprint(engine_id="eng-1", store_dir=tmp_store, min_samples=5)
        for _ in range(10):
            fp.update(_make_telemetry(), is_healthy=False)
        assert fp.sample_count == 0
        assert fp.status == "new"


class TestResidualComputation:
    def test_residuals_empty_when_not_ready(self, tmp_store):
        fp = EngineFingerprint(engine_id="eng-1", store_dir=tmp_store, min_samples=100)
        for _ in range(5):
            fp.update(_make_telemetry(), is_healthy=True)
        assert fp.compute_residuals(_make_telemetry()) == {}

    def test_residuals_are_z_scores(self, tmp_store):
        fp = EngineFingerprint(engine_id="eng-1", store_dir=tmp_store, min_samples=5)
        for i in range(20):
            fp.update(_make_telemetry(rpm=2400 + i * 0.1), is_healthy=True)

        residuals = fp.compute_residuals(_make_telemetry(rpm=2400))
        assert "rpm" in residuals
        assert isinstance(residuals["rpm"], float)

    def test_deviation_score_is_rms_of_z_scores(self, tmp_store):
        fp = EngineFingerprint(engine_id="eng-1", store_dir=tmp_store, min_samples=5)
        for _ in range(20):
            fp.update(_make_telemetry(), is_healthy=True)

        score = fp.compute_deviation_score(_make_telemetry())
        assert isinstance(score, float)
        assert score >= 0


class TestPersistence:
    def test_save_and_load(self, tmp_store):
        fp = EngineFingerprint(engine_id="eng-persist", store_dir=tmp_store, min_samples=5)
        for _ in range(10):
            fp.update(_make_telemetry(), is_healthy=True)
        fp.save()

        fp2 = EngineFingerprint(engine_id="eng-persist", store_dir=tmp_store, min_samples=5)
        assert fp2.sample_count == 10
        assert fp2.is_ready
        assert fp2.get_baseline() == fp.get_baseline()

    def test_load_nonexistent_is_clean(self, tmp_store):
        fp = EngineFingerprint(engine_id="no-such-engine", store_dir=tmp_store)
        assert fp.sample_count == 0

    def test_different_engine_ids_are_isolated(self, tmp_store):
        fp1 = EngineFingerprint(engine_id="eng-a", store_dir=tmp_store, min_samples=5)
        fp2 = EngineFingerprint(engine_id="eng-b", store_dir=tmp_store, min_samples=5)

        for _ in range(10):
            fp1.update(_make_telemetry(rpm=2400), is_healthy=True)
        fp1.save()

        assert fp2.sample_count == 0


class TestStatusDict:
    def test_learning_status_dict(self, tmp_store):
        fp = EngineFingerprint(engine_id="eng-1", store_dir=tmp_store, min_samples=10)
        for _ in range(3):
            fp.update(_make_telemetry(), is_healthy=True)
        d = fp.to_status_dict(_make_telemetry())
        assert d["status"] == "learning"
        assert d["sample_count"] == 3
        assert "residuals" not in d
        assert "baseline" not in d

    def test_ready_status_dict_has_residuals(self, tmp_store):
        fp = EngineFingerprint(engine_id="eng-1", store_dir=tmp_store, min_samples=5)
        for _ in range(10):
            fp.update(_make_telemetry(), is_healthy=True)
        d = fp.to_status_dict(_make_telemetry())
        assert d["status"] == "ready"
        assert "residuals" in d
        assert "baseline" in d
        assert "deviation_score" in d
