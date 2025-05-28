// src/components/cards/TimeSlotHitsCard/TimeSlotHitsCard.js
import React, { useState, useEffect } from 'react';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData,
  classifySpecificTimeSlot,
  getCurrentTimeSlot,
  findPlayersInTimeSlot
} from '../../../services/dataService';

const TimeSlotHitsCard = ({ gameData, currentDate, teams }) => {
  const [timeSlotData, setTimeSlotData] = useState([]);
  const [currentTimeSlot, setCurrentTimeSlot] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const analyzeTimeSlotPerformance = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!gameData || gameData.length === 0) {
          setTimeSlotData([]);
          return;
        }
        
        // Get current time slot (specific day and time)
        const timeSlotInfo = getCurrentTimeSlot(gameData, currentDate);
        setCurrentTimeSlot(timeSlotInfo.displayText);
        
        // Load historical data (1 year for good time slot patterns)
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          30,   // Initial lookback
          365   // Max lookback (1 year)
        );
        
        // Get teams playing today
        const teamsPlayingToday = new Set();
        gameData.forEach(game => {
          teamsPlayingToday.add(game.homeTeam);
          teamsPlayingToday.add(game.awayTeam);
        });
        
        // Find players with matching time slot performance
        const playersInTimeSlot = findPlayersInTimeSlot(
          timeSlotInfo.dayOfWeek,
          timeSlotInfo.timeBlock,
          dateRangeData
        );
        
        // Filter for teams playing today and sort by performance
        const todaysTimeSlotPlayers = playersInTimeSlot
          .filter(player => teamsPlayingToday.has(player.team))
          .sort((a, b) => parseFloat(b.hitsPerGame) - parseFloat(a.hitsPerGame))
          .slice(0, 25);
        
        setTimeSlotData(todaysTimeSlotPlayers);
        
      } catch (err) {
        console.error('Error analyzing time slot performance:', err);
        setError('Failed to load time slot data');
        setTimeSlotData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (gameData.length > 0) {
      analyzeTimeSlotPerformance();
    }
  }, [gameData, currentDate]);

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { 
      name: teamAbbr, 
      primaryColor: '#FF9800', 
      logoUrl: null 
    };
  };

  if (loading) {
    return (
      <div className="card">
        <h3>⏰ Hits by Time Slot</h3>
        <div className="loading-indicator">Analyzing time slot patterns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>⏰ Hits by Time Slot</h3>
        <div className="no-data">Error: {error}</div>
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
          No sufficient time slot history for {currentTimeSlot}
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {timeSlotData.map((player, index) => {
              const teamInfo = getTeamInfo(player.team);
              
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
                  
                  <div className="player-rank" style={{ backgroundColor: '#FF9800' }}>
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-team">{teamInfo.name}</div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: '#FF9800' }}>
                      {player.hitsPerGame} H/G
                    </span>
                    <small className="stat-note">
                      {player.totalHits}H in {player.gamesInSlot}G ({player.battingAvg} AVG)
                      <br />
                      in {currentTimeSlot}
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
  const [error, setError] = useState(null);

  useEffect(() => {
    const analyzeTimeSlotHRPerformance = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!gameData || gameData.length === 0) {
          setTimeSlotData([]);
          return;
        }
        
        // Get current time slot (specific day and time)
        const timeSlotInfo = getCurrentTimeSlot(gameData, currentDate);
        setCurrentTimeSlot(timeSlotInfo.displayText);
        
        // Load historical data
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          30,   // Initial lookback
          365   // Max lookback (1 year)
        );
        
        // Get teams playing today
        const teamsPlayingToday = new Set();
        gameData.forEach(game => {
          teamsPlayingToday.add(game.homeTeam);
          teamsPlayingToday.add(game.awayTeam);
        });
        
        // Find players with matching time slot performance
        const playersInTimeSlot = findPlayersInTimeSlot(
          timeSlotInfo.dayOfWeek,
          timeSlotInfo.timeBlock,
          dateRangeData
        );
        
        // Filter for teams playing today, players with HRs, and sort by HR performance
        const todaysTimeSlotPlayers = playersInTimeSlot
          .filter(player => 
            teamsPlayingToday.has(player.team) && 
            player.totalHRs > 0
          )
          .sort((a, b) => parseFloat(b.hrsPerGame) - parseFloat(a.hrsPerGame))
          .slice(0, 25);
        
        setTimeSlotData(todaysTimeSlotPlayers);
        
      } catch (err) {
        console.error('Error analyzing time slot HR performance:', err);
        setError('Failed to load time slot HR data');
        setTimeSlotData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (gameData.length > 0) {
      analyzeTimeSlotHRPerformance();
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
        <h3>⏰ HRs by Time Slot</h3>
        <div className="loading-indicator">Analyzing time slot HR patterns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>⏰ HRs by Time Slot</h3>
        <div className="no-data">Error: {error}</div>
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
          No sufficient HR history for {currentTimeSlot}
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {timeSlotData.map((player, index) => {
              const teamInfo = getTeamInfo(player.team);
              
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
                  
                  <div className="player-rank" style={{ backgroundColor: '#e63946' }}>
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-team">{teamInfo.name}</div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: '#e63946' }}>
                      {player.hrsPerGame} HR/G
                    </span>
                    <small className="stat-note">
                      {player.totalHRs} HRs in {player.gamesInSlot}G
                      <br />
                      in {currentTimeSlot}
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

export { TimeSlotHitsCard, TimeSlotHRCard };