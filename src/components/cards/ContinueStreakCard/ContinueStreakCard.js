import React, { useState, useEffect } from 'react';
import './ContinueStreakCard.css';
import { createSafeId, positionTooltip, setupTooltipCloseHandler } from '../../utils/tooltipUtils';

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
    const tooltipKey = `continue_streak_${safeId}`;
    
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
    <div className="card continue-streak-card">
      <h3>Streaks Likely to Continue</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stats...</div>
      ) : hitStreakData.likelyToContinueStreak && hitStreakData.likelyToContinueStreak.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {hitStreakData.likelyToContinueStreak.slice(0, 10).map((player, index) => {
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
                    className="player-stat tooltip-container"
                    data-tooltip-id={tooltipId}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTooltip(player);
                    }}
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

      {/* Tooltips rendered outside card to avoid clipping - keep as is */}
      {activeTooltip && activeTooltip.startsWith('continue_streak_') && (
        <>
          {hitStreakData.likelyToContinueStreak.slice(0, 10).map((player) => {
            const safeId = createSafeId(player.name, player.team);
            const tooltipKey = `continue_streak_${safeId}`;
            
            if (activeTooltip === tooltipKey) {
              // Find the current streak in the progression data
              const currentStreakProgression = player.hitStreakProgression?.find(
                prog => prog.length === player.currentStreak
              );
              
              // Get comprehensive streak data
              // Group by streak length to show frequency
              const hitStreakFrequencies = {};
              if (player.hitStreakFrequency) {
                Object.entries(player.hitStreakFrequency).forEach(([length, count]) => {
                  hitStreakFrequencies[length] = count;
                });
              }
              
              return (
                <div 
                  key={tooltipKey} 
                  className={`streak-tooltip tooltip-${tooltipKey}`}
                >
                  <div className="tooltip-header">
                    <span>{player.name}'s Streak Continuation Analysis</span>
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
                        <span className="summary-label">Current Streak:</span>
                        <span className="summary-value">{player.currentStreak} games</span>
                      </div>
                      <div className="streak-summary-item">
                        <span className="summary-label">Continue Probability:</span>
                        <span className="summary-value highlight">{(player.continuationProbability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="streak-summary-item">
                        <span className="summary-label">Personal Best:</span>
                        <span className="summary-value">{player.longestHitStreak} games</span>
                      </div>
                    </div>
                    
                    {/* Hit Streak Occurrences */}
                    <div className="streak-progression-header">
                      <h4>Hit Streak Occurrences</h4>
                      <p className="streak-progression-explainer">
                        How often {player.name} has been on streaks of each length
                      </p>
                    </div>
                    
                    {Object.keys(hitStreakFrequencies).length > 0 ? (
                      <table className="streak-progression-table">
                        <thead>
                          <tr>
                            <th>Streak Length</th>
                            <th>Occurrences</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(hitStreakFrequencies)
                            .sort((a, b) => parseInt(b[0]) - parseInt(a[0])) // Sort by streak length descending
                            .map(([length, occurrences], idx) => (
                              <tr 
                                key={idx} 
                                className={parseInt(length) === player.currentStreak ? 'current-streak' : ''}
                              >
                                <td>{length} game{parseInt(length) !== 1 ? 's' : ''}</td>
                                <td>{occurrences} time{occurrences !== 1 ? 's' : ''}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="no-progression-data">No detailed streak data available</p>
                    )}
                    
                    {/* Streak continuation stats */}
                    {player.hitStreakProgression && player.hitStreakProgression.length > 0 && (
                      <>
                        <div className="streak-progression-header">
                          <h4>Streak Continuation Rates</h4>
                          <p className="streak-progression-explainer">
                            How often {player.name} extends streaks of each length
                          </p>
                        </div>
                        <table className="streak-progression-table">
                          <thead>
                            <tr>
                              <th>Starting Length</th>
                              <th>Extended</th>
                              <th>Ended</th>
                              <th>Extension Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {player.hitStreakProgression
                              .sort((a, b) => a.length - b.length)
                              .map((progression, idx) => (
                                <tr 
                                  key={idx} 
                                  className={progression.length === player.currentStreak ? 'current-streak' : ''}
                                >
                                  <td>{progression.length} game{progression.length !== 1 ? 's' : ''}</td>
                                  <td>{progression.continued}</td>
                                  <td>{progression.ended}</td>
                                  <td 
                                    className={progression.continuationRate > 0.8 ? 'high-rate' : 
                                              progression.continuationRate > 0.5 ? 'medium-rate' : 'low-rate'}
                                  >
                                    {(progression.continuationRate * 100).toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </>
                    )}
                    
                    {currentStreakProgression && (
                      <div className="current-streak-highlight">
                        <p>Based on historical data, when {player.name} has a {player.currentStreak}-game hitting streak, 
                        they continue the streak {(currentStreakProgression.continuationRate * 100).toFixed(1)}% of the time.</p>
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

export default ContinueStreakCard;