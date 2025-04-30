import React, { useState, useEffect, useRef } from 'react';
import './CapSheet.css';

// Import components
import ControlActions from './components/ControlActions';
import HittersTable from './components/HittersTable';
import PitchersTable from './components/PitchersTable';
import StatsSummary from './components/StatsSummary';
import HandicapperList from './components/HandicapperList';
import HitterHandicapperList from './components/HitterHandicapperList';
import PitcherHandicapperList from './components/PitcherHandicapperList';
//import PitcherHandicapSummary from './components/PitcherHandicapSummary';

import EnhancedHitterHandicapSummary from './components/EnhancedHitterHandicapSummary';
import EnhancedPitcherHandicapSummary from './components/EnhancedPitcherHandicapSummary';

// Import modals
import AddHandicapperModal from './modals/AddHandicapperModal';
import SaveSlipModal from './modals/SaveSlipModal';
import SlipGalleryModal from './modals/SlipGalleryModal';

// Import hooks
import usePlayerData from './hooks/usePlayerData';
import useHandicappers from './hooks/useHandicappers';
import useSlips from './hooks/useSlips';
import useCalculations from './hooks/useCalculations';

// Import utilities
import { exportToCSV, parseImportedCSV } from './utils/exportImport';
import { 
  fetchPlayerDataForDateRange,
  fetchRosterData,
  findMultiGamePlayerStats, 
  formatDateString 
} from '../../services/dataService';

/**
 * Enhanced CapSheet component - Allows users to track and analyze player betting opportunities
 * Now with multi-game history display and smart pitcher selection
 */
