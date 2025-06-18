/**
 * BatchSummarySection Component
 * Displays strategic insights and summary tables for batch analysis results
 * Transforms raw data into actionable intelligence with collapsible sections
 */

import React, { useState, useMemo } from 'react';
import './BatchSummarySection.css';

const BatchSummarySection = ({ summary, loading = false, error = null, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('opportunities');

  // Early return for loading or error states
  if (loading) {
    return (
      <div className={`batch-summary-section loading ${className}`}>
        <div className="summary-header">
          <h3>📊 Generating Strategic Analysis...</h3>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Analyzing batch results for strategic opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`batch-summary-section error ${className}`}>
        <div className="summary-header">
          <h3>❌ Analysis Error</h3>
        </div>
        <div className="error-content">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!summary || !summary.overview) {
    return null;
  }

  const { overview, topOpportunities, pitcherIntelligence, quickInsights, alerts, categoryBreakdown } = summary;

  return (
    <div className={`batch-summary-section ${className}`}>
      <div className="summary-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
          📊 Strategic Analysis
          <span className="player-count">({overview.totalPlayers} players)</span>
        </h3>
        <div className="header-stats">
          <span className="stat-item">
            🎯 {overview.playersWithBadges} Enhanced
          </span>
          <span className="stat-item">
            📈 {overview.averageHRScore.toFixed(1)} Avg Score
          </span>
          {alerts && alerts.length > 0 && (
            <span className="stat-item alert-indicator">
              🚨 {alerts.length} Alerts
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="summary-content">
          {/* Quick Insights Cards */}
          {quickInsights && quickInsights.length > 0 && (
            <QuickInsightsSection insights={quickInsights} />
          )}

          {/* Alerts Section */}
          {alerts && alerts.length > 0 && (
            <AlertsSection alerts={alerts} />
          )}

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'opportunities' ? 'active' : ''}`}
              onClick={() => setActiveTab('opportunities')}
            >
              🎯 Top Opportunities
            </button>
            <button 
              className={`tab-button ${activeTab === 'pitcher' ? 'active' : ''}`}
              onClick={() => setActiveTab('pitcher')}
            >
              ⚾ Pitcher Intelligence
            </button>
            <button 
              className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              📊 Category Breakdown
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'opportunities' && (
              <OpportunitiesTab opportunities={topOpportunities} />
            )}
            {activeTab === 'pitcher' && (
              <PitcherIntelligenceTab intelligence={pitcherIntelligence} />
            )}
            {activeTab === 'categories' && (
              <CategoryBreakdownTab breakdown={categoryBreakdown} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Quick Insights Cards Component
const QuickInsightsSection = ({ insights }) => (
  <div className="quick-insights-section">
    <h4>📋 Quick Insights</h4>
    <div className="insights-grid">
      {insights.map((insight, index) => (
        <div key={index} className="insight-card">
          <div className="insight-icon">{insight.icon}</div>
          <div className="insight-content">
            <div className="insight-value">{insight.value}</div>
            <div className="insight-label">{insight.label}</div>
            <div className="insight-description">{insight.description}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Alerts Section Component
const AlertsSection = ({ alerts }) => (
  <div className="alerts-section">
    <h4>🚨 Strategic Alerts</h4>
    <div className="alerts-list">
      {alerts.slice(0, 5).map((alert, index) => (
        <div key={index} className={`alert-item ${alert.type} ${alert.priority}`}>
          <div className="alert-content">
            <strong>{alert.player}</strong> ({alert.team}) - {alert.message}
          </div>
          {alert.badges && alert.badges.length > 0 && (
            <div className="alert-badges">
              {alert.badges.slice(0, 3).map((badge, badgeIndex) => (
                <span key={badgeIndex} className="alert-badge">{badge}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Opportunities Tab Component
const OpportunitiesTab = ({ opportunities }) => (
  <div className="opportunities-tab">
    <div className="opportunities-grid">
      {/* Best Hit Opportunities */}
      <OpportunityTable
        title="🎯 Best Hit Opportunities"
        data={opportunities.bestHitOpportunities}
        columns={[
          { key: 'player', label: 'Player' },
          { key: 'team', label: 'Team' },
          { key: 'hitProbability', label: 'Hit %', format: 'percentage' },
          { key: 'confidenceBoost', label: 'Boost', format: 'boost' },
          { key: 'reason', label: 'Reason' }
        ]}
      />

      {/* Power Play Targets */}
      <OpportunityTable
        title="⚡ Power Play Targets"
        data={opportunities.powerPlayTargets}
        columns={[
          { key: 'player', label: 'Player' },
          { key: 'team', label: 'Team' },
          { key: 'hrProbability', label: 'HR %', format: 'percentage' },
          { key: 'hrScore', label: 'Score', format: 'score' },
          { key: 'reason', label: 'Reason' }
        ]}
      />

      {/* Hot Streaks */}
      <OpportunityTable
        title="🔥 Hot Streaks to Ride"
        data={opportunities.hotStreaksToRide}
        columns={[
          { key: 'player', label: 'Player' },
          { key: 'team', label: 'Team' },
          { key: 'streakInfo', label: 'Streak' },
          { key: 'confidenceBoost', label: 'Boost', format: 'boost' }
        ]}
      />

      {/* Hidden Gems */}
      <OpportunityTable
        title="💎 Hidden Gems"
        data={opportunities.hiddenGems}
        columns={[
          { key: 'player', label: 'Player' },
          { key: 'team', label: 'Team' },
          { key: 'baseScore', label: 'Base', format: 'score' },
          { key: 'enhancedScore', label: 'Enhanced', format: 'score' },
          { key: 'confidenceBoost', label: 'Boost', format: 'boost' }
        ]}
      />

      {/* Must-Play Alerts */}
      {opportunities.mustPlayAlerts && opportunities.mustPlayAlerts.length > 0 && (
        <OpportunityTable
          title="🚨 Must-Play Alerts"
          data={opportunities.mustPlayAlerts}
          className="must-play-table"
          columns={[
            { key: 'player', label: 'Player' },
            { key: 'team', label: 'Team' },
            { key: 'badges', label: 'Badges', format: 'badges' },
            { key: 'confidenceBoost', label: 'Boost', format: 'boost' },
            { key: 'reason', label: 'Reason' }
          ]}
        />
      )}
    </div>
  </div>
);

// Pitcher Intelligence Tab Component
const PitcherIntelligenceTab = ({ intelligence }) => (
  <div className="pitcher-intelligence-tab">
    {intelligence && (
      <div className="pitcher-tables">
        {/* Vulnerable Pitchers */}
        {intelligence.vulnerablePitchers && intelligence.vulnerablePitchers.length > 0 && (
          <PitcherTable
            title="🎯 Most Vulnerable Pitchers"
            data={intelligence.vulnerablePitchers}
            className="vulnerable-pitchers"
            columns={[
              { key: 'pitcher', label: 'Pitcher' },
              { key: 'team', label: 'Team' },
              { key: 'battersAnalyzed', label: 'Batters' },
              { key: 'avgHRScore', label: 'Avg HR Score', format: 'score' },
              { key: 'vulnerabilityIndex', label: 'Vulnerability', format: 'score' },
              { key: 'toughBatters', label: 'Threats', format: 'threats' }
            ]}
          />
        )}

        {/* Dominant Pitchers */}
        {intelligence.dominantPitchers && intelligence.dominantPitchers.length > 0 && (
          <PitcherTable
            title="🛡️ Most Dominant Pitchers"
            data={intelligence.dominantPitchers}
            className="dominant-pitchers"
            columns={[
              { key: 'pitcher', label: 'Pitcher' },
              { key: 'team', label: 'Team' },
              { key: 'battersAnalyzed', label: 'Batters' },
              { key: 'avgHRScore', label: 'Avg HR Score', format: 'score' },
              { key: 'vulnerabilityIndex', label: 'Dominance', format: 'score' }
            ]}
          />
        )}
      </div>
    )}
  </div>
);

// Category Breakdown Tab Component
const CategoryBreakdownTab = ({ breakdown }) => (
  <div className="category-breakdown-tab">
    {breakdown && (
      <div className="category-grid">
        {Object.entries(breakdown).map(([category, data]) => (
          <div key={category} className="category-card">
            <div className="category-header">
              <h5>{category}</h5>
              <span className="category-count">{data.count} players</span>
            </div>
            <div className="category-stats">
              <div className="category-stat">
                <span className="stat-label">Avg HR Score:</span>
                <span className="stat-value">{data.avgHRScore.toFixed(1)}</span>
              </div>
            </div>
            <div className="category-players">
              {data.players.slice(0, 3).map((player, index) => (
                <div key={index} className="category-player">
                  <span className="player-name">{player.name}</span>
                  <span className="player-team">({player.team})</span>
                  <span className="player-score">{player.hrScore.toFixed(1)}</span>
                </div>
              ))}
              {data.players.length > 3 && (
                <div className="more-players">+{data.players.length - 3} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Generic Opportunity Table Component
const OpportunityTable = ({ title, data, columns, className = '' }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className={`opportunity-table ${className}`}>
      <h5>{title}</h5>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 8).map((row, index) => (
              <tr key={index}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex}>
                    {formatCellValue(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Generic Pitcher Table Component
const PitcherTable = ({ title, data, columns, className = '' }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className={`pitcher-table ${className}`}>
      <h5>{title}</h5>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex}>
                    {formatCellValue(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Format cell values based on type
const formatCellValue = (value, format) => {
  if (value === null || value === undefined) return '-';

  switch (format) {
    case 'percentage':
      return `${value.toFixed(2)}%`;
    case 'score':
      return value.toFixed(1);
    case 'boost':
      return value > 0 ? `+${value}%` : value < 0 ? `${value}%` : '0%';
    case 'badges':
      if (Array.isArray(value)) {
        return (
          <div className="badges-cell">
            {value.slice(0, 2).map((badge, index) => (
              <span key={index} className="badge-item">{badge}</span>
            ))}
            {value.length > 2 && <span className="badge-more">+{value.length - 2}</span>}
          </div>
        );
      }
      return value;
    case 'threats':
      if (Array.isArray(value)) {
        return `${value.length} threats`;
      }
      return value;
    default:
      return value;
  }
};

export default BatchSummarySection;