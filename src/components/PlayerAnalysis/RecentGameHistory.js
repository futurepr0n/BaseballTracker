import React from 'react';
import './RecentGameHistory.css';

const RecentGameHistory = ({ playerHistory, player }) => {
  // Get the most recent 5 games
  const recentGames = playerHistory.slice(0, 5);
  
  // Debug: Log the game data structure (can be removed in production)
  // console.log('🎮 Recent Game History - Player:', player?.name);
  // console.log('🎮 Recent games data:', recentGames);
  
  const getOpponent = (game) => {
    // Try various opponent field names
    if (game.opponent) return game.opponent;
    if (game.opposingTeam) return game.opposingTeam;
    if (game.opp) return game.opp;
    
    // Try to determine from venue or other context
    if (game.venue && game.venue.includes(player?.team)) {
      return 'vs ?'; // Home game
    } else if (game.venue) {
      return '@ ?'; // Away game  
    }
    
    return 'vs ?';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getPerformanceClass = (game) => {
    const hits = parseInt(game.H) || 0;
    const ab = parseInt(game.AB) || 0;
    const hr = parseInt(game.HR) || 0;
    const rbi = parseInt(game.RBI) || 0;

    // Performance classification logic

    if (hr > 0 || (hits >= 2 && rbi >= 2)) return 'excellent';
    if (hits >= 2 || rbi >= 2 || hr > 0) return 'good';
    if (hits === 1) return 'average';
    if (ab >= 3 && hits === 0) return 'poor';
    return 'average';
  };

  const getPerformanceIcon = (performanceClass) => {
    const icon = (() => {
      switch (performanceClass) {
        case 'excellent': return '🔥';
        case 'good': return '✅';
        case 'average': return '➖';
        case 'poor': return '❄️';
        default: return '➖';
      }
    })();
    
    // Return the appropriate emoji for the performance class
    
    return icon;
  };

  const calculateTotals = () => {
    return recentGames.reduce((totals, game) => ({
      games: totals.games + 1,
      ab: totals.ab + (parseInt(game.AB) || 0),
      hits: totals.hits + (parseInt(game.H) || 0),
      hr: totals.hr + (parseInt(game.HR) || 0),
      rbi: totals.rbi + (parseInt(game.RBI) || 0),
      runs: totals.runs + (parseInt(game.R) || 0),
      k: totals.k + (parseInt(game.K) || 0)
    }), { games: 0, ab: 0, hits: 0, hr: 0, rbi: 0, runs: 0, k: 0 });
  };

  const totals = calculateTotals();
  const avg = totals.ab > 0 ? (totals.hits / totals.ab).toFixed(3) : '.000';

  // Show loading state if playerHistory is not yet available
  if (!playerHistory || playerHistory.length === 0) {
    return (
      <div className="recent-game-history">
        <div className="section-header">
          <h3>📊 Recent Game History (Last 5)</h3>
        </div>
        <div className="no-data">
          <p>Loading recent game data...</p>
        </div>
      </div>
    );
  }

  if (!recentGames.length) {
    return (
      <div className="recent-game-history">
        <div className="section-header">
          <h3>📊 Recent Game History (Last 5)</h3>
        </div>
        <div className="no-data">
          <p>No recent game data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-game-history">
      <div className="section-header">
        <h3>📊 Recent Game History (Last 5)</h3>
        <div className="totals-summary">
          {totals.games}G: {totals.hits}/{totals.ab} ({avg}), {totals.hr}HR, {totals.rbi}RBI
        </div>
      </div>

      <div className="games-table-container">
        <table className="games-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Opp</th>
              <th>AB</th>
              <th>H</th>
              <th>HR</th>
              <th>RBI</th>
              <th>R</th>
              <th>K</th>
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            {recentGames.map((game, index) => {
              const performanceClass = getPerformanceClass(game);
              const performanceIcon = getPerformanceIcon(performanceClass);
              
              // Calculate performance metrics for this game
              
              return (
                <tr key={index} className={`game-row ${performanceClass}`}>
                  <td className="date-cell">
                    {formatDate(game.gameDate || game.date)}
                  </td>
                  <td className="opponent-cell">
                    {getOpponent(game)}
                  </td>
                  <td className="stat-cell">
                    {game.AB || 0}
                  </td>
                  <td className="stat-cell hits">
                    {game.H || 0}
                  </td>
                  <td className="stat-cell hr">
                    {game.HR || 0}
                  </td>
                  <td className="stat-cell rbi">
                    {game.RBI || 0}
                  </td>
                  <td className="stat-cell runs">
                    {game.R || 0}
                  </td>
                  <td className="stat-cell strikeouts">
                    {game.K || 0}
                  </td>
                  <td className="performance-cell">
                    <span className={`performance-indicator ${performanceClass}`}>
                      {performanceIcon}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="performance-legend">
        <div className="legend-item">
          <span className="legend-icon excellent">🔥</span>
          <span>Excellent (2+ H + 2+ RBI or HR)</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon good">✅</span>
          <span>Good (2+ H or 2+ RBI or HR)</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon average">➖</span>
          <span>Average (1 H)</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon poor">❄️</span>
          <span>Poor (0 H, 3+ AB)</span>
        </div>
      </div>
    </div>
  );
};

export default RecentGameHistory;