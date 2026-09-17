# Hermes SIH Demo Choreography

Follow this exact sequence to record a flawless 75-second showcase video. The application state is fully hardcoded and controlled via `Shift + [Number]` keyboard shortcuts.

## 🎬 Preparation (Before hitting record)
1. Start the React frontend (`npm run dev`). No backend is required.
2. Open the app in your browser and navigate to the **Operator Dashboard**.
3. **Press `Shift + 1`** on your keyboard to lock in the initial anomaly state.
4. *Start your screen recording.*

---

## ⏱️ Timeline & Actions

### 0–15 sec | Scene 1: Operator View
*   **State:** EHI is at 68, Oil Pressure is dropping (40 PSI), and a Critical Alert banner is visible.
*   **What to do:**
    *   Speak your script: *"We start with the operator..."*
    *   Hover your mouse over the red telemetry data to highlight the anomaly.
*   **Transition:** Click on the alert (or navigate manually) to go to the **Engineer Dashboard**.

### 15–32 sec | Scene 2: Engineer View
*   **State Trigger:** As soon as the page loads, **press `Shift + 2`**.
*   **What to do:**
    *   Speak your script: *"The engineer view explains what the anomaly actually means..."*
    *   Point your cursor at the `Fault Probability Matrix` showing **Oil Starvation (88%)** in red.
    *   Point your cursor at the `Residual Time Series` graph showing the oil pressure deviation.
*   **Transition:** Click on the **Mission Sandbox** widget.

### 32–48 sec | Scene 3: Mission Sandbox
*   **State Trigger:** **Press `Shift + 3`**.
*   **What to do:**
    *   Speak your script: *"Now Hermes goes beyond diagnosis..."*
    *   **Crucial Action:** Physically drag the `Altitude` slider down to **10,000 ft** and the `Engine Load` slider to **60%**.
    *   Click the blue **"CALCULATE MITIGATION STRATEGY"** button.
    *   Point out the simulated risk dropping to 12% and the RUL impact of +74 mins.
*   **Transition:** Click the **"PUSH TO OPERATOR"** button that appears. *(Note: This button automatically triggers the Scene 4 state behind the scenes).*

### 48–60 sec | Scene 4: Operator View
*   **State Trigger:** Navigate back to the **Operator Dashboard**.
*   **What to do:**
    *   Speak your script: *"The decision remains with the operator..."*
    *   Show the new blue "Engineer Advisory" recommendation banner.
    *   **Crucial Action:** Click the **"Accept"** button on the banner.
    *   *Pause for a second* as the dashboard instantly updates (EHI jumps to 82, Alert hides, Oil Pressure stabilizes at 55).

### 60–75 sec | Scene 5: Maintenance View
*   **State Trigger:** Navigate to the **Maintenance Dashboard**.
*   **State Trigger:** As soon as it loads, **press `Shift + 5`**.
*   **What to do:**
    *   Speak your script: *"Finally, the same intelligence reaches maintenance..."*
    *   Point out the "OIL STARVATION / PUMP DEGRADATION" diagnosis and the A-Level priority.
    *   Point to the completed sortie in the Post-Flight Log.
*   **Transition:** Hover your mouse over the red **"ACKNOWLEDGE & GENERATE WORK ORDER"** button.
*   *Stop recording.*
