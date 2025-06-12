import React, { useState, useEffect } from 'react';
import './PoorPerformanceCard.css';

const PoorPerformanceCard = ({ poorPerformancePredictions, isLoading, teams: teamData }) => {
  const [error, setError] = useState(null);

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

  const formatRiskFactors = (riskFactors) => {
    return riskFactors.map(factor => {
      switch (factor.type) {
        case 'consecutive_games_fatigue':
          return `Fatigue Risk: ${factor.description}`;
        case 'post_peak_regression':
          return `Post-Peak Decline: Following strong performance`;
        case 'rest_day_pattern':
          return `Rest Day Struggle: ${Math.round(factor.historicalPoorPct * 100)}% poor games historically`;
        case 'road_series_position':
          return `Road Series: ${factor.description}`;
        case 'recent_slump':
          return `Recent Slump: ${factor.recentAvg} avg (vs ${factor.seasonAvg} season)`;
        case 'first_game_after_travel':
          return `Travel Fatigue: ${factor.travelDetails.distance}mi from ${factor.travelDetails.fromVenue}`;
        case 'last_game_before_travel':
          return `Pre-Travel Distraction: ${factor.travelDetails.distance}mi trip ahead`;
        default:
          return factor.description;
      }
    });
  };

  if (isLoading) {
    return (
      <div className="card poor-performance">
        <h3>⚠️ Poor Performance Risks</h3>
        <div className="loading-indicator">Loading performance risk analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card poor-performance">
        <h3>⚠️ Poor Performance Risks</h3>
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }

  if (!poorPerformancePredictions || poorPerformancePredictions.length === 0) {
    return (
      <div className="card poor-performance">
        <h3>⚠️ Poor Performance Risks</h3>
        <div className="no-data">No significant performance risks identified</div>
      </div>
    );
  }

  return (
    <div className="card poor-performance">
      <div className="card-header">
        <h3>⚠️ Poor Performance Risks</h3>
        <div className="risk-summary">
          <span className="risk-count high">
            {poorPerformancePredictions.filter(p => p.riskLevel === 'HIGH').length} High Risk
          </span>
          <span className="risk-count medium">
            {poorPerformancePredictions.filter(p => p.riskLevel === 'MEDIUM').length} Medium Risk
          </span>
        </div>
      </div>

      <div className="scrollable-container">
        <ul className="risk-list">
          {poorPerformancePredictions.slice(0, 20).map((prediction, index) => {
            const team = teamData[prediction.team];
            const riskColor = getRiskLevelColor(prediction.riskLevel);
            const riskIcon = getRiskLevelIcon(prediction.riskLevel);
            const formattedFactors = formatRiskFactors(prediction.riskFactors);

            return (
              <li key={`${prediction.playerName}_${prediction.team}_${index}`} className="risk-item">
                {/* Team logo background */}
                {team && team.logoUrl && (
                  <div 
                    className="team-logo-bg"
                    style={{
                      backgroundImage: `url(${team.logoUrl})`,
                      opacity: 0.1
                    }}
                  />
                )}
                
                <div className="risk-content">
                  <div className="player-info">
                    <div className="player-header">
                      <span className="player-name">{prediction.playerName}</span>
                      <span className="team-name" style={{ color: team?.primaryColor || '#333' }}>
                        {prediction.team}
                      </span>
                    </div>
                    
                    <div className="risk-score">
                      <span className="risk-icon">{riskIcon}</span>
                      <span 
                        className="score-value"
                        style={{ color: riskColor, fontWeight: 'bold' }}
                      >
                        {prediction.totalRiskScore} pts
                      </span>
                      <span 
                        className="risk-level"
                        style={{ 
                          color: riskColor,
                          backgroundColor: `${riskColor}20`,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '0.7rem'
                        }}
                      >
                        {prediction.riskLevel}
                      </span>
                    </div>
                  </div>

                  <div className="risk-factors">
                    {formattedFactors.map((factor, factorIndex) => (
                      <div key={factorIndex} className="risk-factor">
                        <span className="factor-text">{factor}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recent performance indicator */}
                  {prediction.analysis?.gameHistory && (
                    <div className="recent-performance">
                      <span className="performance-label">Last 5:</span>
                      <div className="performance-dots">
                        {prediction.analysis.gameHistory.slice(-5).map((game, gameIndex) => {
                          const hitRate = game.hits / Math.max(game.atBats, 1);
                          const dotColor = hitRate >= 0.300 ? '#28a745' : 
                                          hitRate >= 0.150 ? '#ffc107' : '#dc3545';
                          return (
                            <span
                              key={gameIndex}
                              className="performance-dot"
                              style={{ backgroundColor: dotColor }}
                              title={`${game.hits}/${game.atBats} (${(hitRate * 100).toFixed(0)}%)`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card-footer">
        <div className="legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#dc3545' }}></span>
            High Risk (50+ pts)
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#fd7e14' }}></span>
            Medium Risk (25-49 pts)
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#ffc107' }}></span>
            Low Risk (15-24 pts)
          </span>
        </div>
      </div>
    </div>
  );
};

export default PoorPerformanceCard;