import React from 'react';
import './HomeRunLeadersCard.css';

/**
 * HomeRunLeadersCard - Shows home run leaders for the current time period
 * Modified to include team logo backgrounds
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

              return (
                <li key={index} className="player-item">
                  <div className="player-rank">{index + 1}</div>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div className="player-stat">
                    {player.HR} HR
                    {player.games > 1 && <span className="stat-note">({player.games} games)</span>}
                  </div>
                  
                  {/* Add team logo as background if available */}
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