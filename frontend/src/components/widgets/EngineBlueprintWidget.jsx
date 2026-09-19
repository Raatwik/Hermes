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
        className={status === 'CRITICAL' ? 'blink-border-critical' : ''}
        style={{
          ...style,
          position: 'absolute',
          border: 'none',
          borderLeft: `2px solid ${status === 'NORMAL' ? 'var(--border-color)' : color}`,
          backgroundColor: 'var(--bg-primary)',
          padding: '0.75rem',
          borderRadius: '0px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '140px',
          zIndex: 10,
          transform: 'translateX(-50%)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>EXP</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{expected}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>ACT</span>
            <span style={{ fontWeight: 'bold', color: color, fontSize: '1.1rem' }}>{actual}</span>
          </div>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
          {formatDev(deviation)}
        </div>
      </div>
    );
  };

  const getParamColor = (actual, expected, warnThresh, critThresh) => {
    const dev = actual - expected;
    if (dev >= critThresh) return 'var(--color-critical)';
    if (dev >= warnThresh) return 'var(--color-warning)';
    return 'var(--text-primary)';
  };

  const CylinderStat = ({ cyl, style, status }) => {
    const borderColor = status === 'NORMAL' ? 'var(--border-color)' : getStatusColor(status);
    const titleColor = status === 'NORMAL' ? 'var(--text-primary)' : getStatusColor(status);

    return (
      <div 
        className={status === 'CRITICAL' ? 'blink-border-critical' : ''}
        style={{
          ...style,
          position: 'absolute',
          border: 'none',
          borderLeft: `2px solid ${borderColor}`,
          borderRadius: '0px',
          padding: '0.75rem',
          backgroundColor: 'var(--bg-primary)',
          width: '160px',
          zIndex: 10,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.35rem', color: titleColor }}>
          CYL {cyl.id}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>EGT EXP:</span>
          <span style={{ fontWeight: 'bold' }}>{cyl.egt.expected} °C</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>EGT CUR:</span>
          <span style={{ fontWeight: 'bold', color: getParamColor(cyl.egt.actual, cyl.egt.expected, 20, 50) }}>{cyl.egt.actual.toFixed(0)} °C</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>CHT EXP:</span>
          <span style={{ fontWeight: 'bold' }}>{cyl.cht.expected} °C</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>CHT CUR:</span>
          <span style={{ fontWeight: 'bold', color: getParamColor(cyl.cht.actual, cyl.cht.expected, 10, 20) }}>{cyl.cht.actual.toFixed(0)} °C</span>
        </div>
      </div>
    );
  };

  // Helper to render an SVG line with a dot
  const ConnectionLine = ({ x1, y1, x2, y2, status }) => {
    const color = status === 'NORMAL' ? 'var(--text-secondary)' : (status === 'WARNING' ? 'var(--color-warning)' : 'var(--color-critical)');
    
    return (
      <>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" strokeDasharray="4 3" />
        <circle cx={x2} cy={y2} r="4" fill={color} style={{ stroke: 'none' }} />
      </>
    );
  };

  // Precompute statuses
  const getCylStatus = (cyl) => {
    const egtDev = cyl.egt.actual - cyl.egt.expected;
    const chtDev = cyl.cht.actual - cyl.cht.expected;
    
    let status = 'NORMAL';
    if (egtDev >= 50 || chtDev >= 20) status = 'CRITICAL';
    else if (egtDev >= 20 || chtDev >= 10) status = 'WARNING';
    
    return status;
  };

  const rpmStatus = computeStatus(twinComparisonData.globals.rpm.deviation);
  const oilPressStatus = computeStatus(twinComparisonData.globals.oilPressure.deviation);
  const oilTempStatus = computeStatus(twinComparisonData.globals.oilTemp.deviation);
  
  const cyl1Status = getCylStatus(twinComparisonData.cylinders[0]);
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
          <ConnectionLine x1="10%" y1="12%" x2="48%" y2="28%" status={rpmStatus} />
          <ConnectionLine x1="65%" y1="12%" x2="52%" y2="30%" status={oilPressStatus} />
          <ConnectionLine x1="90%" y1="12%" x2="50%" y2="80%" status={oilTempStatus} />
          
          {/* Cylinders */}
          <ConnectionLine x1="10%" y1="45%" x2="40%" y2="52%" status={cyl1Status} />
          <ConnectionLine x1="10%" y1="75%" x2="41%" y2="71%" status={cyl3Status} />
          
          <ConnectionLine x1="90%" y1="45%" x2="57%" y2="52%" status={cyl2Status} />
          <ConnectionLine x1="90%" y1="75%" x2="58%" y2="71%" status={cyl4Status} />
        </svg>

        {/* Engine Image (Restored to original size) */}
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
          style={{ top: '0%', left: '10%' }}
          status={rpmStatus}
        />
        <GlobalStat 
          label="Oil Pressure" 
          expected={twinComparisonData.globals.oilPressure.expected} 
          actual={twinComparisonData.globals.oilPressure.actual.toFixed(0)} 
          unit="psi"
          deviation={twinComparisonData.globals.oilPressure.deviation}
          style={{ top: '0%', left: '65%' }}
          status={oilPressStatus}
        />
        <GlobalStat 
          label="Oil Temp" 
          expected={twinComparisonData.globals.oilTemp.expected} 
          actual={Math.round(twinComparisonData.globals.oilTemp.actual)} 
          unit="°C"
          deviation={twinComparisonData.globals.oilTemp.deviation}
          style={{ top: '0%', left: '90%' }}
          status={oilTempStatus}
        />

        {/* Cylinder Stats */}
        <CylinderStat cyl={twinComparisonData.cylinders[0]} style={{ top: '35%', left: '0%' }} status={cyl1Status} />
        <CylinderStat cyl={twinComparisonData.cylinders[2]} style={{ top: '65%', left: '0%' }} status={cyl3Status} />
        
        <CylinderStat cyl={twinComparisonData.cylinders[1]} style={{ top: '35%', right: '0%' }} status={cyl2Status} />
        <CylinderStat cyl={twinComparisonData.cylinders[3]} style={{ top: '65%', right: '0%' }} status={cyl4Status} />

      </div>
    </div>
  );
};

export default EngineBlueprintWidget;
