# Hermes SIH Demo: UI Hardcoding Implementation Plan

> **Goal:** This document provides exact instructions for an AI agent (or developer) to hardcode the frontend state of the Hermes Digital Twin to perfectly match the 75-second video script. 
> **Strategy:** Instead of manually commenting/uncommenting code for every take, we will implement a **Scene Controller** in `src/store/useEngineStore.js` (or a high-level wrapper) that listens for keyboard shortcuts (e.g., `Shift + 1`, `Shift + 2`) to instantly override the UI state for each specific scene.

---

## Global Implementation Strategy
Modify `frontend/src/store/useEngineStore.js` to intercept or override incoming WebSocket data. Create a `mockScene` state variable.

*   `mockScene = 1` -> Triggers Scene 1 (Operator Anomaly)
*   `mockScene = 2` -> Triggers Scene 2 (Engineer Diagnosis)
*   `mockScene = 3` -> Triggers Scene 3 (Sandbox Alternative)
*   `mockScene = 4` -> Triggers Scene 4 (Operator Resolution)
*   `mockScene = 5` -> Triggers Scene 5 (Maintenance Wrap-up)

---

## 🎬 Scene 1: Operator View — Anomaly Detection (0–15 sec)
**Trigger:** Set `mockScene = 1` (or press `Shift + 1`)
**View Component:** `frontend/src/views/Operator/OperatorDashboard.jsx`

**Exact Values to Hardcode in State/Store:**
*   **Engine Health Index (EHI):** `68` (Dropping from 100 to trigger visual concern).
*   **TelemetryTable Data:**
    *   `RPM`: `2450` (Normal, Green)
    *   `Oil Temp`: `95°C` (Normal, Green)
    *   `Oil Pressure`: `40 PSI` (Highlight Red/Yellow - this is the anomaly).
    *   `CHT` / `EGT`: Normal ranges.
*   **Mission Progress:** Phase = `Cruise`, Altitude = `15,200 ft`.
*   **AlertBanner Component:** 
    *   `isVisible`: `true`
    *   `severity`: `"critical"`
    *   `message`: `"ANOMALY DETECTED: Thermodynamic Mismatch in Oil Pressure. Physics baseline deviation."`
*   **RulWidget:**
    *   `rul_value`: `"31 mins"`
    *   `confidence_interval`: `"[24 - 39 mins]"`

---

## 🎬 Scene 2: Engineer View — Diagnosis (15–32 sec)
**Trigger:** Set `mockScene = 2` (or press `Shift + 2`)
**View Component:** `frontend/src/views/Engineer/EngineerDashboard.jsx`

**Exact Values to Hardcode in State/Store:**
*   **ResidualChart (`ResidualTimeSeries`):**
    *   Inject mock timeseries data where `expected_oil_pressure` remains at `65 PSI`, but `actual_oil_pressure` drops sharply to `40 PSI` at the current timestamp, showing a widening gap.
*   **FaultProbabilityMatrix (XGBoost Output):**
    *   `Oil Starvation`: `88%` (Highlight in Red)
    *   `Injector Degradation`: `7%`
    *   `Sensor Drift`: `3%`
    *   `Unknown Anomaly`: `2%`
*   **DegradationCauseGraph:**
    *   Highlight node path: `Lubrication System` -> `Oil Pressure Drop` -> `Imminent Seizure`.
*   **EngineHealthWidget:** (Same as Scene 1)
    *   `RUL`: `"31 mins"`

---

## 🎬 Scene 3: Mission Sandbox (32–48 sec)
**Trigger:** Set `mockScene = 3` (or press `Shift + 3`)
**View Component:** `frontend/src/views/Engineer/EngineerDashboard.jsx` (specifically `MissionSandboxWidget`)

**Exact Values to Hardcode in State/Store:**
*   **Sandbox Comparison State:**
    *   *Current Profile:* 
        *   Altitude: `15,200 ft`
        *   Throttle: `75%`
        *   Predicted RUL: `"31 mins"`
        *   Mission Risk: `85% (High)`
    *   *Alternative Profile (What-If):* 
        *   Altitude: `10,000 ft` (User should physically change this slider/input during recording)
        *   Throttle: `60%` (User changes this)
        *   Predicted RUL: `"1h 45 mins"` (Hardcode this result to appear when "Simulate" is clicked)
        *   Mission Risk: `12% (Low)`
*   **Action Output:**
    *   When the "Send Recommendation" button is clicked, it should visually confirm transmission and automatically trigger `mockScene = 4`.

---

## 🎬 Scene 4: Operator Resolution (48–60 sec)
**Trigger:** Set `mockScene = 4` (or press `Shift + 4`)
**View Component:** `frontend/src/views/Operator/OperatorDashboard.jsx`

**Exact Values to Hardcode in State/Store:**
*   **RecommendationBanner Component:**
    *   `isVisible`: `true`
    *   `message`: `"ENGINEER ADVISORY: Drop altitude to 10,000 ft, reduce throttle to 60%. Restores safe RTB margin."`
*   **Before/After UI:**
    *   Show visual prompt: `Current RUL: 31m -> New RUL: 1h 45m`
*   **Action Output (The "Accept" Button Click):**
    *   When the Operator clicks "Accept", instantly update the main dashboard:
        *   `EHI`: Jumps back up to `82` (Stabilized).
        *   `RulWidget`: Updates to `"1h 45 mins"`.
        *   `AlertBanner`: Hides.
        *   `TelemetryTable`: Oil Pressure stabilizes at `55 PSI` (throttled envelope).

---

## 🎬 Scene 5: Maintenance Wrap-Up (60–75 sec)
**Trigger:** Set `mockScene = 5` (or press `Shift + 5`)
**View Component:** `frontend/src/views/Maintenance/MaintenanceDashboard.jsx`

**Exact Values to Hardcode in State/Store:**
*   **System Status:** `POST-FLIGHT / IDLE`
*   **PostFlightLog.jsx Table:**
    *   Insert a mock row at the top:
        *   `Date`: `[Today's Date]`
        *   `Sortie`: `Surveillance-Alpha-09`
        *   `Status`: `Completed (RTB via Advisory)`
        *   `Max Risk`: `Critical (Oil System)`
*   **Diagnosis Panel:**
    *   `Suspected Fault`: `"OIL STARVATION / PUMP DEGRADATION"`
    *   `Evidence`: `"45-min sustained residual drift in oil pressure. Thermodynamic mismatch detected."`
    *   `Maintenance Priority`: `"A-Level (Ground until resolved)"`
*   **Advisory Panel / Action:**
    *   Show interactive button: `"GENERATE WORK ORDER"` (Hover over this to end the video).

---

## Instructions for the Agent Implementing This:
1. Locate `frontend/src/store/useEngineStore.js`.
2. Add a `useEffect` hook to listen for `keydown` events (`Shift+1` through `Shift+5`).
3. Create a `setScene(sceneNumber)` function that forcefully overwrites the state variables (`ehi`, `telemetry`, `alerts`, `rul`, `fault_probabilities`) to match the exact values listed above for that scene number.
4. Ensure the React components in `views/` are binding directly to these store variables so they react instantly when the scene changes.
