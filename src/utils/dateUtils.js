/**
 * Date utility functions for consistent date handling across components
 * Addresses timezone issues and provides reliable date comparisons
 */

/**
 * Creates a normalized date from a date string (YYYY-MM-DD format)
 * Always interprets as UTC to avoid timezone issues
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} - UTC Date object set to midnight
 */
export const createNormalizedDate = (dateString) => {
  if (!dateString) return null;
  
  // Parse YYYY-MM-DD format and create as UTC to avoid timezone issues
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // Month is 0-indexed
  const day = parseInt(parts[2]);
  
  // Create UTC date at midnight to avoid timezone shifts
  return new Date(Date.UTC(year, month, day));
};

/**
 * Gets today's date normalized to UTC midnight
 * @returns {Date} - UTC Date object for today at midnight
 */
export const getTodayNormalized = () => {
  const today = new Date();
  // Create UTC date at midnight for today
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
};

/**
 * Calculates the number of days between two dates
 * Handles timezone-aware comparison properly
 * @param {string} pastDateString - Date string in YYYY-MM-DD format  
 * @param {Date} [currentDate] - Current date (defaults to today)
 * @returns {number} - Number of days difference (0 for same day, positive for past dates)
 */
export const getDaysAgo = (pastDateString, currentDate = null) => {
  const pastDate = createNormalizedDate(pastDateString);
  if (!pastDate) return 0;
  
  const today = currentDate || getTodayNormalized();
  
  // Calculate difference in milliseconds and convert to days
  const timeDiff = today.getTime() - pastDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysDiff); // Ensure non-negative
};

/**
 * Formats a date string for display
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} - Formatted date string (e.g., "Aug 9")
 */
export const formatDateForDisplay = (dateString) => {
  const date = createNormalizedDate(dateString);
  if (!date) return 'Invalid Date';
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    timeZone: 'UTC' // Force UTC to avoid timezone shifts in display
  });
};

/**
 * Gets the "days ago" text for a given date
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} - Human readable days ago text (e.g., "Today", "Yesterday", "2 days ago")
 */
export const getDaysAgoText = (dateString) => {
  const daysAgo = getDaysAgo(dateString);
  
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo} days ago`;
};

/**
 * Debug function to check date parsing issues
 * @param {string} dateString - Date string to debug
 * @returns {object} - Debug information
 */
export const debugDateParsing = (dateString) => {
  const normalized = createNormalizedDate(dateString);
  const today = getTodayNormalized();
  const daysAgo = getDaysAgo(dateString);
  
  return {
    input: dateString,
    normalized: normalized?.toISOString(),
    today: today.toISOString(),
    daysAgo,
    daysAgoText: getDaysAgoText(dateString),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
};