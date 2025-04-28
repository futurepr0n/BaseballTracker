import React from 'react';
import './GameResults.css';

/**
 * Improved GameResults component - Displays game results for the selected date
 * With better handling of scheduled vs. completed games
 */
function GameResults({ gameData, teamData, currentDate }) {
  // Format date for display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // If no game data is available, display a message
  if (!gameData || gameData.length === 0) {
    return (
      <div className="game-results">
        <h2>Game Results - {formattedDate}</h2>
        <div className="no-games">
          <p>No game data available for this date.</p>
        </div>
      </div>
    );
  }
  
  // Split games by status (completed vs. scheduled)
  const completedGames = gameData.filter(game => 
    game.homeScore !== null && game.awayScore !== null && game.status !== 'Scheduled'
  );
  
  const scheduledGames = gameData.filter(game => 
    game.homeScore === null || game.awayScore === null || game.status === 'Scheduled'
  );
  
  // Only calculate statistics for completed games
  const gamesWithData = completedGames.map(game => {
    const totalRuns = (game.homeScore || 0) + (game.awayScore || 0);
    const isHomeWin = (game.homeScore || 0) > (game.awayScore || 0);
    const scoreDiff = Math.abs((game.homeScore || 0) - (game.awayScore || 0));
    
    return {
      ...game,
      totalRuns,
      isHomeWin,
      scoreDiff
    };
  });
  
  // Calculate summary statistics only if we have completed games
  const summary = {
    totalGames: gameData.length,
    completedGames: completedGames.length,
    scheduledGames: scheduledGames.length,
    homeWins: completedGames.filter(game => (game.homeScore || 0) > (game.awayScore || 0)).length,
    awayWins: completedGames.filter(game => (game.homeScore || 0) < (game.awayScore || 0)).length,
    avgRuns: completedGames.length > 0 
      ? (completedGames.reduce((sum, game) => sum + (game.homeScore || 0) + (game.awayScore || 0), 0) / completedGames.length).toFixed(1)
      : 'N/A'
  };
  
  return (
    <div className="game-results">
      <h2>Game Results - {formattedDate}</h2>
      
      <div className="games-grid">
        {gameData.map((game, index) => {
          // Get team colors
          const homeTeamData = teamData[game.homeTeam] || {};
          const awayTeamData = teamData[game.awayTeam] || {};
          
          // Determine if the game is completed
          const isCompleted = game.homeScore !== null && game.awayScore !== null && game.status !== 'Scheduled';
          
          // Game statistics (only calculate for completed games)
          const gameStats = isCompleted ? {
            totalRuns: (game.homeScore || 0) + (game.awayScore || 0),
            isHomeWin: (game.homeScore || 0) > (game.awayScore || 0),
            winningTeam: (game.homeScore || 0) > (game.awayScore || 0) 
              ? (homeTeamData.name || game.homeTeam) 
              : (awayTeamData.name || game.awayTeam),
            scoreDiff: Math.abs((game.homeScore || 0) - (game.awayScore || 0))
          } : null;
          
          return (
            <div key={index} className="game-card">
              <div className="game-header">
                <span className="game-status">{game.status}</span>
                <span className="game-venue">{game.venue}</span>
              </div>
              
              <div className="teams-container">
                {/* Away Team */}
                <div className="team away-team">
                  <div className="team-logo" style={{ backgroundColor: awayTeamData.primaryColor || '#ddd' }}>
                    {game.awayTeam}
                  </div>
                  <div className="team-info">
                    <span className="team-name">{awayTeamData.name || game.awayTeam}</span>
                    <span className="team-record">{game.awayRecord || ''}</span>
                  </div>
                  <div className="team-score">{isCompleted ? game.awayScore : '-'}</div>
                </div>
                
                {/* Home Team */}
                <div className="team home-team">
                  <div className="team-logo" style={{ backgroundColor: homeTeamData.primaryColor || '#ddd' }}>
                    {game.homeTeam}
                  </div>
                  <div className="team-info">
                    <span className="team-name">{homeTeamData.name || game.homeTeam}</span>
                    <span className="team-record">{game.homeRecord || ''}</span>
                  </div>
                  <div className="team-score">{isCompleted ? game.homeScore : '-'}</div>
                </div>
              </div>
              
              {isCompleted ? (
                <div className="game-stats">
                  <div className="stat">
                    <span className="stat-label">Total Runs</span>
                    <span className="stat-value">{gameStats.totalRuns}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Winner</span>
                    <span className="stat-value">{gameStats.winningTeam}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Margin</span>
                    <span className="stat-value">{gameStats.scoreDiff}</span>
                  </div>
                </div>
              ) : (
                <div className="game-scheduled-info">
                  <span className="game-time">
                    {new Date(game.dateTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              
              {game.attendance && isCompleted && (
                <div className="attendance">
                  <span className="attendance-icon">👥</span>
                  <span className="attendance-value">{game.attendance.toLocaleString()}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="games-summary">
        <h3>Summary</h3>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-label">Total Games</span>
            <span className="summary-value">{summary.totalGames}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-label">Completed</span>
            <span className="summary-value">{summary.completedGames}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-label">Scheduled</span>
            <span className="summary-value">{summary.scheduledGames}</span>
          </div>
          {summary.completedGames > 0 && (
            <>
              <div className="summary-stat">
                <span className="summary-label">Home Wins</span>
                <span className="summary-value">{summary.homeWins}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-label">Away Wins</span>
                <span className="summary-value">{summary.awayWins}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-label">Avg. Runs</span>
                <span className="summary-value">{summary.avgRuns}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameResults;