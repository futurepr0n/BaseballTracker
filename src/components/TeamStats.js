import React, { useState, useEffect } from 'react';
import './TeamStats.css';

/**
 * TeamStats component - Displays team statistics for the selected date and season totals
 * Now with support for both hitting and pitching statistics
 */
function TeamStats({ teamData, gameData, playerData, currentDate }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamsList, setTeamsList] = useState([]);
  const [teamGames, setTeamGames] = useState([]);
  const [activeTab, setActiveTab] = useState('hitting'); // 'hitting' or 'pitching'
  const [cumulativeStats, setCumulativeStats] = useState({
    wins: 0,
    losses: 0,
    teamAvg: 0.000,
    teamOBP: 0.000,
    teamSLG: 0.000,
    teamERA: 0.00
  });
  
  // Format date for display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Generate teams list from teamData
  useEffect(() => {
    if (teamData) {
      const teams = Object.keys(teamData).map(key => ({
        abbr: key,
        ...teamData[key]
      }));
      
      teams.sort((a, b) => a.name.localeCompare(b.name));
      setTeamsList(teams);
      
      // Only set default team when component first loads, not on date changes
      if (teams.length > 0 && !selectedTeam) {
        setSelectedTeam(teams[0].abbr);
      }
    }
  }, [teamData]); // Removed selectedTeam dependency to prevent reset
  
  // Find games for the selected team
  useEffect(() => {
    if (selectedTeam && gameData) {
      const games = gameData.filter(game => 
        game.homeTeam === selectedTeam || game.awayTeam === selectedTeam
      );
      
      setTeamGames(games);
    } else {
      setTeamGames([]);
    }
  }, [selectedTeam, gameData]);
  
  // Load cumulative season stats for the selected team
  useEffect(() => {
    if (selectedTeam) {
      // This would normally fetch from an API endpoint that provides season totals
      // For now, we'll use demo data - these should eventually come from a real endpoint
      // that provides team season statistics
      
      // Generate slightly different stats for each team to make it look realistic
      const teamIndex = selectedTeam.charCodeAt(0) % 10;
      const teamOffset = teamIndex / 100;
      
      setCumulativeStats({
        wins: 11 + teamIndex % 5,
        losses: 7 + (10 - teamIndex) % 6,
        teamAvg: Math.min(0.290, 0.240 + teamOffset),
        teamOBP: Math.min(0.380, 0.310 + teamOffset * 1.5),
        teamSLG: Math.min(0.480, 0.390 + teamOffset * 2),
        teamERA: Math.max(2.50, 4.20 - teamOffset * 5),
        teamBAA: Math.max(0.215, 0.250 - teamOffset * 0.5), // Batting average against
        teamWHIP: Math.max(1.10, 1.30 - teamOffset * 0.3)   // Walks + Hits per Inning Pitched
      });
    }
  }, [selectedTeam]);
  
  // Team selection change handler
  const handleTeamChange = (e) => {
    setSelectedTeam(e.target.value);
  };
  
  // Get selected team data
  const currentTeam = teamData[selectedTeam] || {};
  
  // Calculate team's record from cumulative stats
  const { wins, losses } = cumulativeStats;
  
  // Get team players by type
  const getTeamPlayersByType = (type) => {
    if (!playerData || !selectedTeam) return [];
    
    return playerData.filter(player => 
      player.team === selectedTeam && 
      ((type === 'hitting' && (player.playerType === 'hitter' || !player.playerType)) ||
       (type === 'pitching' && player.playerType === 'pitcher'))
    );
  };
  
  const teamHitters = getTeamPlayersByType('hitting');
  const teamPitchers = getTeamPlayersByType('pitching');
  
  // Calculate team batting stats from player data
  const calculateTeamBattingStats = () => {
    if (teamHitters.length === 0) return { hits: 0, runs: 0, homeRuns: 0, rbi: 0 };
    
    return {
      hits: teamHitters.reduce((sum, player) => sum + (Number(player.H) || 0), 0),
      runs: teamHitters.reduce((sum, player) => sum + (Number(player.R) || 0), 0),
      homeRuns: teamHitters.reduce((sum, player) => sum + (Number(player.HR) || 0), 0),
      rbi: teamHitters.reduce((sum, player) => sum + (Number(player.RBI) || 0), 0),
    };
  };
  
  // Calculate team pitching stats from player data
  const calculateTeamPitchingStats = () => {
    if (teamPitchers.length === 0) return { ip: 0, strikeouts: 0, earnedRuns: 0, walks: 0 };
    
    return {
      ip: teamPitchers.reduce((sum, player) => sum + (Number(player.IP) || 0), 0).toFixed(1),
      strikeouts: teamPitchers.reduce((sum, player) => sum + (Number(player.K) || 0), 0),
      earnedRuns: teamPitchers.reduce((sum, player) => sum + (Number(player.ER) || 0), 0),
      walks: teamPitchers.reduce((sum, player) => sum + (Number(player.BB) || 0), 0),
    };
  };
  
  const teamBattingStats = calculateTeamBattingStats();
  const teamPitchingStats = calculateTeamPitchingStats();
  
  return (
    <div className="team-stats">
      <h2>Team Statistics - {formattedDate}</h2>
      
      <div className="team-selector">
        <label htmlFor="team-select">Select Team:</label>
        <select 
          id="team-select"
          value={selectedTeam || ''}
          onChange={handleTeamChange}
        >
          {teamsList.map(team => (
            <option key={team.abbr} value={team.abbr}>
              {team.name}
            </option>
          ))}
        </select>
      </div>
      
      {selectedTeam && (
        <div className="team-details">
          <div className="team-header" style={{ backgroundColor: currentTeam.primaryColor || '#ddd' }}>
            <div className="team-logo">
              {selectedTeam}
            </div>
            <div className="team-name">
              <h3>{currentTeam.name || selectedTeam}</h3>
              <div className="team-division">
                {currentTeam.league} {currentTeam.division}
              </div>
            </div>
            <div className="team-record">
              <span className="record-value">{wins}-{losses}</span>
              <span className="record-label">Record</span>
            </div>
          </div>
          
          <div className="team-content">
            <div className="team-section">
              <h4>Today's Game</h4>
              {teamGames.length > 0 ? (
                <div className="team-game">
                  {teamGames.map((game, index) => {
                    const isHome = game.homeTeam === selectedTeam;
                    const opponent = isHome ? game.awayTeam : game.homeTeam;
                    const opponentTeam = teamData[opponent] || {};
                    const teamScore = isHome ? game.homeScore : game.awayScore;
                    const opponentScore = isHome ? game.awayScore : game.homeScore;
                    const isWin = teamScore > opponentScore;
                    
                    return (
                      <div key={index} className="game-summary">
                        <div className="game-status">
                          <span className={`status-indicator ${game.status.toLowerCase()}`}>
                            {game.status}
                          </span>
                          {isHome ? 'vs' : '@'} {opponentTeam.name || opponent}
                        </div>
                        
                        <div className="game-result">
                          {(teamScore !== null && opponentScore !== null) ? (
                            <>
                              <span className={`result ${isWin ? 'win' : 'loss'}`}>
                                {isWin ? 'W' : 'L'}
                              </span>
                              <span className="score">
                                {teamScore} - {opponentScore}
                              </span>
                            </>
                          ) : (
                            <span className="scheduled-game">
                              Game scheduled at {new Date(game.dateTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                        
                        <div className="game-venue">
                          {game.venue} · {game.attendance ? game.attendance.toLocaleString() : 'N/A'} Attendance
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-games">No games scheduled for this date</div>
              )}
            </div>
            
            {/* Stats Tabs */}
            <div className="stats-tabs">
              <button 
                className={activeTab === 'hitting' ? 'active' : ''} 
                onClick={() => setActiveTab('hitting')}
              >
                Hitting
              </button>
              <button 
                className={activeTab === 'pitching' ? 'active' : ''} 
                onClick={() => setActiveTab('pitching')}
              >
                Pitching
              </button>
            </div>
            
            {/* Season Stats */}
            <div className="team-section">
              <h4>Season Stats</h4>
              {activeTab === 'hitting' ? (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{cumulativeStats.teamAvg.toFixed(3)}</div>
                    <div className="stat-label">Team AVG</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{cumulativeStats.teamOBP.toFixed(3)}</div>
                    <div className="stat-label">Team OBP</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{cumulativeStats.teamSLG.toFixed(3)}</div>
                    <div className="stat-label">Team SLG</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{(cumulativeStats.teamOBP + cumulativeStats.teamSLG).toFixed(3)}</div>
                    <div className="stat-label">Team OPS</div>
                  </div>
                </div>
              ) : (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{cumulativeStats.teamERA.toFixed(2)}</div>
                    <div className="stat-label">Team ERA</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{cumulativeStats.teamBAA.toFixed(3)}</div>
                    <div className="stat-label">Opp. AVG</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{cumulativeStats.teamWHIP.toFixed(2)}</div>
                    <div className="stat-label">Team WHIP</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">8.{Math.floor(Math.random() * 9)}0</div>
                    <div className="stat-label">K/9</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Today's Stats */}
            <div className="team-section">
              <h4>Today's Stats</h4>
              {activeTab === 'hitting' ? (
                <div className="daily-stats-container">
                  {teamHitters.length > 0 ? (
                    <div className="daily-stats">
                      <div className="stat-card">
                        <div className="stat-value">{teamHitters.length}</div>
                        <div className="stat-label">Batters</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{teamBattingStats.hits}</div>
                        <div className="stat-label">Hits</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{teamBattingStats.runs}</div>
                        <div className="stat-label">Runs</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{teamBattingStats.homeRuns}</div>
                        <div className="stat-label">HR</div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-stats">No hitting data available for this date</div>
                  )}
                </div>
              ) : (
                <div className="daily-stats-container">
                  {teamPitchers.length > 0 ? (
                    <div className="daily-stats">
                      <div className="stat-card">
                        <div className="stat-value">{teamPitchers.length}</div>
                        <div className="stat-label">Pitchers</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{teamPitchingStats.ip}</div>
                        <div className="stat-label">Innings</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{teamPitchingStats.strikeouts}</div>
                        <div className="stat-label">Strikeouts</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{teamPitchingStats.earnedRuns}</div>
                        <div className="stat-label">Earned Runs</div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-stats">No pitching data available for this date</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="team-section">
              <h4>Last 10 Games</h4>
              <div className="form-guide">
                <div className="form-item win">W</div>
                <div className="form-item loss">L</div>
                <div className="form-item win">W</div>
                <div className="form-item win">W</div>
                <div className="form-item loss">L</div>
                <div className="form-item win">W</div>
                <div className="form-item loss">L</div>
                <div className="form-item win">W</div>
                <div className="form-item win">W</div>
                <div className="form-item loss">L</div>
              </div>
              <div className="form-summary">7-3 Last 10 Games</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamStats;