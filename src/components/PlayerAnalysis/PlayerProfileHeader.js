import React from 'react';
import './PlayerProfileHeader.css';

/**
 * PlayerProfileHeader Component
 * 
 * Displays player information with key metrics similar to image:
 * - Player name, number, position
 * - PF Rating, Graph Average, Avg Appearances
 * - Back navigation button
 */
const PlayerProfileHeader = ({ player, onBack, currentDate, seasonStats, previousSeasonStats }) => {
  // Calculate real key metrics based on player data
  const calculatePFRating = () => {
    // Performance Factor Rating based on OPS and games played
    if (seasonStats && seasonStats.OPS) {
      const ops = parseFloat(seasonStats.OPS);
      // Scale OPS to 0-100 rating (0.600 = 60, 1.000 = 100)
      return Math.min(100, Math.max(40, (ops * 100).toFixed(1)));
    }
    return '75.0';
  };

  const calculateGraphAverage = () => {
    // Average performance per game (H + R + RBI) / games
    if (seasonStats && seasonStats.games > 0) {
      const totalProduction = (seasonStats.H || 0) + (seasonStats.R || 0) + (seasonStats.RBI || 0);
      return (totalProduction / seasonStats.games).toFixed(1);
    }
    return '3.5';
  };

  const calculateAvgAppearances = () => {
    // Games per month average
    if (seasonStats && seasonStats.games) {
      // Assume 4 months of season so far
      return (seasonStats.games / 4).toFixed(1);
    }
    return '21.0';
  };

  // Extract position from player data or default
  const getPlayerPosition = () => {
    return player.position || 'OF';
  };

  // Get player number from roster data if available
  const getPlayerNumber = () => {
    // Could be enhanced with actual uniform numbers
    return player.playerId ? (player.playerId % 99) + 1 : 99;
  };

  // Format current date
  const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="player-profile-header">
      <div className="header-controls">
        <button className="back-button" onClick={onBack}>
          ← Back to Search
        </button>
        <div className="analysis-date">
          Analysis for {formattedDate}
        </div>
      </div>

      <div className="player-header-main">
        <div className="player-identity">
          <div className="player-avatar">
            <div className="player-initials">
              {player.name.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
          
          <div className="player-info">
            <div className="player-name-line">
              <h1 className="player-name">{player.name}</h1>
            </div>
            
            <div className="team-info">
              <span className="team-name">{player.team}</span>
              <span className="team-separator">•</span>
              <span className="last-updated">Last seen: {new Date(player.lastSeen).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="key-metrics">
          <div className="metric-card pf-rating">
            <div className="metric-label">PF RATING</div>
            <div className="metric-value">{calculatePFRating()}</div>
            <div className="metric-description">Performance Factor</div>
          </div>

          <div className="metric-card graph-avg">
            <div className="metric-label">GRAPH AVG</div>
            <div className="metric-value">{calculateGraphAverage()}</div>
            <div className="metric-description">Season Average</div>
          </div>

          <div className="metric-card avg-appearances">
            <div className="metric-label">AVG APPEARANCES</div>
            <div className="metric-value">{calculateAvgAppearances()}</div>
            <div className="metric-description">Games per Period</div>
          </div>
        </div>
      </div>

      <div className="quick-stats">
        <div className="stat-item">
          <span className="stat-label">2025 AVG</span>
          <span className="stat-value">{seasonStats?.AVG || player.AVG || '.000'}</span>
          {previousSeasonStats && (
            <span className="stat-comparison">
              2024: {previousSeasonStats.AVG.toFixed(3)}
            </span>
          )}
        </div>
        <div className="stat-item">
          <span className="stat-label">HR</span>
          <span className="stat-value">{seasonStats?.HR || player.HR || 0}</span>
          {previousSeasonStats && (
            <span className="stat-comparison">
              2024: {previousSeasonStats.HR}
            </span>
          )}
        </div>
        <div className="stat-item">
          <span className="stat-label">RBI</span>
          <span className="stat-value">{seasonStats?.RBI || player.RBI || 0}</span>
          {previousSeasonStats && (
            <span className="stat-comparison">
              2024: {previousSeasonStats.RBI || 0}
            </span>
          )}
        </div>
        <div className="stat-item">
          <span className="stat-label">OPS</span>
          <span className="stat-value">{seasonStats?.OPS || '.000'}</span>
          {previousSeasonStats && (
            <span className="stat-comparison">
              2024: {previousSeasonStats.OPS.toFixed(3)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileHeader;