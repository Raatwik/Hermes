from __future__ import annotations

from simulation.fault_manager import FaultManager
from simulation.lag_filter import LagFilter
import random

SENSOR_NOISE_STD: dict[str, float] = {
    "rpm": 10.0,
    "cht": 2.0,
    "egt": 5.0,
    "egt_1": 5.0,
    "egt_2": 5.0,
    "egt_3": 5.0,
    "egt_4": 5.0,
    "oil_pressure": 0.5,
    "oil_temp": 1.0,
    "fuel_flow": 0.2,
    "battery_voltage": 0.1,
    "vibration_index": 0.005,
    "engine_load": 0.005,
    "injection_timing": 0.2,
}


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

HEALTHY_RUL: float = 5000.0

ATTACK_INITIAL_RUL: dict[str, float] = {
    "misfire": 1500.0,
    "cylinder_failure": 600.0,
    "cooling_degradation": 1200.0,
    "injector_abnormalities": 1000.0,
    "lubrication_issues": 800.0,
    "sensor_drift": 2000.0,
}


class EngineFailureException(RuntimeError):
    """Raised when a stepped simulation has entered a catastrophic failure state.

    The engine registers a dead state the moment a critical telemetry threshold
    is breached; any further call to :meth:`Simulation.step` raises this so that
    downstream consumers stop time-stepping a destroyed engine.
    """

    def __init__(self, reason: str) -> None:
        super().__init__(f"Engine failure: {reason}")
        self.reason = reason


# Speed at or above which the engine is considered to have started running. Once
# the engine has run, a later drop below RPM_STALL_THRESHOLD is a genuine stall
# rather than the normal spin-up transient.
RPM_RUNNING_THRESHOLD = 1000.0

# RPM at or below which a running engine has stalled (catastrophic, non-recoverable).
RPM_STALL_THRESHOLD = 1000.0

# The RPM stall check only applies when the engine is being commanded to produce
# meaningful power. A commanded idle (throttle ~0) legitimately sits near 800 RPM.
STALL_THROTTLE_FLOOR = 0.1

