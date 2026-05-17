import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../Layout/Sidebar';
import { api } from '../Common/api';
import './Incidents.css';

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const perPage = 10;

  const loadIncidents = useCallback(async (page = 1, status = statusFilter) => {
    setLoading(true);
    try {
      const data = await api.getIncidents(page, perPage, status);
      setIncidents(data.incidents || []);
      setTotalPages(Math.ceil(data.total / perPage));
      setTotalIncidents(data.total);
      setCurrentPage(page);
    } catch (e) {
      console.error('Failed to load incidents:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    loadIncidents(1);
  }, [loadIncidents]);

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatusFilter(newStatus);
    loadIncidents(1, newStatus);
  };

  const handlePageChange = (direction) => {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
      loadIncidents(newPage);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.updateIncidentStatus(id, status);
      loadIncidents(currentPage);
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const deleteIncident = async (id) => {
    if (!window.confirm('Are you sure you want to delete this incident?')) return;
    try {
      await api.deleteIncident(id);
      loadIncidents(currentPage);
    } catch (e) {
      console.error('Failed to delete incident:', e);
    }
  };

  const exportCSV = async () => {
    try {
      const data = await api.exportCSV();
      if (data.success && data.data) {
        const blob = new Blob([data.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fire_incidents_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'new': return 'badge-new';
      case 'acknowledged': return 'badge-acknowledged';
      case 'resolved': return 'badge-resolved';
      default: return '';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <Sidebar activePage="incidents" />
      <main className="main">
        <div className="page-header">
          <div>
            <h1>Fire Incidents</h1>
            <p>Complete history of all detected fire incidents</p>
          </div>
        </div>

        <div className="filters">
          <select className="filter-select" value={statusFilter} onChange={handleStatusChange}>
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <button className="btn-export" onClick={exportCSV}>⬇ Export CSV</button>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Camera</th>
                <th>Location</th>
                <th>Confidence</th>
                <th>Detected At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="loading">Loading incidents...</td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="loading">No incidents found</td>
                </tr>
              ) : (
                incidents.map(inc => (
                  <tr key={inc.id}>
                    <td>
                      {console.log(inc.frame_path)}
                      {inc.frame_path ? (
                       
                        <img 
                          src={`/static/captured_frames/${inc.frame_path.split('/').pop()}`} 
                          className="thumbnail" 
                          alt="Incident"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      ) : (
                        <div className="thumbnail-placeholder">🔥</div>
                      )}
                    </td>
                    <td>{inc.camera_name}</td>
                    <td>{inc.location}</td>
                    <td style={{ color: '#e53e3e' }}>{(inc.confidence_score * 100).toFixed(1)}%</td>
                    <td>{formatDate(inc.detected_at)}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(inc.status)}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td>
                      {inc.status !== 'acknowledged' && (
                        <button className="btn-action" onClick={() => updateStatus(inc.id, 'acknowledged')}>
                          Acknowledge
                        </button>
                      )}
                      {inc.status !== 'resolved' && (
                        <button className="btn-action" onClick={() => updateStatus(inc.id, 'resolved')}>
                          Resolve
                        </button>
                      )}
                      <button className="btn-action" onClick={() => deleteIncident(inc.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="pagination">
            <div className="pagination-info">
              Showing {incidents.length} of {totalIncidents} incidents
            </div>
            <div className="pagination-btns">
              <button 
                className="btn-page" 
                onClick={() => handlePageChange(-1)} 
                disabled={currentPage <= 1}
              >
                ← Prev
              </button>
              <button 
                className="btn-page" 
                onClick={() => handlePageChange(1)} 
                disabled={currentPage >= totalPages}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Incidents;