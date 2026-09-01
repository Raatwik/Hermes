import React from 'react';
import useEngineStore from '../../store/useEngineStore';

const FAULT_DISPLAY_NAMES = {
  cooling_degradation: 'Cooling Degradation',
  cylinder_failure: 'Cylinder Failure',
  injector_abnormalities: 'Injector Abnormalities',
  lubrication_issues: 'Lubrication Issues',
  misfire: 'Misfire',
  sensor_drift: 'Sensor Drift',
  UNKNOWN_ANOMALY: 'Unknown Anomaly',
};

function formatFaultName(name) {
  if (FAULT_DISPLAY_NAMES[name]) return FAULT_DISPLAY_NAMES[name];
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const FaultProbabilityMatrix = () => {
  const faults = useEngineStore((state) => state.faultProbabilities);

  // Sort by probability descending
  const sortedFaults = [...faults].sort((a, b) => b.probability - a.probability);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold text-primary">FAULT PROBABILITY (Known Classes)</h3>
      </div>
      
      <div style={{ flexGrow: 1, padding: '1rem', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <div>Fault / Anomaly</div>
          <div>Probability Bar</div>
          <div style={{ textAlign: 'right' }}>Prob (95% CI)</div>
        </div>

        {sortedFaults.map((fault, index) => {
          const isUnknown = fault.name.includes('Unknown');
          const barColor = isUnknown ? '#8b5cf6' : (fault.probability > 0.3 ? 'var(--color-warning)' : 'var(--color-good)');
          
          return (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                {formatFaultName(fault.name)}
              </div>
              
              {/* Probability Bar */}
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${fault.probability * 100}%`, 
                    height: '100%', 
                    backgroundColor: barColor,
                    borderRadius: '4px'
                  }} 
                />
              </div>

              <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)', marginRight: '4px' }}>
                  {fault.probability.toFixed(2)}
                </span>
                <span style={{ fontSize: '0.75rem' }}>
                  [{fault.ci[0].toFixed(2)}-{fault.ci[1].toFixed(2)}]
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FaultProbabilityMatrix;
