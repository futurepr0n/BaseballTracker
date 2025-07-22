/**
 * MobilePlayerCard.js
 * 
 * Reusable mobile-optimized card component for player lists
 * Based on the successful BarrelMatchupCard mobile pattern
 */

import React, { useState } from 'react';
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
  onExpandChange = null
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // Use external state if controlled, otherwise use internal state
  const isExpanded = controlled ? externalExpanded : internalExpanded;

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
    <div className={`mobile-card ${className} ${isExpanded ? 'expanded' : ''}`}>
      <div 
        className="mobile-card-header" 
        onClick={handleCardClick}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
      >
        {showRank && (
          <div className="player-rank">
            <span className="rank-number">{index + 1}</span>
          </div>
        )}
        
        <div className="player-info">
          <div className="player-name">{item.name || item.playerName || item.fullName}</div>
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