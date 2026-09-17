import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import useEngineStore from '../../store/useEngineStore';
import TwinDriftChart from '../../components/widgets/TwinDriftChart';
import ResidualTimeSeries from '../../components/widgets/ResidualTimeSeries';
import EngineBlueprintWidget from '../../components/widgets/EngineBlueprintWidget';
import DegradationCauseGraph from '../../components/widgets/DegradationCauseGraph';
import MissionSandboxWidget from '../../components/widgets/MissionSandboxWidget';
import GlobalNav from '../../components/layout/GlobalNav';
import '../../components/layout/OperatorLayout.css';
import './EngineerDashboard.css';

const EngineerDashboard = () => {
  const missionContext = useEngineStore(state => state.missionContext);
  const connectLiveTelemetry = useEngineStore(state => state.connectLiveTelemetry);
  const isLive = useEngineStore(state => state.isLive);
  const currentTime = new Date().toISOString().substring(11, 19);

  useEffect(() => {
    // Start listening to WebSocket/mock data on mount
    const disconnect = connectLiveTelemetry();
    return () => disconnect();
  }, [connectLiveTelemetry]);

  return (
    <div className="engineer-dashboard">
      {/* Header */}
      <header className="operator-header" style={{ margin: '-1.5rem -1.5rem 1rem -1.5rem' }}>
        <div className="header-left">
          <Activity className="header-logo" size={24} color="var(--color-good)" />
          <div className="header-title-block">
            <h1 className="header-title">MALE UAV <span className="title-divider">|</span> <span className="title-view">PROPULSION ENGINEER</span></h1>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginLeft: '2rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <GlobalNav />
            <Link to="/" style={{ color: '#ffffff', fontWeight: 'bold', textDecoration: 'none', padding: '4px 10px', border: '1px solid #ffffff', borderRadius: '4px' }}>LOGOUT</Link>
          </div>
        </div>
        <div className="header-right">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.75rem', color: '#a8b2d1' }}>
            <div>TAKEOFF: 09:23Z | EST. LANDING: 15:08Z</div>
            <div className="utc-time" style={{ color: '#ffffff', fontSize: '1rem', marginTop: '2px' }}>UTC {currentTime}</div>
          </div>
          <div className="operator-name-display" style={{ color: '#ffffff', fontWeight: 'bold' }}>
            ENGINEER: A. GUPTA
          </div>
        </div>
      </header>

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
  );
};

export default EngineerDashboard;
