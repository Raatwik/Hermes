import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import useEngineStore from '../../store/useEngineStore';

const SOURCE_LABELS = {
  lstm: 'LSTM',
  simulation: 'SIM TIMER',
};

const SOURCE_COLORS = {
  lstm: 'var(--color-good, #22c55e)',
  simulation: 'var(--color-warning, #eab308)',
};

const RulTrajectoryChart = () => {
  const timeline = useEngineStore((state) => state.rulTimeline);
  const rulSource = useEngineStore((state) => state.missionContext.rulSource);

  const { chartData, hasConfidence, yDomain } = useMemo(() => {
    const hasCi = timeline.some((pt) => pt.lower != null && pt.upper != null);
    let yMin = Infinity;
    let yMax = -Infinity;
    const data = timeline.map((pt) => {
      const lower = pt.lower ?? pt.mean;
      const upper = pt.upper ?? pt.mean;
      if (lower < yMin) yMin = lower;
      if (upper > yMax) yMax = upper;
      if (pt.mean < yMin) yMin = pt.mean;
      if (pt.mean > yMax) yMax = pt.mean;
      return {
        time: pt.time,
        mean: pt.mean,
        lower,
        upper,
        band: [lower, upper],
      };
    });
    const padding = (yMax - yMin) * 0.1 || 50;
    return {
      chartData: data,
      hasConfidence: hasCi,
      yDomain: [Math.max(0, Math.floor(yMin - padding)), Math.ceil(yMax + padding)],
    };
  }, [timeline]);

  const hasData = chartData.length > 0;
  const sourceLabel = SOURCE_LABELS[rulSource] || rulSource || '—';
  const sourceColor = SOURCE_COLORS[rulSource] || 'var(--text-secondary)';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          RUL TRAJECTORY
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>SOURCE</span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '3px',
            backgroundColor: sourceColor,
            color: '#000',
          }}>
            {sourceLabel}
          </span>
        </div>
      </div>

      <div style={{ flexGrow: 1, minHeight: '250px', padding: '0.5rem 1rem 1rem 0' }}>
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Waiting for RUL data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
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
                domain={yDomain}
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border-color)' }}
                tickFormatter={(val) => `${Math.round(val)}h`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                labelFormatter={(label) => `Time: ${label}s`}
                formatter={(value, name) => {
                  if (name === 'mean') return [`${value.toFixed(1)} hrs`, 'RUL (μ)'];
                  if (name === 'band') return [`${value[0].toFixed(1)} – ${value[1].toFixed(1)} hrs`, '95% CI'];
                  return [value, name];
                }}
              />
              {hasConfidence && (
                <Area
                  type="monotone"
                  dataKey="band"
                  stroke="none"
                  fill="rgba(34,197,94,0.15)"
                  isAnimationActive={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="mean"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 12, height: 3, display: 'inline-block', background: '#22c55e' }} />
          RUL (μ)
        </span>
        {hasConfidence && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 12, height: 8, display: 'inline-block', background: 'rgba(34,197,94,0.3)', borderRadius: 2 }} />
            ±2σ confidence band
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
          RUL is a probabilistic estimate — not an exact countdown
        </span>
      </div>
    </div>
  );
};

export default RulTrajectoryChart;
