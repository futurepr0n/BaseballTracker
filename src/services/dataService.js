/**
 * Data service for MLB Statistics Tracker
 * Enhanced to support multi-game historical data
 */

// Cache for loaded data to minimize file reads
const dataCache = {
  players: {},
  teams: null,
  games: {},
  dateRangeData: {},  // Cache for date range data
  multiGameData: {}   // NEW: Cache for multiple game history per player
};

// Default empty data structures
const DEFAULT_PLAYER_DATA = [];
const DEFAULT_GAME_DATA = [];

/**
 * Format date as string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export const formatDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date as display string (MM/DD)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date for display (MM/DD)
 */
export const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}`;
};

/**
 * Check if data file exists for a specific date
 * @param {string} dateStr - Date string in 'YYYY-MM-DD' format
 * @returns {Promise<boolean>} True if file exists, false otherwise
 */
export const checkDataExists = async (dateStr) => {
  try {
    // Extract year and month from the date string
    const [year, /* month - not used */, day] = dateStr.split('-');
    const monthName = new Date(dateStr).toLocaleString('default', { month: 'long' }).toLowerCase();
    
    // Construct the file path
    const filePath = `/data/${year}/${monthName}/${monthName}_${day}_${year}.json`;
    
    // Try to fetch the file head to check if it exists
    const response = await fetch(filePath, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error(`Error checking if data exists for ${dateStr}:`, error);
    return false;
  }
};

/**
 * Find closest available date with data
 * @param {string} dateStr - Target date string in 'YYYY-MM-DD' format
 * @param {number} direction - Direction to search (-1 for past, 1 for future)
 * @param {number} maxAttempts - Maximum number of attempts
 * @returns {Promise<string|null>} Date string with available data, or null if none found
 */
export const findClosestDateWithData = async (dateStr, direction = -1, maxAttempts = 10) => {
  const targetDate = new Date(dateStr);
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    // Move to next/previous day
    targetDate.setDate(targetDate.getDate() + direction);
    
    // Format date
    const newDateStr = formatDateString(targetDate);
    
    // Check if data exists
    const exists = await checkDataExists(newDateStr);
    if (exists) {
      return newDateStr;
    }
    
    attempts++;
  }
  
  return null; // No data found within the maximum attempts
};

/**
 * Fetch player statistics for a specific date
 * @param {string} dateStr - Date string in 'YYYY-MM-DD' format
 * @returns {Promise<Array>} Array of player statistics
 */
export const fetchPlayerData = async (dateStr) => {
  // Check cache first
  if (dataCache.players[dateStr]) {
    return dataCache.players[dateStr];
  }
  
  try {
    // Extract year and month from the date string
    const [year, month, day] = dateStr.split('-');
    // Create date with explicit year, month (0-based), day
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const monthName = date.toLocaleString('default', { month: 'long' }).toLowerCase();
    
    // Construct the file path
    const filePath = `/data/${year}/${monthName}/${monthName}_${day}_${year}.json`;
    
    console.log(`Loading player data from: ${filePath}`);
    
    // Fetch the data
    const response = await fetch(filePath);
    
    if (!response.ok) {
      // Try to find closest date with data
      const closestDate = await findClosestDateWithData(dateStr);
      
      if (closestDate) {
        console.log(`No data found for ${dateStr}, using closest available date: ${closestDate}`);
        return fetchPlayerData(closestDate);
      }
      
      console.warn(`Failed to load player data for ${dateStr} and no alternative found`);
      return DEFAULT_PLAYER_DATA;
    }
    
    const data = await response.json();
    
    // Store in cache
    dataCache.players[dateStr] = data.players || DEFAULT_PLAYER_DATA;
    
    return dataCache.players[dateStr];
  } catch (error) {
    console.error(`Error fetching player data for ${dateStr}:`, error);
    // Return empty array instead of throwing to prevent app crash
    return DEFAULT_PLAYER_DATA;
  }
};

/**
 * Fetch player data for a range of dates with adaptive loading strategy
 * @param {Date} startDate - The starting date
 * @param {number} initialDaysToLookBack - Initial number of days to look back (default: 30)
 * @param {number} maxDaysToLookBack - Maximum days to look back for season data (default: 180)
 * @returns {Promise<Object>} Map of date -> player data arrays
 */
export const fetchPlayerDataForDateRange = async (startDate, initialDaysToLookBack = 30, maxDaysToLookBack = 180) => {
  // Generate a unique cache key for this range
  const cacheKey = `${formatDateString(startDate)}_${initialDaysToLookBack}`;
  
  // Check cache first
  if (dataCache.dateRangeData[cacheKey]) {
    console.log(`[DataService] Using cached date range data for ${cacheKey}`);
    return dataCache.dateRangeData[cacheKey];
  }
  
  console.log(`[DataService] Fetching player data for ${initialDaysToLookBack} days starting from ${formatDateString(startDate)}`);
  const result = {};
  
  // Track how many days we've searched and dates with data
  let daysSearched = 0;
  let datesWithData = 0;
  
  // First pass: search the initial window
  for (let daysBack = 0; daysBack < initialDaysToLookBack; daysBack++) {
    const searchDate = new Date(startDate);
    searchDate.setDate(searchDate.getDate() - daysBack);
    const dateStr = formatDateString(searchDate);
    daysSearched++;
    
    try {
      // Get player data for this date
      const playersForDate = await fetchPlayerData(dateStr);
      
      if (playersForDate && playersForDate.length > 0) {
        console.log(`[DataService] Found ${playersForDate.length} player records for ${dateStr}`);
        result[dateStr] = playersForDate;
        datesWithData++;
      } else {
        console.log(`[DataService] No player data found for ${dateStr}`);
      }
    } catch (error) {
      console.error(`[DataService] Error fetching player data for ${dateStr}:`, error);
    }
  }
  
  // Second pass: If we need more data, extend the search
  // This is particularly helpful for pitchers who might not play frequently
  if (datesWithData < Math.min(10, initialDaysToLookBack / 3)) {
    console.log(`[DataService] Found only ${datesWithData} dates with data. Extending search to find more historical data...`);
    
    // Calculate how many more days to search
    const additionalDaysToSearch = Math.min(
      maxDaysToLookBack - initialDaysToLookBack,  // Don't exceed max days
      180  // Reasonable limit for extended search
    );
    
    // Only proceed if we have more days to search
    if (additionalDaysToSearch > 0) {
      // Skip days we've already searched
      for (let daysBack = initialDaysToLookBack; daysBack < initialDaysToLookBack + additionalDaysToSearch; daysBack++) {
        const searchDate = new Date(startDate);
        searchDate.setDate(searchDate.getDate() - daysBack);
        const dateStr = formatDateString(searchDate);
        daysSearched++;
        
        try {
          // Check if we've found enough dates with data
          if (datesWithData >= 30) {
            console.log(`[DataService] Found ${datesWithData} dates with data, stopping extended search`);
            break;
          }
          
          // Get player data for this date
          const playersForDate = await fetchPlayerData(dateStr);
          
          if (playersForDate && playersForDate.length > 0) {
            console.log(`[DataService] Found ${playersForDate.length} player records for ${dateStr}`);
            result[dateStr] = playersForDate;
            datesWithData++;
          }
        } catch (error) {
          console.error(`[DataService] Error fetching player data for ${dateStr}:`, error);
        }
      }
    }
  }
  
  // Store in cache
  dataCache.dateRangeData[cacheKey] = result;
  
  console.log(`[DataService] Completed fetching data for ${Object.keys(result).length} dates (searched ${daysSearched} days)`);
  return result;
};

/**
 * Find most recent stats for a specific player within date range data
 * @param {Object} dateRangeData - Map of date -> player data arrays
 * @param {string} playerName - Player name
 * @param {string} teamAbbr - Team abbreviation
 * @returns {Object} Player stats and the date they're from
 */
export const findMostRecentPlayerStats = (dateRangeData, playerName, teamAbbr) => {
  // Sort dates from newest to oldest
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
  
  // No data found
  return {
    data: null,
    date: null
  };
};

/**
 * NEW: Find multiple games of stats for a specific player
 * @param {Object} dateRangeData - Map of date -> player data arrays
 * @param {string} playerName - Player name
 * @param {string} teamAbbr - Team abbreviation
 * @param {number} numGames - Number of games to retrieve (default 3)
 * @returns {Array} Array of player game data objects, each with stats and date
 */
export const findMultiGamePlayerStats = (dateRangeData, playerName, teamAbbr, numGames = 3) => {
  // Generate cache key
  const cacheKey = `${playerName}-${teamAbbr}-${numGames}`;
  
  // Check cache first
  if (dataCache.multiGameData[cacheKey]) {
    return dataCache.multiGameData[cacheKey];
  }
  
  // Sort dates from newest to oldest
  const sortedDates = Object.keys(dateRangeData).sort().reverse();
  const games = [];
  
  // Look through each date for this player's data
  for (const dateStr of sortedDates) {
    const playersForDate = dateRangeData[dateStr];
    const playerData = playersForDate.find(p => 
      p.name === playerName && p.team === teamAbbr
    );
    
    if (playerData) {
      // Skip this game if already have one from this exact date (prevents duplicates)
      if (!games.some(g => g.date === dateStr)) {
        games.push({
          data: playerData,
          date: dateStr
        });
      }
      
      // Stop once we have enough games
      if (games.length >= numGames) {
        break;
      }
    }
  }
  
  // Store in cache
  dataCache.multiGameData[cacheKey] = games;
  
  return games;
};

/**
 * Fetch team data (doesn't change often)
 * @returns {Promise<Object>} Team data object
 */
export const fetchTeamData = async () => {
  // Check cache first
  if (dataCache.teams) {
    return dataCache.teams;
  }
  
  try {
    // Fetch the data
    console.log('Loading team data from: /data/teams.json');
    const response = await fetch('/data/teams.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load team data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Store in cache
    dataCache.teams = data;
    
    return data;
  } catch (error) {
    console.error('Error fetching team data:', error);
    // Return empty object instead of throwing to prevent app crash
    return {};
  }
};

/**
 * Fetch game results for a specific date
 * @param {string} dateStr - Date string in 'YYYY-MM-DD' format
 * @returns {Promise<Array>} Array of game results
 */
export const fetchGameData = async (dateStr) => {
  if (dataCache.games[dateStr]) {
    return dataCache.games[dateStr];
  }

  try {
    const [year, month, day] = dateStr.split('-');
// Create date with explicit year, month (0-based), day
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const monthName = date.toLocaleString('default', { month: 'long' }).toLowerCase();
    const filePath = `/data/${year}/${monthName}/${monthName}_${day}_${year}.json`;

    console.log(`Loading game data from: ${filePath}`);
    const response = await fetch(filePath);

    if (!response.ok) {
      // If the specific date's file is not found, return default empty games.
      // Do NOT fall back to a different date for game schedule.
      console.warn(`Failed to load game data file for ${dateStr}. Returning empty game list.`);
      dataCache.games[dateStr] = DEFAULT_GAME_DATA; // Cache the empty result for this date
      return DEFAULT_GAME_DATA;
    }

    const data = await response.json();
    dataCache.games[dateStr] = data.games || DEFAULT_GAME_DATA;
    return dataCache.games[dateStr];

  } catch (error) {
    console.error(`Error fetching game data for ${dateStr}:`, error);
    return DEFAULT_GAME_DATA;
  }
};

/**
 * Save player statistics for a specific date
 * @param {string} dateStr - Date string in 'YYYY-MM-DD' format
 * @param {Array} playerData - Array of player statistics
 * @returns {Promise<boolean>} Success indicator
 */
export const savePlayerData = async (dateStr, playerData) => {
  try {
    // In a real application, this would send data to a server
    // For this demo, we'll just update the cache
    
    // First, load the existing data
    const existingData = await fetchPlayerData(dateStr);
    
    // Merge new data with existing data
    const updatedPlayersData = [...existingData];
    
    playerData.forEach(newPlayer => {
      const index = updatedPlayersData.findIndex(p => p.name === newPlayer.name);
      if (index >= 0) {
        // Update existing player
        updatedPlayersData[index] = {...updatedPlayersData[index], ...newPlayer};
      } else {
        // Add new player
        updatedPlayersData.push(newPlayer);
      }
    });
    
    // Update cache
    dataCache.players[dateStr] = updatedPlayersData;
    
    // In a real app, you would save to server here
    console.log(`Player data for ${dateStr} updated successfully`);
    
    return true;
  } catch (error) {
    console.error(`Error saving player data for ${dateStr}:`, error);
    return false;
  }
};

/**
 * Fetch complete player roster
 * @returns {Promise<Array>} Array of all available players
 */
export const fetchRosterData = async () => {
  try {
    console.log('Loading roster data from: /data/rosters.json');
    const response = await fetch('/data/rosters.json');
    
    if (!response.ok) {
      console.error(`Failed to load roster data: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching roster data:', error);
    return [];
  }
};

/**
 * Clear data cache
 */
export const clearCache = () => {
  dataCache.players = {};
  dataCache.teams = null;
  dataCache.games = {};
  dataCache.dateRangeData = {};
  dataCache.multiGameData = {};
};


// Enhanced dataService.js functions for matchup analysis

/**
 * Analyze player performance vs specific opponents
 * @param {string} playerName - Player name
 * @param {string} playerTeam - Player's team
 * @param {string} opponentTeam - Opponent team
 * @param {Object} dateRangeData - Historical data
 * @returns {Object} Performance stats vs opponent
 */
export const analyzePlayerVsOpponent = (playerName, playerTeam, opponentTeam, dateRangeData) => {
  const gamesVsOpponent = [];
  const sortedDates = Object.keys(dateRangeData).sort();
  
  // Look through each date to find games where these teams played
  sortedDates.forEach(dateStr => {
    const playersForDate = dateRangeData[dateStr];
    
    // Check if both teams have players in this date's data (indicating they played)
    const hasPlayerTeam = playersForDate.some(p => p.team === playerTeam);
    const hasOpponentTeam = playersForDate.some(p => p.team === opponentTeam);
    
    if (hasPlayerTeam && hasOpponentTeam) {
      // Find our specific player's performance in this game
      const playerData = playersForDate.find(p => 
        p.name === playerName && p.team === playerTeam
      );
      
      if (playerData && playerData.H !== 'DNP') {
        gamesVsOpponent.push({
          date: dateStr,
          hits: Number(playerData.H) || 0,
          homeRuns: Number(playerData.HR) || 0,
          atBats: Number(playerData.AB) || 0,
          rbi: Number(playerData.RBI) || 0,
          runs: Number(playerData.R) || 0
        });
      }
    }
  });
  
  if (gamesVsOpponent.length === 0) {
    return null;
  }
  
  // Calculate aggregate stats
  const totalGames = gamesVsOpponent.length;
  const totalHits = gamesVsOpponent.reduce((sum, game) => sum + game.hits, 0);
  const totalHRs = gamesVsOpponent.reduce((sum, game) => sum + game.homeRuns, 0);
  const totalAB = gamesVsOpponent.reduce((sum, game) => sum + game.atBats, 0);
  const totalRBI = gamesVsOpponent.reduce((sum, game) => sum + game.rbi, 0);
  const totalRuns = gamesVsOpponent.reduce((sum, game) => sum + game.runs, 0);
  
  return {
    playerName,
    playerTeam,
    opponentTeam,
    gamesVsOpponent: totalGames,
    totalHits,
    totalHRs,
    totalRBI,
    totalRuns,
    hitsPerGame: (totalHits / totalGames).toFixed(2),
    hrsPerGame: (totalHRs / totalGames).toFixed(2),
    battingAvg: totalAB > 0 ? (totalHits / totalAB).toFixed(3) : '.000',
    gameLog: gamesVsOpponent,
    // Recent form (last 5 games vs this opponent)
    recentForm: gamesVsOpponent.slice(-5).map(g => g.hits > 0 ? '✓' : '✗').join('')
  };
};

