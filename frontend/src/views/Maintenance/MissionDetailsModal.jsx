import React from 'react';
import { createPortal } from 'react-dom';
import { X, Activity, Thermometer, Droplet, TrendingUp } from 'lucide-react';
import './MissionDetailsModal.css';

export default function MissionDetailsModal({ mission, onClose }) {
  if (!mission) return null;

  const modal = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ margin: 0 }}>MISSION SUMMARY: {mission.id}</h2>
            <span className={`risk-indicator ${mission.riskLevel.toLowerCase()}`}>
              {mission.riskLevel.toUpperCase()} RISK
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body">
          {/* Top stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">DATE</div>
              <div className="stat-value">{mission.date}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">DURATION</div>
              <div className="stat-value">{mission.duration}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">MAX RPM</div>
              <div className="stat-value">{mission.maxRpm}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">ANOMALIES DETECTED</div>
              <div className="stat-value" style={{ color: mission.anomalies > 0 ? 'var(--color-critical)' : 'var(--color-good)' }}>
                {mission.anomalies}
              </div>
            </div>
          </div>

          {/* Anomaly Breakdown */}
          {mission.anomalies > 0 && (
            <div className="modal-section">
              <h3 className="section-title"><Activity size={18} /> ANOMALY BREAKDOWN</h3>
              <div className="anomaly-list">
                <div className="anomaly-item">
                  <span className="anomaly-time">T+02:45:10</span>
                  <span className="anomaly-desc text-critical">EGT Spike (Cyl 3) exceeded nominal by +31%</span>
                  <span className="anomaly-phase">CRUISE</span>
                </div>
                <div className="anomaly-item">
                  <span className="anomaly-time">T+04:12:05</span>
                  <span className="anomaly-desc text-warning">Fuel Flow Drop detected momentarily</span>
                  <span className="anomaly-phase">LOITER</span>
                </div>
                <div className="anomaly-item">
                  <span className="anomaly-time">T+07:30:22</span>
                  <span className="anomaly-desc text-warning">Vibration harmonic mismatch</span>
                  <span className="anomaly-phase">RETURN</span>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="modal-section">
            <h3 className="section-title"><TrendingUp size={18} /> PEAK METRICS RECORDED</h3>
            <div className="metrics-grid">
              <div className="metric-box">
                <Thermometer size={20} style={{ color: 'var(--color-warning)', marginBottom: '0.5rem' }} />
                <div className="metric-value">672°C</div>
                <div className="metric-name">Peak EGT (Cyl 3)</div>
              </div>
              <div className="metric-box">
                <Thermometer size={20} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                <div className="metric-value">158°C</div>
                <div className="metric-name">Peak CHT (Cyl 2)</div>
              </div>
              <div className="metric-box">
                <Droplet size={20} style={{ color: 'var(--color-warning)', marginBottom: '0.5rem' }} />
                <div className="metric-value">102°C</div>
                <div className="metric-name">Peak Oil Temp</div>
              </div>
              <div className="metric-box">
                <Droplet size={20} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                <div className="metric-value">58 psi</div>
                <div className="metric-name">Min Oil Pressure</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
