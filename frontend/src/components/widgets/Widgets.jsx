import React, { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
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
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="alert-banner-container" style={{ maxHeight: '180px', overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {warnings.map((w, idx) => {
        const colorClass = w.level === 'critical' ? 'var(--color-critical)' : w.level === 'warning' ? 'var(--color-warning)' : 'var(--text-primary)';
        return (
          <div key={idx} style={{ color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: '1.4', fontWeight: '500' }}>
            <span style={{ color: colorClass, fontWeight: 'bold', textTransform: 'uppercase' }}>{w.title}:</span> {w.message}
          </div>
        );
      })}
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
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const riskNum = parseInt(riskValue);
  const strokeDashoffset = circumference - ((riskNum / 100) * circumference);

  return (
    <div className="card sidebar-summary-panel" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: '1rem', width: '100%', height: '100%', padding: '1rem' }}>
      <div className="summary-table-row" style={{ flex: 1, padding: 0 }}>
        <span className="summary-table-label">ENGINE HEALTH</span>
        <span className="summary-table-value">{engineHealth}</span>
      </div>
      
      <div className="summary-table-row" style={{ flex: 1, padding: 0 }}>
        <span className="summary-table-label">SYSTEM STATUS</span>
        <span className="summary-table-value">{systemStatus}</span>
      </div>
      
      <div className="summary-right-risk" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <h3 className="summary-risk-label" style={{ margin: 0 }}>RISK</h3>
        <div className="status-icon-wrapper" style={{ color: `var(--color-${riskColorClass})`, width: '70px', height: '70px' }}>
          <svg className="status-progress-ring" width="70" height="70" viewBox="0 0 70 70">
            <circle 
              className="progress-ring-bg" 
              stroke="var(--border-color)" 
              strokeWidth="4" 
              fill="transparent" 
              r={radius} 
              cx="35" 
              cy="35" 
            />
            <circle 
              className="progress-ring-fill" 
              stroke="currentColor" 
              strokeWidth="4" 
              fill="transparent" 
              r={radius} 
              cx="35" 
              cy="35"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="status-icon" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            {riskValue}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TelemetryTable({ data, cylinderMetrics }) {
  const [activeMetric, setActiveMetric] = useState('EGT');

  const chartData = useMemo(() => {
    if (!cylinderMetrics) return [];
    
    return [1, 2, 3, 4].map(cylId => {
      const egt = cylinderMetrics.find(m => m.cyl === cylId && m.type === 'EGT');
      const cht = cylinderMetrics.find(m => m.cyl === cylId && m.type === 'CHT');
      
      return {
        name: `CYL ${cylId}`,
        egtExpected: egt ? egt.expected : 0,
        egtCurrent: egt ? egt.current : 0,
        egtStatus: egt ? egt.status : 'good',
        chtExpected: cht ? cht.expected : 0,
        chtCurrent: cht ? cht.current : 0,
        chtStatus: cht ? cht.status : 'good',
      };
    });
  }, [cylinderMetrics]);

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
                <span className={`value-main text-${item.colorClass}`}>{item.current}</span>
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
                  <div className="subsection-title-container">
                    <div className="subsection-title">CYLINDER READOUTS (EGT / CHT)</div>
                    <div className="metric-toggle">
                      <button 
                        className={`toggle-btn ${activeMetric === 'EGT' ? 'active' : ''}`}
                        onClick={() => setActiveMetric('EGT')}
                      >
                        EGT
                      </button>
                      <button 
                        className={`toggle-btn ${activeMetric === 'CHT' ? 'active' : ''}`}
                        onClick={() => setActiveMetric('CHT')}
                      >
                        CHT
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr className="telemetry-row cylinder-row">
                <td colSpan="5" className="cylinder-cell">
                  <div className="cylinder-layout">
                    {/* Left side: Chart */}
                    <div className="cylinder-chart-container">
                      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                        <BarChart
                          data={chartData}
                          margin={{ top: 20, right: 10, left: 0, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="0" stroke="var(--border-color)" vertical={true} />
                          <XAxis 
                            dataKey="name" 
                            stroke="var(--text-secondary)" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                            axisLine={true} 
                            tickLine={true} 
                            label={{ value: 'CYLINDER', position: 'insideBottom', offset: -15, fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 700 }}
                          />
                          <YAxis 
                            stroke="var(--text-secondary)" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                            axisLine={true} 
                            tickLine={true} 
                            label={{ value: activeMetric === 'EGT' ? 'TEMP (°C)' : 'TEMP (°C)', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 700 }}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}
                            itemStyle={{ color: 'var(--text-primary)', padding: '2px 0' }}
                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                          {activeMetric === 'EGT' ? (
                            <>
                              <Bar dataKey="egtExpected" name="Expected" fill="#888888" radius={[0, 0, 0, 0]} maxBarSize={30}>
                                <LabelList dataKey="egtExpected" position="top" formatter={(val) => val ? `${val}°C` : 'N/A'} fontSize={10} fill="var(--text-secondary)" />
                              </Bar>
                              <Bar dataKey="egtCurrent" name="Current" radius={[0, 0, 0, 0]} maxBarSize={30}>
                                <LabelList dataKey="egtCurrent" position="top" formatter={(val) => val ? `${val}°C` : 'N/A'} fontSize={10} fill="var(--text-primary)" />
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={`var(--color-${entry.egtStatus})`} />
                                ))}
                              </Bar>
                            </>
                          ) : (
                            <>
                              <Bar dataKey="chtExpected" name="Expected" fill="#888888" radius={[0, 0, 0, 0]} maxBarSize={30}>
                                <LabelList dataKey="chtExpected" position="top" formatter={(val) => val ? `${val}°C` : 'N/A'} fontSize={10} fill="var(--text-secondary)" />
                              </Bar>
                              <Bar dataKey="chtCurrent" name="Current" radius={[0, 0, 0, 0]} maxBarSize={30}>
                                <LabelList dataKey="chtCurrent" position="top" formatter={(val) => val ? `${val}°C` : 'N/A'} fontSize={10} fill="var(--text-primary)" />
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={`var(--color-${entry.chtStatus})`} />
                                ))}
                              </Bar>
                            </>
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Right side: Condensed Cards */}
                    <div className="cylinder-grid-condensed">
                      {cylinderMetrics.map((metric, idx) => (
                        <div key={idx} className={`cylinder-card condensed ${metric.status === 'warning' ? 'has-warning' : ''} ${metric.status === 'critical' ? 'has-critical' : ''}`}>
                          <div className="cyl-header">C{metric.cyl} {metric.type}</div>
                          <div className="cyl-data">
                            <div className="cyl-data-row">
                              <span className="cyl-label">EXP</span>
                              <span className="cyl-val">{metric.expected}°</span>
                            </div>
                            <div className="cyl-data-row">
                              <span className="cyl-label">CUR</span>
                              <span className={`cyl-val text-${metric.status}`}>{metric.current}°</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
