import os
import tempfile
import pandas as pd
import numpy as np
import joblib

from ml_pipeline.train_xgboost import train_model, load_data, ALL_FAULT_LABELS, _build_onehot
from tests.unit.conftest import make_test_mission


def test_xgboost_multilabel_pipeline():
    with tempfile.TemporaryDirectory() as tmpdir:
        os.makedirs(os.path.join(tmpdir, "fault_class=healthy"))
        os.makedirs(os.path.join(tmpdir, "fault_class=sensor_drift"))
        os.makedirs(os.path.join(tmpdir, "fault_class=misfire"))

        make_test_mission("m1", "healthy").to_parquet(
            os.path.join(tmpdir, "fault_class=healthy", "m1.parquet")
        )
        make_test_mission("m2", "healthy").to_parquet(
            os.path.join(tmpdir, "fault_class=healthy", "m2.parquet")
        )
        make_test_mission("m3", "sensor_drift").to_parquet(
            os.path.join(tmpdir, "fault_class=sensor_drift", "m3.parquet")
        )
        make_test_mission("m4", "sensor_drift").to_parquet(
            os.path.join(tmpdir, "fault_class=sensor_drift", "m4.parquet")
        )
        make_test_mission("m5", "misfire", secondary_fault_class="sensor_drift").to_parquet(
            os.path.join(tmpdir, "fault_class=misfire", "m5.parquet")
        )
        make_test_mission("m6", "misfire", secondary_fault_class="sensor_drift").to_parquet(
            os.path.join(tmpdir, "fault_class=misfire", "m6.parquet")
        )

        model_path = os.path.join(tmpdir, "model.joblib")
        model = train_model(data_dir=tmpdir, output_model=model_path, n_estimators=10)

        assert model is not None
        assert os.path.exists(model_path)

        bundle = joblib.load(model_path)
        assert "model" in bundle
        assert "labels" in bundle
        assert bundle["labels"] == ALL_FAULT_LABELS

        df = load_data(tmpdir)
        feature_cols = [
            c for c in df.columns
            if c not in [
                "time", "fault_class", "mission_id", "fault_severity",
                "secondary_fault_class", "secondary_fault_severity",
            ]
        ]
        X = df[feature_cols]

        preds = model.predict(X)
        assert preds.shape == (len(df), len(ALL_FAULT_LABELS))
        assert set(np.unique(preds)).issubset({0, 1})


def test_build_onehot_compound():
    df = pd.DataFrame({
        "fault_class": ["misfire", "sensor_drift", "healthy"],
        "secondary_fault_class": ["sensor_drift", "none", "none"],
    })
    y = _build_onehot(df, ALL_FAULT_LABELS)
    assert y.shape == (3, len(ALL_FAULT_LABELS))

    misfire_idx = ALL_FAULT_LABELS.index("misfire")
    sensor_idx = ALL_FAULT_LABELS.index("sensor_drift")

    assert y[0, misfire_idx] == 1
    assert y[0, sensor_idx] == 1
    assert y[1, sensor_idx] == 1
    assert y[1, misfire_idx] == 0
    assert y[2].sum() == 0


def test_multilabel_predicts_multiple_active_faults():
    with tempfile.TemporaryDirectory() as tmpdir:
        os.makedirs(os.path.join(tmpdir, "fault_class=healthy"))
        os.makedirs(os.path.join(tmpdir, "fault_class=sensor_drift"))
        os.makedirs(os.path.join(tmpdir, "fault_class=misfire"))

        for i in range(3):
            make_test_mission(f"h{i}", "healthy", n=30).to_parquet(
                os.path.join(tmpdir, "fault_class=healthy", f"h{i}.parquet")
            )
        for i in range(3):
            make_test_mission(f"sd{i}", "sensor_drift", n=30).to_parquet(
                os.path.join(tmpdir, "fault_class=sensor_drift", f"sd{i}.parquet")
            )
        for i in range(4):
            make_test_mission(f"comp{i}", "misfire", "sensor_drift", n=30).to_parquet(
                os.path.join(tmpdir, "fault_class=misfire", f"comp{i}.parquet")
            )

        model_path = os.path.join(tmpdir, "model.joblib")
        model = train_model(data_dir=tmpdir, output_model=model_path, n_estimators=30)

        compound = make_test_mission("test", "misfire", "sensor_drift", n=10)
        feature_cols = [
            c for c in compound.columns
            if c not in [
                "time", "fault_class", "mission_id", "fault_severity",
                "secondary_fault_class", "secondary_fault_severity",
            ]
        ]
        preds = model.predict(compound[feature_cols])

        rows_with_multiple = sum(row.sum() > 1 for row in preds)
        assert rows_with_multiple > 0, "Model should predict multiple labels on compound-fault data"
