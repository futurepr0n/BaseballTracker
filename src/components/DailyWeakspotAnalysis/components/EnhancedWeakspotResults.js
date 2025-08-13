import React, { useState, useMemo } from 'react';
import { 
  formatPercentage, 
  formatNumber, 
  formatSampleSize,
  formatABSinceHR,
  getConfidenceClass,
  getHRScoreClass,
  groupOpportunitiesByPitcher,
  normalizePercentage
} from '../utils/dataFormatting';
import { generateOpportunityReasoning, formatReasoningForDisplay } from '../services/reasoningGenerator';
import './EnhancedWeakspotResults.css';

const EnhancedWeakspotResults = ({ analysis, opportunities, loading, enhanced }) => {
  const [expandedPitcher, setExpandedPitcher] = useState(null);
  const [expandedOpportunity, setExpandedOpportunity] = useState(null);
  const [filterBy, setFilterBy] = useState('all');
  const [viewMode, setViewMode] = useState('comprehensive');

  // Debug logging
  console.log('🎯 ENHANCED WEAKSPOT RESULTS:', { 
    analysis: !!analysis, 
    opportunities: opportunities?.length || 0, 
    loading, 
    enhanced 
  });
  console.log('🎯 ANALYSIS STRUCTURE:', analysis);
  console.log('🎯 ANALYSIS KEYS:', analysis ? Object.keys(analysis) : 'No analysis');
  
  if (analysis) {
    console.log('🎯 HAS MATCHUP_ANALYSIS:', !!analysis.matchup_analysis);
    console.log('🎯 HAS DIRECT PITCHER ANALYSIS:', !!analysis.away_pitcher_analysis, !!analysis.home_pitcher_analysis);
    
    if (analysis.matchup_analysis) {
      console.log('🎯 MATCHUP_ANALYSIS KEYS:', Object.keys(analysis.matchup_analysis));
      Object.entries(analysis.matchup_analysis).forEach(([key, matchup]) => {
        console.log(`🎯 MATCHUP ${key}:`, {
          has_away: !!matchup.away_pitcher_analysis,
          has_home: !!matchup.home_pitcher_analysis,
          away_pitcher: matchup.away_pitcher_analysis?.pitcher_name,
          home_pitcher: matchup.home_pitcher_analysis?.pitcher_name
        });
      });
    }
    
    if (analysis.away_pitcher_analysis || analysis.home_pitcher_analysis) {
      console.log('🎯 DIRECT PITCHER DATA:', {
        away_pitcher: analysis.away_pitcher_analysis?.pitcher_name,
        home_pitcher: analysis.home_pitcher_analysis?.pitcher_name,
        away_games_analyzed: analysis.away_pitcher_analysis?.games_analyzed,
        home_games_analyzed: analysis.home_pitcher_analysis?.games_analyzed
      });
    }
  }

  // Process comprehensive analysis data
  const processedAnalysis = useMemo(() => {
    if (!analysis) {
      console.log('🎯 No analysis data available');
      return null;
    }

    console.log('🎯 Processing analysis data:', analysis);

    const processed = {
      tier1_targets: [],
      tier2_targets: [],
      tier3_targets: [],
      actionable_strategies: [],
      pitcher_analyses: []
    };

    try {

    // Process each matchup analysis
    // Handle both single matchup and multiple matchup formats
    if (analysis.matchup_analysis) {
      console.log('🎯 PROCESSING MATCHUP_ANALYSIS FORMAT');
      Object.values(analysis.matchup_analysis).forEach((matchup, index) => {
        console.log(`🎯 Processing matchup ${index}:`, matchup);
        if (matchup.away_pitcher_analysis) {
          console.log('🎯 Adding away pitcher:', matchup.away_pitcher_analysis.pitcher_name);
          processed.pitcher_analyses.push({
            ...matchup.away_pitcher_analysis,
            opposing_team: matchup.matchup?.home_team || 'Unknown'
          });
        }
        if (matchup.home_pitcher_analysis) {
          console.log('🎯 Adding home pitcher:', matchup.home_pitcher_analysis.pitcher_name);
          processed.pitcher_analyses.push({
            ...matchup.home_pitcher_analysis,
            opposing_team: matchup.matchup?.away_team || 'Unknown'
          });
        }
      });
    } else {
      // Handle direct away/home pitcher analysis format
      console.log('🎯 PROCESSING DIRECT PITCHER ANALYSIS FORMAT');
      if (analysis.away_pitcher_analysis) {
        console.log('🎯 Adding direct away pitcher:', analysis.away_pitcher_analysis.pitcher_name);
        processed.pitcher_analyses.push({
          ...analysis.away_pitcher_analysis,
          opposing_team: 'Home Team'
        });
      }
      if (analysis.home_pitcher_analysis) {
        console.log('🎯 Adding direct home pitcher:', analysis.home_pitcher_analysis.pitcher_name);
        processed.pitcher_analyses.push({
          ...analysis.home_pitcher_analysis,
          opposing_team: 'Away Team'
        });
      }
    }
    
    // FALLBACK: If no pitcher analyses found yet, check if analysis has matchup_analysis at all
    if (processed.pitcher_analyses.length === 0) {
      console.log('🎯 NO PITCHER ANALYSES FOUND - CHECKING FOR FALLBACK METHODS');
      console.log('🎯 Analysis top-level keys:', Object.keys(analysis));
      
      // Check if there's a direct single-matchup structure
      if (analysis.matchup_analysis && Object.keys(analysis.matchup_analysis).length > 0) {
        const firstMatchup = Object.values(analysis.matchup_analysis)[0];
        console.log('🎯 FOUND FIRST MATCHUP:', firstMatchup);
        
        if (firstMatchup && (firstMatchup.away_pitcher_analysis || firstMatchup.home_pitcher_analysis)) {
          if (firstMatchup.away_pitcher_analysis) {
            processed.pitcher_analyses.push({
              ...firstMatchup.away_pitcher_analysis,
              opposing_team: 'Home Team'
            });
          }
          if (firstMatchup.home_pitcher_analysis) {
            processed.pitcher_analyses.push({
              ...firstMatchup.home_pitcher_analysis,
              opposing_team: 'Away Team'
            });
          }
        }
      }
    }
    
    console.log('🎯 TOTAL PITCHER ANALYSES FOUND:', processed.pitcher_analyses.length);
    processed.pitcher_analyses.forEach((pitcher, index) => {
      console.log(`🎯 Pitcher ${index + 1}:`, {
        name: pitcher.pitcher_name,
        games_analyzed: pitcher.games_analyzed,
        has_pitch_vulnerabilities: !!pitcher.pitch_vulnerabilities,
        opposing_team: pitcher.opposing_team
      });
    });

    // Analyze pitchers and create tier classifications
    processed.pitcher_analyses.forEach(pitcherAnalysis => {
      const vulnerabilityScore = calculateOverallVulnerability(pitcherAnalysis);
      const tier = classifyTier(vulnerabilityScore, pitcherAnalysis);
      
      const targetData = {
        pitcher: pitcherAnalysis.pitcher_name,
        vulnerability_score: vulnerabilityScore,
        primary_weaknesses: extractPrimaryWeaknesses(pitcherAnalysis.pitch_vulnerabilities),
        optimal_timing: extractOptimalTiming(pitcherAnalysis.inning_patterns),
        timing_windows: extractTimingWindows(pitcherAnalysis.timing_windows),
        pattern_recognition: extractPatternRecognition(pitcherAnalysis.pattern_recognition),
        sequence_exploits: extractSequenceExploits(pitcherAnalysis),
        position_vulnerabilities: extractPositionVulnerabilities(pitcherAnalysis),
        confidence: calculateConfidence(pitcherAnalysis),
        games_analyzed: pitcherAnalysis.games_analyzed,
        opposing_team: pitcherAnalysis.opposing_team,
        raw_analysis: pitcherAnalysis
      };

      if (tier === 1) processed.tier1_targets.push(targetData);
      else if (tier === 2) processed.tier2_targets.push(targetData);
      else processed.tier3_targets.push(targetData);
    });

    // Generate actionable strategies
    processed.actionable_strategies = generateActionableStrategies(processed);

    console.log('🎯 Processing complete:', processed);
    return processed;
    
    } catch (error) {
      console.error('🚨 Error processing analysis data:', error);
      console.error('🚨 Analysis data that caused error:', analysis);
      // Return safe fallback
      return {
        tier1_targets: [],
        tier2_targets: [],
        tier3_targets: [],
        actionable_strategies: [],
        pitcher_analyses: [],
        error: error.message
      };
    }
  }, [analysis]);

  // Helper functions
  const calculateOverallVulnerability = (pitcherAnalysis) => {
    if (!pitcherAnalysis || !pitcherAnalysis.pitch_vulnerabilities) return 0;
    
    const vulnerabilities = Object.values(pitcherAnalysis.pitch_vulnerabilities);
    if (vulnerabilities.length === 0) return 0;
    
    const avgVulnerability = vulnerabilities.reduce((sum, pitch) => 
      sum + (pitch?.vulnerability_score || 0), 0) / vulnerabilities.length;
    
    return avgVulnerability || 0;
  };

  const classifyTier = (vulnerabilityScore, analysis) => {
    // Enhanced tier classification based on multiple factors
    const hasHighHR = hasHighHRRate(analysis);
    const hasGoodVulns = hasModerateWeaknesses(analysis);
    const positionVulns = extractPositionVulnerabilities(analysis);
    const hasPositionOpportunities = positionVulns.some(pos => pos.vulnerability_score > 15);
    const hasElitePositionOpportunities = positionVulns.some(pos => pos.vulnerability_score > 25);
    
    // Tier 1: Elite opportunities
    if (vulnerabilityScore > 25 || hasHighHR || hasElitePositionOpportunities) {
      return 1;
    }
    
    // Tier 2: Strong opportunities  
    if (vulnerabilityScore > 10 || hasGoodVulns || hasPositionOpportunities) {
      return 2;
    }
    
    // Tier 3: Worth considering (lower threshold for visibility)
    if (vulnerabilityScore > 1 || positionVulns.length > 0) {
      return 3;
    }
    
    return 3; // Default to tier 3
  };

  const hasHighHRRate = (analysis) => {
    if (!analysis.pitch_vulnerabilities) return false;
    return Object.values(analysis.pitch_vulnerabilities).some(pitch => 
      (pitch.hr_rate || 0) > 0.08 // 8%+ HR rate
    );
  };

  const hasModerateWeaknesses = (analysis) => {
    if (!analysis.pitch_vulnerabilities) return false;
    return Object.values(analysis.pitch_vulnerabilities).some(pitch => 
      (pitch.hr_rate || 0) > 0.05 // 5%+ HR rate
    );
  };

  const extractPrimaryWeaknesses = (pitchVulnerabilities) => {
    if (!pitchVulnerabilities) return [];
    
    return Object.entries(pitchVulnerabilities)
      .filter(([_, data]) => (data.vulnerability_score || 0) > 0 || (data.hr_rate || 0) > 0.01) // Lower threshold for better visibility
      .map(([type, data]) => ({
        type,
        hr_rate: ((data.hr_rate || 0) * 100).toFixed(1),
        vulnerability: (data.vulnerability_score || 0).toFixed(1),
        hit_rate: ((data.hit_rate || 0) * 100).toFixed(1),
        strikeout_rate: ((data.strikeout_rate || 0) * 100).toFixed(1),
        sample_size: data.sample_size || 0
      }))
      .sort((a, b) => parseFloat(b.vulnerability) - parseFloat(a.vulnerability))
      .slice(0, 5); // Show more weaknesses
  };

  const extractOptimalTiming = (inningPatterns) => {
    if (!inningPatterns) return [];
    
    return Object.entries(inningPatterns)
      .filter(([_, data]) => (data.vulnerability_score || 0) > 0) // Lower threshold for better visibility
      .map(([inning, data]) => ({
        inning: inning.replace('inning_', ''),
        vulnerability_score: data.vulnerability_score || 0,
        hr_frequency: data.hr_frequency || 0,
        hit_frequency: data.hit_frequency || 0,
        sample_size: data.sample_size || 0,
        description: `${inning.replace('inning_', '')}${getOrdinalSuffix(inning.replace('inning_', ''))} inning (${(data.vulnerability_score || 0).toFixed(1)} vuln, ${((data.hr_frequency || 0) * 100).toFixed(1)}% HR)`
      }))
      .sort((a, b) => b.vulnerability_score - a.vulnerability_score)
      .slice(0, 3);
  };

  const extractTimingWindows = (timingWindows) => {
    if (!timingWindows) return [];
    
    return Object.entries(timingWindows)
      .map(([range, data]) => ({
        range,
        vulnerability: data.vulnerability_score || 0,
        hit_rate: (data.hit_rate * 100).toFixed(1),
        avg_velocity: data.average_velocity?.toFixed(1) || 0,
        sample_size: data.sample_size || 0
      }))
      .filter(window => window.vulnerability > 10) // Show windows with 10+ vulnerability
      .sort((a, b) => b.vulnerability - a.vulnerability)
      .slice(0, 3);
  };

  const extractPatternRecognition = (patternData) => {
    if (!patternData) return null;
    
    return {
      predictability_score: patternData.predictability_score || 0,
      top_sequences: (patternData.top_sequences || []).slice(0, 5).map(seq => ({
        sequence: seq.sequence,
        frequency: (seq.frequency * 100).toFixed(1),
        success_rate: (seq.success_rate * 100).toFixed(1),
        count: seq.count
      })),
      total_analyzed: patternData.total_sequences_analyzed || 0
    };
  };

  const extractSequenceExploits = (analysis) => {
    const patternRecognition = analysis.pattern_recognition || {};
    const sequences = [];
    
    // Extract predictability information
    const predictability = patternRecognition.predictability_score || 0;
    if (predictability > 0) {
      sequences.push({
        type: 'predictability',
        score: predictability.toFixed(1),
        description: `${predictability.toFixed(1)}% predictable sequences`,
        confidence: predictability > 15 ? 'high' : predictability > 8 ? 'medium' : 'low'
      });
    }
    
    // Extract top sequences if available
    const topSequences = patternRecognition.top_sequences || [];
    topSequences.slice(0, 3).forEach((seq, index) => {
      if (typeof seq === 'object' && seq.sequence) {
        sequences.push({
          type: 'sequence',
          sequence: seq.sequence,
          frequency: seq.count || seq.frequency || 0,
          description: `${seq.sequence} (${seq.count || seq.frequency || 0} times)`
        });
      }
    });
    
    // Extract timing window patterns
    const timingWindows = analysis.timing_windows || {};
    Object.entries(timingWindows)
      .filter(([_, data]) => (data.vulnerability_score || 0) > 10)
      .slice(0, 2)
      .forEach(([window, data]) => {
        sequences.push({
          type: 'timing',
          window: window,
          vulnerability: data.vulnerability_score || 0,
          description: `Pitch ${window}: ${(data.vulnerability_score || 0).toFixed(1)} vulnerability`
        });
      });
    
    return sequences.length > 0 ? sequences : [{
      type: 'info',
      description: 'Pattern analysis processing'
    }];
  };

  const extractPositionVulnerabilities = (analysis) => {
    if (!analysis.position_vulnerabilities) return [];
    
    return Object.entries(analysis.position_vulnerabilities)
      .map(([positionKey, data]) => {
        const positionNumber = parseInt(positionKey.replace('position_', ''));
        return {
          position: positionNumber,
          description: getPositionDescription(positionNumber),
          vulnerability_score: data.vulnerability_score || 0,
          hr_rate: data.hr_rate || 0,
          hit_rate: data.hit_rate || 0,
          sample_size: data.sample_size || 0,
          total_abs: data.total || 0,
          color_class: getVulnerabilityColorClass(data.vulnerability_score || 0),
          strategic_impact: getStrategicImpact(positionNumber, data.vulnerability_score || 0, data.hr_rate || 0)
        };
      })
      .filter(pos => pos.sample_size > 0) // Only show positions with actual data
      .sort((a, b) => b.vulnerability_score - a.vulnerability_score)
      .slice(0, 9); // Show all 9 positions (or up to 9)
  };

  const getPositionDescription = (positionNumber) => {
    const descriptions = {
      1: "Leadoff",
      2: "#2 Hitter",
      3: "#3 Hitter", 
      4: "Cleanup",
      5: "#5 Hitter",
      6: "#6 Hitter",
      7: "#7 Hitter",
      8: "#8 Hitter",
      9: "#9 Hitter"
    };
    return descriptions[positionNumber] || `Position ${positionNumber}`;
  };

  const getVulnerabilityColorClass = (score) => {
    if (score > 20) return 'vulnerability-extreme';
    if (score > 15) return 'vulnerability-high';
    if (score > 10) return 'vulnerability-moderate';
    return 'vulnerability-low';
  };

  const getVulnerabilityIcon = (score) => {
    if (score > 20) return '🔴';
    if (score > 15) return '🟡';
    return '🟢';
  };

  const getPositionVulnerabilityRecommendation = (pitcherName, vulnerabilities) => {
    if (vulnerabilities.length === 0) return null;
    
    const topVulnerability = vulnerabilities[0];
    return `Target ${pitcherName} vs ${topVulnerability.description} (${topVulnerability.vulnerability_score.toFixed(1)} vulnerability, ${(topVulnerability.hr_rate * 100).toFixed(1)}% HR rate)`;
  };

  const calculateConfidence = (analysis) => {
    const gamesAnalyzed = analysis.games_analyzed || 0;
    const dataQuality = gamesAnalyzed >= 10 ? 'HIGH' : gamesAnalyzed >= 5 ? 'MEDIUM' : 'LOW';
    return dataQuality;
  };

  const generateActionableStrategies = (processed) => {
    const strategies = [];
    
    processed.tier1_targets.forEach(target => {
      // Position-based strategies (highest priority)
      if (target.position_vulnerabilities.length > 0) {
        const topPositionVuln = target.position_vulnerabilities[0];
        strategies.push(
          `🎯 Target ${target.pitcher} vs ${topPositionVuln.description} (${topPositionVuln.vulnerability_score.toFixed(1)} vulnerability, ${(topPositionVuln.hr_rate * 100).toFixed(1)}% HR rate)`
        );
      }
      
      // Pitch-based strategies
      if (target.primary_weaknesses.length > 0) {
        const topWeakness = target.primary_weaknesses[0];
        strategies.push(
          `⚡ Attack ${target.pitcher}'s ${topWeakness.type} - ${topWeakness.hr_rate}% HR rate (ELITE PITCH WEAKNESS)`
        );
      }
    });

    processed.tier2_targets.forEach(target => {
      // Position strategies for Tier 2
      if (target.position_vulnerabilities.length > 0) {
        const topPositionVuln = target.position_vulnerabilities[0];
        strategies.push(
          `🔥 Consider ${target.pitcher} vs ${topPositionVuln.description} (${topPositionVuln.vulnerability_score.toFixed(1)} vulnerability)`
        );
      }
      
      // Timing opportunities
      if (target.optimal_timing.length > 0) {
        strategies.push(
          `⏰ Target ${target.pitcher} ${target.optimal_timing[0].split(' ')[0]} (TIMING OPPORTUNITY)`
        );
      }
    });

    return strategies.slice(0, 6);
  };

  const getOrdinalSuffix = (num) => {
    const n = parseInt(num);
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  };

  const getVulnerabilityClass = (score) => {
    if (score > 30) return 'vulnerability-elite';
    if (score > 15) return 'vulnerability-strong'; 
    if (score > 5) return 'vulnerability-moderate';
    return 'vulnerability-low';
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 1: return '🎯';
      case 2: return '🔥'; 
      case 3: return '📊';
      default: return '⚾';
    }
  };

  const getTierLabel = (tier) => {
    switch (tier) {
      case 1: return 'Tier 1: Elite Targets';
      case 2: return 'Tier 2: Strong Opportunities';
      case 3: return 'Tier 3: Considerations';
      default: return 'Analysis';
    }
  };

  const getTierClass = (tier) => {
    switch (tier) {
      case 1: return 'tier-elite';
      case 2: return 'tier-strong';
      case 3: return 'tier-considerations';
      default: return 'tier-default';
    }
  };

  const getStrategicImpact = (positionNumber, vulnerabilityScore, hrRate) => {
    const impact = {
      level: 'low',
      description: '',
      priority: 1
    };
    
    if ([3, 4, 5].includes(positionNumber)) {
      impact.level = vulnerabilityScore > 15 ? 'elite' : vulnerabilityScore > 8 ? 'high' : 'medium';
      impact.description = `Heart of order vulnerability - ${getPositionDescription(positionNumber)}`;
      impact.priority = vulnerabilityScore > 15 ? 5 : vulnerabilityScore > 8 ? 4 : 3;
    } else if (positionNumber === 1) {
      impact.level = vulnerabilityScore > 12 ? 'high' : vulnerabilityScore > 6 ? 'medium' : 'low';
      impact.description = 'Leadoff table-setter weakness';
      impact.priority = vulnerabilityScore > 12 ? 4 : 2;
    } else if ([7, 8, 9].includes(positionNumber)) {
      impact.level = vulnerabilityScore > 20 ? 'high' : vulnerabilityScore > 10 ? 'medium' : 'low';
      impact.description = 'Bottom order opportunity';
      impact.priority = vulnerabilityScore > 20 ? 3 : 1;
    } else {
      impact.level = vulnerabilityScore > 10 ? 'medium' : 'low';
      impact.description = `${getPositionDescription(positionNumber)} weakness`;
      impact.priority = vulnerabilityScore > 10 ? 2 : 1;
    }
    
    if (hrRate > 0.08) { // 8%+ HR rate is significant
      impact.level = impact.level === 'low' ? 'medium' : impact.level === 'medium' ? 'high' : 'elite';
      impact.priority += 1;
    }
    
    return impact;
  };

  // Loading state
  if (loading) {
    return (
      <div className="enhanced-weakspot-results loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3>Analyzing Weakspots...</h3>
          <p>Running comprehensive pitcher analysis and opportunity detection</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!analysis) {
    return (
      <div className="enhanced-weakspot-results empty">
        <div className="empty-content">
          <span className="empty-icon">🎯</span>
          <h3>No Analysis Results</h3>
          <p>Run the analysis to see weakspot opportunities and strategic insights</p>
        </div>
      </div>
    );
  }

  // No meaningful opportunities state
  if (!processedAnalysis || (
    processedAnalysis.tier1_targets.length === 0 && 
    processedAnalysis.tier2_targets.length === 0 && 
    processedAnalysis.tier3_targets.length === 0
  )) {
    return (
      <div className="enhanced-weakspot-results empty">
        <div className="empty-content">
          <span className="empty-icon">🔍</span>
          <h3>Analysis Complete - No High-Value Opportunities Found</h3>
          <p>The comprehensive analysis didn't identify any tier-level weakspot opportunities for today's matchups.</p>
          <div className="analysis-summary">
            <div className="summary-stats">
              <div className="stat">
                <span className="value">{processedAnalysis?.pitcher_analyses?.length || 0}</span>
                <span className="label">Pitchers Analyzed</span>
              </div>
              <div className="stat">
                <span className="value">{analysis.successful_analyses || 0}/{analysis.total_matchups || 0}</span>
                <span className="label">Matchups Processed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-weakspot-results">
      <div className="results-header">
        <div className="results-title">
          <h2>Strategic Weakspot Intelligence</h2>
          {enhanced && (
            <span className="enhanced-badge">🚀 API Enhanced</span>
          )}
        </div>
        
        <div className="results-controls">
          <div className="view-mode-control">
            <label>View Mode:</label>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
              <option value="comprehensive">Comprehensive Analysis</option>
              <option value="tiers">Tier Breakdown</option>
              <option value="strategies">Action Items</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actionable Strategies Section */}
      {processedAnalysis.actionable_strategies.length > 0 && (
        <div className="actionable-strategies">
          <h3>🎯 Key Action Items</h3>
          <div className="strategies-list">
            {processedAnalysis.actionable_strategies.map((strategy, index) => (
              <div key={index} className="strategy-item">
                <span className="strategy-number">#{index + 1}</span>
                <span className="strategy-text">{strategy}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Analysis */}
      {viewMode === 'comprehensive' || viewMode === 'tiers' ? (
        <div className="tier-analysis">
          {[1, 2, 3].map(tier => {
            const targets = tier === 1 ? processedAnalysis.tier1_targets :
                          tier === 2 ? processedAnalysis.tier2_targets :
                          processedAnalysis.tier3_targets;
            
            if (targets.length === 0) return null;

            return (
              <div key={tier} className={`tier-section ${getTierClass(tier)}`}>
                <div className="tier-header">
                  <span className="tier-icon">{getTierIcon(tier)}</span>
                  <h3>{getTierLabel(tier)}</h3>
                  <span className="tier-count">({targets.length})</span>
                </div>
                
                <div className="tier-targets">
                  {targets.map((target, index) => (
                    <div key={index} className="target-card">
                      <div className="target-header">
                        <div className="target-info">
                          <h4>{target.pitcher}</h4>
                          <span className="opposing-team">vs {target.opposing_team}</span>
                        </div>
                        <div className="target-metrics">
                          <div className={`vulnerability-score ${getVulnerabilityClass(target.vulnerability_score)}`}>
                            <span className="value">{target.vulnerability_score.toFixed(1)}</span>
                            <span className="label">Vulnerability</span>
                          </div>
                          <div className="confidence-indicator">
                            <span className={`confidence ${target.confidence.toLowerCase()}`}>
                              {target.confidence}
                            </span>
                            <span className="games">({target.games_analyzed}g)</span>
                          </div>
                        </div>
                      </div>

                      {/* Pitch Vulnerabilities */}
                      {target.primary_weaknesses.length > 0 && (
                        <div className="target-section">
                          <h5>⚡ Pitch Vulnerabilities</h5>
                          <div className="weaknesses-list">
                            {target.primary_weaknesses.map((weakness, idx) => (
                              <div key={idx} className="weakness-item">
                                <div className="weakness-header">
                                  <span className="pitch-type">{weakness.type}</span>
                                  <div className="weakness-stats">
                                    <span className="hr-rate">{weakness.hr_rate}% HR</span>
                                    <span className="hit-rate">{weakness.hit_rate}% Hit</span>
                                    <span className="k-rate">{weakness.strikeout_rate}% K</span>
                                  </div>
                                </div>
                                <div className="weakness-details">
                                  <span className="vulnerability-score">{weakness.vulnerability} vulnerability</span>
                                  <span className="sample-info">({weakness.sample_size} pitches)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timing Windows - Innings */}
                      {target.optimal_timing && target.optimal_timing.length > 0 && (
                        <div className="target-section">
                          <h5>🕐 Timing Windows - Innings</h5>
                          <div className="timing-list">
                            {target.optimal_timing.map((timing, idx) => (
                              <div key={idx} className="timing-item">
                                <div className="timing-header">
                                  <span className="inning-number">Inning {timing.inning}</span>
                                  <span className={`timing-vulnerability ${parseFloat(timing.vulnerability) > 15 ? 'high' : 'moderate'}`}>
                                    {timing.vulnerability}% vuln
                                  </span>
                                </div>
                                <div className="timing-stats">
                                  <span className="hr-freq">{timing.hr_frequency}% HR</span>
                                  <span className="hit-freq">{timing.hit_frequency}% Hit</span>
                                  <span className="sample-size">({timing.sample_size} AB)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timing Windows - Pitch Counts */}
                      {target.timing_windows && target.timing_windows.length > 0 && (
                        <div className="target-section">
                          <h5>📊 Timing Windows - Pitch Counts</h5>
                          <div className="pitch-count-windows">
                            {target.timing_windows.map((window, idx) => (
                              <div key={idx} className="pitch-count-item">
                                <div className="window-header">
                                  <span className="pitch-range">Pitches {window.range}</span>
                                  <span className={`window-vulnerability ${window.vulnerability > 20 ? 'high' : window.vulnerability > 15 ? 'moderate' : 'low'}`}>
                                    {window.vulnerability.toFixed(1)}% vuln
                                  </span>
                                </div>
                                <div className="window-stats">
                                  <span className="hit-rate">{window.hit_rate}% Hit</span>
                                  <span className="velocity">~{window.avg_velocity} mph</span>
                                  <span className="sample">({window.sample_size} pitches)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pattern Recognition */}
                      {target.pattern_recognition && target.pattern_recognition.predictability_score > 0 && (
                        <div className="target-section">
                          <h5>🔍 Pattern Recognition</h5>
                          <div className="pattern-content">
                            {/* Predictability Score */}
                            <div className="predictability-section">
                              <div className={`predictability-badge ${target.pattern_recognition.predictability_score > 70 ? 'high' : target.pattern_recognition.predictability_score > 40 ? 'medium' : 'low'}`}>
                                <span className="predictability-label">Predictability Score:</span>
                                <span className="predictability-value">{target.pattern_recognition.predictability_score}%</span>
                              </div>
                              <div className="sequences-analyzed">
                                <span>{target.pattern_recognition.total_analyzed} sequences analyzed</span>
                              </div>
                            </div>
                            
                            {/* Top Sequences */}
                            {target.pattern_recognition.top_sequences && target.pattern_recognition.top_sequences.length > 0 && (
                              <div className="sequences-section">
                                <h6>Most Predictable Sequences:</h6>
                                <div className="sequences-list">
                                  {target.pattern_recognition.top_sequences.map((seq, idx) => (
                                    <div key={idx} className="sequence-item">
                                      <span className="sequence-pattern">{seq.sequence}</span>
                                      <div className="sequence-stats">
                                        <span className="frequency">{seq.frequency}% freq</span>
                                        <span className="success">{seq.success_rate}% success</span>
                                        <span className="count">({seq.count} times)</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Positional Weaknesses */}
                      {target.position_vulnerabilities && target.position_vulnerabilities.length > 0 && (
                        <div className="target-section">
                          <h5>🎯 Positional Weaknesses</h5>
                          <div className="position-vulnerabilities">
                            {target.position_vulnerabilities.map((pos, idx) => (
                              <div key={idx} className={`position-vulnerability ${pos.color_class}`}>
                                <div className="position-header">
                                  <div className="position-identifier">
                                    <span className="position-number">#{pos.position}</span>
                                    <span className="position-name">{pos.description}</span>
                                    <span className={`impact-badge impact-${pos.strategic_impact?.level || 'low'}`}>
                                      {getVulnerabilityIcon(pos.vulnerability_score)}
                                    </span>
                                  </div>
                                  <div className="position-priority">
                                    <span className="priority-stars">{'★'.repeat(pos.strategic_impact?.priority || 1)}</span>
                                  </div>
                                </div>
                                <div className="position-metrics">
                                  <div className="metric-group">
                                    <span className="metric-value">{pos.vulnerability_score.toFixed(1)}</span>
                                    <span className="metric-label">Vulnerability</span>
                                  </div>
                                  <div className="metric-group">
                                    <span className="metric-value">{(pos.hr_rate * 100).toFixed(1)}%</span>
                                    <span className="metric-label">HR Rate</span>
                                  </div>
                                  <div className="metric-group">
                                    <span className="metric-value">{(pos.hit_rate * 100).toFixed(1)}%</span>
                                    <span className="metric-label">Hit Rate</span>
                                  </div>
                                  <div className="metric-group">
                                    <span className="metric-value">{pos.sample_size}</span>
                                    <span className="metric-label">AB</span>
                                  </div>
                                </div>
                                <div className="strategic-context">
                                  <span className="context-description">{pos.strategic_impact?.description || 'Standard batting position'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          {target.position_vulnerabilities.length > 0 && (
                            <div className="position-recommendation">
                              <strong>Top Strategic Focus:</strong> {getPositionVulnerabilityRecommendation(target.pitcher, target.position_vulnerabilities)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expandable Details */}
                      <div className="target-actions">
                        <button 
                          className="expand-button"
                          onClick={() => setExpandedPitcher(
                            expandedPitcher === `${target.pitcher}-${index}` ? 
                            null : `${target.pitcher}-${index}`
                          )}
                        >
                          {expandedPitcher === `${target.pitcher}-${index}` ? 'Hide Details' : 'Show Details'}
                        </button>
                      </div>

                      {/* Expanded Details */}
                      {expandedPitcher === `${target.pitcher}-${index}` && (
                        <div className="target-details">
                          <div className="details-grid">
                            {/* Pitch Breakdown */}
                            {target.raw_analysis.pitch_vulnerabilities && (
                              <div className="detail-section">
                                <h6>Pitch-by-Pitch Analysis</h6>
                                <div className="pitch-breakdown">
                                  {Object.entries(target.raw_analysis.pitch_vulnerabilities).map(([pitch, data]) => (
                                    <div key={pitch} className="pitch-detail">
                                      <span className="pitch-name">{pitch}</span>
                                      <div className="pitch-stats">
                                        <span>HR: {((data.hr_rate || 0) * 100).toFixed(1)}%</span>
                                        <span>Hit: {((data.hit_rate || 0) * 100).toFixed(1)}%</span>
                                        <span>K: {((data.strikeout_rate || 0) * 100).toFixed(1)}%</span>
                                        <span>({data.sample_size} pitches)</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Inning Patterns */}
                            {target.raw_analysis.inning_patterns && (
                              <div className="detail-section">
                                <h6>Inning-by-Inning Breakdown</h6>
                                <div className="inning-breakdown">
                                  {Object.entries(target.raw_analysis.inning_patterns).map(([inning, data]) => (
                                    <div key={inning} className="inning-detail">
                                      <span className="inning-name">{inning.replace('inning_', 'Inn ')}</span>
                                      <div className="inning-stats">
                                        <span>HR: {((data.hr_frequency || 0) * 100).toFixed(1)}%</span>
                                        <span>Vuln: {(data.vulnerability_score || 0).toFixed(1)}%</span>
                                        <span>({data.sample_size} AB)</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Position Vulnerabilities Detailed Breakdown */}
                            {target.raw_analysis.position_vulnerabilities && (
                              <div className="detail-section">
                                <h6>Complete Position Analysis</h6>
                                <div className="position-detailed-breakdown">
                                  {Object.entries(target.raw_analysis.position_vulnerabilities)
                                    .sort(([,a], [,b]) => (b.vulnerability_score || 0) - (a.vulnerability_score || 0))
                                    .map(([positionKey, data]) => {
                                      const positionNumber = parseInt(positionKey.replace('position_', ''));
                                      return (
                                        <div key={positionKey} className="position-detailed-row">
                                          <div className="position-header">
                                            <span className="position-number">#{positionNumber}</span>
                                            <span className="position-label">{getPositionDescription(positionNumber)}</span>
                                            <span className={`vulnerability-badge ${getVulnerabilityColorClass(data.vulnerability_score || 0)}`}>
                                              {getVulnerabilityIcon(data.vulnerability_score || 0)}
                                            </span>
                                          </div>
                                          <div className="position-metrics">
                                            <div className="metric">
                                              <span className="metric-label">Vulnerability</span>
                                              <span className="metric-value">{(data.vulnerability_score || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="metric">
                                              <span className="metric-label">HR Rate</span>
                                              <span className="metric-value">{((data.hr_rate || 0) * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="metric">
                                              <span className="metric-label">Hit Rate</span>
                                              <span className="metric-value">{((data.hit_rate || 0) * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="metric">
                                              <span className="metric-label">Sample</span>
                                              <span className="metric-value">{data.sample_size || 0} AB</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Footer */}
      <div className="analysis-footer">
        <div className="analysis-metadata">
          <span>Analysis generated: {new Date(analysis.generated_at).toLocaleString('en-US')}</span>
          <span>•</span>
          <span>Successful analyses: {analysis.successful_analyses}/{analysis.total_matchups}</span>
          {enhanced && (
            <>
              <span>•</span>
              <span>Enhanced with Baseball API</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedWeakspotResults;