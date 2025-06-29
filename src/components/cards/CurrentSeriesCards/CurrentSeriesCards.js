// src/components/cards/CurrentSeriesCards/CurrentSeriesCard.js
import React, { useState, useEffect } from 'react';
import { debugLog } from '../../../utils/debugConfig';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData,
  fetchGameData
} from '../../../services/dataService';
import './CurrentSeriesCards.css';

/**
 * Find current series statistics for a team vs opponent
 * Looks for consecutive games between the same two teams
 * @param {string} playerTeam - Player's team
 * @param {string} opponentTeam - Opponent team
 * @param {Object} dateRangeData - Historical data
 * @param {Date} currentDate - Current date
 * @returns {Array} Player stats for the current series
 */
const findCurrentSeriesStats = async (playerTeam, opponentTeam, dateRangeData, currentDate) => {
  debugLog.log('CARDS', `[findCurrentSeriesStats] Analyzing current series: ${playerTeam} vs ${opponentTeam}`);
  
  const playerSeriesStats = new Map();
  const sortedDates = Object.keys(dateRangeData).sort().reverse(); // Start from most recent
  
  debugLog.log('CARDS', `[findCurrentSeriesStats] Available dates: ${sortedDates.join(', ')}`);
  
  let seriesGames = [];
  let foundSeriesEnd = false;
  
  // Look backwards through dates to find the current/most recent series
  for (const dateStr of sortedDates) {
    const playersForDate = dateRangeData[dateStr];
    
    if (!playersForDate || playersForDate.length === 0) {
      debugLog.log('CARDS', `[findCurrentSeriesStats] No players data for ${dateStr}`);
      continue;
    }
    
    // Check if both teams have players in the data
    const playerTeamPlayers = playersForDate.filter(p => p.team === playerTeam);
    const opponentTeamPlayers = playersForDate.filter(p => p.team === opponentTeam);
    
    // Load game data to verify if these teams played each other
    let teamsPlayedEachOther = false;
    
    try {
      const gameDataForDate = await fetchGameData(dateStr);
      
      // Check if there's a game between these two teams
      teamsPlayedEachOther = gameDataForDate.some(game => 
        (game.homeTeam === playerTeam && game.awayTeam === opponentTeam) ||
        (game.homeTeam === opponentTeam && game.awayTeam === playerTeam)
      );
    } catch (error) {
      debugLog.log('CARDS', `[findCurrentSeriesStats] Could not load game data for ${dateStr}`);
      // Fallback: if both teams have 8+ players, they likely played
      teamsPlayedEachOther = playerTeamPlayers.length >= 8 && opponentTeamPlayers.length >= 8;
    }
    
    if (teamsPlayedEachOther) {
      // These teams played each other on this date
      debugLog.log('CARDS', `[findCurrentSeriesStats] ✅ Found series game on ${dateStr}: ${playerTeam} vs ${opponentTeam}`);
      
      // Add this game to the series
      seriesGames.unshift({ 
        date: dateStr, 
        players: playersForDate.filter(p => p.team === playerTeam)
      });
    } else if (playerTeamPlayers.length > 0 || opponentTeamPlayers.length > 0) {
      // One of the teams played but not against each other - series has ended
      if (seriesGames.length > 0) {
        debugLog.log('CARDS', `[findCurrentSeriesStats] 🛑 Series ended - teams played different opponents on ${dateStr}`);
        foundSeriesEnd = true;
        break;
      }
    }
    
    // Stop if we've gone back too far (more than 10 days)
    const daysDiff = Math.floor((currentDate - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    if (daysDiff > 10 && seriesGames.length === 0) {
      debugLog.log('CARDS', `[findCurrentSeriesStats] No series found within 10 days`);
      break;
    }
  }
  
  debugLog.log('CARDS', `[findCurrentSeriesStats] Found ${seriesGames.length} games in current series`);
  
  if (seriesGames.length === 0) {
    debugLog.log('CARDS', `[findCurrentSeriesStats] No current series found between ${playerTeam} and ${opponentTeam}`);
    return [];
  }
  
  // Process each game to collect player stats
  seriesGames.forEach((gameData, gameIndex) => {
    debugLog.log('CARDS', `[findCurrentSeriesStats] Processing series game ${gameIndex + 1} on ${gameData.date}`);
    
    gameData.players.forEach(player => {
      // Only process hitters
      const isHitter = (player.playerType === 'hitter' || !player.playerType) && 
                       player.H !== undefined && 
                       player.H !== null;
      
      if (isHitter) {
        const playerKey = `${player.name}_${player.team}`;
        
        if (!playerSeriesStats.has(playerKey)) {
          playerSeriesStats.set(playerKey, {
            name: player.name,
            team: player.team,
            opponent: opponentTeam,
            gamesInSeries: 0,
            totalHitsInSeries: 0,
            totalHRsInSeries: 0,
            totalABInSeries: 0,
            gameResults: [],
            seriesDateRange: ''
          });
        }
        
        const stats = playerSeriesStats.get(playerKey);
        
        // Only count if player actually played (not DNP)
        if (player.H !== 'DNP') {
          const hits = Number(player.H) || 0;
          const hrs = Number(player.HR) || 0;
          const ab = Number(player.AB) || 0;
          
          stats.gamesInSeries++;
          stats.totalHitsInSeries += hits;
          stats.totalHRsInSeries += hrs;
          stats.totalABInSeries += ab;
          stats.gameResults.push({
            date: gameData.date,
            hits,
            hrs,
            ab
          });
          
          debugLog.log('CARDS', `[findCurrentSeriesStats] ${player.name}: ${hits}H, ${hrs}HR in ${ab}AB on ${gameData.date}`);
        }
      }
    });
  });
  
  // Convert to array and calculate stats
  const seriesStartDate = seriesGames[0]?.date;
  const seriesEndDate = seriesGames[seriesGames.length - 1]?.date;
  const dateRange = seriesStartDate === seriesEndDate ? 
    new Date(seriesStartDate).toLocaleDateString() :
    `${new Date(seriesStartDate).toLocaleDateString()} - ${new Date(seriesEndDate).toLocaleDateString()}`;
  
  const result = Array.from(playerSeriesStats.values())
    .filter(player => player.gamesInSeries > 0)
    .map(player => ({
      ...player,
      hitsPerGameInSeries: player.gamesInSeries > 0 ? 
        (player.totalHitsInSeries / player.gamesInSeries).toFixed(2) : '0.00',
      hrsPerGameInSeries: player.gamesInSeries > 0 ? 
        (player.totalHRsInSeries / player.gamesInSeries).toFixed(2) : '0.00',
      avgInSeries: player.totalABInSeries > 0 ? 
        (player.totalHitsInSeries / player.totalABInSeries).toFixed(3) : '.000',
      seriesDateRange: dateRange,
      seriesLength: seriesGames.length
    }));
  
  debugLog.log('CARDS', `[findCurrentSeriesStats] Final result: ${result.length} players with series stats`);
  
  return result;
};

const CurrentSeriesHitsCard = ({ gameData, currentDate, teams }) => {
  const [seriesData, setSeriesData] = useState([]);
  const [seriesInfo, setSeriesInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const analyzeCurrentSeries = async () => {
      try {
        setLoading(true);
        setError(null);
        setDebugInfo('Starting series analysis...');
        
        if (!gameData || gameData.length === 0) {
          debugLog.log('CARDS', '[CurrentSeriesHitsCard] No game data available');
          setDebugInfo('No games scheduled for today');
          setSeriesData([]);
          return;
        }
        
        console.log(`[CurrentSeriesHitsCard] Analyzing ${gameData.length} games:`, gameData.map(g => `${g.awayTeam} @ ${g.homeTeam}`));
        setDebugInfo(`Analyzing ${gameData.length} games...`);
        
        // Load recent historical data
        debugLog.log('CARDS', '[CurrentSeriesHitsCard] Loading historical data...');
        setDebugInfo('Loading historical player data...');
        
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 14, 14);
        
        const availableDates = Object.keys(dateRangeData).sort().reverse();
        console.log(`[CurrentSeriesHitsCard] Loaded data for ${availableDates.length} dates:`, availableDates.slice(0, 5));
        setDebugInfo(`Loaded data for ${availableDates.length} dates`);
        
        if (availableDates.length === 0) {
          setError('No historical player data found');
          setDebugInfo('No historical data available');
          return;
        }
        
        // Analyze each matchup for current series
        const allSeriesStats = [];
        
        for (const game of gameData) {
          debugLog.log('CARDS', `[CurrentSeriesHitsCard] Processing game: ${game.awayTeam} @ ${game.homeTeam}`);
          setDebugInfo(`Analyzing ${game.awayTeam} @ ${game.homeTeam} series...`);
          
          // Analyze both teams' current series
          const homeSeriesStats = await findCurrentSeriesStats(
            game.homeTeam, 
            game.awayTeam, 
            dateRangeData,
            currentDate
          );
          
          const awaySeriesStats = await findCurrentSeriesStats(
            game.awayTeam, 
            game.homeTeam, 
            dateRangeData,
            currentDate
          );
          
          debugLog.log('CARDS', `[CurrentSeriesHitsCard] Results: ${homeSeriesStats.length} home players, ${awaySeriesStats.length} away players`);
          
          allSeriesStats.push(...homeSeriesStats, ...awaySeriesStats);
        }
        
        debugLog.log('CARDS', `[CurrentSeriesHitsCard] Total series stats: ${allSeriesStats.length}`);
        setDebugInfo(`Found ${allSeriesStats.length} players with series data`);
        
        // Sort by hits in current series
        const sortedStats = allSeriesStats
          .filter(player => player.gamesInSeries > 0)
          .sort((a, b) => {
            if (b.totalHitsInSeries !== a.totalHitsInSeries) {
              return b.totalHitsInSeries - a.totalHitsInSeries;
            }
            return parseFloat(b.hitsPerGameInSeries) - parseFloat(a.hitsPerGameInSeries);
          })
          .slice(0, 25);
        
        debugLog.log('CARDS', `[CurrentSeriesHitsCard] Final sorted stats: ${sortedStats.length} players`);
        
        setSeriesData(sortedStats);
        
        if (sortedStats.length > 0) {
          const firstPlayer = sortedStats[0];
          setSeriesInfo({
            opponent: firstPlayer.opponent,
            gamesInSeries: firstPlayer.gamesInSeries,
            seriesDateRange: firstPlayer.seriesDateRange,
            seriesLength: firstPlayer.seriesLength
          });
          setDebugInfo(`Success: ${sortedStats.length} players in current series`);
        } else {
          setDebugInfo('No players found with current series data');
        }
        
      } catch (err) {
        console.error('Error analyzing current series:', err);
        setError('Failed to load series data: ' + err.message);
        setDebugInfo(`Error: ${err.message}`);
        setSeriesData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (gameData.length > 0) {
      analyzeCurrentSeries();
    } else {
      setLoading(false);
      setDebugInfo('No games to analyze');
    }
  }, [gameData, currentDate]);

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { 
      name: teamAbbr, 
      primaryColor: '#2196F3', 
      logoUrl: null 
    };
  };

  if (loading) {
    return (
      <div className="card current-series-hits-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>📊 Current Series Hits</h3>
          </div>
          <div className="loading-indicator">
            Analyzing current series performance...
            <br />
            <small style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
              {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card current-series-hits-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>📊 Current Series Hits</h3>
          </div>
          <div className="no-data">
            Error: {error}
            <br />
            <small style={{ fontSize: '0.8em', color: '#666' }}>
              Debug: {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card current-series-hits-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>📊 Current Series Hits</h3>
          <p className="card-subtitle">
            Best hitters in current series vs opponent
            {seriesInfo.seriesDateRange && (
              <span className="series-info"> ({seriesInfo.seriesDateRange})</span>
            )}
          </p>
        </div>
        
        {seriesData.length === 0 ? (
          <div className="no-data">
            No current series data available
            <br />
            <small style={{ fontSize: '0.8em', color: '#999' }}>
              Debug: {debugInfo}
            </small>
          </div>
        ) : (
          <div className="scrollable-container">
          <ul className="player-list">
            {seriesData.map((player, index) => {
              const teamInfo = getTeamInfo(player.team);
              const opponentInfo = getTeamInfo(player.opponent);
              // Use same approach as working DayOfWeekHitsCard
              const teamData = teams && player.team ? teams[player.team] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              
              return (
                <li key={`${player.name}_${player.team}_${index}`} className="player-item">
                  <div className="player-rank" style={{ backgroundColor: '#2196F3' }}>
                    {logoUrl && (
                      <>
                        <img 
                          src={logoUrl} 
                          alt="" 
                          className="rank-logo"
                          loading="lazy"
                          aria-hidden="true"
                        />
                        <div className="rank-overlay"></div>
                      </>
                    )}
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-team">
                      {teamInfo.name} vs {opponentInfo.abbreviation || opponentInfo.name}
                    </div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: '#2196F3' }}>
                      {player.totalHitsInSeries}H ({player.hitsPerGameInSeries}/G)
                    </span>
                    <small className="stat-note">
                      {player.gamesInSeries}G | {player.avgInSeries} AVG
                    </small>
                  </div>
                  
                  {/* Enhanced background logo */}
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
        )}
        
        {/* Debug info at bottom when no data */}
        {seriesData.length === 0 && (
          <div style={{ fontSize: '0.7em', color: '#999', marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <strong>Debug Info:</strong> {debugInfo}
          </div>
        )}
      </div>
    </div>
  );
};

// Current Series Home Runs Card
const CurrentSeriesHRCard = ({ gameData, currentDate, teams }) => {
  const [seriesData, setSeriesData] = useState([]);
  const [seriesInfo, setSeriesInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const analyzeCurrentSeriesHRs = async () => {
      try {
        setLoading(true);
        setError(null);
        setDebugInfo('Starting HR series analysis...');
        
        if (!gameData || gameData.length === 0) {
          setDebugInfo('No games scheduled');
          setSeriesData([]);
          return;
        }
        
        setDebugInfo('Loading historical data...');
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 14, 14);
        
        const availableDates = Object.keys(dateRangeData).sort().reverse();
        setDebugInfo(`Loaded ${availableDates.length} dates`);
        
        if (availableDates.length === 0) {
          setError('No historical data');
          return;
        }
        
        const allSeriesStats = [];
        
        for (const game of gameData) {
          setDebugInfo(`Analyzing ${game.awayTeam} @ ${game.homeTeam} series...`);
          
          const homeSeriesStats = await findCurrentSeriesStats(
            game.homeTeam, 
            game.awayTeam, 
            dateRangeData,
            currentDate
          );
          
          const awaySeriesStats = await findCurrentSeriesStats(
            game.awayTeam, 
            game.homeTeam, 
            dateRangeData,
            currentDate
          );
          
          allSeriesStats.push(...homeSeriesStats, ...awaySeriesStats);
        }
        
        // Filter for players with HRs
        const sortedStats = allSeriesStats
          .filter(player => player.gamesInSeries > 0 && player.totalHRsInSeries > 0)
          .sort((a, b) => {
            if (b.totalHRsInSeries !== a.totalHRsInSeries) {
              return b.totalHRsInSeries - a.totalHRsInSeries;
            }
            return parseFloat(b.hrsPerGameInSeries) - parseFloat(a.hrsPerGameInSeries);
          })
          .slice(0, 25);
        
        setSeriesData(sortedStats);
        setDebugInfo(`Found ${sortedStats.length} players with HRs in series`);
        
        if (sortedStats.length > 0) {
          const firstPlayer = sortedStats[0];
          setSeriesInfo({
            opponent: firstPlayer.opponent,
            gamesInSeries: firstPlayer.gamesInSeries,
            seriesDateRange: firstPlayer.seriesDateRange,
            seriesLength: firstPlayer.seriesLength
          });
        }
        
      } catch (err) {
        console.error('Error analyzing current series HRs:', err);
        setError('Failed to load series HR data: ' + err.message);
        setDebugInfo(`Error: ${err.message}`);
        setSeriesData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (gameData.length > 0) {
      analyzeCurrentSeriesHRs();
    } else {
      setLoading(false);
      setDebugInfo('No games to analyze');
    }
  }, [gameData, currentDate]);

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { 
      name: teamAbbr, 
      primaryColor: '#e63946', 
      logoUrl: null 
    };
  };

  if (loading) {
    return (
      <div className="card current-series-hr-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🚀 Current Series HRs</h3>
          </div>
          <div className="loading-indicator">
            Analyzing current series HR performance...
            <br />
            <small style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
              {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card current-series-hr-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🚀 Current Series HRs</h3>
          </div>
          <div className="no-data">
            Error: {error}
            <br />
            <small style={{ fontSize: '0.8em', color: '#666' }}>
              Debug: {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card current-series-hr-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>🚀 Current Series HRs</h3>
          <p className="card-subtitle">
            Home run leaders in current series vs opponent
            {seriesInfo.seriesDateRange && (
              <span className="series-info"> ({seriesInfo.seriesDateRange})</span>
            )}
          </p>
        </div>
        
        {seriesData.length === 0 ? (
          <div className="no-data">
            No home runs hit in current series yet
            <br />
            <small style={{ fontSize: '0.8em', color: '#999' }}>
              Debug: {debugInfo}
              <br />
              Check browser console for detailed logs
            </small>
          </div>
        ) : (
          <div className="scrollable-container">
          <ul className="player-list">
            {seriesData.map((player, index) => {
              const teamInfo = getTeamInfo(player.team);
              const opponentInfo = getTeamInfo(player.opponent);
              // Use same approach as working DayOfWeekHitsCard
              const teamData = teams && player.team ? teams[player.team] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              
              return (
                <li key={`${player.name}_${player.team}_${index}`} className="player-item">
                  <div className="player-rank" style={{ backgroundColor: '#e63946' }}>
                    {logoUrl && (
                      <>
                        <img 
                          src={logoUrl} 
                          alt="" 
                          className="rank-logo"
                          loading="lazy"
                          aria-hidden="true"
                        />
                        <div className="rank-overlay"></div>
                      </>
                    )}
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-team">
                      {teamInfo.name} vs {opponentInfo.abbreviation || opponentInfo.name}
                    </div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: '#e63946' }}>
                      {player.totalHRsInSeries} HR{player.totalHRsInSeries > 1 ? 's' : ''}
                    </span>
                    <small className="stat-note">
                      {player.gamesInSeries} games | {player.hrsPerGameInSeries}/G
                    </small>
                  </div>
                  
                  {/* Enhanced background logo */}
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
        )}
        
        {/* Debug info */}
        {seriesData.length === 0 && (
          <div style={{ fontSize: '0.7em', color: '#999', marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <strong>Debug Info:</strong> {debugInfo}
          </div>
        )}
      </div>
    </div>
  );
};

export { CurrentSeriesHitsCard, CurrentSeriesHRCard };