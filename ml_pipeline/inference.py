import torch
from typing import Tuple, Optional
from ml_pipeline.models import ProbabilisticLSTM

class InferenceWrapper:
    """
    A clean wrapper for inference using the trained ProbabilisticLSTM model.
    Loads saved weights and provides a standard predict method for the FastAPI backend.
    """
    def __init__(
        self, 
        model_path: str, 
        input_size: int, 
        hidden_size: int = 64, 
        num_layers: int = 2,
        device: Optional[str] = None
    ):
        """
        Initializes the model and loads the pre-trained weights from disk.
        """
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
            
        self.model = ProbabilisticLSTM(
            input_size=input_size, 
            hidden_size=hidden_size, 
            num_layers=num_layers
        ).to(self.device)
        
        # Load weights
        state_dict = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.eval()

    def predict(self, input_data: torch.Tensor) -> Tuple[list[float], list[float]]:
        """
        Run inference on a given input tensor.
        
        Args:
            input_data: Tensor of shape [batch_size, sequence_length, num_features]
            
        Returns:
            mu: Expected value of the target RUL distribution (shape: [batch_size])
            sigma: Standard deviation of the target RUL distribution (shape: [batch_size])
        """
        input_data = input_data.to(self.device)
        
        with torch.no_grad():
            mu, sigma = self.model(input_data)
        
        return mu.cpu().tolist(), sigma.cpu().tolist()
