// Enhanced LiveScoresCard.js with detailed game state
import React from 'react';
import { useLiveScores } from '../../hooks/useLiveScores';
import './LiveScoresCard.css';

const LiveScoresCard = ({ teams }) => {
  const { scores, loading, error, lastUpdated, refresh } = useLiveScores(30000);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatGameDate = (dateString) => {
    const gameDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (gameDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (gameDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else if (gameDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return gameDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getDetailedGameStatus = (game) => {
    const competition = game.competitions?.[0];
    const status = competition?.status || game.status;
    const situation = competition?.situation;
    
    if (game.isLive) {
      // Get detailed live game information
      const inning = status.period;
      const inningHalf = situation?.isTopInning ? 'Top' : 'Bot';
      const outs = situation?.outs ?? null;
      
      let statusText = '🔴 LIVE';
      
      // If we have inning information, show it
      if (inning && inning > 0) {
        const getOrdinal = (n) => {
          const suffixes = ['th', 'st', 'nd', 'rd'];
          const v = n % 100;
          return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
        };
        
        statusText = `${inningHalf} ${getOrdinal(inning)}`;
      } else if (status.displayClock) {
        // Fallback to displayClock if available
        statusText = status.displayClock;
      } else if (status.detail && status.detail !== status.description) {
        // Use detail if it's different from description
        statusText = status.detail;
      }
      
      return {
        text: statusText,
        outs: outs !== null && outs !== undefined ? `${outs} Out${outs !== 1 ? 's' : ''}` : null,
        situation: situation,
        isLive: true
      };
    } else if (game.isCompleted) {
      let finalText = 'Final';
      
      // Add extra innings if applicable
      if (status.period && status.period > 9) {
        finalText = `Final/${status.period}`;
      }
      
      return {
        text: finalText,
        outs: null,
        situation: null,
        isLive: false
      };
    } else {
      const gameDate = formatGameDate(game.date);
      const timeText = gameDate === 'Today' ? formatTime(game.date) : `${gameDate} ${formatTime(game.date)}`;
      
      return {
        text: timeText,
        outs: null,
        situation: null,
        isLive: false
      };
    }
  };

  const BaseRunnerIndicator = ({ situation }) => {
    if (!situation) return null;
    
    // Handle different possible property names for base runners
    const runners = {
      first: situation.onFirst || situation.runnerOnFirst || false,
      second: situation.onSecond || situation.runnerOnSecond || false,
      third: situation.onThird || situation.runnerOnThird || false
    };
    
    // Only show if there are runners
    if (!runners.first && !runners.second && !runners.third) {
      return null;
    }
    
    return (
      <div className="base-runners" title={`Runners: ${
        [
          runners.first && 'First',
          runners.second && 'Second', 
          runners.third && 'Third'
        ].filter(Boolean).join(', ')
      }`}>
        <div className="diamond">
          <div className={`base second ${runners.second ? 'occupied' : ''}`}></div>
          <div className={`base third ${runners.third ? 'occupied' : ''}`}></div>
          <div className={`base first ${runners.first ? 'occupied' : ''}`}></div>
          <div className="base home"></div>
        </div>
      </div>
    );
  };

  const groupGamesByDate = (games) => {
    const groups = {};
    games.forEach(game => {
      const dateKey = formatGameDate(game.date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(game);
    });
    return groups;
  };

  const gameGroups = scores.length > 0 ? groupGamesByDate(scores) : {};

  return (
    <div className="card live-scores-card">
      <div className="card-header">
        <h3>Live Scores</h3>
        <div className="header-controls">
          {lastUpdated && (
            <span className="last-updated">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            className="refresh-btn" 
            onClick={refresh}
            disabled={loading}
            title="Refresh scores"
          >
            🔄
          </button>
        </div>
      </div>

      {loading && scores.length === 0 ? (
        <div className="loading-indicator">Loading live scores...</div>
      ) : error ? (
        <div className="error-message">
          Error loading scores: {error}
          <button onClick={refresh}>Retry</button>
        </div>
      ) : scores.length === 0 ? (
        <div className="no-games">
          <p>No MLB games available</p>
          <small>Check back later for upcoming games</small>
        </div>
      ) : (
        <div className="scores-container">
          {Object.entries(gameGroups).map(([dateGroup, games]) => (
            <div key={dateGroup} className="date-group">
              {Object.keys(gameGroups).length > 1 && (
                <div className="date-header">{dateGroup}</div>
              )}
              {games.map(game => {
                const gameStatus = getDetailedGameStatus(game);
                
                return (
                  <div 
                    key={game.id} 
                    className={`game-score ${game.isLive ? 'live' : ''} ${game.isCompleted ? 'final' : ''}`}
                  >
                    <div className="game-teams">
                      <div className="team away-team">
                        {game.awayTeam.logo && (
                          <img 
                            src={game.awayTeam.logo} 
                            alt={game.awayTeam.name} 
                            className="team-logo"
                          />
                        )}
                        <span className="team-name">{game.awayTeam.abbreviation}</span>
                        <span className="team-score">{game.awayTeam.score}</span>
                      </div>
                      
                      <div className="game-divider">@</div>
                      
                      <div className="team home-team">
                        {game.homeTeam.logo && (
                          <img 
                            src={game.homeTeam.logo} 
                            alt={game.homeTeam.name} 
                            className="team-logo"
                          />
                        )}
                        <span className="team-name">{game.homeTeam.abbreviation}</span>
                        <span className="team-score">{game.homeTeam.score}</span>
                      </div>
                    </div>
                    
                    <div className="game-status-detailed">
                      <div className="game-status">
                        <span className={`status ${game.isLive ? 'live' : ''} ${game.isCompleted ? 'final' : ''}`}>
                          {gameStatus.text}
                        </span>
                        {gameStatus.outs && (
                          <span className="outs-count">
                            {gameStatus.outs}
                          </span>
                        )}
                      </div>
                      
                      <BaseRunnerIndicator situation={gameStatus.situation} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveScoresCard;