import React, { useState } from 'react';
import './HRAnalysisCard.css';

const HRAnalysisCard = ({ result, hrAnalysis }) => {
  const [expanded, setExpanded] = useState(false);
  
  // If no enhanced HR analysis, fall back to basic display
  if (!hrAnalysis) {
    return (
      <div className="breakdown-card hr-analysis">
        <div className="breakdown-header">
          <span className="breakdown-icon">💣</span>
          <span className="breakdown-title">HR Analysis: {result.result.hrPotential}</span>
        </div>
        <div className="breakdown-body">
          <p>HR Rate: <strong>{(parseFloat(result.result.details.predictedHR || 0) * 100).toFixed(1)}%</strong></p>
          <p>Expected: <strong>1 HR per {Math.round(1 / parseFloat(result.result.details.predictedHR || 0.001))} AB</strong></p>
        </div>
      </div>
    );
  }

  const { metrics, warnings, insights, recommendation, confidence } = hrAnalysis;
  
  // Determine color scheme based on potential
  const getPotentialColor = (potential) => {
    switch (potential) {
      case 'High': return '#22c55e';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const potentialColor = getPotentialColor(hrAnalysis.potential);

  return (
    <div className={`hr-analysis-card ${expanded ? 'expanded' : ''}`}>
      <div className="hr-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="hr-header-main">
          <span className="hr-icon">💣</span>
          <span className="hr-title">HR Analysis: </span>
          <span className="hr-potential" style={{ color: potentialColor }}>
            {hrAnalysis.potential}
          </span>
          {confidence < 0.3 && (
            <span className="low-confidence-badge" title="Analysis based on limited data">
              ⚠️
            </span>
          )}
        </div>
        <button className="expand-btn">
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      <div className="hr-card-body">
        {/* Core Metrics */}
        <div className="hr-core-metrics">
          <div className="metric-row">
            <span className="metric-label">Adjusted HR Rate:</span>
            <span className="metric-value">
              {(metrics.adjustedHRRate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Expected HR:</span>
            <span className="metric-value">
              1 per {metrics.hrPerAB} AB
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Season HRs:</span>
            <span className="metric-value">
              {metrics.totalHRs} in {metrics.totalABs} AB
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Confidence:</span>
            <span className="metric-value">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="hr-warnings">
            {warnings.map((warning, idx) => (
              <div key={idx} className={`warning-item ${warning.severity}`}>
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">{warning.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Key Insights */}
        {insights.length > 0 && (
          <div className="hr-insights">
            <h5>Key Insights</h5>
            {insights.map((insight, idx) => (
              <div key={idx} className={`insight-item ${insight.importance}`}>
                <span className="insight-icon">
                  {insight.type === 'due_for_hr' ? '📈' :
                   insight.type === 'favorable_split' ? '🏠' :
                   insight.type === 'improving_power' ? '💪' :
                   insight.type === 'arsenal_advantage' ? '🎯' :
                   insight.type === 'exit_velo_advantage' ? '🚀' : '💡'}
                </span>
                <span className="insight-text">{insight.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Expanded Details */}
        {expanded && (
          <div className="hr-expanded-details">
            {/* Time Since Last HR */}
            {metrics.timeSinceLastHR && (
              <div className="detail-section">
                <h5>⏱️ Time Since Last HR</h5>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">ABs:</span>
                    <span className="detail-value">{metrics.timeSinceLastHR.absSinceLastHR}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Games:</span>
                    <span className="detail-value">{metrics.timeSinceLastHR.gamesSinceLastHR}</span>
                  </div>
                  {metrics.timeSinceLastHR.lastHRDate && (
                    <div className="detail-item">
                      <span className="detail-label">Last HR:</span>
                      <span className="detail-value">{metrics.timeSinceLastHR.lastHRDate}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Exit Velocity Analysis */}
            {metrics.exitVelocity && (
              <div className="detail-section">
                <h5>🚀 Exit Velocity Matchup</h5>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Batter Avg:</span>
                    <span className="detail-value">{metrics.exitVelocity.batterAvgEV.toFixed(1)} mph</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Pitcher Allows:</span>
                    <span className="detail-value">{metrics.exitVelocity.pitcherAvgEVAllowed.toFixed(1)} mph</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label">Advantage:</span>
                    <span className={`detail-value ${metrics.exitVelocity.matchupAdvantage > 0 ? 'positive' : 'negative'}`}>
                      {metrics.exitVelocity.matchupAdvantage > 0 ? '+' : ''}{metrics.exitVelocity.matchupAdvantage.toFixed(1)} mph
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Hard Hit %:</span>
                    <span className="detail-value">{metrics.exitVelocity.batterHardHitPct.toFixed(1)}%</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Pitcher HH% Allowed:</span>
                    <span className="detail-value">{metrics.exitVelocity.pitcherHardHitPctAllowed.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Arsenal Matchup */}
            {metrics.arsenalMatchup && metrics.arsenalMatchup.matchups.length > 0 && (
              <div className="detail-section">
                <h5>🎨 Arsenal Matchup</h5>
                <div className="arsenal-matchups">
                  {metrics.arsenalMatchup.matchups.map((matchup, idx) => (
                    <div key={idx} className="arsenal-item">
                      <span className="pitch-type">{matchup.pitchType}</span>
                      <span className="pitch-usage">({(matchup.usage * 100).toFixed(0)}%)</span>
                      <span className="pitch-performance">
                        ISO: {matchup.batterISO.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Year-over-Year Trends */}
            {metrics.trends && (
              <div className="detail-section">
                <h5>📊 Power Trends</h5>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">2024 ISO:</span>
                    <span className="detail-value">{metrics.trends.iso2024.toFixed(3)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">2025 ISO:</span>
                    <span className="detail-value">{metrics.trends.iso2025.toFixed(3)}</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label">Change:</span>
                    <span className={`detail-value ${metrics.trends.improvement > 0 ? 'positive' : 'negative'}`}>
                      {metrics.trends.improvement > 0 ? '+' : ''}{(metrics.trends.percentChange * 100).toFixed(1)}%
                      <span className="trend-icon">
                        {metrics.trends.trajectory === 'improving' ? '📈' : '📉'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Home/Away Splits */}
            {metrics.splits && (
              <div className="detail-section">
                <h5>🏠 Split Analysis</h5>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Venue:</span>
                    <span className="detail-value">{metrics.splits.venue}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Batter ISO:</span>
                    <span className="detail-value">{metrics.splits.batterISO.toFixed(3)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Advantage:</span>
                    <span className={`detail-value ${metrics.splits.relevantAdvantage > 0 ? 'positive' : 'negative'}`}>
                      {metrics.splits.relevantAdvantage > 0 ? '+' : ''}{(metrics.splits.relevantAdvantage * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendation && recommendation.length > 0 && (
              <div className="detail-section">
                <h5>💡 Recommendations</h5>
                <div className="recommendations">
                  {recommendation.map((rec, idx) => (
                    <div key={idx} className={`recommendation-item ${rec.type}`}>
                      <span className="rec-icon">
                        {rec.type === 'positive' ? '✅' : 
                         rec.type === 'caution' ? '⚠️' : 
                         rec.type === 'negative' ? '❌' : '💡'}
                      </span>
                      <span className="rec-text">{rec.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw vs Adjusted Comparison */}
            <div className="detail-section">
              <h5>🔍 Data Adjustment Details</h5>
              <div className="adjustment-comparison">
                <div className="comparison-row">
                  <span className="comp-label">Raw ISO:</span>
                  <span className="comp-value">{metrics.rawISO.toFixed(3)}</span>
                  <span className="comp-arrow">→</span>
                  <span className="comp-label">Adjusted:</span>
                  <span className="comp-value">{metrics.adjustedISO.toFixed(3)}</span>
                </div>
                <div className="comparison-row">
                  <span className="comp-label">Raw HR%:</span>
                  <span className="comp-value">{(metrics.rawHRRate * 100).toFixed(1)}%</span>
                  <span className="comp-arrow">→</span>
                  <span className="comp-label">Adjusted:</span>
                  <span className="comp-value">{(metrics.adjustedHRRate * 100).toFixed(1)}%</span>
                </div>
              </div>
              <p className="adjustment-note">
                Adjustments based on {metrics.totalPA || 0} PA (confidence: {(confidence * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRAnalysisCard;