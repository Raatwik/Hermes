const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function postWhatIf({ throttle, altitude, currentState }) {
  const res = await fetch(`${API_BASE}/api/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      throttle,
      altitude,
      current_state: currentState ?? null,
    }),
  });
  if (!res.ok) {
    throw new Error(`What-If request failed: ${res.status}`);
  }
  return res.json();
}
