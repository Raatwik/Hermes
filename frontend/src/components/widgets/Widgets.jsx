import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import './Widgets.css';

export function StatusCard({ title, value, max, status, statusText, icon: Icon, colorClass, hasAlert }) {
  // SVG Circular progress math
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = max ? circumference - ((value / max) * circumference) : 0;
  
  return (
    <div className="status-card">
      <div className="status-card-header">
        <h3 className="status-card-title">
          {title}
          {hasAlert && <span className="status-alert-marker"></span>}
        </h3>
      </div>
      <div className="status-card-body">
        <div className="status-icon-wrapper" style={{ color: `var(--color-${colorClass})` }}>
          <svg className="status-progress-ring" width="72" height="72" viewBox="0 0 72 72">
            <circle 
              className="progress-ring-bg" 
              stroke="var(--border-color)" 
              strokeWidth="4" 
              fill="transparent" 
              r={radius} 
              cx="36" 
              cy="36" 
            />
            {max && (
              <circle 
                className="progress-ring-fill" 
                stroke="currentColor" 
                strokeWidth="4" 
                fill="transparent" 
                r={radius} 
                cx="36" 
                cy="36"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="status-icon">
            <Icon size={24} />
          </div>
        </div>
        
        <div className="status-details">
          {max ? (
            <div className="status-value">
              <span className={`value-main text-${colorClass}`}>{value}</span>
              <span className="value-sub">/{max}</span>
            </div>
          ) : (
            <div className={`status-value text-${colorClass}`}>{value}</div>
          )}
          <div className={`badge badge-${colorClass}`}>{status}</div>
          {statusText && <div className="status-text">{statusText}</div>}
        </div>
      </div>
    </div>
  );
}

export function AlertBanner({ warnings }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!warnings || warnings.length === 0) return null;

  const currentWarning = warnings[0];
  const hasMore = warnings.length > 1;

  return (
    <div className="alert-banner-container">
      <div 
        className={`alert-banner level-${currentWarning.level} ${hasMore ? 'clickable' : ''}`}
        onClick={() => hasMore && setIsExpanded(!isExpanded)}
      >
        <div className="alert-icon-wrapper">
          <AlertTriangle size={24} />
        </div>
        <div className="alert-content">
          <div className="alert-title-row">
            <span className="alert-title">{currentWarning.title}</span>
            {currentWarning.resolved && <span className="warning-badge resolved">RESOLVED</span>}
            {!currentWarning.resolved && currentWarning.level === 'critical' && <span className="warning-badge active-critical">ACTION REQUIRED</span>}
          </div>
          <span className="alert-message">{currentWarning.message}</span>
        </div>
        <div className="alert-timestamp">{currentWarning.timestamp}</div>
        {hasMore && (
          <div className="alert-chevron">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        )}
      </div>
      
      {isExpanded && hasMore && (
        <div className="alert-history">
          {warnings.slice(1).map((w, idx) => (
            <div key={idx} className={`alert-history-item level-${w.level}`}>
              <div className="alert-icon-wrapper small">
                <AlertTriangle size={18} />
              </div>
              <div className="alert-content">
                <div className="alert-title-row">
                  <span className="alert-title">{w.title}</span>
                  {w.resolved && <span className="warning-badge resolved">RESOLVED</span>}
                  {!w.resolved && w.level === 'critical' && <span className="warning-badge active-critical">ACTION REQUIRED</span>}
                </div>
                <span className="alert-message">{w.message}</span>
              </div>
              <div className="alert-timestamp">{w.timestamp}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TelemetryItem({ title, value, unit, status, icon: Icon, colorClass }) {
  return (
    <div className="telemetry-item">
      <div className="telemetry-header">
        <h4 className="telemetry-title">{title}</h4>
      </div>
      <div className="telemetry-body">
        <div className={`telemetry-icon text-${colorClass}`}>
          <Icon size={32} strokeWidth={1.5} />
        </div>
        <div className="telemetry-data">
          <div className="telemetry-value-row">
            <span className="telemetry-value">{value}</span>
            <span className="telemetry-unit">{unit}</span>
          </div>
          <div className={`badge badge-${colorClass}`}>{status}</div>
        </div>
      </div>
    </div>
  );
}

export function SidebarSummaryPanel({ engineHealth, systemStatus, riskValue, riskColorClass }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const riskNum = parseInt(riskValue);
  const strokeDashoffset = circumference - ((riskNum / 100) * circumference);

  return (
    <div className="card sidebar-summary-panel">
      <div className="summary-left-table">
        <div className="summary-table-row">
          <span className="summary-table-label">ENGINE HEALTH</span>
          <span className="summary-table-value text-good">{engineHealth}</span>
        </div>
        <div className="summary-table-divider"></div>
        <div className="summary-table-row">
          <span className="summary-table-label">SYSTEM STATUS</span>
          <span className="summary-table-value text-good">{systemStatus}</span>
        </div>
      </div>
      
      <div className="summary-right-risk">
        <h3 className="summary-risk-label">RISK</h3>
        <div className="status-icon-wrapper large" style={{ color: `var(--color-${riskColorClass})` }}>
          <svg className="status-progress-ring" width="112" height="112" viewBox="0 0 112 112">
            <circle 
              className="progress-ring-bg" 
              stroke="var(--border-color)" 
              strokeWidth="6" 
              fill="transparent" 
              r={radius} 
              cx="56" 
              cy="56" 
            />
            <circle 
              className="progress-ring-fill" 
              stroke="currentColor" 
              strokeWidth="6" 
              fill="transparent" 
              r={radius} 
              cx="56" 
              cy="56"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="status-icon enlarged-risk-value">
            {riskValue}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TelemetryTable({ data, cylinderMetrics }) {
  return (
    <div className="telemetry-table-wrapper">
      <table className="telemetry-table">
        <thead>
          <tr>
            <th>PARAMETER</th>
            <th>TWIN EXPECTED</th>
            <th>CURRENT ACTUAL</th>
            <th>DEVIATION</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="telemetry-row">
              <td className="param-cell">
                <div className={`param-icon text-${item.colorClass}`}>
                  <item.icon size={18} />
                </div>
                <span className="param-title">{item.title}</span>
              </td>
              <td className="value-cell">
                <span className="value-main">{item.expected}</span>
                <span className="value-unit">{item.unit}</span>
              </td>
              <td className="value-cell">
                <span className="value-main">{item.current}</span>
                <span className="value-unit">{item.unit}</span>
              </td>
              <td className={`deviation-cell text-${item.colorClass}`}>
                {item.deviation}
              </td>
              <td className="status-cell">
                <div className={`badge badge-${item.colorClass}`}>{item.status}</div>
              </td>
            </tr>
          ))}
          {cylinderMetrics && (
            <>
              <tr className="telemetry-subsection-header">
                <td colSpan="5">
                  <div className="subsection-title">CYLINDER READOUTS (EGT / CHT)</div>
                </td>
              </tr>
              <tr className="telemetry-row cylinder-row">
                <td colSpan="5" className="cylinder-cell">
                  <div className="cylinder-grid-8">
                    {cylinderMetrics.map((metric, idx) => (
                      <div key={idx} className={`cylinder-card ${metric.isWarning ? 'has-warning' : ''}`}>
                        <div className="cyl-header">CYL {metric.cyl} {metric.type}</div>
                        <div className="cyl-data">
                          <div className="cyl-data-row">
                            <span className="cyl-label">EXPECTED</span>
                            <span className="cyl-val">{metric.expected} {metric.unit}</span>
                          </div>
                          <div className="cyl-data-row">
                            <span className="cyl-label">CURRENT</span>
                            <span className={`cyl-val ${metric.isWarning ? 'text-warning' : ''}`}>{metric.current} {metric.unit}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
