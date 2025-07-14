#!/usr/bin/env node

/**
 * Doubleheader Validator Utility
 * 
 * Distinguishes legitimate doubleheader games from duplicate data entries
 * by analyzing game timing, venue consistency, and team matchups.
 * 
 * Usage:
 *   const { isLegitimateDoubleheader, analyzeMultipleGames } = require('./doubleheaderValidator');
 */

/**
 * Doubleheader validation criteria
 */
const DOUBLEHEADER_CRITERIA = {
  MIN_TIME_SEPARATION_HOURS: 3,    // Minimum hours between doubleheader games
  MAX_TIME_SEPARATION_HOURS: 8,    // Maximum hours for same-day doubleheader
  TYPICAL_SEPARATION_HOURS: 4.5,   // Typical separation (day/night doubleheader)
  MAX_PLAYER_COUNT_VARIANCE: 0.3,  // 30% variance in player count acceptable
  MIN_GAMES_FOR_DOUBLEHEADER: 2,   // Minimum games to consider doubleheader
  MAX_GAMES_PER_DAY: 3             // Maximum reasonable games per day
};

/**
 * Parse game time from dateTime string
 * @param {string} dateTime - Game datetime in ISO format or similar
 * @returns {Date|null} Parsed date object or null if invalid
 */
function parseGameTime(dateTime) {
  if (!dateTime) return null;
  
  try {
    return new Date(dateTime);
  } catch (error) {
    console.warn(`Invalid dateTime format: ${dateTime}`);
    return null;
  }
}

/**
 * Calculate time difference between games in hours
 * @param {string} dateTime1 - First game datetime
 * @param {string} dateTime2 - Second game datetime
 * @returns {number|null} Hours between games or null if invalid
 */
