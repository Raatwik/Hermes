# Hermes: MALE-UAV Aero-Piston Engine AI Digital Twin

**Hermes** is an AI-enabled, mission-aware Digital Twin designed for aero-piston engines (specifically modeling a naturally aspirated Rotax 914) used in Medium Altitude Long Endurance (MALE) UAVs.

Instead of relying on simple rule-based thresholds, Hermes utilizes a **hybrid physics and data-driven approach**. It generates a continuous expected baseline using a Mean-Value Engine Model (MVEM) and uses Machine Learning to analyze the *residuals* (Actual - Expected) to detect anomalies, classify faults, and predict Remaining Useful Life (RUL).

## Key Features

- **Real-Time Digital Twin:** Continuous state synchronization between physical telemetry and the thermodynamic model.
- **Physics-Based Synthetic Fault Generation:** Generates robust training data by physically injecting degradation (e.g., injector wear) into the simulation rather than applying arbitrary noise.
- **Residual Analysis & Drift Detection:** Employs XGBoost and Probabilistic LSTMs to evaluate divergence from expected physical bounds.
- **Operator Dashboard (GCS):** A Next.js/FastAPI interface for Mission Commanders featuring actionable AI prescriptions and a counterfactual "What-If" mission sandbox for risk evaluation.

## Documentation & Architecture

This repository is strictly governed by its documentation. All autonomous agents and human contributors must read and adhere to the following before pushing code:

1. **[Domain Glossary & Boundaries](docs/agents/domain.md):** Defines the Ubiquitous Language (e.g., EHI, Residuals) and strict module boundaries (Simulation, Twin Core, Frontend, ML).
2. **[Tech Stack & Rules](docs/agents/tech-stack.md):** The explicitly approved stack (FastAPI, Next.js, PyTorch) and anti-patterns (no fixed-threshold alarms).
3. **[Agent Operating Rules](docs/rules.md):** The strict workflow and version control rules governing the project.

## Project Roadmap (Wayfinder)

The project is actively managed via a local markdown tracker using the Wayfinder protocol, split across 6 distinct domain roles. 

You can view the current frontier, blockers, and decisions in the **[Wayfinder Map](wayfinder/map.md)** and the **[Issue Tracker](docs/agents/issue-tracker.md)**.