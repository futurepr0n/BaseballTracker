import React, { useState, useEffect, useRef } from 'react';
import useTeamFilteredData from '../../useTeamFilter';
import { useTooltip } from '../../utils/TooltipContext';
import { createSafeId } from '../../utils/tooltipUtils';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import { initializeCollapsibleGlass } from '../../../utils/collapsibleGlass';
import './PoorPerformanceCard.css';
import '../../common/MobilePlayerCard.css';

const PoorPerformanceCard = ({ poorPerformancePredictions, isLoading, teams: teamData, maxItems = 15 }) => {
  const [error, setError] = useState(null);
  const { openTooltip } = useTooltip();
  const headerRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize collapsible functionality
  useEffect(() => {
    if (headerRef.current && containerRef.current) {
      const cleanup = initializeCollapsibleGlass(
        headerRef.current, 
        containerRef.current,
        'poor-performance-card'
      );
      return cleanup;
    }
  }, []);

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
        <div className="glass-card-container" ref={containerRef}>
          <div className="glass-header" ref={headerRef}>
            <h3>⚠️ Poor Performance Risks</h3>
          </div>
          <div className="glass-content expanded">
            <div className="scrollable-container">
              <div className="loading-indicator">Loading performance risk analysis...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card poor-performance-card">
        <div className="glass-card-container" ref={containerRef}>
          <div className="glass-header" ref={headerRef}>
            <h3>⚠️ Poor Performance Risks</h3>
          </div>
          <div className="glass-content expanded">
            <div className="scrollable-container">
              <div className="error-message">Error: {error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayData = filteredData.slice(0, maxItems);

  if (displayData.length === 0) {
    return (
      <div className="card poor-performance-card">
        <div className="glass-card-container" ref={containerRef}>
          <div className="glass-header" ref={headerRef}>
            <h3>⚠️ Poor Performance Risks</h3>
          </div>
          <div className="glass-content expanded">
            <div className="scrollable-container">
              <div className="no-data">No significant performance risks identified for the selected teams.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card poor-performance-card">
      <div className="glass-card-container" ref={containerRef}>
        <div className="glass-header" ref={headerRef}>
          <h3>⚠️ Poor Performance Risks</h3>
          <div className="card-subtitle">
            {displayData.filter(p => p.riskLevel === 'HIGH').length} High Risk, {displayData.filter(p => p.riskLevel === 'MEDIUM').length} Medium Risk
          </div>
        </div>
        
        <div className="glass-content expanded">
          <div className="scrollable-container">
        
        {/* Desktop View */}
        <div className="desktop-view">
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
                  
                  <div className="player-info">
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

        {/* Mobile View */}
        <div className="mobile-view">
          <div className="mobile-cards">
            {displayData.map((prediction, index) => {
              const playerKey = `${prediction.playerName}_${prediction.team}`;
              const riskColor = getRiskLevelColor(prediction.riskLevel);
              const riskIcon = getRiskLevelIcon(prediction.riskLevel);

              const secondaryMetrics = [
                { label: 'Risk', value: `${riskIcon} ${prediction.riskLevel}` },
                { label: 'Factors', value: `${prediction.riskFactors.length}` }
              ];

              const expandableContent = (
                <div className="mobile-risk-details">
                  {/* Summary Metrics */}
                  <div className="mobile-metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px'}}>
                    <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                      <div style={{fontSize: '16px', fontWeight: 'bold', color: riskColor}}>{prediction.totalRiskScore}</div>
                      <div style={{fontSize: '11px', color: '#ccc'}}>Risk Score</div>
                    </div>
                    <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                      <div style={{fontSize: '16px', fontWeight: 'bold', color: riskColor}}>{riskIcon}</div>
                      <div style={{fontSize: '11px', color: '#ccc'}}>{prediction.riskLevel}</div>
                    </div>
                    <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                      <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{prediction.riskFactors.length}</div>
                      <div style={{fontSize: '11px', color: '#ccc'}}>Risk Factors</div>
                    </div>
                  </div>

                  {/* Risk Analysis */}
                  <div className="mobile-risk-analysis" style={{marginBottom: '16px'}}>
                    <strong>Performance Risk Analysis:</strong>
                    <div style={{marginTop: '8px', fontSize: '12px', color: '#ccc'}}>
                      {prediction.riskLevel === 'HIGH' ? 
                        'High risk of poor performance - consider avoiding or reducing exposure' :
                      prediction.riskLevel === 'MEDIUM' ? 
                        'Moderate risk detected - proceed with caution and monitor closely' :
                      prediction.riskLevel === 'LOW' ? 
                        'Lower risk but some concerning factors present' :
                        'Performance risk identified - requires evaluation'
                      }
                    </div>
                  </div>

                  {/* Risk Factors */}
                  {prediction.riskFactors && prediction.riskFactors.length > 0 && (
                    <div className="mobile-risk-factors" style={{marginBottom: '16px'}}>
                      <strong>Risk Factors:</strong>
                      <div style={{marginTop: '8px', fontSize: '11px'}}>
                        {prediction.riskFactors.slice(0, 5).map((factor, idx) => {
                          const factorName = factor.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          return (
                            <div 
                              key={idx} 
                              style={{
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                padding: '4px 8px',
                                backgroundColor: idx === 0 ? 'rgba(220, 53, 69, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                margin: '2px 0',
                                border: idx === 0 ? '1px solid rgba(220, 53, 69, 0.3)' : '1px solid transparent'
                              }}
                            >
                              <span>{factorName}:</span>
                              <span style={{fontWeight: 'bold', color: idx === 0 ? '#DC3545' : '#ccc'}}>
                                {factor.score ? `${factor.score} pts` : 'Risk'}
                              </span>
                            </div>
                          );
                        })}
                        {prediction.riskFactors.length > 5 && (
                          <div style={{textAlign: 'center', marginTop: '8px', fontSize: '10px', color: '#ccc'}}>
                            ...and {prediction.riskFactors.length - 5} more factors
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="mobile-recommendation">
                    <strong>Recommendation:</strong>
                    <div style={{marginTop: '8px', fontSize: '11px', color: riskColor}}>
                      {prediction.riskLevel === 'HIGH' ? 
                        '🚫 AVOID - High probability of underperformance' :
                      prediction.riskLevel === 'MEDIUM' ? 
                        '⚠️ CAUTION - Monitor closely, reduce exposure' :
                      prediction.riskLevel === 'LOW' ? 
                        '🟡 WATCH - Some risk present, use carefully' :
                        '⚪ EVALUATE - Review risk factors before decision'
                      }
                    </div>
                  </div>
                </div>
              );

              return (
                <MobilePlayerCard
                  key={playerKey}
                  item={{
                    name: prediction.playerName,
                    team: prediction.team
                  }}
                  index={index}
                  showRank={true}
                  showExpandButton={true}
                  primaryMetric={{
                    value: prediction.totalRiskScore,
                    label: 'Risk Points'
                  }}
                  secondaryMetrics={secondaryMetrics}
                  onCardClick={(item, idx, event) => {
                    handlePlayerClick(prediction, event);
                  }}
                  expandableContent={expandableContent}
                  customActions={
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px'}}>
                      <span style={{ color: riskColor }}>
                        {riskIcon} {prediction.riskLevel} RISK
                      </span>
                    </div>
                  }
                />
              );
            })}
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoorPerformanceCard;