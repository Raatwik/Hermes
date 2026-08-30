whats the difference between residua data and the raw data

▸ Thought for 5s, 354 tokens
Prioritizing Tool Specificity

● Search(Search workspace)
● Read(~/Desktop/SIH/DIH/ml_pipeline/compute_residuals.py) (ctrl+o to expand)
▸ Thought for 7s
Analyzing Sensor Data
In data science and machine learning, here is the difference between raw data and residual data:

1. Raw Data (The Observation): This is the actual data you collect directly from your source. It includes all the underlying
2. Residual Data (The Difference): This is the difference between the raw data (what actually happened) and expected data (what
patterns, but also contains noise, baseline trends, and anomalies.
a model predicted should happen).

Mathematically: Residual = Actual Value (Raw) - Expected Value (Prediction)

### How it works in your project (DIH/Hermes)

I took a look at your workspace, specifically ml_pipeline/compute_residuals.py. Here is exactly how these concepts apply to your
engine simulation data:

1. Your Raw Data
Your raw data (the parquet files in your data/ directory) contains simulated engine telemetry over time. This data includes the
engine's response to inputs like throttle and altitude, as well as environmental factors, noise, and simulated faults.

2. The Expected Data (Baseline)
Your pipeline reads the raw inputs (throttle and altitude) and feeds them into a completely clean, mathematically perfect
simulation of the engine.

# From compute_residuals.py
sim = Simulation(ambient_temp_offset=..., noise_seed=None) # No noise, no faults

This generates the expected, "healthy" baseline for every sensor (egt_1, vibration_index, etc.).

3. Your Residual Data
The pipeline then subtracts the ideal expected values from the raw values to create the residuals:

df[f"{col}_residual"] = df[col] - expected_df[col]

### Why use Residual Data?

If you feed raw data into a machine learning model to detect faults, the model has to learn the complex baseline behavior of the
engine first (e.g., "when throttle increases, temperatures naturally go up"), and then figure out if a temperature is too high.

By feeding residual data into your models (like your XGBoost or Isolation Forest models), you eliminate the need to learn the
baseline.

• If the engine is healthy, the residuals will hover very close to 0.
• If a component fails or starts degrading, the residual will start drifting significantly away from 0.

Using residuals makes the anomaly stand out much more clearly, making it vastly easier for your machine learning models to
detect engine faults.

────────────────────────────────────────────────────────────
> so it's for normalizing somewhat? and what about for our LSTM model
▸ Thought for 5s, 372 tokens
Prioritizing Specific Tools

● Search(Search LSTM in workspace)
● Read(~/Desktop/SIH/DIH/ml_pipeline/train_lstm_rul.py)
● Read(~/Desktop/SIH/DIH/ml_pipeline/dataset.py) (ctrl+o to expand)

▸ Thought for 8s
Analyzing Feature Construction
Yes, exactly! You can think of it as a form of dynamic normalization (or "detrending"). Instead of normalizing by a fixed mean
and standard deviation, you are normalizing against the expected baseline for the current operating conditions. It strips away
the effects of the throttle and altitude, leaving behind only the anomalies.

### How the LSTM Model Uses This

Your LSTM model (which is built to predict the Remaining Useful Life (RUL) of the engine) is actually very clever: it uses BOTH
the raw data and the residual data simultaneously.

If you look in ml_pipeline/dataset.py inside the TelemetryDataset class, you can see how it prepares the features for the LSTM:

# From ml_pipeline/dataset.py
residual_cols = [c for c in df.columns if c.endswith("_residual")]
base_cols = [c.replace("_residual", "") for c in residual_cols if c.replace("_residual", "") in df.columns]

# The LSTM receives BOTH the raw base columns AND the residual columns
self.feature_cols = base_cols + residual_cols

### Why does the LSTM need both?

Unlike a simple anomaly detector that just needs to know "is it broken right now?" (which only needs residuals), the LSTM is
trying to predict how much longer the engine will survive into the future. To do this accurately, it needs two pieces of
information:

1. The Residuals (The Damage): This tells the LSTM the current health of the engine. If the vibration_index_residual is high,
the model knows a bearing is probably failing.
2. The Raw Data (The Context): This tells the LSTM how much stress the engine is currently under.

The combination is critical: If the engine has a damaged bearing (detected via residuals), the LSTM needs the raw data to know
what the throttle is. If the engine is idling at 10% throttle, it might survive for another 10 hours. But if it's being pushed
at 100% throttle, it might explode in 10 minutes.

