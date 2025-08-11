// Data formatting utilities for Daily Matchup Analysis
// NOTE: This file only handles probability/percentage formatting, NOT date formatting

/**
 * Normalize percentage values to ensure consistent display
 * Handles both decimal (0-1) and percentage (0-100) formats
 */
export const normalizePercentage = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  
  // If value is greater than 1, assume it's already a percentage
  // Otherwise, it's a decimal that needs to be converted
  const normalized = value > 1 ? value : value * 100;
  
  // Cap at reasonable bounds for probabilities
  return Math.min(100, Math.max(0, normalized));
};

/**
 * Format percentage for display with intelligent decimal detection
 */
export const formatPercentage = (value, decimals = 1) => {
  const normalized = normalizePercentage(value);
  if (normalized === null) {
    return 'N/A';
  }
  return `${normalized.toFixed(decimals)}%`;
};

/**
 * Format number with safe null handling
 */
export const formatNumber = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return value.toFixed(decimals);
};

/**
 * Format sample size with fallback text
 */
export const formatSampleSize = (sampleSize, playerStats = {}) => {
  // If we have a valid sample size, use it
  if (sampleSize && sampleSize > 0) {
    return `${sampleSize} at-bats`;
  }
  
  // Try to calculate from player stats if available
  if (playerStats.total_ab && playerStats.total_ab > 0) {
    return `${playerStats.total_ab} at-bats (season)`;
  }
  
  // If we have games played, estimate at-bats
  if (playerStats.games_played && playerStats.games_played > 0) {
    const estimatedAB = playerStats.games_played * 3.5; // Average AB per game
    return `~${Math.round(estimatedAB)} at-bats (estimated)`;
  }
  
  // No data available
  return 'Limited data';
};

/**
 * Validate and format AB Since HR with reasonable bounds
 */
export const formatABSinceHR = (value, playerStats = {}) => {
  // Validate the value is reasonable
  if (value === null || value === undefined || value < 0) {
    return 'N/A';
  }
  
  // If the value seems unreasonably high, check if it needs adjustment
  if (value > 500 && playerStats.season_ab) {
    // Likely an error if AB since HR is greater than total season ABs
    if (value > playerStats.season_ab) {
      return `${playerStats.season_ab}+ (no HR this season)`;
    }
  }
  
  // Special case for no home runs
  if (value === 999 || value > 300) {
    return `${value}+ (extended drought)`;
  }
  
  return value.toString();
};

/**
 * Format confidence score with color class
 */
export const getConfidenceClass = (confidence) => {
  const normalized = normalizePercentage(confidence);
  if (normalized >= 75) return 'confidence-high';
  if (normalized >= 50) return 'confidence-medium';
  if (normalized >= 25) return 'confidence-low';
  return 'confidence-very-low';
};

/**
 * Format HR score with appropriate class
 */
export const getHRScoreClass = (score) => {
  if (score >= 70) return 'hr-score-excellent';
  if (score >= 50) return 'hr-score-good';
  if (score >= 30) return 'hr-score-average';
  return 'hr-score-low';
};

/**
 * Safely extract nested field value
 */
export const safeExtract = (obj, path, defaultValue = null) => {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value;
};

/**
 * Group opportunities by pitcher
 */
export const groupOpportunitiesByPitcher = (opportunities) => {
  const grouped = {};
  
  opportunities.forEach(opp => {
    const pitcher = opp.pitcher_name || opp.pitcher || 'Unknown Pitcher';
    if (!grouped[pitcher]) {
      grouped[pitcher] = {
        pitcher_name: pitcher,
        pitcher_team: opp.pitcher_team || opp.pitcherTeam,
        opportunities: []
      };
    }
    grouped[pitcher].opportunities.push(opp);
  });
  
  // Sort opportunities within each pitcher group by confidence
  Object.values(grouped).forEach(group => {
    group.opportunities.sort((a, b) => {
      const confA = normalizePercentage(a.confidence_score) || 0;
      const confB = normalizePercentage(b.confidence_score) || 0;
      return confB - confA;
    });
  });
  
  return grouped;
};