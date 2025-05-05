import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [playerStatsHistory, setPlayerStatsHistory] = useState({});
  const [extendedPitcherData, setExtendedPitcherData] = useState({});
  const [isRefreshingHitters, setIsRefreshingHitters] = useState(false);
  const [isRefreshingPitchers, setIsRefreshingPitchers] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState({ 
    type: null, 
    gamesCount: 0,
    timestamp: 0 
  });
  const [currentHitterGamesHistory, setCurrentHitterGamesHistory] = useState(hitterGamesHistory);
const [currentPitcherGamesHistory, setCurrentPitcherGamesHistory] = useState(pitcherGamesHistory);


const fetchPlayerGameHistory = useCallback(async (player, historyCount) => {
  if (!player || !player.name || !player.team) return null;
  
  const isHitter = player.playerType === 'hitter';
  const isPitcher = player.playerType === 'pitcher';
  
  // Skip if player type is unknown
  if (!isHitter && !isPitcher) return player;
  
  // Determine which date range data to use
  const dateData = isPitcher ? extendedPitcherData : playerStatsHistory;
  
  // If we don't have date data yet, just return the original player
  if (Object.keys(dateData).length === 0) return player;
  
  try {
    // Find game history for this player
    const games = findMultiGamePlayerStats(
      dateData,
      player.name,
      player.team,
      historyCount
    );
    
    // Make a copy of the player to update
    const updatedPlayer = { ...player };
    
    // Clear existing game data
    for (let i = 1; i <= 7; i++) {
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
    
    // Add new game data
    for (let i = 0; i < historyCount && i < games.length; i++) {
      const gameNum = i + 1;
      const gameData = games[i]?.data || {};
      const gameDate = games[i]?.date || '';
      
      if (isHitter) {
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
    
    return updatedPlayer;
  } catch (error) {
    console.error(`Error fetching game history for ${player.name}:`, error);
    return player;
  }
}, [playerStatsHistory, extendedPitcherData]);


const updatePlayerWithGameHistory = useCallback(async (player, historyCount) => {
  return await fetchPlayerGameHistory(player, historyCount);
}, [fetchPlayerGameHistory]);

const updateAllPlayersGameHistory = useCallback(async (playerType, newHistoryCount) => {
  if (playerType !== 'hitter' && playerType !== 'pitcher') return;
  
  const isHitter = playerType === 'hitter';
  const players = isHitter ? selectedPlayers.hitters : selectedPlayers.pitchers;
  
  if (players.length === 0) return;
  
  // Set the appropriate loading state
  if (isHitter) {
    setIsRefreshingHitters(true);
  } else {
    setIsRefreshingPitchers(true);
  }
  
  try {
    // Update all players in parallel
    const updatedPlayers = await Promise.all(
      players.map(player => fetchPlayerGameHistory(player, newHistoryCount))
    );
    
    // Update state
    setSelectedPlayers(prev => ({
      ...prev,
      [isHitter ? 'hitters' : 'pitchers']: updatedPlayers
    }));
    
    // Update the current games history setting
    if (isHitter) {
      setCurrentHitterGamesHistory(newHistoryCount);
    } else {
      setCurrentPitcherGamesHistory(newHistoryCount);
    }
  } catch (error) {
    console.error(`Error updating ${playerType} game history:`, error);
  } finally {
    // Reset loading state
    if (isHitter) {
      setIsRefreshingHitters(false);
    } else {
      setIsRefreshingPitchers(false);
    }
  }
}, [selectedPlayers, fetchPlayerGameHistory, setIsRefreshingHitters, setIsRefreshingPitchers]);

  // Add this function to the hook
  const requestHistoryRefresh = useCallback((playerType, historyCount) => {
    return updateAllPlayersGameHistory(playerType, historyCount);
  }, [updateAllPlayersGameHistory]);

  useEffect(() => {
    if (currentHitterGamesHistory !== hitterGamesHistory && selectedPlayers.hitters.length > 0) {
      updateAllPlayersGameHistory('hitter', hitterGamesHistory);
    }
  }, [hitterGamesHistory, currentHitterGamesHistory, selectedPlayers.hitters.length, updateAllPlayersGameHistory]);
  
  useEffect(() => {
    if (currentPitcherGamesHistory !== pitcherGamesHistory && selectedPlayers.pitchers.length > 0) {
      updateAllPlayersGameHistory('pitcher', pitcherGamesHistory);
    }
  }, [pitcherGamesHistory, currentPitcherGamesHistory, selectedPlayers.pitchers.length, updateAllPlayersGameHistory]);

  // Add this useEffect to handle refreshing player history
  useEffect(() => {
    const refreshPlayerHistory = async () => {
      if (!refreshTrigger.type || !refreshTrigger.gamesCount) return;
      
      const playerType = refreshTrigger.type;
      const gamesCount = refreshTrigger.gamesCount;
      
      console.log(`[usePlayerData] Processing refresh for ${playerType}s with ${gamesCount} games`);
      
      if (playerType === 'hitter') {
        // Don't proceed if we're not refreshing hitters or we have no hitters to refresh
        if (!isRefreshingHitters || selectedPlayers.hitters.length === 0) return;
        
        try {
          console.log(`[usePlayerData] Refreshing ${selectedPlayers.hitters.length} hitters with ${gamesCount} games history`);
          
          // Get current date range data or fetch it if needed
          let currentDateRangeData = playerStatsHistory;
          if (Object.keys(currentDateRangeData).length === 0) {
            console.log('[usePlayerData] Fetching date range data for hitters refresh');
            currentDateRangeData = await fetchPlayerDataForDateRange(currentDate, 30, 180);
            setPlayerStatsHistory(currentDateRangeData);
          }
          
          // Create updated copies of players with new game history
          const updatedHitters = await Promise.all(
            selectedPlayers.hitters.map(async (hitter) => {
              try {
                // Find player's game history data with the new games count
                const games = findMultiGamePlayerStats(
                  currentDateRangeData,
                  hitter.name,
                  hitter.team,
                  gamesCount // Use the new games count
                );
                
                // Get the game dates for display
                const gameDates = games.map(game => game.date || '');
                
                // Create a fresh copy of the player
                const updatedHitter = { ...hitter };
                
                // Clear existing game data fields (important!)
                for (let i = 1; i <= Math.max(7, gamesCount); i++) {
                  delete updatedHitter[`game${i}Date`];
                  delete updatedHitter[`game${i}HR`];
                  delete updatedHitter[`game${i}AB`];
                  delete updatedHitter[`game${i}H`];
                }
                
                // Update game history data based on new games count
                for (let i = 0; i < gamesCount; i++) {
                  const gameNum = i + 1;
                  const gameData = i < games.length ? games[i]?.data || {} : {};
                  
                  updatedHitter[`game${gameNum}Date`] = i < games.length ? gameDates[i] || '' : '';
                  updatedHitter[`game${gameNum}HR`] = gameData.HR || '0';
                  updatedHitter[`game${gameNum}AB`] = gameData.AB || '0';
                  updatedHitter[`game${gameNum}H`] = gameData.H || '0';
                }
                
                return updatedHitter;
              } catch (error) {
                console.error(`[usePlayerData] Error refreshing hitter ${hitter.name}:`, error);
                return hitter; // Return original on error
              }
            })
          );
          
          // Update state with refreshed players
          setSelectedPlayers(prev => ({
            ...prev,
            hitters: updatedHitters
          }));
          
          console.log(`[usePlayerData] Successfully refreshed ${updatedHitters.length} hitters with ${gamesCount} games history`);
        } catch (error) {
          console.error('[usePlayerData] Error refreshing hitters:', error);
        } finally {
          setIsRefreshingHitters(false);
        }
      }
      
      if (playerType === 'pitcher') {
        // Don't proceed if we're not refreshing pitchers or we have no pitchers to refresh
        if (!isRefreshingPitchers || selectedPlayers.pitchers.length === 0) return;
        
        try {
          console.log(`[usePlayerData] Refreshing ${selectedPlayers.pitchers.length} pitchers with ${gamesCount} games history`);
          
          // Get current date range data or fetch it if needed
          let currentDateRangeData = extendedPitcherData;
          if (Object.keys(currentDateRangeData).length === 0) {
            console.log('[usePlayerData] Fetching date range data for pitchers refresh');
            currentDateRangeData = await fetchPlayerDataForDateRange(currentDate, 30, 180);
            setExtendedPitcherData(currentDateRangeData);
          }
          
          // Create updated copies of players with new game history
          const updatedPitchers = await Promise.all(
            selectedPlayers.pitchers.map(async (pitcher) => {
              try {
                // Find player's game history data with the new games count
                const games = findMultiGamePlayerStats(
                  currentDateRangeData,
                  pitcher.name,
                  pitcher.team,
                  gamesCount // Use the new games count
                );
                
                // Get the game dates for display
                const gameDates = games.map(game => game.date || '');
                
                // Create a fresh copy of the player
                const updatedPitcher = { ...pitcher };
                
                // Clear existing game data fields (important!)
                for (let i = 1; i <= Math.max(7, gamesCount); i++) {
                  delete updatedPitcher[`game${i}Date`];
                  delete updatedPitcher[`game${i}IP`];
                  delete updatedPitcher[`game${i}K`];
                  delete updatedPitcher[`game${i}ER`];
                  delete updatedPitcher[`game${i}H`];
                  delete updatedPitcher[`game${i}R`];
                  delete updatedPitcher[`game${i}BB`];
                  delete updatedPitcher[`game${i}HR`];
                  delete updatedPitcher[`game${i}PC_ST`];
                }
                
                // Update game history data based on new games count
                for (let i = 0; i < gamesCount; i++) {
                  const gameNum = i + 1;
                  const gameData = i < games.length ? games[i]?.data || {} : {};
                  
                  updatedPitcher[`game${gameNum}Date`] = i < games.length ? gameDates[i] || '' : '';
                  updatedPitcher[`game${gameNum}IP`] = gameData.IP || '0';
                  updatedPitcher[`game${gameNum}K`] = gameData.K || '0';
                  updatedPitcher[`game${gameNum}ER`] = gameData.ER || '0';
                  updatedPitcher[`game${gameNum}H`] = gameData.H || '0';
                  updatedPitcher[`game${gameNum}R`] = gameData.R || '0';
                  updatedPitcher[`game${gameNum}BB`] = gameData.BB || '0';
                  updatedPitcher[`game${gameNum}HR`] = gameData.HR || '0';
                  updatedPitcher[`game${gameNum}PC_ST`] = gameData.PC_ST || 'N/A';
                }
                
                return updatedPitcher;
              } catch (error) {
                console.error(`[usePlayerData] Error refreshing pitcher ${pitcher.name}:`, error);
                return pitcher; // Return original on error
              }
            })
          );
          
          // Update state with refreshed players
          setSelectedPlayers(prev => ({
            ...prev,
            pitchers: updatedPitchers
          }));
          
          console.log(`[usePlayerData] Successfully refreshed ${updatedPitchers.length} pitchers with ${gamesCount} games history`);
        } catch (error) {
          console.error('[usePlayerData] Error refreshing pitchers:', error);
        } finally {
          setIsRefreshingPitchers(false);
        }
      }
    };
    
    refreshPlayerHistory();
  }, [
    refreshTrigger,
    isRefreshingHitters,
    isRefreshingPitchers,
    selectedPlayers.hitters,
    selectedPlayers.pitchers,
    playerStatsHistory,
    extendedPitcherData,
    currentDate,
    setSelectedPlayers,
    setIsRefreshingHitters,
    setIsRefreshingPitchers,
    setPlayerStatsHistory,
    setExtendedPitcherData,
    findMultiGamePlayerStats,
    fetchPlayerDataForDateRange
  ]);

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

  // Enhanced fetchPitcherById function for usePlayerData.js hook
// Enhanced fetchPitcherById function for usePlayerData.js hook
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
        pitcherGamesHistory
      );
      
      console.log(`Found ${gameHistory.length} games for pitcher`);
      
      // Add game history to pitcher object
      for (let i = 0; i < gameHistory.length; i++) {
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
        
        // 3. Fetch player data for the past 14 days (base window for both player types)
        console.log("[usePlayerData] Fetching player data for date range");
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 14);
        const datesWithData = Object.keys(dateRangeData);
        console.log(`[usePlayerData] Found data for ${datesWithData.length} days`);
        
        // 4. Keep track of player game history
        const newPlayerStatsHistory = {};
        
        // 5. Create hitter objects with game history (using hitterGamesHistory)
        const hittersPromises = hitters.map(async player => {
          // Get the game history with hitter-specific history count
          const gameHistory = findMultiGamePlayerStats(
            dateRangeData, 
            player.name, 
            player.team,
            hitterGamesHistory // Use hitter-specific games history
          );
          
          // Store the player's game history
          newPlayerStatsHistory[`${player.name}-${player.team}`] = gameHistory;
          
          // Use the imported function with hitter-specific history
          return await createPlayerWithGameHistory(
            player, 
            dateRangeData, 
            [], 
            false, 
            hitterGamesHistory // Pass hitter games history
          );
        });
        
        const hittersData = await Promise.all(hittersPromises);
        
        // 6. Create pitcher objects with extended game history search (up to 30 days back)
        console.log("[usePlayerData] Fetching extended pitcher data (up to 30 days back)");
        
        // Create a separate extended data window for pitchers (last 30 days)
        const pitcherDateRangeData = { ...dateRangeData };
        
        // Only fetch extended data if we have games in initial window
        if (datesWithData.length > 0) {
          // Get earliest date in current window
          const earliestDate = new Date(datesWithData.sort()[0]);
          
          // Create start date for extended window (30 more days back)
          const extendedStartDate = new Date(earliestDate);
          extendedStartDate.setDate(extendedStartDate.getDate() - 30);
          
          // Fetch extended data
          console.log(`[usePlayerData] Fetching additional pitcher data from ${extendedStartDate.toISOString()}`);
          const extendedData = await fetchPlayerDataForDateRange(extendedStartDate, 30);
          
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
          // Get the game history with extended window and pitcher-specific history count
          const gameHistory = findMultiGamePlayerStats(
            pitcherDateRangeData, 
            player.name, 
            player.team,
            pitcherGamesHistory // Use pitcher-specific games history
          );
          
          // Store the player's game history
          newPlayerStatsHistory[`${player.name}-${player.team}`] = gameHistory;
          
          // Use the imported function with pitcher-specific history
          return await createPlayerWithGameHistory(
            player, 
            pitcherDateRangeData, 
            [], 
            true,
            pitcherGamesHistory // Pass pitcher games history
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
    hitterGamesHistory, // Add dependency on hitter games history
    pitcherGamesHistory, // Add dependency on pitcher games history
    setAvailablePlayers,
    setFullPitcherRoster,
    setHasProcessedData,
    setIsLoadingPlayers,
    setPlayerDataSource,
    setPlayerStatsHistory
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

      // Update with current games history
  const playerWithHistory = await updatePlayerWithGameHistory(basePlayer, currentHitterGamesHistory);

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

  // Update with current games history
  const playerWithHistory = await updatePlayerWithGameHistory(basePlayer, currentPitcherGamesHistory);

  setSelectedPlayers(prev => ({
    ...prev,
    pitchers: [...prev.pitchers, playerWithHistory]
  }));
};






useEffect(() => {
  if (currentHitterGamesHistory !== hitterGamesHistory && selectedPlayers.hitters.length > 0) {
    updateAllPlayersGameHistory('hitter', hitterGamesHistory);
  }
}, [hitterGamesHistory, currentHitterGamesHistory, selectedPlayers.hitters.length, updateAllPlayersGameHistory]);

useEffect(() => {
  if (currentPitcherGamesHistory !== pitcherGamesHistory && selectedPlayers.pitchers.length > 0) {
    updateAllPlayersGameHistory('pitcher', pitcherGamesHistory);
  }
}, [pitcherGamesHistory, currentPitcherGamesHistory, selectedPlayers.pitchers.length, updateAllPlayersGameHistory]);

  const handleRemovePlayer = (playerId, playerType) => {
    setSelectedPlayers(prev => ({
        ...prev,
        [playerType === 'hitter' ? 'hitters' : 'pitchers']: 
          prev[playerType === 'hitter' ? 'hitters' : 'pitchers'].filter(p => p.id !== playerId)
    }));
  };

  // Field change handlers
  const handleHitterFieldChange = (playerId, field, value) => {
    setSelectedPlayers(prev => ({
      ...prev,
      hitters: prev.hitters.map(player => {
        if (player.id !== playerId) return player;
        return { ...player, [field]: value };
      })
    }));
  };

  const handlePitcherFieldChange = (playerId, field, value) => {
    setSelectedPlayers(prev => ({
      ...prev,
      pitchers: prev.pitchers.map(player => {
        if (player.id !== playerId) return player;
        return { ...player, [field]: value };
      })
    }));
  };

  // Pitcher selection handler
  const handlePitcherSelect = (playerId, pitcherId) => {
    if (!pitcherId) {
      // If empty selection, just clear the pitcher fields
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
    
    // Update the hitter with pitcher details
    setSelectedPlayers(prev => ({
      ...prev,
      hitters: prev.hitters.map(player => {
        if (player.id !== playerId) return player;
        return { 
          ...player, 
          pitcher: pitcherName,
          pitcherId: selectedPitcherId,
          pitcherHand: pitcherData?.throwingArm || '' 
        };
      })
    }));
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
    historicalDate,
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
    isRefreshingHitters,
    setIsRefreshingHitters,
    isRefreshingPitchers,
    setIsRefreshingPitchers,
    requestHistoryRefresh
  };
};

export default usePlayerData;