#!/usr/bin/env node

/**
 * Game ID Validator Utility
 * 
 * Provides comprehensive validation logic for MLB game IDs to distinguish
 * between legitimate game identifiers and potentially corrupt/duplicate data.
 * 
 * Usage:
 *   const { isValidGameId, analyzeGameIdPattern, detectSuspiciousIds } = require('./gameIdValidator');
 */

/**
 * Valid ESPN Game ID ranges and patterns
 */
const VALID_GAME_ID_RANGES = {
  ESPN_PRIMARY: { min: 400000000, max: 500000000 },  // Primary ESPN range
  ESPN_SECONDARY: { min: 360000000, max: 399999999 }, // Secondary ESPN range
  SCHEDULE_IDS: { min: 1, max: 99999 }  // Schedule generator IDs
};

/**
 * Known problematic game ID patterns from analysis
 */
const SUSPICIOUS_PATTERNS = [
  401769356,  // Known duplicate (NYY vs TOR)
  401764563,  // Reused across different teams
  401696251,  // CIN @ PHI then MIA @ CIN
  401696252,  // DET @ CLE then CLE @ HOU
];

/**
 * Validate if a game ID is in a legitimate range
 * @param {string|number} gameId - Game ID to validate
 * @returns {object} Validation result with validity and range info
 */
function isValidGameId(gameId) {
  const numericId = parseInt(gameId);
  
  if (isNaN(numericId)) {
    return {
      isValid: false,
      reason: 'Non-numeric game ID',
      range: null,
      suspiciousLevel: 'high'
    };
  }

  // Check ESPN primary range (most common)
  if (numericId >= VALID_GAME_ID_RANGES.ESPN_PRIMARY.min && 
      numericId <= VALID_GAME_ID_RANGES.ESPN_PRIMARY.max) {
    return {
      isValid: true,
      reason: 'Valid ESPN primary range',
      range: 'ESPN_PRIMARY',
      suspiciousLevel: 'none'
    };
  }

  // Check ESPN secondary range
  if (numericId >= VALID_GAME_ID_RANGES.ESPN_SECONDARY.min && 
      numericId <= VALID_GAME_ID_RANGES.ESPN_SECONDARY.max) {
    return {
      isValid: true,
      reason: 'Valid ESPN secondary range',
      range: 'ESPN_SECONDARY',
      suspiciousLevel: 'low'
    };
  }

  // Check schedule generator range (small IDs)
  if (numericId >= VALID_GAME_ID_RANGES.SCHEDULE_IDS.min && 
      numericId <= VALID_GAME_ID_RANGES.SCHEDULE_IDS.max) {
    return {
      isValid: true,
      reason: 'Valid schedule generator ID',
      range: 'SCHEDULE_IDS',
      suspiciousLevel: 'medium'  // These need more validation
    };
  }

  // Outside all valid ranges
  return {
    isValid: false,
    reason: `Game ID ${numericId} outside valid ranges`,
    range: null,
    suspiciousLevel: 'high'
  };
}

/**
 * Analyze game ID for suspicious patterns
 * @param {string|number} gameId - Game ID to analyze
 * @param {object} gameData - Optional game data for context
 * @returns {object} Suspicion analysis
 */
function analyzeGameIdPattern(gameId, gameData = {}) {
  const numericId = parseInt(gameId);
  const validation = isValidGameId(gameId);
  
  const analysis = {
    gameId: numericId,
    validation,
    isSuspicious: false,
    suspiciousReasons: [],
    confidence: 1.0
  };

  // Check against known suspicious patterns
  if (SUSPICIOUS_PATTERNS.includes(numericId)) {
    analysis.isSuspicious = true;
    analysis.suspiciousReasons.push('Known problematic game ID from previous analysis');
    analysis.confidence = 0.1;
  }

  // Check for extremely low IDs (likely schedule placeholders)
  if (numericId < 1000 && numericId > 0) {
    analysis.isSuspicious = true;
    analysis.suspiciousReasons.push('Extremely low game ID - likely placeholder');
    analysis.confidence = Math.max(0.3, analysis.confidence);
  }

  // Check for IDs that look like dates or other patterns
  const idString = numericId.toString();
  if (idString.length === 8 && idString.startsWith('20')) {
    analysis.isSuspicious = true;
    analysis.suspiciousReasons.push('Game ID resembles date format (YYYYMMDD)');
    analysis.confidence = Math.max(0.2, analysis.confidence);
  }

  // Context-based validation
  if (gameData.teams && gameData.date) {
    // Check if game ID is reasonable for the date
    const gameDate = new Date(gameData.date);
    const year = gameDate.getFullYear();
    
    // ESPN IDs roughly correlate with year and sequence
    if (numericId >= VALID_GAME_ID_RANGES.ESPN_PRIMARY.min) {
      const estimatedYear = Math.floor((numericId - 400000000) / 10000) + 2020;
      if (Math.abs(estimatedYear - year) > 2) {
        analysis.isSuspicious = true;
        analysis.suspiciousReasons.push(
          `Game ID suggests year ${estimatedYear} but game date is ${year}`
        );
        analysis.confidence = Math.max(0.4, analysis.confidence);
      }
    }
  }

  return analysis;
}

