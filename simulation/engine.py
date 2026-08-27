from __future__ import annotations

from simulation.fault_manager import FaultManager
from simulation.lag_filter import LagFilter


STEADY_STATE_MAP: dict[str, list[tuple[float, float, float]]] = {
    #                (throttle, altitude_ft, value)
    "rpm":           [(0.0, 0, 800),  (0.25, 0, 2200), (0.5, 0, 3400), (0.75, 0, 4600), (1.0, 0, 5500),
                      (0.0, 10000, 780), (0.5, 10000, 3200), (1.0, 10000, 5200)],
    "cht":           [(0.0, 0, 110), (0.25, 0, 135), (0.5, 0, 165), (0.75, 0, 195), (1.0, 0, 220),
                      (0.0, 10000, 105), (0.5, 10000, 155), (1.0, 10000, 210)],
    "egt":           [(0.0, 0, 350), (0.25, 0, 480), (0.5, 0, 620), (0.75, 0, 740), (1.0, 0, 850),
                      (0.0, 10000, 340), (0.5, 10000, 600), (1.0, 10000, 830)],
    "oil_pressure":  [(0.0, 0, 35), (0.25, 0, 50), (0.5, 0, 65), (0.75, 0, 80), (1.0, 0, 90),
                      (0.0, 10000, 33), (0.5, 10000, 62), (1.0, 10000, 87)],
    "oil_temp":      [(0.0, 0, 70), (0.25, 0, 82), (0.5, 0, 95), (0.75, 0, 110), (1.0, 0, 125),
                      (0.0, 10000, 65), (0.5, 10000, 90), (1.0, 10000, 118)],
    "fuel_flow":     [(0.0, 0, 6), (0.25, 0, 12), (0.5, 0, 20), (0.75, 0, 28), (1.0, 0, 35),
                      (0.0, 10000, 5.5), (0.5, 10000, 18), (1.0, 10000, 32)],
    "battery_voltage": [(0.0, 0, 12.2), (0.25, 0, 13.0), (0.5, 0, 13.6), (0.75, 0, 13.9), (1.0, 0, 14.1),
                        (0.0, 10000, 12.1), (0.5, 10000, 13.5), (1.0, 10000, 14.0)],
}

TIME_CONSTANTS: dict[str, float] = {
    "rpm": 1.5,
    "cht": 25.0,
    "egt": 8.0,
    "oil_pressure": 3.0,
    "oil_temp": 20.0,
    "fuel_flow": 1.0,
    "battery_voltage": 0.5,
}

INITIAL_VALUES: dict[str, float] = {
    "rpm": 800.0,
    "cht": 110.0,
    "egt": 350.0,
    "oil_pressure": 35.0,
    "oil_temp": 70.0,
    "fuel_flow": 6.0,
    "battery_voltage": 12.2,
}


def _interpolate_map(points: list[tuple[float, float, float]], throttle: float, altitude: float) -> float:
    altitudes = sorted(set(p[1] for p in points))
    if len(altitudes) == 1 or altitude <= altitudes[0]:
        return _interp_throttle([p for p in points if p[1] == altitudes[0]], throttle)
    if altitude >= altitudes[-1]:
        return _interp_throttle([p for p in points if p[1] == altitudes[-1]], throttle)

    alt_lo = max(a for a in altitudes if a <= altitude)
    alt_hi = min(a for a in altitudes if a >= altitude)
    if alt_lo == alt_hi:
        return _interp_throttle([p for p in points if p[1] == alt_lo], throttle)

    v_lo = _interp_throttle([p for p in points if p[1] == alt_lo], throttle)
    v_hi = _interp_throttle([p for p in points if p[1] == alt_hi], throttle)
    t = (altitude - alt_lo) / (alt_hi - alt_lo)
    return v_lo + t * (v_hi - v_lo)


def _interp_throttle(points: list[tuple[float, float, float]], throttle: float) -> float:
    pts = sorted(points, key=lambda p: p[0])
    if throttle <= pts[0][0]:
        return pts[0][2]
    if throttle >= pts[-1][0]:
        return pts[-1][2]
    for i in range(len(pts) - 1):
        if pts[i][0] <= throttle <= pts[i + 1][0]:
            t = (throttle - pts[i][0]) / (pts[i + 1][0] - pts[i][0])
            return pts[i][2] + t * (pts[i + 1][2] - pts[i][2])
    return pts[-1][2]


def _interp_profile_value(
    setpoints: list[dict[str, float]], time: float, key: str,
) -> float:
    if time <= setpoints[0]["time"]:
        return setpoints[0][key]
    if time >= setpoints[-1]["time"]:
        return setpoints[-1][key]
    for i in range(len(setpoints) - 1):
        t0 = setpoints[i]["time"]
        t1 = setpoints[i + 1]["time"]
        if t0 <= time <= t1:
            frac = (time - t0) / (t1 - t0) if t1 != t0 else 0.0
            return setpoints[i][key] + frac * (setpoints[i + 1][key] - setpoints[i][key])
    return setpoints[-1][key]


class Simulation:
    def __init__(self, throttle: float = 0.0, altitude: float = 0.0) -> None:
        self._throttle: float = throttle
        self._altitude: float = altitude
        self._time: float = 0.0
        self._profile: list[dict[str, float]] | None = None
        self._fault_manager: FaultManager = FaultManager()
        self._filters: dict[str, LagFilter] = {
            key: LagFilter(initial=INITIAL_VALUES[key], tau=TIME_CONSTANTS[key])
            for key in TIME_CONSTANTS
        }

    def inject_fault(self, fault_type: str, **kwargs: object) -> None:
        self._fault_manager.inject(fault_type, **kwargs)

    def clear_faults(self) -> None:
        self._fault_manager.clear()

    def load_profile(self, profile_data: dict) -> None:
        setpoints = profile_data.get("setpoints")
        if not setpoints:
            raise ValueError("Profile must contain a non-empty 'setpoints' list")
        self._profile = sorted(setpoints, key=lambda s: s["time"])

    def set_throttle(self, throttle: float) -> None:
        self._throttle = throttle
        self._profile = None

    def set_altitude(self, altitude: float) -> None:
        self._altitude = altitude
        self._profile = None

    def step(self, dt: float) -> None:
        if self._profile is not None:
            self._throttle = _interp_profile_value(self._profile, self._time, "throttle")
            self._altitude = _interp_profile_value(self._profile, self._time, "altitude")
        mods = self._fault_manager.get_modifiers()
        for key, filt in self._filters.items():
            target = _interpolate_map(STEADY_STATE_MAP[key], self._throttle, self._altitude)
            target += mods["target_offsets"].get(key, 0.0)
            tau_mult = mods["tau_multipliers"].get(key, 1.0)
            original_tau = filt.tau
            filt.tau = TIME_CONSTANTS[key] * tau_mult
            filt.step(target, dt)
            filt.tau = original_tau
        self._time += dt

    def get_state(self) -> dict[str, float]:
        mods = self._fault_manager.get_modifiers()
        state: dict[str, float] = {"time": self._time}
        for key, filt in self._filters.items():
            state[key] = filt.value + mods["output_offsets"].get(key, 0.0)
        rpm_fraction = state["rpm"] / 5500.0
        baseline_vib = 0.02 + 0.03 * rpm_fraction
        fault_vib = mods["vibration_severity"]
        state["vibration_index"] = min(baseline_vib + fault_vib, 1.0)
        return state
