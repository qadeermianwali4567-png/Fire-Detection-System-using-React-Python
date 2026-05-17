import React from 'react';

const AlertsList = ({ alerts }) => {
  // Check if alerts is an array
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return <div className="no-alerts">No alerts yet</div>;
  }

  return (
    <div className="alerts-list">
      {alerts.map((alert, index) => (
        <div className="alert-item" key={index}>
          <div className="time">{alert.detected_at || alert.timestamp}</div>
          <div className="info">
            <span className="alert-cam-badge">{alert.camera_name}</span>
            {alert.severity_label && (
              <span className={`severity-badge severity-${alert.severity}`}>
                {alert.severity_label}
              </span>
            )}
            {alert.fire_position || alert.location}
          </div>
          <div className="confidence">
            Confidence: {((alert.confidence_score || alert.confidence) * 100).toFixed(1)}%
            {alert.fire_size_pct && ` | Size: ${alert.fire_size_pct}%`}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertsList;