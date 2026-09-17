import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './GlobalNav.css';

const GlobalNav = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleTheme = (e) => {
    // Only toggle if they click on the nav background itself, not the links
    if (e.target.tagName.toLowerCase() === 'nav') {
      setIsDarkMode(!isDarkMode);
    }
  };

  return (
    <nav className="global-nav" onClick={toggleTheme} style={{ cursor: 'crosshair' }} title="Click empty space to toggle theme">
      <NavLink to="/operator" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>OPERATOR</NavLink>
      <NavLink to="/engineer" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>ENGINEER</NavLink>
      <NavLink to="/maintenance" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>MAINTENANCE</NavLink>
    </nav>
  );
};

export default GlobalNav;
