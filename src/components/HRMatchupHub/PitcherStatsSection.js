import React, { useState } from 'react';
import './PitcherStatsSection.css';

/**
 * Pitcher Stats Section - Comprehensive pitcher analysis and opponent insights
 */
const PitcherStatsSection = ({ gameAnalysis, apiPredictions }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!gameAnalysis) {
    return (
      <div className="pitcher-stats-section no-data">
        <p>No game analysis available</p>
      </div>
    );
  }

  const { pitcher, pitchers, homeTeam, awayTeam, homeTeamAnalysis, awayTeamAnalysis, pitcherIntelligence } = gameAnalysis;

  const renderOverviewTab = () => (
    <div className="overview-content">
      <div className="pitchers-section">
        {/* Home Pitcher */}
        <div className="pitcher-card">
          <div className="pitcher-info">
            <h3>{pitchers?.home?.name || 'TBD'}</h3>
            <div className="pitcher-meta">
              <span className="team-info">Starting for {homeTeam}</span>
              {/* Enhanced pitcher data from intelligence service */}
              {pitcherIntelligence?.homePitcher?.pitcher?.historicalStats ? (
                <>
                  <span className="era">ERA: {pitcherIntelligence.homePitcher.pitcher.historicalStats.seasonStats.era.toFixed(2) || pitchers?.home?.era || 'N/A'}</span>
                  <span className="record">
                    Record: {pitcherIntelligence.homePitcher.pitcher.historicalStats.seasonStats.record.wins}-{pitcherIntelligence.homePitcher.pitcher.historicalStats.seasonStats.record.losses}
                  </span>
                  <span className="throws">Throws: {pitchers?.home?.throws || 'Unknown'}</span>
                  <span className="whip">WHIP: {pitcherIntelligence.homePitcher.pitcher.historicalStats.seasonStats.whip.toFixed(2) || 'N/A'}</span>
                </>
              ) : (
                <>
                  {pitchers?.home?.era !== undefined && <span className="era">ERA: {pitchers.home.era}</span>}
                  {pitchers?.home?.record && (
                    <span className="record">
                      Record: {pitchers.home.record.wins}-{pitchers.home.record.losses}
                    </span>
                  )}
                  {pitchers?.home?.throws && <span className="throws">Throws: {pitchers.home.throws}</span>}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="vs-divider">VS</div>

        {/* Away Pitcher */}
        <div className="pitcher-card">
          <div className="pitcher-info">
            <h3>{pitchers?.away?.name || 'TBD'}</h3>
            <div className="pitcher-meta">
              <span className="team-info">Starting for {awayTeam}</span>
              {/* Enhanced pitcher data from intelligence service */}
              {pitcherIntelligence?.awayPitcher?.pitcher?.historicalStats ? (
                <>
                  <span className="era">ERA: {pitcherIntelligence.awayPitcher.pitcher.historicalStats.seasonStats.era.toFixed(2) || pitchers?.away?.era || 'N/A'}</span>
                  <span className="record">
                    Record: {pitcherIntelligence.awayPitcher.pitcher.historicalStats.seasonStats.record.wins}-{pitcherIntelligence.awayPitcher.pitcher.historicalStats.seasonStats.record.losses}
                  </span>
                  <span className="throws">Throws: {pitchers?.away?.throws || 'Unknown'}</span>
                  <span className="whip">WHIP: {pitcherIntelligence.awayPitcher.pitcher.historicalStats.seasonStats.whip.toFixed(2) || 'N/A'}</span>
                </>
              ) : (
                <>
                  {pitchers?.away?.era !== undefined && <span className="era">ERA: {pitchers.away.era}</span>}
                  {pitchers?.away?.record && (
                    <span className="record">
                      Record: {pitchers.away.record.wins}-{pitchers.away.record.losses}
                    </span>
                  )}
                  {pitchers?.away?.throws && <span className="throws">Throws: {pitchers.away.throws}</span>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
        
      {apiPredictions && (
        <div className="api-summary">
          <div className="predictions-count">
            <span className="count">{apiPredictions.predictions?.length || 0}</span>
            <span className="label">Predictions</span>
          </div>
          <div className="avg-score">
            <span className="score">
              {apiPredictions.predictions?.length > 0 
                ? Math.round(apiPredictions.predictions.reduce((sum, p) => sum + (p.hr_score || 0), 0) / apiPredictions.predictions.length)
                : 'N/A'
              }
            </span>
            <span className="label">Avg HR Score</span>
          </div>
        </div>
      )}

      <div className="matchup-summary">
        <div className="opponents-grid">
          <div className="opponent-section">
            <h4>{awayTeam} Batters (Away)</h4>
            {awayTeamAnalysis ? (
              <div className="team-stats">
                <div className="stat-item">
                  <span className="stat-label">Players Analyzed:</span>
                  <span className="stat-value">{awayTeamAnalysis.totalPlayers}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Team Strength:</span>
                  <span className={`stat-value strength-${awayTeamAnalysis.teamSummary?.teamStrength?.toLowerCase()}`}>
                    {awayTeamAnalysis.teamSummary?.teamStrength || 'Unknown'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Score:</span>
                  <span className="stat-value">{awayTeamAnalysis.teamSummary?.averageScore || 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">High Confidence:</span>
                  <span className="stat-value">{awayTeamAnalysis.teamSummary?.highConfidencePlayers || 0}</span>
                </div>
              </div>
            ) : (
              <div className="no-analysis">No away team analysis available</div>
            )}
          </div>

          <div className="vs-divider">VS</div>

          <div className="opponent-section">
            <h4>{homeTeam} Batters (Home)</h4>
            {homeTeamAnalysis ? (
              <div className="team-stats">
                <div className="stat-item">
                  <span className="stat-label">Players Analyzed:</span>
                  <span className="stat-value">{homeTeamAnalysis.totalPlayers}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Team Strength:</span>
                  <span className={`stat-value strength-${homeTeamAnalysis.teamSummary?.teamStrength?.toLowerCase()}`}>
                    {homeTeamAnalysis.teamSummary?.teamStrength || 'Unknown'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Score:</span>
                  <span className="stat-value">{homeTeamAnalysis.teamSummary?.averageScore || 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">High Confidence:</span>
                  <span className="stat-value">{homeTeamAnalysis.teamSummary?.highConfidencePlayers || 0}</span>
                </div>
              </div>
            ) : (
              <div className="no-analysis">No home team analysis available</div>
            )}
          </div>
        </div>
      </div>

      {apiPredictions && apiPredictions.predictions && apiPredictions.predictions.length > 0 && (
        <div className="top-threats">
          <h4>🎯 Top HR Threats</h4>
          <div className="threats-grid">
            {apiPredictions.predictions
              .sort((a, b) => (b.hr_score || 0) - (a.hr_score || 0))
              .slice(0, 6)
              .map((prediction, index) => (
                <div key={index} className="threat-card">
                  <div className="threat-info">
                    <span className="player-name">{prediction.player_name}</span>
                    <span className="hr-score">{prediction.hr_score?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <div className="threat-details">
                    <div className="probability">
                      <span className="label">HR%:</span>
                      <span className="value">{prediction.hr_probability?.toFixed(1) || 'N/A'}%</span>
                    </div>
                    <div className="probability">
                      <span className="label">Hit%:</span>
                      <span className="value">{prediction.hit_probability?.toFixed(1) || 'N/A'}%</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPredictionsTab = () => (
    <div className="predictions-content">
      {apiPredictions && apiPredictions.predictions ? (
        <div className="predictions-table-container">
          <div className="table-header">
            <h4>BaseballAPI Predictions</h4>
            <div className="table-info">
              <span>{apiPredictions.predictions.length} player predictions</span>
            </div>
          </div>
          
          <div className="predictions-table">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>HR Score</th>
                  <th>HR %</th>
                  <th>Hit %</th>
                  <th>Arsenal</th>
                  <th>Recent AVG</th>
                  <th>Context</th>
                </tr>
              </thead>
              <tbody>
                {apiPredictions.predictions
                  .sort((a, b) => (b.hr_score || 0) - (a.hr_score || 0))
                  .map((prediction, index) => (
                    <tr key={index}>
                      <td className="player-cell">
                        <span className="player-name">{prediction.player_name}</span>
                      </td>
                      <td className="score-cell">
                        <span className={`hr-score ${prediction.hr_score >= 75 ? 'high' : prediction.hr_score >= 50 ? 'medium' : 'low'}`}>
                          {prediction.hr_score?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                      <td className="percentage-cell">
                        {prediction.hr_probability?.toFixed(1) || 'N/A'}%
                      </td>
                      <td className="percentage-cell">
                        {prediction.hit_probability?.toFixed(1) || 'N/A'}%
                      </td>
                      <td className="arsenal-cell">
                        {prediction.arsenal_matchup?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="avg-cell">
                        {prediction.recent_avg?.toFixed(3) || 'N/A'}
                      </td>
                      <td className="context-cell">
                        <div className="context-indicators">
                          {prediction.home_advantage && <span className="indicator home">H</span>}
                          {prediction.hot_streak && <span className="indicator hot">🔥</span>}
                          {prediction.venue_factor > 1.1 && <span className="indicator venue">V+</span>}
                          {prediction.venue_factor < 0.9 && <span className="indicator venue-neg">V-</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="no-predictions">
          <h4>No BaseballAPI Predictions Available</h4>
          <p>Unable to load advanced pitcher vs batter predictions for this game.</p>
          <div className="prediction-fallback">
            <p>Available analysis from comprehensive matchup service:</p>
            <ul>
              <li>Venue psychology analysis for all batters</li>
              <li>Travel impact assessment</li>
              <li>Environmental factors analysis</li>
              <li>Schedule and fatigue considerations</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  const renderAnalysisTab = () => (
    <div className="analysis-content">
      <div className="analysis-sections">
        <div className="vulnerability-analysis">
          <h4>Pitcher Vulnerability Assessment</h4>
          {pitcher ? (
            <div className="vulnerability-details">
              <div className="pitcher-stats-grid">
                <div className="stat-box">
                  <span className="stat-label">ERA</span>
                  <span className="stat-value">{pitcher.era || 'N/A'}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">WHIP</span>
                  <span className="stat-value">{pitcher.whip || 'N/A'}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">HR/9</span>
                  <span className="stat-value">{pitcher.hr_per_9 || 'N/A'}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">K/9</span>
                  <span className="stat-value">{pitcher.k_per_9 || 'N/A'}</span>
                </div>
              </div>
              
              <div className="vulnerability-factors">
                <h5>Key Vulnerability Factors</h5>
                <div className="factors-list">
                  {apiPredictions?.predictions && (
                    <>
                      <div className="factor-item">
                        <span className="factor-label">High Threat Batters:</span>
                        <span className="factor-value">
                          {apiPredictions.predictions.filter(p => (p.hr_score || 0) >= 70).length}
                        </span>
                      </div>
                      <div className="factor-item">
                        <span className="factor-label">Avg Opposition Score:</span>
                        <span className="factor-value">
                          {(apiPredictions.predictions.reduce((sum, p) => sum + (p.hr_score || 0), 0) / apiPredictions.predictions.length).toFixed(1)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="factor-item">
                    <span className="factor-label">Total Batters Faced:</span>
                    <span className="factor-value">
                      {(homeTeamAnalysis?.totalPlayers || 0) + (awayTeamAnalysis?.totalPlayers || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-pitcher-data">
              <p>Pitcher information not available</p>
            </div>
          )}
        </div>

        {/* Enhanced Pitcher Intelligence Analysis */}
        {pitcherIntelligence && (
          <div className="enhanced-pitcher-intelligence">
            <h4>Enhanced Pitcher Intelligence</h4>
            
            {/* Home Pitcher Analysis */}
            {pitcherIntelligence.homePitcher && (
              <div className="pitcher-analysis-section">
                <h5>{pitchers?.home?.name} vs {awayTeam} Batters</h5>
                <div className="intelligence-grid">
                  {/* Handedness Breakdown */}
                  {pitcherIntelligence.homePitcher.handednessBreakdown && (
                    <div className="handedness-analysis">
                      <h6>Handedness Matchups</h6>
                      <div className="handedness-stats">
                        <div className="handedness-item">
                          <div className="handedness-header">
                            <span className="label">vs Lefties ({pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsLefty.count}):</span>
                            <span className={`advantage ${pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsLefty.advantage}`}>
                              {pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsLefty.advantage}
                            </span>
                          </div>
                          {pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsLefty.keyBatters?.length > 0 && (
                            <div className="batter-names">
                              {pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsLefty.keyBatters.map((batter, idx) => (
                                <span key={idx} className="batter-name">{batter.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="handedness-item">
                          <div className="handedness-header">
                            <span className="label">vs Righties ({pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsRighty.count}):</span>
                            <span className={`advantage ${pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsRighty.advantage}`}>
                              {pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsRighty.advantage}
                            </span>
                          </div>
                          {pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsRighty.keyBatters?.length > 0 && (
                            <div className="batter-names">
                              {pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsRighty.keyBatters.map((batter, idx) => (
                                <span key={idx} className="batter-name">{batter.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsSwitch.count > 0 && (
                          <div className="handedness-item">
                            <div className="handedness-header">
                              <span className="label">vs Switch ({pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsSwitch.count}):</span>
                              <span className="advantage neutral">neutral</span>
                            </div>
                            {pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsSwitch.keyBatters?.length > 0 && (
                              <div className="batter-names">
                                {pitcherIntelligence.homePitcher.handednessBreakdown.breakdown.vsSwitch.keyBatters.map((batter, idx) => (
                                  <span key={idx} className="batter-name">{batter.name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Vulnerability Assessment */}
                  {pitcherIntelligence.homePitcher.vulnerabilityAnalysis && (
                    <div className="vulnerability-assessment">
                      <h6>Threat Assessment</h6>
                      <div className="threat-analysis">
                        <div className="threat-item">
                          <span className="threat-label">HR Risk Level:</span>
                          <span className={`threat-level ${pitcherIntelligence.homePitcher.vulnerabilityAnalysis.homeRunRisk.level}`}>
                            {pitcherIntelligence.homePitcher.vulnerabilityAnalysis.homeRunRisk.level}
                          </span>
                        </div>
                        <div className="threat-item">
                          <span className="threat-label">K Potential:</span>
                          <span className={`threat-level ${pitcherIntelligence.homePitcher.vulnerabilityAnalysis.strikeoutPotential.level}`}>
                            {pitcherIntelligence.homePitcher.vulnerabilityAnalysis.strikeoutPotential.level}
                          </span>
                        </div>
                        <div className="threat-item">
                          <span className="threat-label">Overall Threat:</span>
                          <span className={`threat-level ${pitcherIntelligence.homePitcher.vulnerabilityAnalysis.overallThreatLevel}`}>
                            {pitcherIntelligence.homePitcher.vulnerabilityAnalysis.overallThreatLevel}
                          </span>
                        </div>
                      </div>
                      
                      {/* Key Batters to Watch */}
                      {pitcherIntelligence.homePitcher.vulnerabilityAnalysis.homeRunRisk.threateningBatters?.length > 0 && (
                        <div className="key-batters">
                          <span className="batter-label">HR Threats:</span>
                          <div className="batter-list">
                            {pitcherIntelligence.homePitcher.vulnerabilityAnalysis.homeRunRisk.threateningBatters.slice(0, 3).map((batter, idx) => (
                              <span key={idx} className="threatening-batter">{batter.name}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {pitcherIntelligence.homePitcher.vulnerabilityAnalysis.strikeoutPotential.vulnerableBatters?.length > 0 && (
                        <div className="key-batters">
                          <span className="batter-label">K Targets:</span>
                          <div className="batter-list">
                            {pitcherIntelligence.homePitcher.vulnerabilityAnalysis.strikeoutPotential.vulnerableBatters.slice(0, 3).map((batter, idx) => (
                              <span key={idx} className="vulnerable-batter">{batter.name}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Away Pitcher Analysis */}
            {pitcherIntelligence.awayPitcher && (
              <div className="pitcher-analysis-section">
                <h5>{pitchers?.away?.name} vs {homeTeam} Batters</h5>
                <div className="intelligence-grid">
                  {/* Handedness Breakdown */}
                  {pitcherIntelligence.awayPitcher.handednessBreakdown && (
                    <div className="handedness-analysis">
                      <h6>Handedness Matchups</h6>
                      <div className="handedness-stats">
                        <div className="handedness-item">
                          <div className="handedness-header">
                            <span className="label">vs Lefties ({pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsLefty.count}):</span>
                            <span className={`advantage ${pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsLefty.advantage}`}>
                              {pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsLefty.advantage}
                            </span>
                          </div>
                          {pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsLefty.keyBatters?.length > 0 && (
                            <div className="batter-names">
                              {pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsLefty.keyBatters.map((batter, idx) => (
                                <span key={idx} className="batter-name">{batter.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="handedness-item">
                          <div className="handedness-header">
                            <span className="label">vs Righties ({pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsRighty.count}):</span>
                            <span className={`advantage ${pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsRighty.advantage}`}>
                              {pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsRighty.advantage}
                            </span>
                          </div>
                          {pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsRighty.keyBatters?.length > 0 && (
                            <div className="batter-names">
                              {pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsRighty.keyBatters.map((batter, idx) => (
                                <span key={idx} className="batter-name">{batter.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsSwitch.count > 0 && (
                          <div className="handedness-item">
                            <div className="handedness-header">
                              <span className="label">vs Switch ({pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsSwitch.count}):</span>
                              <span className="advantage neutral">neutral</span>
                            </div>
                            {pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsSwitch.keyBatters?.length > 0 && (
                              <div className="batter-names">
                                {pitcherIntelligence.awayPitcher.handednessBreakdown.breakdown.vsSwitch.keyBatters.map((batter, idx) => (
                                  <span key={idx} className="batter-name">{batter.name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Vulnerability Assessment */}
                  {pitcherIntelligence.awayPitcher.vulnerabilityAnalysis && (
                    <div className="vulnerability-assessment">
                      <h6>Threat Assessment</h6>
                      <div className="threat-analysis">
                        <div className="threat-item">
                          <span className="threat-label">HR Risk Level:</span>
                          <span className={`threat-level ${pitcherIntelligence.awayPitcher.vulnerabilityAnalysis.homeRunRisk.level}`}>
                            {pitcherIntelligence.awayPitcher.vulnerabilityAnalysis.homeRunRisk.level}
                          </span>
                        </div>
                        <div className="threat-item">
                          <span className="threat-label">K Potential:</span>
                          <span className={`threat-level ${pitcherIntelligence.awayPitcher.vulnerabilityAnalysis.strikeoutPotential.level}`}>
                            {pitcherIntelligence.awayPitcher.vulnerabilityAnalysis.strikeoutPotential.level}
                          </span>
                        </div>
                        <div className="threat-item">
                          <span className="threat-label">Overall Threat:</span>
                          <span className={`threat-level ${pitcherIntelligence.awayPitcher.vulnerabilityAnalysis.overallThreatLevel}`}>
                            {pitcherIntelligence.awayPitcher.vulnerabilityAnalysis.overallThreatLevel}
                          </span>
                        </div>
                      </div>
                      
                      {/* Key Batters to Watch */}
                      {pitcherIntelligence.awayPitcher.vulnerabilityAnalysis.homeRunRisk.threateningBatters?.length > 0 && (
                        <div className="key-batters">
                          <span className="batter-label">HR Threats:</span>
                          <div className="batter-list">
                            {pitcherIntelligence.awayPitcher.vulnerabilityAnalysis.homeRunRisk.threateningBatters.slice(0, 3).map((batter, idx) => (
                              <span key={idx} className="threatening-batter">{batter.name}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {pitcherIntelligence.awayPitcher.vulnerabilityAnalysis.strikeoutPotential.vulnerableBatters?.length > 0 && (
                        <div className="key-batters">
                          <span className="batter-label">K Targets:</span>
                          <div className="batter-list">
                            {pitcherIntelligence.awayPitcher.vulnerabilityAnalysis.strikeoutPotential.vulnerableBatters.slice(0, 3).map((batter, idx) => (
                              <span key={idx} className="vulnerable-batter">{batter.name}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Matchup Comparison */}
            {pitcherIntelligence.matchupAnalysis && (
              <div className="matchup-comparison">
                <h6>Pitcher Matchup Analysis</h6>
                <div className="comparison-result">
                  <span className="comparison-label">Advantage:</span>
                  <span className={`advantage-result ${pitcherIntelligence.matchupAnalysis.advantage}`}>
                    {pitcherIntelligence.matchupAnalysis.advantage} - {pitcherIntelligence.matchupAnalysis.reasoning}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="matchup-breakdown">
          <h4>Team Matchup Breakdown</h4>
          <div className="breakdown-grid">
            <div className="team-breakdown">
              <h5>{awayTeam} Offense</h5>
              {awayTeamAnalysis?.recommendedTargets && awayTeamAnalysis.recommendedTargets.length > 0 ? (
                <div className="target-list">
                  {awayTeamAnalysis.recommendedTargets.slice(0, 5).map((target, index) => (
                    <div key={index} className="target-item">
                      <span className="target-name">{target.playerName}</span>
                      <span className="target-score">{target.score}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-targets">No specific targets identified</div>
              )}
            </div>

            <div className="team-breakdown">
              <h5>{homeTeam} Offense</h5>
              {homeTeamAnalysis?.recommendedTargets && homeTeamAnalysis.recommendedTargets.length > 0 ? (
                <div className="target-list">
                  {homeTeamAnalysis.recommendedTargets.slice(0, 5).map((target, index) => (
                    <div key={index} className="target-item">
                      <span className="target-name">{target.playerName}</span>
                      <span className="target-score">{target.score}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-targets">No specific targets identified</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pitcher-stats-section">
      <div className="section-header">
        <h3>Pitcher Intelligence</h3>
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictions')}
          >
            API Predictions
          </button>
          <button 
            className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Analysis
          </button>
        </div>
      </div>

      <div className="section-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'predictions' && renderPredictionsTab()}
        {activeTab === 'analysis' && renderAnalysisTab()}
      </div>
    </div>
  );
};

export default PitcherStatsSection;