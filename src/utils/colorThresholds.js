/**
 * Color threshold utilities for baseball analytics
 * Provides standardized color-coding based on sample sizes and performance metrics
 */

// Sample Size Thresholds
export const SAMPLE_SIZE_THRESHOLDS = {
  AB: {
    insufficient: 30,    // Red - unreliable
    decent: 40,         // Yellow - limited reliability  
    good: 60,           // Light green - adequate
    excellent: 80       // Dark green - highly reliable
  },
  BATTER_SAMPLE: {
    insufficient: 30,    // Red - unreliable
    decent: 50,         // Yellow - limited reliability
    good: 80,           // Light green - adequate  
    excellent: 100      // Dark green - highly reliable
  }
};

// Performance Thresholds (based on MLB averages and percentiles)
export const PERFORMANCE_THRESHOLDS = {
  HR_RATE: [0.015, 0.025, 0.035, 0.050],  // 1.5%, 2.5%, 3.5%, 5.0%
  HIT_RATE: [0.220, 0.245, 0.270, 0.300], // 22%, 24.5%, 27%, 30%
  VULNERABILITY: [3.0, 5.0, 7.0, 9.0]     // Vulnerability score ranges
};

// League Average Fallback Values (updated daily via rolling stats)
export const LEAGUE_AVERAGES = {
  OVER_05_HITS: 67.5,    // ~67.5% of qualified PAs result in 1+ hits
  OVER_05_HR: 2.8,       // ~2.8% of qualified PAs result in 1+ HR
  BATTING_AVG: 0.243,    // 2024 MLB average
  HR_RATE: 0.028         // 2024 MLB HR rate
};

// Color Classes
export const COLOR_CLASSES = {
  RED: 'stat-red',
  YELLOW: 'stat-yellow', 
  LIGHT_GREEN: 'stat-light-green',
  DARK_GREEN: 'stat-dark-green',
  DEFAULT: 'stat-default'
};

/**
 * Get color class for sample size values (AB, Batter Sample)
 * @param {number} value - Sample size value
 * @param {string} type - 'AB' or 'BATTER_SAMPLE'
 * @returns {string} CSS class name
 */
export function getSampleSizeColor(value, type = 'AB') {
  const thresholds = SAMPLE_SIZE_THRESHOLDS[type];
  
  if (!thresholds || value === null || value === undefined) {
    return COLOR_CLASSES.DEFAULT;
  }
  
  if (value >= thresholds.excellent) return COLOR_CLASSES.DARK_GREEN;
  if (value >= thresholds.good) return COLOR_CLASSES.LIGHT_GREEN;
  if (value >= thresholds.decent) return COLOR_CLASSES.YELLOW;
  return COLOR_CLASSES.RED;
}

/**
 * Get color class for performance rates (HR%, Hit%)
 * @param {number} rate - Performance rate (0-1 for percentages like 0.25 = 25%)
 * @param {string} metric - 'HR_RATE' or 'HIT_RATE'
 * @returns {string} CSS class name
 */
export function getPerformanceRateColor(rate, metric) {
  const thresholds = PERFORMANCE_THRESHOLDS[metric];
  
  if (!thresholds || rate === null || rate === undefined) {
    return COLOR_CLASSES.DEFAULT;
  }
  
  if (rate >= thresholds[3]) return COLOR_CLASSES.DARK_GREEN;   // Excellent
  if (rate >= thresholds[2]) return COLOR_CLASSES.LIGHT_GREEN; // Good
  if (rate >= thresholds[1]) return COLOR_CLASSES.YELLOW;      // Average
  return COLOR_CLASSES.RED;                                    // Below average
}

/**
 * Get color class for vulnerability scores
 * High vulnerability = good for hitters = green
 * @param {number} vulnerability - Vulnerability score
 * @returns {string} CSS class name
 */
export function getVulnerabilityColor(vulnerability) {
  const thresholds = PERFORMANCE_THRESHOLDS.VULNERABILITY;
  
  if (vulnerability === null || vulnerability === undefined) {
    return COLOR_CLASSES.DEFAULT;
  }
  
  if (vulnerability >= thresholds[3]) return COLOR_CLASSES.DARK_GREEN;   // Extreme vulnerability
  if (vulnerability >= thresholds[2]) return COLOR_CLASSES.LIGHT_GREEN; // High vulnerability
  if (vulnerability >= thresholds[1]) return COLOR_CLASSES.YELLOW;      // Moderate vulnerability
  return COLOR_CLASSES.RED;                                             // Low vulnerability
}

/**
 * Get color class for Over 0.5 props compared to league average
 * @param {number} playerRate - Player's success rate (percentage)
 * @param {number} leagueAverage - League average percentage
 * @returns {string} CSS class name
 */
export function getPropComparisonColor(playerRate, leagueAverage) {
  if (playerRate === null || playerRate === undefined || !leagueAverage) {
    return COLOR_CLASSES.DEFAULT;
  }
  
  const ratio = playerRate / leagueAverage;
  
  if (ratio >= 1.25) return COLOR_CLASSES.DARK_GREEN;   // 25%+ above league average
  if (ratio >= 1.10) return COLOR_CLASSES.LIGHT_GREEN; // 10%+ above league average
  if (ratio >= 0.90) return COLOR_CLASSES.YELLOW;      // Within 10% of league average
  return COLOR_CLASSES.RED;                            // 10%+ below league average
}

/**
 * Get descriptive text for color coding
 * @param {string} colorClass - Color class constant
 * @returns {string} Descriptive text
 */
export function getColorDescription(colorClass) {
  const descriptions = {
    [COLOR_CLASSES.RED]: 'Below Average',
    [COLOR_CLASSES.YELLOW]: 'Average', 
    [COLOR_CLASSES.LIGHT_GREEN]: 'Above Average',
    [COLOR_CLASSES.DARK_GREEN]: 'Excellent',
    [COLOR_CLASSES.DEFAULT]: 'No Data'
  };
  
  return descriptions[colorClass] || 'Unknown';
}

/**
 * Get color class for analysis cells
 * @param {string} cellType - 'vuln', 'hr', 'hit', 'ab', 'batter_sample', 'over_05_hits', 'over_05_hr'
 * @param {number} value - Cell value
 * @param {Object} options - Additional options (leagueAverages, etc.)
 * @returns {string} CSS class name
 */
export function getAnalysisCellColor(cellType, value, options = {}) {
  const { leagueAverages = {} } = options;
  
  switch (cellType.toLowerCase()) {
    case 'vuln':
    case 'vulnerability':
      return getVulnerabilityColor(value);
      
    case 'hr':
    case 'hr_rate':
      return getPerformanceRateColor(value, 'HR_RATE');
      
    case 'hit':
    case 'hit_rate':
      return getPerformanceRateColor(value, 'HIT_RATE');
      
    case 'ab':
      return getSampleSizeColor(value, 'AB');
      
    case 'batter_sample':
      return getSampleSizeColor(value, 'BATTER_SAMPLE');
      
    case 'over_05_hits':
      return getPropComparisonColor(value, leagueAverages.over05Hits || LEAGUE_AVERAGES.OVER_05_HITS);
      
    case 'over_05_hr':
      return getPropComparisonColor(value, leagueAverages.over05HR || LEAGUE_AVERAGES.OVER_05_HR);
      
    default:
      return COLOR_CLASSES.DEFAULT;
  }
}

export default {
  SAMPLE_SIZE_THRESHOLDS,
  PERFORMANCE_THRESHOLDS, 
  LEAGUE_AVERAGES,
  COLOR_CLASSES,
  getSampleSizeColor,
  getPerformanceRateColor,
  getVulnerabilityColor,
  getPropComparisonColor,
  getColorDescription,
  getAnalysisCellColor
};