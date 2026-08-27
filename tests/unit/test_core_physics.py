"""Tests for Issue 01 — Core Physics & Baseline API."""
import pytest
from simulation.lag_filter import LagFilter
from simulation.engine import Simulation


class TestLagFilter:
    def test_initial_value(self):
        f = LagFilter(initial=100.0, tau=5.0)
        assert f.value == 100.0

    def test_approaches_target_over_time(self):
        f = LagFilter(initial=0.0, tau=2.0)
        for _ in range(200):
            f.step(target=100.0, dt=0.1)
        assert abs(f.value - 100.0) < 0.5

    def test_does_not_snap_instantly(self):
        f = LagFilter(initial=0.0, tau=5.0)
        f.step(target=100.0, dt=0.1)
        assert f.value < 10.0

    def test_zero_dt_no_change(self):
        f = LagFilter(initial=50.0, tau=3.0)
        f.step(target=100.0, dt=0.0)
        assert f.value == 50.0


class TestSimulationBaseline:
    """Baseline Test: step 100s at constant 50% throttle, values stabilize."""

    @pytest.fixture()
    def sim(self) -> Simulation:
        return Simulation(throttle=0.5, altitude=0.0)

    def test_telemetry_stabilizes(self, sim: Simulation):
        for _ in range(1000):
            sim.step(dt=0.1)
        state = sim.get_state()

        assert 1800 < state["rpm"] < 4500
        assert 100 < state["cht"] < 250
        assert 300 < state["egt"] < 900
        assert 20 < state["oil_pressure"] < 120
        assert 60 < state["oil_temp"] < 150
        assert 5 < state["fuel_flow"] < 40
        assert 11.5 < state["battery_voltage"] < 14.5

    def test_values_do_not_oscillate(self, sim: Simulation):
        for _ in range(1000):
            sim.step(dt=0.1)

        samples: list[float] = []
        for _ in range(100):
            sim.step(dt=0.1)
            samples.append(sim.get_state()["cht"])

        spread = max(samples) - min(samples)
        assert spread < 1.0, f"CHT oscillating: spread={spread}"


class TestSimulationTransient:
    """Transient Test: throttle change shows lag, not instant snap."""

    def test_throttle_change_is_gradual(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        for _ in range(1000):
            sim.step(dt=0.1)
        state_before = sim.get_state()

        sim.set_throttle(0.8)
        for _ in range(50):
            sim.step(dt=0.1)
        state_after_5s = sim.get_state()

        sim_full = Simulation(throttle=0.8, altitude=0.0)
        for _ in range(2000):
            sim_full.step(dt=0.1)
        state_full = sim_full.get_state()

        assert state_after_5s["cht"] > state_before["cht"]
        assert state_after_5s["cht"] < state_full["cht"]

        assert state_after_5s["egt"] > state_before["egt"]
        assert state_after_5s["egt"] < state_full["egt"]

        assert state_after_5s["rpm"] > state_before["rpm"]
        assert state_after_5s["rpm"] < state_full["rpm"]


class TestGetState:
    def test_returns_all_required_keys(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        sim.step(dt=0.1)
        state = sim.get_state()
        required = {
            "rpm", "cht", "egt", "oil_pressure",
            "oil_temp", "fuel_flow", "battery_voltage", "time",
        }
        assert required.issubset(state.keys())

    def test_time_advances(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        sim.step(dt=1.0)
        sim.step(dt=0.5)
        assert abs(sim.get_state()["time"] - 1.5) < 1e-9
