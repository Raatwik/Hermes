import os
import tempfile
import torch
import pytest

from ml_pipeline.models import ProbabilisticLSTM
from ml_pipeline.inference import InferenceWrapper

def test_inference_wrapper_dummy():
    """
    Test that the InferenceWrapper can load a model and process a dummy tensor
    without crashing, returning mu and sigma correctly.
    """
    input_size = 12
    seq_len = 60
    hidden_size = 64
    num_layers = 2
    
    # Create a dummy model and save its weights
    dummy_model = ProbabilisticLSTM(
        input_size=input_size, 
        hidden_size=hidden_size, 
        num_layers=num_layers
    )
    
    with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as tmp:
        torch.save(dummy_model.state_dict(), tmp.name)
        tmp_path = tmp.name
        
    try:
        # Initialize wrapper
        wrapper = InferenceWrapper(
            model_path=tmp_path,
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            device="cpu"  # Force CPU for consistent testing
        )
        
        # Create a dummy input tensor [batch_size, sequence_length, num_features]
        batch_size = 3
        dummy_input = torch.randn(batch_size, seq_len, input_size)
        
        # Run inference
        mu, sigma = wrapper.predict(dummy_input)
        
        # Assertions
        assert isinstance(mu, list)
        assert isinstance(sigma, list)
        assert len(mu) == batch_size
        assert len(sigma) == batch_size
        assert all(s > 0 for s in sigma), "Sigma must be strictly positive"
    finally:
        os.remove(tmp_path)
