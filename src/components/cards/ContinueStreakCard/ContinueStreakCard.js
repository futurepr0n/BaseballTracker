import React, { useEffect, useRef } from 'react';
import './ContinueStreakCard.css';
import { createSafeId } from '../../utils/tooltipUtils';
import { useTooltip } from '../../utils/TooltipContext';
import { useTeamFilter } from '../../TeamFilterContext';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import { initializeCollapsibleGlass } from '../../../utils/collapsibleGlass';
import '../../common/MobilePlayerCard.css';
import '../../../styles/CollapsibleGlass.css';

/**
 * ContinueStreakCard - Shows players who are likely to continue their hitting streaks
 * Enhanced with integrated team logos
 */
const ContinueStreakCard = ({ 
  hitStreakData,
  isLoading,
  currentDate,
  teams
}) => {
  const { openTooltip, closeTooltip } = useTooltip();
  const { shouldIncludePlayer } = useTeamFilter();
  const headerRef = useRef(null);
  const containerRef = useRef(null);

  // Close tooltips when date changes
  useEffect(() => {
    closeTooltip();
  }, [currentDate, closeTooltip]);

  // Initialize collapsible functionality
  useEffect(() => {
    if (headerRef.current && containerRef.current) {
      const cleanup = initializeCollapsibleGlass(
        headerRef.current, 
        containerRef.current,
        'continue-streak-card'
      );
      return cleanup;
    }
  }, []);

  const handleTooltipClick = (player, event) => {
    const safeId = createSafeId(player.name, player.team);
    const tooltipKey = `continue_streak_${safeId}`;
    
    event.stopPropagation();
    openTooltip(tooltipKey, event.currentTarget, {
      type: 'continue_streak',
      player: player
    });
  };
  
  
  return (
    <div className="card continue-streak-card">
      <div className="glass-card-container" ref={containerRef}>
        <div className="glass-header" ref={headerRef}>
          <h3>Streaks Likely to Continue</h3>
        </div>
        
        {/* Collapsible Content */}
        <div className="glass-content expanded">
        
        {/* Desktop View */}
        <div className="desktop-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : hitStreakData.likelyToContinueStreak && hitStreakData.likelyToContinueStreak.length > 0 ? (
            <div className="scrollable-container">
              <ul className="player-list">
              {hitStreakData.likelyToContinueStreak.filter(player => 
                shouldIncludePlayer(player.team, player.name)
              ).slice(0, 10).map((player, index) => {
              const safeId = createSafeId(player.name, player.team);
              const tooltipId = `continue_streak_${safeId}`;
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
                    {player.recentPerformance && (
                      <div className="recent-performance">
                        {player.recentPerformance.map((hit, idx) => (
                          <span 
                            key={idx} 
                            className={`performance-dot ${hit ? 'hit' : 'no-hit'}`}
                            title={hit ? 'Hit' : 'No Hit'}
                          ></span>
                        )).reverse()}
                      </div>
                    )}
                  </div>
                  <div 
                    className="player-stat tooltip-trigger"
                    data-tooltip-id={tooltipId}
                    onClick={(e) => handleTooltipClick(player, e)}
                  >
                    <div className="stat-highlight">{player.currentStreak} game streak</div>
                    <small>Continue: {(player.continuationProbability * 100).toFixed(1)}%</small>
                    <small>Best streak: {player.longestHitStreak} games</small>
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
            <p className="no-data">No notable streaks likely to continue</p>
          )}
        </div>

        {/* Mobile View */}
        <div className="mobile-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : hitStreakData.likelyToContinueStreak && hitStreakData.likelyToContinueStreak.length > 0 ? (
            <div className="mobile-cards">
              {hitStreakData.likelyToContinueStreak.filter(player => 
                shouldIncludePlayer(player.team, player.name)
              ).slice(0, 10).map((player, index) => {
                const continuationPercentage = (player.continuationProbability * 100).toFixed(1);
                
                const secondaryMetrics = [
                  { label: 'Current', value: `${player.currentStreak} games` },
                  { label: 'Best', value: `${player.longestHitStreak} games` }
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
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{player.longestHitStreak}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Best</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#2196F3'}}>{continuationPercentage}%</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Continue</div>
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
                            .sort(([a], [b]) => parseInt(b) - parseInt(a))
                            .slice(0, 5)
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
                            .filter(prog => prog.length <= Math.max(player.currentStreak + 2, 5))
                            .sort((a, b) => a.length - b.length)
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
                    showExpandButton={true}
                    primaryMetric={{
                      value: `${continuationPercentage}%`,
                      label: 'Continue Prob'
                    }}
                    secondaryMetrics={secondaryMetrics}
                    onCardClick={(item, idx, event) => {
                      handleTooltipClick(player, event);
                    }}
                    expandableContent={expandableContent}
                  />
                );
              })}
            </div>
          ) : (
            <p className="no-data">No notable streaks likely to continue</p>
          )}
        </div> {/* End mobile-view */}
        
        </div> {/* End collapsible content */}
      </div>
    </div>
  );
};

export default ContinueStreakCard;