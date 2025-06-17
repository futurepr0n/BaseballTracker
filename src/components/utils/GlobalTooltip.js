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
            <div className="recent-performance-info">
              <h4>📊 Recent Performance (Last 5 Games)</h4>
              <div className="performance-games">
                {(player.analysis.gameHistory || player.analysis.hotStreakAnalysis.gameHistory).slice(-5).reverse().map((game, idx) => {
                  const gameAvg = game.avg || (game.hits / Math.max(game.atBats, 1));
                  const isRestDay = game.restDay || game.restDays > 0;
                  const isPoor = gameAvg < 0.200;
                  const isExceptional = gameAvg >= 0.500 || game.hits >= 3;
                  
                  return (
                    <div key={idx} className={`performance-game ${isPoor ? 'poor-game' : ''} ${isExceptional ? 'exceptional-game' : ''}`}>
                      <span className="game-date">
                        {new Date(game.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className="game-stats">
                        {game.hits}/{game.atBats}
                      </span>
                      <span className="game-avg">
                        {(gameAvg * 100).toFixed(0)}%
                      </span>
                      {isRestDay && (
                        <span className="rest-indicator" title="Rest day before this game">💤</span>
                      )}
                      {isPoor && (
                        <span className="poor-indicator" title="Poor performance">📉</span>
                      )}
                      {isExceptional && (
                        <span className="exceptional-indicator" title="Peak performance">🔥</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="performance-legend">
                <small>💤 = Rest day | 📉 = Poor performance | 🔥 = Peak performance</small>
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
              <span className="summary-label">Positive Factors:</span>
              <span className="summary-value">{player.positiveFactors.length}</span>
            </div>
          </div>
          
          <div className="momentum-factors-breakdown">
            <h4>🚀 Positive Momentum Factors</h4>
            {player.positiveFactors.map((factor, idx) => (
              <div key={idx} className="momentum-factor">
                <div className="factor-header">
                  <span className="factor-type">{factor.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <span className="factor-points">+{Math.round(factor.positivePoints)} pts</span>
                </div>
                <div className="factor-description">{factor.description}</div>
                
                {factor.type === 'hot_streak_momentum' && (
                  <div className="factor-details">
                    <span>Historical Sample: {factor.sampleSize} occurrences</span>
                  </div>
                )}
                
                {factor.type === 'post_rest_excellence' && (
                  <div className="factor-details">
                    <span>Sample Size: {factor.sampleSize} games</span>
                  </div>
                )}
                
                {factor.type === 'bounce_back_potential' && (
                  <div className="factor-details">
                    <span>Overall Bounce-Back Rate: {(factor.bounceBackRate * 100).toFixed(1)}%</span>
                    {player.analysis?.lastPoorGame && (
                      <div className="poor-game-context">
                        <strong>Recent Poor Game:</strong> {new Date(player.analysis.lastPoorGame).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })} - Expecting bounce-back performance
                      </div>
                    )}
                    <span>Strong bounce-back rate: {(factor.strongBounceBackRate * 100).toFixed(1)}%</span>
                  </div>
                )}
                
                {factor.type === 'team_positive_momentum' && (
                  <div className="factor-details">
                    <span>Team Win Rate: {(factor.teamWinRate * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {(player.analysis?.gameHistory || player.analysis?.hotStreakAnalysis?.gameHistory) && (player.analysis?.gameHistory || player.analysis?.hotStreakAnalysis?.gameHistory).length > 0 && (
            <div className="recent-performance-info">
              <h4>📊 Recent Performance (Last 5 Games)</h4>
              <div className="performance-games">
                {(player.analysis.gameHistory || player.analysis.hotStreakAnalysis.gameHistory).slice(-5).reverse().map((game, idx) => {
                  const gameAvg = game.avg || (game.hits / Math.max(game.atBats, 1));
                  const isRestDay = game.restDay || game.restDays > 0;
                  const isPoor = gameAvg < 0.200;
                  const isExceptional = gameAvg >= 0.500 || game.hits >= 3;
                  
                  return (
                    <div key={idx} className={`performance-game ${isPoor ? 'poor-game' : ''} ${isExceptional ? 'exceptional-game' : ''}`}>
                      <span className="game-date">
                        {new Date(game.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className="game-stats">
                        {game.hits}/{game.atBats}
                      </span>
                      <span className="game-avg">
                        {(gameAvg * 100).toFixed(0)}%
                      </span>
                      {isRestDay && (
                        <span className="rest-indicator" title="Rest day before this game">💤</span>
                      )}
                      {isPoor && (
                        <span className="poor-indicator" title="Poor performance">📉</span>
                      )}
                      {isExceptional && (
                        <span className="exceptional-indicator" title="Peak performance">🔥</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="performance-legend">
                <small>💤 = Rest day | 📉 = Poor performance | 🔥 = Peak performance</small>
              </div>
            </div>
          )}

          {player.analysis?.hotStreakAnalysis?.currentStreak > 0 && (
            <div className="current-streak-info">
              <h4>🔥 Current Hot Streak</h4>
              <div className="streak-stats">
                <div className="streak-stat">
                  <span className="streak-label">Current Streak:</span>
                  <span className="streak-value">{player.analysis.hotStreakAnalysis.currentStreak} games</span>
                </div>
                <div className="streak-stat">
                  <span className="streak-label">Longest This Season:</span>
                  <span className="streak-value">{player.analysis.hotStreakAnalysis.longestStreak} games</span>
                </div>
              </div>
            </div>
          )}

          {player.analysis?.teamMomentumAnalysis?.hasPositiveMomentum && (
            <div className="team-momentum-info">
              <h4>📈 Team Momentum</h4>
              <div className="team-momentum-stats">
                <div className="momentum-stat">
                  <span className="momentum-label">Recent Record:</span>
                  <span className="momentum-value">
                    {player.analysis.teamMomentumAnalysis.recentWins}-{player.analysis.teamMomentumAnalysis.recentGames - player.analysis.teamMomentumAnalysis.recentWins}
                  </span>
                </div>
                <div className="momentum-stat">
                  <span className="momentum-label">Win Rate:</span>
                  <span className="momentum-value">{(player.analysis.teamMomentumAnalysis.winRate * 100).toFixed(1)}%</span>
                </div>
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