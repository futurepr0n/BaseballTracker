import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  formatPercentage, 
  formatNumber, 
  normalizePercentage
} from '../utils/dataFormatting';
import { generateOpportunityReasoning } from '../services/reasoningGenerator';
import { useBaseballAnalysis } from '../../../services/baseballAnalysisService';
import './BestBetsAnalysis.css';

const BestBetsAnalysis = ({ opportunities, matchups, loading, enhanced }) => {
  const [batterOpportunities, setBatterOpportunities] = useState([]);
  const [opportunityLoading, setOpportunityLoading] = useState(false);

  const { 
    initialized, 
    analyzePitcherVsTeam
  } = useBaseballAnalysis();

  // Define tier calculation function before it's used in useMemo
  const getTier = useCallback((compositeScore, hrScore, confidence) => {
    if (compositeScore >= 75 && hrScore >= 80 && confidence >= 80) return 'TIER 1';
    if (compositeScore >= 65 && hrScore >= 70) return 'TIER 2';
    if (compositeScore >= 55 && hrScore >= 60) return 'TIER 3';
    if (compositeScore >= 45) return 'TIER 4';
    return 'TIER 5';
  }, []);

  // Generate batter opportunities using the same logic as BatterOpportunitySection
  const generateBatterAnalysis = useCallback(async () => {
    if (!matchups || matchups.length === 0 || !initialized) return;

    setOpportunityLoading(true);
    
    try {
      const allBatterOpportunities = [];
      
      for (const matchup of matchups) {
        if (matchup.awayPitcher && matchup.awayPitcher !== 'TBD') {
          try {
            const homeTeamAnalysis = await analyzePitcherVsTeam({
              pitcherName: matchup.awayPitcher,
              teamAbbr: matchup.homeTeam,
              sortBy: 'hr_score',
              limit: 20,
              includeDashboardContext: true
            });

            if (homeTeamAnalysis?.predictions) {
              homeTeamAnalysis.predictions.forEach(prediction => {
                allBatterOpportunities.push({
                  ...prediction,
                  pitcher: matchup.awayPitcher,
                  pitcherTeam: matchup.awayTeam,
                  batterTeam: matchup.homeTeam,
                  gameId: matchup.gameId,
                  venue: matchup.venue,
                  gameTime: matchup.gameTime,
                  matchupType: 'vs_away_pitcher'
                });
              });
            }
          } catch (error) {
            console.warn(`Failed to analyze ${matchup.homeTeam} vs ${matchup.awayPitcher}:`, error);
          }
        }

        if (matchup.homePitcher && matchup.homePitcher !== 'TBD') {
          try {
            const awayTeamAnalysis = await analyzePitcherVsTeam({
              pitcherName: matchup.homePitcher,
              teamAbbr: matchup.awayTeam,
              sortBy: 'hr_score',
              limit: 20,
              includeDashboardContext: true
            });

            if (awayTeamAnalysis?.predictions) {
              awayTeamAnalysis.predictions.forEach(prediction => {
                allBatterOpportunities.push({
                  ...prediction,
                  pitcher: matchup.homePitcher,
                  pitcherTeam: matchup.homeTeam,
                  batterTeam: matchup.awayTeam,
                  gameId: matchup.gameId,
                  venue: matchup.venue,
                  gameTime: matchup.gameTime,
                  matchupType: 'vs_home_pitcher'
                });
              });
            }
          } catch (error) {
            console.warn(`Failed to analyze ${matchup.awayTeam} vs ${matchup.homePitcher}:`, error);
          }
        }
      }

      console.log(`✅ Generated ${allBatterOpportunities.length} batter opportunities for Best Bets Analysis`);
      setBatterOpportunities(allBatterOpportunities);
    } catch (error) {
      console.error('Error generating batter analysis for Best Bets:', error);
      setBatterOpportunities([]);
    } finally {
      setOpportunityLoading(false);
    }
  }, [matchups, initialized, analyzePitcherVsTeam]);

  // Generate analysis when component mounts or matchups change
  useEffect(() => {
    if (!loading && matchups?.length > 0 && initialized) {
      generateBatterAnalysis();
    }
  }, [loading, matchups, initialized, generateBatterAnalysis]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  // Create tier-based rankings similar to breakdown.PNG
  const rankedPlayers = useMemo(() => {
    const dataToUse = batterOpportunities.length > 0 ? batterOpportunities : (opportunities || []);
    if (dataToUse.length === 0) return [];

    // Calculate composite scores for each player
    const playerScores = dataToUse.map(opp => {
      const hrScore = opp.hr_score || 0;
      const hitProbability = normalizePercentage(opp.hit_probability) || 0;
      const confidence = normalizePercentage(opp.confidence) || 0;
      const arsenalMatchup = opp.arsenal_matchup || 0;
      const contextual = opp.contextual || 0;
      
      // Composite scoring similar to the breakdown image
      const compositeScore = (hrScore * 0.4) + (hitProbability * 0.2) + (confidence * 0.2) + (arsenalMatchup * 0.1) + (contextual * 0.1);
      
      return {
        ...opp,
        compositeScore,
        tier: getTier(compositeScore, hrScore, confidence)
      };
    });

    // Sort by composite score and return top 5
    return playerScores
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 15);
  }, [batterOpportunities, opportunities, getTier]);


  const getTierStars = (tier) => {
    switch (tier) {
      case 'TIER 1': return '⭐⭐⭐⭐⭐';
      case 'TIER 2': return '⭐⭐⭐⭐';
      case 'TIER 3': return '⭐⭐⭐';
      case 'TIER 4': return '⭐⭐';
      default: return '⭐';
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'TIER 1': return '#28a745'; // Green
      case 'TIER 2': return '#007bff'; // Blue  
      case 'TIER 3': return '#ffc107'; // Yellow
      case 'TIER 4': return '#fd7e14'; // Orange
      default: return '#6c757d'; // Gray
    }
  };

  const generatePlayerBreakdown = (player) => {
    const reasoning = generateOpportunityReasoning(player);
    const vulnerabilityScore = player.arsenal_matchup || 0;
    const successRate = normalizePercentage(player.hit_probability) || 0;
    
    return {
      weakspotAnalysis: `Position ${player.batting_position || 'Unknown'} shows ${vulnerabilityScore.toFixed(1)} vulnerability score. ${successRate.toFixed(1)}% success rate in recent matchups against similar arsenal. Recent form: ${player.recent_avg ? (player.recent_avg * 1000).toFixed(0) : 'N/A'} average.`,
      arsenalBreakdown: reasoning.primary_reasons?.find(r => r.type === 'arsenal_advantage')?.detail || 'Arsenal matchup analysis not available.',
      strategicEdge: `Plays ${player.matchupType === 'vs_away_pitcher' ? 'at home' : 'on road'} against ${player.pitcher}. Extreme predictability: ${player.predictability_score || 'N/A'} rating. Recent ${player.recent_hr || 0} HR and ${player.expected_ab_per_hr ? player.expected_ab_per_hr.toFixed(0) : 'N/A'} expected AB/HR suggests ${player.ab_since_last_hr || 0} AB indicates timing.`,
      risk: player.compositeScore < 50 ? `Position ${player.tier} shows lower vulnerability (${vulnerabilityScore.toFixed(2)} score)` : `Position ${player.tier} maintains confidence with strong matchup indicators.`
    };
  };

  const toggleExpanded = (index) => {
    setExpandedPlayer(expandedPlayer === index ? null : index);
  };

  if (loading || opportunityLoading) {
    return (
      <div className="best-bets-analysis loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3>Generating Best Bets Analysis...</h3>
          <p>Ranking players and calculating tier-based recommendations</p>
        </div>
      </div>
    );
  }

  if (!rankedPlayers || rankedPlayers.length === 0) {
    return (
      <div className="best-bets-analysis empty">
        <div className="empty-content">
          <span className="empty-icon">⭐</span>
          <h3>No Best Bets Available</h3>
          <p>Run the analysis to see tier-based player recommendations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="best-bets-analysis">
      <div className="analysis-header">
        <div className="header-title">
          <span className="header-icon">📊</span>
          <h2>COMPREHENSIVE BREAKDOWN & ARSENAL ANALYSIS: PLAYER ANALYSIS VS ATLANTA BRAVES</h2>
        </div>
        <div className="methodology-note">
          <strong>COMPLETE METHOD OVERVIEW</strong>
          <br />
          <span>Luis Perez (ATL) vs Mookie Betts | Carlos Correa (ATL) vs Manny Machado</span>
        </div>
      </div>

      <div className="tier-recommendations">
        <h3>TIER 1 RECOMMENDATIONS (MAXIMUM CONFIDENCE)</h3>
        
        {rankedPlayers.map((player, index) => {
          const breakdown = generatePlayerBreakdown(player);
          const tierColor = getTierColor(player.tier);
          
          return (
            <div 
              key={`${player.player_name}-${index}`}
              className={`player-recommendation ${player.tier.toLowerCase().replace(' ', '-')}`}
            >
              <div 
                className="recommendation-header"
                onClick={() => toggleExpanded(index)}
              >
                <div className="position-info">
                  <div className="position-number" style={{ backgroundColor: tierColor }}>
                    {index + 1}
                  </div>
                  <div className="position-details">
                    <span className="tier-label" style={{ color: tierColor }}>
                      {player.tier}
                    </span>
                    <span className="stars">{getTierStars(player.tier)}</span>
                  </div>
                </div>
                
                <div className="player-matchup">
                  <div className="player-info">
                    <span className="player-name">{player.player_name}</span>
                    <span className="player-team">({player.batterTeam || player.team})</span>
                  </div>
                  <div className="vs-indicator">vs</div>
                  <div className="pitcher-info">
                    <span className="pitcher-name">{player.pitcher}</span>
                    <span className="pitcher-team">({player.pitcherTeam})</span>
                  </div>
                </div>

                <div className="key-metrics">
                  <div className="metric">
                    <span className="metric-value">{formatNumber(player.hr_score)}</span>
                    <span className="metric-label">HR Score</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{formatPercentage(player.hit_probability)}</span>
                    <span className="metric-label">Hit Prob</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{formatNumber(player.compositeScore)}</span>
                    <span className="metric-label">Composite</span>
                  </div>
                </div>

                <div className="expand-indicator">
                  {expandedPlayer === index ? '▲' : '▼'}
                </div>
              </div>

              {expandedPlayer === index && (
                <div className="recommendation-breakdown">
                  <div className="breakdown-section">
                    <h4>Weakspot Analysis:</h4>
                    <p>{breakdown.weakspotAnalysis}</p>
                  </div>
                  
                  <div className="breakdown-section">
                    <h4>Arsenal Breakdown:</h4>
                    <p>{breakdown.arsenalBreakdown}</p>
                  </div>
                  
                  <div className="breakdown-section">
                    <h4>Strategic Edge:</h4>
                    <p>{breakdown.strategicEdge}</p>
                  </div>
                  
                  {breakdown.risk && (
                    <div className="breakdown-section risk-assessment">
                      <h4>Risk:</h4>
                      <p>{breakdown.risk}</p>
                    </div>
                  )}

                  <div className="detailed-metrics">
                    <div className="metrics-grid">
                      <div className="metric-detail">
                        <span className="label">Arsenal Matchup:</span>
                        <span className="value">{formatNumber(player.arsenal_matchup || 0)}</span>
                      </div>
                      <div className="metric-detail">
                        <span className="label">Contextual:</span>
                        <span className="value">{formatNumber(player.contextual || 0)}</span>
                      </div>
                      <div className="metric-detail">
                        <span className="label">Recent Form:</span>
                        <span className="value">{formatNumber(player.recent_daily_games || 0)}</span>
                      </div>
                      <div className="metric-detail">
                        <span className="label">AB Since HR:</span>
                        <span className="value">{player.ab_since_last_hr || 'N/A'}</span>
                      </div>
                      <div className="metric-detail">
                        <span className="label">Expected AB/HR:</span>
                        <span className="value">{formatNumber(player.expected_ab_per_hr || 0)}</span>
                      </div>
                      <div className="metric-detail">
                        <span className="label">Venue:</span>
                        <span className="value">{player.venue || 'TBD'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="analysis-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-value">{rankedPlayers.filter(p => p.tier === 'TIER 1').length}</span>
            <span className="stat-label">Tier 1 Plays</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{rankedPlayers.filter(p => p.hr_score >= 70).length}</span>
            <span className="stat-label">High HR Score</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{rankedPlayers.filter(p => normalizePercentage(p.confidence) >= 75).length}</span>
            <span className="stat-label">High Confidence</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestBetsAnalysis;