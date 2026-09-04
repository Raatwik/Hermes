export const SEVERITY_BANDS = [
  { y1: 0, y2: 0.25, label: 'Healthy', color: 'rgba(34,197,94,0.08)' },
  { y1: 0.25, y2: 0.50, label: 'Mild', color: 'rgba(234,179,8,0.08)' },
  { y1: 0.50, y2: 0.75, label: 'Moderate', color: 'rgba(249,115,22,0.08)' },
  { y1: 0.75, y2: 0.90, label: 'Severe', color: 'rgba(239,68,68,0.08)' },
  { y1: 0.90, y2: 1.0, label: 'Critical', color: 'rgba(185,28,28,0.12)' },
];

export function getSeverityLabel(value) {
  for (let i = SEVERITY_BANDS.length - 1; i >= 0; i--) {
    if (value > SEVERITY_BANDS[i].y1) return SEVERITY_BANDS[i].label;
  }
  return SEVERITY_BANDS[0].label;
}

export function getSeverityColor(value) {
  if (value <= 0.25) return 'var(--color-good, #22c55e)';
  if (value <= 0.50) return 'var(--color-warning, #eab308)';
  if (value <= 0.75) return '#f97316';
  if (value <= 0.90) return 'var(--color-danger, #ef4444)';
  return '#b91c1c';
}

export const FAULT_COLORS = {
  misfire: '#ef4444',
  cylinder_failure: '#f97316',
  cooling_degradation: '#eab308',
  injector_abnormalities: '#8b5cf6',
  lubrication_issues: '#3b82f6',
  sensor_drift: '#06b6d4',
};
