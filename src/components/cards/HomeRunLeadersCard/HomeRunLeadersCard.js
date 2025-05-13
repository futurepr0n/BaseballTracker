import React from 'react';
import './HomeRunLeadersCard.css';

/**
 * HomeRunLeadersCard - Displays home run leaders for the current time period
 */
const HomeRunLeadersCard = ({ 
  homers,
  isLoading,
  timePeriodText 
}) => {
  return (
    <div className="card hr-leaders-card">
      <h3>Home Run Leaders ({timePeriodText})</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : homers.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {homers.map((player, index) => (
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
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="no-data">No home run data available for this period</p>
      )}
    </div>
  );
};

export default HomeRunLeadersCard;