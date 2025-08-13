import React, { useState, useEffect } from 'react';
import './ComprehensiveAnalysisDisplay.css';
import pitchMatchupService from '../services/pitchMatchupService';

const ComprehensiveAnalysisDisplay = ({ analysis }) => {
  console.log('🎯 COMPREHENSIVE DISPLAY: Component rendered with analysis:', !!analysis);
  
  // Utility function to safely format numbers with toFixed
  const safeToFixed = (value, decimals = 1, fallback = 'N/A') => {
    if (value === null || value === undefined || isNaN(value)) {
      return fallback;
    }
    return Number(value).toFixed(decimals);
  };
  
  const [expandedSections, setExpandedSections] = useState({
    away: true,
    home: true,
    optimal: true,
    overall: true
  });
  const [selectedMatchupIndex, setSelectedMatchupIndex] = useState(0);
  const [lineupData, setLineupData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [optimalMatchups, setOptimalMatchups] = useState({});

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Load lineup data when analysis changes
  useEffect(() => {
    const loadLineupData = async () => {
      if (!analysis) return;
      
      setLoading(true);
      try {
        // Get the current matchup to determine the date
        const allMatchups = Object.values(analysis.matchup_analysis);
        if (allMatchups.length > 0) {
          const firstMatchup = allMatchups[0];
          // Get date without timezone conversion
          let date;
          if (firstMatchup.matchup?.date) {
            date = firstMatchup.matchup.date;
          } else {
            // Get current date without timezone issues
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            date = `${year}-${month}-${day}`;
          }
          
          const response = await fetch(`/data/lineups/starting_lineups_${date}.json`);
          if (response.ok) {
            const data = await response.json();
            setLineupData(data);
          } else {
            console.warn('No lineup data available for date:', date);
          }
        }
      } catch (error) {
        console.error('Error loading lineup data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLineupData();
  }, [analysis]);

  // Load optimal matchups when lineup data is available
  useEffect(() => {
    console.log('🎯 OPTIMAL MATCHUPS EFFECT: Triggered with lineupData:', !!lineupData, 'analysis:', !!analysis);
    
    const loadOptimalMatchups = async () => {
      if (!lineupData || !analysis) {
        console.log('🎯 OPTIMAL MATCHUPS EFFECT: Early return - missing data. LineupData:', !!lineupData, 'Analysis:', !!analysis);
        return;
      }

      console.log('🎯 OPTIMAL MATCHUPS EFFECT: Starting to load optimal matchups...');
      const allMatchups = Object.values(analysis.matchup_analysis);
      console.log('🎯 OPTIMAL MATCHUPS EFFECT: Found', allMatchups.length, 'matchups to analyze');
      const newOptimalMatchups = {};

      for (const [index, matchupData] of allMatchups.entries()) {
        console.log(`🎯 OPTIMAL MATCHUPS EFFECT: Processing matchup ${index + 1}/${allMatchups.length}`);
        
        const awayOptimal = await pitchMatchupService.analyzeOptimalMatchups(
          matchupData.away_pitcher_analysis?.pitch_vulnerabilities,
          matchupData.away_pitcher_analysis?.opposing_team,
          lineupData
        );

        const homeOptimal = await pitchMatchupService.analyzeOptimalMatchups(
          matchupData.home_pitcher_analysis?.pitch_vulnerabilities,
          matchupData.home_pitcher_analysis?.opposing_team,
          lineupData
        );

        newOptimalMatchups[index] = {
          away_pitcher_matchups: awayOptimal,
          home_pitcher_matchups: homeOptimal
        };
      }

      console.log('🎯 OPTIMAL MATCHUPS EFFECT: Analysis complete, setting optimal matchups:', newOptimalMatchups);
      setOptimalMatchups(newOptimalMatchups);
    };

    loadOptimalMatchups();
  }, [lineupData, analysis]);

  // Helper function to get lineup hitter for a specific position
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
    const lineup = isAway ? game.lineups?.away : game.lineups?.home;
    
    if (!lineup) {
      console.warn('No lineup data found for team:', opposingTeam);
      return null;
    }
    
    // Handle both 'batters' and 'batting_order' data structures
    let batters = [];
    if (lineup.batters) {
      batters = lineup.batters;
    } else if (lineup.batting_order) {
      batters = lineup.batting_order.map(batter => ({
        name: batter.name,
        batting_order: batter.position,
        season_stats: batter.season_stats,
        status: batter.status || 'confirmed'
      }));
    }
    
    if (!batters || batters.length === 0) {
      console.warn('No batters found for team:', opposingTeam);
      return null;
    }
    
    // Find the batter in the specified position (1-9)
    const batter = batters.find(b => b.batting_order === position);
    
    if (batter) {
      return {
        name: batter.name,
        batting_avg: batter.season_stats?.avg,
        status: batter.status || 'confirmed'
      };
    }
    
    return null;
  };

  // Render optimal pitch-type matchups
  const renderOptimalMatchups = (matchups, pitcherName) => {
    if (!matchups || matchups.length === 0) {
      return <div className="no-data">No optimal matchups identified</div>;
    }

    return (
      <div className="optimal-matchups-section">
        <div className="matchups-header">
          <span className="pitcher-name">{pitcherName}</span>
          <span className="matchup-count">({matchups.length} opportunities)</span>
        </div>
        
        <div className="matchups-grid">
          {matchups.slice(0, 5).map((matchup, index) => (
            <div key={index} className={`matchup-card opportunity-${Math.floor(matchup.opportunityScore / 20)}`}>
              <div className="matchup-header">
                <div className="hitter-info">
                  <span className="hitter-name">{matchup.hitter}</span>
                  <span className="batting-position">#{matchup.battingPosition}</span>
                </div>
                <div className="opportunity-score">
                  <span className="score">{safeToFixed(matchup.opportunityScore, 0)}%</span>
                  <span className="label">Opportunity</span>
                </div>
              </div>
              
              <div className="pitch-type-info">
                <span className="pitch-type">{matchup.pitchType}</span>
                <span className="pitch-name">{matchup.pitchName}</span>
              </div>
              
              <div className="matchup-stats">
                <div className="stat-group">
                  <div className="stat-label">Pitcher Vulnerability</div>
                  <div className="stat-values">
                    <span>HR: {matchup.stats.pitcher.hr_rate}%</span>
                    <span>Hit: {matchup.stats.pitcher.hit_rate}%</span>
                    <span>({matchup.stats.pitcher.sample_size} AB)</span>
                  </div>
                </div>
                
                <div className="stat-group">
                  <div className="stat-label">Hitter Strength</div>
                  <div className="stat-values">
                    <span>BA: {matchup.stats.hitter.ba}</span>
                    <span>SLG: {matchup.stats.hitter.slg}</span>
                    <span>wOBA: {matchup.stats.hitter.woba}</span>
                    <span>HH%: {matchup.stats.hitter.hard_hit_percent}%</span>
                  </div>
                </div>
              </div>
              
              <div className="reasoning">
                <span className="reasoning-text">{matchup.reasoning}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!analysis || !analysis.matchup_analysis) {
    return null;
  }

  // Get all matchups from matchup_analysis
  const allMatchups = Object.values(analysis.matchup_analysis);
  if (!allMatchups || allMatchups.length === 0) return null;

  // Get the currently selected matchup
  const currentMatchup = allMatchups[selectedMatchupIndex];
  if (!currentMatchup) return null;

  const { 
    away_pitcher_analysis, 
    home_pitcher_analysis, 
    overall_matchup_assessment,
    matchup 
  } = currentMatchup;

  const renderPitchVulnerabilities = (vulnerabilities) => {
    if (!vulnerabilities || Object.keys(vulnerabilities).length === 0) {
      return <div className="no-data">No pitch vulnerability data available</div>;
    }

    return (
      <div className="pitch-vulnerabilities-grid">
        {Object.entries(vulnerabilities).map(([pitch, data]) => (
          <div key={pitch} className="pitch-card">
            <div className="pitch-header">
              <span className="pitch-name">{pitch}</span>
              <span className={`vulnerability-badge ${(data.vulnerability_score || 0) > 3 ? 'high' : (data.vulnerability_score || 0) > 1 ? 'medium' : 'low'}`}>
                {safeToFixed(data.vulnerability_score)} vuln
              </span>
            </div>
            <div className="pitch-stats">
              <div className="stat-row">
                <span className="stat-label">HR Rate:</span>
                <span className="stat-value">{safeToFixed(data.hr_rate * 100, 1)}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Hit Rate:</span>
                <span className="stat-value">{safeToFixed(data.hit_rate * 100, 1)}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">K Rate:</span>
                <span className="stat-value">{safeToFixed(data.strikeout_rate * 100, 1)}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Sample:</span>
                <span className="stat-value">{data.sample_size} pitches</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderInningPatterns = (patterns) => {
    if (!patterns || Object.keys(patterns).length === 0) {
      return <div className="no-data">No inning pattern data available</div>;
    }

    return (
      <div className="inning-patterns-grid">
        {Object.entries(patterns)
          .sort(([a], [b]) => {
            const inningA = parseInt(a.replace('inning_', ''));
            const inningB = parseInt(b.replace('inning_', ''));
            return inningA - inningB;
          })
          .map(([inning, data]) => (
            <div key={inning} className={`inning-card ${(data.vulnerability_score || 0) > 20 ? 'high-vuln' : (data.vulnerability_score || 0) > 10 ? 'med-vuln' : 'low-vuln'}`}>
              <div className="inning-header">
                <span className="inning-label">Inning {inning.replace('inning_', '')}</span>
                <span className="vulnerability-score">{safeToFixed(data.vulnerability_score, 1)}%</span>
              </div>
              <div className="inning-stats">
                <span className="hr-freq">HR: {safeToFixed(data.hr_frequency * 100, 1)}%</span>
                <span className="hit-freq">Hit: {safeToFixed(data.hit_frequency * 100, 1)}%</span>
                <span className="sample">({data.sample_size || 0} AB)</span>
              </div>
            </div>
          ))}
      </div>
    );
  };

  const renderPositionVulnerabilities = (positions, opposingTeam) => {
    if (!positions || Object.keys(positions).length === 0) {
      return <div className="no-data">No position vulnerability data available</div>;
    }

    return (
      <div className="position-vulnerabilities-grid">
        {Object.entries(positions)
          .sort(([a], [b]) => {
            const posA = parseInt(a.replace('position_', ''));
            const posB = parseInt(b.replace('position_', ''));
            return posA - posB;
          })
          .map(([position, data]) => {
            const posNum = parseInt(position.replace('position_', ''));
            const positionNames = {
              1: 'Leadoff', 2: '#2 Hitter', 3: '#3 Hitter', 4: 'Cleanup',
              5: '#5 Hitter', 6: '#6 Hitter', 7: '#7 Hitter', 8: '#8 Hitter', 9: '#9 Hitter'
            };
            
            // Get actual lineup hitter for this position
            const lineupHitter = getLineupHitterForPosition(posNum, opposingTeam);
            
            return (
              <div key={position} className={`position-card ${data.vulnerability_score > 15 ? 'high-vuln' : data.vulnerability_score > 10 ? 'med-vuln' : 'low-vuln'}`}>
                <div className="position-header">
                  <span className="position-number">#{posNum}</span>
                  <span className="position-name">{positionNames[posNum]}</span>
                  {lineupHitter && (
                    <div className="actual-hitter">
                      <span className="hitter-name">{lineupHitter.name}</span>
                      {lineupHitter.batting_avg && (
                        <span className="hitter-avg">.{lineupHitter.batting_avg}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="position-stats">
                  <div className="stat">
                    <span className="label">Vuln:</span>
                    <span className="value">{safeToFixed(data.vulnerability_score, 1)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">HR:</span>
                    <span className="value">{safeToFixed(data.hr_rate * 100, 1)}%</span>
                  </div>
                  <div className="stat">
                    <span className="label">Hit:</span>
                    <span className="value">{safeToFixed(data.hit_rate * 100, 1)}%</span>
                  </div>
                  <div className="stat">
                    <span className="label">AB:</span>
                    <span className="value">{data.sample_size}</span>
                  </div>
                  {lineupHitter && lineupHitter.status && (
                    <div className="hitter-status">
                      <span className={`status ${lineupHitter.status.toLowerCase()}`}>
                        {lineupHitter.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  const renderPatternRecognition = (patterns) => {
    if (!patterns || patterns.predictability_score === 0) {
      return <div className="no-data">No pattern recognition data available</div>;
    }

    return (
      <div className="pattern-recognition-section">
        <div className="predictability-header">
          <span className="label">Predictability Score:</span>
          <span className={`score ${(patterns.predictability_score || 0) > 70 ? 'high' : (patterns.predictability_score || 0) > 40 ? 'medium' : 'low'}`}>
            {safeToFixed(patterns.predictability_score, 1)}%
          </span>
          {patterns.confidence_score && (
            <span className={`confidence ${(patterns.confidence_score || 0) > 70 ? 'high' : (patterns.confidence_score || 0) > 40 ? 'medium' : 'low'}`}>
              Confidence: {safeToFixed(patterns.confidence_score, 1)}%
            </span>
          )}
          <span className="sequences-analyzed">({patterns.total_sequences_analyzed} sequences)</span>
        </div>
        
        {patterns.analysis_reliability && (
          <div className="analysis-reliability">
            <span className={`reliability ${patterns.analysis_reliability}`}>
              Analysis Reliability: {patterns.analysis_reliability.toUpperCase()}
            </span>
            {patterns.three_pitch_sequences > 0 && (
              <span className="sequence-breakdown">
                3+ pitch: {patterns.three_pitch_sequences}, 2-pitch: {patterns.two_pitch_sequences}
              </span>
            )}
          </div>
        )}
        
        {patterns.top_sequences && patterns.top_sequences.length > 0 && (
          <div className="top-sequences">
            <h5>Most Predictable Sequences:</h5>
            <div className="sequences-list">
              {patterns.top_sequences.map((seq, idx) => (
                <div key={idx} className={`sequence-item ${seq.sequence_type}`}>
                  <span className="sequence-pattern">{seq.sequence}</span>
                  <div className="sequence-stats">
                    <span className="frequency">{safeToFixed(seq.frequency * 100, 1)}% freq</span>
                    <span className="success">{safeToFixed(seq.success_rate * 100, 1)}% success</span>
                    <span className="count">({seq.count || 0} times)</span>
                    {seq.confidence_multiplier && (
                      <span className="confidence-mult">Conf: {safeToFixed(seq.confidence_multiplier, 1)}x</span>
                    )}
                    <span className={`sequence-type-badge ${seq.sequence_type}`}>
                      {seq.sequence_type}
                    </span>
                  </div>
                  {seq.inning_consistency !== undefined && (
                    <div className="consistency-indicators">
                      {seq.inning_consistency && <span className="consistency inning">Inning Consistent</span>}
                      {seq.count_consistency && <span className="consistency count">Count Specific</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTimingWindows = (windows) => {
    if (!windows || Object.keys(windows).length === 0) {
      return <div className="no-data">No timing window data available</div>;
    }

    return (
      <div className="timing-windows-grid">
        {Object.entries(windows).map(([range, data]) => (
          <div key={range} className={`timing-card ${(data.vulnerability_score || 0) > 20 ? 'high-vuln' : (data.vulnerability_score || 0) > 15 ? 'med-vuln' : 'low-vuln'}`}>
            <div className="timing-header">
              <span className="pitch-range">Pitches {range}</span>
              <span className="vulnerability">{safeToFixed(data.vulnerability_score, 1)}%</span>
            </div>
            <div className="timing-stats">
              <span className="hit-rate">Hit: {safeToFixed(data.hit_rate * 100, 1)}%</span>
              <span className="velocity">~{safeToFixed(data.average_velocity, 1)} mph</span>
              <span className="sample">({data.sample_size || 0} pitches)</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPitcherAnalysis = (pitcherData, pitcherName, side) => {
    if (!pitcherData || pitcherData.games_analyzed === 0) {
      return (
        <div className="pitcher-no-data">
          <h4>{pitcherName || 'Unknown Pitcher'}</h4>
          <p>No historical data available for this pitcher</p>
        </div>
      );
    }

    return (
      <div className="pitcher-analysis-section">
        <div className="pitcher-header">
          <h4>{pitcherData.pitcher_name || pitcherName}</h4>
          <div className="pitcher-meta">
            <span className="games-analyzed">{pitcherData.games_analyzed || 0} games analyzed</span>
            <span className="vulnerability-score">
              Overall Vulnerability: {pitcherData.overall_vulnerability_score ? pitcherData.overall_vulnerability_score.toFixed(1) : 'N/A'}
            </span>
            <span className="opposing-team">vs {pitcherData.opposing_team || 'Unknown'}</span>
          </div>
        </div>

        <div className="analysis-sections">
          <div className="analysis-category">
            <h5>⚡ Pitch Vulnerabilities</h5>
            {renderPitchVulnerabilities(pitcherData.pitch_vulnerabilities)}
          </div>

          <div className="analysis-category">
            <h5>🕐 Inning Patterns</h5>
            {renderInningPatterns(pitcherData.inning_patterns)}
          </div>

          <div className="analysis-category">
            <h5>🎯 Position Vulnerabilities</h5>
            {renderPositionVulnerabilities(pitcherData.position_vulnerabilities, pitcherData.opposing_team)}
          </div>

          <div className="analysis-category">
            <h5>🔍 Pattern Recognition</h5>
            {renderPatternRecognition(pitcherData.pattern_recognition)}
          </div>

          <div className="analysis-category">
            <h5>📊 Timing Windows (Pitch Count)</h5>
            {renderTimingWindows(pitcherData.timing_windows)}
          </div>

          {pitcherData.recent_form && (
            <div className="analysis-category">
              <h5>📈 Recent Form</h5>
              <div className="recent-form">
                <span className={`trend ${pitcherData.recent_form.trend || 'unknown'}`}>
                  Trend: {pitcherData.recent_form.trend || 'Unknown'}
                </span>
                <span>
                  HR/Game: {pitcherData.recent_form.hr_rate_per_game ? pitcherData.recent_form.hr_rate_per_game.toFixed(2) : 'N/A'}
                </span>
                <span>
                  Hit Rate: {pitcherData.recent_form.hit_rate ? (pitcherData.recent_form.hit_rate * 100).toFixed(1) : 'N/A'}%
                </span>
                <span>Games: {pitcherData.recent_form.games_analyzed || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="comprehensive-analysis-display">
      <div className="analysis-header">
        <div className="header-main">
          <h2>📊 Comprehensive Weakspot Analysis Results</h2>
          {allMatchups.length > 1 && (
            <div className="matchup-selector">
              <label>Select Matchup:</label>
              <select 
                value={selectedMatchupIndex} 
                onChange={(e) => setSelectedMatchupIndex(parseInt(e.target.value))}
                className="matchup-dropdown"
              >
                {allMatchups.map((matchupData, index) => {
                  const m = matchupData.matchup;
                  return (
                    <option key={index} value={index}>
                      {m ? `${m.away_team} @ ${m.home_team}` : `Matchup ${index + 1}`}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
        {matchup && (
          <div className="matchup-info">
            <span className="teams">{matchup.away_team} @ {matchup.home_team}</span>
            <span className="venue">{matchup.venue}</span>
            <span className="date">{matchup.date}</span>
            {allMatchups.length > 1 && (
              <span className="matchup-counter">Matchup {selectedMatchupIndex + 1} of {allMatchups.length}</span>
            )}
          </div>
        )}
      </div>

      {/* Away Pitcher Analysis */}
      <div className="analysis-section">
        <div className="section-header" onClick={() => toggleSection('away')}>
          <h3>⚾ Away Pitcher Analysis</h3>
          <span className="toggle-icon">{expandedSections.away ? '▼' : '▶'}</span>
        </div>
        {expandedSections.away && (
          <div className="section-content">
            {renderPitcherAnalysis(away_pitcher_analysis, matchup?.away_pitcher, 'away')}
          </div>
        )}
      </div>

      {/* Home Pitcher Analysis */}
      <div className="analysis-section">
        <div className="section-header" onClick={() => toggleSection('home')}>
          <h3>🏠 Home Pitcher Analysis</h3>
          <span className="toggle-icon">{expandedSections.home ? '▼' : '▶'}</span>
        </div>
        {expandedSections.home && (
          <div className="section-content">
            {renderPitcherAnalysis(home_pitcher_analysis, matchup?.home_pitcher, 'home')}
          </div>
        )}
      </div>

      {/* Optimal Pitch-Type Matchups */}
      {optimalMatchups[selectedMatchupIndex] && (
        <div className="analysis-section">
          <div className="section-header" onClick={() => toggleSection('optimal')}>
            <h3>⚡ Optimal Hitter vs Pitch Matchups</h3>
            <span className="toggle-icon">{expandedSections.optimal ? '▼' : '▶'}</span>
          </div>
          {expandedSections.optimal && (
            <div className="section-content">
              <div className="optimal-matchups-container">
                <div className="away-matchups">
                  <h4>🏃 Away Pitcher Vulnerabilities</h4>
                  {renderOptimalMatchups(
                    optimalMatchups[selectedMatchupIndex]?.away_pitcher_matchups,
                    matchup?.away_pitcher
                  )}
                </div>
                
                <div className="home-matchups">
                  <h4>🏠 Home Pitcher Vulnerabilities</h4>
                  {renderOptimalMatchups(
                    optimalMatchups[selectedMatchupIndex]?.home_pitcher_matchups,
                    matchup?.home_pitcher
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overall Matchup Assessment */}
      {overall_matchup_assessment && (
        <div className="analysis-section">
          <div className="section-header" onClick={() => toggleSection('overall')}>
            <h3>🎯 Overall Matchup Assessment</h3>
            <span className="toggle-icon">{expandedSections.overall ? '▼' : '▶'}</span>
          </div>
          {expandedSections.overall && (
            <div className="section-content">
              <div className="overall-assessment">
                <div className="assessment-header">
                  <span className={`advantage ${overall_matchup_assessment.advantage_type}`}>
                    {overall_matchup_assessment.advantage} Advantage ({overall_matchup_assessment.advantage_type})
                  </span>
                  <span className="vulnerable-pitcher">
                    Vulnerable Pitcher: {overall_matchup_assessment.vulnerable_pitcher || 'None'}
                  </span>
                </div>
                
                <div className="vulnerability-comparison">
                  <div className="pitcher-vuln">
                    <span className="label">Away Pitcher:</span>
                    <span className="value">
                      {overall_matchup_assessment.away_pitcher_vulnerability ? 
                        overall_matchup_assessment.away_pitcher_vulnerability.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="pitcher-vuln">
                    <span className="label">Home Pitcher:</span>
                    <span className="value">
                      {overall_matchup_assessment.home_pitcher_vulnerability ? 
                        overall_matchup_assessment.home_pitcher_vulnerability.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="pitcher-vuln">
                    <span className="label">Difference:</span>
                    <span className="value">
                      {overall_matchup_assessment.vulnerability_difference ? 
                        overall_matchup_assessment.vulnerability_difference.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                </div>

                {overall_matchup_assessment.key_patterns && overall_matchup_assessment.key_patterns.length > 0 && (
                  <div className="key-patterns">
                    <h5>Key Patterns Identified:</h5>
                    <ul>
                      {overall_matchup_assessment.key_patterns.map((pattern, idx) => (
                        <li key={idx}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {overall_matchup_assessment.recommended_strategy && (
                  <div className="recommended-strategy">
                    <h5>Recommended Strategy:</h5>
                    <p>{overall_matchup_assessment.recommended_strategy}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComprehensiveAnalysisDisplay;