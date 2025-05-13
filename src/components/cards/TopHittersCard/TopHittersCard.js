import React from 'react';
import './TopHittersCard.css';

/**
 * TopHittersCard - Shows the top hitters for the current time period
 */
const TopHittersCard = ({ 
  hitters,
  isLoading,
  timePeriodText 
}) => {
  return (
    <div className="card top-hitters-card">
      <h3>Top Hitters ({timePeriodText})</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : hitters.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {hitters.map((player, index) => (
              <li key={index} className="player-item">
                <div className="player-rank">{index + 1}</div>
                <div className="player-info">
                  <span className="player-name">{player.name}</span>
                  <span className="player-team">{player.team}</span>
                </div>
                <div className="player-stat">
                  {player.H} hits
                  {player.games > 1 && <span className="stat-note">({player.games} games)</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="no-data">No hitting data available for this period</p>
      )}
    </div>
  );
};

export default TopHittersCard;