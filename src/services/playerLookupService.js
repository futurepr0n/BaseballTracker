/**
 * Player Lookup Service - Enhanced player data retrieval with team change support
 * 
 * This service provides enhanced lookup functions that work with the playerMappingService
 * to aggregate player data across team changes and name variations.
 */

const playerMappingService = require('./playerMappingService.js');

/**
 * Enhanced findMostRecentPlayerStats that works across team changes
 * @param {Object} dateRangeData - Map of date -> player data arrays
 * @param {string} playerName - Player name
 * @param {string} teamAbbr - Team abbreviation
 * @param {string} gameDate - Optional game date for team validation
 * @returns {Object} Player stats and the date they're from
 */
function findMostRecentPlayerStats(dateRangeData, playerName, teamAbbr, gameDate = null) {
  // First try direct lookup (current approach)
  const directResult = findMostRecentPlayerStatsDirect(dateRangeData, playerName, teamAbbr);
  if (directResult.data) {
    return directResult;
  }
  
  // If not found, try player mapping service
  const mappedPlayer = playerMappingService.findPlayerByNameAndTeam(playerName, teamAbbr, gameDate);
  if (!mappedPlayer) {
    return { data: null, date: null };
  }
  
  // Get all aliases for this player and search for data
  const aliases = playerMappingService.getPlayerAliases(mappedPlayer.playerId);
  
  // Sort dates from newest to oldest
  const sortedDates = Object.keys(dateRangeData).sort().reverse();
  
  for (const dateStr of sortedDates) {
    const playersForDate = dateRangeData[dateStr];
    
    // Try each alias combination
    for (const alias of aliases) {
      const playerData = playersForDate.find(p => 
        p.name === alias.name && p.team === alias.team
      );
      
      if (playerData) {
        return {
          data: playerData,
          date: dateStr,
          playerId: mappedPlayer.playerId,
          originalTeam: alias.team !== teamAbbr ? alias.team : null
        };
      }
    }
  }
  
  return { data: null, date: null };
}

/**
 * Direct lookup function (original implementation)
 */
function findMostRecentPlayerStatsDirect(dateRangeData, playerName, teamAbbr) {
  const sortedDates = Object.keys(dateRangeData).sort().reverse();
  
  for (const dateStr of sortedDates) {
    const playersForDate = dateRangeData[dateStr];
    const playerData = playersForDate.find(p => 
      p.name === playerName && p.team === teamAbbr
    );
    
    if (playerData) {
      return {
        data: playerData,
        date: dateStr
      };
    }
  }
  
  return { data: null, date: null };
}

/**
 * Enhanced findMultiGamePlayerStats that aggregates across team changes
 * @param {Object} dateRangeData - Map of date -> player data arrays
 * @param {string} playerName - Player name
 * @param {string} teamAbbr - Team abbreviation
 * @param {number} numGames - Number of games to retrieve
 * @param {string} gameDate - Optional game date for team validation
 * @returns {Array} Array of player game data objects
 */
function findMultiGamePlayerStats(dateRangeData, playerName, teamAbbr, numGames = 3, gameDate = null) {
  // Try direct lookup first
  const directGames = findMultiGamePlayerStatsDirect(dateRangeData, playerName, teamAbbr, numGames);
  if (directGames.length >= numGames) {
    return directGames;
  }
  
  // Use player mapping service to get full history
  const mappedPlayer = playerMappingService.findPlayerByNameAndTeam(playerName, teamAbbr, gameDate);
  if (!mappedPlayer) {
    return directGames; // Return what we found directly
  }
  
  // Get all aliases for this player
  const aliases = playerMappingService.getPlayerAliases(mappedPlayer.playerId);
  
  // Sort dates from newest to oldest
  const sortedDates = Object.keys(dateRangeData).sort().reverse();
  const games = [];
  
  for (const dateStr of sortedDates) {
    if (games.length >= numGames) break;
    
    const playersForDate = dateRangeData[dateStr];
    
    // Try each alias combination
    for (const alias of aliases) {
      const playerData = playersForDate.find(p => 
        p.name === alias.name && p.team === alias.team
      );
      
      if (playerData) {
        games.push({
          data: playerData,
          date: dateStr,
          playerId: mappedPlayer.playerId,
          originalTeam: alias.team !== teamAbbr ? alias.team : null
        });
        break; // Found player for this date, move to next date
      }
    }
  }
  
  return games;
}

/**
 * Direct multi-game lookup (original implementation)
 */
function findMultiGamePlayerStatsDirect(dateRangeData, playerName, teamAbbr, numGames) {
  const sortedDates = Object.keys(dateRangeData).sort().reverse();
  const games = [];
  
  for (const dateStr of sortedDates) {
    if (games.length >= numGames) break;
    
    const playersForDate = dateRangeData[dateStr];
    const playerData = playersForDate.find(p => 
      p.name === playerName && p.team === teamAbbr
    );
    
    if (playerData) {
      games.push({
        data: playerData,
        date: dateStr
      });
    }
  }
  
  return games;
}

/**
 * Enhanced analyzePlayerVsOpponent that considers team changes
 * @param {string} playerName - Player name
 * @param {string} playerTeam - Current player team
 * @param {string} opponentTeam - Opponent team
 * @param {Object} dateRangeData - Date range data
 * @param {string} gameDate - Optional game date
 * @returns {Object} Analysis of player vs opponent performance
 */
