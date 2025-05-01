import { useState, useEffect, useMemo } from 'react';
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
 * Enhanced with configurable game history retrieval
 * 
 * @param {Array} playerData - Current day player data from parent component
 * @param {Array} gameData - Current day game data from parent component
 * @param {Date} currentDate - Current selected date
 * @param {number} gamesHistory - Number of games to retrieve in history (default: 3)
 * @returns {Object} Player data and related utilities
 */
const usePlayerData = (playerData, gameData, currentDate, gamesHistory = 3) => {
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

  // Load team data for styling
  useEffect(() => {
    const loadTeamData = async () => {
      const teamData = await fetchTeamData();
      setTeams(teamData);
    };

    loadTeamData();
  }, []);

  // Reset processing flag when date changes or gamesHistory changes
  useEffect(() => {
    setHasProcessedData(false);
  }, [currentDate, gamesHistory]);

  // Load players from roster and enhance with historical data
  useEffect(() => {
    const loadPlayerData = async () => {
      if (hasProcessedData) return;
      
      setIsLoadingPlayers(true);
      console.log(`[usePlayerData] Loading players from roster with ${gamesHistory} games history`);
      
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
        
        // 3. Fetch player data for the past 14 days (for hitters)
        // Calculate needed window for data retrieval (14 days + gamesHistory to ensure enough data)
        const daysToFetch = Math.max(14, gamesHistory * 5); // Estimate 1 game every 5 days for pitchers
        console.log(`[usePlayerData] Fetching player data for ${daysToFetch} days range`);
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, daysToFetch);
        const datesWithData = Object.keys(dateRangeData);
        console.log(`[usePlayerData] Found data for ${datesWithData.length} days`);
        
        // 4. Keep track of player game history
        const newPlayerStatsHistory = {};
        
        // 5. Create hitter objects with game history (using configurable gamesHistory)
        const hittersPromises = hitters.map(async player => {
          // Get the game history with specified number of games
          const gameHistory = findMultiGamePlayerStats(
            dateRangeData, 
            player.name, 
            player.team,
            gamesHistory
          );
          
          // Store the player's game history
          newPlayerStatsHistory[`${player.name}-${player.team}`] = gameHistory;
          
          // Use the imported function to create player with history
          return await createPlayerWithGameHistory(player, dateRangeData, [], false, gamesHistory);
        });
        
        const hittersData = await Promise.all(hittersPromises);
        
        // 6. Create pitcher objects with extended game history search (up to 30 days back)
        console.log(`[usePlayerData] Fetching extended pitcher data (up to ${daysToFetch + 30} days back)`);
        
        // Create a separate extended data window for pitchers (last 30 days + current range)
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
          // Get the game history with extended window and specified number of games
          const gameHistory = findMultiGamePlayerStats(
            pitcherDateRangeData, 
            player.name, 
            player.team,
            gamesHistory
          );
          
          // Store the player's game history
          newPlayerStatsHistory[`${player.name}-${player.team}`] = gameHistory;
          
          // Use the imported function with extended search for pitchers and configurable games count
          return await createPlayerWithGameHistory(player, pitcherDateRangeData, [], true, gamesHistory);
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
    gamesHistory,  
    hasProcessedData,
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
  const handleAddHitterById = (playerId) => {
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

    const newPlayer = {
      ...selectedPlayer,
      stadium,
      opponentTeam
    };

    setSelectedPlayers(prev => ({
      ...prev,
      hitters: [...prev.hitters, newPlayer]
    }));
  };

  const handleAddPitcherById = (playerId) => {
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

    const newPlayer = {
      ...selectedPlayer,
      stadium,
      opponent
    };

    setSelectedPlayers(prev => ({
      ...prev,
      pitchers: [...prev.pitchers, newPlayer]
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
    removeHandicapperFromPlayers
  };
};

export default usePlayerData;