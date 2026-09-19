import { create } from 'zustand';
import { connectWebSocket, disconnectWebSocket } from '../api/websocket';
import { postWhatIf } from '../api/restClient';

// --- Scene Setup Logic ---
const initialTimeSeries = Array.from({ length: 60 }).map((_, i) => ({
  time: `12:${(i < 10 ? '0' : '') + i}:00`,
  drift: 0,
  expectedEGT: 65,
  actualEGT: 65,
  residual: 0,
  upperBound: 15,
  lowerBound: -15,
}));

// Base initial perfectly normal state
const initialNormalContext = {
  altitude: 15200, rpm: 2450, engineLoad: 68, oat: -2, map: 28.5, fuelFlow: 24.1,
  phase: 'CRUISE', ehi: 98, rul: 145, rulLowerBound: 130, rulUpperBound: 160,
  fuelRemaining: 85, timeToEmpty: 3.5, alternatorVolts: 28.2, alternatorAmps: 45, mainBusLoad: 78,
};

const initialTwinData = {
  globals: {
    rpm: { expected: 2450, actual: 2450, deviation: 0, status: 'good' },
    oilPressure: { expected: 65, actual: 65, deviation: 0, status: 'good' },
    oilTemp: { expected: 95, actual: 95, deviation: 0, status: 'good' },
  },
  cylinders: [
    { id: 1, egt: { expected: 650, actual: 648 }, cht: { expected: 155, actual: 153 } },
    { id: 2, egt: { expected: 650, actual: 655 }, cht: { expected: 155, actual: 158 } },
    { id: 3, egt: { expected: 650, actual: 660 }, cht: { expected: 155, actual: 162 } },
    { id: 4, egt: { expected: 650, actual: 649 }, cht: { expected: 155, actual: 154 } },
  ],
};

const useEngineStore = create((set, get) => ({
  activeScene: 0,
  _animFrame: null,
  
  // Scene Data (Starts at Normal)
  missionContext: { ...initialNormalContext },
  twinComparisonData: JSON.parse(JSON.stringify(initialTwinData)),
  timeSeriesData: initialTimeSeries,
  faultProbabilities: [],
  activeRecommendation: null,
  activeAlerts: [],
  maintenanceLog: [],
  diagnosisData: null,

  animateTransition: (startValues, endValues, durationMs, onCompleteStateUpdates = {}) => {
    let startTime = null;
    const store = get();
    if (store._animFrame) cancelAnimationFrame(store._animFrame);
    
    const animate = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / durationMs, 1);
      
      const currentEhi = Math.round(startValues.ehi + (endValues.ehi - startValues.ehi) * progress);
      const rawOilP = startValues.oilP + (endValues.oilP - startValues.oilP) * progress;
      const currentOilP = Math.round(rawOilP * 10) / 10;
      const rawDev = startValues.dev + (endValues.dev - startValues.dev) * progress;
      const currentDeviation = Math.round(rawDev * 10) / 10;
      
      set(state => {
        const newState = {
          missionContext: { ...state.missionContext, ehi: currentEhi },
          twinComparisonData: {
            ...state.twinComparisonData,
            globals: {
              ...state.twinComparisonData.globals,
              oilPressure: {
                ...state.twinComparisonData.globals.oilPressure,
                actual: currentOilP,
                deviation: currentDeviation,
                status: currentDeviation < -30 ? 'critical' : (currentDeviation < -10 ? 'warning' : 'good')
              }
            }
          }
        };
        // Apply final updates instantly if we hit 100%
        if (progress === 1) {
          return { ...state, ...newState, ...onCompleteStateUpdates };
        }
        return { ...state, ...newState };
      });

      if (progress < 1) {
        store._animFrame = requestAnimationFrame(animate);
      }
    };
    store._animFrame = requestAnimationFrame(animate);
  },

  // Setters
  setScene: (sceneNumber) => {
    let stateUpdates = { activeScene: sceneNumber };
    const todayDate = new Date().toISOString().split('T')[0];

    const store = get();
    const currentOilP = store.twinComparisonData.globals.oilPressure.actual;
    const currentDev = store.twinComparisonData.globals.oilPressure.deviation;
    const currentEhi = store.missionContext.ehi;

    if (sceneNumber === 0) {
      // Normal
      set({
        activeScene: 0,
        missionContext: { ...initialNormalContext },
        twinComparisonData: JSON.parse(JSON.stringify(initialTwinData)),
        activeAlerts: [],
        activeRecommendation: null,
      });
    }
    else if (sceneNumber === 1) {
      // Warning Drop (Animate down to 85 EHI, 55 PSI)
      store.animateTransition(
        { ehi: currentEhi, oilP: currentOilP, dev: currentDev },
        { ehi: 85, oilP: 55, dev: -15.3 },
        2000,
        {
          activeAlerts: [{ level: 'warning', title: 'SYSTEM WARNING', message: 'Unexpected oil pressure drop detected. Monitoring closely.', timestamp: '12:44:00', resolved: false }],
          missionContext: { ...store.missionContext, ehi: 85, rul: 80 }
        }
      );
      set({ activeScene: 1 });
    }
    else if (sceneNumber === 2) {
      // Critical Drop (Animate down to 68 EHI, 40 PSI)
      store.animateTransition(
        { ehi: currentEhi, oilP: currentOilP, dev: currentDev },
        { ehi: 68, oilP: 40, dev: -38.5 },
        2000,
        {
          activeAlerts: [{ level: 'critical', title: 'ANOMALY DETECTED', message: 'Thermodynamic Mismatch in Oil Pressure. Physics baseline deviation.', timestamp: '12:45:10', resolved: false }],
          missionContext: { ...store.missionContext, ehi: 68, rul: 31, rulLowerBound: 24, rulUpperBound: 39 }
        }
      );
      set({ activeScene: 2 });
    } 
    else if (sceneNumber === 3 || sceneNumber === 4) {
      // Scene 3 & 4: Engineer Diagnosis and Sandbox
      const dropSeries = initialTimeSeries.map((pt, i) => {
        if (i >= 45) return { ...pt, expectedEGT: 65, actualEGT: 40, residual: -25, drift: 0.8 };
        return { ...pt, expectedEGT: 65, actualEGT: 65, residual: 0, drift: 0.1 };
      });
      stateUpdates = {
        ...stateUpdates,
        missionContext: { ...get().missionContext, ehi: 68, rul: 31, altitude: 15200 },
        timeSeriesData: dropSeries,
        faultProbabilities: [
          { name: 'Oil Starvation', probability: 0.88, ci: [0.80, 0.95] },
          { name: 'Injector Degradation', probability: 0.07, ci: [0.05, 0.10] },
          { name: 'Sensor Drift', probability: 0.03, ci: [0.01, 0.05] },
          { name: 'Unknown Anomaly', probability: 0.02, ci: [0.00, 0.04] },
        ]
      };
      set(stateUpdates);
    } 
    else if (sceneNumber === 5) {
      // Scene 5: Operator accepts recommendation (before accept)
      stateUpdates = {
        ...stateUpdates,
        activeRecommendation: {
          title: "ENGINEER ADVISORY: Drop altitude to 10,000 ft, reduce throttle to 60%. Restores safe RTB margin.",
          options: [],
          isGood: true
        }
      };
      set(stateUpdates);
    } 
    else if (sceneNumber === 6) {
      // Scene 6: Maintenance
      stateUpdates = {
        ...stateUpdates,
        maintenanceLog: [
          { id: 'Surveillance-Alpha-09', date: todayDate, duration: '02:15:00', maxRpm: 2450, anomalies: 1, riskLevel: 'Critical' },
          { id: 'M-142', date: '2026-08-28', duration: '08:14:00', maxRpm: 5600, anomalies: 3, riskLevel: 'High' },
        ],
        diagnosisData: {
          fault: "OIL STARVATION / PUMP DEGRADATION",
          evidence: "45-min sustained residual drift in oil pressure. Thermodynamic mismatch detected.",
          priority: "A-Level (Ground until resolved)"
        }
      };
      set(stateUpdates);
    }
  },

  acceptRecommendation: () => {
    set(state => ({
      activeRecommendation: null,
      activeAlerts: [],
      missionContext: {
        ...state.missionContext,
        ehi: 82,
        rul: 105, // 1h 45m
        altitude: 10000,
        rpm: 2100 // corresponding to 60% throttle
      },
      twinComparisonData: {
        ...state.twinComparisonData,
        globals: {
          ...state.twinComparisonData.globals,
          oilPressure: { expected: 65, actual: 55, deviation: -15.3, status: 'warning' }
        }
      }
    }));
  },

  // Actions
  pushRecommendationToOperator: (rec) => {
    // Send Recommendation sets scene to 5
    get().setScene(5);
  },

  connectLiveTelemetry: () => {
    return () => {}; // Disabled for demo
  },

  fetchMissionContext: async () => {
    return get().missionContext;
  },

  simulateMission: async (params) => {
    // Hardcoded for Scene Sandbox
    return {
      simulatedRisk: 12, // 12% (Low)
      currentRisk: 85, // 85% (High)
      rulImpact: 74, // 1h 45m - 31m = 74m
      trajectory: [],
      engineAlive: true,
      failureReason: null,
      simulatedRul: 105 // 1h 45m
    };
  }
}));

// Keyboard Listener
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    // Check if Shift + 0-6 is pressed
    if (e.shiftKey) {
      switch(e.key) {
        case '0': case ')': useEngineStore.getState().setScene(0); break;
        case '1': case '!': useEngineStore.getState().setScene(1); break;
        case '2': case '@': useEngineStore.getState().setScene(2); break;
        case '3': case '#': useEngineStore.getState().setScene(3); break;
        case '4': case '$': useEngineStore.getState().setScene(4); break;
        case '5': case '%': useEngineStore.getState().setScene(5); break;
        case '6': case '^': useEngineStore.getState().setScene(6); break;
        default: break;
      }
    }
  });
}

export default useEngineStore;
