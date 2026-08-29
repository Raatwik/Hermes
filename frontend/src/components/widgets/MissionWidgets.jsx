import React from 'react';
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

export function RecommendationBanner({ title, text, subtext, isGood }) {
  const titleColor = isGood ? 'text-good' : 'text-warning';
  
  return (
    <div className="recommendation-banner">
      <div className={`rec-title ${titleColor}`}>{title}</div>
      <div className="rec-divider"></div>
      <div className="rec-content">
        <span className="rec-text">{text}</span>
        <span className="rec-subtext">{subtext}</span>
      </div>
    </div>
  );
}
