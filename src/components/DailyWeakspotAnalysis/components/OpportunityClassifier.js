import React from 'react';

const OpportunityClassifier = ({ 
  opportunities, 
  classificationMode, 
  onClassificationChange, 
  totalOpportunities 
}) => {
  if (!opportunities || opportunities.length === 0) {
    return null;
  }

  // Classification options
  const classificationOptions = [
    { value: 'confidence', label: 'By Confidence Level', icon: '🎯' },
    { value: 'position', label: 'By Position Vulnerability', icon: '📍' },
    { value: 'timing', label: 'By Inning Timing', icon: '⏰' },
    { value: 'arsenal', label: 'By Arsenal Advantage', icon: '⚾' }
  ];

  // Group opportunities by current classification
  const groupOpportunities = () => {
    switch (classificationMode) {
      case 'confidence':
        return {
          'High Confidence (70%+)': opportunities.filter(o => (o.confidence_score || 0) >= 70),
          'Moderate Confidence (50-70%)': opportunities.filter(o => (o.confidence_score || 0) >= 50 && (o.confidence_score || 0) < 70),
          'Low Confidence (30-50%)': opportunities.filter(o => (o.confidence_score || 0) >= 30 && (o.confidence_score || 0) < 50),
          'Speculative (<30%)': opportunities.filter(o => (o.confidence_score || 0) < 30)
        };
      
      case 'position':
        return {
          'Elite Vulnerability (60+)': opportunities.filter(o => (o.vulnerability_score || 0) >= 60),
          'Strong Vulnerability (40-60)': opportunities.filter(o => (o.vulnerability_score || 0) >= 40 && (o.vulnerability_score || 0) < 60),
          'Moderate Vulnerability (25-40)': opportunities.filter(o => (o.vulnerability_score || 0) >= 25 && (o.vulnerability_score || 0) < 40),
          'Weak Signals (<25)': opportunities.filter(o => (o.vulnerability_score || 0) < 25)
        };
      
      case 'timing':
        const inningGroups = {
          'Early Innings (1-3)': opportunities.filter(o => o.inning && o.inning <= 3),
          'Middle Innings (4-6)': opportunities.filter(o => o.inning && o.inning >= 4 && o.inning <= 6),
          'Late Innings (7-9)': opportunities.filter(o => o.inning && o.inning >= 7),
          'Position-Based': opportunities.filter(o => o.type === 'position_vulnerability'),
          'Pattern-Based': opportunities.filter(o => o.type === 'predictability')
        };
        return inningGroups;
      
      case 'arsenal':
        return {
          'High Predictability (15+)': opportunities.filter(o => (o.predictability_score || 0) >= 15),
          'Moderate Predictability (10-15)': opportunities.filter(o => (o.predictability_score || 0) >= 10 && (o.predictability_score || 0) < 15),
          'Position Vulnerabilities': opportunities.filter(o => o.type === 'position_vulnerability'),
          'Timing Windows': opportunities.filter(o => o.type === 'inning_vulnerability'),
          'Mixed Opportunities': opportunities.filter(o => (o.predictability_score || 0) < 10 && o.type !== 'position_vulnerability' && o.type !== 'inning_vulnerability')
        };
      
      default:
        return { 'All Opportunities': opportunities };
    }
  };

  const groupedOpportunities = groupOpportunities();

  const getGroupColor = (groupName, count) => {
    if (count === 0) return 'group-empty';
    
    switch (classificationMode) {
      case 'confidence':
        if (groupName.includes('High Confidence')) return 'group-excellent';
        if (groupName.includes('Moderate Confidence')) return 'group-good';
        if (groupName.includes('Low Confidence')) return 'group-average';
        return 'group-poor';
      
      case 'position':
        if (groupName.includes('Elite')) return 'group-excellent';
        if (groupName.includes('Strong')) return 'group-good';
        if (groupName.includes('Moderate')) return 'group-average';
        return 'group-poor';
      
      case 'timing':
        if (groupName.includes('Early')) return 'group-good';
        if (groupName.includes('Middle')) return 'group-excellent';
        if (groupName.includes('Late')) return 'group-average';
        return 'group-good';
      
      case 'arsenal':
        if (groupName.includes('High Predictability')) return 'group-excellent';
        if (groupName.includes('Moderate Predictability')) return 'group-good';
        return 'group-average';
      
      default:
        return 'group-good';
    }
  };

  const getTopOpportunityInGroup = (group) => {
    if (group.length === 0) return null;
    
    return group.reduce((top, current) => {
      return (current.confidence_score || 0) > (top.confidence_score || 0) ? current : top;
    });
  };

  return (
    <div className="opportunity-classifier">
      <div className="classifier-header">
        <h2>Opportunity Classification</h2>
        <p>Analyze opportunities by different strategic dimensions</p>
      </div>

      <div className="classification-controls">
        <div className="classification-tabs">
          {classificationOptions.map(option => (
            <button
              key={option.value}
              className={`classification-tab ${classificationMode === option.value ? 'active' : ''}`}
              onClick={() => onClassificationChange(option.value)}
            >
              <span className="tab-icon">{option.icon}</span>
              <span className="tab-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="classification-summary">
        <div className="summary-header">
          <h3>
            {classificationOptions.find(o => o.value === classificationMode)?.label || 'Classification'} Overview
          </h3>
          <div className="total-count">
            {totalOpportunities} total opportunities across {Object.keys(groupedOpportunities).length} categories
          </div>
        </div>

        <div className="classification-groups">
          {Object.entries(groupedOpportunities).map(([groupName, group]) => {
            const topOpportunity = getTopOpportunityInGroup(group);
            const groupColorClass = getGroupColor(groupName, group.length);

            return (
              <div key={groupName} className={`classification-group ${groupColorClass}`}>
                <div className="group-header">
                  <div className="group-title">
                    <h4>{groupName}</h4>
                    <span className="group-count">{group.length} opportunities</span>
                  </div>
                  <div className="group-stats">
                    {group.length > 0 && (
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-value">
                            {Math.round(group.reduce((sum, o) => sum + (o.confidence_score || 0), 0) / group.length)}%
                          </span>
                          <span className="stat-label">Avg Confidence</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">
                            {Math.round(group.reduce((sum, o) => sum + (o.vulnerability_score || 0), 0) / group.length)}
                          </span>
                          <span className="stat-label">Avg Vulnerability</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="group-content">
                  {group.length === 0 ? (
                    <div className="empty-group">
                      <span className="empty-message">No opportunities in this category</span>
                    </div>
                  ) : (
                    <div className="group-opportunities">
                      {topOpportunity && (
                        <div className="top-opportunity">
                          <div className="opportunity-preview">
                            <div className="preview-matchup">
                              <span className="pitcher">{topOpportunity.pitcher}</span>
                              <span className="vs">vs</span>
                              <span className="team">{topOpportunity.opposing_team}</span>
                            </div>
                            <div className="preview-details">
                              {topOpportunity.position && (
                                <span className="detail">Position #{topOpportunity.position}</span>
                              )}
                              {topOpportunity.inning && (
                                <span className="detail">Inning {topOpportunity.inning}</span>
                              )}
                              {topOpportunity.predictability_score && (
                                <span className="detail">Predictability: {Math.round(topOpportunity.predictability_score)}</span>
                              )}
                            </div>
                            <div className="preview-score">
                              <span className="score-value">{Math.round(topOpportunity.confidence_score || 0)}%</span>
                              <span className="score-label">confidence</span>
                            </div>
                          </div>
                          {group.length > 1 && (
                            <div className="more-opportunities">
                              <span>+{group.length - 1} more</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="classification-insights">
        <div className="insights-grid">
          <div className="insight-card">
            <h4>🎯 Strategic Focus</h4>
            <p>
              {classificationMode === 'confidence' && 'Prioritize high-confidence opportunities with proven track records and reliable data.'}
              {classificationMode === 'position' && 'Target lineup positions where pitchers consistently struggle against specific batting order spots.'}
              {classificationMode === 'timing' && 'Focus on specific innings when pitcher performance typically degrades or follows patterns.'}
              {classificationMode === 'arsenal' && 'Exploit predictable pitch sequences and recognizable patterns in pitcher arsenals.'}
            </p>
          </div>
          <div className="insight-card">
            <h4>📊 Risk Management</h4>
            <p>Balance high-confidence plays with sample size considerations. Smaller samples increase variance but may offer higher upside in unique situations.</p>
          </div>
          <div className="insight-card">
            <h4>⚡ Quick Insights</h4>
            <p>
              Best category: {
                Object.entries(groupedOpportunities)
                  .filter(([, group]) => group.length > 0)
                  .sort(([,a], [,b]) => {
                    const avgA = a.reduce((sum, o) => sum + (o.confidence_score || 0), 0) / a.length;
                    const avgB = b.reduce((sum, o) => sum + (o.confidence_score || 0), 0) / b.length;
                    return avgB - avgA;
                  })?.[0]?.[0] || 'None'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityClassifier;