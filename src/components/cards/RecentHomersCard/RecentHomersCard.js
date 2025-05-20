import React from 'react';
import './RecentHomersCard.css';

/**
 * RecentHomersCard - Shows players who hit home runs most recently
 */
const RecentHomersCard = ({ 
  recentHRPlayers,
  isLoading,
  teams // Add teams prop
}) => {
  // Helper function to format date - define it FIRST
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    // Split the date string to get year, month, day
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Create date object with local timezone (not UTC)
    // Month is 0-indexed in JavaScript Date, so subtract 1
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="card recent-hr-card">
      <h3>Most Recent Home Runs</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : recentHRPlayers && recentHRPlayers.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {recentHRPlayers.map((player, index) => {
              // Get team logo URL if teams data is available
              const teamAbbr = player.team;
              const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              
              return (
                <li key={index} className="player-item">
                  <div className="player-rank">{index + 1}</div>
                  <div className="player-info">
                    <span className="player-name">{player.fullName || player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div className="player-stat">
                    <div className="stat-highlight">
                      {formatDate(player.lastHRDate)}
                    </div>
                    <small>{player.homeRunsThisSeason} HR this season</small>
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
        <p className="no-data">No recent HR data available</p>
      )}
    </div>
  );
};

export default RecentHomersCard;