---
labels: ["done"]
---
# [wayfinder:task] Frontend: Architect & Development

## Problem Statement

We need a modular, low-latency React web application to serve as the interface for the MALE-UAV Digital Twin. It must support three distinct operational roles—Operator, Propulsion Engineer, and Maintenance—each requiring unique insights such as real-time telemetry, AI prescriptions, what-if counterfactual sandboxing, and degradation trends.

## Solution

We will build a React frontend located in the `/frontend` directory at the repository root. The architecture will separate concerns into `api/` (for WebSocket telemetry and REST queries), `components/` (reusable UI elements and charts), `views/` (role-specific dashboard routes), and `store/` (for managing live state).

## User Stories

1. **As an Operator**, I want to view mission status, high-level alerts, Equipment Health Indicators (EHI), Remaining Useful Life (RUL), and counterfactual decision support at `/operator`.
2. **As a Propulsion Engineer**, I want to analyze telemetry vs. physics residuals, view a degradation cause graph (XAI), assess fault probabilities, and use a what-if simulation sandbox at `/engineer`.
3. **As a Maintenance user**, I want to review lifecycle degradation trends, perform component-level triage, write-back post-flight findings, and generate work orders at `/maintenance`.

## Implementation Decisions

- **Directory & Component Architecture:** The frontend will live in `/frontend`.
- **API Integration:** `api/websocket.js` will handle streaming telemetry for Operator and Engineer views. `api/restClient.js` will handle REST queries for historical mission and maintenance logs.
- **Shared Components:** Reusable `charts/` (TimeSeriesChart, DegradationGraph, Gauges), `widgets/` (TelemetryCards, HealthIndicators, AlertBanners), and `layout/` (Sidebar navigation, Topbar with UTC/Link status).
- **Views/Routes:** Separate directories under `views/` for `Operator`, `Engineer`, and `Maintenance` dashboards. Managed via React Router (`App.jsx`).
- **State Management:** Live telemetry state will be managed centrally in `store/telemetryStore.js` (e.g. using Zustand/Redux/Context).

## Testing Decisions

- **Routing:** Verify React Router navigates correctly between `/operator`, `/engineer`, and `/maintenance`.
- **Component Rendering:** Ensure shell components and layout wrappers render without errors.
- **API Modules:** Verify structural exports and dummy interfaces for websockets and REST clients.

## Out of Scope

- Full implementation of D3/Recharts data visualizations (to be handled in separate UI/UX tasks).
- Real backend websocket integration (will use mock data or wait for backend readiness).

## Further Notes

- Synchronize with the backend team to agree on the exact WebSocket payloads (telemetry schema) and REST API endpoints.

## Resolutions & Progress

**Operator Dashboard (`/frontend/src/views/Operator`)**
- Implemented `OperatorDashboard.jsx` layout utilizing a sidebar and main content area.
- Added live telemetry tracking via `TelemetryTable` (RPM, Oil Pressure, Oil Temperature, and individual cylinder EGT/CHT metrics).
- Built widgets for `SidebarSummaryPanel` (health, risk), `RulWidget` (Remaining Useful Life), and `MissionProgress` with different flight phases.
- Integrated `AlertBanner` for mock warnings and a `RecommendationBanner` for receiving active mitigations from the Propulsion Engineer.
- Handled state via Zustand store (`useEngineStore`).

**Propulsion Engineer Dashboard (`/frontend/src/views/Engineer`)**
- Implemented `EngineerDashboard.jsx` grid layout for detailed diagnostics and twin comparison.
- Added a Mission Context Bar displaying Phase, Altitude, RPM, Engine Load, OAT, MAP, and Fuel Flow.
- Built and integrated key widgets: `FaultProbabilityMatrix`, `EngineHealthWidget`, `DegradationCauseGraph`, `TwinDriftChart`, and `ResidualTimeSeries`.
- Added what-if capability via `MissionSandboxWidget` and `TwinComparisonWidget`.
- Connected to live telemetry state via `connectLiveTelemetry` in `useEngineStore`.
