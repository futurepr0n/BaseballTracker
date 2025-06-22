import React, { useState, useEffect, useMemo } from 'react';
import './MatchupAnalysisWindow.css';

/**
 * MatchupAnalysisWindow Component
 * 
 * Provides comprehensive target/avoid analysis with contextual factors including:
 * - Hot/Cold player streaks
 * - Team offensive trends
 * - Pitcher vulnerability analysis
 * - Stadium and weather context
 * - Strategic recommendations
 */
const MatchupAnalysisWindow = ({ predictions, analysisResults, isOpen, onClose }) => {
  const [selectedTab, setSelectedTab] = useState('targets');
  const [filterOptions, setFilterOptions] = useState({
    minHotStreak: 3,
    minTeamRunsLast10: 4.5,
    minColdGames: 4,
    minPitcherHRRate: 1.0
  });

  // Analysis functions - defined before useMemo to avoid hoisting issues
  const analyzePlayerMatchup = (prediction) => {
    const analysis = {
      isTarget: false,
      isAvoid: false,
      targetReasons: [],
      avoidReasons: [],
      confidence: 0,
      riskLevel: 0,
      riskFactors: []
    };

    // Extract relevant data
    const hrScore = prediction.hr_score || 0;
    const hrProb = prediction.hr_probability || 0;
    const hitProb = prediction.hit_probability || 0;
    const recentAvg = prediction.recent_N_games_raw_data?.trends_summary_obj?.avg_avg || prediction.recent_avg || 0;
    const context = prediction.dashboard_context || {};
    const badges = context.badges || [];

    // TARGET ANALYSIS
    
    // Hot streak indicators
    const hasHotStreak = badges.some(badge => 
      badge.includes('🔥') || badge.includes('Hot Streak') || badge.includes('Active Streak')
    );
    if (hasHotStreak) {
      analysis.targetReasons.push('🔥 Active hot streak');
      analysis.confidence += 15;
    }

    // High HR probability
    if (hrProb >= 12) {
      analysis.targetReasons.push(`⚡ Exceptional HR probability (${hrProb.toFixed(1)}%)`);
      analysis.confidence += 20;
    } else if (hrProb >= 8) {
      analysis.targetReasons.push(`⚡ Strong HR probability (${hrProb.toFixed(1)}%)`);
      analysis.confidence += 12;
    }

    // Due factors
    const isDue = badges.some(badge => badge.includes('⚡') && badge.includes('Due'));
    if (isDue) {
      analysis.targetReasons.push('⚡ Due for home run');
      analysis.confidence += 10;
    }

    // Recent form improvement
    if (recentAvg >= 0.300) {
      analysis.targetReasons.push(`📈 Hot bat (${(recentAvg * 1000).toFixed(0)} avg)`);
      analysis.confidence += 8;
    }

    // Stadium context
    const stadiumBadge = badges.find(badge => 
      badge.includes('🚀') || badge.includes('🏟️') || badge.includes('Launch Pad')
    );
    if (stadiumBadge) {
      analysis.targetReasons.push(`${stadiumBadge}`);
      analysis.confidence += 12;
    }

    // Weather boost
    const weatherBadge = badges.find(badge => 
      badge.includes('🌪️') || badge.includes('💨') || badge.includes('Wind')
    );
    if (weatherBadge) {
      analysis.targetReasons.push(`${weatherBadge}`);
      analysis.confidence += 8;
    }

    // Multi-hit potential
    const multiHitBadge = badges.find(badge => badge.includes('🎯'));
    if (multiHitBadge) {
      analysis.targetReasons.push('🎯 Multi-hit potential');
      analysis.confidence += 6;
    }

    // AVOID ANALYSIS

    // Cold streak indicators
    const hasColdStreak = badges.some(badge => 
      badge.includes('🥶') || badge.includes('Cold') || badge.includes('⚠️')
    );
    if (hasColdStreak) {
      analysis.avoidReasons.push('🥶 Cold streak/poor form');
      analysis.riskLevel += 15;
    }

    // Low performance metrics
    if (hrProb < 3 && hitProb < 15) {
      analysis.avoidReasons.push(`📉 Poor matchup metrics (${hrProb.toFixed(1)}% HR, ${hitProb.toFixed(1)}% Hit)`);
      analysis.riskLevel += 12;
    }

    // Recent struggles
    if (recentAvg < 0.200) {
      analysis.avoidReasons.push(`📉 Recent struggles (${(recentAvg * 1000).toFixed(0)} avg)`);
      analysis.riskLevel += 10;
    }

    // Pitcher-friendly factors
    const pitcherFriendly = badges.some(badge => 
      badge.includes('🛡️') || badge.includes('Pitcher') || badge.includes('Fortress')
    );
    if (pitcherFriendly) {
      analysis.avoidReasons.push('🛡️ Pitcher-friendly conditions');
      analysis.riskLevel += 8;
    }

    // Weather concerns
    const weatherConcern = badges.find(badge => 
      badge.includes('🥶') || badge.includes('🌬️') || badge.includes('Against')
    );
    if (weatherConcern) {
      analysis.avoidReasons.push(`${weatherConcern}`);
      analysis.riskLevel += 6;
    }

    // Risk factors for targets
    if (analysis.confidence > 0) {
      if (hrScore < 50) {
        analysis.riskFactors.push('Low base HR score');
      }
      if (prediction.confidence && prediction.confidence < 0.6) {
        analysis.riskFactors.push('Limited data confidence');
      }
    }

    // Determine if target/avoid
    analysis.isTarget = analysis.confidence >= 25 && analysis.targetReasons.length >= 2;
    analysis.isAvoid = analysis.riskLevel >= 20 && analysis.avoidReasons.length >= 2;

    return analysis;
  };

  const analyzeTeamTrends = (samplePrediction, allPredictions) => {
    const team = samplePrediction.team;
    const teamPredictions = allPredictions.filter(p => p.team === team);
    
    const analysis = {
      team: team,
      playerCount: teamPredictions.length,
      avgHRScore: 0,
      avgHRProb: 0,
      hotPlayers: 0,
      coldPlayers: 0,
      trend: 'neutral',
      recommendation: 'neutral'
    };

    if (teamPredictions.length === 0) return analysis;

    // Calculate averages
    analysis.avgHRScore = teamPredictions.reduce((sum, p) => sum + (p.hr_score || 0), 0) / teamPredictions.length;
    analysis.avgHRProb = teamPredictions.reduce((sum, p) => sum + (p.hr_probability || 0), 0) / teamPredictions.length;

    // Count hot/cold players
    teamPredictions.forEach(p => {
      const badges = p.dashboard_context?.badges || [];
      const hasHot = badges.some(badge => badge.includes('🔥') || badge.includes('Hot'));
      const hasCold = badges.some(badge => badge.includes('🥶') || badge.includes('Cold') || badge.includes('⚠️'));
      
      if (hasHot) analysis.hotPlayers++;
      if (hasCold) analysis.coldPlayers++;
    });

    // Determine trend
    const hotPercentage = (analysis.hotPlayers / analysis.playerCount) * 100;
    const coldPercentage = (analysis.coldPlayers / analysis.playerCount) * 100;

    if (hotPercentage >= 40 || analysis.avgHRScore >= 60) {
      analysis.trend = 'heating_up';
      analysis.recommendation = 'target';
    } else if (coldPercentage >= 40 || analysis.avgHRScore <= 35) {
      analysis.trend = 'cooling_down';
      analysis.recommendation = 'avoid';
    } else if (analysis.avgHRScore >= 50) {
      analysis.trend = 'solid';
      analysis.recommendation = 'consider';
    }

    return analysis;
  };

  const analyzePitcherVulnerability = (pitcherName, allPredictions) => {
    const pitcherPredictions = allPredictions.filter(p => 
      (p.matchup_pitcher || p.pitcher_name) === pitcherName
    );

    const analysis = {
      pitcher: pitcherName,
      batterCount: pitcherPredictions.length,
      avgHRScore: 0,
      highThreatBatters: 0,
      vulnerabilityLevel: 'unknown',
      recommendation: 'neutral'
    };

    if (pitcherPredictions.length === 0) return analysis;

    // Calculate averages and threats
    analysis.avgHRScore = pitcherPredictions.reduce((sum, p) => sum + (p.hr_score || 0), 0) / pitcherPredictions.length;
    analysis.highThreatBatters = pitcherPredictions.filter(p => (p.hr_score || 0) >= 70).length;

    // Determine vulnerability
    if (analysis.avgHRScore >= 65 || analysis.highThreatBatters >= 3) {
      analysis.vulnerabilityLevel = 'high';
      analysis.recommendation = 'target';
    } else if (analysis.avgHRScore >= 50 || analysis.highThreatBatters >= 2) {
      analysis.vulnerabilityLevel = 'moderate';
      analysis.recommendation = 'consider';
    } else if (analysis.avgHRScore <= 35) {
      analysis.vulnerabilityLevel = 'low';
      analysis.recommendation = 'avoid';
    } else {
      analysis.vulnerabilityLevel = 'average';
      analysis.recommendation = 'neutral';
    }

    return analysis;
  };

  // Comprehensive matchup analysis - now using the defined functions
  const analysisData = useMemo(() => {
    if (!predictions || predictions.length === 0) return null;

    const analysis = {
      targets: [],
      avoids: [],
      teamTrends: {},
      pitcherAnalysis: {},
      contextFactors: {}
    };

    // Analyze each prediction for target/avoid factors
    predictions.forEach(prediction => {
      const playerAnalysis = analyzePlayerMatchup(prediction);
      
      if (playerAnalysis.isTarget) {
        analysis.targets.push({
          ...prediction,
          targetReasons: playerAnalysis.targetReasons,
          confidence: playerAnalysis.confidence,
          riskFactors: playerAnalysis.riskFactors
        });
      }
      
      if (playerAnalysis.isAvoid) {
        analysis.avoids.push({
          ...prediction,
          avoidReasons: playerAnalysis.avoidReasons,
          riskLevel: playerAnalysis.riskLevel
        });
      }

      // Aggregate team trends
      const team = prediction.team;
      if (!analysis.teamTrends[team]) {
        analysis.teamTrends[team] = analyzeTeamTrends(prediction, predictions);
      }

      // Aggregate pitcher analysis
      const pitcher = prediction.matchup_pitcher || prediction.pitcher_name;
      if (pitcher && !analysis.pitcherAnalysis[pitcher]) {
        analysis.pitcherAnalysis[pitcher] = analyzePitcherVulnerability(pitcher, predictions);
      }
    });

    // Sort targets and avoids by priority
    analysis.targets.sort((a, b) => b.confidence - a.confidence);
    analysis.avoids.sort((a, b) => b.riskLevel - a.riskLevel);

    return analysis;
  }, [predictions, filterOptions]);

  if (!isOpen || !analysisData) return null;

  return (
    <div className="matchup-analysis-overlay">
      <div className="matchup-analysis-window">
        <div className="analysis-header">
          <h2>🎯 Strategic Matchup Analysis</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="analysis-tabs">
          <button 
            className={selectedTab === 'targets' ? 'active' : ''}
            onClick={() => setSelectedTab('targets')}
          >
            🎯 Targets ({analysisData.targets.length})
          </button>
          <button 
            className={selectedTab === 'avoids' ? 'active' : ''}
            onClick={() => setSelectedTab('avoids')}
          >
            ⚠️ Avoids ({analysisData.avoids.length})
          </button>
          <button 
            className={selectedTab === 'teams' ? 'active' : ''}
            onClick={() => setSelectedTab('teams')}
          >
            📊 Team Trends
          </button>
          <button 
            className={selectedTab === 'pitchers' ? 'active' : ''}
            onClick={() => setSelectedTab('pitchers')}
          >
            ⚾ Pitcher Intel
          </button>
        </div>

        <div className="analysis-content">
          {selectedTab === 'targets' && (
            <div className="targets-section">
              <h3>🎯 Prime Target Opportunities</h3>
              {analysisData.targets.length === 0 ? (
                <p className="no-data">No strong target opportunities identified with current criteria.</p>
              ) : (
                <div className="targets-list">
                  {analysisData.targets.map((target, index) => (
                    <div key={index} className="target-card">
                      <div className="target-header">
                        <h4>{target.player_name} ({target.team})</h4>
                        <div className="confidence-badge">
                          Confidence: {target.confidence}%
                        </div>
                      </div>
                      <div className="target-metrics">
                        <span>HR Score: {(target.hr_score || 0).toFixed(1)}</span>
                        <span>HR Prob: {(target.hr_probability || 0).toFixed(1)}%</span>
                        <span>Hit Prob: {(target.hit_probability || 0).toFixed(1)}%</span>
                      </div>
                      <div className="target-reasons">
                        <h5>Why Target:</h5>
                        <ul>
                          {target.targetReasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                      {target.riskFactors.length > 0 && (
                        <div className="risk-factors">
                          <h5>⚠️ Consider:</h5>
                          <ul>
                            {target.riskFactors.map((risk, i) => (
                              <li key={i}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedTab === 'avoids' && (
            <div className="avoids-section">
              <h3>⚠️ Players to Avoid</h3>
              {analysisData.avoids.length === 0 ? (
                <p className="no-data">No strong avoid signals identified.</p>
              ) : (
                <div className="avoids-list">
                  {analysisData.avoids.map((avoid, index) => (
                    <div key={index} className="avoid-card">
                      <div className="avoid-header">
                        <h4>{avoid.player_name} ({avoid.team})</h4>
                        <div className="risk-badge">
                          Risk Level: {avoid.riskLevel}%
                        </div>
                      </div>
                      <div className="avoid-metrics">
                        <span>HR Score: {(avoid.hr_score || 0).toFixed(1)}</span>
                        <span>HR Prob: {(avoid.hr_probability || 0).toFixed(1)}%</span>
                        <span>Hit Prob: {(avoid.hit_probability || 0).toFixed(1)}%</span>
                      </div>
                      <div className="avoid-reasons">
                        <h5>Why Avoid:</h5>
                        <ul>
                          {avoid.avoidReasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedTab === 'teams' && (
            <div className="teams-section">
              <h3>📊 Team Offensive Trends</h3>
              <div className="teams-grid">
                {Object.values(analysisData.teamTrends).map((team, index) => (
                  <div key={index} className={`team-card ${team.recommendation}`}>
                    <h4>{team.team}</h4>
                    <div className="team-metrics">
                      <div className="metric">
                        <span className="label">Avg HR Score:</span>
                        <span className="value">{team.avgHRScore.toFixed(1)}</span>
                      </div>
                      <div className="metric">
                        <span className="label">Avg HR Prob:</span>
                        <span className="value">{team.avgHRProb.toFixed(1)}%</span>
                      </div>
                      <div className="metric">
                        <span className="label">Hot Players:</span>
                        <span className="value">{team.hotPlayers}/{team.playerCount}</span>
                      </div>
                      <div className="metric">
                        <span className="label">Cold Players:</span>
                        <span className="value">{team.coldPlayers}/{team.playerCount}</span>
                      </div>
                    </div>
                    <div className={`team-trend ${team.trend}`}>
                      Trend: {team.trend.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className={`team-recommendation ${team.recommendation}`}>
                      {team.recommendation.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'pitchers' && (
            <div className="pitchers-section">
              <h3>⚾ Pitcher Vulnerability Intelligence</h3>
              <div className="pitchers-grid">
                {Object.values(analysisData.pitcherAnalysis).map((pitcher, index) => (
                  <div key={index} className={`pitcher-card ${pitcher.recommendation}`}>
                    <h4>{pitcher.pitcher}</h4>
                    <div className="pitcher-metrics">
                      <div className="metric">
                        <span className="label">Avg HR Score vs:</span>
                        <span className="value">{pitcher.avgHRScore.toFixed(1)}</span>
                      </div>
                      <div className="metric">
                        <span className="label">High Threat Batters:</span>
                        <span className="value">{pitcher.highThreatBatters}/{pitcher.batterCount}</span>
                      </div>
                      <div className="metric">
                        <span className="label">Vulnerability:</span>
                        <span className="value">{pitcher.vulnerabilityLevel.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className={`pitcher-recommendation ${pitcher.recommendation}`}>
                      {pitcher.recommendation.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="analysis-summary">
          <div className="summary-stats">
            <div className="stat">
              <span className="label">Total Targets:</span>
              <span className="value target">{analysisData.targets.length}</span>
            </div>
            <div className="stat">
              <span className="label">Total Avoids:</span>
              <span className="value avoid">{analysisData.avoids.length}</span>
            </div>
            <div className="stat">
              <span className="label">Teams Analyzed:</span>
              <span className="value">{Object.keys(analysisData.teamTrends).length}</span>
            </div>
            <div className="stat">
              <span className="label">Pitchers Analyzed:</span>
              <span className="value">{Object.keys(analysisData.pitcherAnalysis).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchupAnalysisWindow;