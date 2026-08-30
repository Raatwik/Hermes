import { create } from 'zustand';
import { connectWebSocket, disconnectWebSocket } from '../api/websocket';
import { postWhatIf } from '../api/restClient';

// Generate mock time-series data for the last 60 minutes
const generateMockTimeSeries = () => {
  const data = [];
  const now = Date.now();
  for (let i = 60; i >= 0; i--) {
    const time = new Date(now - i * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const drift = 0.2 + Math.random() * 0.2; // roughly between 0.2 and 0.4
    const expectedEGT = 600 + Math.sin(i / 10) * 50;
    const actualEGT = expectedEGT + (Math.random() * 20 - 5);
    const residual = actualEGT - expectedEGT;

    data.push({
      time,
      drift,
      expectedEGT,
      actualEGT,
      residual,
      upperBound: 15,
      lowerBound: -15,
    });
  }
  return data;
};

const useEngineStore = create((set, get) => ({
  // --- State ---
  activeRecommendation: null,
  missionContext: {
    altitude: 15200,
    rpm: 2420,
    engineLoad: 68,
    oat: -2.1,
    map: 23.7,
    fuelFlow: 24.1,
    phase: 'CRUISE',
    ehi: 82, // Engine Health Index (0-100)
    rul: 145, // Remaining Useful Life (hours)
    rulLowerBound: 130, // Confidence interval lower
    rulUpperBound: 160 // Confidence interval upper
  },

  twinComparisonData: {
    globals: {
      rpm: { expected: 2450, actual: 2450, deviation: 0, status: 'NORMAL' },
      oilPressure: { expected: 65, actual: 64, deviation: -1.5, status: 'NORMAL' },
      oilTemp: { expected: 95, actual: 98, deviation: 3.1, status: 'NORMAL' }
    },
    cylinders: [
      { id: 1, egt: { expected: 650, actual: 645 }, cht: { expected: 155, actual: 154 } },
      { id: 2, egt: { expected: 650, actual: 652 }, cht: { expected: 155, actual: 155 } },
      { id: 3, egt: { expected: 650, actual: 672 }, cht: { expected: 155, actual: 156 } },
      { id: 4, egt: { expected: 650, actual: 648 }, cht: { expected: 155, actual: 153 } },
    ]
  },
  
  timeSeriesData: generateMockTimeSeries(),
  
  faultProbabilities: [
    { name: 'Valve Sticking (Exhaust)', probability: 0.42, ci: [0.31, 0.54] },
    { name: 'Spark Plug Degradation', probability: 0.21, ci: [0.14, 0.31] },
    { name: 'Fuel Injector Degradation', probability: 0.12, ci: [0.07, 0.20] },
    { name: 'Oil System Degradation', probability: 0.06, ci: [0.03, 0.12] },
    { name: 'Sensor Fault (Any)', probability: 0.04, ci: [0.02, 0.09] },
    { name: 'Unknown / Open-Set', probability: 0.15, ci: [0.10, 0.23] }
  ],
  
  // --- Actions ---
  pushRecommendationToOperator: (recommendation) => set({ activeRecommendation: recommendation }),
  
  connectLiveTelemetry: () => {
    connectWebSocket((data) => {
      set((state) => {
        const newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const newData = [...state.timeSeriesData];
        if (newData.length >= 61) newData.shift();
        newData.push({
          time: newTime,
          drift: data.twin_drift_score ?? 0,
          expectedEGT: 600,
          actualEGT: data.egt ?? 600,
          residual: (data.egt ?? 600) - 600,
          upperBound: 15,
          lowerBound: -15,
        });

        const newContext = {
          ...state.missionContext,
          altitude: data.altitude ?? state.missionContext.altitude,
          rpm: data.rpm ?? state.missionContext.rpm,
          engineLoad: typeof data.engine_load === 'number' ? Math.round(data.engine_load * 100) : state.missionContext.engineLoad,
          oat: data.ambient_temperature ?? state.missionContext.oat,
          fuelFlow: data.fuel_flow ?? state.missionContext.fuelFlow,
          rul: data.lstm_rul_mean ?? state.missionContext.rul,
          rulLowerBound: data.lstm_rul_mean != null && data.lstm_rul_std != null
            ? Math.round(data.lstm_rul_mean - 2 * data.lstm_rul_std)
            : state.missionContext.rulLowerBound,
          rulUpperBound: data.lstm_rul_mean != null && data.lstm_rul_std != null
            ? Math.round(data.lstm_rul_mean + 2 * data.lstm_rul_std)
            : state.missionContext.rulUpperBound,
        };

        const newTwinData = JSON.parse(JSON.stringify(state.twinComparisonData));
        newTwinData.globals.rpm.actual = data.rpm ?? newTwinData.globals.rpm.actual;
        newTwinData.globals.rpm.deviation = ((newTwinData.globals.rpm.actual - newTwinData.globals.rpm.expected) / newTwinData.globals.rpm.expected * 100).toFixed(1);
        newTwinData.globals.oilPressure.actual = data.oil_pressure ?? newTwinData.globals.oilPressure.actual;
        newTwinData.globals.oilPressure.deviation = ((newTwinData.globals.oilPressure.actual - newTwinData.globals.oilPressure.expected) / newTwinData.globals.oilPressure.expected * 100).toFixed(1);
        newTwinData.globals.oilTemp.actual = data.oil_temp ?? newTwinData.globals.oilTemp.actual;
        newTwinData.globals.oilTemp.deviation = ((newTwinData.globals.oilTemp.actual - newTwinData.globals.oilTemp.expected) / newTwinData.globals.oilTemp.expected * 100).toFixed(1);

        const egtKeys = ['egt_1', 'egt_2', 'egt_3', 'egt_4'];
        newTwinData.cylinders.forEach((cyl, i) => {
          if (data[egtKeys[i]] != null) cyl.egt.actual = data[egtKeys[i]];
          if (data.cht != null) cyl.cht.actual = data.cht;
        });

        const faultProbabilities = (data.xgboost_faults && data.xgboost_faults.length > 0)
          ? data.xgboost_faults.map((name, idx) => ({
              name,
              probability: 1 / data.xgboost_faults.length,
              ci: [0, 1],
            }))
          : state.faultProbabilities;

        return {
          timeSeriesData: newData,
          missionContext: newContext,
          twinComparisonData: newTwinData,
          faultProbabilities,
        };
      });
    });

    return () => disconnectWebSocket();
  },

  fetchMissionContext: async () => {
    // Placeholder for fetching historical REST data
    console.log("Fetching mission context via REST...");
    // Just a mock promise resolving to current state
    return new Promise(resolve => setTimeout(() => resolve(get().missionContext), 500));
  },

  simulateMission: async (params) => {
    const { altitude, engineLoad } = params;
    const throttle = Math.max(0, Math.min(1, (engineLoad ?? 68) / 100));
    const currentContext = get().missionContext;
    const currentRul = currentContext.rul ?? 145;

    try {
      const data = await postWhatIf({
        throttle,
        altitude: altitude ?? 0,
        currentState: {
          rpm: currentContext.rpm ?? 2420,
          cht: 165,
          egt: 620,
          oil_pressure: 65,
          oil_temp: 95,
          fuel_flow: currentContext.fuelFlow ?? 24.1,
          battery_voltage: 13.6,
        },
      });
      const traj = data.trajectory ?? [];
      const last = traj.length > 0 ? traj[traj.length - 1] : {};

      let simulatedRisk = 65;
      if (data.rul_mean != null) {
        simulatedRisk = Math.max(5, Math.min(95, Math.round(100 - data.rul_mean)));
      } else {
        const cht = last.cht ?? 165;
        const egt = last.egt ?? 620;
        simulatedRisk = Math.round(Math.min(95, Math.max(5, (cht / 250) * 50 + (egt / 900) * 50)));
      }

      const currentRisk = Math.max(5, Math.min(95, Math.round(100 - currentRul)));

      let rulImpact = 0;
      if (data.rul_mean != null) {
        rulImpact = Math.round((data.rul_mean - currentRul) * 10) / 10;
      } else {
        rulImpact = Math.round((currentRisk - simulatedRisk) / 5 * 10) / 10;
      }

      return {
        simulatedRisk,
        currentRisk,
        rulImpact,
        trajectory: traj,
        engineAlive: data.engine_alive,
        failureReason: data.failure_reason,
      };
    } catch (err) {
      console.error('What-If API failed, falling back to heuristic:', err);
      const { rpm } = params;
      let riskScore = 65;
      if (engineLoad < currentContext.engineLoad) riskScore -= (currentContext.engineLoad - engineLoad) * 0.8;
      if (engineLoad > currentContext.engineLoad) riskScore += (engineLoad - currentContext.engineLoad) * 1.2;
      if (rpm < currentContext.rpm) riskScore -= (currentContext.rpm - rpm) * 0.02;
      if (rpm > currentContext.rpm) riskScore += (rpm - currentContext.rpm) * 0.03;
      if (altitude < currentContext.altitude) riskScore -= 5;
      riskScore = Math.max(10, Math.min(95, riskScore));
      return {
        simulatedRisk: Math.round(riskScore),
        currentRisk: 65,
        rulImpact: Math.round((65 - riskScore) / 5 * 10) / 10,
      };
    }
  }
}));

export default useEngineStore;
