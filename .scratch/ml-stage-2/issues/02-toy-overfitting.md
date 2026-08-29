# 02: Probabilistic LSTM & Toy Overfitting

**What to build:** The core `ProbabilisticLSTM` PyTorch `nn.Module`, the Gaussian NLL loss function, and a minimal training loop. We will verify the architecture by training it on a tiny, mocked 5-mission "toy" dataset (where RUL drops in a perfect straight line) to assert that the model can converge and output a low variance ($\sigma$) on obvious data.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Implement `ProbabilisticLSTM` PyTorch module that outputs two values ($\mu, \sigma$) per sequence.
- [ ] Implement the Gaussian Negative Log-Likelihood (NLL) loss function.
- [ ] Create a small, deterministic "toy" dataset generator (e.g. 5 simple linear degradation missions).
- [ ] Implement a minimal training loop that overfits the toy dataset.
- [ ] Assert that the model's loss decreases significantly over a few epochs and outputs a low $\sigma$ on the toy data.
