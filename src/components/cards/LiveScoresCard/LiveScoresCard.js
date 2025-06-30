// Enhanced LiveScoresCard.js with comprehensive game information
import React, { useState } from 'react';
import { useLiveScores } from '../../hooks/useLiveScores';
import GlassCard, { GlassScrollableContainer } from '../GlassCard/GlassCard';
import './LiveScoresCard.css';

const LiveScoresCard = ({ teams }) => {
  const { scores, loading, error, lastUpdated, refresh } = useLiveScores(30000);
  const [expandedGame, setExpandedGame] = useState(null);
  const [showOnlyLive, setShowOnlyLive] = useState(false);

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
    const status = game.status;
    const gameState = game.gameState;
    
    if (game.isLive) {
      const inning = status.period;
      const inningHalf = gameState.isTopInning ? 'Top' : 'Bot';
      
      let statusText = '🔴 LIVE';
      let detailText = '';
      let countText = '';
      
      // Build inning information
      if (inning && inning > 0) {
        const getOrdinal = (n) => {
          const suffixes = ['th', 'st', 'nd', 'rd'];
          const v = n % 100;
          return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
        };
        
        statusText = `${inningHalf} ${getOrdinal(inning)}`;
      } else if (status.displayClock) {
        statusText = status.displayClock;
      }
      
      // Add count information
      if (gameState.balls !== undefined && gameState.strikes !== undefined) {
        countText = `${gameState.balls}-${gameState.strikes}`;
        if (gameState.outs !== undefined) {
          countText += `, ${gameState.outs} out${gameState.outs !== 1 ? 's' : ''}`;
        }
      }
      
      return {
        text: statusText,
        detail: detailText,
        count: countText,
        situation: gameState,
        isLive: true
      };
    } else if (game.isCompleted) {
      let finalText = 'Final';
      
      if (status.period && status.period > 9) {
        finalText = `Final/${status.period}`;
      }
      
      return {
        text: finalText,
        detail: '',
        count: '',
        situation: null,
        isLive: false
      };
    } else if (game.isDelayed) {
      return {
        text: 'Delayed',
        detail: status.detail || '',
        count: '',
        situation: null,
        isLive: false
      };
    } else if (game.isPostponed) {
      return {
        text: 'Postponed',
        detail: status.detail || '',
        count: '',
        situation: null,
        isLive: false
      };
    } else {
      const gameDate = formatGameDate(game.date);
      const timeText = gameDate === 'Today' ? formatTime(game.date) : `${gameDate} ${formatTime(game.date)}`;
      
      return {
        text: timeText,
        detail: '',
        count: '',
        situation: null,
        isLive: false
      };
    }
  };

  const BaseRunnerIndicator = ({ situation }) => {
    if (!situation) return null;
    
    const runners = {
      first: situation.onFirst || false,
      second: situation.onSecond || false,
      third: situation.onThird || false
    };
    
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

  const WeatherIndicator = ({ weather }) => {
    if (!weather || !weather.displayValue) return null;
    
    return (
      <div className="weather-info" title={`Weather: ${weather.displayValue}${weather.temperature ? ` ${weather.temperature}°F` : ''}`}>
        <span className="weather-icon">
          {weather.displayValue.toLowerCase().includes('sunny') ? '☀️' :
           weather.displayValue.toLowerCase().includes('cloud') ? '☁️' :
           weather.displayValue.toLowerCase().includes('rain') ? '🌧️' :
           weather.displayValue.toLowerCase().includes('storm') ? '⛈️' : '🌤️'}
        </span>
        {weather.temperature && (
          <span className="weather-temp">{weather.temperature}°</span>
        )}
      </div>
    );
  };

  const BroadcastInfo = ({ broadcasts }) => {
    if (!broadcasts || broadcasts.length === 0) return null;
    
    const networkNames = broadcasts.flatMap(b => b.names).slice(0, 2);
    if (networkNames.length === 0) return null;
    
    return (
      <div className="broadcast-info" title={`On ${networkNames.join(', ')}`}>
        📺 {networkNames.join(', ')}
      </div>
    );
  };

  const GameDetails = ({ game }) => {
    if (!game) return null;
    
    return (
      <div className="game-details">
        {game.venue.name && (
          <div className="venue-info">
            📍 {game.venue.name}
            {game.venue.city && `, ${game.venue.city}`}
          </div>
        )}
        
        {game.weather && (
          <div className="weather-detail">
            <WeatherIndicator weather={game.weather} />
            <span>{game.weather.displayValue}</span>
          </div>
        )}
        
        {game.broadcasts.length > 0 && (
          <BroadcastInfo broadcasts={game.broadcasts} />
        )}
        
        {game.odds && (
          <div className="odds-info">
            💰 O/U: {game.odds.overUnder}
            {game.odds.spread && ` | Spread: ${game.odds.spread}`}
          </div>
        )}
        
        {game.notes.length > 0 && (
          <div className="game-notes">
            {game.notes.map((note, index) => (
              <div key={index} className="note">{note}</div>
            ))}
          </div>
        )}
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

  // Filter games if "live only" is selected
  const filteredScores = showOnlyLive ? scores.filter(game => game.isLive) : scores;
  const gameGroups = filteredScores.length > 0 ? groupGamesByDate(filteredScores) : {};

  // Get summary counts
  const liveCount = scores.filter(g => g.isLive).length;
  const totalCount = scores.length;

  return (
    <GlassCard className="live-scores-card" variant="default">
      <div className="card-header">
        <h3>
          Live Scores 
          {liveCount > 0 && (
            <span className="live-indicator">
              🔴 {liveCount} Live
            </span>
          )}
        </h3>
        <div className="header-controls">
          {totalCount > 0 && (
            <div className="filter-controls">
              <button 
                className={`filter-btn ${showOnlyLive ? 'active' : ''}`}
                onClick={() => setShowOnlyLive(!showOnlyLive)}
                disabled={liveCount === 0}
              >
                {showOnlyLive ? 'Show All' : 'Live Only'}
              </button>
            </div>
          )}
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
        <div className="loading-indicator">Loading enhanced live scores...</div>
      ) : error ? (
        <div className="error-message">
          Error loading scores: {error}
          <button onClick={refresh}>Retry</button>
        </div>
      ) : filteredScores.length === 0 ? (
        <div className="no-games">
          {showOnlyLive ? (
            <>
              <p>No live games at the moment</p>
              <small>Check back during game times</small>
            </>
          ) : (
            <>
              <p>No MLB games available</p>
              <small>Check back later for upcoming games</small>
            </>
          )}
        </div>
      ) : (
        <GlassScrollableContainer className="scores-container">
          {Object.entries(gameGroups).map(([dateGroup, games]) => (
            <div key={dateGroup} className="date-group">
              {Object.keys(gameGroups).length > 1 && (
                <div className="date-header">{dateGroup}</div>
              )}
              {games.map(game => {
                const gameStatus = getDetailedGameStatus(game);
                const isExpanded = expandedGame === game.id;
                
                return (
                  <div key={game.id} className="game-container">
                    <div 
                      className={`game-score ${game.isLive ? 'live' : ''} ${game.isCompleted ? 'final' : ''} ${game.isDelayed ? 'delayed' : ''} ${game.isPostponed ? 'postponed' : ''}`}
                      onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                      style={{ cursor: 'pointer' }}
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
                          <div className="team-info">
                            <span className="team-name">{game.awayTeam.abbreviation}</span>
                            {game.awayTeam.record && (
                              <span className="team-record">({game.awayTeam.record})</span>
                            )}
                          </div>
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
                          <div className="team-info">
                            <span className="team-name">{game.homeTeam.abbreviation}</span>
                            {game.homeTeam.record && (
                              <span className="team-record">({game.homeTeam.record})</span>
                            )}
                          </div>
                          <span className="team-score">{game.homeTeam.score}</span>
                        </div>
                      </div>
                      
                      <div className="game-status-detailed">
                        <div className="game-status">
                          <span className={`status ${game.isLive ? 'live' : ''} ${game.isCompleted ? 'final' : ''} ${game.isDelayed ? 'delayed' : ''} ${game.isPostponed ? 'postponed' : ''}`}>
                            {gameStatus.text}
                          </span>
                          {gameStatus.count && (
                            <span className="count-info">
                              {gameStatus.count}
                            </span>
                          )}
                          {gameStatus.detail && (
                            <span className="status-detail">
                              {gameStatus.detail}
                            </span>
                          )}
                        </div>
                        
                        <div className="game-extras">
                          <BaseRunnerIndicator situation={gameStatus.situation} />
                          {game.weather && <WeatherIndicator weather={game.weather} />}
                        </div>
                        
                        <div className="expand-indicator">
                          {isExpanded ? '▼' : '▶'}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="game-details-expanded">
                        <GameDetails game={game} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </GlassScrollableContainer>
      )}
    </GlassCard>
  );
};

export default LiveScoresCard;