CHT_LIMIT = 250.0
OIL_PRESSURE_LIMIT = 20.0
EGT_LIMIT = 900.0
VIBRATION_LIMIT = 0.9


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
    def __init__(self, throttle: float = 0.0, altitude: float = 0.0, noise_seed: int | None = None, ambient_temp_offset: float = 0.0) -> None:
        self._throttle: float = throttle
        self._altitude: float = altitude
        self._ambient_temp_offset: float = ambient_temp_offset
        self._time: float = 0.0
        self._profile: list[dict[str, float]] | None = None
        self._fault_manager: FaultManager = FaultManager()
        self._filters: dict[str, LagFilter] = {
            key: LagFilter(initial=INITIAL_VALUES[key], tau=TIME_CONSTANTS[key])
            for key in TIME_CONSTANTS
        }
        self._rng = random.Random(noise_seed) if noise_seed is not None else None
        self._is_alive: bool = True
        self._failure_reason: str | None = None
        self._has_run: bool = False
        self._rul_countdowns: list[tuple[float, float]] = []

    @property
    def is_alive(self) -> bool:
        """False once a critical threshold has been breached."""
        return self._is_alive

    @property
    def failure_reason(self) -> str | None:
        """Human-readable description of the breach, or None while alive."""
        return self._failure_reason

    def inject_fault(self, fault_type: str, **kwargs: object) -> None:
        ttf = kwargs.pop("ttf", None)
        if ttf is not None:
            initial_rul = float(ttf)
        else:
            initial_rul = ATTACK_INITIAL_RUL.get(fault_type, HEALTHY_RUL)
        self._rul_countdowns.append((self._time, initial_rul))
        self._fault_manager.inject(fault_type, **kwargs)

    def update_fault_severity(self, fault_type: str, severity: float) -> None:
        self._fault_manager.update_severity(fault_type, severity)

    def update_fault_params(self, fault_type: str, **kwargs: object) -> None:
        self._fault_manager.update_params(fault_type, **kwargs)

    def clear_faults(self) -> None:
        self._fault_manager.clear()
        self._rul_countdowns.clear()

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
        if not self._is_alive:
            raise EngineFailureException(self._failure_reason or "engine is not running")
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
        self._update_liveness()

    def _kill(self, reason: str) -> None:
        self._is_alive = False
        self._failure_reason = reason

    def _update_liveness(self) -> None:
        state = self._raw_state()
        if state["rpm"] >= RPM_RUNNING_THRESHOLD:
            self._has_run = True

        if (
            self._has_run
            and state["throttle"] > STALL_THROTTLE_FLOOR
            and state["rpm"] < RPM_STALL_THRESHOLD
        ):
            self._kill(f"RPM {state['rpm']:.0f} below stall threshold {RPM_STALL_THRESHOLD:.0f}")
            return

        if state["cht"] > CHT_LIMIT:
            self._kill(f"CHT {state['cht']:.1f} exceeded limit {CHT_LIMIT:.0f}")
            return

        if state["oil_pressure"] < OIL_PRESSURE_LIMIT:
            self._kill(f"Oil pressure {state['oil_pressure']:.1f} below limit {OIL_PRESSURE_LIMIT:.0f}")
            return

        for key in ["egt", "egt_1", "egt_2", "egt_3", "egt_4"]:
            if state[key] > EGT_LIMIT:
                self._kill(f"EGT ({key}) {state[key]:.1f} exceeded limit {EGT_LIMIT:.0f}")
                return

        if state["vibration_index"] > VIBRATION_LIMIT:
            self._kill(f"Vibration index {state['vibration_index']:.3f} exceeded limit {VIBRATION_LIMIT}")

    def get_environment(self) -> dict[str, float]:
        altitude_ft = self._altitude
        altitude_m = altitude_ft * 0.3048
        std_temp_k = 288.15 - 0.0065 * altitude_m
        temp_k = std_temp_k + self._ambient_temp_offset
        pressure_pa = 101325.0 * (std_temp_k / 288.15) ** 5.2561
        density = pressure_pa / (287.058 * temp_k)
        return {
            "altitude": altitude_ft,
            "ambient_temperature": temp_k - 273.15,
            "ambient_pressure": pressure_pa / 1000.0,
            "air_density": density,
        }

    def get_state(self) -> dict[str, float]:
        state = self._raw_state()
        if self._rng is not None:
            for key, std in SENSOR_NOISE_STD.items():
                if key in state:
                    state[key] += self._rng.gauss(0.0, std)
        return state

    def _raw_state(self) -> dict[str, float]:
        mods = self._fault_manager.get_modifiers()
        state: dict[str, float] = {
            "time": self._time,
            "throttle": self._throttle
        }
        for key, filt in self._filters.items():
            state[key] = filt.value + mods["output_offsets"].get(key, 0.0)
            
        base_egt = state["egt"]
        for i in range(1, 5):
            cyl_key = f"egt_{i}"
            state[cyl_key] = base_egt + mods["output_offsets"].get(cyl_key, 0.0)
            
        rpm_fraction = state["rpm"] / 5500.0
        baseline_vib = 0.02 + 0.03 * rpm_fraction
        fault_vib = mods["vibration_severity"]
        state["vibration_index"] = min(baseline_vib + fault_vib, 1.0)
        state["engine_load"] = min(self._throttle * rpm_fraction, 1.0)
        state["injection_timing"] = 24.0 + 8.0 * rpm_fraction

        if not self._rul_countdowns:
            state["rul"] = HEALTHY_RUL
        else:
            rul_values = []
            for inject_time, initial_rul in self._rul_countdowns:
                elapsed = self._time - inject_time
                steps = int(elapsed // 10)
                rul_values.append(max(initial_rul - 10.0 * steps, 0.0))
            state["rul"] = min(rul_values)

        return state
