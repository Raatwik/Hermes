# 01: Data Preprocessing & Windowing

**What to build:** A PyTorch `Dataset` and `DataLoader` utility. It reads the Milestone 1 Parquet files (telemetry + residuals), downsamples them to 1 Hz, concatenates the features into a single vector per timestep, applies the 60-120 step sliding window, and ensures a strict train/val split grouped by Mission ID. This is verifiable by inspecting the output tensor shapes of a single batch without needing the model.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Implements a PyTorch `Dataset` that reads the Parquet data files.
- [ ] Downsamples the raw 10 Hz telemetry and residuals to 1 Hz.
- [ ] Concatenates the raw features and residuals into a single feature vector.
- [ ] Windows the data into sequences of length 60 (or 120).
- [ ] Ensures training and validation splits never contain the same Mission ID.
- [ ] Output tensors from the `DataLoader` have shape `[batch_size, sequence_length, num_features]`.