/**
 * Detect suspicious game IDs in a collection of games
 * @param {Array} games - Array of game objects with gameId/originalId
 * @returns {Array} Array of suspicious game analyses
 */
function detectSuspiciousIds(games) {
  const suspiciousGames = [];
  const gameIdCounts = new Map();
  
  // First pass: count game ID usage
  games.forEach(game => {
    const gameId = game.gameId || game.originalId;
    if (gameId) {
      const count = gameIdCounts.get(gameId) || 0;
      gameIdCounts.set(gameId, count + 1);
    }
  });

  // Second pass: analyze each game
  games.forEach(game => {
    const gameId = game.gameId || game.originalId;
    if (!gameId) return;

    const analysis = analyzeGameIdPattern(gameId, {
      teams: { home: game.homeTeam, away: game.awayTeam },
      date: game.date,
      venue: game.venue
    });

    // Check for repeated usage
    const usageCount = gameIdCounts.get(gameId);
    if (usageCount > 1) {
      analysis.isSuspicious = true;
      analysis.suspiciousReasons.push(
        `Game ID used ${usageCount} times across dataset`
      );
      analysis.confidence = Math.min(0.3, analysis.confidence);
    }

    if (analysis.isSuspicious || analysis.validation.suspiciousLevel !== 'none') {
      suspiciousGames.push({
        ...analysis,
        gameData: game,
        usageCount
      });
    }
  });

  return suspiciousGames.sort((a, b) => a.confidence - b.confidence);
}

/**
 * Validate game ID consistency across a date range
 * @param {Map} gamesByDate - Map of date -> games array
 * @returns {object} Consistency analysis
 */
function validateGameIdConsistency(gamesByDate) {
  const inconsistencies = [];
  const crossDateDuplicates = new Map();

  // Track game IDs across dates
  for (const [date, games] of gamesByDate) {
    games.forEach(game => {
      const gameId = game.gameId || game.originalId;
      if (!gameId) return;

      if (!crossDateDuplicates.has(gameId)) {
        crossDateDuplicates.set(gameId, []);
      }
      crossDateDuplicates.get(gameId).push({ date, game });
    });
  }

  // Find cross-date duplicates
  for (const [gameId, occurrences] of crossDateDuplicates) {
    if (occurrences.length > 1) {
      const dates = occurrences.map(o => o.date);
      const uniqueDates = [...new Set(dates)];
      
      if (uniqueDates.length > 1) {
        // Same game ID across different dates - likely duplicate
        inconsistencies.push({
          type: 'cross_date_duplicate',
          gameId,
          dates: uniqueDates,
          occurrences,
          severity: 'high',
          reason: `Game ID ${gameId} appears on multiple dates: ${uniqueDates.join(', ')}`
        });
      }
    }
  }

  return {
    inconsistencies,
    totalGames: Array.from(gamesByDate.values()).flat().length,
    suspiciousCount: inconsistencies.length,
    isHealthy: inconsistencies.length === 0
  };
}

/**
 * Generate a report of game ID health for a dataset
 * @param {Array} games - Array of game objects
 * @returns {object} Comprehensive health report
 */
function generateGameIdHealthReport(games) {
  const report = {
    totalGames: games.length,
    validGames: 0,
    suspiciousGames: 0,
    invalidGames: 0,
    rangeDistribution: {
      ESPN_PRIMARY: 0,
      ESPN_SECONDARY: 0,
      SCHEDULE_IDS: 0,
      INVALID: 0
    },
    suspiciousPatterns: [],
    recommendations: []
  };

  games.forEach(game => {
    const gameId = game.gameId || game.originalId;
    if (!gameId) {
      report.invalidGames++;
      return;
    }

    const validation = isValidGameId(gameId);
    const analysis = analyzeGameIdPattern(gameId, game);

    if (validation.isValid) {
      report.validGames++;
      report.rangeDistribution[validation.range]++;
    } else {
      report.invalidGames++;
      report.rangeDistribution.INVALID++;
    }

    if (analysis.isSuspicious) {
      report.suspiciousGames++;
      report.suspiciousPatterns.push(analysis);
    }
  });

  // Generate recommendations
  if (report.suspiciousGames > 0) {
    report.recommendations.push(
      `${report.suspiciousGames} games have suspicious game IDs - review and validate`
    );
  }

  if (report.invalidGames > 0) {
    report.recommendations.push(
      `${report.invalidGames} games have invalid game IDs - regenerate from source`
    );
  }

  if (report.rangeDistribution.SCHEDULE_IDS > report.totalGames * 0.1) {
    report.recommendations.push(
      'High percentage of schedule generator IDs - ensure ESPN IDs are populated'
    );
  }

  return report;
}

module.exports = {
  isValidGameId,
  analyzeGameIdPattern,
  detectSuspiciousIds,
  validateGameIdConsistency,
  generateGameIdHealthReport,
  VALID_GAME_ID_RANGES,
  SUSPICIOUS_PATTERNS
};