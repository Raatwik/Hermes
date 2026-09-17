"""Tests for RUL source indicator and LSTM-driven RUL trajectory pipeline."""

import json
from unittest.mock import patch, MagicMock
from pathlib import Path

from integration.ml_subscriber import MLSubscriber, WINDOW_SIZE


def _make_subscriber():
    with patch("paho.mqtt.client.Client"):
        sub = MLSubscriber(models_dir=Path("/nonexistent"), engine_id="test")
    return sub


def _make_telemetry(time=100.0, throttle=0.5, altitude=5000.0):
    return {
        "time": time,
        "throttle": throttle,
        "altitude": altitude,
        "rpm": 3400.0,
        "cht": 165.0,
        "egt": 620.0,
        "egt_1": 620.0,
        "egt_2": 621.0,
        "egt_3": 619.0,
        "egt_4": 620.0,
        "oil_pressure": 65.0,
        "oil_temp": 95.0,
        "fuel_flow": 20.0,
        "battery_voltage": 13.6,
        "vibration_index": 0.05,
        "engine_load": 0.5,
        "injection_timing": 28.0,
    }


class TestRulSource:
    def test_simulation_fallback_when_lstm_unavailable(self):
        sub = _make_subscriber()
        assert sub._lstm_model is None

        result = sub._process_tick(_make_telemetry())

        assert result["rul_source"] == "simulation"
        assert result["lstm_rul_mean"] is None
        assert result["lstm_rul_std"] is None

    def test_lstm_source_when_model_available(self):
        sub = _make_subscriber()

        mock_model = MagicMock()
        import torch
        mock_model.return_value = (torch.tensor([145.0]), torch.tensor([5.0]))
        sub._lstm_model = mock_model

        for i in range(WINDOW_SIZE):
            sub._process_tick(_make_telemetry(time=float(i)))

        result = sub._process_tick(_make_telemetry(time=float(WINDOW_SIZE)))

        assert result["rul_source"] == "lstm"
        assert result["lstm_rul_mean"] is not None
        assert result["lstm_rul_std"] is not None

    def test_lstm_rul_nulled_on_sensor_fault(self):
        sub = _make_subscriber()

        mock_model = MagicMock()
        import torch
        mock_model.return_value = (torch.tensor([145.0]), torch.tensor([5.0]))
        sub._lstm_model = mock_model

        for i in range(WINDOW_SIZE):
            sub._process_tick(_make_telemetry(time=float(i)))

        telemetry = _make_telemetry(time=float(WINDOW_SIZE))
        telemetry["vibration_index"] = 50.0

        with patch.object(sub, "_classify_divergence", return_value={
            "classification": "sensor_fault",
            "confidence": 0.8,
            "affected_group": "vibration",
            "evidence": [],
        }):
            result = sub._process_tick(telemetry)

        assert result["lstm_rul_mean"] is None
        assert result["lstm_rul_std"] is None

    def test_rul_source_field_always_present(self):
        sub = _make_subscriber()
        result = sub._process_tick(_make_telemetry())
        assert "rul_source" in result

    def test_simulation_source_before_window_fills(self):
        sub = _make_subscriber()
        mock_model = MagicMock()
        sub._lstm_model = mock_model

        result = sub._process_tick(_make_telemetry(time=1.0))

        assert result["rul_source"] == "simulation"
        assert result["lstm_rul_mean"] is None
