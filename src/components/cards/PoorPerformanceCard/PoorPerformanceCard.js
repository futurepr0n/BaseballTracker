import React, { useState, useEffect } from 'react';
import useTeamFilteredData from '../../useTeamFilter';
import { useTooltip } from '../../utils/TooltipContext';
import { createSafeId } from '../../utils/tooltipUtils';
import './PoorPerformanceCard.css';

const PoorPerformanceCard = ({ poorPerformancePredictions, isLoading, teams: teamData, maxItems = 15 }) => {
  const [error, setError] = useState(null);
  const { openTooltip } = useTooltip();

  // Apply team filtering
  const filteredData = useTeamFilteredData(poorPerformancePredictions, 'team');

  // No useEffect needed - data comes from props

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH':
        return '#dc3545'; // Red
      case 'MEDIUM':
        return '#fd7e14'; // Orange
      case 'LOW':
        return '#ffc107'; // Yellow
      default:
        return '#6c757d'; // Gray
    }
  };

  const getRiskLevelIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH':
        return '🔴';
      case 'MEDIUM':
        return '🟠';
      case 'LOW':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const handlePlayerClick = (player, event) => {
    const safeId = createSafeId(player.playerName, player.team);
    const tooltipId = `poor_performance_${safeId}`;
    
    openTooltip(tooltipId, event.currentTarget, {
      type: 'poor_performance',
      player: player
    });
  };

  const getTeamLogo = (teamCode) => {
    if (!teamData[teamCode]) return null;
    return `/data/logos/${teamCode.toLowerCase()}_logo.png`;
  };

  if (isLoading) {
    return (
      <div className="card poor-performance-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>⚠️ Poor Performance Risks</h3>
          </div>
          <div className="loading-indicator">Loading performance risk analysis...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card poor-performance-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>⚠️ Poor Performance Risks</h3>
          </div>
          <div className="error-message">Error: {error}</div>
        </div>
      </div>
    );
  }

  const displayData = filteredData.slice(0, maxItems);

  if (displayData.length === 0) {
    return (
      <div className="card poor-performance-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>⚠️ Poor Performance Risks</h3>
          </div>
          <div className="no-data">No significant performance risks identified for the selected teams.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card poor-performance-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>⚠️ Poor Performance Risks</h3>
          <div className="card-subtitle">
            {displayData.filter(p => p.riskLevel === 'HIGH').length} High Risk, {displayData.filter(p => p.riskLevel === 'MEDIUM').length} Medium Risk
          </div>
        </div>
        
        <div className="scrollable-container">
        <ul className="player-list">
          {displayData.map((prediction, index) => {
            const playerKey = `${prediction.playerName}_${prediction.team}`;
            const riskColor = getRiskLevelColor(prediction.riskLevel);
            const riskIcon = getRiskLevelIcon(prediction.riskLevel);
            // Use same approach as working DayOfWeekHitsCard
            const teamInfo = teamData && prediction.team ? teamData[prediction.team] : null;
            const logoUrl = teamInfo ? teamInfo.logoUrl : null;
            
            return (
              <li key={playerKey} className="player-item risk-item">
                <div className="player-rank" style={{ backgroundColor: teamData[prediction.team]?.colors?.primary || '#333' }}>
                  {logoUrl && (
                    <>
                      <img 
                        src={logoUrl} 
                        alt="" 
                        className="rank-logo"
                        loading="lazy"
                        aria-hidden="true"
                      />
                      <div className="rank-overlay"></div>
                    </>
                  )}
                  <span className="rank-number">{index + 1}</span>
                </div>
                
                <div className="player-info" onClick={(e) => handlePlayerClick(prediction, e)}>
                  <div className="player-name">{prediction.playerName}</div>
                  <div className="player-team">{prediction.team}</div>
                </div>
                
                <div className="risk-details">
                  <div className="risk-score-compact">
                    <span className="score-value" style={{ color: riskColor }}>{prediction.totalRiskScore}</span>
                    <span className="score-label">pts</span>
                  </div>
                  <div className="factor-info">
                    <div className="factor-count">
                      {prediction.riskFactors.length} factor{prediction.riskFactors.length !== 1 ? 's' : ''}
                    </div>
                    <div className="top-factor">
                      {prediction.riskFactors[0]?.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  </div>
                </div>

                <button 
                  className="expand-toggle tooltip-trigger"
                  onClick={(e) => handlePlayerClick(prediction, e)}
                  aria-label="View detailed risk analysis"
                >
                  ℹ️
                </button>
                
                {/* Risk badge positioned in top-right corner */}
                <div className="risk-badge-overlay">
                  <span 
                    className="risk-badge"
                    style={{ color: riskColor }}
                  >
                    {riskIcon} {prediction.riskLevel}
                  </span>
                </div>
                
                {/* Enhanced background logo */}
                {logoUrl && (
                  <img 
                    src={logoUrl} 
                    alt="" 
                    className="team-logo-bg" 
                    loading="lazy"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ul>
        </div>
      </div>
    </div>
  );
};

export default PoorPerformanceCard;