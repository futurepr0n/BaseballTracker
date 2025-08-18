import React, { useRef, useEffect } from 'react';
import './HRRateCard.css';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import '../../common/MobilePlayerCard.css';
import { initializeCollapsibleGlass } from '../../../utils/collapsibleGlass';

/**
 * HRRateCard - Displays players with the highest HR rate this season
 * Enhanced with integrated team logos
 */
const HRRateCard = ({ 
  topHRRatePlayers, 
  isLoading,
  teams
}) => {
  const headerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (headerRef.current && containerRef.current) {
      const cleanup = initializeCollapsibleGlass(
        headerRef.current, 
        containerRef.current,
        'hr-rate-card'
      );
      return cleanup;
    }
  }, []);
  return (
    <div className="card hr-rate-card">
      <div className="glass-card-container" ref={containerRef}>
        <div className="glass-header" ref={headerRef}>
          <h3>🚀 Top HR Rate This Season</h3>
        </div>
        
        <div className="glass-content expanded">
          <div className="scrollable-container">
            {/* Desktop View */}
            <div className="desktop-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : topHRRatePlayers.length > 0 ? (
            <div className="scrollable-container">
              <ul className="player-list">
                {topHRRatePlayers.map((player, index) => {
                  // Get team logo URL if teams data is available
                  const teamAbbr = player.team;
                  const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
                  const logoUrl = teamData ? teamData.logoUrl : null;
                  const teamColor = teamData ? teamData.primaryColor : "#f97316";
                  
                  return (
                    <li key={index} className="player-item">
                      {/* Team logo background */}
                      {teamData?.logoUrl && (
                        <img 
                          src={teamData.logoUrl} 
                          alt={teamData.name} 
                          className="team-logo-bg"
                        />
                      )}
                      
                      {/* Rank circle with team colors */}
                      <div 
                        className="player-rank" 
                        style={{ 
                          backgroundColor: teamColor || '#f97316',
                          color: 'white'
                        }}
                      >
                        {logoUrl && (
                          <>
                            <img 
                              src={logoUrl} 
                              alt="" 
                              className="rank-logo" 
                              loading="lazy"
                              aria-hidden="true"
                            />
                            <div className="rank-overlay" style={{ backgroundColor: teamColor || '#f97316' }}></div>
                          </>
                        )}
                        <span className="rank-number">{index + 1}</span>
                      </div>
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
                  );
                })}
              </ul>
            </div>
            ) : (
              <div className="no-data">No HR rate data available</div>
            )}
            </div>

            {/* Mobile View */}
            <div className="mobile-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : topHRRatePlayers.length > 0 ? (
            <div className="mobile-cards">
              {topHRRatePlayers.map((player, index) => {
                const hrRate = (player.homeRunsThisSeason / player.gamesPlayed).toFixed(3);
                const hrRateNumber = parseFloat(hrRate);
                
                const secondaryMetrics = [
                  { label: 'HR', value: player.homeRunsThisSeason },
                  { label: 'Games', value: player.gamesPlayed }
                ];

                const expandableContent = (
                  <div className="mobile-hr-details">
                    {/* Summary Metrics */}
                    <div className="mobile-metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px'}}>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF5722'}}>{player.homeRunsThisSeason}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Total HRs</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{player.gamesPlayed}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Games</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#4CAF50'}}>{hrRate}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>HR/Game</div>
                      </div>
                    </div>

                    {/* Performance Analysis */}
                    <div className="mobile-performance-analysis" style={{marginBottom: '16px'}}>
                      <strong>Power Analysis:</strong>
                      <div style={{marginTop: '8px', fontSize: '12px', color: '#ccc'}}>
                        {hrRateNumber >= 0.200 ? 
                          'Elite power production - among MLB leaders' :
                        hrRateNumber >= 0.150 ? 
                          'Excellent power hitter with consistent production' :
                        hrRateNumber >= 0.100 ? 
                          'Good power numbers with solid HR rate' :
                          'Moderate power production - watch for improvement'
                        }
                      </div>
                    </div>

                    {/* Season Context */}
                    <div className="mobile-season-context" style={{marginBottom: '16px'}}>
                      <strong>Season Stats:</strong>
                      <div style={{marginTop: '8px', fontSize: '11px'}}>
                        <div style={{
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          margin: '2px 0'
                        }}>
                          <span>Home Runs:</span>
                          <span style={{fontWeight: 'bold', color: '#FF5722'}}>{player.homeRunsThisSeason}</span>
                        </div>
                        <div style={{
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          margin: '2px 0'
                        }}>
                          <span>Games Played:</span>
                          <span style={{fontWeight: 'bold', color: '#FF9800'}}>{player.gamesPlayed}</span>
                        </div>
                        <div style={{
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          margin: '2px 0'
                        }}>
                          <span>HR Rate:</span>
                          <span style={{fontWeight: 'bold', color: '#4CAF50'}}>{hrRate} per game</span>
                        </div>
                      </div>
                    </div>

                    {/* Projection */}
                    <div className="mobile-projection">
                      <strong>162-Game Pace:</strong>
                      <div style={{marginTop: '8px', fontSize: '11px', color: '#ccc'}}>
                        At current rate: {Math.round(hrRateNumber * 162)} HRs over full season
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
                      value: hrRate,
                      label: 'HR/Game'
                    }}
                    secondaryMetrics={secondaryMetrics}
                    expandableContent={expandableContent}
                  />
                );
              })}
            </div>
            ) : (
              <div className="no-data">No HR rate data available</div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRRateCard;