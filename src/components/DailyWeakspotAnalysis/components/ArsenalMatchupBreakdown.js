import React, { useState } from 'react';
import './ArsenalMatchupBreakdown.css';

const ArsenalMatchupBreakdown = ({ arsenalAnalysis, playerName, pitcherName }) => {
  const [expandedPitch, setExpandedPitch] = useState(null);

  if (!arsenalAnalysis || !arsenalAnalysis.pitch_matchups) {
    return (
      <div className="arsenal-breakdown-placeholder">
        <p>Arsenal matchup analysis available.</p>
      </div>
    );
  }

  const { pitch_matchups, overall_summary_metrics, confidence, data_source } = arsenalAnalysis;
  
  // Calculate overall advantage
  const hitterAdvantage = overall_summary_metrics.hitter_avg_slg - overall_summary_metrics.pitcher_avg_slg;
  const hitterWobaAdvantage = overall_summary_metrics.hitter_avg_woba - overall_summary_metrics.pitcher_avg_woba;
  
  const getAdvantageColor = (advantage) => {
    if (advantage > 0.100) return '#28a745'; // Strong advantage - Green
    if (advantage > 0.050) return '#007bff'; // Moderate advantage - Blue  
    if (advantage > 0) return '#ffc107'; // Slight advantage - Yellow
    if (advantage > -0.050) return '#fd7e14'; // Slight disadvantage - Orange
    return '#dc3545'; // Disadvantage - Red
  };

  const getAdvantageLabel = (advantage) => {
    if (advantage > 0.100) return 'STRONG ADVANTAGE';
    if (advantage > 0.050) return 'MODERATE ADVANTAGE';
    if (advantage > 0) return 'SLIGHT ADVANTAGE';
    if (advantage > -0.050) return 'SLIGHT DISADVANTAGE';
    return 'DISADVANTAGE';
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 0.8) return '#28a745';
    if (conf >= 0.6) return '#007bff';
    if (conf >= 0.4) return '#ffc107';
    return '#fd7e14';
  };

  const getDataSourceLabel = (source) => {
    switch(source) {
      case 'pitcher_specific': return 'Full Pitcher Data';
      case 'pitcher_partial': return 'Partial Pitcher Data';
      case 'team_based': return 'Team-Based Estimate';
      case 'league_average': return 'League Average';
      default: return 'Data Source Unknown';
    }
  };

  return (
    <div className="arsenal-matchup-breakdown">
      <div className="arsenal-header">
        <div className="matchup-title">
          <h4>🎯 Arsenal Matchup Analysis</h4>
          <div className="data-quality-indicator">
            <span 
              className="confidence-badge" 
              style={{ backgroundColor: getConfidenceColor(confidence) }}
            >
              {Math.round(confidence * 100)}% Confidence
            </span>
            <span className="data-source">{getDataSourceLabel(data_source)}</span>
          </div>
        </div>

        <div className="overall-advantage">
          <div className="advantage-metric">
            <span className="metric-label">SLG Advantage:</span>
            <span 
              className="advantage-value"
              style={{ color: getAdvantageColor(hitterAdvantage) }}
            >
              {hitterAdvantage > 0 ? '+' : ''}{hitterAdvantage.toFixed(3)} {getAdvantageLabel(hitterAdvantage)}
            </span>
          </div>
          <div className="advantage-metric">
            <span className="metric-label">wOBA Advantage:</span>
            <span 
              className="advantage-value"
              style={{ color: getAdvantageColor(hitterWobaAdvantage) }}
            >
              {hitterWobaAdvantage > 0 ? '+' : ''}{hitterWobaAdvantage.toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      <div className="pitch-breakdown">
        <h5>📊 Pitch-by-Pitch Breakdown</h5>
        <div className="pitch-cards">
          {pitch_matchups.map((pitch, index) => {
            const isExpanded = expandedPitch === index;
            const { current_year_stats } = pitch;
            
            // Calculate key advantages for this pitch type
            const sluggingAdvantage = current_year_stats.hitter_slg - current_year_stats.pitcher_slg;
            const wobaAdvantage = current_year_stats.hitter_woba - current_year_stats.pitcher_woba;
            const isSignificantPitch = pitch.usage >= 15; // 15%+ usage is significant

            return (
              <div 
                key={index} 
                className={`pitch-card ${isSignificantPitch ? 'significant-pitch' : ''} ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setExpandedPitch(isExpanded ? null : index)}
              >
                <div className="pitch-header">
                  <div className="pitch-info">
                    <span className="pitch-type">{pitch.pitch_type}</span>
                    <span className="pitch-name">{pitch.pitch_name}</span>
                    <span className="usage-badge">{pitch.usage.toFixed(1)}%</span>
                  </div>
                  
                  <div className="quick-metrics">
                    <div className="quick-metric">
                      <span className="label">SLG Δ:</span>
                      <span 
                        className={`value ${sluggingAdvantage > 0.050 ? 'advantage' : sluggingAdvantage < -0.050 ? 'disadvantage' : 'neutral'}`}
                      >
                        {sluggingAdvantage > 0 ? '+' : ''}{sluggingAdvantage.toFixed(3)}
                      </span>
                    </div>
                    <div className="expand-indicator">
                      {isExpanded ? '▲' : '▼'}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pitch-details">
                    <div className="hitter-vs-pitcher">
                      <div className="comparison-section">
                        <h6>🏏 {playerName} vs {pitch.pitch_name}</h6>
                        <div className="stat-grid">
                          <div className="stat-item">
                            <span className="stat-label">BA:</span>
                            <span className="stat-value">{current_year_stats.hitter_ba?.toFixed(3) || 'N/A'}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">SLG:</span>
                            <span className="stat-value">{current_year_stats.hitter_slg?.toFixed(3) || 'N/A'}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">wOBA:</span>
                            <span className="stat-value">{current_year_stats.hitter_woba?.toFixed(3) || 'N/A'}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Hard Hit%:</span>
                            <span className="stat-value">{current_year_stats.hitter_hard_hit_percent ? (current_year_stats.hitter_hard_hit_percent * 100).toFixed(1) + '%' : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="comparison-section">
                        <h6>⚾ {pitcherName}'s {pitch.pitch_name}</h6>
                        <div className="stat-grid">
                          <div className="stat-item">
                            <span className="stat-label">BA Against:</span>
                            <span className="stat-value">{current_year_stats.pitcher_ba?.toFixed(3) || 'N/A'}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">SLG Against:</span>
                            <span className="stat-value">{current_year_stats.pitcher_slg?.toFixed(3) || 'N/A'}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">wOBA Against:</span>
                            <span className="stat-value">{current_year_stats.pitcher_woba?.toFixed(3) || 'N/A'}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">K Rate:</span>
                            <span className="stat-value">{current_year_stats.pitcher_k_percent ? (current_year_stats.pitcher_k_percent * 100).toFixed(1) + '%' : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="matchup-insight">
                      <div className="insight-box">
                        <h6>🔍 Key Insight</h6>
                        <p>
                          {getMatchupInsight(pitch, sluggingAdvantage, wobaAdvantage, isSignificantPitch)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="arsenal-summary">
        <div className="summary-insight">
          <h6>💡 Arsenal Summary</h6>
          <p>{generateArsenalSummary(overall_summary_metrics, pitch_matchups, confidence, data_source)}</p>
        </div>
      </div>
    </div>
  );
};

// Helper function to generate pitch-specific insights
const getMatchupInsight = (pitch, sluggingAdvantage, wobaAdvantage, isSignificantPitch) => {
  const usage = pitch.usage;
  const pitchName = pitch.pitch_name;
  
  if (sluggingAdvantage > 0.100) {
    return `EXCELLENT matchup! ${pitchName} represents ${usage.toFixed(1)}% of pitcher's arsenal and batter shows strong power (.${Math.abs(sluggingAdvantage * 1000).toFixed(0)} SLG advantage).`;
  } else if (sluggingAdvantage > 0.050) {
    return `Good matchup vs ${pitchName}. ${isSignificantPitch ? 'Significant' : 'Minor'} part of arsenal (${usage.toFixed(1)}%) with moderate power advantage.`;
  } else if (sluggingAdvantage > 0) {
    return `Slight edge vs ${pitchName}. Small advantage (.${Math.abs(sluggingAdvantage * 1000).toFixed(0)} SLG) on ${usage.toFixed(1)}% of pitches.`;
  } else if (sluggingAdvantage > -0.050) {
    return `Neutral matchup vs ${pitchName}. ${isSignificantPitch ? 'Monitor this pitch closely' : 'Minor concern'} - used ${usage.toFixed(1)}% of the time.`;
  } else {
    return `AVOID signal for ${pitchName}! Pitcher has significant advantage (.${Math.abs(sluggingAdvantage * 1000).toFixed(0)} SLG) on ${usage.toFixed(1)}% of arsenal.`;
  }
};

// Helper function to generate overall arsenal summary
const generateArsenalSummary = (summary, pitches, confidence, dataSource) => {
  const hitterSlg = summary.hitter_avg_slg;
  const pitcherSlg = summary.pitcher_avg_slg;
  const advantage = hitterSlg - pitcherSlg;
  
  const significantPitches = pitches.filter(p => p.usage >= 15).length;
  const totalPitches = pitches.length;
  
  let summaryText = '';
  
  if (advantage > 0.075) {
    summaryText = `🟢 STRONG ARSENAL ADVANTAGE: ${(advantage * 1000).toFixed(0)}-point SLG edge across ${totalPitches} pitch types. `;
  } else if (advantage > 0.025) {
    summaryText = `🟡 MODERATE ARSENAL EDGE: ${(advantage * 1000).toFixed(0)}-point advantage with good matchup potential. `;
  } else if (advantage > 0) {
    summaryText = `🟡 SLIGHT ARSENAL EDGE: Small ${(advantage * 1000).toFixed(0)}-point advantage, execution dependent. `;
  } else {
    summaryText = `🔴 ARSENAL DISADVANTAGE: ${Math.abs(advantage * 1000).toFixed(0)}-point deficit suggests difficult matchup. `;
  }
  
  if (confidence < 0.5) {
    summaryText += `⚠️ Limited data available (${dataSource.replace('_', ' ')}), use caution.`;
  } else if (significantPitches >= 3) {
    summaryText += `✅ Analysis covers ${significantPitches} primary pitches with high confidence.`;
  }
  
  return summaryText;
};

export default ArsenalMatchupBreakdown;