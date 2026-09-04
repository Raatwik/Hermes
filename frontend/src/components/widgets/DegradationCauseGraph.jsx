import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { Table, LineChart as LineChartIcon } from 'lucide-react';
import FaultProbabilityMatrix from './FaultProbabilityMatrix';
import useEngineStore from '../../store/useEngineStore';

const SEVERITY_BANDS = [
  { y1: 0, y2: 0.25, label: 'Healthy', color: 'rgba(34,197,94,0.08)' },
  { y1: 0.25, y2: 0.50, label: 'Mild', color: 'rgba(234,179,8,0.08)' },
  { y1: 0.50, y2: 0.75, label: 'Moderate', color: 'rgba(249,115,22,0.08)' },
  { y1: 0.75, y2: 1.0, label: 'Severe/Critical', color: 'rgba(239,68,68,0.08)' },
];

const FAULT_COLORS = {
  misfire: '#ef4444',
  cylinder_failure: '#f97316',
  cooling_degradation: '#eab308',
  injector_abnormalities: '#8b5cf6',
  lubrication_issues: '#3b82f6',
  sensor_drift: '#06b6d4',
};

function getSeverityLabel(value) {
  if (value <= 0.25) return 'Healthy';
  if (value <= 0.50) return 'Mild';
  if (value <= 0.75) return 'Moderate';
  if (value <= 1.0) return 'Severe';
  return 'Critical';
}

const DegradationCauseGraph = () => {
  const [viewMode, setViewMode] = useState('chart');
  const timeline = useEngineStore((state) => state.degradationTimeline);

  const { chartData, faultTypes } = useMemo(() => {
    const types = new Set();
    const data = timeline.map((entry) => {
      const point = { time: entry.time, worstCase: entry.worstCase };
      for (const [ft, sev] of Object.entries(entry.faults)) {
        point[ft] = sev;
        types.add(ft);
      }
      return point;
    });
    return { chartData: data, faultTypes: [...types] };
  }, [timeline]);

  const hasData = chartData.length > 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="text-base font-bold text-primary" style={{ fontSize: '1rem' }}>ENGINE DEGRADATION TRAJECTORY</h3>
      </div>

      <div style={{ flexGrow: 1, minHeight: '300px', display: 'flex' }}>
        <div style={{ flex: 2, position: 'relative', display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '1rem 1rem 0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                {hasData ? 'Live degradation trajectory' : 'Engine degradation trajectory'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Severity λ (0=healthy, 1=critical) by simulation time (s)
              </div>
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
            {!hasData ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Waiting for fault data...
              </div>
            ) : viewMode === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  {SEVERITY_BANDS.map((band) => (
                    <ReferenceArea
                      key={band.label}
                      y1={band.y1}
                      y2={band.y2}
                      fill={band.color}
                      fillOpacity={1}
                    />
                  ))}
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="var(--text-secondary)"
                    tickFormatter={(val) => `${Math.round(val)}s`}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    domain={[0, 1.0]}
                    ticks={[0, 0.25, 0.50, 0.75, 1.0]}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickFormatter={(val) => val.toFixed(2)}
                  />
                  <ReferenceLine y={0.25} stroke="rgba(234,179,8,0.4)" strokeDasharray="3 3" />
                  <ReferenceLine y={0.50} stroke="rgba(249,115,22,0.4)" strokeDasharray="3 3" />
                  <ReferenceLine y={0.75} stroke="rgba(239,68,68,0.4)" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    labelFormatter={(label) => `Time: ${label}s`}
                    formatter={(value, name) => [
                      `${value.toFixed(3)} (${getSeverityLabel(value)})`,
                      name === 'worstCase' ? 'Worst Case' : name.replace(/_/g, ' ')
                    ]}
                  />
                  {faultTypes.length > 1 && (
                    <Line
                      type="monotone"
                      dataKey="worstCase"
                      stroke="#ffffff"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {faultTypes.map((ft) => (
                    <Line
                      key={ft}
                      type="monotone"
                      dataKey={ft}
                      stroke={FAULT_COLORS[ft] || '#3b82f6'}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: '0 1rem', height: '100%', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Time (s)</th>
                      {faultTypes.map((ft) => (
                        <th key={ft} style={{ padding: '12px 8px', color: FAULT_COLORS[ft] || 'var(--text-secondary)' }}>
                          {ft.replace(/_/g, ' ')}
                        </th>
                      ))}
                      <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 8px' }}>{row.time}s</td>
                        {faultTypes.map((ft) => (
                          <td key={ft} style={{ padding: '10px 8px' }}>
                            {row[ft] != null ? row[ft].toFixed(3) : '—'}
                          </td>
                        ))}
                        <td style={{ padding: '10px 8px' }}>{getSeverityLabel(row.worstCase)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5, borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Bands:</span>
              {SEVERITY_BANDS.map((band) => (
                <span key={band.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', background: band.color.replace(/0\.\d+\)$/, '0.5)') }} />
                  {band.label} ({band.y1}–{band.y2})
                </span>
              ))}
              {faultTypes.length > 0 && (
                <>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Faults:</span>
                  {faultTypes.map((ft) => (
                    <span key={ft} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: 10, height: 3, display: 'inline-block', background: FAULT_COLORS[ft] || '#3b82f6' }} />
                      {ft.replace(/_/g, ' ')}
                    </span>
                  ))}
                </>
              )}
            </div>
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
