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
          <span className="rul-value text-good">{hours}</span>
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

export function RecommendationBanner({ title, options, isGood }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);
  const titleColor = isGood ? 'text-good' : 'text-warning';

  const handleExecute = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      setIsExecuted(true);
    }, 1500);
  };

  return (
    <div className={`recommendation-banner interactive ${isExecuted ? 'executed' : ''}`}>
      <div className="rec-header">
        <div className={`rec-title ${titleColor}`}>{title}</div>
      </div>
      <div className="rec-divider"></div>
      <div className="rec-options">
        {options.map((opt, idx) => (
          <div 
            key={idx} 
            className={`rec-option ${selectedOption === idx ? 'selected' : ''} ${isExecuted || isExecuting ? 'disabled' : ''}`}
            onClick={() => {
              if (!isExecuted && !isExecuting) setSelectedOption(idx);
            }}
          >
            <div className="rec-option-radio">
              <div className={`radio-inner ${selectedOption === idx ? 'active' : ''}`}></div>
            </div>
            <div className="rec-option-content">
              <span className="rec-action">{opt.action}</span>
              <span className="rec-consequence">{opt.consequence}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="rec-actions-footer">
        <button 
          className={`btn-execute ${isExecuted ? 'btn-success' : ''}`} 
          disabled={selectedOption === null || isExecuting || isExecuted}
          onClick={handleExecute}
        >
          {isExecuting ? 'TRANSMITTING...' : isExecuted ? 'COMMAND SENT' : 'EXECUTE'}
        </button>
      </div>
    </div>
  );
}
