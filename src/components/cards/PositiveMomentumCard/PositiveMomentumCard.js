import React, { useState, useEffect } from 'react';
import useTeamFilteredData from '../../useTeamFilter';
import { useTooltip } from '../../utils/TooltipContext';
import { createSafeId } from '../../utils/tooltipUtils';
import { debugLog } from '../../../utils/debugConfig';
import './PositiveMomentumCard.css';

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
        <h3>🚀 Positive Momentum Players</h3>
        <div className="loading-indicator">
          Loading momentum analysis...
        </div>
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div className="card positive-momentum-card">
        <h3>🚀 Positive Momentum Players</h3>
        <div className="no-data">
          No positive momentum players found for the selected teams.
        </div>
      </div>
    );
  }

  return (
    <div className="card positive-momentum-card">
      <h3>🚀 Positive Momentum Players</h3>
      {lastUpdated && (
        <div className="card-subtitle">
          {formatLastUpdated()}
        </div>
      )}
      
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
                
                <div className="player-stat momentum-stats">
                  <div className="momentum-score">
                    <span className="stat-value">{player.totalPositiveScore}</span>
                    <span className="stat-label">Momentum Pts</span>
                  </div>
                  <div className="momentum-level">
                    <span 
                      className="momentum-badge"
                      style={{ color: momentumColor }}
                    >
                      {momentumIcon} {player.momentumLevel}
                    </span>
                  </div>
                </div>

                <div className="momentum-factors">
                  <div className="factor-count">
                    {player.positiveFactors.length} factor{player.positiveFactors.length !== 1 ? 's' : ''}
                  </div>
                  <div className="top-factor">
                    {player.positiveFactors[0]?.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>

                <button 
                  className="expand-toggle tooltip-trigger"
                  onClick={(e) => handlePlayerClick(player, e)}
                  aria-label="View detailed momentum analysis"
                >
                  ℹ️
                </button>
                
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
  );
};

export default PositiveMomentumCard;