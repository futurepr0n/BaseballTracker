import React, { useState, useEffect, useRef, useMemo } from 'react';
import Select from 'react-select'; // Import react-select
import { 
  fetchTeamData, 
  fetchPlayerData, 
  fetchRosterData, 
  formatDateString, 
  fetchPlayerDataForDateRange, 
  findMostRecentPlayerStats,
  findMultiGamePlayerStats,
  formatDateForDisplay
} from '../services/dataService';
import './CapSheet.css';

/**
 * Enhanced CapSheet component - Allows users to track and analyze player betting opportunities
 * Now with multi-game history display and smart pitcher selection
 */
function CapSheet({ playerData, gameData, currentDate }) {
  // State for the component
  const [selectedPlayers, setSelectedPlayers] = useState({
    hitters: [],
    pitchers: []
  });
  const [availablePlayers, setAvailablePlayers] = useState({
    hitters: [],
    pitchers: []
  });
  // New state for the full roster of pitchers for selection
  const [fullPitcherRoster, setFullPitcherRoster] = useState([]);
  const [teams, setTeams] = useState({});
  const [playerDataSource, setPlayerDataSource] = useState('current'); // 'current' or 'historical'
  const [historicalDate, setHistoricalDate] = useState(null);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [hasProcessedData, setHasProcessedData] = useState(false);
  const [playerStatsHistory, setPlayerStatsHistory] = useState({}); // Store 3-game history per player

  // State for handicappers with predefined list
  const [handicappers, setHandicappers] = useState([
    { id: 'BlitzerAI', name: '@BlitzerAI' },
    { id: 'RollinDicexxx', name: '@RollinDicexxx' },
    { id: 'ArnoldsAiModels', name: '@ArnoldsAiModels' },
    { id: 'Capper_Kale', name: '@Capper_Kale' },
    { id: 'SaksLikely', name: '@SaksLikely' },
    { id: 'LottoLocks', name: '@LottoLocks' },
    { id: 'PropsByDom', name: '@PropsByDom' },
    { id: 'RioStaysTrue', name: '@RioStaysTrue' },
    { id: 'DoctorProfit', name: '@DoctorProfit' },
    { id: 'BlazinHotBets', name: '@BlazinHotBets' },
    { id: 'ChillyBets', name: '@ChillyBets' },
    { id: 'SGP_Vick', name: '@SGP_Vick' },
    { id: 'BulletBet', name: '@BulletBet' },
    { id: 'DanyMcLain', name: '@DanyMcLain' },
    { id: 'CallingOurShot', name: '@CallingOurShot' },
    { id: 'ProfitBets', name: '@ProfitBets' },
    { id: 'LucrativeJames', name: '@LucrativeJames' },
    { id: 'BookWithTrent', name: '@BookWithTrent' },
    { id: 'MikeyOver1', name: '@MikeyOver1' },
    { id: 'MattyBetss', name: '@MattyBetss' },
    { id: 'Justtwinbaby', name: '@Justtwinbaby' },
    { id: 'blezbets', name: '@blezbets' },
    { id: 'Parlay_Express', name: '@Parlay_Express' },
    { id: 'ParlayScience', name: '@ParlayScience' },
    { id: 'TheParlayPlug', name: '@TheParlayPlug' },
    { id: '_invisible_man0', name: '@_invisible_man0' },
    { id: 'SmartMoneyBets', name: '@SmartMoneyBets' }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newHandicapperName, setNewHandicapperName] = useState('');
  const [handicapperSearch, setHandicapperSearch] = useState('');
  const [filteredHandicappers, setFilteredHandicappers] = useState([]);
  const [calculations, setCalculations] = useState({
    totalPicks: 0,
    publicPicks: 0,
    privatePicks: 0
  });

  // State for saving and loading slips
  const [savedSlips, setSavedSlips] = useState([]);
  const [showSlipGallery, setShowSlipGallery] = useState(false);
  const [slipName, setSlipName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Refs for export
  const fileInputRef = useRef(null);

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

  // UPDATED: Load players from roster and enhance with historical data
  useEffect(() => {
    const loadPlayersFromRoster = async () => {
      setIsLoadingPlayers(true);
      console.log("[CapSheet] Loading players from roster");
      
      try {
        // 1. Load the roster data
        const rosterData = await fetchRosterData();
        if (!rosterData || rosterData.length === 0) {
          console.error("[CapSheet] Failed to load roster data");
          setIsLoadingPlayers(false);
          return;
        }
        console.log(`[CapSheet] Loaded ${rosterData.length} players from roster`);
        
        // 2. Split into hitters and pitchers
        const hitters = rosterData.filter(player => 
          player && player.name && player.team && player.type === 'hitter'
        );
        
        const pitchers = rosterData.filter(player => 
          player && player.name && player.team && player.type === 'pitcher'
        );
        
        // Store the full pitcher roster for later use in dropdowns
        setFullPitcherRoster(pitchers);
        
        console.log(`[CapSheet] Roster contains ${hitters.length} hitters and ${pitchers.length} pitchers`);
        
        // 3. Fetch player data for the past 14 days (to ensure we can find 3 games for most players)
        console.log("[CapSheet] Fetching player data for date range");
        const dateRangeData = await fetchPlayerDataForDateRange(currentDate, 14);
        const datesWithData = Object.keys(dateRangeData);
        console.log(`[CapSheet] Found data for ${datesWithData.length} days: ${datesWithData.join(', ')}`);
        
        // 4. Keep track of player game history
        const newPlayerStatsHistory = {};
        
        // 5. Create player objects with game history
        const createPlayerWithGameHistory = (player) => {
          // Get the last 3 games for this player
          const gameHistory = findMultiGamePlayerStats(
            dateRangeData, 
            player.name, 
            player.team,
            3 // Get 3 games
          );
          
          // Store the player's game history
          newPlayerStatsHistory[`${player.name}-${player.team}`] = gameHistory;
          
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
              pitcherId: '', // NEW: Store pitcher ID for selection
              opponentTeam: '', // NEW: Store opponent team
              pitcherHand: '',
              expectedSO: '',
              stadium: '',
              gameOU: '',
              betTypes: { H: false, HR: false, B: false },
              handicapperPicks: handicappers.reduce((acc, handicapper) => {
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
              throwingArm: player.throwingArm || '', // NEW: Store pitcher's throwing arm
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
              handicapperPicks: handicappers.reduce((acc, handicapper) => {
                acc[handicapper.id] = {
                  public: false, private: false, straight: false,
                  K: false, OU: false
                };
                return acc;
              }, {})
            };
          }
        };
        
        const hittersData = hitters.map(player => createPlayerWithGameHistory(player));
        const pitchersData = pitchers.map(player => createPlayerWithGameHistory(player));
        
        // 6. Update the player stats history state
        setPlayerStatsHistory(newPlayerStatsHistory);
        console.log(`[CapSheet] Built game history for ${Object.keys(newPlayerStatsHistory).length} players`);
        
        // 7. Only show players from teams playing today if we have game data
        const teamsPlayingToday = new Set();
        if (gameData && gameData.length > 0) {
          gameData.forEach(game => {
            teamsPlayingToday.add(game.homeTeam);
            teamsPlayingToday.add(game.awayTeam);
          });
          
          console.log(`[CapSheet] Teams playing today: ${Array.from(teamsPlayingToday).join(', ')}`);
        }
        
        // Filter players to only include those from teams playing today
        const filteredHitters = teamsPlayingToday.size > 0 
          ? hittersData.filter(player => teamsPlayingToday.has(player.team))
          : hittersData;
        
        const filteredPitchers = teamsPlayingToday.size > 0
          ? pitchersData.filter(player => teamsPlayingToday.has(player.team))
          : pitchersData;
        
        console.log(`[CapSheet] Final available players: ${filteredHitters.length} hitters, ${filteredPitchers.length} pitchers`);
        
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
        console.error('[CapSheet] Error processing player data:', error);
      } finally {
        setIsLoadingPlayers(false);
      }
    };
    
    // Only load if we haven't processed data for this date already
    if (!hasProcessedData) {
      loadPlayersFromRoster();
    }
  }, [playerData, gameData, currentDate, handicappers, hasProcessedData]);

  // Filter handicappers based on search
  useEffect(() => {
    if (handicapperSearch) {
      const filtered = handicappers.filter(h =>
        h.name.toLowerCase().includes(handicapperSearch.toLowerCase())
      );
      setFilteredHandicappers(filtered);
    } else {
      setFilteredHandicappers(handicappers);
    }
  }, [handicappers, handicapperSearch]);

  // Prepare options for react-select
  const hitterSelectOptions = useMemo(() => {
    console.log("[CapSheet] Generating hitter select options. Count:", availablePlayers.hitters.length);
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
    console.log("[CapSheet] Generating pitcher select options. Count:", availablePlayers.pitchers.length);
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

  // Function to generate pitcher options for a specific opponent team
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

  // --- Modified Add Handlers ---
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
      opponentTeam // Store opponent team for pitcher filtering
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
    // For pitchers, the opponent is usually needed, not the team they play *against*
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

  // Remove a player from the list
  const handleRemovePlayer = (playerId, playerType) => {
    setSelectedPlayers(prev => ({
        ...prev,
        [playerType === 'hitter' ? 'hitters' : 'pitchers']: prev[playerType === 'hitter' ? 'hitters' : 'pitchers'].filter(p => p.id !== playerId)
    }));
  };

  // Handle pitcher selection for hitter
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

  // Handle adding a new handicapper
  const handleAddHandicapper = () => {
    if (!newHandicapperName.trim()) return;
    const nameWithoutAt = newHandicapperName.startsWith('@')
      ? newHandicapperName.substring(1)
      : newHandicapperName;
    const id = nameWithoutAt.toLowerCase().replace(/\s+/g, '');

    if (handicappers.some(h => h.id.toLowerCase() === id.toLowerCase())) {
      alert('A handicapper with a similar name already exists');
      return;
    }

    const newHandicapper = {
      id,
      name: newHandicapperName.startsWith('@') ? newHandicapperName : `@${newHandicapperName}`
    };

    const updatedHandicappers = [...handicappers, newHandicapper];
    setHandicappers(updatedHandicappers);

    // Update players to include new handicapper default picks
    setSelectedPlayers(prev => ({
      hitters: prev.hitters.map(player => ({
        ...player,
        handicapperPicks: {
          ...player.handicapperPicks,
          [id]: { public: false, private: false, straight: false, H: false, HR: false, B: false }
        }
      })),
      pitchers: prev.pitchers.map(player => ({
        ...player,
        handicapperPicks: {
          ...player.handicapperPicks,
          [id]: { public: false, private: false, straight: false, K: false, OU: false }
        }
      }))
    }));

    setNewHandicapperName('');
    setShowModal(false);
  };

  // Handle selecting an existing handicapper in modal
  const handleSelectHandicapper = (handicapper) => {
    setNewHandicapperName(handicapper.name);
    setHandicapperSearch(''); // Clear search after selection
    // Optionally close the quick select list or keep it open
  };

  // Handle removing a handicapper
  const handleRemoveHandicapper = (handicapperId) => {
    const confirmed = window.confirm('Are you sure you want to remove this handicapper? This action cannot be undone.');
    if (!confirmed) return;

    setHandicappers(prev => prev.filter(h => h.id !== handicapperId));

    // Update players to remove this handicapper's picks
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

   // --- Pick Change Handlers ---
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
                        ...(player.handicapperPicks[handicapperId] || {}), // Ensure object exists
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
                        ...(player.handicapperPicks[handicapperId] || {}), // Ensure object exists
                        [pickType]: checked
                    }
                }
            };
        })
    }));
  };

   // --- Bet Type Change Handlers ---
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

   // --- Editable Field Change Handlers ---
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

  // Calculate statistics based on selected players and picks
  useEffect(() => {
    let totalPicks = 0;
    let publicPicks = 0;
    let privatePicks = 0;

    const countPicks = (player) => {
        Object.values(player.handicapperPicks || {}).forEach(pick => {
            // Count each handicapper only once per player if they have *any* pick type checked
            // Or count based on public/private specifically? Let's count specific types:
             if (pick.public) publicPicks++;
             if (pick.private) privatePicks++;
             // Modify total calculation based on desired logic, e.g., unique player-handicapper pairs with picks
             // Simple sum for now:
             if(pick.public || pick.private || pick.straight) totalPicks++;
        });
    };

    selectedPlayers.hitters.forEach(countPicks);
    selectedPlayers.pitchers.forEach(countPicks);

    setCalculations({ totalPicks, publicPicks, privatePicks });
  }, [selectedPlayers]);


  // --- Slip Management (Save, Load, Delete) ---
  const generateSlipId = () => `slip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const saveSlip = () => {
    if (!slipName.trim()) {
      alert('Please enter a name for this slip');
      return;
    }
    const newSlip = {
      id: generateSlipId(),
      name: slipName,
      date: formattedDate,
      timestamp: Date.now(),
      data: selectedPlayers // Save current state
    };
    const updatedSlips = [...savedSlips, newSlip];
    setSavedSlips(updatedSlips);
    try {
      localStorage.setItem('capsheet_slips', JSON.stringify(updatedSlips));
      alert(`Slip "${slipName}" saved successfully!`);
      setSlipName('');
      setShowSaveModal(false);
    } catch (error) {
      console.error('Error saving slip:', error);
      alert('Failed to save slip. Local storage might be full or unavailable.');
    }
  };

  useEffect(() => { // Load slips on initial mount
    try {
      const storedSlips = localStorage.getItem('capsheet_slips');
      if (storedSlips) {
        setSavedSlips(JSON.parse(storedSlips));
      }
    } catch (error) {
      console.error('Error loading saved slips:', error);
      setSavedSlips([]); // Reset to empty array on error
    }
  }, []);

  const loadSlip = (slip) => {
    const confirmed = window.confirm(`Load slip "${slip.name}"? This will replace your current selections.`);
    if (!confirmed) return;

    // Basic validation of loaded data structure (optional but recommended)
    if (slip.data && slip.data.hitters && slip.data.pitchers) {
        setSelectedPlayers(slip.data);
        setShowSlipGallery(false);
        alert(`Slip "${slip.name}" loaded.`);
    } else {
        alert(`Error: Slip data for "${slip.name}" appears to be corrupted.`);
        console.error("Corrupted slip data:", slip);
    }
  };

  const deleteSlip = (slipId) => {
    const confirmed = window.confirm('Are you sure you want to delete this slip?');
    if (!confirmed) return;

    const updatedSlips = savedSlips.filter(slip => slip.id !== slipId);
    setSavedSlips(updatedSlips);
    try {
      localStorage.setItem('capsheet_slips', JSON.stringify(updatedSlips));
    } catch (error) {
      console.error('Error updating localStorage after deletion:', error);
    }
  };


  // --- Export/Import ---
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    // Hitters
    if (selectedPlayers.hitters.length > 0) {
        csvContent += "HITTERS\n";
        // Make sure header count matches data columns
        csvContent += "Player,Team,Last HR,Last AB,Last H,Game 1 Date,Game 1 HR,Game 1 AB,Game 1 H,Game 2 Date,Game 2 HR,Game 2 AB,Game 2 H,Game 3 Date,Game 3 HR,Game 3 AB,Game 3 H,Pitcher,Pitcher ID,Opponent Team,Throws,Exp SO,Stadium,Game O/U,Bet H,Bet HR,Bet B\n";
        selectedPlayers.hitters.forEach(p => {
            const row = [
                `"${p.name.replace(/"/g, '""')}"`, p.team, 
                p.prevGameHR, p.prevGameAB, p.prevGameH,
                p.game1Date, p.game1HR, p.game1AB, p.game1H,
                p.game2Date, p.game2HR, p.game2AB, p.game2H,
                p.game3Date, p.game3HR, p.game3AB, p.game3H,
                `"${(p.pitcher || '').replace(/"/g, '""')}"`, 
                p.pitcherId || '', // Include pitcher ID
                p.opponentTeam || '', // Include opponent team
                p.pitcherHand || '', p.expectedSO || '',
                `"${(p.stadium || '').replace(/"/g, '""')}"`, p.gameOU || '', 
                p.betTypes?.H ? "Yes" : "No", p.betTypes?.HR ? "Yes" : "No", p.betTypes?.B ? "Yes" : "No"
            ];
            csvContent += row.join(",") + "\n";
        });
        csvContent += "\n";
    }
    // Pitchers
     if (selectedPlayers.pitchers.length > 0) {
        csvContent += "PITCHERS\n";
         // Make sure header count matches data columns
        csvContent += "Player,Team,Last IP,Last K,Last ER,Game 1 Date,Game 1 IP,Game 1 K,Game 1 ER,Game 2 Date,Game 2 IP,Game 2 K,Game 2 ER,Game 3 Date,Game 3 IP,Game 3 K,Game 3 ER,Opponent,Pitch Count,Exp K,Stadium,Game O/U,Bet K,Bet O/U\n";
        selectedPlayers.pitchers.forEach(p => {
            const row = [
                `"${p.name.replace(/"/g, '""')}"`, p.team, 
                p.prevGameIP, p.prevGameK, p.prevGameER,
                p.game1Date, p.game1IP, p.game1K, p.game1ER,
                p.game2Date, p.game2IP, p.game2K, p.game2ER,
                p.game3Date, p.game3IP, p.game3K, p.game3ER,
                `"${(p.opponent || '').replace(/"/g, '""')}"`, p.expectedPitch || '', p.expectedK || '',
                `"${(p.stadium || '').replace(/"/g, '""')}"`, p.gameOU || '', 
                p.betTypes?.K ? "Yes" : "No", p.betTypes?.OU ? "Yes" : "No"
             ];
            csvContent += row.join(",") + "\n";
        });
        csvContent += "\n";
     }
    // Handicapper Picks
    if (handicappers.length > 0 && (selectedPlayers.hitters.length > 0 || selectedPlayers.pitchers.length > 0)) {
        csvContent += "HANDICAPPER PICKS\n";
        csvContent += "Handicapper ID,Handicapper Name,Player Name,Player Team,Player Type,Public,Private,Straight,Bet Type H,Bet Type HR,Bet Type B,Bet Type K,Bet Type OU\n"; // Expanded bet types

        const addPicksToCSV = (player, playerType) => {
            Object.entries(player.handicapperPicks || {}).forEach(([handicapperId, pick]) => {
                 // Only include rows where there is at least one pick
                 if (pick.public || pick.private || pick.straight || pick.H || pick.HR || pick.B || pick.K || pick.OU) {
                    const handicapper = handicappers.find(h => h.id === handicapperId);
                    const row = [
                        handicapperId,
                        `"${(handicapper ? handicapper.name : handicapperId).replace(/"/g, '""')}"`,
                        `"${player.name.replace(/"/g, '""')}"`,
                        player.team,
                        playerType,
                        pick.public ? "Yes" : "No",
                        pick.private ? "Yes" : "No",
                        pick.straight ? "Yes" : "No",
                        pick.H ? "Yes" : "No",
                        pick.HR ? "Yes" : "No",
                        pick.B ? "Yes" : "No",
                        pick.K ? "Yes" : "No",
                        pick.OU ? "Yes" : "No"
                    ];
                    csvContent += row.join(",") + "\n";
                }
            });
        };
        selectedPlayers.hitters.forEach(p => addPicksToCSV(p, 'Hitter'));
        selectedPlayers.pitchers.forEach(p => addPicksToCSV(p, 'Pitcher'));
    }

    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `capsheet_${formatDateForFilename(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateForFilename = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const lines = content.split('\n').map(l => l.trim()).filter(l => l); // Trim lines and remove empty ones

            let currentSection = '';
            const importedHitters = [];
            const importedPitchers = [];
            const importedPicks = {}; // Store picks temporarily: { 'playerName-playerTeam': { 'handicapperId': {...picks} } }

            let headerMap = {};

            lines.forEach((line, index) => {
                // Detect section headers
                if (line === 'HITTERS') { currentSection = 'hitters'; headerMap = {}; return; }
                if (line === 'PITCHERS') { currentSection = 'pitchers'; headerMap = {}; return; }
                if (line === 'HANDICAPPER PICKS') { currentSection = 'picks'; headerMap = {}; return; }

                // Skip empty lines just in case
                if (!line) return;

                // Process Header Row
                if (Object.keys(headerMap).length === 0 && index > 0) { // Check index > 0 to avoid processing section header as data header
                     const headers = line.split(',').map(h => h.trim());
                     headers.forEach((h, i) => { headerMap[h] = i; });
                     console.log(`[CapSheet Import] Detected ${currentSection} headers:`, headerMap);
                     return; // Skip processing the header row itself
                 }

                // Process data rows based on section
                const values = line.split(','); // Simple split, assumes no commas in quoted fields for now

                if (currentSection === 'hitters' && headerMap['Player'] !== undefined) {
                     // Use headerMap to get indices safely
                     const name = values[headerMap['Player']]?.replace(/^"|"$/g, '');
                     const team = values[headerMap['Team']];
                     if (!name || !team) return; // Skip row if essential data missing

                     // Create basic hitter object with standard fields
                     const hitter = {
                         id: `${name}-${team}`, name, team, playerType: 'hitter',
                         handicapperPicks: {} // Initialize, will be populated later
                     };
                     
                     // Map all possible fields from CSV
                     // Note: This approach handles both old and new CSV formats
                     const fieldMappings = {
                         'Last HR': 'prevGameHR',
                         'Last AB': 'prevGameAB', 
                         'Last H': 'prevGameH',
                         'Prev Game HR': 'prevGameHR', 
                         'Prev Game AB': 'prevGameAB', 
                         'Prev Game H': 'prevGameH',
                         'Game 1 Date': 'game1Date',
                         'Game 1 HR': 'game1HR',
                         'Game 1 AB': 'game1AB',
                         'Game 1 H': 'game1H',
                         'Game 2 Date': 'game2Date',
                         'Game 2 HR': 'game2HR',
                         'Game 2 AB': 'game2AB',
                         'Game 2 H': 'game2H',
                         'Game 3 Date': 'game3Date',
                         'Game 3 HR': 'game3HR',
                         'Game 3 AB': 'game3AB',
                         'Game 3 H': 'game3H',
                         'Avg HR (3G)': 'avgHR',
                         'Avg AB (3G)': 'avgAB',
                         'Avg H (3G)': 'avgH',
                         'Pitcher': 'pitcher',
                         'Pitcher ID': 'pitcherId',
                         'Opponent Team': 'opponentTeam',
                         'Throws': 'pitcherHand',
                         'Exp SO': 'expectedSO',
                         'Stadium': 'stadium',
                         'Game O/U': 'gameOU',
                         'Bet H': 'betH',
                         'Bet HR': 'betHR',
                         'Bet B': 'betB'
                     };
                     
                     // Add each field that exists in the CSV
                     Object.entries(fieldMappings).forEach(([csvField, objectField]) => {
                         if (headerMap[csvField] !== undefined) {
                             // Special handling for fields that need cleanup
                             if (csvField === 'Pitcher' || csvField === 'Stadium') {
                                 hitter[objectField] = values[headerMap[csvField]]?.replace(/^"|"$/g, '') || '';
                             } 
                             // Special handling for boolean fields
                             else if (csvField.startsWith('Bet ')) {
                                 if (!hitter.betTypes) hitter.betTypes = {};
                                 const betType = csvField.replace('Bet ', '');
                                 hitter.betTypes[betType] = values[headerMap[csvField]] === 'Yes';
                             }
                             // Normal field handling
                             else {
                                 hitter[objectField] = values[headerMap[csvField]] || '';
                             }
                         }
                     });
                     
                     // Ensure betTypes exists
                     if (!hitter.betTypes) {
                         hitter.betTypes = { H: false, HR: false, B: false };
                     }
                     
                     importedHitters.push(hitter);
                } else if (currentSection === 'pitchers' && headerMap['Player'] !== undefined) {
                    const name = values[headerMap['Player']]?.replace(/^"|"$/g, '');
                    const team = values[headerMap['Team']];
                    if (!name || !team) return;

                    // Create basic pitcher object
                    const pitcher = {
                         id: `${name}-${team}`, 
                         name, 
                         team, 
                         playerType: 'pitcher',
                         handicapperPicks: {} // Initialize
                    };
                    
                    // Map fields from CSV
                    const fieldMappings = {
                         'Last IP': 'prevGameIP',
                         'Last K': 'prevGameK', 
                         'Last ER': 'prevGameER',
                         'Prev Game IP': 'prevGameIP', 
                         'Prev Game K': 'prevGameK', 
                         'Prev Game ER': 'prevGameER',
                         'Game 1 Date': 'game1Date',
                         'Game 1 IP': 'game1IP',
                         'Game 1 K': 'game1K',
                         'Game 1 ER': 'game1ER',
                         'Game 2 Date': 'game2Date',
                         'Game 2 IP': 'game2IP',
                         'Game 2 K': 'game2K',
                         'Game 2 ER': 'game2ER',
                         'Game 3 Date': 'game3Date',
                         'Game 3 IP': 'game3IP',
                         'Game 3 K': 'game3K',
                         'Game 3 ER': 'game3ER',
                         'Avg IP (3G)': 'avgIP',
                         'Avg K (3G)': 'avgK',
                         'Avg ER (3G)': 'avgER',
                         'Opponent': 'opponent',
                         'Pitch Count': 'expectedPitch',
                         'Exp K': 'expectedK',
                         'Stadium': 'stadium',
                         'Game O/U': 'gameOU',
                         'Bet K': 'betK',
                         'Bet O/U': 'betOU'
                    };
                    
                    // Add each field that exists in the CSV
                    Object.entries(fieldMappings).forEach(([csvField, objectField]) => {
                         if (headerMap[csvField] !== undefined) {
                             // Special handling for fields that need cleanup
                             if (csvField === 'Opponent' || csvField === 'Stadium') {
                                 pitcher[objectField] = values[headerMap[csvField]]?.replace(/^"|"$/g, '') || '';
                             } 
                             // Special handling for boolean fields
                             else if (csvField.startsWith('Bet ')) {
                                 if (!pitcher.betTypes) pitcher.betTypes = {};
                                 const betType = csvField.replace('Bet ', '');
                                 pitcher.betTypes[betType] = values[headerMap[csvField]] === 'Yes';
                             }
                             // Normal field handling
                             else {
                                 pitcher[objectField] = values[headerMap[csvField]] || '';
                             }
                         }
                    });
                    
                    // Ensure betTypes exists
                    if (!pitcher.betTypes) {
                        pitcher.betTypes = { K: false, OU: false };
                    }
                    
                    importedPitchers.push(pitcher);
                } else if (currentSection === 'picks' && headerMap['Player Name'] !== undefined) {
                    const playerName = values[headerMap['Player Name']]?.replace(/^"|"$/g, '');
                    const playerTeam = values[headerMap['Player Team']];
                    const handicapperId = values[headerMap['Handicapper ID']];
                    if (!playerName || !playerTeam || !handicapperId) return; // Skip if key info missing

                    const playerKey = `${playerName}-${playerTeam}`;
                    if (!importedPicks[playerKey]) importedPicks[playerKey] = {};

                    importedPicks[playerKey][handicapperId] = {
                        public: values[headerMap['Public']] === 'Yes',
                        private: values[headerMap['Private']] === 'Yes',
                        straight: values[headerMap['Straight']] === 'Yes',
                        H: values[headerMap['Bet Type H']] === 'Yes',
                        HR: values[headerMap['Bet Type HR']] === 'Yes',
                        B: values[headerMap['Bet Type B']] === 'Yes',
                        K: values[headerMap['Bet Type K']] === 'Yes',
                        OU: values[headerMap['Bet Type OU']] === 'Yes'
                    };
                }
            });

            // Combine imported players with their picks
             const assignPicks = (player) => {
                 const playerKey = `${player.name}-${player.team}`;
                 const picksForPlayer = importedPicks[playerKey];
                 if (picksForPlayer) {
                    // Initialize all known handicappers first
                     const initialPicks = handicappers.reduce((acc, h) => {
                         acc[h.id] = player.playerType === 'hitter'
                             ? { public: false, private: false, straight: false, H: false, HR: false, B: false }
                             : { public: false, private: false, straight: false, K: false, OU: false };
                         return acc;
                     }, {});
                     // Merge imported picks over the defaults
                     player.handicapperPicks = { ...initialPicks, ...picksForPlayer };
                 } else {
                     // If no picks found in CSV, initialize with defaults for known handicappers
                      player.handicapperPicks = handicappers.reduce((acc, h) => {
                         acc[h.id] = player.playerType === 'hitter'
                             ? { public: false, private: false, straight: false, H: false, HR: false, B: false }
                             : { public: false, private: false, straight: false, K: false, OU: false };
                         return acc;
                     }, {});
                 }
                 return player;
             };

            const finalHitters = importedHitters.map(assignPicks);
            const finalPitchers = importedPitchers.map(assignPicks);

            // Update state
            setSelectedPlayers({
                hitters: finalHitters,
                pitchers: finalPitchers
            });

            alert('Data imported successfully!');
        } catch (error) {
            console.error('Error importing data:', error);
            alert('Failed to import data. Please check the file format and content. Error: ' + error.message);
        } finally {
            // Reset file input value to allow selecting the same file again
            if (event.target) {
                event.target.value = null;
            }
        }
    };
    reader.readAsText(file);
  };


  // Modified data description based on source
  const dataSourceDescription = playerDataSource === 'historical' && historicalDate ?
    `Using player data from: ${historicalDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })}` :
    `Previous game stats based on data available up to: ${formattedPreviousDate}`;

  // ----- JSX Rendering -----
  return (
    <div className="cap-sheet">
      <h2>CapSheet - {formattedDate}</h2>
      <p>{dataSourceDescription}</p>

      {playerDataSource === 'historical' && (
        <div className="historical-data-notice">
          <p>Notice: Using player data from previous games as current day data might be incomplete or unavailable.</p>
        </div>
      )}

      <div className="control-actions">
        <button className="action-btn save-btn" onClick={() => setShowSaveModal(true)}>
          <span className="action-icon">💾</span> Save Slip
        </button>
        <button className="action-btn load-btn" onClick={() => setShowSlipGallery(true)}>
          <span className="action-icon">📂</span> Slip Gallery
        </button>
        <button className="action-btn export-btn" onClick={exportToCSV}>
          <span className="action-icon">📊</span> Export to CSV
        </button>
        <div className="import-container">
          <button className="action-btn import-btn" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
            <span className="action-icon">📥</span> Import from CSV
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".csv"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* HITTERS SECTION */}
      <div className="section-container">
        <h3 className="section-header">Hitters</h3>
        <div className="control-bar">
          <div className="player-selector player-search-select">
             <Select
                options={hitterSelectOptions}
                onChange={(selectedOption) => {
                    if (selectedOption) {
                        handleAddHitterById(selectedOption.value);
                    }
                }}
                value={null} // Resets after selection
                placeholder="Search and select a hitter..."
                isLoading={isLoadingPlayers}
                isDisabled={isLoadingPlayers || availablePlayers.hitters.length === 0}
                isClearable
                isSearchable
                className="react-select-container"
                classNamePrefix="react-select"
                noOptionsMessage={() => isLoadingPlayers ? 'Loading players...' : 'No hitters found'}
             />
             {availablePlayers.hitters.length === 0 && !isLoadingPlayers && <span className="no-players-message">No hitters found for this date.</span>}
          </div>
          <button className="add-handicapper-btn" onClick={() => setShowModal(true)}>
             <span>+</span> Add Handicapper
          </button>
        </div>

        <div className="table-container">
          {isLoadingPlayers && selectedPlayers.hitters.length === 0 ? ( // Show loading only if table would be empty
            <div className="loading-indicator">Loading player data...</div>
          ) : (
            <table className="capsheet-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th className="stat-header">HR Last</th>
                  <th className="stat-header">AB Last</th>
                  <th className="stat-header">H Last</th>
                  {/* Game 1 */}
                  <th className="avg-header">G1 Date</th>
                  <th className="avg-header">G1 HR</th>
                  <th className="avg-header">G1 AB</th>
                  <th className="avg-header">G1 H</th>
                  {/* Game 2 */}
                  <th className="avg-header">G2 Date</th>
                  <th className="avg-header">G2 HR</th>
                  <th className="avg-header">G2 AB</th>
                  <th className="avg-header">G2 H</th>
                  {/* Game 3 */}
                  <th className="avg-header">G3 Date</th>
                  <th className="avg-header">G3 HR</th>
                  <th className="avg-header">G3 AB</th>
                  <th className="avg-header">G3 H</th>
                  <th>Pitcher</th>
                  <th>Throws</th>
                  <th>Exp SO</th>
                  <th>Stadium</th>
                  <th>Game O/U</th>
                  <th>H</th>
                  <th>HR</th>
                  <th>B</th>
                  {handicappers.map(handicapper => (
                    <th key={handicapper.id}>
                      {handicapper.name.replace('@', '')}
                      <button
                        className="action-btn remove-btn"
                        onClick={() => handleRemoveHandicapper(handicapper.id)}
                        title={`Remove ${handicapper.name}`}
                      >
                        ×
                      </button>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedPlayers.hitters.length > 0 ? (
                  selectedPlayers.hitters.map(player => {
                    const teamColors = teams[player.team] ? {
                      backgroundColor: `${teams[player.team].primaryColor}1A`, // Use 1A for ~10% opacity hex
                      borderLeft: `4px solid ${teams[player.team].primaryColor || '#ccc'}`
                    } : { borderLeft: `4px solid #ccc` };

                    // Format dates for display (MM/DD)
                    const game1Date = player.game1Date ? formatDateForDisplay(player.game1Date) : '';
                    const game2Date = player.game2Date ? formatDateForDisplay(player.game2Date) : '';
                    const game3Date = player.game3Date ? formatDateForDisplay(player.game3Date) : '';

                    // Get pitcher options for this hitter (based on opponent team)
                    const pitcherOptions = player.opponentTeam 
                      ? getPitcherOptionsForOpponent(player.opponentTeam)
                      : [];

                    return (
                      <tr key={player.id} style={teamColors}>
                        <td className="player-name">
                          {player.name}
                        </td>
                        <td>{player.team}</td>
                        <td>{player.prevGameHR}</td>
                        <td>{player.prevGameAB}</td>
                        <td>{player.prevGameH}</td>
                        {/* Game 1 Stats */}
                        <td className="avg-cell">{game1Date}</td>
                        <td className="avg-cell">{player.game1HR}</td>
                        <td className="avg-cell">{player.game1AB}</td>
                        <td className="avg-cell">{player.game1H}</td>
                        {/* Game 2 Stats */}
                        <td className="avg-cell">{game2Date}</td>
                        <td className="avg-cell">{player.game2HR}</td>
                        <td className="avg-cell">{player.game2AB}</td>
                        <td className="avg-cell">{player.game2H}</td>
                        {/* Game 3 Stats */}
                        <td className="avg-cell">{game3Date}</td>
                        <td className="avg-cell">{player.game3HR}</td>
                        <td className="avg-cell">{player.game3AB}</td>
                        <td className="avg-cell">{player.game3H}</td>
                        <td>
                          {/* NEW: Replaced text input with Select for pitcher */}
                          {pitcherOptions.length > 0 ? (
                            <Select
                              className="editable-cell"
                              classNamePrefix="select"
                              options={pitcherOptions}
                              value={player.pitcherId ? { value: player.pitcherId, label: player.pitcher } : null}
                              onChange={(option) => handlePitcherSelect(player.id, option ? option.value : null)}
                              isClearable
                              placeholder="Select pitcher..."
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  minHeight: '30px',
                                  height: '30px',
                                  fontSize: '0.9em'
                                }),
                                valueContainer: (base) => ({
                                  ...base,
                                  padding: '0 8px',
                                  height: '30px'
                                }),
                                indicatorsContainer: (base) => ({
                                  ...base,
                                  height: '30px'
                                })
                              }}
                            />
                          ) : (
                            <input 
                              type="text" 
                              className="editable-cell" 
                              value={player.pitcher || ''} 
                              onChange={(e) => handleHitterFieldChange(player.id, 'pitcher', e.target.value)} 
                              placeholder={player.opponentTeam ? "No pitchers found" : "Enter name"} 
                              readOnly={!player.opponentTeam}
                            />
                          )}
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="editable-cell" 
                            value={player.pitcherHand || ''} 
                            onChange={(e) => handleHitterFieldChange(player.id, 'pitcherHand', e.target.value)} 
                            placeholder="R/L" 
                            readOnly={player.pitcherId !== ''}  // Make read-only if pitcher is selected
                          />
                        </td>
                        <td>
                          <input type="text" className="editable-cell" value={player.expectedSO || ''}
                            onChange={(e) => handleHitterFieldChange(player.id, 'expectedSO', e.target.value)} placeholder="0.0" />
                        </td>
                        <td>
                          <input type="text" className="editable-cell" value={player.stadium || ''}
                            onChange={(e) => handleHitterFieldChange(player.id, 'stadium', e.target.value)} placeholder="Stadium" />
                        </td>
                        <td>
                          <input type="text" className="editable-cell" value={player.gameOU || ''}
                            onChange={(e) => handleHitterFieldChange(player.id, 'gameOU', e.target.value)} placeholder="0.0" />
                        </td>
                        <td><input type="checkbox" className="custom-checkbox" checked={player.betTypes?.H || false} onChange={(e) => handleHitterBetTypeChange(player.id, 'H', e.target.checked)} /></td>
                        <td><input type="checkbox" className="custom-checkbox" checked={player.betTypes?.HR || false} onChange={(e) => handleHitterBetTypeChange(player.id, 'HR', e.target.checked)} /></td>
                        <td><input type="checkbox" className="custom-checkbox" checked={player.betTypes?.B || false} onChange={(e) => handleHitterBetTypeChange(player.id, 'B', e.target.checked)} /></td>
                        {handicappers.map(handicapper => (
                          <td key={handicapper.id}>
                            <div className="checkbox-group">
                              <label className="checkbox-label" title="Public">
                                <input type="checkbox" className="custom-checkbox eye-checkbox" checked={player.handicapperPicks[handicapper.id]?.public || false} onChange={(e) => handleHitterPickChange(player.id, handicapper.id, 'public', e.target.checked)} />
                                <span className="eye-icon">👁️</span>
                              </label>
                              <label className="checkbox-label" title="Private">
                                <input type="checkbox" className="custom-checkbox" checked={player.handicapperPicks[handicapper.id]?.private || false} onChange={(e) => handleHitterPickChange(player.id, handicapper.id, 'private', e.target.checked)} /> $
                              </label>
                              <label className="checkbox-label" title="Straight">
                                <input type="checkbox" className="custom-checkbox" checked={player.handicapperPicks[handicapper.id]?.straight || false} onChange={(e) => handleHitterPickChange(player.id, handicapper.id, 'straight', e.target.checked)} /> S
                              </label>
                              <div className="bet-type-checkboxes">
                                <label className="mini-checkbox-label" title="Hits"><input type="checkbox" className="mini-checkbox" checked={player.handicapperPicks[handicapper.id]?.H || false} onChange={(e) => handleHitterPickChange( player.id, handicapper.id, 'H', e.target.checked )} /> H </label>
                                <label className="mini-checkbox-label" title="Home Runs"><input type="checkbox" className="mini-checkbox" checked={player.handicapperPicks[handicapper.id]?.HR || false} onChange={(e) => handleHitterPickChange( player.id, handicapper.id, 'HR', e.target.checked )} /> HR </label>
                                <label className="mini-checkbox-label" title="Bases"><input type="checkbox" className="mini-checkbox" checked={player.handicapperPicks[handicapper.id]?.B || false} onChange={(e) => handleHitterPickChange( player.id, handicapper.id, 'B', e.target.checked )} /> B </label>
                              </div>
                            </div>
                          </td>
                        ))}
                        <td>
                          <button className="action-btn remove-btn" onClick={() => handleRemovePlayer(player.id, 'hitter')} title="Remove player">Remove</button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    {/* Adjusted colspan: 25 base + handicappers + 1 action */}
                    <td colSpan={25 + handicappers.length + 1} className="no-data">
                      No hitters added. Search and select hitters above to track them.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* PITCHERS SECTION */}
      <div className="section-container">
        <h3 className="section-header">Pitchers</h3>
        <div className="control-bar">
           <div className="player-selector player-search-select">
             <Select
                options={pitcherSelectOptions}
                onChange={(selectedOption) => {
                    if (selectedOption) {
                        handleAddPitcherById(selectedOption.value);
                    }
                }}
                value={null} // Resets after selection
                placeholder="Search and select a pitcher..."
                isLoading={isLoadingPlayers}
                isDisabled={isLoadingPlayers || availablePlayers.pitchers.length === 0}
                isClearable
                isSearchable
                className="react-select-container"
                classNamePrefix="react-select"
                noOptionsMessage={() => isLoadingPlayers ? 'Loading players...' : 'No pitchers found'}
             />
             {availablePlayers.pitchers.length === 0 && !isLoadingPlayers && <span className="no-players-message">No pitchers found for this date.</span>}
          </div>
           {/* Optionally add second add handicapper button or remove this one */}
        </div>

        <div className="table-container">
           {isLoadingPlayers && selectedPlayers.pitchers.length === 0 ? ( // Show loading only if table would be empty
            <div className="loading-indicator">Loading player data...</div>
          ) : (
            <table className="capsheet-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th className="stat-header">IP Last</th>
                  <th className="stat-header">K Last</th>
                  <th className="stat-header">ER Last</th>
                  {/* Game 1 */}
                  <th className="avg-header">G1 Date</th>
                  <th className="avg-header">G1 IP</th>
                  <th className="avg-header">G1 K</th>
                  <th className="avg-header">G1 ER</th>
                  {/* Game 2 */}
                  <th className="avg-header">G2 Date</th>
                  <th className="avg-header">G2 IP</th>
                  <th className="avg-header">G2 K</th>
                  <th className="avg-header">G2 ER</th>
                  {/* Game 3 */}
                  <th className="avg-header">G3 Date</th>
                  <th className="avg-header">G3 IP</th>
                  <th className="avg-header">G3 K</th>
                  <th className="avg-header">G3 ER</th>
                  <th>Opponent</th>
                  <th>Pitch Count</th>
                  <th>Exp K</th>
                  <th>Stadium</th>
                  <th>Game O/U</th>
                  <th>K</th>
                  <th>O/U</th>
                  {handicappers.map(handicapper => (
                    <th key={handicapper.id}>
                      {handicapper.name.replace('@', '')}
                      <button className="action-btn remove-btn" onClick={() => handleRemoveHandicapper(handicapper.id)} title={`Remove ${handicapper.name}`}>×</button>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedPlayers.pitchers.length > 0 ? (
                  selectedPlayers.pitchers.map(player => {
                     const teamColors = teams[player.team] ? {
                      backgroundColor: `${teams[player.team].primaryColor}1A`, // Use 1A for ~10% opacity hex
                      borderLeft: `4px solid ${teams[player.team].primaryColor || '#ccc'}`
                    } : { borderLeft: `4px solid #ccc` };

                    // Format dates for display (MM/DD)
                    const game1Date = player.game1Date ? formatDateForDisplay(player.game1Date) : '';
                    const game2Date = player.game2Date ? formatDateForDisplay(player.game2Date) : '';
                    const game3Date = player.game3Date ? formatDateForDisplay(player.game3Date) : '';

                    // Display the pitcher's throwing arm
                    const throwingArm = player.throwingArm ? ` (${player.throwingArm})` : '';

                    return (
                      <tr key={player.id} style={teamColors}>
                        <td className="player-name">
                          {player.name}{throwingArm}
                        </td>
                        <td>{player.team}</td>
                        <td>{player.prevGameIP}</td>
                        <td>{player.prevGameK}</td>
                        <td>{player.prevGameER}</td>
                        {/* Game 1 Stats */}
                        <td className="avg-cell">{game1Date}</td>
                        <td className="avg-cell">{player.game1IP}</td>
                        <td className="avg-cell">{player.game1K}</td>
                        <td className="avg-cell">{player.game1ER}</td>
                        {/* Game 2 Stats */}
                        <td className="avg-cell">{game2Date}</td>
                        <td className="avg-cell">{player.game2IP}</td>
                        <td className="avg-cell">{player.game2K}</td>
                        <td className="avg-cell">{player.game2ER}</td>
                        {/* Game 3 Stats */}
                        <td className="avg-cell">{game3Date}</td>
                        <td className="avg-cell">{player.game3IP}</td>
                        <td className="avg-cell">{player.game3K}</td>
                        <td className="avg-cell">{player.game3ER}</td>
                        <td><input type="text" className="editable-cell" value={player.opponent || ''} onChange={(e) => handlePitcherFieldChange(player.id, 'opponent', e.target.value)} placeholder="Enter team" /></td>
                        <td><input type="text" className="editable-cell" value={player.expectedPitch || ''} onChange={(e) => handlePitcherFieldChange(player.id, 'expectedPitch', e.target.value)} placeholder="0" /></td>
                        <td><input type="text" className="editable-cell" value={player.expectedK || ''} onChange={(e) => handlePitcherFieldChange(player.id, 'expectedK', e.target.value)} placeholder="0.0" /></td>
                        <td><input type="text" className="editable-cell" value={player.stadium || ''} onChange={(e) => handlePitcherFieldChange(player.id, 'stadium', e.target.value)} placeholder="Stadium" /></td>
                        <td><input type="text" className="editable-cell" value={player.gameOU || ''} onChange={(e) => handlePitcherFieldChange(player.id, 'gameOU', e.target.value)} placeholder="0.0" /></td>
                        <td><input type="checkbox" className="custom-checkbox" checked={player.betTypes?.K || false} onChange={(e) => handlePitcherBetTypeChange(player.id, 'K', e.target.checked)} /></td>
                        <td><input type="checkbox" className="custom-checkbox" checked={player.betTypes?.OU || false} onChange={(e) => handlePitcherBetTypeChange(player.id, 'OU', e.target.checked)} /></td>
                        {handicappers.map(handicapper => (
                          <td key={handicapper.id}>
                             <div className="checkbox-group">
                               <label className="checkbox-label" title="Public">
                                 <input type="checkbox" className="custom-checkbox eye-checkbox" checked={player.handicapperPicks[handicapper.id]?.public || false} onChange={(e) => handlePitcherPickChange(player.id, handicapper.id, 'public', e.target.checked)} />
                                 <span className="eye-icon">👁️</span>
                               </label>
                               <label className="checkbox-label" title="Private">
                                 <input type="checkbox" className="custom-checkbox" checked={player.handicapperPicks[handicapper.id]?.private || false} onChange={(e) => handlePitcherPickChange(player.id, handicapper.id, 'private', e.target.checked)} /> $
                               </label>
                               <label className="checkbox-label" title="Straight">
                                 <input type="checkbox" className="custom-checkbox" checked={player.handicapperPicks[handicapper.id]?.straight || false} onChange={(e) => handlePitcherPickChange(player.id, handicapper.id, 'straight', e.target.checked)} /> S
                               </label>
                               <div className="bet-type-checkboxes">
                                 <label className="mini-checkbox-label" title="Strikeouts"><input type="checkbox" className="mini-checkbox" checked={player.handicapperPicks[handicapper.id]?.K || false} onChange={(e) => handlePitcherPickChange( player.id, handicapper.id, 'K', e.target.checked )} /> K </label>
                                 <label className="mini-checkbox-label" title="Over/Under"><input type="checkbox" className="mini-checkbox" checked={player.handicapperPicks[handicapper.id]?.OU || false} onChange={(e) => handlePitcherPickChange( player.id, handicapper.id, 'OU', e.target.checked )} /> O/U </label>
                               </div>
                             </div>
                          </td>
                        ))}
                        <td>
                          <button className="action-btn remove-btn" onClick={() => handleRemovePlayer(player.id, 'pitcher')} title="Remove player">Remove</button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                   <tr>
                      {/* Adjusted colspan: 24 base + handicappers + 1 action */}
                      <td colSpan={24 + handicappers.length + 1} className="no-data">
                        No pitchers added. Search and select pitchers above to track them.
                      </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-summary">
        <h3>Summary</h3>
        <ul>
          <li>Hitters Tracked: {selectedPlayers.hitters.length}</li>
          <li>Pitchers Tracked: {selectedPlayers.pitchers.length}</li>
          <li>Total Recommended Picks: {calculations.totalPicks}</li>
          <li>Public Picks: {calculations.publicPicks}</li>
          <li>Private Picks: {calculations.privatePicks}</li>
        </ul>
      </div>

      {/* Add Handicapper Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Handicapper</h3>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label htmlFor="handicapper-name">Handicapper Name/Username</label>
                <input id="handicapper-name" type="text" value={newHandicapperName} onChange={(e) => setNewHandicapperName(e.target.value)} placeholder="Enter handicapper name (e.g., @CapperJoe)"/>
              </div>
              <div className="form-group">
                <label>Quick Select from List</label>
                <input type="text" placeholder="Search existing handicappers..." value={handicapperSearch} onChange={(e) => setHandicapperSearch(e.target.value)}/>
                <div className="handicapper-list">
                  {filteredHandicappers.length > 0 ? (
                     filteredHandicappers.slice(0, 10).map(handicapper => ( // Show top 10 matches
                        <div key={handicapper.id} className="handicapper-option" onClick={() => handleSelectHandicapper(handicapper)}>
                          {handicapper.name}
                        </div>
                     ))
                  ) : (
                      <div className="no-results">{handicapperSearch ? 'No matches found' : 'Start typing to search'}</div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="submit-btn" onClick={handleAddHandicapper}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Slip Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Save Current Slip</h3>
              <button className="close-modal-btn" onClick={() => setShowSaveModal(false)}>×</button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label htmlFor="slip-name">Slip Name</label>
                <input id="slip-name" type="text" value={slipName} onChange={(e) => setSlipName(e.target.value)} placeholder="Enter a name for this slip" />
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowSaveModal(false)}>Cancel</button>
                <button className="submit-btn" onClick={saveSlip}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slip Gallery Modal */}
      {showSlipGallery && (
        <div className="modal-overlay">
          <div className="modal-content slip-gallery-modal">
            <div className="modal-header">
              <h3>Saved Slips</h3>
              <button className="close-modal-btn" onClick={() => setShowSlipGallery(false)}>×</button>
            </div>
            <div className="slip-gallery">
              {savedSlips.length > 0 ? (
                savedSlips
                  .sort((a, b) => b.timestamp - a.timestamp) // Show newest first
                  .map(slip => (
                    <div key={slip.id} className="slip-item">
                      <div className="slip-details">
                        <h4>{slip.name}</h4>
                        <p>Saved: {slip.date} ({new Date(slip.timestamp).toLocaleTimeString()})</p>
                        <p>Players: {slip.data.hitters.length} Hitters, {slip.data.pitchers.length} Pitchers</p>
                      </div>
                      <div className="slip-actions">
                        <button className="slip-action-btn load-btn" onClick={() => loadSlip(slip)}>Load</button>
                        <button className="slip-action-btn delete-btn" onClick={() => deleteSlip(slip.id)}>Delete</button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="no-slips-message">No saved slips found.</div>
              )}
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowSlipGallery(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CapSheet;