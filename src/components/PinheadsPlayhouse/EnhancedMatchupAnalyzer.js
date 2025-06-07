// EnhancedMatchupAnalyzer.js
// Complete matchup analysis matching Python's enhanced_hr_likelihood_score

import { getLastNGamesPitcher, calculatePitcherRecentTrends } from './PitcherAnalysis';
import { 
  calculateRecentTrends, 
  getLastNGamesPerformance,
  findPlayerIdByName,
  cleanPlayerName,
  normalizeCalculated,
  adjustStatWithConfidence,
  getApproximatedPA
} from './dataUtils';
import { 
  analyzePitchArsenalMatchup,
  analyzeHistoricalTrendsGeneral,
  calculateGeneralHistoricalBonus,
  calculateRecentPerformanceBonus
} from './ArsenalAnalysis';

// Component weights matching Python
const WEIGHTS = {
  batter_vs_pitch_slg: 1.5,
  batter_vs_pitch_hr: 2.0,
  batter_vs_pitch_hard_hit: 1.0,
  batter_batted_ball_fb: 0.8,
  batter_batted_ball_pull_air: 1.2,
  pitcher_vulnerability_slg: 1.2,
  pitcher_vulnerability_hr: 1.8,
  pitcher_vulnerability_hard_hit: 0.8,
  pitcher_run_value_penalty: 1.0,
  batter_overall_brl_percent: 2.5,
  batter_overall_hard_hit: 1.2,
  batter_overall_iso: 1.5,
  pitcher_overall_brl_percent_allowed: 2.0,
  pitcher_overall_hard_hit_allowed: 1.0,
  historical_trend_bonus: 0.7,
  historical_consistency_bonus: 0.3,
  recent_performance_bonus: 1.5,
  ev_matchup_bonus: 1.0,
  due_for_hr_factor: 0.5,
  due_for_hr_hits_factor: 0.3,
  heating_up_contact_factor: 0.4,
  cold_batter_factor: 0.4,
  hitter_pitch_rv_advantage: 0.8,
  hitter_pitch_k_avoidance: 0.4,
  pitcher_pitch_k_ability: 0.4,
  trend_2025_vs_2024_bonus: 0.8,
};

// Component weights for final score
const W_ARSENAL_MATCHUP = 0.40;
const W_BATTER_OVERALL = 0.15;
const W_PITCHER_OVERALL = 0.10;
const W_HISTORICAL_YOY_CSV = 0.05;
const W_RECENT_DAILY_GAMES = 0.10;
const W_CONTEXTUAL = 0.20;

// Constants
const DEFAULT_EXPECTED_H_PER_HR = 10.0;
const MIN_RECENT_PA_FOR_CONTACT_EVAL = 20;
const K_PA_WARNING_THRESHOLD = 50;
const K_CONFIDENCE_PA = 100;

