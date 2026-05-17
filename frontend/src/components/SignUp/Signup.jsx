import React, { useState, useEffect } from 'react';
import Particles from '../Login/Particles';
import { api } from '../Common/api';
import './Signup.css';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('token_expires_at');
    
    if (token && tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('token_expires_at');
    } else if (token) {
      window.location.href = '/dashboard';
    }
  }, []);

  const validateForm = () => {
    if (!username.trim()) {
      setError('Please enter a username.');
      return false;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return false;
    }
    if (username.length > 20) {
      setError('Username must be less than 20 characters.');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return false;
    }
    if (!email.trim()) {
      setError('Please enter an email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Please enter a password.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.register(username, email, password);
      const data = await response.json();

      if (response.ok) {
        setSuccess('Account created successfully! Redirecting to login...');
        // Clear form
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(data.detail || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSignup();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Left Panel - Same as Login */}
      <div className="left-panel-signup">
        <div className="fire-bg-signup"></div>
        <Particles />
        <div className="left-content-signup">
          <span className="fire-icon-big-signup">🔥</span>
          <h1 className="left-title-signup">JOIN<br /><span>THE SYSTEM</span></h1>
          <p className="left-subtitle-signup">Create your monitoring account</p>
          <div className="stats-row-signup">
            <div className="stat-item-signup">
              <span className="num">24/7</span>
              <span className="lbl">Protection</span>
            </div>
            <div className="stat-item-signup">
              <span className="num">AI</span>
              <span className="lbl">Powered</span>
            </div>
            <div className="stat-item-signup">
              <span className="num">Instant</span>
              <span className="lbl">Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="right-panel-signup">
        <div className="signup-box">
          <div className="signup-header">
            <div className="tag">🛡️ Create Account</div>
            <h2>SIGN<br />UP</h2>
            <p>Register to access the monitoring dashboard</p>
          </div>

          <div className={`error-message-signup ${error ? 'show' : ''}`}>{error}</div>
          <div className={`success-message-signup ${success ? 'show' : ''}`}>{success}</div>

          <div className="form-group-signup">
            <label>Username</label>
            <div className="input-wrap-signup">
              <span className="input-icon-signup">👤</span>
              <input
                type="text"
                placeholder="Choose a username (3-20 chars)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group-signup">
            <label>Email Address</label>
            <div className="input-wrap-signup">
              <span className="input-icon-signup">📧</span>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group-signup">
            <label>Password</label>
            <div className="input-wrap-signup">
              <span className="input-icon-signup">🔑</span>
              <input
                type="password"
                placeholder="Create a password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-group-signup">
            <label>Confirm Password</label>
            <div className="input-wrap-signup">
              <span className="input-icon-signup">✓</span>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button className="btn-signup" onClick={handleSignup} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account →'}
          </button>

          <div className="login-link">
            Already have an account? <a href="/login">Sign In</a>
          </div>

          <div className="footer-signup">
            Fire Detection System v1.0.0 — All rights reserved
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;