"""Tests for Issue 03 — Fault Injection Manager & Simple Faults."""
import pytest
from simulation.engine import Simulation
from simulation.fault_manager import FaultManager


class TestFaultManagerUnit:
    def test_no_faults_returns_empty_modifiers(self):
        fm = FaultManager()
        mods = fm.get_modifiers()
        assert mods["target_offsets"] == {}
        assert mods["output_offsets"] == {}
        assert mods["tau_multipliers"] == {}

    def test_inject_registers_fault(self):
        fm = FaultManager()
        fm.inject("sensor_drift", sensor="cht", offset=5.0)
        mods = fm.get_modifiers()
        assert mods["output_offsets"]["cht"] == 5.0

    def test_clear_faults(self):
        fm = FaultManager()
        fm.inject("sensor_drift", sensor="cht", offset=5.0)
        fm.clear()
        mods = fm.get_modifiers()
        assert mods["output_offsets"] == {}

    def test_unknown_fault_raises(self):
        fm = FaultManager()
        with pytest.raises(ValueError):
            fm.inject("nonexistent_fault")


class TestSensorDrift:
    """Sensor drift adds an offset to the final output, not to the physics."""

    def test_drift_shifts_output(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        for _ in range(1000):
            sim.step(dt=0.1)
        baseline_cht = sim.get_state()["cht"]

        sim.inject_fault("sensor_drift", sensor="cht", offset=15.0)
        sim.step(dt=0.1)
        drifted_cht = sim.get_state()["cht"]

        assert abs(drifted_cht - (baseline_cht + 15.0)) < 1.0

    def test_drift_does_not_affect_other_sensors(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        for _ in range(1000):
            sim.step(dt=0.1)
        baseline_egt = sim.get_state()["egt"]

        sim.inject_fault("sensor_drift", sensor="cht", offset=15.0)
        sim.step(dt=0.1)
        assert abs(sim.get_state()["egt"] - baseline_egt) < 1.0


class TestCoolingDegradation:
    """Cooling degradation raises thermal steady-states (CHT, oil_temp)."""

    def test_cht_rises_above_baseline(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        for _ in range(1000):
            sim.step(dt=0.1)
        baseline_cht = sim.get_state()["cht"]

        sim.inject_fault("cooling_degradation", severity=0.5)
        for _ in range(500):
            sim.step(dt=0.1)
        faulted_cht = sim.get_state()["cht"]

        assert faulted_cht > baseline_cht

    def test_oil_temp_rises_above_baseline(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        for _ in range(1000):
            sim.step(dt=0.1)
        baseline_oil = sim.get_state()["oil_temp"]

        sim.inject_fault("cooling_degradation", severity=0.5)
        for _ in range(500):
            sim.step(dt=0.1)
        faulted_oil = sim.get_state()["oil_temp"]

        assert faulted_oil > baseline_oil

    def test_cooling_degradation_is_gradual(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        for _ in range(1000):
            sim.step(dt=0.1)

        sim.inject_fault("cooling_degradation", severity=0.5)
        sim.step(dt=0.1)
        cht_after_1_tick = sim.get_state()["cht"]

        for _ in range(499):
            sim.step(dt=0.1)
        cht_after_50s = sim.get_state()["cht"]

        assert cht_after_50s > cht_after_1_tick


class TestSimulationInjectFaultAPI:
    def test_inject_fault_method_exists(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        sim.inject_fault("sensor_drift", sensor="egt", offset=10.0)

    def test_clear_faults_method_exists(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        sim.inject_fault("sensor_drift", sensor="egt", offset=10.0)
        sim.clear_faults()
        for _ in range(1000):
            sim.step(dt=0.1)
        state = sim.get_state()
        assert 300 < state["egt"] < 900
