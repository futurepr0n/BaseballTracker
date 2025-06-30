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
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>🚀 Top HR Rate This Season</h3>
        </div>
        
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
                const teamColor = teamData ? teamData.primaryColor : "#f97316";
                
                return (
                  <li key={index} className="player-item">
                    {/* Team logo background */}
                    {teamData?.logoUrl && (
                      <img 
                        src={teamData.logoUrl} 
                        alt={teamData.name} 
                        className="team-logo-bg"
                      />
                    )}
                    
                    {/* Rank circle with team colors */}
                    <div 
                      className="player-rank" 
                      style={{ 
                        backgroundColor: teamColor || '#f97316',
                        color: 'white'
                      }}
                    >
                      {logoUrl && (
                        <>
                          <img 
                            src={logoUrl} 
                            alt="" 
                            className="rank-logo" 
                            loading="lazy"
                            aria-hidden="true"
                          />
                          <div className="rank-overlay" style={{ backgroundColor: teamColor || '#f97316' }}></div>
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
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="no-data">No HR rate data available</div>
        )}
      </div>
    </div>
  );
};

export default HRRateCard;