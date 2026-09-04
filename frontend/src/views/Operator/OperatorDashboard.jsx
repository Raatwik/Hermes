import React, { useEffect, useState } from 'react';
import useEngineStore from '../../store/useEngineStore';
import OperatorLayout from '../../components/layout/OperatorLayout';
import { SidebarSummaryPanel, AlertBanner, TelemetryTable } from '../../components/widgets/Widgets';
import { RulWidget, MissionProgress, RecommendationBanner } from '../../components/widgets/MissionWidgets';
import { 
  Settings, ShieldAlert, CheckCircle2, 
  Gauge, Thermometer, Droplet,
  PlaneTakeoff, TrendingUp, Plane, RefreshCw, CornerUpLeft, PlaneLanding
} from 'lucide-react';
import './OperatorDashboard.css';

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

  // Demo: Force some statuses when not live to demonstrate colors
  const rpmDemoDev = isLive ? g.rpm.deviation : -15; // Warning
  const oilPDemoDev = isLive ? g.oilPressure.deviation : (isMitigated ? 0 : -25); // Critical -> Normal
  const oilPActual = isLive ? g.oilPressure.actual : (isMitigated ? 65 : 40); // 40 -> 65
  const oilTDemoDev = isLive ? g.oilTemp.deviation : 0; // Normal

  const rpmStatus = deviationStatus(rpmDemoDev);
  const oilPStatus = deviationStatus(oilPDemoDev);
  const oilTStatus = deviationStatus(oilTDemoDev);

  const telemetryData = [
    { title: 'RPM', expected: String(g.rpm.expected), current: isLive ? String(Math.round(g.rpm.actual)) : '2080', deviation: isLive ? `${g.rpm.deviation}%` : '-15%', unit: 'RPM', status: rpmStatus, icon: Gauge, colorClass: deviationColor(rpmStatus) },
    { title: 'OIL PRESSURE', expected: String(g.oilPressure.expected), current: String(Math.round(oilPActual)), deviation: isLive ? `${g.oilPressure.deviation}%` : `${oilPDemoDev}%`, unit: 'psi', status: oilPStatus, icon: Droplet, colorClass: deviationColor(oilPStatus) },
    { title: 'OIL TEMPERATURE', expected: String(g.oilTemp.expected), current: isLive ? String(Math.round(g.oilTemp.actual)) : '95', deviation: isLive ? `${g.oilTemp.deviation}%` : '0%', unit: '°C', status: oilTStatus, icon: Thermometer, colorClass: deviationColor(oilTStatus) }
  ];

  const cylinderMetrics = twinData.cylinders.flatMap((cyl) => {
    // Demo: Inject mock values for Cylinders 1, 2, and 3 to show normal, warning, and critical states
    let egtActual = cyl.egt.actual;
    let chtActual = cyl.cht.actual;
    
    if (egtActual === 0) { // If backend hasn't provided live data
      if (cyl.id === 1) egtActual = 648; // Normal
      if (cyl.id === 2) egtActual = isMitigated ? 652 : 675; // Warning -> Normal
      if (cyl.id === 3) egtActual = isMitigated ? 655 : 695; // Critical -> Normal
    }
    
    if (chtActual === 0) {
      if (cyl.id === 1) chtActual = 153; // Normal
      if (cyl.id === 2) chtActual = isMitigated ? 154 : 168; // Warning -> Normal
      if (cyl.id === 3) chtActual = isMitigated ? 156 : 180; // Critical -> Normal
    }

    const getStatus = (actual, expected, warnThresh, critThresh) => {
      const dev = Math.abs(actual - expected);
      if (dev >= critThresh) return 'critical';
      if (dev >= warnThresh) return 'warning';
      return 'good';
    };
    
    return [
      { type: 'EGT', cyl: cyl.id, expected: cyl.egt.expected, current: Math.round(egtActual), status: getStatus(egtActual, cyl.egt.expected, 20, 40), unit: '°C' },
      { type: 'CHT', cyl: cyl.id, expected: cyl.cht.expected, current: Math.round(chtActual), status: getStatus(chtActual, cyl.cht.expected, 10, 20), unit: '°C' },
    ];
  });

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
      title: 'WATCH: EGT ELEVATED',
      message: 'Exhaust gas temperature is elevated but within acceptable limits.',
      timestamp: '12:45:10',
      resolved: false
    },
    {
      level: 'critical',
      title: 'ALERT: OIL PRESSURE DROP',
      message: 'Oil pressure dropped below nominal threshold momentarily.',
      timestamp: '12:41:05',
      resolved: false
    },
    {
      level: 'info',
      title: 'INFO: COMMS LINK SWITCH',
      message: 'Switched to backup satellite link due to latency.',
      timestamp: '12:30:22',
      resolved: true
    }
  ];

  return (
    <OperatorLayout>
      <div className="dashboard-columns">
        {/* Right Main Content (Now Left) */}
        <div className="dashboard-main-content">
          {/* Live Core Readouts */}
          <div className="core-readouts-section">

        <div className="card telemetry-table-card">
          <TelemetryTable data={telemetryData} cylinderMetrics={cylinderMetrics} />
        </div>
      </div>

      {/* Bottom Content Area */}
      <div className="bottom-content-grid">
        <SidebarSummaryPanel
          engineHealth={isLive ? `${missionContext.ehi}/100` : '—/100'}
          systemStatus={isLive ? (rpmStatus === 'CRITICAL' || oilPStatus === 'CRITICAL' ? 'CRITICAL' : rpmStatus === 'WARNING' || oilPStatus === 'WARNING' ? 'WARNING' : 'NORMAL') : 'AWAITING DATA'}
          riskValue={isLive ? `${Math.max(0, Math.min(100, Math.round(Math.max(Math.abs(parseFloat(g.rpm.deviation)), Math.abs(parseFloat(g.oilPressure.deviation))))))}%` : '—'}
          riskColorClass={rpmStatus === 'CRITICAL' || oilPStatus === 'CRITICAL' ? 'critical' : rpmStatus === 'WARNING' || oilPStatus === 'WARNING' ? 'warning' : 'good'}
        />
        <RulWidget
          hours={missionContext.rul != null ? missionContext.rul : null}
          text={missionContext.rul != null ? "Live RUL estimate" : "Awaiting ML model"}
          isGood={missionContext.rul == null || missionContext.rul > 50}
        />
        <MissionProgress 
          phases={missionPhases}
          currentPhaseIndex={2}
          progressPercent={45}
          elapsed="02:15:32"
          remaining="03:44:28"
        />
      </div>
        </div>

        {/* Left Sidebar (Now Right) */}
        <aside className="dashboard-sidebar">
          <div className="card advisory-panel">
            <AlertBanner warnings={mockWarnings} />
            <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }}></div>
            {activeRecommendation ? (
              <RecommendationBanner 
                title={activeRecommendation.title}
                options={activeRecommendation.options}
                isGood={activeRecommendation.isGood}
                onExecute={() => setIsMitigated(true)}
              />
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', color: 'var(--color-good)', opacity: 0.5 }} />
                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>SYSTEM NORMAL</div>
                <div style={{ fontSize: '0.8rem' }}>No active mitigations recommended from Propulsion Engineer.</div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </OperatorLayout>
  );
}
