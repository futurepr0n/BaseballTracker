/**
 * Global Tooltip Component
 * Renders a single tooltip at the document body level with proper z-index
 */
import React, { useEffect, useRef } from 'react';
import { useTooltip } from './TooltipContext';
import './GlobalTooltip.css';

const GlobalTooltip = () => {
  const { activeTooltip, tooltipPosition, tooltipData, closeTooltip } = useTooltip();
  const tooltipRef = useRef(null);

  // Position tooltip when it opens
  useEffect(() => {
    if (activeTooltip && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth <= 768;

      if (isMobile) {
        // Mobile: Center the tooltip
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
      } else {
        // Desktop: Center horizontally, position vertically with some offset from trigger
        const centerX = viewportWidth / 2;
        const { y } = tooltipPosition;
        
        // Center horizontally
        let x = centerX - (rect.width / 2);
        
        // Ensure tooltip doesn't go off screen horizontally
        if (x < 20) {
          x = 20;
        } else if (x + rect.width > viewportWidth - 20) {
          x = viewportWidth - rect.width - 20;
        }

        // Vertical positioning: try to keep some relation to trigger, but center if needed
        let finalY = y;
        
        // If tooltip would go off bottom, position it higher
        if (finalY + rect.height > viewportHeight - 20) {
          finalY = viewportHeight - rect.height - 20;
        }
        
        // If still too high, center vertically
        if (finalY < 20) {
          finalY = (viewportHeight / 2) - (rect.height / 2);
        }
        
        // Ensure final Y position is within bounds
        finalY = Math.max(20, Math.min(finalY, viewportHeight - rect.height - 20));

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${finalY}px`;
        tooltip.style.transform = 'none';
      }
    }
  }, [activeTooltip, tooltipPosition]);

  // Determine tooltip content based on activeTooltip ID and data
  const getTooltipContent = () => {
    if (!activeTooltip || !tooltipData) return null;

    const { type, player } = tooltipData;

    if (type === 'streak_hit' && player) {
      // Get comprehensive streak data
      const hitStreakFrequencies = {};
      if (player.hitStreakFrequency) {
        Object.entries(player.hitStreakFrequency).forEach(([length, count]) => {
          hitStreakFrequencies[length] = count;
        });
      }

      return (
        <div className="tooltip-content">
          <div className="streak-details">
            <div className="streak-summary">
              <div className="streak-summary-item">
                <span className="summary-label">Current Streak:</span>
                <span className="summary-value">{player.currentStreak} games</span>
              </div>
              <div className="streak-summary-item">
                <span className="summary-label">Personal Best:</span>
                <span className="summary-value">{player.longestHitStreak} games</span>
              </div>
              <div className="streak-summary-item">
                <span className="summary-label">Total Games:</span>
                <span className="summary-value">{player.totalGames}</span>
              </div>
            </div>
            
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
            
            {/* Show continuation probability based on streak length */}
            {player.hitStreakProgression && player.hitStreakProgression.length > 0 && (
              <>
                <div className="streak-progression-header">
                  <h4>Streak Continuation Rates</h4>
                  <p className="streak-progression-explainer">
                    Probability of continuing each streak length
                  </p>
                </div>
                <table className="streak-progression-table">
                  <thead>
                    <tr>
                      <th>Streak Length</th>
                      <th>Continue %</th>
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
          </div>
        </div>
      );
    }

    if (type === 'day_hit' && player) {
      const { dayOfWeek } = tooltipData;
      
      return (
        <div className="tooltip-content">
          <div className="day-hit-details">
            <div className="day-hit-summary">
              <div className="day-hit-summary-item">
                <span className="summary-label">Total Hits:</span>
                <span className="summary-value">{player.hits}</span>
              </div>
              <div className="day-hit-summary-item">
                <span className="summary-label">Games Played:</span>
                <span className="summary-value">{player.games}</span>
              </div>
              <div className="day-hit-summary-item">
                <span className="summary-label">Hit Rate:</span>
                <span className="summary-value highlight">{(player.hitRate * 100).toFixed(1)}%</span>
              </div>
            </div>
            
            {player.dates && player.dates.length > 0 ? (
              <div className="day-hit-games">
                <h4>Recent {dayOfWeek} Games with Hits</h4>
                <ul className="day-hit-date-list">
                  {player.dates.slice(0, 5).map((date, idx) => (
                    <li key={idx} className="day-hit-date-item">
                      {new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </li>
                  ))}
                </ul>
                {player.dates.length > 5 && (
                  <p className="day-hit-more-dates">
                    +{player.dates.length - 5} more dates
                  </p>
                )}
              </div>
            ) : (
              <p className="no-date-data">No date information available</p>
            )}
          </div>
        </div>
      );
    }

    if (type === 'continue_streak' && player) {
      // Find the current streak in the progression data
      const currentStreakProgression = player.hitStreakProgression?.find(
        prog => prog.length === player.currentStreak
      );
      
      // Get comprehensive streak data
      const hitStreakFrequencies = {};
      if (player.hitStreakFrequency) {
        Object.entries(player.hitStreakFrequency).forEach(([length, count]) => {
          hitStreakFrequencies[length] = count;
        });
      }

      return (
        <div className="tooltip-content">
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
                <span className="summary-label">Best Streak:</span>
                <span className="summary-value">{player.longestHitStreak} games</span>
              </div>
              <div className="streak-summary-item">
                <span className="summary-label">Total Games:</span>
                <span className="summary-value">{player.totalGames}</span>
              </div>
              {currentStreakProgression && (
                <div className="streak-summary-item">
                  <span className="summary-label">Historical Rate for {player.currentStreak}-game streaks:</span>
                  <span className="summary-value">{(currentStreakProgression.continuationRate * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
            
            <div className="streak-progression-header">
              <h4>Streak Length Distribution</h4>
              <p className="streak-progression-explainer">
                Historical frequency of different streak lengths for {player.name}
              </p>
            </div>
            
            {Object.keys(hitStreakFrequencies).length > 0 ? (
              <table className="streak-progression-table">
                <thead>
                  <tr>
                    <th>Streak Length</th>
                    <th>Times Achieved</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(hitStreakFrequencies)
                    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
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
              <p className="no-progression-data">No detailed streak frequency data available</p>
            )}
            
            {player.hitStreakProgression && player.hitStreakProgression.length > 0 && (
              <>
                <div className="streak-progression-header">
                  <h4>Continuation Probabilities by Streak Length</h4>
                  <p className="streak-progression-explainer">
                    Historical likelihood of continuing streaks of each length
                  </p>
                </div>
                <table className="streak-progression-table">
                  <thead>
                    <tr>
                      <th>Streak Length</th>
                      <th>Continue %</th>
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
          </div>
        </div>
      );
    }

    // Default content
    return (
      <div className="tooltip-content">
        <h4>Player Details</h4>
        <p>Additional player information and statistics.</p>
      </div>
    );
  };

  if (!activeTooltip) {
    return null;
  }

  const isMobile = window.innerWidth <= 768;

  return (
    <>
      {/* Backdrop for better visual separation */}
      <div 
        className={`tooltip-backdrop ${isMobile ? 'mobile-backdrop' : 'desktop-backdrop'}`}
        onClick={closeTooltip}
      />
      <div
        ref={tooltipRef}
        className="global-tooltip"
        data-tooltip-id={activeTooltip}
      >
      <div className="tooltip-header">
        <span className="tooltip-title">
          {tooltipData?.player?.name ? `${tooltipData.player.name}'s Statistics` : 'Player Details'}
        </span>
        <button 
          className="close-tooltip" 
          onClick={closeTooltip}
          aria-label="Close tooltip"
        >
          ✕
        </button>
      </div>
      {getTooltipContent()}
    </div>
    </>
  );
};

export default GlobalTooltip;