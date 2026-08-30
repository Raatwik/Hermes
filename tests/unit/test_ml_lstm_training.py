import os
import tempfile
import numpy as np
import pandas as pd
import pytest
import torch

from ml_pipeline.train_lstm_rul import train_model
from ml_pipeline.dataset import TelemetryDataset, DatasetConfig


def _make_terminating_mission(mission_id, num_steps, fault_injection_step=None):
    """Create a synthetic mission that terminates at engine death."""
    dt = 0.1
    time_arr = np.arange(num_steps) * dt

    rpm = np.random.normal(2500, 10, num_steps).astype("float32")
    rpm_residual = np.random.normal(0, 1, num_steps).astype("float32")
    cht = np.random.normal(180, 5, num_steps).astype("float32")
    cht_residual = np.random.normal(0, 1, num_steps).astype("float32")

    if fault_injection_step is not None:
        degradation = np.zeros(num_steps, dtype="float32")
        for i in range(fault_injection_step, num_steps):
            progress = (i - fault_injection_step) / (num_steps - fault_injection_step)
            degradation[i] = progress * 300
        rpm -= degradation
        rpm_residual[fault_injection_step:] += np.linspace(0, 50, num_steps - fault_injection_step)

    end_time = time_arr[-1]
    if fault_injection_step is not None:
        inj_time = time_arr[fault_injection_step]
        rul = np.where(time_arr < inj_time, 500.0, np.maximum(0.0, end_time - time_arr))
    else:
        rul = np.full(num_steps, 500.0)

    return pd.DataFrame({
        "time": time_arr,
        "rpm": rpm,
        "rpm_residual": rpm_residual,
        "cht": cht,
        "cht_residual": cht_residual,
        "fault_class": ["misfire" if fault_injection_step else "healthy"] * num_steps,
        "fault_severity": [0.0] * num_steps,
        "Remaining_Useful_Life": rul.astype("float32"),
        "mission_id": [mission_id] * num_steps,
    })


@pytest.fixture
def terminating_dataset_dir():
    with tempfile.TemporaryDirectory() as tmp:
        lengths = [1200, 1000, 1100, 900, 1050, 950]
        for i, n in enumerate(lengths):
            fault_step = n // 3 if i % 2 == 1 else None
            df = _make_terminating_mission(f"mission_{i}", n, fault_step)
            df.to_parquet(os.path.join(tmp, f"mission_{i}.parquet"))
        yield tmp


def test_lstm_trains_on_variable_length_missions(terminating_dataset_dir):
    """Checklist items 1-3: train_lstm_rul.py executes on variable-length
    physically-terminating data without shape mismatch or NaN errors,
    and saves .pt weights."""
    with tempfile.TemporaryDirectory() as model_dir:
        save_path = os.path.join(model_dir, "lstm_test.pt")
        model = train_model(
            data_dir=terminating_dataset_dir,
            model_save_path=save_path,
            epochs=3,
            batch_size=8,
            learning_rate=1e-3,
            patience=5,
        )
        assert model is not None
        assert os.path.exists(save_path), "Model weights were not saved"

        state_dict = torch.load(save_path, weights_only=True)
        assert len(state_dict) > 0


def test_dataset_uses_precomputed_rul(terminating_dataset_dir):
    """Verify the dataset reads the Remaining_Useful_Life column instead of
    computing a naive countdown."""
    files = [
        os.path.join(terminating_dataset_dir, f)
        for f in os.listdir(terminating_dataset_dir)
        if f.endswith(".parquet")
    ]
    config = DatasetConfig(window_size=5, downsample_rate=1)
    ds = TelemetryDataset(file_paths=files[:1], config=config)

    df = pd.read_parquet(files[0])
    expected_last_rul = df["Remaining_Useful_Life"].iloc[-1] / 3600.0

    _, last_target = ds[-1]
    assert abs(last_target.item() - expected_last_rul) < 1e-4


def test_no_nan_in_training_outputs(terminating_dataset_dir):
    """No NaN values should appear in features or targets."""
    files = [
        os.path.join(terminating_dataset_dir, f)
        for f in os.listdir(terminating_dataset_dir)
        if f.endswith(".parquet")
    ]
    config = DatasetConfig(window_size=5, downsample_rate=1)
    ds = TelemetryDataset(file_paths=files, config=config)

    for i in range(len(ds)):
        features, target = ds[i]
        assert not torch.isnan(features).any(), f"NaN in features at index {i}"
        assert not torch.isnan(target).any(), f"NaN in target at index {i}"
