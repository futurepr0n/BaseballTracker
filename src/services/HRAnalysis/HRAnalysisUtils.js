/**
 * Utility functions for HR Analysis
 * src/services/HRAnalysis/HRAnalysisUtils.js
 */

/**
 * Get total plate appearances with proper weighting
 */
export function getPAWeightedTotal(records, paField, minPaForInclusion = 1) {
  let totalPA = 0;
  
  records.forEach(record => {
    const pa = parseInt(record[paField], 10);
    if (!isNaN(pa) && pa >= minPaForInclusion) {
      totalPA += pa;
    }
  });
  
  return totalPA;
}

/**
 * Calculate confidence-adjusted statistics
 */
export function calculateConfidenceAdjustedStats(playerStats, leagueAvg, pa, confidenceK = 100) {
  const confidence = pa / (pa + confidenceK);
  const adjustedStats = {};
  
  Object.keys(playerStats).forEach(stat => {
    if (typeof playerStats[stat] === 'number' && leagueAvg[stat] !== undefined) {
      adjustedStats[stat] = confidence * playerStats[stat] + (1 - confidence) * leagueAvg[stat];
    } else {
      adjustedStats[stat] = playerStats[stat];
    }
  });
  
  return {
    ...adjustedStats,
    _confidence: confidence,
    _pa: pa
  };
}

/**
 * Enhanced matchup engine integration
 */
export function enhancedMatchupEngineUpdate(matchupEngine) {
  // Update the getPotential function to consider confidence
  const originalGetPotential = matchupEngine.getPotential;
  
  matchupEngine.getPotential = function(value, high, medium, confidence = 1.0) {
    // Apply confidence penalty for low-data players
    const adjustedHigh = high * (0.5 + 0.5 * confidence);
    const adjustedMedium = medium * (0.5 + 0.5 * confidence);
    
    return originalGetPotential(value, adjustedHigh, adjustedMedium);
  };
  
  return matchupEngine;
}

/**
 * Format HR analysis for display
 */
export function formatHRAnalysisForDisplay(hrAnalysis) {
  if (!hrAnalysis) return null;
  
  const { metrics, potential, confidence } = hrAnalysis;
  
  return {
    title: `HR Analysis: ${potential}`,
    subtitle: confidence < 0.3 ? '⚠️ Limited Data' : '',
    primaryStats: [
      {
        label: 'Adjusted HR Rate',
        value: `${(metrics.adjustedHRRate * 100).toFixed(1)}%`,
        tooltip: `Raw: ${(metrics.rawHRRate * 100).toFixed(1)}%`
      },
      {
        label: 'Expected HR',
        value: `1 per ${metrics.hrPerAB} AB`,
        tooltip: `Based on ${metrics.totalABs} total ABs`
      },
      {
        label: 'Season Total',
        value: `${metrics.totalHRs} HRs`,
        tooltip: `In ${metrics.totalABs} ABs`
      }
    ],
    confidenceWarning: confidence < 0.3 ? {
      message: `Analysis based on only ${metrics.totalPA || 0} plate appearances`,
      severity: 'high'
    } : null
  };
}

/**
 * Calculate "due for HR" metrics
 */
export function calculateDueForHR(timeSinceLastHR, expectedHRRate) {
  if (!timeSinceLastHR || !expectedHRRate || expectedHRRate === 0) {
    return null;
  }
  
  const expectedABsPerHR = Math.round(1 / expectedHRRate);
  const absSinceLastHR = timeSinceLastHR.absSinceLastHR;
  
  // Calculate how "overdue" the player is
  const overdueRatio = absSinceLastHR / expectedABsPerHR;
  
  return {
    isDue: overdueRatio > 1.5,
    overdueRatio,
    message: overdueRatio > 2 
      ? `Significantly overdue (${absSinceLastHR} ABs vs expected ${expectedABsPerHR})`
      : overdueRatio > 1.5
      ? `Somewhat overdue (${absSinceLastHR} ABs vs expected ${expectedABsPerHR})`
      : `On track (${absSinceLastHR} ABs vs expected ${expectedABsPerHR})`,
    severity: overdueRatio > 2 ? 'high' : overdueRatio > 1.5 ? 'medium' : 'low'
  };
}

/**
 * Aggregate multiple HR signals into a composite score
 */
