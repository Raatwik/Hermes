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

    def test_returns_expected_keys(self):
        sim = Simulation()
        env = sim.get_environment()
        assert set(env.keys()) == {"altitude", "ambient_temperature", "ambient_pressure", "air_density"}

    def test_ambient_temp_offset_affects_engine_outputs(self):
        sim_default = Simulation(throttle=0.5, altitude=0.0)
        env_default = sim_default.get_environment()
        
        sim_hot = Simulation(throttle=0.5, altitude=0.0, ambient_temp_offset=10.0)
        env_hot = sim_hot.get_environment()
        
        sim_cold = Simulation(throttle=0.5, altitude=0.0, ambient_temp_offset=-10.0)
        env_cold = sim_cold.get_environment()
        
        assert env_hot["ambient_temperature"] == pytest.approx(env_default["ambient_temperature"] + 10.0, abs=0.1)
        assert env_cold["ambient_temperature"] == pytest.approx(env_default["ambient_temperature"] - 10.0, abs=0.1)
        
        # A higher ambient temperature means a lower air density at same altitude
        assert env_hot["air_density"] < env_default["air_density"]
        # A lower ambient temperature means a higher air density at same altitude
        assert env_cold["air_density"] > env_default["air_density"]
