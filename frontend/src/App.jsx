import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import OperatorDashboard from './views/Operator/OperatorDashboard';
// import EngineerDashboard from './views/Engineer/EngineerDashboard';
// import MaintenanceDashboard from './views/Maintenance/MaintenanceDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/operator" replace />} />
        <Route path="/operator/*" element={<OperatorDashboard />} />
        {/* <Route path="/engineer/*" element={<EngineerDashboard />} /> */}
        {/* <Route path="/maintenance/*" element={<MaintenanceDashboard />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
