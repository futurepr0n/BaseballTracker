// EnhancedCSVGenerator.js
// Generates CSV output matching Python script's 58-column format

export const createEnhancedPredictionsCSV = (predictions) => {
  if (!predictions || predictions.length === 0) {
    console.log("No predictions to save to CSV");
    return null;
  }
  
  console.log(`Creating enhanced CSV for ${predictions.length} predictions`);
  const csvRows = [];
  
  // Header row - must match Python output exactly
  const headers = [
    'Rank', 'Batter', 'Batter_Team', 'B_Hand', 'Pitcher', 'Pitcher_Team', 'P_Hand',
    'HR_Score', 'PA_2025', 'HR_Prob', 'Hit_Prob', 'OB_Prob', 'K_Prob',
    'AB_since_HR', 'Exp_AB_HR', 'AB_Due_Score', 'H_since_HR', 'Exp_H_HR', 'H_Due_Score',
    'Contact_Trend', 'Heat_Score', 'Cold_Score',
    'ISO_2024', 'ISO_2025', 'ISO_Trend',
    'Recent_Trend_Dir', 'Recent_HR_Rate', 'Recent_AVG', 'Recent_Games',
    // Pitcher columns
    'Pitcher_Trend_Dir', 'Pitcher_Recent_ERA', 'Pitcher_Recent_WHIP',
    'Pitcher_H_Per_Game', 'Pitcher_HR_Per_Game', 'Pitcher_K_Per_Game',
    'Pitcher_Home_H_Total', 'Pitcher_Home_HR_Total', 'Pitcher_Home_K_Total',
    'Pitcher_Away_H_Total', 'Pitcher_Away_HR_Total', 'Pitcher_Away_K_Total',
    'Pitcher_Home_H_Per_Game', 'Pitcher_Home_HR_Per_Game', 'Pitcher_Home_K_Per_Game',
    'Pitcher_Away_H_Per_Game', 'Pitcher_Away_HR_Per_Game', 'Pitcher_Away_K_Per_Game',
    'Pitcher_Recent_Games', 'Pitcher_Home_Games', 'Pitcher_Away_Games',
    // Arsenal columns
    'H_Wtd_SLG_vs_Ars', 'P_Wtd_SLG_A_w_Ars',
    // Component columns
    'Comp_arsenal_matchup', 'Comp_batter_overall', 'Comp_pitcher_overall',
    'Comp_historical_yoy_csv', 'Comp_recent_daily_games', 'Comp_contextual'
  ];
  
  csvRows.push(headers);
  
  // Process each prediction
  predictions.forEach((pred, index) => {
    const details = pred.details || {};
    const recentData = pred.recent_N_games_raw_data || {};
    const recentTrends = recentData.trends_summary_obj || {};
    
    // Get pitcher recent data
    const pitcherData = pred.pitcher_recent_data || {};
    const pitcherTrends = pitcherData.trends_summary_obj || {};
    
    console.log(`Processing prediction ${index + 1} for CSV`);
    console.log(`Pitcher trend direction: ${pitcherTrends.trend_direction || 'NOT_FOUND'}`);
    
    const row = [
      index + 1, // Rank
      pred.batter_name || pred.batterName,
      pred.batter_team || pred.batterTeam,
      pred.batter_hand || pred.batterHand || 'R',
      pred.pitcher_name || pred.pitcherName,
      pred.pitcher_team || pred.pitcherTeam,
      pred.pitcher_hand || pred.pitcherHand || 'R',
      formatNumber(pred.score, 2),
      details.batter_pa_2025 || details.pa2025 || 0,
      formatNumber(pred.outcome_probabilities?.homerun || 0, 1),
      formatNumber(pred.outcome_probabilities?.hit || 0, 1),
      formatNumber(pred.outcome_probabilities?.reach_base || 0, 1),
      formatNumber(pred.outcome_probabilities?.strikeout || 0, 1),
      details.ab_since_last_hr !== undefined ? details.ab_since_last_hr : 'N/A',
      details.expected_ab_per_hr !== undefined ? formatNumber(details.expected_ab_per_hr, 1) : 'N/A',
      details.due_for_hr_ab_raw_score !== undefined ? formatNumber(details.due_for_hr_ab_raw_score, 1) : 'N/A',
      details.h_since_last_hr !== undefined ? details.h_since_last_hr : 'N/A',
      details.expected_h_per_hr !== undefined ? formatNumber(details.expected_h_per_hr, 1) : 'N/A',
      details.due_for_hr_hits_raw_score !== undefined ? formatNumber(details.due_for_hr_hits_raw_score, 1) : 'N/A',
      details.contact_trend || 'N/A',
      details.heating_up_contact_raw_score !== undefined ? formatNumber(details.heating_up_contact_raw_score, 0) : 'N/A',
      details.cold_batter_contact_raw_score !== undefined ? formatNumber(details.cold_batter_contact_raw_score, 0) : 'N/A',
      details.iso_2024 !== undefined ? formatNumber(details.iso_2024, 3) : 'N/A',
      details.iso_2025_adj_for_trend !== undefined ? formatNumber(details.iso_2025_adj_for_trend, 3) : 'N/A',
      details.iso_trend_2025v2024 !== undefined ? formatNumber(details.iso_trend_2025v2024, 3) : 'N/A',
      recentTrends.trend_direction || 'N/A',
      recentTrends.hr_rate !== undefined ? formatNumber(recentTrends.hr_rate, 3) : 'N/A',
      recentTrends.avg_avg !== undefined ? formatNumber(recentTrends.avg_avg, 3) : 'N/A',
      recentTrends.total_games || 'N/A',
      // Pitcher columns
      pitcherTrends.trend_direction || 'N/A',
      pitcherTrends.avg_era !== undefined ? formatNumber(pitcherTrends.avg_era, 3) : 'N/A',
      pitcherTrends.avg_whip !== undefined ? formatNumber(pitcherTrends.avg_whip, 3) : 'N/A',
      pitcherTrends.h_per_game !== undefined ? formatNumber(pitcherTrends.h_per_game, 1) : 'N/A',
      pitcherTrends.hr_per_game !== undefined ? formatNumber(pitcherTrends.hr_per_game, 1) : 'N/A',
      pitcherTrends.k_per_game !== undefined ? formatNumber(pitcherTrends.k_per_game, 1) : 'N/A',
      pitcherTrends.home_stats?.h || 'N/A',
      pitcherTrends.home_stats?.hr || 'N/A',
      pitcherTrends.home_stats?.k || 'N/A',
      pitcherTrends.away_stats?.h || 'N/A',
      pitcherTrends.away_stats?.hr || 'N/A',
      pitcherTrends.away_stats?.k || 'N/A',
      pitcherTrends.home_h_per_game !== undefined ? formatNumber(pitcherTrends.home_h_per_game, 1) : 'N/A',
      pitcherTrends.home_hr_per_game !== undefined ? formatNumber(pitcherTrends.home_hr_per_game, 1) : 'N/A',
      pitcherTrends.home_k_per_game !== undefined ? formatNumber(pitcherTrends.home_k_per_game, 1) : 'N/A',
      pitcherTrends.away_h_per_game !== undefined ? formatNumber(pitcherTrends.away_h_per_game, 1) : 'N/A',
      pitcherTrends.away_hr_per_game !== undefined ? formatNumber(pitcherTrends.away_hr_per_game, 1) : 'N/A',
      pitcherTrends.away_k_per_game !== undefined ? formatNumber(pitcherTrends.away_k_per_game, 1) : 'N/A',
      pitcherTrends.total_games || 'N/A',
      pitcherTrends.home_stats?.games || 'N/A',
      pitcherTrends.away_stats?.games || 'N/A',
      // Arsenal columns
      details.arsenal_analysis?.overall_summary_metrics?.hitter_avg_slg !== undefined ? 
        formatNumber(details.arsenal_analysis.overall_summary_metrics.hitter_avg_slg, 3) : 'N/A',
      details.arsenal_analysis?.overall_summary_metrics?.pitcher_avg_slg !== undefined ? 
        formatNumber(details.arsenal_analysis.overall_summary_metrics.pitcher_avg_slg, 3) : 'N/A',
      // Component columns
      pred.matchup_components?.arsenal_matchup !== undefined ? 
        formatNumber(pred.matchup_components.arsenal_matchup, 1) : 'N/A',
      pred.matchup_components?.batter_overall !== undefined ? 
        formatNumber(pred.matchup_components.batter_overall, 1) : 'N/A',
      pred.matchup_components?.pitcher_overall !== undefined ? 
        formatNumber(pred.matchup_components.pitcher_overall, 1) : 'N/A',
      pred.matchup_components?.historical_yoy_csv !== undefined ? 
        formatNumber(pred.matchup_components.historical_yoy_csv, 1) : 'N/A',
      pred.matchup_components?.recent_daily_games !== undefined ? 
        formatNumber(pred.matchup_components.recent_daily_games, 0) : 'N/A',
      pred.matchup_components?.contextual !== undefined ? 
        formatNumber(pred.matchup_components.contextual, 1) : 'N/A'
    ];
    
    csvRows.push(row);
  });
  
  // Convert to CSV string
  const csvString = csvRows.map(row => 
    row.map(cell => {
      // Handle cells that might contain commas
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
  
  return csvString;
};

// Helper function to format numbers consistently
const formatNumber = (value, decimals) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return Number(value).toFixed(decimals);
};

// Export to CSV file
export const downloadCSV = (csvString, filename) => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};