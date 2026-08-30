# 03 — LSTM RUL Retraining Execution

**What to build:** Executes the training loop for the LSTM RUL model using the newly generated, physically-terminating telemetry datasets. Since the underlying data will now dynamically truncate at the point of catastrophic engine failure, the model will organically learn dynamic degradation curves instead of acting like a static countdown timer.

**Blocked by:** Completion of new dataset generation (04.3 & 05.4 phases).

**Status:** done

- [x] `train_lstm_rul.py` is successfully executed against the new parquet dataset partition.
- [x] No shape mismatch or NaN errors are thrown during training on the variable-length sequences.
- [x] The updated `.pt` model weights are saved successfully to the models directory.
