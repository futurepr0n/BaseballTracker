/**
 * Global Tooltip Component
 * Renders a single tooltip at the document body level with proper z-index
 */
import React, { useEffect, useRef } from 'react';
import { useTooltip } from './TooltipContext';
import { useTheme } from '../../contexts/ThemeContext';
import './GlobalTooltip.css';

const GlobalTooltip = () => {
  const { activeTooltip, tooltipPosition, tooltipData, closeTooltip } = useTooltip();
  const { themeMode } = useTheme();
  const tooltipRef = useRef(null);

  // Deduplicate game data by date, keeping the most complete entry
  const deduplicateGameData = (gameData) => {
    if (!gameData || !Array.isArray(gameData)) return [];
    
    const dateMap = new Map();
    
    gameData.forEach(game => {
      const date = game.date_display || game.date;
      if (!date) return;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, game);
      } else {
        // Keep the entry with more complete data (more non-zero stats)
        const existing = dateMap.get(date);
        const existingScore = (existing.hits || 0) + (existing.hr || 0) + (existing.rbi || 0) + (existing.abs || 0);
        const newScore = (game.hits || 0) + (game.hr || 0) + (game.rbi || 0) + (game.abs || 0);
        
        // If new entry has more complete data, or if equal completeness but newer timestamp, replace
        if (newScore > existingScore || 
            (newScore === existingScore && (game.timestamp || 0) > (existing.timestamp || 0))) {
          dateMap.set(date, game);
          console.warn(`Duplicate date ${date} detected - kept more complete entry`);
        } else {
          console.warn(`Duplicate date ${date} detected - kept existing entry`);
        }
      }
    });
    
    // Sort by date descending (most recent first)
    return Array.from(dateMap.values()).sort((a, b) => {
      const dateA = new Date(a.date_display || a.date);
      const dateB = new Date(b.date_display || b.date);
      return dateB - dateA;
    });
  };

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
    
    console.log('🔧 GlobalTooltip getTooltipContent:', { 
      activeTooltip, 
      type, 
      playerName: player?.playerName || player?.name,
      hasPlayer: !!player,
      tooltipData 
    });
    

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
                            {(() => {
                              // Parse date safely to avoid timezone issues
                              const [year, month, day] = game.date.split('-');
                              const gameDate = new Date(year, month - 1, day); // month is 0-indexed
                              return gameDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              });
                            })()}
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

    if (type === 'hr_prediction' && player) {
      // Handle both old API format and HR predictions format
      const hrScore = player.hr_score || player.hrScore || player.dueScore;
      const hrProbability = player.hr_probability || player.hrProbability || (player.hrRate ? (player.hrRate * 100).toFixed(1) : null);
      const recentForm = player.recent_form_description || player.recentForm || (player.isDue ? 'Due for HR' : 'Standard');
      
      return (
        <div className="hr-prediction-details">
          <div className="hr-summary">
            <div className="hr-summary-item">
              <span className="summary-label">HR Score:</span>
              <span className="summary-value highlight">{hrScore ? Number(hrScore).toFixed(1) : 'N/A'}</span>
            </div>
            <div className="hr-summary-item">
              <span className="summary-label">HR Rate:</span>
              <span className="summary-value">{hrProbability || 'N/A'}{hrProbability ? '%' : ''}</span>
            </div>
            <div className="hr-summary-item">
              <span className="summary-label">Status:</span>
              <span className="summary-value">{recentForm}</span>
            </div>
            {player.gamesSinceLastHR && (
              <div className="hr-summary-item">
                <span className="summary-label">Games Since HR:</span>
                <span className="summary-value highlight">{player.gamesSinceLastHR}</span>
              </div>
            )}
          </div>
          
          <div className="hr-factors">
            <h4>⚡ HR Prediction Analysis</h4>
            {player.hr_factors?.map((factor, idx) => (
              <div key={idx} className="hr-factor">
                <div className="factor-description">{factor.description || factor}</div>
              </div>
            )) || (
              <div className="hr-analysis">
                {player.expectedGamesBetweenHRs && (
                  <div className="hr-factor">
                    <div className="factor-description">Expected games between HRs: {player.expectedGamesBetweenHRs}</div>
                  </div>
                )}
                {player.daysSinceLastHR && (
                  <div className="hr-factor">
                    <div className="factor-description">Days since last HR: {player.daysSinceLastHR} days</div>
                  </div>
                )}
                {player.lastHRDate && (
                  <div className="hr-factor">
                    <div className="factor-description">Last HR: {new Date(player.lastHRDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                )}
                {player.isDue && (
                  <div className="hr-factor">
                    <div className="factor-description">✅ Player is statistically due for a home run</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hr-season-stats">
            <h4>📊 Season Statistics</h4>
            <div className="season-stats-grid">
              {player.homeRunsThisSeason && (
                <div className="stat-item">
                  <span className="stat-label">Season HRs:</span>
                  <span className="stat-value">{player.homeRunsThisSeason}</span>
                </div>
              )}
              {player.gamesPlayed && (
                <div className="stat-item">
                  <span className="stat-label">Games Played:</span>
                  <span className="stat-value">{player.gamesPlayed}</span>
                </div>
              )}
              {player.hrRate && (
                <div className="stat-item">
                  <span className="stat-label">HR/Game Rate:</span>
                  <span className="stat-value">{player.hrRate.toFixed(3)}</span>
                </div>
              )}
            </div>
          </div>

          {player.venue_factor && (
            <div className="venue-context">
              <h4>🏟️ Venue Context</h4>
              <div className="venue-info">
                <span>Park Factor: {player.venue_factor}</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (type === 'likely_hit' && player) {
      return (
        <div className="likely-hit-details">
          <div className="hit-summary">
            <div className="hit-summary-item">
              <span className="summary-label">Hit Probability:</span>
              <span className="summary-value highlight">{player.hit_probability || player.hitProbability || 'N/A'}%</span>
            </div>
            <div className="hit-summary-item">
              <span className="summary-label">Season Average:</span>
              <span className="summary-value">{player.season_avg ? (player.season_avg * 100).toFixed(1) : 'N/A'}%</span>
            </div>
            <div className="hit-summary-item">
              <span className="summary-label">Recent Form:</span>
              <span className="summary-value">{player.recent_form || 'Good'}</span>
            </div>
          </div>
          
          <div className="hit-factors">
            <h4>📈 Hit Likelihood Factors</h4>
            {player.hit_factors?.map((factor, idx) => (
              <div key={idx} className="hit-factor">
                <div className="factor-description">{factor.description || factor}</div>
              </div>
            )) || (
              <div className="hit-factor">
                <div className="factor-description">High hit probability based on recent analysis</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === 'multi_hit' && player) {
      return (
        <div className="multi-hit-details">
          <div className="multi-hit-summary">
            <div className="multi-hit-summary-item">
              <span className="summary-label">Multi-Hit Rate:</span>
              <span className="summary-value highlight">{player.multi_hit_rate || player.multiHitRate || 'N/A'}%</span>
            </div>
            <div className="multi-hit-summary-item">
              <span className="summary-label">Multi-Hit Games:</span>
              <span className="summary-value">{player.multi_hit_games || player.multiHitGames || 'N/A'}</span>
            </div>
            <div className="multi-hit-summary-item">
              <span className="summary-label">Last Multi-Hit:</span>
              <span className="summary-value">{player.last_multi_hit_date || player.lastMultiHitDate || 'Unknown'}</span>
            </div>
          </div>
          
          <div className="multi-hit-factors">
            <h4>🎯 Multi-Hit Factors</h4>
            {player.multi_hit_factors?.map((factor, idx) => (
              <div key={idx} className="multi-hit-factor">
                <div className="factor-description">{factor.description || factor}</div>
              </div>
            )) || (
              <div className="multi-hit-factor">
                <div className="factor-description">Strong multi-hit candidate based on recent patterns</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === 'time_slot' && player) {
      return (
        <div className="time-slot-details">
          <div className="time-slot-summary">
            <div className="time-slot-summary-item">
              <span className="summary-label">Day of Week:</span>
              <span className="summary-value highlight">{player.dayOfWeek || 'Unknown'}</span>
            </div>
            <div className="time-slot-summary-item">
              <span className="summary-label">Hits on {player.dayOfWeek}s:</span>
              <span className="summary-value">{player.hits || 'N/A'}</span>
            </div>
            <div className="time-slot-summary-item">
              <span className="summary-label">Games on {player.dayOfWeek}s:</span>
              <span className="summary-value">{player.games || 'N/A'}</span>
            </div>
            <div className="time-slot-summary-item">
              <span className="summary-label">Hit Rate:</span>
              <span className="summary-value">{player.hitRate ? player.hitRate.toFixed(2) : 'N/A'}</span>
            </div>
          </div>
          
          <div className="time-slot-context">
            <h4>⏰ {player.dayOfWeek} Performance Analysis</h4>
            <div className="context-info">
              <span>Strong performance on {player.dayOfWeek}s with {player.hits || 0} hits in {player.games || 0} games</span>
            </div>
          </div>

          {player.dates && player.dates.length > 0 && (
            <div className="recent-dates">
              <h4>📅 Recent {player.dayOfWeek} Games</h4>
              <div className="dates-list">
                {player.dates.slice(0, 5).map((date, idx) => (
                  <span key={idx} className="date-item">
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                ))}
                {player.dates.length > 5 && <span className="more-dates">+{player.dates.length - 5} more</span>}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (type === 'matchup_edge' && player) {
      return (
        <div className="matchup-edge-details">
          <div className="matchup-summary">
            <div className="matchup-summary-item">
              <span className="summary-label">Batting Hand:</span>
              <span className="summary-value">{player.hand || 'Unknown'}</span>
            </div>
            <div className="matchup-summary-item">
              <span className="summary-label">vs Pitcher:</span>
              <span className="summary-value highlight">{player.opposingPitcher || 'Unknown'}</span>
            </div>
            <div className="matchup-summary-item">
              <span className="summary-label">Pitcher Hand:</span>
              <span className="summary-value">{player.opposingPitcherHand || 'Unknown'}</span>
            </div>
            <div className="matchup-summary-item">
              <span className="summary-label">Matchup Type:</span>
              <span className="summary-value">{player.matchupType === 'same_handed' ? 'Same-Handed' : 'Opposite-Handed'}</span>
            </div>
          </div>
          
          <div className="matchup-context">
            <h4>🆚 Pitcher Matchup Analysis</h4>
            <div className="context-info">
              <span>
                {player.matchupType === 'same_handed' 
                  ? `Challenging same-handed matchup vs ${player.opposingPitcher}`
                  : `Favorable opposite-handed matchup vs ${player.opposingPitcher}`
                }
              </span>
            </div>
          </div>

          <div className="historical-context">
            <h4>📊 Historical Context</h4>
            <div className="context-info">
              <span>Part of tough pitcher matchup analysis for {player.opposingPitcherTeam}</span>
            </div>
          </div>
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
                    {deduplicateGameData(tooltipData.detailedGameTable).map((game, idx) => (
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

    if (type === 'pitcher_comprehensive' && tooltipData?.pitcher) {
      const { pitcher, sameHandBatters, oppositeHandBatters, arsenal, comprehensiveArsenal, opposingBattersList, pitches } = tooltipData;
      const sameHandPercentage = Math.round((pitcher.sameHandednessPercentage || 0) * 100);
      const oppositeHandPercentage = Math.round((pitcher.oppositeHandednessPercentage || 0) * 100);
      
      return (
        <div className="tooltip-content">
          <div className="pitcher-comprehensive-details">
            <h4>{pitcher.name} ({pitcher.team}) vs {pitcher.opposingTeam}</h4>
            
            <div className="pitcher-overview">
              <div className="pitcher-info">
                <span className="pitcher-hand">Pitcher Hand: {pitcher.hand}</span>
                {pitcher.estimated && <span className="estimated-indicator">(Estimated)</span>}
              </div>
              <div className="matchup-percentages">
                <div className="percentage-stat">
                  <span className="percentage-value">{sameHandPercentage}%</span>
                  <span className="percentage-label">Same Hand</span>
                </div>
                <div className="percentage-stat">
                  <span className="percentage-value">{oppositeHandPercentage}%</span>
                  <span className="percentage-label">Opposite Hand</span>
                </div>
              </div>
            </div>

            {/* Same-Hand Batters Table */}
            {sameHandBatters && sameHandBatters.length > 0 && (
              <div className="batters-section">
                <h5>Same-Handed Batters ({sameHandBatters.length})</h5>
                <div className="batters-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Team</th>
                        <th>Hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sameHandBatters.slice(0, 10).map((batter, index) => (
                        <tr key={index}>
                          <td className="batter-name">{batter.name}</td>
                          <td className="batter-team">{batter.team}</td>
                          <td className="batter-hand">{batter.hand}{batter.isSwitch ? ' (S)' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sameHandBatters.length > 10 && (
                    <div className="more-batters">+{sameHandBatters.length - 10} more</div>
                  )}
                </div>
              </div>
            )}

            {/* Opposite-Hand Batters Table */}
            {oppositeHandBatters && oppositeHandBatters.length > 0 && (
              <div className="batters-section">
                <h5>Opposite-Handed Batters ({oppositeHandBatters.length})</h5>
                <div className="batters-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Team</th>
                        <th>Hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oppositeHandBatters.slice(0, 10).map((batter, index) => (
                        <tr key={index}>
                          <td className="batter-name">{batter.name}</td>
                          <td className="batter-team">{batter.team}</td>
                          <td className="batter-hand">{batter.hand}{batter.isSwitch ? ' (S)' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {oppositeHandBatters.length > 10 && (
                    <div className="more-batters">+{oppositeHandBatters.length - 10} more</div>
                  )}
                </div>
              </div>
            )}

            {/* Comprehensive Arsenal Information */}
            {comprehensiveArsenal ? (
              <div className="arsenal-section">
                <h5>⚾ Arsenal Breakdown ({comprehensiveArsenal.pitches.length} pitches)</h5>
                
                {/* Comprehensive Pitch Display */}
                <div className="comprehensive-pitch-display">
                  {comprehensiveArsenal.pitches.map((pitch, index) => {
                    // Pitch type configuration with colors and names
                    const pitchConfig = {
                      'FF': { name: '4-Seam Fastball', emoji: '🔥', color: '#ff4444' },
                      'SI': { name: 'Sinker', emoji: '📉', color: '#ff6644' },
                      'FC': { name: 'Cutter', emoji: '✂️', color: '#ff8844' },
                      'SL': { name: 'Slider', emoji: '↗️', color: '#4488ff' },
                      'CU': { name: 'Curveball', emoji: '🌙', color: '#44aaff' },
                      'CH': { name: 'Changeup', emoji: '🎭', color: '#44ff88' },
                      'FS': { name: 'Splitter', emoji: '🔻', color: '#88ff44' },
                      'KC': { name: 'Knuckle Curve', emoji: '🌀', color: '#8844ff' },
                      'KN': { name: 'Knuckleball', emoji: '🦋', color: '#ff44ff' },
                      'ST': { name: 'Sweeper', emoji: '💫', color: '#6644ff' },
                      'SV': { name: 'Slurve', emoji: '🌪️', color: '#4466ff' }
                    };
                    
                    const config = pitchConfig[pitch.pitch_type] || { 
                      name: pitch.pitch_name || pitch.pitch_type, 
                      emoji: '⚾', 
                      color: '#666666' 
                    };
                    
                    return (
                      <div key={index} className="comprehensive-pitch-card" style={{ borderLeftColor: config.color }}>
                        <div className="pitch-card-header">
                          <div className="pitch-info">
                            <span className="pitch-emoji">{config.emoji}</span>
                            <div className="pitch-details">
                              <div className="pitch-name-display">{pitch.pitch_name || config.name}</div>
                              <div className="pitch-usage-info">
                                {pitch.pitch_usage.toFixed(1)}% usage ({pitch.pitches} thrown)
                              </div>
                            </div>
                          </div>
                          <div 
                            className="effectiveness-badge"
                            style={{ 
                              backgroundColor: pitch.effectiveness.color + '20', 
                              color: pitch.effectiveness.color 
                            }}
                          >
                            {pitch.effectiveness.rating}
                          </div>
                        </div>
                        
                        {/* Key Stats */}
                        <div className="pitch-stats-grid">
                          <div className="stat-item">
                            <div className="stat-label">Whiff%</div>
                            <div className="stat-value">{pitch.whiff_percent.toFixed(1)}%</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-label">K%</div>
                            <div className="stat-value">{pitch.k_percent.toFixed(1)}%</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-label">Hard Hit%</div>
                            <div className="stat-value">{pitch.hard_hit_percent.toFixed(1)}%</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-label">BA Against</div>
                            <div className="stat-value">{pitch.ba.toFixed(3)}</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-label">SLG Against</div>
                            <div className="stat-value">{pitch.slg.toFixed(3)}</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-label">wOBA</div>
                            <div className="stat-value">{pitch.woba.toFixed(3)}</div>
                          </div>
                        </div>
                        
                        {/* Run Value */}
                        <div className="run-value-display">
                          <span className="rv-label">Run Value/100:</span>
                          <span className={`rv-value ${pitch.run_value_per_100 < 0 ? 'positive' : 'negative'}`}>
                            {pitch.run_value_per_100.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Arsenal Summary */}
                <div className="comprehensive-arsenal-summary">
                  <div className="summary-title">📊 Arsenal Summary</div>
                  <div className="summary-grid">
                    <div className="summary-stat">
                      <span className="summary-label">Avg Whiff%:</span>
                      <span className="summary-value">{comprehensiveArsenal.summary.avgWhiffPercent.toFixed(1)}%</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Avg K%:</span>
                      <span className="summary-value">{comprehensiveArsenal.summary.avgKPercent.toFixed(1)}%</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Primary Pitch:</span>
                      <span className="summary-value">
                        {comprehensiveArsenal.summary.primaryPitch.pitch_name} ({comprehensiveArsenal.summary.primaryPitch.pitch_usage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Total Pitches:</span>
                      <span className="summary-value">{comprehensiveArsenal.summary.totalPitchesThrown}</span>
                    </div>
                  </div>
                  
                  {/* Classification Badge */}
                  <div className="arsenal-classification">
                    <div className={`classification-badge ${comprehensiveArsenal.classification.type}`}>
                      {comprehensiveArsenal.classification.label} ({comprehensiveArsenal.classification.description})
                    </div>
                  </div>
                </div>
              </div>
            ) : (arsenal && arsenal.length > 0) || (pitches && pitches.length > 0) ? (
              /* Fallback Basic Arsenal Display */
              <div className="arsenal-section">
                <h5>⚾ Arsenal Breakdown ({(arsenal || pitches || []).length} pitches)</h5>
                
                {/* Basic Pitch Mix Display */}
                <div className="pitch-mix-display">
                  {(arsenal || pitches || []).map((pitch, index) => {
                    const pitchType = typeof pitch === 'string' ? pitch : (pitch.pitch_type || pitch.name);
                    const pitchConfig = {
                      'FF': { name: '4-Seam Fastball', emoji: '🔥', color: '#ff4444' },
                      'SI': { name: 'Sinker', emoji: '📉', color: '#ff6644' },
                      'FC': { name: 'Cutter', emoji: '✂️', color: '#ff8844' },
                      'SL': { name: 'Slider', emoji: '↗️', color: '#4488ff' },
                      'CU': { name: 'Curveball', emoji: '🌙', color: '#44aaff' },
                      'CH': { name: 'Changeup', emoji: '🎭', color: '#44ff88' },
                      'FS': { name: 'Splitter', emoji: '🔻', color: '#88ff44' },
                      'KC': { name: 'Knuckle Curve', emoji: '🌀', color: '#8844ff' },
                      'KN': { name: 'Knuckleball', emoji: '🦋', color: '#ff44ff' }
                    };
                    
                    const config = pitchConfig[pitchType] || { 
                      name: pitchType || 'Unknown Pitch', 
                      emoji: '⚾', 
                      color: '#666666' 
                    };
                    
                    return (
                      <div key={index} className="pitch-display-card" style={{ borderLeftColor: config.color }}>
                        <div className="pitch-header-info">
                          <span className="pitch-emoji">{config.emoji}</span>
                          <div className="pitch-details">
                            <div className="pitch-name-display">{config.name}</div>
                            <div className="pitch-type-abbr">({pitchType})</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* All Opposing Batters */}
            {opposingBattersList && opposingBattersList.length > 0 && !sameHandBatters && !oppositeHandBatters && (
              <div className="batters-section">
                <h5>Opposing Batters ({opposingBattersList.length})</h5>
                <div className="batters-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Team</th>
                        <th>Hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opposingBattersList.slice(0, 10).map((batter, index) => (
                        <tr key={index}>
                          <td className="batter-name">{batter.name}</td>
                          <td className="batter-team">{batter.team}</td>
                          <td className="batter-hand">{batter.hand}{batter.isSwitch ? ' (S)' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {opposingBattersList.length > 10 && (
                    <div className="more-batters">+{opposingBattersList.length - 10} more</div>
                  )}
                </div>
              </div>
            )}
          </div>
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

    if (type === 'milestone_tracking' && player) {
      // Extract player info for lookup
      const playerName = player.playerName || player.name || player.player || '';
      const team = player.team || '';
      
      console.log('🎯 MILESTONE TOOLTIP - Looking up:', playerName, team);
      
      // Check if player object already has milestone data
      let hasMilestoneData = player.milestone && player.timeline && player.momentum;
      let milestoneData = player;
      
      // Store all milestones for the player
      let allMilestones = [];
      
      // ALWAYS fetch all milestones from the file to get the complete list
      if (playerName && team) {
        console.log('📁 Fetching all milestone data from file...');
        
        // Create a synchronous request to get the data
        // Note: This is not ideal but works for the tooltip use case
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', '/data/predictions/milestone_tracking_latest.json', false);
          xhr.send();
          
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            
            // Search through all milestones to find ALL entries for this player
            if (data.milestones) {
              console.log(`🔍 Searching for all milestones for player: "${playerName}" (${team})`);
              
              const namePartsForFallback = playerName.split(' ');
              const abbreviatedName = namePartsForFallback.length >= 2 
                ? `${namePartsForFallback[0].charAt(0)}. ${namePartsForFallback[namePartsForFallback.length - 1]}`
                : playerName;
              
              // Find ALL milestones for this player
              const foundMilestones = data.milestones?.filter(m => {
                // Try various name matching strategies
                const playerNameLower = playerName.toLowerCase();
                const mPlayerLower = m.player.toLowerCase();
                
                // Debug specific player
                if (playerName.includes('Kwan')) {
                  console.log(`   Checking milestone: player="${m.player}", team="${m.team}" vs search="${playerName}", team="${team}"`);
                }
                
                const nameMatch = m.player === playerName || 
                                 m.player === abbreviatedName ||
                                 m.fullName === playerName ||
                                 mPlayerLower === playerNameLower ||
                                 // Handle case where playerName is "Steven Kwan" and m.player is "S. Kwan"
                                 (playerName.includes(' ') && m.player.includes('.') && 
                                  m.player.toLowerCase().includes(playerName.split(' ')[1].toLowerCase())) ||
                                 // Handle reverse case
                                 (m.player.includes(' ') && playerName.includes('.') && 
                                  playerName.toLowerCase().includes(m.player.split(' ')[1].toLowerCase()));
                                  
                const teamMatch = m.team === team || m.team === team.toUpperCase();
                
                // More debug for Kwan
                if (playerName.includes('Kwan') && nameMatch && teamMatch) {
                  console.log(`   ✅ MATCH FOUND: ${m.milestone.stat} ${m.milestone.current}→${m.milestone.target}`);
                }
                
                return nameMatch && teamMatch;
              });
              
              if (foundMilestones && foundMilestones.length > 0) {
                console.log(`✅ Found ${foundMilestones.length} milestone(s) for ${playerName}`);
                console.log('   Milestones found:', foundMilestones.map(m => `${m.milestone.stat}: ${m.milestone.current}→${m.milestone.target}`));
                
                // Sort by urgency score (heat level) - highest first
                allMilestones = foundMilestones.sort((a, b) => {
                  const urgencyA = a.milestone?.urgencyScore || 0;
                  const urgencyB = b.milestone?.urgencyScore || 0;
                  return urgencyB - urgencyA;
                });
                
                // Override the single milestone data with all milestones
                milestoneData = allMilestones[0];
                hasMilestoneData = true;
              } else {
                console.log('❌ No milestones found in file for', playerName, team);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching milestone data:', error);
        }
      }

      // If we didn't find multiple milestones but have single milestone data, use it
      if (allMilestones.length === 0 && hasMilestoneData && milestoneData) {
        console.log('⚠️ Using single milestone data (could not fetch all milestones)');
        allMilestones = [milestoneData];
      }

      if (!hasMilestoneData && allMilestones.length === 0) {
        console.log('❌ No milestone data available');
        
        return (
          <div className="tooltip-content milestone-tracking-details">
            <div className="milestone-header">
              <strong>{playerName}</strong> {team && `(${team})`}
            </div>
            <div className="milestone-status">
              <p style={{ margin: '10px 0', color: '#999' }}>
                No current milestone tracking data
              </p>
              <small style={{ color: '#666', fontSize: '12px' }}>
                Player may not be close to any milestones at this time
              </small>
            </div>
          </div>
        );
      }

      console.log(`✅ Milestone data found, processing ${allMilestones.length} milestone(s)...`);
      
      // Use allMilestones which now contains all milestones for this player
      const milestonesToDisplay = allMilestones;
      
      // Heat level emoji mapping
      const heatEmojis = {
        'BLAZING': '🔥🔥🔥',
        'HOT': '🔥🔥', 
        'WARM': '🔥'
      };

      // Enhanced milestone context with better name extraction (from first milestone)
      const extractedPlayerName = milestonesToDisplay[0].player || milestonesToDisplay[0].playerName || milestonesToDisplay[0].name || playerName || 'Player';
      const playerTeam = milestonesToDisplay[0].team || milestonesToDisplay[0].Team || team || 'Unknown';

      // Format milestone information in compact card style with ALL milestones
      return (
        <div className="tooltip-content milestone-tracking-details">
          <div className="milestone-card-header">
            <div className="player-info">
              <div className="player-name">{extractedPlayerName}</div>
              <div className="player-team">({playerTeam})</div>
            </div>
            {milestonesToDisplay.length > 1 && (
              <div className="milestone-count">{milestonesToDisplay.length} Milestones</div>
            )}
          </div>
          
          {/* Display each milestone */}
          {milestonesToDisplay.map((milestone, index) => {
            // Access milestone data from the correct nested structure
            const milestoneObj = milestone.milestone || {};
            const timelineObj = milestone.timeline || {};
            const momentumObj = milestone.momentum || {};

            // Extract from the nested milestone object structure
            const heatLevel = milestoneObj.heatLevel || 'WARM';
            const urgencyScore = milestoneObj.urgencyScore || 0;
            const targetStat = milestoneObj.stat || 'HR';
            const currentValue = milestoneObj.current ?? 0;
            const targetValue = milestoneObj.target ?? (targetStat === 'HR' ? 5 : 10);
            const awayFromTarget = Math.max(0, targetValue - currentValue);

            // Extract timeline data from the timeline object
            const seasonPaceGames = timelineObj.seasonPace?.gamesNeeded;
            const recentPaceGames = timelineObj.recentPace?.gamesNeeded;
            const bestEstimateGames = timelineObj.bestEstimate?.games;
            const estimateConfidence = timelineObj.bestEstimate?.confidence || 70;
            const recentTrend = timelineObj.recentPace?.trend || '➡️ STEADY';

            // Extract momentum data
            const last3Games = momentumObj.last3Games ?? 0;
            const percentAboveSeason = momentumObj.percentAboveSeason ?? 0;
            
            // Use the alerts array if available
            const alerts = milestone.alerts || [];
            const hasTonight = alerts.some(a => a.includes('tonight'));
            const hasWeekend = alerts.some(a => a.includes('weekend'));
            
            // Format recent performance
            const recentPerformance = `Last 3: ${last3Games} ${targetStat}`;

            return (
              <div key={index} className={`milestone-item ${index > 0 ? 'milestone-separator' : ''}`}>
                <div className="milestone-target">
                  <span className="heat-emoji">{heatEmojis[heatLevel]}</span>
                  <span className="current-stat">{currentValue}</span>
                  <span className="arrow">→</span>
                  <span className="target-stat">{targetValue} {targetStat.toUpperCase()}</span>
                </div>
                
                <div className="milestone-details">
                  <div className="estimate-section">
                    <div className="section-label">Best Estimate:</div>
                    <div className="estimate-value">
                      {bestEstimateGames > 0 ? `${bestEstimateGames.toFixed(1)} games` : `${awayFromTarget} more needed`}
                      <span className="confidence"> ({estimateConfidence}% conf)</span>
                    </div>
                  </div>
                  
                  <div className="pace-section">
                    <div className="pace-row">
                      <span className="pace-label">Season:</span>
                      <span className="pace-value">{seasonPaceGames > 0 ? `${seasonPaceGames.toFixed(1)}g` : 'N/A'}</span>
                    </div>
                    <div className="pace-row">
                      <span className="pace-label">Recent:</span>
                      <span className="pace-value">
                        {recentPaceGames > 0 ? `${recentPaceGames.toFixed(1)}g` : 'N/A'} {recentTrend}
                      </span>
                    </div>
                  </div>
                  
                  {awayFromTarget <= 1 && (
                    <div className="urgency-indicator">
                      🎯 One away from milestone!
                    </div>
                  )}
                  
                  {hasTonight && (
                    <div className="tonight-indicator">
                      ⚡ Could happen tonight!
                    </div>
                  )}
                  
                  {hasWeekend && (
                    <div className="weekend-indicator">
                      📅 This weekend potential
                    </div>
                  )}
                  
                  <div className="recent-performance">
                    {recentPerformance}
                  </div>
                  
                  {percentAboveSeason !== 0 && (
                    <div className="pace-comparison">
                      📈 {percentAboveSeason > 0 ? '+' : ''}{percentAboveSeason}% vs season avg
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'travel_impact' && player) {
      return (
        <div className="travel-impact-details">
          <div className="travel-summary">
            <div className="travel-summary-item">
              <span className="summary-label">Travel Distance:</span>
              <span className="summary-value highlight">{player.distance} miles</span>
            </div>
            <div className="travel-summary-item">
              <span className="summary-label">Travel Impact:</span>
              <span className="summary-value">{player.travelImpact} points</span>
            </div>
            <div className="travel-summary-item">
              <span className="summary-label">Travel Type:</span>
              <span className="summary-value">{player.description}</span>
            </div>
            {player.restDays !== undefined && (
              <div className="travel-summary-item">
                <span className="summary-label">Rest Days:</span>
                <span className="summary-value">{player.restDays}</span>
              </div>
            )}
          </div>
          
          <div className="travel-context">
            <h4>✈️ Travel Impact Analysis</h4>
            <div className="context-info">
              <p>Travel can impact player performance through fatigue and disrupted routines.</p>
              <div className="travel-details">
                <div className="travel-detail-item">
                  <strong>Distance Factor:</strong> {player.distance >= 2000 ? 'Long distance travel' : player.distance >= 1000 ? 'Medium distance travel' : 'Short distance travel'}
                </div>
                {player.travelImpact < -2 && (
                  <div className="travel-detail-item">
                    <strong>Performance Impact:</strong> Significant negative impact expected
                  </div>
                )}
                {player.travelImpact >= -2 && player.travelImpact < 0 && (
                  <div className="travel-detail-item">
                    <strong>Performance Impact:</strong> Moderate negative impact expected
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'weather_context' && player) {
      return (
        <div className="weather-context-details">
          <div className="weather-summary">
            <div className="weather-summary-item">
              <span className="summary-label">Venue:</span>
              <span className="summary-value highlight">{player.venue}</span>
            </div>
            <div className="weather-summary-item">
              <span className="summary-label">Game Date:</span>
              <span className="summary-value">{player.date}</span>
            </div>
            <div className="weather-summary-item">
              <span className="summary-label">Stadium Type:</span>
              <span className="summary-value">{player.isDome ? 'Indoor (Domed)' : 'Outdoor'}</span>
            </div>
            <div className="weather-summary-item">
              <span className="summary-label">Weather Impact:</span>
              <span className={`summary-value impact-${player.weatherImpact || 'neutral'}`}>
                {player.weatherImpact === 'very_favorable' ? 'Very Favorable' :
                 player.weatherImpact === 'favorable' ? 'Favorable' :
                 player.weatherImpact === 'unfavorable' ? 'Unfavorable' :
                 player.weatherImpact === 'very_unfavorable' ? 'Very Unfavorable' :
                 'Neutral'}
              </span>
            </div>
            {player.hasWeatherData && player.currentWeather && (
              <div className="weather-summary-item">
                <span className="summary-label">Data Source:</span>
                <span className="summary-value">Live Weather API</span>
              </div>
            )}
          </div>
          
          <div className="weather-analysis">
            <h4>🌤️ Weather Analysis</h4>
            <div className="context-info">
              <p>{player.description || 'Weather conditions assessment for this venue and date.'}</p>
              
              {player.isDome && (
                <div className="dome-info">
                  <strong>🏟️ Indoor Stadium:</strong> Weather conditions are controlled and do not affect gameplay.
                </div>
              )}
              
              {!player.isDome && player.hasWeatherData && player.currentWeather && (
                <div className="detailed-weather">
                  <div className="weather-conditions">
                    <h5>📊 Current Conditions</h5>
                    <div className="condition-grid">
                      <div className="condition-item">
                        <span className="condition-label">Temperature:</span>
                        <span className="condition-value">{player.currentWeather.temperature}°F (feels like {player.currentWeather.feelsLike}°F)</span>
                      </div>
                      <div className="condition-item">
                        <span className="condition-label">Wind:</span>
                        <span className="condition-value">{player.currentWeather.windSpeed}mph {player.windFactor?.text || ''}</span>
                      </div>
                      <div className="condition-item">
                        <span className="condition-label">Precipitation:</span>
                        <span className="condition-value">{player.currentWeather.precipitation}% chance</span>
                      </div>
                      <div className="condition-item">
                        <span className="condition-label">Pressure:</span>
                        <span className="condition-value">{player.currentWeather.pressure} hPa</span>
                      </div>
                    </div>
                  </div>
                  
                  {player.windFactor && (
                    <div className="wind-analysis">
                      <h5>💨 Wind Impact Analysis</h5>
                      <div className="wind-info">
                        <p><strong>{player.windFactor.text}:</strong> {player.windFactor.description}</p>
                        {player.parkData && (
                          <p><strong>Park Orientation:</strong> {player.parkData.orientation} (Center field direction)</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {player.temperatureAnalysis && (
                    <div className="temperature-analysis">
                      <h5>🌡️ Temperature Impact</h5>
                      <div className="temp-info">
                        <p>{player.temperatureAnalysis.description}</p>
                        <p><strong>Ball Flight Factor:</strong> {((player.temperatureAnalysis.factor - 1) * 100).toFixed(1)}% {player.temperatureAnalysis.factor >= 1 ? 'increase' : 'decrease'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {!player.isDome && !player.hasWeatherData && (
                <div className="outdoor-info">
                  <strong>🌤️ Outdoor Stadium:</strong> Weather conditions may impact ball flight, visibility, and player comfort.
                  <div className="weather-note">
                    <em>Weather data temporarily unavailable. Check conditions closer to game time.</em>
                  </div>
                </div>
              )}
              
              {player.weatherImpact === 'very_favorable' && (
                <div className="impact-favorable">
                  <strong>🚀 Excellent Conditions:</strong> Weather strongly favors offensive performance with enhanced ball flight.
                </div>
              )}
              {player.weatherImpact === 'favorable' && (
                <div className="impact-favorable">
                  <strong>✅ Good Conditions:</strong> Weather conditions favor offensive performance.
                </div>
              )}
              {player.weatherImpact === 'unfavorable' && (
                <div className="impact-unfavorable">
                  <strong>⚠️ Challenging Conditions:</strong> Weather may reduce offensive performance.
                </div>
              )}
              {player.weatherImpact === 'very_unfavorable' && (
                <div className="impact-unfavorable">
                  <strong>🚫 Poor Conditions:</strong> Weather significantly hampers offensive performance.
                </div>
              )}
            </div>
          </div>
          
          {player.badge && (
            <div className="weather-badge-explanation">
              <h4>🏷️ Badge Meaning</h4>
              <div className="badge-info">
                <span className="weather-badge-text">{player.badge}</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (type === 'stadium_context' && player) {
      return (
        <div className="stadium-context-details">
          <div className="stadium-summary">
            <div className="stadium-summary-item">
              <span className="summary-label">Venue:</span>
              <span className="summary-value highlight">{player.venue}</span>
            </div>
            <div className="stadium-summary-item">
              <span className="summary-label">Park Factor:</span>
              <span className="summary-value">{player.parkFactor?.toFixed(3)}x</span>
            </div>
            <div className="stadium-summary-item">
              <span className="summary-label">Category:</span>
              <span className="summary-value">{player.category}</span>
            </div>
            <div className="stadium-summary-item">
              <span className="summary-label">Hitting Environment:</span>
              <span className="summary-value">
                {player.isHitterFriendly ? 'Hitter Friendly' : 
                 player.isPitcherFriendly ? 'Pitcher Friendly' : 'Neutral'}
              </span>
            </div>
          </div>
          
          <div className="stadium-analysis">
            <h4>🏟️ Stadium Factor Analysis</h4>
            <div className="context-info">
              <p>{player.description || 'Park factor and ballpark characteristics assessment.'}</p>
              
              <div className="park-factor-explanation">
                <div className="factor-detail-item">
                  <strong>Park Factor:</strong> {player.parkFactor > 1.0 ? 'Above average run scoring' : 
                                                   player.parkFactor < 1.0 ? 'Below average run scoring' : 'Average run scoring'}
                </div>
                
                {player.isHitterFriendly && (
                  <div className="hitter-friendly-info">
                    <strong>Hitter Friendly:</strong> Ballpark dimensions, wind patterns, or altitude favor offensive production.
                  </div>
                )}
                
                {player.isPitcherFriendly && (
                  <div className="pitcher-friendly-info">
                    <strong>Pitcher Friendly:</strong> Ballpark characteristics favor pitchers and suppress offensive numbers.
                  </div>
                )}
                
                {!player.isHitterFriendly && !player.isPitcherFriendly && (
                  <div className="neutral-park-info">
                    <strong>Neutral Park:</strong> Ballpark provides balanced conditions for both hitters and pitchers.
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {player.badge && (
            <div className="stadium-badge-explanation">
              <h4>🏷️ Badge Meaning</h4>
              <div className="badge-info">
                <span className="stadium-badge-text">{player.badge}</span>
              </div>
            </div>
          )}
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
        className={`global-tooltip theme-${themeMode}`}
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