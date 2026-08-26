# Tech Stack & Standards

## 1. Core Stack
- **Languages:** Python 3.10+ (Backend, ML, Simulation), TypeScript (Frontend)
- **Backend Framework:** FastAPI (REST API & Orchestration)
- **Frontend Framework:** Next.js (React)
- **Machine Learning:** PyTorch (LSTM/Neural ODEs), XGBoost (Discrete Classifiers), scikit-learn (Preprocessing/Metrics)
- **Real-Time Data:** MQTT (Telemetry Streaming), WebSockets (Backend to Frontend push)
- **Package Managers:** `pip` or `poetry` (Python), `npm` or `pnpm` (TypeScript)
- **Data Formats:** Parquet/CSV (Offline Training), JSON/YAML (Mission Configs)

## 2. Explicit Anti-Patterns & Restrictions
- **No Fixed-Threshold Alarms:** Do NOT use static rule-based alarms (e.g., `if EGT > 900: alert()`). All diagnostics must be driven by continuous residual analysis.
- **No CFD or High-Fidelity Physics:** Do NOT implement complex fluid dynamics. Strictly enforce the Mean-Value Engine Model (MVEM) for real-time execution speeds.
- **Strict Typing:** TypeScript MUST be strictly typed. Python backend MUST utilize Pydantic models and strict type hinting.
- **Validation:** Use `Zod` (Frontend) and `Pydantic` (Backend) for all API payloads and telemetry validation.
- **No Black-Box ML for UI:** Do not display raw ML probabilities or nodes to the operator. Explainable AI (XAI) features must be abstracted into plain-English ranked prescriptions.

## 3. Terminal Commands
* **Unit Tests (Python):** `pytest tests/unit/`
* **Integration Tests (Python):** `pytest tests/integration/`
* **Python Linter/Type Checker:** `flake8 . && mypy .`
* **Unit Tests (Frontend):** `npm run test`
* **Frontend Linter:** `npm run lint`
