/**
 * Baseball Analysis API Service
 * Service module for interfacing with the FastAPI baseball analysis backend
 */

import { useState, useEffect, useCallback } from 'react';

class BaseballAnalysisService {
  constructor(baseURL = 'http://localhost:8000') {
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
      this.initialized = health.initialized;
      return health;
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
   * Search for players
   */
  async searchPlayers(query, playerType = null) {
    const params = new URLSearchParams({ query });
    if (playerType) {
      params.append('player_type', playerType);
    }
    
    return await this.makeRequest(`/players/search?${params}`);
  }

  /**
   * Analyze pitcher vs team matchup
   */
  async analyzePitcherVsTeam({
    pitcherName,
    teamAbbr,
    sortBy = 'score',
    ascending = false,
    limit = 20,
    detailed = false
  }) {
    const requestData = {
      pitcher_name: pitcherName,
      team_abbr: teamAbbr,
      sort_by: sortBy,
      ascending,
      limit,
      detailed
    };

    return await this.makeRequest('/pitcher-vs-team', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
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

    return await this.makeRequest('/batch-analysis', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  /**
   * Get available sorting options
   */
  async getSortOptions() {
    return await this.makeRequest('/sort-options');
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