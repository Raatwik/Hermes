import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useEngineStore from '../../store/useEngineStore';
import TwinDriftChart from '../../components/widgets/TwinDriftChart';
import ResidualTimeSeries from '../../components/widgets/ResidualTimeSeries';
import EngineBlueprintWidget from '../../components/widgets/EngineBlueprintWidget';
import DegradationCauseGraph from '../../components/widgets/DegradationCauseGraph';
import MissionSandboxWidget from '../../components/widgets/MissionSandboxWidget';
import './EngineerDashboard.css';

const EHI_FACTOR_LABELS = {
  temperature: 'Temperature',
  pressure: 'Pressure',
  vibration: 'Vibration',
  rpm_deviation: 'RPM Deviation',
  fuel_efficiency: 'Fuel Efficiency',
  dt_drift: 'DT Drift',
};

const EHI_FACTOR_ORDER = ['temperature', 'pressure', 'vibration', 'rpm_deviation', 'fuel_efficiency', 'dt_drift'];

const getEhiColor = (value) => {
  if (value >= 80) return 'var(--color-good)';
  if (value >= 60) return 'var(--color-warning)';
  if (value >= 40) return '#e67e22';
  return 'var(--color-critical)';
};

const getEhiBand = (value) => {
  if (value >= 80) return 'HEALTHY';
  if (value >= 60) return 'WATCH';
  if (value >= 40) return 'DEGRADED';
  return 'CRITICAL';
};

const getContributionColor = (penalty) => {
  if (penalty <= 20) return 'var(--color-good)';
  if (penalty <= 50) return 'var(--color-warning)';
  return 'var(--color-critical)';
};

