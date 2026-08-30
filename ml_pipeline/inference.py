import numpy as np
import torch
import joblib
from typing import Tuple, Optional
from sklearn.multioutput import MultiOutputClassifier

from ml_pipeline.models import ProbabilisticLSTM


class InferenceWrapper:
    def __init__(
        self,
        model_path: str,
        input_size: int,
        hidden_size: int = 64,
        num_layers: int = 2,
        device: Optional[str] = None,
    ):
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        self.model = ProbabilisticLSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
        ).to(self.device)

        state_dict = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.eval()

    def predict(self, input_data: torch.Tensor) -> Tuple[list[float], list[float]]:
        input_data = input_data.to(self.device)

        with torch.no_grad():
            mu, sigma = self.model(input_data)

        return mu.cpu().tolist(), sigma.cpu().tolist()


class XGBoostInferenceWrapper:
    def __init__(self, model_path: str):
        bundle = joblib.load(model_path)
        self.model: MultiOutputClassifier = bundle["model"]
        self.labels: list[str] = bundle["labels"]

    def predict(self, X: np.ndarray) -> list[list[str]]:
        preds = self.model.predict(X)
        results: list[list[str]] = []
        for row in preds:
            active = [self.labels[i] for i, v in enumerate(row) if v == 1]
            results.append(active)
        return results
