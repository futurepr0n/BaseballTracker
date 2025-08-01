import React from 'react';
import './PerformanceVisualization.css';

/**
 * PerformanceVisualization Component
 * 
 * Replicates the prop betting bar chart visualization from the image:
 * - "Over 0.5 Home Runs" style prop analysis
 * - Historical success rate bars for different time periods
 * - Color-coded performance indicators
 * - Multiple prop types (HR, Hits, RBI, Runs)
 */
const PerformanceVisualization = ({ propAnalysis, player }) => {
  if (!propAnalysis) {
    return (
      <div className="performance-visualization loading">
        <div className="viz-header">
          <h3>📊 Prop Performance Analysis</h3>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Calculating prop success rates...</p>
        </div>
      </div>
    );
  }

  // Define prop betting scenarios to analyze (using 2025 season as primary display)
  const propScenarios = [
    {
      id: 'hr_05',
      title: 'Over 0.5 Home Runs',
      subtitle: 'Home Run Probability',
      data: propAnalysis.season2025?.homeRuns?.over05 || propAnalysis.homeRuns?.over05,
      color: '#ff6b35',
      icon: '⚾'
    },
    {
      id: 'hits_05',
      title: 'Over 0.5 Hits',
      subtitle: 'Hit Probability',
      data: propAnalysis.season2025?.hits?.over05 || propAnalysis.hits?.over05,
      color: '#4caf50',
      icon: '🎯'
    },
    {
      id: 'hits_15',
      title: 'Over 1.5 Hits',
      subtitle: 'Multi-Hit Performance',
      data: propAnalysis.season2025?.hits?.over15 || propAnalysis.hits?.over15,
      color: '#66bb6a',
      icon: '📈'
    },
    {
      id: 'rbi_05',
      title: 'Over 0.5 RBI',
      subtitle: 'RBI Production',
      data: propAnalysis.season2025?.rbi?.over05 || propAnalysis.rbi?.over05,
      color: '#2196f3',
      icon: '🎯'
    },
    {
      id: 'runs_05',
      title: 'Over 0.5 Runs',
      subtitle: 'Scoring Ability',
      data: propAnalysis.season2025?.runs?.over05 || propAnalysis.runs?.over05,
      color: '#9c27b0',
      icon: '🏃'
    }
  ];

  // Time period definitions for enhanced analysis
  const timePeriods = [
    { key: 'season2024', label: '2024', description: '2024 Season' },
    { key: 'season2025', label: '2025', description: '2025 Season' },
    { key: 'last15', label: 'L15', description: 'Last 15 Games' },
    { key: 'last10', label: 'L10', description: 'Last 10 Games' },
    { key: 'last5', label: 'L5', description: 'Last 5 Games' }
  ];

  const getSuccessColor = (percentage) => {
    if (percentage >= 70) return '#4caf50'; // Green - Strong success
    if (percentage >= 50) return '#ff9800'; // Orange - Moderate success
    if (percentage >= 30) return '#2196f3'; // Blue - Fair success
    return '#f44336'; // Red - Poor success
  };

  const getConfidenceLevel = (total, percentage) => {
    if (total >= 15 && percentage >= 60) return 'High';
    if (total >= 10 && percentage >= 40) return 'Medium';
    if (total >= 5) return 'Low';
    return 'Very Low';
  };

  const renderPropScenario = (scenario) => {
    if (!scenario.data) return null;

    const { success, total, percentage } = scenario.data;
    const successRate = parseFloat(percentage);
    const confidence = getConfidenceLevel(total, successRate);

    return (
      <div key={scenario.id} className="prop-scenario">
        <div className="scenario-header">
          <div className="scenario-title">
            <span className="scenario-icon">{scenario.icon}</span>
            <div className="title-text">
              <h4>{scenario.title}</h4>
              <p>{scenario.subtitle}</p>
            </div>
          </div>
          <div className="scenario-stats">
            <div className="success-rate" style={{ color: scenario.color }}>
              {percentage}%
            </div>
            <div className="sample-size">
              {success}/{total} games
            </div>
          </div>
        </div>

        <div className="prop-bars">
          {timePeriods.map((period) => {
            // Get real data for this time period and prop type
            const periodData = propAnalysis[period.key];
            const propType = scenario.id.includes('hr') ? 'homeRuns' : 
                            scenario.id.includes('rbi') ? 'rbi' :
                            scenario.id.includes('runs') ? 'runs' : 'hits';
            const propThreshold = scenario.id.includes('15') ? 'over15' : 'over05';
            
            const realPeriodData = periodData?.[propType]?.[propThreshold];
            
            // Handle unavailable data gracefully
            if (!realPeriodData) {
              return (
                <div key={period.key} className="period-bar">
                  <div className="period-label">
                    <span className="period-name">{period.label}</span>
                    <span className="period-description">{period.description}</span>
                  </div>
                  <div className="bar-container unavailable">
                    <div className="unavailable-data">
                      {period.key === 'season2024' ? '2024 Data Unavailable' : 'Insufficient Data'}
                    </div>
                  </div>
                  <div className="period-stats">
                    <span className="period-record">--/--</span>
                  </div>
                </div>
              );
            }

            const periodSuccess = realPeriodData.success || 0;
            const periodTotal = realPeriodData.total || 0;
            const periodPercentage = parseFloat(realPeriodData.percentage) || 0;

            return (
              <div key={period.key} className="period-bar">
                <div className="period-label">
                  <span className="period-name">{period.label}</span>
                  <span className="period-description">{period.description}</span>
                  {realPeriodData.note && (
                    <span className="period-note" title={realPeriodData.note}>ⓘ</span>
                  )}
                </div>
                <div className="bar-container">
                  <div 
                    className="success-bar"
                    style={{
                      width: `${Math.max(5, periodPercentage)}%`,
                      backgroundColor: getSuccessColor(periodPercentage)
                    }}
                  >
                    <span className="bar-percentage">
                      {periodPercentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="period-stats">
                  <span className="period-record">
                    {periodSuccess}/{periodTotal}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="scenario-footer">
          <div className="confidence-indicator">
            <span className="confidence-label">Confidence:</span>
            <span className={`confidence-level ${confidence.toLowerCase().replace(' ', '-')}`}>
              {confidence}
            </span>
          </div>
          <div className="recommendation">
            {successRate >= 60 ? (
              <span className="rec-positive">✅ Strong Bet</span>
            ) : successRate >= 40 ? (
              <span className="rec-moderate">⚡ Consider</span>
            ) : (
              <span className="rec-negative">❌ Avoid</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="performance-visualization">
      <div className="viz-header">
        <h3>📊 Prop Performance Analysis</h3>
        <p>Historical success rates for key betting props</p>
      </div>

      <div className="prop-scenarios">
        {propScenarios.map(renderPropScenario)}
      </div>

      <div className="viz-summary">
        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-label">Best Prop:</span>
            <span className="summary-value">
              {propScenarios.reduce((best, current) => 
                (current.data && parseFloat(current.data.percentage) > parseFloat(best.data?.percentage || 0)) 
                  ? current : best, 
                propScenarios[0]
              )?.title || 'N/A'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Sample Size:</span>
            <span className="summary-value">
              {propAnalysis.homeRuns?.over05?.total || 0} games
            </span>
          </div>
        </div>
        
        <div className="analysis-note">
          <p>
            <strong>Analysis Note:</strong> Success rates based on recent performance history. 
            Higher confidence levels indicate larger sample sizes and more reliable predictions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceVisualization;