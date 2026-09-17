import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './GlobalNav.css';

const GlobalNav = () => {
  return (
    <nav className="global-nav">
      <NavLink to="/operator" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>OPERATOR</NavLink>
      <NavLink to="/engineer" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>ENGINEER</NavLink>
      <NavLink to="/maintenance" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>MAINTENANCE</NavLink>
    </nav>
  );
};

export default GlobalNav;
