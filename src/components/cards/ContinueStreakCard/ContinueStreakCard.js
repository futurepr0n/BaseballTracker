import React, { useEffect } from 'react';
import './ContinueStreakCard.css';
import { createSafeId } from '../../utils/tooltipUtils';
import { useTooltip } from '../../utils/TooltipContext';

/**
 * ContinueStreakCard - Shows players who are likely to continue their hitting streaks
 * Enhanced with integrated team logos
 */
const ContinueStreakCard = ({ 
  hitStreakData,
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
    const tooltipKey = `continue_streak_${safeId}`;
    
    event.stopPropagation();
    openTooltip(tooltipKey, event.currentTarget, {
      type: 'continue_streak',
      player: player
    });
  };
  
  
  return (
    <div className="card continue-streak-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>Streaks Likely to Continue</h3>
        </div>
        {isLoading ? (
          <div className="loading-indicator">Loading stats...</div>
        ) : hitStreakData.likelyToContinueStreak && hitStreakData.likelyToContinueStreak.length > 0 ? (
          <div className="scrollable-container">
            <ul className="player-list">
            {hitStreakData.likelyToContinueStreak.slice(0, 10).map((player, index) => {
              const safeId = createSafeId(player.name, player.team);
              const tooltipId = `continue_streak_${safeId}`;
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
                    
                    {/* Recent performance indicator (last 10 games) */}
                    {player.recentPerformance && (
                      <div className="recent-performance">
                        {player.recentPerformance.map((hit, idx) => (
                          <span 
                            key={idx} 
                            className={`performance-dot ${hit ? 'hit' : 'no-hit'}`}
                            title={hit ? 'Hit' : 'No Hit'}
                          ></span>
                        )).reverse()}
                      </div>
                    )}
                  </div>
                  <div 
                    className="player-stat tooltip-trigger"
                    data-tooltip-id={tooltipId}
                    onClick={(e) => handleTooltipClick(player, e)}
                  >
                    <div className="stat-highlight">{player.currentStreak} game streak</div>
                    <small>Continue: {(player.continuationProbability * 100).toFixed(1)}%</small>
                    <small>Best streak: {player.longestHitStreak} games</small>
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
          <p className="no-data">No notable streaks likely to continue</p>
        )}
      </div>
    </div>
  );
};

export default ContinueStreakCard;