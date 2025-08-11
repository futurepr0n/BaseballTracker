import React, { useState, useMemo } from 'react';
import { 
  formatPercentage, 
  formatNumber, 
  formatSampleSize,
  formatABSinceHR,
  getConfidenceClass,
  getHRScoreClass,
  groupOpportunitiesByPitcher
} from '../utils/dataFormatting';
import { generateOpportunityReasoning, formatReasoningForDisplay } from '../services/reasoningGenerator';

const WeakspotResults = ({ analysis, opportunities, loading, enhanced }) => {
  const [expandedOpportunity, setExpandedOpportunity] = useState(null);
  const [sortBy, setSortBy] = useState('confidence_score');
  const [filterBy, setFilterBy] = useState('all');

  if (loading) {
    return (
      <div className="weakspot-results loading">
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
      <div className="weakspot-results empty">
        <div className="empty-content">
          <span className="empty-icon">🎯</span>
          <h3>No Analysis Results</h3>
          <p>Run the analysis to see weakspot opportunities and strategic insights</p>
        </div>
      </div>
    );
  }

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    if (filterBy === 'all') return true;
    if (filterBy === 'high_confidence') return opp.confidence_score >= 70;
    if (filterBy === 'position') return opp.type === 'position_vulnerability';
    if (filterBy === 'inning') return opp.type === 'inning_vulnerability';
    if (filterBy === 'predictability') return opp.type === 'predictability';
    return true;
  });

  // Sort opportunities
  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    switch (sortBy) {
      case 'confidence_score':
        return (b.confidence_score || 0) - (a.confidence_score || 0);
      case 'vulnerability_score':
        return (b.vulnerability_score || 0) - (a.vulnerability_score || 0);
      case 'success_rate':
        return (b.success_rate || 0) - (a.success_rate || 0);
      case 'pitcher':
        return (a.pitcher || '').localeCompare(b.pitcher || '');
      default:
        return 0;
    }
  });

  // Confidence class function moved to utils/dataFormatting.js

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

  // Formatting functions moved to utils/dataFormatting.js for consistency

  const toggleExpanded = (index) => {
    setExpandedOpportunity(expandedOpportunity === index ? null : index);
  };

  return (
    <div className="weakspot-results">
      <div className="results-header">
        <div className="results-title">
          <h2>Weakspot Analysis Results</h2>
          {enhanced && (
            <span className="enhanced-badge">
              ✨ Enhanced with Baseball API
            </span>
          )}
        </div>
        <div className="results-summary">
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-value">{analysis.summary?.total_opportunities || 0}</span>
              <span className="stat-label">Total Opportunities</span>
            </div>
            <div className="stat">
              <span className="stat-value">{analysis.summary?.high_confidence || 0}</span>
              <span className="stat-label">High Confidence</span>
            </div>
            <div className="stat">
              <span className="stat-value">{analysis.total_matchups || 0}</span>
              <span className="stat-label">Games Analyzed</span>
            </div>
            <div className="stat">
              <span className="stat-value">{formatNumber(analysis.summary?.avg_confidence || 0)}%</span>
              <span className="stat-label">Avg Confidence</span>
            </div>
          </div>
        </div>
      </div>

      <div className="results-controls">
        <div className="control-group">
          <label>Filter by:</label>
          <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
            <option value="all">All Opportunities</option>
            <option value="high_confidence">High Confidence Only</option>
            <option value="position">Position Vulnerabilities</option>
            <option value="inning">Timing Windows</option>
            <option value="predictability">Pattern Recognition</option>
          </select>
        </div>
        <div className="control-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="confidence_score">Confidence Score</option>
            <option value="vulnerability_score">Vulnerability Score</option>
            <option value="success_rate">Success Rate</option>
            <option value="pitcher">Pitcher Name</option>
          </select>
        </div>
        <div className="results-count">
          Showing {sortedOpportunities.length} of {opportunities.length} opportunities
        </div>
      </div>

      <div className="opportunities-list">
        {sortedOpportunities.map((opportunity, index) => (
          <div 
            key={`${opportunity.pitcher}-${opportunity.type}-${index}`}
            className={`opportunity-card ${getConfidenceClass(opportunity.confidence_score)}`}
          >
            <div className="opportunity-header" onClick={() => toggleExpanded(index)}>
              <div className="opportunity-main">
                <div className="opportunity-type">
                  <span className="type-icon">{getTypeIcon(opportunity.type)}</span>
                  <span className="type-label">{getTypeLabel(opportunity.type)}</span>
                </div>
                <div className="opportunity-matchup">
                  <div className="pitcher-info">
                    <span className="pitcher-name">{opportunity.pitcher}</span>
                    <span className="pitcher-team">({opportunity.pitcher_team})</span>
                  </div>
                  <div className="vs-indicator">vs</div>
                  <div className="team-info">
                    <span className="team-name">{opportunity.opposing_team}</span>
                  </div>
                </div>
                <div className="opportunity-metrics">
                  <div className="metric">
                    <span className="metric-value">{formatNumber(opportunity.confidence_score)}%</span>
                    <span className="metric-label">Confidence</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{formatNumber(opportunity.vulnerability_score)}</span>
                    <span className="metric-label">Vulnerability</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{formatPercentage(opportunity.success_rate)}</span>
                    <span className="metric-label">Success Rate</span>
                  </div>
                </div>
              </div>
              <div className="expand-indicator">
                {expandedOpportunity === index ? '▲' : '▼'}
              </div>
            </div>

            {expandedOpportunity === index && (
              <div className="opportunity-details">
                <div className="details-grid">
                  <div className="detail-section">
                    <h4>Opportunity Details</h4>
                    <div className="detail-items">
                      {opportunity.position && (
                        <div className="detail-item">
                          <span className="detail-label">Target Position:</span>
                          <span className="detail-value">#{opportunity.position} in batting order</span>
                        </div>
                      )}
                      {opportunity.inning && (
                        <div className="detail-item">
                          <span className="detail-label">Target Inning:</span>
                          <span className="detail-value">Inning {opportunity.inning}</span>
                        </div>
                      )}
                      {opportunity.predictability_score && (
                        <div className="detail-item">
                          <span className="detail-label">Predictability Score:</span>
                          <span className="detail-value">{formatNumber(opportunity.predictability_score)}/20</span>
                        </div>
                      )}
                      <div className="detail-item">
                        <span className="detail-label">Sample Size:</span>
                        <span className="detail-value">{formatSampleSize(opportunity.sample_size, opportunity.player_stats)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Risk Level:</span>
                        <span className={`detail-value risk-${opportunity.risk_level}`}>
                          {opportunity.risk_level?.replace('_', ' ') || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {opportunity.details && (
                    <div className="detail-section">
                      <h4>Performance Metrics</h4>
                      <div className="detail-items">
                        {opportunity.details.avg_velocity && (
                          <div className="detail-item">
                            <span className="detail-label">Avg Velocity:</span>
                            <span className="detail-value">{formatNumber(opportunity.details.avg_velocity)} mph</span>
                          </div>
                        )}
                        {opportunity.hr_frequency && (
                          <div className="detail-item">
                            <span className="detail-label">HR Frequency:</span>
                            <span className="detail-value">{formatPercentage(opportunity.hr_frequency)}</span>
                          </div>
                        )}
                        {opportunity.details.leverage_situations !== undefined && (
                          <div className="detail-item">
                            <span className="detail-label">Leverage Situations:</span>
                            <span className="detail-value">{opportunity.details.leverage_situations}</span>
                          </div>
                        )}
                        {opportunity.details.most_common_sequence && (
                          <div className="detail-item">
                            <span className="detail-label">Common Sequence:</span>
                            <span className="detail-value">{opportunity.details.most_common_sequence}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {enhanced && opportunity.additional_metrics && (
                    <div className="detail-section">
                      <h4>Enhanced Analytics</h4>
                      <div className="detail-items">
                        {opportunity.additional_metrics.hr_probability !== undefined && (
                          <div className="detail-item">
                            <span className="detail-label">HR Probability:</span>
                            <span className="detail-value">{formatPercentage(opportunity.additional_metrics.hr_probability)}</span>
                          </div>
                        )}
                        {opportunity.additional_metrics.hit_probability !== undefined && (
                          <div className="detail-item">
                            <span className="detail-label">Hit Probability:</span>
                            <span className="detail-value">{formatPercentage(opportunity.additional_metrics.hit_probability)}</span>
                          </div>
                        )}
                        {opportunity.additional_metrics.api_score && (
                          <div className="detail-item">
                            <span className="detail-label">API Score:</span>
                            <span className="detail-value">{formatNumber(opportunity.additional_metrics.api_score)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {opportunity.sequences && opportunity.sequences.length > 0 && (
                  <div className="sequences-section">
                    <h4>Most Predictable Sequences</h4>
                    <div className="sequences-list">
                      {opportunity.sequences.slice(0, 3).map((seq, seqIndex) => (
                        <div key={seqIndex} className="sequence-item">
                          <span className="sequence-pattern">{seq.sequence || seq}</span>
                          {seq.count && <span className="sequence-count">({seq.count}x)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {analysis.errors && analysis.errors.length > 0 && (
        <div className="analysis-errors">
          <h3>Analysis Warnings</h3>
          <div className="errors-list">
            {analysis.errors.map((error, index) => (
              <div key={index} className="error-item">
                <span className="error-matchup">
                  {error.matchup?.awayPitcher} vs {error.matchup?.homePitcher}:
                </span>
                <span className="error-message">{error.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

export default WeakspotResults;