function calculateTimeDifference(dateTime1, dateTime2) {
  const time1 = parseGameTime(dateTime1);
  const time2 = parseGameTime(dateTime2);
  
  if (!time1 || !time2) return null;
  
  const diffMs = Math.abs(time2.getTime() - time1.getTime());
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Analyze venue consistency for multiple games
 * @param {Array} games - Games to analyze
 * @returns {object} Venue analysis
 */
function analyzeVenueConsistency(games) {
  const venues = games.map(g => g.venue).filter(v => v);
  const uniqueVenues = [...new Set(venues)];
  
  return {
    venues,
    uniqueVenues,
    isConsistent: uniqueVenues.length <= 1,
    venueCount: uniqueVenues.length,
    primaryVenue: venues.length > 0 ? venues[0] : null
  };
}

/**
 * Analyze team matchup consistency
 * @param {Array} games - Games to analyze
 * @returns {object} Team analysis
 */
function analyzeTeamConsistency(games) {
  const matchups = games.map(g => ({
    home: g.homeTeam,
    away: g.awayTeam,
    matchup: `${g.awayTeam}@${g.homeTeam}`
  }));
  
  const uniqueMatchups = [...new Set(matchups.map(m => m.matchup))];
  
  return {
    matchups,
    uniqueMatchups,
    isIdenticalTeams: uniqueMatchups.length === 1,
    matchupCount: uniqueMatchups.length,
    primaryMatchup: matchups.length > 0 ? matchups[0] : null
  };
}

/**
 * Analyze game ID patterns for legitimacy
 * @param {Array} games - Games to analyze
 * @returns {object} Game ID analysis
 */
function analyzeGameIdPatterns(games) {
  const gameIds = games.map(g => g.gameId || g.originalId).filter(id => id);
  const uniqueGameIds = [...new Set(gameIds)];
  
  // Check if game IDs are sequential (common for doubleheaders)
  let isSequential = false;
  if (uniqueGameIds.length === 2) {
    const ids = uniqueGameIds.map(id => parseInt(id)).sort((a, b) => a - b);
    isSequential = Math.abs(ids[1] - ids[0]) <= 10; // Within 10 ID numbers
  }
  
  return {
    gameIds,
    uniqueGameIds,
    hasDuplicateIds: gameIds.length !== uniqueGameIds.length,
    isSequential,
    gameIdCount: uniqueGameIds.length
  };
}

/**
 * Calculate player count variance across games
 * @param {Array} games - Games with player arrays
 * @returns {object} Player count analysis
 */
function analyzePlayerCounts(games) {
  const playerCounts = games.map(g => {
    if (Array.isArray(g.players)) return g.players.length;
    if (typeof g.playerCount === 'number') return g.playerCount;
    return 0;
  });
  
  if (playerCounts.length === 0) {
    return { playerCounts: [], variance: 0, isConsistent: true };
  }
  
  const avgCount = playerCounts.reduce((a, b) => a + b, 0) / playerCounts.length;
  const maxVariance = Math.max(...playerCounts.map(count => Math.abs(count - avgCount) / avgCount));
  
  return {
    playerCounts,
    averageCount: avgCount,
    maxVariance,
    isConsistent: maxVariance <= DOUBLEHEADER_CRITERIA.MAX_PLAYER_COUNT_VARIANCE
  };
}

/**
 * Determine if multiple games represent a legitimate doubleheader
 * @param {Array} games - Games on the same date with same teams
 * @returns {object} Doubleheader analysis
 */
function isLegitimateDoubleheader(games) {
  if (!games || games.length < DOUBLEHEADER_CRITERIA.MIN_GAMES_FOR_DOUBLEHEADER) {
    return {
      isLegitimate: false,
      reason: 'Insufficient games for doubleheader analysis',
      confidence: 0
    };
  }

  if (games.length > DOUBLEHEADER_CRITERIA.MAX_GAMES_PER_DAY) {
    return {
      isLegitimate: false,
      reason: `Too many games (${games.length}) for legitimate doubleheader`,
      confidence: 0.9
    };
  }

  const venueAnalysis = analyzeVenueConsistency(games);
  const teamAnalysis = analyzeTeamConsistency(games);
  const gameIdAnalysis = analyzeGameIdPatterns(games);
  const playerAnalysis = analyzePlayerCounts(games);

  // Calculate time differences
  const timeDifferences = [];
  for (let i = 0; i < games.length - 1; i++) {
    const timeDiff = calculateTimeDifference(games[i].dateTime, games[i + 1].dateTime);
    if (timeDiff !== null) {
      timeDifferences.push(timeDiff);
    }
  }

  const analysis = {
    gameCount: games.length,
    venueAnalysis,
    teamAnalysis,
    gameIdAnalysis,
    playerAnalysis,
    timeDifferences,
    legitimacyChecks: {},
    isLegitimate: false,
    confidence: 0,
    reason: '',
    classification: 'unknown'
  };

  // Legitimacy checks
  const checks = analysis.legitimacyChecks;

  // Check 1: Same teams required for doubleheader
  checks.sameTeams = teamAnalysis.isIdenticalTeams;

  // Check 2: Same venue required
  checks.sameVenue = venueAnalysis.isConsistent;

  // Check 3: Different game IDs required (no exact duplicates)
  checks.differentGameIds = !gameIdAnalysis.hasDuplicateIds;

  // Check 4: Reasonable time separation
  checks.reasonableTimeSeparation = timeDifferences.every(diff => 
    diff >= DOUBLEHEADER_CRITERIA.MIN_TIME_SEPARATION_HOURS && 
    diff <= DOUBLEHEADER_CRITERIA.MAX_TIME_SEPARATION_HOURS
  );

  // Check 5: Consistent player counts
  checks.consistentPlayerCounts = playerAnalysis.isConsistent;

  // Check 6: Sequential or valid game IDs
  checks.validGameIds = gameIdAnalysis.isSequential || 
    gameIdAnalysis.uniqueGameIds.every(id => {
      const numId = parseInt(id);
      return numId >= 400000000 && numId <= 500000000; // Valid ESPN range
    });

  // Calculate confidence based on checks
  const checkValues = Object.values(checks);
  const passedChecks = checkValues.filter(check => check === true).length;
  const totalChecks = checkValues.length;
  
  analysis.confidence = passedChecks / totalChecks;

  // Determine legitimacy
  const criticalChecks = ['sameTeams', 'sameVenue', 'differentGameIds'];
  const criticalPass = criticalChecks.every(check => checks[check]);

  if (criticalPass && analysis.confidence >= 0.7) {
    analysis.isLegitimate = true;
    analysis.classification = 'legitimate_doubleheader';
    analysis.reason = 'Passes all critical checks for legitimate doubleheader';
  } else if (gameIdAnalysis.hasDuplicateIds) {
    analysis.isLegitimate = false;
    analysis.classification = 'duplicate_data';
    analysis.reason = 'Identical game IDs indicate duplicate data, not doubleheader';
  } else if (!teamAnalysis.isIdenticalTeams) {
    analysis.isLegitimate = false;
    analysis.classification = 'different_games';
    analysis.reason = 'Different team matchups indicate separate games, not doubleheader';
  } else if (!venueAnalysis.isConsistent) {
    analysis.isLegitimate = false;
    analysis.classification = 'different_venues';
    analysis.reason = 'Different venues indicate separate series, not doubleheader';
  } else {
    analysis.isLegitimate = false;
    analysis.classification = 'suspicious_pattern';
    analysis.reason = `Low confidence (${Math.round(analysis.confidence * 100)}%) in doubleheader legitimacy`;
  }

  return analysis;
}

/**
 * Analyze multiple games on the same date to categorize them
 * @param {Array} games - All games on a specific date
 * @returns {object} Comprehensive analysis of all games
 */
function analyzeMultipleGames(games) {
  if (!games || games.length <= 1) {
    return {
      singleGame: games.length === 1,
      analysis: null,
      recommendation: games.length === 1 ? 'retain' : 'investigate_missing'
    };
  }

  // Group games by team matchup
  const gameGroups = new Map();
  games.forEach(game => {
    const matchup = `${game.awayTeam}@${game.homeTeam}`;
    if (!gameGroups.has(matchup)) {
      gameGroups.set(matchup, []);
    }
    gameGroups.get(matchup).push(game);
  });

  const groupAnalyses = [];
  for (const [matchup, groupGames] of gameGroups) {
    if (groupGames.length > 1) {
      const analysis = isLegitimateDoubleheader(groupGames);
      groupAnalyses.push({
        matchup,
        games: groupGames,
        analysis
      });
    }
  }

  // Determine overall recommendation
  let overallRecommendation = 'retain_all';
  const suspiciousGroups = groupAnalyses.filter(g => !g.analysis.isLegitimate);
  
  if (suspiciousGroups.length > 0) {
    const duplicateGroups = suspiciousGroups.filter(g => 
      g.analysis.classification === 'duplicate_data'
    );
    
    if (duplicateGroups.length > 0) {
      overallRecommendation = 'remove_duplicates';
    } else {
      overallRecommendation = 'investigate_suspicious';
    }
  }

  return {
    totalGames: games.length,
    uniqueMatchups: gameGroups.size,
    groupAnalyses,
    suspiciousGroups: suspiciousGroups.length,
    legitimateDoubleheaders: groupAnalyses.filter(g => g.analysis.isLegitimate).length,
    recommendation: overallRecommendation,
    summary: generateAnalysisSummary(groupAnalyses)
  };
}

/**
 * Generate a human-readable summary of the analysis
 * @param {Array} groupAnalyses - Analysis results for each group
 * @returns {string} Summary text
 */
function generateAnalysisSummary(groupAnalyses) {
  if (groupAnalyses.length === 0) {
    return 'No multiple games found on this date';
  }

  const legitimate = groupAnalyses.filter(g => g.analysis.isLegitimate);
  const suspicious = groupAnalyses.filter(g => !g.analysis.isLegitimate);

  let summary = `Found ${groupAnalyses.length} team matchup(s) with multiple games. `;

  if (legitimate.length > 0) {
    summary += `${legitimate.length} legitimate doubleheader(s). `;
  }

  if (suspicious.length > 0) {
    const duplicates = suspicious.filter(g => g.analysis.classification === 'duplicate_data');
    const other = suspicious.filter(g => g.analysis.classification !== 'duplicate_data');

    if (duplicates.length > 0) {
      summary += `${duplicates.length} duplicate data issue(s). `;
    }
    if (other.length > 0) {
      summary += `${other.length} suspicious pattern(s) requiring investigation. `;
    }
  }

  return summary.trim();
}

/**
 * Get games that should be removed based on doubleheader analysis
 * @param {Array} games - Games to analyze
 * @returns {Array} Games recommended for removal
 */
function getGamesForRemoval(games) {
  const analysis = analyzeMultipleGames(games);
  const gamesToRemove = [];

  analysis.groupAnalyses.forEach(group => {
    if (!group.analysis.isLegitimate && group.analysis.classification === 'duplicate_data') {
      // For duplicate data, typically remove all but the first game
      // (assuming the first is the original and others are duplicates)
      const sortedGames = group.games.sort((a, b) => {
        const timeA = parseGameTime(a.dateTime);
        const timeB = parseGameTime(b.dateTime);
        if (timeA && timeB) return timeA.getTime() - timeB.getTime();
        return 0;
      });

      // Remove all but the first game
      gamesToRemove.push(...sortedGames.slice(1));
    }
  });

  return gamesToRemove;
}

module.exports = {
  isLegitimateDoubleheader,
  analyzeMultipleGames,
  getGamesForRemoval,
  analyzeVenueConsistency,
  analyzeTeamConsistency,
  analyzeGameIdPatterns,
  analyzePlayerCounts,
  calculateTimeDifference,
  generateAnalysisSummary,
  DOUBLEHEADER_CRITERIA
};