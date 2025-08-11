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
  const [sortBy, setSortBy] = useState('confidence_score');

  // Group opportunities by pitcher
  const groupedByPitcher = useMemo(() => {
    if (!opportunities || opportunities.length === 0) return {};
    
    // Filter opportunities first
    const filtered = opportunities.filter(opp => {
      if (filterBy === 'all') return true;
      if (filterBy === 'high_confidence') return normalizePercentage(opp.confidence_score) >= 70;
      if (filterBy === 'position') return opp.type === 'position_vulnerability';
      if (filterBy === 'inning') return opp.type === 'inning_vulnerability';
      if (filterBy === 'predictability') return opp.type === 'predictability';
      return true;
    });

    return groupOpportunitiesByPitcher(filtered);
  }, [opportunities, filterBy]);

  // Calculate best bets across all pitchers
  const bestBets = useMemo(() => {
    if (!opportunities || opportunities.length === 0) return [];
    
    return opportunities
      .filter(opp => normalizePercentage(opp.confidence_score) >= 60)
      .sort((a, b) => {
        const scoreA = normalizePercentage(a.confidence_score) || 0;
        const scoreB = normalizePercentage(b.confidence_score) || 0;
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map(opp => {
        const reasoning = generateOpportunityReasoning(opp);
        return {
          ...opp,
          reasoning: formatReasoningForDisplay(reasoning)
        };
      });
  }, [opportunities]);

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

  if (!analysis || !opportunities || opportunities.length === 0) {
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

  const togglePitcher = (pitcherName) => {
    setExpandedPitcher(expandedPitcher === pitcherName ? null : pitcherName);
    setExpandedOpportunity(null); // Reset opportunity expansion when switching pitchers
  };

  const toggleOpportunity = (oppId) => {
    setExpandedOpportunity(expandedOpportunity === oppId ? null : oppId);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'position_vulnerability': return '📍';
      case 'inning_vulnerability': return '⏰';
      case 'predictability': return '🔮';
      default: return '🎯';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'position_vulnerability': return 'Position Weakness';
      case 'inning_vulnerability': return 'Timing Window';
      case 'predictability': return 'Pattern Recognition';
      default: return 'General Opportunity';
    }
  };

  return (
    <div className="enhanced-weakspot-results">
      <div className="results-header">
        <div className="results-title">
          <h2>Enhanced Weakspot Analysis</h2>
          {enhanced && (
            <span className="enhanced-badge">🚀 API Enhanced</span>
          )}
        </div>
        
        <div className="results-controls">
          <div className="filter-control">
            <label>Filter by:</label>
            <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
              <option value="all">All Opportunities</option>
              <option value="high_confidence">High Confidence (70%+)</option>
              <option value="position">Position Weakness</option>
              <option value="inning">Timing Windows</option>
              <option value="predictability">Pattern Recognition</option>
            </select>
          </div>
        </div>
      </div>

      {/* Best Bets Section */}
      {bestBets.length > 0 && (
        <div className="best-bets-section">
          <h3>🏆 Top Opportunities</h3>
          <div className="best-bets-grid">
            {bestBets.map((bet, index) => (
              <div key={index} className={`best-bet-card ${getConfidenceClass(bet.confidence_score)}`}>
                <div className="bet-rank">#{index + 1}</div>
                <div className="bet-header">
                  <div className="bet-player">{bet.player_names?.join(', ') || 'Multiple Players'}</div>
                  <div className="bet-pitcher">vs {bet.pitcher_name}</div>
                </div>
                <div className="bet-metrics">
                  <div className="metric">
                    <span className="value">{formatPercentage(bet.confidence_score)}</span>
                    <span className="label">Confidence</span>
                  </div>
                  <div className="metric">
                    <span className="value">{formatNumber(bet.vulnerability_score)}</span>
                    <span className="label">Vulnerability</span>
                  </div>
                </div>
                {bet.reasoning && (
                  <div className="bet-reasoning">
                    <div className="reasoning-summary">{bet.reasoning.summary}</div>
                    {bet.reasoning.primaryPoints && bet.reasoning.primaryPoints.length > 0 && (
                      <ul className="reasoning-points">
                        {bet.reasoning.primaryPoints.slice(0, 2).map((point, idx) => (
                          <li key={idx}>
                            <span className="point-icon">{point.icon}</span>
                            <span className="point-text">{point.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grouped Opportunities by Pitcher */}
      <div className="pitcher-groups">
        <h3>Opportunities by Pitcher</h3>
        {Object.entries(groupedByPitcher).map(([pitcherName, pitcherData]) => (
          <div key={pitcherName} className="pitcher-group">
            <div 
              className="pitcher-header"
              onClick={() => togglePitcher(pitcherName)}
            >
              <div className="pitcher-info">
                <span className="pitcher-name">{pitcherName}</span>
                <span className="pitcher-team">({pitcherData.pitcher_team})</span>
                <span className="opportunity-count">
                  {pitcherData.opportunities.length} opportunities
                </span>
              </div>
              <div className="pitcher-toggle">
                {expandedPitcher === pitcherName ? '▼' : '▶'}
              </div>
            </div>

            {expandedPitcher === pitcherName && (
              <div className="pitcher-opportunities">
                {pitcherData.opportunities.map((opp, index) => {
                  const oppId = `${pitcherName}-${index}`;
                  const reasoning = generateOpportunityReasoning(opp);
                  const formattedReasoning = formatReasoningForDisplay(reasoning);
                  
                  return (
                    <div key={oppId} className={`opportunity-item ${getConfidenceClass(opp.confidence_score)}`}>
                      <div 
                        className="opportunity-header"
                        onClick={() => toggleOpportunity(oppId)}
                      >
                        <div className="opportunity-type">
                          <span className="type-icon">{getTypeIcon(opp.type)}</span>
                          <span className="type-label">{getTypeLabel(opp.type)}</span>
                        </div>
                        <div className="opportunity-metrics">
                          <div className="metric">
                            <span className="value">{formatPercentage(opp.confidence_score)}</span>
                            <span className="label">Confidence</span>
                          </div>
                          <div className="metric">
                            <span className="value">{formatNumber(opp.vulnerability_score)}</span>
                            <span className="label">Vulnerability</span>
                          </div>
                          {opp.success_rate !== undefined && (
                            <div className="metric">
                              <span className="value">{formatPercentage(opp.success_rate)}</span>
                              <span className="label">Success Rate</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {expandedOpportunity === oppId && (
                        <div className="opportunity-details">
                          {/* Players Involved */}
                          {opp.player_names && opp.player_names.length > 0 && (
                            <div className="detail-section">
                              <h4>Target Players</h4>
                              <div className="players-list">
                                {opp.player_names.map((player, idx) => (
                                  <span key={idx} className="player-tag">{player}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Opportunity Details */}
                          <div className="detail-section">
                            <h4>Details</h4>
                            <div className="detail-items">
                              {opp.position && (
                                <div className="detail-item">
                                  <span className="detail-label">Target Position:</span>
                                  <span className="detail-value">#{opp.position} in batting order</span>
                                </div>
                              )}
                              {opp.inning && (
                                <div className="detail-item">
                                  <span className="detail-label">Target Inning:</span>
                                  <span className="detail-value">Inning {opp.inning}</span>
                                </div>
                              )}
                              <div className="detail-item">
                                <span className="detail-label">Sample Size:</span>
                                <span className="detail-value">{formatSampleSize(opp.sample_size, opp.player_stats)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Analytics */}
                          {enhanced && opp.additional_metrics && (
                            <div className="detail-section">
                              <h4>Enhanced Analytics</h4>
                              <div className="detail-items">
                                {opp.additional_metrics.hr_probability !== undefined && (
                                  <div className="detail-item">
                                    <span className="detail-label">HR Probability:</span>
                                    <span className="detail-value">{formatPercentage(opp.additional_metrics.hr_probability)}</span>
                                  </div>
                                )}
                                {opp.additional_metrics.hit_probability !== undefined && (
                                  <div className="detail-item">
                                    <span className="detail-label">Hit Probability:</span>
                                    <span className="detail-value">{formatPercentage(opp.additional_metrics.hit_probability)}</span>
                                  </div>
                                )}
                                {opp.additional_metrics.ab_since_last_hr !== undefined && (
                                  <div className="detail-item">
                                    <span className="detail-label">AB Since HR:</span>
                                    <span className="detail-value">{formatABSinceHR(opp.additional_metrics.ab_since_last_hr, opp.player_stats)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Reasoning Section */}
                          {formattedReasoning && (
                            <div className="detail-section reasoning-section">
                              <h4>Analysis Breakdown</h4>
                              <div className="reasoning-summary">{formattedReasoning.summary}</div>
                              
                              {formattedReasoning.primaryPoints && formattedReasoning.primaryPoints.length > 0 && (
                                <div className="reasoning-points">
                                  <h5>Primary Factors:</h5>
                                  <ul>
                                    {formattedReasoning.primaryPoints.map((point, idx) => (
                                      <li key={idx} className={`reason-${point.importance}`}>
                                        <span className="point-icon">{point.icon}</span>
                                        <div className="point-content">
                                          <div className="point-text">{point.text}</div>
                                          {point.detail && (
                                            <div className="point-detail">{point.detail}</div>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {formattedReasoning.supportingPoints && formattedReasoning.supportingPoints.length > 0 && (
                                <div className="reasoning-points">
                                  <h5>Supporting Factors:</h5>
                                  <ul>
                                    {formattedReasoning.supportingPoints.map((point, idx) => (
                                      <li key={idx} className={`reason-${point.importance}`}>
                                        <span className="point-icon">{point.icon}</span>
                                        <div className="point-content">
                                          <div className="point-text">{point.text}</div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="analysis-footer">
        <div className="analysis-metadata">
          <span>Analysis generated: {new Date(analysis.generated_at).toLocaleString('en-US')}</span>
          <span>•</span>
          <span>Data quality: {analysis.data_quality || 'Standard'}</span>
          <span>•</span>
          <span>Successful analyses: {analysis.successful_analyses}/{analysis.total_matchups}</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedWeakspotResults;