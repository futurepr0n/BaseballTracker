/**
 * Season Date Utilities
 * Provides date range utilities that limit data fetching to the current season only
 * Prevents errors from trying to fetch non-existing 2024 data
 */

/**
 * Get the start of the current baseball season (2025)
 * Based on the earliest data file we actually have
 */
export const getSeasonStartDate = () => {
  return new Date('2025-03-18'); // Earliest actual data file we have
};

/**
 * Get a date range that's limited to the current season
 * @param {Date} currentDate - The current date
 * @param {number} daysBack - Number of days to go back
 * @returns {Date} - The start date, limited to season start
 */
export const getSeasonLimitedStartDate = (currentDate, daysBack) => {
  const requestedStartDate = new Date(currentDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const seasonStart = getSeasonStartDate();
  
  // Return the later of the two dates (don't go before season start)
  return requestedStartDate > seasonStart ? requestedStartDate : seasonStart;
};

/**
 * Get a safe date range for fetching player data within the current season
 * @param {Date} currentDate - The current date
 * @param {number} idealDaysBack - Ideal number of days to go back
 * @returns {Object} - Object with startDate and endDate
 */
export const getSeasonSafeDateRange = (currentDate, idealDaysBack) => {
  const startDate = getSeasonLimitedStartDate(currentDate, idealDaysBack);
  
  return {
    startDate,
    endDate: currentDate,
    actualDaysBack: Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24)),
    isLimited: startDate.getTime() === getSeasonStartDate().getTime()
  };
};

/**
 * Check if a date is within the current season
 * @param {Date} date - The date to check
 * @returns {boolean} - True if within current season
 */
export const isDateWithinSeason = (date) => {
  const seasonStart = getSeasonStartDate();
  const now = new Date();
  
  return date >= seasonStart && date <= now;
};

/**
 * Format a date range description for logging
 * @param {Object} dateRange - Object with startDate and endDate
 * @returns {string} - Human readable description
 */
export const formatDateRangeDescription = (dateRange) => {
  const { startDate, endDate, actualDaysBack, isLimited } = dateRange;
  
  return `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} ` +
         `(${actualDaysBack} days${isLimited ? ', limited by season start' : ''})`;
};