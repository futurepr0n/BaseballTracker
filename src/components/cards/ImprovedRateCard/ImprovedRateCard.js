import React from 'react';
import './ImprovedRateCard.css';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import '../../common/MobilePlayerCard.css';

/**
 * ImprovedRateCard - Shows players with the most improved HR rate compared to historical
 * Enhanced with integrated team logos
 */
const ImprovedRateCard = ({ 
  improvedPlayers,
  isLoading,
  teams
}) => {
  return (
    <div className="card improved-rate-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>📈 Most Improved HR Rate</h3>
        </div>
        
        {/* Desktop View */}
        <div className="desktop-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : improvedPlayers && improvedPlayers.length > 0 ? (
            <div className="scrollable-container">
              <ul className="player-list">
                {improvedPlayers.map((player, index) => {
                  // Get team logo URL if teams data is available
                  const teamAbbr = player.team;
                  const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
                  const logoUrl = teamData ? teamData.logoUrl : null;
                  const teamColor = teamData ? teamData.primaryColor : "#10b981";
                  
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
                          backgroundColor: teamColor || '#10b981',
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
                            <div className="rank-overlay" style={{ backgroundColor: teamColor || '#10b981' }}></div>
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
                          +{((player.actualHRRate - player.historicalHRRate) * 100).toFixed(1)}%
                        </div>
                        <small>Current: {(player.actualHRRate * 100).toFixed(1)}%</small>
                        <small>Historical: {(player.historicalHRRate * 100).toFixed(1)}%</small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="no-data">No improved rate data available</div>
          )}
        </div>

        {/* Mobile View */}
        <div className="mobile-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : improvedPlayers && improvedPlayers.length > 0 ? (
            <div className="mobile-cards">
              {improvedPlayers.map((player, index) => {
                const improvement = ((player.actualHRRate - player.historicalHRRate) * 100).toFixed(1);
                const currentRate = (player.actualHRRate * 100).toFixed(1);
                const historicalRate = (player.historicalHRRate * 100).toFixed(1);
                
                const secondaryMetrics = [
                  { label: 'Current', value: `${currentRate}%` },
                  { label: 'Historical', value: `${historicalRate}%` }
                ];

                const expandableContent = (
                  <div className="mobile-improvement-details">
                    {/* Summary Metrics */}
                    <div className="mobile-metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px'}}>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#4CAF50'}}>+{improvement}%</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Improvement</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{currentRate}%</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Current</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#757575'}}>{historicalRate}%</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Historical</div>
                      </div>
                    </div>

                    {/* Improvement Analysis */}
                    <div className="mobile-improvement-analysis" style={{marginBottom: '16px'}}>
                      <strong>Performance Improvement:</strong>
                      <div style={{marginTop: '8px', fontSize: '12px', color: '#ccc'}}>
                        {parseFloat(improvement) >= 10 ? 
                          'Dramatic improvement - breakout power season' :
                        parseFloat(improvement) >= 5 ? 
                          'Significant improvement - enhanced power production' :
                        parseFloat(improvement) >= 2 ? 
                          'Notable improvement - developing power' :
                          'Moderate improvement - slight uptick in power'
                        }
                      </div>
                    </div>

                    {/* Rate Comparison */}
                    <div className="mobile-rate-comparison" style={{marginBottom: '16px'}}>
                      <strong>Rate Comparison:</strong>
                      <div style={{marginTop: '8px', fontSize: '11px'}}>
                        <div style={{
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 8px',
                          backgroundColor: 'rgba(76, 175, 80, 0.15)',
                          borderRadius: '4px',
                          margin: '2px 0',
                          border: '1px solid rgba(76, 175, 80, 0.3)'
                        }}>
                          <span>Current Season:</span>
                          <span style={{fontWeight: 'bold', color: '#4CAF50'}}>{currentRate}%</span>
                        </div>
                        <div style={{
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          margin: '2px 0'
                        }}>
                          <span>Historical Average:</span>
                          <span style={{fontWeight: 'bold', color: '#757575'}}>{historicalRate}%</span>
                        </div>
                        <div style={{
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 8px',
                          backgroundColor: 'rgba(255, 152, 0, 0.15)',
                          borderRadius: '4px',
                          margin: '2px 0',
                          border: '1px solid rgba(255, 152, 0, 0.3)'
                        }}>
                          <span>Improvement:</span>
                          <span style={{fontWeight: 'bold', color: '#FF9800'}}>+{improvement}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Context & Insight */}
                    <div className="mobile-improvement-context">
                      <strong>Power Development:</strong>
                      <div style={{marginTop: '8px', fontSize: '11px', color: '#ccc'}}>
                        {parseFloat(currentRate) >= 15 ? 
                          `Elite power numbers with ${improvement}% improvement over historical average` :
                        parseFloat(currentRate) >= 10 ? 
                          `Strong power production showing ${improvement}% growth` :
                        parseFloat(currentRate) >= 6 ? 
                          `Developing power with encouraging ${improvement}% increase` :
                          `Modest power improvement of ${improvement}% - watch for continued growth`
                        }
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
                      value: `+${improvement}%`,
                      label: 'Improvement'
                    }}
                    secondaryMetrics={secondaryMetrics}
                    expandableContent={expandableContent}
                  />
                );
              })}
            </div>
          ) : (
            <div className="no-data">No improved rate data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImprovedRateCard;