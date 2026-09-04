import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import headerLeftImg from '../../assets/header-left.png';
import headerRightImg from '../../assets/header-right.png';
import './MissionSelection.css';

const ACTIVE_MISSIONS = [
  {
    id: 'm3',
    name: 'Operation HERMES (Ongoing)',
    uav: 'TAPAS BH-201',
    operator: 'R. Sharma',
    engineer: 'Dr. V. Kumar',
    maintenance: 'Crew Alpha-4',
    progress: 78
  },
  {
    id: 'm4',
    name: 'Operation TRIDENT (Monitoring)',
    uav: 'Rustom-II',
    operator: 'A. Patel',
    engineer: 'Dr. S. Reddy',
    maintenance: 'Crew Beta-1',
    progress: 34
  }
];

export default function MissionSelection() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = location.state?.role;

  if (!role) {
    return <Navigate to="/" replace />;
  }

  const handleMissionSelect = (missionId, status) => {
    if (status === 'active') {
      navigate(`/${role}`);
    } else {
      alert('Only active missions can be accessed at this time.');
    }
  };

  return (
    <div className="mission-container">
      {/* Header section */}
      <div className="govt-header">
        <div className="govt-header-images-container">
          <img src={headerLeftImg} alt="Header Left" className="govt-header-left" />
          <img src={headerRightImg} alt="Header Right" className="govt-header-right" />
        </div>
        <div className="govt-header-line"></div>
      </div>

      <div className="mission-content-wrapper">
        
        {/* Left Sidebar for Past and Upcoming Missions */}
        <aside className="mission-sidebar">
          <div className="sidebar-section">
            <h2 className="sidebar-heading">Past Missions</h2>
            <div className="sidebar-list">
              <button className="sidebar-item" onClick={() => handleMissionSelect('m1', 'past')}>
                Mission ALPHA-1
              </button>
              <button className="sidebar-item" onClick={() => handleMissionSelect('m2', 'past')}>
                Mission BETA-3
              </button>
              <button className="sidebar-item" onClick={() => handleMissionSelect('m2b', 'past')}>
                Operation VINDHYA
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h2 className="sidebar-heading">Upcoming Missions</h2>
            <div className="sidebar-list">
              <button className="sidebar-item" onClick={() => handleMissionSelect('m5', 'upcoming')}>
                Project GAGANYAAN-X
              </button>
              <button className="sidebar-item" onClick={() => handleMissionSelect('m6', 'upcoming')}>
                VAYU-2 Deployment
              </button>
              <button className="sidebar-item" onClick={() => handleMissionSelect('m7', 'upcoming')}>
                Recon Mission ZETA
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace for Active Missions */}
        <main className="mission-workspace">
          <h1 className="workspace-title">Active Missions Directory</h1>
          
          <div className="active-missions-grid">
            {ACTIVE_MISSIONS.map(mission => (
              <div 
                key={mission.id} 
                className="active-mission-card" 
                onClick={() => handleMissionSelect(mission.id, 'active')}
              >
                <div className="card-header">
                  <h3 className="mission-name">{mission.name}</h3>
                  <span className="status-indicator">LIVE</span>
                </div>
                
                <div className="mission-details">
                  <div className="detail-row">
                    <span className="detail-label">Assigned UAV:</span>
                    <span className="detail-val">{mission.uav}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Lead Operator:</span>
                    <span className="detail-val">{mission.operator}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Chief Engineer:</span>
                    <span className="detail-val">{mission.engineer}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Maintenance:</span>
                    <span className="detail-val">{mission.maintenance}</span>
                  </div>
                </div>

                <div className="progress-section">
                  <div className="progress-header">
                    <span className="progress-title">Mission Progress</span>
                    <span className="progress-percentage">{mission.progress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${mission.progress}%` }}
                    ></div>
                  </div>
                </div>

                <button className="enter-mission-btn">ENTER MISSION</button>
              </div>
            ))}
          </div>
        </main>

      </div>
      
      <div className="drdo-ticker-band">
        <div className="ticker-track">
          <span className="ticker-text">
            ⚠️ SYSTEM CLASSIFIED FOR AUTHORIZED PERSONNEL ONLY • ALL ACTIVITIES ARE MONITORED • DEFENCE RESEARCH & DEVELOPMENT ORGANISATION • RESTRICTED ACCESS AREA • 
          </span>
          <span className="ticker-text" aria-hidden="true">
            ⚠️ SYSTEM CLASSIFIED FOR AUTHORIZED PERSONNEL ONLY • ALL ACTIVITIES ARE MONITORED • DEFENCE RESEARCH & DEVELOPMENT ORGANISATION • RESTRICTED ACCESS AREA • 
          </span>
        </div>
      </div>
    </div>
  );
}
