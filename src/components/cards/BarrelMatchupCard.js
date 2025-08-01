import React, { useState, useEffect, useCallback } from 'react';
import hellraiserAnalysisService from '../../services/hellraiserAnalysisService';
import { useTeamFilter } from '../TeamFilterContext';
import { usePlayerScratchpad } from '../../contexts/PlayerScratchpadContext';
import { useHandedness } from '../../contexts/HandednessContext';
import GlassCard, { GlassScrollableContainer } from './GlassCard/GlassCard';
import { getPlayerDisplayName, getTeamDisplayName } from '../../utils/playerNameUtils';
import SimpleDesktopScratchpadIcon from '../common/SimpleDesktopScratchpadIcon';
import './BarrelMatchupCard.css';

const BarrelMatchupCard = ({ currentDate }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'pitcherContactAllowed', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState({});
  const { selectedTeam, includeMatchup, matchupTeam, shouldIncludePlayer } = useTeamFilter();
  const { filterEnabled: scratchpadFilterEnabled } = usePlayerScratchpad();
  const { selectedHandedness, getPlayerHandednessData, loadHandednessDatasets, handednessDatasets, loading: handednessLoading } = useHandedness();

  const loadBarrelAnalysis = useCallback(async () => {
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
          const processedData = await processAnalysisData(analysis);
          setAnalysisData(processedData);
        } else {
          setError(analysis.error);
        }
      } else {
        const processedData = await processAnalysisData(analysis);
        setAnalysisData(processedData);
      }
    } catch (err) {
      console.error('Error loading Barrel analysis:', err);
      setError('Failed to load Barrel analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentDate, selectedTeam, includeMatchup, matchupTeam, selectedHandedness, scratchpadFilterEnabled]);

  useEffect(() => {
    loadHandednessDatasets();
  }, [loadHandednessDatasets]);

  useEffect(() => {
    loadBarrelAnalysis();
  }, [loadBarrelAnalysis, selectedHandedness]);

  // Separate effect to re-process when handedness datasets become available
  useEffect(() => {
    if (handednessDatasets && analysisData) {
      console.log('🔍 DATASETS NOW AVAILABLE - Re-processing analysis data...');
      const reprocessData = async () => {
        const processedData = await processAnalysisData(analysisData);
        setAnalysisData(processedData);
      };
      reprocessData();
    }
  }, [handednessDatasets]);

  const processAnalysisData = async (analysis) => {
    // Extract pitcher metrics from structured component_scores data
    const processedPicks = await Promise.all(analysis.picks.map(async pick => {
      const reasoning = pick.reasoning || '';
      
      // Use structured data from enhanced hellraiser component_scores
      // Pitcher analysis from component_scores.pitcher_analysis
      const pitcherAnalysis = pick.component_scores?.pitcher_analysis || {};
      const pitcherContactAllowed = pitcherAnalysis.exit_velocity_allowed || 0;
      const pitcherBarrelVulnerable = pitcherAnalysis.barrel_rate_allowed || 0;
      const pitcherHardContact = pitcherAnalysis.exit_velocity_allowed || 0; // Same as contact allowed
      const pitcherHRRate = pitcherAnalysis.hr_per_9 || 0;
      
      // Batter analysis from component_scores.batter_analysis  
      const batterAnalysis = pick.component_scores?.batter_analysis || {};
      const playerExitVelocity = batterAnalysis.exit_velocity_avg || pick.exit_velocity_avg || 0;
      const playerBarrelRate = batterAnalysis.barrel_rate || pick.barrel_rate || 0;
      const playerHardContact = batterAnalysis.hard_hit_percent || pick.hard_hit_percent || 0;
      
      // Calculate market edge value for sorting
      const marketEdge = pick.marketEfficiency?.edge || 0;
      
      // Get handedness-specific swing data if available, otherwise fallback to hellraiser data
      const playerName = pick.player_name || pick.playerName || '';
      
      // Debug: Log what player name we're working with
      console.log(`🔍 BARREL MATCHUP: Processing player: "${playerName}"`);
      
      // Special check for Adolis Garcia
      if (playerName.toLowerCase().includes('adolis')) {
        console.log(`🔍🔍🔍 SPECIAL DEBUG FOR ADOLIS:`);
        console.log(`   Player name from pick: "${playerName}"`);
        console.log(`   Handedness datasets loaded: ${!!handednessDatasets}`);
        console.log(`   Selected handedness: ${selectedHandedness}`);
      }
      
      // Only try to get handedness data if datasets are loaded
      let handednessData = null;
      if (handednessDatasets && !handednessLoading) {
        try {
          console.log(`🔍 BARREL MATCHUP: Attempting handedness lookup for ${playerName}`);
          handednessData = await getPlayerHandednessData(playerName);
          console.log(`🔍 BARREL MATCHUP: Handedness data for ${playerName}:`, handednessData ? 'Found' : 'Not found');
          if (handednessData) {
            console.log(`🔍 BARREL MATCHUP: Found swing data for ${playerName}:`, {
              avgBatSpeed: handednessData.avg_bat_speed,
              attackAngle: handednessData.attack_angle,
              idealRate: handednessData.ideal_attack_angle_rate,
              dataName: handednessData.name
            });
          } else if (playerName.toLowerCase().includes('adolis')) {
            console.log(`🔍🔍🔍 FAILED TO FIND ADOLIS - handednessData is null`);
          }
        } catch (error) {
          console.error(`Error getting handedness data for ${playerName}:`, error);
        }
      } else {
        console.log(`🔍 BARREL MATCHUP: Cannot lookup handedness - datasets: ${!!handednessDatasets}, loading: ${handednessLoading}`);
      }
      
      // Swing analysis from component_scores.swing_analysis with fallbacks
      const swingAnalysis = pick.component_scores?.swing_analysis || {};
      
      const swingPath = {
        avgBatSpeed: handednessData ? handednessData.avg_bat_speed : 
          (swingAnalysis.bat_speed || pick.swing_bat_speed || null),
        attackAngle: handednessData ? handednessData.attack_angle : 
          (swingAnalysis.attack_angle || pick.swing_attack_angle || null),
        swingOptimizationScore: handednessData ? 
          Math.round(((handednessData.ideal_attack_angle_rate || 0) * 100) * 10) / 10 : // Round to 1 decimal
          (swingAnalysis.optimization_score || pick.swing_optimization_score || null),
        idealAttackAngleRate: handednessData ? handednessData.ideal_attack_angle_rate : 
          (swingAnalysis.ideal_angle_rate || pick.swing_ideal_rate || null),
        dataSource: handednessData ? `handedness_${selectedHandedness}` : 'enhanced_hellraiser'
      };
      
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
        swingPath,
        matchupScore: calculateMatchupScore(playerBarrelRate, pitcherBarrelVulnerable, playerExitVelocity, pitcherContactAllowed, playerHardContact, pitcherHardContact, swingPath)
      };
    }));
    
    return {
      ...analysis,
      picks: processedPicks
    };
  };

  const calculateMatchupScore = (playerBarrelRate, pitcherBarrelVulnerable, playerExitVelocity, pitcherContactAllowed, playerHardContact, pitcherHardContact, swingPath) => {
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
    
    // Swing path bonus (from hellraiser analysis)
    if (swingPath && swingPath.avgBatSpeed) {
      // Bat speed bonus
      if (swingPath.avgBatSpeed > 75) {
        score += 10;
      } else if (swingPath.avgBatSpeed > 72) {
        score += 5;
      }
      
      // Attack angle optimization bonus
      if (swingPath.idealAttackAngleRate > 0.4) {
        score += 8;
      } else if (swingPath.idealAttackAngleRate > 0.3) {
        score += 4;
      }
      
      // Swing optimization score bonus
      if (swingPath.swingOptimizationScore > 80) {
        score += 12;
      } else if (swingPath.swingOptimizationScore > 70) {
        score += 6;
      }
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
      
      // Handle nested swing path properties
      if (sortConfig.key.startsWith('swingPath.')) {
        const prop = sortConfig.key.split('.')[1];
        aValue = a.swingPath?.[prop] || 0;
        bValue = b.swingPath?.[prop] || 0;
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
      
      case 'batSpeed':
        if (value >= 73) return '#4CAF50';  // Elite
        if (value >= 71) return '#66BB6A';  // Above average
        if (value >= 69) return '#81C784';  // Average
        if (value >= 67) return '#ffaa44';  // Below average
        return '#F44336';  // Poor
      
      case 'attackAngle':
        // Ideal range is 5-20 degrees
        if (value >= 5 && value <= 20) return '#4CAF50';  // Ideal
        if (value >= 3 && value <= 25) return '#66BB6A';  // Good
        if (value >= 0 && value <= 30) return '#81C784';  // Acceptable
        return '#F44336';  // Poor
      
      case 'swingScore':
        if (value >= 80) return '#4CAF50';  // Elite
        if (value >= 70) return '#66BB6A';  // Above average
        if (value >= 60) return '#81C784';  // Average
        if (value >= 50) return '#ffaa44';  // Below average
        return '#F44336';  // Poor
      
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <GlassCard className="barrel-matchup-card" variant="default">
        <div className="glass-header">
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
        <div className="glass-header">
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
        <div className="glass-header">
          <h3>🎯 Barrel Matchup Analysis</h3>
        </div>
        <div className="no-data">
          <p>No barrel matchup data available</p>
        </div>
      </GlassCard>
    );
  }

  // Apply scratchpad filtering before sorting
  const filteredPicks = analysisData.picks.filter(pick => {
    const playerName = pick.playerName || pick.player_name || '';
    const playerTeam = pick.team || pick.Team || '';
    return shouldIncludePlayer(playerTeam, playerName);
  });
  
  const sortedPicks = sortData(filteredPicks);

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
              <th className="player-col" scope="col">
                <span className="header-text-wrapper">
                  Player
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('pitcherContactAllowed')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Pitch Contact {getSortIndicator('pitcherContactAllowed')}</span>
                  <span className="header-subtitle">Exit Velo</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('pitcherBarrelVulnerable')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Pitch Barrels {getSortIndicator('pitcherBarrelVulnerable')}</span>
                  <span className="header-subtitle">% Allowed</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('playerExitVelocity')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Exit Velo {getSortIndicator('playerExitVelocity')}</span>
                  <span className="header-subtitle">Player</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('playerBarrelRate')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Barrel Rate {getSortIndicator('playerBarrelRate')}</span>
                  <span className="header-subtitle">Player %</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('playerHardContact')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Hard Contact {getSortIndicator('playerHardContact')}</span>
                  <span className="header-subtitle">Player %</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('pitcherHardContact')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Hard Allowed {getSortIndicator('pitcherHardContact')}</span>
                  <span className="header-subtitle">Pitcher</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('swingPath.avgBatSpeed')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Bat Speed {getSortIndicator('swingPath.avgBatSpeed')}</span>
                  <span className="header-subtitle">mph</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('swingPath.attackAngle')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Attack Angle {getSortIndicator('swingPath.attackAngle')}</span>
                  <span className="header-subtitle">degrees</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('swingPath.swingOptimizationScore')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Swing Path {getSortIndicator('swingPath.swingOptimizationScore')}</span>
                  <span className="header-subtitle">Score</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('confidenceScore')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Confidence {getSortIndicator('confidenceScore')}</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('marketEdge')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Market Edge {getSortIndicator('marketEdge')}</span>
                </span>
              </th>
              <th className="sortable rotated-header" scope="col" onClick={() => handleSort('matchupScore')}>
                <span className="header-text-wrapper">
                  <span className="header-main">Score {getSortIndicator('matchupScore')}</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPicks.map((pick, index) => (
              <React.Fragment key={index}>
                <tr className="data-row" onClick={() => toggleRowExpansion(index)}>
                  <td className="player-cell">
                    {/* Add scratchpad icon */}
                    <SimpleDesktopScratchpadIcon 
                      player={{
                        name: getPlayerDisplayName(pick),
                        team: getTeamDisplayName(pick).split(' ')[0], // Extract team abbreviation
                        playerType: 'hitter'
                      }} 
                    />
                    <div className="player-info">
                      <span className="player-name">{getPlayerDisplayName(pick)}</span>
                      <span className="team-info">{getTeamDisplayName(pick)} vs {pick.pitcher}</span>
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
                    style={{ backgroundColor: getValueColor(pick.swingPath?.avgBatSpeed, 'batSpeed') + '20' }}
                  >
                    {pick.swingPath?.avgBatSpeed ? `${pick.swingPath.avgBatSpeed.toFixed(1)}` : '-'}
                  </td>
                  <td 
                    className="metric-cell"
                    style={{ backgroundColor: getValueColor(pick.swingPath?.attackAngle, 'attackAngle') + '20' }}
                  >
                    {pick.swingPath?.attackAngle ? `${pick.swingPath.attackAngle.toFixed(1)}°` : '-'}
                  </td>
                  <td 
                    className="metric-cell swing-path-score"
                    style={{ backgroundColor: getValueColor(pick.swingPath?.swingOptimizationScore, 'swingScore') + '20' }}
                  >
                    {pick.swingPath?.swingOptimizationScore || '-'}
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
                    <td colSpan="13">
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
                          {pick.swingPath && (
                            <>
                              <div className="detail-item">
                                <span className="label">Bat Speed Percentile:</span>
                                <span className="value">{pick.swingPath.batSpeedPercentile ? `${pick.swingPath.batSpeedPercentile.toFixed(0)}%` : 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="label">Ideal Attack Angle Rate:</span>
                                <span className="value">{pick.swingPath.idealAttackAngleRate ? `${(pick.swingPath.idealAttackAngleRate * 100).toFixed(1)}%` : 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="label">Swing Optimization Score:</span>
                                <span className="value">{pick.swingPath.swingOptimizationScore}</span>
                              </div>
                              <div className="detail-item">
                                <span className="label">Pull Tendency:</span>
                                <span className="value">{pick.swingPath.pullTendency?.replace('_', ' ') || 'N/A'}</span>
                              </div>
                              {pick.swingPath.showSplits && pick.swingPath.splits && (
                                <>
                                  <div className="splits-header">
                                    <h6>Splits vs RHP/LHP:</h6>
                                  </div>
                                  <div className="detail-item">
                                    <span className="label">Bat Speed Diff (RHP - LHP):</span>
                                    <span className="value">{pick.swingPath.splits?.differential?.batSpeed ? `${pick.swingPath.splits.differential.batSpeed.toFixed(1)} mph` : 'N/A'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="label">Attack Angle Diff:</span>
                                    <span className="value">{pick.swingPath.splits?.differential?.attackAngle ? `${pick.swingPath.splits.differential.attackAngle.toFixed(1)}°` : 'N/A'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="label">Ideal Rate Diff:</span>
                                    <span className="value">{pick.swingPath.splits?.differential?.idealRate ? `${(pick.swingPath.splits.differential.idealRate * 100).toFixed(1)}%` : 'N/A'}</span>
                                  </div>
                                </>
                              )}
                            </>
                          )}
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
          {/* Mobile Sort Dropdown */}
          <div className="mobile-sort-controls">
            <label htmlFor="mobile-sort-select">Sort by:</label>
            <select 
              id="mobile-sort-select"
              value={sortConfig.key} 
              onChange={(e) => setSortConfig({key: e.target.value, direction: 'desc'})}
              className="mobile-sort-dropdown"
            >
              <option value="matchupScore">Overall Score</option>
              <option value="pitcherContactAllowed">Pitcher Contact (Exit Velo)</option>
              <option value="pitcherBarrelVulnerable">Pitcher Barrels</option>
              <option value="playerExitVelocity">Player Exit Velocity</option>
              <option value="playerBarrelRate">Player Barrel Rate</option>
              <option value="playerHardContact">Player Hard Contact</option>
              <option value="pitcherHardContact">Pitcher Hard Allowed</option>
              <option value="swingPath.avgBatSpeed">Bat Speed</option>
              <option value="swingPath.attackAngle">Attack Angle</option>
              <option value="swingPath.swingOptimizationScore">Swing Path Score</option>
              <option value="confidenceScore">Confidence Score</option>
              <option value="marketEdge">Market Edge</option>
            </select>
          </div>
          
          <div className="mobile-cards">
            {sortedPicks.map((pick, index) => (
              <div key={index} className={`mobile-card ${expandedRows[index] ? 'expanded' : ''}`}>
                <div className="mobile-card-header" onClick={() => toggleRowExpansion(index)}>
                  {/* Add scratchpad icon for mobile */}
                  <SimpleDesktopScratchpadIcon 
                    player={{
                      name: getPlayerDisplayName(pick),
                      team: getTeamDisplayName(pick).split(' ')[0], // Extract team abbreviation
                      playerType: 'hitter'
                    }} 
                  />
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
                      {pick.swingPath && (
                        <>
                          <div className="metric-item">
                            <span className="metric-label">Bat Speed</span>
                            <span 
                              className="metric-value"
                              style={{ backgroundColor: getValueColor(pick.swingPath.avgBatSpeed, 'batSpeed') + '20' }}
                            >
                              {pick.swingPath.avgBatSpeed ? `${pick.swingPath.avgBatSpeed.toFixed(1)} mph` : 'N/A'}
                            </span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Attack Angle</span>
                            <span 
                              className="metric-value"
                              style={{ backgroundColor: getValueColor(pick.swingPath.attackAngle, 'attackAngle') + '20' }}
                            >
                              {pick.swingPath.attackAngle ? `${pick.swingPath.attackAngle.toFixed(1)}°` : 'N/A'}
                            </span>
                          </div>
                        </>
                      )}
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