import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useEngineStore from '../../store/useEngineStore';
import TwinDriftChart from '../../components/widgets/TwinDriftChart';
import ResidualTimeSeries from '../../components/widgets/ResidualTimeSeries';
import FaultProbabilityMatrix from '../../components/widgets/FaultProbabilityMatrix';
import DegradationCauseGraph from '../../components/widgets/DegradationCauseGraph';
import EngineHealthWidget from '../../components/widgets/EngineHealthWidget';
import MissionSandboxWidget from '../../components/widgets/MissionSandboxWidget';
import TwinComparisonWidget from '../../components/widgets/TwinComparisonWidget';
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
    <div className="engineer-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 className="text-xl font-bold">PROPULSION ENGINEER VIEW</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <Link to="/" style={{ color: 'var(--color-critical)', fontWeight: 'bold', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--color-critical)', borderRadius: '4px' }}>LOGOUT</Link>
          </div>
        </div>
        <div className="header-status">
          <span>UAV-01</span>
          <span className="separator">|</span>
          <span>ENGINE: ROTAX 914 (NA)</span>
          <span className="separator">|</span>
          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>FINGERPRINT: UAV-01 CUSTOM MODEL</span>
          <span className="separator">|</span>
          <span className="status-live">● LIVE</span>
        </div>
      </header>

      {/* Mission Context Bar */}
      <section className="mission-context-bar card">
        <div className="context-item">
          <div className="label">Mission Phase</div>
          <div className="value" style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{missionContext.phase}</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">Altitude</div>
          <div className="value">{isLive ? `${Math.round(missionContext.altitude).toLocaleString()} ft` : '—'}</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">RPM</div>
          <div className="value">{isLive ? Math.round(missionContext.rpm).toLocaleString() : '—'}</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">Engine Load</div>
          <div className="value">{isLive ? `${missionContext.engineLoad} %` : '—'}</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">OAT</div>
          <div className="value">{isLive ? `${missionContext.oat} °C` : '—'}</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">MAP</div>
          <div className="value">{isLive ? `${missionContext.map} inHg` : '—'}</div>
        </div>
        <div className="context-divider"></div>
        <div className="context-item">
          <div className="label">Fuel Flow</div>
          <div className="value">{isLive ? `${Math.round(missionContext.fuelFlow * 10) / 10} L/hr` : '—'}</div>
        </div>
      </section>

      {/* Main Grid Layout */}
      <main className="dashboard-grid">
        
        {/* Row 1: Live Core & Diagnostics */}
        <div className="grid-area-comparison card">
          <TwinComparisonWidget />
        </div>
        <div className="grid-area-faults card">
          <FaultProbabilityMatrix />
        </div>

        {/* Row 2: Sandbox & Health */}
        <div className="grid-area-sandbox card">
          <MissionSandboxWidget />
        </div>
        <div className="grid-area-health card">
          <EngineHealthWidget />
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
