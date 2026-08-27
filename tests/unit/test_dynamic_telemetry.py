from __future__ import annotations

import pytest
from simulation.engine import Simulation


class TestDynamicTelemetry:
    def test_get_state_includes_engine_load(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        sim.step(1.0)
        state = sim.get_state()
        assert "engine_load" in state

    def test_get_state_includes_injection_timing(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        sim.step(1.0)
        state = sim.get_state()
        assert "injection_timing" in state

    def test_engine_load_near_minimum_at_zero_throttle(self):
        sim = Simulation(throttle=0.0, altitude=0.0)
        for _ in range(20):
            sim.step(1.0)
        state = sim.get_state()
        assert state["engine_load"] < 0.1

    def test_engine_load_near_maximum_at_full_throttle(self):
        sim = Simulation(throttle=1.0, altitude=0.0)
        for _ in range(20):
            sim.step(1.0)
        state = sim.get_state()
        assert state["engine_load"] >= 0.9
        assert state["engine_load"] <= 1.0

    def test_engine_load_scales_with_throttle(self):
        sim_low = Simulation(throttle=0.25, altitude=0.0)
        sim_high = Simulation(throttle=0.75, altitude=0.0)
        for _ in range(20):
            sim_low.step(1.0)
            sim_high.step(1.0)
        assert sim_high.get_state()["engine_load"] > sim_low.get_state()["engine_load"]

    def test_injection_timing_is_instantaneous(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        sim.step(1.0)
        state = sim.get_state()
        assert isinstance(state["injection_timing"], float)
        assert state["injection_timing"] > 0
