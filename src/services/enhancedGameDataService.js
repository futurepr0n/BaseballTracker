/**
 * Enhanced Game Data Service
 * 
 * Provides advanced game-to-opponent resolution and historical matchup analysis
 * for PlayerPropsLadderCard and other components requiring opponent context.
 * 
 * Key Features:
 * - Cross-reference players[] and games[] arrays using gameId/originalId
 * - Build opponent-specific game history for individual players
 * - Cache game schedule data for performance optimization
 * - Support various gameId formats (originalId, espnGameId, gameId)
 */

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const gameScheduleCache = new Map();
const opponentHistoryCache = new Map();

/**
 * Resolve opponent team for a player in a specific game
 * @param {string} playerTeam - Player's team abbreviation
 * @param {string|number} gameId - Game identifier (originalId, gameId, or espnGameId)
 * @param {Array} gamesData - Games array from daily JSON
 * @returns {Object|null} Opponent information or null if not found
 */
export const resolveOpponentForPlayer = (playerTeam, gameId, gamesData) => {
  if (!playerTeam || !gameId || !gamesData || !Array.isArray(gamesData)) {
    return null;
  }

  // Try multiple gameId field names for compatibility
  const game = gamesData.find(g => 
    g.originalId === parseInt(gameId) || 
    g.gameId === parseInt(gameId) || 
    g.espnGameId === parseInt(gameId) ||
    g.originalId === gameId || 
    g.gameId === gameId || 
    g.espnGameId === gameId
  );

  if (!game || !game.homeTeam || !game.awayTeam) {
    return null;
  }

  // Determine opponent and home/away status
  const isHome = game.homeTeam === playerTeam;
  const isAway = game.awayTeam === playerTeam;
  
  if (!isHome && !isAway) {
    // Player's team not found in this game
    return null;
  }

  const opponentTeam = isHome ? game.awayTeam : game.homeTeam;
  
  return {
    team: opponentTeam,
    formattedOpponent: isHome ? `vs ${opponentTeam}` : `@ ${opponentTeam}`,
    venue: game.venue || '',
    isHome,
    gameData: game
  };
};

/**
 * Load daily game data with caching
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Daily game data or null if not found
 */
const loadDailyGameData = async (dateStr) => {
  const cacheKey = `daily-${dateStr}`;
  const cached = gameScheduleCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const [year, month, day] = dateStr.split('-');
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }).toLowerCase();
    // Use leading zero formatting for day (july_01_2025.json not july_1_2025.json)
    const formattedDay = day.padStart(2, '0');
    const filePath = `/data/${year}/${monthName}/${monthName}_${formattedDay}_${year}.json`;
    
    const response = await fetch(filePath);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Cache the result
    gameScheduleCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.warn(`Failed to load game data for ${dateStr}:`, error.message);
    return null;
  }
};

/**
 * Generate valid MLB game dates for comprehensive season coverage
 * @param {Date} endDate - End date for search
 * @param {number} maxDaysBack - Maximum days to search back
 * @returns {Array} Array of valid date strings
 */
const generateValidMLBDates = (endDate, maxDaysBack) => {
  const validDates = [];
  const searchStartDate = new Date(endDate);
  
  for (let daysBack = 0; daysBack < maxDaysBack; daysBack++) {
    const searchDate = new Date(searchStartDate);
    searchDate.setDate(searchDate.getDate() - daysBack);
    
    // Check if it's a valid MLB season date
    const year = searchDate.getFullYear();
    const seasonStart = year === 2025 ? new Date('2025-03-18') : new Date(`${year}-03-20`);
    const seasonEnd = new Date(`${year}-10-31`);
    
    if (searchDate >= seasonStart && searchDate <= seasonEnd) {
      const dateStr = searchDate.toISOString().split('T')[0];
      validDates.push({
        dateStr,
        searchDate: new Date(searchDate)
      });
    }
  }
  
  return validDates;
};

/**
 * Get opponent-specific game history for a player with comprehensive coverage
 * @param {string} playerName - Player name
 * @param {string} playerTeam - Player's team abbreviation
 * @param {string} targetOpponent - Target opponent team abbreviation
 * @param {number} maxDaysBack - Maximum days to search back (default: 200 for full season)
 * @returns {Promise<Array>} Array of opponent-specific games
 */
