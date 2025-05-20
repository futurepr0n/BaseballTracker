import React, { useState, useEffect } from 'react';
import './LikelyToHitCard.css';
import { createSafeId, positionTooltip, setupTooltipCloseHandler } from '../../utils/tooltipUtils';

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

  // Close tooltips when date changes
  useEffect(() => {
    setActiveTooltip(null);
  }, [currentDate]);

  // Set up document-level click handler to close tooltips when clicking outside
  useEffect(() => {
    return setupTooltipCloseHandler(setActiveTooltip);
  }, []);

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
      <h3>Players Due for a Hit</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : hitStreakData.likelyToGetHit && hitStreakData.likelyToGetHit.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {hitStreakData.likelyToGetHit.slice(0, 10).map((player, index) => {
              const safeId = createSafeId(player.name, player.team);
              const tooltipId = `likely_hit_${safeId}`;
              
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
        <p className="no-data">No players currently predicted for hits</p>
      )}

      {/* Tooltips rendered outside card to avoid clipping - keep as is */}
      {activeTooltip && activeTooltip.startsWith('likely_hit_') && (
        <>
          {hitStreakData.likelyToGetHit.slice(0, 10).map((player) => {
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