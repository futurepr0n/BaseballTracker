/**
 * Result formatting and export utilities for the Baseball HR Prediction System (JavaScript version).
 * Direct port from reporter.py to ensure output consistency.
 */

/**
 * Format a single prediction result for display.
 * Direct port of format_prediction_result from reporter.py
 */
export function formatPredictionResult(prediction, rank = null, includeDetails = true, detailedPitches = false) {
    if (!prediction) {
        return "No prediction data available.";
    }
    
    // Basic prediction info
    const prefix = rank !== null ? `${rank}. ` : "";
    const output = [
        `\n${prefix}${prediction.batter_name} (${prediction.batter_hand}) vs ${prediction.pitcher_name} (${prediction.pitcher_hand}) - HR Score: ${prediction.score.toFixed(2)}${prediction.details?.batter_pa_warning || ''}`
    ];
    
    // Team info
    output.push(`   Batter Team (Opponent): ${prediction.batter_team} | Pitcher's Team: ${prediction.pitcher_team}`);
    
    // Score components
    const compScores = prediction.matchup_components;
    output.push(`   Components: ArsenalM:${(compScores.arsenal_matchup || 0).toFixed(1)}|BatterO:${(compScores.batter_overall || 0).toFixed(1)}|PitcherO:${(compScores.pitcher_overall || 0).toFixed(1)}|HistCSV:${(compScores.historical_yoy_csv || 0).toFixed(1)}|RecentDaily:${(compScores.recent_daily_games || 0).toFixed(1)}|Context:${(compScores.contextual || 0).toFixed(1)}`);
    
    // Outcome probabilities
    const outcomeProbs = prediction.outcome_probabilities;
    output.push(`   Probabilities: HR ${(outcomeProbs.homerun || 0).toFixed(1)}% | Hit ${(outcomeProbs.hit || 0).toFixed(1)}% | Base ${(outcomeProbs.reach_base || 0).toFixed(1)}% | K ${(outcomeProbs.strikeout || 0).toFixed(1)}%`);
    
    // Detailed breakdown if requested
    if (includeDetails) {
        const contextDetails = prediction.details || {};
        
        // Due factors
        let dueFactorStr = "";
        if ('ab_since_last_hr' in contextDetails) {
            dueFactorStr += ` ABs/HR: ${contextDetails.ab_since_last_hr}/${contextDetails.expected_ab_per_hr || 'N/A'} (Raw AB Due: ${(contextDetails.due_for_hr_ab_raw_score || 0).toFixed(1)})`;
        }
        if ('h_since_last_hr' in contextDetails) {
            dueFactorStr += ` | Hits/HR: ${contextDetails.h_since_last_hr}/${contextDetails.expected_h_per_hr || 'N/A'} (Raw Hits Due: ${(contextDetails.due_for_hr_hits_raw_score || 0).toFixed(1)})`;
        }
        if (dueFactorStr) {
            output.push(`   DueFactors:${dueFactorStr}`);
        }
        
        // Contact trend
        if ('contact_trend' in contextDetails) {
            output.push(`   Contact Trend: ${contextDetails.contact_trend} (Raw Scores H:${(contextDetails.heating_up_contact_raw_score || 0).toFixed(1)}/C:${(contextDetails.cold_batter_contact_raw_score || 0).toFixed(1)})`);
        }
        
        // Historical metrics
        if (contextDetails.historical_metrics && contextDetails.historical_metrics.length > 0) {
            const histMetrics = contextDetails.historical_metrics;
            const metricsInfo = [];
            for (const metric of histMetrics) {
                metricsInfo.push(`${metric.metric} ${metric.direction} (${metric.early_value} → ${metric.recent_value})`);
            }
            output.push(`   Historical Trends: ${metricsInfo.join(', ')}`);
        }
        
        // Pitch arsenal details
        if (detailedPitches && contextDetails.arsenal_analysis) {
            const arsenal = contextDetails.arsenal_analysis;
            if (arsenal.pitch_matchups && arsenal.pitch_matchups.length > 0) {
                output.push(`\n   --- Pitch Arsenal Breakdown ---`);
                for (const pitch of arsenal.pitch_matchups) {
                    const pitchType = pitch.pitch_type;
                    const pitchName = pitch.pitch_name || pitchType;
                    const usage = pitch.usage;
                    const stats = pitch.current_year_stats || {};
                    
                    output.push(`   ${pitchName} (${pitchType}) - ${usage.toFixed(1)}% usage:`);
                    const hitterSLG = stats.hitter_slg;
                    const pitcherSLG = stats.pitcher_slg;
                    
                    if (hitterSLG !== null && hitterSLG !== undefined) {
                        output.push(`     • Batter SLG: ${hitterSLG.toFixed(3)}`);
                    }
                    if (pitcherSLG !== null && pitcherSLG !== undefined) {
                        output.push(`     • Pitcher SLG allowed: ${pitcherSLG.toFixed(3)}`);
                    }
                    
                    const hitterHH = stats.hitter_hard_hit_percent;
                    if (hitterHH !== null && hitterHH !== undefined) {
                        output.push(`     • Batter Hard Hit%: ${(hitterHH * 100).toFixed(1)}%`);
                    }
                }
            }
        }
    }
    
    return output.join("\n");
}

