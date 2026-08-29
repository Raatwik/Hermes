import pytest
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from typing import Tuple

from ml_pipeline.models import ProbabilisticLSTM, gaussian_nll_loss

class ToyDegradationDataset(Dataset):
    """
    A small, deterministic "toy" dataset of 5 simple linear degradation missions.
    Each mission has 100 timesteps.
    Features: a single feature that grows linearly from 0 to 1.
    Target (RUL): drops in a perfect straight line from 1.0 to 0.01.
    """
    def __init__(self, num_missions=5, seq_len=10, mission_len=100):
        self.seq_len = seq_len
        self.windows = []
        self.targets = []
        
        for _ in range(num_missions):
            features = np.linspace(0, 1, mission_len).reshape(-1, 1)
            rul = np.linspace(1.0, 0.01, mission_len)
            
            for i in range(mission_len - seq_len + 1):
                window = features[i:i+seq_len]
                target = rul[i+seq_len-1]
                
                self.windows.append(window)
                self.targets.append(target)
                
        self.windows = torch.tensor(np.array(self.windows), dtype=torch.float32)
        self.targets = torch.tensor(np.array(self.targets), dtype=torch.float32)

    def __len__(self):
        return len(self.windows)

    def __getitem__(self, idx):
        return self.windows[idx], self.targets[idx]

def evaluate_model(model: nn.Module, dataloader: DataLoader) -> Tuple[float, float]:
    """Helper to evaluate the model and return average loss and average sigma."""
    model.eval()
    total_loss = 0.0
    total_sigma = 0.0
    with torch.no_grad():
        for x, y in dataloader:
            mu, sigma = model(x)
            loss = gaussian_nll_loss(mu, sigma, y)
            total_loss += loss.item()
            total_sigma += sigma.mean().item()
    return total_loss / len(dataloader), total_sigma / len(dataloader)

def test_probabilistic_lstm_overfitting():
    """
    Tests that the ProbabilisticLSTM can overfit a tiny, deterministic toy dataset.
    Asserts that loss decreases and the output variance (sigma) is low for predictable data.
    """
    seq_len = 20
    input_size = 1
    hidden_size = 16
    batch_size = 16
    epochs = 50  # Give it enough iterations to reliably converge without diverging
    
    dataset = ToyDegradationDataset(num_missions=5, seq_len=seq_len, mission_len=100)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    model = ProbabilisticLSTM(input_size=input_size, hidden_size=hidden_size)
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    
    initial_loss, _ = evaluate_model(model, dataloader)
    
    model.train()
    for _ in range(epochs):
        for x, y in dataloader:
            optimizer.zero_grad()
            mu, sigma = model(x)
            loss = gaussian_nll_loss(mu, sigma, y)
            loss.backward()
            optimizer.step()
            
    final_loss, avg_sigma = evaluate_model(model, dataloader)
    
    # Assertions
    assert final_loss < initial_loss - 0.2, f"Loss did not decrease significantly. Initial: {initial_loss}, Final: {final_loss}"
    assert avg_sigma < 0.2, f"Sigma should be low for deterministic data, got {avg_sigma}"

def test_inference_interface():
    """
    Tests the model's forward pass by instantiating an untrained model, 
    passing a dummy tensor of the expected shape, and asserting it outputs exactly two values (mu, sigma) without crashing.
    """
    batch_size = 8
    seq_len = 60
    num_features = 12
    
    model = ProbabilisticLSTM(input_size=num_features, hidden_size=32)
    dummy_input = torch.randn(batch_size, seq_len, num_features)
    
    mu, sigma = model(dummy_input)
    
    assert mu.shape == (batch_size,)
    assert sigma.shape == (batch_size,)
    
    assert torch.all(sigma > 0)
