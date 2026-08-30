import os
import tempfile
import numpy as np
import torch

from ml_pipeline.models import ProbabilisticLSTM
from ml_pipeline.inference import InferenceWrapper, XGBoostInferenceWrapper
from ml_pipeline.train_xgboost import ALL_FAULT_LABELS


def test_inference_wrapper_dummy():
    input_size = 12
    seq_len = 60
    hidden_size = 64
    num_layers = 2

    dummy_model = ProbabilisticLSTM(
        input_size=input_size,
        hidden_size=hidden_size,
        num_layers=num_layers,
    )

    with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as tmp:
        torch.save(dummy_model.state_dict(), tmp.name)
        tmp_path = tmp.name

    try:
        wrapper = InferenceWrapper(
            model_path=tmp_path,
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            device="cpu",
        )

        batch_size = 3
        dummy_input = torch.randn(batch_size, seq_len, input_size)

        mu, sigma = wrapper.predict(dummy_input)

        assert isinstance(mu, list)
        assert isinstance(sigma, list)
        assert len(mu) == batch_size
        assert len(sigma) == batch_size
        assert all(s > 0 for s in sigma), "Sigma must be strictly positive"
    finally:
        os.remove(tmp_path)


def test_xgboost_inference_wrapper():
    from ml_pipeline.train_xgboost import train_model
    from tests.unit.conftest import make_test_mission

    with tempfile.TemporaryDirectory() as tmpdir:
        os.makedirs(os.path.join(tmpdir, "fault_class=healthy"))
        os.makedirs(os.path.join(tmpdir, "fault_class=sensor_drift"))

        make_test_mission("h1", "healthy").to_parquet(os.path.join(tmpdir, "fault_class=healthy", "h1.parquet"))
        make_test_mission("h2", "healthy").to_parquet(os.path.join(tmpdir, "fault_class=healthy", "h2.parquet"))
        make_test_mission("s1", "sensor_drift").to_parquet(os.path.join(tmpdir, "fault_class=sensor_drift", "s1.parquet"))
        make_test_mission("s2", "sensor_drift").to_parquet(os.path.join(tmpdir, "fault_class=sensor_drift", "s2.parquet"))

        model_path = os.path.join(tmpdir, "model.joblib")
        train_model(data_dir=tmpdir, output_model=model_path, n_estimators=5)

        wrapper = XGBoostInferenceWrapper(model_path)
        assert wrapper.labels == ALL_FAULT_LABELS

        X = np.random.normal(1100, 1.0, (5, 3)).astype("float32")
        results = wrapper.predict(X)

        assert isinstance(results, list)
        assert len(results) == 5
        for row in results:
            assert isinstance(row, list)
            for label in row:
                assert label in ALL_FAULT_LABELS
