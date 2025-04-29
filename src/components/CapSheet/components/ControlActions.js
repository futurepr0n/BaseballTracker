import React, { useRef } from 'react';

/**
 * Component for control actions (save, load, export, import)
 * 
 * @param {function} onShowSaveModal - Function to show save modal
 * @param {function} onShowSlipGallery - Function to show slip gallery
 * @param {function} onExport - Function to handle export
 * @param {function} onImport - Function to handle import file selection
 */
const ControlActions = ({
  onShowSaveModal,
  onShowSlipGallery,
  onExport,
  onImport
}) => {
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="control-actions">
      <button className="action-btn save-btn" onClick={onShowSaveModal}>
        <span className="action-icon">💾</span> Save Slip
      </button>
      <button className="action-btn load-btn" onClick={onShowSlipGallery}>
        <span className="action-icon">📂</span> Slip Gallery
      </button>
      <button className="action-btn export-btn" onClick={onExport}>
        <span className="action-icon">📊</span> Export to CSV
      </button>
      <div className="import-container">
        <button className="action-btn import-btn" onClick={handleImportClick}>
          <span className="action-icon">📥</span> Import from CSV
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".csv"
          onChange={onImport}
        />
      </div>
    </div>
  );
};

export default ControlActions;