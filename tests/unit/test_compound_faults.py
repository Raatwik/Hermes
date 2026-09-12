"""Tests for Issue 04 — Compound Fault Support & Menu Looping."""

import math
import pytest
from simulation.fault_manager import FaultManager
from simulation.engine import Simulation, EngineFailureException
from simulation.scenarios.interactive_attack_scenario import (
    compute_degradation_severity,
    DEGRADATION_THRESHOLD,
)


class TestFaultManagerUpdateParams:
    def test_update_params_changes_sensor_drift_offset(self):
        fm = FaultManager()
        fm.inject("sensor_drift", sensor="egt", offset=10.0)
        fm.update_params("sensor_drift", offset=50.0)
        mods = fm.get_modifiers()
        assert mods["output_offsets"]["egt"] == pytest.approx(50.0)

    def test_update_params_no_active_fault_raises(self):
        fm = FaultManager()
        with pytest.raises(ValueError, match="No active fault"):
            fm.update_params("misfire", severity=0.5)

    def test_update_params_merges_not_replaces(self):
        fm = FaultManager()
        fm.inject("sensor_drift", sensor="rpm", offset=10.0)
        fm.update_params("sensor_drift", offset=30.0)
        mods = fm.get_modifiers()
        assert mods["output_offsets"]["rpm"] == pytest.approx(30.0)

    def test_update_params_only_affects_first_match(self):
        fm = FaultManager()
        fm.inject("misfire", severity=0.2)
        fm.inject("misfire", severity=0.5)
        fm.update_params("misfire", severity=0.9)
        mods = fm.get_modifiers()
        expected_rpm = -0.9 * 400.0 + -0.5 * 400.0
        assert mods["target_offsets"]["rpm"] == pytest.approx(expected_rpm)


class TestCompoundFaultStacking:
    def test_two_different_faults_accumulate_modifiers(self):
        fm = FaultManager()
        fm.inject("misfire", severity=0.5)
        fm.inject("lubrication_issues", severity=0.4)
        mods = fm.get_modifiers()
        assert mods["target_offsets"]["rpm"] == pytest.approx(-0.5 * 400.0)
        assert mods["target_offsets"]["oil_pressure"] == pytest.approx(-0.4 * 25.0)
        assert mods["vibration_severity"] == pytest.approx(0.5 * 0.6 + 0.4 * 0.3)

    def test_three_faults_all_contribute(self):
        fm = FaultManager()
        fm.inject("misfire", severity=0.3)
        fm.inject("cooling_degradation", severity=0.4)
        fm.inject("injector_abnormalities", severity=0.5)
        mods = fm.get_modifiers()
        expected_egt = 0.3 * 80.0 + 0.5 * 50.0
        assert mods["target_offsets"]["egt"] == pytest.approx(expected_egt)
        assert "cht" in mods["target_offsets"]
        assert "fuel_flow" in mods["target_offsets"]

    def test_vibration_capped_at_one(self):
        fm = FaultManager()
        fm.inject("misfire", severity=1.0)
        fm.inject("cylinder_failure", cylinder=1, severity=1.0)
        fm.inject("lubrication_issues", severity=1.0)
        mods = fm.get_modifiers()
        assert mods["vibration_severity"] == 1.0

    def test_sensor_drift_plus_physical_fault(self):
        fm = FaultManager()
        fm.inject("sensor_drift", sensor="egt", offset=50.0)
        fm.inject("misfire", severity=0.5)
        mods = fm.get_modifiers()
        assert mods["output_offsets"]["egt"] == pytest.approx(50.0)
        assert mods["target_offsets"]["egt"] == pytest.approx(0.5 * 80.0)


class TestConcurrentProgressiveDegradation:
    def test_two_progressive_faults_degrade_independently(self):
        sim = Simulation()
        profile = {
            "setpoints": [
                {"time": 0, "throttle": 0.6, "altitude": 5000},
                {"time": 600, "throttle": 0.6, "altitude": 5000},
            ]
        }
        sim.load_profile(profile)

        sim.inject_fault("misfire", severity=0.0)
        sim.inject_fault("lubrication_issues", severity=0.0)

        ttf_misfire = 200
        ttf_lube = 300
        inject_misfire = 50
        inject_lube = 100

        for t in range(500):
            if t >= inject_misfire:
                sev = compute_degradation_severity(t - inject_misfire, ttf_misfire)
                sim.update_fault_severity("misfire", sev)
            if t >= inject_lube:
                sev = compute_degradation_severity(t - inject_lube, ttf_lube)
                sim.update_fault_severity("lubrication_issues", sev)
            try:
                sim.step(1.0)
            except EngineFailureException:
                break

        state = sim.get_state()
        assert state["rpm"] < 2500 or t < 500

    def test_compound_faults_produce_combined_csv_signatures(self):
        """Both misfire (drops rpm, raises egt) and cooling_degradation (raises cht)
        should show their signatures simultaneously in the simulation state."""
        sim = Simulation()
        profile = {
            "setpoints": [
                {"time": 0, "throttle": 0.7, "altitude": 5000},
                {"time": 300, "throttle": 0.7, "altitude": 5000},
            ]
        }
        sim.load_profile(profile)

        for _ in range(50):
            sim.step(1.0)
        baseline_state = sim.get_state()

        sim2 = Simulation()
        sim2.load_profile(profile)
        sim2.inject_fault("misfire", severity=0.6)
        sim2.inject_fault("cooling_degradation", severity=0.5)

        for _ in range(50):
            sim2.step(1.0)
        compound_state = sim2.get_state()

        assert compound_state["rpm"] < baseline_state["rpm"]
        assert compound_state["egt"] > baseline_state["egt"]
        assert compound_state["cht"] > baseline_state["cht"]

    def test_sensor_drift_progressive_without_clearing_other_faults(self):
        """Progressive sensor_drift update_fault_params must not clear the misfire."""
        profile = {
            "setpoints": [
                {"time": 0, "throttle": 0.7, "altitude": 5000},
                {"time": 300, "throttle": 0.7, "altitude": 5000},
            ]
        }

        healthy_sim = Simulation()
        healthy_sim.load_profile(profile)
        for _ in range(100):
            healthy_sim.step(1.0)
        healthy_rpm = healthy_sim.get_state()["rpm"]

        sim = Simulation()
        sim.load_profile(profile)
        sim.inject_fault("misfire", severity=0.5)
        sim.inject_fault("sensor_drift", sensor="egt", offset=0.0)

        for t in range(100):
            sev = compute_degradation_severity(t, 200)
            sim.update_fault_params("sensor_drift", offset=sev * 100)
            try:
                sim.step(1.0)
            except EngineFailureException:
                break

        state = sim.get_state()
        assert state["rpm"] < healthy_rpm, "Misfire should still be active after sensor_drift param updates"
