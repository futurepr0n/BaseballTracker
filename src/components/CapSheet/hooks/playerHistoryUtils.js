import { findMultiGamePlayerStats } from '../../../services/dataService';

/**
 * Extended data loading for pitchers - looks back further to find enough games
 * @param {Object} dateRangeData - Initial date range data
 * @param {string} playerName - Player name
 * @param {string} teamAbbr - Team abbreviation
 * @param {number} numGames - Number of games to retrieve (default: 3)
 * @param {number} maxAdditionalDays - Max additional days to look back for pitchers
 * @returns {Array} Array of player game data objects
 */
export const findPitcherGames = (dateRangeData, playerName, teamAbbr, numGames = 3) => {
  // Use extended date range for pitchers - will include data from further back
  return findMultiGamePlayerStats(dateRangeData, playerName, teamAbbr, numGames);
};

/**
 * Create player objects with game history
 * @param {Object} player - Player object
 * @param {Object} dateRangeData - Date range data
 * @param {Array} handicappers - Handicapper objects
 * @param {boolean} isExtendedSearch - Whether to use extended search for pitchers
 * @param {number} numGames - Number of games to retrieve (default: 3)
 * @returns {Object} Player with game history
 */
export const createPlayerWithGameHistory = (player, dateRangeData, handicappers = [], isExtendedSearch = false, numGames = 3) => {
  const handicappersArray = Array.isArray(handicappers) ? handicappers : [];

  // Determine if we need to use extended search for pitchers
  let gameHistory;
  if (player.type === 'pitcher' && isExtendedSearch) {
    gameHistory = findPitcherGames(
      dateRangeData, 
      player.name, 
      player.team,
      numGames // Use configurable number of games
    );
  } else {
    // Use the standard approach for hitters or if extended search isn't needed
    gameHistory = findMultiGamePlayerStats(
      dateRangeData, 
      player.name, 
      player.team,
      numGames // Use configurable number of games
    );
  }
  
  // Get stats from the most recent game (if available)
  const mostRecentGame = gameHistory.length > 0 ? gameHistory[0] : null;
  const mostRecentStats = mostRecentGame?.data || null;
  
  // Get the game dates for display
  const gameDates = gameHistory.map(game => game.date || '');
  
  // Create a player object with the appropriate number of game history entries
  if (player.type === 'hitter') {
    const playerObj = {
      id: player.name + '-' + player.team,
      name: player.name,
      team: player.team,
      playerType: 'hitter',
      // Most recent game stats
      prevGameHR: mostRecentStats?.HR || '0',
      prevGameAB: mostRecentStats?.AB || '0',
      prevGameH: mostRecentStats?.H || '0',
      // Fields for user input
      pitcher: '',
      pitcherId: '',
      opponentTeam: '',
      pitcherHand: '',
      expectedSO: '',
      stadium: '',
      gameOU: '',
      betTypes: { H: false, HR: false, B: false },
      handicapperPicks: handicappersArray.reduce((acc, handicapper) => {
        acc[handicapper.id] = {
          public: false, private: false, straight: false,
          H: false, HR: false, B: false
        };
        return acc;
      }, {})
    };
    
    // Dynamically add game data based on numGames
    for (let i = 0; i < numGames; i++) {
      const gameNum = i + 1;
      const gameData = gameHistory[i]?.data || {};
      
      playerObj[`game${gameNum}Date`] = gameDates[i] || '';
      playerObj[`game${gameNum}HR`] = gameData.HR || '0';
      playerObj[`game${gameNum}AB`] = gameData.AB || '0';
      playerObj[`game${gameNum}H`] = gameData.H || '0';
    }
    
    return playerObj;
  } else {
    const playerObj = {
      id: player.name + '-' + player.team,
      name: player.name,
      team: player.team,
      playerType: 'pitcher',
      // Additional pitcher attributes
      throwingArm: player.throwingArm || '',
      // Most recent game stats with all new fields
      prevGameIP: mostRecentStats?.IP || '0',
      prevGameK: mostRecentStats?.K || '0',
      prevGameER: mostRecentStats?.ER || '0',
      prevGameH: mostRecentStats?.H || '0',
      prevGameR: mostRecentStats?.R || '0',
      prevGameBB: mostRecentStats?.BB || '0',
      prevGameHR: mostRecentStats?.HR || '0',
      prevGamePC_ST: mostRecentStats?.PC_ST || 'N/A',
      ERA: mostRecentStats?.ERA || '0.00',
      // Fields for user input
      opponent: '',
      expectedPitch: '',
      expectedK: '',
      stadium: '',
      gameOU: '',
      betTypes: { K: false, OU: false },
      handicapperPicks: handicappersArray.reduce((acc, handicapper) => {
        acc[handicapper.id] = {
          public: false, private: false, straight: false,
          K: false, OU: false
        };
        return acc;
      }, {})
    };
    
    // Dynamically add game data based on numGames
    for (let i = 0; i < numGames; i++) {
      const gameNum = i + 1;
      const gameData = gameHistory[i]?.data || {};
      
      playerObj[`game${gameNum}Date`] = gameDates[i] || '';
      playerObj[`game${gameNum}IP`] = gameData.IP || '0';
      playerObj[`game${gameNum}K`] = gameData.K || '0';
      playerObj[`game${gameNum}ER`] = gameData.ER || '0';
      // Add the additional stats to game history
      playerObj[`game${gameNum}H`] = gameData.H || '0';
      playerObj[`game${gameNum}R`] = gameData.R || '0';
      playerObj[`game${gameNum}BB`] = gameData.BB || '0';
      playerObj[`game${gameNum}HR`] = gameData.HR || '0';
      playerObj[`game${gameNum}PC_ST`] = gameData.PC_ST || 'N/A';
    }
    
    return playerObj;
  }
};

/**
 * Get a descriptive message about player data availability
 * @param {Object} player - Player object
 * @param {boolean} isPitcher - Whether the player is a pitcher
 * @returns {string} Descriptive message about data availability
 */
export const getPlayerDataMessage = (player, isPitcher) => {
  // Count how many game entries the player has
  let gameCount = 0;
  let i = 1;
  
  // Count games dynamically by checking for properties
  while (player[`game${i}Date`] !== undefined) {
    const hasGameData = player[`game${i}Date`] && 
      (isPitcher ? 
        parseFloat(player[`game${i}IP`]) > 0 : 
        parseInt(player[`game${i}AB`]) > 0);
        
    if (hasGameData) {
      gameCount++;
    }
    i++;
  }
  
  // Calculate max possible games from the object structure
  const maxPossibleGames = i - 1;
  
  if (gameCount === 0) {
    return "No recent game data found";
  } else if (gameCount < maxPossibleGames) {
    return `Found data for ${gameCount} of ${maxPossibleGames} recent games`;
  }
  
  // Calculate number of days between first and last game
  const lastGameDate = player.game1Date;
  const firstGameDate = player[`game${maxPossibleGames}Date`];
  
  if (!lastGameDate || !firstGameDate) {
    return `Found ${gameCount} games`;
  }
  
  const daysBack = getDaysBetween(lastGameDate, firstGameDate);
  
  if (isPitcher) {
    return daysBack > 14 
      ? `Found all ${gameCount} games (spanning ${daysBack} days)` 
      : `Found all ${gameCount} recent games`;
  } else {
    return `Found all ${gameCount} recent games`;
  }
};

/**
 * Calculate days between two date strings
 * @param {string} date1 - First date string (YYYY-MM-DD)
 * @param {string} date2 - Second date string (YYYY-MM-DD)
 * @returns {number} Number of days between the dates
 */
const getDaysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};