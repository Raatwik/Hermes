import { create } from 'zustand';
import { connectWebSocket, disconnectWebSocket } from '../api/websocket';
import { postWhatIf } from '../api/restClient';

let _liveSnapshot = null;
let _throttleTimer = null;
let _pendingData = null;
const THROTTLE_MS = 200; // max ~5 updates/sec

const EHI_WEIGHTS = {
  temperature: 0.25,
  pressure: 0.15,
  vibration: 0.20,
  rpm_deviation: 0.15,
  fuel_efficiency: 0.10,
  dt_drift: 0.15,
};

function _computeMultiInputEhi(driftScore, components) {
  if (!components || Object.keys(components).length === 0) {
    if (driftScore == null) return { ehi: 0, contributions: {} };
    return {
      ehi: Math.max(0, Math.min(100, Math.round(100 - driftScore * 100))),
      contributions: {},
    };
  }

  const scores = {
    temperature: components.temperature ?? 0,
    pressure: components.pressure ?? 0,
    vibration: components.vibration ?? 0,
    rpm_deviation: components.rpm_deviation ?? 0,
    fuel_efficiency: components.fuel_efficiency ?? 0,
    dt_drift: driftScore ?? 0,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  const contributions = {};

  for (const [factor, weight] of Object.entries(EHI_WEIGHTS)) {
    const rawScore = scores[factor] ?? 0;
    const penalty = Math.min(1, rawScore);
    weightedSum += penalty * weight;
    totalWeight += weight;
    contributions[factor] = Math.round(penalty * 100);
  }

  const normalizedPenalty = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const ehi = Math.max(0, Math.min(100, Math.round(100 - normalizedPenalty * 100)));

  return { ehi, contributions };
}

const MISSION_PHASES = [
  { start: 0, end: 120, name: 'TAKEOFF' },
  { start: 120, end: 600, name: 'CLIMB' },
  { start: 600, end: 1800, name: 'CRUISE' },
  { start: 1800, end: 2400, name: 'LOITER' },
  { start: 2400, end: 3000, name: 'DESCENT' },
  { start: 3000, end: 3600, name: 'LANDING' },
];
const TOTAL_MISSION_TIME = 3600;

function _computeMissionPhase(timeSec) {
  for (const p of MISSION_PHASES) {
    if (timeSec >= p.start && timeSec < p.end) {
      const phaseProgress = Math.round(((timeSec - p.start) / (p.end - p.start)) * 1000) / 10;
      const missionProgress = Math.round((timeSec / TOTAL_MISSION_TIME) * 1000) / 10;
      return { phase: p.name, phaseProgress, missionProgress };
    }
  }
  const last = MISSION_PHASES[MISSION_PHASES.length - 1];
  return { phase: last.name, phaseProgress: 100, missionProgress: 100 };
}

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

  const { ehi, contributions: ehiContributions } = data.twin_drift_score != null
    ? _computeMultiInputEhi(data.twin_drift_score, data.ehi_components)
    : { ehi: state.missionContext.ehi, contributions: state.missionContext.ehiContributions ?? {} };

  const divergenceClassification = data.divergence_classification ?? state.missionContext.divergenceClassification ?? null;

  const timeSec = data.time ?? data.time_sec;
  const computed = timeSec != null ? _computeMissionPhase(timeSec) : null;

  const newContext = {
    ...state.missionContext,
    ehi,
    ehiContributions,
    divergenceClassification,
    altitude: data.altitude != null ? Math.round(data.altitude) : state.missionContext.altitude,
    rpm: data.rpm != null ? Math.round(data.rpm) : state.missionContext.rpm,
    engineLoad: typeof data.engine_load === 'number' ? Math.round(data.engine_load * 100) : state.missionContext.engineLoad,
    oat: data.ambient_temperature != null ? Math.round(data.ambient_temperature) : state.missionContext.oat,
    map: data.ambient_pressure != null ? Math.round(data.ambient_pressure * 0.2953 * 10) / 10 : state.missionContext.map,
    fuelFlow: data.fuel_flow != null ? Math.round(data.fuel_flow * 10) / 10 : state.missionContext.fuelFlow,
    rul: divergenceClassification?.classification === 'sensor_fault'
      ? state.missionContext.rul
      : (data.rul != null ? Math.max(0, Math.min(Number(Number(data.rul).toFixed(2)), 9999)) : (data.Remaining_Useful_Life != null ? Math.max(0, Math.min(Number(Number(data.Remaining_Useful_Life).toFixed(2)), 9999)) : (data.lstm_rul_mean != null ? Math.max(0, Math.min(Number(data.lstm_rul_mean.toFixed(2)), 9999)) : state.missionContext.rul))),
    rulLowerBound: data.lstm_rul_mean != null && data.lstm_rul_std != null
      ? Math.max(0, Number((data.lstm_rul_mean - 2 * data.lstm_rul_std).toFixed(2)))
      : state.missionContext.rulLowerBound,
    rulUpperBound: data.lstm_rul_mean != null && data.lstm_rul_std != null
      ? Math.min(9999, Number((data.lstm_rul_mean + 2 * data.lstm_rul_std).toFixed(2)))
      : state.missionContext.rulUpperBound,
    phase: data.mission_phase != null
      ? data.mission_phase.toUpperCase()
      : (computed ? computed.phase : state.missionContext.phase),
    phaseProgress: data.phase_progress_pct != null
      ? data.phase_progress_pct
      : (computed ? computed.phaseProgress : state.missionContext.phaseProgress),
    missionProgress: data.mission_progress_pct != null
      ? data.mission_progress_pct
      : (computed ? computed.missionProgress : state.missionContext.missionProgress),
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

  const faultProbabilities = (data.xgboost_faults && data.xgboost_faults.length > 0)
    ? data.xgboost_faults.map((name) => ({
        name,
        probability: 1 / data.xgboost_faults.length,
        ci: [0, 1],
      }))
    : state.faultProbabilities;

  const MAX_TIMELINE_POINTS = 200;
  const degradationTimeline = [...state.degradationTimeline];
  const faultSeverities = data.fault_severities;
  if (faultSeverities && typeof faultSeverities === 'object' && Object.keys(faultSeverities).length > 0) {
    const simTime = data.time ?? data.time_sec ?? 0;
    let worstCase = 0;
    for (const sev of Object.values(faultSeverities)) {
      if (sev > worstCase) worstCase = sev;
    }
    degradationTimeline.push({
      time: Math.round(simTime * 10) / 10,
      faults: { ...faultSeverities },
      worstCase,
    });
    if (degradationTimeline.length > MAX_TIMELINE_POINTS) {
      degradationTimeline.splice(0, degradationTimeline.length - MAX_TIMELINE_POINTS);
    }
  }

  const update = {
    isLive: true,
    timeSeriesData: newData,
    missionContext: newContext,
    twinComparisonData: newTwinData,
    faultProbabilities,
    degradationTimeline,
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
    phaseProgress: 0,
    missionProgress: 0,
    ehi: 0,
    ehiContributions: {},
    divergenceClassification: null,
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

  degradationTimeline: _liveSnapshot?.degradationTimeline ?? [],

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
