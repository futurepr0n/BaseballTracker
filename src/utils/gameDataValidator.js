/**
 * Game Data Validation Utility
 * 
 * Provides validation functions to detect and prevent duplicate entries
 * in game data processing and tooltip displays.
 */

/**
 * Find duplicate dates in game data array
 * @param {Array} gameData - Array of game objects with date information
 * @param {string} dateField - Field name containing the date ('date', 'date_display', etc.)
 * @returns {Array} Array of duplicate date information
 */
export const findDuplicateDates = (gameData, dateField = 'date_display') => {
  if (!gameData || !Array.isArray(gameData)) return [];
  
  const dateCount = new Map();
  const duplicates = [];
  
  gameData.forEach((game, index) => {
    const date = game[dateField] || game.date;
    if (!date) return;
    
    if (!dateCount.has(date)) {
      dateCount.set(date, []);
    }
    dateCount.get(date).push({ index, game });
  });
  
  // Find dates that appear more than once
  for (const [date, entries] of dateCount) {
    if (entries.length > 1) {
      duplicates.push({
        date,
        count: entries.length,
        entries: entries.map(entry => ({
          index: entry.index,
          data: entry.game
        }))
      });
    }
  }
  
  return duplicates;
};

/**
 * Validate game data for a specific player
 * @param {Array} gameData - Player's game data
 * @param {string} playerName - Player name for logging
 * @param {string} dateField - Date field to check
 * @returns {Object} Validation results
 */
export const validatePlayerGameData = (gameData, playerName, dateField = 'date_display') => {
  const duplicates = findDuplicateDates(gameData, dateField);
  const isValid = duplicates.length === 0;
  
  if (!isValid) {
    console.warn(`Duplicate dates found for ${playerName}:`, duplicates);
  }
  
  return {
    isValid,
    duplicateCount: duplicates.length,
    duplicates,
    playerName,
    totalGames: gameData?.length || 0
  };
};

/**
 * Clean duplicate entries from game data
 * @param {Array} gameData - Array of game objects
 * @param {string} dateField - Date field to deduplicate on
 * @param {Function} scoringFunction - Function to score entries for keeping the best one
 * @returns {Array} Deduplicated game data
 */
export const cleanDuplicateGameData = (gameData, dateField = 'date_display', scoringFunction = null) => {
  if (!gameData || !Array.isArray(gameData)) return [];
  
  const dateMap = new Map();
  const defaultScoring = (game) => (game.hits || 0) + (game.hr || 0) + (game.rbi || 0) + (game.abs || 0);
  const scorer = scoringFunction || defaultScoring;
  
  gameData.forEach(game => {
    const date = game[dateField] || game.date;
    if (!date) return;
    
    if (!dateMap.has(date)) {
      dateMap.set(date, game);
    } else {
      const existing = dateMap.get(date);
      const existingScore = scorer(existing);
      const newScore = scorer(game);
      
      // Keep the entry with higher score, or newer timestamp if scores are equal
      if (newScore > existingScore || 
          (newScore === existingScore && (game.timestamp || 0) > (existing.timestamp || 0))) {
        dateMap.set(date, game);
      }
    }
  });
  
  return Array.from(dateMap.values()).sort((a, b) => {
    const dateA = new Date(a[dateField] || a.date);
    const dateB = new Date(b[dateField] || b.date);
    return dateB - dateA; // Most recent first
  });
};

/**
 * Validate tooltip data before rendering
 * @param {Object} tooltipData - Tooltip data object
 * @returns {Object} Validation results and cleaned data
 */
export const validateTooltipData = (tooltipData) => {
  if (!tooltipData || !tooltipData.detailedGameTable) {
    return {
      isValid: true,
      cleanedData: tooltipData,
      duplicateCount: 0
    };
  }
  
  const gameData = tooltipData.detailedGameTable;
  const validation = validatePlayerGameData(gameData, tooltipData.player_name || 'Unknown');
  
  if (!validation.isValid) {
    const cleanedGameTable = cleanDuplicateGameData(gameData);
    return {
      isValid: false,
      originalDuplicateCount: validation.duplicateCount,
      cleanedData: {
        ...tooltipData,
        detailedGameTable: cleanedGameTable
      },
      duplicates: validation.duplicates
    };
  }
  
  return {
    isValid: true,
    cleanedData: tooltipData,
    duplicateCount: 0
  };
};

/**
 * Generate duplicate detection report for debugging
 * @param {Array} gameData - Game data to analyze
 * @param {string} playerName - Player name
 * @returns {Object} Detailed report
 */
export const generateDuplicateReport = (gameData, playerName) => {
  const duplicates = findDuplicateDates(gameData);
  
  return {
    player: playerName,
    timestamp: new Date().toISOString(),
    totalGames: gameData?.length || 0,
    duplicateCount: duplicates.length,
    duplicateDates: duplicates.map(dup => dup.date),
    detailed: duplicates,
    summary: duplicates.length > 0 ? 
      `Found ${duplicates.length} duplicate dates for ${playerName}` :
      `No duplicates found for ${playerName}`
  };
};

/**
 * Batch validate multiple players' game data
 * @param {Object} playerGameData - Object with player names as keys and game data as values
 * @returns {Object} Batch validation results
 */
export const batchValidateGameData = (playerGameData) => {
  const results = {};
  let totalDuplicates = 0;
  const problematicPlayers = [];
  
  for (const [playerName, gameData] of Object.entries(playerGameData)) {
    const validation = validatePlayerGameData(gameData, playerName);
    results[playerName] = validation;
    
    if (!validation.isValid) {
      totalDuplicates += validation.duplicateCount;
      problematicPlayers.push(playerName);
    }
  }
  
  return {
    totalPlayers: Object.keys(playerGameData).length,
    totalDuplicates,
    problematicPlayersCount: problematicPlayers.length,
    problematicPlayers,
    detailedResults: results,
    summary: `Validated ${Object.keys(playerGameData).length} players. Found ${totalDuplicates} total duplicates affecting ${problematicPlayers.length} players.`
  };
};

export default {
  findDuplicateDates,
  validatePlayerGameData,
  cleanDuplicateGameData,
  validateTooltipData,
  generateDuplicateReport,
  batchValidateGameData
};