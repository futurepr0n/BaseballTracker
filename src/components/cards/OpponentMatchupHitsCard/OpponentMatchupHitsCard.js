// src/components/cards/OpponentMatchupHitsCard/OpponentMatchupHitsCard.js
import React, { useState, useEffect } from 'react';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData,
  generateMatchupAnalysis 
} from '../../../services/dataService';

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
        setDebugInfo('Starting matchup analysis...');
        
        if (!gameData || gameData.length === 0) {
          setMatchupData([]);
          setDebugInfo('No games scheduled for today');
          return;
        }
        
        console.log(`[OpponentMatchupHitsCard] Analyzing matchups for ${gameData.length} games`);
        setDebugInfo(`Analyzing ${gameData.length} games...`);
        
        // Load historical data (2 years back for good sample size)
        console.log('[OpponentMatchupHitsCard] Loading historical data...');
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          30,   // Initial lookback
          730   // Max lookback (2 years)
        );
        
        const dateCount = Object.keys(dateRangeData).length;
        console.log(`[OpponentMatchupHitsCard] Loaded ${dateCount} dates of historical data`);
        setDebugInfo(`Loaded ${dateCount} dates of data...`);
        
        // Load current roster
        console.log('[OpponentMatchupHitsCard] Loading roster data...');
        const rosterData = await fetchRosterData();
        console.log(`[OpponentMatchupHitsCard] Loaded ${rosterData.length} roster entries`);
        
        // Generate comprehensive analysis
        console.log('[OpponentMatchupHitsCard] Generating matchup analysis...');
        setDebugInfo('Analyzing player vs opponent stats...');
        const analysis = await generateMatchupAnalysis(gameData, dateRangeData, rosterData);
        
        console.log(`[OpponentMatchupHitsCard] Analysis complete:`, {
          opponentHits: analysis.opponentMatchupHits.length,
          totalMatchups: analysis.totalMatchupsAnalyzed,
          totalPlayers: analysis.totalPlayersAnalyzed
        });
        
        setMatchupData(analysis.opponentMatchupHits);
        setDebugInfo(`Found ${analysis.opponentMatchupHits.length} qualified matchups`);
        
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

  if (loading) {
    return (
      <div className="card">
        <h3>🎯 Hits vs Current Opponent</h3>
        <div className="loading-indicator">
          Analyzing opponent matchups...
          <br />
          <small style={{ fontSize: '0.8em', color: '#666' }}>
            {debugInfo}
          </small>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>🎯 Hits vs Current Opponent</h3>
        <div className="no-data">
          Error: {error}
          <br />
          <small style={{ fontSize: '0.8em', color: '#666' }}>
            {debugInfo}
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>🎯 Hits vs Current Opponent</h3>
      <p className="card-subtitle">
        Players with best performance vs today's opponent (min. 3 games)
      </p>
      
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
              
              return (
                <li key={`${player.playerName}_${player.playerTeam}_${index}`} className="player-item">
                  {/* Team logo background */}
                  {teamInfo.logoUrl && (
                    <img 
                      src={teamInfo.logoUrl} 
                      alt={`${teamInfo.name} logo`}
                      className="team-logo-bg"
                    />
                  )}
                  
                  <div className="player-rank" style={{ backgroundColor: teamInfo.primaryColor }}>
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  
                  <div className="player-info">
                    <div className="player-name">{player.playerName}</div>
                    <div className="player-team">
                      {teamInfo.name} vs {opponentInfo.abbreviation || opponentInfo.name}
                    </div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: teamInfo.primaryColor }}>
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
        
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 30, 730);
        const rosterData = await fetchRosterData();
        const analysis = await generateMatchupAnalysis(gameData, dateRangeData, rosterData);
        
        console.log(`[OpponentMatchupHRCard] Analysis complete:`, {
          opponentHRs: analysis.opponentMatchupHRs.length,
          totalMatchups: analysis.totalMatchupsAnalyzed
        });
        
        setMatchupData(analysis.opponentMatchupHRs);
        setDebugInfo(`Found ${analysis.opponentMatchupHRs.length} players with HRs vs opponent`);
        
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

  if (loading) {
    return (
      <div className="card">
        <h3>💥 HRs vs Current Opponent</h3>
        <div className="loading-indicator">
          Analyzing opponent matchups...
          <br />
          <small style={{ fontSize: '0.8em', color: '#666' }}>
            {debugInfo}
          </small>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>💥 HRs vs Current Opponent</h3>
        <div className="no-data">
          Error: {error}
          <br />
          <small style={{ fontSize: '0.8em', color: '#666' }}>
            {debugInfo}
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>💥 HRs vs Current Opponent</h3>
      <p className="card-subtitle">
        Home run performance vs today's opponent (min. 3 games)
      </p>
      
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
              
              return (
                <li key={`${player.playerName}_${player.playerTeam}_${index}`} className="player-item">
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
                    <div className="player-name">{player.playerName}</div>
                    <div className="player-team">
                      {teamInfo.name} vs {opponentInfo.abbreviation || opponentInfo.name}
                    </div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: '#e63946' }}>
                      {player.hrsPerGame} HR/G
                    </span>
                    <small className="stat-note">
                      {player.totalHRs} HRs in {player.gamesVsOpponent}G
                      {player.recentForm && player.recentForm.includes('✓') && (
                        <span className="recent-indicator"> 🔥</span>
                      )}
                    </small>
                  </div>
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
  );
};

export {
  OpponentMatchupHitsCard,
  OpponentMatchupHRCard
};