const EhiBreakdownWidget = ({ ehi, contributions, isLive }) => {
  const hasContributions = contributions && Object.keys(contributions).length > 0;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>ENGINE HEALTH INDEX BREAKDOWN</h3>
        {isLive && (
          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '3px', backgroundColor: getEhiColor(ehi), color: '#000' }}>
            {getEhiBand(ehi)}
          </span>
        )}
      </div>
      <div style={{ padding: '1rem', display: 'flex', gap: '1.5rem', flexGrow: 1, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: isLive ? getEhiColor(ehi) : 'var(--text-secondary)', lineHeight: 1 }}>
            {isLive ? ehi : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>/ 100</div>
          <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: isLive ? `${ehi}%` : '0%', height: '100%', backgroundColor: getEhiColor(ehi), transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {hasContributions && isLive && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {EHI_FACTOR_ORDER.map(factor => {
              const penalty = contributions[factor] ?? 0;
              return (
                <div key={factor} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', width: '90px', textAlign: 'right', flexShrink: 0 }}>
                    {EHI_FACTOR_LABELS[factor]}
                  </span>
                  <div style={{ flex: 1, height: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${Math.min(100, penalty)}%`,
                      height: '100%',
                      backgroundColor: getContributionColor(penalty),
                      borderRadius: '5px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: getContributionColor(penalty), width: '35px', textAlign: 'right', fontWeight: 600 }}>
                    {penalty}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const CLASSIFICATION_CONFIG = {
  nominal: { label: 'NOMINAL', color: 'var(--color-good)', description: 'All subsystems operating within expected parameters' },
  sensor_fault: { label: 'SENSOR FAULT', color: 'var(--color-warning)', description: 'Isolated sensor divergence detected — engine health unaffected' },
  engine_fault: { label: 'ENGINE FAULT', color: 'var(--color-critical)', description: 'Correlated multi-subsystem divergence consistent with physical mechanism' },
  model_drift: { label: 'MODEL DRIFT', color: '#e67e22', description: 'Broad systematic offset — digital twin may need recalibration' },
};

const DivergenceClassificationWidget = ({ classification, isLive }) => {
  if (!isLive || !classification) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>DIVERGENCE CLASSIFICATION</h3>
        </div>
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Awaiting telemetry data...
        </div>
      </div>
    );
  }

  const cls = classification.classification || 'nominal';
  const config = CLASSIFICATION_CONFIG[cls] || CLASSIFICATION_CONFIG.nominal;
  const confidence = classification.confidence ?? 0;
  const evidence = classification.evidence ?? [];
  const diverging = evidence.filter(e => e.status === 'diverging' || e.status === 'isolated');
  const normal = evidence.filter(e => e.status === 'normal');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>DIVERGENCE CLASSIFICATION</h3>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '3px', backgroundColor: config.color, color: '#000' }}>
          {config.label}
        </span>
      </div>
      <div style={{ padding: '1rem', display: 'flex', gap: '1.5rem', flexGrow: 1 }}>
        <div style={{ minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Classification</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: config.color }}>{config.label}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Confidence</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden', maxWidth: '80px' }}>
                <div style={{ width: `${Math.round(confidence * 100)}%`, height: '100%', backgroundColor: config.color, transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: config.color }}>{Math.round(confidence * 100)}%</span>
            </div>
          </div>
          {classification.affected_sensor && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Affected Sensor</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-warning)' }}>{classification.affected_sensor}</div>
            </div>
          )}
          {classification.affected_group && !classification.affected_sensor && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Affected Group</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-warning)' }}>{classification.affected_group}</div>
            </div>
          )}
          {classification.coupled_groups && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Coupled Groups</div>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {classification.coupled_groups.map(g => (
                  <span key={g} style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'rgba(255,50,50,0.15)', color: 'var(--color-critical)', fontWeight: 600 }}>{g}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
            {config.description}
          </div>
        </div>

        {evidence.length > 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Residual Evidence</div>
            {diverging.map((e, i) => (
              <div key={`d-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', width: '75px', textAlign: 'right', flexShrink: 0 }}>
                  {e.sensor || e.group}
                </span>
                <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, e.score * 1000)}%`,
                    height: '100%',
                    backgroundColor: e.status === 'isolated' ? 'var(--color-warning)' : 'var(--color-critical)',
                    borderRadius: '4px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.65rem', color: e.status === 'isolated' ? 'var(--color-warning)' : 'var(--color-critical)', width: '55px', textAlign: 'right', fontWeight: 600 }}>
                  {(e.score * 100).toFixed(2)}%
                </span>
              </div>
            ))}
            {normal.slice(0, 4).map((e, i) => (
              <div key={`n-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', width: '75px', textAlign: 'right', flexShrink: 0 }}>
                  {e.group}
                </span>
                <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, e.score * 1000)}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-good)',
                    borderRadius: '4px',
                  }} />
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-good)', width: '55px', textAlign: 'right', fontWeight: 600 }}>
                  {(e.score * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', padding: '0.5rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)', minWidth: '320px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>MISSION PHASE</span>
              <span style={{ color: 'var(--color-critical)', fontWeight: 'bold' }}>{missionContext.phase}</span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${isLive ? missionContext.phaseProgress : 0}%`, height: '100%', backgroundColor: 'var(--color-critical)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <span>Phase: {isLive ? `${missionContext.phaseProgress}%` : '—'}</span>
              <span>Mission: {isLive ? `${missionContext.missionProgress}%` : '—'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mission Context Bar */}
      <section className="mission-context-bar card">
        <div className="context-item">
          <div className="label">Engine Health Index</div>
          <div className="value" style={{ color: isLive ? getEhiColor(missionContext.ehi) : 'var(--text-secondary)', fontWeight: 'bold' }}>
            {isLive && missionContext.ehi != null ? `${missionContext.ehi}%` : '—'}
          </div>
          {isLive && (
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: getEhiColor(missionContext.ehi) }}>
              {getEhiBand(missionContext.ehi)}
            </div>
          )}
        </div>
        <div className="context-divider"></div>
        <div className="context-item" style={{ minWidth: '130px' }}>
          <div className="label">RUL</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="value" style={{ color: 'var(--color-good)', fontWeight: 'bold', lineHeight: 1.2 }}>
              {isLive && missionContext.rul != null ? `${missionContext.rul} hrs` : '—'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              95% CI: [{isLive && missionContext.rulLowerBound != null ? missionContext.rulLowerBound : '—'} - {isLive && missionContext.rulUpperBound != null ? missionContext.rulUpperBound : '—'} h]
            </div>
          </div>
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

        {/* Row 0: EHI Breakdown + Divergence Classification */}
        <div className="grid-area-ehi-breakdown card">
          <EhiBreakdownWidget ehi={missionContext.ehi} contributions={missionContext.ehiContributions} isLive={isLive} />
        </div>
        <div className="grid-area-divergence card">
          <DivergenceClassificationWidget classification={missionContext.divergenceClassification} isLive={isLive} />
        </div>

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
