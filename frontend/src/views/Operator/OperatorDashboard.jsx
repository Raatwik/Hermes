import React, { useEffect, useState } from 'react';
import useEngineStore from '../../store/useEngineStore';
import OperatorLayout from '../../components/layout/OperatorLayout';
import { SidebarSummaryPanel, AlertBanner } from '../../components/widgets/Widgets';
import { RulWidget, MissionProgress, RecommendationBanner } from '../../components/widgets/MissionWidgets';
import MapWidget from '../../components/widgets/MapWidget';
import { 
  Settings, ShieldAlert, CheckCircle2, 
  Gauge, Thermometer, Droplet,
  PlaneTakeoff, TrendingUp, Plane, RefreshCw, CornerUpLeft, PlaneLanding
} from 'lucide-react';
import './OperatorDashboard.css';

const MetricCardSmall = ({ title, expected, current, deviation, unit, status, icon: Icon, colorClass }) => {
  const isNeutral = colorClass === 'good';
  const valColor = isNeutral ? 'var(--text-primary)' : `var(--color-${colorClass})`;
  
  // Calculate threshold percentage for bar gauge
  let maxVal = 100;
  let currentNum = parseFloat(current);
  if (title === 'RPM') maxVal = 6000;
  else if (title.includes('CHT')) maxVal = 200;
  else if (title.includes('EGT')) maxVal = 800;
  else if (title === 'OIL PRESSURE') maxVal = 120;
  else if (title === 'OIL TEMP') maxVal = 150;
  
  const fillPct = Math.min(100, Math.max(0, (currentNum / maxVal) * 100)) || 0;
  
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fillPct / 100) * circumference;
  
  return (
    <div className="metric-card-small">
      <div className="metric-header">
        <Icon size={14} style={{ color: 'var(--text-secondary)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>{title}</span>
        {!isNeutral && (
          <span style={{ 
            width: '6px', height: '6px', borderRadius: '0', 
            backgroundColor: `var(--color-${colorClass})`, 
            marginLeft: 'auto' 
          }}></span>
        )}
      </div>
      
      <div className="metric-value-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span className="metric-value" style={{ color: valColor }}>{current}</span>
          <span className="metric-unit" style={{ color: 'var(--text-secondary)' }}>{unit}</span>
        </div>
        
        <div style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0 }}>
          <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="25" cy="25" r={radius} stroke="var(--bg-secondary)" strokeWidth="4" fill="none" />
            <circle cx="25" cy="25" r={radius} stroke={valColor} strokeWidth="4" fill="none"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
          </svg>
        </div>
      </div>
      
      <div className="metric-expected" style={{ borderTop: 'none' }}>
        EXP: {expected} {unit}
      </div>
      <div className="metric-deviation" style={{ color: isNeutral ? 'var(--text-secondary)' : valColor }}>
        DEV: {deviation}
      </div>
    </div>
  );
};

