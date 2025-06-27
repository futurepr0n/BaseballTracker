/**
 * ExpandableOpportunityCards.js
 * Interactive cards that display comprehensive player insights with expandable details
 * Now uses BaseballAPI for server-side processing instead of client-side JavaScript
 */

import React, { useState, useEffect, useMemo } from 'react';
import './ExpandableOpportunityCards.css';
import baseballAnalysisService from '../../services/baseballAnalysisService';
import seriesContextService from '../../services/seriesContextService';

const ExpandableOpportunityCards = ({ players, currentDate, title = "Enhanced Game Opportunities" }) => {
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [enhancedInsights, setEnhancedInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load enhanced insights when players change
  useEffect(() => {
    if (players && players.length > 0) {
      loadEnhancedInsights();
    }
  }, [players, currentDate]);

  const loadEnhancedInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Using BaseballAPI for enhanced opportunities processing...');
      
      // Call BaseballAPI enhanced opportunities endpoint
      const response = await fetch('http://localhost:8000/analyze/enhanced-opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          players: players.map(player => ({
            playerName: player.playerName,
            team: player.team,
            venue: player.venue,
            score: player.score || 0,
            isHome: player.isHome,
            gameId: player.gameId
          })),
          currentDate: currentDate.toISOString(),
          analysisType: title.includes('Warning') ? 'warnings' : 'opportunities'
        })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const insights = await response.json();
      console.log('✅ Enhanced insights loaded from BaseballAPI:', insights);
      
      setEnhancedInsights(insights);
    } catch (err) {
      console.error('Error loading enhanced insights from BaseballAPI:', err);
      
      // Check if BaseballAPI is not available and provide helpful message
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('BaseballAPI not available. Please ensure BaseballAPI is running on localhost:8000');
      } else {
        setError(`Failed to load enhanced insights: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (playerId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(playerId)) {
      newExpanded.delete(playerId);
    } else {
      newExpanded.add(playerId);
    }
    setExpandedCards(newExpanded);
  };

  const getPlayerCardId = (player) => {
    return `${player.playerName}_${player.team}_${player.venue || 'unknown'}`;
  };

  // Sort players by score descending
  const sortedPlayers = useMemo(() => {
    if (!enhancedInsights?.players) return players || [];
    
    return enhancedInsights.players.sort((a, b) => {
      const scoreA = a.score || a.enhancedInsights?.insightScore || 0;
      const scoreB = b.score || b.enhancedInsights?.insightScore || 0;
      return scoreB - scoreA;
    });
  }, [enhancedInsights, players]);

  if (!players || players.length === 0) {
    return (
      <div className="expandable-cards-container">
        <h3 className="cards-title">{title}</h3>
        <div className="no-opportunities">No opportunities available</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="expandable-cards-container">
        <h3 className="cards-title">{title}</h3>
        <div className="loading-insights">🚀 Processing insights via BaseballAPI...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="expandable-cards-container">
        <h3 className="cards-title">{title}</h3>
        <div className="error-insights">⚠️ {error}</div>
        {error.includes('BaseballAPI not available') && (
          <div className="api-help">
            <p>To enable enhanced insights:</p>
            <ol>
              <li>Navigate to BaseballAPI directory</li>
              <li>Run: <code>python enhanced_main.py</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}
        <div className="fallback-cards">
          {players.map((player, index) => (
            <BasicOpportunityCard key={index} player={player} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="expandable-cards-container">
      <h3 className="cards-title">{title}</h3>
      
      <div className="cards-grid">
        {sortedPlayers.map((player, index) => {
          const cardId = getPlayerCardId(player);
          const isExpanded = expandedCards.has(cardId);
          
          return (
            <OpportunityCard
              key={cardId}
              player={player}
              isExpanded={isExpanded}
              onToggle={() => toggleCard(cardId)}
              currentDate={currentDate}
            />
          );
        })}
      </div>
      
      {enhancedInsights && (
        <div className="insights-summary">
          <span className="summary-text">
            {enhancedInsights.totalOpportunities} opportunities analyzed • 
            Generated {new Date(enhancedInsights.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
};

const OpportunityCard = ({ player, isExpanded, onToggle, currentDate }) => {
  const [seriesContext, setSeriesContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);

  // Load series context when card is expanded
  useEffect(() => {
    if (isExpanded && !seriesContext && !loadingContext) {
      loadSeriesContext();
    }
  }, [isExpanded]);

  const loadSeriesContext = async () => {
    try {
      setLoadingContext(true);
      const context = await seriesContextService.analyzePlayerSeriesContext(
        player.playerName,
        player.team,
        currentDate
      );
      setSeriesContext(context);
    } catch (error) {
      console.error('Error loading series context:', error);
    } finally {
      setLoadingContext(false);
    }
  };

  const insights = player.enhancedInsights || {};
  const score = player.score || insights.insightScore || 0;

  return (
    <div className={`opportunity-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="card-header" onClick={onToggle}>
        <div className="player-info">
          <div className="player-name">{player.playerName}</div>
          <div className="player-details">
            <span className="team">{player.team}</span>
            {player.venue && <span className="venue">@ {player.venue}</span>}
          </div>
        </div>
        
        <div className="card-scores">
          <div className="main-score">
            <span className="score-value">{score.toFixed(1)}</span>
            <span className="score-label">Score</span>
          </div>
          {insights.selectionReasons && insights.selectionReasons.length > 0 && (
            <div className="reason-count">
              {insights.selectionReasons.length} reasons
            </div>
          )}
        </div>
        
        <div className="expand-indicator">
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>

      {isExpanded && (
        <div className="card-content">
          <div className="insights-tabs">
            <div className="tab-content">
              
              {/* Selection Reasons */}
              {insights.selectionReasons && insights.selectionReasons.length > 0 && (
                <div className="insight-section">
                  <h4 className="section-title">🎯 Why This Player</h4>
                  <div className="reasons-grid">
                    {insights.selectionReasons.map((reason, index) => (
                      <div key={index} className={`reason-badge ${reason.priority}`}>
                        <span className="reason-icon">{reason.icon}</span>
                        <span className="reason-text">{reason.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Season Rankings */}
              {insights.seasonRankings?.hasAchievements && (
                <div className="insight-section">
                  <h4 className="section-title">🏆 Season Achievements</h4>
                  <div className="achievements-grid">
                    {insights.seasonRankings.achievements.map((achievement, index) => (
                      <div key={index} className="achievement-badge">
                        <span className="achievement-icon">{achievement.icon}</span>
                        <div className="achievement-info">
                          <div className="achievement-label">{achievement.label}</div>
                          {achievement.stats && (
                            <div className="achievement-stats">
                              {achievement.stats.H && `${achievement.stats.H} hits`}
                              {achievement.stats.HR && ` • ${achievement.stats.HR} HR`}
                              {achievement.stats.avg && ` • .${Math.round(achievement.stats.avg * 1000)}`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Streaks */}
              {insights.streakStatus?.hasActiveStreaks && (
                <div className="insight-section">
                  <h4 className="section-title">🔥 Active Streaks</h4>
                  <div className="streaks-grid">
                    {insights.streakStatus.streaks.filter(s => s.isActive).map((streak, index) => (
                      <div key={index} className="streak-badge">
                        <span className="streak-icon">{streak.icon}</span>
                        <div className="streak-info">
                          <div className="streak-label">{streak.label}</div>
                          {streak.continuationProbability && (
                            <div className="streak-probability">
                              {(streak.continuationProbability * 100).toFixed(0)}% continuation chance
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Venue Advantages */}
              {insights.venueAdvantage?.hasAdvantages && (
                <div className="insight-section">
                  <h4 className="section-title">🏟️ Venue Advantages</h4>
                  <div className="venue-grid">
                    {insights.venueAdvantage.advantages.map((advantage, index) => (
                      <div key={index} className="venue-badge">
                        <span className="venue-icon">{advantage.icon}</span>
                        <div className="venue-info">
                          <div className="venue-label">{advantage.label}</div>
                          <div className="venue-stats">
                            {advantage.average && `.${Math.round(advantage.average * 1000)} avg`}
                            {advantage.homeRuns && ` • ${advantage.homeRuns} HR`}
                            {advantage.games && ` • ${advantage.games} games`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Form */}
              {insights.recentForm?.isHot && (
                <div className="insight-section">
                  <h4 className="section-title">📈 Recent Form</h4>
                  <div className="form-grid">
                    {insights.recentForm.form.map((formItem, index) => (
                      <div key={index} className="form-badge">
                        <span className="form-icon">{formItem.icon}</span>
                        <div className="form-info">
                          <div className="form-label">{formItem.label}</div>
                          <div className="form-stats">
                            {formItem.average && `.${Math.round(formItem.average * 1000)} avg`}
                            {formItem.homeRuns && ` • ${formItem.homeRuns} HR`}
                            {formItem.games && ` • ${formItem.games} games`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="momentum-indicator">
                    <span className="momentum-label">Momentum:</span>
                    <span className={`momentum-value ${insights.recentForm.momentum}`}>
                      {insights.recentForm.momentum.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )}

              {/* Series Context */}
              {seriesContext && seriesContext.confidence !== 'insufficient' && (
                <div className="insight-section">
                  <h4 className="section-title">📊 Series Context</h4>
                  {loadingContext ? (
                    <div className="loading-context">Loading series analysis...</div>
                  ) : (
                    <div className="series-analysis">
                      {seriesContext.currentSeriesPosition.seriesStarted && (
                        <div className="current-position">
                          <strong>Game {seriesContext.currentSeriesPosition.position}</strong> vs {seriesContext.currentSeriesPosition.opponent}
                          {seriesContext.currentSeriesPosition.isHome !== null && (
                            <span className="home-away">
                              {seriesContext.currentSeriesPosition.isHome ? ' (Home)' : ' (Away)'}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {seriesContext.seriesPatterns.length > 0 && (
                        <div className="series-patterns">
                          {seriesContext.seriesPatterns.map((pattern, index) => (
                            <div key={index} className="pattern-badge">
                              <span className="pattern-icon">{pattern.icon}</span>
                              <div className="pattern-info">
                                <div className="pattern-label">{pattern.label}</div>
                                <div className="pattern-description">{pattern.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {seriesContext.insights.length > 0 && (
                        <div className="series-insights">
                          {seriesContext.insights.slice(0, 2).map((insight, index) => (
                            <div key={index} className={`insight-item ${insight.relevance}`}>
                              <span className="insight-icon">{insight.icon}</span>
                              <div className="insight-content">
                                <div className="insight-title">{insight.title}</div>
                                <div className="insight-description">{insight.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Team Context */}
              {insights.teamContext?.hasPositiveContext && (
                <div className="insight-section">
                  <h4 className="section-title">⚡ Team Context</h4>
                  <div className="team-context-grid">
                    {insights.teamContext.context.map((contextItem, index) => (
                      <div key={index} className="team-badge">
                        <span className="team-icon">{contextItem.icon}</span>
                        <span className="team-label">{contextItem.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Fallback component for basic display when enhanced insights fail
const BasicOpportunityCard = ({ player }) => {
  const score = player.score || 0;
  
  return (
    <div className="opportunity-card basic">
      <div className="card-header">
        <div className="player-info">
          <div className="player-name">{player.playerName}</div>
          <div className="player-details">
            <span className="team">{player.team}</span>
            {player.venue && <span className="venue">@ {player.venue}</span>}
          </div>
        </div>
        
        <div className="card-scores">
          <div className="main-score">
            <span className="score-value">{score.toFixed(1)}</span>
            <span className="score-label">Score</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandableOpportunityCards;