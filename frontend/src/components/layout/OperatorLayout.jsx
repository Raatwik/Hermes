import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import './OperatorLayout.css';

export default function OperatorLayout({ children }) {
  const currentTime = new Date().toISOString().substring(11, 19);
  
  return (
    <div className="operator-layout">
      <header className="operator-header">
        <div className="header-left">
          <Activity className="header-logo" size={24} color="var(--color-good)" />
          <div className="header-title-block">
            <h1 className="header-title">UAV-01 <span className="title-divider">|</span> <span className="title-view">OPERATOR VIEW</span></h1>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginLeft: '2rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <Link to="/operator" style={{ color: 'var(--color-good)', fontWeight: 'bold', textDecoration: 'none', borderBottom: '2px solid var(--color-good)' }}>OPERATOR</Link>
            <Link to="/engineer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>ENGINEER</Link>
            <Link to="/maintenance" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>MAINTENANCE</Link>
          </div>
        </div>
        <div className="header-right">
          <div className="utc-time">UTC {currentTime}</div>
          <div className="link-status">
            <span className="status-dot"></span>
            LINK: GOOD
          </div>
        </div>
      </header>
      
      <main className="operator-main">
        {children}
      </main>
    </div>
  );
}
