// src/components/cards/OpponentMatchupHitsCard/OpponentMatchupHitsCard.js
import React, { useState, useEffect } from 'react';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData,
  generateMatchupAnalysis 
} from '../../../services/dataService';
import enhancedGameDataService from '../../../services/enhancedGameDataService';
import { debugLog } from '../../../utils/debugConfig';
import { getPlayerDisplayName, getTeamDisplayName } from '../../../utils/playerNameUtils';
import './OpponentMatchupHitsCard.css';

const OpponentMatchupHitsCard = ({ gameData, currentDate, teams }) => {
  const [matchupData, setMatchupData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  

  useEffect(() => {
    const loadMatchupData = async () => {
      try {
        setLoading(true);
        setError(null);
        setDebugInfo('Loading hits matchup data...');
        
        if (!gameData || gameData.length === 0) {
          setMatchupData([]);
          setDebugInfo('No games scheduled for today');
          console.log('[OpponentMatchupHitsCard] No game data provided');
          return;
        }
        
        console.log('[OpponentMatchupHitsCard] Game data:', gameData);
        
        // Load from prop analysis and enhance with real opponent data
        try {
          const propResponse = await fetch('/data/prop_analysis/prop_analysis_latest.json');
          if (propResponse.ok) {
            const propData = await propResponse.json();
            
            if (propData.propAnalysis && propData.propAnalysis.hits) {
              const hitsData = propData.propAnalysis.hits;
              
              // Get players who have games today
              const playersWithGamesToday = [];
              if (hitsData.topPlayers) {
                for (const player of hitsData.topPlayers) {
                  const todaysGame = gameData.find(game => 
                    game.homeTeam === player.team || game.awayTeam === player.team
                  );
                  
                  if (todaysGame && player.seasonTotal > 0) {
                    const opponent = todaysGame.homeTeam === player.team 
                      ? todaysGame.awayTeam 
                      : todaysGame.homeTeam;
                    
                    playersWithGamesToday.push({
                      ...player,
                      todaysOpponent: opponent,
                      todaysGame: todaysGame
                    });
                  }
                }
              }
              
              console.log(`[OpponentMatchupHitsCard] Found ${playersWithGamesToday.length} players with games today`);
              
              // Now load historical data for opponent analysis (similar to PlayerPropsLadder)
              const endDate = currentDate || new Date();
              const matchupDataPromises = playersWithGamesToday.map(async (player) => {
                try {
                  // Load historical data directly (bypass SharedDataManager like PlayerPropsLadder)
                  const historicalData = {};
                  const now = new Date(endDate);
                  
                  // Load last 90 days of data
                  for (let daysBack = 0; daysBack < 90; daysBack++) {
                    const searchDate = new Date(now);
                    searchDate.setDate(searchDate.getDate() - daysBack);
                    
                    const year = searchDate.getFullYear();
                    const seasonStart = year === 2025 ? new Date('2025-03-18') : new Date(`${year}-03-20`);
                    const seasonEnd = new Date(`${year}-10-31`);
                    if (searchDate < seasonStart || searchDate > seasonEnd) continue;
                    
                    const dateStr = searchDate.toISOString().split('T')[0];
                    
                    try {
                      const [year, month, day] = dateStr.split('-');
                      const monthName = searchDate.toLocaleString('default', { month: 'long' }).toLowerCase();
                      const filePath = `/data/${year}/${monthName}/${monthName}_${day}_${year}.json`;
                      
                      const response = await fetch(filePath);
                      if (response.ok) {
                        const data = await response.json();
                        if (data.players && Array.isArray(data.players) && data.players.length > 0) {
                          historicalData[dateStr] = data;
                        }
                      }
                    } catch (error) {
                      continue;
                    }
                  }
                  
                  // Analyze games vs today's opponent
                  let totalHits = 0;
                  let gamesVsOpponent = 0;
                  let totalABs = 0;
                  const opponentGames = [];
                  
                  Object.entries(historicalData).forEach(([dateStr, dayData]) => {
                    const playerData = dayData.players?.find(p => 
                      p.name === player.name && p.team === player.team
                    );
                    
                    if (playerData) {
                      // Check if this was a game vs today's opponent
                      const gameInfo = dayData.games?.find(g => 
                        (g.homeTeam === player.team || g.awayTeam === player.team) &&
                        (g.homeTeam === player.todaysOpponent || g.awayTeam === player.todaysOpponent)
                      );
                      
                      if (gameInfo) {
                        const hits = playerData.H || playerData.hits || 0;
                        totalHits += hits;
                        gamesVsOpponent++;
                        totalABs += playerData.AB || playerData.ab || 3;
                        opponentGames.push({
                          date: dateStr,
                          value: hits,
                          ab: playerData.AB || playerData.ab || 3
                        });
                      }
                    }
                  });
                  
                  const hitsPerGame = gamesVsOpponent > 0 ? (totalHits / gamesVsOpponent).toFixed(2) : player.rate.toFixed(2);
                  const battingAvg = totalABs > 0 ? (totalHits / totalABs).toFixed(3) : '.000';
                  
                  return {
                    playerName: player.name,
                    playerTeam: player.team,
                    opponentTeam: player.todaysOpponent,
                    hitsPerGame: hitsPerGame,
                    totalHits: totalHits,
                    gamesVsOpponent: gamesVsOpponent,
                    battingAvg: battingAvg,
                    recentForm: player.trend === 'up' ? '🔥' : player.trend === 'down' ? '❄️' : '➡️',
                    opponentHistory: opponentGames.slice(-5).reverse() // Last 5 games
                  };
                } catch (error) {
                  console.error(`Error processing ${player.name}:`, error);
                  // Return player with season averages as fallback
                  return {
                    playerName: player.name,
                    playerTeam: player.team,
                    opponentTeam: player.todaysOpponent,
                    hitsPerGame: player.rate.toFixed(2),
                    totalHits: 0,
                    gamesVsOpponent: 0,
                    battingAvg: (player.rate * 0.3).toFixed(3),
                    recentForm: player.trend === 'up' ? '🔥' : player.trend === 'down' ? '❄️' : '➡️',
                    opponentHistory: []
                  };
                }
              });
              
              // Wait for all player data to be processed
              const processedPlayers = await Promise.all(matchupDataPromises);
              
              // Filter out players with no opponent history and sort
              const qualifiedPlayers = processedPlayers
                .filter(p => p.gamesVsOpponent >= 3) // Min 3 games vs opponent
                .sort((a, b) => parseFloat(b.hitsPerGame) - parseFloat(a.hitsPerGame))
                .slice(0, 25);
              
              setMatchupData(qualifiedPlayers);
              setDebugInfo(`Found ${qualifiedPlayers.length} qualified matchups (min 3 games)`);
              console.log('[OpponentMatchupHitsCard] Successfully loaded and processed matchup data');
              return;
            }
          }
        } catch (propErr) {
          console.log('[OpponentMatchupHitsCard] Error loading matchup data:', propErr);
        }
        
        // Fallback to original method if prop analysis fails
        setDebugInfo('Using fallback data loading method...');
        
        // Load historical data (reasonable sample size - 90 days max)
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          30,   // Initial lookback
          90    // Max lookback (3 months) - reduced from 730 days
        );
        
        const dateCount = Object.keys(dateRangeData).length;
        setDebugInfo(`Loaded ${dateCount} dates of data...`);
        
        // Load current roster
        const rosterData = await fetchRosterData();
        
        // Generate comprehensive analysis
        setDebugInfo('Analyzing player vs opponent stats...');
        
        const analysis = await generateMatchupAnalysis(gameData, dateRangeData, rosterData);
        
        setMatchupData(analysis.opponentMatchupHits || []);
        setDebugInfo(`Found ${analysis.opponentMatchupHits?.length || 0} qualified matchups`);
        
      } catch (err) {
        console.error('Error loading opponent matchup data:', err);
        setError('Failed to load matchup data');
        setDebugInfo(`Error: ${err.message}`);
        setMatchupData([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadMatchupData();
  }, [gameData, currentDate]);

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { 
      name: teamAbbr, 
      primaryColor: '#666', 
      logoUrl: null 
    };
  };

  const getTeamLogo = (teamCode) => {
    if (!teams[teamCode]) return null;
    return `/data/logos/${teamCode.toLowerCase()}_logo.png`;
  };

  if (loading) {
    return (
      <div className="card opponent-matchup-hits-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🎯 Hits vs Current Opponent</h3>
          </div>
          <div className="loading-indicator">
            Analyzing opponent matchups...
            <br />
            <small style={{ fontSize: '0.8em', color: '#666' }}>
              {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card opponent-matchup-hits-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🎯 Hits vs Current Opponent</h3>
          </div>
          <div className="no-data">
            Error: {error}
            <br />
            <small style={{ fontSize: '0.8em', color: '#666' }}>
              {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card opponent-matchup-hits-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>🎯 Hits vs Current Opponent</h3>
          <p className="card-subtitle">
            Players with best performance vs today's opponent (min. 3 games)
          </p>
        </div>
        
        {matchupData.length === 0 ? (
          <div className="no-data">
            No sufficient matchup history available for today's games
            <br />
            <small style={{ fontSize: '0.8em', color: '#999' }}>
              {debugInfo}
            </small>
          </div>
        ) : (
          <div className="scrollable-container">
          <ul className="player-list">
            {matchupData.map((player, index) => {
              const teamInfo = getTeamInfo(player.playerTeam);
              const opponentInfo = getTeamInfo(player.opponentTeam);
              // Use same approach as working DayOfWeekHitsCard
              const teamData = teams && player.playerTeam ? teams[player.playerTeam] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              
              return (
                <li key={`${player.playerName}_${player.playerTeam}_${index}`} className="player-item">
                  <div className="player-rank" style={{ backgroundColor: teams[player.playerTeam]?.colors?.primary || '#007bff' }}>
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
                    <div className="player-name">{getPlayerDisplayName(player)}</div>
                    <div className="player-team">vs {player.opponentTeam}</div>
                  </div>
                  
                  <div className="player-stat">
                    <div className="stat-highlight" style={{ color: teams[player.playerTeam]?.colors?.primary || '#007bff' }}>
                      {player.hitsPerGame} H/G
                    </div>
                    <small>{player.totalHits}H in {player.gamesVsOpponent}G vs {player.opponentTeam}</small>
                    <small>({player.battingAvg} AVG){player.recentForm && ` | ${player.recentForm}`}</small>
                    {player.opponentHistory && player.opponentHistory.length > 0 && (
                      <small style={{ fontSize: '10px', color: '#777' }}>
                        Recent: {player.opponentHistory.slice(0, 5).map(game => game.value || 0).join('-')}
                      </small>
                    )}
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
        
        {/* Debug info when in development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            fontSize: '0.7em', 
            color: '#999', 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px' 
          }}>
            <strong>Debug:</strong> {debugInfo}
          </div>
        )}
      </div>
    </div>
  );
};

// Home Runs vs Current Opponent Card
const OpponentMatchupHRCard = ({ gameData, currentDate, teams }) => {
  const [matchupData, setMatchupData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  
  // Helper function to get actual opponent HR matchup statistics
  const getPlayerVsOpponentHRStats = async (playerName, playerTeam, opponentTeam) => {
    try {
      const analysis = await enhancedGameDataService.getPlayerVsOpponentAnalysis(
        playerName, 
        playerTeam, 
        opponentTeam, 
        'HR' // Home runs stat key
      );
      
      if (analysis && analysis.games && analysis.games.length > 0) {
        const games = analysis.games;
        const totalHRs = games.reduce((sum, game) => sum + (game.value || 0), 0);
        const gamesPlayed = games.length;
        const hrsPerGame = gamesPlayed > 0 ? (totalHRs / gamesPlayed).toFixed(3) : '0.000';
        
        return {
          totalHRs,
          gamesPlayed,
          hrsPerGame,
          gameHistory: games
        };
      }
      
      return { totalHRs: 0, gamesPlayed: 0, hrsPerGame: '0.000', gameHistory: [] };
    } catch (error) {
      console.error('Error getting opponent HR stats:', error);
      return { totalHRs: 0, gamesPlayed: 0, hrsPerGame: '0.000', gameHistory: [] };
    }
  };

  useEffect(() => {
    const loadMatchupData = async () => {
      try {
        setLoading(true);
        setError(null);
        setDebugInfo('Starting HR matchup analysis...');
        
        if (!gameData || gameData.length === 0) {
          setMatchupData([]);
          setDebugInfo('No games scheduled for today');
          return;
        }
        
        console.log(`[OpponentMatchupHRCard] Analyzing HR matchups for ${gameData.length} games`);
        
        // Load from prop analysis and enhance with real opponent data
        try {
          const propResponse = await fetch('/data/prop_analysis/prop_analysis_latest.json');
          if (propResponse.ok) {
            const propData = await propResponse.json();
            
            if (propData.propAnalysis && propData.propAnalysis.home_runs) {
              const hrData = propData.propAnalysis.home_runs;
              
              // Get players who have games today
              const playersWithGamesToday = [];
              if (hrData.topPlayers) {
                for (const player of hrData.topPlayers) {
                  const todaysGame = gameData.find(game => 
                    game.homeTeam === player.team || game.awayTeam === player.team
                  );
                  
                  if (todaysGame && player.seasonTotal > 0) {
                    const opponent = todaysGame.homeTeam === player.team 
                      ? todaysGame.awayTeam 
                      : todaysGame.homeTeam;
                    
                    playersWithGamesToday.push({
                      ...player,
                      todaysOpponent: opponent,
                      todaysGame: todaysGame
                    });
                  }
                }
              }
              
              console.log(`[OpponentMatchupHRCard] Found ${playersWithGamesToday.length} players with games today`);
              
              // Now load historical data for opponent analysis
              const endDate = currentDate || new Date();
              const matchupDataPromises = playersWithGamesToday.map(async (player) => {
                try {
                  // Load historical data directly
                  const historicalData = {};
                  const now = new Date(endDate);
                  
                  // Load last 365 days for HR analysis (need more history for HRs)
                  for (let daysBack = 0; daysBack < 365; daysBack++) {
                    const searchDate = new Date(now);
                    searchDate.setDate(searchDate.getDate() - daysBack);
                    
                    const year = searchDate.getFullYear();
                    const seasonStart = year === 2025 ? new Date('2025-03-18') : new Date(`${year}-03-20`);
                    const seasonEnd = new Date(`${year}-10-31`);
                    if (searchDate < seasonStart || searchDate > seasonEnd) continue;
                    
                    const dateStr = searchDate.toISOString().split('T')[0];
                    
                    try {
                      const [year, month, day] = dateStr.split('-');
                      const monthName = searchDate.toLocaleString('default', { month: 'long' }).toLowerCase();
                      const filePath = `/data/${year}/${monthName}/${monthName}_${day}_${year}.json`;
                      
                      const response = await fetch(filePath);
                      if (response.ok) {
                        const data = await response.json();
                        if (data.players && Array.isArray(data.players) && data.players.length > 0) {
                          historicalData[dateStr] = data;
                        }
                      }
                    } catch (error) {
                      continue;
                    }
                  }
                  
                  // Analyze games vs today's opponent
                  let totalHRs = 0;
                  let gamesVsOpponent = 0;
                  const opponentGames = [];
                  
                  Object.entries(historicalData).forEach(([dateStr, dayData]) => {
                    const playerData = dayData.players?.find(p => 
                      p.name === player.name && p.team === player.team
                    );
                    
                    if (playerData) {
                      // Check if this was a game vs today's opponent
                      const gameInfo = dayData.games?.find(g => 
                        (g.homeTeam === player.team || g.awayTeam === player.team) &&
                        (g.homeTeam === player.todaysOpponent || g.awayTeam === player.todaysOpponent)
                      );
                      
                      if (gameInfo) {
                        const hrs = playerData.HR || playerData.hr || playerData.homeRuns || 0;
                        totalHRs += hrs;
                        gamesVsOpponent++;
                        opponentGames.push({
                          date: dateStr,
                          value: hrs
                        });
                      }
                    }
                  });
                  
                  const hrsPerGame = gamesVsOpponent > 0 ? (totalHRs / gamesVsOpponent).toFixed(3) : '0.000';
                  
                  return {
                    playerName: player.name,
                    playerTeam: player.team,
                    opponentTeam: player.todaysOpponent,
                    hrsPerGame: hrsPerGame,
                    totalHRs: totalHRs,
                    gamesVsOpponent: gamesVsOpponent,
                    recentForm: player.trend === 'up' ? '🔥' : player.trend === 'down' ? '❄️' : '➡️',
                    opponentHistory: opponentGames.slice(-5).reverse() // Last 5 games
                  };
                } catch (error) {
                  console.error(`Error processing ${player.name}:`, error);
                  // Return player with zero stats as fallback
                  return {
                    playerName: player.name,
                    playerTeam: player.team,
                    opponentTeam: player.todaysOpponent,
                    hrsPerGame: '0.000',
                    totalHRs: 0,
                    gamesVsOpponent: 0,
                    recentForm: player.trend === 'up' ? '🔥' : player.trend === 'down' ? '❄️' : '➡️',
                    opponentHistory: []
                  };
                }
              });
              
              // Wait for all player data to be processed
              const processedPlayers = await Promise.all(matchupDataPromises);
              
              // Filter for players with HR history and sort
              const qualifiedPlayers = processedPlayers
                .filter(p => p.totalHRs > 0) // Must have at least 1 HR vs opponent
                .sort((a, b) => {
                  // Sort by HR rate, then by total HRs
                  const rateCompare = parseFloat(b.hrsPerGame) - parseFloat(a.hrsPerGame);
                  if (rateCompare !== 0) return rateCompare;
                  return b.totalHRs - a.totalHRs;
                })
                .slice(0, 25);
              
              setMatchupData(qualifiedPlayers);
              setDebugInfo(`Found ${qualifiedPlayers.length} players with HRs vs today's opponent`);
              console.log('[OpponentMatchupHRCard] Successfully loaded and processed HR matchup data');
              return;
            }
          }
        } catch (propErr) {
          console.log('[OpponentMatchupHRCard] Error loading HR matchup data:', propErr);
        }
        
        // Fallback to original method if prop analysis fails
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 30, 730);
        const rosterData = await fetchRosterData();
        
        const analysis = await generateMatchupAnalysis(gameData, dateRangeData, rosterData);
        
        setMatchupData(analysis.opponentMatchupHRs || []);
        setDebugInfo(`Found ${analysis.opponentMatchupHRs?.length || 0} players with HRs vs opponent`);
        
      } catch (err) {
        console.error('Error loading opponent HR matchup data:', err);
        setError('Failed to load matchup data');
        setDebugInfo(`Error: ${err.message}`);
        setMatchupData([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadMatchupData();
  }, [gameData, currentDate]);

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { 
      name: teamAbbr, 
      primaryColor: '#e63946', 
      logoUrl: null 
    };
  };

  const getTeamLogo = (teamCode) => {
    if (!teams[teamCode]) return null;
    return `/data/logos/${teamCode.toLowerCase()}_logo.png`;
  };

  if (loading) {
    return (
      <div className="card opponent-matchup-hr-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>💥 HRs vs Current Opponent</h3>
          </div>
          <div className="loading-indicator">
            Analyzing opponent matchups...
            <br />
            <small style={{ fontSize: '0.8em', color: '#666' }}>
              {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card opponent-matchup-hr-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>💥 HRs vs Current Opponent</h3>
          </div>
          <div className="no-data">
            Error: {error}
            <br />
            <small style={{ fontSize: '0.8em', color: '#666' }}>
              {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card opponent-matchup-hr-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>💥 HRs vs Current Opponent</h3>
          <p className="card-subtitle">
            Home run performance vs today's opponent (min. 3 games)
          </p>
        </div>
        
        {matchupData.length === 0 ? (
          <div className="no-data">
            No sufficient HR matchup history for today's games
            <br />
            <small style={{ fontSize: '0.8em', color: '#999' }}>
              {debugInfo}
            </small>
          </div>
        ) : (
          <div className="scrollable-container">
          <ul className="player-list">
            {matchupData.map((player, index) => {
              const teamInfo = getTeamInfo(player.playerTeam);
              const opponentInfo = getTeamInfo(player.opponentTeam);
              // Use same approach as working DayOfWeekHitsCard
              const teamData = teams && player.playerTeam ? teams[player.playerTeam] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              
              return (
                <li key={`${player.playerName}_${player.playerTeam}_${index}`} className="player-item">
                  <div className="player-rank" style={{ backgroundColor: teams[player.playerTeam]?.colors?.primary || '#e63946' }}>
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
                    <div className="player-name">{getPlayerDisplayName(player)}</div>
                    <div className="player-team">vs {player.opponentTeam}</div>
                  </div>
                  
                  <div className="player-stat">
                    <div className="stat-highlight" style={{ color: teams[player.playerTeam]?.colors?.primary || '#e63946' }}>
                      {player.hrsPerGame} HR/G
                    </div>
                    <small>{player.totalHRs} HRs in {player.gamesVsOpponent}G vs {player.opponentTeam}</small>
                    {player.recentForm && <small>{player.recentForm}</small>}
                    {player.opponentHistory && player.opponentHistory.length > 0 && (
                      <small style={{ fontSize: '10px', color: '#777' }}>
                        Recent: {player.opponentHistory.slice(0, 5).map(game => game.value || 0).join('-')}
                      </small>
                    )}
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
        
        {/* Debug info when in development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            fontSize: '0.7em', 
            color: '#999', 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px' 
          }}>
            <strong>Debug:</strong> {debugInfo}
          </div>
        )}
      </div>
    </div>
  );
};

export {
  OpponentMatchupHitsCard,
  OpponentMatchupHRCard
};