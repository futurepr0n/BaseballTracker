import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import BatterPitcherMatchup from '../../BatterPitcherMatchup';

/**
 * Modal to display detailed batter-pitcher matchup analysis
 * Uses React Portal to ensure proper DOM nesting
 * Added state tracking to ensure proper re-rendering
 */
const MatchupAnalysisModal = ({ 
  show, 
  onClose, 
  hitter, 
  pitcher 
}) => {
  // Track modal instance with unique ID to prevent stale data
  const [modalId] = useState(`matchup-modal-${Date.now()}`);
  
  // State to track data loading
  const [isLoading, setIsLoading] = useState(true);
  
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      // Set a small timeout to allow proper data loading and rendering
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  // Reset loading state when the modal is closed
  useEffect(() => {
    if (!show) {
      setIsLoading(true);
    }
  }, [show]);

  if (!show) return null;

  // Log the player data for debugging
  console.log(`[MatchupAnalysisModal:${modalId}] Hitter data:`, hitter);
  console.log(`[MatchupAnalysisModal:${modalId}] Pitcher data:`, pitcher);

  // Create a portal to render the modal outside of the table structure
  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="matchup-modal" onClick={(e) => e.stopPropagation()} data-modal-id={modalId}>
        <div className="matchup-modal-header">
          <h2>Batter-Pitcher Matchup Analysis</h2>
          <button className="close-modal-btn" onClick={onClose}>×</button>
        </div>
        <div className="matchup-modal-content">
          {isLoading ? (
            <div className="text-center p-8">
              <div className="spinner" style={{
                width: '40px',
                height: '40px',
                margin: '0 auto 20px',
                borderRadius: '50%',
                border: '3px solid rgba(0, 0, 0, 0.1)',
                borderTopColor: '#3498db',
                animation: 'spin 1s infinite linear'
              }}></div>
              <div>Loading matchup data...</div>
              <style jsx>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : (
            <BatterPitcherMatchup 
              key={`${hitter?.name}-vs-${pitcher?.name}-${modalId}`}
              preSelectedHitter={{
                name: hitter?.name,
                fullName: hitter?.fullName,
                team: hitter?.team
              }}
              preSelectedPitcher={{
                name: pitcher?.name,
                fullName: pitcher?.fullName,
                team: pitcher?.team
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body // Render directly to the document body
  );
};

export default MatchupAnalysisModal;