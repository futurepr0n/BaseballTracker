import React, { useState } from 'react';
import startingLineupService from '../../services/startingLineupService';
import './LineupRefreshButton.css';

const LineupRefreshButton = ({ 
  onRefresh,
  onStatusUpdate,
  disabled = false,
  showStatus = true,
  size = 'normal'
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [status, setStatus] = useState(null);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Force refresh lineup data
      const lineupData = await startingLineupService.refreshLineupData();
      
      // Get updated status
      const statusData = await startingLineupService.getLineupsStatus();
      setStatus(statusData);
      
      const refreshTime = new Date();
      setLastRefresh(refreshTime);
      
      // Notify parent components
      if (onRefresh) {
        onRefresh(lineupData);
      }
      
      if (onStatusUpdate) {
        onStatusUpdate(statusData);
      }
      
    } catch (error) {
      console.error('Refresh error:', error);
      setStatus({
        available: false,
        error: error.message,
        lastUpdated: null
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const formatLastRefresh = () => {
    if (!lastRefresh) return '';
    
    const now = new Date();
    const diffSeconds = Math.floor((now - lastRefresh) / 1000);
    
    if (diffSeconds < 60) return 'Just refreshed';
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `Refreshed ${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `Refreshed ${diffHours}h ago`;
  };
  
  const getStatusIndicator = () => {
    if (isRefreshing) return '⏳';
    if (!status) return '🔄';
    if (status.error) return '❌';
    if (status.available && status.gamesCount > 0) return '✅';
    return '⚠️';
  };
  
  const getButtonClass = () => {
    let className = `lineup-refresh-button ${size}`;
    
    if (disabled || isRefreshing) {
      className += ' disabled';
    }
    
    if (status?.available && status.gamesCount > 0) {
      className += ' success';
    } else if (status?.error) {
      className += ' error';
    }
    
    return className;
  };
  
  const getTooltipText = () => {
    if (isRefreshing) return 'Refreshing lineup data...';
    if (!status) return 'Click to refresh lineup data';
    if (status.error) return `Error: ${status.error}`;
    if (status.available) {
      return `${status.gamesCount} games, ${status.lineupsCount} with lineups\nData quality: ${status.dataQuality}\nLast updated: ${status.lastUpdated ? new Date(status.lastUpdated).toLocaleString() : 'Unknown'}`;
    }
    return 'No lineup data available';
  };
  
  return (
    <div className="lineup-refresh-container">
      <button
        type="button"
        className={getButtonClass()}
        onClick={handleRefresh}
        disabled={disabled || isRefreshing}
        title={getTooltipText()}
      >
        <span className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`}>
          {getStatusIndicator()}
        </span>
        <span className="refresh-text">
          {isRefreshing ? 'Refreshing...' : 'Refresh Lineups'}
        </span>
      </button>
      
      {showStatus && (status || lastRefresh) && (
        <div className="refresh-status">
          {status && (
            <div className="status-info">
              <span className="games-count">
                📊 {status.gamesCount} games
              </span>
              {status.lineupsCount > 0 && (
                <span className="lineups-count">
                  📋 {status.lineupsCount} lineups
                </span>
              )}
              <span className="data-quality">
                🎯 {status.dataQuality}
              </span>
            </div>
          )}
          
          {lastRefresh && (
            <div className="last-refresh">
              {formatLastRefresh()}
            </div>
          )}
          
          {status?.alerts && status.alerts.length > 0 && (
            <div className="alerts">
              {status.alerts.map((alert, index) => (
                <div key={index} className={`alert alert-${alert.type}`}>
                  <span className="alert-icon">⚠️</span>
                  <span className="alert-message">{alert.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LineupRefreshButton;