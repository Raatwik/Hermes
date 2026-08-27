from __future__ import annotations

import pytest
from simulation.engine import Simulation


class TestGetEnvironment:
    def test_sea_level_returns_standard_values(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        env = sim.get_environment()
        assert env["ambient_temperature"] == pytest.approx(15.0, abs=0.1)
        assert env["ambient_pressure"] == pytest.approx(101.325, abs=0.1)
        assert env["air_density"] == pytest.approx(1.225, abs=0.01)

    def test_high_altitude_values_decrease(self):
        sim = Simulation(throttle=0.5, altitude=10000.0)
        env = sim.get_environment()
        assert env["ambient_temperature"] < 15.0
        assert env["ambient_pressure"] < 101.325
        assert env["air_density"] < 1.225

    def test_10000ft_temperature(self):
        sim = Simulation(throttle=0.5, altitude=10000.0)
        env = sim.get_environment()
        expected_temp = 15.0 - 0.001981 * 10000.0
        assert env["ambient_temperature"] == pytest.approx(expected_temp, abs=0.5)

    def test_environment_updates_after_altitude_change(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        env_low = sim.get_environment()
        sim.set_altitude(5000.0)
        env_high = sim.get_environment()
        assert env_high["ambient_temperature"] < env_low["ambient_temperature"]
        assert env_high["ambient_pressure"] < env_low["ambient_pressure"]

    def test_environment_follows_profile_altitude(self):
        sim = Simulation()
        sim.load_profile({
            "setpoints": [
                {"time": 0, "throttle": 0.5, "altitude": 0},
                {"time": 100, "throttle": 0.5, "altitude": 10000},
            ]
        })
        for _ in range(50):
            sim.step(1.0)
        env = sim.get_environment()
        expected_alt = 5000.0
        expected_temp = 15.0 - 0.001981 * expected_alt
        assert env["ambient_temperature"] == pytest.approx(expected_temp, abs=1.0)

    def test_returns_all_three_keys(self):
        sim = Simulation()
        env = sim.get_environment()
        assert set(env.keys()) == {"ambient_temperature", "ambient_pressure", "air_density"}
