# 03: Full Training Pipeline & Checkpointing

**What to build:** The production `train_lstm_rul.py` orchestrator. It wires the real `DataLoader` from Ticket 1 into the training loop from Ticket 2. It introduces early stopping/checkpointing, saving the best `.pt` model weights to disk based on validation NLL loss.

**Blocked by:** 01-data-preprocessing.md, 02-toy-overfitting.md

**Status:** ready-for-agent

- [ ] Create `train_lstm_rul.py` script.
- [ ] Initialize the model (Ticket 2) and the real `DataLoader` (Ticket 1).
- [ ] Run the full training loop over the actual dataset.
- [ ] Evaluate the model on the validation set at the end of each epoch.
- [ ] Save the `.pt` weights of the model to disk when validation loss improves.
