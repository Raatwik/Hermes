import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { RulWidget } from '../../components/widgets/MissionWidgets';
import PostFlightLog from './PostFlightLog';
import { Wrench, AlertTriangle, Activity } from 'lucide-react';
import './MaintenanceDashboard.css';

const MaintenanceDashboard = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
    }, 1500);
  };

  return (
    <div className="maintenance-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 className="text-xl font-bold">MAINTENANCE VIEW</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <Link to="/operator" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>OPERATOR</Link>
            <Link to="/engineer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>ENGINEER</Link>
            <Link to="/maintenance" style={{ color: 'var(--color-good)', fontWeight: 'bold', textDecoration: 'none', borderBottom: '2px solid var(--color-good)' }}>MAINTENANCE</Link>
          </div>
        </div>
        <div className="header-status">
          <span>UAV-01</span>
          <span className="separator">|</span>
          <span>ENGINE: ROTAX 914 (NA)</span>
          <span className="separator">|</span>
          <span className="status-idle">● POST-FLIGHT / IDLE</span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="maintenance-grid">
        
        {/* Left Sidebar */}
        <div className="grid-sidebar">
          <RulWidget 
            hours={143} 
            text="Degradation detected" 
            isGood={false} 
          />

          <div className="card">
            <div className="card-title">
              <Activity size={18} /> DEGRADATION STATUS
            </div>
            <div style={{ padding: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Overall Engine Health</span>
                <span style={{ color: 'var(--color-warning)', fontWeight: 'bold' }}>82%</span>
              </div>
              <div style={{ width: '100%', backgroundColor: 'var(--border-color)', height: '6px', borderRadius: '3px' }}>
                <div style={{ width: '82%', backgroundColor: 'var(--color-warning)', height: '100%', borderRadius: '3px' }}></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ color: 'var(--color-critical)' }}>
              <AlertTriangle size={18} /> MAINTENANCE PRIORITY
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-critical)', textAlign: 'center', margin: '1rem 0' }}>
              HIGH URGENCY
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Inspection required before next deployment.
            </p>
          </div>
        </div>
        
        {/* Main Content - Top row (Diagnosis & Advisory) */}
        <div className="grid-main-top">
          {/* Diagnosis Panel */}
          <div className="card diagnosis-panel">
            <div className="card-title">
              <AlertTriangle size={18} /> SUSPECTED FAULT / DIAGNOSIS
            </div>
            <div className="diagnosis-fault">
              INJECTOR DEGRADATION
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Continuous deviation in expected combustion temperatures and fuel flow rates detected during the last cruise phase.
            </p>
            
            <div className="card-title" style={{ fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              SUPPORTING EVIDENCE
            </div>
            <div className="diagnosis-evidence">
              <div className="evidence-item">
                <span>Temperature Residual</span>
                <span style={{ color: 'var(--color-critical)', fontWeight: 'bold' }}>+31%</span>
              </div>
              <div className="evidence-item">
                <span>Vibration Trend</span>
                <span style={{ color: 'var(--color-warning)', fontWeight: 'bold' }}>+27%</span>
              </div>
              <div className="evidence-item">
                <span>Fuel Efficiency</span>
                <span style={{ color: 'var(--color-critical)', fontWeight: 'bold' }}>-12%</span>
              </div>
            </div>
          </div>

          {/* Advisory Panel */}
          <div className="card advisory-panel">
            <div className="card-title advisory-title">
              <Wrench size={18} /> MAINTENANCE ADVISORY
            </div>
            <ol className="advisory-steps">
              <li>Inspect fuel injectors on cylinders 2 and 3 for clogging or wear.</li>
              <li>Perform flow check on injector lines.</li>
              <li>Verify engine oil for potential fuel contamination due to misfire.</li>
              <li>Run static ground test for 15 minutes post-maintenance to verify residual baseline return.</li>
            </ol>
            <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || isGenerated}
                style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: isGenerated ? 'var(--color-good)' : (isGenerating ? 'var(--text-secondary)' : 'var(--color-warning)'),
                color: isGenerated ? '#fff' : '#000',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: (isGenerating || isGenerated) ? 'default' : 'pointer',
                transition: 'all 0.2s ease'
              }}>
                {isGenerating ? 'GENERATING...' : isGenerated ? 'WORK ORDER GENERATED' : 'ACKNOWLEDGE & GENERATE WORK ORDER'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Bottom row (Post-Flight Log) */}
        <div className="grid-main-bottom">
          <PostFlightLog />
        </div>

      </main>
    </div>
  );
};

export default MaintenanceDashboard;