export default function OperatorDashboard() {
  const activeRecommendation = useEngineStore(state => state.activeRecommendation);
  const connectLiveTelemetry = useEngineStore(state => state.connectLiveTelemetry);
  const twinData = useEngineStore(state => state.twinComparisonData);
  const missionContext = useEngineStore(state => state.missionContext);
  const isLive = useEngineStore(state => state.isLive);
  const [isMitigated, setIsMitigated] = useState(false);

  useEffect(() => {
    const disconnect = connectLiveTelemetry();
    return disconnect;
  }, [connectLiveTelemetry]);

  const g = twinData.globals;

  const deviationStatus = (dev) => {
    const abs = Math.abs(parseFloat(dev));
    if (abs > 20) return 'CRITICAL';
    if (abs > 10) return 'WARNING';
    return 'NORMAL';
  };

  const deviationColor = (status) => {
    if (status === 'CRITICAL') return 'critical';
    if (status === 'WARNING') return 'warning';
    return 'good';
  };

  const rpmDev = g.rpm.deviation; 
  const oilPDev = isMitigated ? 0 : g.oilPressure.deviation; 
  const oilPActual = isMitigated ? 65 : g.oilPressure.actual; 
  const oilTDev = g.oilTemp.deviation; 

  const rpmStatus = deviationStatus(rpmDev);
  const oilPStatus = deviationStatus(oilPDev);
  const oilTStatus = deviationStatus(oilTDev);

  const telemetryData = [
    { title: 'RPM', expected: String(g.rpm.expected), current: String(Math.round(g.rpm.actual)), deviation: `${rpmDev}%`, unit: 'RPM', status: rpmStatus, icon: Gauge, colorClass: deviationColor(rpmStatus) },
    { title: 'OIL PRESSURE', expected: String(g.oilPressure.expected), current: String(Math.round(oilPActual)), deviation: `${oilPDev}%`, unit: 'psi', status: oilPStatus, icon: Droplet, colorClass: deviationColor(oilPStatus) },
    { title: 'OIL TEMP', expected: String(g.oilTemp.expected), current: String(Math.round(g.oilTemp.actual)), deviation: `${oilTDev}%`, unit: '°C', status: oilTStatus, icon: Thermometer, colorClass: deviationColor(oilTStatus) }
  ];

  const cylinderMetrics = twinData.cylinders.flatMap((cyl) => {
    let egtActual = cyl.egt.actual;
    let chtActual = cyl.cht.actual;
    
    if (egtActual === 0) { 
      if (cyl.id === 1) egtActual = 648; 
      if (cyl.id === 2) egtActual = isMitigated ? 652 : 675; 
      if (cyl.id === 3) egtActual = isMitigated ? 655 : 695; 
      if (cyl.id === 4) egtActual = 649; 
    }
    
    if (chtActual === 0) {
      if (cyl.id === 1) chtActual = 153; 
      if (cyl.id === 2) chtActual = isMitigated ? 154 : 168; 
      if (cyl.id === 3) chtActual = isMitigated ? 156 : 180; 
      if (cyl.id === 4) chtActual = 154; 
    }

    const getStatus = (actual, expected, warnThresh, critThresh) => {
      const dev = Math.abs(actual - expected);
      if (dev >= critThresh) return 'critical';
      if (dev >= warnThresh) return 'warning';
      return 'good';
    };
    
    return [
      { type: 'EGT', cyl: cyl.id, expected: cyl.egt.expected, current: Math.round(egtActual), status: getStatus(egtActual, cyl.egt.expected, 20, 50), unit: '°C' },
      { type: 'CHT', cyl: cyl.id, expected: cyl.cht.expected, current: Math.round(chtActual), status: getStatus(chtActual, cyl.cht.expected, 10, 20), unit: '°C' },
    ];
  });

  const allMetrics = [
    ...telemetryData,
    ...cylinderMetrics.map(m => ({
      title: `CYL ${m.cyl} ${m.type}`,
      expected: String(m.expected),
      current: String(m.current),
      deviation: String(Math.round(m.current - m.expected)),
      unit: m.unit,
      status: m.status.toUpperCase(),
      icon: Thermometer,
      colorClass: m.status
    }))
  ];

  const missionPhases = [
    { name: 'TAKEOFF', icon: PlaneTakeoff },
    { name: 'CLIMB', icon: TrendingUp },
    { name: 'CRUISE', icon: Plane },
    { name: 'LOITER', icon: RefreshCw },
    { name: 'RETURN', icon: CornerUpLeft },
    { name: 'LANDING', icon: PlaneLanding }
  ];

  const mockWarnings = [
    {
      level: 'warning',
      title: 'EGT ELEVATED',
      message: 'Exhaust gas temperature is elevated but remains within the caution range.',
      timestamp: '12:45:10',
      resolved: false
    },
    {
      level: 'critical',
      title: 'OIL PRESSURE LOW',
      message: 'Oil pressure has fallen below the critical threshold.',
      timestamp: '12:41:05',
      resolved: false
    }
  ];

  const mockCheckpoints = [
    { lat: 28.6139, lng: 77.2090 },
    { lat: 28.5355, lng: 77.3910 },
    { lat: 28.4595, lng: 77.0266 }
  ];

  return (
    <OperatorLayout>
      <div className="dashboard-grid-layout">
        
        {/* TOP LEFT: MAP */}
        <div className="area-map card" style={{ padding: 0 }}>
          <MapWidget 
            currentPosition={[28.5355, 77.3910]} 
            checkpoints={mockCheckpoints}
          />
        </div>

        {/* BOTTOM LEFT: EARLY WARNING SYSTEM */}
        <div className="area-warning">
          <div className="card advisory-panel" style={{ height: '100%' }}>
            {mockWarnings.length > 0 ? (
              <h2 className="section-title" style={{ padding: '1rem 1rem 0 1rem', color: 'var(--color-warning)' }}>
                SYSTEM STATUS: {activeRecommendation ? 'CRITICAL' : 'WARNING'}: {mockWarnings.length} active conditions require operator awareness.
              </h2>
            ) : (
              <h2 className="section-title" style={{ padding: '1rem 1rem 0 1rem' }}>SYSTEM STATUS: NORMAL</h2>
            )}
            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 1rem 1rem 1rem' }}></div>
            {mockWarnings.length > 0 ? (
              <div style={{ padding: '0 1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                  <div>
                    <div style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>ACTIVE ALERTS</div>
                    <AlertBanner warnings={mockWarnings} />
                  </div>
                  <div>
                    <div style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>ENGINEER MITIGATIONS</div>
                    {activeRecommendation ? (
                      <RecommendationBanner 
                        title={activeRecommendation.title}
                        options={activeRecommendation.options}
                        isGood={activeRecommendation.isGood}
                        onExecute={() => setIsMitigated(true)}
                      />
                    ) : (
                      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '4px' }}>
                        No active mitigations.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                <div style={{ fontWeight: 'bold' }}>SYSTEM STATUS: NORMAL</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No active conditions.</div>
              </div>
            )}
          </div>
        </div>

        {/* TOP RIGHT: TELEMETRY CARDS */}
        <div className="area-telemetry">
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            <div>
              <h2 className="section-title">ENGINE TELEMETRY</h2>
              <div className="telemetry-cards-grid">
                {allMetrics.map((metric, idx) => (
                  <MetricCardSmall key={idx} {...metric} />
                ))}
              </div>
            </div>


          </div>
        </div>

        {/* BOTTOM RIGHT: SUMMARY */}
        <div className="area-summary">
          <SidebarSummaryPanel
            engineHealth={`${missionContext.ehi}/100`}
            systemStatus={rpmStatus === 'CRITICAL' || oilPStatus === 'CRITICAL' ? 'CRITICAL' : rpmStatus === 'WARNING' || oilPStatus === 'WARNING' ? 'WARNING' : 'NORMAL'}
            riskValue={`${Math.max(0, Math.min(100, Math.round(Math.max(Math.abs(parseFloat(g.rpm.deviation)), Math.abs(parseFloat(g.oilPressure.deviation))))))}%`}
            riskColorClass={rpmStatus === 'CRITICAL' || oilPStatus === 'CRITICAL' ? 'critical' : rpmStatus === 'WARNING' || oilPStatus === 'WARNING' ? 'warning' : 'good'}
            rul={`${missionContext.rul ?? (isMitigated ? 160 : 145)} hrs`}
          />
          <div className="bottom-content-grid" style={{ gridTemplateColumns: '1fr', marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* FUEL MANAGEMENT */}
              <div style={{ border: '2px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                <div style={{ padding: '4px 8px', backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  FUEL MANAGEMENT
                </div>
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>REMAINING</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}>{missionContext.fuelRemaining ?? 85} L</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>BURN RATE</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}>{missionContext.fuelBurnRate ?? missionContext.fuelFlow ?? 24.1} L/hr</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>TIME-TO-EMPTY</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}>{missionContext.timeToEmpty ?? 3.5} hr</span>
                  </div>
                </div>
              </div>

              {/* ELECTRICAL */}
              <div style={{ border: '2px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                <div style={{ padding: '4px 8px', backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  ELECTRICAL SYS
                </div>
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ALT OUTPUT</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}>{missionContext.alternatorVolts ?? 28.2}V / {missionContext.alternatorAmps ?? 45}A</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>MAIN BUS LOAD</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}>{missionContext.mainBusLoad ?? 78}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </OperatorLayout>
  );
}