/**
 * Generate a more comprehensive report for a single matchup.
 * Direct port of format_detailed_matchup_report from reporter.py
 */
export function formatDetailedMatchupReport(prediction) {
    if (!prediction) {
        return "No prediction data available.";
    }
    
    const output = [
        `\n=== Detailed Matchup Analysis ===`,
        `Batter: ${prediction.batter_name} (${prediction.batter_team}) - ${prediction.batter_hand} handed`,
        `Pitcher: ${prediction.pitcher_name} (${prediction.pitcher_team}) - ${prediction.pitcher_hand} handed`,
        `HR Likelihood Score: ${prediction.score.toFixed(2)}${prediction.details?.batter_pa_warning || ''}`,
        `\n--- Score Components ---`
    ];
    
    // Score components
    const compScores = prediction.matchup_components;
    const components = [
        `• Arsenal Matchup: ${(compScores.arsenal_matchup || 0).toFixed(1)}`,
        `• Batter Overall: ${(compScores.batter_overall || 0).toFixed(1)}`,
        `• Pitcher Overall: ${(compScores.pitcher_overall || 0).toFixed(1)}`,
        `• Historical YOY CSV: ${(compScores.historical_yoy_csv || 0).toFixed(1)}`,
        `• Recent Daily Games: ${(compScores.recent_daily_games || 0).toFixed(1)}`,
        `• Contextual Factors: ${(compScores.contextual || 0).toFixed(1)}`
    ];
    output.push(...components);
    
    // Outcome probabilities
    output.push(`\n--- Outcome Probabilities ---`);
    const probs = prediction.outcome_probabilities;
    output.push(...[
        `• Home Run: ${(probs.homerun || 0).toFixed(1)}%`,
        `• Any Hit: ${(probs.hit || 0).toFixed(1)}%`,
        `• Reach Base: ${(probs.reach_base || 0).toFixed(1)}%`,
        `• Strikeout: ${(probs.strikeout || 0).toFixed(1)}%`
    ]);
    
    // Historical analysis
    const contextDetails = prediction.details || {};
    if (contextDetails.historical_metrics && contextDetails.historical_metrics.length > 0) {
        output.push(`\n--- Historical Trends ---`);
        const histMetrics = contextDetails.historical_metrics;
        for (const metric of histMetrics) {
            output.push(`• ${metric.metric.toUpperCase()}: ${metric.direction.charAt(0).toUpperCase() + metric.direction.slice(1)} from ${metric.early_value} to ${metric.recent_value} (change: ${metric.magnitude.toFixed(3)})`);
        }
    }
    
    // Due factors
    output.push(`\n--- HR Due Factors ---`);
    if ('ab_since_last_hr' in contextDetails) {
        output.push(`• At Bats Since Last HR: ${contextDetails.ab_since_last_hr} (Expected: ${contextDetails.expected_ab_per_hr || 'N/A'})`);
        output.push(`  Due Factor Score: ${(contextDetails.due_for_hr_ab_raw_score || 0).toFixed(1)}`);
    }
    if ('h_since_last_hr' in contextDetails) {
        output.push(`• Hits Since Last HR: ${contextDetails.h_since_last_hr} (Expected: ${contextDetails.expected_h_per_hr || 'N/A'})`);
        output.push(`  Due Factor Score: ${(contextDetails.due_for_hr_hits_raw_score || 0).toFixed(1)}`);
    }
    
    // Contact trend
    if ('contact_trend' in contextDetails) {
        output.push(`\n--- Recent Contact Analysis ---`);
        output.push(`• Status: ${contextDetails.contact_trend}`);
        output.push(`• Heating Up Score: ${(contextDetails.heating_up_contact_raw_score || 0).toFixed(1)}`);
        output.push(`• Cold Batter Score: ${(contextDetails.cold_batter_contact_raw_score || 0).toFixed(1)}`);
    }
    
    return output.join("\n");
}

