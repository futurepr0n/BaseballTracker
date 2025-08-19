import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  formatPercentage, 
  formatNumber, 
  normalizePercentage
} from '../utils/dataFormatting';
import { generateOpportunityReasoning } from '../services/reasoningGenerator';
import { useBaseballAnalysis } from '../../../services/baseballAnalysisService';
import propBetOptimizer from '../services/propBetOptimizer';
import positionalVulnerabilityService from '../services/positionalVulnerabilityService';
import HistoricalValidationDashboard from './HistoricalValidationDashboard';
import ArsenalMatchupBreakdown from './ArsenalMatchupBreakdown';
import ArsenalBettingInsights from './ArsenalBettingInsights';
import './BestBetsAnalysis.css';

const BestBetsAnalysis = ({ opportunities, matchups, loading, enhanced, comprehensiveAnalysis }) => {
  const [batterOpportunities, setBatterOpportunities] = useState([]);
  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const [optimizedOpportunities, setOptimizedOpportunities] = useState([]);
  const [showValidationDashboard, setShowValidationDashboard] = useState(false);
  const [propBetMode, setPropBetMode] = useState(true);
  const [selectedPropType, setSelectedPropType] = useState('All');
  const [optimizerInitialized, setOptimizerInitialized] = useState(false);
  const [positionVulnerabilities, setPositionVulnerabilities] = useState([]);
  const [pitcherVulnerabilitySummaries, setPitcherVulnerabilitySummaries] = useState([]);

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
      
      // Enhance opportunities with positional vulnerability data
      const enhancedOpportunities = positionalVulnerabilityService.enhanceOpportunitiesWithPositionData(
        allBatterOpportunities, 
        positionVulnerabilities
      );
      
      console.log(`🎯 Enhanced ${enhancedOpportunities.length} opportunities with positional vulnerability data`);
      setBatterOpportunities(enhancedOpportunities);
    } catch (error) {
      console.error('Error generating batter analysis for Best Bets:', error);
      setBatterOpportunities([]);
    } finally {
      setOpportunityLoading(false);
    }
  }, [matchups, initialized, analyzePitcherVsTeam, positionVulnerabilities]);

  // Initialize prop bet optimizer
  const initializeOptimizer = useCallback(async () => {
    try {
      const initialized = await propBetOptimizer.initialize();
      setOptimizerInitialized(initialized);
      console.log('Prop bet optimizer initialized:', initialized);
    } catch (error) {
      console.warn('Failed to initialize prop bet optimizer:', error);
      setOptimizerInitialized(false);
    }
  }, []);

  // Generate optimized prop bet recommendations
  const generateOptimizedOpportunities = useCallback(async (opportunities) => {
    if (!optimizerInitialized || !opportunities.length) return [];

    const optimized = [];
    
    for (const opportunity of opportunities) {
      try {
        const propAnalysis = await propBetOptimizer.optimizePropBet(opportunity);
        
        // Debug: Log Hit prop analysis specifically
        const hitProp = propAnalysis.allViableProps.find(p => p.propType === 'Hit');
        if (hitProp) {
          console.log(`🎯 HIT PROP DEBUG for ${opportunity.player_name}:`, {
            rawConfidence: hitProp.rawConfidence,
            calibratedConfidence: hitProp.calibratedConfidence,
            expectedValue: hitProp.expectedValue,
            odds: hitProp.odds,
            hit_probability: opportunity.hit_probability
          });
        } else {
          console.log(`❌ NO HIT PROP generated for ${opportunity.player_name}, hit_probability: ${opportunity.hit_probability}`);
        }
        
        if (propAnalysis.bestProp && propAnalysis.bestProp.expectedValue > 0) {
          optimized.push({
            ...opportunity,
            optimizedProp: propAnalysis.bestProp,
            alternativeProps: propAnalysis.allViableProps.slice(1, 4), // Show top 3 alternatives
            totalViableProps: propAnalysis.totalOpportunities,
            maxEV: propAnalysis.maxEV
          });
        }
      } catch (error) {
        console.warn(`Failed to optimize opportunity for ${opportunity.player_name}:`, error);
      }
    }

    return optimized.sort((a, b) => b.optimizedProp.expectedValue - a.optimizedProp.expectedValue);
  }, [optimizerInitialized]);

  // Initialize optimizer on mount
  useEffect(() => {
    initializeOptimizer();
  }, [initializeOptimizer]);

  // Process comprehensive analysis for positional vulnerability data
  useEffect(() => {
    if (comprehensiveAnalysis) {
      console.log('🎯 BEST BETS: Processing comprehensive analysis for positional data');
      
      try {
        const vulnerabilities = positionalVulnerabilityService.extractPositionVulnerabilities(comprehensiveAnalysis);
        setPositionVulnerabilities(vulnerabilities);
        
        // Generate pitcher vulnerability summaries
        const uniquePitchers = [...new Set(vulnerabilities.map(v => v.pitcher))];
        const summaries = uniquePitchers.map(pitcher => 
          positionalVulnerabilityService.getPitcherVulnerabilitySummary(pitcher, vulnerabilities)
        ).filter(Boolean);
        
        setPitcherVulnerabilitySummaries(summaries);
        
        console.log(`🎯 BEST BETS: Found ${vulnerabilities.length} position vulnerabilities across ${uniquePitchers.length} pitchers`);
      } catch (error) {
        console.error('🎯 BEST BETS: Error processing positional vulnerability data:', error);
      }
    }
  }, [comprehensiveAnalysis]);

  // Generate analysis when component mounts or matchups change
  useEffect(() => {
    if (!loading && matchups?.length > 0 && initialized) {
      generateBatterAnalysis();
    }
  }, [loading, matchups, initialized, generateBatterAnalysis]);

  // Generate optimized opportunities when batter opportunities change
  useEffect(() => {
    if (propBetMode && batterOpportunities.length > 0 && optimizerInitialized) {
      generateOptimizedOpportunities(batterOpportunities).then(setOptimizedOpportunities);
    }
  }, [propBetMode, batterOpportunities, optimizerInitialized, generateOptimizedOpportunities]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  // Create tier-based rankings or EV-based rankings
  const rankedPlayers = useMemo(() => {
    if (propBetMode && optimizedOpportunities.length > 0) {
      // Use EV-based optimized opportunities
      let filteredOpportunities = optimizedOpportunities;
      
      // Filter by prop type if not "All"
      if (selectedPropType !== 'All') {
        filteredOpportunities = optimizedOpportunities.filter(opp => 
          opp.optimizedProp.propType === selectedPropType
        );
      }
      
      return filteredOpportunities.slice(0, 15);
    } else {
      // Use traditional tier-based system
      const dataToUse = batterOpportunities.length > 0 ? batterOpportunities : (opportunities || []);
      if (dataToUse.length === 0) return [];

      // Calculate composite scores for each player
      const playerScores = dataToUse.map(opp => {
        // Use enhanced scores if available from positional vulnerability data
        const hrScore = opp.enhanced_hr_score || opp.hr_score || 0;
        const hitProbability = normalizePercentage(opp.hit_probability) || 0;
        const confidence = normalizePercentage(opp.enhanced_confidence || opp.confidence) || 0;
        const arsenalMatchup = opp.arsenal_matchup || 0;
        const contextual = opp.contextual || 0;
        
        // Add positional vulnerability bonus to composite scoring
        const positionBonus = opp.position_bonus || 0;
        const positionWeight = positionBonus > 0 ? 0.05 : 0; // 5% weight for positional advantage
        
        // Enhanced composite scoring with positional vulnerability
        const baseComposite = (hrScore * 0.35) + (hitProbability * 0.2) + (confidence * 0.2) + (arsenalMatchup * 0.1) + (contextual * 0.1);
        const compositeScore = baseComposite + (positionBonus * positionWeight);
        
        return {
          ...opp,
          compositeScore,
          tier: getTier(compositeScore, hrScore, confidence)
        };
      });

      // Sort by composite score and return top 15
      return playerScores
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, 15);
    }
  }, [propBetMode, optimizedOpportunities, selectedPropType, batterOpportunities, opportunities, getTier]);


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

  // New functions for EV-based display
  const getEVColor = (expectedValue) => {
    if (expectedValue >= 0.3) return '#28a745'; // Excellent - Green
    if (expectedValue >= 0.2) return '#007bff'; // Good - Blue
    if (expectedValue >= 0.1) return '#ffc107'; // Fair - Yellow
    if (expectedValue >= 0.05) return '#fd7e14'; // Low - Orange
    return '#6c757d'; // Poor - Gray
  };

  const getEVLabel = (expectedValue) => {
    if (expectedValue >= 0.3) return 'EXCELLENT';
    if (expectedValue >= 0.2) return 'GOOD';
    if (expectedValue >= 0.1) return 'FAIR';
    if (expectedValue >= 0.05) return 'LOW';
    return 'POOR';
  };

  const formatEV = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(3)}`;
  };

  const formatOdds = (americanOdds) => {
    return americanOdds;
  };

  const getPropTypeLabel = (propType) => {
    const labels = {
      'HR': 'Home Run',
      'Hit': 'To Get a Hit',
      'Hits_1.5': 'Over 1.5 Hits',
      'Hits_2.5': 'Over 2.5 Hits',
      'RBI': 'To Get an RBI',
      'Runs': 'To Score a Run',
      'Total_Bases_1.5': 'Over 1.5 Total Bases'
    };
    return labels[propType] || propType;
  };

  const generatePlayerBreakdown = (player) => {
    const reasoning = generateOpportunityReasoning(player);
    const vulnerabilityScore = player.arsenal_matchup || 0;
    const successRate = normalizePercentage(player.hit_probability) || 0;
    const positionContext = player.position_context;
    const arsenalAnalysis = player.details?.arsenal_analysis;
    
    // Enhanced analysis with positional vulnerability data
    let weakspotAnalysis = `Position ${player.batting_position || player.lineup_position || 'Unknown'} shows ${vulnerabilityScore.toFixed(1)} arsenal vulnerability score. `;
    
    if (positionContext) {
      const positionBonus = player.position_bonus || 0;
      weakspotAnalysis += `ENHANCED: ${positionContext.positionDescription} has ${positionContext.vulnerabilityScore.toFixed(1)} positional vulnerability vs ${player.pitcher} (+${positionBonus.toFixed(1)} bonus). `;
      weakspotAnalysis += `${(positionContext.hrRate * 100).toFixed(1)}% HR rate in this matchup. `;
    }
    
    weakspotAnalysis += `${successRate.toFixed(1)}% hit probability. Recent form: ${player.recent_avg ? (player.recent_avg * 1000).toFixed(0) : 'N/A'} average.`;
    
    // Enhanced arsenal breakdown with detailed pitch analysis
    let arsenalBreakdown = '';
    
    if (arsenalAnalysis && arsenalAnalysis.pitch_matchups && arsenalAnalysis.pitch_matchups.length > 0) {
      const { pitch_matchups, overall_summary_metrics, confidence } = arsenalAnalysis;
      const hitterAdvantage = overall_summary_metrics.hitter_avg_slg - overall_summary_metrics.pitcher_avg_slg;
      
      // Create detailed arsenal summary
      arsenalBreakdown = `ARSENAL ANALYSIS (${Math.round(confidence * 100)}% confidence): `;
      
      if (hitterAdvantage > 0.075) {
        arsenalBreakdown += `🟢 STRONG ADVANTAGE (+${(hitterAdvantage * 1000).toFixed(0)} SLG points) - `;
      } else if (hitterAdvantage > 0.025) {
        arsenalBreakdown += `🟡 MODERATE EDGE (+${(hitterAdvantage * 1000).toFixed(0)} SLG points) - `;
      } else if (hitterAdvantage > 0) {
        arsenalBreakdown += `🟡 SLIGHT EDGE (+${(hitterAdvantage * 1000).toFixed(0)} SLG points) - `;
      } else {
        arsenalBreakdown += `🔴 DISADVANTAGE (${(Math.abs(hitterAdvantage) * 1000).toFixed(0)} SLG deficit) - `;
      }
      
      // Highlight key pitch types
      const significantPitches = pitch_matchups.filter(p => p.usage >= 15);
      const strongMatchups = pitch_matchups.filter(p => {
        const slugAdvantage = (p.current_year_stats.hitter_slg || 0) - (p.current_year_stats.pitcher_slg || 0);
        return slugAdvantage > 0.050 && p.usage >= 10;
      });
      
      if (strongMatchups.length > 0) {
        const pitchTypes = strongMatchups.map(p => `${p.pitch_type} (${p.usage.toFixed(0)}%)`).join(', ');
        arsenalBreakdown += `Favorable vs ${pitchTypes}. `;
      }
      
      arsenalBreakdown += `Analysis covers ${pitch_matchups.length} pitch types with ${significantPitches.length} primary offerings.`;
    } else {
      arsenalBreakdown = reasoning.primary_reasons?.find(r => r.type === 'arsenal_advantage')?.detail || 'Arsenal matchup analysis available.';
    }
    
    if (positionContext && positionContext.effectiveness === 'hr_vulnerable') {
      arsenalBreakdown += ` POSITION ADVANTAGE: ${positionContext.positionDescription} particularly vulnerable to power in this pitcher matchup.`;
    }
    
    // Strategic edge with vulnerability count
    let strategicEdge = `Plays ${player.matchupType === 'vs_away_pitcher' ? 'at home' : 'on road'} against ${player.pitcher}. `;
    
    if (player.pitcher_vulnerabilities?.length > 0) {
      strategicEdge += `Pitcher shows ${player.pitcher_vulnerabilities.length} positional vulnerabilities (max: ${player.max_vulnerability_score.toFixed(1)}). `;
    }
    
    strategicEdge += `Recent ${player.recent_hr || 0} HR and ${player.expected_ab_per_hr ? player.expected_ab_per_hr.toFixed(0) : 'N/A'} expected AB/HR suggests ${player.ab_since_last_hr || 0} AB since last HR.`;
    
    // Enhanced risk assessment
    let risk = '';
    if (positionContext) {
      if (positionContext.riskLevel === 'low') {
        risk = `LOW RISK: Strong positional advantage with ${positionContext.sampleSize} game sample. Position ${player.tier} with enhanced vulnerability scoring.`;
      } else if (positionContext.riskLevel === 'high') {
        risk = `MODERATE RISK: Limited sample size (${positionContext.sampleSize} games) but strong positional vulnerability indicators.`;
      } else {
        risk = `BALANCED RISK: Moderate sample size with confirmed positional advantages vs ${player.pitcher}.`;
      }
    } else {
      risk = player.compositeScore < 50 ? 
        `Position ${player.tier} shows standard vulnerability (${vulnerabilityScore.toFixed(2)} score)` : 
        `Position ${player.tier} maintains confidence with strong matchup indicators.`;
    }
    
    return {
      weakspotAnalysis,
      arsenalBreakdown,
      strategicEdge,
      risk,
      positionSummary: positionContext ? {
        description: positionContext.positionDescription,
        vulnerabilityScore: positionContext.vulnerabilityScore.toFixed(1),
        strategicValue: positionContext.strategicValue,
        effectiveness: positionContext.effectiveness,
        riskLevel: positionContext.riskLevel
      } : null
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
          <h2>ENHANCED BEST BETS ANALYSIS {propBetMode ? '(EV-OPTIMIZED)' : '(TIER-BASED)'}</h2>
        </div>
        
        <div className="analysis-controls">
          <div className="mode-selector">
            <button
              className={`mode-button ${!propBetMode ? 'active' : ''}`}
              onClick={() => setPropBetMode(false)}
            >
              🏆 Traditional Tiers
            </button>
            <button
              className={`mode-button ${propBetMode ? 'active' : ''}`}
              onClick={() => setPropBetMode(true)}
              disabled={!optimizerInitialized}
              title={!optimizerInitialized ? 'Loading historical validation data...' : 'EV-based recommendations using historical performance'}
            >
              💰 EV-Optimized {optimizerInitialized ? '' : '(Loading...)'}
            </button>
          </div>

          {propBetMode && optimizerInitialized && (
            <div className="prop-type-selector">
              <label>Prop Type:</label>
              <select 
                value={selectedPropType} 
                onChange={(e) => setSelectedPropType(e.target.value)}
              >
                <option value="All">All Props</option>
                <option value="HR">Home Runs</option>
                <option value="Hit">Hits</option>
                <option value="Hits_1.5">Multiple Hits</option>
                <option value="RBI">RBIs</option>
                <option value="Runs">Runs</option>
                <option value="Total_Bases_1.5">Total Bases</option>
              </select>
            </div>
          )}

          <button
            className="validation-button"
            onClick={() => setShowValidationDashboard(true)}
          >
            📈 View Historical Performance
          </button>
        </div>

        <div className="methodology-note">
          {propBetMode ? (
            <div>
              <strong>EV-OPTIMIZED RECOMMENDATIONS</strong>
              <br />
              <span>Using historical validation data to identify profitable betting opportunities with positive expected value</span>
            </div>
          ) : (
            <div>
              <strong>TRADITIONAL TIER ANALYSIS</strong>
              <br />
              <span>Composite scoring system with HR Score (40%), Hit Probability (20%), Confidence (20%), Arsenal Matchup (10%), Contextual (10%)</span>
            </div>
          )}
        </div>
      </div>

      <div className="tier-recommendations">
        <h3>
          {propBetMode 
            ? `EV-OPTIMIZED OPPORTUNITIES (${selectedPropType === 'All' ? 'ALL PROPS' : selectedPropType.toUpperCase()})`
            : 'TIER-BASED RECOMMENDATIONS (TRADITIONAL ANALYSIS)'
          }
        </h3>
        
        {rankedPlayers.map((player, index) => {
          const isEVMode = propBetMode && player.optimizedProp;
          const breakdown = generatePlayerBreakdown(player);
          
          // Different styling based on mode
          let primaryColor, primaryLabel, secondaryInfo;
          
          if (isEVMode) {
            primaryColor = getEVColor(player.optimizedProp.expectedValue);
            primaryLabel = getEVLabel(player.optimizedProp.expectedValue);
            secondaryInfo = {
              ev: formatEV(player.optimizedProp.expectedValue),
              propType: getPropTypeLabel(player.optimizedProp.propType),
              odds: formatOdds(player.optimizedProp.odds.american),
              confidence: Math.round(player.optimizedProp.calibratedConfidence * 100),
              stake: player.optimizedProp.recommendedStake.units
            };
          } else {
            primaryColor = getTierColor(player.tier);
            primaryLabel = player.tier;
            secondaryInfo = {
              stars: getTierStars(player.tier),
              hrScore: player.hr_score,
              hitProbability: player.hit_probability,
              composite: player.compositeScore
            };
          }
          
          return (
            <div 
              key={`${player.player_name}-${index}`}
              className={`player-recommendation ${isEVMode ? 'ev-mode' : player.tier?.toLowerCase().replace(' ', '-')}`}
            >
              <div 
                className="recommendation-header"
                onClick={() => toggleExpanded(index)}
              >
                <div className="position-info">
                  <div className="position-number" style={{ backgroundColor: primaryColor }}>
                    {index + 1}
                  </div>
                  <div className="position-details">
                    <span className="tier-label" style={{ color: primaryColor }}>
                      {primaryLabel}
                    </span>
                    {isEVMode ? (
                      <span className="ev-info">
                        EV: {secondaryInfo.ev} | {secondaryInfo.confidence}% Confidence
                      </span>
                    ) : (
                      <span className="stars">{secondaryInfo.stars}</span>
                    )}
                  </div>
                </div>
                
                <div className="player-matchup">
                  <div className="player-info">
                    <span className="player-name">{player.player_name}</span>
                    <span className="player-team">({player.batterTeam || player.team})</span>
                  </div>
                  {isEVMode ? (
                    <div className="prop-bet-info">
                      <span className="prop-type">{secondaryInfo.propType}</span>
                      <span className="odds">{secondaryInfo.odds}</span>
                    </div>
                  ) : (
                    <>
                      <div className="vs-indicator">vs</div>
                      <div className="pitcher-info">
                        <span className="pitcher-name">{player.pitcher}</span>
                        <span className="pitcher-team">({player.pitcherTeam})</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="key-metrics">
                  {isEVMode ? (
                    <>
                      <div className="metric">
                        <span className="metric-value">{secondaryInfo.ev}</span>
                        <span className="metric-label">Expected Value</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{secondaryInfo.stake}u</span>
                        <span className="metric-label">Rec. Stake</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{player.optimizedProp.riskLevel}</span>
                        <span className="metric-label">Risk Level</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="metric">
                        <span className="metric-value">{formatNumber(secondaryInfo.hrScore)}</span>
                        <span className="metric-label">HR Score</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{formatPercentage(secondaryInfo.hitProbability)}</span>
                        <span className="metric-label">Hit Prob</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{formatNumber(secondaryInfo.composite)}</span>
                        <span className="metric-label">Composite</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="expand-indicator">
                  {expandedPlayer === index ? '▲' : '▼'}
                </div>
              </div>

              {expandedPlayer === index && (
                <div className="recommendation-breakdown">
                  {isEVMode ? (
                    <>
                      <div className="breakdown-section">
                        <h4>Betting Recommendation:</h4>
                        <p>{player.optimizedProp.reasoning}</p>
                      </div>
                      
                      <div className="breakdown-section">
                        <h4>Expected Value Analysis:</h4>
                        <p>
                          This bet has an expected value of {formatEV(player.optimizedProp.expectedValue)} based on historical 
                          calibration. The calibrated win probability is {Math.round(player.optimizedProp.calibratedConfidence * 100)}% 
                          compared to implied odds of {Math.round(player.optimizedProp.odds.implied * 100)}%.
                        </p>
                      </div>
                      
                      <div className="breakdown-section">
                        <h4>Risk Management:</h4>
                        <p>
                          Recommended stake: {player.optimizedProp.recommendedStake.units} units 
                          ({player.optimizedProp.recommendedStake.percentage}% of bankroll) - {player.optimizedProp.recommendedStake.description} risk.
                          Risk level: {player.optimizedProp.riskLevel}.
                        </p>
                      </div>

                      {player.alternativeProps && player.alternativeProps.length > 0 && (
                        <div className="breakdown-section">
                          <h4>Alternative Props:</h4>
                          <div className="alternative-props">
                            {player.alternativeProps.map((altProp, altIndex) => (
                              <div key={altIndex} className="alt-prop">
                                {getPropTypeLabel(altProp.propType)}: EV {formatEV(altProp.expectedValue)} 
                                ({altProp.odds.american})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="detailed-metrics">
                        <div className="metrics-grid">
                          <div className="metric-detail">
                            <span className="label">Raw Confidence:</span>
                            <span className="value">{Math.round(player.optimizedProp.rawConfidence)}%</span>
                          </div>
                          <div className="metric-detail">
                            <span className="label">Calibrated Confidence:</span>
                            <span className="value">{Math.round(player.optimizedProp.calibratedConfidence * 100)}%</span>
                          </div>
                          <div className="metric-detail">
                            <span className="label">Kelly %:</span>
                            <span className="value">{(player.optimizedProp.kellyFraction * 100).toFixed(2)}%</span>
                          </div>
                          <div className="metric-detail">
                            <span className="label">Confidence Level:</span>
                            <span className="value">{player.optimizedProp.confidence}</span>
                          </div>
                          <div className="metric-detail">
                            <span className="label">Venue:</span>
                            <span className="value">{player.venue || 'TBD'}</span>
                          </div>
                          <div className="metric-detail">
                            <span className="label">Viable Props:</span>
                            <span className="value">{player.totalViableProps || 1}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="breakdown-section">
                        <h4>Weakspot Analysis:</h4>
                        <p>{breakdown.weakspotAnalysis}</p>
                      </div>
                      
                      <div className="breakdown-section">
                        <h4>Arsenal Breakdown:</h4>
                        <p>{breakdown.arsenalBreakdown}</p>
                        
                        {/* Detailed Arsenal Component */}
                        {player.details?.arsenal_analysis && (
                          <>
                            <ArsenalBettingInsights 
                              arsenalAnalysis={player.details.arsenal_analysis}
                              player={player.player_name}
                              pitcher={player.pitcher}
                            />
                            <ArsenalMatchupBreakdown 
                              arsenalAnalysis={player.details.arsenal_analysis}
                              playerName={player.player_name}
                              pitcherName={player.pitcher}
                            />
                          </>
                        )}
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

                      {breakdown.positionSummary && (
                        <div className="position-summary">
                          <h4>Position Vulnerability Summary:</h4>
                          <div className="position-summary-grid">
                            <div className="position-summary-item">
                              <span className="label">Position:</span>
                              <span className="value">{breakdown.positionSummary.description}</span>
                            </div>
                            <div className="position-summary-item">
                              <span className="label">Vulnerability:</span>
                              <span className="value">{breakdown.positionSummary.vulnerabilityScore}</span>
                            </div>
                            <div className="position-summary-item">
                              <span className="label">Strategic Value:</span>
                              <span className="value">{breakdown.positionSummary.strategicValue.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <div className="position-summary-item">
                              <span className="label">Effectiveness:</span>
                              <span className="value">{breakdown.positionSummary.effectiveness.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <div className="position-summary-item">
                              <span className="label">Risk Level:</span>
                              <span className="value">{breakdown.positionSummary.riskLevel.toUpperCase()}</span>
                            </div>
                          </div>
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
                          {player.position_bonus > 0 && (
                            <div className="metric-detail enhanced">
                              <span className="label">Position Bonus:</span>
                              <span className="value enhanced">+{formatNumber(player.position_bonus)}</span>
                            </div>
                          )}
                          {player.position_context && (
                            <div className="metric-detail enhanced">
                              <span className="label">Position Vulnerability:</span>
                              <span className="value enhanced">{player.position_context.vulnerabilityScore.toFixed(1)}</span>
                            </div>
                          )}
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
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="analysis-summary">
        <div className="summary-stats">
          {propBetMode && optimizedOpportunities.length > 0 ? (
            <>
              <div className="stat-item">
                <span className="stat-value">{rankedPlayers.filter(p => p.optimizedProp?.expectedValue >= 0.2).length}</span>
                <span className="stat-label">High EV Bets</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{rankedPlayers.filter(p => p.optimizedProp?.riskLevel === 'Low').length}</span>
                <span className="stat-label">Low Risk</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{rankedPlayers.filter(p => p.totalViableProps >= 3).length}</span>
                <span className="stat-label">Multi-Prop</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {rankedPlayers.length > 0 
                    ? (rankedPlayers.reduce((sum, p) => sum + (p.optimizedProp?.expectedValue || 0), 0) / rankedPlayers.length).toFixed(3)
                    : '0.000'
                  }
                </span>
                <span className="stat-label">Avg EV</span>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {propBetMode && optimizerInitialized && (
          <div className="ev-summary">
            <div className="optimizer-status">
              <span className="status-indicator">✅</span>
              <span>Prop Bet Optimizer Active</span>
              <span className="validation-summary">
                {propBetOptimizer.getValidationSummary() 
                  ? `(${propBetOptimizer.getValidationSummary().summary?.totalBets || 0} historical bets analyzed)` 
                  : '(Using default calibration)'
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Historical Validation Dashboard */}
      <HistoricalValidationDashboard 
        isVisible={showValidationDashboard}
        onClose={() => setShowValidationDashboard(false)}
      />
    </div>
  );
};

export default BestBetsAnalysis;