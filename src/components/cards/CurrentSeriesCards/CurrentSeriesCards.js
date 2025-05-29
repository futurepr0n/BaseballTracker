// src/components/cards/CurrentSeriesCards/CurrentSeriesCards.js
import React, { useState, useEffect } from 'react';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData 
} from '../../../services/dataService';

/**
 * FIXED: Find current series statistics for a team vs specific opponent
 * This now properly identifies series by checking actual opponents on each date
 */
const findCurrentSeriesStats = async (playerTeam, opponentTeam, dateRangeData, currentDate) => {
  console.log(`[findCurrentSeriesStats] Analyzing ${playerTeam} vs ${opponentTeam}`);
  
  const playerSeriesStats = new Map();
  const sortedDates = Object.keys(dateRangeData).sort().reverse(); // Start from most recent
  
  console.log(`[findCurrentSeriesStats] Available dates: ${sortedDates.slice(0, 10).join(', ')}...`);
  
  let seriesGames = [];
  let foundSeriesBoundary = false;
  
  // Go backwards in time to find the current series
  for (const dateStr of sortedDates) {
    const playersForDate = dateRangeData[dateStr];
    
    if (!playersForDate || playersForDate.length === 0) {
      console.log(`[findCurrentSeriesStats] No players data for ${dateStr}`);
      continue;
    }
    
    // Get all teams that played on this date
    const teamsOnThisDate = [...new Set(playersForDate.map(p => p.team))];
    console.log(`[findCurrentSeriesStats] ${dateStr}: Teams that played: ${teamsOnThisDate.join(', ')}`);
    
    // Check if our player team played on this date
    const playerTeamPlayers = playersForDate.filter(p => p.team === playerTeam);
    
    if (playerTeamPlayers.length === 0) {
      console.log(`[findCurrentSeriesStats] ${dateStr}: ${playerTeam} did not play`);
      continue;
    }
    
    // Find who the player team played against on this date
    const opponentTeamsOnThisDate = teamsOnThisDate.filter(team => team !== playerTeam);
    console.log(`[findCurrentSeriesStats] ${dateStr}: ${playerTeam} played against: ${opponentTeamsOnThisDate.join(', ')}`);
    
    // Check if they played against our target opponent
    if (opponentTeamsOnThisDate.includes(opponentTeam)) {
      // This is part of the current series!
      console.log(`[findCurrentSeriesStats] ✅ Found series game on ${dateStr}: ${playerTeam} vs ${opponentTeam}`);
      seriesGames.unshift({ 
        date: dateStr, 
        players: playersForDate,
        opponent: opponentTeam 
      });
    } else if (opponentTeamsOnThisDate.length > 0) {
      // Player team played against a different opponent - this is the series boundary
      console.log(`[findCurrentSeriesStats] 🛑 Series boundary found at ${dateStr}: ${playerTeam} played against ${opponentTeamsOnThisDate.join(', ')} (not ${opponentTeam})`);
      foundSeriesBoundary = true;
      break;
    }
    
    // Safety limit - don't go back more than 2 weeks
    const gameDate = new Date(dateStr);
    const daysDiff = Math.floor((currentDate.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 14) {
      console.log(`[findCurrentSeriesStats] Reached 14-day limit, stopping search`);
      break;
    }
  }
  
  console.log(`[findCurrentSeriesStats] Found ${seriesGames.length} games in current series between ${playerTeam} and ${opponentTeam}`);
  
  if (seriesGames.length === 0) {
    console.log(`[findCurrentSeriesStats] No current series found between ${playerTeam} and ${opponentTeam}`);
    return [];
  }
  
  // Calculate stats for each player in the series (only for games vs the specific opponent)
  seriesGames.forEach((gameData, gameIndex) => {
    console.log(`[findCurrentSeriesStats] Processing series game ${gameIndex + 1}: ${gameData.date} vs ${gameData.opponent}`);
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
            totalRBIsInSeries: 0,
            totalRunsInSeries: 0,
            gameResults: [],
            seriesDateRange: ''
          });
        }
        
        const stats = playerSeriesStats.get(playerKey);
        
        // Only count games where the player actually played (not DNP)
        if (player.H !== 'DNP') {
          const hits = Number(player.H) || 0;
          const hrs = Number(player.HR) || 0;
          const ab = Number(player.AB) || 0;
          const rbis = Number(player.RBI) || 0;
          const runs = Number(player.R) || 0;
          
          stats.gamesInSeries++;
          stats.totalHitsInSeries += hits;
          stats.totalHRsInSeries += hrs;
          stats.totalABInSeries += ab;
          stats.totalRBIsInSeries += rbis;
          stats.totalRunsInSeries += runs;
          stats.gameResults.push({
            date: gameData.date,
            hits,
            hrs,
            ab,
            rbis,
            runs,
            opponent: gameData.opponent
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
  
  const result = Array.from(playerSeriesStats.values())
    .filter(player => player.gamesInSeries > 0) // Only include players who actually played
    .map(player => ({
      ...player,
      hitsPerGameInSeries: player.gamesInSeries > 0 ? 
        (player.totalHitsInSeries / player.gamesInSeries).toFixed(2) : '0.00',
      hrsPerGameInSeries: player.gamesInSeries > 0 ? 
        (player.totalHRsInSeries / player.gamesInSeries).toFixed(2) : '0.00',
      rbisPerGameInSeries: player.gamesInSeries > 0 ? 
        (player.totalRBIsInSeries / player.gamesInSeries).toFixed(2) : '0.00',
      avgInSeries: player.totalABInSeries > 0 ? 
        (player.totalHitsInSeries / player.totalABInSeries).toFixed(3) : '.000',
      seriesDateRange: dateRange,
      seriesLength: seriesGames.length
    }));
  
  console.log(`[findCurrentSeriesStats] Returning stats for ${result.length} players who played in the series`);
  return result;
};

/**
 * FIXED: Determine if two teams are currently in a series based on recent games
 */
const areTeamsInCurrentSeries = async (team1, team2, dateRangeData, currentDate) => {
  const sortedDates = Object.keys(dateRangeData).sort().reverse();
  
  // Look for the most recent game between these teams
  for (const dateStr of sortedDates) {
    const playersForDate = dateRangeData[dateStr];
    if (!playersForDate || playersForDate.length === 0) continue;
    
    const teamsOnThisDate = [...new Set(playersForDate.map(p => p.team))];
    
    // Check if both teams played on this date
    if (teamsOnThisDate.includes(team1) && teamsOnThisDate.includes(team2)) {
      const gameDate = new Date(dateStr);
      const daysSinceGame = Math.floor((currentDate.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Consider it a current series if the most recent game was within the last 7 days
      return daysSinceGame <= 7;
    }
    
    // Stop searching if we've gone back more than 2 weeks
    const gameDate = new Date(dateStr);
    const daysDiff = Math.floor((currentDate.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 14) break;
  }
  
  return false;
};

const CurrentSeriesHitsCard = ({ gameData, currentDate, teams }) => {
  const [seriesData, setSeriesData] = useState([]);
  const [seriesInfo, setSeriesInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noCurrentSeries, setNoCurrentSeries] = useState(false);

  useEffect(() => {
    const analyzeCurrentSeries = async () => {
      try {
        setLoading(true);
        setError(null);
        setNoCurrentSeries(false);
        
        if (!gameData || gameData.length === 0) {
          console.log('[CurrentSeriesHitsCard] No game data available');
          setSeriesData([]);
          setNoCurrentSeries(true);
          return;
        }
        
        console.log(`[CurrentSeriesHitsCard] Analyzing ${gameData.length} games:`, gameData.map(g => `${g.awayTeam} @ ${g.homeTeam}`));
        
        // Load recent historical data to find current series
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          14,  // Look back 14 days
          14   // Max 14 days back
        );
        
        console.log(`[CurrentSeriesHitsCard] Loaded data for ${Object.keys(dateRangeData).length} dates:`, Object.keys(dateRangeData).sort().reverse().slice(0, 5));
        
        // Analyze each matchup to see if teams are in a current series
        const allSeriesStats = [];
        let foundActiveSeries = false;
        
        for (const game of gameData) {
          console.log(`[CurrentSeriesHitsCard] Checking if ${game.awayTeam} vs ${game.homeTeam} are in current series...`);
          
          // Check if these teams are currently in an active series
          const areInSeries = await areTeamsInCurrentSeries(
            game.homeTeam, 
            game.awayTeam, 
            dateRangeData,
            currentDate
          );
          
          if (areInSeries) {
            console.log(`[CurrentSeriesHitsCard] ✅ Found active series: ${game.awayTeam} vs ${game.homeTeam}`);
            foundActiveSeries = true;
            
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
            
            console.log(`[CurrentSeriesHitsCard] Home team stats: ${homeSeriesStats.length}, Away team stats: ${awaySeriesStats.length}`);
            
            allSeriesStats.push(...homeSeriesStats, ...awaySeriesStats);
          } else {
            console.log(`[CurrentSeriesHitsCard] ❌ No active series found for ${game.awayTeam} vs ${game.homeTeam}`);
          }
        }
        
        if (!foundActiveSeries) {
          console.log(`[CurrentSeriesHitsCard] No active series found for any of today's games`);
          setNoCurrentSeries(true);
          setSeriesData([]);
          return;
        }
        
        console.log(`[CurrentSeriesHitsCard] Total series stats collected: ${allSeriesStats.length}`);
        
        // Sort by total hits in current series
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
          .slice(0, 20); // Show top 20
        
        console.log(`[CurrentSeriesHitsCard] Final sorted stats: ${sortedStats.length} players`);
        
        setSeriesData(sortedStats);
        
        // Set series info for display
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
        console.error('Error analyzing current series:', err);
        setError('Failed to load series data: ' + err.message);
        setSeriesData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (gameData.length > 0) {
      analyzeCurrentSeries();
    } else {
      setLoading(false);
      setNoCurrentSeries(true);
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

  if (noCurrentSeries) {
    return (
      <div className="card">
        <h3>📊 Current Series Hits</h3>
        <div className="no-data">
          No active series found
          <br />
          <small style={{ fontSize: '0.8em', color: '#666' }}>
            Today's games may be starting new series vs different opponents
          </small>
        </div>
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
        {seriesInfo.seriesLength && (
          <span className="series-length"> • {seriesInfo.seriesLength} game series</span>
        )}
      </p>
      
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
    </div>
  );
};

// FIXED Current Series Home Runs Card
const CurrentSeriesHRCard = ({ gameData, currentDate, teams }) => {
  const [seriesData, setSeriesData] = useState([]);
  const [seriesInfo, setSeriesInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noCurrentSeries, setNoCurrentSeries] = useState(false);

  useEffect(() => {
    const analyzeCurrentSeriesHRs = async () => {
      try {
        setLoading(true);
        setError(null);
        setNoCurrentSeries(false);
        
        if (!gameData || gameData.length === 0) {
          setSeriesData([]);
          setNoCurrentSeries(true);
          return;
        }
        
        // Load recent historical data
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          14,  // Look back 14 days
          14   // Max 14 days back
        );
        
        // Analyze each matchup for current series
        const allSeriesStats = [];
        let foundActiveSeries = false;
        
        for (const game of gameData) {
          // Check if these teams are currently in an active series
          const areInSeries = await areTeamsInCurrentSeries(
            game.homeTeam, 
            game.awayTeam, 
            dateRangeData,
            currentDate
          );
          
          if (areInSeries) {
            foundActiveSeries = true;
            
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
        }
        
        if (!foundActiveSeries) {
          setNoCurrentSeries(true);
          setSeriesData([]);
          return;
        }
        
        // Filter for players with HRs in the current series and sort
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
          .slice(0, 20); // Show top 20
        
        setSeriesData(sortedStats);
        
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
        setSeriesData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (gameData.length > 0) {
      analyzeCurrentSeriesHRs();
    } else {
      setLoading(false);
      setNoCurrentSeries(true);
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
      <div className="card">
        <h3>🚀 Current Series HRs</h3>
        <div className="loading-indicator">Analyzing current series HR performance...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>🚀 Current Series HRs</h3>
        <div className="no-data">Error: {error}</div>
      </div>
    );
  }

  if (noCurrentSeries) {
    return (
      <div className="card">
        <h3>🚀 Current Series HRs</h3>
        <div className="no-data">
          No active series found
          <br />
          <small style={{ fontSize: '0.8em', color: '#666' }}>
            Today's games may be starting new series vs different opponents
          </small>
        </div>
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
        {seriesInfo.seriesLength && (
          <span className="series-length"> • {seriesInfo.seriesLength} game series</span>
        )}
      </p>
      
      {seriesData.length === 0 ? (
        <div className="no-data">
          No home runs hit in current series yet
          <br />
          <small style={{ fontSize: '0.8em', color: '#666' }}>
            Series found, but no HRs recorded yet
          </small>
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
                      {player.totalRBIsInSeries > 0 && ` • ${player.totalRBIsInSeries} RBI`}
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