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
 * Fetch player data for a range of dates
 * @param {Date} startDate - The starting date
 * @param {number} daysToLookBack - Number of days to look back
 * @returns {Promise<Object>} Map of date -> player data arrays
 */
export const fetchPlayerDataForDateRange = async (startDate, daysToLookBack = 14) => {
  // Generate a unique cache key for this range
  const cacheKey = `${formatDateString(startDate)}_${daysToLookBack}`;
  
  // Check cache first
  if (dataCache.dateRangeData[cacheKey]) {
    console.log(`[DataService] Using cached date range data for ${cacheKey}`);
    return dataCache.dateRangeData[cacheKey];
  }
  
  console.log(`[DataService] Fetching player data for ${daysToLookBack} days starting from ${formatDateString(startDate)}`);
  const result = {};
  
  // For each day in the range
  for (let daysBack = 0; daysBack <= daysToLookBack; daysBack++) {
    const searchDate = new Date(startDate);
    searchDate.setDate(searchDate.getDate() - daysBack);
    const dateStr = formatDateString(searchDate);
    
    try {
      // Get player data for this date
      const playersForDate = await fetchPlayerData(dateStr);
      
      if (playersForDate && playersForDate.length > 0) {
        console.log(`[DataService] Found ${playersForDate.length} player records for ${dateStr}`);
        result[dateStr] = playersForDate;
      } else {
        console.log(`[DataService] No player data found for ${dateStr}`);
      }
    } catch (error) {
      console.error(`[DataService] Error fetching player data for ${dateStr}:`, error);
    }
  }
  
  // Store in cache
  dataCache.dateRangeData[cacheKey] = result;
  
  console.log(`[DataService] Completed fetching data for ${Object.keys(result).length} dates`);
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