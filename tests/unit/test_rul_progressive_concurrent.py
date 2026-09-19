"""Tests for Issue 07 — Progressive TTF & Concurrent Fault Handling."""
import pytest
from simulation.engine import Simulation, HEALTHY_RUL, ATTACK_INITIAL_RUL


class TestProgressiveTTFAsRul:
    def test_progressive_fault_uses_ttf_as_initial_rul(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("misfire", severity=0.0, ttf=300)
        sim.step(1.0)
        assert sim.get_state()["rul"] == 300.0

    def test_progressive_ttf_overrides_lookup(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("misfire", severity=0.0, ttf=750)
        sim.step(1.0)
        assert sim.get_state()["rul"] == 750.0
        assert sim.get_state()["rul"] != ATTACK_INITIAL_RUL["misfire"]

    def test_progressive_ttf_counts_down_in_10s_steps(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("cooling_degradation", severity=0.0, ttf=200)
        for _ in range(15):
            sim.step(1.0)
        assert sim.get_state()["rul"] == 200.0 - 10.0

    def test_progressive_ttf_floors_at_zero(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("misfire", severity=0.0, ttf=50)
        for _ in range(600):
            sim.step(1.0)
        assert sim.get_state()["rul"] == 0.0


class TestConcurrentFaultMinRul:
    def test_two_faults_takes_minimum(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("misfire", severity=0.5)
        sim.inject_fault("cylinder_failure", cylinder=1, severity=0.5)
        sim.step(1.0)
        expected = min(ATTACK_INITIAL_RUL["misfire"], ATTACK_INITIAL_RUL["cylinder_failure"])
        assert sim.get_state()["rul"] == expected

    def test_min_rul_tracks_fastest_countdown(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("sensor_drift", sensor="egt", offset=50)
        for _ in range(50):
            sim.step(1.0)
        sim.inject_fault("cylinder_failure", cylinder=2, severity=0.5)
        sim.step(1.0)
        sensor_rul = ATTACK_INITIAL_RUL["sensor_drift"] - 10.0 * (51 // 10)
        cyl_rul = ATTACK_INITIAL_RUL["cylinder_failure"]
        assert sim.get_state()["rul"] == min(sensor_rul, cyl_rul)

    def test_three_faults_min_rul(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("misfire", severity=0.3)
        sim.inject_fault("lubrication_issues", severity=0.5)
        sim.inject_fault("cooling_degradation", severity=0.4)
        sim.step(1.0)
        expected = min(
            ATTACK_INITIAL_RUL["misfire"],
            ATTACK_INITIAL_RUL["lubrication_issues"],
            ATTACK_INITIAL_RUL["cooling_degradation"],
        )
        assert sim.get_state()["rul"] == expected

    def test_progressive_and_static_concurrent(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("misfire", severity=0.5)
        sim.inject_fault("cooling_degradation", severity=0.0, ttf=100)
        sim.step(1.0)
        expected = min(ATTACK_INITIAL_RUL["misfire"], 100.0)
        assert sim.get_state()["rul"] == expected

    def test_concurrent_countdown_diverges_over_time(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("sensor_drift", sensor="egt", offset=50)
        sim.inject_fault("cylinder_failure", cylinder=1, severity=0.5)
        for _ in range(25):
            sim.step(1.0)
        sensor_rul = ATTACK_INITIAL_RUL["sensor_drift"] - 10.0 * (25 // 10)
        cyl_rul = ATTACK_INITIAL_RUL["cylinder_failure"] - 10.0 * (25 // 10)
        assert sim.get_state()["rul"] == min(sensor_rul, cyl_rul)

    def test_staggered_injection_elapsed_counted_independently(self):
        sim = Simulation(throttle=0.5)
        sim.step(1.0)
        sim.inject_fault("sensor_drift", sensor="egt", offset=50)
        for _ in range(20):
            sim.step(1.0)
        sim.inject_fault("misfire", severity=0.5)
        sim.step(1.0)
        sensor_rul = ATTACK_INITIAL_RUL["sensor_drift"] - 10.0 * (21 // 10)
        misfire_rul = ATTACK_INITIAL_RUL["misfire"] - 10.0 * (1 // 10)
        assert sim.get_state()["rul"] == min(sensor_rul, misfire_rul)
