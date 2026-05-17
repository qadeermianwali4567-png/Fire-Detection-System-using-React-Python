import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../Layout/Sidebar.jsx';
import { api } from '../Common/api.jsx';
import Chart from 'chart.js/auto'; // Import Chart.js
import './Reports.css';

const Reports = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearTotal, setYearTotal] = useState(0);
  const [highestMonth, setHighestMonth] = useState('—');
  const [avgMonth, setAvgMonth] = useState(0);
  const [peakHour, setPeakHour] = useState('—');
  const [monthlyData, setMonthlyData] = useState([]);
  const [annualData, setAnnualData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const monthlyChartRef = useRef(null);
  const annualChartRef = useRef(null);
  const hourlyChartRef = useRef(null);
  const [monthlyChart, setMonthlyChart] = useState(null);
  const [annualChart, setAnnualChart] = useState(null);
  const [hourlyChart, setHourlyChart] = useState(null);

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 4; y--) {
    years.push(y);
  }

  const loadMonthlyReport = useCallback(async (year) => {
    try {
      const data = await api.getMonthlyReport(year);
      setMonthlyData(data.monthly_data || []);
      setYearTotal(data.total || 0);
      
      const values = data.monthly_data.map(d => d.count);
      const maxVal = Math.max(...values);
      const maxIndex = values.indexOf(maxVal);
      setHighestMonth(maxVal > 0 ? data.monthly_data[maxIndex]?.month || '—' : '—');
      setAvgMonth((data.total / 12).toFixed(1));
      
      return data;
    } catch (e) {
      console.error('Monthly report error:', e);
      return null;
    }
  }, []);

  const loadAnnualReport = useCallback(async () => {
    try {
      const data = await api.getAnnualReport();
      setAnnualData(data.data || []);
      return data;
    } catch (e) {
      console.error('Annual report error:', e);
      return null;
    }
  }, []);

  const loadHourlyReport = useCallback(async () => {
    try {
      const data = await api.getHourlyReport();
      setHourlyData(data || []);
      
      const values = data.map(d => d.count);
      const maxVal = Math.max(...values);
      const maxIndex = values.indexOf(maxVal);
      setPeakHour(maxVal > 0 ? `${data[maxIndex]?.hour}:00` : '—');
      
      return data;
    } catch (e) {
      console.error('Hourly report error:', e);
      return null;
    }
  }, []);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      loadMonthlyReport(selectedYear),
      loadAnnualReport(),
      loadHourlyReport(),
    ]);
    setIsLoading(false);
  }, [selectedYear, loadMonthlyReport, loadAnnualReport, loadHourlyReport]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    loadReports();
  }, [loadReports]);

  // Update monthly chart when data changes
  useEffect(() => {
    if (!monthlyData.length || !monthlyChartRef.current) return;
    
    // Destroy existing chart
    if (monthlyChart) {
      monthlyChart.destroy();
    }
    
    const ctx = monthlyChartRef.current.getContext('2d');
    const newChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyData.map(d => d.month),
        datasets: [{
          label: 'Incidents',
          data: monthlyData.map(d => d.count),
          backgroundColor: 'rgba(229,62,62,0.6)',
          borderColor: '#e53e3e',
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { 
            callbacks: {
              label: (context) => `Incidents: ${context.raw}`
            }
          }
        },
        scales: {
          x: { 
            ticks: { color: '#555' }, 
            grid: { color: '#e2e8f0' } 
          },
          y: { 
            ticks: { color: '#555' }, 
            grid: { color: '#e2e8f0' }, 
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Incidents',
              color: '#555'
            }
          },
        }
      }
    });
    setMonthlyChart(newChart);
    
    return () => {
      if (newChart) newChart.destroy();
    };
  }, [monthlyData]);

  // Update annual chart when data changes
  useEffect(() => {
    if (!annualData.length || !annualChartRef.current) return;
    
    // Destroy existing chart
    if (annualChart) {
      annualChart.destroy();
    }
    
    const ctx = annualChartRef.current.getContext('2d');
    const newChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: annualData.map(d => d.year.toString()),
        datasets: [{
          label: 'Total Incidents',
          data: annualData.map(d => d.count),
          borderColor: '#e53e3e',
          backgroundColor: 'rgba(229,62,62,0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#e53e3e',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Incidents: ${context.raw}`
            }
          }
        },
        scales: {
          x: { 
            ticks: { color: '#555' }, 
            grid: { color: '#e2e8f0' } 
          },
          y: { 
            ticks: { color: '#555' }, 
            grid: { color: '#e2e8f0' }, 
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Incidents',
              color: '#555'
            }
          },
        }
      }
    });
    setAnnualChart(newChart);
    
    return () => {
      if (newChart) newChart.destroy();
    };
  }, [annualData]);

  // Update hourly chart when data changes
  useEffect(() => {
    if (!hourlyData.length || !hourlyChartRef.current) return;
    
    // Destroy existing chart
    if (hourlyChart) {
      hourlyChart.destroy();
    }
    
    const values = hourlyData.map(d => d.count);
    const maxVal = Math.max(...values);
    
    const ctx = hourlyChartRef.current.getContext('2d');
    const newChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hourlyData.map(d => `${d.hour}:00`),
        datasets: [{
          label: 'Incidents',
          data: values,
          backgroundColor: values.map(v => 
            v === maxVal && maxVal > 0 ? 'rgba(229,62,62,0.9)' : 'rgba(229,62,62,0.3)'
          ),
          borderColor: '#e53e3e',
          borderWidth: 1,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Incidents: ${context.raw}`
            }
          }
        },
        scales: {
          x: { 
            ticks: { color: '#555', font: { size: 10 } }, 
            grid: { color: '#e2e8f0' } 
          },
          y: { 
            ticks: { color: '#555' }, 
            grid: { color: '#e2e8f0' }, 
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Incidents',
              color: '#555'
            }
          },
        }
      }
    });
    setHourlyChart(newChart);
    
    return () => {
      if (newChart) newChart.destroy();
    };
  }, [hourlyData]);

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };

  useEffect(() => {
    loadReports();
  }, [selectedYear, loadReports]);

  const exportCSV = async () => {
    try {
      const data = await api.exportCSV();
      if (data.success && data.data) {
        const blob = new Blob([data.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fire_incidents_${selectedYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('CSV export failed:', e);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const exportPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const blob = await api.exportPDF();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fire_report_${selectedYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('PDF generation failed. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Sidebar activePage="reports" />
        <main className="main">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading reports...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Sidebar activePage="reports" />
      <main className="main">
        <div className="page-header">
          <div>
            <h1>Fire Reports</h1>
            <p>Monthly and annual fire incident analytics</p>
          </div>
        </div>

        <div className="controls">
          <select className="year-select" value={selectedYear} onChange={handleYearChange}>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button className="btn-export" onClick={exportCSV}>⬇ Export CSV</button>
          <button 
            className={`btn-pdf ${isGeneratingPDF ? 'loading' : ''}`} 
            onClick={exportPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? '⏳ Generating...' : '📄 Download PDF Report'}
          </button>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="label">Total This Year</div>
            <div className="value" style={{ color: '#e53e3e' }}>{yearTotal}</div>
          </div>
          <div className="stat-card">
            <div className="label">Highest Month</div>
            <div className="value" style={{ color: '#ecc94b' }}>{highestMonth}</div>
          </div>
          <div className="stat-card">
            <div className="label">Average / Month</div>
            <div className="value" style={{ color: '#63b3ed' }}>{avgMonth}</div>
          </div>
          <div className="stat-card">
            <div className="label">Peak Hour</div>
            <div className="value" style={{ color: '#68d391' }}>{peakHour}</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>📊 Monthly Incidents</h3>
            <div className="chart-wrapper">
              <canvas id="monthlyChart" ref={monthlyChartRef}></canvas>
            </div>
          </div>
          <div className="chart-card">
            <h3>📈 Annual Trend</h3>
            <div className="chart-wrapper">
              <canvas id="annualChart" ref={annualChartRef}></canvas>
            </div>
          </div>
          <div className="chart-card full-width">
            <h3>🕐 Incidents by Hour of Day</h3>
            <div className="chart-wrapper">
              <canvas id="hourlyChart" ref={hourlyChartRef}></canvas>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;