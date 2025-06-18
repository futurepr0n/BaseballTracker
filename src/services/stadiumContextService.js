/**
 * Stadium Context Service
 * Provides stadium-specific context for HR analysis including park factors,
 * venue characteristics, and historical HR data
 */

class StadiumContextService {
  constructor() {
    this.stadiumData = null;
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Load stadium HR analysis data
   */
  async loadStadiumData() {
    if (this.stadiumData) return this.stadiumData;

    try {
      const response = await fetch('/data/stadium/stadium_hr_analysis.json');
      if (!response.ok) {
        console.warn('Stadium analysis data not available');
        return null;
      }
      
      this.stadiumData = await response.json();
      console.log(`📊 Loaded stadium data for ${this.stadiumData.metadata.totalStadiums} stadiums`);
      return this.stadiumData;
    } catch (error) {
      console.error('Error loading stadium data:', error);
      return null;
    }
  }

  /**
   * Get stadium context for a specific venue
   * @param {string} venue - Stadium name or home team abbreviation
   * @returns {Object} Stadium context information
   */
  async getStadiumContext(venue) {
    if (!venue) return null;

    const cacheKey = venue.toLowerCase();
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const stadiumData = await this.loadStadiumData();
    if (!stadiumData) return null;

    try {
      // Find stadium by venue name or home team
      let stadiumInfo = null;
      
      // First try to find by exact stadium name
      if (stadiumData.stadiums) {
        stadiumInfo = Object.values(stadiumData.stadiums).find(stadium => 
          stadium.name && stadium.name.toLowerCase().includes(venue.toLowerCase())
        );
      }

      // If not found, try to find in top stadiums list
      if (!stadiumInfo && stadiumData.summary?.topStadiumsByTotalHRs) {
        stadiumInfo = stadiumData.summary.topStadiumsByTotalHRs.find(stadium =>
          stadium.name?.toLowerCase().includes(venue.toLowerCase()) ||
          stadium.homeTeam?.toLowerCase() === venue.toLowerCase()
        );
      }

      // If still not found, try by home team abbreviation
      if (!stadiumInfo && stadiumData.stadiums) {
        stadiumInfo = Object.values(stadiumData.stadiums).find(stadium =>
          stadium.homeTeam?.toLowerCase() === venue.toLowerCase()
        );
      }

      if (!stadiumInfo) {
        console.log(`❌ Stadium not found: ${venue}`);
        return null;
      }

      // Calculate park factors and context
      const averageHRsPerGame = parseFloat(stadiumData.summary.averageHRsPerStadium) / 
                                (stadiumData.summary.totalGames / stadiumData.summary.totalStadiums);
      
      const stadiumHRRate = parseFloat(stadiumInfo.averagePerGame || stadiumInfo.totalHomeRuns / stadiumInfo.totalGames);
      const parkFactor = stadiumHRRate / averageHRsPerGame;
      
      const context = {
        venue: stadiumInfo.name,
        homeTeam: stadiumInfo.homeTeam,
        totalHRs: stadiumInfo.totalHomeRuns,
        totalGames: stadiumInfo.totalGames,
        hrPerGame: stadiumHRRate,
        parkFactor: parkFactor,
        isHitterFriendly: parkFactor > 1.1,
        isPitcherFriendly: parkFactor < 0.9,
        rank: this.getStadiumRank(stadiumInfo, stadiumData),
        category: this.categorizeStadium(parkFactor),
        badge: this.getStadiumBadge(parkFactor, stadiumHRRate),
        description: this.getStadiumDescription(parkFactor, stadiumHRRate)
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: context,
        timestamp: Date.now()
      });

      console.log(`🏟️ Stadium context for ${venue}: ${context.category} (${parkFactor.toFixed(2)}x factor)`);
      return context;

    } catch (error) {
      console.error('Error processing stadium context:', error);
      return null;
    }
  }

  /**
   * Get stadium rank in HR production
   */
  getStadiumRank(stadiumInfo, stadiumData) {
    if (!stadiumData.summary?.topStadiumsByTotalHRs) return null;
    
    const index = stadiumData.summary.topStadiumsByTotalHRs.findIndex(stadium =>
      stadium.name === stadiumInfo.name || stadium.homeTeam === stadiumInfo.homeTeam
    );
    
    return index !== -1 ? index + 1 : null;
  }

  /**
   * Categorize stadium based on park factor
   */
  categorizeStadium(parkFactor) {
    if (parkFactor >= 1.2) return 'Extreme Hitter Park';
    if (parkFactor >= 1.1) return 'Hitter Friendly';
    if (parkFactor >= 0.95) return 'Neutral';
    if (parkFactor >= 0.8) return 'Pitcher Friendly';
    return 'Extreme Pitcher Park';
  }

  /**
   * Get stadium badge based on park factor
   */
  getStadiumBadge(parkFactor, hrPerGame) {
    if (parkFactor >= 1.2) return '🚀 Launch Pad';
    if (parkFactor >= 1.1) return '🏟️ Hitter Paradise';
    if (parkFactor <= 0.8) return '🛡️ Pitcher Fortress';
    if (parkFactor <= 0.9) return '⚾ Pitcher Friendly';
    return '⚖️ Neutral Park';
  }

  /**
   * Get stadium description
   */
  getStadiumDescription(parkFactor, hrPerGame) {
    const factor = ((parkFactor - 1) * 100).toFixed(0);
    const direction = parkFactor > 1 ? 'increases' : 'decreases';
    const magnitude = Math.abs(factor);
    
    if (magnitude < 5) {
      return 'Neutral park with minimal impact on HR production';
    }
    
    return `Park ${direction} HR production by ~${magnitude}% (${hrPerGame.toFixed(2)} HR/game)`;
  }

  /**
   * Get all stadium contexts for today's games
   * @param {Array} games - Array of game objects with venue information
   * @returns {Array} Array of stadium contexts
   */
  async getStadiumContextsForGames(games) {
    if (!games || games.length === 0) return [];

    const contexts = await Promise.all(
      games.map(async (game) => {
        const venue = game.venue || game.homeTeam;
        const context = await this.getStadiumContext(venue);
        return {
          ...game,
          stadiumContext: context
        };
      })
    );

    return contexts.filter(context => context.stadiumContext);
  }

  /**
   * Get top HR-friendly stadiums for today
   * @param {Array} stadiumContexts - Stadium contexts from getStadiumContextsForGames
   * @returns {Array} Top hitter-friendly venues
   */
  getTopHRVenues(stadiumContexts) {
    return stadiumContexts
      .filter(context => context.stadiumContext?.isHitterFriendly)
      .sort((a, b) => b.stadiumContext.parkFactor - a.stadiumContext.parkFactor)
      .slice(0, 5);
  }

  /**
   * Get pitcher-friendly venues for today
   * @param {Array} stadiumContexts - Stadium contexts from getStadiumContextsForGames
   * @returns {Array} Top pitcher-friendly venues
   */
  getPitcherFriendlyVenues(stadiumContexts) {
    return stadiumContexts
      .filter(context => context.stadiumContext?.isPitcherFriendly)
      .sort((a, b) => a.stadiumContext.parkFactor - b.stadiumContext.parkFactor)
      .slice(0, 5);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const stadiumContextService = new StadiumContextService();
export default stadiumContextService;