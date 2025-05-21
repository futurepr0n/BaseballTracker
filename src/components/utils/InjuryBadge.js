import React from 'react';
import { createSafeId } from './tooltipUtils';
import './InjuryBadge.css';

/**
 * InjuryBadge - Just renders the badge without handling tooltip state
 * Follows the same pattern as other card tooltips
 */
const InjuryBadge = ({ 
  playerName, 
  playerTeam, 
  injuryData, 
  activeTooltip, 
  setActiveTooltip 
}) => {
  // Check if player is in the injury data
  const playerInjury = injuryData[playerName];
  
  if (!playerInjury) {
    return null; // No injury data for this player
  }
  
  // Generate unique ID for this player's injury badge
  const safeId = createSafeId(playerName, playerTeam);
  const tooltipId = `injury_${safeId}`;
  
  // Determine badge type based on injury status
  const getBadgeType = (status) => {
    if (status.includes('60-Day')) return 'severe';
    if (status.includes('IL') || status.includes('Injured')) return 'injured';
    return 'day-to-day';
  };
  
  const badgeType = getBadgeType(playerInjury.STATUS);
  
  // Handler for toggling tooltip visibility
  const toggleTooltip = (e) => {
    e.stopPropagation(); // Prevent triggering parent clicks
    
    if (activeTooltip === tooltipId) {
      setActiveTooltip(null);
    } else {
      setActiveTooltip(tooltipId);
    }
  };
  
  return (
    <span 
      className={`injury-badge injury-${badgeType} tooltip-container`}
      data-tooltip-id={tooltipId}
      onClick={toggleTooltip}
      title={`${playerInjury.STATUS}`}
    >
      {/* Badge content handled by CSS ::before */}
    </span>
  );
};

export default InjuryBadge;