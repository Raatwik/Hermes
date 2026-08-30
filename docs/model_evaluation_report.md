# Hermes Model Evaluation Report

## Overview
We ran an independent, full-pipeline evaluation of the three trained models present in `Hermes_Trained_Models`. To ensure a completely unbiased test, the evaluation script simulated a clean engine baseline to generate physics-based residuals, extracted sliding window features, and evaluated against 7 distinct mission profiles (one from each fault class and one healthy).

Here is the verdict on whether the models are ready for the project:

---

### 1. XGBoost Classifier (Fault Classification)
**Status: READY 🟩**

The XGBoost model achieved exceptional accuracy, leveraging the physical residuals to cleanly separate healthy states from diverse fault conditions. 

* **Overall Accuracy:** `99.59%`
* **Healthy State F1-Score:** `1.00`
* **Performance on Faults:**
  * Cylinder Failure: `1.00` F1
  * Misfire: `1.00` F1
  * Cooling Degradation: `0.99` F1
  * Lubrication Issues: `0.99` F1
  * Injector Abnormalities: `0.98` F1
  * Sensor Drift: `0.96` F1

**Conclusion:** The model correctly identifies the specific fault class with near-perfect precision and recall. It is highly robust and fully ready for integration into the Operator Dashboard.

---

### 2. Probabilistic LSTM (Remaining Useful Life)
**Status: READY 🟩**

You noted the best training loss was `1.129` at Epoch 6. The loss metric here is a Gaussian Negative Log-Likelihood (NLL), which measures both the prediction error and the model's confidence boundary.

* **Test Set Average NLL:** `1.0913`
* **Test Set L1 Error (MAE):** `0.7434 hours` (~44.6 minutes)

**Conclusion:** The test NLL (`1.09`) validates your training NLL (`1.12`), confirming the model did not overfit and generalizes well to unseen missions. For a MALE UAV (Medium Altitude Long Endurance, often flying 12–24+ hour missions), predicting total engine failure with a ~45-minute error margin is solid. The probabilistic nature of the prediction fits the dashboard's "What-If" risk evaluation requirements perfectly. It is ready for the project.

---

### 3. Isolation Forest (Anomaly Detection)
**Status: NOT READY 🟥**

The Isolation Forest was meant to act as a fallback, unsupervised anomaly detector to catch out-of-distribution behaviors that the XGBoost model might not be explicitly trained for. However, it fails completely on the test set.

* **Overall Accuracy:** `75.7%` (This simply reflects the percentage of healthy data in the test set)
* **Anomaly Recall:** `0.00`
* **Anomaly Precision:** `0.01`

**Conclusion:** The model essentially predicts everything as "healthy". It identified virtually `0%` of the 121,000 anomalous/faulty time steps in the evaluation set. This is likely because it was trained with an improper `contamination` threshold or trained on data that wasn't purely healthy, confusing its baseline of "normal". It must be dropped or retrained before deployment.

---

## Final Recommendation
You have two outstanding, production-ready models (XGBoost for diagnosis and LSTM for RUL prediction). They successfully execute the hybrid physics + data-driven vision of the digital twin. 

You should proceed with integrating **XGBoost** and the **Probabilistic LSTM** into the Next.js/FastAPI interface. The **Isolation Forest** is actively broken and should be disabled in inference pipelines for now.
