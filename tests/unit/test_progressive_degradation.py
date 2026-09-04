"""Tests for Issue 03 — Progressive Degradation & Target Time to Failure."""

import math
import pytest
from simulation.fault_manager import FaultManager
from simulation.engine import Simulation, EngineFailureException
from simulation.scenarios.interactive_attack_scenario import (
    compute_degradation_severity,
    DEGRADATION_THRESHOLD,
)


class TestFaultManagerUpdateSeverity:
    def test_update_severity_changes_modifiers(self):
        fm = FaultManager()
        fm.inject("misfire", severity=0.1)
        mods_before = fm.get_modifiers()

        fm.update_severity("misfire", 0.8)
        mods_after = fm.get_modifiers()

        assert abs(mods_after["target_offsets"]["rpm"]) > abs(mods_before["target_offsets"]["rpm"])

    def test_update_severity_no_active_fault_raises(self):
        fm = FaultManager()
        with pytest.raises(ValueError, match="No active fault"):
            fm.update_severity("misfire", 0.5)

    def test_update_severity_only_affects_matching_type(self):
        fm = FaultManager()
        fm.inject("misfire", severity=0.3)
        fm.inject("lubrication_issues", severity=0.3)

        fm.update_severity("misfire", 0.9)
        mods = fm.get_modifiers()

        assert mods["target_offsets"]["rpm"] == pytest.approx(-0.9 * 400.0)
        assert mods["target_offsets"]["oil_pressure"] == pytest.approx(-0.3 * 25.0)


class TestExponentialDegradationCurve:
    def test_severity_starts_near_zero(self):
        assert compute_degradation_severity(0, 300) == pytest.approx(0.0)

    def test_severity_reaches_threshold_at_ttf(self):
        assert compute_degradation_severity(300, 300) == pytest.approx(DEGRADATION_THRESHOLD, abs=0.01)

    def test_severity_exceeds_threshold_after_ttf(self):
        assert compute_degradation_severity(400, 300) > DEGRADATION_THRESHOLD

    def test_severity_clamped_to_one(self):
        assert compute_degradation_severity(10000, 100) <= 1.0

    def test_short_ttf_ramps_faster(self):
        sev_short = compute_degradation_severity(50, 100)
        sev_long = compute_degradation_severity(50, 500)
        assert sev_short > sev_long


class TestProgressiveDegradationEndToEnd:
    def test_failure_occurs_near_target_time(self):
        sim = Simulation()
        profile = {
            "setpoints": [
                {"time": 0, "throttle": 0.9, "altitude": 5000},
                {"time": 3600, "throttle": 0.9, "altitude": 5000},
            ]
        }
        sim.load_profile(profile)

        inject_time = 100
        ttf = 300

        sim.inject_fault("cooling_degradation", severity=0.0)

        failure_time = None
        for t in range(3600):
            if t >= inject_time:
                elapsed = t - inject_time
                severity = compute_degradation_severity(elapsed, ttf)
                sim.update_fault_severity("cooling_degradation", severity)

            try:
                sim.step(1.0)
            except EngineFailureException:
                failure_time = t
                break

        assert failure_time is not None, "Engine should have failed"
        assert inject_time < failure_time < inject_time + ttf * 3.0

    def test_healthy_run_no_failure(self):
        sim = Simulation()
        profile = {
            "setpoints": [
                {"time": 0, "throttle": 0.6, "altitude": 5000},
                {"time": 600, "throttle": 0.6, "altitude": 5000},
            ]
        }
        sim.load_profile(profile)

        for _ in range(600):
            sim.step(1.0)
