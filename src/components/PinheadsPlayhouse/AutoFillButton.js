import React, { useState } from 'react';
import startingLineupService from '../../services/startingLineupService';
import './AutoFillButton.css';

const AutoFillButton = ({ 
  onAutoFill, 
  currentPitcher = '', 
  currentTeam = '',
  disabled = false,
  size = 'normal' // 'small', 'normal', 'large'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  
  const handleAutoFill = async () => {
    setIsLoading(true);
    setLastResult(null);
    
    try {
      const result = await startingLineupService.autoPopulateForm(
        currentPitcher, 
        currentTeam
      );
      
      setLastResult(result);
      
      if (onAutoFill) {
        onAutoFill(result);
      }
      
    } catch (error) {
      console.error('Auto-fill error:', error);
      setLastResult({
        pitcher: currentPitcher,
        team: currentTeam,
        confidence: 0,
        source: 'error',
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    if (currentPitcher && !currentTeam) return 'Find Opponent';
    if (currentTeam && !currentPitcher) return 'Find Pitcher';
    if (!currentPitcher && !currentTeam) return 'Get Today\'s Lineups';
    return 'Update from Lineups';
  };
  
  const getButtonIcon = () => {
    if (isLoading) return '⏳';
    if (lastResult?.confidence > 0) return '✅';
    return '📋';
  };
  
  const getButtonClass = () => {
    let className = `auto-fill-button ${size}`;
    
    if (disabled || isLoading) {
      className += ' disabled';
    }
    
    if (lastResult?.confidence >= 85) {
      className += ' success';
    } else if (lastResult?.confidence >= 60) {
      className += ' warning';
    } else if (lastResult?.error) {
      className += ' error';
    }
    
    return className;
  };
  
  const renderTooltip = () => {
    if (!lastResult) return null;
    
    let tooltipText = '';
    if (lastResult.error) {
      tooltipText = `Error: ${lastResult.error}`;
    } else if (lastResult.source === 'pitcher_lookup') {
      tooltipText = `Found ${lastResult.pitcher} vs ${lastResult.team} (${lastResult.confidence}% confidence)`;
    } else if (lastResult.source === 'team_lookup') {
      tooltipText = `Found ${lastResult.team} vs ${lastResult.pitcher} (${lastResult.confidence}% confidence)`;
    } else if (lastResult.source === 'manual') {
      tooltipText = 'No lineup data found for current input';
    }
    
    return tooltipText;
  };
  
  return (
    <div className="auto-fill-container">
      <button
        type="button"
        className={getButtonClass()}
        onClick={handleAutoFill}
        disabled={disabled || isLoading}
        title={renderTooltip()}
      >
        <span className="button-icon">{getButtonIcon()}</span>
        <span className="button-text">{getButtonText()}</span>
      </button>
      
      {lastResult && lastResult.gameInfo && (
        <div className="game-info-tooltip">
          <div className="tooltip-content">
            {lastResult.gameInfo.gameTime && (
              <span className="game-time">🕐 {lastResult.gameInfo.gameTime}</span>
            )}
            {lastResult.gameInfo.venue && (
              <span className="venue">🏟️ {lastResult.gameInfo.venue}</span>
            )}
            {lastResult.gameInfo.homeAway && (
              <span className="home-away">
                {lastResult.gameInfo.homeAway === 'home' ? '🏠' : '✈️'} 
                {lastResult.gameInfo.homeAway}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoFillButton;