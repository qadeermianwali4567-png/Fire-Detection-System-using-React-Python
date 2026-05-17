import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';

const CameraCard = ({
  camera,
  onStreamMessage,
  onZoomOpen,
}) => {
  const [isActive, setIsActive] = useState(false);

  const [frameSrc, setFrameSrc] = useState('');

  const [fireData, setFireData] = useState(null);

  const [error, setError] = useState(null);

  const wsRef = useRef(null);

  const lastFrameTimeRef = useRef(0);

  // =========================
  // START STREAM
  // =========================

  const startStream = useCallback(() => {
    setError(null);

    if (!camera || camera.index === undefined) {
      setError('Camera index missing');
      return;
    }

    // close old socket

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(
      `ws://127.0.0.1:8000/api/dashboard/ws/stream/${camera.index}`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      setIsActive(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'frame') {
          const now = Date.now();

          // Limit FPS to reduce renders
          if (now - lastFrameTimeRef.current < 200) {
            return;
          }

          lastFrameTimeRef.current = now;

          setFrameSrc(
            `data:image/jpeg;base64,${data.image}`
          );

          if (data.fire_detected) {
            setFireData(data);

            onStreamMessage?.(data);
          } else {
            setFireData(null);
          }
        }

        if (data.type === 'error') {
          setError(data.message);
        }
      } catch {
        setError('Invalid stream data');
      }
    };

    ws.onerror = () => {
      setError('Connection failed');
    };

    ws.onclose = () => {
      setIsActive(false);
    };
  }, [camera, onStreamMessage]);

  // =========================
  // STOP STREAM
  // =========================

  const stopStream = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Stopped');
      wsRef.current = null;
    }

    setIsActive(false);
    setFrameSrc('');
    setFireData(null);
  }, []);

  // =========================
  // CLEANUP
  // =========================

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Unmount');
      }
    };
  }, []);

  // =========================
  // ZOOM
  // =========================

  const handleZoom = useCallback(() => {
    if (!frameSrc) return;

    onZoomOpen?.(
      camera.name,
      frameSrc,
      !!fireData
    );
  }, [frameSrc, camera, fireData, onZoomOpen]);

  return (
    <div className="camera-card">
      <div className="card-header">
        <h3>📹 {camera.name}</h3>

        <span
          className="feed-status"
          style={{
            color: isActive ? '#48bb78' : '#555',
          }}
        >
          {isActive ? 'Active' : 'Stopped'}
        </span>
      </div>

      <div
        className="camera-feed"
        onClick={handleZoom}
        style={{
          cursor: frameSrc ? 'pointer' : 'default',
        }}
      >
        {frameSrc ? (
          <img
            src={frameSrc}
            alt={camera.name}
            loading="lazy"
          />
        ) : (
          <div className="feed-placeholder">
            <div
              style={{
                fontSize: '28px',
                marginBottom: '6px',
              }}
            >
              📷
            </div>

            <div>Click Start</div>

            {error && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'red',
                  marginTop: '8px',
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        {fireData && (
          <div
            className={`fire-alert-overlay show severity-${fireData?.severity}`}
          >
            <span className="fire-icon">🔥</span>

            <p className="fire-title">
              FIRE DETECTED!
            </p>

            <p className="fire-severity">
              {fireData?.severity_label}
            </p>

            <p className="fire-pos">
              {fireData?.fire_position}
            </p>
          </div>
        )}

        {frameSrc && (
          <div className="zoom-hint">
            🔍 Click to zoom
          </div>
        )}
      </div>

      <div className="camera-controls">
        {!isActive ? (
          <button
            className="btn-control btn-start"
            onClick={startStream}
          >
            ▶ Start
          </button>
        ) : (
          <button
            className="btn-control btn-stop"
            onClick={stopStream}
          >
            ⏹ Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(CameraCard);