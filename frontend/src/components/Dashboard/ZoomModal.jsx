import React, { useEffect } from 'react';

const ZoomModal = ({ isOpen, cameraName, imageSrc, hasFire, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = 'fire_frame.jpg';
    link.click();
  };

  return (
    <div className="zoom-modal show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="zoom-modal-inner">
        <div className="zoom-modal-header">
          <span className="zoom-modal-title">📹 {cameraName}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="zoom-download-btn" onClick={handleDownload}>⬇ Save</button>
            <button className="zoom-close-btn" onClick={onClose}>✕ Close</button>
          </div>
        </div>
        <img src={imageSrc} alt="Zoomed Frame" />
        {hasFire && (
          <div className="zoom-fire-badge" style={{ display: 'block' }}>🔥 FIRE DETECTED</div>
        )}
      </div>
    </div>
  );
};

export default ZoomModal;