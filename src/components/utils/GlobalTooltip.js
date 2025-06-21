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

    const { type, player, ...data } = tooltipData;
    

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

    if (type === 'pitcher_hrs' && player) {
      return (
        <div className="pitcher-hr-details">
            <div className="pitcher-hr-summary">
              <div className="pitcher-hr-summary-item">
                <span className="summary-label">Total HRs Allowed:</span>
                <span className="summary-value">{player.totalHRsAllowed}</span>
              </div>
              <div className="pitcher-hr-summary-item">
                <span className="summary-label">HRs Per Game:</span>
                <span className="summary-value">{player.hrsPerGame}</span>
              </div>
              <div className="pitcher-hr-summary-item">
                <span className="summary-label">Games Played:</span>
                <span className="summary-value">{player.gamesPlayed}</span>
              </div>
              <div className="pitcher-hr-summary-item">
                <span className="summary-label">Most Vulnerable Against:</span>
                <span className="summary-value highlight">{player.mostVulnerableTeam} ({player.mostVulnerableTeamHRs} HRs)</span>
              </div>
            </div>
            
            <div className="pitcher-hr-breakdown">
              <h4>🏠 Home vs Away Breakdown</h4>
              <div className="home-away-stats">
                <div className="stat-group">
                  <span className="venue-label">At Home:</span>
                  <span className="venue-stats">
                    {player.homeHRsAllowed} HRs in {player.gamesAtHome} games
                    <span className="venue-rate">({player.homeHRRate}/game)</span>
                  </span>
                </div>
                <div className="stat-group">
                  <span className="venue-label">On Road:</span>
                  <span className="venue-stats">
                    {player.awayHRsAllowed} HRs in {player.gamesAway} games
                    <span className="venue-rate">({player.awayHRRate}/game)</span>
                  </span>
                </div>
              </div>
            </div>

            {player.opposingTeamsArray && player.opposingTeamsArray.length > 1 && (
              <div className="pitcher-hr-opponents">
                <h4>⚾ Performance vs All Teams</h4>
                <div className="opponents-grid">
                  {player.opposingTeamsArray.slice(0, 8).map(({ team, hrs }) => (
                    <div key={team} className="opponent-stat">
                      <span className="opponent-name">{team}</span>
                      <span className="opponent-count">{hrs} HR{hrs !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {player.gameLog && player.gameLog.length > 0 && (
              <div className="pitcher-hr-recent">
                <h4>📊 Recent Performance</h4>
                <div className="recent-games">
                  {player.gameLog.slice(-6).reverse().map((game, idx) => (
                    <div key={idx} className="game-entry">
                      <span className="game-date">
                        {new Date(game.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className="game-venue">{game.isHome ? 'vs' : '@'}</span>
                      <span className="game-opponent">{game.opposingTeam}</span>
                      <span className="game-hrs">
                        {game.hrsAllowed} HR{game.hrsAllowed !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
      );
    }

    if (type === 'pitcher_hits' && player) {
      return (
        <div className="pitcher-hr-details">
            <div className="pitcher-hr-summary">
              <div className="pitcher-hr-summary-item">
                <span className="summary-label">Total Hits Allowed:</span>
                <span className="summary-value">{player.totalHitsAllowed}</span>
              </div>
              <div className="pitcher-hr-summary-item">
                <span className="summary-label">Hits Per Game:</span>
                <span className="summary-value">{player.hitsPerGame}</span>
              </div>
              <div className="pitcher-hr-summary-item">
                <span className="summary-label">Games Played:</span>
                <span className="summary-value">{player.gamesPlayed}</span>
              </div>
              <div className="pitcher-hr-summary-item">
                <span className="summary-label">Most Vulnerable Against:</span>
                <span className="summary-value highlight">{player.mostVulnerableTeam} ({player.mostVulnerableTeamHits} Hits)</span>
              </div>
            </div>
            
            <div className="pitcher-hr-breakdown">
              <h4>🏠 Home vs Away Breakdown</h4>
              <div className="home-away-stats">
                <div className="stat-group">
                  <span className="venue-label">At Home:</span>
                  <span className="venue-stats">
                    {player.homeHitsAllowed} Hits in {player.gamesAtHome} games
                    <span className="venue-rate">({player.homeHitRate}/game)</span>
                  </span>
                </div>
                <div className="stat-group">
                  <span className="venue-label">On Road:</span>
                  <span className="venue-stats">
                    {player.awayHitsAllowed} Hits in {player.gamesAway} games
                    <span className="venue-rate">({player.awayHitRate}/game)</span>
                  </span>
                </div>
              </div>
            </div>

            {player.opposingTeamsArray && player.opposingTeamsArray.length > 1 && (
              <div className="pitcher-hr-opponents">
                <h4>⚾ Performance vs All Teams</h4>
                <div className="opponents-grid">
                  {player.opposingTeamsArray.slice(0, 8).map(({ team, hits }) => (
                    <div key={team} className="opponent-stat">
                      <span className="opponent-name">{team}</span>
                      <span className="opponent-count">{hits} Hit{hits !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {player.gameLog && player.gameLog.length > 0 && (
              <div className="pitcher-hr-recent">
                <h4>📊 Recent Performance</h4>
                <div className="recent-games">
                  {player.gameLog.slice(-6).reverse().map((game, idx) => (
                    <div key={idx} className="game-entry">
                      <span className="game-date">
                        {new Date(game.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className="game-venue">{game.isHome ? 'vs' : '@'}</span>
                      <span className="game-opponent">{game.opposingTeam}</span>
                      <span className="game-hrs">
                        {game.hitsAllowed} Hit{game.hitsAllowed !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
      );
    }

    if (type === 'poor_performance' && player) {
      return (
        <div className="poor-performance-details">
          <div className="risk-summary">
            <div className="risk-summary-item">
              <span className="summary-label">Risk Score:</span>
              <span className="summary-value highlight">{player.totalRiskScore} points</span>
            </div>
            <div className="risk-summary-item">
              <span className="summary-label">Risk Level:</span>
              <span className="summary-value">{player.riskLevel}</span>
            </div>
            <div className="risk-summary-item">
              <span className="summary-label">Risk Factors:</span>
              <span className="summary-value">{player.riskFactors.length}</span>
            </div>
          </div>
          
          <div className="risk-factors-breakdown">
            <h4>⚠️ Risk Factor Analysis</h4>
            {player.riskFactors.map((factor, idx) => (
              <div key={idx} className="risk-factor">
                <div className="factor-header">
                  <span className="factor-type">{factor.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <span className="factor-points">+{Math.round(factor.riskPoints)} pts</span>
                </div>
                <div className="factor-description">{factor.description}</div>
                
                {factor.type === 'player_specific_fatigue' && (
                  <div className="factor-details">
                    <span>Historical Sample: {factor.sampleSize} games</span>
                  </div>
                )}
                
                {factor.type === 'player_specific_post_peak' && (
                  <div className="factor-details">
                    <span>Historical Pattern: {factor.historicalPattern?.historicalPeakGames} peak games analyzed</span>
                    {player.analysis?.peakGame && (
                      <div className="peak-game-context">
                        <strong>Recent Peak Game:</strong> {new Date(player.analysis.peakGame.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })} - {player.analysis.peakGame.hits}/{player.analysis.peakGame.atBats} ({(player.analysis.peakGame.avg * 100).toFixed(0)}%)
                      </div>
                    )}
                    <span>Post-peak poor rate: {(factor.historicalPattern?.postPeakPoorRate * 100).toFixed(1)}%</span>
                  </div>
                )}
                
                {factor.type === 'player_specific_rest_struggle' && (
                  <div className="factor-details">
                    <span>Sample Size: {factor.sampleSize} games with this rest pattern</span>
                  </div>
                )}
                
                {factor.type === 'travel_related_fatigue' && (
                  <div className="factor-details">
                    <span>Travel Distance: {factor.travelDetails?.distance} miles</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {player.analysis?.gameHistory && player.analysis.gameHistory.length > 0 && (
            <div className="detailed-game-table">
              <h4>📊 Recent Game-by-Game Performance</h4>
              <div className="game-table-container">
                <table className="enhanced-game-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>AB</th>
                      <th>H</th>
                      <th>HR</th>
                      <th>RBI</th>
                      <th>K</th>
                      <th>AVG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.analysis.gameHistory.slice(-10).reverse().map((game, idx) => {
                      const gameAvg = game.avg || (game.hits / Math.max(game.atBats || game.abs || 1, 1));
                      const isRestDay = game.restDay || game.restDays > 0;
                      const isPoor = gameAvg < 0.200;
                      const isExceptional = gameAvg >= 0.500 || (game.hits || 0) >= 3;
                      const isMultiHit = (game.hits || 0) >= 2;
                      const isPowerGame = (game.hr || 0) >= 1;
                      
                      return (
                        <tr key={idx} className={`
                          ${isExceptional ? 'exceptional-game' : ''}
                          ${isPoor ? 'poor-game' : ''}
                          ${isMultiHit ? 'multi-hit-game' : ''}
                          ${isPowerGame ? 'power-game' : ''}
                        `}>
                          <td>
                            {new Date(game.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                            {isRestDay && <span className="rest-indicator" title="Rest day before this game"> 💤</span>}
                          </td>
                          <td>{game.atBats || game.abs || 0}</td>
                          <td className={(game.hits || 0) > 0 ? 'has-hit' : 'no-hit'}>{game.hits || 0}</td>
                          <td className={(game.hr || 0) > 0 ? 'has-hr' : ''}>{game.hr || 0}</td>
                          <td>{game.rbi || 0}</td>
                          <td className={(game.strikeouts || game.k || 0) > 0 ? 'has-strikeout' : ''}>{game.strikeouts || game.k || 0}</td>
                          <td className={`avg-${isPoor ? 'poor' : isExceptional ? 'exceptional' : 'average'}`}>
                            {(gameAvg * 100).toFixed(0)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="game-summary-totals">
                <strong>Last 10 Games:</strong> 
                {(() => {
                  const recentGames = player.analysis.gameHistory.slice(-10);
                  const totalHits = recentGames.reduce((sum, g) => sum + (g.hits || 0), 0);
                  const totalAB = recentGames.reduce((sum, g) => sum + (g.atBats || g.abs || 0), 0);
                  const totalHR = recentGames.reduce((sum, g) => sum + (g.hr || 0), 0);
                  const totalK = recentGames.reduce((sum, g) => sum + (g.strikeouts || g.k || 0), 0);
                  const avgCalc = totalAB > 0 ? (totalHits / totalAB) : 0;
                  return ` ${totalHits}/${totalAB} (.${(avgCalc * 1000).toFixed(0)}), ${totalHR} HR, ${totalK} K`;
                })()}
              </div>
            </div>
          )}

          {player.analysis?.consecutiveGames > 0 && (
            <div className="fatigue-info">
              <h4>😴 Fatigue Analysis</h4>
              <div className="fatigue-stats">
                <div className="fatigue-stat">
                  <span className="fatigue-label">Consecutive Games:</span>
                  <span className="fatigue-value">{player.analysis.consecutiveGames}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (type === 'positive_momentum' && player) {
      const tooltipData = player.tooltipData;
      const sophisticatedAnalysis = player.sophisticatedAnalysis;
      
      return (
        <div className="positive-momentum-details">
          <div className="momentum-summary">
            <div className="momentum-summary-item">
              <span className="summary-label">Momentum Score:</span>
              <span className="summary-value highlight">{player.totalPositiveScore} points</span>
            </div>
            <div className="momentum-summary-item">
              <span className="summary-label">Momentum Level:</span>
              <span className="summary-value">{player.momentumLevel}</span>
            </div>
            <div className="momentum-summary-item">
              <span className="summary-label">Season Average:</span>
              <span className="summary-value">{(player.seasonAvg * 100).toFixed(1)}%</span>
            </div>
            <div className="momentum-summary-item">
              <span className="summary-label">Current Streak:</span>
              <span className="summary-value">{player.currentStreak} games</span>
            </div>
          </div>
          
          <div className="momentum-factors-breakdown">
            <h4>🚀 Positive Momentum Factors ({player.positiveFactors.length})</h4>
            {player.positiveFactors.map((factor, idx) => (
              <div key={idx} className="momentum-factor">
                <div className="factor-header">
                  <span className="factor-type">{factor.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <span className="factor-points">+{Math.round(factor.positivePoints)} pts</span>
                </div>
                <div className="factor-description">{factor.description}</div>
                
                {/* Enhanced factor details from sophisticated analysis */}
                {factor.type === 'hot_streak' && factor.details && (
                  <div className="factor-details">
                    <span>Current Streak: {factor.details.current_streak} games</span>
                    <span>Longest Streak: {factor.details.longest_streak} games</span>
                    {factor.details.streak_patterns && Object.keys(factor.details.streak_patterns).length > 0 && (
                      <div className="streak-patterns">
                        <small>Continuation rates:</small>
                        {Object.entries(factor.details.streak_patterns).map(([length, pattern]) => (
                          <div key={length} className="pattern-item">
                            {length}-game: {(pattern.continuation_rate * 100).toFixed(1)}% 
                            ({pattern.total_occurrences} times)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {factor.type === 'post_rest_excellence' && factor.details && (
                  <div className="factor-details">
                    <span>Rest Days: {factor.details.rest_days}</span>
                    <span>Sample Size: {factor.details.sample_size} games</span>
                    {factor.details.performance_boost != null && !isNaN(factor.details.performance_boost) && (
                      <span>Performance Boost: +{(factor.details.performance_boost * 100).toFixed(1)}%</span>
                    )}
                    <span>Contextually Relevant: {factor.details.contextually_relevant ? 'Yes' : 'No'}</span>
                  </div>
                )}
                
                {factor.type === 'bounce_back' && factor.details && (
                  <div className="factor-details">
                    <span>Failed Attempts: {factor.details.current_situation.failed_bounce_back_attempts || 0}</span>
                    {factor.details.current_situation.failure_rate != null && !isNaN(factor.details.current_situation.failure_rate) && (
                      <span>Failure Rate: {(factor.details.current_situation.failure_rate * 100).toFixed(1)}%</span>
                    )}
                    {factor.details.current_situation.last_good_game && (
                      <span>Last Good Game: {factor.details.current_situation.last_good_game.date} 
                        ({factor.details.current_situation.last_good_game.hits}/{factor.details.current_situation.last_good_game.abs})
                      </span>
                    )}
                    {factor.details.warnings && factor.details.warnings.length > 0 && (
                      <div className="bounce-back-warnings">
                        {factor.details.warnings.map((warning, wIdx) => (
                          <div key={wIdx} className="warning-item">⚠️ {warning}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {factor.type === 'recent_form' && factor.details && (
                  <div className="factor-details">
                    <span>Recent Avg: {factor.details.recent_games && factor.details.recent_games.length > 0 ? 
                      (() => {
                        const totalHits = factor.details.recent_games.reduce((sum, g) => sum + (g.hits || 0), 0);
                        const totalAbs = factor.details.recent_games.reduce((sum, g) => sum + (g.abs || 0), 0);
                        return totalAbs > 0 ? ((totalHits / totalAbs) * 100).toFixed(1) : '0.0';
                      })() : 'N/A'}%
                    </span>
                    <span>Last 5 Games: {factor.details.recent_games ? 
                      factor.details.recent_games.reduce((sum, g) => sum + (g.hits || 0), 0) : 0}/
                      {factor.details.recent_games ? 
                      factor.details.recent_games.reduce((sum, g) => sum + (g.abs || 0), 0) : 0}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Enhanced Detailed Game Table */}
          {tooltipData?.detailedGameTable && tooltipData.detailedGameTable.length > 0 && (
            <div className="detailed-game-table">
              <h4>📊 Recent Game-by-Game Performance</h4>
              <div className="game-table-container">
                <table className="enhanced-game-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>AB</th>
                      <th>H</th>
                      <th>HR</th>
                      <th>RBI</th>
                      <th>K</th>
                      <th>AVG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tooltipData.detailedGameTable.map((game, idx) => (
                      <tr key={idx} className={`
                        ${game.performance_level === 'exceptional' ? 'exceptional-game' : ''}
                        ${game.performance_level === 'poor' ? 'poor-game' : ''}
                        ${game.is_multi_hit ? 'multi-hit-game' : ''}
                        ${game.is_power_game ? 'power-game' : ''}
                      `}>
                        <td>{game.date_display}</td>
                        <td>{game.abs}</td>
                        <td className={game.has_hit ? 'has-hit' : 'no-hit'}>{game.hits}</td>
                        <td className={game.hr > 0 ? 'has-hr' : ''}>{game.hr}</td>
                        <td>{game.rbi}</td>
                        <td className={game.strikeouts > 0 ? 'has-strikeout' : ''}>{game.strikeouts}</td>
                        <td className={`avg-${game.performance_level}`}>
                          {(game.avg * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {tooltipData.gameLogSummary && (
                <div className="game-summary-totals">
                  <strong>Totals:</strong> {tooltipData.gameLogSummary.totals.hits}/{tooltipData.gameLogSummary.totals.ab} 
                  (.{tooltipData.gameLogSummary.totals.avg}), {tooltipData.gameLogSummary.totals.hr} HR, 
                  {tooltipData.gameLogSummary.totals.strikeouts} K
                </div>
              )}
            </div>
          )}

          {/* Performance Indicators */}
          {tooltipData?.performanceIndicators && (
            <div className="performance-indicators">
              <h4>📈 Performance Indicators</h4>
              <div className="indicators-grid">
                <div className="indicator-item">
                  <span className="indicator-label">Multi-Hit Games:</span>
                  <span className="indicator-value">{tooltipData.performanceIndicators.multi_hit_games}</span>
                </div>
                <div className="indicator-item">
                  <span className="indicator-label">Power Games:</span>
                  <span className="indicator-value">{tooltipData.performanceIndicators.power_games}</span>
                </div>
                <div className="indicator-item">
                  <span className="indicator-label">Hitless Games:</span>
                  <span className="indicator-value">{tooltipData.performanceIndicators.hitless_games}</span>
                </div>
                <div className="indicator-item">
                  <span className="indicator-label">Strikeout Rate:</span>
                  <span className="indicator-value">{(tooltipData.performanceIndicators.strikeout_rate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Cross-Referenced Cards */}
          {tooltipData?.crossReferencedCards && tooltipData.crossReferencedCards.length > 0 && (
            <div className="cross-referenced-cards">
              <h4>🔗 Also Appears In</h4>
              <div className="cross-refs-list">
                {tooltipData.crossReferencedCards
                  .filter(card => card.appears_in)
                  .map((card, idx) => (
                    <div key={idx} className="cross-ref-item">
                      <span className="cross-ref-name">{card.card_name}</span>
                      <span className="cross-ref-type">({card.card_type})</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Weather Context */}
          {tooltipData?.weatherContext && tooltipData.weatherContext.available && (
            <div className="weather-context">
              <h4>🌤️ Weather Context</h4>
              <div className="weather-info">
                <span>{tooltipData.weatherContext.message}</span>
                {tooltipData.weatherContext.integration_note && (
                  <div className="weather-note">
                    <small>{tooltipData.weatherContext.integration_note}</small>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sophisticated Analysis Summary */}
          {sophisticatedAnalysis && (
            <div className="sophisticated-analysis-summary">
              <h4>🧠 Sophisticated Analysis</h4>
              <div className="analysis-highlights">
                {sophisticatedAnalysis.bounceBackAnalysis && sophisticatedAnalysis.bounceBackAnalysis.confidence != null && !isNaN(sophisticatedAnalysis.bounceBackAnalysis.confidence) && (
                  <div className="analysis-item">
                    <span className="analysis-label">Bounce Back Confidence:</span>
                    <span className="analysis-value">
                      {(sophisticatedAnalysis.bounceBackAnalysis.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {sophisticatedAnalysis.restExcellence && sophisticatedAnalysis.restExcellence.performance_boost != null && !isNaN(sophisticatedAnalysis.restExcellence.performance_boost) && (
                  <div className="analysis-item">
                    <span className="analysis-label">Rest Day Performance:</span>
                    <span className="analysis-value">
                      +{(sophisticatedAnalysis.restExcellence.performance_boost * 100).toFixed(1)}% boost
                    </span>
                  </div>
                )}
                {sophisticatedAnalysis.hotStreakDetails && (
                  <div className="analysis-item">
                    <span className="analysis-label">Streak Continuation:</span>
                    <span className="analysis-value">
                      {sophisticatedAnalysis.hotStreakDetails.continuation_probability != null && 
                       !isNaN(sophisticatedAnalysis.hotStreakDetails.continuation_probability) && 
                       sophisticatedAnalysis.hotStreakDetails.continuation_probability > 0 ? 
                        (sophisticatedAnalysis.hotStreakDetails.continuation_probability * 100).toFixed(1) + '%' : 
                        'Pattern-based analysis'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (type === 'pitcher_matchup' && tooltipData?.pitcher && tooltipData?.handType) {
      const { pitcher, handType } = tooltipData;
      const battersData = handType === 'same' ? pitcher.sameHandedBattersList : pitcher.oppositeHandedBattersList;
      const handTypeLabel = handType === 'same' ? 'Same-Handed' : 'Opposite-Handed';
      const percentage = Math.round((handType === 'same' ? pitcher.sameHandednessPercentage : pitcher.oppositeHandednessPercentage) * 100);
      
      
      return (
        <div className="tooltip-content">
          <div className="pitcher-matchup-details">
            <h4>{pitcher.name} ({pitcher.team}) vs {handTypeLabel} Batters</h4>
            
            <div className="matchup-summary">
              <div className="matchup-percentage">
                <span className="percentage-value">{percentage}%</span>
                <span className="percentage-label">{handTypeLabel} Batters</span>
              </div>
              <div className="pitcher-hand">
                <span>Pitcher Hand: {pitcher.pitchingHand || pitcher.hand}</span>
              </div>
            </div>

            {battersData && battersData.length > 0 ? (
              <div className="batters-list">
                <h5>Batters Faced ({battersData.length})</h5>
                <div className="batters-grid">
                  {battersData.map((batter, index) => (
                    <div key={index} className="batter-item">
                      <span className="batter-name">{batter.name}</span>
                      <span className="batter-team">({batter.team})</span>
                      <span className="batter-hand">
                        {batter.hand}{batter.isSwitch ? ' (Switch)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-batters">
                <p>No {handTypeLabel.toLowerCase()} batters available for this matchup</p>
              </div>
            )}

            <div className="matchup-context">
              <small>
                {battersData && battersData.length > 0 
                  ? `${battersData.length} ${handTypeLabel.toLowerCase()} batter${battersData.length !== 1 ? 's' : ''} from ${pitcher.opposingTeam}`
                  : `No ${handTypeLabel.toLowerCase()} batters in the ${pitcher.opposingTeam} lineup`
                }
              </small>
            </div>
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
      <div className="tooltip-content">
        {getTooltipContent()}
      </div>
    </div>
    </>
  );
};

export default GlobalTooltip;