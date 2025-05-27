// src/components/cards/LiveScoresCard/LiveScoresCard.js
import React from 'react';
import { useLiveScores } from '../../hooks/useLiveScores';
import './LiveScoresCard.css';

const LiveScoresCard = ({ teams }) => {
  const { scores, loading, error, lastUpdated, refresh } = useLiveScores(30000); // 30 second refresh

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getStatusDisplay = (game) => {
    if (game.isLive) {
      return (
        <span className="status live">
          🔴 {game.status.displayClock || `T${game.status.inning}`}
        </span>
      );
    } else if (game.isCompleted) {
      return <span className="status final">Final</span>;
    } else {
      return <span className="status scheduled">{formatTime(game.date)}</span>;
    }
  };

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
        <div className="no-games">No games scheduled today</div>
      ) : (
        <div className="scores-container">
          {scores.map(game => (
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
              
              <div className="game-status">
                {getStatusDisplay(game)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveScoresCard;