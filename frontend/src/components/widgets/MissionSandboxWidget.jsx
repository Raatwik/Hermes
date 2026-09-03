import React, { useState, useEffect } from 'react';
import useEngineStore from '../../store/useEngineStore';

const MissionSandboxWidget = () => {
  const { missionContext, simulateMission, pushRecommendationToOperator } = useEngineStore();
  const [params, setParams] = useState({
    altitude: 15200,
    rpm: 2420,
    engineLoad: 68,
    duration: 120, // minutes
    oat: -2.1,
    fuelFlow: 24.1
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState(null);
  const [isParamsOpen, setIsParamsOpen] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [pushedIndex, setPushedIndex] = useState(null);

  useEffect(() => {
    // Only initialize ONCE to prevent live telemetry from resetting user's slider inputs
    if (missionContext && params.altitude === 15200) {
      setParams({
        altitude: missionContext.altitude || 15200,
        rpm: missionContext.rpm || 2420,
        engineLoad: missionContext.engineLoad || 68,
        duration: 120,
        oat: missionContext.oat || -2.1,
        fuelFlow: missionContext.fuelFlow || 24.1
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setResult(null);
    try {
      const res = await simulateMission(params);
      setResult(res);
      setIsParamsOpen(false); // Collapse params on run
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  const getRiskColor = (risk) => {
    if (risk < 40) return 'var(--color-good)';
    if (risk < 70) return 'var(--color-warning)';
    return 'var(--color-critical)';
  };

  const handleAutoOptimize = async () => {
    setIsOptimizing(true);
    setRecommendations(null);
    setPushedIndex(null);
    
    const baseRecs = [
      { 
        action: "Drop altitude to 12,000 ft", 
        description: "Decreasing altitude increases air density. This improves engine cooling and reduces thermal stress on cylinders, significantly lowering the risk of a physical fault while only slightly decreasing mission range.",
        simParams: { ...params, altitude: 12000 }
      },
      { 
        action: "Reduce engine load to 55%", 
        description: "Lowering the engine load reduces combustion pressures and temperatures. This is the safest mechanical option but results in a slower cruise speed, reducing total mission endurance.",
        simParams: { ...params, engineLoad: 55 }
      },
      { 
        action: "Maintain profile", 
        description: "Continue with the current mission profile. No parameters are changed. Risk of failure remains elevated but mission objectives are not compromised yet.",
        simParams: { ...params }
      }
    ];

    try {
      const results = await Promise.all(baseRecs.map(r => simulateMission(r.simParams)));
      const populatedRecs = baseRecs.map((r, i) => ({
        ...r,
        simResult: results[i]
      }));
      setRecommendations(populatedRecs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handlePushToOperator = (rec, index) => {
    pushRecommendationToOperator({
      title: "RECOMMENDATION: MISSION MITIGATION",
      options: recommendations.map(r => ({ 
        action: r.action, 
        consequence: `Risk: ${r.simResult.simulatedRisk}%, RUL Impact: ${r.simResult.rulImpact > 0 ? '+' : ''}${r.simResult.rulImpact}h`
      })),
      isGood: false
    });
    setPushedIndex(index);
  };

  const handleReset = () => {
    setResult(null);
    setRecommendations(null);
    setPushedIndex(null);
    if (missionContext) {
      setParams({
        altitude: missionContext.altitude || 15200,
        rpm: missionContext.rpm || 2420,
        engineLoad: missionContext.engineLoad || 68,
        duration: 120,
        oat: missionContext.oat || -2.1,
        fuelFlow: missionContext.fuelFlow || 24.1
      });
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h3 className="text-base font-bold text-primary" style={{ fontSize: '1rem' }}>MISSION WHAT-IF SANDBOX</h3>
      </div>
      
      <div style={{ flexGrow: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        
        {/* Controls Section */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px' }}>
          <button 
            onClick={() => setIsParamsOpen(!isParamsOpen)}
            style={{ 
              width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', 
              border: 'none', borderBottom: isParamsOpen ? '1px solid var(--border-color)' : 'none',
              textAlign: 'left', fontWeight: 'bold', color: 'var(--text-primary)',
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between'
            }}
          >
            <span>Adjust Mission Parameters</span>
            <span>{isParamsOpen ? '▲' : '▼'}</span>
          </button>
          
          {isParamsOpen && (
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Altitude (ft)</span><span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{params.altitude}</span>
                </div>
                <input type="range" min="0" max="30000" step="500" value={params.altitude} onChange={(e) => setParams({...params, altitude: parseInt(e.target.value)})} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>RPM</span><span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{params.rpm}</span>
                </div>
                <input type="range" min="1000" max="6000" step="50" value={params.rpm} onChange={(e) => setParams({...params, rpm: parseInt(e.target.value)})} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Engine Load (%)</span><span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{params.engineLoad}%</span>
                </div>
                <input type="range" min="0" max="100" step="1" value={params.engineLoad} onChange={(e) => setParams({...params, engineLoad: parseInt(e.target.value)})} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Duration (mins)</span><span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{params.duration}</span>
                </div>
                <input type="range" min="10" max="480" step="10" value={params.duration} onChange={(e) => setParams({...params, duration: parseInt(e.target.value)})} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>OAT (°C)</span><span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{params.oat}</span>
                </div>
                <input type="range" min="-40" max="50" step="1" value={params.oat} onChange={(e) => setParams({...params, oat: parseInt(e.target.value)})} style={{ width: '100%' }} />
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleRunSimulation} 
          disabled={isSimulating}
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--color-primary, #3b82f6)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: isSimulating ? 'not-allowed' : 'pointer',
            opacity: isSimulating ? 0.7 : 1
          }}
        >
          {isSimulating ? 'SIMULATING...' : 'RUN SIMULATION'}
        </button>

        <button 
          onClick={handleAutoOptimize} 
          disabled={isOptimizing}
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--color-primary, #3b82f6)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: isOptimizing ? 'not-allowed' : 'pointer',
            opacity: isOptimizing ? 0.7 : 1
          }}
        >
          {isOptimizing ? 'GENERATING RECOMMENDATIONS...' : 'AUTO-OPTIMIZE MISSION'}
        </button>

        {(result || recommendations) && (
          <button 
            onClick={handleReset} 
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            RESET SANDBOX
          </button>
        )}

        {/* Results Section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' }}>
          {!result && !isSimulating && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
              Run simulation to see outcomes.
            </div>
          )}
          
          {isSimulating && (
            <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Calculating Risk...
            </div>
          )}

          {result && !isSimulating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Risk</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getRiskColor(result.currentRisk) }}>{result.currentRisk}%</div>
                </div>
                <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>➔</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Simulated Risk</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getRiskColor(result.simulatedRisk) }}>{result.simulatedRisk}%</div>
                </div>
              </div>
              
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', marginBottom: '0.25rem', fontWeight: 'bold' }}>Analytics Summary</div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                  This scenario would {result.simulatedRisk < result.currentRisk ? 'decrease' : 'increase'} risk by <strong>{Math.abs(result.currentRisk - result.simulatedRisk)}%</strong>. 
                  <br/>
                  Estimated RUL Impact: <span style={{ color: result.rulImpact >= 0 ? 'var(--color-good)' : 'var(--color-critical)', fontWeight: 'bold' }}>{result.rulImpact > 0 ? '+' : ''}{result.rulImpact} h</span>
                </p>
              </div>
            </div>
          )}

          {recommendations && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>AUTO-OPTIMIZED ALTERNATIVES</div>
              {recommendations.map((rec, index) => (
                <div key={index} title={rec.description} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{rec.action}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Risk: <strong style={{ color: getRiskColor(rec.simResult.simulatedRisk) }}>{rec.simResult.simulatedRisk}%</strong> | 
                      RUL Impact: <strong style={{ color: rec.simResult.rulImpact >= 0 ? 'var(--color-good)' : 'var(--color-critical)' }}>{rec.simResult.rulImpact > 0 ? '+' : ''}{rec.simResult.rulImpact} h</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <button 
                      onClick={() => handlePushToOperator(rec, index)}
                      disabled={pushedIndex !== null}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.7rem',
                        backgroundColor: pushedIndex === index ? 'var(--color-good)' : 'var(--color-primary, #3b82f6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: pushedIndex !== null ? 'not-allowed' : 'pointer',
                        opacity: pushedIndex !== null && pushedIndex !== index ? 0.5 : 1
                      }}
                    >
                      {pushedIndex === index ? 'PUSHED' : 'PUSH TO OPERATOR'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default MissionSandboxWidget;
