// Enhanced LiveScoresCard.js with completely isolated styling
import React, { useState, useEffect, useCallback } from 'react';
import './LiveScoresCardIsolated.css';

const LiveScoresCard = () => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [expandedGames, setExpandedGames] = useState(new Set());
  const [activeTab, setActiveTab] = useState({});
  const [playByPlayHistory, setPlayByPlayHistory] = useState({});
  const [showOnlyLive, setShowOnlyLive] = useState(false);

  const maxRetries = 3;
  const maxPlays = 5;
  const refreshInterval = 30000; // 30 seconds

  const isLive = useCallback((game) => {
    return game.competitions?.[0]?.status?.type?.state === 'in';
  }, []);

  const updatePlayByPlayHistory = useCallback((games) => {
    setPlayByPlayHistory(prev => {
      const updated = { ...prev };
      
      games.forEach(game => {
        if (isLive(game)) {
          const situation = game.competitions?.[0]?.situation;
          if (situation?.lastPlay?.text) {
            const gameId = game.id;
            const currentPlay = {
              text: situation.lastPlay.text,
              timestamp: new Date(),
              inning: situation.period || 9,
              isTopInning: situation.isTopInning
            };

            // Initialize history for new games
            if (!updated[gameId]) {
              updated[gameId] = [];
            }

            // Only add if it's a new play (different from last recorded)
            const lastRecorded = updated[gameId][0];
            if (!lastRecorded || lastRecorded.text !== currentPlay.text) {
              updated[gameId] = [currentPlay, ...updated[gameId]];
              
              // Keep only last 5 plays
              if (updated[gameId].length > maxPlays) {
                updated[gameId] = updated[gameId].slice(0, maxPlays);
              }
            }
          }
        }
      });
      
      return updated;
    });
  }, [isLive, maxPlays]);

  const fetchScores = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        setRetryCount(0);
      }
      setError(null);
      
      console.log(`🔄 Fetching live scores from ESPN API... ${isRetry ? `(Retry ${retryCount + 1}/${maxRetries})` : ''}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 ESPN API Response:', data);
      
      const games = (data.events || []).map(event => {
        const competition = event.competitions[0];
        const home = competition.competitors.find(c => c.homeAway === 'home');
        const away = competition.competitors.find(c => c.homeAway === 'away');
        const status = competition.status;
        
        return {
          id: event.id,
          date: event.date,
          name: event.name,
          shortName: event.shortName,
          competitions: [competition],
          homeTeam: {
            name: home.team.displayName,
            abbreviation: home.team.abbreviation,
            score: home.score || '0',
            logo: home.team.logo,
            record: home.records?.[0]?.summary || '',
            color: home.team.color || '#000000',
            leaders: home.leaders || []
          },
          awayTeam: {
            name: away.team.displayName,
            abbreviation: away.team.abbreviation,
            score: away.score || '0',
            logo: away.team.logo,
            record: away.records?.[0]?.summary || '',
            color: away.team.color || '#000000',
            leaders: away.leaders || []
          },
          status: {
            description: status.type.description,
            detail: status.type.detail,
            state: status.type.state,
            period: status.period,
            displayClock: status.displayClock
          },
          venue: {
            name: competition.venue?.fullName || '',
            city: competition.venue?.address?.city || '',
            state: competition.venue?.address?.state || ''
          },
          broadcasts: competition.broadcasts || [],
          isLive: status.type.state === 'in',
          isCompleted: status.type.state === 'post',
          isScheduled: status.type.state === 'pre'
        };
      });

      // Sort games (live first, then scheduled, then final)
      const sortedGames = games.sort((a, b) => {
        // Live games first
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        
        // If neither is live, sort by completion status
        if (!a.isLive && !b.isLive) {
          // If one is completed and other is not, non-completed comes first
          if (a.isCompleted && !b.isCompleted) return 1;
          if (!a.isCompleted && b.isCompleted) return -1;
        }
        
        // Sort by date within same status
        return new Date(a.date) - new Date(b.date);
      });

      // Update play-by-play history for live games
      updatePlayByPlayHistory(sortedGames);

      setScores(sortedGames);
      setLastUpdated(new Date());
      setLoading(false);
      setRetryCount(0);
      
    } catch (err) {
      console.error('❌ Error fetching live scores:', err);
      
      if (retryCount < maxRetries && !isRetry) {
        const retryDelay = Math.pow(2, retryCount) * 1000;
        console.log(`⏰ Retrying in ${retryDelay}ms...`);
        
        setRetryCount(prev => prev + 1);
        setError(`Connection issue. Retrying... (${retryCount + 1}/${maxRetries})`);
        
        setTimeout(() => {
          fetchScores(true);
        }, retryDelay);
      } else {
        setError(err.name === 'AbortError' ? 'Request timeout - will retry on next refresh' : err.message);
        setLoading(false);
      }
    }
  }, [retryCount, maxRetries, updatePlayByPlayHistory]);

  // Initial fetch
  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing scores...');
      fetchScores();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchScores, refreshInterval]);

  const toggleGameDetails = (gameId) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  const switchTab = (gameId, tabName) => {
    setActiveTab(prev => ({
      ...prev,
      [gameId]: tabName
    }));
  };

  const getStatusText = (status, situation, isLive) => {
    if (isLive) {
      const inning = status.period || 9;
      const half = situation?.isTopInning ? 'Top' : 'Bot';
      return `🔴 ${half} ${inning}`;
    } else if (status.state === 'post') {
      return status.period > 9 ? `Final/${status.period}` : 'Final';
    } else {
      const gameTime = new Date(status.displayClock || '').toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      return gameTime !== 'Invalid Date' ? gameTime : 'Scheduled';
    }
  };

  const getLiveDetails = (situation) => {
    if (!situation) return '';
    const balls = situation.balls || 0;
    const strikes = situation.strikes || 0;
    const outs = situation.outs || 0;
    return `${balls}-${strikes}, ${outs} out${outs !== 1 ? 's' : ''}`;
  };

  const createLiveSituation = (situation) => {
    if (!situation) return <div>No live situation data available.</div>;
    
    const hasRunners = situation.onFirst || situation.onSecond || situation.onThird;
    
    return (
      <div className="live-scores-isolated-live-situation">
        <div className="live-scores-isolated-situation-grid">
          <div>
            <div className="live-scores-isolated-count-display">
              ⚾ Count: {situation.balls || 0}-{situation.strikes || 0}, {situation.outs || 0} out{situation.outs !== 1 ? 's' : ''}
            </div>
            {situation.lastPlay?.text && (
              <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#666' }}>
                Last: {situation.lastPlay.text}
              </div>
            )}
          </div>
          <div className="live-scores-isolated-base-runners">
            <span style={{ fontSize: '0.85rem', marginRight: '10px' }}>
              {hasRunners ? 'Runners:' : 'Bases empty'}
            </span>
            <div className="live-scores-isolated-diamond">
              <div className={`live-scores-isolated-base second ${situation.onSecond ? 'occupied' : ''}`}></div>
              <div className={`live-scores-isolated-base third ${situation.onThird ? 'occupied' : ''}`}></div>
              <div className={`live-scores-isolated-base first ${situation.onFirst ? 'occupied' : ''}`}></div>
              <div className="live-scores-isolated-base home"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const createGameInfo = (game) => {
    const competition = game.competitions[0];
    const venue = competition.venue || {};
    
    return (
      <div>
        <div><strong>📍 Venue:</strong> {venue.fullName || 'TBD'}</div>
        {venue.address?.city && (
          <div><strong>📍 Location:</strong> {venue.address.city}, {venue.address.state}</div>
        )}
        <div><strong>📅 Date:</strong> {new Date(game.date).toLocaleDateString()}</div>
        {competition.broadcasts?.length > 0 && (
          <div><strong>📺 TV:</strong> {competition.broadcasts.map(b => b.names.join(', ')).join(', ')}</div>
        )}
      </div>
    );
  };

  const createPlayersSection = (game) => {
    const situation = game.competitions[0].situation || {};
    const dueUp = situation.dueUp || [];
    
    if (dueUp.length === 0) {
      return <div>Player information not available at this time.</div>;
    }
    
    return (
      <div>
        <h4>Due Up:</h4>
        <div className="live-scores-isolated-due-up-section">
          {dueUp.map((player, index) => (
            <div key={index} className="live-scores-isolated-due-up-player">
              <div 
                className="live-scores-isolated-player-photo" 
                style={{ backgroundImage: player.athlete?.headshot ? `url(${player.athlete.headshot})` : 'none' }}
              ></div>
              <div className="live-scores-isolated-player-info">
                <div className="live-scores-isolated-player-name">{player.athlete?.displayName || 'Player'}</div>
                <div className="live-scores-isolated-player-stats">{player.summary || 'No stats available'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const createLeadersSection = (homeTeam, awayTeam) => {
    const allLeaders = [...(homeTeam.leaders || []), ...(awayTeam.leaders || [])];
    
    if (allLeaders.length === 0) {
      return <div>Team leader statistics not available at this time.</div>;
    }
    
    return (
      <div className="live-scores-isolated-leaders-section">
        {allLeaders.map((leader, index) => (
          <div key={index} className="live-scores-isolated-leader-card">
            <div className="live-scores-isolated-stat-category">{leader.displayName}</div>
            {leader.leaders && leader.leaders[0] ? (
              <div className="live-scores-isolated-leader-info">
                <img 
                  src={leader.leaders[0].athlete.headshot || 'https://via.placeholder.com/35'} 
                  alt={leader.leaders[0].athlete.displayName} 
                  className="live-scores-isolated-leader-headshot"
                />
                <div>
                  <strong>{leader.leaders[0].athlete.shortName}</strong><br />
                  <small>{leader.leaders[0].displayValue}</small>
                </div>
              </div>
            ) : (
              <div>No data available</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const createPlayByPlaySection = (gameId) => {
    const plays = playByPlayHistory[gameId] || [];
    
    if (plays.length === 0) {
      return <div>No play-by-play history available.</div>;
    }
    
    return (
      <div className="live-scores-isolated-play-by-play-section">
        <h4>Recent Plays (Last {maxPlays})</h4>
        <div className="live-scores-isolated-plays-list">
          {plays.map((play, index) => (
            <div key={index} className={`live-scores-isolated-play-item ${index === 0 ? 'latest-play' : ''}`}>
              <div className="live-scores-isolated-play-header">
                <span className="live-scores-isolated-play-time">{play.timestamp.toLocaleTimeString()}</span>
                <span className="live-scores-isolated-play-inning">{play.isTopInning ? 'Top' : 'Bot'} {play.inning}</span>
              </div>
              <div className="live-scores-isolated-play-description">{play.text}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const createGameDetails = (game, isLive) => {
    const currentActiveTab = activeTab[game.id] || (isLive ? 'live' : 'info');
    const competition = game.competitions[0];
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
    const situation = competition.situation || {};
    
    return (
      <div className="live-scores-isolated-game-details show">
        <div className="live-scores-isolated-details-tabs">
          {isLive && (
            <button 
              className={`live-scores-isolated-tab-btn ${currentActiveTab === 'live' ? 'active' : ''}`}
              onClick={() => switchTab(game.id, 'live')}
            >
              Live Situation
            </button>
          )}
          <button 
            className={`live-scores-isolated-tab-btn ${currentActiveTab === 'info' ? 'active' : ''}`}
            onClick={() => switchTab(game.id, 'info')}
          >
            Game Info
          </button>
          <button 
            className={`live-scores-isolated-tab-btn ${currentActiveTab === 'players' ? 'active' : ''}`}
            onClick={() => switchTab(game.id, 'players')}
          >
            Players
          </button>
          <button 
            className={`live-scores-isolated-tab-btn ${currentActiveTab === 'leaders' ? 'active' : ''}`}
            onClick={() => switchTab(game.id, 'leaders')}
          >
            Leaders
          </button>
          {isLive && (
            <button 
              className={`live-scores-isolated-tab-btn ${currentActiveTab === 'plays' ? 'active' : ''}`}
              onClick={() => switchTab(game.id, 'plays')}
            >
              Play-by-Play
            </button>
          )}
        </div>
        
        {isLive && (
          <div className={`live-scores-isolated-tab-content ${currentActiveTab === 'live' ? 'active' : ''}`}>
            {createLiveSituation(situation)}
          </div>
        )}
        
        <div className={`live-scores-isolated-tab-content ${currentActiveTab === 'info' ? 'active' : ''}`}>
          {createGameInfo(game)}
        </div>
        
        <div className={`live-scores-isolated-tab-content ${currentActiveTab === 'players' ? 'active' : ''}`}>
          {createPlayersSection(game)}
        </div>
        
        <div className={`live-scores-isolated-tab-content ${currentActiveTab === 'leaders' ? 'active' : ''}`}>
          {createLeadersSection(homeTeam, awayTeam)}
        </div>
        
        {isLive && (
          <div className={`live-scores-isolated-tab-content ${currentActiveTab === 'plays' ? 'active' : ''}`}>
            {createPlayByPlaySection(game.id)}
          </div>
        )}
      </div>
    );
  };

  const createGameCard = (game) => {
    const competition = game.competitions[0];
    const status = competition.status;
    const situation = competition.situation || {};
    const isLive = game.isLive;
    const isExpanded = expandedGames.has(game.id);
    
    const home = competition.competitors.find(c => c.homeAway === 'home');
    const away = competition.competitors.find(c => c.homeAway === 'away');
    
    const homeScore = parseInt(home.score || 0);
    const awayScore = parseInt(away.score || 0);
    const isCompleted = status.type.state === 'post';
    
    return (
      <div key={game.id} className={`live-scores-isolated-game-card ${isLive ? 'live' : ''} ${isExpanded ? 'expanded' : ''}`}>
        <div 
          className="live-scores-isolated-game-summary"
          onClick={() => toggleGameDetails(game.id)}
        >
          <div className="live-scores-isolated-game-header">
            <div className="live-scores-isolated-teams-display">
              <div className="live-scores-isolated-team">
                <img src={away.team.logo} alt={away.team.displayName} className="live-scores-isolated-team-logo" />
                <div className="live-scores-isolated-team-info">
                  <div className="live-scores-isolated-team-name">{away.team.abbreviation}</div>
                  <div className="live-scores-isolated-team-record">{away.records?.[0]?.summary || ''}</div>
                </div>
                <div className={`live-scores-isolated-team-score ${isCompleted && awayScore > homeScore ? 'winning' : ''}`}>
                  {away.score || 0}
                </div>
              </div>
              
              <div className="live-scores-isolated-vs-divider">@</div>
              
              <div className="live-scores-isolated-team">
                <div className={`live-scores-isolated-team-score ${isCompleted && homeScore > awayScore ? 'winning' : ''}`}>
                  {home.score || 0}
                </div>
                <div className="live-scores-isolated-team-info">
                  <div className="live-scores-isolated-team-name">{home.team.abbreviation}</div>
                  <div className="live-scores-isolated-team-record">{home.records?.[0]?.summary || ''}</div>
                </div>
                <img src={home.team.logo} alt={home.team.displayName} className="live-scores-isolated-team-logo" />
              </div>
            </div>
            
            {/* Desktop: Status inline, Mobile: Status in separate row */}
            <div className="live-scores-isolated-game-status live-scores-isolated-desktop-status">
              <div className={`live-scores-isolated-status-badge ${isLive ? 'live' : isCompleted ? 'final' : 'scheduled'}`}>
                {getStatusText(status, situation, isLive)}
              </div>
              {isLive && situation && (
                <div className="live-scores-isolated-live-details">{getLiveDetails(situation)}</div>
              )}
            </div>
            
            <div className="live-scores-isolated-expand-indicator live-scores-isolated-desktop-expand">
              {isExpanded ? '▼' : '▶'}
            </div>
            
            {/* Mobile status row */}
            <div className="live-scores-isolated-mobile-status-row">
              <div className="live-scores-isolated-game-status">
                <div className={`live-scores-isolated-status-badge ${isLive ? 'live' : isCompleted ? 'final' : 'scheduled'}`}>
                  {getStatusText(status, situation, isLive)}
                </div>
                {isLive && situation && (
                  <div className="live-scores-isolated-live-details">{getLiveDetails(situation)}</div>
                )}
              </div>
              <div className="live-scores-isolated-expand-indicator">
                {isExpanded ? '▼' : '▶'}
              </div>
            </div>
          </div>
        </div>
        
        {isExpanded && createGameDetails(game, isLive)}
      </div>
    );
  };

  // Filter games
  const filteredScores = showOnlyLive ? scores.filter(game => game.isLive) : scores;
  
  // Get summary counts
  const liveCount = scores.filter(g => g.isLive).length;
  const totalCount = scores.length;

  return (
    <div className="live-scores-isolated-wrapper">
      <div className="live-scores-isolated-header">
        <h3>
          Live Scores 
          {liveCount > 0 && (
            <span className="live-scores-isolated-live-indicator">
              🔴 {liveCount} Live
            </span>
          )}
        </h3>
        <div className="live-scores-isolated-refresh-controls">
          {totalCount > 0 && (
            <div className="live-scores-isolated-filter-controls">
              <button 
                className={`live-scores-isolated-filter-btn ${showOnlyLive ? 'active' : ''}`}
                onClick={() => setShowOnlyLive(!showOnlyLive)}
                disabled={liveCount === 0}
              >
                {showOnlyLive ? 'Show All' : 'Live Only'}
              </button>
            </div>
          )}
          {lastUpdated && (
            <span className="live-scores-isolated-last-updated">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            className="live-scores-isolated-refresh-btn" 
            onClick={() => fetchScores(true)}
            disabled={loading}
            title="Refresh scores"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="live-scores-isolated-content">
        {loading && scores.length === 0 ? (
          <div className="live-scores-isolated-loading">Loading enhanced live scores...</div>
        ) : error ? (
          <div className="live-scores-isolated-error">
            Error loading scores: {error}
            <button className="live-scores-isolated-retry-btn" onClick={() => fetchScores(true)}>Retry</button>
          </div>
        ) : filteredScores.length === 0 ? (
          <div className="live-scores-isolated-no-games">
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
          <div className="live-scores-isolated-games-container">
            {filteredScores.map(game => createGameCard(game))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveScoresCard;