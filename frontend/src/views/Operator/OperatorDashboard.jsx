import React from 'react';
import OperatorLayout from '../../components/layout/OperatorLayout';
import { SidebarSummaryPanel, AlertBanner, TelemetryItem } from '../../components/widgets/Widgets';
import { RulWidget, MissionProgress, RecommendationBanner } from '../../components/widgets/MissionWidgets';
import { 
  Settings, ShieldAlert, CheckCircle2, 
  Gauge, Thermometer, Droplet,
  PlaneTakeoff, TrendingUp, Plane, RefreshCw, CornerUpLeft, PlaneLanding
} from 'lucide-react';
import './OperatorDashboard.css';

export default function OperatorDashboard() {
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
        </aside>

        {/* Right Main Content */}
        <div className="dashboard-main-content">
          {/* Live Core Readouts */}
          <div className="core-readouts-section">
            <h3 className="section-title">LIVE CORE READOUTS</h3>
        <div className="card readouts-panel">
          <TelemetryItem title="RPM" value="2,450" unit="RPM" status="NORMAL" icon={Gauge} colorClass="good" />
          <div className="readout-divider"></div>
          <TelemetryItem title="EGT" value="672" unit="°C" status="ELEVATED" icon={Thermometer} colorClass="warning" />
          <div className="readout-divider"></div>
          <TelemetryItem title="CHT" value="156" unit="°C" status="NORMAL" icon={Thermometer} colorClass="good" />
          <div className="readout-divider"></div>
          <TelemetryItem title="OIL PRESSURE" value="64" unit="psi" status="NORMAL" icon={Droplet} colorClass="good" />
          <div className="readout-divider"></div>
          <TelemetryItem title="OIL TEMPERATURE" value="98" unit="°C" status="NORMAL" icon={Thermometer} colorClass="good" />
        </div>
      </div>

      {/* Advisory Panel */}
      <div className="card advisory-panel">
        <AlertBanner warnings={mockWarnings} />
        <div className="advisory-divider"></div>
        <RecommendationBanner 
          title="RECOMMENDATION"
          text="Reduce throttle to 85% to mitigate elevated EGT."
          subtext="Engine temps are climbing. Reducing engine load will stabilize temperatures without compromising flight envelope."
          isGood={false}
        />
      </div>

      {/* Bottom Widgets Row */}
      <div className="dashboard-grid bottom-row">
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
        </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
