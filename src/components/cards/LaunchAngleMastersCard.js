import React, { useState, useEffect, useCallback } from 'react';
import hellraiserAnalysisService from '../../services/hellraiserAnalysisService';
import { useTeamFilter } from '../TeamFilterContext';
import { usePlayerScratchpad } from '../../contexts/PlayerScratchpadContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useHandedness } from '../../contexts/HandednessContext';
import GlassCard, { GlassScrollableContainer } from './GlassCard/GlassCard';
import { getPlayerDisplayName, getTeamDisplayName } from '../../utils/playerNameUtils';
import HandednessToggle from '../HandednessToggle/HandednessToggle';
import SimpleDesktopScratchpadIcon from '../common/SimpleDesktopScratchpadIcon';
import './LaunchAngleMastersCard.css';

const LaunchAngleMastersCard = ({ currentDate }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'masterScore', direction: 'desc' });
  
  const { selectedTeam, includeMatchup, matchupTeam, shouldIncludePlayer } = useTeamFilter();
  const { filterEnabled: scratchpadFilterEnabled } = usePlayerScratchpad();
  const { themeMode } = useTheme();
  const { selectedHandedness, setSelectedHandedness, getPlayerHandednessData, loadHandednessDatasets } = useHandedness();

  const loadLaunchAngleMasters = useCallback(async () => {
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
          setAnalysisData(analysis);
          const masters = processLaunchAngleMasters(analysis.picks);
          setFilteredPlayers(masters);
        } else {
          setError(analysis.error);
        }
      } else {
        setAnalysisData(analysis);
        const masters = await processLaunchAngleMasters(analysis.picks);
        setFilteredPlayers(masters);
      }
    } catch (err) {
      console.error('Error loading Launch Angle Masters data:', err);
      setError('Failed to load Launch Angle Masters data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentDate, selectedTeam, includeMatchup, matchupTeam, selectedHandedness, scratchpadFilterEnabled]);

  useEffect(() => {
    loadHandednessDatasets();
  }, [loadHandednessDatasets]);

  useEffect(() => {
    loadLaunchAngleMasters();
  }, [loadLaunchAngleMasters, selectedHandedness]);

  const processLaunchAngleMasters = async (picks) => {
    if (!picks || !Array.isArray(picks)) return [];

    // Filter picks that have swing path data OR handedness data
    const playersWithSwingData = [];
    for (const pick of picks) {
      // First check hellraiser swing data
      if (pick.swing_bat_speed && 
          pick.swing_attack_angle !== undefined && 
          pick.swing_optimization_score !== undefined) {
        playersWithSwingData.push(pick);
        continue;
      }
      
      // Then check if player has handedness data
      const playerName = pick.player_name || pick.playerName || '';
      const handednessData = await getPlayerHandednessData(playerName);
      if (handednessData) {
        playersWithSwingData.push(pick);
      }
    }

    // Calculate comprehensive master score for each player
    const mastersData = await Promise.all(playersWithSwingData.map(async pick => {
      // Get handedness-specific data if available
      const playerName = pick.player_name || pick.playerName || '';
      const handednessData = await getPlayerHandednessData(playerName);

      // Extract metrics from reasoning for barrel/exit velocity analysis
      const reasoning = pick.reasoning || '';
      
      // Extract pitcher contact allowed (exit velocity)
      const contactMatch = reasoning.match(/Pitcher allows (?:solid|hard) contact \\(([0-9.]+) mph\\)/);
      const pitcherContactAllowed = contactMatch ? parseFloat(contactMatch[1]) : 0;
      
      // Extract pitcher barrel vulnerability  
      const barrelMatch = reasoning.match(/Pitcher vulnerable to barrels \\(([0-9.]+)%\\)/);
      const pitcherBarrelVulnerable = barrelMatch ? parseFloat(barrelMatch[1]) : 0;
      
      // Extract player exit velocity - try multiple patterns
      let playerExitVelocity = 0;
      const exitVeloPatterns = [
        /(?:Elite|Strong|Solid) exit velocity \\(([0-9.]+) mph\\)/,
        /exit velocity \\(([0-9.]+) mph\\)/,
        /Exit velocity: ([0-9.]+) mph/,
        /([0-9.]+) mph exit velocity/
      ];
      
      for (const pattern of exitVeloPatterns) {
        const match = reasoning.match(pattern);
        if (match) {
          playerExitVelocity = parseFloat(match[1]);
          break;
        }
      }
      
      // Extract player barrel rate - try multiple patterns
      let playerBarrelRate = 0;
      const barrelPatterns = [
        /(?:Elite|Strong|Solid) barrel rate \\(([0-9.]+)%\\)/,
        /barrel rate \\(([0-9.]+)%\\)/,
        /Barrel rate: ([0-9.]+)%/,
        /([0-9.]+)% barrel rate/
      ];
      
      for (const pattern of barrelPatterns) {
        const match = reasoning.match(pattern);
        if (match) {
          playerBarrelRate = parseFloat(match[1]);
          break;
        }
      }
      
      // Extract player hard contact rate
      let playerHardContact = 0;
      const hardContactPatterns = [
        /(?:Elite|Strong|Solid) hard contact \\(([0-9.]+)%\\)/,
        /hard contact \\(([0-9.]+)%\\)/,
        /Hard contact: ([0-9.]+)%/,
        /([0-9.]+)% hard contact/
      ];
      
      for (const pattern of hardContactPatterns) {
        const match = reasoning.match(pattern);
        if (match) {
          playerHardContact = parseFloat(match[1]);
          break;
        }
      }
      
      // If we couldn't extract from reasoning, try to use fallback estimates based on confidence score and classification
      if (playerExitVelocity === 0) {
        // Estimate based on confidence score and classification
        if (pick.classification === 'Personal Straight' && pick.confidenceScore >= 90) {
          playerExitVelocity = 91 + (pick.confidenceScore - 90); // 91-95 range for high confidence
        } else if (pick.confidenceScore >= 80) {
          playerExitVelocity = 88 + (pick.confidenceScore - 80) * 0.3; // 88-91 range
        } else if (pick.confidenceScore >= 70) {
          playerExitVelocity = 85 + (pick.confidenceScore - 70) * 0.3; // 85-88 range
        }
      }
      
      if (playerBarrelRate === 0) {
        // Estimate based on confidence score and swing optimization
        const swingScore = pick.swing_optimization_score || 0;
        if (swingScore >= 85 && pick.confidenceScore >= 90) {
          playerBarrelRate = 12 + (swingScore - 85) * 0.3; // 12-15% range for elite
        } else if (swingScore >= 75) {
          playerBarrelRate = 8 + (swingScore - 75) * 0.4; // 8-12% range
        } else if (swingScore >= 65) {
          playerBarrelRate = 5 + (swingScore - 65) * 0.3; // 5-8% range
        } else if (swingScore >= 50) {
          playerBarrelRate = 3 + (swingScore - 50) * 0.13; // 3-5% range
        }
      }
      
      if (playerHardContact === 0) {
        // Estimate based on exit velocity and swing metrics
        if (playerExitVelocity >= 92) {
          playerHardContact = 45 + (playerExitVelocity - 92) * 2; // 45-51% range
        } else if (playerExitVelocity >= 88) {
          playerHardContact = 35 + (playerExitVelocity - 88) * 2.5; // 35-45% range
        } else if (pick.swing_optimization_score >= 70) {
          playerHardContact = 30 + (pick.swing_optimization_score - 70) * 0.5; // 30-40% range
        }
      }

      // Calculate Launch Angle Master Score (0-100)
      // NEW WEIGHTING: Attack Angle is PRIMARY factor (35%) since this is "Launch Angle Masters"
      // Total: Attack Angle (35%) + Swing Path (25%) + Bat Speed (20%) + Exit Velo (10%) + Barrel Rate (10%) = 100%
      let masterScore = 0;
      
      // Use handedness data if available, otherwise fallback to hellraiser data
      let swingScore, attackAngle, batSpeed;
      if (handednessData) {
        // Use handedness-specific CSV data
        swingScore = (handednessData.ideal_attack_angle_rate || 0) * 100; // Convert to 0-100 scale
        attackAngle = handednessData.attack_angle || 0;
        batSpeed = handednessData.avg_bat_speed || 0;
      } else {
        // Fallback to hellraiser data
        swingScore = pick.swing_optimization_score || 0;
        attackAngle = pick.swing_attack_angle || 0;
        batSpeed = pick.swing_bat_speed || 0;
      }
      
      // Swing Path Optimization (25% weight) - supporting factor
      masterScore += (swingScore * 0.25);
      
      // Attack Angle Optimization (35% weight) - PRIMARY FACTOR for Launch Angle Masters
      let angleScore = 0;
      if (attackAngle >= 8 && attackAngle <= 17) {
        angleScore = 100; // Sweet spot - optimal home run range
      } else if (attackAngle >= 5 && attackAngle <= 20) {
        angleScore = 90; // Ideal range per Statcast
      } else if (attackAngle >= 3 && attackAngle <= 22) {
        angleScore = 70; // Good range
      } else if (attackAngle >= 1 && attackAngle <= 25) {
        angleScore = 50; // Acceptable
      } else if (attackAngle >= -2 && attackAngle <= 30) {
        angleScore = 25; // Below average
      } else {
        angleScore = 10; // Poor - too steep or too flat
      }
      masterScore += (angleScore * 0.35);
      
      // Bat Speed Quality (20% weight) - Important for launch angle success
      // batSpeed is already defined above based on handedness data or hellraiser fallback
      let speedScore = 0;
      if (batSpeed >= 75) speedScore = 100; // Elite
      else if (batSpeed >= 72) speedScore = 85; // Strong
      else if (batSpeed >= 69) speedScore = 70; // Above average
      else if (batSpeed >= 67) speedScore = 50; // Average
      else if (batSpeed >= 65) speedScore = 30; // Below average
      else speedScore = 15; // Poor
      masterScore += (speedScore * 0.20);
      
      // Exit Velocity Quality (10% weight) - Supporting factor
      let exitVeloScore = 0;
      if (playerExitVelocity >= 94) exitVeloScore = 100; // Elite
      else if (playerExitVelocity >= 92) exitVeloScore = 85; // Strong
      else if (playerExitVelocity >= 90) exitVeloScore = 70; // Above average
      else if (playerExitVelocity >= 88) exitVeloScore = 50; // Average
      else if (playerExitVelocity >= 85) exitVeloScore = 30; // Below average
      else exitVeloScore = 15; // Poor
      masterScore += (exitVeloScore * 0.10);
      
      // Barrel Rate Optimization (10% weight) - Power indicator
      let barrelScore = 0;
      if (playerBarrelRate >= 15) barrelScore = 100; // Elite
      else if (playerBarrelRate >= 12) barrelScore = 85; // Strong
      else if (playerBarrelRate >= 8) barrelScore = 70; // Above average
      else if (playerBarrelRate >= 5) barrelScore = 50; // Average
      else if (playerBarrelRate >= 3) barrelScore = 30; // Below average
      else barrelScore = 15; // Poor
      masterScore += (barrelScore * 0.10);
      
      // Determine classification
      let classification = '';
      let badge = '';
      if (masterScore >= 85) {
        classification = 'Elite Launch Master';
        badge = '🚀';
      } else if (masterScore >= 75) {
        classification = 'Advanced Launcher';
        badge = '⚡';
      } else if (masterScore >= 65) {
        classification = 'Launch Specialist';
        badge = '🎯';
      } else if (masterScore >= 55) {
        classification = 'Emerging Talent';
        badge = '📈';
      } else {
        classification = 'Development Focus';
        badge = '📊';
      }

      return {
        ...pick,
        masterScore: Math.round(masterScore),
        classification,
        badge,
        metrics: {
          swingOptimization: Math.round(swingScore * 10) / 10, // Round to 1 decimal
          attackAngle: attackAngle,
          batSpeed: batSpeed,
          idealRate: handednessData ? (handednessData.ideal_attack_angle_rate || 0) : (pick.swing_ideal_rate || 0),
          playerExitVelocity,
          playerBarrelRate,
          playerHardContact,
          pitcherContactAllowed,
          pitcherBarrelVulnerable
        },
        dataSource: handednessData ? `handedness_${selectedHandedness}` : 'hellraiser',
        competitiveSwings: handednessData ? handednessData.competitive_swings : null
      };
    }));

    // Apply scratchpad filtering before sorting
    const filteredMastersData = mastersData.filter(player => {
      const playerName = player.player_name || player.playerName || '';
      const playerTeam = player.team || player.Team || '';
      return shouldIncludePlayer(playerTeam, playerName);
    });

    // Sort by master score and return top 25
    return filteredMastersData
      .sort((a, b) => b.masterScore - a.masterScore)
      .slice(0, 25);
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
      let aValue, bValue;
      
      // Handle nested metric properties
      if (sortConfig.key.startsWith('metrics.')) {
        const metricKey = sortConfig.key.split('.')[1];
        aValue = a.metrics?.[metricKey] || 0;
        bValue = b.metrics?.[metricKey] || 0;
      } else {
        aValue = a[sortConfig.key] || 0;
        bValue = b[sortConfig.key] || 0;
      }
      
      if (aValue === bValue) return 0;
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const getSortIndicator = (column) => {
    if (sortConfig.key !== column) return '↕️';
    return sortConfig.direction === 'desc' ? '↓' : '↑';
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#4CAF50'; // Elite
    if (score >= 75) return '#66BB6A'; // Advanced
    if (score >= 65) return '#81C784'; // Specialist
    if (score >= 55) return '#FFC107'; // Emerging
    return '#FF9800'; // Development
  };

  const getMetricColor = (value, type) => {
    switch (type) {
      case 'batSpeed':
        if (value >= 75) return '#4CAF50';        // Elite (green)
        if (value >= 72) return '#66BB6A';        // Strong (light green)
        if (value >= 69) return '#81C784';        // Above average (pale green)
        if (value >= 67) return '#FFC107';        // Average (yellow)
        if (value >= 65) return '#FF9800';        // Below average (orange)
        return '#F44336';                         // Poor (red)
      
      case 'attackAngle':
        // Sweet spot: 8-17° (dark green), Ideal: 5-20° (green), Poor: <3° or >25° (red)
        if (value >= 8 && value <= 17) return '#2E7D32';   // Sweet spot (dark green)
        if (value >= 5 && value <= 20) return '#4CAF50';   // Ideal range (green)
        if (value >= 3 && value <= 22) return '#66BB6A';   // Good (light green)
        if (value >= 1 && value <= 25) return '#FFC107';   // Acceptable (yellow)
        if (value >= -2 && value <= 30) return '#FF9800';  // Below average (orange)
        return '#F44336';                                   // Poor - too flat or too steep (red)
      
      case 'swingScore':
        if (value >= 85) return '#4CAF50';        // Elite (green)
        if (value >= 75) return '#66BB6A';        // Strong (light green)
        if (value >= 65) return '#81C784';        // Above average (pale green)
        if (value >= 55) return '#FFC107';        // Average (yellow)
        if (value >= 45) return '#FF9800';        // Below average (orange)
        return '#F44336';                         // Poor (red)
      
      case 'exitVelo':
        if (value >= 94) return '#4CAF50';        // Elite (green)
        if (value >= 92) return '#66BB6A';        // Strong (light green)
        if (value >= 90) return '#81C784';        // Above average (pale green)
        if (value >= 88) return '#FFC107';        // Average (yellow)
        if (value >= 85) return '#FF9800';        // Below average (orange)
        return '#F44336';                         // Poor (red)
      
      case 'barrelRate':
        if (value >= 15) return '#4CAF50';        // Elite (green)
        if (value >= 12) return '#66BB6A';        // Strong (light green)
        if (value >= 8) return '#81C784';         // Above average (pale green)
        if (value >= 5) return '#FFC107';         // Average (yellow)
        if (value >= 3) return '#FF9800';         // Below average (orange)
        return '#F44336';                         // Poor (red)
      
      case 'confidence':
        if (value >= 90) return '#4CAF50';        // Elite confidence (green)
        if (value >= 80) return '#66BB6A';        // High confidence (light green)
        if (value >= 70) return '#81C784';        // Good confidence (pale green)
        if (value >= 60) return '#FFC107';        // Moderate confidence (yellow)
        if (value >= 50) return '#FF9800';        // Low confidence (orange)
        return '#F44336';                         // Poor confidence (red)
      
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <GlassCard 
        className={`launch-angle-masters-card ${themeMode}`} 
        variant={themeMode === 'glass' ? 'glass' : 'default'}
      >
        <div className="card-header">
          <h3>🚀 Launch Angle Masters</h3>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading Launch Angle Masters...</p>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard 
        className={`launch-angle-masters-card ${themeMode}`} 
        variant={themeMode === 'glass' ? 'glass' : 'default'}
      >
        <div className="card-header">
          <h3>🚀 Launch Angle Masters</h3>
        </div>
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={loadLaunchAngleMasters} className="retry-button">
            Retry
          </button>
        </div>
      </GlassCard>
    );
  }

  if (!filteredPlayers || filteredPlayers.length === 0) {
    return (
      <GlassCard 
        className={`launch-angle-masters-card ${themeMode}`} 
        variant={themeMode === 'glass' ? 'glass' : 'default'}
      >
        <div className="card-header">
          <h3>🚀 Launch Angle Masters</h3>
        </div>
        <div className="no-data">
          <p>No Launch Angle Masters data available</p>
        </div>
      </GlassCard>
    );
  }

  const sortedPlayers = sortData(filteredPlayers);

  return (
    <GlassCard 
      className={`launch-angle-masters-card ${themeMode}`} 
      variant={themeMode === 'glass' ? 'glass' : 'default'}
    >
      <div className="glass-header">
        <div className="header-content">
          <h3>🚀 Launch Angle Masters</h3>
          <span className="card-subtitle">
            Top 25 optimal swing path combinations 
            {selectedHandedness === 'ALL' ? ' • Combined data' : ` • vs ${selectedHandedness} data`}
            • Click headers to sort
          </span>
        </div>
        <HandednessToggle 
          selectedHandedness={selectedHandedness}
          onHandednessChange={setSelectedHandedness}
          className="masters-handedness-toggle"
        />
      </div>

      <GlassScrollableContainer className="masters-container">
        <div className="desktop-view">
          <table className="masters-table">
            <thead>
              <tr>
                <th className="rank-col">Rank</th>
                <th className="player-col">Player</th>
                <th className="sortable" onClick={() => handleSort('masterScore')}>
                  Master Score {getSortIndicator('masterScore')}
                  <span className="header-subtitle">Overall</span>
                </th>
                <th className="sortable" onClick={() => handleSort('metrics.swingOptimization')}>
                  Swing Score {getSortIndicator('metrics.swingOptimization')}
                  <span className="header-subtitle">Path</span>
                </th>
                <th className="sortable" onClick={() => handleSort('metrics.batSpeed')}>
                  Bat Speed {getSortIndicator('metrics.batSpeed')}
                  <span className="header-subtitle">mph</span>
                </th>
                <th className="sortable" onClick={() => handleSort('metrics.attackAngle')}>
                  Attack Angle {getSortIndicator('metrics.attackAngle')}
                  <span className="header-subtitle">degrees</span>
                </th>
                <th className="sortable" onClick={() => handleSort('metrics.playerExitVelocity')}>
                  Exit Velo {getSortIndicator('metrics.playerExitVelocity')}
                  <span className="header-subtitle">Player</span>
                </th>
                <th className="sortable" onClick={() => handleSort('metrics.playerBarrelRate')}>
                  Barrel Rate {getSortIndicator('metrics.playerBarrelRate')}
                  <span className="header-subtitle">%</span>
                </th>
                <th className="sortable" onClick={() => handleSort('confidenceScore')}>
                  Confidence {getSortIndicator('confidenceScore')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, index) => (
                <tr key={index} className="master-row">
                  <td className="rank-cell">
                    <div className="rank-badge">
                      <span className="rank-number">#{index + 1}</span>
                      <span className="player-badge" title={player.classification}>
                        {player.badge}
                      </span>
                    </div>
                  </td>
                  <td className="player-cell">
                    {/* Add scratchpad icon */}
                    <SimpleDesktopScratchpadIcon 
                      player={{
                        name: getPlayerDisplayName(player),
                        team: getTeamDisplayName(player).split(' ')[0], // Extract team abbreviation
                        playerType: 'hitter'
                      }} 
                    />
                    <div className="player-info">
                      <span className="player-name">{getPlayerDisplayName(player)}</span>
                      <span className="team-info">{getTeamDisplayName(player)} vs {player.pitcher}</span>
                      <span className="classification">{player.classification}</span>
                      <span className="data-source" title={`Data source: ${player.dataSource}`}>
                        {player.dataSource.startsWith('handedness') ? 
                          `⚾ ${selectedHandedness}${player.competitiveSwings ? ` (${player.competitiveSwings} swings)` : ''}` : 
                          '📊 Hellraiser'
                        }
                      </span>
                    </div>
                  </td>
                  <td 
                    className="score-cell"
                    style={{ backgroundColor: getScoreColor(player.masterScore) + '20' }}
                  >
                    <div 
                      className="master-score-circle"
                      style={{ '--score-color': getScoreColor(player.masterScore) }}
                    >
                      {player.masterScore}
                    </div>
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getMetricColor(player.metrics.swingOptimization, 'swingScore') + '20' }}
                  >
                    {player.metrics.swingOptimization}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getMetricColor(player.metrics.batSpeed, 'batSpeed') + '20' }}
                  >
                    {player.metrics.batSpeed ? player.metrics.batSpeed.toFixed(1) : '-'}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getMetricColor(player.metrics.attackAngle, 'attackAngle') + '20' }}
                  >
                    {player.metrics.attackAngle ? player.metrics.attackAngle.toFixed(1) + '°' : '-'}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getMetricColor(player.metrics.playerExitVelocity, 'exitVelo') + '20' }}
                  >
                    {player.metrics.playerExitVelocity ? player.metrics.playerExitVelocity.toFixed(1) + ' mph' : '-'}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getMetricColor(player.metrics.playerBarrelRate, 'barrelRate') + '20' }}
                  >
                    {player.metrics.playerBarrelRate ? player.metrics.playerBarrelRate.toFixed(1) + '%' : '-'}
                  </td>
                  <td 
                    className="metric-cell confidence-cell"
                    style={{ backgroundColor: getMetricColor(player.confidenceScore, 'confidence') + '20' }}
                  >
                    {player.confidenceScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="mobile-view">
          <div className="mobile-masters">
            {sortedPlayers.map((player, index) => (
              <div key={index} className="mobile-master-card">
                <div className="mobile-master-header">
                  {/* Add scratchpad icon for mobile */}
                  <SimpleDesktopScratchpadIcon 
                    player={{
                      name: getPlayerDisplayName(player),
                      team: getTeamDisplayName(player).split(' ')[0], // Extract team abbreviation
                      playerType: 'hitter'
                    }} 
                  />
                  <div className="rank-section">
                    <span className="mobile-rank">#{index + 1}</span>
                    <span className="mobile-badge" title={player.classification}>
                      {player.badge}
                    </span>
                  </div>
                  <div className="mobile-player-info">
                    <div className="mobile-player-name">{getPlayerDisplayName(player)}</div>
                    <div className="mobile-team-info">{getTeamDisplayName(player)} vs {player.pitcher}</div>
                    <div className="mobile-classification">{player.classification}</div>
                  </div>
                  <div 
                    className="mobile-master-score"
                    style={{ '--score-color': getScoreColor(player.masterScore) }}
                  >
                    {player.masterScore}
                  </div>
                </div>
                
                <div className="mobile-metrics-grid">
                  <div className="mobile-metric">
                    <span className="mobile-metric-label">Swing Score</span>
                    <span 
                      className="mobile-metric-value"
                      style={{ backgroundColor: getMetricColor(player.metrics.swingOptimization, 'swingScore') + '20' }}
                    >
                      {player.metrics.swingOptimization}
                    </span>
                  </div>
                  <div className="mobile-metric">
                    <span className="mobile-metric-label">Bat Speed</span>
                    <span 
                      className="mobile-metric-value"
                      style={{ backgroundColor: getMetricColor(player.metrics.batSpeed, 'batSpeed') + '20' }}
                    >
                      {player.metrics.batSpeed ? player.metrics.batSpeed.toFixed(1) + ' mph' : '-'}
                    </span>
                  </div>
                  <div className="mobile-metric">
                    <span className="mobile-metric-label">Attack Angle</span>
                    <span 
                      className="mobile-metric-value"
                      style={{ backgroundColor: getMetricColor(player.metrics.attackAngle, 'attackAngle') + '20' }}
                    >
                      {player.metrics.attackAngle ? player.metrics.attackAngle.toFixed(1) + '°' : '-'}
                    </span>
                  </div>
                  <div className="mobile-metric">
                    <span className="mobile-metric-label">Exit Velo</span>
                    <span 
                      className="mobile-metric-value"
                      style={{ backgroundColor: getMetricColor(player.metrics.playerExitVelocity, 'exitVelo') + '20' }}
                    >
                      {player.metrics.playerExitVelocity ? player.metrics.playerExitVelocity.toFixed(1) + ' mph' : '-'}
                    </span>
                  </div>
                  <div className="mobile-metric">
                    <span className="mobile-metric-label">Barrel Rate</span>
                    <span 
                      className="mobile-metric-value"
                      style={{ backgroundColor: getMetricColor(player.metrics.playerBarrelRate, 'barrelRate') + '20' }}
                    >
                      {player.metrics.playerBarrelRate ? player.metrics.playerBarrelRate.toFixed(1) + '%' : '-'}
                    </span>
                  </div>
                  <div className="mobile-metric">
                    <span className="mobile-metric-label">Confidence</span>
                    <span 
                      className="mobile-metric-value"
                      style={{ backgroundColor: getMetricColor(player.confidenceScore, 'confidence') + '20' }}
                    >
                      {player.confidenceScore}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassScrollableContainer>

      <div className="card-footer">
        <div className="legend">
          <span className="legend-item">🚀 Elite Master (85+)</span>
          <span className="legend-item">⚡ Advanced (75+)</span>
          <span className="legend-item">🎯 Specialist (65+)</span>
          <span className="legend-item">📈 Emerging (55+)</span>
        </div>
        <div className="last-updated">
          <small>
            Showing top {sortedPlayers.length} Launch Angle Masters • Updated: {analysisData?.updatedAt ? 
              new Date(analysisData.updatedAt).toLocaleTimeString() : 
              'Unknown'
            }
          </small>
        </div>
      </div>
    </GlassCard>
  );
};

export default LaunchAngleMastersCard;