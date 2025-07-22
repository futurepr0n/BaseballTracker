import React, { useState, useEffect } from 'react';
import useTeamFilteredData from '../../useTeamFilter';
import { useTooltip } from '../../utils/TooltipContext';
import { createSafeId } from '../../utils/tooltipUtils';
import { debugLog } from '../../../utils/debugConfig';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import './PositiveMomentumCard.css';
import '../../common/MobilePlayerCard.css';

/**
 * Card component showing players with positive momentum and performance indicators
 * Displays players with hot streaks, post-rest advantages, bounce-back potential, etc.
 */
const PositiveMomentumCard = ({ currentDate, teams, maxItems = 25 }) => {
  const [momentumData, setMomentumData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { openTooltip } = useTooltip();

  // Apply team filtering
  const filteredData = useTeamFilteredData(momentumData, 'team');

  useEffect(() => {
    const loadMomentumData = async () => {
      setIsLoading(true);
      
      try {
        debugLog.log('CARDS', '[PositiveMomentumCard] Loading positive momentum predictions...');
        
        // Load the latest positive momentum predictions
        const response = await fetch('/data/predictions/positive_performance_predictions_latest.json');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.predictions && Array.isArray(data.predictions)) {
          debugLog.log('CARDS', `[PositiveMomentumCard] Loaded ${data.predictions.length} momentum predictions`);
          setMomentumData(data.predictions);
          setLastUpdated(data.generatedAt ? new Date(data.generatedAt) : new Date());
        } else {
          console.warn('[PositiveMomentumCard] Invalid data structure received');
          setMomentumData([]);
        }
        
      } catch (error) {
        console.error('[PositiveMomentumCard] Error loading momentum data:', error);
        setMomentumData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMomentumData();
  }, [currentDate]);

  const handlePlayerClick = (player, event) => {
    const safeId = createSafeId(player.playerName, player.team);
    const tooltipId = `positive_momentum_${safeId}`;
    
    openTooltip(tooltipId, event.currentTarget, {
      type: 'positive_momentum',
      player: player
    });
  };

  const getMomentumIcon = (momentumLevel) => {
    switch (momentumLevel) {
      case 'EXCEPTIONAL':
        return '🔥';
      case 'HIGH':
        return '🚀';
      case 'GOOD':
        return '📈';
      default:
        return '⭐';
    }
  };

  const getMomentumColor = (momentumLevel) => {
    switch (momentumLevel) {
      case 'EXCEPTIONAL':
        return '#ff4d4f';
      case 'HIGH':
        return '#52c41a';
      case 'GOOD':
        return '#1890ff';
      default:
        return '#faad14';
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    
    const now = new Date();
    const diffMinutes = Math.floor((now - lastUpdated) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `Updated ${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `Updated ${diffHours}h ago`;
    }
  };

  const getTeamLogo = (teamCode) => {
    if (!teams[teamCode]) return null;
    return `/data/logos/${teamCode.toLowerCase()}_logo.png`;
  };

  const displayData = filteredData.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className="card positive-momentum-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🚀 Positive Momentum Players</h3>
          </div>
          <div className="loading-indicator">
            Loading momentum analysis...
          </div>
        </div>
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div className="card positive-momentum-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🚀 Positive Momentum Players</h3>
          </div>
          <div className="no-data">
            No positive momentum players found for the selected teams.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card positive-momentum-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>🚀 Positive Momentum Players</h3>
          {lastUpdated && (
            <div className="card-subtitle">
              {formatLastUpdated()}
            </div>
          )}
        </div>
        
        {/* Desktop View */}
        <div className="desktop-view">
          <div className="scrollable-container">
          <ul className="player-list">
            {displayData.map((player, index) => {
              const playerKey = `${player.playerName}_${player.team}`;
              const momentumIcon = getMomentumIcon(player.momentumLevel);
              const momentumColor = getMomentumColor(player.momentumLevel);
              // Use same approach as working DayOfWeekHitsCard
              const teamData = teams && player.team ? teams[player.team] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              
              return (
                <li key={playerKey} className="player-item momentum-item">
                  <div className="player-rank" style={{ backgroundColor: teams[player.team]?.colors?.primary || '#333' }}>
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
                  
                  <div className="player-info" onClick={(e) => handlePlayerClick(player, e)}>
                    <div className="player-name">{player.playerName}</div>
                    <div className="player-team">{player.team}</div>
                  </div>
                  
                  <div className="momentum-details">
                    <div className="momentum-score-compact">
                      <span className="score-value" style={{ color: momentumColor }}>{player.totalPositiveScore}</span>
                      <span className="score-label">pts</span>
                    </div>
                    <div className="factor-info">
                      <div className="factor-count">
                        {player.positiveFactors.length} factor{player.positiveFactors.length !== 1 ? 's' : ''}
                      </div>
                      <div className="top-factor">
                        {player.positiveFactors[0]?.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    </div>
                  </div>

                  <button 
                    className="expand-toggle tooltip-trigger"
                    onClick={(e) => handlePlayerClick(player, e)}
                    aria-label="View detailed momentum analysis"
                  >
                    ℹ️
                  </button>
                  
                  {/* Momentum badge positioned in top-right corner */}
                  <div className="momentum-badge-overlay">
                    <span 
                      className="momentum-badge"
                      style={{ color: momentumColor }}
                    >
                      {momentumIcon} {player.momentumLevel}
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
            {displayData.map((player, index) => {
              const playerKey = `${player.playerName}_${player.team}`;
              const momentumIcon = getMomentumIcon(player.momentumLevel);
              const momentumColor = getMomentumColor(player.momentumLevel);

              const secondaryMetrics = [
                { label: 'Momentum', value: `${momentumIcon} ${player.momentumLevel}` },
                { label: 'Factors', value: `${player.positiveFactors.length}` }
              ];

              const expandableContent = (
                <div className="mobile-momentum-details">
                  <div className="mobile-analysis">
                    <div className="analysis-item">
                      <strong>Momentum Analysis:</strong>
                      <div style={{marginTop: '4px', fontSize: '12px'}}>
                        <div>Level: {momentumIcon} {player.momentumLevel}</div>
                        <div>Score: {player.totalPositiveScore} points</div>
                        <div>Factors: {player.positiveFactors.length}</div>
                      </div>
                    </div>

                    {player.positiveFactors && player.positiveFactors.length > 0 && (
                      <div className="analysis-item">
                        <strong>Positive Factors:</strong>
                        <ul style={{marginTop: '4px', fontSize: '11px', paddingLeft: '16px'}}>
                          {player.positiveFactors.slice(0, 3).map((factor, idx) => (
                            <li key={idx}>
                              {factor.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                              {factor.score && ` (+${factor.score} pts)`}
                            </li>
                          ))}
                          {player.positiveFactors.length > 3 && (
                            <li>...and {player.positiveFactors.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );

              return (
                <MobilePlayerCard
                  key={playerKey}
                  item={{
                    name: player.playerName,
                    team: player.team
                  }}
                  index={index}
                  showRank={true}
                  showExpandButton={true}
                  primaryMetric={{
                    value: player.totalPositiveScore,
                    label: 'Points'
                  }}
                  secondaryMetrics={secondaryMetrics}
                  onCardClick={(item, idx, event) => {
                    handlePlayerClick(player, event);
                  }}
                  expandableContent={expandableContent}
                  customActions={
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px'}}>
                      <span style={{ color: momentumColor }}>
                        {momentumIcon} {player.momentumLevel}
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
  );
};

export default PositiveMomentumCard;