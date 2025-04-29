import { useState, useEffect, useMemo } from 'react';
import { 
  fetchTeamData, 
  fetchRosterData, 
  formatDateString,
  findMultiGamePlayerStats,
  formatDateForDisplay
} from '../../../services/dataService';

/**
 * Create player objects with game history
 * @param {Object} player - Player object
 * @param {Object} dateRangeData - Date range data
 * @param {Array} handicappers - Handicapper objects
 * @returns {Object} Player with game history
 */
/**
 * Create player objects with game history
 * @param {Object} player - Player object
 * @param {Object} dateRangeData - Date range data
 * @param {Array} handicappers - Handicapper objects
 * @returns {Object} Player with game history
 */
export const createPlayerWithGameHistory = (player, dateRangeData, handicappers = []) => {

  const handicappersArray = Array.isArray(handicappers) ? handicappers : [];

  // Get the last 3 games for this player
  const gameHistory = findMultiGamePlayerStats(
    dateRangeData, 
    player.name, 
    player.team,
    3 // Get 3 games
  );
  
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
 * Custom hook to manage player data
 * @param {Array} playerData - Current day player data from parent component
 * @param {Array} gameData - Current day game data from parent component
 * @param {Date} currentDate - Current selected date
 * @returns {Object} Player data and related utilities
 */
const usePlayerData = (playerData, gameData, currentDate) => {
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

  // Reset processing flag when date changes
  useEffect(() => {
    setHasProcessedData(false);
  }, [currentDate]);

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
      console.error("[CapSheet] Could not find hitter with ID:", playerId);
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
      console.error("[CapSheet] Could not find pitcher with ID:", playerId);
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
    formattedDate,
    formattedPreviousDate,
    // Methods
    createPlayerWithGameHistory,
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