import React from 'react';
import useEngineStore from '../../store/useEngineStore';
import engineImage from '../../assets/engine2.png';

const EngineBlueprintWidget = () => {
  const twinComparisonData = useEngineStore(state => state.twinComparisonData);
  const isLive = useEngineStore(state => state.isLive);

  if (!twinComparisonData) return null;

  const computeStatus = (deviation) => {
    const abs = Math.abs(parseFloat(deviation));
    if (abs > 20) return 'CRITICAL';
    if (abs > 10) return 'WARNING';
    return 'NORMAL';
  };

  const getStatusColor = (status) => {
    if (status === 'NORMAL') return 'var(--color-good)';
    if (status === 'WARNING') return 'var(--color-warning)';
    return 'var(--color-critical)';
  };

  const formatDev = (dev) => {
    const val = parseFloat(dev);
    if (val > 0) return <span style={{ color: 'var(--color-warning)' }}>+{val.toFixed(1)}%</span>;
    if (val < 0) return <span style={{ color: 'var(--color-good)' }}>{val.toFixed(1)}%</span>;
    return <span style={{ color: 'var(--text-secondary)' }}>0.0%</span>;
  };

  const GlobalStat = ({ label, expected, actual, unit, deviation, style, status }) => {
    const color = getStatusColor(status);
    
    return (
      <div 
        className={status !== 'NORMAL' ? 'blink-border-critical' : ''}
        style={{
          ...style,
          position: 'absolute',
          border: 'none',
          borderLeft: `4px solid ${status === 'NORMAL' ? 'var(--border-color)' : color}`,
          backgroundColor: 'var(--bg-primary)',
          padding: '0.5rem',
          borderRadius: '0px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '110px',
          zIndex: 10,
          transform: 'translateX(-50%)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>EXP</span>
            <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{expected}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>ACT</span>
            <span style={{ fontWeight: 'bold', color: color, fontSize: '0.75rem' }}>{actual}</span>
          </div>
        </div>
        <div style={{ marginTop: '0.25rem', fontSize: '0.65rem', fontWeight: 'bold' }}>
          {isLive ? formatDev(deviation) : '—'}
        </div>
      </div>
    );
  };

  const CylinderStat = ({ cyl, style, status }) => {
    const isAbnormalEgt = cyl.egt.actual - cyl.egt.expected > 15;
    const isAbnormalCht = cyl.cht.actual - cyl.cht.expected > 15;
    const isAbnormal = status !== 'NORMAL';
    const borderColor = isAbnormal ? 'var(--color-critical)' : 'var(--border-color)';

    return (
      <div 
        className={isAbnormal ? 'blink-border-critical' : ''}
        style={{
          ...style,
          position: 'absolute',
          border: 'none',
          borderLeft: `4px solid ${borderColor}`,
          borderRadius: '0px',
          padding: '0.5rem',
          backgroundColor: 'var(--bg-primary)',
          width: '130px',
          zIndex: 10,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.25rem', color: isAbnormal ? 'var(--color-critical)' : 'var(--text-primary)' }}>
          CYL {cyl.id}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.15rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>EGT EXP:</span>
          <span style={{ fontWeight: 'bold' }}>{cyl.egt.expected} °C</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.15rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>EGT CUR:</span>
          <span style={{ fontWeight: 'bold', color: isAbnormalEgt ? 'var(--color-critical)' : 'var(--text-primary)' }}>{cyl.egt.actual.toFixed(0)} °C</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.15rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>CHT EXP:</span>
          <span style={{ fontWeight: 'bold' }}>{cyl.cht.expected} °C</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>CHT CUR:</span>
          <span style={{ fontWeight: 'bold', color: isAbnormalCht ? 'var(--color-critical)' : 'var(--text-primary)' }}>{cyl.cht.actual.toFixed(0)} °C</span>
        </div>
      </div>
    );
  };

  // Helper to render an SVG line with a dot
  const ConnectionLine = ({ x1, y1, x2, y2, status }) => {
    const color = status === 'NORMAL' ? 'var(--color-good)' : (status === 'WARNING' ? 'var(--color-warning)' : 'var(--color-critical)');
    const animClass = status === 'NORMAL' ? 'pulse-line-good' : 'pulse-line-critical';
    
    return (
      <>
        <line x1={x1} y1={y1} x2={x2} y2={y2} className={animClass} stroke={color} strokeWidth="2.5" strokeDasharray="4 3" />
        <circle cx={x2} cy={y2} r="5" fill={color} className={animClass} style={{ stroke: 'none' }} />
      </>
    );
  };

  // Precompute statuses
  const getCylStatus = (cyl) => {
    if (!isLive) return 'NORMAL';
    return (cyl.egt.actual - cyl.egt.expected > 15 || cyl.cht.actual - cyl.cht.expected > 15) ? 'CRITICAL' : 'NORMAL';
  };

  const rpmStatus = isLive ? computeStatus(twinComparisonData.globals.rpm.deviation) : 'NORMAL';
  const oilPressStatus = isLive ? computeStatus(twinComparisonData.globals.oilPressure.deviation) : 'NORMAL';
  const oilTempStatus = isLive ? computeStatus(twinComparisonData.globals.oilTemp.deviation) : 'NORMAL';
  
  const cyl1Status = 'CRITICAL'; // FORCED FOR TESTING: getCylStatus(twinComparisonData.cylinders[0]);
  const cyl2Status = getCylStatus(twinComparisonData.cylinders[1]);
  const cyl3Status = getCylStatus(twinComparisonData.cylinders[2]);
  const cyl4Status = getCylStatus(twinComparisonData.cylinders[3]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold text-primary">ENGINE BLUEPRINT & TELEMETRY</h3>
      </div>
      
      <div style={{ flexGrow: 1, position: 'relative', overflow: 'hidden', minHeight: '400px' }}>
        
        {/* SVG overlay for lines */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none', overflow: 'visible' }}>
          {/* Globals */}
          <ConnectionLine x1="25%" y1="12%" x2="48%" y2="28%" status={rpmStatus} />
          <ConnectionLine x1="50%" y1="12%" x2="52%" y2="40%" status={oilPressStatus} />
          <ConnectionLine x1="75%" y1="12%" x2="50%" y2="80%" status={oilTempStatus} />
          
          {/* Cylinders (assuming image is centered 50% width) */}
          <ConnectionLine x1="18%" y1="35%" x2="38%" y2="50%" status={cyl1Status} />
          <ConnectionLine x1="18%" y1="70%" x2="38%" y2="75%" status={cyl3Status} />
          
          <ConnectionLine x1="82%" y1="35%" x2="62%" y2="50%" status={cyl2Status} />
          <ConnectionLine x1="82%" y1="70%" x2="62%" y2="75%" status={cyl4Status} />
        </svg>

        {/* Engine Image (Enlarged and centered) */}
        <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', width: '55%', height: '80%', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 0 }}>
           <img src={engineImage} alt="Engine Blueprint" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.85 }} />
        </div>

        {/* Global Stats */}
        <GlobalStat 
          label="RPM" 
          expected={twinComparisonData.globals.rpm.expected} 
          actual={Math.round(twinComparisonData.globals.rpm.actual)} 
          unit="RPM"
          deviation={twinComparisonData.globals.rpm.deviation}
          style={{ top: '4%', left: '25%' }}
          status={rpmStatus}
        />
        <GlobalStat 
          label="Oil Pressure" 
          expected={twinComparisonData.globals.oilPressure.expected} 
          actual={isLive ? twinComparisonData.globals.oilPressure.actual.toFixed(0) : '—'} 
          unit="psi"
          deviation={twinComparisonData.globals.oilPressure.deviation}
          style={{ top: '4%', left: '50%' }}
          status={oilPressStatus}
        />
        <GlobalStat 
          label="Oil Temp" 
          expected={twinComparisonData.globals.oilTemp.expected} 
          actual={isLive ? Math.round(twinComparisonData.globals.oilTemp.actual) : '—'} 
          unit="°C"
          deviation={twinComparisonData.globals.oilTemp.deviation}
          style={{ top: '4%', left: '75%' }}
          status={oilTempStatus}
        />

        {/* Cylinder Stats */}
        <CylinderStat cyl={twinComparisonData.cylinders[0]} style={{ top: '25%', left: '8%' }} status={cyl1Status} />
        <CylinderStat cyl={twinComparisonData.cylinders[2]} style={{ top: '60%', left: '8%' }} status={cyl3Status} />
        
        <CylinderStat cyl={twinComparisonData.cylinders[1]} style={{ top: '25%', right: '8%' }} status={cyl2Status} />
        <CylinderStat cyl={twinComparisonData.cylinders[3]} style={{ top: '60%', right: '8%' }} status={cyl4Status} />

      </div>
    </div>
  );
};

export default EngineBlueprintWidget;
