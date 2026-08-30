import torch
import torch.nn as nn
from typing import Tuple

class ProbabilisticLSTM(nn.Module):
    """
    LSTM-based Recurrent Neural Network for probabilistic time-series forecasting.
    Outputs the parameters of a Gaussian distribution (mu, sigma) for the target (e.g., RUL).
    """
    def __init__(self, input_size: int, hidden_size: int = 64, num_layers: int = 2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size, 
            hidden_size=hidden_size, 
            num_layers=num_layers, 
            batch_first=True
        )
        self.fc = nn.Linear(hidden_size, 2)
        # softplus ensures the standard deviation (sigma) is strictly positive
        self.softplus = nn.Softplus()

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            x: Tensor of shape [batch_size, sequence_length, num_features]
            
        Returns:
            mu: Expected value of the target distribution (shape: [batch_size])
            sigma: Standard deviation of the target distribution (shape: [batch_size])
        """
        # lstm_out shape: [batch_size, sequence_length, hidden_size]
        lstm_out, _ = self.lstm(x)
        
        # Take the output of the last time step
        last_hidden_state = lstm_out[:, -1, :]
        
        # Linear layer outputs 2 values per item in batch
        out = self.fc(last_hidden_state)
        
        mu = out[:, 0]
        
        # Sigma must be positive, add a small epsilon for numerical stability
        sigma = self.softplus(out[:, 1]) + 1e-6
        
        return mu, sigma

def gaussian_nll_loss(mu: torch.Tensor, sigma: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    """
    Computes the Negative Log-Likelihood of a Gaussian distribution.
    NLL = 0.5 * log(2 * pi * sigma^2) + (target - mu)^2 / (2 * sigma^2)
    """
    var = sigma ** 2
    nll = 0.5 * torch.log(2 * torch.pi * var) + ((target - mu) ** 2) / (2 * var)
    return nll.mean()
