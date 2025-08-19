import React from 'react';
import './ArsenalBettingInsights.css';

const ArsenalBettingInsights = ({ arsenalAnalysis, player, pitcher }) => {
  if (!arsenalAnalysis || !arsenalAnalysis.pitch_matchups) {
    return null;
  }

  const { pitch_matchups, overall_summary_metrics, confidence, data_source } = arsenalAnalysis;
  
  // Calculate key betting metrics
  const hitterAdvantage = overall_summary_metrics.hitter_avg_slg - overall_summary_metrics.pitcher_avg_slg;
  const wobaAdvantage = overall_summary_metrics.hitter_avg_woba - overall_summary_metrics.pitcher_avg_woba;
  const hardHitAdvantage = overall_summary_metrics.hitter_avg_hard_hit_percent - overall_summary_metrics.pitcher_avg_hard_hit_percent;
  
  // Find the most favorable pitch matchups (for power)
  const powerMatchups = pitch_matchups
    .filter(p => p.usage >= 10) // Only significant pitches
    .map(p => ({
      ...p,
      slugAdvantage: (p.current_year_stats.hitter_slg || 0) - (p.current_year_stats.pitcher_slg || 0),
      hardHitAdvantage: (p.current_year_stats.hitter_hard_hit_percent || 0) - (p.current_year_stats.pitcher_hard_hit_percent || 0)
    }))
    .sort((a, b) => b.slugAdvantage - a.slugAdvantage);

  // Find contact/hit opportunities  
  const contactMatchups = pitch_matchups
    .filter(p => p.usage >= 10)
    .map(p => ({
      ...p,
      baAdvantage: (p.current_year_stats.hitter_ba || 0) - (p.current_year_stats.pitcher_ba || 0),
      kRateAdvantage: (p.current_year_stats.pitcher_k_percent || 0) - (p.current_year_stats.hitter_k_percent || 0)
    }))
    .sort((a, b) => b.baAdvantage - a.baAdvantage);

  // Calculate usage-weighted exposure to favorable pitches
  const favorablePitchUsage = powerMatchups
    .filter(p => p.slugAdvantage > 0.025)
    .reduce((sum, p) => sum + p.usage, 0);

  const unfavorablePitchUsage = powerMatchups
    .filter(p => p.slugAdvantage < -0.025)
    .reduce((sum, p) => sum + p.usage, 0);

  // Generate betting recommendations
  const getBettingRecommendation = () => {
    const recommendations = [];
    
    // Home Run Props
    if (hitterAdvantage > 0.075 && hardHitAdvantage > 0.1 && favorablePitchUsage > 40) {
      recommendations.push({
        type: 'HR',
        strength: 'STRONG',
        reason: `Excellent power matchup with ${(hitterAdvantage * 1000).toFixed(0)}-point SLG edge and ${favorablePitchUsage.toFixed(0)}% exposure to favorable pitches`
      });
    } else if (hitterAdvantage > 0.025 && favorablePitchUsage > 30) {
      recommendations.push({
        type: 'HR',
        strength: 'MODERATE',
        reason: `Decent power setup with ${(hitterAdvantage * 1000).toFixed(0)}-point advantage and ${favorablePitchUsage.toFixed(0)}% favorable pitch exposure`
      });
    }
    
    // Hit Props
    const bestContactPitch = contactMatchups[0];
    if (bestContactPitch && bestContactPitch.baAdvantage > 0.05 && bestContactPitch.usage > 20) {
      recommendations.push({
        type: 'HIT',
        strength: wobaAdvantage > 0.04 ? 'STRONG' : 'MODERATE',
        reason: `Strong contact vs ${bestContactPitch.pitch_name} (${bestContactPitch.usage.toFixed(0)}% usage) with ${(bestContactPitch.baAdvantage * 1000).toFixed(0)}-point BA edge`
      });
    }
    
    // Total Bases Props
    if (hitterAdvantage > 0.05 && wobaAdvantage > 0.03) {
      recommendations.push({
        type: 'TOTAL_BASES',
        strength: 'MODERATE',
        reason: `Well-rounded offensive matchup with advantages in both power and contact`
      });
    }
    
    // Risk Warnings
    if (unfavorablePitchUsage > 50 || hitterAdvantage < -0.05) {
      recommendations.push({
        type: 'AVOID',
        strength: 'CAUTION',
        reason: `${unfavorablePitchUsage.toFixed(0)}% exposure to disadvantageous pitches - proceed with caution`
      });
    }
    
    return recommendations;
  };

  const recommendations = getBettingRecommendation();
  
  const getStrengthColor = (strength) => {
    switch(strength) {
      case 'STRONG': return '#28a745';
      case 'MODERATE': return '#007bff';
      case 'CAUTION': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStrengthIcon = (strength) => {
    switch(strength) {
      case 'STRONG': return '🎯';
      case 'MODERATE': return '👍';
      case 'CAUTION': return '⚠️';
      default: return '📊';
    }
  };

  return (
    <div className="arsenal-betting-insights">
      <div className="insights-header">
        <h5>💰 Betting Insights from Arsenal Analysis</h5>
        <div className="confidence-indicator">
          {Math.round(confidence * 100)}% Confidence ({data_source.replace('_', ' ')})
        </div>
      </div>

      <div className="key-metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Power Edge</span>
          <span className={`metric-value ${hitterAdvantage > 0.025 ? 'positive' : hitterAdvantage < -0.025 ? 'negative' : 'neutral'}`}>
            {hitterAdvantage > 0 ? '+' : ''}{(hitterAdvantage * 1000).toFixed(0)}
          </span>
          <span className="metric-unit">SLG pts</span>
        </div>
        
        <div className="metric-card">
          <span className="metric-label">Contact Edge</span>
          <span className={`metric-value ${wobaAdvantage > 0.02 ? 'positive' : wobaAdvantage < -0.02 ? 'negative' : 'neutral'}`}>
            {wobaAdvantage > 0 ? '+' : ''}{(wobaAdvantage * 1000).toFixed(0)}
          </span>
          <span className="metric-unit">wOBA pts</span>
        </div>
        
        <div className="metric-card">
          <span className="metric-label">Favorable Exposure</span>
          <span className={`metric-value ${favorablePitchUsage > 40 ? 'positive' : favorablePitchUsage < 20 ? 'negative' : 'neutral'}`}>
            {favorablePitchUsage.toFixed(0)}%
          </span>
          <span className="metric-unit">of arsenal</span>
        </div>
        
        <div className="metric-card">
          <span className="metric-label">Hard Hit Edge</span>
          <span className={`metric-value ${hardHitAdvantage > 0.05 ? 'positive' : hardHitAdvantage < -0.05 ? 'negative' : 'neutral'}`}>
            {hardHitAdvantage > 0 ? '+' : ''}{(hardHitAdvantage * 100).toFixed(1)}%
          </span>
          <span className="metric-unit">hard hit</span>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="betting-recommendations">
          <h6>📋 Prop Bet Recommendations</h6>
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div 
                key={index} 
                className={`recommendation-item ${rec.type.toLowerCase()}`}
              >
                <div className="rec-header">
                  <span className="rec-icon">{getStrengthIcon(rec.strength)}</span>
                  <span 
                    className="rec-type"
                    style={{ color: getStrengthColor(rec.strength) }}
                  >
                    {rec.type} - {rec.strength}
                  </span>
                </div>
                <p className="rec-reason">{rec.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pitch-exposure-chart">
        <h6>🎯 Pitch Exposure Breakdown</h6>
        <div className="exposure-bars">
          {powerMatchups.slice(0, 4).map((pitch, index) => {
            const advantage = pitch.slugAdvantage;
            const isPositive = advantage > 0.025;
            const isNeutral = Math.abs(advantage) <= 0.025;
            
            return (
              <div key={index} className="exposure-bar">
                <div className="pitch-info">
                  <span className="pitch-name">{pitch.pitch_name}</span>
                  <span className="usage-percent">{pitch.usage.toFixed(0)}%</span>
                </div>
                <div className="advantage-bar">
                  <div 
                    className={`bar-fill ${isPositive ? 'positive' : isNeutral ? 'neutral' : 'negative'}`}
                    style={{ 
                      width: `${Math.min(100, Math.abs(advantage) * 500)}%`,
                      minWidth: '20px'
                    }}
                  >
                    <span className="bar-label">
                      {advantage > 0 ? '+' : ''}{(advantage * 1000).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="betting-context">
        <div className="context-item">
          <strong>Best Matchup:</strong> {powerMatchups[0]?.pitch_name} ({powerMatchups[0]?.usage.toFixed(0)}% usage)
        </div>
        <div className="context-item">
          <strong>Biggest Risk:</strong> {powerMatchups[powerMatchups.length - 1]?.pitch_name} ({powerMatchups[powerMatchups.length - 1]?.usage.toFixed(0)}% usage)
        </div>
        <div className="context-item">
          <strong>Overall Expectation:</strong> {hitterAdvantage > 0.05 ? 'Above average offensive production expected' : hitterAdvantage < -0.05 ? 'Below average production likely' : 'Average production expected'}
        </div>
      </div>
    </div>
  );
};

export default ArsenalBettingInsights;