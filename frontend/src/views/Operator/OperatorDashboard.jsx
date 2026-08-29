import React from 'react';
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

  const telemetryData = [
    { title: 'RPM', expected: '2,450', current: '2,450', deviation: '0.0%', unit: 'RPM', status: 'NORMAL', icon: Gauge, colorClass: 'good' },
    { title: 'OIL PRESSURE', expected: '65', current: '64', deviation: '-1.5%', unit: 'psi', status: 'NORMAL', icon: Droplet, colorClass: 'good' },
    { title: 'OIL TEMPERATURE', expected: '95', current: '98', deviation: '+3.1%', unit: '°C', status: 'NORMAL', icon: Thermometer, colorClass: 'good' }
  ];

  const cylinderMetrics = [
    { type: 'EGT', cyl: 1, expected: 650, current: 645, isWarning: false, unit: '°C' },
    { type: 'EGT', cyl: 2, expected: 650, current: 652, isWarning: false, unit: '°C' },
    { type: 'EGT', cyl: 3, expected: 650, current: 672, isWarning: true, unit: '°C' },
    { type: 'EGT', cyl: 4, expected: 650, current: 648, isWarning: false, unit: '°C' },
    { type: 'CHT', cyl: 1, expected: 155, current: 154, isWarning: false, unit: '°C' },
    { type: 'CHT', cyl: 2, expected: 155, current: 155, isWarning: false, unit: '°C' },
    { type: 'CHT', cyl: 3, expected: 155, current: 156, isWarning: false, unit: '°C' },
    { type: 'CHT', cyl: 4, expected: 155, current: 153, isWarning: false, unit: '°C' }
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
            hours={143} 
            text="Adequate for planned mission" 
            isGood={true} 
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
