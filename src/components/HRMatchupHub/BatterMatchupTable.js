import React, { useState } from 'react';
import './BatterMatchupTable.css';

/**
 * Batter Matchup Table - Sortable table with comprehensive player analysis
 */
const BatterMatchupTable = ({ players, sortOption, onSortChange }) => {
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  if (!players || players.length === 0) {
    return (
      <div className="batter-matchup-table no-data">
        <p>No players available for analysis</p>
      </div>
    );
  }

  const getRecommendationClass = (recommendation) => {
    switch (recommendation.action) {
      case 'STRONG_TARGET': return 'strong-target';
      case 'TARGET': return 'target';
      case 'CONSIDER': return 'consider';
      case 'NEUTRAL': return 'neutral';
      case 'CAUTION': return 'caution';
      case 'AVOID': return 'avoid';
      default: return 'neutral';
    }
  };

  const getConfidenceClass = (confidence) => {
    if (confidence >= 80) return 'high-confidence';
    if (confidence >= 60) return 'medium-confidence';
    return 'low-confidence';
  };

  const formatAdjustment = (value) => {
    if (value === 0) return '0';
    return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  };

  const handleRowClick = (playerName) => {
    setExpandedPlayer(expandedPlayer === playerName ? null : playerName);
  };

  const handleSort = (column) => {
    onSortChange(column);
  };

  const getSortIcon = (column) => {
    return sortOption === column ? '▼' : '⇅';
  };

  const renderExpandedDetails = (player) => {
    const { factorBreakdown, venueAnalysis, travelAnalysis, environmentalAnalysis, scheduleAnalysis } = player;

    return (
      <div className="expanded-details">
        <div className="details-grid">
          {/* Factor Breakdown */}
          <div className="detail-section">
            <h4>Factor Breakdown</h4>
            <div className="factor-list">
              <div className="factor-item">
                <span className="factor-label">Base Performance:</span>
                <span className="factor-value">{factorBreakdown.basePerformance.score.toFixed(1)}</span>
                <span className="factor-desc">{factorBreakdown.basePerformance.description}</span>
              </div>
              <div className="factor-item">
                <span className="factor-label">Venue Impact:</span>
                <span className={`factor-value ${factorBreakdown.venueFactors.score >= 0 ? 'positive' : 'negative'}`}>
                  {formatAdjustment(factorBreakdown.venueFactors.score)}
                </span>
                <span className="factor-desc">{factorBreakdown.venueFactors.description}</span>
              </div>
              <div className="factor-item">
                <span className="factor-label">Travel Impact:</span>
                <span className={`factor-value ${factorBreakdown.travelFactors.score >= 0 ? 'positive' : 'negative'}`}>
                  {formatAdjustment(factorBreakdown.travelFactors.score)}
                </span>
                <span className="factor-desc">{factorBreakdown.travelFactors.description}</span>
              </div>
              <div className="factor-item">
                <span className="factor-label">Environment:</span>
                <span className={`factor-value ${factorBreakdown.environmentalFactors.score >= 0 ? 'positive' : 'negative'}`}>
                  {formatAdjustment(factorBreakdown.environmentalFactors.score)}
                </span>
                <span className="factor-desc">{factorBreakdown.environmentalFactors.description}</span>
              </div>
              <div className="factor-item">
                <span className="factor-label">Schedule:</span>
                <span className={`factor-value ${factorBreakdown.scheduleFactors.score >= 0 ? 'positive' : 'negative'}`}>
                  {formatAdjustment(factorBreakdown.scheduleFactors.score)}
                </span>
                <span className="factor-desc">{factorBreakdown.scheduleFactors.description}</span>
              </div>
            </div>
          </div>

          {/* Venue Analysis */}
          <div className="detail-section">
            <h4>Venue Psychology</h4>
            {venueAnalysis && venueAnalysis.venuePersonality ? (
              <div className="venue-details">
                <div className="venue-stat">
                  <span className="stat-label">Classification:</span>
                  <span className="stat-value">{venueAnalysis.venuePersonality.classification.replace('_', ' ')}</span>
                </div>
                <div className="venue-stat">
                  <span className="stat-label">Games Played:</span>
                  <span className="stat-value">{venueAnalysis.gamesPlayed}</span>
                </div>
                <div className="venue-stat">
                  <span className="stat-label">Venue AVG:</span>
                  <span className="stat-value">{venueAnalysis.venueStats?.battingAverage?.toFixed(3) || 'N/A'}</span>
                </div>
                <div className="venue-stat">
                  <span className="stat-label">Venue HRs:</span>
                  <span className="stat-value">{venueAnalysis.venueStats?.homeRuns || 0}</span>
                </div>
                <div className="venue-description">
                  {venueAnalysis.venuePersonality.description}
                </div>
              </div>
            ) : (
              <div className="no-data">No venue history available</div>
            )}
          </div>

          {/* Travel Analysis */}
          <div className="detail-section">
            <h4>Travel Impact</h4>
            {travelAnalysis && travelAnalysis.performanceImpact ? (
              <div className="travel-details">
                <div className="travel-stat">
                  <span className="stat-label">Travel Distance:</span>
                  <span className="stat-value">{travelAnalysis.travelDistance || 0} miles</span>
                </div>
                <div className="travel-stat">
                  <span className="stat-label">Classification:</span>
                  <span className="stat-value">{travelAnalysis.travelClassification?.replace('_', ' ') || 'N/A'}</span>
                </div>
                <div className="travel-stat">
                  <span className="stat-label">Days of Rest:</span>
                  <span className="stat-value">{travelAnalysis.daysOfRest || 0}</span>
                </div>
                <div className="travel-stat">
                  <span className="stat-label">Consecutive Games:</span>
                  <span className="stat-value">{travelAnalysis.consecutiveGames || 1}</span>
                </div>
                <div className="travel-description">
                  {travelAnalysis.performanceImpact.recommendation}
                </div>
              </div>
            ) : (
              <div className="no-data">No travel data available</div>
            )}
          </div>

          {/* Environmental Analysis */}
          <div className="detail-section">
            <h4>Environmental Factors</h4>
            {environmentalAnalysis && environmentalAnalysis.environmentalImpacts ? (
              <div className="env-details">
                <div className="env-stat">
                  <span className="stat-label">Total Impact:</span>
                  <span className={`stat-value ${environmentalAnalysis.totalEnvironmentalImpact >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(environmentalAnalysis.totalEnvironmentalImpact)}
                  </span>
                </div>
                <div className="env-stat">
                  <span className="stat-label">Classification:</span>
                  <span className="stat-value">{environmentalAnalysis.classification?.replace('_', ' ') || 'N/A'}</span>
                </div>
                <div className="env-factors">
                  <div className="env-factor">
                    <span>Climate: {formatAdjustment(environmentalAnalysis.environmentalImpacts.climate?.factor || 0)}</span>
                  </div>
                  <div className="env-factor">
                    <span>Altitude: {formatAdjustment(environmentalAnalysis.environmentalImpacts.altitude?.factor || 0)}</span>
                  </div>
                  <div className="env-factor">
                    <span>Dome/Outdoor: {formatAdjustment(environmentalAnalysis.environmentalImpacts.dome?.factor || 0)}</span>
                  </div>
                </div>
                <div className="env-description">
                  {environmentalAnalysis.recommendation}
                </div>
              </div>
            ) : (
              <div className="no-data">No environmental data available</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="batter-matchup-table">
      <div className="table-header">
        <h3>Player Matchup Analysis</h3>
        <div className="table-info">
          <span>{players.length} players analyzed</span>
        </div>
      </div>

      <div className="table-container">
        <table className="matchup-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('playerName')} className="sortable">
                Player {getSortIcon('playerName')}
              </th>
              <th onClick={() => handleSort('team')} className="sortable">
                Team {getSortIcon('team')}
              </th>
              <th onClick={() => handleSort('totalScore')} className="sortable">
                Score {getSortIcon('totalScore')}
              </th>
              <th onClick={() => handleSort('basePerformance')} className="sortable">
                Base {getSortIcon('basePerformance')}
              </th>
              <th onClick={() => handleSort('venueImpact')} className="sortable">
                Venue {getSortIcon('venueImpact')}
              </th>
              <th onClick={() => handleSort('travelImpact')} className="sortable">
                Travel {getSortIcon('travelImpact')}
              </th>
              <th onClick={() => handleSort('confidence')} className="sortable">
                Confidence {getSortIcon('confidence')}
              </th>
              <th>Recommendation</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <React.Fragment key={`${player.playerName}_${player.team}_${index}`}>
                <tr className={`player-row ${getRecommendationClass(player.recommendation)}`}>
                  <td className="player-cell">
                    <div className="player-info">
                      <span className="player-name">{player.playerName}</span>
                      <span className="player-position">{player.isHome ? 'HOME' : 'AWAY'}</span>
                    </div>
                  </td>
                  <td className="team-cell">
                    <span className="team-badge">{player.team}</span>
                  </td>
                  <td className="score-cell">
                    <span className="total-score">{player.comprehensiveScore.totalScore}</span>
                  </td>
                  <td className="base-cell">
                    <span className="base-score">{player.comprehensiveScore.baseScore.toFixed(1)}</span>
                  </td>
                  <td className="venue-cell">
                    <span className={`adjustment ${player.comprehensiveScore.adjustments.venue >= 0 ? 'positive' : 'negative'}`}>
                      {formatAdjustment(player.comprehensiveScore.adjustments.venue)}
                    </span>
                  </td>
                  <td className="travel-cell">
                    <span className={`adjustment ${player.comprehensiveScore.adjustments.travel >= 0 ? 'positive' : 'negative'}`}>
                      {formatAdjustment(player.comprehensiveScore.adjustments.travel)}
                    </span>
                  </td>
                  <td className="confidence-cell">
                    <span className={`confidence ${getConfidenceClass(player.confidenceLevel)}`}>
                      {player.confidenceLevel}%
                    </span>
                  </td>
                  <td className="recommendation-cell">
                    <div className="recommendation">
                      <span className={`action ${getRecommendationClass(player.recommendation)}`}>
                        {player.recommendation.action.replace('_', ' ')}
                      </span>
                      <span className="reason">{player.recommendation.reason}</span>
                    </div>
                  </td>
                  <td className="details-cell">
                    <button 
                      className="details-button"
                      onClick={() => handleRowClick(player.playerName)}
                    >
                      {expandedPlayer === player.playerName ? '▼' : '▶'}
                    </button>
                  </td>
                </tr>
                {expandedPlayer === player.playerName && (
                  <tr className="expanded-row">
                    <td colSpan="9">
                      {renderExpandedDetails(player)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BatterMatchupTable;