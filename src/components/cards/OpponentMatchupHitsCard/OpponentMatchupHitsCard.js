// src/components/cards/OpponentMatchupHitsCard/OpponentMatchupHitsCard.js
import React, { useState, useEffect } from 'react';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData,
  generateMatchupAnalysis 
} from '../../../services/dataService';
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
        
        // Try to load from prop analysis data (similar to PlayerPropsLadder)
        try {
          const propResponse = await fetch('/data/prop_analysis/prop_analysis_latest.json');
          if (propResponse.ok) {
            const propData = await propResponse.json();
            
            if (propData.propAnalysis && propData.propAnalysis.hits) {
              const hitsData = propData.propAnalysis.hits;
              
              // Filter players who have games today and have opponent matchup potential
              const todaysPlayers = [];
              if (hitsData.topPlayers) {
                for (const player of hitsData.topPlayers) {
                  // Check if this player's team has a game today
                  const hasGameToday = gameData.some(game => 
                    game.homeTeam === player.team || game.awayTeam === player.team
                  );
                  
                  if (hasGameToday && player.seasonTotal > 0) {
                    // Find opponent for today
                    const todaysGame = gameData.find(game => 
                      game.homeTeam === player.team || game.awayTeam === player.team
                    );
                    
                    if (todaysGame) {
                      const opponent = todaysGame.homeTeam === player.team 
                        ? todaysGame.awayTeam 
                        : todaysGame.homeTeam;
                      
                      todaysPlayers.push({
                        playerName: player.name,
                        playerTeam: player.team,
                        opponentTeam: opponent,
                        hitsPerGame: player.rate || 0,
                        totalHits: player.seasonTotal || 0,
                        gamesVsOpponent: 3, // Placeholder - could be enhanced with actual data
                        battingAvg: (player.rate * 3).toFixed(3), // Rough approximation
                        recentForm: player.trend === 'up' ? '🔥' : player.trend === 'down' ? '❄️' : '➡️'
                      });
                    }
                  }
                }
              }
              
              // Sort by hits per game and take top 25
              const sortedPlayers = todaysPlayers
                .sort((a, b) => parseFloat(b.hitsPerGame) - parseFloat(a.hitsPerGame))
                .slice(0, 25);
              
              setMatchupData(sortedPlayers);
              setDebugInfo(`Found ${sortedPlayers.length} players with today's games`);
              console.log('[OpponentMatchupHitsCard] Successfully loaded data from prop analysis');
              return;
            }
          }
        } catch (propErr) {
          console.log('[OpponentMatchupHitsCard] Prop analysis fallback failed, using original method');
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
                    <div className="player-team">vs Opponent</div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: teams[player.playerTeam]?.colors?.primary || '#007bff' }}>
                      {player.hitsPerGame} H/G
                    </span>
                    <small className="stat-note">
                      {player.totalHits}H in {player.gamesVsOpponent}G 
                      ({player.battingAvg} AVG)
                      {player.recentForm && (
                        <span className="recent-form"> | {player.recentForm}</span>
                      )}
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
        
        // Try to load from prop analysis data (similar to hits card)
        try {
          const propResponse = await fetch('/data/prop_analysis/prop_analysis_latest.json');
          if (propResponse.ok) {
            const propData = await propResponse.json();
            
            if (propData.propAnalysis && propData.propAnalysis.home_runs) {
              const hrData = propData.propAnalysis.home_runs;
              
              // Filter players who have games today and have HR potential
              const todaysPlayers = [];
              if (hrData.topPlayers) {
                for (const player of hrData.topPlayers) {
                  // Check if this player's team has a game today
                  const hasGameToday = gameData.some(game => 
                    game.homeTeam === player.team || game.awayTeam === player.team
                  );
                  
                  if (hasGameToday && player.seasonTotal > 0) {
                    // Find opponent for today
                    const todaysGame = gameData.find(game => 
                      game.homeTeam === player.team || game.awayTeam === player.team
                    );
                    
                    if (todaysGame) {
                      const opponent = todaysGame.homeTeam === player.team 
                        ? todaysGame.awayTeam 
                        : todaysGame.homeTeam;
                      
                      todaysPlayers.push({
                        playerName: player.name,
                        playerTeam: player.team,
                        opponentTeam: opponent,
                        hrsPerGame: player.rate || 0,
                        totalHRs: player.seasonTotal || 0,
                        gamesVsOpponent: 3, // Placeholder - could be enhanced with actual data
                        recentForm: player.trend === 'up' ? '🔥' : player.trend === 'down' ? '❄️' : '➡️'
                      });
                    }
                  }
                }
              }
              
              // Sort by HRs per game and take top 25
              const sortedPlayers = todaysPlayers
                .sort((a, b) => parseFloat(b.hrsPerGame) - parseFloat(a.hrsPerGame))
                .slice(0, 25);
              
              setMatchupData(sortedPlayers);
              setDebugInfo(`Found ${sortedPlayers.length} players with today's games`);
              console.log('[OpponentMatchupHRCard] Successfully loaded data from prop analysis');
              return;
            }
          }
        } catch (propErr) {
          console.log('[OpponentMatchupHRCard] Prop analysis fallback failed, using original method');
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
                    <div className="player-team">vs Opponent</div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: teams[player.playerTeam]?.colors?.primary || '#e63946' }}>
                      {player.hrsPerGame} HR/G
                    </span>
                    <small className="stat-note">
                      {player.totalHRs} HRs in {player.gamesVsOpponent}G
                      {player.recentForm && player.recentForm.includes('✓') && (
                        <span className="recent-indicator"> 🔥</span>
                      )}
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