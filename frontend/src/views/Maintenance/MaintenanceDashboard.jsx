import React, { useState } from 'react';
import { RulWidget } from '../../components/widgets/MissionWidgets';
import PostFlightLog from './PostFlightLog';
import DegradationCauseGraph from '../../components/widgets/DegradationCauseGraph';
import { Wrench, AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';
import OperatorLayout from '../../components/layout/OperatorLayout';
import useEngineStore from '../../store/useEngineStore';
import './MaintenanceDashboard.css';

const MaintenanceDashboard = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const diagnosisData = useEngineStore(state => state.diagnosisData);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
    }, 1500);
  };

  const isCritical = !!diagnosisData;

  return (
    <OperatorLayout operatorName="CREW: MAINTENANCE ALPHA">
      <div className="maintenance-dashboard" style={{ paddingTop: 0 }}>
        {/* Main Grid Layout */}
      <main className="maintenance-grid">
        
        {/* Left Sidebar */}
        <div className="grid-sidebar">
          <RulWidget 
            hours={isCritical ? 105 : 145} 
            text={isCritical ? "Degradation detected" : "Nominal"} 
            isGood={!isCritical} 
          />

          <div className="card">
            <div className="card-title">
              <Activity size={18} /> DEGRADATION STATUS
            </div>
            <div style={{ padding: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Overall Engine Health</span>
                <span style={{ color: isCritical ? '#ff9900' : '#10b981', fontWeight: 'bold' }}>{isCritical ? '82%' : '98%'}</span>
              </div>
              <div style={{ width: '100%', backgroundColor: '#cccccc', height: '6px', borderRadius: '0' }}>
                <div style={{ width: isCritical ? '82%' : '98%', backgroundColor: isCritical ? '#ff9900' : '#10b981', height: '100%', borderRadius: '0' }}></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ color: isCritical ? '#cc0000' : '#10b981' }}>
              {isCritical ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />} MAINTENANCE PRIORITY
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: isCritical ? '#cc0000' : '#10b981', textAlign: 'center', margin: '1rem 0' }}>
              {isCritical ? diagnosisData.priority : 'ROUTINE'}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#666666', textAlign: 'center' }}>
              {isCritical ? 'Inspection required before next deployment.' : 'No immediate action required.'}
            </p>
          </div>
        </div>
        
        {/* Main Content - Top row (Diagnosis & Advisory) */}
        <div className="grid-main-top">
          {/* Diagnosis Panel */}
          <div className="card diagnosis-panel">
            <div className="card-title">
              {isCritical ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />} SUSPECTED FAULT / DIAGNOSIS
            </div>
            <div className="diagnosis-fault" style={{ color: isCritical ? 'var(--color-critical)' : 'var(--color-good)' }}>
              {isCritical ? diagnosisData.fault : 'NONE DETECTED'}
            </div>
            <p style={{ fontSize: '0.9rem', color: '#666666', marginBottom: '1rem' }}>
              {isCritical ? diagnosisData.evidence : 'All telemetry within expected parameters.'}
            </p>
            
            {isCritical && (
              <>
                <div className="card-title" style={{ fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  SUPPORTING EVIDENCE
                </div>
                <div className="diagnosis-evidence">
                  <div className="evidence-item">
                    <span>Pressure Residual</span>
                    <span style={{ color: '#cc0000', fontWeight: 'bold' }}>-38%</span>
                  </div>
                  <div className="evidence-item">
                    <span>Vibration Trend</span>
                    <span style={{ color: '#ff9900', fontWeight: 'bold' }}>+15%</span>
                  </div>
                  <div className="evidence-item">
                    <span>Temperature Gradient</span>
                    <span style={{ color: '#cc0000', fontWeight: 'bold' }}>+12%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Advisory Panel */}
          <div className="card advisory-panel" style={{ borderTop: isCritical ? '4px solid var(--color-critical)' : '4px solid var(--color-good)' }}>
            <div className="card-title advisory-title" style={{ color: isCritical ? 'var(--color-critical)' : 'var(--color-good)' }}>
              <Wrench size={18} /> MAINTENANCE ADVISORY
            </div>
            <ol className="advisory-steps">
              {isCritical ? (
                <>
                  <li>Inspect oil pump assembly for wear or blockage.</li>
                  <li>Perform flow check on primary oil lines.</li>
                  <li>Verify engine bearing integrity due to prolonged low pressure.</li>
                  <li>Run static ground test for 15 minutes post-maintenance to verify residual baseline return.</li>
                </>
              ) : (
                <li>Standard post-flight checks only.</li>
              )}
            </ol>
            {isCritical && (
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || isGenerated}
                  style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: isGenerated ? '#000080' : (isGenerating ? '#666666' : '#cc0000'),
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0',
                  fontWeight: 'bold',
                  cursor: (isGenerating || isGenerated) ? 'default' : 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  {isGenerating ? 'GENERATING...' : isGenerated ? 'WORK ORDER GENERATED' : 'ACKNOWLEDGE & GENERATE WORK ORDER'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content - Middle row (Degradation Graph) */}
        <div className="grid-main-middle card" style={{ padding: 0, overflow: 'hidden' }}>
          <DegradationCauseGraph />
        </div>

        {/* Main Content - Bottom row (Post-Flight Log) */}
        <div className="grid-main-bottom">
          <PostFlightLog />
        </div>

      </main>
      </div>
    </OperatorLayout>
  );
};

export default MaintenanceDashboard;
