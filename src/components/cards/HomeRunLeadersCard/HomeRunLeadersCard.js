import React from 'react';
import './HomeRunLeadersCard.css'; // Keep your original CSS import

/**
 * HomeRunLeadersCard - Shows home run leaders for the current time period
 * Enhanced with better team logo visualization
 */
const HomeRunLeadersCard = ({ 
  homers,
  isLoading,
  timePeriodText,
  teams // Add this prop 
}) => {
  return (
    <div className="card hr-leaders-card">
      <h3>Home Run Leaders ({timePeriodText})</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : homers.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {homers.map((player, index) => {
              // Get team logo URL if teams data is available
              const teamAbbr = player.team;
              const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              // Get team color - use a default if not available
              const teamColor = teamData ? teamData.primaryColor : "#333333";

              return (
                <li key={index} className="player-item">
                  {/* Enhanced rank indicator with logo inside */}
                  <div className="player-rank">
                    {/* Only add the logo if available */}
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
                    {player.HR} HR
                    {player.games > 1 && <span className="stat-note">({player.games} games)</span>}
                  </div>
                  
                  {/* Keep the larger background logo */}
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
        <p className="no-data">No home run data available for this period</p>
      )}
    </div>
  );
};

export default HomeRunLeadersCard;