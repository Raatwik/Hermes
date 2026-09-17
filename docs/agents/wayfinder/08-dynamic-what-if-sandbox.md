---
labels: ["ready-for-agent"]
---
# [wayfinder:task] Frontend/Backend: Dynamic What-If Sandbox Optimization

## Problem Statement

The problem that the user is facing is that the "Auto-Optimize Mission" feature in the mission sandbox UI currently displays hardcoded mitigation strategies (e.g., always suggesting a drop to 12,000 ft or reducing engine load to 55%). This is unrealistic because it doesn't account for the active mission's future flight path. Operators are unable to get context-aware, actionable advice based on the actual telemetry and planned trajectory of the UAV.

## Solution

The solution is to generate mitigation strategies dynamically based on the upcoming flight path defined in the active scenario data. A new backend capability will slice the active flight path data from the current time forward, evaluate a predefined set of realistic tactical adjustments (e.g., maintaining profile, dropping altitude by specific increments, reducing throttle), and run a forward simulation to calculate the Simulated Risk and Remaining Useful Life (RUL) impact. The frontend will request this evaluation using the current simulation time and render the dynamically generated options for the operator.

## User Stories

1. As an Operator, I want the auto-optimization tool to suggest mitigation strategies tailored to my upcoming flight path, so that I get realistic and context-aware advice.
2. As an Operator, I want to see a specific tactical adjustment (e.g., "Drop altitude by 500ft") clearly titled, so that I can quickly parse my options.
3. As an Operator, I want to read a brief description of why a tactical adjustment is being recommended, so that I understand the rationale before taking action.
4. As an Operator, I want to see the calculated impact on Risk for each suggested option, so that I can choose the safest path.
5. As an Operator, I want to see the calculated impact on Remaining Useful Life (RUL) for each option, so that I can maximize the longevity of the engine during the mission.
6. As a System Architect, I want the backend to handle the heavy simulation of future flight paths, so that the frontend remains lightweight and avoids duplicating complex physics simulation logic.
7. As a Propulsion Engineer, I want the optimization simulation to use the exact future sequence of altitude and throttle values from the planned mission, rather than assuming constant values, so that the risk calculations are physically accurate.
8. As a Developer, I want a clear API contract between the frontend and backend for optimization requests, so that I can easily decouple and test the UI from the simulation engine.

## Implementation Decisions

- **Modules that will be built/modified**:
  - The backend REST API server will be extended with a new optimization endpoint.
  - The frontend state management store will be updated to track the current simulation time and expose a new action to trigger the optimization request.
  - The frontend mission sandbox widget will be refactored to consume the dynamic options instead of a hardcoded list.
- **Architectural decisions**:
  - The active flight path data source will be hardcoded to the primary attack scenario telemetry dataset for this stage, rather than building a dynamic selection mechanism.
- **API contracts**:
  - The new optimization endpoint will accept a JSON payload containing the `current_time` (float) and `current_state` (object mapping sensor names to values).
  - The endpoint will return a JSON array of evaluated options. Each option will contain an `action` (string title), `description` (string), `simParams` (object representing the delta applied), and `simResult` (object containing Risk and RUL metrics).
- **Specific interactions**:
  - The backend will parse the dataset and slice it to extract the sequence of upcoming throttle and altitude values where the time is greater than or equal to the requested `current_time` (up to 300 seconds into the future).
  - The backend will iteratively step the simulation using the modified sequence of altitude and throttle values to calculate outcomes for each candidate strategy.

## Testing Decisions

- **A description of what makes a good test**: Tests should focus strictly on external behavior and API boundaries. For the backend, a test should provide a mocked payload with a specific time and state, and assert that the endpoint returns an array of options with the correct schema (action, description, simParams, simResult), without asserting *how* the simulation stepped through the data. For the frontend, tests should mock the API response and assert that the UI renders the correct number of options with the provided text.
- **Which modules will be tested**:
  - The new backend optimization REST endpoint.
  - The frontend state management action that calls the endpoint.
- **Prior art for the tests**:
  - Existing tests for the REST API endpoints in the backend test suite, which mock internal logic and assert on the JSON response schema.
  - Existing frontend store tests that mock API calls and assert state changes.

## Out of Scope

- Building a UI to let the user dynamically select different flight path datasets (we will hardcode the dataset reference for this stage).
- Running a computationally expensive full grid search or mathematical optimization algorithm across all possible parameter combinations (we will use a predefined set of heuristic constraints).

## Further Notes

- The optimization simulation uses the exact future sequence of altitude and throttle values from the dataset, applying offsets at each step, rather than assuming constant values for the duration of the what-if horizon. This significantly increases accuracy.
