/**
 * First Inning Cash Analysis Component
 * Displays ranked first inning opportunities with detailed breakdown
 */
import React, { useState, useMemo, useEffect } from 'react';
import firstInningCashService from '../../../services/firstInningCashService';
import { getAnalysisCellColor } from '../../../utils/colorThresholds';
import './FirstInningCashAnalysis.css';

const FirstInningCashAnalysis = ({ analysis, opportunities, matchups, lineupData, loading }) => {
  const [sortBy, setSortBy] = useState('rank');
  const [filterBy, setFilterBy] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Utility function to safely format numbers with toFixed (matching ComprehensiveAnalysisDisplay.js)
  const safeToFixed = (value, decimals = 1, fallback = 'N/A') => {
    if (value === null || value === undefined || isNaN(value)) {
      return fallback;
    }
    return Number(value).toFixed(decimals);
  };

  // Helper function to get color class for analysis cells (matching ComprehensiveAnalysisDisplay.js)
  const getCellColorClass = (cellType, value, options = {}) => {
    return getAnalysisCellColor(cellType, value, {
      leagueAverages: {},
      ...options
    });
  };

  // Process first inning cash analysis
  useEffect(() => {
    const processAnalysis = async () => {
      console.log('🥇 FirstInningCashAnalysis: Processing analysis...');
      console.log('📊 Analysis:', !!analysis, analysis ? Object.keys(analysis) : 'none');
      console.log('🎯 Opportunities:', !!opportunities, opportunities ? opportunities.length : 0);
      console.log('⚾ Matchups:', !!matchups, matchups ? matchups.length : 0);
      
      if (!analysis && !opportunities) {
        console.log('❌ No analysis or opportunities data available');
        setAnalysisData(null);
        return;
      }

      setIsAnalyzing(true);
      try {
        const result = await firstInningCashService.identifyFirstInningOpportunities(
          analysis, 
          opportunities, 
          matchups,
          lineupData
        );
        console.log('✅ First inning cash analysis result:', result);
        setAnalysisData(result);
      } catch (error) {
        console.error('❌ Error processing first inning cash analysis:', error);
        setAnalysisData({ 
          candidates: [], 
          summary: { elite: 0, strong: 0, monitoring: 0, total: 0 },
          metadata: { error: error.message }
        });
      } finally {
        setIsAnalyzing(false);
      }
    };

    processAnalysis();
  }, [analysis, opportunities, matchups, lineupData]);

  // Filter and sort candidates
  const filteredAndSortedCandidates = useMemo(() => {
    if (!analysisData?.candidates) return [];

    let filtered = analysisData.candidates;

    // Apply filters
    if (filterBy !== 'all') {
      filtered = filtered.filter(candidate => {
        switch (filterBy) {
          case 'elite':
            return candidate.tier === 'ELITE';
          case 'strong':
            return candidate.tier === 'STRONG';
          case 'leadoff':
            return candidate.player.position === 1;
          case 'top-three':
            return [1, 2, 3].includes(candidate.player.position);
          default:
            return true;
        }
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rank':
          return a.rank - b.rank;
        case 'score':
          return b.scores.composite - a.scores.composite;
        case 'position':
          return a.player.position - b.player.position;
        case 'inning-score':
          return b.scores.inningPatterns - a.scores.inningPatterns;
        case 'recent-performance':
          return b.scores.recentPerformance - a.scores.recentPerformance;
        default:
          return a.rank - b.rank;
      }
    });
  }, [analysisData, filterBy, sortBy]);

  // Helper function to get lineup hitter for a specific position (matching ComprehensiveAnalysisDisplay.js)
  const getLineupHitterForPosition = (position, opposingTeam) => {
    if (!lineupData || !opposingTeam) return null;
    
    // Find the game for this team
    const game = lineupData.games?.find(g => 
      g.teams?.away?.abbr === opposingTeam || g.teams?.home?.abbr === opposingTeam
    );
    
    if (!game) {
      console.warn('No game found for team:', opposingTeam);
      return null;
    }

    // Determine if this team is home or away
    const isAway = game.teams?.away?.abbr === opposingTeam;
    
    // Get lineup for this team
    const lineup = isAway ? game.lineups?.away : game.lineups?.home;

    if (!lineup) {
      console.warn('No lineup data found for team:', opposingTeam);
      return null;
    }

    // Handle different lineup data structures
    let batters = [];
    if (lineup.batters) {
      batters = lineup.batters;
    } else if (lineup.batting_order) {
      batters = lineup.batting_order.map(batter => ({
        name: batter.name,
        batting_order: batter.batting_order || batter.position
      }));
    }

    // Find the batter in the specified position
    const batter = batters.find(b => {
      const batterPosition = parseInt(b.batting_order || b.position);
      return batterPosition === position;
    });

    return batter || null;
  };

  // Toggle row expansion
  const toggleRowExpansion = (candidateId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(candidateId)) {
      newExpanded.delete(candidateId);
    } else {
      newExpanded.add(candidateId);
    }
    setExpandedRows(newExpanded);
  };

  // Get score color class
  const getScoreColorClass = (score) => {
    if (score >= 85) return 'score-elite';
    if (score >= 70) return 'score-strong';
    if (score >= 55) return 'score-monitoring';
    return 'score-standard';
  };

  // Get tier badge
  const getTierBadge = (tier) => {
    const badges = {
      'ELITE': { emoji: '🥇', class: 'tier-elite' },
      'STRONG': { emoji: '🥈', class: 'tier-strong' },
      'MONITORING': { emoji: '🥉', class: 'tier-monitoring' },
      'STANDARD': { emoji: '📊', class: 'tier-standard' }
    };
    return badges[tier] || badges['STANDARD'];
  };

  // Get position badge color
  const getPositionBadgeClass = (position) => {
    switch (position) {
      case 1: return 'position-leadoff';
      case 2: return 'position-second';
      case 3: return 'position-third';
      default: return 'position-other';
    }
  };

  // Render criteria indicators
  const renderCriteriaIndicators = (criteria) => {
    const indicators = [
      { key: 'inningPatterns', label: '1st Inn', emoji: '🎯' },
      { key: 'positionVulnerability', label: 'Position', emoji: '🎪' },
      { key: 'recentPerformance', label: 'Recent', emoji: '🔥' },
      { key: 'optimalMatchup', label: 'Matchup', emoji: '⚡' }
    ];

    return (
      <div className="criteria-indicators">
        {indicators.map(indicator => (
          <div 
            key={indicator.key}
            className={`criteria-indicator ${criteria[indicator.key] ? 'met' : 'not-met'}`}
            title={`${indicator.label}: ${criteria[indicator.key] ? 'Met' : 'Not Met'}`}
          >
            <span className="criteria-emoji">{indicator.emoji}</span>
            <span className="criteria-label">{indicator.label}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render expanded row details
  const renderExpandedDetails = (candidate) => {
    // Get the actual lineup hitter for this position
    const lineupHitter = getLineupHitterForPosition(candidate.player.position, candidate.player.team);
    const displayName = lineupHitter ? lineupHitter.name : candidate.player.name;

    // Extract position vulnerability data if available
    const positionVulnData = candidate.data?.rawData?.positionVulnerabilityData || {};
    
    // Extract position vulnerability data for analysis display
    
    return (
      <div className="expanded-details">
        <div className="details-grid">
          
          {/* Score Breakdown */}
          <div className="detail-section">
            <h4>Score Breakdown</h4>
            <div className="score-breakdown">
              <div className="score-item">
                <span className="score-label">1st Inning Patterns (45%)</span>
                <span className="score-value">{candidate.scores.inningPatterns.toFixed(1)}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Position Vulnerability (30%)</span>
                <span className="score-value">{candidate.scores.positionVulnerability.toFixed(1)}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Recent Performance (20%)</span>
                <span className="score-value">{candidate.scores.recentPerformance.toFixed(1)}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Optimal Matchup (5%)</span>
                <span className="score-value">{candidate.scores.optimalMatchup.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Player Stats */}
          <div className="detail-section">
            <h4>Player Stats</h4>
            <div className="player-stats">
              <div className="stat-item">
                <span className="stat-label">Player Name</span>
                <span className="stat-value">{displayName}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Recent AVG</span>
                <span className="stat-value">{candidate.data.batterStats.recentAvg.toFixed(3)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Recent OPS</span>
                <span className="stat-value">{candidate.data.batterStats.recentOPS.toFixed(3)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">HR Score</span>
                <span className="stat-value">{candidate.data.batterStats.hrScore.toFixed(1)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Hit Probability</span>
                <span className="stat-value">{candidate.data.batterStats.hitProb.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Positional Vulnerability Breakdown */}
          <div className="detail-section">
            <h4>🎯 Positional Vulnerability Analysis</h4>
            <p className="section-description">
              How the pitcher performs against this specific batting position
            </p>
            <div className="position-stats">
              <div className={`stat vulnerability-score ${getCellColorClass('vuln', positionVulnData.vulnerability_score)}`}>
                <span className="label">Vuln:</span>
                <span className="value">{safeToFixed(positionVulnData.vulnerability_score, 1)}</span>
              </div>
              <div className={`stat performance-rate ${getCellColorClass('hr_rate', positionVulnData.hr_rate)}`}>
                <span className="label">HR:</span>
                <span className="value">{safeToFixed((positionVulnData.hr_rate || positionVulnData.hr_frequency || 0) * 100, 1)}%</span>
              </div>
              <div className={`stat performance-rate ${getCellColorClass('hit_rate', positionVulnData.hit_rate)}`}>
                <span className="label">Hit:</span>
                <span className="value">{safeToFixed((positionVulnData.hit_rate || positionVulnData.hit_frequency || 0) * 100, 1)}%</span>
              </div>
              <div className={`stat sample-size-indicator ${getCellColorClass('ab', positionVulnData.sample_size)}`}>
                <span className="label">AB:</span>
                <span className="value">{positionVulnData.sample_size || 'N/A'}</span>
              </div>
            </div>
            <div className="vulnerability-context">
              <div className="context-note">
                <strong>Analysis:</strong> This shows how {candidate.pitcher.name} performs specifically against {candidate.player.positionName} batters.
                Higher vulnerability scores (green) indicate this pitcher struggles against this position.
              </div>
            </div>
          </div>

          {/* Pitcher vs Position Summary */}
          <div className="detail-section">
            <h4>Pitcher vs Position</h4>
            <div className="pitcher-stats">
              <div className="stat-item">
                <span className="stat-label">Pitcher</span>
                <span className="stat-value">{candidate.pitcher.name}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Position</span>
                <span className="stat-value">{candidate.player.positionName}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pitcher Sample Size</span>
                <span className="stat-value">
                  {candidate.data.pitcherStats.gamesAnalyzed || 'N/A'} games
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">1st Inn Vulnerability</span>
                <span className="stat-value">{candidate.data.pitcherStats.firstInningVuln.toFixed(1)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">1st Inn Hit Rate</span>
                <span className="stat-value">{(candidate.data.pitcherStats.firstInningHitRate * 100).toFixed(1)}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">ERA</span>
                <span className="stat-value">{candidate.data.pitcherStats.era.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  if (loading || isAnalyzing) {
    return (
      <div className="first-inning-cash-analysis loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Analyzing first inning opportunities...</p>
        </div>
      </div>
    );
  }

  if (!analysisData || analysisData.candidates.length === 0) {
    return (
      <div className="first-inning-cash-analysis empty">
        <div className="empty-state">
          <h3>🥇 1st Inning Cash</h3>
          <p>No first inning opportunities found with current analysis data.</p>
          <div className="empty-details">
            <p>Candidates must meet at least 1 of these criteria:</p>
            <ul>
              <li>🎯 High pitcher vulnerability in 1st inning</li>
              <li>🎪 Strong position vulnerability (leadoff, 2nd, 3rd hitters)</li>
              <li>🔥 Recent hot performance</li>
              <li>⚡ Optimal historical matchup</li>
            </ul>
            {analysisData?.metadata?.error && (
              <div className="error-info">
                <p><strong>Error:</strong> {analysisData.metadata.error}</p>
              </div>
            )}
            <div className="debug-info">
              <p><strong>Debug info:</strong></p>
              <ul>
                <li>Analysis available: {!!analysis ? 'Yes' : 'No'}</li>
                <li>Opportunities count: {opportunities?.length || 0}</li>
                <li>Matchups available: {!!matchups ? 'Yes' : 'No'}</li>
                <li>Analysis method: {analysisData?.metadata?.analysisMethod || 'Unknown'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { summary, metadata } = analysisData;

  return (
    <div className="first-inning-cash-analysis">
      
      {/* Header */}
      <div className="analysis-header">
        <div className="header-main">
          <h3>🥇 1st Inning Cash Opportunities</h3>
          <p>Elite first inning betting opportunities based on pitcher vulnerability, position, and recent performance</p>
        </div>
        
        <div className="summary-stats">
          <div className="summary-item elite">
            <span className="summary-count">{summary.elite}</span>
            <span className="summary-label">Elite</span>
          </div>
          <div className="summary-item strong">
            <span className="summary-count">{summary.strong}</span>
            <span className="summary-label">Strong</span>
          </div>
          <div className="summary-item monitoring">
            <span className="summary-count">{summary.monitoring}</span>
            <span className="summary-label">Monitor</span>
          </div>
          <div className="summary-item total">
            <span className="summary-count">{summary.total}</span>
            <span className="summary-label">Total</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="analysis-controls">
        <div className="filter-controls">
          <label>Filter:</label>
          <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
            <option value="all">All Candidates</option>
            <option value="elite">Elite Only</option>
            <option value="strong">Strong Only</option>
            <option value="leadoff">Leadoff Hitters</option>
            <option value="top-three">Top 3 Positions</option>
          </select>
        </div>

        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="rank">Rank</option>
            <option value="score">Composite Score</option>
            <option value="position">Batting Position</option>
            <option value="inning-score">1st Inning Score</option>
            <option value="recent-performance">Recent Performance</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="candidates-table-container">
        <table className="candidates-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Position</th>
              <th>Score</th>
              <th>Tier</th>
              <th>Criteria</th>
              <th>Matchup</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedCandidates.map((candidate) => {
              const candidateId = `${candidate.player.name}-${candidate.matchup.key}`;
              const isExpanded = expandedRows.has(candidateId);
              const tierBadge = getTierBadge(candidate.tier);
              
              return (
                <React.Fragment key={candidateId}>
                  <tr className={`candidate-row ${candidate.tier.toLowerCase()}`}>
                    
                    {/* Rank */}
                    <td className="rank-cell">
                      <div className="rank-badge">
                        #{candidate.rank}
                      </div>
                    </td>

                    {/* Player */}
                    <td className="player-cell">
                      <div className="player-info">
                        {(() => {
                          // Get the actual lineup hitter for this position
                          const lineupHitter = getLineupHitterForPosition(candidate.player.position, candidate.player.team);
                          const displayName = lineupHitter ? lineupHitter.name : candidate.player.name;
                          
                          return (
                            <>
                              <span className="player-name">{displayName}</span>
                              <span className="player-team">({candidate.player.team})</span>
                            </>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Position */}
                    <td className="position-cell">
                      <div className={`position-badge ${getPositionBadgeClass(candidate.player.position)}`}>
                        <span className="position-number">{candidate.player.position}</span>
                        <span className="position-name">{candidate.player.positionName}</span>
                      </div>
                    </td>

                    {/* Score */}
                    <td className="score-cell">
                      <div className={`composite-score ${getScoreColorClass(candidate.scores.composite)}`}>
                        {candidate.scores.composite.toFixed(1)}
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="tier-cell">
                      <div className={`tier-badge ${tierBadge.class}`}>
                        <span className="tier-emoji">{tierBadge.emoji}</span>
                        <span className="tier-label">{candidate.tier}</span>
                      </div>
                    </td>

                    {/* Criteria */}
                    <td className="criteria-cell">
                      {renderCriteriaIndicators(candidate.criteria)}
                    </td>

                    {/* Matchup */}
                    <td className="matchup-cell">
                      <div className="matchup-info">
                        <span className="vs-pitcher">vs {candidate.pitcher.name}</span>
                        <span className="venue">{candidate.matchup.venue}</span>
                      </div>
                    </td>

                    {/* Details Toggle */}
                    <td className="details-cell">
                      <button 
                        className={`details-toggle ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleRowExpansion(candidateId)}
                        aria-label={isExpanded ? 'Hide details' : 'Show details'}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan="8">
                        {renderExpandedDetails(candidate)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="analysis-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Total Analyzed:</span>
            <span className="metadata-value">{metadata.totalAnalyzed}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Qualifying Candidates:</span>
            <span className="metadata-value">{metadata.qualifyingCandidates}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Average Score:</span>
            <span className="metadata-value">{metadata.averageScore}</span>
          </div>
          {metadata.timestamp && (
            <div className="metadata-item">
              <span className="metadata-label">Updated:</span>
              <span className="metadata-value">{new Date(metadata.timestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default FirstInningCashAnalysis;