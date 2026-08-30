"""Tests for Issue 01 — End-to-End Engine Stall Termination.

Covers the catastrophic-failure mechanism: the simulation registers a dead
state when RPM drops below the stall threshold, refuses to advance further,
and the telemetry pipeline halts early and exports a shortened dataset.
"""
import pytest

from simulation.engine import Simulation, EngineFailureException
from datasets.generate_mission import (
    FaultScheduler,
    MissionProfile,
    PhaseInterval,
    run_pipeline,
)
import pandas as pd


def _stabilize(sim: Simulation, seconds: float = 60.0, dt: float = 0.1) -> None:
    for _ in range(int(seconds / dt)):
        sim.step(dt=dt)


class TestSimulationStallDetection:
    def test_healthy_engine_stays_alive(self):
        sim = Simulation(throttle=0.5, altitude=0.0)
        _stabilize(sim, seconds=120.0)
        assert sim.is_alive

    def test_commanded_idle_is_not_a_stall(self):
        """An engine idling at zero throttle sits below 1000 RPM but is alive."""
        sim = Simulation(throttle=0.0, altitude=0.0)
        _stabilize(sim, seconds=30.0)
        assert sim.is_alive

    def test_rpm_collapse_registers_a_stall(self):
        sim = Simulation(throttle=0.2, altitude=0.0)
        _stabilize(sim, seconds=30.0)
        assert sim.is_alive

        # A total cylinder failure drops the RPM target far below idle.
        sim.inject_fault("cylinder_failure", cylinder=1, severity=1.0)
        for _ in range(600):
            if not sim.is_alive:
                break
            sim.step(dt=0.1)

        assert not sim.is_alive
        assert sim.get_state()["rpm"] < 1000.0

    def test_step_refuses_to_advance_after_stall(self):
        sim = Simulation(throttle=0.2, altitude=0.0)
        _stabilize(sim, seconds=30.0)
        sim.inject_fault("cylinder_failure", cylinder=1, severity=1.0)
        for _ in range(600):
            if not sim.is_alive:
                break
            sim.step(dt=0.1)
        assert not sim.is_alive

        time_at_death = sim.get_state()["time"]
        with pytest.raises(EngineFailureException):
            sim.step(dt=0.1)
        # Time did not advance past the moment of failure.
        assert sim.get_state()["time"] == pytest.approx(time_at_death)


def _constant_profile(throttle: float, duration: float) -> MissionProfile:
    return MissionProfile(
        setpoints=[
            {"time": 0.0, "throttle": throttle, "altitude": 0.0},
            {"time": duration, "throttle": throttle, "altitude": 0.0},
        ],
        ambient_temp_offset=0.0,
        phase_intervals=[PhaseInterval(name="Cruise", start_time=0.0, end_time=duration)],
    )


class TestPipelineEarlyTermination:
    def test_catastrophic_fault_produces_shorter_dataset(self, tmp_path):
        duration = 120.0
        dt = 0.1
        scheduled_steps = int(duration / dt) + 1

        profile = _constant_profile(throttle=0.2, duration=duration)
        scheduler = FaultScheduler(duration, force_fault_class="cylinder_failure")
        scheduler.injection_time = 0.0
        scheduler.fault_kwargs = {"cylinder": 1}

        out_dir = tmp_path / "catastrophic"
        run_pipeline(profile=profile, output_dir=str(out_dir), dt=dt, scheduler=scheduler)

        df = pd.read_parquet(out_dir)
        assert len(df) < scheduled_steps
        assert df["time"].iloc[-1] < duration
        # RUL for the truncated mission bottoms out at zero at the point of failure.
        assert df["Remaining_Useful_Life"].iloc[-1] == pytest.approx(0.0, abs=1e-5)

    def test_healthy_mission_runs_full_length(self, tmp_path):
        duration = 60.0
        dt = 0.1
        scheduled_steps = int(duration / dt) + 1

        profile = _constant_profile(throttle=0.5, duration=duration)
        scheduler = FaultScheduler(duration, force_fault_class="healthy")

        out_dir = tmp_path / "healthy"
        run_pipeline(profile=profile, output_dir=str(out_dir), dt=dt, scheduler=scheduler)

        df = pd.read_parquet(out_dir)
        assert len(df) == scheduled_steps
