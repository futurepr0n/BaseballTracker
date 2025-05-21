import React, { useEffect } from 'react';
import { positionTooltip } from './tooltipUtils';
import './InjuryBadge.css';

/**
 * InjuryTooltipsRenderer - Renders injury tooltips at document level
 * Follows the pattern used in HitStreakCard and other components
 */
const InjuryTooltipsRenderer = ({ 
  activeTooltip, 
  setActiveTooltip, 
  injuryData,
  currentDate
}) => {
  // If no active tooltip or no injury data, render nothing
  if (!activeTooltip || !injuryData || !activeTooltip.startsWith('injury_')) {
    return null;
  }
  
  // Extract player name from tooltip ID
  // Format: injury_PlayerName_Team
  const tooltipParts = activeTooltip.split('_');
  if (tooltipParts.length < 3) return null;
  
  // Reconstruct player name (handling names with underscores)
  const teamIndex = tooltipParts.length - 1;
  const playerName = tooltipParts.slice(1, teamIndex).join(' ');
  
  // Find player injury data
  const matchingPlayer = Object.keys(injuryData).find(name => 
    activeTooltip.includes(name.replace(/\s+/g, '_'))
  );
  
  if (!matchingPlayer || !injuryData[matchingPlayer]) return null;
  
  const playerInjury = injuryData[matchingPlayer];
  
  // Position the tooltip after it renders
  useEffect(() => {
    if (activeTooltip) {
      setTimeout(() => {
        positionTooltip(
          `.tooltip-${activeTooltip}`,
          `[data-tooltip-id="${activeTooltip}"]`
        );
      }, 10);
    }
  }, [activeTooltip]);
  
  // Determine badge type based on injury status
  const getBadgeType = (status) => {
    if (status.includes('60-Day')) return 'severe';
    if (status.includes('IL') || status.includes('Injured')) return 'injured';
    return 'day-to-day';
  };
  
  const badgeType = getBadgeType(playerInjury.STATUS);
  
  return (
    <div className={`injury-tooltip tooltip-${activeTooltip}`}>
      <div className="tooltip-header">
        <span>{matchingPlayer} Injury Status</span>
        <button 
          className="close-tooltip" 
          onClick={() => setActiveTooltip(null)}
        >
          ✕
        </button>
      </div>
      <div className="injury-details">
        <div className="injury-summary">
          <div className="injury-summary-item">
            <span className="summary-label">Status:</span>
            <span className={`summary-value status-${badgeType}`}>
              {playerInjury.STATUS}
            </span>
          </div>
          <div className="injury-summary-item">
            <span className="summary-label">Position:</span>
            <span className="summary-value">{playerInjury.POS}</span>
          </div>
          <div className="injury-summary-item">
            <span className="summary-label">Est. Return:</span>
            <span className="summary-value highlight">
              {playerInjury["EST. RETURN DATE"]}
            </span>
          </div>
          <div className="injury-summary-item">
            <span className="summary-label">Team:</span>
            <span className="summary-value">{playerInjury["TEAM NAME"]}</span>
          </div>
        </div>
        
        <div className="injury-comment">
          <h4>Latest Update</h4>
          <p>{playerInjury.COMMENT}</p>
        </div>
      </div>
    </div>
  );
};

export default InjuryTooltipsRenderer;