export const processPitcherVsTeam = async (
  pitcherName, teamAbbr, 
  masterPlayerData, nameToPlayerIdMap, dailyGameData,
  rostersData, historicalData, leagueAvgStats, metricRanges
) => {
  console.log(`Processing enhanced analysis: ${pitcherName} vs ${teamAbbr}`);
  
  // Find pitcher
  const pitcherId = findPlayerIdByName(pitcherName, 'pitcher', masterPlayerData, nameToPlayerIdMap);
  if (!pitcherId || !masterPlayerData[pitcherId]) {
    console.error(`Pitcher '${pitcherName}' not found`);
    return [];
  }
  
  const pitcherMasterInfo = masterPlayerData[pitcherId];
  const pitcherRosterInfo = pitcherMasterInfo.roster_info || {};
  const pitcherResolvedName = pitcherRosterInfo.fullName_resolved || pitcherName;
  const pitcherTeam = pitcherRosterInfo.team;
  
  console.log(`Pitcher resolved name: ${pitcherResolvedName}, team: ${pitcherTeam}`);
  
  // Get pitcher recent performance
  let pitcherGames = [];
  let pitcherRecentTrends = {};
  
  try {
    pitcherGames = getLastNGamesPitcher(pitcherResolvedName, dailyGameData, rostersData);
    if (pitcherGames.length > 0) {
      pitcherRecentTrends = calculatePitcherRecentTrends(pitcherGames);
      console.log(`Successfully calculated pitcher trends: ${pitcherGames.length} games`);
      console.log(`Pitcher trend direction: ${pitcherRecentTrends.trend_direction || 'N/A'}`);
    } else {
      console.log(`No pitcher games found for ${pitcherResolvedName}`);
    }
  } catch (error) {
    console.error(`Error getting pitcher trends:`, error);
  }
  
  // Check if team exists
  const teamExists = Object.values(masterPlayerData).some(
    pInfo => pInfo.roster_info?.team === teamAbbr
  );
  
  if (!teamExists && teamAbbr) {
    console.warn(`Warning: Team '${teamAbbr}' not found in roster data.`);
  }
  
  if (pitcherTeam === teamAbbr) {
    console.warn(`Warning: Pitcher ${pitcherResolvedName} is on the same team (${teamAbbr}) being analyzed against.`);
  }
  
  console.log(`\nAnalyzing ${pitcherResolvedName} (Team: ${pitcherTeam}) vs ${teamAbbr} hitters...`);
  
  if (pitcherRecentTrends && pitcherRecentTrends.total_games > 0) {
    console.log(`Pitcher recent trends: ${pitcherRecentTrends.total_games} games`);
    console.log(`  ERA: ${pitcherRecentTrends.avg_era?.toFixed(3) || 'N/A'}, H/game: ${pitcherRecentTrends.h_per_game?.toFixed(1) || 'N/A'}, HR/game: ${pitcherRecentTrends.hr_per_game?.toFixed(1) || 'N/A'}, K/game: ${pitcherRecentTrends.k_per_game?.toFixed(1) || 'N/A'}`);
  }
  
  const predictions = [];
  let hittersFound = 0;
  
  // Process each hitter on the opposing team
  for (const [batterId, batterData] of Object.entries(masterPlayerData)) {
    const batterRosterInfo = batterData.roster_info || {};
    
    if (batterRosterInfo.type === 'hitter' && batterRosterInfo.team === teamAbbr) {
      hittersFound++;
      const batterFullName = batterRosterInfo.fullName_resolved || batterRosterInfo.fullName_cleaned;
      
      console.log(`Processing hitter: ${batterFullName} (ID: ${batterId})`);
      
      try {
        // Get batter recent performance
        const batterGames = getLastNGamesPerformance(batterFullName, dailyGameData, rostersData);
        console.log(`Found ${batterGames.length} recent games for ${batterFullName}`);
        
        const batterRecentTrends = calculateRecentTrends(batterGames);
        
        // Calculate enhanced HR likelihood
        const prediction = enhancedHRLikelihoodScore(
          batterId, pitcherId,
          masterPlayerData, historicalData, metricRanges, leagueAvgStats,
          batterRecentTrends
        );
        
        if (prediction && prediction.score > 0) {
          // Add recent game data
          prediction.recent_N_games_raw_data = {
            games_list: batterGames.slice(0, 5),
            trends_summary_obj: batterRecentTrends,
            at_bats: [] // Simplified for now
          };
          
          // Add pitcher recent data
          prediction.pitcher_recent_data = {
            games_list: pitcherGames.slice(0, 5),
            trends_summary_obj: pitcherRecentTrends
          };
          
          console.log(`Added prediction for ${batterFullName} with score ${prediction.score}`);
          predictions.push(prediction);
        } else {
          console.log(`No valid prediction for ${batterFullName}`);
        }
      } catch (error) {
        console.error(`Error processing hitter ${batterFullName}:`, error);
      }
    }
  }
  
  console.log(`Found and analyzed ${hittersFound} hitters from ${teamAbbr}. Generated ${predictions.length} predictions.`);
  
  // Sort by score
  predictions.sort((a, b) => b.score - a.score);
  return predictions;
};

