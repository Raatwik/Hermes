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
            <Link to="/" style={{ color: 'var(--color-critical)', fontWeight: 'bold', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--color-critical)', borderRadius: '4px' }}>LOGOUT</Link>
          </div>
        </div>
        <div className="header-right">
          <div className="utc-time">UTC {currentTime}</div>
          <div className="operator-name-display" style={{ color: '#000080', fontWeight: 'bold' }}>
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
