import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, LineChart as LineChartIcon } from 'lucide-react';
import FaultProbabilityMatrix from './FaultProbabilityMatrix';

const trajectoryData = [
  { hours: 0, severity: 0.05 },
  { hours: 50, severity: 0.08 },
  { hours: 100, severity: 0.12 },
  { hours: 150, severity: 0.18 },
  { hours: 200, severity: 0.27 },
  { hours: 250, severity: 0.38 },
  { hours: 300, severity: 0.50 },
  { hours: 350, severity: 0.63 },
  { hours: 400, severity: 0.77 },
  { hours: 450, severity: 0.90 },
];



const DegradationCauseGraph = () => {
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="text-base font-bold text-primary" style={{ fontSize: '1rem' }}>ENGINE DEGRADATION TRAJECTORY</h3>
      </div>
      
      <div style={{ flexGrow: 1, minHeight: '300px', display: 'flex' }}>
        <div style={{ flex: 2, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '1rem 1rem 0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Engine degradation trajectory</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Severity λ (0=healthy, 1=critical) by Flight hours</div>
            </div>
            <div style={{ display: 'flex', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
              <button 
                onClick={() => setViewMode('chart')}
                style={{ 
                  padding: '6px 10px', 
                  background: viewMode === 'chart' ? 'var(--border-color)' : 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                title="Chart View"
              >
                <LineChartIcon size={16} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                style={{ 
                  padding: '6px 10px', 
                  background: viewMode === 'table' ? 'var(--border-color)' : 'transparent',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                title="Table View"
              >
                <Table size={16} />
              </button>
            </div>
          </div>

          <div style={{ flexGrow: 1, padding: '0.5rem 1rem 1rem 0', minHeight: '220px' }}>
            {viewMode === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trajectoryData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis 
                    dataKey="hours" 
                    stroke="var(--text-secondary)" 
                    tickFormatter={(val) => `${val}h`} 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
                    axisLine={{ stroke: 'var(--border-color)' }}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)" 
                    domain={[0, 1.0]} 
                    ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    labelFormatter={(label) => `${label} Hours`}
                    formatter={(value) => [value.toFixed(2), 'Severity']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="severity" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} 
                    activeDot={{ r: 6 }} 
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: '0 1rem', height: '100%', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Flight Hours</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Severity (λ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trajectoryData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 8px' }}>{row.hours}h</td>
                        <td style={{ padding: '10px 8px' }}>{row.severity.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5, borderTop: '1px solid var(--border-color)' }}>
            <p>The <strong>λ value</strong> crosses roughly: 0-0.25 "healthy/mild," 0.25-0.5 "moderate," 0.5-0.75 "severe," 0.75-1.0 "critical" — so the same curve doubles as a running RUL indicator.</p>
          </div>
        </div>
        
        <div style={{ flex: 1, borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <FaultProbabilityMatrix />
        </div>
      </div>
    </div>
  );
};

export default DegradationCauseGraph;
