import React from 'react';
import './DataQualityIndicator.css';

const DataQualityIndicator = ({ dataQuality }) => {
  if (!dataQuality || dataQuality.overall === 'loading') {
    return null;
  }

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'poor': return '🟠';
      case 'missing': return '🔴';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  const getQualityLabel = (quality) => {
    switch (quality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'poor': return 'Limited';
      case 'missing': return 'Missing';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const getOverallDescription = (overall) => {
    switch (overall) {
      case 'excellent': return 'All data sources available with high quality';
      case 'good': return 'Most data sources available with good quality';
      case 'poor': return 'Limited data available, some analysis may be estimated';
      case 'error': return 'Data loading encountered errors';
      default: return 'Data quality unknown';
    }
  };

  const getOverallClass = (overall) => {
    switch (overall) {
      case 'excellent': return 'excellent';
      case 'good': return 'good';
      case 'poor': return 'poor';
      case 'error': return 'error';
      default: return 'unknown';
    }
  };

  const shouldShowDetails = dataQuality.overall !== 'excellent';

  return (
    <div className={`data-quality-indicator ${getOverallClass(dataQuality.overall)}`}>
      <div className="quality-summary">
        <span className="quality-icon">
          {getQualityIcon(dataQuality.overall)}
        </span>
        <div className="quality-info">
          <span className="quality-status">
            Data Quality: {getQualityLabel(dataQuality.overall)}
          </span>
          <span className="quality-description">
            {getOverallDescription(dataQuality.overall)}
          </span>
        </div>
      </div>

      {shouldShowDetails && (
        <div className="quality-details">
          <div className="quality-breakdown">
            {dataQuality.rollingStats && (
              <div className="quality-item">
                <span className="item-icon">{getQualityIcon(dataQuality.rollingStats)}</span>
                <span className="item-label">Season Stats</span>
                <span className="item-status">{getQualityLabel(dataQuality.rollingStats)}</span>
              </div>
            )}
            
            {dataQuality.teamStats && (
              <div className="quality-item">
                <span className="item-icon">{getQualityIcon(dataQuality.teamStats)}</span>
                <span className="item-label">Team Context</span>
                <span className="item-status">{getQualityLabel(dataQuality.teamStats)}</span>
              </div>
            )}
            
            {dataQuality.handedness && (
              <div className="quality-item">
                <span className="item-icon">{getQualityIcon(dataQuality.handedness)}</span>
                <span className="item-label">Handedness Data</span>
                <span className="item-status">{getQualityLabel(dataQuality.handedness)}</span>
              </div>
            )}
            
            {dataQuality.propAnalysis && (
              <div className="quality-item">
                <span className="item-icon">{getQualityIcon(dataQuality.propAnalysis)}</span>
                <span className="item-label">Prop Analysis</span>
                <span className="item-status">{getQualityLabel(dataQuality.propAnalysis)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataQualityIndicator;