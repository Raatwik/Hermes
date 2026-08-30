import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import useEngineStore from '../../store/useEngineStore';

const TwinDriftChart = () => {
  const data = useEngineStore((state) => state.timeSeriesData);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
        <h3 className="text-sm font-semibold text-primary">DIGITAL TWIN DRIFT SCORE (D*k)</h3>
        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Threshold: 0.50</span>
      </div>
      <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Trend (s): </span>
          <span style={{ fontWeight: 'bold', color: 'var(--color-warning)' }}>+0.012 / min</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Persistence (P): </span>
          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>4 mins</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Composite: </span>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>αD* + β|s| + γP</span>
        </div>
      </div>
      <div style={{ flexGrow: 1, minHeight: '200px', padding: '1rem 0.5rem 0.5rem 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} 
              tickMargin={10} 
              minTickGap={20}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
            />
            <YAxis 
              domain={[0, 1]} 
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} 
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }} 
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            <ReferenceLine y={0.50} stroke="var(--color-critical)" strokeDasharray="3 3" />
            <Line 
              type="monotone" 
              dataKey="drift" 
              stroke="var(--color-warning)" 
              strokeWidth={2} 
              dot={false} 
              activeDot={{ r: 4 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TwinDriftChart;