export const getOpponentGameHistory = async (playerName, playerTeam, targetOpponent, maxDaysBack = 200) => {
  if (!playerName || !playerTeam || !targetOpponent) {
    return [];
  }

  // Check cache first
  const cacheKey = `history-${playerName}-${playerTeam}-${targetOpponent}`;
  const cached = opponentHistoryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`🎯 Using cached data for ${playerName} vs ${targetOpponent}: ${cached.data.length} games`);
    return cached.data;
  }

  const opponentGames = [];
  const now = new Date();
  const searchedDates = new Set();

  console.log(`🔍 COMPREHENSIVE SEARCH: ${playerName} (${playerTeam}) vs ${targetOpponent}`);
  console.log(`📅 Searching ${maxDaysBack} days back from ${now.toISOString().split('T')[0]}`);

  // Generate all valid MLB dates (NO WEEKEND SKIPPING - MLB plays 7 days a week)
  const validDates = generateValidMLBDates(now, maxDaysBack);
  console.log(`📊 Generated ${validDates.length} valid MLB dates to search`);

  let filesChecked = 0;
  let filesFound = 0;
  let playersFound = 0;
  let gamesMatched = 0;

  // Process dates in batches for performance
  const BATCH_SIZE = 15;
  for (let i = 0; i < validDates.length; i += BATCH_SIZE) {
    const batch = validDates.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async ({ dateStr, searchDate }) => {
      // Avoid duplicate date processing
      if (searchedDates.has(dateStr)) return;
      searchedDates.add(dateStr);
      
      filesChecked++;

      try {
        const dailyData = await loadDailyGameData(dateStr);
        
        if (!dailyData || !dailyData.players || !dailyData.games) {
          return;
        }

        filesFound++;

        // Find the player in this date's data
        const playerData = dailyData.players.find(p => 
          (p.name === playerName || p.Name === playerName) && 
          (p.team === playerTeam || p.Team === playerTeam)
        );

        if (!playerData) {
          return;
        }

        playersFound++;

        if (!playerData.gameId) {
          console.warn(`⚠️ ${dateStr}: Player found but no gameId`);
          return;
        }

        // Resolve the opponent for this game
        const opponentInfo = resolveOpponentForPlayer(playerTeam, playerData.gameId, dailyData.games);
        
        if (!opponentInfo) {
          console.warn(`⚠️ ${dateStr}: Could not resolve opponent for gameId ${playerData.gameId}`);
          return;
        }

        if (opponentInfo.team !== targetOpponent) {
          return;
        }

        gamesMatched++;

        // Found a game against the target opponent
        const gameRecord = {
          date: dateStr,
          displayDate: searchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          opponent: opponentInfo.formattedOpponent,
          venue: opponentInfo.venue,
          isHome: opponentInfo.isHome,
          playerData,
          gameData: opponentInfo.gameData
        };

        opponentGames.push(gameRecord);
        console.log(`🎯 MATCH: ${dateStr} - ${playerName} ${opponentInfo.formattedOpponent} (${opponentInfo.venue})`);
        
      } catch (error) {
        console.warn(`❌ Error processing ${dateStr}:`, error.message);
      }
    }));
  }

  // Sort by date (newest first)
  const sortedGames = opponentGames.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  console.log(`📊 SEARCH COMPLETE for ${playerName} vs ${targetOpponent}:`);
  console.log(`   📁 Files checked: ${filesChecked}`);
  console.log(`   ✅ Files found: ${filesFound}`);
  console.log(`   👤 Player appearances: ${playersFound}`);
  console.log(`   🎯 Games vs ${targetOpponent}: ${gamesMatched}`);
  console.log(`   ⚾ Total opponent history games: ${sortedGames.length}`);

  // Cache the result
  opponentHistoryCache.set(cacheKey, {
    data: sortedGames,
    timestamp: Date.now()
  });

  return sortedGames;
};

/**
 * Build chart-ready data for opponent history
 * @param {Array} opponentGames - Games against specific opponent
 * @param {string} statKey - Statistical category (H, HR, RBI, etc.)
 * @returns {Object} Chart-ready data structure
 */
export const buildOpponentChartData = (opponentGames, statKey) => {
  if (!opponentGames || !opponentGames.length || !statKey) {
    return {
      games: [],
      stats: {
        totalGames: 0,
        totalStat: 0,
        average: '0.000',
        successRate1Plus: '0.0',
        successRate2Plus: '0.0'
      }
    };
  }

  // Transform games into chart format
  const chartGames = opponentGames.map((game, index) => {
    const statValue = game.playerData[statKey] || 0;
    
    return {
      date: game.date,
      displayDate: game.displayDate,
      value: statValue,
      success1Plus: statValue >= 1,
      success2Plus: statValue >= 2,
      opponent: game.opponent,
      venue: game.venue,
      gameNumber: index + 1,
      gameType: 'opponent',
      gameData: game.playerData
    };
  });

  // Calculate comprehensive statistics
  const totalGames = chartGames.length;
  const totalStat = chartGames.reduce((sum, game) => sum + game.value, 0);
  const average = totalGames > 0 ? (totalStat / totalGames).toFixed(3) : '0.000';
  const success1Plus = chartGames.filter(game => game.success1Plus).length;
  const success2Plus = chartGames.filter(game => game.success2Plus).length;
  const successRate1Plus = totalGames > 0 ? ((success1Plus / totalGames) * 100).toFixed(1) : '0.0';
  const successRate2Plus = totalGames > 0 ? ((success2Plus / totalGames) * 100).toFixed(1) : '0.0';

  return {
    games: chartGames,
    stats: {
      totalGames,
      totalStat,
      average,
      successRate1Plus,
      successRate2Plus
    }
  };
};

