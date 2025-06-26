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

  const { pitcher, homeTeam, awayTeam, homeTeamAnalysis, awayTeamAnalysis } = gameAnalysis;

  const renderOverviewTab = () => (
    <div className="overview-content">
      <div className="pitcher-header">
        <div className="pitcher-info">
          <h3>{pitcher?.name || 'TBD'}</h3>
          <div className="pitcher-meta">
            <span className="team-info">Starting for {homeTeam}</span>
            {pitcher?.era && <span className="era">ERA: {pitcher.era}</span>}
            {pitcher?.whip && <span className="whip">WHIP: {pitcher.whip}</span>}
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
      </div>

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