/**
 * Create a CSV-compatible data structure from predictions
 * Direct port of create_predictions_csv_enhanced from debug_main.py
 */
export function createPredictionsCSVData(predictions) {
    if (!predictions || predictions.length === 0) {
        console.log("No predictions to process for CSV");
        return [];
    }
    
    console.log(`Creating CSV data for ${predictions.length} predictions`);
    const summaryData = [];
    
    for (let rankIndex = 0; rankIndex < predictions.length; rankIndex++) {
        const predData = predictions[rankIndex];
        console.log(`Processing prediction ${rankIndex + 1} for CSV`);
        
        const details = predData.details || {};
        const recentData = predData.recent_N_games_raw_data || {};
        const recentTrends = recentData.trends_summary_obj || {};
        
        // Get pitcher recent data if available (from enhanced analysis)
        const pitcherData = predData.pitcher_recent_data || {};
        const pitcherTrends = pitcherData.trends_summary_obj || {};
        
        const csvRow = {
            Rank: rankIndex + 1,
            Batter: predData.batter_name,
            Batter_Team: predData.batter_team,
            B_Hand: predData.batter_hand,
            Pitcher: predData.pitcher_name,
            Pitcher_Team: predData.pitcher_team,
            P_Hand: predData.pitcher_hand,
            HR_Score: predData.score,
            PA_2025: details.batter_pa_2025 || 0,
            HR_Prob: predData.outcome_probabilities.homerun,
            Hit_Prob: predData.outcome_probabilities.hit,
            OB_Prob: predData.outcome_probabilities.reach_base,
            K_Prob: predData.outcome_probabilities.strikeout,
            
            // Existing batter columns
            AB_since_HR: details.ab_since_last_hr || 'N/A',
            Exp_AB_HR: details.expected_ab_per_hr || 'N/A',
            AB_Due_Score: details.due_for_hr_ab_raw_score || 'N/A',
            H_since_HR: details.h_since_last_hr || 'N/A',
            Exp_H_HR: details.expected_h_per_hr || 'N/A',
            H_Due_Score: details.due_for_hr_hits_raw_score || 'N/A',
            Contact_Trend: details.contact_trend || 'N/A',
            Heat_Score: details.heating_up_contact_raw_score || 'N/A',
            Cold_Score: details.cold_batter_contact_raw_score || 'N/A',
            ISO_2024: details.iso_2024 || 'N/A',
            ISO_2025: details.iso_2025_adj_for_trend || 'N/A',
            ISO_Trend: details.iso_trend_2025v2024 || 'N/A',
            Recent_Trend_Dir: recentTrends.trend_direction || 'N/A',
            Recent_HR_Rate: recentTrends.hr_rate || 'N/A',
            Recent_AVG: recentTrends.avg_avg || 'N/A',
            Recent_Games: recentTrends.total_games || 'N/A',
            
            // Pitcher columns (enhanced)
            Pitcher_Trend_Dir: pitcherTrends.trend_direction || 'N/A',
            Pitcher_Recent_ERA: pitcherTrends.avg_era != null ? Math.round(pitcherTrends.avg_era * 1000) / 1000 : 'N/A',
            Pitcher_Recent_WHIP: pitcherTrends.avg_whip != null ? Math.round(pitcherTrends.avg_whip * 1000) / 1000 : 'N/A',
            Pitcher_H_Per_Game: pitcherTrends.h_per_game != null ? Math.round(pitcherTrends.h_per_game * 10) / 10 : 'N/A',
            Pitcher_HR_Per_Game: pitcherTrends.hr_per_game != null ? Math.round(pitcherTrends.hr_per_game * 10) / 10 : 'N/A',
            Pitcher_K_Per_Game: pitcherTrends.k_per_game != null ? Math.round(pitcherTrends.k_per_game * 10) / 10 : 'N/A',
            
            // Home totals
            Pitcher_Home_H_Total: pitcherTrends.home_stats?.h || 'N/A',
            Pitcher_Home_HR_Total: pitcherTrends.home_stats?.hr || 'N/A',
            Pitcher_Home_K_Total: pitcherTrends.home_stats?.k || 'N/A',
            
            // Away totals
            Pitcher_Away_H_Total: pitcherTrends.away_stats?.h || 'N/A',
            Pitcher_Away_HR_Total: pitcherTrends.away_stats?.hr || 'N/A',
            Pitcher_Away_K_Total: pitcherTrends.away_stats?.k || 'N/A',
            
            // Home per-game averages
            Pitcher_Home_H_Per_Game: pitcherTrends.home_h_per_game != null ? Math.round(pitcherTrends.home_h_per_game * 10) / 10 : 'N/A',
            Pitcher_Home_HR_Per_Game: pitcherTrends.home_hr_per_game != null ? Math.round(pitcherTrends.home_hr_per_game * 10) / 10 : 'N/A',
            Pitcher_Home_K_Per_Game: pitcherTrends.home_k_per_game != null ? Math.round(pitcherTrends.home_k_per_game * 10) / 10 : 'N/A',
            
            // Away per-game averages
            Pitcher_Away_H_Per_Game: pitcherTrends.away_h_per_game != null ? Math.round(pitcherTrends.away_h_per_game * 10) / 10 : 'N/A',
            Pitcher_Away_HR_Per_Game: pitcherTrends.away_hr_per_game != null ? Math.round(pitcherTrends.away_hr_per_game * 10) / 10 : 'N/A',
            Pitcher_Away_K_Per_Game: pitcherTrends.away_k_per_game != null ? Math.round(pitcherTrends.away_k_per_game * 10) / 10 : 'N/A',
            
            // Game counts
            Pitcher_Recent_Games: pitcherTrends.total_games || 'N/A',
            Pitcher_Home_Games: pitcherTrends.home_stats?.games || 'N/A',
            Pitcher_Away_Games: pitcherTrends.away_stats?.games || 'N/A'
        };
        
        // Add arsenal analysis metrics if available
        const arsenalSummary = details.arsenal_analysis?.overall_summary_metrics || {};
        if (Object.keys(arsenalSummary).length > 0) {
            csvRow.H_Wtd_SLG_vs_Ars = arsenalSummary.hitter_avg_slg || 'N/A';
            csvRow.P_Wtd_SLG_A_w_Ars = arsenalSummary.pitcher_avg_slg || 'N/A';
        }
        
        // Add component scores
        const components = predData.matchup_components || {};
        for (const [compName, compValue] of Object.entries(components)) {
            csvRow[`Comp_${compName}`] = compValue;
        }
        
        summaryData.push(csvRow);
    }
    
    console.log(`Created CSV data with ${summaryData.length} rows and ${Object.keys(summaryData[0] || {}).length} columns`);
    return summaryData;
}

