/**
 * Batch Analysis Debugger
 * Tool to help identify why batch mode has different data structure than single mode
 */

export class BatchAnalysisDebugger {
  constructor() {
    this.logs = [];
    this.isActive = true;
  }

  log(message, data = null) {
    if (!this.isActive) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null
    };
    
    this.logs.push(logEntry);
    console.log(`🔍 BATCH DEBUG: ${message}`, data);
  }

  /**
   * Analyze a prediction object to understand its structure
   */
  analyzePredictionStructure(prediction, label = 'Prediction') {
    if (!prediction) {
      this.log(`${label}: NULL or undefined`);
      return;
    }

    const fields = Object.keys(prediction);
    const criticalFields = [
      'recent_trend_dir', 'pitcher_trend_dir', 'contact_trend', 
      'ab_since_last_hr', 'heating_up', 'cold', 'hitter_slg', 'pitcher_slg',
      'iso_2024', 'iso_2025', 'ev_matchup_score', 'pitcher_home_h_total',
      'pitcher_home_games', 'pitcher_k_per_game', 'recent_N_games_raw_data'
    ];

    const missingCriticalFields = criticalFields.filter(field => !(field in prediction));
    const presentCriticalFields = criticalFields.filter(field => field in prediction);

    this.log(`${label} structure analysis:`, {
      totalFields: fields.length,
      fields: fields.sort(),
      missingCriticalFields,
      presentCriticalFields,
      hasDashboardContext: 'dashboard_context' in prediction,
      hasRecentData: 'recent_N_games_raw_data' in prediction
    });

    // Check for signs of pre-generated vs API data
    const isLikelyPreGenerated = (
      fields.length < 50 && 
      missingCriticalFields.length > 5 &&
      !prediction.recent_N_games_raw_data
    );

    const isLikelyAPIGenerated = (
      fields.length > 60 &&
      presentCriticalFields.length > 8 &&
      prediction.recent_N_games_raw_data
    );

    this.log(`${label} data source assessment:`, {
      likelyPreGenerated: isLikelyPreGenerated,
      likelyAPIGenerated: isLikelyAPIGenerated,
      confidence: isLikelyAPIGenerated ? 'High (API)' : isLikelyPreGenerated ? 'High (Pre-generated)' : 'Unknown'
    });

    return {
      totalFields: fields.length,
      missingCriticalFields,
      presentCriticalFields,
      dataSourceLikely: isLikelyAPIGenerated ? 'API' : isLikelyPreGenerated ? 'Pre-generated' : 'Unknown'
    };
  }

  /**
   * Analyze pitcher data variation in batch mode
   */
  analyzePitcherDataVariation(predictions) {
    if (!predictions || predictions.length === 0) return;

    this.log('=== PITCHER DATA VARIATION ANALYSIS ===');
    
    const pitcherStats = {};
    const pitcherFields = [
      'pitcher_era', 'pitcher_whip', 'pitcher_k_per_game', 
      'pitcher_home_hr_total', 'pitcher_home_games', 'ev_matchup_score',
      'pitcher_slg', 'pitcher_name', 'matchup_pitcher'
    ];

    predictions.forEach((pred, index) => {
      const pitcherKey = pred.matchup_pitcher || pred.pitcher_name || 'Unknown';
      
      if (!pitcherStats[pitcherKey]) {
        pitcherStats[pitcherKey] = [];
      }
      
      const pitcherData = {};
      pitcherFields.forEach(field => {
        pitcherData[field] = pred[field];
      });
      pitcherData.player_name = pred.player_name;
      pitcherData.prediction_index = index;
      
      pitcherStats[pitcherKey].push(pitcherData);
    });

    this.log('Pitcher variation summary:', {
      uniquePitchers: Object.keys(pitcherStats).length,
      totalPredictions: predictions.length,
      predictionsPerPitcher: Object.fromEntries(
        Object.entries(pitcherStats).map(([pitcher, data]) => [pitcher, data.length])
      )
    });

    // Check for identical values across different pitchers
    const fieldsToCheck = ['pitcher_era', 'pitcher_whip', 'pitcher_k_per_game'];
    const fieldValues = {};
    
    Object.entries(pitcherStats).forEach(([pitcher, predictions]) => {
      if (predictions.length > 0) {
        fieldsToCheck.forEach(field => {
          if (!fieldValues[field]) fieldValues[field] = new Set();
          fieldValues[field].add(predictions[0][field]);
        });
      }
    });

    const suspiciousFields = [];
    fieldsToCheck.forEach(field => {
      const uniqueValues = fieldValues[field]?.size || 0;
      const expectedUniqueValues = Object.keys(pitcherStats).length;
      
      if (uniqueValues === 1 && expectedUniqueValues > 1) {
        suspiciousFields.push({
          field,
          uniqueValues,
          expectedUniqueValues,
          value: Array.from(fieldValues[field])[0]
        });
      }
    });

    if (suspiciousFields.length > 0) {
      this.log('🚨 PITCHER DATA ISSUE DETECTED:', {
        suspiciousFields,
        issue: 'Multiple pitchers showing identical stats',
        impact: 'Pitcher-specific columns will show same values for all players'
      });
    } else {
      this.log('✅ Pitcher data variation looks correct');
    }

    // Sample a few predictions to show pitcher data
    const samplePitchers = Object.entries(pitcherStats).slice(0, 3);
    samplePitchers.forEach(([pitcher, predictions]) => {
      this.log(`Pitcher sample: ${pitcher}`, {
        predictionCount: predictions.length,
        firstPlayerExample: predictions[0]?.player_name,
        pitcherStats: {
          era: predictions[0]?.pitcher_era,
          whip: predictions[0]?.pitcher_whip,
          k_per_game: predictions[0]?.pitcher_k_per_game,
          ev_matchup: predictions[0]?.ev_matchup_score
        }
      });
    });
  }

  /**
   * Compare single vs batch prediction structures
   */
  compareModes(singlePredictions, batchPredictions) {
    this.log('=== MODE COMPARISON ANALYSIS ===');
    
    if (!singlePredictions || !batchPredictions) {
      this.log('Cannot compare - missing prediction data', {
        hasSingle: !!singlePredictions,
        hasBatch: !!batchPredictions
      });
      return;
    }

    const singleFirst = singlePredictions[0];
    const batchFirst = batchPredictions[0];

    this.log('Analyzing first prediction from each mode...');
    
    const singleAnalysis = this.analyzePredictionStructure(singleFirst, 'SINGLE MODE');
    const batchAnalysis = this.analyzePredictionStructure(batchFirst, 'BATCH MODE');

    // Compare field counts
    const fieldCountDifference = singleAnalysis.totalFields - batchAnalysis.totalFields;
    
    this.log('COMPARISON SUMMARY:', {
      singleFields: singleAnalysis.totalFields,
      batchFields: batchAnalysis.totalFields,
      fieldDifference: fieldCountDifference,
      singleSource: singleAnalysis.dataSourceLikely,
      batchSource: batchAnalysis.dataSourceLikely,
      issueDetected: fieldCountDifference > 10 || singleAnalysis.dataSourceLikely !== batchAnalysis.dataSourceLikely
    });

    // Find fields present in single but missing in batch
    const singleFields = Object.keys(singleFirst);
    const batchFields = Object.keys(batchFirst);
    const missingInBatch = singleFields.filter(field => !batchFields.includes(field));
    const missingInSingle = batchFields.filter(field => !singleFields.includes(field));

    if (missingInBatch.length > 0) {
      this.log('🚨 FIELDS MISSING IN BATCH MODE:', missingInBatch);
    }

    if (missingInSingle.length > 0) {
      this.log('🚨 FIELDS MISSING IN SINGLE MODE:', missingInSingle);
    }
  }

  /**
   * Track where predictions are coming from
   */
  trackDataSource(predictions, source, metadata = {}) {
    this.log(`Data loaded from: ${source}`, {
      predictionCount: predictions?.length || 0,
      source,
      metadata,
      firstPredictionSample: predictions?.[0] ? {
        playerName: predictions[0].player_name,
        hasRecentData: !!predictions[0].recent_N_games_raw_data,
        fieldCount: Object.keys(predictions[0]).length
      } : null
    });
  }

  /**
   * Export debug log for analysis
   */
  exportLogs() {
    const logData = {
      timestamp: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs,
      summary: this.generateSummary()
    };

    console.log('🔍 BATCH DEBUG EXPORT:', logData);
    return logData;
  }

  generateSummary() {
    const sourceLogs = this.logs.filter(log => log.message.includes('Data loaded from'));
    const analysisLogs = this.logs.filter(log => log.message.includes('structure analysis'));
    
    return {
      totalAnalyses: analysisLogs.length,
      dataSources: sourceLogs.map(log => log.data?.source).filter(Boolean),
      issuesDetected: this.logs.filter(log => 
        log.message.includes('MISSING') || 
        log.message.includes('🚨') ||
        log.data?.issueDetected
      ).length
    };
  }

  /**
   * Clear logs
   */
  clear() {
    this.logs = [];
  }

  /**
   * Disable debugging
   */
  disable() {
    this.isActive = false;
  }

  /**
   * Enable debugging
   */
  enable() {
    this.isActive = true;
  }
}

// Singleton instance
export const batchDebugger = new BatchAnalysisDebugger();

// Global access for console debugging
if (typeof window !== 'undefined') {
  window.batchDebugger = batchDebugger;
}

export default batchDebugger;