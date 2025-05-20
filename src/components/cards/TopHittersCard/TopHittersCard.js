import React from 'react';
import './TopHittersCard.css';

/**
 * TopHittersCard - Shows the top hitters for the current time period
 * Enhanced with integrated team logos
 */
const TopHittersCard = ({ 
  hitters,
  isLoading,
  timePeriodText,
  teams
}) => {
  return (
    <div className="card top-hitters-card">
      <h3>Top Hitters ({timePeriodText})</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : hitters.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {hitters.map((player, index) => {
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
                  <div className="player-stat">
                    {player.H} hits
                    {player.games > 1 && <span className="stat-note">({player.games} games)</span>}
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
        <p className="no-data">No hitting data available for this period</p>
      )}
    </div>
  );
};

export default TopHittersCard;