import React from 'react';
import './PerformanceCard.css';

/**
 * PerformanceCard - Shows over or under performing players with glass aesthetic
 * Enhanced with integrated team logos and glass morphism
 */
const PerformanceCard = ({ 
  teamData,
  currentDate
}) => {
  const [performanceData, setPerformanceData] = React.useState({
    overPerforming: [],
    underPerforming: []
  });
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Load performance data
  React.useEffect(() => {
    const loadPerformanceData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/data/predictions/player_performance_latest.json');
        if (response.ok) {
          const data = await response.json();
          
          // Handle both old format {overPerforming: [], underPerforming: []} 
          // and new format {players: [{status: "over-performing"/"under-performing"}]}
          let overPerforming = [];
          let underPerforming = [];
          
          if (data.overPerforming && data.underPerforming) {
            // Old format
            overPerforming = data.overPerforming;
            underPerforming = data.underPerforming;
          } else if (data.players && Array.isArray(data.players)) {
            // New format - filter by status
            overPerforming = data.players.filter(player => player.status === 'over-performing');
            underPerforming = data.players.filter(player => player.status === 'under-performing');
          }
          
          console.log(`[PerformanceCard] Loaded ${underPerforming.length} under-performing players`);
          
          setPerformanceData({
            overPerforming,
            underPerforming
          });
        }
      } catch (error) {
        console.error('Error loading performance data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPerformanceData();
  }, [currentDate]);
  
  const getTeamLogo = (teamCode) => {
    if (!teamData[teamCode]) return null;
    return teamData[teamCode].logoUrl || `/data/logos/${teamCode.toLowerCase()}_logo.png`;
  };
  
  if (isLoading) {
    return (
      <div className="card under-performing-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>📉 Top Under-Performing Players</h3>
          </div>
          <div className="scrollable-container">
            <div className="loading-indicator">Loading performance data...</div>
          </div>
        </div>
      </div>
    );
  }
  
  const displayData = performanceData.underPerforming.slice(0, 15);
  
  if (displayData.length === 0) {
    return (
      <div className="card under-performing-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>📉 Top Under-Performing Players</h3>
          </div>
          <div className="scrollable-container">
            <div className="no-data">No under-performing player data available</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card under-performing-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>📉 Top Under-Performing Players</h3>
          <div className="card-subtitle">
            {displayData.length} players performing below expected levels
          </div>
        </div>
        
        <div className="scrollable-container">
          <ul className="player-list">
            {displayData.map((player, index) => {
              // Get team logo URL if teams data is available
              const teamAbbr = player.team;
              const teamInfo = teamData && teamAbbr ? teamData[teamAbbr] : null;
              const logoUrl = teamInfo ? teamInfo.logoUrl : null;
              
              return (
                <li key={index} className="player-item">
                  <div className="player-rank" style={{ backgroundColor: teamInfo?.colors?.primary || '#9C27B0' }}>
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
                    <div className="player-name">{player.fullName || player.name}</div>
                    <div className="player-team">{player.team}</div>
                  </div>
                  <div className="player-stat">
                    <div className="stat-highlight">
                      {player.performanceIndicator.toFixed(1)}%
                    </div>
                    <small>Actual: {player.homeRunsThisSeason} HR</small>
                    <small>Expected: {player.expectedHRs.toFixed(1)} HR</small>
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
      </div>
    </div>
  );
};

export default PerformanceCard;