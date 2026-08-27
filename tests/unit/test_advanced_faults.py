"""Tests for Issue 04 — Advanced Engine Faults & Vibration Index."""
import pytest
from simulation.engine import Simulation


def _stabilize(sim: Simulation, seconds: float = 100.0, dt: float = 0.1) -> None:
    for _ in range(int(seconds / dt)):
        sim.step(dt=dt)


class TestVibrationIndex:
    def test_present_in_state(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        sim.step(dt=0.1)
        assert "vibration_index" in sim.get_state()

    def test_low_at_baseline(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _stabilize(sim)
        vi = sim.get_state()["vibration_index"]
        assert 0.0 <= vi <= 0.15

    def test_bounded_zero_to_one(self):
        sim = Simulation(throttle=1.0, altitude=0.0)
        sim.inject_fault("misfire", severity=1.0)
        _stabilize(sim, seconds=50.0)
        vi = sim.get_state()["vibration_index"]
        assert 0.0 <= vi <= 1.0


class TestMisfire:
    def test_vibration_increases(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _stabilize(sim)
        baseline_vi = sim.get_state()["vibration_index"]

        sim.inject_fault("misfire", severity=0.5)
        _stabilize(sim, seconds=20.0)
        faulted_vi = sim.get_state()["vibration_index"]

        assert faulted_vi > baseline_vi + 0.1

    def test_rpm_destabilizes(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _stabilize(sim)
        baseline_rpm = sim.get_state()["rpm"]

        sim.inject_fault("misfire", severity=0.5)
        _stabilize(sim, seconds=20.0)
        faulted_rpm = sim.get_state()["rpm"]

        assert faulted_rpm < baseline_rpm

    def test_egt_changes(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _stabilize(sim)
        baseline_egt = sim.get_state()["egt"]

        sim.inject_fault("misfire", severity=0.5)
        _stabilize(sim, seconds=30.0)
        faulted_egt = sim.get_state()["egt"]

        assert faulted_egt != pytest.approx(baseline_egt, abs=5.0)


class TestInjectorAbnormalities:
    def test_fuel_flow_changes(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _stabilize(sim)
        baseline_ff = sim.get_state()["fuel_flow"]

        sim.inject_fault("injector_abnormalities", severity=0.5)
        _stabilize(sim, seconds=20.0)
        faulted_ff = sim.get_state()["fuel_flow"]

        assert abs(faulted_ff - baseline_ff) > 1.0

    def test_egt_changes(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _stabilize(sim)
        baseline_egt = sim.get_state()["egt"]

        sim.inject_fault("injector_abnormalities", severity=0.5)
        _stabilize(sim, seconds=30.0)
        faulted_egt = sim.get_state()["egt"]

        assert abs(faulted_egt - baseline_egt) > 5.0


class TestLubricationIssues:
    def test_oil_pressure_drops(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _stabilize(sim)
        baseline_op = sim.get_state()["oil_pressure"]

        sim.inject_fault("lubrication_issues", severity=0.5)
        _stabilize(sim, seconds=20.0)
        faulted_op = sim.get_state()["oil_pressure"]

        assert faulted_op < baseline_op

    def test_oil_temp_spikes(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _stabilize(sim)
        baseline_ot = sim.get_state()["oil_temp"]

        sim.inject_fault("lubrication_issues", severity=0.5)
        _stabilize(sim, seconds=30.0)
        faulted_ot = sim.get_state()["oil_temp"]

        assert faulted_ot > baseline_ot