const enhancedHRLikelihoodScore = (
  batterMlbamId, pitcherMlbamId,
  masterPlayerData, historicalData, metricRanges, leagueAvgStats,
  recentBatterStats = null
) => {
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
  const batterPa2025 = batterStats2025Agg.PA_approx || 0;
  
  const batterPaWarningMsg = batterPa2025 < K_PA_WARNING_THRESHOLD ? ` (Low PA_2025: ${batterPa2025})` : "";
  const details = {
    batter_pa_2025: batterPa2025,
    batter_pa_warning: batterPaWarningMsg
  };
  
  // 1. Arsenal analysis
  const arsenalAnalysisResult = analyzePitchArsenalMatchup(batterMlbamId, pitcherMlbamId, masterPlayerData);
  details.arsenal_analysis = arsenalAnalysisResult;
  
  let avgMatchupScoreFromArsenal = 0;
  if (!arsenalAnalysisResult.error && arsenalAnalysisResult.pitch_matchups?.length > 0) {
    const hitterWeightedSlg = arsenalAnalysisResult.overall_summary_metrics?.hitter_avg_slg;
    const pitcherWeightedSlg = arsenalAnalysisResult.overall_summary_metrics?.pitcher_avg_slg;
    
    if (hitterWeightedSlg !== null && hitterWeightedSlg !== undefined &&
        pitcherWeightedSlg !== null && pitcherWeightedSlg !== undefined) {
      const normHSlg = normalizeCalculated(hitterWeightedSlg, 'slg', metricRanges, 100, true);
      const normPSlg = normalizeCalculated(pitcherWeightedSlg, 'slg', metricRanges, 100, true);
      avgMatchupScoreFromArsenal = (normHSlg * 0.6 + normPSlg * 0.4);
    } else {
      avgMatchupScoreFromArsenal = 30;
    }
  } else {
    avgMatchupScoreFromArsenal = 25;
  }
  
  // 2. Batter overall evaluation
  let batterOverallScoreComponent = 0;
  const hitterOverallEvStats = batterData.hitter_overall_ev_stats || {};
  
  if (hitterOverallEvStats && typeof hitterOverallEvStats === 'object') {
    const isoOverallAdj = adjustStatWithConfidence(
      hitterOverallEvStats.iso_percent,
      batterPa2025,
      'ISO',
      leagueAvgStats,
      K_CONFIDENCE_PA,
      leagueAvgStats.ISO
    );
    
    const brlOverallRaw = hitterOverallEvStats.brl_percent !== null && hitterOverallEvStats.brl_percent !== undefined
      ? hitterOverallEvStats.brl_percent / 100.0 
      : leagueAvgStats.AVG_BRL_PERCENT;
    
    const hhOverallRaw = hitterOverallEvStats.hard_hit_percent !== null && hitterOverallEvStats.hard_hit_percent !== undefined
      ? hitterOverallEvStats.hard_hit_percent / 100.0 
      : leagueAvgStats.AVG_HARD_HIT_PERCENT;
    
    batterOverallScoreComponent += WEIGHTS.batter_overall_iso * normalizeCalculated(isoOverallAdj, 'iso', metricRanges);
    batterOverallScoreComponent += WEIGHTS.batter_overall_brl_percent * normalizeCalculated(brlOverallRaw, 'brl_percent', metricRanges);
    batterOverallScoreComponent += WEIGHTS.batter_overall_hard_hit * normalizeCalculated(hhOverallRaw, 'hard_hit_percent', metricRanges);
    
    details.batter_overall_adj_iso = Math.round((isoOverallAdj !== null && isoOverallAdj !== undefined ? isoOverallAdj : 0) * 1000) / 1000;
    details.batter_overall_brl = Math.round(brlOverallRaw * 1000) / 1000;
    details.batter_overall_hh = Math.round(hhOverallRaw * 1000) / 1000;
  }
  
  // 3. Pitcher overall evaluation
  let pitcherOverallScoreComponent = 0;
  const pitcherOverallEvStats = pitcherData.pitcher_overall_ev_stats || {};
  
  if (pitcherOverallEvStats && typeof pitcherOverallEvStats === 'object') {
    const brlAllowedRaw = pitcherOverallEvStats.brl_percent !== null && pitcherOverallEvStats.brl_percent !== undefined
      ? pitcherOverallEvStats.brl_percent / 100.0 
      : leagueAvgStats.AVG_BRL_PERCENT;
    
    const hhAllowedRaw = pitcherOverallEvStats.hard_hit_percent !== null && pitcherOverallEvStats.hard_hit_percent !== undefined
      ? pitcherOverallEvStats.hard_hit_percent / 100.0 
      : leagueAvgStats.AVG_HARD_HIT_PERCENT;
    
    pitcherOverallScoreComponent += WEIGHTS.pitcher_overall_brl_percent_allowed * normalizeCalculated(brlAllowedRaw, 'brl_percent', metricRanges, 100, true);
    pitcherOverallScoreComponent += WEIGHTS.pitcher_overall_hard_hit_allowed * normalizeCalculated(hhAllowedRaw, 'hard_hit_percent', metricRanges, 100, true);
    
    details.pitcher_overall_brl_allowed = Math.round(brlAllowedRaw * 1000) / 1000;
    details.pitcher_overall_hh_allowed = Math.round(hhAllowedRaw * 1000) / 1000;
  }
  
  // 4. Historical year-over-year analysis
  const historicalTrendsForHitter = analyzeHistoricalTrendsGeneral(
    String(batterMlbamId),
    historicalData,
    'hitter_arsenal',
    ['slg', 'woba'],
    null
  );
  
  const historicalYoyScore = calculateGeneralHistoricalBonus(historicalTrendsForHitter);
  
  // Collect historical metrics for display
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
  details.historical_metrics = historicalMetricsDetails;
  
  // 5. Recent performance analysis
  const recentDailyGamesScore = calculateRecentPerformanceBonus(recentBatterStats, 'hitter');
  
  // 6. Contextual factors
  let contextualFactorsTotalScore = 0;
  
  // 6a. Exit velocity matchup
  let evMatchupSubScore = 0;
  if (hitterOverallEvStats && typeof hitterOverallEvStats === 'object' && 
      pitcherOverallEvStats && typeof pitcherOverallEvStats === 'object') {
    const hHhVal = hitterOverallEvStats.hard_hit_percent || (leagueAvgStats.AVG_HARD_HIT_PERCENT * 100);
    const pHhValAllowed = pitcherOverallEvStats.hard_hit_percent || (leagueAvgStats.AVG_HARD_HIT_PERCENT * 100);
    
    const normHHh = normalizeCalculated(hHhVal / 100.0, 'hard_hit_percent', metricRanges, 100, true);
    const normPHhAllowed = normalizeCalculated(pHhValAllowed / 100.0, 'hard_hit_percent', metricRanges, 100, true);
    
    evMatchupSubScore = (normHHh * 0.6 + normPHhAllowed * 0.4) - 50;
  }
  
  contextualFactorsTotalScore += WEIGHTS.ev_matchup_bonus * (evMatchupSubScore / 50);
  details.ev_matchup_raw_score = Math.round(evMatchupSubScore * 10) / 10;
  
  // 6b. Due for HR based on AB count
  let dueForHrAbSubScore = 0;
  const stats2024Hitter = batterData.stats_2024 || {};
  const hr2024Val = stats2024Hitter.HR || 0;
  const ab2024Val = stats2024Hitter.AB || 0;
  const hr2025AggVal = batterStats2025Agg.HR || 0;
  const ab2025AggVal = batterStats2025Agg.AB || 0;
  
  let expectedHrPerAbVal = 0;
  if (hr2024Val > 0 && ab2024Val >= 50) {
    expectedHrPerAbVal = hr2024Val / ab2024Val;
  } else if (hr2025AggVal > 0 && ab2025AggVal >= 30) {
    expectedHrPerAbVal = hr2025AggVal / ab2025AggVal;
  } else {
    expectedHrPerAbVal = 1 / 45.0;
  }
  
  if (expectedHrPerAbVal > 0) {
    const abNeededForHrVal = 1 / expectedHrPerAbVal;
    const currentAbSinceHrVal = batterStats2025Agg.current_AB_since_last_HR || 0;
    
    details.ab_since_last_hr = currentAbSinceHrVal;
    details.expected_ab_per_hr = Math.round(abNeededForHrVal * 10) / 10;
    
    if (currentAbSinceHrVal > abNeededForHrVal * 1.25) {
      dueForHrAbSubScore = Math.min((currentAbSinceHrVal / abNeededForHrVal - 1.25) * 20, 25);
    }
  }
  
  contextualFactorsTotalScore += WEIGHTS.due_for_hr_factor * (dueForHrAbSubScore / 25);
  details.due_for_hr_ab_raw_score = Math.round(dueForHrAbSubScore * 10) / 10;
  
  // 6c. Due for HR based on hits count
  let dueForHrHitsSubScore = 0;
  const currentHSinceHrVal = batterStats2025Agg.current_H_since_last_HR || 0;
  let expectedHPerHrFromStats = stats2024Hitter.H_per_HR;
  
  if (expectedHPerHrFromStats === null || expectedHPerHrFromStats === undefined || 
      isNaN(expectedHPerHrFromStats) || expectedHPerHrFromStats <= 0) {
    const h2025Agg = batterStats2025Agg.H || 0;
    const hr2025Agg = batterStats2025Agg.HR || 0;
    
    if (hr2025Agg > 0) {
      expectedHPerHrFromStats = h2025Agg / hr2025Agg;
    } else {
      expectedHPerHrFromStats = DEFAULT_EXPECTED_H_PER_HR;
    }
  }
  
  details.h_since_last_hr = currentHSinceHrVal;
  details.expected_h_per_hr = Math.round(expectedHPerHrFromStats * 10) / 10;
  
  if (expectedHPerHrFromStats > 0 && currentHSinceHrVal > expectedHPerHrFromStats * 1.5) {
    dueForHrHitsSubScore = Math.min(((currentHSinceHrVal / expectedHPerHrFromStats) - 1.5) * 15, 20);
  }
  
  contextualFactorsTotalScore += WEIGHTS.due_for_hr_hits_factor * (dueForHrHitsSubScore / 20);
  details.due_for_hr_hits_raw_score = Math.round(dueForHrHitsSubScore * 10) / 10;
  
  // 6d. 2024 vs 2025 ISO trend
  let trend2025v2024SubScore = 0;
  const iso2025AdjForTrendVal = details.batter_overall_adj_iso || -1;
  
  if (ab2024Val >= 30 && batterPa2025 >= 15) {
    const iso2024Val = (stats2024Hitter.SLG || 0) - (stats2024Hitter.AVG || 0);
    
    if (iso2024Val > -0.5 && iso2025AdjForTrendVal > -0.5) {
      const isoChangeFromLastYear = iso2025AdjForTrendVal - iso2024Val;
      trend2025v2024SubScore = isoChangeFromLastYear * 150;
      
      details.iso_2024 = Math.round(iso2024Val * 1000) / 1000;
      details.iso_2025_adj_for_trend = Math.round(iso2025AdjForTrendVal * 1000) / 1000;
      details.iso_trend_2025v2024 = Math.round(isoChangeFromLastYear * 1000) / 1000;
    }
  }
  
  contextualFactorsTotalScore += WEIGHTS.trend_2025_vs_2024_bonus * (trend2025v2024SubScore / 20);
  details.trend_2025v2024_raw_score = Math.round(trend2025v2024SubScore * 10) / 10;
  
  // 6e. Contact quality trend factors
  let heatingUpContactSubScore = 0;
  let coldBatterContactSubScore = 0;
  
  if (recentBatterStats && recentBatterStats.total_pa_approx >= MIN_RECENT_PA_FOR_CONTACT_EVAL) {
    const recentHitRate = recentBatterStats.hit_rate || -1;
    const recentHrPerPa = recentBatterStats.hr_per_pa || -1;
    
    if (recentHitRate !== -1) {
      const lgAvgBatting = leagueAvgStats.AVG || 0.245;
      const playerExpectedHrRateForComparison = expectedHrPerAbVal;
      
      // The player is making good contact but not getting HRs - could be due
      if (recentHitRate > (lgAvgBatting + 0.050) &&
          recentHrPerPa !== -1 && playerExpectedHrRateForComparison > 0 &&
          recentHrPerPa < (playerExpectedHrRateForComparison * 0.4)) {
        heatingUpContactSubScore = 15;
        details.contact_trend = 'Heating Up (High Contact, Low Recent Power)';
      }
      // Player in cold streak, less likely for HR
      else if (recentHitRate < (lgAvgBatting - 0.060)) {
        coldBatterContactSubScore = -20;
        details.contact_trend = 'Cold Batter (Low Recent Contact)';
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
  
  details.heating_up_contact_raw_score = Math.round(heatingUpContactSubScore * 10) / 10;
  details.cold_batter_contact_raw_score = Math.round(coldBatterContactSubScore * 10) / 10;
  
  // 7. Final score calculation
  const finalHrScoreCalculated = (
    W_ARSENAL_MATCHUP * avgMatchupScoreFromArsenal +
    W_BATTER_OVERALL * batterOverallScoreComponent +
    W_PITCHER_OVERALL * pitcherOverallScoreComponent +
    W_HISTORICAL_YOY_CSV * historicalYoyScore +
    W_RECENT_DAILY_GAMES * recentDailyGamesScore +
    W_CONTEXTUAL * contextualFactorsTotalScore
  );
  
  const baseProbFactor = finalHrScoreCalculated / 100.0;
  
  // 8. Result object
  return {
    batter_name: batterName,
    batter_team: batterRosterInfo.team || 'N/A',
    pitcher_name: pitcherName,
    pitcher_team: pitcherRosterInfo.team || 'N/A',
    batter_hand: batterHand,
    pitcher_hand: pitcherHand,
    score: Math.round(finalHrScoreCalculated * 100) / 100,
    details: details,
    historical_summary: `HistCSV Bonus:${historicalYoyScore.toFixed(1)}`,
    recent_summary: recentBatterStats ? 
      `RecentDaily Bonus:${recentDailyGamesScore.toFixed(1)} (Trend:${recentBatterStats.trend_metric || 'N/A'} ${recentBatterStats.trend_early_val || ''}->${recentBatterStats.trend_recent_val || ''})` : 
      "No recent daily stats",
    matchup_components: {
      arsenal_matchup: Math.round(avgMatchupScoreFromArsenal * 10) / 10,
      batter_overall: Math.round(batterOverallScoreComponent * 10) / 10,
      pitcher_overall: Math.round(pitcherOverallScoreComponent * 10) / 10,
      historical_yoy_csv: Math.round(historicalYoyScore * 10) / 10,
      recent_daily_games: Math.round(recentDailyGamesScore * 10) / 10,
      contextual: Math.round(contextualFactorsTotalScore * 10) / 10
    },
    outcome_probabilities: {
      homerun: Math.min(40, Math.max(0.5, baseProbFactor * 10 + batterPa2025 * 0.005)),
      hit: Math.min(60, Math.max(5, baseProbFactor * 20 + batterPa2025 * 0.02)),
      reach_base: Math.min(70, Math.max(8, baseProbFactor * 25 + batterPa2025 * 0.03)),
      strikeout: Math.max(10, Math.min(80, 70 - baseProbFactor * 15 + batterPa2025 * 0.01))
    }
  };
};