/**
 * Get all matchups for today's games
 * @param {Array} gameData - Today's game data
 * @returns {Array} Array of matchup objects
 */
export const getTodaysMatchups = (gameData) => {
  return gameData.map(game => ({
    gameId: game.id || game.originalId,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    gameTime: game.time || null,
    status: game.status || 'Scheduled'
  }));
};

/**
 * Get players scheduled to play today from roster and game data
 * @param {Array} gameData - Today's games
 * @param {Array} rosterData - Current roster
 * @returns {Array} Players playing today
 */
export const getTodaysActivePlayers = (gameData, rosterData) => {
  const teamsPlayingToday = new Set();
  
  gameData.forEach(game => {
    teamsPlayingToday.add(game.homeTeam);
    teamsPlayingToday.add(game.awayTeam);
  });
  
  return rosterData.filter(player => 
    teamsPlayingToday.has(player.team) && 
    (player.type === 'hitter' || !player.type)
  );
};

/**
 * Analyze time slot performance patterns
 * @param {string} playerName - Player name  
 * @param {string} playerTeam - Player's team
 * @param {string} timeSlotType - Type of time slot
 * @param {Object} dateRangeData - Historical data
 * @returns {Object} Time slot performance stats
 */
export const analyzePlayerTimeSlotPerformance = (playerName, playerTeam, timeSlotType, dateRangeData) => {
  const timeSlotGames = [];
  
  Object.keys(dateRangeData).forEach(dateStr => {
    const gameDate = new Date(dateStr);
    const gameTimeSlot = classifyTimeSlot(gameDate);
    
    if (gameTimeSlot === timeSlotType) {
      const playersForDate = dateRangeData[dateStr];
      const playerData = playersForDate.find(p => 
        p.name === playerName && p.team === playerTeam
      );
      
      if (playerData && playerData.H !== 'DNP') {
        timeSlotGames.push({
          date: dateStr,
          dayOfWeek: gameDate.getDay(),
          hits: Number(playerData.H) || 0,
          homeRuns: Number(playerData.HR) || 0,
          atBats: Number(playerData.AB) || 0
        });
      }
    }
  });
  
  if (timeSlotGames.length === 0) {
    return null;
  }
  
  const totalGames = timeSlotGames.length;
  const totalHits = timeSlotGames.reduce((sum, game) => sum + game.hits, 0);
  const totalHRs = timeSlotGames.reduce((sum, game) => sum + game.homeRuns, 0);
  const totalAB = timeSlotGames.reduce((sum, game) => sum + game.atBats, 0);
  
  return {
    playerName,
    playerTeam,
    timeSlotType,
    gamesInTimeSlot: totalGames,
    totalHits,
    totalHRs,
    hitsPerGame: (totalHits / totalGames).toFixed(2),
    hrsPerGame: (totalHRs / totalGames).toFixed(2),
    battingAvgInSlot: totalAB > 0 ? (totalHits / totalAB).toFixed(3) : '.000',
    gameLog: timeSlotGames
  };
};

