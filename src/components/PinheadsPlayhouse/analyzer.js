/**
 * Analysis engine for the Baseball HR Prediction System (JavaScript version).
 * Direct port from analyzer.py to ensure calculation consistency.
 */

import { 
    normalizeCalculated, 
    adjustStatWithConfidence,
    getApproximatedPA
} from './utils.js';

import {
    WEIGHTS,
    W_ARSENAL_MATCHUP,
    W_BATTER_OVERALL,
    W_PITCHER_OVERALL,
    W_HISTORICAL_YOY_CSV,
    W_RECENT_DAILY_GAMES,
    W_CONTEXTUAL,
    DEFAULT_EXPECTED_H_PER_HR,
    MIN_RECENT_PA_FOR_CONTACT_EVAL,
    K_PA_THRESHOLD_FOR_LEAGUE_AVG,
    K_PA_WARNING_THRESHOLD
} from './config.js';

/**
 * Calculate performance trends from a player's recent games.
 * Direct port of calculate_recent_trends from analyzer.py
 */
export function calculateRecentTrends(gamesPerformance) {
    if (!gamesPerformance || gamesPerformance.length === 0) {
        return {};
    }
    
    const numGames = gamesPerformance.length;
    
    // Calculate totals across all games
    const totalAB = gamesPerformance.reduce((sum, g) => sum + g.AB, 0);
    const totalH = gamesPerformance.reduce((sum, g) => sum + g.H, 0);
    const totalHR = gamesPerformance.reduce((sum, g) => sum + g.HR, 0);
    const totalBB = gamesPerformance.reduce((sum, g) => sum + g.BB, 0);
    const totalK = gamesPerformance.reduce((sum, g) => sum + g.K, 0);
    const totalPAApprox = gamesPerformance.reduce((sum, g) => sum + getApproximatedPA(g), 0);
    
    // Calculate averages and rates
    const recentStats = {
        total_games: numGames,
        total_ab: totalAB,
        total_hits: totalH,
        total_hrs: totalHR,
        total_bb: totalBB,
        total_k: totalK,
        total_pa_approx: totalPAApprox,
        avg_avg: gamesPerformance.filter(g => g.AB > 0).length > 0 ? 
                 gamesPerformance.filter(g => g.AB > 0).reduce((sum, g) => sum + g.AVG, 0) / 
                 gamesPerformance.filter(g => g.AB > 0).length : 0,
        avg_obp: gamesPerformance.filter(g => getApproximatedPA(g) > 0).length > 0 ?
                 gamesPerformance.filter(g => getApproximatedPA(g) > 0).reduce((sum, g) => sum + g.OBP, 0) /
                 gamesPerformance.filter(g => getApproximatedPA(g) > 0).length : 0,
        avg_slg: gamesPerformance.filter(g => g.AB > 0).length > 0 ?
                 gamesPerformance.filter(g => g.AB > 0).reduce((sum, g) => sum + g.SLG, 0) /
                 gamesPerformance.filter(g => g.AB > 0).length : 0,
        hit_rate: totalAB > 0 ? totalH / totalAB : 0,
        hr_rate: totalAB > 0 ? totalHR / totalAB : 0,
        hr_per_pa: totalPAApprox > 0 ? totalHR / totalPAApprox : 0,
        k_rate: totalPAApprox > 0 ? totalK / totalPAApprox : 0,
        bb_rate: totalPAApprox > 0 ? totalBB / totalPAApprox : 0,
        obp_calc: totalPAApprox > 0 ? (totalH + totalBB) / totalPAApprox : 0
    };
    
    // Calculate trends (first half vs second half)
    if (numGames >= 2) {
        const midPoint = Math.floor(numGames / 2);
        const recentHalfGames = gamesPerformance.slice(0, midPoint);  // More recent games
        const earlierHalfGames = gamesPerformance.slice(midPoint);     // Earlier games
        
        if (recentHalfGames.length > 0 && earlierHalfGames.length > 0) {
            // HR/PA trend
            const recentHRTrend = recentHalfGames.reduce((sum, g) => sum + g.HR, 0);
            const recentPATrend = recentHalfGames.reduce((sum, g) => sum + getApproximatedPA(g), 0);
            const recentVal = recentPATrend > 0 ? recentHRTrend / recentPATrend : 0;
            
            const earlyHRTrend = earlierHalfGames.reduce((sum, g) => sum + g.HR, 0);
            const earlyPATrend = earlierHalfGames.reduce((sum, g) => sum + getApproximatedPA(g), 0);
            const earlyVal = earlyPATrend > 0 ? earlyHRTrend / earlyPATrend : 0;
            
            recentStats.trend_metric = 'HR_per_PA';
            recentStats.trend_recent_val = Math.round(recentVal * 1000) / 1000;
            recentStats.trend_early_val = Math.round(earlyVal * 1000) / 1000;
            recentStats.trend_direction = recentVal > earlyVal ? 'improving' : 
                                         recentVal < earlyVal ? 'declining' : 'stable';
            recentStats.trend_magnitude = Math.abs(recentVal - earlyVal);
            
            // Alternative trend: Contact quality
            const recentHits = recentHalfGames.reduce((sum, g) => sum + g.H, 0);
            const recentABs = recentHalfGames.reduce((sum, g) => sum + g.AB, 0);
            const recentHitRate = recentABs > 0 ? recentHits / recentABs : 0;
            
            const earlyHits = earlierHalfGames.reduce((sum, g) => sum + g.H, 0);
            const earlyABs = earlierHalfGames.reduce((sum, g) => sum + g.AB, 0);
            const earlyHitRate = earlyABs > 0 ? earlyHits / earlyABs : 0;
            
            recentStats.hit_rate_trend = {
                early_val: Math.round(earlyHitRate * 1000) / 1000,
                recent_val: Math.round(recentHitRate * 1000) / 1000,
                direction: recentHitRate > earlyHitRate ? 'improving' : 
                          recentHitRate < earlyHitRate ? 'declining' : 'stable',
                magnitude: Math.abs(recentHitRate - earlyHitRate)
            };
        }
    }
    
    return recentStats;
}

/**
 * Analyze year-over-year trends for a player across specified metrics.
 * Direct port of analyze_historical_trends_general from analyzer.py
 */
export function analyzeHistoricalTrendsGeneral(playerId, historicalData, dataSourceKey, 
                                             relevantMetricsList, pitchTypeFilter = null, currentPredictionYear = 2025) {
    const trends = {};
    const yearlyMetricValuesCollector = {};
    
    // Initialize collector
    for (const metric of relevantMetricsList) {
        yearlyMetricValuesCollector[metric] = {};
    }
    
    const sortedHistoricalYears = Object.keys(historicalData)
        .map(y => parseInt(y))
        .filter(yr => yr < currentPredictionYear)
        .sort();
    
    for (const year of sortedHistoricalYears) {
        const yearData = historicalData[year];
        if (!yearData || !yearData[dataSourceKey]) continue;
        
        const dfForYear = yearData[dataSourceKey];
        const playerRowsForYear = dfForYear.filter(row => 
            String(row.mlbam_id || row.player_id) === String(playerId)
        );
        
        let filteredRows = playerRowsForYear;
        if (pitchTypeFilter && playerRowsForYear.some(row => row.pitch_type)) {
            filteredRows = playerRowsForYear.filter(row => row.pitch_type === pitchTypeFilter);
        }
        
        if (filteredRows.length > 0) {
            for (const metricColumnName of relevantMetricsList) {
                const value = filteredRows[0][metricColumnName];
                if (value != null && !isNaN(value)) {
                    if (!yearlyMetricValuesCollector[metricColumnName][year]) {
                        yearlyMetricValuesCollector[metricColumnName][year] = [];
                    }
                    yearlyMetricValuesCollector[metricColumnName][year].push(value);
                }
            }
        }
    }
    
    for (const [metric, yearDataMap] of Object.entries(yearlyMetricValuesCollector)) {
        const averagedYearlyValues = {};
        
        for (const [yr, vals] of Object.entries(yearDataMap)) {
            if (vals.length > 0) {
                averagedYearlyValues[yr] = vals.reduce((sum, val) => sum + val, 0) / vals.length;
            }
        }
        
        if (Object.keys(averagedYearlyValues).length >= 2) {
            const sortedYearsWithData = Object.keys(averagedYearlyValues).map(y => parseInt(y)).sort();
            const chronologicalValuesForMetric = sortedYearsWithData.map(yr => averagedYearlyValues[yr]);
            
            const recentValue = chronologicalValuesForMetric[chronologicalValuesForMetric.length - 1];
            const earlyValue = chronologicalValuesForMetric[0];
            
            const direction = recentValue > earlyValue ? "improving" : 
                             recentValue < earlyValue ? "declining" : "stable";
            const magnitudeOfChange = Math.abs(recentValue - earlyValue);
            
            // Calculate standard deviation for consistency
            const mean = chronologicalValuesForMetric.reduce((sum, val) => sum + val, 0) / chronologicalValuesForMetric.length;
            const variance = chronologicalValuesForMetric.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / chronologicalValuesForMetric.length;
            const consistencyStdDev = chronologicalValuesForMetric.length > 1 ? Math.sqrt(variance) : 0;
            
            trends[metric] = {
                direction: direction,
                magnitude: magnitudeOfChange,
                recent_value: recentValue,
                early_value: earlyValue,
                historical_values_map: averagedYearlyValues,
                consistency_std: consistencyStdDev
            };
        }
    }
    
    return trends;
}

