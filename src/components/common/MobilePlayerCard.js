/**
 * MobilePlayerCard.js
 * 
 * Reusable mobile-optimized card component for player lists
 * Based on the successful BarrelMatchupCard mobile pattern
 */

import React, { useState } from 'react';
import { usePlayerScratchpad } from '../../contexts/PlayerScratchpadContext';
import { useLongPress } from '../../hooks/useLongPress';
import './MobilePlayerCard.css';

const MobilePlayerCard = ({
  item,
  index,
  showRank = true,
  showExpandButton = false,
  primaryMetric,
  secondaryMetrics = [],
  onCardClick = null,
  expandableContent = null,
  className = '',
  customActions = null,
  // New props for controlled expansion
  controlled = false,
  isExpanded: externalExpanded = false,
  onExpandChange = null,
  // Scratchpad integration props
  enableScratchpad = true,
  scratchpadSource = 'mobile-card'
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // Use external state if controlled, otherwise use internal state
  const isExpanded = controlled ? externalExpanded : internalExpanded;

  // Scratchpad integration
  const { togglePlayer, isPlayerInScratchpad } = usePlayerScratchpad();
  
  // Extract player data for scratchpad
  const getPlayerData = () => ({
    name: item.name || item.playerName || item.fullName,
    fullName: item.fullName || item.name || item.playerName,
    team: item.team,
    playerType: item.playerType || (item.pitcher ? 'pitcher' : 'hitter'),
    source: scratchpadSource
  });

  const isInScratchpad = enableScratchpad && isPlayerInScratchpad(getPlayerData());

  // Long-press handling
  const handleLongPress = () => {
    if (!enableScratchpad) return;
    
    const playerData = getPlayerData();
    if (playerData.name && playerData.team) {
      togglePlayer(playerData);
      
      // Visual feedback
      console.log(`${isInScratchpad ? 'Removed' : 'Added'} ${playerData.name} ${isInScratchpad ? 'from' : 'to'} scratchpad`);
    }
  };

  const longPressHandlers = useLongPress(handleLongPress, {
    threshold: 750,
    onStart: () => console.log('Long press started'),
    onCancel: () => console.log('Long press cancelled')
  });

  // Explicitly extract only valid DOM event handlers to avoid invalid props
  const longPressEventHandlers = {
    onMouseDown: longPressHandlers.onMouseDown,
    onTouchStart: longPressHandlers.onTouchStart,
    onMouseUp: longPressHandlers.onMouseUp,
    onTouchEnd: longPressHandlers.onTouchEnd,
    onMouseMove: longPressHandlers.onMouseMove,
    onTouchMove: longPressHandlers.onTouchMove,
    onMouseLeave: longPressHandlers.onMouseLeave,
    onContextMenu: longPressHandlers.onContextMenu
  };

  // Extract state separately to avoid passing to DOM
  const { isLongPressing, cancel } = longPressHandlers;

  const handleCardClick = (event) => {
    if (onCardClick) {
      onCardClick(item, index, event);
    }
  };

  const handleExpandClick = (event) => {
    event.stopPropagation(); // Prevent card click
    
    if (controlled && onExpandChange) {
      // Let parent component handle state
      onExpandChange(!isExpanded);
    } else {
      // Handle state internally
      setInternalExpanded(!internalExpanded);
    }
  };

  return (
    <div className={`mobile-card ${className} ${isExpanded ? 'expanded' : ''} ${isInScratchpad ? 'in-scratchpad' : ''} ${isLongPressing ? 'long-pressing' : ''}`}>
      <div 
        className="mobile-card-header" 
        onClick={handleCardClick}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
        {...(enableScratchpad ? longPressEventHandlers : {})}
      >
        {showRank && (
          <div className="player-rank">
            <span className="rank-number">{index + 1}</span>
          </div>
        )}
        
        <div className="player-info">
          <div className="player-name">
            {item.name || item.playerName || item.fullName}
            {isInScratchpad && (
              <span className="scratchpad-indicator" title="In scratchpad">📝</span>
            )}
          </div>
          <div className="team-info">
            {item.team && <span className="team">{item.team}</span>}
            {item.opponent && <span className="vs"> vs {item.opponent}</span>}
            {item.pitcher && <span className="vs"> vs {item.pitcher}</span>}
          </div>
        </div>
        
        <div className="primary-metric">
          <div className="metric-value">
            {primaryMetric.value}
          </div>
          <div className="metric-label">
            {primaryMetric.label}
          </div>
          {(showExpandButton || expandableContent) && (
            <div 
              className="expand-icon"
              onClick={handleExpandClick}
            >
              {isExpanded ? '▼' : '▶'}
            </div>
          )}
        </div>
      </div>

      {/* Secondary metrics row */}
      {secondaryMetrics.length > 0 && (
        <div className="mobile-card-summary">
          {secondaryMetrics.map((metric, idx) => (
            <div key={idx} className="mobile-stat-compact">
              <span className="mobile-stat-label">{metric.label}</span>
              <span className="mobile-stat-value">{metric.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Custom actions row */}
      {customActions && (
        <div className="mobile-card-actions">
          {customActions}
        </div>
      )}

      {/* Expandable content */}
      {isExpanded && expandableContent && (
        <div className="mobile-card-content">
          {expandableContent}
        </div>
      )}
    </div>
  );
};

export default MobilePlayerCard;