import React, { useState } from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import MissionDetailsModal from './MissionDetailsModal';
import './PostFlightLog.css';

const mockLogs = [
  { id: 'M-142', date: '2026-08-28', duration: '08:14:00', maxRpm: 5600, anomalies: 3, riskLevel: 'High' },
  { id: 'M-141', date: '2026-08-25', duration: '06:30:00', maxRpm: 5400, anomalies: 1, riskLevel: 'Low' },
  { id: 'M-140', date: '2026-08-21', duration: '09:45:00', maxRpm: 5500, anomalies: 0, riskLevel: 'Nominal' },
];

export default function PostFlightLog() {
  const [selectedMission, setSelectedMission] = useState(null);

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-title">
        <FileText size={18} /> MISSION-WISE HEALTH HISTORY & POST-FLIGHT FINDINGS
      </div>
      
      <div className="post-flight-table-container">
        <table className="post-flight-table">
          <thead>
            <tr>
              <th>MISSION ID</th>
              <th>DATE</th>
              <th>DURATION</th>
              <th>MAX RPM</th>
              <th>ANOMALIES</th>
              <th>MISSION RISK</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mockLogs.map((log) => (
              <tr key={log.id} className={`risk-${log.riskLevel.toLowerCase()}`}>
                <td style={{ fontWeight: 'bold' }}>{log.id}</td>
                <td>{log.date}</td>
                <td>{log.duration}</td>
                <td>{log.maxRpm}</td>
                <td>
                  <span className={`anomaly-badge ${log.anomalies > 0 ? 'has-anomalies' : ''}`}>
                    {log.anomalies}
                  </span>
                </td>
                <td>
                  <span className={`risk-indicator ${log.riskLevel.toLowerCase()}`}>
                    {log.riskLevel.toUpperCase()}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn-view-details" onClick={() => setSelectedMission(log)}>
                    DETAILS <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedMission && (
        <MissionDetailsModal mission={selectedMission} onClose={() => setSelectedMission(null)} />
      )}
    </div>
  );
}
