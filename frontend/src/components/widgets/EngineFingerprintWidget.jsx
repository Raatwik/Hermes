import React, { useMemo } from 'react';
import useEngineStore from '../../store/useEngineStore';

const SENSOR_LABELS = {
  rpm: 'RPM',
  cht: 'CHT',
  egt: 'EGT',
  oil_pressure: 'Oil Press',
  oil_temp: 'Oil Temp',
  fuel_flow: 'Fuel Flow',
  battery_voltage: 'Battery V',
  vibration_index: 'Vibration',
  engine_load: 'Load',
  injection_timing: 'Inj Timing',
  egt_1: 'EGT C1',
  egt_2: 'EGT C2',
  egt_3: 'EGT C3',
  egt_4: 'EGT C4',
};

const SIGMA_TIERS = [
  { max: 1.0, color: 'var(--color-good, #22c55e)', label: 'Normal' },
  { max: 2.0, color: 'var(--color-warning, #eab308)', label: 'Mild' },
  { max: 3.0, color: '#f97316', label: 'Notable' },
  { max: Infinity, color: 'var(--color-danger, #ef4444)', label: 'Anomalous' },
];

const OVERALL_TIERS = [
  { max: 1.5, color: 'var(--color-good, #22c55e)' },
  { max: 2.5, color: 'var(--color-warning, #eab308)' },
  { max: 3.5, color: '#f97316' },
  { max: Infinity, color: 'var(--color-danger, #ef4444)' },
];

const _tierLookup = (tiers, value) => tiers.find(t => value <= t.max) || tiers[tiers.length - 1];

const getDeviationColor = (absZ) => _tierLookup(SIGMA_TIERS, absZ).color;
const getDeviationLabel = (absZ) => _tierLookup(SIGMA_TIERS, absZ).label;
const getOverallColor = (score) => _tierLookup(OVERALL_TIERS, score).color;

const STATUS_CONFIG = {
  ready: { color: 'var(--color-good, #22c55e)', label: 'BASELINED' },
  learning: { color: 'var(--color-warning, #eab308)', label: 'LEARNING' },
  new: { color: 'var(--text-secondary)', label: 'NEW' },
};

const EngineFingerprintWidget = () => {
  const fingerprint = useEngineStore((state) => state.fingerprint);
  const isLive = useEngineStore((state) => state.isLive);

  const sortedResiduals = useMemo(() => {
    if (!fingerprint?.residuals) return [];
    return Object.entries(fingerprint.residuals)
      .map(([sensor, zScore]) => ({
        sensor,
        label: SENSOR_LABELS[sensor] || sensor,
        zScore,
        absZ: Math.abs(zScore),
      }))
      .sort((a, b) => b.absZ - a.absZ);
  }, [fingerprint]);

  if (!isLive || !fingerprint) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>ENGINE FINGERPRINT</h3>
        </div>
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Awaiting telemetry data...
        </div>
      </div>
    );
  }

  const { status, sample_count, min_samples, progress, deviation_score, engine_id } = fingerprint;
  const isLearning = status !== 'ready';
  const { color: statusColor, label: statusLabel } = STATUS_CONFIG[status] || STATUS_CONFIG.new;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          ENGINE FINGERPRINT
          <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
            {engine_id}
          </span>
        </h3>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '3px', backgroundColor: statusColor, color: '#000' }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ padding: '1rem', display: 'flex', gap: '1.5rem', flexGrow: 1 }}>
        {/* Left: Status summary */}
        <div style={{ minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {isLearning ? (
            <>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Baseline Progress</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', maxWidth: '100px' }}>
                    <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: statusColor, transition: 'width 0.4s ease', borderRadius: '4px' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: statusColor }}>{Math.round(progress * 100)}%</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Samples</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{sample_count} / {min_samples}</div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '0.25rem' }}>
                Collecting healthy-operation baseline. Physics-only residuals active until baseline is ready.
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Deviation Score</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: getOverallColor(deviation_score ?? 0), lineHeight: 1 }}>
                  {deviation_score != null ? deviation_score.toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>σ RMS from baseline</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Samples</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{sample_count}</div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '0.25rem' }}>
                Deviation from this engine's learned normal. Independent of digital-twin physics model.
              </div>
            </>
          )}
        </div>

        {/* Right: Per-sensor residuals */}
        {!isLearning && sortedResiduals.length > 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Per-Sensor Z-Score (σ from baseline)</div>
            {sortedResiduals.map(({ sensor, label, zScore, absZ }) => {
              const barWidth = Math.min(100, absZ * 25);
              return (
                <div key={sensor} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', width: '75px', textAlign: 'right', flexShrink: 0 }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      backgroundColor: getDeviationColor(absZ),
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: getDeviationColor(absZ), width: '70px', textAlign: 'right', fontWeight: 600 }}>
                    {zScore > 0 ? '+' : ''}{zScore.toFixed(2)}σ
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', width: '55px' }}>
                    {getDeviationLabel(absZ)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EngineFingerprintWidget;
