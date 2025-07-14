#!/usr/bin/env node

/**
 * Duplicate Detection Service
 * 
 * Comprehensive service for detecting and analyzing duplicate game entries
 * while preserving legitimate doubleheader games. Integrates with validation
 * utilities to provide intelligent duplicate detection across the data pipeline.
 * 
 * Usage:
 *   const duplicateService = require('./duplicateDetectionService');
 *   const analysis = await duplicateService.analyzeDatasetForDuplicates('/path/to/data');
 */

const fs = require('fs').promises;
const path = require('path');
const gameIdValidator = require('../../utils/gameIdValidator');
const doubleheaderValidator = require('../../utils/doubleheaderValidator');

/**
 * Detection configuration and thresholds
 */
const DETECTION_CONFIG = {
  // Date range patterns to flag as suspicious
  SUSPICIOUS_DATE_RANGES: [
    { start: '2025-07-02', end: '2025-07-09', reason: 'Known systematic corruption period' }
  ],
  
  // Player statistics thresholds for validation
  STAT_VALIDATION: {
    MAX_REASONABLE_HITS_PER_GAME: 6,
    MAX_REASONABLE_HR_PER_GAME: 4,
    MIN_REASONABLE_AB_FOR_HITS: 1
  },
  
  // Game validation thresholds
  GAME_VALIDATION: {
    MIN_PLAYERS_PER_GAME: 15,
    MAX_PLAYERS_PER_GAME: 30,
    TYPICAL_PLAYERS_PER_GAME: 22
  },
  
  // Analysis confidence thresholds
  CONFIDENCE_THRESHOLDS: {
    HIGH_CONFIDENCE_DUPLICATE: 0.85,
    MEDIUM_CONFIDENCE_DUPLICATE: 0.65,
    LOW_CONFIDENCE_SUSPICIOUS: 0.4
  }
};

/**
 * Load all daily JSON files from the data directory
 * @param {string} dataDir - Base data directory path
 * @returns {Map} Map of date -> game data
 */
