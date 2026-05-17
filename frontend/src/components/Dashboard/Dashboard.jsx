import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  lazy,
  Suspense,
} from 'react';

import Sidebar from '../Layout/Sidebar';
import StatsCard from './StatsCard';
import AlertsList from './AlertsList';
import ZoomModal from './ZoomModal';
import { AlarmSound } from '../Common/AlarmSound';
import { api } from '../Common/api.jsx';

import './Dashboard.css';

// const CameraCard = lazy(() => import('./CameraCard'));
import CameraCard from './CameraCard.jsx'
const Dashboard = () => {
  const [cameras, setCameras] = useState([]);
  const [currentView, setCurrentView] = useState('all');

  const [stats, setStats] = useState({
    today_incidents: 0,
    this_month: 0,
    total_incidents: 0,
    resolved_incidents: 0,
  });

  const [alerts, setAlerts] = useState([]);

  const alarmRef = useRef(new AlarmSound());

  const [alarmEnabled, setAlarmEnabled] = useState(true);

  const [zoomModal, setZoomModal] = useState({
    isOpen: false,
    cameraName: '',
    imageSrc: '',
    hasFire: false,
  });

  const lastAlertTimeRef = useRef(0);

  // =========================
  // LOAD CAMERAS
  // =========================

  const loadCameras = useCallback(async () => {
    try {
      const data = await api.getAvailableCameras();

      if (data?.cameras) {
        setCameras(data.cameras);
      }
    } catch (err) {
      console.error('Failed to load cameras');
    }
  }, []);

  // =========================
  // LOAD STATS
  // =========================

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getReportSummary();

      if (!data.success) return;

      setStats({
        today_incidents: data.today_incidents || 0,
        this_month: data.this_month || 0,
        total_incidents: data.total_incidents || 0,
        resolved_incidents: data.resolved_incidents || 0,
      });
    } catch (err) {
      console.error('Failed to load stats');
    }
  }, []);

  // =========================
  // LOAD INITIAL ALERTS
  // =========================

  const loadInitialAlerts = useCallback(async () => {
    try {
      const incidents = await api.getLatestIncidents(15);

      if (Array.isArray(incidents)) {
        setAlerts(incidents);
      }
    } catch (err) {
      console.error('Failed to load alerts');
    }
  }, []);

  // =========================
  // HANDLE STREAM EVENTS
  // =========================

  const handleStreamMessage = useCallback(
    (data) => {
      const now = Date.now();

      // Prevent alert spam
      if (now - lastAlertTimeRef.current < 1000) {
        return;
      }

      lastAlertTimeRef.current = now;

      const newAlert = {
        timestamp: data.timestamp,
        camera_name: data.camera_name,
        severity: data.severity,
        severity_label: data.severity_label,
        fire_position: data.fire_position,
        confidence: data.confidence,
        fire_size: data.fire_size,
      };

      setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);

      // Play sound
      if (alarmEnabled) {
        alarmRef.current.play();
      }

      // Update stats
      loadStats();
    },
    [alarmEnabled, loadStats]
  );

  // =========================
  // ZOOM
  // =========================

  const handleZoomOpen = useCallback((cameraName, imageSrc, hasFire) => {
    setZoomModal({
      isOpen: true,
      cameraName,
      imageSrc,
      hasFire,
    });
  }, []);

  const handleZoomClose = useCallback(() => {
    setZoomModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // =========================
  // ALARM
  // =========================

  const toggleAlarm = useCallback(() => {
    const state = alarmRef.current.toggle();
    setAlarmEnabled(state);
  }, []);

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      window.location.href = '/login';
      return;
    }

    loadCameras();
    loadStats();
    loadInitialAlerts();

    // only stats polling
    const statsInterval = setInterval(loadStats, 15000);

    return () => {
      clearInterval(statsInterval);
    };
  }, [loadCameras, loadStats, loadInitialAlerts]);

  // =========================
  // FILTER CAMERAS
  // =========================

  const visibleCameras = useMemo(() => {
    if (currentView === 'all') {
      return cameras;
    }

    return cameras.filter(
      (cam) => String(cam.index) === String(currentView)
    );
  }, [cameras, currentView]);

  return (
    <div>
      <Sidebar activePage="dashboard" />

      <main className="main">
        {/* HEADER */}

        <div className="page-header">
          <div>
            <h1>Live Dashboard</h1>
            <p>Real-time fire detection monitoring</p>
          </div>

          <div className="header-right">
            <button
              className={`alarm-btn ${alarmEnabled ? '' : 'muted'}`}
              onClick={toggleAlarm}
            >
              {alarmEnabled ? '🔔 Sound: ON' : '🔕 Sound: OFF'}
            </button>

            <div className="status-badge">
              <div className="status-dot"></div>
              System Active
            </div>
          </div>
        </div>

        {/* STATS */}

        <div className="stats-row">
          <StatsCard
            label="Today's Incidents"
            value={stats.today_incidents}
            colorClass="red"
          />

          <StatsCard
            label="This Month"
            value={stats.this_month}
            colorClass="yellow"
          />

          <StatsCard
            label="Total Incidents"
            value={stats.total_incidents}
          />

          <StatsCard
            label="Resolved"
            value={stats.resolved_incidents}
            colorClass="green"
          />
        </div>

        {/* CAMERA TABS */}

        <div className="camera-selector">
          <div
            className={`camera-tab ${
              currentView === 'all' ? 'active' : ''
            }`}
            onClick={() => setCurrentView('all')}
          >
            <span className="dot"></span>
            All Cameras
          </div>

          {cameras.map((cam) => (
            <div
              key={cam.index}
              className={`camera-tab ${
                currentView === cam.index ? 'active' : ''
              }`}
              onClick={() => setCurrentView(cam.index)}
            >
              <span className="dot"></span>
              {cam.name}
            </div>
          ))}
        </div>

        {/* FEEDS */}

        <div className="feed-section">
          <div
            className={`feeds-grid ${
              cameras.length > 1 && currentView === 'all'
                ? 'all-feeds-grid'
                : ''
            }`}
          >
            {visibleCameras.map((cam) => (
              <Suspense
                key={cam.index}
                fallback={
                  <div style={{ padding: 20 }}>
                    Loading Camera...
                  </div>
                }
              >
                <CameraCard
                  camera={cam}
                  onStreamMessage={handleStreamMessage}
                  onZoomOpen={handleZoomOpen}
                />
              </Suspense>
            ))}

            {visibleCameras.length === 0 && (
              <div
                style={{
                  color: '#444',
                  padding: '40px',
                  textAlign: 'center',
                }}
              >
                No cameras found
              </div>
            )}
          </div>

          {/* ALERTS */}

          <div className="alerts-card">
            <div className="card-header">
              <h3>🚨 Recent Alerts</h3>

              <a
                href="/incidents"
                style={{
                  fontSize: '12px',
                  color: '#555',
                  textDecoration: 'none',
                }}
              >
                View All
              </a>
            </div>

            <AlertsList alerts={alerts} />
          </div>
        </div>
      </main>

      {/* ZOOM MODAL */}

      <ZoomModal
        isOpen={zoomModal.isOpen}
        cameraName={zoomModal.cameraName}
        imageSrc={zoomModal.imageSrc}
        hasFire={zoomModal.hasFire}
        onClose={handleZoomClose}
      />
    </div>
  );
};

export default Dashboard;