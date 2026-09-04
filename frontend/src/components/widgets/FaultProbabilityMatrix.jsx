import React, { useMemo } from 'react';
import useEngineStore from '../../store/useEngineStore';

function getSeverityLabel(value) {
  if (value <= 0.25) return 'Healthy';
  if (value <= 0.50) return 'Mild';
  if (value <= 0.75) return 'Moderate';
  return 'Severe';
}

function getSeverityColor(value) {
  if (value <= 0.25) return 'var(--color-good, #22c55e)';
  if (value <= 0.50) return 'var(--color-warning, #eab308)';
  if (value <= 0.75) return '#f97316';
  return 'var(--color-danger, #ef4444)';
}

const FaultProbabilityMatrix = () => {
  const faults = useEngineStore((state) => state.faultProbabilities);
  const timeline = useEngineStore((state) => state.degradationTimeline);

  const liveSeverities = useMemo(() => {
    if (timeline.length === 0) return {};
    return timeline[timeline.length - 1].faults;
  }, [timeline]);

  const sortedFaults = [...faults].sort((a, b) => b.probability - a.probability);
  const hasLiveSeverity = Object.keys(liveSeverities).length > 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold text-primary">FAULT PROBABILITY (Known Classes)</h3>
      </div>

      <div style={{ flexGrow: 1, padding: '1rem', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: hasLiveSeverity ? '2fr 1.2fr 0.8fr 0.8fr' : '2fr 1.5fr 1fr', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <div>Fault / Anomaly</div>
          <div>Probability Bar</div>
          <div style={{ textAlign: 'right' }}>Prob (95% CI)</div>
          {hasLiveSeverity && <div style={{ textAlign: 'right' }}>Severity (λ)</div>}
        </div>

        {sortedFaults.map((fault, index) => {
          const isUnknown = fault.name.includes('Unknown') || fault.name.includes('UNKNOWN');
          const barColor = isUnknown ? '#8b5cf6' : (fault.probability > 0.3 ? 'var(--color-warning)' : 'var(--color-good)');
          const faultKey = fault.name.toLowerCase().replace(/\s+/g, '_');
          const liveSev = liveSeverities[faultKey];

          return (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: hasLiveSeverity ? '2fr 1.2fr 0.8fr 0.8fr' : '2fr 1.5fr 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                {fault.name}
              </div>

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

              {hasLiveSeverity && (
                <div style={{ textAlign: 'right' }}>
                  {liveSev != null ? (
                    <span style={{ fontWeight: '600', color: getSeverityColor(liveSev) }}>
                      {liveSev.toFixed(2)} <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>{getSeverityLabel(liveSev)}</span>
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {hasLiveSeverity && sortedFaults.length === 0 && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {Object.entries(liveSeverities).map(([ft, sev]) => (
              <div key={ft} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>{ft.replace(/_/g, ' ')}</span>
                <span style={{ fontWeight: '600', color: getSeverityColor(sev) }}>
                  λ={sev.toFixed(2)} ({getSeverityLabel(sev)})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FaultProbabilityMatrix;
