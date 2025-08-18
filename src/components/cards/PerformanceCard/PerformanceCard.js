import React, { useRef } from 'react';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import { initializeCollapsibleGlass } from '../../../utils/collapsibleGlass';
import '../../common/MobilePlayerCard.css';
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
  const headerRef = useRef(null);
  const containerRef = useRef(null);
  
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

  // Initialize collapsible functionality
  React.useEffect(() => {
    if (headerRef.current && containerRef.current) {
      const cleanup = initializeCollapsibleGlass(
        headerRef.current, 
        containerRef.current,
        'under-performing-card'
      );
      return cleanup;
    }
  }, []);
  
  const getTeamLogo = (teamCode) => {
    if (!teamData[teamCode]) return null;
    return teamData[teamCode].logoUrl || `/data/logos/${teamCode.toLowerCase()}_logo.png`;
  };
  
  if (isLoading) {
    return (
      <div className="card under-performing-card">
        <div className="glass-card-container" ref={containerRef}>
          <div className="glass-header" ref={headerRef}>
            <h3>📉 Top Under-Performing Players</h3>
          </div>
          <div className="glass-content expanded">
            <div className="scrollable-container">
              <div className="loading-indicator">Loading performance data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const displayData = performanceData.underPerforming.slice(0, 15);
  
  if (displayData.length === 0) {
    return (
      <div className="card under-performing-card">
        <div className="glass-card-container" ref={containerRef}>
          <div className="glass-header" ref={headerRef}>
            <h3>📉 Top Under-Performing Players</h3>
          </div>
          <div className="glass-content expanded">
            <div className="scrollable-container">
              <div className="no-data">No under-performing player data available</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card under-performing-card">
      <div className="glass-card-container" ref={containerRef}>
        <div className="glass-header" ref={headerRef}>
          <h3>📉 Top Under-Performing Players</h3>
          <div className="card-subtitle">
            {displayData.length} players performing below expected levels
          </div>
        </div>
        
        <div className="glass-content expanded">
          {/* Desktop View */}
          <div className="scrollable-container desktop-view">
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
          
          {/* Mobile View */}
          <div className="mobile-view">
            <div className="mobile-cards">
              {displayData.slice(0, 10).map((player, index) => {
                const performanceGap = player.expectedHRs - player.homeRunsThisSeason;
                const secondaryMetrics = [
                  { label: 'Actual HRs', value: player.homeRunsThisSeason },
                  { label: 'Expected', value: player.expectedHRs.toFixed(1) }
                ];

                const expandableContent = (
                  <div className="mobile-performance-details">
                    {/* Summary Metrics */}
                    <div className="mobile-metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px'}}>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#9C27B0'}}>{player.homeRunsThisSeason}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Actual HRs</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{player.expectedHRs.toFixed(1)}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Expected HRs</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: performanceGap > 0 ? '#f44336' : '#4CAF50'}}>{performanceGap > 0 ? '-' : '+'}{Math.abs(performanceGap).toFixed(1)}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Gap</div>
                      </div>
                    </div>

                    {/* Performance Context */}
                    <div className="mobile-performance-context" style={{marginBottom: '16px', textAlign: 'center'}}>
                      <strong>Performance Analysis:</strong>
                      <div style={{marginTop: '8px', fontSize: '12px', color: '#ccc'}}>
                        {player.performanceIndicator < 80 ? 
                          `Significantly underperforming expectations by ${performanceGap.toFixed(1)} HRs` :
                        player.performanceIndicator < 90 ? 
                          `Moderately below expectations - ${performanceGap.toFixed(1)} HR gap` :
                        player.performanceIndicator < 110 ? 
                          `Performing close to expectations` :
                          `Exceeding expectations by ${Math.abs(performanceGap).toFixed(1)} HRs`
                        }
                      </div>
                    </div>

                    {/* Performance Analysis */}
                    <div className="mobile-detailed-analysis">
                      <strong>Season Analysis:</strong>
                      <div style={{marginTop: '8px', fontSize: '11px', color: '#ccc'}}>
                        Based on current performance metrics, this player is {player.performanceIndicator < 100 ? 'under' : 'over'}performing 
                        their expected home run production by {Math.abs(100 - player.performanceIndicator).toFixed(1)} percentage points.
                        {player.performanceIndicator < 85 && ' This represents a significant opportunity for regression to the mean.'}
                        {player.performanceIndicator > 115 && ' This hot streak may be unsustainable long-term.'}
                      </div>
                    </div>
                  </div>
                );

                return (
                  <MobilePlayerCard
                    key={index}
                    item={{
                      name: player.fullName || player.name,
                      team: player.team
                    }}
                    index={index}
                    showRank={true}
                    showExpandButton={true}
                    primaryMetric={{
                      value: player.performanceIndicator.toFixed(1) + '%',
                      label: 'Performance vs Expected',
                      color: '#9C27B0'
                    }}
                    secondaryMetrics={secondaryMetrics}
                    expandableContent={expandableContent}
                    className="mobile-under-performing-card"
                    scratchpadSource="under-performing"
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCard;