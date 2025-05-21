import React, { useEffect } from 'react';
import { positionTooltip, setupTooltipCloseHandler } from './tooltipUtils';
import './InjuryBadge.css';

/**
 * InjuryTooltips - Renders injury tooltips at document level
 * Follows the same pattern as other card tooltips
 */
const InjuryTooltips = ({ activeTooltip, setActiveTooltip, injuryData }) => {
  // Place useEffect at the top level, before any conditional returns
  useEffect(() => {
    // Only run the positioning logic if there's an active tooltip
    if (activeTooltip && activeTooltip.startsWith('injury_')) {
      setTimeout(() => {
        positionTooltip(
          `.tooltip-${activeTooltip}`,
          `[data-tooltip-id="${activeTooltip}"]`
        );
      }, 10);
    }
  }, [activeTooltip]);
  
  // If no active tooltip or not an injury tooltip, render nothing
  if (!activeTooltip || !activeTooltip.startsWith('injury_') || !injuryData) {
    return null;
  }
  
  // Find the player data based on the tooltip ID
  const playerNameParts = activeTooltip.substring(7).split('_');
  // The last part is the team
  const teamPart = playerNameParts.pop();
  // Join the rest as the player name (in case names have underscores)
  const playerNameKey = playerNameParts.join('_');
  
  // Find the actual player by checking all keys in injuryData
  const actualPlayerName = Object.keys(injuryData).find(name => {
    const safePlayerName = name.replace(/[^a-zA-Z0-9]/g, '_');
    return safePlayerName === playerNameKey || activeTooltip.includes(safePlayerName);
  });
  
  // If no matching player found, render nothing
  if (!actualPlayerName || !injuryData[actualPlayerName]) {
    return null;
  }
  
  const playerInjury = injuryData[actualPlayerName];
  
  // Determine badge type based on injury status for color theming
  const getBadgeType = (status) => {
    if (status.includes('60-Day')) return 'severe';
    if (status.includes('IL') || status.includes('Injured')) return 'injured';
    return 'day-to-day';
  };
  
  const badgeType = getBadgeType(playerInjury.STATUS);
  
  return (
    <div className={`injury-tooltip tooltip-${activeTooltip}`}>
      <div className="tooltip-header">
        <span>{actualPlayerName} Injury Status</span>
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

export default InjuryTooltips;