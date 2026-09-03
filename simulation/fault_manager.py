from __future__ import annotations

from dataclasses import dataclass, field

KNOWN_FAULTS = {
    "sensor_drift", "cooling_degradation",
    "misfire", "injector_abnormalities", "lubrication_issues", "cylinder_failure",
}


@dataclass
class _ActiveFault:
    fault_type: str
    params: dict


class FaultManager:
    def __init__(self) -> None:
        self._faults: list[_ActiveFault] = []

    def inject(self, fault_type: str, **kwargs: object) -> None:
        if fault_type not in KNOWN_FAULTS:
            raise ValueError(f"Unknown fault type: {fault_type}")
        self._faults.append(_ActiveFault(fault_type=fault_type, params=dict(kwargs)))

    def update_severity(self, fault_type: str, severity: float) -> None:
        for fault in self._faults:
            if fault.fault_type == fault_type:
                fault.params["severity"] = severity
                return
        raise ValueError(f"No active fault of type: {fault_type}")

    def clear(self) -> None:
        self._faults.clear()

    def get_modifiers(self) -> dict:
        target_offsets: dict[str, float] = {}
        output_offsets: dict[str, float] = {}
        tau_multipliers: dict[str, float] = {}
        vibration_severity: float = 0.0

        for fault in self._faults:
            sev = float(fault.params.get("severity", 0.3))

            if fault.fault_type == "sensor_drift":
                sensor = str(fault.params["sensor"])
                offset = float(fault.params.get("offset", 0.0))
                output_offsets[sensor] = output_offsets.get(sensor, 0.0) + offset

            elif fault.fault_type == "cooling_degradation":
                for ch in ("cht", "oil_temp"):
                    target_offsets[ch] = target_offsets.get(ch, 0.0) + sev * 60.0
                    tau_multipliers[ch] = tau_multipliers.get(ch, 1.0) * (1.0 + sev * 0.5)

            elif fault.fault_type == "misfire":
                target_offsets["rpm"] = target_offsets.get("rpm", 0.0) - sev * 400.0
                target_offsets["egt"] = target_offsets.get("egt", 0.0) + sev * 80.0
                vibration_severity += sev * 0.6

            elif fault.fault_type == "injector_abnormalities":
                target_offsets["fuel_flow"] = target_offsets.get("fuel_flow", 0.0) - sev * 6.0
                target_offsets["egt"] = target_offsets.get("egt", 0.0) + sev * 50.0
                vibration_severity += sev * 0.2

            elif fault.fault_type == "lubrication_issues":
                target_offsets["oil_pressure"] = target_offsets.get("oil_pressure", 0.0) - sev * 25.0
                target_offsets["oil_temp"] = target_offsets.get("oil_temp", 0.0) + sev * 40.0
                vibration_severity += sev * 0.3

            elif fault.fault_type == "cylinder_failure":
                cyl = int(fault.params.get("cylinder", 1))
                output_offsets[f"egt_{cyl}"] = output_offsets.get(f"egt_{cyl}", 0.0) - sev * 300.0
                target_offsets["rpm"] = target_offsets.get("rpm", 0.0) - sev * 1500.0
                vibration_severity += sev * 0.8

        return {
            "target_offsets": target_offsets,
            "output_offsets": output_offsets,
            "tau_multipliers": tau_multipliers,
            "vibration_severity": min(vibration_severity, 1.0),
        }
