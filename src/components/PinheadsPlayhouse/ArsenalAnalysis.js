// ArsenalAnalysis.js
// Handles pitch arsenal matchup analysis between batters and pitchers

export const analyzePitchArsenalMatchup = (batterId, pitcherId, masterPlayerData, currentYear = 2025) => {
  const batterData = masterPlayerData[String(batterId)];
  const pitcherData = masterPlayerData[String(pitcherId)];
  
  if (!batterData || !pitcherData) {
    return {
      error: "Batter or pitcher data not found.",
      pitch_matchups: [],
      overall_summary_metrics: {}
    };
  }
  
  const pitcherArsenalStats2025 = pitcherData.pitcher_pitch_arsenal_stats || {};
  const pitcherUsagePercentages2025 = pitcherData.pitch_usage_stats || {};
  
  if (!pitcherUsagePercentages2025 || Object.keys(pitcherUsagePercentages2025).length === 0) {
    return {
      error: "Pitcher usage data for 2025 not found.",
      pitch_matchups: [],
      overall_summary_metrics: {}
    };
  }
  
  const matchupDetailsByPitchType = [];
  const weightedAverageMetricsAccumulator = {};
  
  const metricsToAnalyze = ['ba', 'slg', 'woba', 'hard_hit_percent', 'k_percent', 'run_value_per_100'];
  
  // Initialize accumulators
  metricsToAnalyze.forEach(metric => {
    weightedAverageMetricsAccumulator[`hitter_avg_${metric}`] = { sumWeightedValues: 0, sumWeights: 0 };
    weightedAverageMetricsAccumulator[`pitcher_avg_${metric}`] = { sumWeightedValues: 0, sumWeights: 0 };
  });
  
  // Analyze each pitch type
  for (const [pitchTypeAbbr, usagePercentValue] of Object.entries(pitcherUsagePercentages2025)) {
    if (usagePercentValue < 5) {
      continue; // Skip rarely used pitches
    }
    
    const usageWeightFactor = usagePercentValue / 100.0;
    
    const pitchMatchupInfo = {
      pitch_type: pitchTypeAbbr,
      pitch_name: pitcherArsenalStats2025[pitchTypeAbbr]?.pitch_name || pitchTypeAbbr,
      usage: usagePercentValue
    };
    
    const hitterStatsVsPitchType2025 = batterData.hitter_pitch_arsenal_stats?.[pitchTypeAbbr] || {};
    const pitcherStatsWithPitchType2025 = pitcherArsenalStats2025[pitchTypeAbbr] || {};
    
    const currentYearComparisonStats = {};
    
    for (const metricKey of metricsToAnalyze) {
      let hitterValue = hitterStatsVsPitchType2025[metricKey];
      let pitcherValue = pitcherStatsWithPitchType2025[metricKey];
      
      // Normalize percentage values
      if (['hard_hit_percent', 'k_percent'].includes(metricKey)) {
        if (hitterValue !== null && hitterValue !== undefined && !isNaN(hitterValue)) {
          hitterValue = hitterValue / 100.0;
        }
        if (pitcherValue !== null && pitcherValue !== undefined && !isNaN(pitcherValue)) {
          pitcherValue = pitcherValue / 100.0;
        }
      }
      
      currentYearComparisonStats[`hitter_${metricKey}`] = hitterValue;
      currentYearComparisonStats[`pitcher_${metricKey}`] = pitcherValue;
      
      // Accumulate weighted values
      if (hitterValue !== null && hitterValue !== undefined && !isNaN(hitterValue)) {
        weightedAverageMetricsAccumulator[`hitter_avg_${metricKey}`].sumWeightedValues += hitterValue * usageWeightFactor;
        weightedAverageMetricsAccumulator[`hitter_avg_${metricKey}`].sumWeights += usageWeightFactor;
      }
      
      if (pitcherValue !== null && pitcherValue !== undefined && !isNaN(pitcherValue)) {
        weightedAverageMetricsAccumulator[`pitcher_avg_${metricKey}`].sumWeightedValues += pitcherValue * usageWeightFactor;
        weightedAverageMetricsAccumulator[`pitcher_avg_${metricKey}`].sumWeights += usageWeightFactor;
      }
    }
    
    pitchMatchupInfo.current_year_stats = currentYearComparisonStats;
    matchupDetailsByPitchType.push(pitchMatchupInfo);
  }
  
  // Calculate overall weighted metrics
  const overallSummaryMetrics = {};
  for (const [metricNameAvg, dataSums] of Object.entries(weightedAverageMetricsAccumulator)) {
    if (dataSums.sumWeights > 0) {
      overallSummaryMetrics[metricNameAvg] = dataSums.sumWeightedValues / dataSums.sumWeights;
    } else {
      overallSummaryMetrics[metricNameAvg] = null;
    }
  }
  
  return {
    pitch_matchups: matchupDetailsByPitchType,
    overall_summary_metrics: overallSummaryMetrics,
    batter_id: batterId,
    pitcher_id: pitcherId
  };
};

// Analyze historical trends for a player
export const analyzeHistoricalTrendsGeneral = (
  playerId, 
  historicalData, 
  dataSourceKey, 
  relevantMetricsList, 
  pitchTypeFilter = null, 
  currentPredictionYear = 2025
) => {
  const trends = {};
  const yearlyMetricValuesCollector = {};
  
  // Initialize collectors for each metric
  relevantMetricsList.forEach(metric => {
    yearlyMetricValuesCollector[metric] = {};
  });
  
  const sortedHistoricalYears = Object.keys(historicalData)
    .map(y => parseInt(y))
    .filter(y => y < currentPredictionYear)
    .sort();
  
  for (const year of sortedHistoricalYears) {
    if (!historicalData[year] || !historicalData[year][dataSourceKey]) {
      continue;
    }
    
    const dfForYear = historicalData[year][dataSourceKey];
    const playerRowsForYear = dfForYear.filter(row => String(row.mlbam_id) === String(playerId));
    
    let relevantRows = playerRowsForYear;
    if (pitchTypeFilter && playerRowsForYear.length > 0 && playerRowsForYear[0].pitch_type !== undefined) {
      relevantRows = playerRowsForYear.filter(row => row.pitch_type === pitchTypeFilter);
    }
    
    if (relevantRows.length > 0) {
      for (const metricColumnName of relevantMetricsList) {
        const values = relevantRows
          .map(row => row[metricColumnName])
          .filter(v => v !== null && v !== undefined && !isNaN(v));
        
        if (values.length > 0) {
          if (!yearlyMetricValuesCollector[metricColumnName][year]) {
            yearlyMetricValuesCollector[metricColumnName][year] = [];
          }
          yearlyMetricValuesCollector[metricColumnName][year].push(...values);
        }
      }
    }
  }
  
  // Calculate trends for each metric
  for (const [metric, yearDataMap] of Object.entries(yearlyMetricValuesCollector)) {
    const averagedYearlyValues = {};
    
    for (const [yr, vals] of Object.entries(yearDataMap)) {
      if (vals.length > 0) {
        averagedYearlyValues[yr] = vals.reduce((sum, v) => sum + v, 0) / vals.length;
      }
    }
    
    if (Object.keys(averagedYearlyValues).length >= 2) {
      const sortedYearsWithData = Object.keys(averagedYearlyValues).sort();
      const chronologicalValues = sortedYearsWithData.map(yr => averagedYearlyValues[yr]);
      
      const recentValue = chronologicalValues[chronologicalValues.length - 1];
      const earlyValue = chronologicalValues[0];
      
      const direction = recentValue > earlyValue ? "improving" : 
                       recentValue < earlyValue ? "declining" : "stable";
      const magnitude = Math.abs(recentValue - earlyValue);
      const consistencyStdDev = calculateStandardDeviation(chronologicalValues);
      
      trends[metric] = {
        direction: direction,
        magnitude: magnitude,
        recent_value: recentValue,
        early_value: earlyValue,
        historical_values_map: averagedYearlyValues,
        consistency_std: consistencyStdDev
      };
    }
  }
  
  return trends;
};

// Calculate standard deviation
const calculateStandardDeviation = (values) => {
  if (values.length <= 1) return 0;
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  
  return Math.sqrt(variance);
};

// Calculate bonus based on historical trends
export const calculateGeneralHistoricalBonus = (trendsDict) => {
  if (!trendsDict || Object.keys(trendsDict).length === 0) {
    return 0;
  }
  
  let numMetricsConsidered = 0;
  let totalScaledImpactPoints = 0;
  let totalConsistencyPoints = 0;
  
  for (const [metric, trendData] of Object.entries(trendsDict)) {
    numMetricsConsidered++;
    const scaledMagnitudeImpact = trendData.magnitude * 100; // Scale the magnitude
    
    if (trendData.direction === 'improving') {
      totalScaledImpactPoints += scaledMagnitudeImpact;
    } else if (trendData.direction === 'declining') {
      totalScaledImpactPoints -= scaledMagnitudeImpact;
    }
    
    const consistencyStd = trendData.consistency_std || 1.0;
    if (consistencyStd < 0.03) {
      // Reward consistency if not declining
      totalConsistencyPoints += (trendData.direction !== 'declining' ? 5 : -3);
    } else if (consistencyStd > 0.12) {
      // Penalize high volatility
      totalConsistencyPoints -= 3;
    }
  }
  
  let bonus = 0;
  if (numMetricsConsidered > 0) {
    bonus = (totalScaledImpactPoints / numMetricsConsidered) + (totalConsistencyPoints / numMetricsConsidered);
  }
  
  // Cap bonus/penalty between -25 and 25
  return Math.max(-25, Math.min(25, bonus));
};

