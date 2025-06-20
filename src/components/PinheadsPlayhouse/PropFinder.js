/**
 * PropFinder.js
 * 
 * Component for displaying betting prop opportunities based on player recent performance
 */

import React, { useState, useEffect, useMemo } from 'react';
import propFinderService from '../../services/propFinderService';
import './PropFinder.css';

const PropFinder = ({ predictions, gameData }) => {
  const [propOpportunities, setPropOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('confidence'); // 'confidence', 'probability', 'player'
  const [filterCategory, setFilterCategory] = useState('all'); // 'all', 'hitting', 'power', 'rbi'
  const [minProbability, setMinProbability] = useState(50);

  // Generate prop opportunities when predictions change
  useEffect(() => {
    const generateProps = async () => {
      if (!predictions || predictions.length === 0) {
        setPropOpportunities([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log(`🎯 Analyzing prop opportunities for ${predictions.length} players`);
        const opportunities = await propFinderService.analyzePropOpportunities(predictions, gameData);
        setPropOpportunities(opportunities);
        console.log(`✅ Found ${opportunities.length} prop opportunities`);
      } catch (err) {
        console.error('Error generating prop opportunities:', err);
        setError(err.message);
        setPropOpportunities([]);
      } finally {
        setLoading(false);
      }
    };

    generateProps();
  }, [predictions, gameData]);

  // Filter and sort opportunities
  const filteredOpportunities = useMemo(() => {
    let filtered = propOpportunities.filter(opportunity => {
      // Filter by category
      if (filterCategory !== 'all') {
        const hasCategory = opportunity.props.some(prop => prop.category === filterCategory);
        if (!hasCategory) return false;
      }

      // Filter by minimum probability
      const bestPropProbability = opportunity.bestProp?.probability || 0;
      if (bestPropProbability < minProbability) return false;

      return true;
    });

    // Sort opportunities
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'probability':
          return (b.bestProp?.probability || 0) - (a.bestProp?.probability || 0);
        case 'confidence':
          return b.confidence - a.confidence;
        case 'player':
          return a.playerName.localeCompare(b.playerName);
        default:
          return b.confidence - a.confidence;
      }
    });

    return filtered;
  }, [propOpportunities, filterCategory, minProbability, sortBy]);

  const getConfidenceClass = (confidence) => {
    if (confidence >= 0.8) return 'confidence-excellent';
    if (confidence >= 0.7) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-good';
    if (confidence >= 0.5) return 'confidence-medium';
    return 'confidence-low';
  };

  const getProbabilityClass = (probability) => {
    if (probability >= 80) return 'prob-excellent';
    if (probability >= 70) return 'prob-high';
    if (probability >= 60) return 'prob-good';
    if (probability >= 50) return 'prob-medium';
    return 'prob-low';
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'hitting': return '🎯';
      case 'power': return '⚡';
      case 'rbi': return '💪';
      case 'runs': return '🏃';
      case 'total_bases': return '📏';
      case 'strikeouts': return '⚾';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <div className="prop-finder">
        <div className="prop-finder-header">
          <h3>🎯 Prop Finder</h3>
        </div>
        <div className="prop-loading">
          <div className="loading-spinner"></div>
          <span>Analyzing prop opportunities...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prop-finder">
        <div className="prop-finder-header">
          <h3>🎯 Prop Finder</h3>
        </div>
        <div className="prop-error">
          <span>⚠️ Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="prop-finder">
      <div className="prop-finder-header">
        <h3>🎯 Prop Finder</h3>
        <div className="prop-summary">
          <span>{filteredOpportunities.length} high-probability opportunities</span>
          <span>Based on last 10 games</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="prop-controls">
        <div className="prop-filters">
          <div className="filter-group">
            <label>Category:</label>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Props</option>
              <option value="hitting">🎯 Hitting</option>
              <option value="power">⚡ Power</option>
              <option value="rbi">💪 RBI</option>
              <option value="runs">🏃 Runs</option>
              <option value="total_bases">📏 Total Bases</option>
              <option value="strikeouts">⚾ Strikeouts</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Min Probability:</label>
            <select 
              value={minProbability} 
              onChange={(e) => setMinProbability(parseInt(e.target.value))}
            >
              <option value="40">40%+</option>
              <option value="50">50%+</option>
              <option value="60">60%+</option>
              <option value="70">70%+</option>
              <option value="80">80%+</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="confidence">Confidence</option>
              <option value="probability">Probability</option>
              <option value="player">Player Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prop Opportunities Table */}
      {filteredOpportunities.length > 0 ? (
        <div className="prop-table-container">
          <table className="prop-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Best Prop</th>
                <th>Rate</th>
                <th>Confidence</th>
                <th>All Props</th>
                <th>Context</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.slice(0, 20).map((opportunity, index) => (
                <tr key={index}>
                  <td className="player-info">
                    <div className="player-name">{opportunity.playerName}</div>
                    <div className="player-team">{opportunity.team}</div>
                  </td>
                  
                  <td className="best-prop">
                    <div className="prop-type">
                      {getCategoryIcon(opportunity.bestProp?.category)}
                      {opportunity.bestProp?.type}
                    </div>
                    <div className="prop-trend">{opportunity.bestProp?.trend}</div>
                  </td>
                  
                  <td className={`prop-rate ${getProbabilityClass(opportunity.bestProp?.probability)}`}>
                    <div className="rate-percentage">
                      {opportunity.bestProp?.probability?.toFixed(1)}%
                    </div>
                    <div className="rate-record">
                      {opportunity.bestProp?.last10}
                    </div>
                  </td>
                  
                  <td className={`confidence ${getConfidenceClass(opportunity.confidence)}`}>
                    <div className="confidence-level">
                      {opportunity.confidence >= 0.8 ? '🔥 HIGH' :
                       opportunity.confidence >= 0.7 ? '📈 GOOD' :
                       opportunity.confidence >= 0.6 ? '📊 MED' : '⚠️ LOW'}
                    </div>
                    <div className="confidence-score">
                      {(opportunity.confidence * 100).toFixed(0)}%
                    </div>
                  </td>
                  
                  <td className="all-props">
                    <div className="props-list">
                      {opportunity.props.slice(0, 3).map((prop, propIndex) => (
                        <div key={propIndex} className="prop-item">
                          <span className="prop-icon">{getCategoryIcon(prop.category)}</span>
                          <span className="prop-name">{prop.type}</span>
                          <span className={`prop-prob ${getProbabilityClass(prop.probability)}`}>
                            {prop.probability.toFixed(0)}%
                          </span>
                        </div>
                      ))}
                      {opportunity.props.length > 3 && (
                        <div className="more-props">+{opportunity.props.length - 3} more</div>
                      )}
                    </div>
                  </td>
                  
                  <td className="situational-boost">
                    <div className="boost-text">
                      {opportunity.situationalBoost}
                    </div>
                    {/* Show lineup context if available */}
                    {opportunity.lineupContext?.isInLineup && (
                      <div className="lineup-context">
                        <span className="batting-order">
                          #{opportunity.lineupContext.battingOrder} {opportunity.lineupContext.position}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-props">
          <div className="no-props-message">
            <span>📊 No prop opportunities found</span>
            <p>Try lowering the minimum probability or checking different categories</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="prop-legend">
        <h4>Legend:</h4>
        <div className="legend-grid">
          <div className="legend-item">
            <span className="legend-icon">🔥</span>
            <span>Hot (80%+ recent)</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">📈</span>
            <span>Improving (60%+ recent)</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">➡️</span>
            <span>Stable (40%+ recent)</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">📉</span>
            <span>Declining (20%+ recent)</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🥶</span>
            <span>Cold (&lt;20% recent)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropFinder;