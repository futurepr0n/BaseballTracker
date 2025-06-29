import React, { useState, useEffect } from 'react';
import hellraiserAnalysisService from '../../services/hellraiserAnalysisService';
import { useTeamFilter } from '../TeamFilterContext';
import GlassCard, { GlassScrollableContainer } from './GlassCard/GlassCard';
import './BarrelMatchupCard.css';

const BarrelMatchupCard = ({ currentDate }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'pitcherContactAllowed', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState({});
  const { selectedTeam, includeMatchup, matchupTeam } = useTeamFilter();

  useEffect(() => {
    loadBarrelAnalysis();
  }, [currentDate, selectedTeam, includeMatchup]);

  const loadBarrelAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert currentDate to YYYY-MM-DD format
      let analyzeDate;
      if (currentDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        analyzeDate = `${year}-${month}-${day}`;
      } else {
        analyzeDate = new Date().toISOString().split('T')[0];
      }
      
      // Get team filter parameters
      const teamFilter = selectedTeam && includeMatchup ? [selectedTeam, matchupTeam] : selectedTeam ? [selectedTeam] : null;
      
      const analysis = await hellraiserAnalysisService.analyzeDay(analyzeDate, teamFilter);
      
      if (analysis.error) {
        if (analysis.picks && Array.isArray(analysis.picks)) {
          setAnalysisData(processAnalysisData(analysis));
        } else {
          setError(analysis.error);
        }
      } else {
        setAnalysisData(processAnalysisData(analysis));
      }
    } catch (err) {
      console.error('Error loading Barrel analysis:', err);
      setError('Failed to load Barrel analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const processAnalysisData = (analysis) => {
    // Extract pitcher metrics from reasoning field
    const processedPicks = analysis.picks.map(pick => {
      const reasoning = pick.reasoning || '';
      
      // Extract pitcher contact allowed (exit velocity)
      const contactMatch = reasoning.match(/Pitcher allows (?:solid|hard) contact \(([0-9.]+) mph\)/);
      const pitcherContactAllowed = contactMatch ? parseFloat(contactMatch[1]) : 0;
      
      // Extract pitcher barrel vulnerability
      const barrelMatch = reasoning.match(/Pitcher vulnerable to barrels \(([0-9.]+)%\)/);
      const pitcherBarrelVulnerable = barrelMatch ? parseFloat(barrelMatch[1]) : 0;
      
      // Extract player exit velocity
      const exitVeloMatch = reasoning.match(/(?:Elite|Strong) exit velocity \(([0-9.]+) mph\)/);
      const playerExitVelocity = exitVeloMatch ? parseFloat(exitVeloMatch[1]) : 0;
      
      // Extract player barrel rate
      const barrelRateMatch = reasoning.match(/(?:Elite|Strong) barrel rate \(([0-9.]+)%\)/);
      const playerBarrelRate = barrelRateMatch ? parseFloat(barrelRateMatch[1]) : 0;
      
      // Extract player hard contact rate
      const hardContactMatch = reasoning.match(/(?:Elite|Strong) hard contact \(([0-9.]+)%\)/);
      const playerHardContact = hardContactMatch ? parseFloat(hardContactMatch[1]) : 0;
      
      // Extract pitcher allows hard contact (exit velocity)
      const pitcherHardContactMatch = reasoning.match(/Pitcher allows (?:hard|solid) contact \(([0-9.]+) mph\)/);
      const pitcherHardContact = pitcherHardContactMatch ? parseFloat(pitcherHardContactMatch[1]) : 0;
      
      // Extract HR rate allowed
      const hrRateMatch = reasoning.match(/(?:Moderate|High|Low) HR rate allowed \(([0-9.]+)\/game\)/);
      const pitcherHRRate = hrRateMatch ? parseFloat(hrRateMatch[1]) : 0;
      
      // Calculate market edge value for sorting
      const marketEdge = pick.marketEfficiency?.edge || 0;
      
      return {
        ...pick,
        pitcherContactAllowed,
        pitcherBarrelVulnerable,
        playerExitVelocity,
        playerBarrelRate,
        playerHardContact,
        pitcherHardContact,
        pitcherHRRate,
        marketEdge,
        matchupScore: calculateMatchupScore(playerBarrelRate, pitcherBarrelVulnerable, playerExitVelocity, pitcherContactAllowed, playerHardContact, pitcherHardContact)
      };
    });
    
    return {
      ...analysis,
      picks: processedPicks
    };
  };

  const calculateMatchupScore = (playerBarrelRate, pitcherBarrelVulnerable, playerExitVelocity, pitcherContactAllowed, playerHardContact, pitcherHardContact) => {
    // Higher score = better matchup for the hitter
    let score = 0;
    
    // Barrel matchup (most important)
    if (playerBarrelRate > 15 && pitcherBarrelVulnerable > 12) {
      score += 40;
    } else if (playerBarrelRate > 10 && pitcherBarrelVulnerable > 10) {
      score += 25;
    } else if (playerBarrelRate > 8 && pitcherBarrelVulnerable > 8) {
      score += 15;
    }
    
    // Exit velocity matchup
    if (playerExitVelocity > 92 && pitcherContactAllowed > 90) {
      score += 30;
    } else if (playerExitVelocity > 90 && pitcherContactAllowed > 88) {
      score += 20;
    } else if (playerExitVelocity > 88 && pitcherContactAllowed > 86) {
      score += 10;
    }
    
    // Hard contact matchup (new)
    if (playerHardContact > 50 && pitcherHardContact > 90) {
      score += 25;
    } else if (playerHardContact > 45 && pitcherHardContact > 88) {
      score += 15;
    } else if (playerHardContact > 40 && pitcherHardContact > 86) {
      score += 8;
    }
    
    // Bonus for extreme vulnerabilities
    if (pitcherBarrelVulnerable > 15) score += 15;
    if (pitcherContactAllowed > 92) score += 15;
    if (pitcherHardContact > 92) score += 12; // New bonus for hard contact vulnerability
    
    return score;
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Handle market efficiency object
      if (sortConfig.key === 'marketEdge') {
        aValue = a.marketEfficiency?.edge || 0;
        bValue = b.marketEfficiency?.edge || 0;
      }
      
      if (aValue === bValue) return 0;
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const toggleRowExpansion = (index) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getSortIndicator = (column) => {
    if (sortConfig.key !== column) return '↕️';
    return sortConfig.direction === 'desc' ? '↓' : '↑';
  };

  const getValueColor = (value, type) => {
    switch (type) {
      case 'pitcherContact':
        if (value >= 92) return '#ff4444'; // Bad for pitcher, good for hitter
        if (value >= 90) return '#ff8844';
        if (value >= 88) return '#ffaa44';
        return '#4CAF50';
      
      case 'pitcherBarrel':
        if (value >= 15) return '#ff4444';
        if (value >= 12) return '#ff8844';
        if (value >= 10) return '#ffaa44';
        return '#4CAF50';
      
      case 'playerExitVelo':
        if (value >= 94) return '#4CAF50';
        if (value >= 92) return '#66BB6A';
        if (value >= 90) return '#81C784';
        return '#ffaa44';
      
      case 'playerBarrel':
        if (value >= 20) return '#4CAF50';
        if (value >= 15) return '#66BB6A';
        if (value >= 10) return '#81C784';
        return '#ffaa44';
      
      case 'playerHardContact':
        if (value >= 55) return '#4CAF50';
        if (value >= 50) return '#66BB6A';
        if (value >= 45) return '#81C784';
        if (value >= 40) return '#ffaa44';
        return '#F44336';
      
      case 'pitcherHardContact':
        if (value >= 92) return '#ff4444'; // Bad for pitcher, good for hitter
        if (value >= 90) return '#ff8844';
        if (value >= 88) return '#ffaa44';
        if (value >= 86) return '#81C784';
        return '#4CAF50';
      
      case 'confidence':
        if (value >= 80) return '#4CAF50';
        if (value >= 70) return '#66BB6A';
        if (value >= 60) return '#FFC107';
        return '#F44336';
      
      case 'marketEdge':
        if (value >= 0.1) return '#4CAF50';
        if (value >= 0) return '#66BB6A';
        if (value >= -0.1) return '#FFC107';
        return '#F44336';
      
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <GlassCard className="barrel-matchup-card" variant="default">
        <div className="card-header">
          <h3>🎯 Barrel Matchup Analysis</h3>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Analyzing barrel matchups...</p>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="barrel-matchup-card" variant="default">
        <div className="card-header">
          <h3>🎯 Barrel Matchup Analysis</h3>
        </div>
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={loadBarrelAnalysis} className="retry-button">
            Retry Analysis
          </button>
        </div>
      </GlassCard>
    );
  }

  if (!analysisData || !analysisData.picks || analysisData.picks.length === 0) {
    return (
      <GlassCard className="barrel-matchup-card" variant="default">
        <div className="card-header">
          <h3>🎯 Barrel Matchup Analysis</h3>
        </div>
        <div className="no-data">
          <p>No barrel matchup data available</p>
        </div>
      </GlassCard>
    );
  }

  const sortedPicks = sortData(analysisData.picks);

  return (
    <GlassCard className="barrel-matchup-card" variant="default">
      <div className="glass-header">
        <h3>🎯 Barrel Matchup Analysis</h3>
        <span className="card-subtitle">Click column headers to sort • Click rows to expand</span>
      </div>

      <GlassScrollableContainer className="table-container">
        <div className="desktop-view">
          <table className="matchup-table">
          <thead>
            <tr>
              <th className="player-col">Player</th>
              <th className="sortable" onClick={() => handleSort('pitcherContactAllowed')}>
                Pitcher Contact {getSortIndicator('pitcherContactAllowed')}
                <span className="header-subtitle">Exit Velo Allowed</span>
              </th>
              <th className="sortable" onClick={() => handleSort('pitcherBarrelVulnerable')}>
                Pitcher Barrels {getSortIndicator('pitcherBarrelVulnerable')}
                <span className="header-subtitle">Barrel % Allowed</span>
              </th>
              <th className="sortable" onClick={() => handleSort('playerExitVelocity')}>
                Player Exit Velo {getSortIndicator('playerExitVelocity')}
              </th>
              <th className="sortable" onClick={() => handleSort('playerBarrelRate')}>
                Player Barrels {getSortIndicator('playerBarrelRate')}
              </th>
              <th className="sortable" onClick={() => handleSort('playerHardContact')}>
                Player Hard Contact {getSortIndicator('playerHardContact')}
                <span className="header-subtitle">Hard Contact %</span>
              </th>
              <th className="sortable" onClick={() => handleSort('pitcherHardContact')}>
                Pitcher Hard Contact {getSortIndicator('pitcherHardContact')}
                <span className="header-subtitle">Exit Velo Allowed</span>
              </th>
              <th className="sortable" onClick={() => handleSort('confidenceScore')}>
                Confidence {getSortIndicator('confidenceScore')}
              </th>
              <th className="sortable" onClick={() => handleSort('marketEdge')}>
                Market Edge {getSortIndicator('marketEdge')}
              </th>
              <th className="sortable" onClick={() => handleSort('matchupScore')}>
                Matchup Score {getSortIndicator('matchupScore')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPicks.map((pick, index) => (
              <React.Fragment key={index}>
                <tr className="data-row" onClick={() => toggleRowExpansion(index)}>
                  <td className="player-cell">
                    <div className="player-info">
                      <span className="player-name">{pick.playerName}</span>
                      <span className="team-info">{pick.team} vs {pick.pitcher}</span>
                    </div>
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getValueColor(pick.pitcherContactAllowed, 'pitcherContact') + '20' }}
                  >
                    {pick.pitcherContactAllowed > 0 ? `${pick.pitcherContactAllowed.toFixed(1)} mph` : '-'}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getValueColor(pick.pitcherBarrelVulnerable, 'pitcherBarrel') + '20' }}
                  >
                    {pick.pitcherBarrelVulnerable > 0 ? `${pick.pitcherBarrelVulnerable.toFixed(1)}%` : '-'}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getValueColor(pick.playerExitVelocity, 'playerExitVelo') + '20' }}
                  >
                    {pick.playerExitVelocity > 0 ? `${pick.playerExitVelocity.toFixed(1)} mph` : '-'}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getValueColor(pick.playerBarrelRate, 'playerBarrel') + '20' }}
                  >
                    {pick.playerBarrelRate > 0 ? `${pick.playerBarrelRate.toFixed(1)}%` : '-'}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getValueColor(pick.playerHardContact, 'playerHardContact') + '20' }}
                  >
                    {pick.playerHardContact > 0 ? `${pick.playerHardContact.toFixed(1)}%` : '-'}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getValueColor(pick.pitcherHardContact, 'pitcherHardContact') + '20' }}
                  >
                    {pick.pitcherHardContact > 0 ? `${pick.pitcherHardContact.toFixed(1)} mph` : '-'}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getValueColor(pick.confidenceScore, 'confidence') + '20' }}
                  >
                    {pick.confidenceScore}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getValueColor(pick.marketEdge, 'marketEdge') + '20' }}
                  >
                    {pick.marketEdge ? `${(pick.marketEdge * 100).toFixed(1)}%` : '-'}
                  </td>
                  <td className="score-cell">
                    <div className="matchup-score" style={{ '--score': pick.matchupScore }}>
                      {pick.matchupScore}
                    </div>
                  </td>
                </tr>
                {expandedRows[index] && (
                  <tr className="expanded-row">
                    <td colSpan="10">
                      <div className="expanded-content">
                        <div className="analysis-section">
                          <h5>Full Analysis:</h5>
                          <p>{pick.reasoning}</p>
                        </div>
                        <div className="details-grid">
                          <div className="detail-item">
                            <span className="label">Classification:</span>
                            <span className="value">{pick.classification}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Pathway:</span>
                            <span className="value">{pick.pathway}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Odds:</span>
                            <span className="value">{pick.odds?.american || '-'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Player Hard Contact:</span>
                            <span className="value">{pick.playerHardContact > 0 ? `${pick.playerHardContact.toFixed(1)}%` : '-'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Pitcher Hard Contact:</span>
                            <span className="value">{pick.pitcherHardContact > 0 ? `${pick.pitcherHardContact.toFixed(1)} mph` : '-'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">HR Rate Allowed:</span>
                            <span className="value">{pick.pitcherHRRate > 0 ? `${pick.pitcherHRRate.toFixed(2)}/game` : '-'}</span>
                          </div>
                        </div>
                        {pick.riskFactors && pick.riskFactors.length > 0 && (
                          <div className="risk-section">
                            <h5>Risk Factors:</h5>
                            <ul>
                              {pick.riskFactors.map((risk, i) => (
                                <li key={i}>{risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          </table>
        </div>
        
        {/* Mobile View */}
        <div className="mobile-view">
          <div className="mobile-cards">
            {sortedPicks.map((pick, index) => (
              <div key={index} className={`mobile-card ${expandedRows[index] ? 'expanded' : ''}`}>
                <div className="mobile-card-header" onClick={() => toggleRowExpansion(index)}>
                  <div className="player-rank">
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  <div className="player-info">
                    <div className="player-name">{pick.playerName}</div>
                    <div className="team-info">{pick.team} vs {pick.pitcher}</div>
                  </div>
                  <div className="matchup-score-mobile">
                    <div className="score-value" style={{ '--score': pick.matchupScore }}>
                      {pick.matchupScore}
                    </div>
                    <div className="expand-icon">
                      {expandedRows[index] ? '▼' : '▶'}
                    </div>
                  </div>
                </div>
                
                {expandedRows[index] && (
                  <div className="mobile-card-content">
                    <div className="metrics-grid">
                      <div className="metric-item">
                        <span className="metric-label">Pitcher Contact</span>
                        <span 
                          className="metric-value"
                          style={{ backgroundColor: getValueColor(pick.pitcherContactAllowed, 'pitcherContact') + '20' }}
                        >
                          {pick.pitcherContactAllowed > 0 ? `${pick.pitcherContactAllowed.toFixed(1)} mph` : '-'}
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Pitcher Barrels</span>
                        <span 
                          className="metric-value"
                          style={{ backgroundColor: getValueColor(pick.pitcherBarrelVulnerable, 'pitcherBarrel') + '20' }}
                        >
                          {pick.pitcherBarrelVulnerable > 0 ? `${pick.pitcherBarrelVulnerable.toFixed(1)}%` : '-'}
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Player Exit Velo</span>
                        <span 
                          className="metric-value"
                          style={{ backgroundColor: getValueColor(pick.playerExitVelocity, 'playerExitVelo') + '20' }}
                        >
                          {pick.playerExitVelocity > 0 ? `${pick.playerExitVelocity.toFixed(1)} mph` : '-'}
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Player Barrels</span>
                        <span 
                          className="metric-value"
                          style={{ backgroundColor: getValueColor(pick.playerBarrelRate, 'playerBarrel') + '20' }}
                        >
                          {pick.playerBarrelRate > 0 ? `${pick.playerBarrelRate.toFixed(1)}%` : '-'}
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Player Hard Contact</span>
                        <span 
                          className="metric-value"
                          style={{ backgroundColor: getValueColor(pick.playerHardContact, 'playerHardContact') + '20' }}
                        >
                          {pick.playerHardContact > 0 ? `${pick.playerHardContact.toFixed(1)}%` : '-'}
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Pitcher Hard Contact</span>
                        <span 
                          className="metric-value"
                          style={{ backgroundColor: getValueColor(pick.pitcherHardContact, 'pitcherHardContact') + '20' }}
                        >
                          {pick.pitcherHardContact > 0 ? `${pick.pitcherHardContact.toFixed(1)} mph` : '-'}
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Confidence</span>
                        <span 
                          className="metric-value"
                          style={{ backgroundColor: getValueColor(pick.confidenceScore, 'confidence') + '20' }}
                        >
                          {pick.confidenceScore}
                        </span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Market Edge</span>
                        <span 
                          className="metric-value"
                          style={{ backgroundColor: getValueColor(pick.marketEdge, 'marketEdge') + '20' }}
                        >
                          {pick.marketEdge ? `${(pick.marketEdge * 100).toFixed(1)}%` : '-'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mobile-analysis">
                      <div className="analysis-section">
                        <h5>Analysis:</h5>
                        <p>{pick.reasoning}</p>
                      </div>
                      <div className="details-row">
                        <span className="label">Classification:</span>
                        <span className="value">{pick.classification}</span>
                      </div>
                      <div className="details-row">
                        <span className="label">Pathway:</span>
                        <span className="value">{pick.pathway}</span>
                      </div>
                      <div className="details-row">
                        <span className="label">Odds:</span>
                        <span className="value">{pick.odds?.american || '-'}</span>
                      </div>
                      {pick.riskFactors && pick.riskFactors.length > 0 && (
                        <div className="risk-section">
                          <h5>Risk Factors:</h5>
                          <ul>
                            {pick.riskFactors.map((risk, i) => (
                              <li key={i}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </GlassScrollableContainer>

      <div className="card-footer">
        <div className="legend">
          <span className="legend-item">🔴 High Vulnerability</span>
          <span className="legend-item">🟡 Moderate</span>
          <span className="legend-item">🟢 Low/Favorable</span>
        </div>
        <div className="last-updated">
          <small>
            Updated: {analysisData?.updatedAt ? 
              new Date(analysisData.updatedAt).toLocaleTimeString() : 
              'Unknown'
            }
          </small>
        </div>
      </div>
    </GlassCard>
  );
};

export default BarrelMatchupCard;