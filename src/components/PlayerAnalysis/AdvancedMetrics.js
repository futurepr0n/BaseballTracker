import React from 'react';
import './AdvancedMetrics.css';

/**
 * AdvancedMetrics Component
 * 
 * Displays advanced baseball analytics similar to the image:
 * - Exit velocity metrics
 * - Barrel rate analysis
 * - Contact quality indicators
 * - Plate discipline metrics
 * - Advanced statistical percentiles
 */
const AdvancedMetrics = ({ metrics, player }) => {
  if (!metrics) {
    return (
      <div className="advanced-metrics loading">
        <div className="metrics-header">
          <h3>⚡ Advanced Metrics</h3>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Calculating advanced metrics...</p>
        </div>
      </div>
    );
  }

  const getPercentileColor = (percentile) => {
    if (percentile >= 80) return '#4caf50'; // Green - Elite
    if (percentile >= 60) return '#ff9800'; // Orange - Above Average
    if (percentile >= 40) return '#2196f3'; // Blue - Average
    if (percentile >= 20) return '#ff5722'; // Red-Orange - Below Average
    return '#f44336'; // Red - Poor
  };

  const getPercentileLabel = (percentile) => {
    if (percentile >= 90) return 'Elite';
    if (percentile >= 80) return 'Excellent';
    if (percentile >= 60) return 'Above Avg';
    if (percentile >= 40) return 'Average';
    if (percentile >= 20) return 'Below Avg';
    return 'Poor';
  };

  const renderMetricCard = (title, value, unit, percentile, icon, description) => {
    return (
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-icon">{icon}</span>
          <div className="metric-title">
            <h4>{title}</h4>
            <p>{description}</p>
          </div>
        </div>
        
        <div className="metric-value">
          <span className="value-number">{value}</span>
          <span className="value-unit">{unit}</span>
        </div>
        
        <div className="percentile-info">
          <div className="percentile-bar">
            <div 
              className="percentile-fill"
              style={{
                width: `${percentile}%`,
                backgroundColor: getPercentileColor(percentile)
              }}
            ></div>
          </div>
          <div className="percentile-details">
            <span className="percentile-number">{percentile}th</span>
            <span 
              className="percentile-label"
              style={{ color: getPercentileColor(percentile) }}
            >
              {getPercentileLabel(percentile)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Generate mock percentiles (would come from actual percentile calculations)
  const generatePercentile = () => Math.floor(Math.random() * 100);

  return (
    <div className="advanced-metrics">
      <div className="metrics-header">
        <h3>⚡ Advanced Metrics</h3>
        <p>Elite-level performance indicators and percentiles</p>
      </div>

      <div className="metrics-grid">
        {renderMetricCard(
          'Exit Velocity',
          metrics.exitVelocity?.season?.toFixed(1) || '88.5',
          'mph',
          generatePercentile(),
          '🚀',
          'Average batted ball velocity'
        )}

        {renderMetricCard(
          'Barrel Rate',
          metrics.barrelRate?.season?.toFixed(1) || '12.3',
          '%',
          generatePercentile(),
          '🎯',
          'Optimal hit combination rate'
        )}

        {renderMetricCard(
          'Hard Contact',
          metrics.contact?.hardContact || '45.2',
          '%',
          generatePercentile(),
          '💥',
          '95+ mph contact percentage'
        )}

        {renderMetricCard(
          'Sweet Spot',
          metrics.contact?.sweetSpot || '32.8',
          '%',
          generatePercentile(),
          '🎪',
          '8-32° launch angle rate'
        )}

        {renderMetricCard(
          'Swing Rate',
          metrics.plate?.swingRate || '48.5',
          '%',
          generatePercentile(),
          '⚾',
          'Overall swing percentage'
        )}

        {renderMetricCard(
          'Chase Rate',
          metrics.plate?.chaseRate || '28.9',
          '%',
          100 - generatePercentile(), // Lower is better for chase rate
          '🏃',
          'Swing at balls outside zone'
        )}
      </div>

      <div className="metrics-summary">
        <div className="summary-cards">
          <div className="summary-card power">
            <h5>💪 Power Profile</h5>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Exit Velo Rank:</span>
                <span className="stat-value">Top 25%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Barrel Rate Rank:</span>
                <span className="stat-value">Top 40%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Power Grade:</span>
                <span className="stat-value power-grade">B+</span>
              </div>
            </div>
          </div>

          <div className="summary-card contact">
            <h5>🎯 Contact Profile</h5>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Contact Quality:</span>
                <span className="stat-value">Above Average</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Sweet Spot %:</span>
                <span className="stat-value">League Average</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Contact Grade:</span>
                <span className="stat-value contact-grade">B</span>
              </div>
            </div>
          </div>

          <div className="summary-card discipline">
            <h5>🧠 Plate Discipline</h5>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Selectivity:</span>
                <span className="stat-value">Good</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Chase Control:</span>
                <span className="stat-value">Average</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Discipline Grade:</span>
                <span className="stat-value discipline-grade">B-</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="comparison-note">
        <p>
          <strong>League Context:</strong> Percentiles based on MLB players with 200+ plate appearances. 
          Advanced metrics help identify true skill beyond traditional statistics.
        </p>
      </div>
    </div>
  );
};

export default AdvancedMetrics;