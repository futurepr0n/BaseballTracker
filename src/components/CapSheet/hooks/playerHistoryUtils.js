import { findMultiGamePlayerStats } from '../../../services/dataService';

/**
 * Extended data loading for pitchers - looks back further to find enough games
 * @param {Object} dateRangeData - Initial date range data
 * @param {string} playerName - Player name
 * @param {string} teamAbbr - Team abbreviation
 * @param {number} numGames - Number of games to retrieve
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
 * @returns {Object} Player with game history
 */
export const createPlayerWithGameHistory = (player, dateRangeData, handicappers = [], isExtendedSearch = false) => {
  const handicappersArray = Array.isArray(handicappers) ? handicappers : [];

  // Determine if we need to use extended search for pitchers
  let gameHistory;
  if (player.type === 'pitcher' && isExtendedSearch) {
    gameHistory = findPitcherGames(
      dateRangeData, 
      player.name, 
      player.team,
      3 // Get 3 games
    );
  } else {
    // Use the standard approach for hitters or if extended search isn't needed
    gameHistory = findMultiGamePlayerStats(
      dateRangeData, 
      player.name, 
      player.team,
      3 // Get 3 games
    );
  }
  
  // Get stats from the most recent game (if available)
  const mostRecentGame = gameHistory.length > 0 ? gameHistory[0] : null;
  const mostRecentStats = mostRecentGame?.data || null;
  
  // Get the game dates for display
  const gameDates = gameHistory.map(game => game.date || '');
  
  if (player.type === 'hitter') {
    return {
      id: player.name + '-' + player.team,
      name: player.name,
      team: player.team,
      playerType: 'hitter',
      // Most recent game stats
      prevGameHR: mostRecentStats?.HR || '0',
      prevGameAB: mostRecentStats?.AB || '0',
      prevGameH: mostRecentStats?.H || '0',
      // Game 1 stats (most recent)
      game1Date: gameDates[0] || '',
      game1HR: gameHistory[0]?.data?.HR || '0',
      game1AB: gameHistory[0]?.data?.AB || '0',
      game1H: gameHistory[0]?.data?.H || '0',
      // Game 2 stats
      game2Date: gameDates[1] || '',
      game2HR: gameHistory[1]?.data?.HR || '0',
      game2AB: gameHistory[1]?.data?.AB || '0',
      game2H: gameHistory[1]?.data?.H || '0',
      // Game 3 stats (oldest)
      game3Date: gameDates[2] || '',
      game3HR: gameHistory[2]?.data?.HR || '0',
      game3AB: gameHistory[2]?.data?.AB || '0',
      game3H: gameHistory[2]?.data?.H || '0',
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
  } else {
    return {
      id: player.name + '-' + player.team,
      name: player.name,
      team: player.team,
      playerType: 'pitcher',
      // Additional pitcher attributes
      throwingArm: player.throwingArm || '',
      // Most recent game stats
      prevGameIP: mostRecentStats?.IP || '0',
      prevGameK: mostRecentStats?.K || '0',
      prevGameER: mostRecentStats?.ER || '0',
      // Game 1 stats (most recent)
      game1Date: gameDates[0] || '',
      game1IP: gameHistory[0]?.data?.IP || '0',
      game1K: gameHistory[0]?.data?.K || '0',
      game1ER: gameHistory[0]?.data?.ER || '0',
      // Game 2 stats
      game2Date: gameDates[1] || '',
      game2IP: gameHistory[1]?.data?.IP || '0',
      game2K: gameHistory[1]?.data?.K || '0',
      game2ER: gameHistory[1]?.data?.ER || '0',
      // Game 3 stats (oldest)
      game3Date: gameDates[2] || '',
      game3IP: gameHistory[2]?.data?.IP || '0',
      game3K: gameHistory[2]?.data?.K || '0',
      game3ER: gameHistory[2]?.data?.ER || '0',
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
  }
};

/**
 * Get a descriptive message about player data availability
 * @param {Object} player - Player object
 * @param {boolean} isPitcher - Whether the player is a pitcher
 * @returns {string} Descriptive message about data availability
 */
export const getPlayerDataMessage = (player, isPitcher) => {
  const hasGame1 = player.game1Date && (isPitcher ? player.game1IP > 0 : player.game1AB > 0);
  const hasGame2 = player.game2Date && (isPitcher ? player.game2IP > 0 : player.game2AB > 0);
  const hasGame3 = player.game3Date && (isPitcher ? player.game3IP > 0 : player.game3AB > 0);
  
  const gameCount = [hasGame1, hasGame2, hasGame3].filter(Boolean).length;
  
  if (gameCount === 0) {
    return "No recent game data found";
  } else if (gameCount < 3) {
    return `Found data for ${gameCount} of 3 recent games`;
  }
  
  const daysBack = player.game3Date ? getDaysBetween(player.game1Date, player.game3Date) : 0;
  
  if (isPitcher) {
    return daysBack > 14 
      ? `Found all 3 games (spanning ${daysBack} days)` 
      : "Found all 3 recent games";
  } else {
    return "Found all 3 recent games";
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