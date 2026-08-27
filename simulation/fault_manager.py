from __future__ import annotations

from dataclasses import dataclass, field

KNOWN_FAULTS = {"sensor_drift", "cooling_degradation"}


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

    def clear(self) -> None:
        self._faults.clear()

    def get_modifiers(self) -> dict:
        target_offsets: dict[str, float] = {}
        output_offsets: dict[str, float] = {}
        tau_multipliers: dict[str, float] = {}

        for fault in self._faults:
            if fault.fault_type == "sensor_drift":
                sensor = str(fault.params["sensor"])
                offset = float(fault.params.get("offset", 0.0))
                output_offsets[sensor] = output_offsets.get(sensor, 0.0) + offset

            elif fault.fault_type == "cooling_degradation":
                severity = float(fault.params.get("severity", 0.3))
                for ch in ("cht", "oil_temp"):
                    target_offsets[ch] = target_offsets.get(ch, 0.0) + severity * 60.0
                    tau_multipliers[ch] = tau_multipliers.get(ch, 1.0) * (1.0 + severity * 0.5)

        return {
            "target_offsets": target_offsets,
            "output_offsets": output_offsets,
            "tau_multipliers": tau_multipliers,
        }
