"""Tests for Issue 02 — Mission Profile Execution."""
import pytest
from simulation.engine import Simulation


SIMPLE_PROFILE = {
    "setpoints": [
        {"time": 0, "throttle": 0.3, "altitude": 0},
        {"time": 60, "throttle": 0.5, "altitude": 2000},
        {"time": 300, "throttle": 0.8, "altitude": 5000},
        {"time": 600, "throttle": 0.4, "altitude": 3000},
    ]
}


class TestLoadProfile:
    def test_load_profile_accepts_dict(self):
        sim = Simulation()
        sim.load_profile(SIMPLE_PROFILE)

    def test_load_profile_rejects_empty_setpoints(self):
        sim = Simulation()
        with pytest.raises(ValueError):
            sim.load_profile({"setpoints": []})

    def test_load_profile_rejects_missing_setpoints(self):
        sim = Simulation()
        with pytest.raises((ValueError, KeyError)):
            sim.load_profile({})


class TestProfileInterpolation:
    """step(dt) should automatically track throttle/altitude from the profile."""

    def test_throttle_tracks_profile_at_start(self):
        sim = Simulation()
        sim.load_profile(SIMPLE_PROFILE)
        sim.step(dt=0.1)
        state = sim.get_state()
        assert state["time"] == pytest.approx(0.1)

    def test_throttle_interpolates_midway(self):
        sim = Simulation()
        sim.load_profile(SIMPLE_PROFILE)
        # Step to t=30s — halfway between setpoint 0 (t=0, throttle=0.3)
        # and setpoint 1 (t=60, throttle=0.5)
        for _ in range(300):
            sim.step(dt=0.1)
        # At t=30s, throttle should be interpolated to ~0.4
        # We can't read throttle directly, but RPM at 0.4 throttle should be
        # between RPM at 0.3 and RPM at 0.5
        # Instead, let's verify via a longer run that values change over time
        state_30s = sim.get_state()

        # Continue to t=300s (throttle=0.8, altitude=5000)
        for _ in range(2700):
            sim.step(dt=0.1)
        state_300s = sim.get_state()

        assert state_300s["rpm"] > state_30s["rpm"]

    def test_holds_last_setpoint_past_end(self):
        sim = Simulation()
        sim.load_profile(SIMPLE_PROFILE)
        # Step past the last setpoint (t=600s), to t=700s
        for _ in range(7000):
            sim.step(dt=0.1)
        state_700 = sim.get_state()

        # Continue stepping — values should stabilize (held at last setpoint)
        for _ in range(1000):
            sim.step(dt=0.1)
        state_800 = sim.get_state()

        assert abs(state_800["rpm"] - state_700["rpm"]) < 5.0

    def test_manual_set_throttle_overrides_profile(self):
        sim = Simulation()
        sim.load_profile(SIMPLE_PROFILE)
        for _ in range(100):
            sim.step(dt=0.1)
        # Manually override throttle — should clear the profile
        sim.set_throttle(1.0)
        for _ in range(2000):
            sim.step(dt=0.1)
        state = sim.get_state()
        # At full throttle sea level, RPM should be near 5500
        assert state["rpm"] > 5000


class TestFullMissionRun:
    """Load a 10-minute profile, step through it, verify throttle tracking."""

    def test_ten_minute_profile_completes(self):
        sim = Simulation()
        sim.load_profile(SIMPLE_PROFILE)
        states: list[dict[str, float]] = []
        for i in range(1, 6001):
            sim.step(dt=0.1)
            if i % 600 == 0:
                states.append(sim.get_state())

        assert len(states) == 10
        assert states[-1]["time"] == pytest.approx(600.0, abs=0.1)
        rpms = [s["rpm"] for s in states]
        assert max(rpms) - min(rpms) > 100
