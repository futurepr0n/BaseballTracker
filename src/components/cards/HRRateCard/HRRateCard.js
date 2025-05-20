import React from 'react';
import './HRRateCard.css';

/**
 * HRRateCard - Displays players with the highest HR rate this season
 * Enhanced with integrated team logos
 */
const HRRateCard = ({ 
  topHRRatePlayers, 
  isLoading,
  teams
}) => {
  return (
    <div className="card hr-rate-card">
      <h3>Top HR Rate This Season</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : topHRRatePlayers.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {topHRRatePlayers.map((player, index) => {
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
                      {(player.homeRunsThisSeason / player.gamesPlayed).toFixed(3)} HR/G
                    </div>
                    <small>{player.homeRunsThisSeason} HR in {player.gamesPlayed} games</small>
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
        <p className="no-data">No HR rate data available</p>
      )}
    </div>
  );
};

export default HRRateCard;