export function calculateCompositeHRScore(signals) {
  const weights = {
    adjustedISO: 0.25,
    exitVeloAdvantage: 0.20,
    arsenalMatchup: 0.20,
    trends: 0.15,
    dueForHR: 0.10,
    splits: 0.10
  };
  
  let totalScore = 0;
  let totalWeight = 0;
  
  // Adjusted ISO signal
  if (signals.adjustedISO !== undefined) {
    const isoScore = signals.adjustedISO > 0.200 ? 1.0 :
                     signals.adjustedISO > 0.150 ? 0.6 :
                     signals.adjustedISO > 0.100 ? 0.3 : 0.1;
    totalScore += isoScore * weights.adjustedISO;
    totalWeight += weights.adjustedISO;
  }
  
  // Exit velocity advantage signal
  if (signals.exitVeloAdvantage !== undefined) {
    const evScore = signals.exitVeloAdvantage > 3 ? 1.0 :
                    signals.exitVeloAdvantage > 1 ? 0.6 :
                    signals.exitVeloAdvantage > -1 ? 0.3 : 0.1;
    totalScore += evScore * weights.exitVeloAdvantage;
    totalWeight += weights.exitVeloAdvantage;
  }
  
  // Arsenal matchup signal
  if (signals.arsenalVulnerabilities !== undefined) {
    const arsenalScore = signals.arsenalVulnerabilities > 1 ? 1.0 :
                        signals.arsenalVulnerabilities > 0 ? 0.6 : 0.3;
    totalScore += arsenalScore * weights.arsenalMatchup;
    totalWeight += weights.arsenalMatchup;
  }
  
  // Trends signal
  if (signals.trendImprovement !== undefined) {
    const trendScore = signals.trendImprovement > 0.03 ? 1.0 :
                      signals.trendImprovement > 0.01 ? 0.6 :
                      signals.trendImprovement > -0.01 ? 0.3 : 0.1;
    totalScore += trendScore * weights.trends;
    totalWeight += weights.trends;
  }
  
  // Due for HR signal
  if (signals.overdueRatio !== undefined) {
    const dueScore = signals.overdueRatio > 2 ? 0.8 :
                    signals.overdueRatio > 1.5 ? 0.6 :
                    signals.overdueRatio > 1 ? 0.4 : 0.2;
    totalScore += dueScore * weights.dueForHR;
    totalWeight += weights.dueForHR;
  }
  
  // Splits signal
  if (signals.splitAdvantage !== undefined) {
    const splitScore = signals.splitAdvantage > 0.05 ? 1.0 :
                      signals.splitAdvantage > 0.02 ? 0.6 :
                      signals.splitAdvantage > -0.02 ? 0.3 : 0.1;
    totalScore += splitScore * weights.splits;
    totalWeight += weights.splits;
  }
  
  // Normalize by total weight
  const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  
  return {
    score: normalizedScore,
    rating: normalizedScore > 0.7 ? 'High' :
            normalizedScore > 0.4 ? 'Medium' : 'Low',
    confidence: totalWeight / Object.values(weights).reduce((a, b) => a + b, 0)
  };
}

/**
 * Generate natural language insights from HR analysis
 */
export function generateHRInsights(hrAnalysis) {
  const insights = [];
  const { metrics, potential } = hrAnalysis;
  
  // Time since last HR insight
  if (metrics.timeSinceLastHR) {
    const dueMetrics = calculateDueForHR(
      metrics.timeSinceLastHR,
      metrics.adjustedHRRate
    );
    
    if (dueMetrics && dueMetrics.isDue) {
      insights.push({
        type: 'due_for_hr',
        importance: dueMetrics.severity === 'high' ? 'high' : 'medium',
        message: dueMetrics.message,
        icon: '📈'
      });
    }
  }
  
  // Exit velocity insight
  if (metrics.exitVelocity && metrics.exitVelocity.matchupAdvantage > 2) {
    insights.push({
      type: 'exit_velo_advantage',
      importance: 'high',
      message: `Exit velo ${metrics.exitVelocity.matchupAdvantage.toFixed(1)} mph higher than pitcher allows`,
      icon: '🚀'
    });
  }
  
  // Arsenal vulnerability insight
  if (metrics.arsenalMatchup && metrics.arsenalMatchup.vulnerablePitches.length > 0) {
    const totalUsage = metrics.arsenalMatchup.bestMatchupAdvantage * 100;
    insights.push({
      type: 'arsenal_advantage',
      importance: totalUsage > 30 ? 'high' : 'medium',
      message: `Strong vs ${metrics.arsenalMatchup.vulnerablePitches.join(', ')} (${totalUsage.toFixed(0)}% combined usage)`,
      icon: '🎯'
    });
  }
  
  // Power trend insight
  if (metrics.trends && metrics.trends.improvement > 0.02) {
    insights.push({
      type: 'improving_power',
      importance: 'medium',
      message: `Power trending up: +${(metrics.trends.percentChange * 100).toFixed(0)}% ISO vs 2024`,
      icon: '💪'
    });
  }
  
  // Low data warning
  if (metrics.confidence < 0.3) {
    insights.push({
      type: 'low_data_warning',
      importance: 'caution',
      message: `Limited data (${metrics.totalPA} PA) - results may be unreliable`,
      icon: '⚠️'
    });
  }
  
  return insights;
}

/**
 * Export all utilities
 */
export default {
  getPAWeightedTotal,
  calculateConfidenceAdjustedStats,
  enhancedMatchupEngineUpdate,
  formatHRAnalysisForDisplay,
  calculateDueForHR,
  calculateCompositeHRScore,
  generateHRInsights
};