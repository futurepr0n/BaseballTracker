/**
 * Format date for display in MM/DD format
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export const formatGameDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}`;
  };
  
  /**
   * Format date for use in filenames (YYYYMMDD)
   * @param {Date} date - Date object
   * @returns {string} Formatted date string for filenames
   */
  export const formatDateForFilename = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };
  
  /**
   * Format a value to display, handling empty or null values
   * @param {*} value - The value to format
   * @param {string} defaultValue - Default value to show if empty
   * @returns {string} Formatted value
   */
  export const formatDisplayValue = (value, defaultValue = '0') => {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    return String(value);
  };
  
  /**
   * Get team colors for styling rows
   * @param {string} teamCode - Team abbreviation
   * @param {Object} teams - Teams data
   * @returns {Object} CSS style object
   */
  export const getTeamColors = (teamCode, teams) => {
    if (!teams || !teamCode || !teams[teamCode]) {
      return { borderLeft: '4px solid #ccc' };
    }
  
    return {
      backgroundColor: `${teams[teamCode].primaryColor}1A`, // Use 1A for ~10% opacity hex
      borderLeft: `4px solid ${teams[teamCode].primaryColor || '#ccc'}`
    };
  };