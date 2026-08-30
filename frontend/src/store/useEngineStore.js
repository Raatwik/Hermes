import { create } from 'zustand';

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
  
  // Decoupled action to connect to a WebSocket (placeholder for real implementation)
  connectLiveTelemetry: () => {
    console.log("Connecting to live telemetry WebSocket...");
    // Mocking real-time updates every second
    const interval = setInterval(() => {
      set((state) => {
        const newData = [...state.timeSeriesData];
        newData.shift(); // remove oldest
        
        const lastData = newData[newData.length - 1];
        const newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const expectedEGT = 600 + Math.sin(Date.now() / 10000) * 50;
        const actualEGT = expectedEGT + (Math.random() * 20 - 5);
        
        newData.push({
          time: newTime,
          drift: 0.2 + Math.random() * 0.25,
          expectedEGT,
          actualEGT,
          residual: actualEGT - expectedEGT,
          upperBound: 15,
          lowerBound: -15,
        });

        // Add some random fluctuation to mission context for realism
        const newContext = { ...state.missionContext };
        newContext.altitude += Math.floor(Math.random() * 10 - 5);
        newContext.rpm += Math.floor(Math.random() * 4 - 2);
        
        // Occasional EHI fluctuation
        if (Math.random() > 0.8) {
          newContext.ehi = Math.max(0, Math.min(100, newContext.ehi + (Math.random() > 0.5 ? 1 : -1)));
        }

        // Fluctuate twinComparisonData
        const newTwinData = JSON.parse(JSON.stringify(state.twinComparisonData)); // deep clone
        newTwinData.globals.rpm.actual = newContext.rpm;
        newTwinData.globals.rpm.deviation = ((newContext.rpm - newTwinData.globals.rpm.expected) / newTwinData.globals.rpm.expected * 100).toFixed(1);
        
        newTwinData.globals.oilPressure.actual += (Math.random() * 1 - 0.5);
        newTwinData.globals.oilPressure.deviation = ((newTwinData.globals.oilPressure.actual - newTwinData.globals.oilPressure.expected) / newTwinData.globals.oilPressure.expected * 100).toFixed(1);

        newTwinData.cylinders.forEach(cyl => {
          cyl.egt.actual += (Math.random() * 4 - 2); // +/- 2 degrees
          cyl.cht.actual += (Math.random() * 2 - 1); // +/- 1 degree
          // Keep Cyl 3 EGT abnormally high to match the "Combustion Degradation" fault
          if (cyl.id === 3) {
            cyl.egt.actual = Math.max(665, cyl.egt.actual); // Keep it above 665
          }
        });

        return { timeSeriesData: newData, missionContext: newContext, twinComparisonData: newTwinData };
      });
    }, 2000); // 2 second interval for demo

    return () => clearInterval(interval);
  },

  fetchMissionContext: async () => {
    // Placeholder for fetching historical REST data
    console.log("Fetching mission context via REST...");
    // Just a mock promise resolving to current state
    return new Promise(resolve => setTimeout(() => resolve(get().missionContext), 500));
  },

  simulateMission: async (params) => {
    // Mock simulation logic based on counterfactual parameters
    return new Promise(resolve => {
      setTimeout(() => {
        const { altitude, rpm, engineLoad } = params;
        const currentContext = get().missionContext;
        
        // Simple mock heuristic for risk
        let riskScore = 65; // Base risk
        
        // Lower load reduces risk
        if (engineLoad < currentContext.engineLoad) riskScore -= (currentContext.engineLoad - engineLoad) * 0.8;
        if (engineLoad > currentContext.engineLoad) riskScore += (engineLoad - currentContext.engineLoad) * 1.2;
        
        // Lower RPM reduces risk
        if (rpm < currentContext.rpm) riskScore -= (currentContext.rpm - rpm) * 0.02;
        if (rpm > currentContext.rpm) riskScore += (rpm - currentContext.rpm) * 0.03;
        
        // Altitude effects
        if (altitude < currentContext.altitude) riskScore -= 5;
        
        // Bound risk score
        riskScore = Math.max(10, Math.min(95, riskScore));
        
        // Impact on RUL
        const rulImpact = (65 - riskScore) / 5; // e.g., if risk is 40, impact is +5 hours
        
        resolve({
          simulatedRisk: Math.round(riskScore),
          currentRisk: 65,
          rulImpact: Math.round(rulImpact * 10) / 10
        });
      }, 800); // Simulate network/compute delay
    });
  }
}));

export default useEngineStore;
