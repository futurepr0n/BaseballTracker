import React from 'react';
import './Dashboard.css';

/**
 * Dashboard component - Home page displaying summary of MLB data
 * Now with support for both hitting and pitching statistics
 */
function Dashboard({ playerData, teamData, gameData, currentDate }) {
  // Format date for display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Separate batting and pitching stats
  const batterData = playerData.filter(player => 
    player.playerType === 'hitter' || !player.playerType);
  
  const pitcherData = playerData.filter(player => 
    player.playerType === 'pitcher');
  
  // Calculate hitting stats summary
  const totalHomeRuns = batterData.reduce((sum, player) => 
    sum + (player.HR === 'DNP' ? 0 : (Number(player.HR) || 0)), 0);
  
  const totalHits = batterData.reduce((sum, player) => 
    sum + (player.H === 'DNP' ? 0 : (Number(player.H) || 0)), 0);
  
  const totalRuns = batterData.reduce((sum, player) => 
    sum + (player.R === 'DNP' ? 0 : (Number(player.R) || 0)), 0);
  
  // Calculate pitching stats summary
  const totalStrikeouts = pitcherData.reduce((sum, player) => 
    sum + (player.K === 'DNP' ? 0 : (Number(player.K) || 0)), 0);
  
  const totalInningsPitched = pitcherData.reduce((sum, player) => 
    sum + (player.IP === 'DNP' ? 0 : (Number(player.IP) || 0)), 0);
  
  // Find top performers
  const topHitters = [...batterData]
    .filter(player => player.H !== 'DNP' && player.H !== null)
    .sort((a, b) => (Number(b.H) || 0) - (Number(a.H) || 0))
    .slice(0, 5);
  
  const topHomers = [...batterData]
    .filter(player => player.HR !== 'DNP' && player.HR !== null && Number(player.HR) > 0)
    .sort((a, b) => (Number(b.HR) || 0) - (Number(a.HR) || 0))
    .slice(0, 5);
  
  // Find top pitchers
  const topStrikeoutPitchers = [...pitcherData]
    .filter(player => player.K !== 'DNP' && player.K !== null)
    .sort((a, b) => (Number(b.K) || 0) - (Number(a.K) || 0))
    .slice(0, 5);
  
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
        
        {/* Top Hitters Card */}
        <div className="card top-hitters">
          <h3>Top Hitters</h3>
          {topHitters.length > 0 ? (
            <ul className="player-list">
              {topHitters.map((player, index) => (
                <li key={index} className="player-item">
                  <div className="player-rank">{index + 1}</div>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div className="player-stat">{player.H} hits</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No hitting data available for this date</p>
          )}
        </div>
        
        {/* Home Run Leaders Card */}
        <div className="card hr-leaders">
          <h3>Home Run Leaders</h3>
          {topHomers.length > 0 ? (
            <ul className="player-list">
              {topHomers.map((player, index) => (
                <li key={index} className="player-item">
                  <div className="player-rank">{index + 1}</div>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div className="player-stat">{player.HR} HR</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No home run data available for this date</p>
          )}
        </div>
        
        {/* Strikeout Leaders Card */}
        <div className="card k-leaders">
          <h3>Strikeout Leaders</h3>
          {topStrikeoutPitchers.length > 0 ? (
            <ul className="player-list">
              {topStrikeoutPitchers.map((player, index) => (
                <li key={index} className="player-item">
                  <div className="player-rank">{index + 1}</div>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div className="player-stat">{player.K} K</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No pitching data available for this date</p>
          )}
        </div>
        
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
                {topHomers.length > 0 
                  ? `${topHomers[0].name} leads with ${topHomers[0].HR} home runs today` 
                  : 'No home runs recorded today'}
              </span>
            </div>
            <div className="update-item">
              <span className="update-icon">⚾</span>
              <span className="update-text">
                {topStrikeoutPitchers.length > 0 
                  ? `${topStrikeoutPitchers[0].name} leads with ${topStrikeoutPitchers[0].K} strikeouts today` 
                  : 'No pitching data recorded today'}
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