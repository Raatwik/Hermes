# Hermes: Project Implementation & Features Built

This document outlines the concrete technical components, modules, and features that were successfully built and implemented in this project, fulfilling the Digital Twin architecture.

## 1. Simulation & Physics Engine (`simulation/`)
- **Rotax 914 Mean-Value Engine Model (MVEM):** Created a Python-based physical engine model that explicitly computes continuous thermodynamic states (RPM, CHT, EGT, Oil P/T, Fuel Flow).
- **Dynamic Environment / ISA Atmosphere:** Integrated real-world atmospheric modeling so engine physics dynamically react to changing altitudes and ambient temperature offsets.
- **Physical Fault Injector (`FaultManager`):** Instead of injecting random noise, we implemented causal degradation (e.g., decreasing injector flow coefficient, increasing friction). Includes exponential fault degradation scheduling.
- **Physical Failure Thresholds:** Engineered hard failure limits (e.g., Engine seizes if RPM < 1000, CHT > 250°C, EGT > 900°C) to anchor accurate Remaining Useful Life (RUL) targets.
- **Cylinder-Specific Behavior:** Implemented multi-cylinder tracking (individual EGTs) and windmilling physics.

## 2. Dataset Generation Pipeline (`datasets/`)
- **Automated Bulk Generation:** Developed a multiprocessing orchestrator that can rapidly generate massively balanced datasets across various mission profiles (Takeoff/Cruise, Loiter, Dynamic Maneuvers).
- **Export & Storage:** Automated partitioning and exporting of telemetry to Parquet and CSV formats.
- **Sensor Noise Modeling:** Applied Gaussian noise to raw physics outputs to emulate realistic DAQ (Data Acquisition) imperfections.
- **Automated RUL Labeling:** Scripts dynamically calculate the exact RUL based on true physical engine seizure times, eliminating right-censored contamination.

## 3. Machine Learning Pipeline (`ml_pipeline/`)
- **Residual Analysis Foundation:** Built a pre-processing pipeline that transforms raw telemetry into residuals (`Actual Sensor Value - Expected Physics Value`), which anchors all downstream AI.
- **Fault Classification (XGBoost):** Migrated to a `MultiOutputClassifier` setup to diagnose overlapping/cascading faults simultaneously.
- **Prognostics (PyTorch Probabilistic LSTM):** Replaced basic linear predictions with an LSTM trained via Negative Log-Likelihood that outputs RUL as a distribution (Mean + Variance), providing confidence intervals to operators.
- **Open-Set Anomaly Detection (Isolation Forest):** Deployed a strict Isolation Forest trained exclusively on healthy engine data. It detects previously unseen drifts and unknown faults without forcing them into a known category.

## 4. Real-Time Integration & Backend (`integration/` & `backend/`)
- **MQTT Telemetry Stream:** Embedded a real-time MQTT broker (`broker.py`) and a Simulation Publisher (`sim_publisher.py`) that plays back generated flight profiles over the wire.
- **ML Subscriber (`ml_subscriber.py`):** Acts as the bridge that listens to raw telemetry, runs it against the physics baseline to compute expected values, passes it to the AI models, and broadcasts the enriched predictions.
- **FastAPI Gateway:** Built a high-performance Python FastAPI server acting as a WebSocket bridge between the MQTT stream and the web frontend.

## 5. Frontend & UI Dashboards (`frontend/`)
- **React / Vite Framework:** Built a fast, component-driven Next.js-style dashboard.
- **Role-Based Views:**
  - **Operator Dashboard:** Focuses on high-level Go/No-Go decisions and abstracted alerts.
  - **Engineer Dashboard:** Provides deep-dive residual tracking and raw twin-drift metrics.
  - **Maintenance Dashboard:** Logs post-flight data and degradation history.
- **Dynamic Engine Health Index (EHI):** Completely eliminated fixed-threshold alarms (which cause false positives) in favor of a dynamically computed EHI derived from Twin Drift Scores.
- **Mission Sandbox ("What-If" Widget):** Built an interactive tool that allows operators to test counterfactual scenarios dynamically (e.g., *"If I drop altitude to 10,000 ft, will my RUL increase enough to make it home?"*).
