import React from 'react';
import './PerformanceCard.css';

/**
 * PerformanceCard - Shows over or under performing players
 * Enhanced with integrated team logos
 */
const PerformanceCard = ({ 
  performingPlayers,
  isLoading,
  type, // 'over' or 'under'
  teams
}) => {
  const isOver = type === 'over';
  
  return (
    <div className={`card ${isOver ? 'over-performing-card' : 'under-performing-card'}`}>
      <h3>{isOver ? 'Top Over-Performing Players' : 'Top Under-Performing Players'}</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : performingPlayers && performingPlayers.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {performingPlayers.map((player, index) => {
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
                    <span className="player-name">{player.fullName || player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div className="player-stat">
                    <div className="stat-highlight">
                      {isOver ? '+' : ''}{player.performanceIndicator.toFixed(1)}%
                    </div>
                    <small>Actual: {player.homeRunsThisSeason} HR</small>
                    <small>Expected: {player.expectedHRs.toFixed(1)} HR</small>
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
        <p className="no-data">No {isOver ? 'over' : 'under'}-performing player data available</p>
      )}
    </div>
  );
};

export default PerformanceCard;