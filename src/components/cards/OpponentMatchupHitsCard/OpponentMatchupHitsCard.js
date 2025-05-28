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

  useEffect(() => {
    const loadMatchupData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!gameData || gameData.length === 0) {
          setMatchupData([]);
          return;
        }
        
        // Load historical data (2 years back for good sample size)
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          30,   // Initial lookback
          730   // Max lookback (2 years)
        );
        
        // Load current roster
        const rosterData = await fetchRosterData();
        
        // Generate comprehensive analysis
        const analysis = await generateMatchupAnalysis(gameData, dateRangeData, rosterData);
        
        setMatchupData(analysis.opponentMatchupHits);
        
      } catch (err) {
        console.error('Error loading opponent matchup data:', err);
        setError('Failed to load matchup data');
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
        <div className="loading-indicator">Analyzing opponent matchups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>🎯 Hits vs Current Opponent</h3>
        <div className="no-data">Error: {error}</div>
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
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {matchupData.map((player, index) => {
              const teamInfo = getTeamInfo(player.playerTeam);
              const opponentInfo = getTeamInfo(player.opponentTeam);
              
              return (
                <li key={`${player.playerName}_${player.playerTeam}`} className="player-item">
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
    </div>
  );
};

// Home Runs vs Current Opponent Card
const OpponentMatchupHRCard = ({ gameData, currentDate, teams }) => {
  const [matchupData, setMatchupData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMatchupData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!gameData || gameData.length === 0) {
          setMatchupData([]);
          return;
        }
        
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 30, 730);
        const rosterData = await fetchRosterData();
        const analysis = await generateMatchupAnalysis(gameData, dateRangeData, rosterData);
        
        setMatchupData(analysis.opponentMatchupHRs);
        
      } catch (err) {
        console.error('Error loading opponent HR matchup data:', err);
        setError('Failed to load matchup data');
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
        <div className="loading-indicator">Analyzing opponent matchups...</div>
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
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {matchupData.map((player, index) => {
              const teamInfo = getTeamInfo(player.playerTeam);
              const opponentInfo = getTeamInfo(player.opponentTeam);
              
              return (
                <li key={`${player.playerName}_${player.playerTeam}`} className="player-item">
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

// Time Slot Hits Card
const TimeSlotHitsCard = ({ gameData, currentDate, teams }) => {
  const [timeSlotData, setTimeSlotData] = useState([]);
  const [currentTimeSlot, setCurrentTimeSlot] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTimeSlotData = async () => {
      try {
        setLoading(true);
        
        if (!gameData || gameData.length === 0) {
          setTimeSlotData([]);
          return;
        }
        
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 30, 365);
        const rosterData = await fetchRosterData();
        const analysis = await generateMatchupAnalysis(gameData, dateRangeData, rosterData);
        
        setTimeSlotData(analysis.timeSlotHits);
        setCurrentTimeSlot(analysis.currentTimeSlot);
        
      } catch (err) {
        console.error('Error loading time slot data:', err);
        setTimeSlotData([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadTimeSlotData();
  }, [gameData, currentDate]);

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { name: teamAbbr, primaryColor: '#666', logoUrl: null };
  };

  if (loading) {
    return (
      <div className="card">
        <h3>⏰ Hits by Time Slot</h3>
        <div className="loading-indicator">Analyzing time slot patterns...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>⏰ Hits by Time Slot</h3>
      <p className="card-subtitle">
        Best performers in {currentTimeSlot} (min. 3 games)
      </p>
      
      {timeSlotData.length === 0 ? (
        <div className="no-data">
          No sufficient time slot history available
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {timeSlotData.map((player, index) => {
              const teamInfo = getTeamInfo(player.playerTeam);
              
              return (
                <li key={`${player.playerName}_${player.playerTeam}`} className="player-item">
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
                    <div className="player-team">{teamInfo.name}</div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: teamInfo.primaryColor }}>
                      {player.hitsPerGame} H/G
                    </span>
                    <small className="stat-note">
                      {player.totalHits}H in {player.gamesInTimeSlot}G ({player.battingAvgInSlot} AVG)
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

// Time Slot Home Runs Card
const TimeSlotHRCard = ({ gameData, currentDate, teams }) => {
  const [timeSlotData, setTimeSlotData] = useState([]);
  const [currentTimeSlot, setCurrentTimeSlot] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTimeSlotData = async () => {
      try {
        setLoading(true);
        
        if (!gameData || gameData.length === 0) {
          setTimeSlotData([]);
          return;
        }
        
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 30, 365);
        const rosterData = await fetchRosterData();
        const analysis = await generateMatchupAnalysis(gameData, dateRangeData, rosterData);
        
        setTimeSlotData(analysis.timeSlotHRs);
        setCurrentTimeSlot(analysis.currentTimeSlot);
        
      } catch (err) {
        console.error('Error loading time slot HR data:', err);
        setTimeSlotData([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadTimeSlotData();
  }, [gameData, currentDate]);

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { name: teamAbbr, primaryColor: '#e63946', logoUrl: null };
  };

  if (loading) {
    return (
      <div className="card">
        <h3>⏰ HRs by Time Slot</h3>
        <div className="loading-indicator">Analyzing time slot patterns...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>⏰ HRs by Time Slot</h3>
      <p className="card-subtitle">
        Best HR performers in {currentTimeSlot} (min. 3 games)
      </p>
      
      {timeSlotData.length === 0 ? (
        <div className="no-data">
          No sufficient time slot HR history available
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {timeSlotData.map((player, index) => {
              const teamInfo = getTeamInfo(player.playerTeam);
              
              return (
                <li key={`${player.playerName}_${player.playerTeam}`} className="player-item">
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
                    <div className="player-team">{teamInfo.name}</div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: '#e63946' }}>
                      {player.hrsPerGame} HR/G
                    </span>
                    <small className="stat-note">
                      {player.totalHRs} HRs in {player.gamesInTimeSlot}G
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

export {
  OpponentMatchupHitsCard,
  OpponentMatchupHRCard,
  TimeSlotHitsCard,
  TimeSlotHRCard
};