async function loadAllGameData(dataDir = 'public/data/2025') {
  const gamesByDate = new Map();
  const months = ['march', 'april', 'may', 'june', 'july'];
  
  for (const month of months) {
    const monthDir = path.resolve(dataDir, month);
    
    try {
      const files = await fs.readdir(monthDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
      
      for (const file of jsonFiles) {
        const filePath = path.join(monthDir, file);
        try {
          const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
          const date = data.date || file.replace('.json', '').replace(month + '_', '');
          
          gamesByDate.set(date, {
            date,
            month,
            file,
            filePath,
            games: data.games || [],
            players: data.players || data,
            rawData: data
          });
        } catch (error) {
          console.warn(`Error loading ${filePath}:`, error.message);
        }
      }
    } catch (error) {
      console.warn(`Error reading month directory ${monthDir}:`, error.message);
    }
  }
  
  return gamesByDate;
}

/**
 * Extract player games for duplicate analysis
 * @param {Map} gamesByDate - Game data by date
 * @returns {Map} Map of playerKey -> array of games
 */
function extractPlayerGames(gamesByDate) {
  const playerGames = new Map();
  
  for (const [date, dateData] of gamesByDate) {
    const playersArray = Array.isArray(dateData.players) ? dateData.players : 
                        (Array.isArray(dateData.rawData) ? dateData.rawData : []);
    
    playersArray.forEach(player => {
      if (player.playerType === 'hitter' && player.name && player.team) {
        const playerKey = `${player.name}_${player.team}`;
        
        if (!playerGames.has(playerKey)) {
          playerGames.set(playerKey, []);
        }
        
        playerGames.get(playerKey).push({
          ...player,
          date,
          month: dateData.month,
          file: dateData.file,
          filePath: dateData.filePath
        });
      }
    });
  }
  
  return playerGames;
}

/**
 * Analyze cross-date duplicate patterns
 * @param {Map} gamesByDate - Game data by date
 * @returns {Array} Array of cross-date duplicate issues
 */
function analyzeCrossDateDuplicates(gamesByDate) {
  const gameIdOccurrences = new Map();
  const crossDateDuplicates = [];
  
  // Track all game ID occurrences across dates
  for (const [date, dateData] of gamesByDate) {
    dateData.games.forEach(game => {
      const gameId = game.gameId || game.originalId;
      if (!gameId) return;
      
      if (!gameIdOccurrences.has(gameId)) {
        gameIdOccurrences.set(gameId, []);
      }
      
      gameIdOccurrences.get(gameId).push({
        date,
        game,
        dateData
      });
    });
  }
  
  // Find cross-date duplicates
  for (const [gameId, occurrences] of gameIdOccurrences) {
    if (occurrences.length > 1) {
      const uniqueDates = [...new Set(occurrences.map(o => o.date))];
      
      if (uniqueDates.length > 1) {
        // Same game ID on different dates - suspicious
        const teamPairs = occurrences.map(o => 
          `${o.game.awayTeam}@${o.game.homeTeam}`
        );
        const uniqueTeamPairs = [...new Set(teamPairs)];
        
        crossDateDuplicates.push({
          type: 'cross_date_duplicate',
          gameId,
          dates: uniqueDates,
          occurrences,
          teamMatchups: uniqueTeamPairs,
          severity: uniqueTeamPairs.length === 1 ? 'high' : 'critical',
          analysis: {
            sameTeams: uniqueTeamPairs.length === 1,
            dateSpread: uniqueDates.length,
            totalOccurrences: occurrences.length
          }
        });
      }
    }
  }
  
  return crossDateDuplicates.sort((a, b) => {
    const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

/**
 * Analyze player statistics for duplicate indicators
 * @param {Map} playerGames - Player games by player key
 * @returns {Array} Array of player duplicate issues
 */
function analyzePlayerDuplicates(playerGames) {
  const playerDuplicates = [];
  
  for (const [playerKey, games] of playerGames) {
    const gameIdMap = new Map();
    const duplicateIssues = [];
    
    // Check for duplicate game IDs per player
    games.forEach(game => {
      const gameId = game.gameId;
      if (!gameId) return;
      
      if (gameIdMap.has(gameId)) {
        const existingGame = gameIdMap.get(gameId);
        duplicateIssues.push({
          type: 'player_duplicate_gameId',
          gameId,
          games: [existingGame, game],
          severity: 'high',
          statsImpact: {
            extraHits: parseInt(game.H) || 0,
            extraAB: parseInt(game.AB) || 0,
            extraRuns: parseInt(game.R) || 0,
            extraRBI: parseInt(game.RBI) || 0,
            extraHR: parseInt(game.HR) || 0
          }
        });
      } else {
        gameIdMap.set(gameId, game);
      }
    });
    
    // Check for impossible statistics
    games.forEach(game => {
      const hits = parseInt(game.H) || 0;
      const ab = parseInt(game.AB) || 0;
      const hr = parseInt(game.HR) || 0;
      
      if (hits > DETECTION_CONFIG.STAT_VALIDATION.MAX_REASONABLE_HITS_PER_GAME) {
        duplicateIssues.push({
          type: 'impossible_stats',
          severity: 'medium',
          description: `${hits} hits in one game is extremely unlikely`,
          game
        });
      }
      
      if (hr > DETECTION_CONFIG.STAT_VALIDATION.MAX_REASONABLE_HR_PER_GAME) {
        duplicateIssues.push({
          type: 'impossible_stats',
          severity: 'medium',
          description: `${hr} home runs in one game is extremely unlikely`,
          game
        });
      }
      
      if (hits > 0 && ab === 0) {
        duplicateIssues.push({
          type: 'impossible_stats',
          severity: 'high',
          description: `${hits} hits with 0 at-bats is impossible`,
          game
        });
      }
    });
    
    if (duplicateIssues.length > 0) {
      // Calculate total stats impact
      const totalStatsImpact = duplicateIssues
        .filter(issue => issue.statsImpact)
        .reduce((total, issue) => ({
          extraHits: total.extraHits + issue.statsImpact.extraHits,
          extraAB: total.extraAB + issue.statsImpact.extraAB,
          extraRuns: total.extraRuns + issue.statsImpact.extraRuns,
          extraRBI: total.extraRBI + issue.statsImpact.extraRBI,
          extraHR: total.extraHR + issue.statsImpact.extraHR
        }), { extraHits: 0, extraAB: 0, extraRuns: 0, extraRBI: 0, extraHR: 0 });
      
      playerDuplicates.push({
        playerKey,
        playerName: playerKey.split('_')[0],
        team: playerKey.split('_')[1],
        issues: duplicateIssues,
        totalGames: games.length,
        totalStatsImpact,
        affectedDates: [...new Set(duplicateIssues.flatMap(issue => 
          issue.games ? issue.games.map(g => g.date) : [issue.game?.date]
        ).filter(d => d))]
      });
    }
  }
  
  return playerDuplicates.sort((a, b) => 
    b.totalStatsImpact.extraHits - a.totalStatsImpact.extraHits
  );
}

/**
 * Analyze same-date multiple games for doubleheader legitimacy
 * @param {Map} gamesByDate - Game data by date
 * @returns {Array} Array of same-date multiple game analyses
 */
function analyzeSameDateMultipleGames(gamesByDate) {
  const sameDateAnalyses = [];
  
  for (const [date, dateData] of gamesByDate) {
    if (dateData.games.length > 1) {
      const analysis = doubleheaderValidator.analyzeMultipleGames(dateData.games);
      
      if (analysis.suspiciousGroups > 0) {
        sameDateAnalyses.push({
          date,
          dateData,
          analysis,
          suspiciousGroups: analysis.groupAnalyses.filter(g => !g.analysis.isLegitimate),
          legitimateDoubleheaders: analysis.groupAnalyses.filter(g => g.analysis.isLegitimate)
        });
      }
    }
  }
  
  return sameDateAnalyses;
}

/**
 * Check if date falls within known suspicious ranges
 * @param {string} date - Date to check (YYYY-MM-DD format)
 * @returns {object|null} Suspicious range info or null
 */
function checkSuspiciousDateRange(date) {
  for (const range of DETECTION_CONFIG.SUSPICIOUS_DATE_RANGES) {
    if (date >= range.start && date <= range.end) {
      return range;
    }
  }
  return null;
}

/**
 * Generate removal recommendations based on analysis
 * @param {object} analysisResults - Complete analysis results
 * @returns {Array} Array of recommended removals
 */
function generateRemovalRecommendations(analysisResults) {
  const recommendations = [];
  
  // Process cross-date duplicates
  analysisResults.crossDateDuplicates.forEach(duplicate => {
    if (duplicate.severity === 'critical' || duplicate.severity === 'high') {
      // For cross-date duplicates, recommend removing later occurrences
      const sortedOccurrences = duplicate.occurrences.sort((a, b) => 
        a.date.localeCompare(b.date)
      );
      
      // Keep the first occurrence, remove the rest
      sortedOccurrences.slice(1).forEach(occurrence => {
        recommendations.push({
          action: 'remove_game',
          reason: `Cross-date duplicate of gameId ${duplicate.gameId}`,
          file: occurrence.dateData.filePath,
          gameId: duplicate.gameId,
          date: occurrence.date,
          severity: duplicate.severity,
          confidence: 0.9
        });
      });
    }
  });
  
  // Process same-date suspicious games
  analysisResults.sameDateMultipleGames.forEach(dateAnalysis => {
    dateAnalysis.suspiciousGroups.forEach(group => {
      if (group.analysis.classification === 'duplicate_data') {
        const gamesToRemove = doubleheaderValidator.getGamesForRemoval(group.games);
        
        gamesToRemove.forEach(game => {
          recommendations.push({
            action: 'remove_game',
            reason: `Duplicate data on same date`,
            file: dateAnalysis.dateData.filePath,
            gameId: game.gameId || game.originalId,
            date: dateAnalysis.date,
            severity: 'high',
            confidence: 0.85
          });
        });
      }
    });
  });
  
  // Process player-level duplicates with suspicious date ranges
  analysisResults.playerDuplicates.forEach(playerDup => {
    playerDup.issues.forEach(issue => {
      if (issue.type === 'player_duplicate_gameId') {
        // Check if dates fall in suspicious ranges
        const suspiciousGames = issue.games.filter(game => 
          checkSuspiciousDateRange(game.date)
        );
        
        if (suspiciousGames.length > 0) {
          // Remove games in suspicious date ranges
          suspiciousGames.forEach(game => {
            recommendations.push({
              action: 'remove_player_game',
              reason: `Player duplicate in suspicious date range`,
              file: game.filePath,
              gameId: game.gameId,
              date: game.date,
              playerKey: playerDup.playerKey,
              severity: 'high',
              confidence: 0.8,
              statsImpact: issue.statsImpact
            });
          });
        }
      }
    });
  });
  
  return recommendations.sort((a, b) => {
    // Sort by confidence (highest first), then by severity
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

/**
 * Comprehensive duplicate analysis of the entire dataset
 * @param {string} dataDir - Data directory path
 * @returns {object} Complete analysis results
 */
async function analyzeDatasetForDuplicates(dataDir = 'public/data/2025') {
  console.log('🔍 Starting comprehensive duplicate analysis...');
  
  // Load all game data
  const gamesByDate = await loadAllGameData(dataDir);
  console.log(`📊 Loaded ${gamesByDate.size} dates`);
  
  // Extract player games
  const playerGames = extractPlayerGames(gamesByDate);
  console.log(`👥 Analyzing ${playerGames.size} unique players`);
  
  // Run all analyses
  const analysisResults = {
    metadata: {
      analysisDate: new Date().toISOString(),
      dataDirectory: dataDir,
      totalDates: gamesByDate.size,
      totalPlayers: playerGames.size
    },
    crossDateDuplicates: analyzeCrossDateDuplicates(gamesByDate),
    playerDuplicates: analyzePlayerDuplicates(playerGames),
    sameDateMultipleGames: analyzeSameDateMultipleGames(gamesByDate),
    gameIdHealth: gameIdValidator.generateGameIdHealthReport(
      Array.from(gamesByDate.values()).flatMap(d => d.games)
    )
  };
  
  // Generate removal recommendations
  analysisResults.removalRecommendations = generateRemovalRecommendations(analysisResults);
  
  // Calculate summary statistics
  analysisResults.summary = {
    totalIssues: analysisResults.crossDateDuplicates.length + 
                analysisResults.playerDuplicates.length + 
                analysisResults.sameDateMultipleGames.length,
    affectedPlayers: analysisResults.playerDuplicates.length,
    affectedDates: [...new Set([
      ...analysisResults.crossDateDuplicates.flatMap(d => d.dates),
      ...analysisResults.sameDateMultipleGames.map(d => d.date)
    ])].length,
    totalRemovalRecommendations: analysisResults.removalRecommendations.length,
    highConfidenceRemovals: analysisResults.removalRecommendations.filter(r => 
      r.confidence >= DETECTION_CONFIG.CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE_DUPLICATE
    ).length
  };
  
  console.log(`✅ Analysis complete: ${analysisResults.summary.totalIssues} issues found`);
  
  return analysisResults;
}

/**
 * Save analysis results to file
 * @param {object} analysisResults - Analysis results to save
 * @param {string} outputPath - Output file path
 */
async function saveAnalysisResults(analysisResults, outputPath = 'duplicate_analysis_results.json') {
  try {
    await fs.writeFile(outputPath, JSON.stringify(analysisResults, null, 2));
    console.log(`📄 Analysis results saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error saving analysis results:', error);
  }
}

/**
 * Generate human-readable report
 * @param {object} analysisResults - Analysis results
 * @returns {string} Human-readable report
 */
function generateReport(analysisResults) {
  const { summary, crossDateDuplicates, playerDuplicates, removalRecommendations } = analysisResults;
  
  let report = `
🔍 DUPLICATE DETECTION ANALYSIS REPORT
=====================================

📊 SUMMARY:
- Total Issues Found: ${summary.totalIssues}
- Affected Players: ${summary.affectedPlayers}
- Affected Dates: ${summary.affectedDates}
- Removal Recommendations: ${summary.totalRemovalRecommendations}
- High Confidence Removals: ${summary.highConfidenceRemovals}

🚨 CROSS-DATE DUPLICATES (${crossDateDuplicates.length}):
`;

  crossDateDuplicates.slice(0, 10).forEach(duplicate => {
    report += `- GameId ${duplicate.gameId}: ${duplicate.dates.join(', ')} [${duplicate.severity}]
`;
  });

  report += `
👥 TOP AFFECTED PLAYERS (${Math.min(10, playerDuplicates.length)}):
`;

  playerDuplicates.slice(0, 10).forEach(player => {
    report += `- ${player.playerName} (${player.team}): +${player.totalStatsImpact.extraHits} hits, ${player.issues.length} issues
`;
  });

  report += `
🎯 HIGH CONFIDENCE REMOVAL RECOMMENDATIONS (${summary.highConfidenceRemovals}):
`;

  removalRecommendations
    .filter(r => r.confidence >= DETECTION_CONFIG.CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE_DUPLICATE)
    .slice(0, 15)
    .forEach(rec => {
      report += `- ${rec.action}: ${rec.reason} (${rec.date}, confidence: ${Math.round(rec.confidence * 100)}%)
`;
    });

  return report;
}

module.exports = {
  analyzeDatasetForDuplicates,
  saveAnalysisResults,
  generateReport,
  analyzeCrossDateDuplicates,
  analyzePlayerDuplicates,
  analyzeSameDateMultipleGames,
  generateRemovalRecommendations,
  checkSuspiciousDateRange,
  DETECTION_CONFIG
};