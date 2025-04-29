/**
 * Get opponent team based on player team and game data
 * @param {string} playerTeam - Player's team code
 * @param {Array} gameData - Game data from API
 * @returns {string} Opponent team code
 */
export const getOpponentTeam = (playerTeam, gameData) => {
    const game = gameData.find(g => g.homeTeam === playerTeam || g.awayTeam === playerTeam);
    if (!game) return '';
    return game.homeTeam === playerTeam ? game.awayTeam : game.homeTeam;
  };
  
  /**
   * Get stadium information for a player
   * @param {string} playerTeam - Player's team code
   * @param {Array} gameData - Game data from API
   * @returns {string} Stadium name
   */
  export const getStadium = (playerTeam, gameData) => {
    const game = gameData.find(g => g.homeTeam === playerTeam || g.awayTeam === playerTeam);
    if (!game) return '';
    return game.venue || '';
  };
  
  /**
   * Check if player is playing today based on gameData
   * @param {string} playerTeam - Player's team code
   * @param {Array} gameData - Game data from API
   * @returns {boolean} True if playing today, false otherwise
   */
  export const isPlayerPlayingToday = (playerTeam, gameData) => {
    return gameData.some(g => g.homeTeam === playerTeam || g.awayTeam === playerTeam);
  };
  
  /**
   * Calculate stats averages for a player over multiple games
   * @param {Object} player - Player object with game history
   * @returns {Object} Calculated averages
   */
  export const calculatePlayerAverages = (player) => {
    if (player.playerType === 'hitter') {
      // Count valid games (where AB > 0)
      let validGames = 0;
      let totalAB = 0;
      let totalH = 0;
      let totalHR = 0;
      
      // Check each game for data
      ['game1', 'game2', 'game3'].forEach(gamePrefix => {
        const AB = Number(player[`${gamePrefix}AB`] || 0);
        if (AB > 0) {
          validGames++;
          totalAB += AB;
          totalH += Number(player[`${gamePrefix}H`] || 0);
          totalHR += Number(player[`${gamePrefix}HR`] || 0);
        }
      });
      
      return {
        avgAB: validGames > 0 ? (totalAB / validGames).toFixed(1) : '0.0',
        avgH: validGames > 0 ? (totalH / validGames).toFixed(1) : '0.0',
        avgHR: validGames > 0 ? (totalHR / validGames).toFixed(1) : '0.0',
        avgBA: totalAB > 0 ? (totalH / totalAB).toFixed(3) : '.000',
        gamesWithData: validGames
      };
    } else if (player.playerType === 'pitcher') {
      // Count valid games (where IP > 0)
      let validGames = 0;
      let totalIP = 0;
      let totalK = 0;
      let totalER = 0;
      
      // Check each game for data
      ['game1', 'game2', 'game3'].forEach(gamePrefix => {
        const IP = Number(player[`${gamePrefix}IP`] || 0);
        if (IP > 0) {
          validGames++;
          totalIP += IP;
          totalK += Number(player[`${gamePrefix}K`] || 0);
          totalER += Number(player[`${gamePrefix}ER`] || 0);
        }
      });
      
      return {
        avgIP: validGames > 0 ? (totalIP / validGames).toFixed(1) : '0.0',
        avgK: validGames > 0 ? (totalK / validGames).toFixed(1) : '0.0',
        avgER: validGames > 0 ? (totalER / validGames).toFixed(1) : '0.0',
        avgERA: totalIP > 0 ? ((totalER * 9) / totalIP).toFixed(2) : '0.00',
        gamesWithData: validGames
      };
    }
    
    return { gamesWithData: 0 };
  };
  
  /**
   * Filter players to only include those from teams playing today
   * @param {Array} players - Array of player objects
   * @param {Array} gameData - Game data from API
   * @returns {Array} Filtered players
   */
  export const filterPlayersByTeamsPlayingToday = (players, gameData) => {
    if (!gameData || gameData.length === 0) return players;
    
    // Get teams playing today
    const teamsPlayingToday = new Set();
    gameData.forEach(game => {
      teamsPlayingToday.add(game.homeTeam);
      teamsPlayingToday.add(game.awayTeam);
    });
    
    // Filter players
    return players.filter(player => teamsPlayingToday.has(player.team));
  };