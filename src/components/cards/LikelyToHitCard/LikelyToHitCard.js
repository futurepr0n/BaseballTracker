import React, { useState, useEffect, useRef } from 'react';
import './LikelyToHitCard.css';
import { createSafeId, positionTooltip, setupTooltipCloseHandler } from '../../utils/tooltipUtils';
import { useTeamFilter } from '../../TeamFilterContext';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import SimpleDesktopScratchpadIcon from '../../common/SimpleDesktopScratchpadIcon';
import { getTeamLogoUrl } from '../../../utils/teamUtils';
import { initializeCollapsibleGlass } from '../../../utils/collapsibleGlass';
import '../../common/MobilePlayerCard.css';

/**
 * LikelyToHitCard - Shows players who are likely to get a hit in their next game
 * Enhanced with integrated team logos
 */
const LikelyToHitCard = ({ 
  hitStreakData,
  isLoading,
  currentDate,
  teams
}) => {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const { shouldIncludePlayer } = useTeamFilter();
  const headerRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize collapsible functionality
  useEffect(() => {
    if (headerRef.current && containerRef.current) {
      const cleanup = initializeCollapsibleGlass(
        headerRef.current, 
        containerRef.current,
        'likely-to-hit-card'
      );
      return cleanup;
    }
  }, []);

  // Close tooltips when date changes
  useEffect(() => {
    setActiveTooltip(null);
  }, [currentDate]);

  // Set up document-level click handler to close tooltips when clicking outside
  useEffect(() => {
    return setupTooltipCloseHandler(setActiveTooltip);
  }, []);

  // Filter players based on team and scratchpad filters
  const filteredPlayers = (hitStreakData.likelyToGetHit || []).filter(player => 
    shouldIncludePlayer(player.team, player.name)
  );

  const toggleTooltip = (player) => {
    const safeId = createSafeId(player.name, player.team);
    const tooltipKey = `likely_hit_${safeId}`;
    
    if (activeTooltip === tooltipKey) {
      setActiveTooltip(null);
    } else {
      setActiveTooltip(tooltipKey);
      
      // Position the tooltip
      positionTooltip(
        `.tooltip-${tooltipKey}`, 
        `[data-tooltip-id="${tooltipKey}"]`
      );
    }
  };

  return (
    <div className="card likely-to-hit-card">
      <div className="glass-card-container" ref={containerRef}>
        <div className="glass-header" ref={headerRef}>
          <h3>Players Due for a Hit</h3>
        </div>
        
        <div className="glass-content expanded">
          <div className="scrollable-container">
            {/* Desktop View */}
            <div className="desktop-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : filteredPlayers.length > 0 ? (
            <div className="scrollable-container">
            <ul className="player-list">
              {filteredPlayers.slice(0, 10).map((player, index) => {
                const safeId = createSafeId(player.name, player.team);
                const tooltipId = `likely_hit_${safeId}`;
                
                // Get team logo URL if teams data is available
                const teamAbbr = player.team;
                const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
                const logoUrl = teamData ? teamData.logoUrl : getTeamLogoUrl(player.team);
                const teamColor = teamData ? teamData.primaryColor : "#FF9800";
                
                return (
                  <li key={index} className="player-item likely-hit-item">
                    <SimpleDesktopScratchpadIcon player={player} />
                    
                    <div className="player-rank" style={{ backgroundColor: teamColor }}>
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
                    
                    <div 
                      className="player-stat tooltip-container"
                      data-tooltip-id={tooltipId}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTooltip(player);
                      }}
                    >
                      <div className="stat-highlight">{Math.abs(player.currentStreak)} games without hit</div>
                      <small>Next game hit: {(player.streakEndProbability * 100).toFixed(1)}%</small>
                      <small>Max drought: {player.longestNoHitStreak} games</small>
                    </div>
                    
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
              <p className="no-data">No players currently predicted for hits</p>
            )}
            </div>

            {/* Mobile View */}
            <div className="mobile-view">
          {isLoading ? (
            <div className="loading-indicator">Loading stats...</div>
          ) : filteredPlayers.length > 0 ? (
            <div className="mobile-cards">
              {filteredPlayers.slice(0, 10).map((player, index) => {
                const secondaryMetrics = [
                  { label: 'Hit Prob', value: `${(player.streakEndProbability * 100).toFixed(1)}%` },
                  { label: 'Max Drought', value: `${player.longestNoHitStreak} games` }
                ];

                const expandableContent = (
                  <div className="mobile-drought-details">
                    <div className="mobile-analysis">
                      <div className="analysis-item">
                        <strong>Hit Drought Analysis:</strong>
                        <div style={{marginTop: '4px', fontSize: '12px'}}>
                          <div>Current drought: {Math.abs(player.currentStreak)} games</div>
                          <div>Next game hit probability: {(player.streakEndProbability * 100).toFixed(1)}%</div>
                          <div>Longest career drought: {player.longestNoHitStreak} games</div>
                        </div>
                      </div>

                      {player.recentPerformance && (
                        <div className="analysis-item">
                          <strong>Recent Performance (Last 10 games):</strong>
                          <div className="mobile-performance-dots" style={{marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
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
                      value: Math.abs(player.currentStreak),
                      label: 'Games w/o Hit'
                    }}
                    secondaryMetrics={secondaryMetrics}
                    expandableContent={expandableContent}
                  />
                );
              })}
            </div>
            ) : (
              <p className="no-data">No players currently predicted for hits</p>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltips rendered outside card to avoid clipping - keep as is */}
      {activeTooltip && activeTooltip.startsWith('likely_hit_') && (
        <>
          {filteredPlayers.slice(0, 10).map((player) => {
            const safeId = createSafeId(player.name, player.team);
            const tooltipKey = `likely_hit_${safeId}`;
            
            if (activeTooltip === tooltipKey) {
              // Find the current streak in the progression data
              const currentStreakProgression = player.noHitStreakProgression?.find(
                prog => prog.length === Math.abs(player.currentStreak)
              );
              
              // Get comprehensive no-hit streak data
              const noHitStreakFrequencies = {};
              if (player.noHitStreakFrequency) {
                Object.entries(player.noHitStreakFrequency).forEach(([length, count]) => {
                  noHitStreakFrequencies[length] = count;
                });
              }
              
              return (
                <div 
                  key={tooltipKey} 
                  className={`streak-tooltip tooltip-${tooltipKey}`}
                >
                  <div className="tooltip-header">
                    <span>{player.name}'s Hit Drought Analysis</span>
                    <button 
                      className="close-tooltip" 
                      onClick={() => setActiveTooltip(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="streak-details">
                    <div className="streak-summary">
                      <div className="streak-summary-item">
                        <span className="summary-label">Current Drought:</span>
                        <span className="summary-value">{Math.abs(player.currentStreak)} games</span>
                      </div>
                      <div className="streak-summary-item">
                        <span className="summary-label">Hit Probability:</span>
                        <span className="summary-value highlight">{(player.streakEndProbability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="streak-summary-item">
                        <span className="summary-label">Longest Drought:</span>
                        <span className="summary-value">{player.longestNoHitStreak} games</span>
                      </div>
                    </div>
                    
                    {/* No-Hit Streak Occurrences */}
                    <div className="streak-progression-header">
                      <h4>Hit Drought Occurrences</h4>
                      <p className="streak-progression-explainer">
                        How often {player.name} has been in droughts of each length
                      </p>
                    </div>
                    
                    {Object.keys(noHitStreakFrequencies).length > 0 ? (
                      <table className="streak-progression-table">
                        <thead>
                          <tr>
                            <th>Drought Length</th>
                            <th>Occurrences</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(noHitStreakFrequencies)
                            .sort((a, b) => parseInt(b[0]) - parseInt(a[0])) // Sort by streak length descending
                            .map(([length, occurrences], idx) => (
                              <tr 
                                key={idx} 
                                className={parseInt(length) === Math.abs(player.currentStreak) ? 'current-streak' : ''}
                              >
                                <td>{length} game{parseInt(length) !== 1 ? 's' : ''}</td>
                                <td>{occurrences} time{occurrences !== 1 ? 's' : ''}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="no-progression-data">No detailed drought data available</p>
                    )}
                    
                    {/* Historical drought patterns */}
                    {player.noHitStreakProgression && player.noHitStreakProgression.length > 0 && (
                      <>
                        <div className="streak-progression-header">
                          <h4>Hit Probability After Droughts</h4>
                          <p className="streak-progression-explainer">
                            How often {player.name} gets a hit after each drought length
                          </p>
                        </div>
                        <table className="streak-progression-table">
                          <thead>
                            <tr>
                              <th>Drought Length</th>
                              <th>Total Times</th>
                              <th>Got Hit</th>
                              <th>Hit Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {player.noHitStreakProgression
                              .sort((a, b) => a.length - b.length)
                              .map((progression, idx) => (
                                <tr 
                                  key={idx} 
                                  className={progression.length === Math.abs(player.currentStreak) ? 'current-streak' : ''}
                                >
                                  <td>{progression.length} game{progression.length !== 1 ? 's' : ''}</td>
                                  <td>{progression.occurrences}</td>
                                  <td>{progression.ended}</td>
                                  <td 
                                    className={progression.nextGameHitRate > 0.6 ? 'high-rate' : 
                                              progression.nextGameHitRate > 0.3 ? 'medium-rate' : 'low-rate'}
                                  >
                                    {(progression.nextGameHitRate * 100).toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </>
                    )}
                    
                    {currentStreakProgression && (
                      <div className="current-streak-highlight">
                        <p>Based on historical data, when {player.name} has gone {Math.abs(player.currentStreak)} games without a hit, 
                        they got a hit in their next game {(currentStreakProgression.nextGameHitRate * 100).toFixed(1)}% of the time.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </>
      )}
    </div>
  );
};

export default LikelyToHitCard;