/**
 * Classify time slot based on date/time
 * @param {Date} gameDate - Date of the game
 * @returns {string} Time slot classification
 */
export const classifyTimeSlot = (gameDate) => {
  const dayOfWeek = gameDate.getDay();
  const month = gameDate.getMonth();
  const date = gameDate.getDate();
  
  // Sunday games
  if (dayOfWeek === 0) {
    return 'Sunday Games';
  }
  
  // Saturday games  
  if (dayOfWeek === 6) {
    return 'Saturday Games';
  }
  
  // Friday games
  if (dayOfWeek === 5) {
    return 'Friday Games';
  }
  
  // Weekday games (Mon-Thu)
  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    // Further classify by likely game time
    // Day games are more common on certain days/holidays
    const isLikelyDayGame = (
      month === 3 ||  // April (season start, more day games)
      month === 8 ||  // September (school back, more day games)
      (dayOfWeek === 3 && month >= 4 && month <= 8) // Wednesday day games common
    );
    
    return isLikelyDayGame ? 'Weekday Day Games' : 'Weekday Night Games';
  }
  
  return 'Other Games';
};

/**
 * Generate comprehensive matchup analysis for dashboard
 * @param {Array} gameData - Today's games
 * @param {Object} dateRangeData - Historical player data
 * @param {Array} rosterData - Current roster
 * @returns {Object} Complete matchup analysis
 */
