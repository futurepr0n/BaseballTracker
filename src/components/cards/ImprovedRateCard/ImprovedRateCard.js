import React from 'react';
import './ImprovedRateCard.css';

/**
 * ImprovedRateCard - Shows players with the most improved HR rate compared to historical
 * Enhanced with integrated team logos
 */
const ImprovedRateCard = ({ 
  improvedPlayers,
  isLoading,
  teams
}) => {
  return (
    <div className="card improved-rate-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>📈 Most Improved HR Rate</h3>
        </div>
        
        {isLoading ? (
          <div className="loading-indicator">Loading stats...</div>
        ) : improvedPlayers && improvedPlayers.length > 0 ? (
          <div className="scrollable-container">
            <ul className="player-list">
              {improvedPlayers.map((player, index) => {
                // Get team logo URL if teams data is available
                const teamAbbr = player.team;
                const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
                const logoUrl = teamData ? teamData.logoUrl : null;
                const teamColor = teamData ? teamData.primaryColor : "#10b981";
                
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
                        backgroundColor: teamColor || '#10b981',
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
                          <div className="rank-overlay" style={{ backgroundColor: teamColor || '#10b981' }}></div>
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
                        +{((player.actualHRRate - player.historicalHRRate) * 100).toFixed(1)}%
                      </div>
                      <small>Current: {(player.actualHRRate * 100).toFixed(1)}%</small>
                      <small>Historical: {(player.historicalHRRate * 100).toFixed(1)}%</small>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="no-data">No improved rate data available</div>
        )}
      </div>
    </div>
  );
};

export default ImprovedRateCard;