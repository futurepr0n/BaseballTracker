import React, { useEffect } from 'react';
import './HitStreakCard.css';
import { createSafeId } from '../../utils/tooltipUtils';
import { useTooltip } from '../../utils/TooltipContext';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import '../../common/MobilePlayerCard.css';

/**
 * HitStreakCard - Shows players with active hit streaks
 * Enhanced with integrated team logos
 */
const HitStreakCard = ({ 
  hitStreakData,
  isLoading,
  currentDate,
  teams
}) => {
  const { openTooltip, closeTooltip } = useTooltip();

  // Close tooltips when date changes
  useEffect(() => {
    closeTooltip();
  }, [currentDate, closeTooltip]);

  const handleTooltipClick = (player, event) => {
    const safeId = createSafeId(player.name, player.team);
    const tooltipKey = `streak_hit_${safeId}`;
    
    event.stopPropagation();
    openTooltip(tooltipKey, event.currentTarget, {
      type: 'streak_hit',
      player: player
    });
  };

  return (
    <div className="card hit-streak-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>Current Hit Streaks</h3>
        </div>
        {/* Desktop View */}
        <div className="desktop-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : hitStreakData.hitStreaks && hitStreakData.hitStreaks.length > 0 ? (
            <div className="scrollable-container">
              <ul className="player-list">
                {hitStreakData.hitStreaks.slice(0, 10).map((player, index) => {
                  const safeId = createSafeId(player.name, player.team);
                  const tooltipId = `streak_hit_${safeId}`;
                  
                  // Get team logo URL if teams data is available
                  const teamAbbr = player.team;
                  const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
                  const logoUrl = teamData ? teamData.logoUrl : null;
                  
                  return (
                    <li key={index} className="player-item">
                    <div className="player-rank">
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
                      <span className="player-name">{player.name}</span>
                      <span className="player-team">{player.team}</span>
                      
                      {/* Recent performance indicator (last 10 games) */}
                      <div className="recent-performance">
                        {player.recentPerformance && player.recentPerformance.map((hit, idx) => (
                          <span 
                            key={idx} 
                            className={`performance-dot ${hit ? 'hit' : 'no-hit'}`}
                            title={hit ? 'Hit' : 'No Hit'}
                          ></span>
                        )).reverse()}
                      </div>
                    </div>
                    <div 
                      className="player-stat streak-stat tooltip-trigger"
                      data-tooltip-id={tooltipId}
                      onClick={(e) => handleTooltipClick(player, e)}
                    >
                      <div className="stat-highlight">{player.currentStreak} games</div>
                      <small>Avg streak: {player.avgHitStreakLength.toFixed(1)}</small>
                      <small>Continue: {(player.continuationProbability * 100).toFixed(1)}%</small>
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
          ) : (
            <p className="no-data">No active hitting streaks</p>
          )}
        </div>

        {/* Mobile View */}
        <div className="mobile-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : hitStreakData.hitStreaks && hitStreakData.hitStreaks.length > 0 ? (
            <div className="mobile-cards">
              {hitStreakData.hitStreaks.slice(0, 10).map((player, index) => {
                const safeId = createSafeId(player.name, player.team);
                const tooltipId = `streak_hit_${safeId}`;

                const secondaryMetrics = [
                  { label: 'Avg Streak', value: player.avgHitStreakLength.toFixed(1) },
                  { label: 'Continue', value: `${(player.continuationProbability * 100).toFixed(1)}%` }
                ];

                const expandableContent = (
                  <div className="mobile-streak-details">
                    {/* Summary Metrics */}
                    <div className="mobile-metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px'}}>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#4CAF50'}}>{player.currentStreak}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Current</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{player.longestHitStreak || 'N/A'}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Best</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#2196F3'}}>{player.avgHitStreakLength.toFixed(1)}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Avg</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#9C27B0'}}>{player.totalGames || 'N/A'}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Games</div>
                      </div>
                    </div>

                    {/* Recent Performance */}
                    {player.recentPerformance && (
                      <div className="mobile-performance" style={{marginBottom: '16px'}}>
                        <strong>Recent Performance (Last 10 games):</strong>
                        <div className="mobile-performance-dots" style={{marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center'}}>
                          {player.recentPerformance.slice().reverse().map((hit, idx) => (
                            <span 
                              key={idx} 
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: hit ? '#4CAF50' : '#F44336',
                                display: 'inline-block',
                                title: hit ? 'Hit' : 'No Hit'
                              }}
                            ></span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Streak Frequency Analysis */}
                    {player.hitStreakFrequency && Object.keys(player.hitStreakFrequency).length > 0 && (
                      <div className="mobile-streak-frequency" style={{marginBottom: '16px'}}>
                        <strong>Streak History:</strong>
                        <div style={{marginTop: '8px', fontSize: '11px'}}>
                          {Object.entries(player.hitStreakFrequency)
                            .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Sort by streak length descending
                            .slice(0, 5) // Show top 5 streak lengths
                            .map(([streakLength, count]) => {
                              const isCurrentStreak = parseInt(streakLength) === player.currentStreak;
                              return (
                                <div 
                                  key={streakLength} 
                                  style={{
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    padding: '4px 8px',
                                    backgroundColor: isCurrentStreak ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '4px',
                                    margin: '2px 0',
                                    border: isCurrentStreak ? '1px solid #4CAF50' : '1px solid transparent'
                                  }}
                                >
                                  <span>{streakLength} game streak{parseInt(streakLength) > 1 ? 's' : ''}:</span>
                                  <span style={{fontWeight: 'bold'}}>{count}x</span>
                                </div>
                              );
                            })
                          }
                        </div>
                      </div>
                    )}

                    {/* Continuation Probability */}
                    {player.hitStreakProgression && player.hitStreakProgression.length > 0 && (
                      <div className="mobile-continuation-rates">
                        <strong>Continuation Rates:</strong>
                        <div style={{marginTop: '8px', fontSize: '11px'}}>
                          {player.hitStreakProgression
                            .filter(prog => prog.length <= Math.max(player.currentStreak + 2, 5)) // Show current +2 or at least 5
                            .sort((a, b) => a.length - b.length) // Sort by streak length ascending like desktop
                            .map((prog, idx) => {
                              const isCurrentStreak = prog.length === player.currentStreak;
                              const rate = (prog.continuationRate * 100);
                              const rateColor = rate > 80 ? '#4CAF50' : rate > 50 ? '#FF9800' : '#F44336';
                              
                              return (
                                <div 
                                  key={idx}
                                  style={{
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    padding: '4px 8px',
                                    backgroundColor: isCurrentStreak ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '4px',
                                    margin: '2px 0',
                                    border: isCurrentStreak ? '1px solid #4CAF50' : '1px solid transparent'
                                  }}
                                >
                                  <span>{prog.length} game{prog.length !== 1 ? 's' : ''}:</span>
                                  <span style={{fontWeight: 'bold', color: rateColor}}>
                                    {rate.toFixed(1)}%
                                  </span>
                                </div>
                              );
                            })
                          }
                        </div>
                      </div>
                    )}
                  </div>
                );

                return (
                  <MobilePlayerCard
                    key={index}
                    item={{
                      name: player.name,
                      team: player.team
                    }}
                    index={index}
                    showRank={true}
                    showExpandButton={!!player.recentPerformance}
                    primaryMetric={{
                      value: player.currentStreak,
                      label: 'Games'
                    }}
                    secondaryMetrics={secondaryMetrics}
                    onCardClick={(item, idx, event) => {
                      if (!player.recentPerformance) {
                        handleTooltipClick(player, event);
                      }
                    }}
                    expandableContent={expandableContent}
                  />
                );
              })}
            </div>
          ) : (
            <p className="no-data">No active hitting streaks</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HitStreakCard;