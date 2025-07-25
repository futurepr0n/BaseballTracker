/**
 * Master Schedule Service
 * 
 * React-compatible service for accessing the master schedule of MLB game dates.
 * Used by cards and components to iterate through only actual game days.
 */

class MasterScheduleService {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load master schedule from file with caching
   */
  async loadMasterSchedule() {
    try {
      // Check cache first
      if (this.cache && this.cacheTimestamp && 
          (Date.now() - this.cacheTimestamp) < this.cacheTimeout) {
        return this.cache;
      }

      const response = await fetch(`/data/season_game_dates_${this.currentYear}.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load master schedule: ${response.status} ${response.statusText}`);
      }
      
      const scheduleData = await response.json();
      const gameDates = scheduleData.gameDates || [];
      
      // Cache the result
      this.cache = gameDates;
      this.cacheTimestamp = Date.now();
      
      console.log(`📅 Loaded master schedule: ${gameDates.length} game dates for ${this.currentYear}`);
      
      return gameDates;
    } catch (error) {
      console.warn('⚠️ Could not load master schedule, falling back to date range method:', error.message);
      return null; // Will trigger fallback
    }
  }

  /**
   * Get all game dates up to a specific date
   */
  async getGameDatesUpTo(targetDate) {
    try {
      const allGameDates = await this.loadMasterSchedule();
      
      if (!allGameDates) {
        return null; // Trigger fallback
      }
      
      const filteredDates = allGameDates.filter(date => date <= targetDate);
      
      console.log(`📅 Filtered to ${filteredDates.length} game dates up to ${targetDate}`);
      
      return filteredDates;
    } catch (error) {
      console.warn('⚠️ Error filtering game dates:', error);
      return null;
    }
  }

  /**
   * Get game dates within a specific range
   */
  async getGameDatesInRange(startDate, endDate) {
    try {
      const allGameDates = await this.loadMasterSchedule();
      
      if (!allGameDates) {
        return null; // Trigger fallback
      }
      
      const filteredDates = allGameDates.filter(date => date >= startDate && date <= endDate);
      
      console.log(`📅 Found ${filteredDates.length} game dates between ${startDate} and ${endDate}`);
      
      return filteredDates;
    } catch (error) {
      console.warn('⚠️ Error getting date range:', error);
      return null;
    }
  }

  /**
   * Get the last N game dates before (and including) a target date
   */
  async getLastNGameDates(targetDate, count) {
    try {
      const gameDatesUpTo = await this.getGameDatesUpTo(targetDate);
      
      if (!gameDatesUpTo) {
        return null; // Trigger fallback
      }
      
      // Get the last N dates
      const lastNDates = gameDatesUpTo.slice(-count);
      
      console.log(`📅 Retrieved last ${lastNDates.length} game dates before ${targetDate}`);
      
      return lastNDates;
    } catch (error) {
      console.warn('⚠️ Error getting last N game dates:', error);
      return null;
    }
  }

  /**
   * Generate fallback date range (old method) for when master schedule fails
   */
  generateFallbackDateRange(currentDate, daysBefore = 120) {
    const dates = [];
    const current = new Date(currentDate);
    
    // Go back the specified number of days
    for (let i = daysBefore; i >= 0; i--) {
      const date = new Date(current);
      date.setDate(current.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    console.log(`📅 Generated fallback date range: ${dates.length} dates`);
    
    return dates;
  }

  /**
   * Get season game dates with automatic fallback
   * This is the main method cards should use
   */
  async getSeasonGameDates(currentDate, options = {}) {
    const {
      maxDaysBack = 120,
      useLastNDates = null,
      startDate = null,
      endDate = null
    } = options;

    try {
      let gameDates;

      if (startDate && endDate) {
        // Specific date range requested
        gameDates = await this.getGameDatesInRange(startDate, endDate);
      } else if (useLastNDates) {
        // Last N game dates requested
        gameDates = await this.getLastNGameDates(currentDate, useLastNDates);
      } else {
        // Default: all dates up to current date
        gameDates = await this.getGameDatesUpTo(currentDate);
      }

      // If master schedule method worked, return it
      if (gameDates && gameDates.length > 0) {
        console.log(`✅ Using master schedule: ${gameDates.length} game dates`);
        return gameDates;
      }

      // Fallback to old date range method
      console.log('🔄 Master schedule unavailable, using fallback date range method');
      const fallbackDates = this.generateFallbackDateRange(currentDate, maxDaysBack);
      
      return fallbackDates;
    } catch (error) {
      console.error('❌ Error getting season game dates:', error);
      
      // Ultimate fallback
      console.log('🔄 Using ultimate fallback date range');
      return this.generateFallbackDateRange(currentDate, maxDaysBack);
    }
  }

  /**
   * Check if master schedule is available and current
   */
  async isScheduleAvailable() {
    try {
      const schedule = await this.loadMasterSchedule();
      return schedule && schedule.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get schedule metadata
   */
  async getScheduleInfo() {
    try {
      const response = await fetch(`/data/season_game_dates_${this.currentYear}.json`);
      
      if (!response.ok) {
        return null;
      }
      
      const scheduleData = await response.json();
      
      return {
        generated: scheduleData.generated,
        year: scheduleData.year,
        gameCount: scheduleData.gameCount,
        firstGame: scheduleData.firstGame,
        lastGame: scheduleData.lastGame,
        isAvailable: true
      };
    } catch {
      return {
        isAvailable: false,
        year: this.currentYear,
        gameCount: 0
      };
    }
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
    console.log('🗑️ Master schedule cache cleared');
  }
}

// Create singleton instance
const masterScheduleService = new MasterScheduleService();

export default masterScheduleService;