export const generateMatchupAnalysis = async (gameData, dateRangeData, rosterData) => {
  const todaysMatchups = getTodaysMatchups(gameData);
  const activePlayers = getTodaysActivePlayers(gameData, rosterData);
  
  const opponentMatchupHits = [];
  const opponentMatchupHRs = [];
  const timeSlotHits = [];  
  const timeSlotHRs = [];
  
  // Current date for time slot classification
  const currentDate = new Date();
  const currentTimeSlot = classifyTimeSlot(currentDate);
  
  // Analyze each active player
  for (const player of activePlayers) {
    // Find which opponent this player is facing today
    const playerMatchup = todaysMatchups.find(matchup => 
      matchup.homeTeam === player.team || matchup.awayTeam === player.team
    );
    
    if (playerMatchup) {
      const opponent = playerMatchup.homeTeam === player.team ? 
        playerMatchup.awayTeam : playerMatchup.homeTeam;
      
      // Analyze vs opponent
      const vsOpponentStats = analyzePlayerVsOpponent(
        player.name, 
        player.team, 
        opponent, 
        dateRangeData
      );
      
      if (vsOpponentStats && vsOpponentStats.gamesVsOpponent >= 3) {
        opponentMatchupHits.push(vsOpponentStats);
        if (vsOpponentStats.totalHRs > 0) {
          opponentMatchupHRs.push(vsOpponentStats);
        }
      }
      
      // Analyze time slot performance
      const timeSlotStats = analyzePlayerTimeSlotPerformance(
        player.name,
        player.team,
        currentTimeSlot,
        dateRangeData
      );
      
      if (timeSlotStats && timeSlotStats.gamesInTimeSlot >= 3) {
        timeSlotHits.push(timeSlotStats);
        if (timeSlotStats.totalHRs > 0) {
          timeSlotHRs.push(timeSlotStats);
        }
      }
    }
  }
  
  return {
    opponentMatchupHits: opponentMatchupHits
      .sort((a, b) => parseFloat(b.hitsPerGame) - parseFloat(a.hitsPerGame))
      .slice(0, 25),
    opponentMatchupHRs: opponentMatchupHRs  
      .sort((a, b) => parseFloat(b.hrsPerGame) - parseFloat(a.hrsPerGame))
      .slice(0, 25),
    timeSlotHits: timeSlotHits
      .sort((a, b) => parseFloat(b.hitsPerGame) - parseFloat(a.hitsPerGame))
      .slice(0, 25),
    timeSlotHRs: timeSlotHRs
      .sort((a, b) => parseFloat(b.hrsPerGame) - parseFloat(a.hrsPerGame))
      .slice(0, 25),
    currentTimeSlot,
    totalMatchupsAnalyzed: todaysMatchups.length,
    totalPlayersAnalyzed: activePlayers.length
  };
};