function CapSheet({ playerData, gameData, currentDate }) {
  // Local state for historical date to avoid dependency issues
  const [localHistoricalDate, setLocalHistoricalDate] = useState(null);
  
  // Initialize hooks
  const {
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
  } = usePlayerData(playerData, gameData, currentDate);

  const {
    masterHandicappersList,
    hitterHandicappers,      // Now we have separate lists for hitters and pitchers
    pitcherHandicappers,
    setHitterHandicappers,
    setPitcherHandicappers,
    showHitterModal,         // Separate modal states for each player type
    setShowHitterModal,
    showPitcherModal,
    setShowPitcherModal,
    newHandicapperName,
    setNewHandicapperName,
    handicapperSearch,
    setHandicapperSearch,
    filteredHandicappers,
    isLoading: isLoadingHandicappers,
    handleAddHandicapper,    // This now takes a player type parameter
    handleSelectHandicapper,
    handleRemoveHandicapper, // This now takes a player type parameter
    activateHandicapper      // This now takes a player type parameter
  } = useHandicappers();

  const {
    savedSlips,
    showSlipGallery,
    setShowSlipGallery,
    slipName,
    setSlipName,
    showSaveModal,
    setShowSaveModal,
    saveSlip,
    loadSlip,
    deleteSlip
  } = useSlips(formattedDate);

  // Calculate statistics
  const calculatedStats = useCalculations(selectedPlayers);

  // File input reference for import
  //const fileInputRef = useRef(null);

  // Load players from roster and enhance with historical data
  useEffect(() => {
    const loadPlayerData = async () => {
      if (hasProcessedData) return;
      
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
        const hittersData = hitters.map(player => {
          // Get the game history
          const gameHistory = findMultiGamePlayerStats(
            dateRangeData, 
            player.name, 
            player.team,
            3
          );
          
          // Store the player's game history
          newPlayerStatsHistory[`${player.name}-${player.team}`] = gameHistory;
          
          // Use the imported function
          return createPlayerWithGameHistory(player, dateRangeData, []);

        });
        
        const pitchersData = pitchers.map(player => {
          // Get the game history
          const gameHistory = findMultiGamePlayerStats(
            dateRangeData, 
            player.name, 
            player.team, 
            3
          );
          
          // Store the player's game history
          newPlayerStatsHistory[`${player.name}-${player.team}`] = gameHistory;
          
          // Use the imported function
          return createPlayerWithGameHistory(player, dateRangeData, []);
        });
        
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
          setLocalHistoricalDate(new Date(mostRecent));
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
    
    // Run the load function
    loadPlayerData();
  }, [
    currentDate, 
    gameData,  
    hasProcessedData,
    setAvailablePlayers,
    setFullPitcherRoster,
    setHasProcessedData,
    setIsLoadingPlayers,
    setPlayerDataSource,
    setPlayerStatsHistory,
    createPlayerWithGameHistory
  ]);

  // Handle handicapper modification with player data update
  const handleAddHandicapperWithUpdate = () => {
    const newHandicapper = handleAddHandicapper();
    if (newHandicapper) {
      updatePlayersWithNewHandicapper(newHandicapper.id);
    }
  };

  const handleRemoveHandicapperWithUpdate = (handicapperId) => {
    const removed = handleRemoveHandicapper(handicapperId);
    if (removed) {
      removeHandicapperFromPlayers(handicapperId);
    }
  };

  const handleActivateHandicapperWithUpdate = (handicapperId) => {
    const activated = activateHandicapper(handicapperId);
    if (activated) {
      updatePlayersWithNewHandicapper(handicapperId);
    }
  };

  // Handle import file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsedData = parseImportedCSV(content);
        
        if (parsedData) {
          setSelectedPlayers({
            hitters: parsedData.hitters,
            pitchers: parsedData.pitchers
          });
          alert('Data imported successfully!');
        } else {
          alert('Failed to import data. Please check the file format and content.');
        }
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Failed to import data: ' + error.message);
      } finally {
        // Reset file input value to allow selecting the same file again
        if (event.target) {
          event.target.value = null;
        }
      }
    };
    reader.readAsText(file);
  };

  // Handler for hitter handicapper changes
  const handleAddHitterHandicapperWithUpdate = (playerType) => {
    const newHandicapper = handleAddHandicapper(playerType);
    if (newHandicapper) {
      updateHittersWithNewHandicapper(newHandicapper.id);
    }
  };

  const handleRemoveHitterHandicapperWithUpdate = (handicapperId) => {
    const removed = handleRemoveHandicapper(handicapperId, 'hitter');
    if (removed) {
      removeHandicapperFromHitters(handicapperId);
    }
  };

  const handleActivateHitterHandicapperWithUpdate = (handicapperId) => {
    const activated = activateHandicapper(handicapperId, 'hitter');
    if (activated) {
      updateHittersWithNewHandicapper(handicapperId);
    }
  };

  // Handler for pitcher handicapper changes
  const handleAddPitcherHandicapperWithUpdate = (playerType) => {
    const newHandicapper = handleAddHandicapper(playerType);
    if (newHandicapper) {
      updatePitchersWithNewHandicapper(newHandicapper.id);
    }
  };

  const handleRemovePitcherHandicapperWithUpdate = (handicapperId) => {
    const removed = handleRemoveHandicapper(handicapperId, 'pitcher');
    if (removed) {
      removeHandicapperFromPitchers(handicapperId);
    }
  };

  const handleActivatePitcherHandicapperWithUpdate = (handicapperId) => {
    const activated = activateHandicapper(handicapperId, 'pitcher');
    if (activated) {
      updatePitchersWithNewHandicapper(handicapperId);
    }
  };

  // Update player data structure methods
  const updateHittersWithNewHandicapper = (handicapperId) => {
    setSelectedPlayers(prev => ({
      ...prev,
      hitters: prev.hitters.map(player => ({
        ...player,
        handicapperPicks: {
          ...player.handicapperPicks,
          [handicapperId]: { public: false, private: false, straight: false, H: false, HR: false, B: false }
        }
      }))
    }));
  };

  const updatePitchersWithNewHandicapper = (handicapperId) => {
    setSelectedPlayers(prev => ({
      ...prev,
      pitchers: prev.pitchers.map(player => ({
        ...player,
        handicapperPicks: {
          ...player.handicapperPicks,
          [handicapperId]: { public: false, private: false, straight: false, K: false, OU: false }
        }
      }))
    }));
  };

  const removeHandicapperFromHitters = (handicapperId) => {
    setSelectedPlayers(prev => ({
      ...prev,
      hitters: prev.hitters.map(player => {
        const { [handicapperId]: removed, ...remainingPicks } = player.handicapperPicks;
        return { ...player, handicapperPicks: remainingPicks };
      })
    }));
  };

  const removeHandicapperFromPitchers = (handicapperId) => {
    setSelectedPlayers(prev => ({
      ...prev,
      pitchers: prev.pitchers.map(player => {
        const { [handicapperId]: removed, ...remainingPicks } = player.handicapperPicks;
        return { ...player, handicapperPicks: remainingPicks };
      })
    }));
  };


  // Handle save button click
  const handleSaveButtonClick = () => {
    setShowSaveModal(true);
  };

  // Handle save slip
  const handleSaveSlip = () => {
    return saveSlip(selectedPlayers);
  };

  // Handle load slip
  const handleLoadSlip = (slip) => {
    const loadedData = loadSlip(slip);
    if (loadedData) {
      setSelectedPlayers(loadedData);
    }
  };

  // Handle export to CSV
  const handleExportToCsv = () => {
    // Combine both hitter and pitcher handicappers
    const allHandicappers = [...hitterHandicappers, ...pitcherHandicappers];
    // Pass both selectedPlayers and the combined handicappers list
    exportToCSV(selectedPlayers, allHandicappers);
  };

  // Modified data description based on source
  const dataSourceDescription = playerDataSource === 'historical' && localHistoricalDate
    ? `Using player data from: ${localHistoricalDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })}`
    : `Previous game stats based on data available up to: ${formattedPreviousDate}`;

    return (
        <div className="cap-sheet">
          <h2>CapSheet - {formattedDate}</h2>
          <p>{dataSourceDescription}</p>
    
          {playerDataSource === 'historical' && (
            <div className="historical-data-notice">
              <p>Notice: Using player data from previous games as current day data might be incomplete or unavailable.</p>
            </div>
          )}
    
          {/* Control Actions Section */}
          <ControlActions
            onShowSaveModal={handleSaveButtonClick}
            onShowSlipGallery={() => setShowSlipGallery(true)}
            onExport={handleExportToCsv}
            onImport={handleFileSelect}
          />
    
          {/* Conditional rendering based on loading state */}
          {isLoadingHandicappers ? (
            <div className="loading-indicator">Loading handicappers...</div>
          ) : (
            <>
              {/* Hitters Section */}
              <section>
                {/* Hitter Handicapper List */}
                <HitterHandicapperList 
                  activeHandicappers={hitterHandicappers}
                  masterHandicappersList={masterHandicappersList}
                  onAddHandicapper={() => setShowHitterModal(true)}
                  onRemoveHandicapper={handleRemoveHitterHandicapperWithUpdate}
                  onActivateHandicapper={handleActivateHitterHandicapperWithUpdate}
                  isLoading={isLoadingHandicappers}
                />
    
                {/* Hitters Table */}
                <HittersTable
                  hitters={selectedPlayers.hitters}
                  hitterOptions={hitterSelectOptions}
                  teams={teams}
                  handicappers={hitterHandicappers}  // Use hitter handicappers
                  isLoadingPlayers={isLoadingPlayers}
                  onAddHitter={handleAddHitterById}
                  onRemovePlayer={handleRemovePlayer}
                  onFieldChange={handleHitterFieldChange}
                  onPitcherSelect={handlePitcherSelect}
                  onBetTypeChange={handleHitterBetTypeChange}
                  onPickChange={handleHitterPickChange}
                  onAddHandicapper={() => setShowHitterModal(true)}
                  onRemoveHandicapper={handleRemoveHitterHandicapperWithUpdate}
                  getPitcherOptionsForOpponent={getPitcherOptionsForOpponent}
                />
              </section>
{/* Add the EnhancedHitterHandicapSummary component */}
{selectedPlayers.hitters.length > 0 && hitterHandicappers.length > 0 && (
  <EnhancedHitterHandicapSummary 
    hitters={selectedPlayers.hitters} 
    handicappers={hitterHandicappers} 
    teams={teams} 
  />
)}

              <section>
                {/* Pitcher Handicapper List */}
                <PitcherHandicapperList 
                  activeHandicappers={pitcherHandicappers}
                  masterHandicappersList={masterHandicappersList}
                  onAddHandicapper={() => setShowPitcherModal(true)}
                  onRemoveHandicapper={handleRemovePitcherHandicapperWithUpdate}
                  onActivateHandicapper={handleActivatePitcherHandicapperWithUpdate}
                  isLoading={isLoadingHandicappers}
                />
    
                {/* Pitchers Table */}
                <PitchersTable
                  pitchers={selectedPlayers.pitchers}
                  pitcherOptions={pitcherSelectOptions}
                  teams={teams}
                  handicappers={pitcherHandicappers}  // Use pitcher handicappers
                  isLoadingPlayers={isLoadingPlayers}
                  onAddPitcher={handleAddPitcherById}
                  onRemovePlayer={handleRemovePlayer}
                  onFieldChange={handlePitcherFieldChange}
                  onBetTypeChange={handlePitcherBetTypeChange}
                  onPickChange={handlePitcherPickChange}
                  onRemoveHandicapper={handleRemovePitcherHandicapperWithUpdate}
                />
              </section>
            </>
          )}

          {/* Pitcher Handicap Summary */}
          {/* Pitcher Handicap Summary */}
          {selectedPlayers.pitchers.length > 0 && pitcherHandicappers.length > 0 && (
  <EnhancedPitcherHandicapSummary
    pitchers={selectedPlayers.pitchers} 
    handicappers={pitcherHandicappers} 
    teams={teams} 
  />
)}
              
          {/* Statistics Summary */}
          <StatsSummary
            selectedPlayers={selectedPlayers}
            calculations={calculatedStats}
          />
    
          {/* Modals */}
          <AddHandicapperModal
            show={showHitterModal}
            onClose={() => setShowHitterModal(false)}
            playerType="hitter"
            newHandicapperName={newHandicapperName}
            setNewHandicapperName={setNewHandicapperName}
            handicapperSearch={handicapperSearch}
            setHandicapperSearch={setHandicapperSearch}
            filteredHandicappers={filteredHandicappers}
            handleSelectHandicapper={handleSelectHandicapper}
            handleAddHandicapper={handleAddHitterHandicapperWithUpdate}
          />
    
          <AddHandicapperModal
            show={showPitcherModal}
            onClose={() => setShowPitcherModal(false)}
            playerType="pitcher"
            newHandicapperName={newHandicapperName}
            setNewHandicapperName={setNewHandicapperName}
            handicapperSearch={handicapperSearch}
            setHandicapperSearch={setHandicapperSearch}
            filteredHandicappers={filteredHandicappers}
            handleSelectHandicapper={handleSelectHandicapper}
            handleAddHandicapper={handleAddPitcherHandicapperWithUpdate}
          />
    
          <SaveSlipModal
            show={showSaveModal}
            onClose={() => setShowSaveModal(false)}
            slipName={slipName}
            setSlipName={setSlipName}
            onSave={handleSaveSlip}
          />
    
          <SlipGalleryModal
            show={showSlipGallery}
            onClose={() => setShowSlipGallery(false)}
            savedSlips={savedSlips}
            onLoadSlip={handleLoadSlip}
            onDeleteSlip={deleteSlip}
          />
        </div>
      );
    }

export default CapSheet;