/**
 * Calculate a bonus score based on historical trends.
 * Direct port of calculate_general_historical_bonus from analyzer.py
 */
export function calculateGeneralHistoricalBonus(trendsDict) {
    if (!trendsDict || Object.keys(trendsDict).length === 0) {
        return 0;
    }
    
    let numMetricsConsidered = 0;
    let totalScaledImpactPoints = 0;
    let totalConsistencyPoints = 0;
    
    for (const [metric, trendData] of Object.entries(trendsDict)) {
        numMetricsConsidered++;
        const scaledMagnitudeImpact = trendData.magnitude * 100; // Example scaling
        
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
    
    return Math.min(Math.max(bonus, -25), 25); // Cap bonus/penalty
}

/**
 * Calculate a bonus score based on recent performance trends.
 * Direct port of calculate_recent_performance_bonus from analyzer.py
 */
export function calculateRecentPerformanceBonus(recentStats, playerType = 'hitter') {
    if (!recentStats || (recentStats.total_games || 0) < 2) {
        return 0;
    }
    
    let bonus = 0;
    
    if (playerType === 'hitter') {
        // Trend in HR rate
        const trendMagnitudeHRRate = recentStats.trend_magnitude || 0;
        if (recentStats.trend_direction === 'improving') {
            bonus += 15 * trendMagnitudeHRRate * 100;
        } else if (recentStats.trend_direction === 'declining') {
            bonus -= 12 * trendMagnitudeHRRate * 100;
        }
        
        // Recent HR rate level
        const hrPerPARecent = recentStats.hr_per_pa || 0;
        if (hrPerPARecent > 0.05) {
            bonus += 20; // Strong recent HR rate
        } else if (hrPerPARecent > 0.03) {
            bonus += 10;
        } else if (hrPerPARecent < 0.01 && (recentStats.total_pa_approx || 0) > 20) {
            bonus -= 10; // Very low recent HR rate
        }
        
        // Hitting streak factor
        const avgPerformance = recentStats.avg_avg || 0;
        if (avgPerformance > 0.300) {
            bonus += 15;
        } else if (avgPerformance > 0.275) {
            bonus += 8;
        } else if (avgPerformance < 0.200 && (recentStats.total_ab || 0) > 10) {
            bonus -= 12;
        }
        
        // Contact quality trend
        const hitRateTrend = recentStats.hit_rate_trend || {};
        if (hitRateTrend.direction === 'improving' && (hitRateTrend.magnitude || 0) > 0.050) {
            bonus += 10; // Significant improvement in contact quality
        }
    }
    
    return Math.min(Math.max(bonus, -30), 30); // Cap bonus/penalty
}

/**
 * Detailed analysis of the matchup between a batter and pitcher's arsenal.
 * Direct port of analyze_pitch_arsenal_matchup from analyzer.py
 */
export function analyzePitchArsenalMatchup(batterId, pitcherId, masterPlayerData, currentYear = 2025) {
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
    
    if (Object.keys(pitcherUsagePercentages2025).length === 0) {
        return {
            error: "Pitcher usage data for 2025 not found.",
            pitch_matchups: [],
            overall_summary_metrics: {}
        };
    }
    
    const matchupDetailsByPitchType = [];
    const weightedAverageMetricsAccumulator = {};
    
    const metricsToAnalyzeFromArsenal = ['ba', 'slg', 'woba', 'hard_hit_percent', 'k_percent', 'run_value_per_100'];
    
    // Initialize accumulator
    for (const metric of metricsToAnalyzeFromArsenal) {
        weightedAverageMetricsAccumulator[`hitter_avg_${metric}`] = { sum_weighted_values: 0, sum_weights: 0 };
        weightedAverageMetricsAccumulator[`pitcher_avg_${metric}`] = { sum_weighted_values: 0, sum_weights: 0 };
    }
    
    for (const [pitchTypeAbbr, usagePercentValue] of Object.entries(pitcherUsagePercentages2025)) {
        if (usagePercentValue < 5) {
            continue; // Min usage threshold
        }
        
        const usageWeightFactor = usagePercentValue / 100.0;
        
        const pitchMatchupOutputInfo = {
            pitch_type: pitchTypeAbbr,
            pitch_name: pitcherArsenalStats2025[pitchTypeAbbr]?.pitch_name || pitchTypeAbbr,
            usage: usagePercentValue
        };
        
        const hitterStatsVsPitchType2025 = batterData.hitter_pitch_arsenal_stats?.[pitchTypeAbbr] || {};
        const pitcherStatsWithPitchType2025 = pitcherArsenalStats2025[pitchTypeAbbr] || {};
        
        const currentYearComparisonStats = {};
        
        for (const metricKey of metricsToAnalyzeFromArsenal) {
            let hitterValue = hitterStatsVsPitchType2025[metricKey];
            let pitcherValue = pitcherStatsWithPitchType2025[metricKey];
            
            // Normalize percentage values
            if (['hard_hit_percent', 'k_percent'].includes(metricKey)) {
                if (hitterValue != null && !isNaN(hitterValue)) {
                    hitterValue /= 100.0;
                }
                if (pitcherValue != null && !isNaN(pitcherValue)) {
                    pitcherValue /= 100.0;
                }
            }
            
            currentYearComparisonStats[`hitter_${metricKey}`] = hitterValue;
            currentYearComparisonStats[`pitcher_${metricKey}`] = pitcherValue;
            
            // Accumulate weighted values for overall metrics
            if (hitterValue != null && !isNaN(hitterValue)) {
                const hitterKey = `hitter_avg_${metricKey}`;
                weightedAverageMetricsAccumulator[hitterKey].sum_weighted_values += hitterValue * usageWeightFactor;
                weightedAverageMetricsAccumulator[hitterKey].sum_weights += usageWeightFactor;
            }
            
            if (pitcherValue != null && !isNaN(pitcherValue)) {
                const pitcherKey = `pitcher_avg_${metricKey}`;
                weightedAverageMetricsAccumulator[pitcherKey].sum_weighted_values += pitcherValue * usageWeightFactor;
                weightedAverageMetricsAccumulator[pitcherKey].sum_weights += usageWeightFactor;
            }
        }
        
        pitchMatchupOutputInfo.current_year_stats = currentYearComparisonStats;
        matchupDetailsByPitchType.push(pitchMatchupOutputInfo);
    }
    
    // Calculate overall weighted metrics
    const overallSummaryMetricsCalculated = {};
    for (const [metricNameAvg, dataSums] of Object.entries(weightedAverageMetricsAccumulator)) {
        overallSummaryMetricsCalculated[metricNameAvg] = dataSums.sum_weights > 0 ? 
            dataSums.sum_weighted_values / dataSums.sum_weights : null;
    }
    
    return {
        pitch_matchups: matchupDetailsByPitchType,
        overall_summary_metrics: overallSummaryMetricsCalculated,
        batter_id: batterId,
        pitcher_id: pitcherId
    };
}

/**
 * Comprehensive HR likelihood score calculation.
 * Direct port of enhanced_hr_likelihood_score from analyzer.py
 */
export function enhancedHRLikelihoodScore(batterMlbamId, pitcherMlbamId, masterPlayerData, 
                                        historicalData, metricRanges, leagueAvgStats, recentBatterStats = null) {
    const batterData = masterPlayerData[String(batterMlbamId)];
    const pitcherData = masterPlayerData[String(pitcherMlbamId)];
    
    if (!batterData || !pitcherData) {
        return { score: 0, reason: "Missing player master data" };
    }
    
    const batterRosterInfo = batterData.roster_info || {};
    const pitcherRosterInfo = pitcherData.roster_info || {};
    
    const batterName = batterRosterInfo.fullName_resolved || `BatterID:${batterMlbamId}`;
    const pitcherName = pitcherRosterInfo.fullName_resolved || `PitcherID:${pitcherMlbamId}`;
    
    let batterHand = batterRosterInfo.bats || 'R';
    const pitcherHand = pitcherRosterInfo.ph || 'R';
    
    // Adjust for switch hitters
    if (batterHand === 'B') {
        batterHand = pitcherHand === 'R' ? 'L' : 'R';
    }
    
    const batterStats2025Agg = batterData.stats_2025_aggregated || {};
    const batterPA2025 = batterStats2025Agg.PA_approx || 0;
    
    const batterPAWarningMsg = batterPA2025 < K_PA_WARNING_THRESHOLD ? ` (Low PA_2025: ${batterPA2025})` : "";
    const detailsForOutputDict = { 
        batter_pa_2025: batterPA2025, 
        batter_pa_warning: batterPAWarningMsg 
    };
    
    // 1. Arsenal analysis
    const arsenalAnalysisResult = analyzePitchArsenalMatchup(batterMlbamId, pitcherMlbamId, masterPlayerData);
    detailsForOutputDict.arsenal_analysis = arsenalAnalysisResult;
    
    let avgMatchupScoreFromArsenal = 0;
    if (!arsenalAnalysisResult.error && arsenalAnalysisResult.pitch_matchups.length > 0) {
        const hitterWeightedSLGVsArsenal = arsenalAnalysisResult.overall_summary_metrics?.hitter_avg_slg;
        const pitcherWeightedSLGAllowedWithArsenal = arsenalAnalysisResult.overall_summary_metrics?.pitcher_avg_slg;
        
        if (hitterWeightedSLGVsArsenal != null && pitcherWeightedSLGAllowedWithArsenal != null) {
            const normHWSLG = normalizeCalculated(hitterWeightedSLGVsArsenal, 'slg', metricRanges, 100, true);
            const normPWSLGA = normalizeCalculated(pitcherWeightedSLGAllowedWithArsenal, 'slg', metricRanges, 100, true);
            avgMatchupScoreFromArsenal = (normHWSLG * 0.6 + normPWSLGA * 0.4);
        } else {
            avgMatchupScoreFromArsenal = 30;
        }
    } else {
        avgMatchupScoreFromArsenal = 25;
        if (arsenalAnalysisResult.error) {
            detailsForOutputDict.arsenal_analysis_error = arsenalAnalysisResult.error;
        }
    }
    
    // 2. Batter overall evaluation
    let batterOverallScoreComponent = 0;
    const hitterOverallEVStats = batterData.hitter_overall_ev_stats || {};
    
    if (typeof hitterOverallEVStats === 'object') {
        const isoOverallAdj = adjustStatWithConfidence(
            hitterOverallEVStats.iso_percent,
            batterPA2025,
            'ISO',
            leagueAvgStats,
            100,
            leagueAvgStats.ISO
        );
        
        const brlOverallRaw = hitterOverallEVStats.brl_percent != null ? 
            hitterOverallEVStats.brl_percent / 100.0 : leagueAvgStats.AVG_BRL_PERCENT;
        const hhOverallRaw = hitterOverallEVStats.hard_hit_percent != null ?
            hitterOverallEVStats.hard_hit_percent / 100.0 : leagueAvgStats.AVG_HARD_HIT_PERCENT;
        
        batterOverallScoreComponent += WEIGHTS.batter_overall_iso * normalizeCalculated(isoOverallAdj, 'iso', metricRanges);
        batterOverallScoreComponent += WEIGHTS.batter_overall_brl_percent * normalizeCalculated(brlOverallRaw, 'brl_percent', metricRanges);
        batterOverallScoreComponent += WEIGHTS.batter_overall_hard_hit * normalizeCalculated(hhOverallRaw, 'hard_hit_percent', metricRanges);
        
        detailsForOutputDict.batter_overall_adj_iso = Math.round((isoOverallAdj || 0) * 1000) / 1000;
        detailsForOutputDict.batter_overall_brl = Math.round(brlOverallRaw * 1000) / 1000;
        detailsForOutputDict.batter_overall_hh = Math.round(hhOverallRaw * 1000) / 1000;
    }
    
    // 3. Pitcher overall evaluation
    let pitcherOverallScoreComponent = 0;
    const pitcherOverallEVStats = pitcherData.pitcher_overall_ev_stats || {};
    
    if (typeof pitcherOverallEVStats === 'object') {
        const brlAllowedRaw = pitcherOverallEVStats.brl_percent != null ?
            pitcherOverallEVStats.brl_percent / 100.0 : leagueAvgStats.AVG_BRL_PERCENT;
        const hhAllowedRaw = pitcherOverallEVStats.hard_hit_percent != null ?
            pitcherOverallEVStats.hard_hit_percent / 100.0 : leagueAvgStats.AVG_HARD_HIT_PERCENT;
        
        pitcherOverallScoreComponent += WEIGHTS.pitcher_overall_brl_percent_allowed * normalizeCalculated(brlAllowedRaw, 'brl_percent', metricRanges, 100, true);
        pitcherOverallScoreComponent += WEIGHTS.pitcher_overall_hard_hit_allowed * normalizeCalculated(hhAllowedRaw, 'hard_hit_percent', metricRanges, 100, true);
        
        detailsForOutputDict.pitcher_overall_brl_allowed = Math.round(brlAllowedRaw * 1000) / 1000;
        detailsForOutputDict.pitcher_overall_hh_allowed = Math.round(hhAllowedRaw * 1000) / 1000;
    }
    
    // 4. Historical year-over-year analysis
    const historicalTrendsForHitter = analyzeHistoricalTrendsGeneral(
        String(batterMlbamId),
        historicalData,
        'hitter_arsenal',
        ['slg', 'woba']
    );
    
    const historicalYOYCSVScore = calculateGeneralHistoricalBonus(historicalTrendsForHitter);
    
    // Collect the historical metrics for display
    const historicalMetricsDetails = [];
    for (const [metric, trendInfo] of Object.entries(historicalTrendsForHitter)) {
        if (trendInfo.direction !== 'stable') {
            historicalMetricsDetails.push({
                metric: metric,
                direction: trendInfo.direction,
                early_value: Math.round(trendInfo.early_value * 1000) / 1000,
                recent_value: Math.round(trendInfo.recent_value * 1000) / 1000,
                magnitude: Math.round(trendInfo.magnitude * 1000) / 1000
            });
        }
    }
    detailsForOutputDict.historical_metrics = historicalMetricsDetails;
    
    // 5. Recent performance analysis
    const recentDailyGamesScore = calculateRecentPerformanceBonus(recentBatterStats, 'hitter');
    
    // 6. Contextual factors analysis
    let contextualFactorsTotalScore = 0;
    
    // 6a. Exit velocity matchup
    let evMatchupSubScore = 0;
    if (typeof hitterOverallEVStats === 'object' && typeof pitcherOverallEVStats === 'object') {
        const hHHVal = hitterOverallEVStats.hard_hit_percent || leagueAvgStats.AVG_HARD_HIT_PERCENT * 100;
        const pHHValAllowed = pitcherOverallEVStats.hard_hit_percent || leagueAvgStats.AVG_HARD_HIT_PERCENT * 100;
        
        const normHHH = normalizeCalculated(hHHVal / 100.0, 'hard_hit_percent', metricRanges, 100, true);
        const normPHHAllowedIsGoodForHitter = normalizeCalculated(pHHValAllowed / 100.0, 'hard_hit_percent', metricRanges, 100, true);
        
        evMatchupSubScore = (normHHH * 0.6 + normPHHAllowedIsGoodForHitter * 0.4) - 50;
    }
    
    contextualFactorsTotalScore += WEIGHTS.ev_matchup_bonus * (evMatchupSubScore !== 0 ? evMatchupSubScore / 50 : 0);
    detailsForOutputDict.ev_matchup_raw_score = Math.round(evMatchupSubScore * 10) / 10;
    
    // 6b. Due for HR based on AB count
    let dueForHRABSubScore = 0;
    const stats2024Hitter = batterData.stats_2024 || {};
    const hr2024Val = stats2024Hitter.HR || 0;
    const ab2024Val = stats2024Hitter.AB || 0;
    const hr2025AggVal = batterStats2025Agg.HR || 0;
    const ab2025AggVal = batterStats2025Agg.AB || 0;
    
    let expectedHRPerABVal = 0;
    if (hr2024Val > 0 && ab2024Val >= 50) {
        expectedHRPerABVal = hr2024Val / ab2024Val;
    } else if (hr2025AggVal > 0 && ab2025AggVal >= 30) {
        expectedHRPerABVal = hr2025AggVal / ab2025AggVal;
    } else {
        expectedHRPerABVal = 1 / 45.0;
    }
    
    if (expectedHRPerABVal > 0) {
        const abNeededForHRVal = 1 / expectedHRPerABVal;
        const currentABSinceHRVal = batterStats2025Agg.current_AB_since_last_HR || 0;
        
        detailsForOutputDict.ab_since_last_hr = currentABSinceHRVal;
        detailsForOutputDict.expected_ab_per_hr = Math.round(abNeededForHRVal * 10) / 10;
        
        if (currentABSinceHRVal > abNeededForHRVal * 1.25) {
            dueForHRABSubScore = Math.min((currentABSinceHRVal / abNeededForHRVal - 1.25) * 20, 25);
        }
    }
    
    contextualFactorsTotalScore += WEIGHTS.due_for_hr_factor * (dueForHRABSubScore !== 0 ? dueForHRABSubScore / 25 : 0);
    detailsForOutputDict.due_for_hr_ab_raw_score = Math.round(dueForHRABSubScore * 10) / 10;
    
    // 6c. Due for HR based on hits count
    let dueForHRHitsSubScore = 0;
    const currentHSinceHRVal = batterStats2025Agg.current_H_since_last_HR || 0;
    let expectedHPerHRFromStats = stats2024Hitter.H_per_HR;
    
    if (expectedHPerHRFromStats == null || expectedHPerHRFromStats <= 0) {
        const h2025Agg = batterStats2025Agg.H || 0;
        const hr2025Agg = batterStats2025Agg.HR || 0;
        
        if (hr2025Agg > 0) {
            expectedHPerHRFromStats = h2025Agg / hr2025Agg;
        } else {
            expectedHPerHRFromStats = DEFAULT_EXPECTED_H_PER_HR;
        }
    }
    
    detailsForOutputDict.h_since_last_hr = currentHSinceHRVal;
    detailsForOutputDict.expected_h_per_hr = Math.round(expectedHPerHRFromStats * 10) / 10;
    
    if (expectedHPerHRFromStats > 0 && currentHSinceHRVal > expectedHPerHRFromStats * 1.5) {
        dueForHRHitsSubScore = Math.min(((currentHSinceHRVal / expectedHPerHRFromStats) - 1.5) * 15, 20);
    }
    
    contextualFactorsTotalScore += WEIGHTS.due_for_hr_hits_factor * (dueForHRHitsSubScore !== 0 ? dueForHRHitsSubScore / 20 : 0);
    detailsForOutputDict.due_for_hr_hits_raw_score = Math.round(dueForHRHitsSubScore * 10) / 10;
    
    // 6d. 2024 vs 2025 ISO trend
    let trend2025v2024SubScore = 0;
    const iso2025AdjForTrendVal = detailsForOutputDict.batter_overall_adj_iso;
    
    if (ab2024Val >= K_PA_THRESHOLD_FOR_LEAGUE_AVG && batterPA2025 >= K_PA_THRESHOLD_FOR_LEAGUE_AVG / 2) {
        let iso2024Val = -1;
        if (stats2024Hitter.SLG && stats2024Hitter.AVG && stats2024Hitter.AB > 0) {
            iso2024Val = stats2024Hitter.SLG - stats2024Hitter.AVG;
        }
        
        if (iso2024Val > -0.5 && iso2025AdjForTrendVal > -0.5) {
            const isoChangeFromLastYear = iso2025AdjForTrendVal - iso2024Val;
            trend2025v2024SubScore = isoChangeFromLastYear * 150;
            
            detailsForOutputDict.iso_2024 = Math.round(iso2024Val * 1000) / 1000;
            detailsForOutputDict.iso_2025_adj_for_trend = Math.round(iso2025AdjForTrendVal * 1000) / 1000;
            detailsForOutputDict.iso_trend_2025v2024 = Math.round(isoChangeFromLastYear * 1000) / 1000;
        }
    }
    
    contextualFactorsTotalScore += WEIGHTS.trend_2025_vs_2024_bonus * (trend2025v2024SubScore !== 0 ? trend2025v2024SubScore / 20 : 0);
    detailsForOutputDict.trend_2025v2024_raw_score = Math.round(trend2025v2024SubScore * 10) / 10;
    
    // 6e. Contact quality trend factors
    let heatingUpContactSubScore = 0;
    let coldBatterContactSubScore = 0;
    
    if (recentBatterStats && (recentBatterStats.total_pa_approx || 0) >= MIN_RECENT_PA_FOR_CONTACT_EVAL) {
        const recentHitRate = recentBatterStats.hit_rate;
        const recentHRPerPA = recentBatterStats.hr_per_pa;
        
        if (recentHitRate != null) {
            const lgAvgBatting = leagueAvgStats.AVG || 0.245;
            const playerExpectedHRRateForComparison = expectedHRPerABVal;
            
            // The player is making good contact but not getting HRs - could be due
            if (recentHitRate > (lgAvgBatting + 0.050) &&
                recentHRPerPA != null && playerExpectedHRRateForComparison > 0 &&
                recentHRPerPA < (playerExpectedHRRateForComparison * 0.4)) {
                heatingUpContactSubScore = 15;
                detailsForOutputDict.contact_trend = 'Heating Up (High Contact, Low Recent Power)';
            }
            // Player in cold streak, less likely for HR
            else if (recentHitRate < (lgAvgBatting - 0.060)) {
                coldBatterContactSubScore = -20;
                detailsForOutputDict.contact_trend = 'Cold Batter (Low Recent Contact)';
            }
            
            // Apply modifiers
            if (heatingUpContactSubScore > 0) {
                contextualFactorsTotalScore += WEIGHTS.heating_up_contact_factor * (heatingUpContactSubScore / 15);
            }
            if (coldBatterContactSubScore < 0) {
                contextualFactorsTotalScore += WEIGHTS.cold_batter_factor * (coldBatterContactSubScore / 20);
            }
        }
    }
    
    detailsForOutputDict.heating_up_contact_raw_score = Math.round(heatingUpContactSubScore * 10) / 10;
    detailsForOutputDict.cold_batter_contact_raw_score = Math.round(coldBatterContactSubScore * 10) / 10;
    
    // 7. Final score calculation
    const finalHRScoreCalculated = (
        W_ARSENAL_MATCHUP * avgMatchupScoreFromArsenal +
        W_BATTER_OVERALL * batterOverallScoreComponent +
        W_PITCHER_OVERALL * pitcherOverallScoreComponent +
        W_HISTORICAL_YOY_CSV * historicalYOYCSVScore +
        W_RECENT_DAILY_GAMES * recentDailyGamesScore +
        W_CONTEXTUAL * contextualFactorsTotalScore
    );
    
    const baseProbFactor = finalHRScoreCalculated / 100.0;
    
    // 8. Result object
    return {
        batter_name: batterName,
        batter_team: batterRosterInfo.team || 'N/A',
        pitcher_name: pitcherName,
        pitcher_team: pitcherRosterInfo.team || 'N/A',
        batter_hand: batterHand,
        pitcher_hand: pitcherHand,
        score: Math.round(finalHRScoreCalculated * 100) / 100,
        details: detailsForOutputDict,
        historical_summary: `HistCSV Bonus:${historicalYOYCSVScore.toFixed(1)}`,
        recent_summary: recentBatterStats ? 
            `RecentDaily Bonus:${recentDailyGamesScore.toFixed(1)} (Trend:${recentBatterStats.trend_metric || 'N/A'} ${recentBatterStats.trend_early_val || ''}->${recentBatterStats.trend_recent_val || ''})` :
            "No recent daily stats",
        matchup_components: {
            arsenal_matchup: Math.round(avgMatchupScoreFromArsenal * 10) / 10,
            batter_overall: Math.round(batterOverallScoreComponent * 10) / 10,
            pitcher_overall: Math.round(pitcherOverallScoreComponent * 10) / 10,
            historical_yoy_csv: Math.round(historicalYOYCSVScore * 10) / 10,
            recent_daily_games: Math.round(recentDailyGamesScore * 10) / 10,
            contextual: Math.round(contextualFactorsTotalScore * 10) / 10
        },
        outcome_probabilities: {
            homerun: Math.min(40, Math.max(0.5, baseProbFactor * 10 + batterPA2025 * 0.005)),
            hit: Math.min(60, Math.max(5, baseProbFactor * 20 + batterPA2025 * 0.02)),
            reach_base: Math.min(70, Math.max(8, baseProbFactor * 25 + batterPA2025 * 0.03)),
            strikeout: Math.max(10, Math.min(80, 70 - baseProbFactor * 15 + batterPA2025 * 0.01))
        }
    };
}