import React from 'react';

/**
 * Modal for viewing and loading saved slips
 * 
 * @param {boolean} show - Whether to show the modal
 * @param {function} onClose - Function to close the modal
 * @param {Array} savedSlips - Array of saved slips
 * @param {function} onLoadSlip - Function to handle loading a slip
 * @param {function} onDeleteSlip - Function to handle deleting a slip
 */
const SlipGalleryModal = ({
  show,
  onClose,
  savedSlips,
  onLoadSlip,
  onDeleteSlip
}) => {
  if (!show) return null;

  // Sort slips by timestamp (newest first)
  const sortedSlips = [...savedSlips].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="modal-overlay">
      <div className="modal-content slip-gallery-modal">
        <div className="modal-header">
          <h3>Saved Slips</h3>
          <button className="close-modal-btn" onClick={onClose}>×</button>
        </div>
        <div className="slip-gallery">
          {sortedSlips.length > 0 ? (
            sortedSlips.map(slip => (
              <div key={slip.id} className="slip-item">
                <div className="slip-details">
                  <h4>{slip.name}</h4>
                  <p>Saved: {slip.date} ({new Date(slip.timestamp).toLocaleTimeString()})</p>
                  <p>Players: {slip.data.hitters.length} Hitters, {slip.data.pitchers.length} Pitchers</p>
                </div>
                <div className="slip-actions">
                  <button 
                    className="slip-action-btn load-btn" 
                    onClick={() => onLoadSlip(slip)}
                  >
                    Load
                  </button>
                  <button 
                    className="slip-action-btn delete-btn" 
                    onClick={() => onDeleteSlip(slip.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-slips-message">No saved slips found.</div>
          )}
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default SlipGalleryModal;