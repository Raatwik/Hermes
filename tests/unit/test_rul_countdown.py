"""Tests for Issue 06 — Single Attack Countdown & 10-second Steps."""
import pytest
from simulation.engine import Simulation, HEALTHY_RUL, ATTACK_INITIAL_RUL


class TestAttackInitialRulLookup:
    def test_lookup_contains_all_fault_types(self):
        expected = {"misfire", "cylinder_failure", "cooling_degradation",
                    "injector_abnormalities", "lubrication_issues", "sensor_drift"}
        assert set(ATTACK_INITIAL_RUL.keys()) == expected

    def test_misfire_initial_rul(self):
        assert ATTACK_INITIAL_RUL["misfire"] == 1500.0

    def test_cylinder_failure_initial_rul(self):
        assert ATTACK_INITIAL_RUL["cylinder_failure"] == 600.0


class TestRulSwitchesOnInjection:
    def test_rul_is_healthy_before_injection(self):
        sim = Simulation(throttle=0.5)
        for _ in range(50):
            sim.step(1.0)
        assert sim.get_state()["rul"] == HEALTHY_RUL

    def test_rul_switches_to_attack_value_on_injection(self):
        sim = Simulation(throttle=0.5)
        for _ in range(10):
            sim.step(1.0)
        sim.inject_fault("misfire", severity=0.5)
        sim.step(1.0)
        state = sim.get_state()
        assert state["rul"] == ATTACK_INITIAL_RUL["misfire"]

    def test_rul_switches_for_cylinder_failure(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("cylinder_failure", cylinder=2, severity=0.5)
        sim.step(1.0)
        state = sim.get_state()
        assert state["rul"] == ATTACK_INITIAL_RUL["cylinder_failure"]


class TestTenSecondStepCountdown:
    def _run_with_fault(self, fault_type, steps_after_inject, dt=1.0, **fault_kwargs):
        sim = Simulation(throttle=0.5)
        sim.step(dt)
        sim.inject_fault(fault_type, **fault_kwargs)
        rul_values = []
        for _ in range(steps_after_inject):
            sim.step(dt)
            rul_values.append(sim.get_state()["rul"])
        return rul_values

    def test_rul_constant_within_first_10_seconds(self):
        vals = self._run_with_fault("misfire", 9, severity=0.5)
        initial = ATTACK_INITIAL_RUL["misfire"]
        assert all(v == initial for v in vals)

    def test_rul_drops_by_10_at_10_seconds(self):
        vals = self._run_with_fault("misfire", 11, severity=0.5)
        initial = ATTACK_INITIAL_RUL["misfire"]
        assert vals[8] == initial
        assert vals[9] == initial - 10.0

    def test_rul_drops_by_20_at_20_seconds(self):
        vals = self._run_with_fault("misfire", 21, severity=0.5)
        initial = ATTACK_INITIAL_RUL["misfire"]
        assert vals[18] == initial - 10.0
        assert vals[19] == initial - 20.0

    def test_rul_staircase_pattern(self):
        vals = self._run_with_fault("misfire", 35, severity=0.5)
        initial = ATTACK_INITIAL_RUL["misfire"]
        for i in range(35):
            elapsed = (i + 1)
            expected_steps = elapsed // 10
            expected = initial - 10.0 * expected_steps
            assert vals[i] == expected, f"At t={elapsed}s: got {vals[i]}, expected {expected}"

    def test_rul_floors_at_zero(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("cylinder_failure", cylinder=1, severity=0.3)
        initial = ATTACK_INITIAL_RUL["cylinder_failure"]
        total_steps_to_zero = int(initial / 10.0) * 10 + 20
        for _ in range(total_steps_to_zero):
            sim.step(1.0)
        state = sim.get_state()
        assert state["rul"] >= 0.0

    def test_countdown_uses_elapsed_not_absolute_time(self):
        sim = Simulation(throttle=0.5)
        for _ in range(100):
            sim.step(1.0)
        sim.inject_fault("misfire", severity=0.5)
        sim.step(1.0)
        state = sim.get_state()
        assert state["rul"] == ATTACK_INITIAL_RUL["misfire"]
        for _ in range(9):
            sim.step(1.0)
        state = sim.get_state()
        assert state["rul"] == ATTACK_INITIAL_RUL["misfire"] - 10.0


class TestClearFaultsResetsRul:
    def test_rul_returns_to_healthy_after_clear(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("misfire", severity=0.5)
        for _ in range(15):
            sim.step(1.0)
        assert sim.get_state()["rul"] < HEALTHY_RUL
        sim.clear_faults()
        sim.step(1.0)
        assert sim.get_state()["rul"] == HEALTHY_RUL
