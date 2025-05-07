import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  fetchTeamData, 
  fetchRosterData, 
  formatDateString,
  findMultiGamePlayerStats,
  formatDateForDisplay,
  fetchPlayerDataForDateRange
} from '../../../services/dataService';

// Import our enhanced player history function
import { createPlayerWithGameHistory } from './playerHistoryUtils';

/**
 * Custom hook to manage player data
 * Enhanced with separate hitter and pitcher game history retrieval
 * 
 * @param {Array} playerData - Current day player data from parent component
 * @param {Array} gameData - Current day game data from parent component
 * @param {Date} currentDate - Current selected date
 * @param {number} hitterGamesHistory - Number of games to display in hitter history (default: 3)
 * @param {number} pitcherGamesHistory - Number of games to display in pitcher history (default: 3)
 * @returns {Object} Player data and related utilities
 */
const usePlayerData = (
  playerData, 
  gameData, 
  currentDate, 
  hitterGamesHistory = 3, 
  pitcherGamesHistory = 3
) => {
  // State for the component
  const [selectedPlayers, setSelectedPlayers] = useState({
    hitters: [],
    pitchers: []
  });
  const [availablePlayers, setAvailablePlayers] = useState({
    hitters: [],
    pitchers: []
  });
  // Full pitcher roster for selection
  const [fullPitcherRoster, setFullPitcherRoster] = useState([]);
  const [teams, setTeams] = useState({});
  const [playerDataSource, setPlayerDataSource] = useState('current');
  const [historicalDate, setHistoricalDate] = useState(null);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [hasProcessedData, setHasProcessedData] = useState(false);
  // Store the maximum number of games data per player to avoid refetching
  const [playerStatsHistory, setPlayerStatsHistory] = useState({});
  const [extendedPitcherData, setExtendedPitcherData] = useState({});
  const [isRefreshingHitters, setIsRefreshingHitters] = useState(false);
  const [isRefreshingPitchers, setIsRefreshingPitchers] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState({ 
    type: null, 
    gamesCount: 0,
    timestamp: 0 
  });
  // Store latest settings to track changes
  const [currentHitterGamesHistory, setCurrentHitterGamesHistory] = useState(hitterGamesHistory);
  const [currentPitcherGamesHistory, setCurrentPitcherGamesHistory] = useState(pitcherGamesHistory);

  // Use a ref to track ongoing refreshes and prevent multiple simultaneous refreshes
  const isRefreshingRef = useRef({
    hitter: false,
    pitcher: false
  });

  // Store complete data cache for up to MAX_GAMES_HISTORY (7) games
  const MAX_GAMES_HISTORY = 7;
  const playerDataCacheRef = useRef({
    hitters: {}, // playerId -> full player data with MAX_GAMES_HISTORY
    pitchers: {}  // playerId -> full player data with MAX_GAMES_HISTORY
  });

  // Improved function to get player game history from cache or fetch if needed
  /**
 * Enhanced function to get player game history from cache or fetch if needed
 * With improved logging and validation for hitter data refreshes
 * 
 * @param {Object} player - The player object
 * @param {number} historyCount - Number of games to include in history
 * @returns {Promise<Object>} Updated player object with game history
 */
  const fetchPlayerGameHistory = useCallback(async (player, historyCount) => {
    if (!player || !player.name || !player.team) {
      console.error("[usePlayerData] Invalid player passed to fetchPlayerGameHistory:", player);
      return player;
    }
    
    const isHitter = player.playerType === 'hitter';
    const isPitcher = player.playerType === 'pitcher';
    const playerId = player.id;
    
    // Skip if player type is unknown
    if (!isHitter && !isPitcher) {
      console.warn(`[usePlayerData] Unknown player type for ${player.name}, skipping refresh`);
      return player;
    }
    
    console.log(`[usePlayerData] fetchPlayerGameHistory for ${player.name} (${isHitter ? 'hitter' : 'pitcher'}) with ${historyCount} games`);
    
    // Check if we already have cached data for this player with the max history
    const playerCache = isHitter 
      ? playerDataCacheRef.current.hitters[playerId]
      : playerDataCacheRef.current.pitchers[playerId];
    
    if (playerCache && playerCache.maxGamesHistory >= MAX_GAMES_HISTORY) {
      console.log(`[usePlayerData] Using cached data for ${player.name} with ${playerCache.maxGamesHistory} max games`);
      
      // We have complete cached data, just need to create a subset with the requested history count
      const updatedPlayer = { ...player };
      
      // Clear existing game data
      for (let i = 1; i <= MAX_GAMES_HISTORY; i++) {
        if (isHitter) {
          delete updatedPlayer[`game${i}Date`];
          delete updatedPlayer[`game${i}HR`];
          delete updatedPlayer[`game${i}AB`];
          delete updatedPlayer[`game${i}H`];
        } else {
          delete updatedPlayer[`game${i}Date`];
          delete updatedPlayer[`game${i}IP`];
          delete updatedPlayer[`game${i}K`];
          delete updatedPlayer[`game${i}ER`];
          delete updatedPlayer[`game${i}H`];
          delete updatedPlayer[`game${i}R`];
          delete updatedPlayer[`game${i}BB`];
          delete updatedPlayer[`game${i}HR`];
          delete updatedPlayer[`game${i}PC_ST`];
        }
      }
      
      // Add game data for the requested history count
      for (let i = 0; i < historyCount && i < playerCache.games.length; i++) {
        const gameNum = i + 1;
        const gameData = playerCache.games[i]?.data || {};
        const gameDate = playerCache.games[i]?.date || '';
        
        if (isHitter) {
          console.log(`[usePlayerData] Setting game${gameNum} data for ${player.name} to date ${gameDate}`);
          
          updatedPlayer[`game${gameNum}Date`] = gameDate;
          updatedPlayer[`game${gameNum}HR`] = gameData.HR || '0';
          updatedPlayer[`game${gameNum}AB`] = gameData.AB || '0';
          updatedPlayer[`game${gameNum}H`] = gameData.H || '0';
        } else {
          updatedPlayer[`game${gameNum}Date`] = gameDate;
          updatedPlayer[`game${gameNum}IP`] = gameData.IP || '0';
          updatedPlayer[`game${gameNum}K`] = gameData.K || '0';
          updatedPlayer[`game${gameNum}ER`] = gameData.ER || '0';
          updatedPlayer[`game${gameNum}H`] = gameData.H || '0';
          updatedPlayer[`game${gameNum}R`] = gameData.R || '0';
          updatedPlayer[`game${gameNum}BB`] = gameData.BB || '0';
          updatedPlayer[`game${gameNum}HR`] = gameData.HR || '0';
          updatedPlayer[`game${gameNum}PC_ST`] = gameData.PC_ST || 'N/A';
        }
      }
      
      console.log(`[usePlayerData] Returning updated ${isHitter ? 'hitter' : 'pitcher'} ${player.name} with ${historyCount} games history`);
      return updatedPlayer;
    }
    
    // If we don't have cached data or need to fetch more, get it from date range data
    const dateData = isPitcher ? extendedPitcherData : playerStatsHistory;
    
    // If we don't have date data yet, just return the original player
    if (Object.keys(dateData).length === 0) {
      console.warn(`[usePlayerData] No historical data available for ${player.name}, returning original data`);
      return player;
    }
    
    try {
      console.log(`[usePlayerData] Fetching game history for ${player.name} from date range data`);
      
      // Find game history for this player - always try to get MAX_GAMES_HISTORY
      const games = findMultiGamePlayerStats(
        dateData,
        player.name,
        player.team,
        MAX_GAMES_HISTORY // Always fetch the maximum number of games
      );
      
      console.log(`[usePlayerData] Found ${games.length} games for ${player.name}`);
      
      // Store the complete data in the cache
      if (isHitter) {
        playerDataCacheRef.current.hitters[playerId] = {
          maxGamesHistory: MAX_GAMES_HISTORY,
          games: games
        };
      } else {
        playerDataCacheRef.current.pitchers[playerId] = {
          maxGamesHistory: MAX_GAMES_HISTORY,
          games: games
        };
      }
      
      // Make a copy of the player to update
      const updatedPlayer = { ...player };
      
      // Clear existing game data
      for (let i = 1; i <= MAX_GAMES_HISTORY; i++) {
        if (isHitter) {
          delete updatedPlayer[`game${i}Date`];
          delete updatedPlayer[`game${i}HR`];
          delete updatedPlayer[`game${i}AB`];
          delete updatedPlayer[`game${i}H`];
        } else {
          delete updatedPlayer[`game${i}Date`];
          delete updatedPlayer[`game${i}IP`];
          delete updatedPlayer[`game${i}K`];
          delete updatedPlayer[`game${i}ER`];
          delete updatedPlayer[`game${i}H`];
          delete updatedPlayer[`game${i}R`];
          delete updatedPlayer[`game${i}BB`];
          delete updatedPlayer[`game${i}HR`];
          delete updatedPlayer[`game${i}PC_ST`];
        }
      }
      
      // Add only the requested number of games to the player object
      for (let i = 0; i < historyCount && i < games.length; i++) {
        const gameNum = i + 1;
        const gameData = games[i]?.data || {};
        const gameDate = games[i]?.date || '';
        
        if (isHitter) {
          console.log(`[usePlayerData] Setting game${gameNum} data for ${player.name} to date ${gameDate}`);
          
          updatedPlayer[`game${gameNum}Date`] = gameDate;
          updatedPlayer[`game${gameNum}HR`] = gameData.HR || '0';
          updatedPlayer[`game${gameNum}AB`] = gameData.AB || '0';
          updatedPlayer[`game${gameNum}H`] = gameData.H || '0';
        } else {
          updatedPlayer[`game${gameNum}Date`] = gameDate;
          updatedPlayer[`game${gameNum}IP`] = gameData.IP || '0';
          updatedPlayer[`game${gameNum}K`] = gameData.K || '0';
          updatedPlayer[`game${gameNum}ER`] = gameData.ER || '0';
          updatedPlayer[`game${gameNum}H`] = gameData.H || '0';
          updatedPlayer[`game${gameNum}R`] = gameData.R || '0';
          updatedPlayer[`game${gameNum}BB`] = gameData.BB || '0';
          updatedPlayer[`game${gameNum}HR`] = gameData.HR || '0';
          updatedPlayer[`game${gameNum}PC_ST`] = gameData.PC_ST || 'N/A';
        }
      }
      
      console.log(`[usePlayerData] Successfully updated ${player.name} with ${historyCount} games history`);
      return updatedPlayer;
    } catch (error) {
      console.error(`[usePlayerData] Error fetching game history for ${player.name}:`, error);
      return player;
    }
  }, [playerStatsHistory, extendedPitcherData]);

  // Helper function to update a single player's game history
  const updatePlayerWithGameHistory = useCallback(async (player, historyCount) => {
    return await fetchPlayerGameHistory(player, historyCount);
  }, [fetchPlayerGameHistory]);

  // Updated function to refresh all players of a specific type
  /**
 * Enhanced function to refresh all players of a specific type with proper logging
 * @param {string} playerType - Type of players to update ('hitter' or 'pitcher')
 * @param {number} newHistoryCount - New number of games to display
 * @returns {Promise<void>}
 */
  const updateAllPlayersGameHistory = useCallback(async (playerType, newHistoryCount) => {
    // Check if we're already refreshing this player type
    if (isRefreshingRef.current[playerType]) {
      console.log(`[usePlayerData] Already refreshing ${playerType}s, skipping redundant update`);
      return;
    }
    
    // Set refreshing flag
    isRefreshingRef.current[playerType] = true;
    
    if (playerType !== 'hitter' && playerType !== 'pitcher') {
      isRefreshingRef.current[playerType] = false;
      return;
    }
    
    const isHitter = playerType === 'hitter';
    
    // Get a copy of the current players
    let playersToUpdate = [];
    
    // Use a function to get the latest player data without adding a dependency
    setSelectedPlayers(currentPlayers => {
      playersToUpdate = isHitter ? [...currentPlayers.hitters] : [...currentPlayers.pitchers];
      return currentPlayers; // Return unchanged to avoid unnecessary re-render
    });
    
    if (playersToUpdate.length === 0) {
      isRefreshingRef.current[playerType] = false;
      return;
    }
    
    // Set the appropriate loading state
    if (isHitter) {
      setIsRefreshingHitters(true);
    } else {
      setIsRefreshingPitchers(true);
    }
    
    try {
      console.log(`[usePlayerData] ===== STARTING REFRESH: ${playersToUpdate.length} ${playerType}s with ${newHistoryCount} games =====`);
      
      // Log the players we're updating for debugging
      playersToUpdate.forEach((player, index) => {
        console.log(`[usePlayerData] Player ${index+1}/${playersToUpdate.length} to update: ${player.name} (${player.id})`);
        
        // Log current game data for the first player to help debug
        if (index === 0) {
          let gameCount = 0;
          for (let i = 1; i <= 7; i++) {
            if (player[`game${i}Date`]) {
              gameCount++;
              console.log(`[usePlayerData] Current game${i}Date: ${player[`game${i}Date`]}`);
            }
          }
          console.log(`[usePlayerData] Player currently has ${gameCount} game history entries`);
        }
      });
      
      // Update all players in parallel with detailed logging
      const updatedPlayers = await Promise.all(
        playersToUpdate.map(async (player, index) => {
          // Add more detailed logging for the first player
          const isFirstPlayer = index === 0;
          
          if (isFirstPlayer) {
            console.log(`[usePlayerData] Starting refresh for first player: ${player.name}`);
          }
          
          // Get the updated player data
          const updatedPlayer = await fetchPlayerGameHistory(player, newHistoryCount);
          
          if (isFirstPlayer) {
            console.log(`[usePlayerData] Completed refresh for first player: ${player.name}`);
            
            // Log the updated game data for debugging
            let updatedGameCount = 0;
            for (let i = 1; i <= 7; i++) {
              if (updatedPlayer[`game${i}Date`]) {
                updatedGameCount++;
                console.log(`[usePlayerData] Updated game${i}Date: ${updatedPlayer[`game${i}Date`]}`);
              }
            }
            console.log(`[usePlayerData] Player now has ${updatedGameCount} game history entries`);
            
            // Verify game count matches request
            if (updatedGameCount !== Math.min(newHistoryCount, MAX_GAMES_HISTORY)) {
              console.warn(`[usePlayerData] WARNING: Updated game count (${updatedGameCount}) doesn't match requested count (${newHistoryCount})`);
            }
          }
          
          return updatedPlayer;
        })
      );
      
      console.log(`[usePlayerData] Successfully updated ${updatedPlayers.length} ${playerType}s with ${newHistoryCount} games history`);
      
      // CRITICAL: Actually update the state with the refreshed players
      // This is what was potentially missing in the original implementation
      setSelectedPlayers(prev => {
        console.log(`[usePlayerData] Updating global state with ${updatedPlayers.length} refreshed ${playerType}s`);
        return {
          ...prev,
          [isHitter ? 'hitters' : 'pitchers']: updatedPlayers
        };
      });
      
      // Update the current games history setting
      if (isHitter) {
        setCurrentHitterGamesHistory(newHistoryCount);
      } else {
        setCurrentPitcherGamesHistory(newHistoryCount);
      }
      
      console.log(`[usePlayerData] ===== COMPLETED REFRESH: ${updatedPlayers.length} ${playerType}s with ${newHistoryCount} games =====`);
    } catch (error) {
      console.error(`[usePlayerData] Error updating ${playerType} game history:`, error);
    } finally {
      // Reset loading state
      if (isHitter) {
        setIsRefreshingHitters(false);
      } else {
        setIsRefreshingPitchers(false);
      }
      // Reset the refreshing flag
      isRefreshingRef.current[playerType] = false;
    }
  }, [fetchPlayerGameHistory, MAX_GAMES_HISTORY]);

  // Function to request a history refresh (exposed to parent components)
  const requestHistoryRefresh = useCallback((playerType, historyCount) => {
    console.log(`[usePlayerData] History refresh requested for ${playerType}s with ${historyCount} games`);
    
    // Set refresh trigger with timestamp to ensure it's recognized as a new trigger
    setRefreshTrigger({
      type: playerType,
      gamesCount: historyCount,
      timestamp: Date.now()
    });
    
    return updateAllPlayersGameHistory(playerType, historyCount);
  }, [updateAllPlayersGameHistory]);

  // Effect to detect global history setting changes and refresh players
  useEffect(() => {
    if (hitterGamesHistory !== currentHitterGamesHistory && 
        selectedPlayers.hitters.length > 0 && 
        !isRefreshingRef.current.hitter) {
      console.log(`[usePlayerData] Hitter games history changed from ${currentHitterGamesHistory} to ${hitterGamesHistory}`);
      requestHistoryRefresh('hitter', hitterGamesHistory);
    }
  }, [hitterGamesHistory, currentHitterGamesHistory, selectedPlayers.hitters.length, requestHistoryRefresh]);
  
  useEffect(() => {
    if (pitcherGamesHistory !== currentPitcherGamesHistory && 
        selectedPlayers.pitchers.length > 0 && 
        !isRefreshingRef.current.pitcher) {
      console.log(`[usePlayerData] Pitcher games history changed from ${currentPitcherGamesHistory} to ${pitcherGamesHistory}`);
      requestHistoryRefresh('pitcher', pitcherGamesHistory);
    }
  }, [pitcherGamesHistory, currentPitcherGamesHistory, selectedPlayers.pitchers.length, requestHistoryRefresh]);

  // Handle explicit refresh triggered via refreshTrigger
  useEffect(() => {
    const { type, gamesCount, timestamp } = refreshTrigger;
    
    if (!type || !gamesCount || !timestamp) return;
    
    // Skip if already refreshing this player type
    if (isRefreshingRef.current[type]) {
      console.log(`[usePlayerData] Already refreshing ${type}s, skipping triggered update`);
      return;
    }
    
    console.log(`[usePlayerData] Processing refresh trigger for ${type}s with ${gamesCount} games (timestamp: ${timestamp})`);
    
    // Call updateAllPlayersGameHistory with the trigger parameters
    updateAllPlayersGameHistory(type, gamesCount);
  }, [refreshTrigger, updateAllPlayersGameHistory]);

  // Format date for display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Get previous day's date
  const previousDate = new Date(currentDate);
  previousDate.setDate(previousDate.getDate() - 1);

  const formattedPreviousDate = previousDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });





  /**
 * Fetch hitter data by ID with the current game history setting
 * Similar to fetchPitcherById but for hitters
 * @param {string} hitterId - Hitter ID in format "name-team"
 * @returns {Promise<Object>} Hitter data with game history
 */
