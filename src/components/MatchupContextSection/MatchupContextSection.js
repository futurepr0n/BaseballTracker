import React, { useState, useMemo, useEffect } from 'react';
import realTeamTrendsService from '../../services/realTeamTrendsService';
import './MatchupContextSection.css';

/**
 * MatchupContextSection Component
 * 
 * Displays real contextual analysis tables showing:
 * - Target opportunities with clear reasoning
 * - Players to avoid with risk factors
 * - REAL team trends (last 5 games performance, hits/HR droughts, key players)
 * - Pitcher vulnerability analysis
 * - Hot/cold streak information based on actual game data
 */
const MatchupContextSection = ({ predictions, analysisResults }) => {
  const [activeSection, setActiveSection] = useState('targets');
  const [teamTrendsData, setTeamTrendsData] = useState({});
  const [loadingTeamTrends, setLoadingTeamTrends] = useState(false);

  // Get unique teams from predictions
  const uniqueTeams = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    const teams = [...new Set(predictions.map(p => p.team))];
    return teams.filter(team => team && team.length === 3);
  }, [predictions]);

  // Load real team trends data
  useEffect(() => {
    const loadTeamTrends = async () => {
      if (uniqueTeams.length === 0) return;
      
      setLoadingTeamTrends(true);
      const trendsData = {};
      
      try {
        // Load trends for all teams in parallel
        const trendPromises = uniqueTeams.map(async (team) => {
          try {
            const trends = await realTeamTrendsService.getRealTeamTrends(team, 7);
            return { team, trends };
          } catch (error) {
            console.error(`Failed to load trends for ${team}:`, error);
            return { team, trends: null };
          }
        });

        const results = await Promise.all(trendPromises);
        results.forEach(({ team, trends }) => {
          if (trends) {
            trendsData[team] = trends;
          }
        });

        setTeamTrendsData(trendsData);
      } catch (error) {
        console.error('Error loading team trends:', error);
      } finally {
        setLoadingTeamTrends(false);
      }
    };

    loadTeamTrends();
  }, [uniqueTeams]);

  // Process predictions for contextual analysis
  const contextAnalysis = useMemo(() => {
    if (!predictions || predictions.length === 0) return null;

    const analysis = {
      targets: [],
      avoids: [],
      hotStreaks: [],
      coldStreaks: [],
      pitcherVulnerability: {}
    };

    // Analyze each prediction
    predictions.forEach(prediction => {
      const context = prediction.dashboard_context || {};
      const badges = context.badges || [];
      const hrScore = prediction.hr_score || 0;
      const hrProb = prediction.hr_probability || 0;
      const hitProb = prediction.hit_probability || 0;
      const recentAvg = prediction.recent_avg || 0;

      // TARGET ANALYSIS
      let targetScore = 0;
      const targetReasons = [];

      // Hot streak detection
      const hasHotStreak = badges.some(badge => 
        badge.includes('🔥') || badge.includes('Hot Streak') || badge.includes('Active Streak')
      );
      if (hasHotStreak) {
        targetScore += 20;
        targetReasons.push('Hot Streak');
      }

      // High probability
      if (hrProb >= 10) {
        targetScore += 25;
        targetReasons.push(`High HR% (${hrProb.toFixed(1)}%)`);
      } else if (hrProb >= 7) {
        targetScore += 15;
        targetReasons.push(`Good HR% (${hrProb.toFixed(1)}%)`);
      }

      // Due factors
      if (badges.some(badge => badge.includes('⚡') && badge.includes('Due'))) {
        targetScore += 15;
        targetReasons.push('Due for HR');
      }

      // Stadium boost
      if (badges.some(badge => badge.includes('🚀') || badge.includes('Launch Pad'))) {
        targetScore += 12;
        targetReasons.push('Stadium Boost');
      }

      // Weather boost
      if (badges.some(badge => badge.includes('🌪️') || badge.includes('💨'))) {
        targetScore += 10;
        targetReasons.push('Wind Boost');
      }

      // Recent form
      if (recentAvg >= 0.300) {
        targetScore += 10;
        targetReasons.push(`Hot Bat (.${(recentAvg * 1000).toFixed(0)})`);
      }

      // Add to targets if significant
      if (targetScore >= 30) {
        analysis.targets.push({
          player: prediction.player_name,
          team: prediction.team,
          targetScore,
          hrScore,
          hrProb,
          hitProb,
          reasons: targetReasons,
          confidence: Math.min(95, targetScore + (context.confidence_boost || 0))
        });
      }

      // AVOID ANALYSIS
      let riskScore = 0;
      const riskReasons = [];

      // Cold streak detection
      if (badges.some(badge => badge.includes('🥶') || badge.includes('Cold') || badge.includes('⚠️'))) {
        riskScore += 20;
        riskReasons.push('Cold Streak');
      }

      // Poor metrics
      if (hrProb < 3 && hitProb < 15) {
        riskScore += 25;
        riskReasons.push('Poor Metrics');
      }

      // Recent struggles
      if (recentAvg < 0.200) {
        riskScore += 15;
        riskReasons.push(`Cold Bat (.${(recentAvg * 1000).toFixed(0)})`);
      }

      // Pitcher-friendly conditions
      if (badges.some(badge => badge.includes('🛡️') || badge.includes('Pitcher'))) {
        riskScore += 12;
        riskReasons.push('Pitcher Friendly');
      }

      // Weather concerns
      if (badges.some(badge => badge.includes('🌬️') && badge.includes('Against'))) {
        riskScore += 10;
        riskReasons.push('Wind Against');
      }

      // Add to avoids if significant risk
      if (riskScore >= 25) {
        analysis.avoids.push({
          player: prediction.player_name,
          team: prediction.team,
          riskScore,
          hrScore,
          hrProb,
          hitProb,
          reasons: riskReasons,
          riskLevel: Math.min(95, riskScore)
        });
      }

      // HOT/COLD STREAK TRACKING
      if (hasHotStreak) {
        analysis.hotStreaks.push({
          player: prediction.player_name,
          team: prediction.team,
          recentAvg,
          hrScore,
          badges: badges.filter(badge => badge.includes('🔥')).join(' ')
        });
      }

      const hasColdStreak = badges.some(badge => 
        badge.includes('🥶') || badge.includes('Cold')
      );
      if (hasColdStreak) {
        analysis.coldStreaks.push({
          player: prediction.player_name,
          team: prediction.team,
          recentAvg,
          hrScore,
          badges: badges.filter(badge => badge.includes('🥶') || badge.includes('Cold')).join(' ')
        });
      }

      // PITCHER VULNERABILITY
      const pitcher = prediction.matchup_pitcher || prediction.pitcher_name;
      if (pitcher) {
        if (!analysis.pitcherVulnerability[pitcher]) {
          analysis.pitcherVulnerability[pitcher] = {
            pitcher,
            battersAnalyzed: 0,
            avgHRScore: 0,
            avgHRProb: 0,
            highThreatCount: 0,
            totalHRScore: 0,
            totalHRProb: 0
          };
        }

        const pitcherData = analysis.pitcherVulnerability[pitcher];
        pitcherData.battersAnalyzed++;
        pitcherData.totalHRScore += hrScore;
        pitcherData.totalHRProb += hrProb;
        if (hrScore >= 70) pitcherData.highThreatCount++;
      }
    });

    // Calculate pitcher averages
    Object.values(analysis.pitcherVulnerability).forEach(pitcher => {
      pitcher.avgHRScore = pitcher.totalHRScore / pitcher.battersAnalyzed;
      pitcher.avgHRProb = pitcher.totalHRProb / pitcher.battersAnalyzed;
      pitcher.threatLevel = pitcher.avgHRScore >= 65 ? 'High' :
                           pitcher.avgHRScore >= 50 ? 'Moderate' :
                           pitcher.avgHRScore <= 35 ? 'Low' : 'Average';
    });

    // Sort arrays
    analysis.targets.sort((a, b) => b.confidence - a.confidence);
    analysis.avoids.sort((a, b) => b.riskLevel - a.riskLevel);
    analysis.hotStreaks.sort((a, b) => b.hrScore - a.hrScore);
    analysis.coldStreaks.sort((a, b) => a.hrScore - b.hrScore);

    return analysis;
  }, [predictions]);

  if (!contextAnalysis) return null;

  const sections = [
    { id: 'targets', label: `🎯 Targets (${contextAnalysis.targets.length})`, data: contextAnalysis.targets },
    { id: 'avoids', label: `⚠️ Avoids (${contextAnalysis.avoids.length})`, data: contextAnalysis.avoids },
    { id: 'hotStreaks', label: `🔥 Hot Streaks (${contextAnalysis.hotStreaks.length})`, data: contextAnalysis.hotStreaks },
    { id: 'teams', label: `📊 Team Trends`, data: Object.values(teamTrendsData) },
    { id: 'pitchers', label: `⚾ Pitcher Intel`, data: Object.values(contextAnalysis.pitcherVulnerability) }
  ];

  return (
    <div className="matchup-context-section">
      <div className="context-header">
        <h3>🎯 Strategic Matchup Context</h3>
        <p>Real team performance analysis, target opportunities, and risk assessment</p>
      </div>

      <div className="context-tabs">
        {sections.map(section => (
          <button
            key={section.id}
            className={`context-tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div className="context-content">
        {activeSection === 'targets' && (
          <div className="targets-table-container">
            <h4>🎯 Prime Target Opportunities</h4>
            {contextAnalysis.targets.length === 0 ? (
              <p className="no-data">No strong target opportunities identified with current criteria.</p>
            ) : (
              <div className="context-table-wrapper">
                <table className="context-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Team</th>
                      <th>HR Score</th>
                      <th>HR Prob</th>
                      <th>Hit Prob</th>
                      <th>Target Score</th>
                      <th>Confidence</th>
                      <th>Reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contextAnalysis.targets.map((target, index) => (
                      <tr key={index} className="target-row">
                        <td className="player-name">{target.player}</td>
                        <td className="team-abbr">{target.team}</td>
                        <td className="hr-score">{target.hrScore.toFixed(1)}</td>
                        <td className="hr-prob">{target.hrProb.toFixed(1)}%</td>
                        <td className="hit-prob">{target.hitProb.toFixed(1)}%</td>
                        <td className="target-score">{target.targetScore}</td>
                        <td className="confidence">{target.confidence}%</td>
                        <td className="reasons">
                          <div className="reason-list">
                            {target.reasons.map((reason, i) => (
                              <span key={i} className="reason-tag">{reason}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'avoids' && (
          <div className="avoids-table-container">
            <h4>⚠️ Players to Avoid</h4>
            {contextAnalysis.avoids.length === 0 ? (
              <p className="no-data">No strong avoid signals identified.</p>
            ) : (
              <div className="context-table-wrapper">
                <table className="context-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Team</th>
                      <th>HR Score</th>
                      <th>HR Prob</th>
                      <th>Hit Prob</th>
                      <th>Risk Score</th>
                      <th>Risk Level</th>
                      <th>Risk Factors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contextAnalysis.avoids.map((avoid, index) => (
                      <tr key={index} className="avoid-row">
                        <td className="player-name">{avoid.player}</td>
                        <td className="team-abbr">{avoid.team}</td>
                        <td className="hr-score">{avoid.hrScore.toFixed(1)}</td>
                        <td className="hr-prob">{avoid.hrProb.toFixed(1)}%</td>
                        <td className="hit-prob">{avoid.hitProb.toFixed(1)}%</td>
                        <td className="risk-score">{avoid.riskScore}</td>
                        <td className="risk-level">{avoid.riskLevel}%</td>
                        <td className="reasons">
                          <div className="reason-list">
                            {avoid.reasons.map((reason, i) => (
                              <span key={i} className="reason-tag risk">{reason}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'hotStreaks' && (
          <div className="hot-streaks-container">
            <h4>🔥 Hot Streak Players</h4>
            {contextAnalysis.hotStreaks.length === 0 ? (
              <p className="no-data">No hot streak players identified.</p>
            ) : (
              <div className="context-table-wrapper">
                <table className="context-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Team</th>
                      <th>Recent Avg</th>
                      <th>HR Score</th>
                      <th>Streak Indicators</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contextAnalysis.hotStreaks.map((streak, index) => (
                      <tr key={index} className="hot-streak-row">
                        <td className="player-name">{streak.player}</td>
                        <td className="team-abbr">{streak.team}</td>
                        <td className="recent-avg">{(streak.recentAvg || 0).toFixed(3)}</td>
                        <td className="hr-score">{streak.hrScore.toFixed(1)}</td>
                        <td className="badges">{streak.badges}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'teams' && (
          <div className="teams-container">
            <h4>📊 Real Team Performance Trends (Last 7 Games)</h4>
            {loadingTeamTrends ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading real team performance data...</p>
              </div>
            ) : Object.keys(teamTrendsData).length === 0 ? (
              <p className="no-data">No team trends data available.</p>
            ) : (
              <div className="context-table-wrapper">
                <table className="context-table teams-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Games</th>
                      <th>Runs/Game</th>
                      <th>Hits/Game</th>
                      <th>HRs/Game</th>
                      <th>Team Avg</th>
                      <th>Momentum</th>
                      <th>Hot Hitters</th>
                      <th>Cold Hitters</th>
                      <th>Key Trends</th>
                      <th>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(teamTrendsData)
                      .sort((a, b) => b.battingTrends.avgRunsPerGame - a.battingTrends.avgRunsPerGame)
                      .map((team, index) => (
                      <tr key={index} className={`team-row ${team.recommendation.action}`}>
                        <td className="team-name">{team.team}</td>
                        <td className="games-count">{team.gamesAnalyzed}</td>
                        <td className="runs-per-game">{team.battingTrends.avgRunsPerGame.toFixed(1)}</td>
                        <td className="hits-per-game">{team.battingTrends.avgHitsPerGame.toFixed(1)}</td>
                        <td className="hrs-per-game">{team.powerTrends.avgHRsPerGame.toFixed(1)}</td>
                        <td className="team-avg">{team.battingTrends.teamAverage.toFixed(3)}</td>
                        <td className={`momentum ${team.momentum.overall}`}>
                          {team.momentum.overall.replace('_', ' ').toUpperCase()}
                        </td>
                        <td className="hot-hitters">
                          {team.keyPlayers.hotHitters.length > 0 ? (
                            <div className="player-list">
                              {team.keyPlayers.hotHitters.slice(0, 3).map((player, i) => (
                                <span key={i} className="player-tag hot">{player.name}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="none">None</span>
                          )}
                        </td>
                        <td className="cold-hitters">
                          {team.keyPlayers.coldHitters.length > 0 ? (
                            <div className="player-list">
                              {team.keyPlayers.coldHitters.slice(0, 3).map((player, i) => (
                                <span key={i} className="player-tag cold">{player.name}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="none">None</span>
                          )}
                        </td>
                        <td className="key-trends">
                          <div className="trend-list">
                            {[...team.battingTrends.keyStats, ...team.powerTrends.keyStats].slice(0, 3).map((stat, i) => (
                              <span key={i} className="trend-tag">{stat}</span>
                            ))}
                          </div>
                        </td>
                        <td className={`recommendation ${team.recommendation.action}`}>
                          <div className="rec-content">
                            <span className="rec-action">{team.recommendation.action.toUpperCase()}</span>
                            <span className="rec-confidence">({(team.recommendation.confidence * 100).toFixed(0)}%)</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'pitchers' && (
          <div className="pitchers-container">
            <h4>⚾ Pitcher Vulnerability Analysis</h4>
            <div className="context-table-wrapper">
              <table className="context-table">
                <thead>
                  <tr>
                    <th>Pitcher</th>
                    <th>Batters Analyzed</th>
                    <th>Avg HR Score</th>
                    <th>Avg HR Prob</th>
                    <th>High Threats</th>
                    <th>Threat Level</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(contextAnalysis.pitcherVulnerability)
                    .sort((a, b) => b.avgHRScore - a.avgHRScore)
                    .map((pitcher, index) => (
                    <tr key={index} className={`pitcher-row ${pitcher.threatLevel.toLowerCase()}`}>
                      <td className="pitcher-name">{pitcher.pitcher}</td>
                      <td className="batter-count">{pitcher.battersAnalyzed}</td>
                      <td className="avg-hr-score">{pitcher.avgHRScore.toFixed(1)}</td>
                      <td className="avg-hr-prob">{pitcher.avgHRProb.toFixed(1)}%</td>
                      <td className="threat-count">{pitcher.highThreatCount}</td>
                      <td className="threat-level">{pitcher.threatLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="context-summary">
        <div className="summary-grid">
          <div className="summary-stat">
            <span className="stat-value target">{contextAnalysis.targets.length}</span>
            <span className="stat-label">Prime Targets</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value avoid">{contextAnalysis.avoids.length}</span>
            <span className="stat-label">Players to Avoid</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value hot">{contextAnalysis.hotStreaks.length}</span>
            <span className="stat-label">Hot Streaks</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value neutral">{Object.keys(teamTrendsData).length}</span>
            <span className="stat-label">Teams Analyzed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchupContextSection;