import React, { useState, useEffect } from 'react';
import './DayOfWeekHitsCard.css';
import { createSafeId, positionTooltip, setupTooltipCloseHandler } from '../../utils/tooltipUtils';

/**
 * DayOfWeekHitsCard - Shows players who perform best on specific days of the week
 * Enhanced with integrated team logos
 */
const DayOfWeekHitsCard = ({ 
  dayOfWeekHits,
  isLoading,
  currentDate,
  teams
}) => {
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Close tooltips when date changes
  useEffect(() => {
    setActiveTooltip(null);
  }, [currentDate]);

  // Set up document-level click handler to close tooltips when clicking outside
  useEffect(() => {
    return setupTooltipCloseHandler(setActiveTooltip);
  }, []);

  const toggleTooltip = (player) => {
    const safeId = createSafeId(player.name, player.team);
    const tooltipKey = `day_hit_${safeId}`;
    
    if (activeTooltip === tooltipKey) {
      setActiveTooltip(null);
    } else {
      setActiveTooltip(tooltipKey);
      
      // Position the tooltip
      positionTooltip(
        `.tooltip-${tooltipKey}`, 
        `[data-tooltip-id="${tooltipKey}"]`
      );
    }
  };

  return (
    <div className="card day-of-week-hits-card">
      <h3>{dayOfWeekHits.dayOfWeek} Hit Leaders</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : dayOfWeekHits.topHitsByTotal && dayOfWeekHits.topHitsByTotal.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {dayOfWeekHits.topHitsByTotal.slice(0, 10).map((player, index) => {
              const safeId = createSafeId(player.name, player.team);
              const tooltipId = `day_hit_${safeId}`;
              
              // Get team logo URL if teams data is available
              const teamAbbr = player.team;
              const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              
              return (
                <li key={index} className="player-item">
                  <div className="player-rank">
                    {logoUrl && (
                      <>
                        <img 
                          src={logoUrl} 
                          alt="" 
                          className="rank-logo" 
                          loading="lazy"
                          aria-hidden="true"
                        />
                        <div className="rank-overlay"></div>
                      </>
                    )}
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div 
                    className="player-stat tooltip-container"
                    data-tooltip-id={tooltipId}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTooltip(player);
                    }}
                  >
                    <div className="stat-highlight">{player.hits} hits</div>
                    <small>in {player.games} {dayOfWeekHits.dayOfWeek}s</small>
                    <small>({(player.hitRate * 100).toFixed(1)}%)</small>
                  </div>
                  
                  {/* Enhanced background logo */}
                  {logoUrl && (
                    <img 
                      src={logoUrl} 
                      alt="" 
                      className="team-logo-bg" 
                      loading="lazy"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="no-data">No {dayOfWeekHits.dayOfWeek} hit data available</p>
      )}

      {/* Tooltips rendered outside card to avoid clipping - keep as is */}
      {activeTooltip && activeTooltip.startsWith('day_hit_') && (
        <>
          {dayOfWeekHits.topHitsByTotal.slice(0, 10).map((player) => {
            const safeId = createSafeId(player.name, player.team);
            const tooltipKey = `day_hit_${safeId}`;
            
            if (activeTooltip === tooltipKey) {
              return (
                <div 
                  key={tooltipKey} 
                  className={`day-hit-tooltip tooltip-${tooltipKey}`}
                >
                  <div className="tooltip-header">
                    <span>{player.name}'s {dayOfWeekHits.dayOfWeek} Performance</span>
                    <button 
                      className="close-tooltip" 
                      onClick={() => setActiveTooltip(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="day-hit-details">
                    <div className="day-hit-summary">
                      <div className="day-hit-summary-item">
                        <span className="summary-label">Total Hits:</span>
                        <span className="summary-value">{player.hits}</span>
                      </div>
                      <div className="day-hit-summary-item">
                        <span className="summary-label">Games Played:</span>
                        <span className="summary-value">{player.games}</span>
                      </div>
                      <div className="day-hit-summary-item">
                        <span className="summary-label">Hit Rate:</span>
                        <span className="summary-value highlight">{(player.hitRate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    {player.dates && player.dates.length > 0 ? (
                      <div className="day-hit-games">
                        <h4>Recent {dayOfWeekHits.dayOfWeek} Games with Hits</h4>
                        <ul className="day-hit-date-list">
                          {player.dates.slice(0, 5).map((date, idx) => (
                            <li key={idx} className="day-hit-date-item">
                              {new Date(date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </li>
                          ))}
                        </ul>
                        {player.dates.length > 5 && (
                          <p className="day-hit-more-dates">
                            +{player.dates.length - 5} more dates
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="no-date-data">No date information available</p>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </>
      )}
    </div>
  );
};

export default DayOfWeekHitsCard;