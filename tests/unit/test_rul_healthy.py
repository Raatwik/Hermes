"""Tests for Issue 05 — RUL framework & Healthy State."""
import csv
import io
import pytest
from simulation.engine import Simulation, HEALTHY_RUL


class TestRulInState:
    def test_rul_present_in_state(self):
        sim = Simulation()
        sim.step(1.0)
        state = sim.get_state()
        assert "rul" in state

    def test_rul_healthy_default(self):
        sim = Simulation()
        sim.step(1.0)
        state = sim.get_state()
        assert state["rul"] == HEALTHY_RUL

    def test_rul_remains_healthy_over_time(self):
        sim = Simulation(throttle=0.6, altitude=5000)
        for _ in range(100):
            sim.step(1.0)
        state = sim.get_state()
        assert state["rul"] == HEALTHY_RUL

    def test_rul_healthy_constant_value(self):
        assert HEALTHY_RUL == 5000.0


class TestRulInCsv:
    def _run_healthy_csv(self, steps=5):
        from simulation.engine import Simulation
        sim = Simulation()
        profile = {
            "setpoints": [
                {"time": 0, "throttle": 0.6, "altitude": 0},
                {"time": 100, "throttle": 0.6, "altitude": 0},
            ]
        }
        sim.load_profile(profile)

        buf = io.StringIO()
        fieldnames = [
            "time_sec", "throttle", "altitude", "rpm", "cht",
            "egt", "egt_1", "egt_2", "egt_3", "egt_4",
            "oil_pressure", "oil_temp", "fuel_flow", "battery_voltage",
            "vibration_index", "engine_load", "injection_timing", "rul"
        ]
        writer = csv.DictWriter(buf, fieldnames=fieldnames)
        writer.writeheader()

        for _ in range(steps):
            sim.step(1.0)
            state = sim.get_state()
            env = sim.get_environment()
            writer.writerow({
                "time_sec": round(state["time"], 2),
                "throttle": round(state["throttle"], 2),
                "altitude": round(env["altitude"], 2),
                "rpm": round(state.get("rpm", 0), 2),
                "cht": round(state.get("cht", 0), 2),
                "egt": round(state.get("egt", 0), 2),
                "egt_1": round(state.get("egt_1", 0), 2),
                "egt_2": round(state.get("egt_2", 0), 2),
                "egt_3": round(state.get("egt_3", 0), 2),
                "egt_4": round(state.get("egt_4", 0), 2),
                "oil_pressure": round(state.get("oil_pressure", 0), 2),
                "oil_temp": round(state.get("oil_temp", 0), 2),
                "fuel_flow": round(state.get("fuel_flow", 0), 2),
                "battery_voltage": round(state.get("battery_voltage", 0), 2),
                "vibration_index": round(state.get("vibration_index", 0), 4),
                "engine_load": round(state.get("engine_load", 0), 4),
                "injection_timing": round(state.get("injection_timing", 0), 2),
                "rul": round(state.get("rul", 5000.0), 1),
            })

        buf.seek(0)
        return list(csv.DictReader(buf))

    def test_rul_column_in_csv_header(self):
        rows = self._run_healthy_csv(steps=1)
        assert "rul" in rows[0]

    def test_rul_csv_value_is_healthy(self):
        rows = self._run_healthy_csv(steps=3)
        for row in rows:
            assert float(row["rul"]) == 5000.0
