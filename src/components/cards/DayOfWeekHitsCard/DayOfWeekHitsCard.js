import React, { useEffect } from 'react';
import './DayOfWeekHitsCard.css';
import { createSafeId } from '../../utils/tooltipUtils';
import { useTooltip } from '../../utils/TooltipContext';
import { useTeamFilter } from '../../TeamFilterContext';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import '../../common/MobilePlayerCard.css';

/**
 * DayOfWeekHitsCard - Shows players who perform best on specific days of the week
 * Enhanced with integrated team logos
 */
const DayOfWeekHitsCard = ({ 
  dayOfWeekHits,
  isLoading,
  currentDate,
  teams
}) => {
  const { openTooltip, closeTooltip } = useTooltip();
  const { shouldIncludePlayer } = useTeamFilter();

  // Close tooltips when date changes
  useEffect(() => {
    closeTooltip();
  }, [currentDate, closeTooltip]);

  const handleTooltipClick = (player, event) => {
    const safeId = createSafeId(player.name, player.team);
    const tooltipKey = `day_hit_${safeId}`;
    
    event.stopPropagation();
    openTooltip(tooltipKey, event.currentTarget, {
      type: 'day_hit',
      player: player,
      dayOfWeek: dayOfWeekHits.dayOfWeek
    });
  };

  return (
    <div className="card day-of-week-hits-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>{dayOfWeekHits.dayOfWeek} Hit Leaders</h3>
        </div>
        
        {/* Desktop View */}
        <div className="desktop-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : dayOfWeekHits.topHitsByTotal && dayOfWeekHits.topHitsByTotal.length > 0 ? (
            <div className="scrollable-container">
            <ul className="player-list">
              {dayOfWeekHits.topHitsByTotal.filter(player => 
                shouldIncludePlayer(player.team, player.name)
              ).slice(0, 10).map((player, index) => {
                const safeId = createSafeId(player.name, player.team);
                const tooltipId = `day_hit_${safeId}`;
                
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
                    </div>
                    <div 
                      className="player-stat tooltip-trigger"
                      data-tooltip-id={tooltipId}
                      onClick={(e) => handleTooltipClick(player, e)}
                    >
                      <div className="stat-highlight">{player.hits} hits</div>
                      <small>in {player.games} {dayOfWeekHits.dayOfWeek}s</small>
                      <small>({(player.hitRate * 100).toFixed(1)}%)</small>
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
            <p className="no-data">No {dayOfWeekHits.dayOfWeek} hit data available</p>
          )}
        </div>

        {/* Mobile View */}
        <div className="mobile-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : dayOfWeekHits.topHitsByTotal && dayOfWeekHits.topHitsByTotal.length > 0 ? (
            <div className="mobile-cards">
              {dayOfWeekHits.topHitsByTotal.filter(player => 
                shouldIncludePlayer(player.team, player.name)
              ).slice(0, 10).map((player, index) => {
                const hitRatePercentage = (player.hitRate * 100).toFixed(1);
                
                const secondaryMetrics = [
                  { label: 'Games', value: player.games },
                  { label: 'Hit Rate', value: `${hitRatePercentage}%` }
                ];

                const expandableContent = (
                  <div className="mobile-day-details">
                    {/* Summary Metrics */}
                    <div className="mobile-metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px'}}>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#4CAF50'}}>{player.hits}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Total Hits</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{player.games}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Games</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#2196F3'}}>{hitRatePercentage}%</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Hit Rate</div>
                      </div>
                    </div>

                    {/* Day Context */}
                    <div className="mobile-day-context" style={{marginBottom: '16px', textAlign: 'center'}}>
                      <strong>Performance on {dayOfWeekHits.dayOfWeek}s:</strong>
                      <div style={{marginTop: '8px', fontSize: '12px', color: '#ccc'}}>
                        {player.hits} hits in {player.games} {dayOfWeekHits.dayOfWeek} games this season
                      </div>
                    </div>

                    {/* Recent Day Games */}
                    {player.dates && player.dates.length > 0 && (
                      <div className="mobile-recent-games" style={{marginBottom: '16px'}}>
                        <strong>Recent {dayOfWeekHits.dayOfWeek} Games:</strong>
                        <div style={{marginTop: '8px', fontSize: '11px'}}>
                          {player.dates.slice(0, 5).map((date, idx) => {
                            const gameDate = new Date(date);
                            return (
                              <div 
                                key={idx} 
                                style={{
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  padding: '4px 8px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  borderRadius: '4px',
                                  margin: '2px 0'
                                }}
                              >
                                <span>{gameDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}</span>
                                <span style={{color: '#4CAF50'}}>Hit</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Performance Analysis */}
                    <div className="mobile-performance-analysis">
                      <strong>Day-of-Week Analysis:</strong>
                      <div style={{marginTop: '8px', fontSize: '11px', color: '#ccc'}}>
                        {player.hitRate >= 0.5 ? 
                          `Excellent ${dayOfWeekHits.dayOfWeek} performer with strong consistency` :
                        player.hitRate >= 0.3 ? 
                          `Good ${dayOfWeekHits.dayOfWeek} performance with reliable production` :
                          `Moderate ${dayOfWeekHits.dayOfWeek} performance - watch for trends`
                        }
                      </div>
                    </div>
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
                      value: player.hits,
                      label: `${dayOfWeekHits.dayOfWeek} Hits`
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
            <p className="no-data">No {dayOfWeekHits.dayOfWeek} hit data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayOfWeekHitsCard;