"""Tests for Issue 02 — Interactive Single-Fault Selection.

Verifies that each supported fault type alters the expected physics sensors
and that the fault signature is captured in CSV export.
"""
import csv
import inspect
import tempfile
import pytest
from simulation.engine import Simulation
from simulation.fault_manager import KNOWN_FAULTS


def _run_to_steady(sim, steps=1000, dt=0.1):
    for _ in range(steps):
        sim.step(dt)
    return sim.get_state()


class TestAllFaultTypesAlterPhysics:
    """Each fault type must produce a measurable deviation from the healthy baseline."""

    def test_misfire_drops_rpm_and_raises_egt(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        baseline = _run_to_steady(sim)

        sim.inject_fault("misfire", severity=0.5)
        faulted = _run_to_steady(sim, steps=500)

        assert faulted["rpm"] < baseline["rpm"]
        assert faulted["egt"] > baseline["egt"]
        assert faulted["vibration_index"] > baseline["vibration_index"]

    def test_injector_abnormalities_reduces_fuel_flow(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        baseline = _run_to_steady(sim)

        sim.inject_fault("injector_abnormalities", severity=0.5)
        faulted = _run_to_steady(sim, steps=500)

        assert faulted["fuel_flow"] < baseline["fuel_flow"]
        assert faulted["egt"] > baseline["egt"]

    def test_lubrication_issues_drops_oil_pressure(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        baseline = _run_to_steady(sim)

        sim.inject_fault("lubrication_issues", severity=0.5)
        faulted = _run_to_steady(sim, steps=500)

        assert faulted["oil_pressure"] < baseline["oil_pressure"]
        assert faulted["oil_temp"] > baseline["oil_temp"]
        assert faulted["vibration_index"] > baseline["vibration_index"]

    def test_cylinder_failure_drops_rpm_and_spikes_vibration(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        baseline = _run_to_steady(sim)

        sim.inject_fault("cylinder_failure", severity=0.5, cylinder=2)
        faulted = _run_to_steady(sim, steps=500)

        assert faulted["rpm"] < baseline["rpm"]
        assert faulted["vibration_index"] > baseline["vibration_index"]

    def test_cylinder_failure_affects_specific_egt(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        baseline = _run_to_steady(sim)

        sim.inject_fault("cylinder_failure", severity=0.5, cylinder=3)
        faulted = _run_to_steady(sim, steps=500)

        assert faulted["egt_3"] < baseline["egt_3"]
        assert abs(faulted["egt_1"] - baseline["egt_1"]) < abs(faulted["egt_3"] - baseline["egt_3"])


class TestInteractiveMenuCoversAllFaults:
    """The interactive menu must list every fault type the engine supports."""

    def test_menu_lists_all_known_faults(self):
        import simulation.scenarios.interactive_attack_scenario as scenario
        source = inspect.getsource(scenario._configure_fault_injection)
        for fault in KNOWN_FAULTS:
            assert fault in source, \
                f"Fault type '{fault}' missing from interactive menu"


class TestFaultSignatureInCSV:
    """Fault signatures must be visible in the exported CSV telemetry."""

    def _run_sim_to_csv(self, fault_type, fault_kwargs, steps=200):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _run_to_steady(sim)

        sim.inject_fault(fault_type, **fault_kwargs)

        rows = []
        for _ in range(steps):
            sim.step(0.1)
            state = sim.get_state()
            env = sim.get_environment()
            rows.append({
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
            })
        return rows

    def _baseline_csv(self, steps=200):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _run_to_steady(sim)

        rows = []
        for _ in range(steps):
            sim.step(0.1)
            state = sim.get_state()
            rows.append({"rpm": state["rpm"], "egt": state["egt"],
                         "oil_pressure": state["oil_pressure"],
                         "fuel_flow": state["fuel_flow"],
                         "vibration_index": state["vibration_index"]})
        return rows

    def test_misfire_signature_in_csv(self):
        baseline = self._baseline_csv()
        faulted = self._run_sim_to_csv("misfire", {"severity": 0.5})

        avg_baseline_rpm = sum(r["rpm"] for r in baseline) / len(baseline)
        avg_faulted_rpm = sum(r["rpm"] for r in faulted) / len(faulted)
        assert avg_faulted_rpm < avg_baseline_rpm - 50

    def test_lubrication_signature_in_csv(self):
        baseline = self._baseline_csv()
        faulted = self._run_sim_to_csv("lubrication_issues", {"severity": 0.5})

        avg_baseline_oil = sum(r["oil_pressure"] for r in baseline) / len(baseline)
        avg_faulted_oil = sum(r["oil_pressure"] for r in faulted) / len(faulted)
        assert avg_faulted_oil < avg_baseline_oil - 5

    def test_csv_has_all_required_columns(self):
        rows = self._run_sim_to_csv("misfire", {"severity": 0.3}, steps=5)
        required = {"time_sec", "throttle", "altitude", "rpm", "cht", "egt",
                     "egt_1", "egt_2", "egt_3", "egt_4", "oil_pressure",
                     "oil_temp", "fuel_flow", "battery_voltage",
                     "vibration_index", "engine_load", "injection_timing"}
        assert required == set(rows[0].keys())

    def test_csv_round_trip_preserves_fault_signature(self):
        """Write faulted telemetry to a real CSV and read it back."""
        rows = self._run_sim_to_csv("misfire", {"severity": 0.5}, steps=50)
        fieldnames = list(rows[0].keys())

        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
            path = f.name

        with open(path, newline="") as f:
            reader = csv.DictReader(f)
            read_rows = list(reader)

        assert len(read_rows) == 50
        assert set(reader.fieldnames) == set(fieldnames)
        last_rpm = float(read_rows[-1]["rpm"])
        assert last_rpm < 3400
