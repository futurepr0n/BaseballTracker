// src/components/cards/TimeSlotHitsCard/TimeSlotHitsCard.js
import React, { useState, useEffect } from 'react';
import { debugLog } from '../../../utils/debugConfig';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData,
  classifySpecificTimeSlot,
  findPlayersInTimeSlot,
  getCurrentTimeSlot
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
        
        // Load historical data
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          30,   // Initial lookback
          90    // Max lookback (3 months) - reduced from 365 days
        );
        
        // Create a map of team -> game time slot
        const teamTimeSlots = new Map();
        
        gameData.forEach(game => {
          // Get the specific time slot for THIS game
          let gameDateTime = null;
          let gameTime = null;
          
          if (game.dateTime) {
            gameDateTime = new Date(game.dateTime);
            // Convert to local time string
            gameTime = gameDateTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
          }
          
          const timeSlot = classifySpecificTimeSlot(
            gameDateTime || currentDate,
            gameTime
          );
          
          // Store time slot for both teams
          teamTimeSlots.set(game.homeTeam, {
            timeSlot,
            displayText: `${timeSlot.dayOfWeek} ${timeSlot.timeBlock}`
          });
          teamTimeSlots.set(game.awayTeam, {
            timeSlot,
            displayText: `${timeSlot.dayOfWeek} ${timeSlot.timeBlock}`
          });
        });
        
        // Log what we found
        debugLog.log('CARDS', '[analyzeTimeSlot] Team time slots:');
        teamTimeSlots.forEach((value, team) => {
          debugLog.log('CARDS', `  ${team}: ${value.displayText}`);
        });
        
        // Analyze each team's players in their specific time slot
        const allTimeSlotPlayers = [];
        
        for (const [team, timeSlotInfo] of teamTimeSlots) {
          // Find players for this team in their specific time slot
          const playersInTimeSlot = findPlayersInTimeSlot(
            timeSlotInfo.timeSlot.dayOfWeek,
            timeSlotInfo.timeSlot.timeBlock,
            dateRangeData
          );
          
          // Filter for just this team's players
          const teamPlayers = playersInTimeSlot
            .filter(player => player.team === team)
            .map(player => ({
              ...player,
              gameTimeSlot: timeSlotInfo.displayText
            }));
          
          allTimeSlotPlayers.push(...teamPlayers);
        }
        
        debugLog.log('CARDS', `[analyzeTimeSlot] Found ${allTimeSlotPlayers.length} total players across all time slots`);
        
        // Sort by performance and take top 25
        const sortedPlayers = allTimeSlotPlayers
          .sort((a, b) => parseFloat(b.hitsPerGame) - parseFloat(a.hitsPerGame))
          .slice(0, 25);
        
        setTimeSlotData(sortedPlayers);
        
        // Set a generic display message since we have multiple time slots
        setCurrentTimeSlot("their scheduled game times");
        
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
    } else {
      setLoading(false);
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
          No sufficient time slot history for today's players
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {timeSlotData.map((player, index) => {
              const teamInfo = getTeamInfo(player.team);
              
              return (
                <li key={`${player.name}_${player.team}`} className="player-item">
                  {teamInfo.logoUrl && (
                    <img 
                      src={teamInfo.logoUrl} 
                      alt={`${teamInfo.name} logo`}
                      className="team-logo-bg"
                    />
                  )}
                  
                  <div className="player-rank" style={{ backgroundColor: '#FF9800' }}>
                    {teamInfo.logoUrl && (
                      <>
                        <img 
                          src={teamInfo.logoUrl} 
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
                    <div className="player-team">{teamInfo.name}</div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: '#FF9800' }}>
                      {player.hitsPerGame} H/G
                    </span>
                    <small className="stat-note">
                      {player.totalHits}H in {player.gamesInSlot}G ({player.battingAvg} AVG)
                      <br />
                      in {player.gameTimeSlot}
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
  const analyzeTimeSlotPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!gameData || gameData.length === 0) {
        setTimeSlotData([]);
        return;
      }
      
      // Load historical data
      const dateRangeData = await fetchPlayerDataForDateRange(
        currentDate, 
        30,   // Initial lookback
        365   // Max lookback (1 year)
      );
      
      // Create a map of team -> game time slot
      const teamTimeSlots = new Map();
      
      gameData.forEach(game => {
        // Get the specific time slot for THIS game
        let gameDateTime = null;
        let gameTime = null;
        
        if (game.dateTime) {
          gameDateTime = new Date(game.dateTime);
          // Convert to local time string
          gameTime = gameDateTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }
        
        const timeSlot = classifySpecificTimeSlot(
          gameDateTime || currentDate,
          gameTime
        );
        
        // Store time slot for both teams
        teamTimeSlots.set(game.homeTeam, {
          timeSlot,
          displayText: `${timeSlot.dayOfWeek} ${timeSlot.timeBlock}`
        });
        teamTimeSlots.set(game.awayTeam, {
          timeSlot,
          displayText: `${timeSlot.dayOfWeek} ${timeSlot.timeBlock}`
        });
      });
      
      // Log what we found
      debugLog.log('CARDS', '[analyzeTimeSlot] Team time slots:');
      teamTimeSlots.forEach((value, team) => {
        debugLog.log('CARDS', `  ${team}: ${value.displayText}`);
      });
      
      // Analyze each team's players in their specific time slot
      const allTimeSlotPlayers = [];
      
      for (const [team, timeSlotInfo] of teamTimeSlots) {
        // Find players for this team in their specific time slot
        const playersInTimeSlot = findPlayersInTimeSlot(
          timeSlotInfo.timeSlot.dayOfWeek,
          timeSlotInfo.timeSlot.timeBlock,
          dateRangeData
        );
        
        // Filter for just this team's players
        const teamPlayers = playersInTimeSlot
          .filter(player => player.team === team)
          .map(player => ({
            ...player,
            gameTimeSlot: timeSlotInfo.displayText
          }));
        
        allTimeSlotPlayers.push(...teamPlayers);
      }
      
      debugLog.log('CARDS', `[analyzeTimeSlot] Found ${allTimeSlotPlayers.length} total players across all time slots`);
      
      // Sort by performance and take top 25
      const sortedPlayers = allTimeSlotPlayers
        .sort((a, b) => parseFloat(b.hrsPerGame) - parseFloat(a.hrsPerGame))
        .slice(0, 25);
      
      setTimeSlotData(sortedPlayers);
      
      // Set a generic display message since we have multiple time slots
      setCurrentTimeSlot("their scheduled game times");
      
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
  } else {
    setLoading(false);
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
        Best HR performers in their specific game time slots (min. 3 games)
      </p>
      
      {timeSlotData.length === 0 ? (
        <div className="no-data">
          No sufficient HR history for today's players in their time slots
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
                    {teamInfo.logoUrl && (
                      <>
                        <img 
                          src={teamInfo.logoUrl} 
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
                    <div className="player-team">{teamInfo.name}</div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: '#e63946' }}>
                      {player.hrsPerGame} HR/G
                    </span>
                    <small className="stat-note">
                      {player.totalHRs} HRs in {player.gamesInSlot}G
                      <br />
                      in {player.gameTimeSlot}
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