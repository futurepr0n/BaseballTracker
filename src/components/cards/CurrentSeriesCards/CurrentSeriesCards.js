// src/components/cards/CurrentSeriesCards/CurrentSeriesCard.js
import React, { useState, useEffect } from 'react';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData 
} from '../../../services/dataService';

/**
 * SIMPLIFIED: Find current series statistics for a team vs opponent
 * Much simpler approach - just look for games where both teams have players
 */
const findCurrentSeriesStats = async (playerTeam, opponentTeam, dateRangeData, currentDate) => {
  console.log(`[findCurrentSeriesStats] Analyzing ${playerTeam} vs ${opponentTeam}`);
  
  const playerSeriesStats = new Map();
  const sortedDates = Object.keys(dateRangeData).sort().reverse(); // Start from most recent
  
  console.log(`[findCurrentSeriesStats] Available dates: ${sortedDates.join(', ')}`);
  
  let seriesGames = [];
  let foundDifferentOpponent = false;
  
  // Look backwards through dates
  for (const dateStr of sortedDates) {
    const playersForDate = dateRangeData[dateStr];
    
    if (!playersForDate || playersForDate.length === 0) {
      console.log(`[findCurrentSeriesStats] No players data for ${dateStr}`);
      continue;
    }
    
    // Get all teams that played on this date (have player data)
    const teamsOnDate = [...new Set(playersForDate.map(p => p.team))];
    console.log(`[findCurrentSeriesStats] ${dateStr}: Teams with data: ${teamsOnDate.join(', ')}`);
    
    // Check if both our teams have data on this date
    const hasPlayerTeam = teamsOnDate.includes(playerTeam);
    const hasOpponentTeam = teamsOnDate.includes(opponentTeam);
    
    if (hasPlayerTeam && hasOpponentTeam) {
      // Both teams have data - assume they played each other
      console.log(`[findCurrentSeriesStats] ✅ Found game on ${dateStr}: ${playerTeam} vs ${opponentTeam}`);
      seriesGames.unshift({ date: dateStr, players: playersForDate });
      foundDifferentOpponent = false; // Reset flag since we found a series game
    } else if (hasPlayerTeam) {
      // Player team has data but not opponent - check who they played
      const otherTeamsOnDate = teamsOnDate.filter(t => t !== playerTeam);
      console.log(`[findCurrentSeriesStats] ${dateStr}: ${playerTeam} played against: ${otherTeamsOnDate.join(', ')}`);
      
      if (otherTeamsOnDate.length > 0) {
        if (foundDifferentOpponent || seriesGames.length > 0) {
          // We've already found series games and now see different opponent = series boundary
          console.log(`[findCurrentSeriesStats] 🛑 Series boundary found at ${dateStr}`);
          break;
        }
        foundDifferentOpponent = true;
      }
    }
    
    // Stop after reasonable time period
    const daysDiff = Math.floor((currentDate - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    if (daysDiff > 14) {
      console.log(`[findCurrentSeriesStats] Reached 14-day limit`);
      break;
    }
    
    // Stop after reasonable number of games
    if (seriesGames.length >= 6) {
      console.log(`[findCurrentSeriesStats] Reached 6-game limit`);
      break;
    }
  }
  
  console.log(`[findCurrentSeriesStats] Found ${seriesGames.length} series games`);
  
  if (seriesGames.length === 0) {
    console.log(`[findCurrentSeriesStats] No series games found between ${playerTeam} and ${opponentTeam}`);
    return [];
  }
  
  // Process each game to collect player stats
  seriesGames.forEach((gameData, gameIndex) => {
    console.log(`[findCurrentSeriesStats] Processing game ${gameIndex + 1} on ${gameData.date}`);
    const playersInGame = gameData.players.filter(p => p.team === playerTeam);
    console.log(`[findCurrentSeriesStats] Found ${playersInGame.length} ${playerTeam} players`);
    
    playersInGame.forEach(player => {
      // FIXED: Only process players who are explicitly hitters or have no playerType (default hitters)
      // AND have hitting stats defined
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
          
          console.log(`[findCurrentSeriesStats] HITTER ${player.name}: ${hits}H, ${hrs}HR, ${ab}AB on ${gameData.date}`);
        } else {
          console.log(`[findCurrentSeriesStats] HITTER ${player.name}: DNP on ${gameData.date}`);
        }
      } else {
        // Log why player was skipped
        const reason = player.playerType === 'pitcher' ? 'PITCHER' : 
                      player.H === undefined ? 'NO HITTING STATS' :
                      player.H === null ? 'NULL HITTING STATS' : 'OTHER';
        console.log(`[findCurrentSeriesStats] SKIPPED ${player.name}: ${reason}`);
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
  
  console.log(`[findCurrentSeriesStats] Final result: ${result.length} players with series stats`);
  result.forEach(p => console.log(`  ${p.name}: ${p.totalHitsInSeries}H in ${p.gamesInSeries}G`));
  
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
        setDebugInfo('Starting analysis...');
        
        if (!gameData || gameData.length === 0) {
          console.log('[CurrentSeriesHitsCard] No game data available');
          setDebugInfo('No games scheduled for today');
          setSeriesData([]);
          return;
        }
        
        console.log(`[CurrentSeriesHitsCard] Analyzing ${gameData.length} games:`, gameData.map(g => `${g.awayTeam} @ ${g.homeTeam}`));
        setDebugInfo(`Analyzing ${gameData.length} games...`);
        
        // Load recent historical data
        console.log('[CurrentSeriesHitsCard] Loading historical data...');
        setDebugInfo('Loading historical player data...');
        
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 14, 14);
        
        const availableDates = Object.keys(dateRangeData).sort().reverse();
        console.log(`[CurrentSeriesHitsCard] Loaded data for ${availableDates.length} dates:`, availableDates.slice(0, 5));
        setDebugInfo(`Loaded data for ${availableDates.length} dates: ${availableDates.slice(0, 3).join(', ')}...`);
        
        if (availableDates.length === 0) {
          setError('No historical player data found');
          setDebugInfo('No historical data available');
          return;
        }
        
        // Debug: Show sample of data structure and player types
        if (availableDates.length > 0) {
          const sampleDate = availableDates[0];
          const samplePlayers = dateRangeData[sampleDate] || [];
          const hitters = samplePlayers.filter(p => (p.playerType === 'hitter' || !p.playerType) && p.H !== undefined);
          const pitchers = samplePlayers.filter(p => p.playerType === 'pitcher');
          
          console.log(`[CurrentSeriesHitsCard] Sample data for ${sampleDate}:`, {
            totalPlayers: samplePlayers.length,
            hitters: hitters.length,
            pitchers: pitchers.length,
            sampleHitters: hitters.slice(0, 3).map(p => ({name: p.name, team: p.team, H: p.H, HR: p.HR}))
          });
          setDebugInfo(`Sample from ${sampleDate}: ${hitters.length} hitters, ${pitchers.length} pitchers`);
        }
        
        // Analyze each matchup for current series
        const allSeriesStats = [];
        
        for (const game of gameData) {
          console.log(`[CurrentSeriesHitsCard] Processing game: ${game.awayTeam} @ ${game.homeTeam}`);
          setDebugInfo(`Analyzing ${game.awayTeam} @ ${game.homeTeam}...`);
          
          // Analyze both teams
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
          
          console.log(`[CurrentSeriesHitsCard] Results: ${homeSeriesStats.length} home players, ${awaySeriesStats.length} away players`);
          
          allSeriesStats.push(...homeSeriesStats, ...awaySeriesStats);
        }
        
        console.log(`[CurrentSeriesHitsCard] Total series stats: ${allSeriesStats.length}`);
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
        
        console.log(`[CurrentSeriesHitsCard] Final sorted stats: ${sortedStats.length} players`);
        
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
      <div className="card">
        <h3>📊 Current Series Hits</h3>
        <div className="loading-indicator">
          Analyzing current series performance...
          <br />
          <small style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
            {debugInfo}
          </small>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>📊 Current Series Hits</h3>
        <div className="no-data">
          Error: {error}
          <br />
          <small style={{ fontSize: '0.8em', color: '#666' }}>
            Debug: {debugInfo}
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
          <span className="series-info"> ({seriesInfo.seriesDateRange}) - {seriesInfo.seriesLength} games</span>
        )}
      </p>
      
      {seriesData.length === 0 ? (
        <div className="no-data">
          No current series data available
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
              
              return (
                <li key={`${player.name}_${player.team}`} className="player-item">
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
      
      {/* Debug info at bottom when no data */}
      {seriesData.length === 0 && (
        <div style={{ fontSize: '0.7em', color: '#999', marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <strong>Debug Info:</strong> {debugInfo}
        </div>
      )}
    </div>
  );
};

// Current Series Home Runs Card with same debugging approach
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
        setDebugInfo('Starting HR analysis...');
        
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
          setDebugInfo(`Analyzing ${game.awayTeam} @ ${game.homeTeam}...`);
          
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
      <div className="card">
        <h3>🚀 Current Series HRs</h3>
        <div className="loading-indicator">
          Analyzing current series HR performance...
          <br />
          <small style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
            {debugInfo}
          </small>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>🚀 Current Series HRs</h3>
        <div className="no-data">
          Error: {error}
          <br />
          <small style={{ fontSize: '0.8em', color: '#666' }}>
            Debug: {debugInfo}
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
          <span className="series-info"> ({seriesInfo.seriesDateRange}) - {seriesInfo.seriesLength} games</span>
        )}
      </p>
      
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
                      {player.gamesInSeries} games this series | {player.hrsPerGameInSeries}/G
                    </small>
                  </div>
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
  );
};

export { CurrentSeriesHitsCard, CurrentSeriesHRCard };