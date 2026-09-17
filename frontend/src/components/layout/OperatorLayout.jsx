import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import GlobalNav from './GlobalNav';
import './OperatorLayout.css';

export default function OperatorLayout({ children }) {
  const currentTime = new Date().toISOString().substring(11, 19);
  
  return (
    <div className="operator-layout">
      <header className="operator-header">
        <div className="header-left">
          <Activity className="header-logo" size={24} color="var(--color-good)" />
          <div className="header-title-block">
            <h1 className="header-title">MALE UAV <span className="title-divider">|</span> <span className="title-view">ROTAX914</span></h1>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginLeft: '2rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <GlobalNav />
            <Link to="/" style={{ color: '#ffffff', fontWeight: 'bold', textDecoration: 'none', padding: '4px 10px', border: '1px solid #ffffff', borderRadius: '4px' }}>LOGOUT</Link>
          </div>
        </div>
        <div className="header-right">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.75rem', color: '#a8b2d1' }}>
            <div>TAKEOFF: 09:23Z | EST. LANDING: 15:08Z</div>
            <div className="utc-time" style={{ color: '#ffffff', fontSize: '1rem', marginTop: '2px' }}>UTC {currentTime}</div>
          </div>
          <div className="operator-name-display" style={{ color: '#ffffff', fontWeight: 'bold' }}>
            OPERATOR: R. SHARMA
          </div>
        </div>
      </header>
      
      <main className="operator-main">
        {children}
      </main>
    </div>
  );
}
