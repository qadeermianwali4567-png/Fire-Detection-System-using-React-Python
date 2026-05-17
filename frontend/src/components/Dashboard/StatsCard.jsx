import React from 'react';

const StatsCard = ({ label, value, colorClass = '' }) => {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value ${colorClass}`}>{value}</div>
    </div>
  );
};

export default StatsCard;