import React from 'react';
import {
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import useEngineStore from '../../store/useEngineStore';

const ResidualTimeSeries = () => {
  const data = useEngineStore((state) => state.timeSeriesData);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold text-primary">SENSOR TRENDS – ACTUAL vs TWIN-EXPECTED</h3>
      </div>
      
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem 0.5rem 0.5rem 0' }}>
        {/* Main Chart: Expected vs Actual EGT */}
        <div style={{ flex: '2', minHeight: '150px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} syncId="residualSync" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis 
                domain={['dataMin - 10', 'dataMax + 10']} 
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }} 
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
              <Line type="monotone" dataKey="actualEGT" name="Actual EGT" stroke="var(--color-good)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expectedEGT" name="Twin Expected" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sub-Chart: Residuals with Confidence Bounds */}
        <div style={{ flex: '1', minHeight: '100px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} syncId="residualSync" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                domain={[-25, 25]} 
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} 
                axisLine={false}
                tickLine={false}
                tickCount={3}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }} 
              />
              <ReferenceLine y={0} stroke="var(--border-color)" />
              {/* Using Area for upper and lower bounds */}
              <Area type="monotone" dataKey="upperBound" stroke="none" fill="var(--bg-primary)" fillOpacity={0.5} name="Upper +2σ" />
              <Area type="monotone" dataKey="lowerBound" stroke="none" fill="var(--bg-card)" fillOpacity={1} name="Lower -2σ" />
              <Line type="monotone" dataKey="residual" name="Residual (Actual - Expected)" stroke="var(--color-warning)" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ResidualTimeSeries;