// Calculate recent performance bonus
export const calculateRecentPerformanceBonus = (recentStats, playerType = 'hitter') => {
  if (!recentStats || recentStats.total_games < 2) {
    return 0;
  }
  
  let bonus = 0;
  
  if (playerType === 'hitter') {
    // Trend in HR rate
    const trendMagnitudeHrRate = recentStats.trend_magnitude || 0;
    if (recentStats.trend_direction === 'improving') {
      bonus += 15 * trendMagnitudeHrRate * 100;
    } else if (recentStats.trend_direction === 'declining') {
      bonus -= 12 * trendMagnitudeHrRate * 100;
    }
    
    // Recent HR rate level
    const hrPerPaRecent = recentStats.hr_per_pa || 0;
    if (hrPerPaRecent > 0.05) {
      bonus += 20; // Strong recent HR rate
    } else if (hrPerPaRecent > 0.03) {
      bonus += 10;
    } else if (hrPerPaRecent < 0.01 && recentStats.total_pa_approx > 20) {
      bonus -= 10; // Very low recent HR rate
    }
    
    // Hitting streak factor
    const avgPerformance = recentStats.avg_avg || 0;
    if (avgPerformance > 0.300) {
      bonus += 15;
    } else if (avgPerformance > 0.275) {
      bonus += 8;
    } else if (avgPerformance < 0.200 && recentStats.total_ab > 10) {
      bonus -= 12;
    }
    
    // Contact quality trend
    const hitRateTrend = recentStats.hit_rate_trend || {};
    if (hitRateTrend.direction === 'improving' && hitRateTrend.magnitude > 0.050) {
      bonus += 10; // Significant improvement in contact quality
    }
  }
  
  // Cap bonus/penalty between -30 and 30
  return Math.max(-30, Math.min(30, bonus));
};

// Enhanced arsenal analysis for multiple hitters vs a pitcher
export const analyzeArsenalVsLineup = (pitcherData, hittersList, historicalData, activeYears) => {
  if (!pitcherData || !hittersList || hittersList.length === 0) {
    return null;
  }
  
  const pitcherArsenal = pitcherData.pitcher_pitch_arsenal_stats || {};
  const pitcherUsage = pitcherData.pitch_usage_stats || {};
  
  const arsenalSummary = {
    pitcher: pitcherData.roster_info?.fullName_resolved || 'Unknown',
    pitchTypes: [],
    hitterAnalyses: []
  };
  
  // Analyze each pitch type
  for (const [pitchType, usage] of Object.entries(pitcherUsage)) {
    if (usage < 5) continue; // Skip rarely used pitches
    
    const pitchInfo = {
      type: pitchType,
      name: pitcherArsenal[pitchType]?.pitch_name || pitchType,
      usage: usage,
      stats: pitcherArsenal[pitchType] || {}
    };
    
    arsenalSummary.pitchTypes.push(pitchInfo);
  }
  
  // Analyze each hitter against the arsenal
  for (const hitter of hittersList) {
    const hitterArsenalStats = hitter.hitter_pitch_arsenal_stats || {};
    const hitterAnalysis = {
      hitter: hitter.roster_info?.fullName_resolved || 'Unknown',
      pitchMatchups: [],
      overallAdvantage: 0
    };
    
    let totalAdvantage = 0;
    let totalWeight = 0;
    
    for (const pitch of arsenalSummary.pitchTypes) {
      const hitterVsPitch = hitterArsenalStats[pitch.type] || {};
      const pitcherWithPitch = pitch.stats;
      
      // Calculate advantage for this pitch matchup
      let advantage = 0;
      let factors = 0;
      
      // Compare key metrics
      if (hitterVsPitch.woba && pitcherWithPitch.woba) {
        advantage += (hitterVsPitch.woba - pitcherWithPitch.woba) * 2;
        factors++;
      }
      
      if (hitterVsPitch.slg && pitcherWithPitch.slg) {
        advantage += (hitterVsPitch.slg - pitcherWithPitch.slg) * 1.5;
        factors++;
      }
      
      if (hitterVsPitch.k_percent && pitcherWithPitch.k_percent) {
        // Lower K% is better for hitter
        advantage += (pitcherWithPitch.k_percent - hitterVsPitch.k_percent) * 0.01;
        factors++;
      }
      
      if (factors > 0) {
        advantage = advantage / factors;
        const weight = pitch.usage / 100;
        totalAdvantage += advantage * weight;
        totalWeight += weight;
        
        hitterAnalysis.pitchMatchups.push({
          pitchType: pitch.type,
          pitchName: pitch.name,
          usage: pitch.usage,
          advantage: advantage,
          hitterStats: hitterVsPitch,
          pitcherStats: pitcherWithPitch
        });
      }
    }
    
    if (totalWeight > 0) {
      hitterAnalysis.overallAdvantage = totalAdvantage / totalWeight;
    }
    
    arsenalSummary.hitterAnalyses.push(hitterAnalysis);
  }
  
  return arsenalSummary;
};