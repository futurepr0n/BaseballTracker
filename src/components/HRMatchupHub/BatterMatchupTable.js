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

  const formatAdjustmentClass = (value) => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  const formatAdjustment = (value) => {
    if (value === 0) return '0';
    return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
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

  const renderMobileCard = (player, index) => (
    <div key={`${player.playerName}_${player.team}_${index}`} className="mobile-player-card">
      <div className="mobile-card-header">
        <div className="mobile-player-info">
          <div className="mobile-player-name">{player.playerName}</div>
          <div className="mobile-team-position">
            <span className="mobile-team-badge">{player.team}</span>
            <span className="mobile-position">{player.isHome ? 'HOME' : 'AWAY'}</span>
          </div>
        </div>
        <div className="mobile-total-score">{parseFloat(player.comprehensiveScore.totalScore).toFixed(2)}</div>
      </div>

      <div className="mobile-card-content">
        <div className="mobile-stat">
          <div className="mobile-stat-label">Base Score</div>
          <div className="mobile-stat-value neutral">{player.comprehensiveScore.baseScore.toFixed(2)}</div>
        </div>
        <div className="mobile-stat">
          <div className="mobile-stat-label">Venue</div>
          <div className={`mobile-stat-value ${formatAdjustmentClass(player.comprehensiveScore.adjustments.venue || 0)}`}>
            {formatAdjustment(player.comprehensiveScore.adjustments.venue || 0)}
          </div>
        </div>
        <div className="mobile-stat">
          <div className="mobile-stat-label">Travel</div>
          <div className={`mobile-stat-value ${formatAdjustmentClass(player.comprehensiveScore.adjustments.travel || 0)}`}>
            {formatAdjustment(player.comprehensiveScore.adjustments.travel || 0)}
          </div>
        </div>
        <div className="mobile-stat">
          <div className="mobile-stat-label">Context</div>
          <div className={`mobile-stat-value ${formatAdjustmentClass(player.comprehensiveScore.contextualBonus || 0)}`}>
            {formatAdjustment(player.comprehensiveScore.contextualBonus || 0)}
          </div>
        </div>
      </div>

      <div className="mobile-recommendation">
        <div className={`mobile-action ${getRecommendationClass(player.recommendation)}`}>
          {player.recommendation.action.replace('_', ' ')}
        </div>
        <div className="mobile-reason">{player.recommendation.reason}</div>
      </div>

      <div className="mobile-card-footer">
        <div className="mobile-confidence">
          <span>Confidence:</span>
          <span className={`mobile-confidence-badge ${getConfidenceClass(player.confidenceLevel)}`}>
            {player.confidenceLevel}%
          </span>
        </div>
        <button 
          className="mobile-expand-button"
          onClick={() => handleRowClick(player.playerName)}
        >
          {expandedPlayer === player.playerName ? 'Less ▲' : 'More ▼'}
        </button>
      </div>

      {player.comprehensiveScore.hellraiserData?.isHellraiserPick || (player.comprehensiveScore.contextualBadges && player.comprehensiveScore.contextualBadges.length > 0) ? (
        <div className="mobile-contextual-indicators">
          {player.comprehensiveScore.hellraiserData?.isHellraiserPick && (
            <span className="mobile-hellraiser-indicator" title="Hellraiser Pick">🔥</span>
          )}
          {player.comprehensiveScore.contextualBadges && player.comprehensiveScore.contextualBadges.length > 0 && (
            <span className="mobile-badge-count" title={`${player.comprehensiveScore.contextualBadges.length} active badges`}>
              {player.comprehensiveScore.contextualBadges.length} badges 📊
            </span>
          )}
        </div>
      ) : null}

      {expandedPlayer === player.playerName && (
        <div style={{ marginTop: '1rem' }}>
          {renderExpandedDetails(player)}
        </div>
      )}
    </div>
  );

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
                <span className="factor-value">{factorBreakdown.basePerformance.score.toFixed(2)}</span>
                <span className="factor-desc">{factorBreakdown.basePerformance.description}</span>
              </div>
              
              {/* HR Due Factor (predictive data) */}
              {factorBreakdown.dueFactors && (
                <div className="factor-item">
                  <span className="factor-label">HR Due Factor:</span>
                  <span className={`factor-value ${factorBreakdown.dueFactors.score >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(factorBreakdown.dueFactors.score)}
                  </span>
                  <span className="factor-desc">{factorBreakdown.dueFactors.description}</span>
                </div>
              )}

              {/* HR Rate Factor (predictive data) */}
              {factorBreakdown.hrRateFactors && (
                <div className="factor-item">
                  <span className="factor-label">HR Rate Factor:</span>
                  <span className={`factor-value ${factorBreakdown.hrRateFactors.score >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(factorBreakdown.hrRateFactors.score)}
                  </span>
                  <span className="factor-desc">{factorBreakdown.hrRateFactors.description}</span>
                </div>
              )}

              {/* Pressure Factor (predictive data) */}
              {factorBreakdown.pressureFactors && (
                <div className="factor-item">
                  <span className="factor-label">Pressure Factor:</span>
                  <span className={`factor-value ${factorBreakdown.pressureFactors.score >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(factorBreakdown.pressureFactors.score)}
                  </span>
                  <span className="factor-desc">{factorBreakdown.pressureFactors.description}</span>
                </div>
              )}

              {/* Historical analysis factors (only show if available) */}
              {factorBreakdown.venueFactors && (
                <div className="factor-item">
                  <span className="factor-label">Venue Impact:</span>
                  <span className={`factor-value ${factorBreakdown.venueFactors.score >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(factorBreakdown.venueFactors.score)}
                  </span>
                  <span className="factor-desc">{factorBreakdown.venueFactors.description}</span>
                </div>
              )}

              {factorBreakdown.travelFactors && (
                <div className="factor-item">
                  <span className="factor-label">Travel Impact:</span>
                  <span className={`factor-value ${factorBreakdown.travelFactors.score >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(factorBreakdown.travelFactors.score)}
                  </span>
                  <span className="factor-desc">{factorBreakdown.travelFactors.description}</span>
                </div>
              )}

              {factorBreakdown.environmentalFactors && (
                <div className="factor-item">
                  <span className="factor-label">Environment:</span>
                  <span className={`factor-value ${factorBreakdown.environmentalFactors.score >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(factorBreakdown.environmentalFactors.score)}
                  </span>
                  <span className="factor-desc">{factorBreakdown.environmentalFactors.description}</span>
                </div>
              )}

              {factorBreakdown.scheduleFactors && (
                <div className="factor-item">
                  <span className="factor-label">Schedule:</span>
                  <span className={`factor-value ${factorBreakdown.scheduleFactors.score >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(factorBreakdown.scheduleFactors.score)}
                  </span>
                  <span className="factor-desc">{factorBreakdown.scheduleFactors.description}</span>
                </div>
              )}

              {/* Home Field Advantage */}
              {factorBreakdown.homeFieldAdvantage && (
                <div className="factor-item">
                  <span className="factor-label">Home Field:</span>
                  <span className={`factor-value ${factorBreakdown.homeFieldAdvantage.score >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(factorBreakdown.homeFieldAdvantage.score)}
                  </span>
                  <span className="factor-desc">{factorBreakdown.homeFieldAdvantage.description}</span>
                </div>
              )}
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
                  <span className="stat-label">Venue Hits:</span>
                  <span className="stat-value">{venueAnalysis.venueStats?.hits || 0}</span>
                </div>
                <div className="venue-stat">
                  <span className="stat-label">Venue HRs:</span>
                  <span className="stat-value">{venueAnalysis.venueStats?.homeRuns || 0}</span>
                </div>
                <div className="venue-stat">
                  <span className="stat-label">Hit/HR Ratio:</span>
                  <span className="stat-value">{venueAnalysis.venueStats?.hitToHRRatio?.toFixed(1) || 'N/A'}</span>
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
            {console.log('🔍 TRAVEL DEBUG:', { 
              playerName: player.playerName, 
              team: player.team, 
              isHome: player.isHome,
              travelAnalysis,
              hasPerformanceImpact: travelAnalysis?.performanceImpact,
              travelType: travelAnalysis?.travelType,
              distance: travelAnalysis?.travelDistance
            })}
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

          {/* Pitcher Intelligence Analysis */}
          <div className="detail-section">
            <h4>Pitcher Intelligence</h4>
            {factorBreakdown.pitcherIntelligence && factorBreakdown.pitcherIntelligence.overall.score !== 0 ? (
              <div className="pitcher-details">
                <div className="pitcher-stat">
                  <span className="stat-label">Matchup Advantage:</span>
                  <span className={`stat-value ${factorBreakdown.pitcherIntelligence.overall.score >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(factorBreakdown.pitcherIntelligence.overall.score)}
                  </span>
                </div>
                <div className="pitcher-stat">
                  <span className="stat-label">Threat Level:</span>
                  <span className="stat-value">{factorBreakdown.pitcherIntelligence.threatLevel}</span>
                </div>
                {factorBreakdown.pitcherIntelligence.arsenalMatchup && (
                  <div className="arsenal-details">
                    <div className="pitcher-stat">
                      <span className="stat-label">Pitcher Advantage:</span>
                      <span className="stat-value">{factorBreakdown.pitcherIntelligence.arsenalMatchup.pitcherAdvantage || 0}</span>
                    </div>
                    <div className="matchup-details">
                      {factorBreakdown.pitcherIntelligence.arsenalMatchup.matchupDetails?.map((detail, idx) => (
                        <div key={idx} className="pitch-detail">
                          <span className="pitch-type">{detail.pitch}:</span>
                          <span className={`threat-level ${detail.threat}`}>{detail.threat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pitcher-description">
                  <strong>Analysis:</strong> {factorBreakdown.pitcherIntelligence.overall.description}
                </div>
                <div className="pitcher-strategy">
                  <strong>Strategy:</strong> {factorBreakdown.pitcherIntelligence.strategicRecommendation}
                </div>
              </div>
            ) : (
              <div className="no-data">No pitcher intelligence available</div>
            )}
          </div>

          {/* Contextual Bonuses & Badges */}
          <div className="detail-section">
            <h4>Contextual Analysis</h4>
            {player.comprehensiveScore?.contextualBadges && player.comprehensiveScore.contextualBadges.length > 0 ? (
              <div className="contextual-details">
                <div className="contextual-stat">
                  <span className="stat-label">Contextual Bonus:</span>
                  <span className={`stat-value ${player.comprehensiveScore.contextualBonus >= 0 ? 'positive' : 'negative'}`}>
                    {formatAdjustment(player.comprehensiveScore.contextualBonus || 0)}
                  </span>
                </div>
                
                {/* Hellraiser Data Section */}
                {player.comprehensiveScore.hellraiserData?.isHellraiserPick && (
                  <div className="hellraiser-section">
                    <div className="section-header">
                      <span className="hellraiser-badge">🔥 Hellraiser Pick</span>
                      <span className="classification">{player.comprehensiveScore.hellraiserData.classification}</span>
                    </div>
                    <div className="hellraiser-metrics">
                      {player.comprehensiveScore.hellraiserData.exitVelocity > 0 && (
                        <div className="metric">
                          <span className="metric-label">Exit Velocity:</span>
                          <span className="metric-value">{player.comprehensiveScore.hellraiserData.exitVelocity.toFixed(1)} mph</span>
                        </div>
                      )}
                      {player.comprehensiveScore.hellraiserData.barrelRate > 0 && (
                        <div className="metric">
                          <span className="metric-label">Barrel Rate:</span>
                          <span className="metric-value">{player.comprehensiveScore.hellraiserData.barrelRate.toFixed(1)}%</span>
                        </div>
                      )}
                      {player.comprehensiveScore.hellraiserData.hardContact > 0 && (
                        <div className="metric">
                          <span className="metric-label">Hard Contact:</span>
                          <span className="metric-value">{player.comprehensiveScore.hellraiserData.hardContact.toFixed(1)}%</span>
                        </div>
                      )}
                      <div className="pathway-info">
                        <span className="pathway-label">Pathway:</span>
                        <span className="pathway-value">{player.comprehensiveScore.hellraiserData.pathway}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Badges Display */}
                <div className="badges-section">
                  <div className="badges-header">Active Badges:</div>
                  <div className="badges-list">
                    {player.comprehensiveScore.contextualBadges.map((badge, idx) => (
                      <div key={idx} className="badge-item" title={badge.label}>
                        <span className="badge-emoji">{badge.emoji}</span>
                        <span className="badge-label">{badge.label}</span>
                        <span className={`badge-bonus ${badge.bonus >= 0 ? 'positive' : 'negative'}`}>
                          {badge.bonus >= 0 ? '+' : ''}{badge.bonus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scoring Breakdown */}
                {player.comprehensiveScore.scoringBreakdown && (
                  <div className="scoring-breakdown">
                    <div className="breakdown-header">Bonus Breakdown:</div>
                    <div className="breakdown-text">{player.comprehensiveScore.scoringBreakdown}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">No contextual bonuses available</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="hr-matchup-hub">
      <div className="batter-matchup-table">
        <div className="table-header">
          <h3>Player Matchup Analysis</h3>
          <div className="table-info">
            <span>{players.length} players analyzed</span>
          </div>
        </div>

      {/* Detached Header */}
      <div className="detached-header">
        <div onClick={() => handleSort('playerName')} className="header-cell sortable">
          Player {getSortIcon('playerName')}
        </div>
        <div onClick={() => handleSort('team')} className="header-cell sortable">
          Team {getSortIcon('team')}
        </div>
        <div onClick={() => handleSort('totalScore')} className="header-cell sortable">
          Score {getSortIcon('totalScore')}
        </div>
        <div onClick={() => handleSort('basePerformance')} className="header-cell sortable">
          Base {getSortIcon('basePerformance')}
        </div>
        <div onClick={() => handleSort('venueImpact')} className="header-cell sortable">
          Venue {getSortIcon('venueImpact')}
        </div>
        <div onClick={() => handleSort('travelImpact')} className="header-cell sortable">
          Travel {getSortIcon('travelImpact')}
        </div>
        <div onClick={() => handleSort('contextualBonus')} className="header-cell sortable">
          Context {getSortIcon('contextualBonus')}
        </div>
        <div onClick={() => handleSort('confidence')} className="header-cell sortable">
          Conf {getSortIcon('confidence')}
        </div>
        <div className="header-cell">Rec</div>
        <div className="header-cell">▶</div>
      </div>

      <div className="table-container">
        <table className="matchup-table">
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
                    <span className="total-score">{parseFloat(player.comprehensiveScore.totalScore).toFixed(2)}</span>
                  </td>
                  <td className="base-cell">
                    <span className="base-score">{player.comprehensiveScore.baseScore.toFixed(2)}</span>
                  </td>
                  <td className="venue-cell">
                    <span className={`adjustment ${(player.comprehensiveScore.adjustments.venue || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {formatAdjustment(player.comprehensiveScore.adjustments.venue || 0)}
                    </span>
                  </td>
                  <td className="travel-cell">
                    <span className={`adjustment ${(player.comprehensiveScore.adjustments.travel || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {formatAdjustment(player.comprehensiveScore.adjustments.travel || 0)}
                    </span>
                  </td>
                  <td className="contextual-cell">
                    <div className="contextual-info">
                      <span className={`adjustment ${(player.comprehensiveScore.contextualBonus || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {formatAdjustment(player.comprehensiveScore.contextualBonus || 0)}
                      </span>
                      {player.comprehensiveScore.hellraiserData?.isHellraiserPick && (
                        <span className="hellraiser-indicator" title="Hellraiser Pick">🔥</span>
                      )}
                      {player.comprehensiveScore.contextualBadges && player.comprehensiveScore.contextualBadges.length > 0 && (
                        <span className="badge-count" title={`${player.comprehensiveScore.contextualBadges.length} active badges`}>
                          {player.comprehensiveScore.contextualBadges.length}📊
                        </span>
                      )}
                    </div>
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
                    <td colSpan="10">
                      {renderExpandedDetails(player)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        
        {/* Mobile Card Layout */}
        <div className="mobile-card-container">
          {players.map((player, index) => renderMobileCard(player, index))}
        </div>
      </div>
    </div>
    </div>
  );
};

export default BatterMatchupTable;