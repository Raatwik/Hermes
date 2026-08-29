import React from 'react';
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
