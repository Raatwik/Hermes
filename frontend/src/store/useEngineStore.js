import { create } from 'zustand';
import { connectWebSocket, disconnectWebSocket } from '../api/websocket';
import { postWhatIf } from '../api/restClient';

let _liveSnapshot = null;
let _throttleTimer = null;
let _pendingData = null;
const THROTTLE_MS = 200; // max ~5 updates/sec

function _applyTelemetry(state, data) {
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

  const ehi = data.twin_drift_score != null
    ? Math.max(0, Math.round(100 - data.twin_drift_score * 100))
    : state.missionContext.ehi;

  const newContext = {
    ...state.missionContext,
    ehi,
    altitude: data.altitude != null ? Math.round(data.altitude) : state.missionContext.altitude,
    rpm: data.rpm != null ? Math.round(data.rpm) : state.missionContext.rpm,
    engineLoad: typeof data.engine_load === 'number' ? Math.round(data.engine_load * 100) : state.missionContext.engineLoad,
    oat: data.ambient_temperature != null ? Math.round(data.ambient_temperature) : state.missionContext.oat,
    fuelFlow: data.fuel_flow != null ? Math.round(data.fuel_flow * 10) / 10 : state.missionContext.fuelFlow,
    rul: data.lstm_rul_mean != null ? Math.max(0, Math.min(Number(data.lstm_rul_mean.toFixed(2)), 9999)) : state.missionContext.rul,
    rulLowerBound: data.lstm_rul_mean != null && data.lstm_rul_std != null
      ? Math.max(0, Number((data.lstm_rul_mean - 2 * data.lstm_rul_std).toFixed(2)))
      : state.missionContext.rulLowerBound,
    rulUpperBound: data.lstm_rul_mean != null && data.lstm_rul_std != null
      ? Math.min(9999, Number((data.lstm_rul_mean + 2 * data.lstm_rul_std).toFixed(2)))
      : state.missionContext.rulUpperBound,
  };

  const newTwinData = JSON.parse(JSON.stringify(state.twinComparisonData));

  if (data.expected_rpm != null) newTwinData.globals.rpm.expected = Math.round(data.expected_rpm);
  newTwinData.globals.rpm.actual = data.rpm != null ? Math.round(data.rpm) : newTwinData.globals.rpm.actual;
  newTwinData.globals.rpm.deviation = ((newTwinData.globals.rpm.actual - newTwinData.globals.rpm.expected) / newTwinData.globals.rpm.expected * 100).toFixed(1);

  if (data.expected_oil_pressure != null) newTwinData.globals.oilPressure.expected = Math.round(data.expected_oil_pressure * 10) / 10;
  newTwinData.globals.oilPressure.actual = data.oil_pressure != null ? Math.round(data.oil_pressure * 10) / 10 : newTwinData.globals.oilPressure.actual;
  newTwinData.globals.oilPressure.deviation = ((newTwinData.globals.oilPressure.actual - newTwinData.globals.oilPressure.expected) / newTwinData.globals.oilPressure.expected * 100).toFixed(1);

  if (data.expected_oil_temp != null) newTwinData.globals.oilTemp.expected = Math.round(data.expected_oil_temp * 10) / 10;
  newTwinData.globals.oilTemp.actual = data.oil_temp != null ? Math.round(data.oil_temp * 10) / 10 : newTwinData.globals.oilTemp.actual;
  newTwinData.globals.oilTemp.deviation = ((newTwinData.globals.oilTemp.actual - newTwinData.globals.oilTemp.expected) / newTwinData.globals.oilTemp.expected * 100).toFixed(1);

  const egtKeys = ['egt_1', 'egt_2', 'egt_3', 'egt_4'];
  newTwinData.cylinders.forEach((cyl, i) => {
    if (data[`expected_${egtKeys[i]}`] != null) cyl.egt.expected = Math.round(data[`expected_${egtKeys[i]}`]);
    if (data[egtKeys[i]] != null) cyl.egt.actual = Math.round(data[egtKeys[i]]);
    if (data.expected_cht != null) cyl.cht.expected = Math.round(data.expected_cht);
    if (data.cht != null) cyl.cht.actual = Math.round(data.cht);
  });

  const faultProbabilities = (data.xgboost_faults && Object.keys(data.xgboost_faults).length > 0)
    ? Object.entries(data.xgboost_faults).map(([name, details]) => ({
        name,
        probability: details.probability || 0,
        ci: details.ci || [0, 1],
      }))
    : state.faultProbabilities;

  const update = {
    isLive: true,
    timeSeriesData: newData,
    missionContext: newContext,
    twinComparisonData: newTwinData,
    faultProbabilities,
  };

  _liveSnapshot = update;
  return update;
}

const useEngineStore = create((set, get) => ({
  // --- State ---
  activeRecommendation: null,
  isLive: false,

  missionContext: _liveSnapshot?.missionContext ?? {
    altitude: 0,
    rpm: 0,
    engineLoad: 0,
    oat: 0,
    map: 0,
    fuelFlow: 0,
    phase: 'STARTUP',
    ehi: 0,
    rul: null,
    rulLowerBound: null,
    rulUpperBound: null,
  },

  twinComparisonData: _liveSnapshot?.twinComparisonData ?? {
    globals: {
      rpm: { expected: 2450, actual: 0, deviation: 0, status: 'NOMINAL' },
      oilPressure: { expected: 65, actual: 0, deviation: 0, status: 'NOMINAL' },
      oilTemp: { expected: 95, actual: 0, deviation: 0, status: 'NOMINAL' },
    },
    cylinders: [
      { id: 1, egt: { expected: 650, actual: 0 }, cht: { expected: 155, actual: 0 } },
      { id: 2, egt: { expected: 650, actual: 0 }, cht: { expected: 155, actual: 0 } },
      { id: 3, egt: { expected: 650, actual: 0 }, cht: { expected: 155, actual: 0 } },
      { id: 4, egt: { expected: 650, actual: 0 }, cht: { expected: 155, actual: 0 } },
    ],
  },

  timeSeriesData: _liveSnapshot?.timeSeriesData ?? [],

  faultProbabilities: _liveSnapshot?.faultProbabilities ?? [],

  // --- Actions ---
  pushRecommendationToOperator: (recommendation) => set({ activeRecommendation: recommendation }),

  connectLiveTelemetry: () => {
    connectWebSocket((data) => {
      _pendingData = data;
      if (_throttleTimer) return;
      _throttleTimer = setTimeout(() => {
        _throttleTimer = null;
        const throttledData = _pendingData;
        if (!throttledData) return;
        _pendingData = null;
        set((state) => _applyTelemetry(state, throttledData));
      }, THROTTLE_MS);
    });

    return () => {
      if (_throttleTimer) { clearTimeout(_throttleTimer); _throttleTimer = null; }
      disconnectWebSocket();
    };
  },

  fetchMissionContext: async () => {
    return get().missionContext;
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
  },
}));

export default useEngineStore;