By feeding the LSTM both the normalized damage (residuals) and the current operating context (raw data), it can make a highly
accurate prediction of the Remaining Useful Life!
────────────────────────────────────────────────────────────
> but what are we feeding the LSTM model right now? It's something incorrect?
▸ Thought for 6s, 373 tokens
Prioritizing Specific Tools

● Read(~/Desktop/SIH/DIH/docs/pipeline_remediation_plan.md) (ctrl+o to expand)

▸ Thought for 6s
Discovering the Root Cause
Yes, you've hit on a critical bug in how the LSTM is currently being trained!

I just checked docs/pipeline_remediation_plan.md, and it highlights exactly what is wrong. The issue isn't with the input
features (the raw and residual data)—the issue is with the target labels (the RUL) you are feeding the LSTM to learn from.

It is called the "Countdown Timer" Flaw.

### The Problem

When training the LSTM, you need to tell it: "Here is a 60-second window of data. Based on this, predict how many hours the
engine has left to live (RUL)."

Right now, your code in dataset.py calculates the "Remaining Useful Life" (RUL) label simply by doing:

RUL = max_time - current_time

But here is the flaw: Your data generator (generate_datasets.py or the Simulation engine) currently runs for a fixed amount of
time for every single simulation, regardless of what is happening to the engine.

If you simulate a perfectly healthy engine, it runs for 1 hour.
If you simulate an engine with a catastrophic total failure (Severity = 1.0), the simulation still runs for 1 hour.

Because the simulation doesn't "die" or "stop" when a critical threshold is breached (like RPM dropping to 0 or temps exceeding
melting points), the dataset length doesn't shorten.

### What the LSTM is learning

Because every file is the same length, the LSTM is being taught that an engine with a catastrophic fault survives just as long
as a healthy engine.

When you feed it data of an engine tearing itself apart, the label you are providing says "this engine still has 45 minutes
left," so the LSTM learns to completely ignore the massive residuals/damage and just acts like a blind countdown timer.

### How to fix it

According to your pipeline_remediation_plan.md, you need to:

1. Modify the Simulation Engine: Make the simulation terminate immediately if critical physical thresholds are breached (e.g.,
if rpm < 1000 or cht > 250).
2. This will result in shorter parquet files when severe faults are injected.
3. Then, when dataset.py calculates max_time - time, a catastrophic fault injected at minute 10 will accurately result in
max_time = 10, meaning the RUL label drops to 0 exactly when the engine fails!
────────────────────────────────────────────────────────────
> and what could this show up as while training?

▸ Thought for 8s, 517 tokens
Prioritizing Specific Tools

● Read(~/Desktop/SIH/DIH/tests/unit/test_ml_lstm_overfitting.py) (ctrl+o to expand)

▸ Thought for 7s, 599 tokens
Observing Training Manifestations

● Search(Search TIME_CONSTANTS)
● Read(~/Desktop/SIH/DIH/simulation/engine.py) (ctrl+o to expand)

▸ Thought for 9s
Considering Sensor Features
If you are training the LSTM right now with this "countdown timer" flaw, you would see a few very specific, frustrating symptoms
in your training logs and model outputs:

### 1. The Validation Loss Plateaus (High Loss)

The model will struggle to achieve a low training or validation loss. Why? Because it is being fed fundamentally contradictory
data:

• Batch A (Healthy): Engine is running perfectly. RUL label says 0.5 hours.
• Batch B (Catastrophic): Engine is shaking violently, RPM is 0, temperatures are off the charts. RUL label also says 0.5 hours.

The LSTM cannot find a mathematical relationship between the sensor inputs and the target labels because the labels contradict
the physical reality of the sensors. As a result, the loss curve will drop slightly (as it learns the average) and then
flatline.

### 2. High Uncertainty (Massive Sigma)

I noticed your model is a ProbabilisticLSTM, meaning it predicts both rul_mean and rul_std (sigma/uncertainty).
Because the sensor inputs (like extreme vibration residuals) have absolutely zero correlation with the fixed countdown timer
labels, the model will be extremely confused. To minimize its Negative Log-Likelihood (NLL) loss, it will learn to output a very
large sigma (high uncertainty) for every prediction, basically throwing its hands up and saying, "I have no idea what's going
on."

### 3. "Blind" Predictions

If you were to plot the model's predictions on a test dataset, you would likely see one of two things:

• It just predicts the average RUL (~0.5 hours) for almost everything.
• Or, it just acts as a blind sequence counter, predicting a generic straight line from 1.0 down to 0.0 that looks identical for
a perfectly healthy engine and an engine that is actively exploding. It will completely ignore the residual spikes.

In short, the model isn't actually learning engine physics or degradation; it's just getting confused by bad target labels and
giving up.
