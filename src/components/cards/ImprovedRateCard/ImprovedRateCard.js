import React from 'react';
import './ImprovedRateCard.css';

/**
 * ImprovedRateCard - Shows players with the most improved HR rate compared to historical
 */
const ImprovedRateCard = ({ 
  improvedPlayers,
  isLoading
}) => {
  return (
    <div className="card improved-rate-card">
      <h3>Most Improved HR Rate</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : improvedPlayers && improvedPlayers.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {improvedPlayers.map((player, index) => (
              <li key={index} className="player-item">
                <div className="player-rank">{index + 1}</div>
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
            ))}
          </ul>
        </div>
      ) : (
        <p className="no-data">No improved rate data available</p>
      )}
    </div>
  );
};

export default ImprovedRateCard;