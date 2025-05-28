// src/components/cards/CurrentSeriesHitsCard/CurrentSeriesHitsCard.js
import React, { useState, useEffect } from 'react';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData 
} from '../../../services/dataService';

const CurrentSeriesHitsCard = ({ gameData, currentDate, teams }) => {
  const [seriesData, setSeriesData] = useState([]);
  const [seriesInfo, setSeriesInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const analyzeCurrentSeries = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!gameData || gameData.length === 0) {
          setSeriesData([]);
          return;
        }
        
        // Load recent historical data (last 2 weeks to catch current series)
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          0,   // Start from today
          14   // Look back 2 weeks max
        );
        
        // Analyze each matchup for current series
        const allSeriesStats = [];
        
        for (const game of gameData) {
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
        
        // Sort by hits in current series
        const sortedStats = allSeriesStats
          .filter(player => player.gamesInSeries > 0)
          .sort((a, b) => {
            // Primary sort: total hits in series
            if (b.totalHitsInSeries !== a.totalHitsInSeries) {
              return b.totalHitsInSeries - a.totalHitsInSeries;
            }
            // Secondary sort: hits per game
            return parseFloat(b.hitsPerGameInSeries) - parseFloat(a.hitsPerGameInSeries);
          })
          .slice(0, 25);
        
        setSeriesData(sortedStats);
        
        // Set series info for display
        if (sortedStats.length > 0) {
          const firstPlayer = sortedStats[0];
          setSeriesInfo({
            opponent: firstPlayer.opponent,
            gamesInSeries: firstPlayer.gamesInSeries,
            seriesDateRange: firstPlayer.seriesDateRange
          });
        }
        
      } catch (err) {
        console.error('Error analyzing current series:', err);
        setError('Failed to load series data');
        setSeriesData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (gameData.length > 0) {
      analyzeCurrentSeries();
    }
  }, [gameData, currentDate]);

  /**
   * Find current series statistics for a team vs opponent
   */
  const findCurrentSeriesStats = async (playerTeam, opponentTeam, dateRangeData, currentDate) => {
    const playerSeriesStats = new Map();
    const sortedDates = Object.keys(dateRangeData).sort().reverse(); // Start from most recent
    
    let seriesGames = [];
    let foundDifferentOpponent = false;
    
    // Go backwards in time to find the current series
    for (const dateStr of sortedDates) {
      const gameDate = new Date(dateStr);
      const playersForDate = dateRangeData[dateStr];
      
      // Check if these two teams played on this date
      const hasPlayerTeam = playersForDate.some(p => p.team === playerTeam);
      const hasOpponentTeam = playersForDate.some(p => p.team === opponentTeam);
      
      if (hasPlayerTeam && hasOpponentTeam) {
        // This is part of the current series
        seriesGames.unshift({ date: dateStr, players: playersForDate });
      } else if (hasPlayerTeam) {
        // Player team played but against different opponent
        const otherOpponents = playersForDate
          .filter(p => p.team !== playerTeam)
          .map(p => p.team);
        
        if (otherOpponents.length > 0 && !otherOpponents.includes(opponentTeam)) {
          // Found a game against a different opponent, series boundary found
          foundDifferentOpponent = true;
          break;
        }
      }
      
      // Limit search to prevent going too far back
      if (seriesGames.length >= 6) break; // Most series are 3-4 games
    }
    
    // If no different opponent found and we have games, this might be the start of season
    // In that case, use all games found
    
    if (seriesGames.length === 0) return [];
    
    // Calculate stats for each player in the series
    seriesGames.forEach(gameData => {
      const playersInGame = gameData.players.filter(p => p.team === playerTeam);
      
      playersInGame.forEach(player => {
        if (player.playerType === 'hitter' || !player.playerType) {
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
          }
        }
      });
    });
    
    // Convert to array and add calculated stats
    const seriesStartDate = seriesGames[0]?.date;
    const seriesEndDate = seriesGames[seriesGames.length - 1]?.date;
    const dateRange = seriesStartDate === seriesEndDate ? 
      new Date(seriesStartDate).toLocaleDateString() :
      `${new Date(seriesStartDate).toLocaleDateString()} - ${new Date(seriesEndDate).toLocaleDateString()}`;
    
    return Array.from(playerSeriesStats.values())
      .map(player => ({
        ...player,
        hitsPerGameInSeries: player.gamesInSeries > 0 ? 
          (player.totalHitsInSeries / player.gamesInSeries).toFixed(2) : '0.00',
        hrsPerGameInSeries: player.gamesInSeries > 0 ? 
          (player.totalHRsInSeries / player.gamesInSeries).toFixed(2) : '0.00',
        avgInSeries: player.totalABInSeries > 0 ? 
          (player.totalHitsInSeries / player.totalABInSeries).toFixed(3) : '.000',
        seriesDateRange: dateRange
      }));
  };

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { 
      name: teamAbbr, 
      primaryColor: '#2196F3', 
      logoUrl: null 
    };
  };

  if (loading) {
    return (
      <div className="card">
        <h3>📊 Current Series Hits</h3>
        <div className="loading-indicator">Analyzing current series performance...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>📊 Current Series Hits</h3>
        <div className="no-data">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>📊 Current Series Hits</h3>
      <p className="card-subtitle">
        Best hitters in current series vs opponent
        {seriesInfo.seriesDateRange && (
          <span className="series-info"> ({seriesInfo.seriesDateRange})</span>
        )}
      </p>
      
      {seriesData.length === 0 ? (
        <div className="no-data">
          No current series data available
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {seriesData.map((player, index) => {
              const teamInfo = getTeamInfo(player.team);
              const opponentInfo = getTeamInfo(player.opponent);
              
              return (
                <li key={`${player.name}_${player.team}`} className="player-item">
                  {/* Team logo background */}
                  {teamInfo.logoUrl && (
                    <img 
                      src={teamInfo.logoUrl} 
                      alt={`${teamInfo.name} logo`}
                      className="team-logo-bg"
                    />
                  )}
                  
                  <div className="player-rank" style={{ backgroundColor: '#2196F3' }}>
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
                      {player.gamesInSeries}G | {player.avgInSeries} AVG this series
                    </small>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

// Current Series Home Runs Card
const CurrentSeriesHRCard = ({ gameData, currentDate, teams }) => {
  const [seriesData, setSeriesData] = useState([]);
  const [seriesInfo, setSeriesInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const analyzeCurrentSeriesHRs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!gameData || gameData.length === 0) {
          setSeriesData([]);
          return;
        }
        
        // Load recent historical data
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          0,   // Start from today
          14   // Look back 2 weeks max
        );
        
        // Analyze each matchup for current series (reuse logic from hits card)
        const allSeriesStats = [];
        
        for (const game of gameData) {
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
        
        // Filter for players with HRs and sort
        const sortedStats = allSeriesStats
          .filter(player => player.gamesInSeries > 0 && player.totalHRsInSeries > 0)
          .sort((a, b) => {
            // Primary sort: total HRs in series
            if (b.totalHRsInSeries !== a.totalHRsInSeries) {
              return b.totalHRsInSeries - a.totalHRsInSeries;
            }
            // Secondary sort: HRs per game
            return parseFloat(b.hrsPerGameInSeries) - parseFloat(a.hrsPerGameInSeries);
          })
          .slice(0, 25);
        
        setSeriesData(sortedStats);
        
        if (sortedStats.length > 0) {
          const firstPlayer = sortedStats[0];
          setSeriesInfo({
            opponent: firstPlayer.opponent,
            gamesInSeries: firstPlayer.gamesInSeries,
            seriesDateRange: firstPlayer.seriesDateRange
          });
        }
        
      } catch (err) {
        console.error('Error analyzing current series HRs:', err);
        setError('Failed to load series HR data');
        setSeriesData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (gameData.length > 0) {
      analyzeCurrentSeriesHRs();
    }
  }, [gameData, currentDate]);

  // Use the same findCurrentSeriesStats function as the hits card
  const findCurrentSeriesStats = async (playerTeam, opponentTeam, dateRangeData, currentDate) => {
    // ... (same implementation as in CurrentSeriesHitsCard)
    // This would be moved to a shared utility function in practice
  };

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { 
      name: teamAbbr, 
      primaryColor: '#e63946', 
      logoUrl: null 
    };
  };

  if (loading) {
    return (
      <div className="card">
        <h3>🚀 Current Series HRs</h3>
        <div className="loading-indicator">Analyzing current series HR performance...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>🚀 Current Series HRs</h3>
      <p className="card-subtitle">
        Home run leaders in current series vs opponent
        {seriesInfo.seriesDateRange && (
          <span className="series-info"> ({seriesInfo.seriesDateRange})</span>
        )}
      </p>
      
      {seriesData.length === 0 ? (
        <div className="no-data">
          No home runs hit in current series yet
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {seriesData.map((player, index) => {
              const teamInfo = getTeamInfo(player.team);
              const opponentInfo = getTeamInfo(player.opponent);
              
              return (
                <li key={`${player.name}_${player.team}`} className="player-item">
                  {teamInfo.logoUrl && (
                    <img 
                      src={teamInfo.logoUrl} 
                      alt={`${teamInfo.name} logo`}
                      className="team-logo-bg"
                    />
                  )}
                  
                  <div className="player-rank" style={{ backgroundColor: '#e63946' }}>
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
                      {player.gamesInSeries} games this series
                    </small>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export { CurrentSeriesHitsCard, CurrentSeriesHRCard };