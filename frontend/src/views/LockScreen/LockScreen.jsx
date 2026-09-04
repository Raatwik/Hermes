import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import headerLeftImg from '../../assets/header-left.png';
import headerRightImg from '../../assets/header-right.png';
import pmImg from '../../assets/pm.png';
import ministerImg from '../../assets/minister.png';
import minister2Img from '../../assets/minister2.png';
import './LockScreen.css';

const USERS = [
  { id: 'operator', name: 'Operator' },
  { id: 'engineer', name: 'Engineer' },
  { id: 'maintenance', name: 'Maintenance' }
];

export default function LockScreen() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e?.preventDefault();
    if (passkey === '12345') {
      navigate('/missions', { state: { role: selectedUser.id } });
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };

  return (
    <div className="govt-lockscreen-container">
      {/* Header section */}
      <div className="govt-header">
        <div className="govt-header-images-container">
          <img src={headerLeftImg} alt="Header Left" className="govt-header-left" />
          <img src={headerRightImg} alt="Header Right" className="govt-header-right" />
        </div>
        <div className="govt-header-line"></div>
      </div>

      <div className="govt-content">
        {!selectedUser ? (
          <>
            <div className="role-selection-section">
              <h2 className="govt-title">Select Authorization Level</h2>
              <div className="role-cards-container">
                {USERS.map((user) => {
                  return (
                    <button
                      key={user.id}
                      className="role-card"
                      onClick={() => setSelectedUser(user)}
                    >
                      <span className="role-name">{user.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="dignitaries-section">
              <div className="dignitary-card">
                <img src={ministerImg} alt="Minister" className="dignitary-image" />
                <p className="dignitary-title">HON'BLE RAKSHA MANTRI</p>
              </div>
              <div className="dignitary-card">
                <img src={pmImg} alt="Prime Minister" className="dignitary-image" />
                <p className="dignitary-title">HON'BLE PRIME MINISTER</p>
              </div>
              <div className="dignitary-card">
                <img src={minister2Img} alt="Minister 2" className="dignitary-image" />
                <p className="dignitary-title">HON'BLE RAKSHA RAJYA MANTRI</p>
              </div>
            </div>
          </>
        ) : (
          <div className="login-section govt-login-section">
            <button className="back-button" onClick={() => { setSelectedUser(null); setPasskey(''); setError(false); }}>
              <ArrowLeft size={16} /> Back to Selection
            </button>
            
            <div className="selected-role-display">
              <Lock size={48} className="role-icon" />
              <h2 className="user-name">{selectedUser.name} Login</h2>
            </div>
            
            <form className="login-form" onSubmit={handleLogin}>
              <div className="govt-input-group">
                <label className="govt-label">Passkey</label>
                <div className={`input-container ${error ? 'error' : ''}`}>
                  <KeyRound className="input-icon" size={18} />
                  <input
                    type="password"
                    placeholder="Enter Passkey"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="passkey-input"
                  />
                  <button type="submit" className="submit-button">
                    <ArrowRight size={18} />
                  </button>
                </div>
                {error && <p className="error-message">Incorrect passkey. Access denied.</p>}
              </div>
            </form>
          </div>
        )}
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
