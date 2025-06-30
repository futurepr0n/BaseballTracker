import React from 'react';
import './HRRateCard.css';

/**
 * HRRateCard - Displays players with the highest HR rate this season
 */
const HRRateCard = ({ 
  topHRRatePlayers, 
  isLoading 
}) => {
  return (
    <div className="card hr-rate-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>⚡ Top HR Rate This Season</h3>
        </div>
        
        {isLoading ? (
          <div className="loading-indicator">Loading stats...</div>
        ) : topHRRatePlayers.length > 0 ? (
          <div className="scrollable-container">
            <ul className="player-list">
              {topHRRatePlayers.map((player, index) => (
                <li key={index} className="player-item">
                  <div className="player-rank">{index + 1}</div>
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
              ))}
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