/**
 * Convert CSV data to CSV string format
 */
export function convertToCSVString(csvData) {
    if (!csvData || csvData.length === 0) {
        return '';
    }
    
    const headers = Object.keys(csvData[0]);
    const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
            headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    return csvContent;
}

/**
 * Download CSV data as a file
 */
export function downloadCSV(csvData, filename) {
    const csvString = convertToCSVString(csvData);
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Print top predictions to console
 * Direct port of print_top_predictions from reporter.py
 */
export function printTopPredictions(predictions, limit = 15, detailed = false) {
    if (!predictions || predictions.length === 0) {
        console.log("No predictions to display.");
        return;
    }
    
    console.log(`\n=== Top ${Math.min(limit, predictions.length)} HR Predictions ===`);
    console.log("=".repeat(70));
    
    for (let i = 0; i < Math.min(limit, predictions.length); i++) {
        const pred = predictions[i];
        if (detailed) {
            console.log(formatDetailedMatchupReport(pred));
            console.log("-".repeat(70));
        } else {
            console.log(formatPredictionResult(pred, i + 1));
            console.log("-".repeat(70));
        }
    }
    
    // Print summary of total predictions
    if (predictions.length > limit) {
        console.log(`\nDisplayed top ${limit} of ${predictions.length} total predictions. Check the CSV output for complete results.`);
    }
}

/**
 * Sort predictions by specified criteria
 * Direct port of sort_predictions from sort_utils.py
 */
export function sortPredictions(predictions, sortBy = 'score', ascending = false) {
    if (!predictions || predictions.length === 0) {
        return [];
    }
    
    const getSortKey = (prediction, sortBy) => {
        // Always default to 0 for missing values to avoid errors
        if (sortBy === 'score') {
            return prediction.score || 0;
        }
        
        // Outcome probabilities
        if (sortBy === 'hr' || sortBy === 'homerun') {
            return prediction.outcome_probabilities?.homerun || 0;
        }
        if (sortBy === 'hit') {
            return prediction.outcome_probabilities?.hit || 0;
        }
        if (sortBy === 'base' || sortBy === 'reach_base') {
            return prediction.outcome_probabilities?.reach_base || 0;
        }
        if (sortBy === 'k' || sortBy === 'strikeout') {
            // For strikeout, lower is better for batters, so return negative value for proper sorting
            return -(prediction.outcome_probabilities?.strikeout || 0);
        }
        
        // Component scores
        if (sortBy === 'arsenal' || sortBy === 'arsenal_matchup') {
            return prediction.matchup_components?.arsenal_matchup || 0;
        }
        if (sortBy === 'batter' || sortBy === 'batter_overall') {
            return prediction.matchup_components?.batter_overall || 0;
        }
        if (sortBy === 'pitcher' || sortBy === 'pitcher_overall') {
            return prediction.matchup_components?.pitcher_overall || 0;
        }
        if (sortBy === 'historical' || sortBy === 'historical_yoy_csv') {
            return prediction.matchup_components?.historical_yoy_csv || 0;
        }
        if (sortBy === 'recent' || sortBy === 'recent_daily_games') {
            return prediction.matchup_components?.recent_daily_games || 0;
        }
        if (sortBy === 'contextual') {
            return prediction.matchup_components?.contextual || 0;
        }
        
        // Default to score if unknown sort key
        return prediction.score || 0;
    };
    
    // Create a list of (prediction, sort_key) tuples
    const predictionsWithKeys = predictions.map(pred => [pred, getSortKey(pred, sortBy)]);
    
    // Sort by the extracted keys
    const sortedWithKeys = predictionsWithKeys.sort((a, b) => {
        const aVal = a[1] || 0;
        const bVal = b[1] || 0;
        return ascending ? aVal - bVal : bVal - aVal;
    });
    
    // Extract just the predictions from the sorted list
    return sortedWithKeys.map(([pred, _]) => pred);
}

/**
 * Get a human-readable description of the sort criteria
 * Direct port of get_sort_description from sort_utils.py
 */
export function getSortDescription(sortBy) {
    const descriptions = {
        'score': 'Overall HR Score',
        'homerun': 'HR Probability',
        'hr': 'HR Probability',
        'hit': 'Hit Probability',
        'base': 'Reach Base Probability',
        'reach_base': 'Reach Base Probability',
        'k': 'Strikeout Probability (lowest first)',
        'strikeout': 'Strikeout Probability (lowest first)',
        'arsenal': 'Arsenal Matchup Component',
        'arsenal_matchup': 'Arsenal Matchup Component',
        'batter': 'Batter Overall Component',
        'batter_overall': 'Batter Overall Component',
        'pitcher': 'Pitcher Overall Component',
        'pitcher_overall': 'Pitcher Overall Component',
        'historical': 'Historical Trend Component',
        'historical_yoy_csv': 'Historical Trend Component',
        'recent': 'Recent Performance Component',
        'recent_daily_games': 'Recent Performance Component',
        'contextual': 'Contextual Factors Component'
    };
    
    return descriptions[sortBy] || `Custom Sort (${sortBy})`;
}