/**
 * Get comprehensive player vs opponent analysis
 * @param {string} playerName - Player name
 * @param {string} playerTeam - Player's team
 * @param {string} targetOpponent - Target opponent team
 * @param {string} statKey - Statistical category
 * @returns {Promise<Object>} Complete opponent analysis data
 */
export const getPlayerVsOpponentAnalysis = async (playerName, playerTeam, targetOpponent, statKey) => {
  const opponentGames = await getOpponentGameHistory(playerName, playerTeam, targetOpponent);
  const chartData = buildOpponentChartData(opponentGames, statKey);
  
  return {
    [targetOpponent]: chartData
  };
};

/**
 * Debug function to test opponent history search for specific player/team combinations
 * @param {string} playerName - Player name to test
 * @param {string} playerTeam - Player team abbreviation  
 * @param {string} targetOpponent - Opponent team to search for
 * @param {number} maxDays - Number of days to search (default: 50 for quick test)
 * @returns {Promise<Object>} Debug information and results
 */
export const debugOpponentHistory = async (playerName, playerTeam, targetOpponent, maxDays = 50) => {
  console.log(`🔧 DEBUG MODE: Testing ${playerName} (${playerTeam}) vs ${targetOpponent}`);
  
  const debugInfo = {
    playerName,
    playerTeam,
    targetOpponent,
    searchDays: maxDays,
    validDates: [],
    filesFound: [],
    playerAppearances: [],
    opponentMatches: [],
    errors: []
  };
  
  // Generate test dates
  const now = new Date();
  const validDates = generateValidMLBDates(now, maxDays);
  debugInfo.validDates = validDates.map(d => d.dateStr);
  
  console.log(`📊 Testing ${validDates.length} valid dates`);
  
  for (const { dateStr, searchDate } of validDates.slice(0, 10)) { // Test first 10 dates only
    try {
      const dailyData = await loadDailyGameData(dateStr);
      
      if (dailyData && dailyData.players && dailyData.games) {
        debugInfo.filesFound.push(dateStr);
        
        // Look for player
        const playerData = dailyData.players.find(p => 
          (p.name === playerName || p.Name === playerName) && 
          (p.team === playerTeam || p.Team === playerTeam)
        );
        
        if (playerData) {
          debugInfo.playerAppearances.push({
            date: dateStr,
            gameId: playerData.gameId,
            hasGameId: !!playerData.gameId
          });
          
          if (playerData.gameId) {
            const opponentInfo = resolveOpponentForPlayer(playerTeam, playerData.gameId, dailyData.games);
            
            if (opponentInfo) {
              const matchData = {
                date: dateStr,
                opponent: opponentInfo.team,
                formatted: opponentInfo.formattedOpponent,
                isTarget: opponentInfo.team === targetOpponent,
                venue: opponentInfo.venue
              };
              
              if (opponentInfo.team === targetOpponent) {
                debugInfo.opponentMatches.push(matchData);
                console.log(`🎯 DEBUG MATCH: ${dateStr} - ${playerName} vs ${opponentInfo.formattedOpponent}`);
              }
            }
          }
        }
      }
    } catch (error) {
      debugInfo.errors.push({
        date: dateStr,
        error: error.message
      });
    }
  }
  
  console.log(`🔧 DEBUG RESULTS:`);
  console.log(`   📅 Valid dates: ${debugInfo.validDates.length}`);  
  console.log(`   📁 Files found: ${debugInfo.filesFound.length}`);
  console.log(`   👤 Player appearances: ${debugInfo.playerAppearances.length}`);
  console.log(`   🎯 Target matches: ${debugInfo.opponentMatches.length}`);
  console.log(`   ❌ Errors: ${debugInfo.errors.length}`);
  
  return debugInfo;
};

/**
 * Clear all caches (useful for testing or forced refresh)
 */
export const clearAllCaches = () => {
  gameScheduleCache.clear();
  opponentHistoryCache.clear();
  console.log('🧹 Enhanced game data service caches cleared');
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = () => {
  return {
    gameScheduleCache: gameScheduleCache.size,
    opponentHistoryCache: opponentHistoryCache.size,
    timestamp: Date.now()
  };
};

// Export default service object
const enhancedGameDataService = {
  resolveOpponentForPlayer,
  getOpponentGameHistory,
  buildOpponentChartData,
  getPlayerVsOpponentAnalysis,
  debugOpponentHistory,
  clearAllCaches,
  getCacheStats
};

export default enhancedGameDataService;