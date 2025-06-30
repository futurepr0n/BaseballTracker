/**
 * SharedDataManager - Centralized data loading with request deduplication
 * 
 * CRITICAL FIX: Eliminates the infinite loop of thousands of HTTP requests
 * by sharing data loading across all Dashboard cards and implementing
 * smart date validation.
 * 
 * Problem Solved:
 * - 8+ cards each requesting 365-730 days = 5,000+ HTTP requests
 * - No request deduplication causing repeated identical requests
 * - Poor error handling logging thousands of expected 404s
 * - Browser freeze from network congestion
 */

import { formatDateString, formatDateForDisplay } from './dataService';
import { debugLog } from '../utils/debugConfig';

class SharedDataManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.lastClearTime = Date.now();
    this.requestStats = {
      totalRequests: 0,
      cacheHits: 0,
      dedupedRequests: 0,
      actualFetches: 0
    };
  }

  /**
   * Smart date validation - only request dates that likely have data
   * Filters out weekends, off-season dates, and future dates
   */
  isValidGameDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    
    // Don't request future dates
    if (date > now) return false;
    
    // MLB season roughly runs March 20 - October 31
    const year = date.getFullYear();
    const seasonStart = new Date(`${year}-03-20`);
    const seasonEnd = new Date(`${year}-10-31`);
    
    // Don't request off-season dates
    if (date < seasonStart || date > seasonEnd) return false;
    
    // Skip weekends (games are less common, reduces requests by ~28%)
    // DISABLED for full season data - pitcher cards need complete statistics
    // const dayOfWeek = date.getDay();
    // if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    
    return true;
  }

  /**
   * Generate smart date list with validation
   * Returns only dates that likely have MLB games
   */
  generateSmartDateList(startDate, maxDays) {
    const validDates = [];
    const start = new Date(startDate);
    
    for (let daysBack = 0; daysBack < maxDays && validDates.length < 500; daysBack++) {
      const searchDate = new Date(start);
      searchDate.setDate(searchDate.getDate() - daysBack);
      const dateStr = formatDateString(searchDate);
      
      if (this.isValidGameDate(dateStr)) {
        validDates.push(dateStr);
      }
    }
    
    debugLog.log('SHARED_DATA_MANAGER', `Filtered ${maxDays} days to ${validDates.length} valid game dates`);
    return validDates;
  }

  /**
   * Get date range data with request deduplication
   * This replaces the problematic fetchPlayerDataForDateRange calls
   */
  async getDateRangeData(startDate, maxDays = 365) {
    this.requestStats.totalRequests++;
    
    // Generate cache key
    const cacheKey = `range_${formatDateString(startDate)}_${maxDays}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      this.requestStats.cacheHits++;
      debugLog.log('SHARED_DATA_MANAGER', `Cache hit for ${cacheKey}`);
      return this.cache.get(cacheKey);
    }
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      this.requestStats.dedupedRequests++;
      debugLog.log('SHARED_DATA_MANAGER', `Deduplicating request for ${cacheKey}`);
      return await this.pendingRequests.get(cacheKey);
    }
    
    // Create new request
    this.requestStats.actualFetches++;
    const requestPromise = this._performDateRangeFetch(startDate, maxDays);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Perform the actual data fetching with smart filtering
   */
  async _performDateRangeFetch(startDate, maxDays) {
    const result = {};
    const validDates = this.generateSmartDateList(startDate, maxDays);
    
    debugLog.log('SHARED_DATA_MANAGER', `Fetching data for ${validDates.length} valid dates (reduced from ${maxDays})`);
    
    // Batch process dates to avoid overwhelming the browser
    const batchSize = 10;
    let successCount = 0;
    
    for (let i = 0; i < validDates.length; i += batchSize) {
      const batch = validDates.slice(i, i + batchSize);
      
      // Process batch in parallel with timeout
      const batchPromises = batch.map(dateStr => 
        this._fetchDateDataSilent(dateStr)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results
      batch.forEach((dateStr, index) => {
        const batchResult = batchResults[index];
        if (batchResult.status === 'fulfilled' && batchResult.value && batchResult.value.length > 0) {
          result[dateStr] = batchResult.value;
          successCount++;
        }
      });
      
      // Stop early if we have enough data
      if (successCount >= 30) {
        debugLog.log('SHARED_DATA_MANAGER', `Found sufficient data (${successCount} dates), stopping early`);
        break;
      }
    }
    
    debugLog.log('SHARED_DATA_MANAGER', `Completed fetch: ${successCount} dates with data out of ${validDates.length} requested`);
    return result;
  }

  /**
   * Fetch data for single date with silent error handling
   * No console errors for expected missing dates
   */
  async _fetchDateDataSilent(dateStr) {
    try {
      // Extract year and month from the date string
      const [year, /* month */, day] = dateStr.split('-');
      const monthName = new Date(dateStr).toLocaleString('default', { month: 'long' }).toLowerCase();
      
      // Construct the file path
      const filePath = `/data/${year}/${monthName}/${monthName}_${day}_${year}.json`;
      
      // Fetch with timeout
      const response = await Promise.race([
        fetch(filePath),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
      
      if (!response.ok) {
        return null; // Silent handling - no error logging for expected 404s
      }
      
      const data = await response.json();
      return data.players || [];
      
    } catch (error) {
      // Only log unexpected errors, not missing files
      if (error.message !== 'timeout' && !error.message.includes('404')) {
        debugLog.warn('SHARED_DATA_MANAGER', `Unexpected error for ${dateStr}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Get single date data with caching
   */
  async getDateData(dateStr) {
    const cacheKey = `single_${dateStr}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    if (this.pendingRequests.has(cacheKey)) {
      return await this.pendingRequests.get(cacheKey);
    }
    
    const requestPromise = this._fetchDateDataSilent(dateStr);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Clear cache periodically to prevent memory leaks
   */
  clearCacheIfNeeded() {
    const now = Date.now();
    if (now - this.lastClearTime > 15 * 60 * 1000) { // 15 minutes
      debugLog.log('SHARED_DATA_MANAGER', 'Clearing cache after 15 minutes');
      this.cache.clear();
      this.lastClearTime = now;
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const stats = { ...this.requestStats };
    stats.cacheHitRate = stats.totalRequests > 0 ? (stats.cacheHits / stats.totalRequests * 100).toFixed(1) : 0;
    stats.deduplicationRate = stats.totalRequests > 0 ? (stats.dedupedRequests / stats.totalRequests * 100).toFixed(1) : 0;
    return stats;
  }

  /**
   * Reset performance statistics
   */
  resetStats() {
    this.requestStats = {
      totalRequests: 0,
      cacheHits: 0,
      dedupedRequests: 0,
      actualFetches: 0
    };
  }
}

// Export singleton instance
export const sharedDataManager = new SharedDataManager();

// Export convenience functions that match existing API
export const getSharedDateRangeData = (startDate, maxDays = 180) => {
  return sharedDataManager.getDateRangeData(startDate, maxDays);
};

export const getSharedDateData = (dateStr) => {
  return sharedDataManager.getDateData(dateStr);
};

export const getDataManagerStats = () => {
  return sharedDataManager.getStats();
};

export default sharedDataManager;