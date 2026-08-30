import os
import time
import argparse
import torch
import torch.optim as optim
from torch.utils.data import DataLoader
from typing import Tuple, Optional

from ml_pipeline.dataset import get_dataloaders, DatasetConfig
from ml_pipeline.models import ProbabilisticLSTM, gaussian_nll_loss

def _process_batch(
    model: torch.nn.Module, 
    features: torch.Tensor, 
    rul_targets: torch.Tensor, 
    device: torch.device
) -> torch.Tensor:
    """Helper to move data to device, run forward pass, and compute loss."""
    features, rul_targets = features.to(device), rul_targets.to(device)
    rul_mean, rul_std = model(features)
    loss = gaussian_nll_loss(rul_mean, rul_std, rul_targets)
    return loss

def evaluate(model: torch.nn.Module, dataloader: DataLoader, device: torch.device) -> float:
    """Evaluate the model on the given dataloader and return the average validation NLL loss."""
    model.eval()
    total_loss = 0.0
    with torch.no_grad():
        for features, rul_targets in dataloader:
            loss = _process_batch(model, features, rul_targets, device)
            total_loss += loss.item()
    return total_loss / len(dataloader)

def train_model(
    data_dir: str, 
    model_save_path: str = "best_lstm_model.pt",
    epochs: int = 50,
    batch_size: int = 32,
    learning_rate: float = 1e-3,
    patience: int = 10,
) -> Optional[torch.nn.Module]:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Initialize the real DataLoader
    config = DatasetConfig(window_size=60, downsample_rate=10)
    train_loader, val_loader = get_dataloaders(data_dir, batch_size=batch_size, config=config)
    
    # Determine input size by inspecting one batch
    try:
        x_sample, _ = next(iter(train_loader))
        input_size = x_sample.shape[2]
    except StopIteration:
        print("Error: The training dataloader is empty.")
        return None
        
    print(f"Found input feature size: {input_size}")
    
    # Initialize the model
    model = ProbabilisticLSTM(input_size=input_size, hidden_size=64, num_layers=2).to(device)
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    best_val_loss = float('inf')
    epochs_without_improvement = 0
    
    os.makedirs(os.path.dirname(model_save_path) or ".", exist_ok=True)

    print("Starting training loop...")
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        
        start_time = time.time()
        for features, rul_targets in train_loader:
            optimizer.zero_grad()
            loss = _process_batch(model, features, rul_targets, device)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            
        train_loss /= len(train_loader)
        
        # Evaluate model on validation set
        val_loss = evaluate(model, val_loader, device)
        
        elapsed = time.time() - start_time
        print(f"Epoch {epoch+1:03d}/{epochs:03d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Time: {elapsed:.2f}s")
        
        # Early stopping & Checkpointing
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            epochs_without_improvement = 0
            
            torch.save(model.state_dict(), model_save_path)
            print(f"  -> Validation loss improved. Saved model weights to {model_save_path}")
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= patience:
                print(f"Early stopping triggered after {epoch+1} epochs without improvement.")
                break

    print(f"Training complete. Best Validation Loss: {best_val_loss:.4f}")
    
    # Load the best model weights before returning
    if os.path.exists(model_save_path):
        model.load_state_dict(torch.load(model_save_path))
    
    return model

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the RUL LSTM model.")
    parser.add_argument("--data_dir", type=str, default="data_features", help="Directory containing parquet telemetry data")
    parser.add_argument("--epochs", type=int, default=50, help="Maximum number of epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--patience", type=int, default=10, help="Patience for early stopping")
    parser.add_argument("--save_path", "--model_save_path", dest="save_path", type=str, default="models/best_lstm_model.pt", help="Path to save the best model")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.data_dir):
        print(f"Warning: Data directory '{args.data_dir}' not found. You may need to run generate_datasets.py first.")
        
    train_model(
        data_dir=args.data_dir,
        model_save_path=args.save_path,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        patience=args.patience
    )
