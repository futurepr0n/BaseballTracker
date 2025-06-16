import React, { useEffect } from 'react';
import './DayOfWeekHitsCard.css';
import { createSafeId } from '../../utils/tooltipUtils';
import { useTooltip } from '../../utils/TooltipContext';

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
  const { openTooltip, closeTooltip } = useTooltip();

  // Close tooltips when date changes
  useEffect(() => {
    closeTooltip();
  }, [currentDate, closeTooltip]);

  const handleTooltipClick = (player, event) => {
    const safeId = createSafeId(player.name, player.team);
    const tooltipKey = `day_hit_${safeId}`;
    
    event.stopPropagation();
    openTooltip(tooltipKey, event.currentTarget, {
      type: 'day_hit',
      player: player,
      dayOfWeek: dayOfWeekHits.dayOfWeek
    });
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
                    className="player-stat tooltip-trigger"
                    data-tooltip-id={tooltipId}
                    onClick={(e) => handleTooltipClick(player, e)}
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

    </div>
  );
};

export default DayOfWeekHitsCard;