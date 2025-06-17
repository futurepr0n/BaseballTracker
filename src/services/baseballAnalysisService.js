/**
 * Baseball Analysis API Service
 * Service module for interfacing with the FastAPI baseball analysis backend
 */

import { useState, useEffect, useCallback } from 'react';

class BaseballAnalysisService {
  constructor(baseURL = 'https://pinhead.capping.pro') {
    this.baseURL = baseURL;
    this.initialized = false;
  }

  /**
   * Helper method to make API requests
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Check if the API is healthy and data is initialized
   */
  async checkHealth() {
    try {
      const health = await this.makeRequest('/health');
      
      // For enhanced API, also check data status
      try {
        const dataStatus = await this.getDataStatus();
        this.initialized = dataStatus.initialization_status === 'completed';
        return { ...health, dataStatus, initialized: this.initialized };
      } catch (statusError) {
        // Fallback for original API
        this.initialized = health.initialized || false;
        return health;
      }
    } catch (error) {
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Get data initialization status
   */
  async getDataStatus() {
    return await this.makeRequest('/data/status');
  }

  /**
   * Get data quality information (Enhanced API)
   */
  async getDataQuality() {
    try {
      return await this.makeRequest('/analyze/data-quality');
    } catch (error) {
      console.warn('Enhanced data quality endpoint not available:', error.message);
      return { enhanced_features_active: false };
    }
  }

  /**
   * Transform API response to match React component expectations
   */
  transformPrediction(prediction) {
    const outcome_probabilities = prediction.outcome_probabilities || {};
    
    return {
      // Map API fields to expected React component fields
      player_name: prediction.batter_name || prediction.player_name,
      team: prediction.team || prediction.batter_team,
      batter_hand: prediction.batter_hand,
      pitcher_hand: prediction.pitcher_hand,
      
      // Core scores
      hr_score: prediction.score || prediction.hr_score,
      confidence: prediction.confidence,
      data_source: prediction.data_source,
      
      // Probabilities - API returns as numbers, component expects them
      hr_probability: outcome_probabilities.homerun || prediction.hr_probability,
      hit_probability: outcome_probabilities.hit || prediction.hit_probability,
      reach_base_probability: outcome_probabilities.reach_base || prediction.reach_base_probability,
      strikeout_probability: outcome_probabilities.strikeout || prediction.strikeout_probability,
      
      // Recent performance
      recent_avg: prediction.recent_avg,
      hr_rate: prediction.hr_rate,
      obp: prediction.obp,
      
      // Due factors
      ab_due: prediction.ab_due,
      hits_due: prediction.hits_due,
      ab_since_last_hr: prediction.ab_since_last_hr,
      expected_ab_per_hr: prediction.expected_ab_per_hr,
      h_since_last_hr: prediction.h_since_last_hr,
      expected_h_per_hr: prediction.expected_h_per_hr,
      
      // Trend information
      heating_up: prediction.heating_up,
      cold: prediction.cold,
      contact_trend: prediction.contact_trend,
      
      // Component scores
      arsenal_matchup: prediction.arsenal_matchup,
      batter_overall: prediction.batter_overall,
      pitcher_overall: prediction.pitcher_overall,
      historical_yoy_csv: prediction.historical_yoy_csv,
      recent_daily_games: prediction.recent_daily_games,
      contextual: prediction.contextual,
      
      // Historical data
      iso_2024: prediction.iso_2024,
      iso_2025: prediction.iso_2025,
      iso_trend: prediction.iso_trend,
      batter_pa_2025: prediction.batter_pa_2025,
      
      // Matchup specific
      ev_matchup_score: prediction.ev_matchup_score,
      hitter_slg: prediction.hitter_slg,
      pitcher_slg: prediction.pitcher_slg,
      
      // Trend directions
      recent_trend_dir: prediction.recent_trend_dir,
      
      // Pitcher info (will be same for all batters in a matchup)
      pitcher_era: prediction.pitcher_era,
      pitcher_whip: prediction.pitcher_whip,
      pitcher_trend_dir: prediction.pitcher_trend_dir || 'stable',  // Add fallback in transformation
      
      // Pitcher home stats (comprehensive data from all games)
      pitcher_home_h_total: prediction.pitcher_home_h_total,
      pitcher_home_hr_total: prediction.pitcher_home_hr_total,
      pitcher_home_k_total: prediction.pitcher_home_k_total,
      pitcher_home_games: prediction.pitcher_home_games,
      
      // Keep any additional fields that might exist
      ...prediction
    };
  }

  /**
   * Search for players
   */
  async searchPlayers(query, playerType = null) {
    try {
      // Try new POST endpoint first
      const requestData = {
        name: query,
        player_type: playerType
      };
      
      return await this.makeRequest('/players/search', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
    } catch (error) {
      // Fallback to GET endpoint with query params
      console.warn('POST search failed, trying GET:', error.message);
      const params = new URLSearchParams({ query });
      if (playerType) {
        params.append('player_type', playerType);
      }
      
      return await this.makeRequest(`/players/search?${params}`);
    }
  }

  /**
   * Analyze pitcher vs team matchup (Enhanced version with fallback)
   */
  async analyzePitcherVsTeam({
    pitcherName,
    teamAbbr,
    sortBy = 'score',
    ascending = false,
    limit = 20,
    detailed = false,
    includeConfidence = true
  }) {
    const requestData = {
      pitcher_name: pitcherName,
      team: teamAbbr,
      sort_by: sortBy,
      max_results: limit,
      include_confidence: includeConfidence
    };

    // Try enhanced endpoint first, fallback to original
    try {
      const result = await this.makeRequest('/analyze/pitcher-vs-team', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      // Transform the response to match what the React component expects
      if (result && result.predictions) {
        result.predictions = result.predictions.map(prediction => this.transformPrediction(prediction));
      }
      
      return result;
    } catch (error) {
      console.warn('Enhanced endpoint failed, trying original:', error.message);
      
      // Fallback to original endpoint format
      const fallbackData = {
        pitcher_name: pitcherName,
        team_abbr: teamAbbr,
        sort_by: sortBy,
        ascending,
        limit,
        detailed
      };
      
      const result = await this.makeRequest('/pitcher-vs-team', {
        method: 'POST',
        body: JSON.stringify(fallbackData)
      });
      
      // Transform fallback response too
      if (result && result.predictions) {
        result.predictions = result.predictions.map(prediction => this.transformPrediction(prediction));
      }
      
      return result;
    }
  }

  /**
   * Analyze multiple pitcher vs team matchups
   */
  async batchAnalysis({
    matchups,
    sortBy = 'score',
    ascending = false,
    limit = 20,
    applyFilters = null,
    hittersFilter = null
  }) {
    const requestData = {
      matchups,
      sort_by: sortBy,
      ascending,
      limit,
      apply_filters: applyFilters,
      hitters_filter: hittersFilter
    };

    const result = await this.makeRequest('/batch-analysis', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
    
    // Transform the response to match what the React component expects
    if (result && result.predictions) {
      result.predictions = result.predictions.map(prediction => this.transformPrediction(prediction));
    }
    
    return result;
  }

  /**
   * Get available sorting options
   */
  async getSortOptions() {
    // Always return default options to avoid API dependency
    const defaultOptions = {
      options: [
        { key: 'score', label: 'Overall HR Score', description: 'Overall home run likelihood score' },
        { key: 'hr', label: 'HR Probability', description: 'Home run probability percentage' },
        { key: 'hit', label: 'Hit Probability', description: 'Hit probability percentage' },
        { key: 'reach_base', label: 'Reach Base Probability', description: 'Reach base probability' },
        { key: 'strikeout', label: 'Strikeout Probability', description: 'Strikeout probability (lower is better)' },
        { key: 'confidence', label: 'Confidence', description: 'Data quality confidence level' }
      ]
    };

    try {
      // Try to get options from API, but don't fail if unavailable
      const apiOptions = await this.makeRequest('/sort-options');
      return apiOptions;
    } catch (error) {
      console.info('Using default sort options (API endpoint not available)');
      return defaultOptions;
    }
  }

  /**
   * Reinitialize data (useful for development)
   */
  async reinitializeData() {
    return await this.makeRequest('/data/reinitialize', {
      method: 'POST'
    });
  }

  /**
   * Wait for data to be initialized
   */
  async waitForInitialization(maxAttempts = 30, intervalMs = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await this.checkHealth();
        if (status.initialized) {
          return true;
        }
      } catch (error) {
        console.warn(`Initialization check attempt ${attempt + 1} failed:`, error.message);
      }
      
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    throw new Error('Data initialization timeout');
  }
}

/**
 * React Hook for using the Baseball Analysis Service
 */
export const useBaseballAnalysis = (baseURL) => {
  const [service] = useState(() => new BaseballAnalysisService(baseURL));
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check initialization status
  useEffect(() => {
    const checkInit = async () => {
      try {
        setLoading(true);
        await service.waitForInitialization();
        setInitialized(true);
        setError(null);
      } catch (err) {
        setError(err.message);
        setInitialized(false);
      } finally {
        setLoading(false);
      }
    };

    checkInit();
  }, [service]);

  // Analyze pitcher vs team with error handling
  const analyzePitcherVsTeam = useCallback(async (params) => {
    try {
      setError(null);
      return await service.analyzePitcherVsTeam(params);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [service]);

  // Batch analysis with error handling
  const batchAnalysis = useCallback(async (params) => {
    try {
      setError(null);
      return await service.batchAnalysis(params);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [service]);

  // Search players with error handling
  const searchPlayers = useCallback(async (query, playerType) => {
    try {
      setError(null);
      return await service.searchPlayers(query, playerType);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [service]);

  return {
    service,
    initialized,
    loading,
    error,
    analyzePitcherVsTeam,
    batchAnalysis,
    searchPlayers
  };
};

/**
 * Default service instance
 */
export const baseballAnalysisService = new BaseballAnalysisService();

export default BaseballAnalysisService;

/**
 * Example usage in a React component:
 * 
 * import { useBaseballAnalysis } from './services/baseballAnalysisService';
 * 
 * function PinheadsPlayhouse() {
 *   const { 
 *     initialized, 
 *     loading, 
 *     error, 
 *     analyzePitcherVsTeam,
 *     searchPlayers 
 *   } = useBaseballAnalysis();
 * 
 *   const handleAnalysis = async () => {
 *     try {
 *       const result = await analyzePitcherVsTeam({
 *         pitcherName: 'MacKenzie Gore',
 *         teamAbbr: 'SEA',
 *         sortBy: 'hr',
 *         limit: 10
 *       });
 *       
 *       // Use result.predictions for your table data
 *       console.log(result.predictions);
 *     } catch (err) {
 *       console.error('Analysis failed:', err);
 *     }
 *   };
 * 
 *   if (loading) return <div>Loading analysis system...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (!initialized) return <div>Initializing data...</div>;
 * 
 *   return (
 *     <div>
 *       <button onClick={handleAnalysis}>Run Analysis</button>
 *       // Your table component here
 *     </div>
 *   );
 * }
 */