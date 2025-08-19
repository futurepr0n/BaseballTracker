/**
 * League Average Service
 * Provides access to league-wide statistical averages for color-coding thresholds
 */

import { LEAGUE_AVERAGES as FALLBACK_AVERAGES } from '../utils/colorThresholds';

class LeagueAverageService {
  constructor() {
    this.cache = null;
    this.lastFetchTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load league averages from rolling stats files
   * @param {string} period - 'season', 'last_30', 'last_7', or 'current'
   * @returns {Promise<Object>} League averages object
   */
  async loadLeagueAverages(period = 'season') {
    // Check cache first
    if (this.cache && this.lastFetchTime) {
      const now = Date.now();
      if (now - this.lastFetchTime < this.cacheTimeout) {
        console.log('[LeagueAverageService] Using cached league averages');
        return this.cache;
      }
    }

    try {
      console.log(`[LeagueAverageService] Loading league averages for period: ${period}`);
      
      // Try to load from latest rolling stats file
      const response = await fetch(`/data/rolling_stats/rolling_stats_${period}_latest.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rolling stats: ${response.status}`);
      }
      
      const rollingStatsData = await response.json();
      
      if (rollingStatsData.leagueAverages) {
        console.log('[LeagueAverageService] Successfully loaded league averages from rolling stats');
        this.cache = rollingStatsData.leagueAverages;
        this.lastFetchTime = Date.now();
        return this.cache;
      } else {
        console.warn('[LeagueAverageService] No league averages found in rolling stats, using fallback');
        return this.getFallbackAverages();
      }
      
    } catch (error) {
      console.error('[LeagueAverageService] Error loading league averages:', error);
      console.log('[LeagueAverageService] Using fallback league averages');
      return this.getFallbackAverages();
    }
  }

  /**
   * Get fallback league averages when data is unavailable
   * @returns {Object} Fallback league averages
   */
  getFallbackAverages() {
    return {
      generatedAt: new Date().toISOString(),
      dataSource: 'fallback_estimates',
      
      // Conservative estimates based on 2024 MLB data
      over05HitsPercentage: FALLBACK_AVERAGES.OVER_05_HITS,
      over05HRPercentage: FALLBACK_AVERAGES.OVER_05_HR,
      
      qualifiedPlayers: 400, // Estimate
      totalGamesSampled: 15000, // Estimate
      
      thresholds: {
        over05Hits: {
          excellent: 85.0,  // 25%+ above league average
          good: 75.0,       // 10%+ above league average  
          average: 60.0,    // Within 10% of league average
          poor: 50.0        // 10%+ below league average
        },
        over05HR: {
          excellent: 4.2,   // 50%+ above league average
          good: 3.5,        // 25%+ above league average
          average: 2.5,     // Within 10% of league average  
          poor: 2.1         // 25%+ below league average
        }
      }
    };
  }

  /**
   * Get league average for a specific stat
   * @param {string} statType - 'over05Hits' or 'over05HR'
   * @param {string} period - Time period for averages
   * @returns {Promise<number>} League average percentage
   */
  async getLeagueAverage(statType, period = 'season') {
    const averages = await this.loadLeagueAverages(period);
    
    switch (statType.toLowerCase()) {
      case 'over05hits':
      case 'over_05_hits':
        return averages.over05HitsPercentage || FALLBACK_AVERAGES.OVER_05_HITS;
        
      case 'over05hr':
      case 'over_05_hr':
        return averages.over05HRPercentage || FALLBACK_AVERAGES.OVER_05_HR;
        
      default:
        console.warn(`[LeagueAverageService] Unknown stat type: ${statType}`);
        return 0;
    }
  }

  /**
   * Get color-coding thresholds for a specific stat
   * @param {string} statType - 'over05Hits' or 'over05HR'
   * @param {string} period - Time period for averages
   * @returns {Promise<Object>} Threshold object with excellent/good/average/poor values
   */
  async getThresholds(statType, period = 'season') {
    const averages = await this.loadLeagueAverages(period);
    
    if (averages.thresholds && averages.thresholds[statType]) {
      return averages.thresholds[statType];
    }
    
    // Generate dynamic thresholds based on league average
    const leagueAvg = await this.getLeagueAverage(statType, period);
    
    if (statType.toLowerCase().includes('hit')) {
      return {
        excellent: parseFloat((leagueAvg * 1.25).toFixed(1)),
        good: parseFloat((leagueAvg * 1.10).toFixed(1)),
        average: parseFloat((leagueAvg * 0.90).toFixed(1)),
        poor: parseFloat((leagueAvg * 0.75).toFixed(1))
      };
    } else { // HR stats
      return {
        excellent: parseFloat((leagueAvg * 1.50).toFixed(1)),
        good: parseFloat((leagueAvg * 1.25).toFixed(1)),
        average: parseFloat((leagueAvg * 0.90).toFixed(1)),
        poor: parseFloat((leagueAvg * 0.75).toFixed(1))
      };
    }
  }

  /**
   * Compare a player's stat to league average
   * @param {number} playerValue - Player's stat value
   * @param {string} statType - Stat type for comparison
   * @param {string} period - Time period for comparison
   * @returns {Promise<Object>} Comparison result with ratio and description
   */
  async compareToLeague(playerValue, statType, period = 'season') {
    const leagueAvg = await this.getLeagueAverage(statType, period);
    const thresholds = await this.getThresholds(statType, period);
    
    const ratio = leagueAvg > 0 ? (playerValue / leagueAvg) : 0;
    let category, description;
    
    if (playerValue >= thresholds.excellent) {
      category = 'excellent';
      description = 'Well Above League Average';
    } else if (playerValue >= thresholds.good) {
      category = 'good';
      description = 'Above League Average';
    } else if (playerValue >= thresholds.average) {
      category = 'average';
      description = 'Near League Average';
    } else {
      category = 'poor';
      description = 'Below League Average';
    }
    
    return {
      playerValue,
      leagueAverage: leagueAvg,
      ratio: parseFloat(ratio.toFixed(2)),
      category,
      description,
      percentDifference: leagueAvg > 0 ? parseFloat(((playerValue - leagueAvg) / leagueAvg * 100).toFixed(1)) : 0
    };
  }

  /**
   * Clear cache to force fresh data load
   */
  clearCache() {
    console.log('[LeagueAverageService] Clearing cache');
    this.cache = null;
    this.lastFetchTime = null;
  }

  /**
   * Get cache status for debugging
   * @returns {Object} Cache status information
   */
  getCacheStatus() {
    return {
      hasCachedData: !!this.cache,
      lastFetchTime: this.lastFetchTime,
      cacheAge: this.lastFetchTime ? Date.now() - this.lastFetchTime : null,
      cacheTimeout: this.cacheTimeout
    };
  }
}

// Export singleton instance
const leagueAverageService = new LeagueAverageService();
export default leagueAverageService;