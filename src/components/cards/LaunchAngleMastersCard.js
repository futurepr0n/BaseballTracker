import React, { useState, useEffect, useCallback } from 'react';
import swingPathService from '../../services/swingPathService';
import { fetchPlayerData } from '../../services/dataService';
import { useTeamFilter } from '../TeamFilterContext';
import GlassCard, { GlassScrollableContainer } from './GlassCard/GlassCard';
import HandednessToggle from '../HandednessToggle';
import './LaunchAngleMastersCard.css';

const LaunchAngleMastersCard = ({ currentDate }) => {
  const [, setSwingPathData] = useState(null);
  const [todaysPlayers, setTodaysPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [handedness, setHandedness] = useState('BOTH');
  const [showSplits, setShowSplits] = useState(false);
  const { selectedTeam, includeMatchup, matchupTeam } = useTeamFilter();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert currentDate to YYYY-MM-DD format
      let dateStr;
      if (currentDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      } else {
        dateStr = new Date().toISOString().split('T')[0];
      }

      // Load swing path data and today's players
      const [swingData, playersData] = await Promise.all([
        swingPathService.loadSwingPathData(handedness),
        fetchPlayerData(dateStr)
      ]);

      setSwingPathData(swingData);
      setTodaysPlayers(playersData || []);

      // Filter and enhance today's players with swing path data
      const enhanced = enhanceTodaysPlayers(playersData || [], swingData);
      setFilteredPlayers(enhanced);

    } catch (err) {
      console.error('Error loading Launch Angle Masters data:', err);
      setError('Failed to load swing path data');
    } finally {
      setLoading(false);
    }
  }, [handedness, selectedTeam, includeMatchup, currentDate, showSplits]);

  const enhanceTodaysPlayers = (players, swingData) => {
    if (!players || !swingData) return [];

    // Apply team filters
    let filteredPlayers = players;
    if (selectedTeam) {
      if (includeMatchup && matchupTeam) {
        filteredPlayers = players.filter(p => 
          p.team === selectedTeam || p.Team === selectedTeam ||
          p.team === matchupTeam || p.Team === matchupTeam
        );
      } else {
        filteredPlayers = players.filter(p => 
          p.team === selectedTeam || p.Team === selectedTeam
        );
      }
    }

    // Enhance with swing path data
    const enhanced = filteredPlayers
      .map(player => {
        const swingPath = swingPathService.getPlayerSwingData(player.name || player.Name, handedness);
        if (!swingPath) return null;

        return {
          ...player,
          swingPath: {
            ...swingPath,
            showSplits: showSplits && handedness === 'BOTH' && swingPath.splits
          }
        };
      })
      .filter(player => player && player.swingPath)
      .sort((a, b) => b.swingPath.swingOptimizationScore - a.swingPath.swingOptimizationScore)
      .slice(0, 10); // Top 10

    return enhanced;
  };

  const getBadgeForPlayer = (player) => {
    if (!player.swingPath) return null;

    const { swingOptimizationScore, idealAttackAngleRate, batSpeedPercentile } = player.swingPath;

    if (swingOptimizationScore >= 85) return '🚀';
    if (idealAttackAngleRate >= 0.6) return '⚡';
    if (batSpeedPercentile >= 80) return '💪';
    if (swingOptimizationScore >= 70) return '🎯';
    return '📊';
  };

  const getBadgeLabel = (badge) => {
    switch (badge) {
      case '🚀': return 'Elite Swing Path';
      case '⚡': return 'Launch Angle Master';
      case '💪': return 'Power Speed';
      case '🎯': return 'Optimized';
      case '📊': return 'Above Average';
      default: return '';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#4CAF50';
    if (score >= 75) return '#66BB6A';
    if (score >= 65) return '#81C784';
    if (score >= 55) return '#FFC107';
    return '#FF9800';
  };

  if (loading) {
    return (
      <GlassCard className="launch-angle-masters-card" variant="default">
        <div className="card-header">
          <h3>🚀 Launch Angle Masters</h3>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading swing path analysis...</p>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="launch-angle-masters-card" variant="default">
        <div className="card-header">
          <h3>🚀 Launch Angle Masters</h3>
        </div>
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={loadData} className="retry-button">
            Retry
          </button>
        </div>
      </GlassCard>
    );
  }

  if (filteredPlayers.length === 0) {
    return (
      <GlassCard className="launch-angle-masters-card" variant="default">
        <div className="card-header">
          <h3>🚀 Launch Angle Masters</h3>
          <HandednessToggle 
            value={handedness}
            onChange={setHandedness}
            showSplits={showSplits}
            onSplitsToggle={setShowSplits}
          />
        </div>
        <div className="no-data">
          <p>No swing path data available for today's matchups</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="launch-angle-masters-card" variant="default">
      <div className="card-header">
        <h3>🚀 Launch Angle Masters</h3>
        <span className="card-subtitle">Top swing path optimization for HR potential</span>
        <HandednessToggle 
          value={handedness}
          onChange={setHandedness}
          showSplits={showSplits}
          onSplitsToggle={setShowSplits}
        />
      </div>

      <GlassScrollableContainer className="masters-container">
        <div className="masters-grid">
          {filteredPlayers.map((player, index) => {
            const badge = getBadgeForPlayer(player);
            const swingPath = player.swingPath;
            
            return (
              <div key={index} className="master-card">
                <div className="master-rank">#{index + 1}</div>
                <div className="master-content">
                  <div className="master-header">
                    <div className="player-name">{player.name || player.Name}</div>
                    <div className="player-team">{player.team || player.Team}</div>
                    <div className="master-badge" title={getBadgeLabel(badge)}>
                      {badge}
                    </div>
                  </div>
                  
                  <div className="swing-metrics">
                    <div className="primary-score">
                      <div 
                        className="score-circle"
                        style={{ '--score-color': getScoreColor(swingPath.swingOptimizationScore) }}
                      >
                        {swingPath.swingOptimizationScore}
                      </div>
                      <div className="score-label">Swing Score</div>
                    </div>
                    
                    <div className="metrics-grid">
                      <div className="metric">
                        <div className="metric-value">{swingPath.avgBatSpeed.toFixed(1)}</div>
                        <div className="metric-label">Bat Speed</div>
                        <div className="metric-unit">mph</div>
                      </div>
                      <div className="metric">
                        <div className="metric-value">{swingPath.attackAngle.toFixed(1)}</div>
                        <div className="metric-label">Attack Angle</div>
                        <div className="metric-unit">degrees</div>
                      </div>
                      <div className="metric">
                        <div className="metric-value">{(swingPath.idealAttackAngleRate * 100).toFixed(0)}</div>
                        <div className="metric-label">Ideal Rate</div>
                        <div className="metric-unit">%</div>
                      </div>
                      <div className="metric">
                        <div className="metric-value">{swingPath.batSpeedPercentile.toFixed(0)}</div>
                        <div className="metric-label">Speed %ile</div>
                        <div className="metric-unit">rank</div>
                      </div>
                    </div>
                    
                    {swingPath.showSplits && swingPath.splits && (
                      <div className="splits-section">
                        <div className="splits-header">RHP vs LHP Splits</div>
                        <div className="splits-row">
                          <span>Bat Speed:</span>
                          <span>{swingPath.splits.rhp.avgBatSpeed.toFixed(1)} vs {swingPath.splits.lhp.avgBatSpeed.toFixed(1)}</span>
                        </div>
                        <div className="splits-row">
                          <span>Attack Angle:</span>
                          <span>{swingPath.splits.rhp.attackAngle.toFixed(1)}° vs {swingPath.splits.lhp.attackAngle.toFixed(1)}°</span>
                        </div>
                        <div className="splits-row">
                          <span>Ideal Rate:</span>
                          <span>{(swingPath.splits.rhp.idealAttackAngleRate * 100).toFixed(0)}% vs {(swingPath.splits.lhp.idealAttackAngleRate * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassScrollableContainer>

      <div className="card-footer">
        <div className="legend">
          <span className="legend-item">🚀 Elite (85+)</span>
          <span className="legend-item">⚡ Master (60%+ ideal)</span>
          <span className="legend-item">💪 Power Speed (80%+ speed)</span>
          <span className="legend-item">🎯 Optimized (70+)</span>
        </div>
        <div className="showing-count">
          Showing top {filteredPlayers.length} of {todaysPlayers.length} players
        </div>
      </div>
    </GlassCard>
  );
};

export default LaunchAngleMastersCard;