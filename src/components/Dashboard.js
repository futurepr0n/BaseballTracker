import React, { useState, useEffect } from 'react';
import './Dashboard.css';

// Helper function to format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Dashboard component - Home page displaying summary of MLB data
 * With static HR prediction loading from pre-generated JSON file
 * Enhanced to show 7-day stats and previous day data when current is unavailable
 */
function Dashboard({ playerData, teamData, gameData, currentDate }) {
  const [playersWithHomeRunPrediction, setPlayersWithHomeRunPrediction] = useState([]);
  const [predictionLoading, setPredictionLoading] = useState(true);
  const [rollingStats, setRollingStats] = useState({
    hitters: [],
    homers: [],
    strikeouts: []
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [playerPerformance, setPlayerPerformance] = useState(null);
  const [topPerformers, setTopPerformers] = useState({
    hrRate: [],
    improved: [],
    recent: [],
    overPerforming: [],
    underPerforming: []
  });
  
  // Format date for display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Load HR predictions from pre-generated file
  useEffect(() => {
    const loadHRPredictions = async () => {
      try {
        setPredictionLoading(true);
        
        // Format date for file name
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Try to load the specific date file first
        let response = await fetch(`/data/predictions/hr_predictions_${dateStr}.json`);
        
        // If not found, try to load the latest predictions
        if (!response.ok) {
          response = await fetch('/data/predictions/hr_predictions_latest.json');
        }
        
        if (!response.ok) {
          console.warn('No HR predictions found, will show default data');
          setPlayersWithHomeRunPrediction([]);
        } else {
          const data = await response.json();
          setPlayersWithHomeRunPrediction(data.predictions || []);
        }
      } catch (error) {
        console.error('Error loading HR predictions:', error);
        setPlayersWithHomeRunPrediction([]);
      } finally {
        setPredictionLoading(false);
      }
    };
    
    loadHRPredictions();
  }, [currentDate]);
  
  // Load player performance data and calculate top performers
  useEffect(() => {
    const loadPlayerPerformance = async () => {
      try {
        const response = await fetch('/data/predictions/player_performance_latest.json');
        if (response.ok) {
          const data = await response.json();
          setPlayerPerformance(data);
          
          // Process top performers if we have player data
          if (data && data.players && data.players.length > 0) {
            const players = data.players;
            
            // 1. Top players by HR rate this season
            const hrRate = [...players]
              .filter(player => player.gamesPlayed > 0 && player.homeRunsThisSeason > 0)
              .sort((a, b) => (b.homeRunsThisSeason / b.gamesPlayed) - (a.homeRunsThisSeason / a.gamesPlayed))
              .slice(0, 10);
            
            // 2. Top players with improved HR rate compared to historical
            const improved = [...players]
              .filter(player => player.actualHRRate > player.historicalHRRate)
              .sort((a, b) => (b.actualHRRate - b.historicalHRRate) - (a.actualHRRate - a.historicalHRRate))
              .slice(0, 10);
            
            // 3. Players who hit home runs most recently
            const recent = [...players]
              .filter(player => player.lastHRDate)
              .sort((a, b) => {
                // First sort by date (newest first)
                const dateA = new Date(a.lastHRDate);
                const dateB = new Date(b.lastHRDate);
                if (dateB - dateA !== 0) return dateB - dateA;
                
                // If same date, sort by total home runs
                return b.homeRunsThisSeason - a.homeRunsThisSeason;
              })
              .slice(0, 10);
            
            // 4. Over-performing players
            const overPerforming = [...players]
              .filter(player => player.status === "over-performing")
              .sort((a, b) => b.performanceIndicator - a.performanceIndicator)
              .slice(0, 10);
            
            // 5. Under-performing players
            const underPerforming = [...players]
              .filter(player => player.status === "under-performing")
              .sort((a, b) => a.performanceIndicator - b.performanceIndicator)
              .slice(0, 10);
            
            setTopPerformers({
              hrRate,
              improved,
              recent,
              overPerforming,
              underPerforming
            });
          }
        } else {
          console.warn('No player performance data found');
          setPlayerPerformance(null);
        }
      } catch (error) {
        console.error('Error loading player performance data:', error);
        setPlayerPerformance(null);
      }
    };
    
    loadPlayerPerformance();
  }, []);
  
  // Load rolling 7-day stats or previous day if today is empty
  useEffect(() => {
    const loadRollingStats = async () => {
      try {
        setStatsLoading(true);
        
        // Check if there's data for today
        const hasDataForToday = playerData && playerData.length > 0;
        
        // If no data for today, use the last 7 days
        if (!hasDataForToday) {
          // Calculate dates for the last 7 days
          const dates = [];
          for (let i = 1; i <= 7; i++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - i);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dates.push(`${year}-${month}-${day}`);
          }
          
          // Try to load data for each date
          let combinedData = [];
          for (const dateStr of dates) {
            try {
              const response = await fetch(`/data/${dateStr.substring(0, 4)}/${dateStr.substring(5, 7)}/${dateStr.substring(8, 10)}/daily_stats.json`);
              if (response.ok) {
                const data = await response.json();
                if (data.players && data.players.length > 0) {
                  combinedData = combinedData.concat(data.players.map(player => ({
                    ...player,
                    dateStr
                  })));
                }
              }
            } catch (e) {
              // Silently fail for individual dates
              console.warn(`Could not load data for ${dateStr}`);
            }
          }
          
          // Process the combined data
          if (combinedData.length > 0) {
            // Group by player and combine stats
            const playerMap = new Map();
            
            combinedData.forEach(player => {
              const key = `${player.name}_${player.team}`;
              if (!playerMap.has(key)) {
                playerMap.set(key, {
                  ...player,
                  games: 1,
                  dates: [player.dateStr]
                });
              } else {
                const existing = playerMap.get(key);
                existing.games += 1;
                existing.dates.push(player.dateStr);
                
                // Combine stats (summing numeric values)
                ['H', 'R', 'HR', 'RBI', 'K'].forEach(stat => {
                  if (player[stat] !== 'DNP' && player[stat] !== null) {
                    existing[stat] = (existing[stat] === 'DNP' || existing[stat] === null) 
                      ? Number(player[stat]) 
                      : Number(existing[stat]) + Number(player[stat]);
                  }
                });
              }
            });
            
            // Convert back to array
            const processedPlayers = Array.from(playerMap.values());
            
            // Create separate lists for batters and pitchers
            const batters = processedPlayers.filter(player => 
              player.playerType === 'hitter' || !player.playerType);
            
            const pitchers = processedPlayers.filter(player => 
              player.playerType === 'pitcher');
            
            // Find top performers
            const topHitters = [...batters]
              .filter(player => player.H !== 'DNP' && player.H !== null)
              .sort((a, b) => Number(b.H) - Number(a.H))
              .slice(0, 5);
            
            const topHomers = [...batters]
              .filter(player => player.HR !== 'DNP' && player.HR !== null && Number(player.HR) > 0)
              .sort((a, b) => Number(b.HR) - Number(a.HR))
              .slice(0, 5);
            
            const topStrikeoutPitchers = [...pitchers]
              .filter(player => player.K !== 'DNP' && player.K !== null)
              .sort((a, b) => Number(b.K) - Number(a.K))
              .slice(0, 5);
            
            setRollingStats({
              hitters: topHitters,
              homers: topHomers,
              strikeouts: topStrikeoutPitchers
            });
          } else {
            // No historical data available, check if we have player performance data
            if (playerPerformance && playerPerformance.players) {
              // Transform player performance data for use in dashboard
              const players = playerPerformance.players;
              
              // Create homers list based on homeRunsThisSeason
              const homers = [...players]
                .filter(player => player.homeRunsThisSeason)
                .sort((a, b) => b.homeRunsThisSeason - a.homeRunsThisSeason)
                .slice(0, 5)
                .map(player => ({
                  name: player.fullName || player.name,
                  team: player.team,
                  HR: player.homeRunsThisSeason,
                  games: player.gamesPlayed || 1
                }));
              
              // Create hitters list based on performance indicators
              const hitters = [...players]
                .filter(player => player.performanceIndicator)
                .sort((a, b) => b.performanceIndicator - a.performanceIndicator)
                .slice(0, 5)
                .map(player => ({
                  name: player.fullName || player.name,
                  team: player.team,
                  H: Math.round(player.expectedHRs * 2), // Estimated hits based on HR rate
                  games: player.gamesPlayed || 1
                }));
              
              // We don't have pitcher data, so leave strikeouts empty
              const strikeouts = [];
              
              setRollingStats({
                hitters,
                homers,
                strikeouts
              });
            } else {
              // Fallback to the current playerData
              processCurrentData();
            }
          }
        } else {
          // Use the current day's data
          processCurrentData();
        }
      } catch (error) {
        console.error('Error loading rolling stats:', error);
        processCurrentData(); // Fallback to current data
      } finally {
        setStatsLoading(false);
      }
    };
    
    // Helper function to process current data
    const processCurrentData = () => {
      const batters = playerData.filter(player => 
        player.playerType === 'hitter' || !player.playerType);
      
      const pitchers = playerData.filter(player => 
        player.playerType === 'pitcher');
      
      // Find top performers in current data
      const topHitters = [...batters]
        .filter(player => player.H !== 'DNP' && player.H !== null)
        .sort((a, b) => (Number(b.H) || 0) - (Number(a.H) || 0))
        .slice(0, 5);
      
      const topHomers = [...batters]
        .filter(player => player.HR !== 'DNP' && player.HR !== null && Number(player.HR) > 0)
        .sort((a, b) => (Number(b.HR) || 0) - (Number(a.HR) || 0))
        .slice(0, 5);
      
      const topStrikeoutPitchers = [...pitchers]
        .filter(player => player.K !== 'DNP' && player.K !== null)
        .sort((a, b) => (Number(b.K) || 0) - (Number(a.K) || 0))
        .slice(0, 5);
      
      setRollingStats({
        hitters: topHitters,
        homers: topHomers,
        strikeouts: topStrikeoutPitchers
      });
    };
    
    loadRollingStats();
  }, [playerData, currentDate, playerPerformance]);
  
  // Separate batting and pitching stats from current data
  const batterData = playerData.filter(player => 
    player.playerType === 'hitter' || !player.playerType);
  
  const pitcherData = playerData.filter(player => 
    player.playerType === 'pitcher');
  
  // Calculate hitting stats summary from current data
  const totalHomeRuns = batterData.reduce((sum, player) => 
    sum + (player.HR === 'DNP' ? 0 : (Number(player.HR) || 0)), 0);
  
  const totalHits = batterData.reduce((sum, player) => 
    sum + (player.H === 'DNP' ? 0 : (Number(player.H) || 0)), 0);
  
  const totalRuns = batterData.reduce((sum, player) => 
    sum + (player.R === 'DNP' ? 0 : (Number(player.R) || 0)), 0);
  
  // Calculate pitching stats summary from current data
  const totalStrikeouts = pitcherData.reduce((sum, player) => 
    sum + (player.K === 'DNP' ? 0 : (Number(player.K) || 0)), 0);
  
  const totalInningsPitched = pitcherData.reduce((sum, player) => 
    sum + (player.IP === 'DNP' ? 0 : (Number(player.IP) || 0)), 0);
  
  // Helper function to display the time period
  const getTimePeriodText = () => {
    const hasDataForToday = playerData && playerData.length > 0;
    const hasHistoricalData = rollingStats.hitters.length > 0 || 
                             rollingStats.homers.length > 0 || 
                             rollingStats.strikeouts.length > 0;
    
    if (hasDataForToday) return "Today";
    if (hasHistoricalData && !playerPerformance) return "Last 7 Days";
    return "Season Performance";
  };
  
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>MLB Statistics Dashboard</h2>
        <p className="date">{formattedDate}</p>
      </header>
      
      <div className="dashboard-grid">
        {/* Statistics Summary Card */}
        <div className="card stats-summary">
          <h3>Daily Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{batterData.length}</span>
              <span className="stat-label">Batters</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{pitcherData.length}</span>
              <span className="stat-label">Pitchers</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{totalHomeRuns}</span>
              <span className="stat-label">Home Runs</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{totalHits}</span>
              <span className="stat-label">Hits</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{totalStrikeouts}</span>
              <span className="stat-label">Pitcher K's</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{totalInningsPitched.toFixed(1)}</span>
              <span className="stat-label">Innings Pitched</span>
            </div>
          </div>
        </div>
        
        {/* Players Due for Home Run Card */}
        <div className="card hr-prediction">
          <h3>Players Due for Home Runs</h3>
          {predictionLoading ? (
            <div className="loading-indicator">Loading predictions...</div>
          ) : playersWithHomeRunPrediction.length > 0 ? (
            <div className="scrollable-container">
              <ul className="player-list">
                {playersWithHomeRunPrediction.map((player, index) => (
                  <li key={index} className="player-item">
                    <div className="player-rank">{index + 1}</div>
                    <div className="player-info">
                      <span className="player-name">{player.fullName || player.name}</span>
                      <span className="player-team">{player.team}</span>
                    </div>
                    <div className="player-stat">
                      <div className="hr-deficit">
                        {player.gamesSinceLastHR} games without HR
                      </div>
                      <div className="hr-detail">
                        Expected: {player.expectedHRs.toFixed(1)} / Actual: {player.actualHRs}
                      </div>
                      <div className="hr-detail">
                        Last HR: {player.daysSinceLastHR} days ago
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="no-data">No players due for home runs at this time</p>
          )}
        </div>
        
        {/* Top Hitters Card */}
        <div className="card top-hitters">
          <h3>Top Hitters ({getTimePeriodText()})</h3>
          {statsLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : rollingStats.hitters.length > 0 ? (
            <ul className="player-list">
              {rollingStats.hitters.map((player, index) => (
                <li key={index} className="player-item">
                  <div className="player-rank">{index + 1}</div>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div className="player-stat">
                    {player.H} hits
                    {player.games > 1 && <span className="stat-note">({player.games} games)</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No hitting data available for this period</p>
          )}
        </div>
        
        {/* Home Run Leaders Card */}
        <div className="card hr-leaders">
          <h3>Home Run Leaders ({getTimePeriodText()})</h3>
          {statsLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : rollingStats.homers.length > 0 ? (
            <ul className="player-list">
              {rollingStats.homers.map((player, index) => (
                <li key={index} className="player-item">
                  <div className="player-rank">{index + 1}</div>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div className="player-stat">
                    {player.HR} HR
                    {player.games > 1 && <span className="stat-note">({player.games} games)</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No home run data available for this period</p>
          )}
        </div>
        
        {/* Strikeout Leaders Card - Only show if data is available */}
        {rollingStats.strikeouts.length > 0 && (
          <div className="card k-leaders">
            <h3>Strikeout Leaders ({getTimePeriodText()})</h3>
            {statsLoading ? (
              <div className="loading-indicator">Loading stats...</div>
            ) : (
              <ul className="player-list">
                {rollingStats.strikeouts.map((player, index) => (
                  <li key={index} className="player-item">
                    <div className="player-rank">{index + 1}</div>
                    <div className="player-info">
                      <span className="player-name">{player.name}</span>
                      <span className="player-team">{player.team}</span>
                    </div>
                    <div className="player-stat">
                      {player.K} K
                      {player.games > 1 && <span className="stat-note">({player.games} games)</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {/* NEW CARD: Top Home Run Rate Card */}
        {topPerformers.hrRate.length > 0 && (
          <div className="card hr-rate">
            <h3>Top HR Rate This Season</h3>
            <div className="scrollable-container">
              <ul className="player-list">
                {topPerformers.hrRate.map((player, index) => (
                  <li key={index} className="player-item">
                    <div className="player-rank">{index + 1}</div>
                    <div className="player-info">
                      <span className="player-name">{player.fullName || player.name}</span>
                      <span className="player-team">{player.team}</span>
                    </div>
                    <div className="player-stat">
                      <div className="stat-highlight">
                        {(player.homeRunsThisSeason / player.gamesPlayed).toFixed(3)} HR/G
                      </div>
                      <small>{player.homeRunsThisSeason} HR in {player.gamesPlayed} games</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* NEW CARD: Most Improved HR Rate Card */}
        {topPerformers.improved.length > 0 && (
          <div className="card improved-rate">
            <h3>Most Improved HR Rate</h3>
            <div className="scrollable-container">
              <ul className="player-list">
                {topPerformers.improved.map((player, index) => (
                  <li key={index} className="player-item">
                    <div className="player-rank">{index + 1}</div>
                    <div className="player-info">
                      <span className="player-name">{player.fullName || player.name}</span>
                      <span className="player-team">{player.team}</span>
                    </div>
                    <div className="player-stat">
                      <div className="stat-highlight">
                        +{((player.actualHRRate - player.historicalHRRate) * 100).toFixed(1)}%
                      </div>
                      <small>Current: {(player.actualHRRate * 100).toFixed(1)}%</small>
                      <small>Historical: {(player.historicalHRRate * 100).toFixed(1)}%</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* NEW CARD: Most Recent Home Runs Card */}
        {topPerformers.recent.length > 0 && (
          <div className="card recent-hr">
            <h3>Most Recent Home Runs</h3>
            <div className="scrollable-container">
              <ul className="player-list">
                {topPerformers.recent.map((player, index) => (
                  <li key={index} className="player-item">
                    <div className="player-rank">{index + 1}</div>
                    <div className="player-info">
                      <span className="player-name">{player.fullName || player.name}</span>
                      <span className="player-team">{player.team}</span>
                    </div>
                    <div className="player-stat">
                      <div className="stat-highlight">
                        {formatDate(player.lastHRDate)}
                      </div>
                      <small>{player.homeRunsThisSeason} HR this season</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* NEW CARD: Over-Performing Players Card */}
        {topPerformers.overPerforming.length > 0 && (
          <div className="card over-performing">
            <h3>Top Over-Performing Players</h3>
            <div className="scrollable-container">
              <ul className="player-list">
                {topPerformers.overPerforming.map((player, index) => (
                  <li key={index} className="player-item">
                    <div className="player-rank">{index + 1}</div>
                    <div className="player-info">
                      <span className="player-name">{player.fullName || player.name}</span>
                      <span className="player-team">{player.team}</span>
                    </div>
                    <div className="player-stat">
                      <div className="stat-highlight">
                        +{player.performanceIndicator.toFixed(1)}%
                      </div>
                      <small>Actual: {player.homeRunsThisSeason} HR</small>
                      <small>Expected: {player.expectedHRs.toFixed(1)} HR</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* NEW CARD: Under-Performing Players Card */}
        {topPerformers.underPerforming.length > 0 && (
          <div className="card under-performing">
            <h3>Top Under-Performing Players</h3>
            <div className="scrollable-container">
              <ul className="player-list">
                {topPerformers.underPerforming.map((player, index) => (
                  <li key={index} className="player-item">
                    <div className="player-rank">{index + 1}</div>
                    <div className="player-info">
                      <span className="player-name">{player.fullName || player.name}</span>
                      <span className="player-team">{player.team}</span>
                    </div>
                    <div className="player-stat">
                      <div className="stat-highlight">
                        {player.performanceIndicator.toFixed(1)}%
                      </div>
                      <small>Actual: {player.homeRunsThisSeason} HR</small>
                      <small>Expected: {player.expectedHRs.toFixed(1)} HR</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Recent Updates Card */}
        <div className="card recent-updates">
          <h3>Recent Updates</h3>
          <div className="updates-list">
            <div className="update-item">
              <span className="update-icon">📊</span>
              <span className="update-text">Statistics updated for {formattedDate}</span>
            </div>
            <div className="update-item">
              <span className="update-icon">🏆</span>
              <span className="update-text">
                {topPerformers.hrRate.length > 0 
                  ? `${topPerformers.hrRate[0].fullName || topPerformers.hrRate[0].name} leads with ${topPerformers.hrRate[0].homeRunsThisSeason} home runs` 
                  : (rollingStats.homers.length > 0 
                    ? `${rollingStats.homers[0].name} leads with ${rollingStats.homers[0].HR} home runs` 
                    : 'No home runs recorded recently')}
              </span>
            </div>
            <div className="update-item">
              <span className="update-icon">📈</span>
              <span className="update-text">
                {topPerformers.overPerforming.length > 0 
                  ? `${topPerformers.overPerforming[0].fullName || topPerformers.overPerforming[0].name} over-performing by ${topPerformers.overPerforming[0].performanceIndicator.toFixed(1)}%` 
                  : 'No performance indicators available'}
              </span>
            </div>
            <div className="update-item">
              <span className="update-icon">🔄</span>
              <span className="update-text">Next update: Tomorrow at 12:00 AM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;