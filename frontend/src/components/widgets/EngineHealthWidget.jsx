import React from 'react';
import useEngineStore from '../../store/useEngineStore';

const EngineHealthWidget = () => {
  const { ehi, rul, rulLowerBound, rulUpperBound } = useEngineStore((state) => state.missionContext);

  const getEhiColor = (value) => {
    if (value >= 80) return 'var(--color-good)';
    if (value >= 60) return 'var(--color-warning)';
    return 'var(--color-critical)';
  };

  const getRulColor = (value) => {
    if (value > 100) return 'var(--color-good)';
    if (value > 50) return 'var(--color-warning)';
    return 'var(--color-critical)';
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold text-primary">ENGINE HEALTH & RUL</h3>
      </div>
      
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1rem', gap: '1.5rem' }}>
        
        {/* EHI Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
            Engine Health Index (EHI)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '3.5rem', fontWeight: 700, color: getEhiColor(ehi), lineHeight: 1 }}>
              {ehi}
            </span>
            <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              / 100
            </span>
          </div>
          {/* Simple progress bar */}
          <div style={{ width: '80%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
            <div style={{ width: `${ehi}%`, height: '100%', backgroundColor: getEhiColor(ehi), transition: 'width 0.5s ease, background-color 0.5s ease' }} />
          </div>
        </div>

        <div style={{ width: '80%', height: '1px', backgroundColor: 'var(--border-color)', margin: '0 auto', opacity: 0.5 }}></div>

        {/* RUL Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
            Remaining Useful Life (RUL)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 700, color: getRulColor(rul), lineHeight: 1 }}>
              {rul}
            </span>
            <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              hours
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            95% CI: [{rulLowerBound} - {rulUpperBound} h]
          </div>
        </div>

      </div>
    </div>
  );
};

export default EngineHealthWidget;
