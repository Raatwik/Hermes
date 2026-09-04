import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import './MissionWidgets.css';

export function RulWidget({ hours, text, statusText, isGood }) {
  return (
    <div className="card rul-card">
      <div className="rul-header">
        <h4 className="rul-title">REMAINING USEFUL LIFE (RUL)</h4>
      </div>
      <div className="rul-body">
        <div className="rul-main">
          <span className="rul-value text-good">{hours != null ? hours : '—'}</span>
          <span className="rul-unit text-good">HOURS<br/>REMAINING</span>
        </div>
        <div className="rul-divider"></div>
        <div className="rul-status">
          <span className="rul-status-text">{text}</span>
          {isGood && <ShieldCheck className="text-good" size={32} />}
        </div>
      </div>
    </div>
  );
}

export function MissionProgress({ phases, currentPhaseIndex, progressPercent, elapsed, remaining }) {
  return (
    <div className="card mission-progress-card">
      <div className="mission-header">
        <h4 className="mission-title">MISSION PROGRESS</h4>
      </div>
      <div className="mission-body">
        <div className="phases-container">
          {phases.map((phase, index) => {
            const isCompleted = index <= currentPhaseIndex;
            const isCurrent = index === currentPhaseIndex;
            return (
              <div key={phase.name} className={`phase-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                <div className="phase-icon">
                  <phase.icon size={24} />
                </div>
                <div className="phase-name">{phase.name}</div>
              </div>
            );
          })}
          
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            {/* Dots */}
            <div className="progress-dots">
              {phases.map((_, i) => (
                <div key={i} className={`progress-dot ${i <= currentPhaseIndex ? 'completed' : ''} ${i === currentPhaseIndex ? 'current' : ''}`} style={{ left: `${(i / (phases.length - 1)) * 100}%` }}></div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mission-times">
          <div className="time-block">
            <span className="time-label">ELAPSED TIME</span>
            <span className="time-value">{elapsed}</span>
          </div>
          <div className="progress-percent text-good">{progressPercent}%</div>
          <div className="time-block right">
            <span className="time-label">REMAINING TIME</span>
            <span className="time-value">{remaining}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecommendationBanner({ title, options, isGood, onExecute }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);
  const titleColor = isGood ? 'text-good' : 'text-warning';

  const primaryOption = options && options.length > 0 ? options[0] : { action: 'No action provided', consequence: '' };

  const handleExecute = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      setIsExecuted(true);
      if (onExecute) onExecute();
    }, 1500);
  };

  return (
    <div className={`recommendation-banner interactive ${isExecuted ? 'executed' : ''}`}>
      <div className="rec-header">
        <div className={`rec-title ${titleColor}`}>{title}</div>
      </div>
      <div className="rec-divider"></div>
      <div className="rec-options" style={{ padding: '1rem' }}>
        <div className={`rec-option selected ${isExecuted || isExecuting ? 'disabled' : ''}`}>
          <div className="rec-option-content" style={{ marginLeft: 0 }}>
            <span className="rec-action">{primaryOption.action}</span>
            <span className="rec-consequence">{primaryOption.consequence}</span>
          </div>
        </div>
      </div>
      <div className="rec-actions-footer">
        <button 
          className={`btn-execute ${isExecuted ? 'btn-success' : ''}`} 
          disabled={isExecuting || isExecuted}
          onClick={handleExecute}
        >
          {isExecuting ? 'TRANSMITTING...' : isExecuted ? 'COMMAND SENT' : 'EXECUTE'}
        </button>
      </div>
    </div>
  );
}
