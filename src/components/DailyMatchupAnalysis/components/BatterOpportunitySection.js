import React, { useState, useEffect, useCallback } from 'react';
import { useBaseballAnalysis } from '../../../services/baseballAnalysisService';
import { 
  formatPercentage, 
  formatNumber, 
  formatABSinceHR,
  getHRScoreClass,
  normalizePercentage
} from '../utils/dataFormatting';
import { generateOpportunityReasoning, formatReasoningForDisplay } from '../services/reasoningGenerator';
import './BatterOpportunitySection.css';

const BatterOpportunitySection = ({ analysis, matchups, loading, enhanced }) => {
  const [batterOpportunities, setBatterOpportunities] = useState([]);
  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const [expandedBatter, setExpandedBatter] = useState(null);
  const [sortBy, setSortBy] = useState('hr_score');
  const [filterBy, setFilterBy] = useState('all');

  const { 
    initialized, 
    loading: apiLoading, 
    analyzePitcherVsTeam,
    service
  } = useBaseballAnalysis();

  // Generate comprehensive batter analysis using BaseballAPI
  const generateBatterAnalysis = useCallback(async () => {
    if (!matchups || matchups.length === 0 || !initialized) return;

    setOpportunityLoading(true);
    
    try {
      const allBatterOpportunities = [];
      
      for (const matchup of matchups) {
        if (matchup.awayPitcher && matchup.awayPitcher !== 'TBD') {
          // Analyze home team batters vs away pitcher using BaseballAPI
          try {
            const homeTeamAnalysis = await analyzePitcherVsTeam({
              pitcherName: matchup.awayPitcher,
              teamAbbr: matchup.homeTeam,
              sortBy: 'hr_score',
              limit: 20,
              includeDashboardContext: true
            });

            if (homeTeamAnalysis?.predictions) {
              homeTeamAnalysis.predictions.forEach(prediction => {
                allBatterOpportunities.push({
                  ...prediction,
                  pitcher: matchup.awayPitcher,
                  pitcherTeam: matchup.awayTeam,
                  batterTeam: matchup.homeTeam,
                  gameId: matchup.gameId,
                  venue: matchup.venue,
                  gameTime: matchup.gameTime,
                  matchupType: 'vs_away_pitcher'
                });
              });
            }
          } catch (error) {
            console.warn(`Failed to analyze ${matchup.homeTeam} vs ${matchup.awayPitcher}:`, error);
          }
        }

        if (matchup.homePitcher && matchup.homePitcher !== 'TBD') {
          // Analyze away team batters vs home pitcher using BaseballAPI
          try {
            const awayTeamAnalysis = await analyzePitcherVsTeam({
              pitcherName: matchup.homePitcher,
              teamAbbr: matchup.awayTeam,
              sortBy: 'hr_score',
              limit: 20,
              includeDashboardContext: true
            });

            if (awayTeamAnalysis?.predictions) {
              awayTeamAnalysis.predictions.forEach(prediction => {
                allBatterOpportunities.push({
                  ...prediction,
                  pitcher: matchup.homePitcher,
                  pitcherTeam: matchup.homeTeam,
                  batterTeam: matchup.awayTeam,
                  gameId: matchup.gameId,
                  venue: matchup.venue,
                  gameTime: matchup.gameTime,
                  matchupType: 'vs_home_pitcher'
                });
              });
            }
          } catch (error) {
            console.warn(`Failed to analyze ${matchup.awayTeam} vs ${matchup.homePitcher}:`, error);
          }
        }
      }

      console.log(`✅ Generated ${allBatterOpportunities.length} batter opportunities using BaseballAPI`);
      setBatterOpportunities(allBatterOpportunities);
    } catch (error) {
      console.error('Error generating batter analysis:', error);
      setBatterOpportunities([]);
    } finally {
      setOpportunityLoading(false);
    }
  }, [matchups, initialized, analyzePitcherVsTeam]);

  // Generate analysis when component mounts or matchups change
  useEffect(() => {
    if (!loading && matchups?.length > 0 && initialized) {
      generateBatterAnalysis();
    }
  }, [loading, matchups, initialized, generateBatterAnalysis]);

  // Filter opportunities
  const filteredOpportunities = batterOpportunities.filter(opp => {
    if (filterBy === 'all') return true;
    if (filterBy === 'high_hr') return (opp.hr_score || 0) >= 75;
    if (filterBy === 'high_hit') return (opp.hit_probability || 0) >= 25;
    if (filterBy === 'top_confidence') return (opp.confidence || 1.0) >= 0.8;
    if (filterBy === 'power_hitters') return (opp.recent_hr || 0) >= 2;
    return true;
  });

  // Sort opportunities
  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    switch (sortBy) {
      case 'hr_score':
        return (b.hr_score || 0) - (a.hr_score || 0);
      case 'hit_probability':
        return (b.hit_probability || 0) - (a.hit_probability || 0);
      case 'confidence':
        return (b.confidence || 0) - (a.confidence || 0);
      case 'player_name':
        return (a.player_name || '').localeCompare(b.player_name || '');
      default:
        return 0;
    }
  });

  // HR Score class function moved to utils/dataFormatting.js

  const getOpportunityIcon = (opportunity) => {
    const hrScore = opportunity.hr_score || 0;
    const hitProb = opportunity.hit_probability || 0;
    
    if (hrScore >= 75) return '⚡';
    if (hitProb >= 25) return '🎯';
    if (hrScore >= 60) return '🔥';
    return '📈';
  };

  const getOpportunityType = (opportunity) => {
    const hrScore = opportunity.hr_score || 0;
    const hitProb = opportunity.hit_probability || 0;
    
    if (hrScore >= 75) return 'Power Play Target';
    if (hitProb >= 25) return 'High Hit Probability';
    if (hrScore >= 60) return 'HR Candidate';
    return 'Contact Opportunity';
  };

  // Formatting functions moved to utils/dataFormatting.js for consistency

  const toggleExpanded = (index) => {
    setExpandedBatter(expandedBatter === index ? null : index);
  };

  if (loading || opportunityLoading) {
    return (
      <div className="batter-opportunity-section loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3>Analyzing Batter Opportunities...</h3>
          <p>Generating comprehensive pitcher vs batter matchup analysis</p>
        </div>
      </div>
    );
  }

  if (!batterOpportunities || batterOpportunities.length === 0) {
    return (
      <div className="batter-opportunity-section empty">
        <div className="empty-content">
          <span className="empty-icon">🏏</span>
          <h3>No Batter Opportunities</h3>
          <p>Unable to generate batter analysis. Ensure games are selected and Baseball API is connected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="batter-opportunity-section">
      <div className="section-header">
        <div className="section-title">
          <h2>Batter Opportunities Analysis</h2>
          {enhanced && (
            <span className="enhanced-badge">
              ✨ Enhanced with Baseball API
            </span>
          )}
        </div>
        <div className="section-summary">
          <div className="opportunity-stats">
            <div className="stat">
              <span className="stat-value">{batterOpportunities.length}</span>
              <span className="stat-label">Total Batters</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {batterOpportunities.filter(b => (b.hr_score || 0) >= 75).length}
              </span>
              <span className="stat-label">Power Targets</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {batterOpportunities.filter(b => (b.hit_probability || 0) >= 25).length}
              </span>
              <span className="stat-label">Hit Opportunities</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {formatNumber(
                  batterOpportunities.reduce((sum, b) => sum + (b.confidence || 0), 0) / 
                  batterOpportunities.length * 100
                )}%
              </span>
              <span className="stat-label">Avg Confidence</span>
            </div>
          </div>
        </div>
      </div>

      <div className="opportunity-controls">
        <div className="control-group">
          <label>Filter by:</label>
          <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
            <option value="all">All Opportunities</option>
            <option value="high_hr">High HR Score (75+)</option>
            <option value="high_hit">High Hit Probability (25%+)</option>
            <option value="top_confidence">Top Confidence (80%+)</option>
            <option value="power_hitters">Power Hitters (2+ Recent HR)</option>
          </select>
        </div>
        <div className="control-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="hr_score">HR Score</option>
            <option value="hit_probability">Hit Probability</option>
            <option value="confidence">Confidence</option>
            <option value="player_name">Player Name</option>
          </select>
        </div>
        <div className="opportunity-count">
          Showing {sortedOpportunities.length} of {batterOpportunities.length} opportunities
        </div>
      </div>

      <div className="opportunities-grid">
        {sortedOpportunities.map((opportunity, index) => (
          <div 
            key={`${opportunity.player_name}-${opportunity.pitcher}-${index}`}
            className={`batter-opportunity-card ${getHRScoreClass(opportunity.hr_score)}`}
          >
            <div className="opportunity-header" onClick={() => toggleExpanded(index)}>
              <div className="opportunity-main">
                <div className="opportunity-type">
                  <span className="type-icon">{getOpportunityIcon(opportunity)}</span>
                  <span className="type-label">{getOpportunityType(opportunity)}</span>
                </div>
                <div className="batter-matchup">
                  <div className="batter-info">
                    <span className="batter-name">{opportunity.player_name}</span>
                    <span className="batter-team">({opportunity.batterTeam})</span>
                  </div>
                  <div className="vs-indicator">vs</div>
                  <div className="pitcher-info">
                    <span className="pitcher-name">{opportunity.pitcher}</span>
                    <span className="pitcher-team">({opportunity.pitcherTeam})</span>
                  </div>
                </div>
                <div className="opportunity-metrics">
                  <div className="metric">
                    <span className="metric-value">{formatNumber(opportunity.hr_score)}</span>
                    <span className="metric-label">HR Score</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{formatPercentage(opportunity.hit_probability)}</span>
                    <span className="metric-label">Hit Prob</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{formatPercentage(opportunity.confidence)}</span>
                    <span className="metric-label">Confidence</span>
                  </div>
                </div>
              </div>
              <div className="expand-indicator">
                {expandedBatter === index ? '▲' : '▼'}
              </div>
            </div>

            {expandedBatter === index && (
              <div className="opportunity-details">
                <div className="details-grid">
                  <div className="detail-section">
                    <h4>Performance Metrics</h4>
                    <div className="detail-items">
                      {opportunity.recent_avg && (
                        <div className="detail-item">
                          <span className="detail-label">Recent Average:</span>
                          <span className="detail-value">{formatNumber(opportunity.recent_avg, 3)}</span>
                        </div>
                      )}
                      {opportunity.recent_hr !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">Recent HR:</span>
                          <span className="detail-value">{opportunity.recent_hr}</span>
                        </div>
                      )}
                      {opportunity.ab_since_last_hr !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">AB Since HR:</span>
                          <span className="detail-value">{formatABSinceHR(opportunity.ab_since_last_hr, opportunity.player_stats)}</span>
                        </div>
                      )}
                      {opportunity.expected_ab_per_hr && (
                        <div className="detail-item">
                          <span className="detail-label">Expected AB/HR:</span>
                          <span className="detail-value">{formatNumber(opportunity.expected_ab_per_hr, 1)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Scoring Breakdown</h4>
                    <div className="detail-items">
                      {opportunity.arsenal_matchup !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">Arsenal Matchup:</span>
                          <span className="detail-value">{formatNumber(opportunity.arsenal_matchup)}</span>
                        </div>
                      )}
                      {opportunity.contextual !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">Contextual Factors:</span>
                          <span className="detail-value">{formatNumber(opportunity.contextual)}</span>
                        </div>
                      )}
                      {opportunity.batter_overall !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">Batter Overall:</span>
                          <span className="detail-value">{formatNumber(opportunity.batter_overall)}</span>
                        </div>
                      )}
                      {opportunity.recent_daily_games !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">Recent Form:</span>
                          <span className="detail-value">{formatNumber(opportunity.recent_daily_games)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Strategic Context</h4>
                    <div className="detail-items">
                      <div className="detail-item">
                        <span className="detail-label">Game Venue:</span>
                        <span className="detail-value">{opportunity.venue || 'TBD'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Matchup Type:</span>
                        <span className="detail-value">
                          {opportunity.matchupType === 'vs_away_pitcher' ? 'Home vs Away P' : 'Away vs Home P'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Data Quality:</span>
                        <span className="detail-value">
                          {opportunity.data_source === 'pitcher_specific' ? 'High' : 'Moderate'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {opportunity.explanation && (
                  <div className="explanation-section">
                    <h4>Analysis Explanation</h4>
                    <p className="explanation-text">{opportunity.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BatterOpportunitySection;