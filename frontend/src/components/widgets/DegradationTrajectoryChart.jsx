import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart,
} from 'recharts';

const TRAJECTORY_DATA = [
  { t: 1, rul: 5000, egt: 403.6, rpm: 2911.8, vib: 0.036, alt: 0 },
  { t: 11, rul: 5000, egt: 690.3, rpm: 5124.5, vib: 0.048, alt: 417 },
  { t: 51, rul: 5000, egt: 801.3, rpm: 5070.7, vib: 0.048, alt: 2083 },
  { t: 101, rul: 5000, egt: 797.5, rpm: 4999.8, vib: 0.047, alt: 4167 },
  { t: 151, rul: 5000, egt: 788.1, rpm: 4890.8, vib: 0.047, alt: 5312 },
  { t: 201, rul: 5000, egt: 772.9, rpm: 4752.9, vib: 0.046, alt: 5833 },
  { t: 301, rul: 5000, egt: 742.1, rpm: 4473.3, vib: 0.044, alt: 6875 },
  { t: 401, rul: 5000, egt: 711.0, rpm: 4182.3, vib: 0.043, alt: 7917 },
  { t: 501, rul: 5000, egt: 679.5, rpm: 3887.4, vib: 0.041, alt: 8958 },
  { t: 601, rul: 5000, egt: 648.3, rpm: 3602.9, vib: 0.040, alt: 10000 },
  { t: 701, rul: 5000, egt: 646.0, rpm: 3600.0, vib: 0.040, alt: 10000 },
  { t: 801, rul: 5000, egt: 646.0, rpm: 3600.0, vib: 0.040, alt: 10000 },
  { t: 901, rul: 5000, egt: 646.0, rpm: 3600.0, vib: 0.040, alt: 10000 },
  { t: 1001, rul: 5000, egt: 646.0, rpm: 3600.0, vib: 0.040, alt: 10000 },
  { t: 1101, rul: 5000, egt: 646.0, rpm: 3600.0, vib: 0.040, alt: 10000 },
  { t: 1201, rul: 5000, egt: 646.0, rpm: 3600.0, vib: 0.040, alt: 10000 },
  { t: 1301, rul: 5000, egt: 646.0, rpm: 3600.0, vib: 0.040, alt: 10000 },
  { t: 1401, rul: 5000, egt: 646.0, rpm: 3600.0, vib: 0.040, alt: 10000 },
  { t: 1501, rul: 5000, egt: 646.0, rpm: 3600.0, vib: 0.040, alt: 10000 },
  { t: 1591, rul: 5000, egt: 646.0, rpm: 3600.0, vib: 0.040, alt: 10000 },
  { t: 1601, rul: 600, egt: 646.0, rpm: 2223.4, vib: 0.768, alt: 10000 },
  { t: 1651, rul: 550, egt: 646.0, rpm: 2220.0, vib: 0.768, alt: 10000 },
  { t: 1701, rul: 500, egt: 646.0, rpm: 2220.0, vib: 0.768, alt: 10000 },
  { t: 1751, rul: 450, egt: 646.0, rpm: 2220.0, vib: 0.768, alt: 10000 },
  { t: 1801, rul: 400, egt: 646.0, rpm: 2220.0, vib: 0.768, alt: 10000 },
  { t: 1851, rul: 350, egt: 639.5, rpm: 2154.7, vib: 0.768, alt: 10000 },
  { t: 1901, rul: 300, egt: 631.8, rpm: 2088.1, vib: 0.767, alt: 10000 },
  { t: 1951, rul: 250, egt: 624.1, rpm: 2021.4, vib: 0.767, alt: 10000 },
  { t: 2001, rul: 200, egt: 616.5, rpm: 1954.7, vib: 0.767, alt: 10000 },
  { t: 2051, rul: 150, egt: 608.8, rpm: 1888.1, vib: 0.766, alt: 10000 },
  { t: 2101, rul: 100, egt: 601.1, rpm: 1821.4, vib: 0.766, alt: 10000 },
  { t: 2151, rul: 50, egt: 592.6, rpm: 1741.0, vib: 0.766, alt: 10000 },
  { t: 2201, rul: 0, egt: 584.0, rpm: 1660.4, vib: 0.765, alt: 10000 },
  { t: 2301, rul: 0, egt: 566.6, rpm: 1499.0, vib: 0.764, alt: 10000 },
  { t: 2401, rul: 0, egt: 549.3, rpm: 1337.7, vib: 0.763, alt: 10000 },
  { t: 2501, rul: 0, egt: 541.2, rpm: 1273.1, vib: 0.763, alt: 9167 },
  { t: 2601, rul: 0, egt: 533.7, rpm: 1209.6, vib: 0.763, alt: 8333 },
  { t: 2701, rul: 0, egt: 526.1, rpm: 1146.2, vib: 0.762, alt: 7500 },
  { t: 2801, rul: 0, egt: 518.4, rpm: 1082.9, vib: 0.762, alt: 6667 },
  { t: 2901, rul: 0, egt: 510.5, rpm: 1019.7, vib: 0.762, alt: 5833 },
  { t: 2931, rul: 0, egt: 508.2, rpm: 1000.8, vib: 0.762, alt: 5583 },
];

const ATTACK_TIME = 1601;

const SERIES = {
  rul: { label: 'RUL (hrs)', color: '#22c55e', yId: 'rul' },
  egt: { label: 'EGT (°C)', color: '#f97316', yId: 'secondary' },
  rpm: { label: 'RPM', color: '#3b82f6', yId: 'secondary' },
  vib: { label: 'Vibration', color: '#ef4444', yId: 'vib' },
};

const DegradationTrajectoryChart = () => {
  const [active, setActive] = useState({ rul: true, egt: false, rpm: false, vib: false });

  const toggle = (key) => setActive((prev) => ({ ...prev, [key]: !prev[key] }));

  const anySecondary = active.egt || active.rpm;
  const secondaryDomain = [];
  if (active.egt) secondaryDomain.push(400, 850);
  if (active.rpm) secondaryDomain.push(800, 5500);
  const secMin = secondaryDomain.length ? Math.min(...secondaryDomain) : 0;
  const secMax = secondaryDomain.length ? Math.max(...secondaryDomain) : 1;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          ENGINE DEGRADATION TRAJECTORY
        </h3>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '3px', backgroundColor: 'var(--color-critical)', color: '#000' }}>
          ATTACK SCENARIO
        </span>
      </div>

      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {Object.entries(SERIES).map(([key, s]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.75rem', color: active[key] ? s.color : 'var(--text-secondary)', opacity: active[key] ? 1 : 0.5, userSelect: 'none' }}>
            <input type="checkbox" checked={active[key]} onChange={() => toggle(key)} style={{ accentColor: s.color }} />
            <span style={{ width: 12, height: 3, display: 'inline-block', background: s.color, borderRadius: 1 }} />
            {s.label}
          </label>
        ))}
      </div>

      <div style={{ flexGrow: 1, minHeight: '280px', padding: '0.5rem 0.5rem 0.5rem 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={TRAJECTORY_DATA} margin={{ top: 10, right: anySecondary ? 60 : 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis
              dataKey="t"
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickFormatter={(v) => `${Math.round(v)}s`}
              label={{ value: 'Mission Time (s)', position: 'insideBottom', offset: -12, fill: 'var(--text-secondary)', fontSize: 11 }}
            />

            {active.rul && (
              <YAxis
                yAxisId="rul"
                stroke="#22c55e"
                domain={[0, 5500]}
                tick={{ fill: '#22c55e', fontSize: 11 }}
                axisLine={{ stroke: '#22c55e' }}
                tickFormatter={(v) => `${v}h`}
                width={55}
              />
            )}

            {anySecondary && (
              <YAxis
                yAxisId="secondary"
                orientation="right"
                stroke="var(--text-secondary)"
                domain={[secMin, secMax]}
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border-color)' }}
                width={55}
              />
            )}

            {active.vib && (
              <YAxis
                yAxisId="vib"
                orientation={anySecondary ? 'left' : 'right'}
                stroke="#ef4444"
                domain={[0, 1]}
                tick={{ fill: '#ef4444', fontSize: 11 }}
                axisLine={{ stroke: '#ef4444' }}
                hide={active.rul}
                width={45}
              />
            )}

            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              labelFormatter={(v) => `T = ${v}s`}
              formatter={(value, name) => {
                if (name === 'rul') return [`${value} hrs`, 'RUL'];
                if (name === 'egt') return [`${value.toFixed(1)} °C`, 'EGT'];
                if (name === 'rpm') return [`${Math.round(value)}`, 'RPM'];
                if (name === 'vib') return [`${value.toFixed(3)}`, 'Vibration'];
                return [value, name];
              }}
            />

            <ReferenceLine
              x={ATTACK_TIME}
              yAxisId={active.rul ? 'rul' : active.vib ? 'vib' : 'secondary'}
              stroke="var(--color-critical)"
              strokeDasharray="6 3"
              strokeWidth={2}
              label={{ value: 'ATTACK ONSET', fill: 'var(--color-critical)', fontSize: 11, fontWeight: 700, position: 'top' }}
            />

            {active.rul && (
              <Area
                yAxisId="rul"
                type="monotone"
                dataKey="rul"
                stroke="#22c55e"
                strokeWidth={2}
                fill="rgba(34,197,94,0.1)"
                dot={false}
                isAnimationActive={false}
              />
            )}

            {active.egt && (
              <Line yAxisId="secondary" type="monotone" dataKey="egt" stroke="#f97316" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            )}

            {active.rpm && (
              <Line yAxisId="secondary" type="monotone" dataKey="rpm" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            )}

            {active.vib && (
              <Line yAxisId={active.rul ? 'vib' : 'vib'} type="monotone" dataKey="vib" stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Source: <b>attack_scenario_telemetry.csv</b> (2933 samples)</span>
        <span>Attack onset at <b>T=1601s</b> — RUL drops 5000→600 hrs, vibration spikes 19×</span>
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Hardcoded scenario data</span>
      </div>
    </div>
  );
};

export default DegradationTrajectoryChart;
