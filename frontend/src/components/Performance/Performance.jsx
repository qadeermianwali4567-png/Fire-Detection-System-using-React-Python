import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../Layout/Sidebar';
import { api } from '../Common/api';
import Chart from 'chart.js/auto';
import './Performance.css';

const Performance = () => {
  const [metrics, setMetrics] = useState({
    precision: 0,
    recall: 0,
    map50: 0,
    fps: 0,
    model_version: 'fire_model',
    recorded_at: '—'
  });
  const [totalRecords, setTotalRecords] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    precision: '',
    recall: '',
    map50: '',
    map5095: '',
    fps: ''
  });
  
  const prChartRef = useRef(null);
  const mapChartRef = useRef(null);
  const prChartInstanceRef = useRef(null);
  const mapChartInstanceRef = useRef(null);

  const loadPerformance = useCallback(async () => {
    try {
      const data = await api.getPerformanceSummary();
      console.log("performance data : ",data)
      if (!data.success) return;

      const p = data.latest;
      setMetrics({
        precision: p.precision || 0,
        recall: p.recall || 0,
        map50: p.map50 || 0,
        fps: p.fps || 0,
        model_version: p.model_version || 'fire_model',
        recorded_at: p.recorded_at || '—'
      });
      setTotalRecords(data.total_records || 0);
    } catch (e) {
      console.error('Failed to load performance:', e);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.getPerformanceHistory(10);
      if (!data.length) return;

      const labels = data.map(d => new Date(d.recorded_at).toLocaleDateString()).reverse();
      const prec = data.map(d => (d.precision * 100).toFixed(1)).reverse();
      const rec = data.map(d => (d.recall * 100).toFixed(1)).reverse();
      const map50 = data.map(d => (d.map50 * 100).toFixed(1)).reverse();
      const map5095 = data.map(d => (d.map50_95 * 100).toFixed(1)).reverse();

      // Destroy existing charts if they exist
      if (prChartInstanceRef.current) {
        prChartInstanceRef.current.destroy();
      }
      if (mapChartInstanceRef.current) {
        mapChartInstanceRef.current.destroy();
      }

      // Create Precision-Recall Chart
      if (prChartRef.current) {
        const ctx1 = prChartRef.current.getContext('2d');
        const newPrChart = new Chart(ctx1, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Precision',
                data: prec,
                borderColor: '#63b3ed',
                backgroundColor: 'rgba(99,179,237,0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#63b3ed',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
              {
                label: 'Recall',
                data: rec,
                borderColor: '#68d391',
                backgroundColor: 'rgba(104,211,145,0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#68d391',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                labels: { color: '#555', font: { size: 12, weight: 'bold' } },
                position: 'top',
              },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.dataset.label}: ${context.raw}%`
                }
              }
            },
            scales: {
              x: { 
                ticks: { color: '#555' }, 
                grid: { color: '#e2e8f0' },
                title: {
                  display: true,
                  text: 'Date',
                  color: '#555'
                }
              },
              y: { 
                ticks: { color: '#555' }, 
                grid: { color: '#e2e8f0' }, 
                beginAtZero: true, 
                max: 100,
                title: {
                  display: true,
                  text: 'Percentage (%)',
                  color: '#555'
                }
              },
            }
          }
        });
        prChartInstanceRef.current = newPrChart;
      }

      // Create mAP Chart
      if (mapChartRef.current) {
        const ctx2 = mapChartRef.current.getContext('2d');
        const newMapChart = new Chart(ctx2, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'mAP50',
                data: map50,
                borderColor: '#e53e3e',
                backgroundColor: 'rgba(229,62,62,0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#e53e3e',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
              {
                label: 'mAP50-95',
                data: map5095,
                borderColor: '#ecc94b',
                backgroundColor: 'rgba(236,201,75,0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ecc94b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                labels: { color: '#555', font: { size: 12, weight: 'bold' } },
                position: 'top',
              },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.dataset.label}: ${context.raw}%`
                }
              }
            },
            scales: {
              x: { 
                ticks: { color: '#555' }, 
                grid: { color: '#e2e8f0' },
                title: {
                  display: true,
                  text: 'Date',
                  color: '#555'
                }
              },
              y: { 
                ticks: { color: '#555' }, 
                grid: { color: '#e2e8f0' }, 
                beginAtZero: true, 
                max: 100,
                title: {
                  display: true,
                  text: 'Percentage (%)',
                  color: '#555'
                }
              },
            }
          }
        });
        mapChartInstanceRef.current = newMapChart;
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []); // Remove prChart and mapChart dependencies since we use refs

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadPerformance(), loadHistory()]);
      setIsLoading(false);
    };
    
    loadData();
    
    // Cleanup charts on unmount
    return () => {
      if (prChartInstanceRef.current) {
        prChartInstanceRef.current.destroy();
      }
      if (mapChartInstanceRef.current) {
        mapChartInstanceRef.current.destroy();
      }
    };
  }, [loadPerformance, loadHistory]); // Remove prChart and mapChart from dependencies

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const showRecordForm = () => {
    setShowForm(true);
    setShowSuccess(false);
  };

  const hideRecordForm = () => {
    setShowForm(false);
    setFormData({
      precision: '',
      recall: '',
      map50: '',
      map5095: '',
      fps: ''
    });
  };

  const saveMetrics = async () => {
    const { precision, recall, map50, map5095, fps } = formData;
    
    if (!precision || !recall || !map50 || !map5095 || !fps) {
      alert('Please fill in all fields.');
      return;
    }

    const payload = {
      precision: parseFloat(precision),
      recall: parseFloat(recall),
      map50: parseFloat(map50),
      map50_95: parseFloat(map5095),
      fps: parseFloat(fps),
      model_version: 'fire_model',
    };

    try {
      await api.recordPerformanceMetrics(payload);
      hideRecordForm();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      await Promise.all([loadPerformance(), loadHistory()]);
    } catch (e) {
      console.error('Failed to save metrics:', e);
      alert('Server error. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div>
        <Sidebar activePage="performance" />
        <main className="main">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading performance data...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Sidebar activePage="performance" />
      <main className="main">
        <div className="page-header">
          <h1>Model Performance</h1>
          <p>Fire detection model metrics and accuracy tracking</p>
        </div>

        <div className="info-card">
          <h3>📊 Model Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Model Name</div>
              <div className="info-value">{metrics.model_version}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Last Updated</div>
              <div className="info-value">{metrics.recorded_at !== '—' ? new Date(metrics.recorded_at).toLocaleString() : '—'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Total Records</div>
              <div className="info-value">{totalRecords}</div>
            </div>
          </div>
        </div>

        <div className="metrics-row">
          <div className="metric-card">
            <div className="icon">🎯</div>
            <div className="label">Precision</div>
            <div className="value" style={{ color: '#63b3ed' }}>
              {(metrics.precision * 100).toFixed(1)}%
            </div>
            <div className="subtitle">Accuracy of detections</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ background: '#63b3ed', width: `${metrics.precision * 100}%` }}></div>
            </div>
          </div>
          <div className="metric-card">
            <div className="icon">📊</div>
            <div className="label">Recall</div>
            <div className="value" style={{ color: '#68d391' }}>
              {(metrics.recall * 100).toFixed(1)}%
            </div>
            <div className="subtitle">Fires correctly found</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ background: '#68d391', width: `${metrics.recall * 100}%` }}></div>
            </div>
          </div>
          <div className="metric-card">
            <div className="icon">📈</div>
            <div className="label">mAP50</div>
            <div className="value" style={{ color: '#e53e3e' }}>
              {(metrics.map50 * 100).toFixed(1)}%
            </div>
            <div className="subtitle">Mean average precision</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ background: '#e53e3e', width: `${metrics.map50 * 100}%` }}></div>
            </div>
          </div>
          <div className="metric-card">
            <div className="icon">⚡</div>
            <div className="label">FPS</div>
            <div className="value" style={{ color: '#ecc94b' }}>
              {typeof metrics.fps === 'number' ? metrics.fps.toFixed(1) : '0.0'}
            </div>
            <div className="subtitle">Frames per second</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ background: '#ecc94b', width: `${Math.min((metrics.fps / 60) * 100, 100)}%` }}></div>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>📈 Precision & Recall History</h3>
            <div className="chart-wrapper">
              <canvas id="precisionRecallChart" ref={prChartRef}></canvas>
            </div>
          </div>
          <div className="chart-card">
            <h3>🎯 mAP Score History</h3>
            <div className="chart-wrapper">
              <canvas id="mapChart" ref={mapChartRef}></canvas>
            </div>
          </div>
        </div>

        <button className="btn-record" onClick={showRecordForm}>
          + Record New Performance Metrics
        </button>

        {showSuccess && (
          <div className="success-msg">
            ✅ Metrics saved successfully!
          </div>
        )}

        {showForm && (
          <div className="record-form" style={{ display: 'block' }}>
            <h3>Record New Metrics</h3>
            <div className="form-inputs">
              <div className="form-group">
                <label>Precision (0-1)</label>
                <input
                  type="number"
                  name="precision"
                  value={formData.precision}
                  onChange={handleInputChange}
                  min="0"
                  max="1"
                  step="0.01"
                  placeholder="e.g. 0.85"
                />
              </div>
              <div className="form-group">
                <label>Recall (0-1)</label>
                <input
                  type="number"
                  name="recall"
                  value={formData.recall}
                  onChange={handleInputChange}
                  min="0"
                  max="1"
                  step="0.01"
                  placeholder="e.g. 0.78"
                />
              </div>
              <div className="form-group">
                <label>mAP50 (0-1)</label>
                <input
                  type="number"
                  name="map50"
                  value={formData.map50}
                  onChange={handleInputChange}
                  min="0"
                  max="1"
                  step="0.01"
                  placeholder="e.g. 0.82"
                />
              </div>
              <div className="form-group">
                <label>mAP50-95 (0-1)</label>
                <input
                  type="number"
                  name="map5095"
                  value={formData.map5095}
                  onChange={handleInputChange}
                  min="0"
                  max="1"
                  step="0.01"
                  placeholder="e.g. 0.65"
                />
              </div>
              <div className="form-group">
                <label>FPS</label>
                <input
                  type="number"
                  name="fps"
                  value={formData.fps}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  placeholder="e.g. 28.5"
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-save" onClick={saveMetrics}>Save</button>
              <button className="btn-cancel" onClick={hideRecordForm}>Cancel</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Performance;