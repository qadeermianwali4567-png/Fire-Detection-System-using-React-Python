// Sidebar.jsx - Modified to remove activePage prop dependency
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  
  // Get current page from pathname
  const getActivePage = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path === '/incidents') return 'incidents';
    if (path === '/reports') return 'reports';
    if (path === '/performance') return 'performance';
    return 'dashboard';
  };
  
  const activePage = getActivePage();
  
  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>🔥 Fire Detection</h2>
        <p>Monitoring System</p>
      </div>
      <nav className="nav-menu">
        <Link to="/dashboard" className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}>
          <img src="/Dashboard.png" style={{ width: '42px', height: '42px', objectFit: 'contain' }} alt="Dashboard" />
          Dashboard
        </Link>
        <Link to="/incidents" className={`nav-item ${activePage === 'incidents' ? 'active' : ''}`}>
          <img src="/Incident.png" style={{ width: '42px', height: '42px', objectFit: 'contain' }} alt="Incidents" />
          Incidents
        </Link>
        <Link to="/reports" className={`nav-item ${activePage === 'reports' ? 'active' : ''}`}>
          <img src="/Reports.png" style={{ width: '42px', height: '42px', objectFit: 'contain' }} alt="Reports" />
          Reports
        </Link>
        <Link to="/performance" className={`nav-item ${activePage === 'performance' ? 'active' : ''}`}>
          <img src="/performance.png" style={{ width: '42px', height: '42px', objectFit: 'contain' }} alt="Performance" />
          Performance
        </Link>
      </nav>
      <div className="sidebar-footer">
        <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
      </div>
    </div>
  );
};

export default Sidebar;