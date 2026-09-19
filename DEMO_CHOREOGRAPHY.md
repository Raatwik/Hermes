# Hermes SIH Demo Choreography

Follow this exact sequence to record a flawless 75-second showcase video. The application state is fully hardcoded and controlled via `Shift + [Number]` keyboard shortcuts.
We've added gradual transitions so the metrics drop smoothly rather than jumping instantly.

## 🎬 Preparation (Before hitting record)
1. Start the React frontend (`npm run dev`). No backend is required.
2. Open the app in your browser and navigate to the **Operator Dashboard**.
3. **Press `Shift + 0`** on your keyboard to lock in the initial perfectly normal state (EHI: 98, Oil Pressure: 65).
4. *Start your screen recording.*

---

## ⏱️ Timeline & Actions

### 0–15 sec | Operator View (The Anomaly Appears)
*   **What to do:**
    *   Speak your script: *"We start with the operator..."*
    *   **Action:** Press **`Shift + 1`**. The Oil Pressure and EHI will smoothly begin to drop, and a Warning alert will appear.
    *   **Action:** A few seconds later, press **`Shift + 2`**. The metrics will smoothly drop further into the Critical zone, and the Critical Anomaly Alert banner will flash.
    *   Hover your mouse over the red telemetry data to highlight the anomaly.
*   **Transition:** Click on the alert (or navigate manually) to go to the **Engineer Dashboard**.

### 15–32 sec | Engineer View
*   **State Trigger:** As soon as the page loads, **press `Shift + 3`**.
*   **What to do:**
    *   Speak your script: *"The engineer view explains what the anomaly actually means..."*
    *   Point your cursor at the `Fault Probability Matrix` showing **Oil Starvation (88%)** in red.
    *   Point your cursor at the `Residual Time Series` graph showing the oil pressure deviation.
*   **Transition:** Click on the **Mission Sandbox** widget.

### 32–48 sec | Mission Sandbox
*   **State Trigger:** **Press `Shift + 4`**.
*   **What to do:**
    *   Speak your script: *"Now Hermes goes beyond diagnosis..."*
    *   **Crucial Action:** Physically drag the `Altitude` slider down to **10,000 ft** and the `Engine Load` slider to **60%**.
    *   Click the blue **"CALCULATE MITIGATION STRATEGY"** button.
    *   Point out the simulated risk dropping to 12% and the RUL impact of +74 mins.
*   **Transition:** Click the **"PUSH TO OPERATOR"** button that appears. *(Note: This button automatically triggers the Operator Accept state behind the scenes).*

### 48–60 sec | Back to Operator View
*   **State Trigger:** Navigate back to the **Operator Dashboard**.
*   **What to do:**
    *   Speak your script: *"The decision remains with the operator..."*
    *   Show the new blue "Engineer Advisory" recommendation banner.
    *   **Crucial Action:** Click the **"Accept"** button on the banner.
    *   *Pause for a second* as the dashboard instantly updates (EHI jumps to 82, Alert hides, Oil Pressure stabilizes at 55).

### 60–75 sec | Maintenance View
*   **State Trigger:** Navigate to the **Maintenance Dashboard**.
*   **State Trigger:** As soon as it loads, **press `Shift + 6`**.
*   **What to do:**
    *   Speak your script: *"Finally, the same intelligence reaches maintenance..."*
    *   Point out the "OIL STARVATION / PUMP DEGRADATION" diagnosis and the A-Level priority.
    *   Point to the completed sortie in the Post-Flight Log.
*   **Transition:** Hover your mouse over the red **"ACKNOWLEDGE & GENERATE WORK ORDER"** button.
*   *Stop recording.*