async function analyzePlayerVsOpponent(playerName, playerTeam, opponentTeam, dateRangeData, gameDate = null) {
  console.log(`[analyzePlayerVsOpponent] Looking for ${playerName} (${playerTeam}) vs ${opponentTeam}`);
  
  // Get player mapping to find all team affiliations
  const mappedPlayer = playerMappingService.findPlayerByNameAndTeam(playerName, playerTeam, gameDate);
  let aliases = [{ name: playerName, team: playerTeam }]; // Default to direct lookup
  
  if (mappedPlayer) {
    aliases = playerMappingService.getPlayerAliases(mappedPlayer.playerId);
    console.log(`[analyzePlayerVsOpponent] Found ${aliases.length} team affiliations for ${playerName}`);
  }
  
  let totalGames = 0;
  let totalAB = 0;
  let totalHits = 0;
  let totalHRs = 0;
  let gameDetails = [];
  
  // Process each date in the range
  const sortedDates = Object.keys(dateRangeData).sort();
  
  for (const dateStr of sortedDates) {
    const playersForDate = dateRangeData[dateStr];
    
    // Try each alias
    for (const alias of aliases) {
      const playerData = playersForDate.find(p => 
        p.name === alias.name && p.team === alias.team
      );
      
      if (playerData) {
        // Verify this was actually a game against the opponent
        const isVsOpponent = await verifyGameVsOpponent(dateStr, alias.team, opponentTeam, playersForDate);
        
        if (isVsOpponent) {
          totalGames++;
          totalAB += parseInt(playerData.AB) || 0;
          totalHits += parseInt(playerData.H) || 0;
          totalHRs += parseInt(playerData.HR) || 0;
          
          gameDetails.push({
            date: dateStr,
            team: alias.team,
            opponent: opponentTeam,
            AB: playerData.AB || 0,
            H: playerData.H || 0,
            HR: playerData.HR || 0,
            AVG: playerData.AVG || '.000',
            wasTeamChange: alias.team !== playerTeam
          });
          
          console.log(`[analyzePlayerVsOpponent] Found game on ${dateStr}: ${playerName} (${alias.team}) vs ${opponentTeam}`);
        }
        break; // Found player for this date
      }
    }
  }
  
  if (totalGames === 0) {
    console.log(`[analyzePlayerVsOpponent] No games found for ${playerName} vs ${opponentTeam}`);
    return {
      games: 0,
      AB: 0,
      hits: 0,
      homeRuns: 0,
      average: '.000',
      details: []
    };
  }
  
  const average = totalAB > 0 ? (totalHits / totalAB).toFixed(3) : '.000';
  
  console.log(`[analyzePlayerVsOpponent] Found ${totalGames} games for ${playerName} vs ${opponentTeam}: ${totalHits}H, ${totalHRs}HR in ${totalAB}AB`);
  
  return {
    games: totalGames,
    AB: totalAB,
    hits: totalHits,
    homeRuns: totalHRs,
    average: average,
    details: gameDetails,
    playerId: mappedPlayer?.playerId || null
  };
}

/**
 * Verify if a game was actually vs the opponent (simplified implementation)
 */
async function verifyGameVsOpponent(dateStr, playerTeam, opponentTeam, playersForDate) {
  // Simplified verification: check if opponent team players also played that day
  const opponentPlayers = playersForDate.filter(p => p.team === opponentTeam);
  const playerTeamPlayers = playersForDate.filter(p => p.team === playerTeam);
  
  // If both teams have players on the same date, likely they played each other
  return opponentPlayers.length > 0 && playerTeamPlayers.length > 0;
}

/**
 * Create a player with complete game history across team changes
 * @param {string} playerName - Player name
 * @param {string} currentTeam - Current team
 * @param {Object} dateRangeData - Date range data
 * @param {string} gameDate - Optional game date
 * @returns {Object} Player object with complete history
 */
function createPlayerWithGameHistory(playerName, currentTeam, dateRangeData, gameDate = null) {
  const mappedPlayer = playerMappingService.findPlayerByNameAndTeam(playerName, currentTeam, gameDate);
  
  if (!mappedPlayer) {
    // Return basic player object
    return {
      name: playerName,
      team: currentTeam,
      playerId: null,
      teamHistory: [],
      gameHistory: []
    };
  }
  
  // Get complete team history
  const teamHistory = playerMappingService.getPlayerTeamHistory(mappedPlayer.playerId);
  const aliases = playerMappingService.getPlayerAliases(mappedPlayer.playerId);
  
  // Collect all games across team changes
  const gameHistory = [];
  const sortedDates = Object.keys(dateRangeData).sort();
  
  for (const dateStr of sortedDates) {
    const playersForDate = dateRangeData[dateStr];
    
    for (const alias of aliases) {
      const playerData = playersForDate.find(p => 
        p.name === alias.name && p.team === alias.team
      );
      
      if (playerData) {
        gameHistory.push({
          date: dateStr,
          team: alias.team,
          stats: playerData,
          wasTeamChange: alias.team !== currentTeam
        });
        break;
      }
    }
  }
  
  return {
    name: playerName,
    team: currentTeam,
    playerId: mappedPlayer.playerId,
    fullName: mappedPlayer.fullName,
    teamHistory: teamHistory,
    gameHistory: gameHistory,
    totalGames: gameHistory.length
  };
}

module.exports = {
  findMostRecentPlayerStats,
  findMultiGamePlayerStats,
  analyzePlayerVsOpponent,
  createPlayerWithGameHistory,
  findMostRecentPlayerStatsDirect,
  findMultiGamePlayerStatsDirect
};