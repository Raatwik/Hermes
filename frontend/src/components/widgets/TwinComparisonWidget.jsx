import React from 'react';
import useEngineStore from '../../store/useEngineStore';

const TwinComparisonWidget = () => {
  const twinComparisonData = useEngineStore(state => state.twinComparisonData);
  const isLive = useEngineStore(state => state.isLive);

  if (!twinComparisonData) return null;

  const computeStatus = (deviation) => {
    const abs = Math.abs(parseFloat(deviation));
    if (abs > 20) return 'CRITICAL';
    if (abs > 10) return 'WARNING';
    return 'NORMAL';
  };

  const getStatusBadge = (status, paramName) => {
    let badge = null;
    if (status === 'NORMAL') badge = <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--color-good)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold' }}>NORMAL</span>;
    else if (status === 'WARNING') badge = <span style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: 'var(--color-warning)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold' }}>WARNING</span>;
    else badge = <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-critical)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold' }}>CRITICAL</span>;

    // Add Sensor/Physical tags for demo
    if (paramName === 'oilTemp' && status !== 'NORMAL') {
      return <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
        {badge}
        <span style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 'bold' }}>SUSPECT: SENSOR DRIFT</span>
      </div>;
    }
    return badge;
  };

  const formatDev = (dev) => {
    const val = parseFloat(dev);
    if (val > 0) return <span style={{ color: 'var(--color-warning)' }}>+{val.toFixed(1)}%</span>;
    if (val < 0) return <span style={{ color: 'var(--color-good)' }}>{val.toFixed(1)}%</span>;
    return <span style={{ color: 'var(--text-secondary)' }}>0.0%</span>;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold text-primary">DIGITAL TWIN COMPARISON</h3>
      </div>
      
      <div style={{ flexGrow: 1, padding: '1rem', overflowY: 'auto' }}>
        
        {/* Globals Table */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.5fr', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
            <div>Parameter</div>
            <div>Twin Expected</div>
            <div>Current Actual</div>
            <div>Deviation</div>
            <div style={{ textAlign: 'right' }}>Status</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.5fr', gap: '0.5rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>⭘ RPM</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{twinComparisonData.globals.rpm.expected} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>RPM</span></div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{twinComparisonData.globals.rpm.actual} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>RPM</span></div>
            <div style={{ fontWeight: 'bold' }}>{formatDev(twinComparisonData.globals.rpm.deviation)}</div>
            <div style={{ textAlign: 'right' }}>{getStatusBadge(isLive ? computeStatus(twinComparisonData.globals.rpm.deviation) : 'NORMAL', 'rpm')}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.5fr', gap: '0.5rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>💧 OIL PRESSURE</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{twinComparisonData.globals.oilPressure.expected} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>psi</span></div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{isLive ? twinComparisonData.globals.oilPressure.actual.toFixed(0) : '—'} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>psi</span></div>
            <div style={{ fontWeight: 'bold' }}>{isLive ? formatDev(twinComparisonData.globals.oilPressure.deviation) : '—'}</div>
            <div style={{ textAlign: 'right' }}>{getStatusBadge(isLive ? computeStatus(twinComparisonData.globals.oilPressure.deviation) : 'NORMAL', 'oilPressure')}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.5fr', gap: '0.5rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>🌡️ OIL TEMPERATURE</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{twinComparisonData.globals.oilTemp.expected} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>°C</span></div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{isLive ? twinComparisonData.globals.oilTemp.actual : '—'} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>°C</span></div>
            <div style={{ fontWeight: 'bold' }}>{isLive ? formatDev(twinComparisonData.globals.oilTemp.deviation) : '—'}</div>
            <div style={{ textAlign: 'right' }}>{getStatusBadge(isLive ? computeStatus(twinComparisonData.globals.oilTemp.deviation) : 'NORMAL', 'oilTemp')}</div>
          </div>
        </div>

        {/* Cylinder Readouts */}
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '1rem' }}>
          Cylinder Readouts (EGT / CHT)
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {twinComparisonData.cylinders.map(cyl => {
            const isAbnormalEgt = cyl.egt.actual - cyl.egt.expected > 15;
            return (
              <div key={cyl.id} style={{ 
                border: isAbnormalEgt ? '1px solid var(--color-critical)' : '1px solid var(--border-color)', 
                borderRadius: '6px', 
                padding: '0.75rem',
                backgroundColor: isAbnormalEgt ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                position: 'relative'
              }}>
                {isAbnormalEgt && (
                  <div style={{ position: 'absolute', top: '-8px', right: '8px', backgroundColor: 'var(--color-critical)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 'bold' }}>
                    PHYSICAL FAULT
                  </div>
                )}
                <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.75rem', color: isAbnormalEgt ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                  CYL {cyl.id} EGT
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>EXPECTED</span>
                  <span style={{ fontWeight: 'bold' }}>{cyl.egt.expected} °C</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>CURRENT</span>
                  <span style={{ fontWeight: 'bold', color: isAbnormalEgt ? 'var(--color-critical)' : 'var(--text-primary)' }}>{cyl.egt.actual.toFixed(0)} °C</span>
                </div>
                
                <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                  CYL {cyl.id} CHT
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>EXPECTED</span>
                  <span style={{ fontWeight: 'bold' }}>{cyl.cht.expected} °C</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>CURRENT</span>
                  <span style={{ fontWeight: 'bold' }}>{cyl.cht.actual.toFixed(0)} °C</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default TwinComparisonWidget;
