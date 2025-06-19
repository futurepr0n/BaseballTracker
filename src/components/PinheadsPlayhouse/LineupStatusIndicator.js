import React from 'react';
import './LineupStatusIndicator.css';

const LineupStatusIndicator = ({ 
  status, 
  confidence = 0, 
  lastUpdated = null, 
  className = '' 
}) => {
  
  const getStatusIcon = () => {
    if (confidence >= 85) return '✅';
    if (confidence >= 60) return '⚠️';
    if (confidence > 0) return '❓';
    return '❌';
  };
  
  const getStatusText = () => {
    if (confidence >= 85) return 'Confirmed';
    if (confidence >= 60) return 'Probable';
    if (confidence > 0) return 'Tentative';
    return 'Unknown';
  };
  
  const getStatusClass = () => {
    if (confidence >= 85) return 'confirmed';
    if (confidence >= 60) return 'probable';
    if (confidence > 0) return 'tentative';
    return 'unknown';
  };
  
  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    
    try {
      const date = new Date(lastUpdated);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  };
  
  return (
    <div className={`lineup-status-indicator ${getStatusClass()} ${className}`}>
      <span className="status-icon">{getStatusIcon()}</span>
      <span className="status-text">{getStatusText()}</span>
      {confidence > 0 && (
        <span className="confidence-badge">{confidence}%</span>
      )}
      {lastUpdated && (
        <span className="last-updated" title={`Last updated: ${new Date(lastUpdated).toLocaleString()}`}>
          {formatLastUpdated()}
        </span>
      )}
    </div>
  );
};

export default LineupStatusIndicator;