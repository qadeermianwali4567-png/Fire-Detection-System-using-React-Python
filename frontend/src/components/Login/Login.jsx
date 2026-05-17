import React, { useState, useEffect } from 'react';
import Particles from './Particles';
import { api } from '../Common/api';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('token_expires_at');
    
    // Check if existing token is expired
    if (token && tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
      // Token expired, clear it
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('token_expires_at');
    } else if (token) {
      // Token exists and is still valid, redirect to dashboard
      window.location.href = '/dashboard';
    }
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.login(username, password);
      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', data.username);
        
        // Store token expiration time
        if (data.expires_in) {
          // If backend provides expires_in (seconds)
          const expiresAt = Date.now() + (data.expires_in * 1000);
          localStorage.setItem('token_expires_at', expiresAt.toString());
        } else {
          // Try to decode JWT to get expiration
          try {
            const payload = JSON.parse(atob(data.access_token.split('.')[1]));
            if (payload.exp) {
              localStorage.setItem('token_expires_at', (payload.exp * 1000).toString());
            } else {
              // Default to 24 hours if no expiration info available
              const defaultExpiry = Date.now() + (24 * 60 * 60 * 1000);
              localStorage.setItem('token_expires_at', defaultExpiry.toString());
            }
          } catch (e) {
            console.warn('Could not decode token, using default expiration');
            // Default to 24 hours
            const defaultExpiry = Date.now() + (24 * 60 * 60 * 1000);
            localStorage.setItem('token_expires_at', defaultExpiry.toString());
          }
        }
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        setError(data.detail || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Left Panel */}
      <div className="left-panel">
        <div className="fire-bg"></div>
        <Particles />
        <div className="left-content">
          <span className="fire-icon-big">🔥</span>
          <h1 className="left-title">FIRE<br /><span>DETECTION</span></h1>
          <p className="left-subtitle">AI Powered Monitoring System</p>
          <div className="stats-row-login">
            <div className="stat-item">
              <span className="num">99%</span>
              <span className="lbl">Accuracy</span>
            </div>
            <div className="stat-item">
              <span className="num">24/7</span>
              <span className="lbl">Monitoring</span>
            </div>
            <div className="stat-item">
              <span className="num">RT</span>
              <span className="lbl">Real-Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="login-box">
          <div className="login-header">
            <div className="tag">🔒 Secure Access</div>
            <h2>ADMIN<br />PORTAL</h2>
            <p>Sign in to access the monitoring dashboard</p>
          </div>

          <div className={`error-message ${error ? 'show' : ''}`}>{error}</div>

          <div className="form-group">
            <label>Username</label>
            <div className="input-wrap">
              <span className="input-icon">👤</span>
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrap">
              <span className="input-icon">🔑</span>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button className="btn-login" onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>

          {/* Don't have an account link */}
          <div className="signup-redirect">
            Don't have an account? <a href="/signup">Create Account</a>
          </div>

          <div className="footer">
            Fire Detection System v1.0.0 — All rights reserved
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;