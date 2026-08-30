# 04: Inference API Wrapper

**What to build:** A clean `InferenceWrapper` class that loads the saved PyTorch model from disk and exposes a single `predict(tensor)` method. It accepts a standardized `[batch, seq_len, features]` tensor and returns the $\mu$ and $\sigma$, providing the exact programmatic seam that the Milestone 4 FastAPI backend needs to consume.

**Blocked by:** 03-full-training-pipeline.md

**Status:** ready-for-agent

- [ ] Create an `InferenceWrapper` class.
- [ ] Implement initialization that loads the saved `.pt` weights into the `ProbabilisticLSTM`.
- [ ] Implement a `predict(input_data)` method that accepts a standard tensor shape (e.g., `[1, sequence_length, num_features]`).
- [ ] Output the parsed $\mu$ and $\sigma$ parameters.
- [ ] Add a simple test verifying that an untrained/dummy model can process a random dummy tensor without crashing.
