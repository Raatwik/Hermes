import React, { useEffect } from 'react';
import useEngineStore from '../../store/useEngineStore';
import TwinDriftChart from '../../components/widgets/TwinDriftChart';
import ResidualTimeSeries from '../../components/widgets/ResidualTimeSeries';
import EngineBlueprintWidget from '../../components/widgets/EngineBlueprintWidget';
import DegradationCauseGraph from '../../components/widgets/DegradationCauseGraph';
import MissionSandboxWidget from '../../components/widgets/MissionSandboxWidget';
import OperatorLayout from '../../components/layout/OperatorLayout';
import './EngineerDashboard.css';

const EngineerDashboard = () => {
  const missionContext = useEngineStore(state => state.missionContext);
  const connectLiveTelemetry = useEngineStore(state => state.connectLiveTelemetry);
  const isLive = useEngineStore(state => state.isLive);

  useEffect(() => {
    // Start listening to WebSocket/mock data on mount
    const disconnect = connectLiveTelemetry();
    return () => disconnect();
  }, [connectLiveTelemetry]);

  return (
    <OperatorLayout operatorName="ENGINEER: A. GUPTA">
      <div className="engineer-dashboard" style={{ paddingTop: 0 }}>
        {/* Mission Context Bar */}
      <section className="mission-context-bar card">
        <div className="context-item">
          <div className="label">Engine Health Index</div>
          <div className="value" style={{ color: 'var(--color-warning)', fontWeight: 'bold' }}>{missionContext.ehi != null ? `${missionContext.ehi}%` : ':'}</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item" style={{ minWidth: '130px' }}>
          <div className="label">RUL</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="value" style={{ color: 'var(--color-good)', fontWeight: 'bold', lineHeight: 1.2 }}>
              {missionContext.rul != null ? `${missionContext.rul} hrs` : ':'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              95% CI: [{missionContext.rulLowerBound != null ? missionContext.rulLowerBound : ':'} : {missionContext.rulUpperBound != null ? missionContext.rulUpperBound : ':'} h]
            </div>
          </div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">Altitude</div>
          <div className="value">{Math.round(missionContext.altitude).toLocaleString()} ft</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">RPM</div>
          <div className="value">{Math.round(missionContext.rpm).toLocaleString()}</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">Engine Load</div>
          <div className="value">{missionContext.engineLoad} %</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">OAT</div>
          <div className="value">{missionContext.oat} °C</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">MAP</div>
          <div className="value">{missionContext.map} inHg</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">Fuel Flow</div>
          <div className="value">{Math.round(missionContext.fuelFlow * 10) / 10} L/hr</div>
        </div>
      </section>

      {/* Main Grid Layout */}
      <main className="dashboard-grid">
        
        {/* Row 1: Engine Blueprint & Sandbox */}
        <div className="grid-area-comparison card">
          <EngineBlueprintWidget />
        </div>
        <div className="grid-area-sandbox card">
          <MissionSandboxWidget />
        </div>

        {/* Row 3: Causes */}
        <div className="grid-area-causes card">
          <DegradationCauseGraph />
        </div>

        {/* Row 3: Drift */}
        <div className="grid-area-drift card">
          <TwinDriftChart />
        </div>

        {/* Row 4: Residuals */}
        <div className="grid-area-residuals card">
          <ResidualTimeSeries />
        </div>

      </main>
    </div>
    </OperatorLayout>
  );
};

export default EngineerDashboard;
