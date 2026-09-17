import { create } from 'zustand';
import { connectWebSocket, disconnectWebSocket } from '../api/websocket';
import { postWhatIf } from '../api/restClient';

// --- Scene Setup Logic ---
// We define the base initial state
const initialTimeSeries = Array.from({ length: 60 }).map((_, i) => ({
  time: `12:${(i < 10 ? '0' : '') + i}:00`,
  drift: 0,
  expectedEGT: 65,
  actualEGT: 65,
  residual: 0,
  upperBound: 15,
  lowerBound: -15,
}));

const useEngineStore = create((set, get) => ({
  activeScene: 1,
  
  // Scene Data
  missionContext: {
    altitude: 15200, rpm: 2450, engineLoad: 68, oat: -2, map: 28.5, fuelFlow: 24.1,
    phase: 'CRUISE', ehi: 68, rul: 31, rulLowerBound: 24, rulUpperBound: 39,
    fuelRemaining: 85, timeToEmpty: 3.5, alternatorVolts: 28.2, alternatorAmps: 45, mainBusLoad: 78,
  },
  twinComparisonData: {
    globals: {
      rpm: { expected: 2450, actual: 2450, deviation: 0, status: 'good' },
      oilPressure: { expected: 65, actual: 40, deviation: -38.5, status: 'critical' },
      oilTemp: { expected: 95, actual: 95, deviation: 0, status: 'good' },
    },
    cylinders: [
      { id: 1, egt: { expected: 650, actual: 648 }, cht: { expected: 155, actual: 153 } },
      { id: 2, egt: { expected: 650, actual: 675 }, cht: { expected: 155, actual: 168 } },
      { id: 3, egt: { expected: 650, actual: 695 }, cht: { expected: 155, actual: 180 } },
      { id: 4, egt: { expected: 650, actual: 649 }, cht: { expected: 155, actual: 154 } },
    ],
  },
  timeSeriesData: initialTimeSeries,
  faultProbabilities: [],
  activeRecommendation: null,
  activeAlerts: [
    {
      level: 'critical', title: 'ANOMALY DETECTED',
      message: 'Thermodynamic Mismatch in Oil Pressure. Physics baseline deviation.',
      timestamp: '12:45:10', resolved: false
    }
  ],
  maintenanceLog: [],
  diagnosisData: null,

  // Setters
  setScene: (sceneNumber) => {
    let stateUpdates = { activeScene: sceneNumber };
    const todayDate = new Date().toISOString().split('T')[0];

    if (sceneNumber === 1) {
      stateUpdates = {
        ...stateUpdates,
        missionContext: { ...get().missionContext, ehi: 68, rul: 31, altitude: 15200, rpm: 2450 },
        activeAlerts: [{ level: 'critical', title: 'ANOMALY DETECTED', message: 'Thermodynamic Mismatch in Oil Pressure. Physics baseline deviation.', timestamp: '12:45:10', resolved: false }],
        activeRecommendation: null,
        twinComparisonData: {
          ...get().twinComparisonData,
          globals: {
            rpm: { expected: 2450, actual: 2450, deviation: 0, status: 'good' },
            oilPressure: { expected: 65, actual: 40, deviation: -38.5, status: 'critical' },
            oilTemp: { expected: 95, actual: 95, deviation: 0, status: 'good' },
          }
        }
      };
    } else if (sceneNumber === 2 || sceneNumber === 3) {
      // Scene 2 & 3: Engineer Diagnosis and Sandbox
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
    } else if (sceneNumber === 4) {
      // Scene 4: Operator accepts recommendation (before accept)
      stateUpdates = {
        ...stateUpdates,
        activeRecommendation: {
          title: "ENGINEER ADVISORY: Drop altitude to 10,000 ft, reduce throttle to 60%. Restores safe RTB margin.",
          options: [],
          isGood: true
        }
      };
    } else if (sceneNumber === 5) {
      // Scene 5: Maintenance
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
    }

    set(stateUpdates);
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
    // Send Recommendation sets scene to 4
    get().setScene(4);
  },

  connectLiveTelemetry: () => {
    return () => {}; // Disabled for demo
  },

  fetchMissionContext: async () => {
    return get().missionContext;
  },

  simulateMission: async (params) => {
    // Hardcoded for Scene 3
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
    // Check if Shift + 1-5 is pressed
    if (e.shiftKey) {
      switch(e.key) {
        case '1': case '!': useEngineStore.getState().setScene(1); break;
        case '2': case '@': useEngineStore.getState().setScene(2); break;
        case '3': case '#': useEngineStore.getState().setScene(3); break;
        case '4': case '$': useEngineStore.getState().setScene(4); break;
        case '5': case '%': useEngineStore.getState().setScene(5); break;
        default: break;
      }
    }
  });
}

export default useEngineStore;