const fetchHitterById = async (hitterId) => {
  if (!hitterId) return null;
  
  console.log(`[usePlayerData] Fetching data for hitter: ${hitterId}`);
  
  // Split the ID format (name-team)
  const [hitterName, hitterTeam] = hitterId.split('-');
  
  // Check if this hitter is already in selectedPlayers.hitters
  const existingHitter = selectedPlayers.hitters.find(h => h.id === hitterId);
  if (existingHitter) {
    console.log(`[usePlayerData] Found hitter in selectedPlayers: ${hitterName}`);
    
    // Instead of just returning the existing hitter, apply the current game history setting
    return fetchPlayerGameHistory(existingHitter, hitterGamesHistory);
  }
  
  // If not found in selected hitters, look in available hitters
  const availableHitter = availablePlayers.hitters.find(h => h.id === hitterId);
  if (availableHitter) {
    console.log(`[usePlayerData] Found hitter in availablePlayers: ${hitterName}`);
    
    // Apply the current game history setting
    return fetchPlayerGameHistory(availableHitter, hitterGamesHistory);
  }
  
  // If not found anywhere, create a basic hitter with defaults
  console.log(`[usePlayerData] Hitter not found in existing data: ${hitterName}`);
  let basicHitter = {
    id: hitterId,
    name: hitterName,
    team: hitterTeam,
    type: 'hitter',
    playerType: 'hitter',
    // Initialize with defaults for all stats
    AB: '0',
    H: '0',
    HR: '0',
    R: '0',
    RBI: '0',
    AVG: '.000',
    prevGameHR: '0',
    prevGameAB: '0',
    prevGameH: '0'
  };
  
  try {
    // Look for hitter in current playerData
    console.log("[usePlayerData] Looking for hitter in current player data...");
    
    // Try a simple name match
    const matchingHitters = playerData.filter(p => 
      p.name === hitterName && 
      p.team === hitterTeam
    );
    
    if (matchingHitters.length > 0) {
      const matchingHitter = matchingHitters[0];
      console.log(`[usePlayerData] Found hitter in current data: ${hitterName}`, matchingHitter);
      
      // Copy stats to our hitter object
      basicHitter.AB = matchingHitter.AB || '0';
      basicHitter.H = matchingHitter.H || '0';
      basicHitter.HR = matchingHitter.HR || '0';
      basicHitter.R = matchingHitter.R || '0';
      basicHitter.RBI = matchingHitter.RBI || '0';
      basicHitter.AVG = matchingHitter.AVG || '.000';
      basicHitter.prevGameHR = matchingHitter.HR || '0';
      basicHitter.prevGameAB = matchingHitter.AB || '0';
      basicHitter.prevGameH = matchingHitter.H || '0';
    }
    
    // Get game history for this hitter
    if (playerStatsHistory && Object.keys(playerStatsHistory).length > 0) {
      console.log(`[usePlayerData] Getting game history for hitter: ${hitterName}`);
      
      // Apply the current game history setting
      return fetchPlayerGameHistory(basicHitter, hitterGamesHistory);
    }
    
    return basicHitter;
  } catch (error) {
    console.error(`[usePlayerData] Error creating hitter data: ${error.message}`);
    return basicHitter;
  }
};




  // Enhanced fetchPitcherById function
  const fetchPitcherById = async (pitcherId) => {
    if (!pitcherId) return null;
    
    console.log(`Fetching data for pitcher: ${pitcherId}`);
    
    // Split the ID format (name-team)
    const [pitcherName, pitcherTeam] = pitcherId.split('-');
    
    // Check if this pitcher is already in selectedPlayers.pitchers
    const existingPitcher = selectedPlayers.pitchers.find(p => p.id === pitcherId);
    if (existingPitcher) {
      console.log(`Found pitcher in selectedPlayers: ${pitcherName}`);
      return {
        id: existingPitcher.id,
        name: existingPitcher.name,
        team: existingPitcher.team,
        type: 'pitcher',
        playerType: 'pitcher',
        throwingArm: existingPitcher.throwingArm || '',
        // Get all stats with appropriate fallbacks
        PC_ST: existingPitcher.PC_ST || existingPitcher.prevGamePC_ST || 'N/A',
        K: existingPitcher.K || existingPitcher.prevGameK || 'N/A',
        HR: existingPitcher.HR || existingPitcher.prevGameHR || 'N/A',
        IP: existingPitcher.IP || existingPitcher.prevGameIP || '0',
        ER: existingPitcher.ER || existingPitcher.prevGameER || 'N/A',
        H: existingPitcher.H || existingPitcher.prevGameH || '0',
        R: existingPitcher.R || existingPitcher.prevGameR || '0',
        BB: existingPitcher.BB || existingPitcher.prevGameBB || '0',
        ERA: existingPitcher.ERA || '0.00',
        // Include history data
        ...Object.entries(existingPitcher)
          .filter(([key]) => key.startsWith('game'))
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      };
    }
    
    // If not found in selected pitchers, look in available pitchers
    const availablePitcher = availablePlayers.pitchers.find(p => p.id === pitcherId);
    if (availablePitcher) {
      console.log(`Found pitcher in availablePlayers: ${pitcherName}`);
      return {
        id: availablePitcher.id,
        name: availablePitcher.name,
        team: availablePitcher.team,
        type: 'pitcher',
        playerType: 'pitcher',
        throwingArm: availablePitcher.throwingArm || '',
        // Get all stats with appropriate fallbacks
        PC_ST: availablePitcher.PC_ST || availablePitcher.prevGamePC_ST || 'N/A',
        K: availablePitcher.K || availablePitcher.prevGameK || 'N/A',
        HR: availablePitcher.HR || availablePitcher.prevGameHR || 'N/A',
        IP: availablePitcher.IP || availablePitcher.prevGameIP || '0',
        ER: availablePitcher.ER || availablePitcher.prevGameER || 'N/A',
        H: availablePitcher.H || availablePitcher.prevGameH || '0',
        R: availablePitcher.R || availablePitcher.prevGameR || '0',
        BB: availablePitcher.BB || availablePitcher.prevGameBB || '0',
        ERA: availablePitcher.ERA || '0.00',
        // Include history data
        ...Object.entries(availablePitcher)
          .filter(([key]) => key.startsWith('game'))
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      };
    }
    
    // Create a basic pitcher object with defaults for all fields
    let basicPitcher = {
      id: pitcherId,
      name: pitcherName,
      team: pitcherTeam,
      type: 'pitcher',
      playerType: 'pitcher',
      throwingArm: '',
      // Initialize with defaults for all stats
      PC_ST: 'N/A',
      K: 'N/A',
      HR: '0',
      IP: '0',
      ER: '0',
      H: '0',
      R: '0',
      BB: '0',
      ERA: '0.00'
    };
    
    try {
      // Look for pitcher in current playerData
      console.log("Looking for pitcher in current player data...");
      
      // Try a simple name match first
      const matchingPitchers = playerData.filter(p => 
        p.name === pitcherName && 
        p.team === pitcherTeam
      );
      
      if (matchingPitchers.length > 0) {
        const matchingPitcher = matchingPitchers[0];
        console.log(`Found pitcher in current data: ${pitcherName}`, matchingPitcher);
        
        // Copy all stats to our pitcher object with proper string handling
        basicPitcher.throwingArm = matchingPitcher.throwingArm || '';
        basicPitcher.PC_ST = matchingPitcher.PC_ST || matchingPitcher.prevGamePC_ST || 'N/A';
        basicPitcher.K = matchingPitcher.K || matchingPitcher.prevGameK || 'N/A';
        basicPitcher.HR = matchingPitcher.HR || matchingPitcher.prevGameHR || '0';
        basicPitcher.IP = matchingPitcher.IP || matchingPitcher.prevGameIP || '0';
        basicPitcher.ER = matchingPitcher.ER || matchingPitcher.prevGameER || '0';
        basicPitcher.H = matchingPitcher.H || matchingPitcher.prevGameH || '0';
        basicPitcher.R = matchingPitcher.R || matchingPitcher.prevGameR || '0';
        basicPitcher.BB = matchingPitcher.BB || matchingPitcher.prevGameBB || '0';
        basicPitcher.ERA = matchingPitcher.ERA || '0.00';
        
        // Set up the "prevGame*" fields for display in the table
        basicPitcher.prevGameIP = matchingPitcher.IP || '0';
        basicPitcher.prevGameK = matchingPitcher.K || '0';
        basicPitcher.prevGameER = matchingPitcher.ER || '0';
        basicPitcher.prevGameH = matchingPitcher.H || '0';
        basicPitcher.prevGameR = matchingPitcher.R || '0';
        basicPitcher.prevGameBB = matchingPitcher.BB || '0';
        basicPitcher.prevGameHR = matchingPitcher.HR || '0';
        basicPitcher.prevGamePC_ST = matchingPitcher.PC_ST || 'N/A';
      }
      
      // If not found or found, add game history regardless
      if (extendedPitcherData && Object.keys(extendedPitcherData).length > 0) {
        console.log(`Getting game history for pitcher: ${pitcherName}`);
        const gameHistory = findMultiGamePlayerStats(
          extendedPitcherData, 
          pitcherName, 
          pitcherTeam,
          MAX_GAMES_HISTORY // Always fetch all available games
        );
        
        console.log(`Found ${gameHistory.length} games for pitcher`);
        
        // Cache the complete game history
        playerDataCacheRef.current.pitchers[pitcherId] = {
          maxGamesHistory: MAX_GAMES_HISTORY,
          games: gameHistory
        };
        
        // Add only the requested number of games to display
        const gamesCountToAdd = pitcherGamesHistory;
        for (let i = 0; i < gamesCountToAdd && i < gameHistory.length; i++) {
          const gameNum = i + 1;
          const gameData = gameHistory[i]?.data || {};
          const gameDate = gameHistory[i]?.date || '';
          
          basicPitcher[`game${gameNum}Date`] = gameDate;
          basicPitcher[`game${gameNum}IP`] = gameData.IP || '0';
          basicPitcher[`game${gameNum}K`] = gameData.K || '0';
          basicPitcher[`game${gameNum}ER`] = gameData.ER || '0';
          basicPitcher[`game${gameNum}PC_ST`] = gameData.PC_ST || '0-0';
          // Add the additional stats to game history
          basicPitcher[`game${gameNum}H`] = gameData.H || '0';
          basicPitcher[`game${gameNum}R`] = gameData.R || '0';
          basicPitcher[`game${gameNum}BB`] = gameData.BB || '0';
          basicPitcher[`game${gameNum}HR`] = gameData.HR || '0';
        }
      }
      
      return basicPitcher;
    } catch (error) {
      console.error(`Error creating pitcher data: ${error.message}`);
      return basicPitcher; // Return basic object even if there's an error
    }
  };

  // Load team data for styling
  useEffect(() => {
    const loadTeamData = async () => {
      const teamData = await fetchTeamData();
      setTeams(teamData);
    };

    loadTeamData();
  }, []);

  // Reset processing flag when date changes or game history settings change
  useEffect(() => {
    setHasProcessedData(false);
  }, [currentDate, hitterGamesHistory, pitcherGamesHistory]);

  // Load players from roster and enhance with historical data
  useEffect(() => {
    const loadPlayerData = async () => {
      if (hasProcessedData) return;
      
      setIsLoadingPlayers(true);
      console.log("[usePlayerData] Loading players from roster with hitter history:", 
        hitterGamesHistory, "and pitcher history:", pitcherGamesHistory);
      
      try {
        // 1. Load the roster data
        const rosterData = await fetchRosterData();
        if (!rosterData || rosterData.length === 0) {
          console.error("[usePlayerData] Failed to load roster data");
          setIsLoadingPlayers(false);
          return;
        }
        console.log(`[usePlayerData] Loaded ${rosterData.length} players from roster`);
        
        // 2. Split into hitters and pitchers
        const hitters = rosterData.filter(player => 
          player && player.name && player.team && player.type === 'hitter'
        );
        
        const pitchers = rosterData.filter(player => 
          player && player.name && player.team && player.type === 'pitcher'
        );
        
        // Store the full pitcher roster for later use in dropdowns
        setFullPitcherRoster(pitchers);
        
        console.log(`[usePlayerData] Roster contains ${hitters.length} hitters and ${pitchers.length} pitchers`);
        
        // 3. Fetch player data for the past 30 days (expanded to ensure we have enough history)
        console.log("[usePlayerData] Fetching player data for date range (30 days)");
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 30);
        const datesWithData = Object.keys(dateRangeData);
        console.log(`[usePlayerData] Found data for ${datesWithData.length} days`);
        
        // 4. Keep track of player game history
        const newPlayerStatsHistory = {};
        
        // 5. Create hitter objects with MAX_GAMES_HISTORY
        const hittersPromises = hitters.map(async player => {
          // Get the maximum game history
          const gameHistory = findMultiGamePlayerStats(
            dateRangeData, 
            player.name, 
            player.team,
            MAX_GAMES_HISTORY // Always fetch the maximum
          );
          
          // Store the player's game history
          newPlayerStatsHistory[`${player.name}-${player.team}`] = gameHistory;
          
          // Cache the complete history
          playerDataCacheRef.current.hitters[`${player.name}-${player.team}`] = {
            maxGamesHistory: MAX_GAMES_HISTORY,
            games: gameHistory
          };
          
          // Use the imported function but always store maximum data
          return await createPlayerWithGameHistory(
            player, 
            dateRangeData, 
            [], 
            false, 
            hitterGamesHistory // Only display the requested number
          );
        });
        
        const hittersData = await Promise.all(hittersPromises);
        
        // 6. Create pitcher objects with extended game history search (up to 45 days back)
        console.log("[usePlayerData] Fetching extended pitcher data (up to 45 days back)");
        
        // Create a separate extended data window for pitchers (last 45 days) - pitchers typically have fewer appearances
        const pitcherDateRangeData = { ...dateRangeData };
        
        // Only fetch extended data if we have games in initial window
        if (datesWithData.length > 0) {
          // Get earliest date in current window
          const earliestDate = new Date(datesWithData.sort()[0]);
          
          // Create start date for extended window (45 more days back)
          const extendedStartDate = new Date(earliestDate);
          extendedStartDate.setDate(extendedStartDate.getDate() - 45);
          
          // Fetch extended data
          console.log(`[usePlayerData] Fetching additional pitcher data from ${extendedStartDate.toISOString()}`);
          const extendedData = await fetchPlayerDataForDateRange(extendedStartDate, 45);
          
          // Merge with existing data (without overwriting)
          Object.keys(extendedData).forEach(date => {
            if (!pitcherDateRangeData[date]) {
              pitcherDateRangeData[date] = extendedData[date];
            }
          });
          
          console.log(`[usePlayerData] Extended data window now has ${Object.keys(pitcherDateRangeData).length} days of data`);
          
          // Store the extended pitcher data
          setExtendedPitcherData(pitcherDateRangeData);
        }
        
        const pitchersPromises = pitchers.map(async player => {
          // Get the game history with extended window and MAX_GAMES_HISTORY
          const gameHistory = findMultiGamePlayerStats(
            pitcherDateRangeData, 
            player.name, 
            player.team,
            MAX_GAMES_HISTORY // Always fetch the maximum
          );
          
          // Store the player's game history
          newPlayerStatsHistory[`${player.name}-${player.team}`] = gameHistory;
          
          // Cache the complete history
          playerDataCacheRef.current.pitchers[`${player.name}-${player.team}`] = {
            maxGamesHistory: MAX_GAMES_HISTORY,
            games: gameHistory
          };
          
          // Use the imported function but with capped display
          return await createPlayerWithGameHistory(
            player, 
            pitcherDateRangeData, 
            [], 
            true,
            pitcherGamesHistory // Only display the requested number
          );
        });
        
        const pitchersData = await Promise.all(pitchersPromises);
        
        // 7. Update the player stats history state
        setPlayerStatsHistory(newPlayerStatsHistory);
        console.log(`[usePlayerData] Built game history for ${Object.keys(newPlayerStatsHistory).length} players`);
        
        // 8. Only show players from teams playing today if we have game data
        const teamsPlayingToday = new Set();
        if (gameData && gameData.length > 0) {
          gameData.forEach(game => {
            teamsPlayingToday.add(game.homeTeam);
            teamsPlayingToday.add(game.awayTeam);
          });
          
          console.log(`[usePlayerData] Teams playing today: ${Array.from(teamsPlayingToday).join(', ')}`);
        }
        
        // Filter players to only include those from teams playing today
        const filteredHitters = teamsPlayingToday.size > 0 
          ? hittersData.filter(player => teamsPlayingToday.has(player.team))
          : hittersData;
        
        const filteredPitchers = teamsPlayingToday.size > 0
          ? pitchersData.filter(player => teamsPlayingToday.has(player.team))
          : pitchersData;
        
        console.log(`[usePlayerData] Final available players: ${filteredHitters.length} hitters, ${filteredPitchers.length} pitchers`);
        
        // Update state with processed players
        setAvailablePlayers({
          hitters: filteredHitters,
          pitchers: filteredPitchers
        });
        
        // Update data source indicator based on whether we have current day data
        if (datesWithData.length > 0 && !datesWithData.includes(formatDateString(currentDate))) {
          setPlayerDataSource('historical');
          // Find the most recent date with data
          const mostRecent = datesWithData.sort().reverse()[0];
          setHistoricalDate(new Date(mostRecent));
        } else {
          setPlayerDataSource('current');
        }
        
        setHasProcessedData(true);
      } catch (error) {
        console.error('[usePlayerData] Error processing player data:', error);
      } finally {
        setIsLoadingPlayers(false);
      }
    };
    
    // Run the load function
    loadPlayerData();
  }, [
    currentDate, 
    gameData,  
    hasProcessedData,
    hitterGamesHistory,
    pitcherGamesHistory
  ]);

  // Function to get pitcher options for a specific opponent team
  const getPitcherOptionsForOpponent = (opponentTeam) => {
    // Filter the full pitcher roster to get only pitchers from the opponent team
    const teamPitchers = fullPitcherRoster.filter(pitcher => pitcher.team === opponentTeam);
    
    // Map to select options format
    return teamPitchers.map(pitcher => ({
      value: pitcher.name + '-' + pitcher.team,
      label: `${pitcher.name} (${pitcher.throwingArm || '?'})`,
      throwingArm: pitcher.throwingArm || ''
    }));
  };

  // Memoized hitter and pitcher select options
  const hitterSelectOptions = useMemo(() => {
    return availablePlayers.hitters.map(p => {
      // Find dates with data for this player
      const history = playerStatsHistory[p.id] || [];
      const dateInfo = history.length > 0 
        ? ` - Data from: ${history.map(g => formatDateForDisplay(g.date)).join(', ')}`
        : '';
      
      return {
        value: p.id,
        label: `${p.name} (${p.team})${dateInfo}`
      };
    });
  }, [availablePlayers.hitters, playerStatsHistory]);

  const pitcherSelectOptions = useMemo(() => {
    return availablePlayers.pitchers.map(p => {
      // Find dates with data for this player
      const history = playerStatsHistory[p.id] || [];
      const dateInfo = history.length > 0 
        ? ` - Data from: ${history.map(g => formatDateForDisplay(g.date)).join(', ')}`
        : '';
      
      return {
        value: p.id,
        label: `${p.name} (${p.team})${dateInfo}`
      };
    });
  }, [availablePlayers.pitchers, playerStatsHistory]);

  // Player add/remove handlers
  const handleAddHitterById = async (playerId) => {
    if (!playerId) return;
  
    const selectedPlayer = availablePlayers.hitters.find(p => p.id === playerId);
    if (!selectedPlayer) {
      console.error("[usePlayerData] Could not find hitter with ID:", playerId);
      alert("Error: Could not find selected hitter data.");
      return;
    }
  
    if (selectedPlayers.hitters.some(p => p.id === selectedPlayer.id)) {
      alert(`${selectedPlayer.name} is already in your hitters list.`);
      return;
    }
  
    const playerTeam = selectedPlayer.team;
    const game = gameData.find(g => g.homeTeam === playerTeam || g.awayTeam === playerTeam);
    let stadium = game ? game.venue || '' : '';
    let opponentTeam = game ? (game.homeTeam === playerTeam ? game.awayTeam : game.homeTeam) : '';
  
    // Create a new player with basic info
    const basePlayer = {
      ...selectedPlayer,
      stadium,
      opponentTeam
    };
    
    // Check if any other hitters from the same team already have values we can copy
    const teamHitters = selectedPlayers.hitters.filter(h => 
      h.team === playerTeam && h.opponentTeam === opponentTeam
    );
    
    if (teamHitters.length > 0) {
      // Find existing team hitter with the most data to copy from
      const sourceHitter = teamHitters.reduce((best, current) => {
        // Prefer hitters that have pitcher and other fields set
        const bestScore = (best.pitcherId ? 10 : 0) + 
                         (best.gameOU ? 5 : 0) + 
                         (best.stadium ? 3 : 0) + 
                         (best.expectedSO ? 2 : 0);
                         
        const currentScore = (current.pitcherId ? 10 : 0) + 
                            (current.gameOU ? 5 : 0) + 
                            (current.stadium ? 3 : 0) + 
                            (current.expectedSO ? 2 : 0);
                            
        return currentScore > bestScore ? current : best;
      }, teamHitters[0]);
      
      // Copy pitcher assignment if available
      if (sourceHitter.pitcherId) {
        basePlayer.pitcher = sourceHitter.pitcher;
        basePlayer.pitcherId = sourceHitter.pitcherId;
        basePlayer.pitcherHand = sourceHitter.pitcherHand;
        console.log(`Auto-assigned pitcher ${basePlayer.pitcher} for new hitter ${basePlayer.name}`);
        
        // If this pitcher has ExpSO value, copy that too
        if (sourceHitter.expectedSO) {
          basePlayer.expectedSO = sourceHitter.expectedSO;
          console.log(`Auto-assigned Expected SO: ${basePlayer.expectedSO} for new hitter ${basePlayer.name}`);
        }
      }
      
      // Copy Game O/U if available
      if (sourceHitter.gameOU) {
        basePlayer.gameOU = sourceHitter.gameOU;
        console.log(`Auto-assigned Game O/U: ${basePlayer.gameOU} for new hitter ${basePlayer.name}`);
      }
      
      // Copy Stadium if available and still empty
      if (sourceHitter.stadium && !basePlayer.stadium) {
        basePlayer.stadium = sourceHitter.stadium;
        console.log(`Auto-assigned Stadium: ${basePlayer.stadium} for new hitter ${basePlayer.name}`);
      }
    }
    
    // Get player with game history data
    const playerWithHistory = await updatePlayerWithGameHistory(basePlayer, hitterGamesHistory);
  
    setSelectedPlayers(prev => ({
      ...prev,
      hitters: [...prev.hitters, playerWithHistory]
    }));
  };

  const handleAddPitcherById = async (playerId) => {
    if (!playerId) return;
  
    const selectedPlayer = availablePlayers.pitchers.find(p => p.id === playerId);
    if (!selectedPlayer) {
      console.error("[usePlayerData] Could not find pitcher with ID:", playerId);
      alert("Error: Could not find selected pitcher data.");
      return;
    }
  
    if (selectedPlayers.pitchers.some(p => p.id === selectedPlayer.id)) {
      alert(`${selectedPlayer.name} is already in your pitchers list.`);
      return;
    }
  
    const playerTeam = selectedPlayer.team;
    const game = gameData.find(g => g.homeTeam === playerTeam || g.awayTeam === playerTeam);
    let stadium = game ? game.venue || '' : '';
    let opponent = game ? (game.homeTeam === playerTeam ? game.awayTeam : game.homeTeam) : '';
  
    // Create a new player with basic info
    const basePlayer = {
      ...selectedPlayer,
      stadium,
      opponent
    };
    
    // Check for existing pitchers from the same team to copy values from
    const teamPitchers = selectedPlayers.pitchers.filter(p => p.team === playerTeam);
    
    if (teamPitchers.length > 0) {
      // Find existing team pitcher with game data to copy
      const sourcePitcher = teamPitchers.find(p => p.gameOU || p.stadium);
      
      if (sourcePitcher) {
        // Copy Game O/U if available
        if (sourcePitcher.gameOU) {
          basePlayer.gameOU = sourcePitcher.gameOU;
          console.log(`Auto-assigned Game O/U: ${basePlayer.gameOU} for new pitcher ${basePlayer.name}`);
        }
        
        // Copy Stadium if available and still empty
        if (sourcePitcher.stadium && !basePlayer.stadium) {
          basePlayer.stadium = sourcePitcher.stadium;
          console.log(`Auto-assigned Stadium: ${basePlayer.stadium} for new pitcher ${basePlayer.name}`);
        }
      }
    }
    
    // Alternatively, we can check hitters from the same team
    else {
      const teamHitters = selectedPlayers.hitters.filter(h => h.team === playerTeam);
      if (teamHitters.length > 0) {
        const sourceHitter = teamHitters.find(h => h.gameOU || h.stadium);
        
        if (sourceHitter) {
          // Copy Game O/U if available
          if (sourceHitter.gameOU) {
            basePlayer.gameOU = sourceHitter.gameOU;
            console.log(`Auto-assigned Game O/U: ${basePlayer.gameOU} for new pitcher ${basePlayer.name} from hitter data`);
          }
          
          // Copy Stadium if available and still empty
          if (sourceHitter.stadium && !basePlayer.stadium) {
            basePlayer.stadium = sourceHitter.stadium;
            console.log(`Auto-assigned Stadium: ${basePlayer.stadium} for new pitcher ${basePlayer.name} from hitter data`);
          }
        }
      }
    }
  
    // Update with current games history
    const playerWithHistory = await updatePlayerWithGameHistory(basePlayer, pitcherGamesHistory);
  
    setSelectedPlayers(prev => ({
      ...prev,
      pitchers: [...prev.pitchers, playerWithHistory]
    }));
  };

  const handleRemovePlayer = (playerId, playerType) => {
    setSelectedPlayers(prev => ({
        ...prev,
        [playerType === 'hitter' ? 'hitters' : 'pitchers']: 
          prev[playerType === 'hitter' ? 'hitters' : 'pitchers'].filter(p => p.id !== playerId)
    }));
  };

  // Field change handlers
  const handleHitterFieldChange = (playerId, field, value) => {
    // Get the current hitter to determine context
    const currentHitter = selectedPlayers.hitters.find(h => h.id === playerId);
    if (!currentHitter) {
      // If hitter not found, just update that specific field as normal
      setSelectedPlayers(prev => ({
        ...prev,
        hitters: prev.hitters.map(player => {
          if (player.id !== playerId) return player;
          return { ...player, [field]: value };
        })
      }));
      return;
    }
    
    // For Game O/U, we want to update all players in the same game
    if (field === 'gameOU') {
      const hitterTeam = currentHitter.team;
      const opponentTeam = currentHitter.opponentTeam;
      
      // Update the Game O/U for all hitters AND pitchers in this game
      setSelectedPlayers(prev => ({
        ...prev,
        // Update hitters in the same game
        hitters: prev.hitters.map(player => {
          if ((player.team === hitterTeam && player.opponentTeam === opponentTeam) || 
              (player.team === opponentTeam && player.opponentTeam === hitterTeam)) {
            return { ...player, [field]: value };
          }
          return player;
        }),
        // Also update pitchers in the same game
        pitchers: prev.pitchers.map(player => {
          if ((player.team === hitterTeam && player.opponent === opponentTeam) || 
              (player.team === opponentTeam && player.opponent === hitterTeam)) {
            return { ...player, [field]: value };
          }
          return player;
        })
      }));
      
      console.log(`Updated Game O/U to ${value} for all players in the ${hitterTeam} vs ${opponentTeam} game.`);
    } 
    // For Expected SO, update only hitters with the same pitcher and same team
    else if (field === 'expectedSO' && currentHitter.pitcherId) {
      const hitterTeam = currentHitter.team;
      const currentPitcherId = currentHitter.pitcherId;
      
      setSelectedPlayers(prev => ({
        ...prev,
        hitters: prev.hitters.map(player => {
          // Apply to players on same team with the same pitcher assignment
          if (player.id !== playerId && 
              player.team === hitterTeam && 
              player.pitcherId === currentPitcherId) {
            return { ...player, [field]: value };
          }
          // Always update the current player
          else if (player.id === playerId) {
            return { ...player, [field]: value };
          }
          return player;
        })
      }));
      
      console.log(`Updated Expected SO to ${value} for all ${hitterTeam} hitters facing the same pitcher.`);
    } 
    // For stadium field, update all players from the same team
    else if (field === 'stadium') {
      const hitterTeam = currentHitter.team;
      
      setSelectedPlayers(prev => ({
        ...prev,
        hitters: prev.hitters.map(player => {
          if (player.team === hitterTeam) {
            return { ...player, [field]: value };
          }
          return player;
        }),
        pitchers: prev.pitchers.map(player => {
          if (player.team === hitterTeam) {
            return { ...player, [field]: value };
          }
          return player;
        })
      }));
      
      console.log(`Updated Stadium to ${value} for all ${hitterTeam} players.`);
    }
    // For all other fields, just update the individual player
    else {
      setSelectedPlayers(prev => ({
        ...prev,
        hitters: prev.hitters.map(player => {
          if (player.id !== playerId) return player;
          return { ...player, [field]: value };
        })
      }));
    }
  };

  const handlePitcherFieldChange = (playerId, field, value) => {
    // Get the current pitcher
    const currentPitcher = selectedPlayers.pitchers.find(p => p.id === playerId);
    if (!currentPitcher) {
      // If pitcher not found, just update normally
      setSelectedPlayers(prev => ({
        ...prev,
        pitchers: prev.pitchers.map(player => {
          if (player.id !== playerId) return player;
          return { ...player, [field]: value };
        })
      }));
      return;
    }
    
    // For Game O/U, update all players in the same game
    if (field === 'gameOU') {
      const pitcherTeam = currentPitcher.team;
      const opponentTeam = currentPitcher.opponent;
      
      setSelectedPlayers(prev => ({
        ...prev,
        // Update pitchers in the same game
        pitchers: prev.pitchers.map(player => {
          if ((player.team === pitcherTeam && player.opponent === opponentTeam) || 
              (player.team === opponentTeam && player.opponent === pitcherTeam)) {
            return { ...player, [field]: value };
          }
          return player;
        }),
        // Also update hitters in the same game
        hitters: prev.hitters.map(player => {
          if ((player.team === pitcherTeam && player.opponentTeam === opponentTeam) || 
              (player.team === opponentTeam && player.opponentTeam === pitcherTeam)) {
            return { ...player, [field]: value };
          }
          return player;
        })
      }));
      
      console.log(`Updated Game O/U to ${value} for all players in the ${pitcherTeam} vs ${opponentTeam} game.`);
    }
    // For stadium field, update all players from the same team
    else if (field === 'stadium') {
      const pitcherTeam = currentPitcher.team;
      
      setSelectedPlayers(prev => ({
        ...prev,
        pitchers: prev.pitchers.map(player => {
          if (player.team === pitcherTeam) {
            return { ...player, [field]: value };
          }
          return player;
        }),
        hitters: prev.hitters.map(player => {
          if (player.team === pitcherTeam) {
            return { ...player, [field]: value };
          }
          return player;
        })
      }));
      
      console.log(`Updated Stadium to ${value} for all ${pitcherTeam} players.`);
    }
    // For all other fields, just update the individual pitcher
    else {
      setSelectedPlayers(prev => ({
        ...prev,
        pitchers: prev.pitchers.map(player => {
          if (player.id !== playerId) return player;
          return { ...player, [field]: value };
        })
      }));
    }
  };

  // Pitcher selection handler
  const handlePitcherSelect = (playerId, pitcherId) => {
    // First, find the current hitter to get their team
    const currentHitter = selectedPlayers.hitters.find(h => h.id === playerId);
    if (!currentHitter) return;
    
    const hitterTeam = currentHitter.team;
    const opponentTeam = currentHitter.opponentTeam;
    
    if (!pitcherId) {
      // If empty selection, just clear the pitcher fields for this specific hitter
      setSelectedPlayers(prev => ({
        ...prev,
        hitters: prev.hitters.map(player => {
          if (player.id !== playerId) return player;
          return { 
            ...player, 
            pitcher: '', 
            pitcherId: '',
            pitcherHand: ''
          };
        })
      }));
      return;
    }
  
    // Find the selected pitcher from the roster
    const selectedPitcherId = pitcherId;
    const [pitcherName, pitcherTeam] = selectedPitcherId.split('-');
    
    // Find pitcher details from the full roster
    const pitcherData = fullPitcherRoster.find(p => 
      p.name === pitcherName && p.team === pitcherTeam
    );
    
    // Update all hitters from the same team with the same pitcher details
    setSelectedPlayers(prev => ({
      ...prev,
      hitters: prev.hitters.map(player => {
        // Update this player and all other players from the same team facing same opponent
        if (player.id === playerId || (player.team === hitterTeam && player.opponentTeam === opponentTeam)) {
          return { 
            ...player, 
            pitcher: pitcherName,
            pitcherId: selectedPitcherId,
            pitcherHand: pitcherData?.throwingArm || '' 
          };
        }
        return player;
      })
    }));
    
    console.log(`Updated pitcher to ${pitcherName} for all ${hitterTeam} hitters facing ${opponentTeam}.`);
  };

  // Bet type handlers
  const handleHitterBetTypeChange = (playerId, betType, checked) => {
    setSelectedPlayers(prev => ({
      ...prev,
      hitters: prev.hitters.map(player => {
        if (player.id !== playerId) return player;
        return { ...player, betTypes: { ...player.betTypes, [betType]: checked } };
      })
    }));
  };

  const handlePitcherBetTypeChange = (playerId, betType, checked) => {
    setSelectedPlayers(prev => ({
      ...prev,
      pitchers: prev.pitchers.map(player => {
        if (player.id !== playerId) return player;
        return { ...player, betTypes: { ...player.betTypes, [betType]: checked } };
      })
    }));
  };

  // Handicapper pick handlers
  const handleHitterPickChange = (playerId, handicapperId, pickType, checked) => {
    setSelectedPlayers(prev => ({
      ...prev,
      hitters: prev.hitters.map(player => {
        if (player.id !== playerId) return player;
        return {
          ...player,
          handicapperPicks: {
            ...player.handicapperPicks,
            [handicapperId]: {
              ...(player.handicapperPicks[handicapperId] || {}),
              [pickType]: checked
            }
          }
        };
      })
    }));
  };

  const handlePitcherPickChange = (playerId, handicapperId, pickType, checked) => {
    setSelectedPlayers(prev => ({
      ...prev,
      pitchers: prev.pitchers.map(player => {
        if (player.id !== playerId) return player;
        return {
          ...player,
          handicapperPicks: {
            ...player.handicapperPicks,
            [handicapperId]: {
              ...(player.handicapperPicks[handicapperId] || {}),
              [pickType]: checked
            }
          }
        };
      })
    }));
  };

  // Update state with new handicapper
  const updatePlayersWithNewHandicapper = (handicapperId) => {
    setSelectedPlayers(prev => ({
      hitters: prev.hitters.map(player => ({
        ...player,
        handicapperPicks: {
          ...player.handicapperPicks,
          [handicapperId]: { public: false, private: false, straight: false, H: false, HR: false, B: false }
        }
      })),
      pitchers: prev.pitchers.map(player => ({
        ...player,
        handicapperPicks: {
          ...player.handicapperPicks,
          [handicapperId]: { public: false, private: false, straight: false, K: false, OU: false }
        }
      }))
    }));
  };

  // Remove handicapper from players
  const removeHandicapperFromPlayers = (handicapperId) => {
    setSelectedPlayers(prev => ({
      hitters: prev.hitters.map(player => {
        const { [handicapperId]: removed, ...remainingPicks } = player.handicapperPicks;
        return { ...player, handicapperPicks: remainingPicks };
      }),
      pitchers: prev.pitchers.map(player => {
        const { [handicapperId]: removed, ...remainingPicks } = player.handicapperPicks;
        return { ...player, handicapperPicks: remainingPicks };
      })
    }));
  };

  return {
    selectedPlayers,
    setSelectedPlayers,
    availablePlayers, 
    setAvailablePlayers,
    fullPitcherRoster,
    setFullPitcherRoster,
    teams,
    playerDataSource,
    setPlayerDataSource,
    isLoadingPlayers,
    setIsLoadingPlayers, 
    hasProcessedData,
    setHasProcessedData,
    playerStatsHistory,
    setPlayerStatsHistory,
    extendedPitcherData,
    formattedDate,
    formattedPreviousDate,
    // Methods
    getPitcherOptionsForOpponent,
    hitterSelectOptions,
    pitcherSelectOptions,
    handleAddHitterById,
    handleAddPitcherById,
    handleRemovePlayer,
    handleHitterFieldChange,
    handlePitcherFieldChange,
    handlePitcherSelect,
    handleHitterBetTypeChange,
    handlePitcherBetTypeChange,
    handleHitterPickChange,
    handlePitcherPickChange,
    updatePlayersWithNewHandicapper,
    removeHandicapperFromPlayers,
    fetchPitcherById, 
    fetchHitterById, // Add this new function
    isRefreshingHitters,
    setIsRefreshingHitters,
    isRefreshingPitchers,
    setIsRefreshingPitchers,
    requestHistoryRefresh
  };
};

export default usePlayerData;