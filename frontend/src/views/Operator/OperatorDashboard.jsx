import React, { useEffect } from 'react';
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

  useEffect(() => {
    const disconnect = connectLiveTelemetry();
    return disconnect;
  }, [connectLiveTelemetry]);

  const g = twinData.globals;
  const telemetryData = [
    { title: 'RPM', expected: String(g.rpm.expected), current: String(g.rpm.actual), deviation: `${g.rpm.deviation}%`, unit: 'RPM', status: 'NORMAL', icon: Gauge, colorClass: 'good' },
    { title: 'OIL PRESSURE', expected: String(g.oilPressure.expected), current: String(Math.round(g.oilPressure.actual)), deviation: `${g.oilPressure.deviation}%`, unit: 'psi', status: 'NORMAL', icon: Droplet, colorClass: 'good' },
    { title: 'OIL TEMPERATURE', expected: String(g.oilTemp.expected), current: String(Math.round(g.oilTemp.actual)), deviation: `${g.oilTemp.deviation}%`, unit: '°C', status: 'NORMAL', icon: Thermometer, colorClass: 'good' }
  ];

  const cylinderMetrics = twinData.cylinders.flatMap((cyl) => [
    { type: 'EGT', cyl: cyl.id, expected: cyl.egt.expected, current: Math.round(cyl.egt.actual), isWarning: Math.abs(cyl.egt.actual - cyl.egt.expected) > 20, unit: '°C' },
    { type: 'CHT', cyl: cyl.id, expected: cyl.cht.expected, current: Math.round(cyl.cht.actual), isWarning: Math.abs(cyl.cht.actual - cyl.cht.expected) > 10, unit: '°C' },
  ]);

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
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <SidebarSummaryPanel 
            engineHealth="92/100"
            systemStatus="NOMINAL"
            riskValue="18%"
            riskColorClass="warning"
          />
          <RulWidget
            hours={missionContext.rul != null ? Math.round(missionContext.rul) : 143}
            text={missionContext.rul != null ? "Live RUL estimate" : "Awaiting live data"}
            isGood={missionContext.rul == null || missionContext.rul > 50}
          />
          <MissionProgress 
            phases={missionPhases}
            currentPhaseIndex={2}
            progressPercent={45}
            elapsed="02:15:32"
            remaining="03:44:28"
          />
          <div className="card advisory-panel sidebar-alert">
            <AlertBanner warnings={mockWarnings} />
          </div>
        </aside>

        {/* Right Main Content */}
        <div className="dashboard-main-content">
          {/* Live Core Readouts */}
          <div className="core-readouts-section">
            <h3 className="section-title">LIVE CORE READOUTS</h3>
        <div className="card telemetry-table-card">
          <TelemetryTable data={telemetryData} cylinderMetrics={cylinderMetrics} />
        </div>
      </div>

      {/* Bottom Content Area */}
      <div className="bottom-content-grid">
        {/* Recommendation Panel */}
        <div className="card advisory-panel">
          {activeRecommendation ? (
            <RecommendationBanner 
              title={activeRecommendation.title}
              options={activeRecommendation.options}
              isGood={activeRecommendation.isGood}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', color: 'var(--color-good)', opacity: 0.5 }} />
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>SYSTEM NOMINAL</div>
              <div style={{ fontSize: '0.8rem' }}>No active mitigations recommended from Propulsion Engineer.</div>
            </div>
          )}
        </div>
      </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
