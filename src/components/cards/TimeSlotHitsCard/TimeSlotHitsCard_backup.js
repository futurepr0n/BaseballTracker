// src/components/cards/TimeSlotHitsCard/TimeSlotHitsCard.js
import React, { useState, useEffect, useRef } from 'react';
import { debugLog } from '../../../utils/debugConfig';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData,
  classifySpecificTimeSlot,
  findPlayersInTimeSlot,
  getCurrentTimeSlot
} from '../../../services/dataService';
import { getPlayerDisplayName, getTeamDisplayName } from '../../../utils/playerNameUtils';
import { useTeamFilter } from '../../TeamFilterContext';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import '../../common/MobilePlayerCard.css';
import { initializeCollapsibleGlass } from '../../../utils/collapsibleGlass';
import './TimeSlotHitsCard.css';


const TimeSlotHitsCard = ({ gameData, currentDate, teams }) => {
  const [timeSlotData, setTimeSlotData] = useState([]);
  const [currentTimeSlot, setCurrentTimeSlot] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { shouldIncludePlayer } = useTeamFilter();
  const headerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (headerRef.current && containerRef.current) {
      const cleanup = initializeCollapsibleGlass(
        headerRef.current, 
        containerRef.current,
        'time-slot-hits-card'
      );
      return cleanup;
    }
  }, []);

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
          365   // Max lookback (1 year) - increased to match HR card
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
      <div className="card time-slot-hits-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>⏰ Hits by Time Slot</h3>
          </div>
          <div className="loading-indicator">Analyzing time slot patterns...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card time-slot-hits-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>⏰ Hits by Time Slot</h3>
          </div>
          <div className="no-data">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card time-slot-hits-card">
      <div className="glass-card-container" ref={containerRef}>
        <div className="glass-header" ref={headerRef}>
          <h3>⏰ Hits by Time Slot</h3>
          <p className="card-subtitle">
            Best performers in {currentTimeSlot} (min. 3 games)
          </p>
        </div>
        
        <div className="glass-content expanded">
          <div className="scrollable-container">
            {timeSlotData.length === 0 ? (
              <div className="no-data">
                No sufficient time slot history for today's players
              </div>
            ) : (
              <>
            {/* Desktop View */}
            <div className="desktop-view">
              <div className="scrollable-container">
                <ul className="player-list">
                  {timeSlotData.filter(player => 
                    shouldIncludePlayer(player.team, player.name)
                  ).slice(0, 10).map((player, index) => {
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
                          <div className="player-name">{getPlayerDisplayName(player)}</div>
                          <div className="player-team">{getTeamDisplayName(player)}</div>
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
            </div>

            {/* Mobile View */}
            <div className="mobile-view">
              <div className="mobile-cards">
                {timeSlotData.filter(player => 
                  shouldIncludePlayer(player.team, player.name)
                ).slice(0, 10).map((player, index) => {
                  const teamInfo = getTeamInfo(player.team);
                  
                  return (
                    <MobilePlayerCard
                      key={`${player.name}_${player.team}`}
                      item={{
                        name: getPlayerDisplayName(player),
                        team: player.team
                      }}
                      index={index}
                      showRank={true}
                      showExpandButton={true}
                      primaryMetric={{
                        value: player.hitsPerGame,
                        label: 'H/G'
                      }}
                      secondaryMetrics={[
                        { label: 'Total H', value: player.totalHits },
                        { label: 'Games', value: player.gamesInSlot },
                        { label: 'AVG', value: player.battingAvg }
                      ]}
                      expandableContent={
                        <div className="mobile-analysis">
                          <div className="metrics-grid">
                            <div className="metric-item">
                              <div className="metric-item-value">{player.hitsPerGame}</div>
                              <div className="metric-item-label">Hits/Game</div>
                            </div>
                            <div className="metric-item">
                              <div className="metric-item-value">{player.totalHits}</div>
                              <div className="metric-item-label">Total Hits</div>
                            </div>
                            <div className="metric-item">
                              <div className="metric-item-value">{player.gamesInSlot}</div>
                              <div className="metric-item-label">Games Played</div>
                            </div>
                            <div className="metric-item">
                              <div className="metric-item-value">{player.battingAvg}</div>
                              <div className="metric-item-label">Batting AVG</div>
                            </div>
                          </div>
                          
                          <div className="analysis-item">
                            <strong>Time Slot Performance:</strong> {player.gameTimeSlot}
                          </div>
                          
                          <div className="analysis-item">
                            <strong>Hit Rate:</strong> {((player.totalHits / player.gamesInSlot) * 100).toFixed(1)}% games with hits
                          </div>
                          
                          {player.gameTimeSlot && (
                            <div className="analysis-item">
                              <strong>Schedule Context:</strong> Performs well in {player.gameTimeSlot.toLowerCase()} games
                            </div>
                          )}
                        </div>
                      }
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
// Time Slot Home Runs Card
const TimeSlotHRCard = ({ gameData, currentDate, teams }) => {
  const [timeSlotData, setTimeSlotData] = useState([]);
  const [currentTimeSlot, setCurrentTimeSlot] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { shouldIncludePlayer } = useTeamFilter();

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
      <div className="card time-slot-hr-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>⏰ HRs by Time Slot</h3>
          </div>
          <div className="loading-indicator">Analyzing time slot HR patterns...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card time-slot-hr-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>⏰ HRs by Time Slot</h3>
          </div>
          <div className="no-data">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card time-slot-hr-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>⏰ HRs by Time Slot</h3>
          <p className="card-subtitle">
            Best HR performers in {currentTimeSlot} (min. 3 games)
          </p>
        </div>
        
        {timeSlotData.length === 0 ? (
          <div className="no-data">
            No sufficient HR history for today's players in their time slots
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="desktop-view">
              <div className="scrollable-container">
                <ul className="player-list">
                  {timeSlotData.filter(player => 
                    shouldIncludePlayer(player.team, player.name)
                  ).slice(0, 10).map((player, index) => {
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
                        
                        <div className="player-rank" style={{ backgroundColor: '#06b6d4' }}>
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
                          <div className="player-name">{getPlayerDisplayName(player)}</div>
                          <div className="player-team">{getTeamDisplayName(player)}</div>
                        </div>
                        
                        <div className="player-stat">
                          <span className="stat-highlight" style={{ color: '#06b6d4' }}>
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
            </div>

            {/* Mobile View */}
            <div className="mobile-view">
              <div className="mobile-cards">
                {timeSlotData.filter(player => 
                  shouldIncludePlayer(player.team, player.name)
                ).slice(0, 10).map((player, index) => {
                  const teamInfo = getTeamInfo(player.team);
                  
                  return (
                    <MobilePlayerCard
                      key={`${player.name}_${player.team}`}
                      item={{
                        name: getPlayerDisplayName(player),
                        team: player.team
                      }}
                      index={index}
                      showRank={true}
                      showExpandButton={true}
                      primaryMetric={{
                        value: player.hrsPerGame,
                        label: 'HR/G'
                      }}
                      secondaryMetrics={[
                        { label: 'Total HR', value: player.totalHRs },
                        { label: 'Games', value: player.gamesInSlot },
                        { label: 'HR Rate', value: `${((player.totalHRs / player.gamesInSlot) * 100).toFixed(1)}%` }
                      ]}
                      expandableContent={
                        <div className="mobile-analysis">
                          <div className="metrics-grid">
                            <div className="metric-item">
                              <div className="metric-item-value">{player.hrsPerGame}</div>
                              <div className="metric-item-label">HR/Game</div>
                            </div>
                            <div className="metric-item">
                              <div className="metric-item-value">{player.totalHRs}</div>
                              <div className="metric-item-label">Total HRs</div>
                            </div>
                            <div className="metric-item">
                              <div className="metric-item-value">{player.gamesInSlot}</div>
                              <div className="metric-item-label">Games Played</div>
                            </div>
                            <div className="metric-item">
                              <div className="metric-item-value">{((player.totalHRs / player.gamesInSlot) * 100).toFixed(1)}%</div>
                              <div className="metric-item-label">HR Success Rate</div>
                            </div>
                          </div>
                          
                          <div className="analysis-item">
                            <strong>Time Slot Performance:</strong> {player.gameTimeSlot}
                          </div>
                          
                          <div className="analysis-item">
                            <strong>Power Display:</strong> {player.totalHRs} home runs in {player.gamesInSlot} games
                          </div>
                          
                          {player.gameTimeSlot && (
                            <div className="analysis-item">
                              <strong>Schedule Context:</strong> Strong power in {player.gameTimeSlot.toLowerCase()} games
                            </div>
                          )}
                        </div>
                      }
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export { TimeSlotHitsCard, TimeSlotHRCard };