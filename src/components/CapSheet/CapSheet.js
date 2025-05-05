import React, { useState, useEffect, useCallback } from 'react';
import './CapSheet.css';

// Import components
import ControlActions from './components/ControlActions';
import HittersTable from './components/HittersTable';
import PitchersTable from './components/PitchersTable';
import StatsSummary from './components/StatsSummary';
import HitterHandicapperList from './components/HitterHandicapperList';
import PitcherHandicapperList from './components/PitcherHandicapperList';
import EnhancedHitterHandicapSummary from './components/EnhancedHitterHandicapSummary';
import EnhancedPitcherHandicapSummary from './components/EnhancedPitcherHandicapSummary';
import GamesHistoryConfig from './components/GamesHistoryConfig';
import GameHistoryLegend from './components/GameHistoryLegend';

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
import { saveHandicapper } from '../../services/handicapperService';

/**
 * Enhanced CapSheet component - Allows users to track and analyze player betting opportunities
 * Now with separate configurable game history displays for hitters and pitchers
 */
function CapSheet({ playerData, gameData, currentDate }) {
  // State for separate games history configuration (default: 3, range: 1-7)
  const [hitterGamesHistory, setHitterGamesHistory] = useState(3);
  const [pitcherGamesHistory, setPitcherGamesHistory] = useState(3);
  
  // State to track if game history legends are expanded
  const [showHitterLegend, setShowHitterLegend] = useState(false);
  const [showPitcherLegend, setShowPitcherLegend] = useState(false);
  
  // Local state for historical date to avoid dependency issues
  const [localHistoricalDate, setLocalHistoricalDate] = useState(null);
  
  // Local state for refreshing indicators
  const [isRefreshingHitters, setIsRefreshingHitters] = useState(false);
  const [isRefreshingPitchers, setIsRefreshingPitchers] = useState(false);
  
  // Flag to force re-render of hitter and pitcher components
  const [hitterRefreshKey, setHitterRefreshKey] = useState(Date.now());
  const [pitcherRefreshKey, setPitcherRefreshKey] = useState(Date.now());
  
  // Initialize player data hook with separate games history parameters
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
    fetchPitcherById,
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
    requestHistoryRefresh
  } = usePlayerData(playerData, gameData, currentDate, hitterGamesHistory, pitcherGamesHistory); // Pass both game history values

  // Initialize handicappers hook
  const {
    masterHandicappersList,
    hitterHandicappers,      // Separate lists for hitters and pitchers
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
    handleAddHandicapper,    // This takes a player type parameter
    handleSelectHandicapper,
    handleRemoveHandicapper, // This takes a player type parameter
    activateHandicapper      // This takes a player type parameter
  } = useHandicappers();

  // Initialize slips hook
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

  // Update localHistoricalDate when playerDataSource changes
  useEffect(() => {
    if (playerDataSource === 'historical') {
      setLocalHistoricalDate(new Date());
    }
  }, [playerDataSource]);

  // Function to refresh hitters with new game history
  const refreshHittersData = useCallback(async () => {
    if (!isRefreshingHitters || selectedPlayers.hitters.length === 0) return;
    
    try {
      console.log("[CapSheet] Refreshing hitter data with history setting:", hitterGamesHistory);
      
      // Create a deep copy of the current hitters to update
      const updatedHitters = JSON.parse(JSON.stringify(selectedPlayers.hitters));
      
      // Process each hitter to refresh their game history
      for (let i = 0; i < updatedHitters.length; i++) {
        const hitter = updatedHitters[i];
        try {
          // Fetch updated data for this hitter using the current history setting
          const updatedHitterData = await requestHistoryRefresh('hitter', hitter.id, hitterGamesHistory);
          
          if (updatedHitterData) {
            // Update game history fields based on the new data
            for (let gameNum = 1; gameNum <= hitterGamesHistory; gameNum++) {
              const dateKey = `game${gameNum}Date`;
              const hrKey = `game${gameNum}HR`;
              const abKey = `game${gameNum}AB`;
              const hKey = `game${gameNum}H`;
              
              // Update each game history field if data is available
              if (updatedHitterData[dateKey] !== undefined) {
                updatedHitters[i][dateKey] = updatedHitterData[dateKey];
                updatedHitters[i][hrKey] = updatedHitterData[hrKey] || '0';
                updatedHitters[i][abKey] = updatedHitterData[abKey] || '0';
                updatedHitters[i][hKey] = updatedHitterData[hKey] || '0';
              }
            }
          }
        } catch (error) {
          console.error(`[CapSheet] Error refreshing hitter ${hitter.name}:`, error);
        }
      }
      
      // Update the state with the refreshed hitters
      setSelectedPlayers(prev => ({
        ...prev,
        hitters: updatedHitters
      }));
      
      // Force a re-render of the hitters table
      setHitterRefreshKey(Date.now());
      
    } catch (error) {
      console.error("[CapSheet] Error in refreshHittersData:", error);
    } finally {
      // End the refreshing state
      setIsRefreshingHitters(false);
    }
  }, [isRefreshingHitters, selectedPlayers.hitters, hitterGamesHistory, requestHistoryRefresh]);

  // Function to refresh pitchers with new game history
  const refreshPitchersData = useCallback(async () => {
    if (!isRefreshingPitchers || selectedPlayers.pitchers.length === 0) return;
    
    try {
      console.log("[CapSheet] Refreshing pitcher data with history setting:", pitcherGamesHistory);
      
      // Create a deep copy of the current pitchers to update
      const updatedPitchers = JSON.parse(JSON.stringify(selectedPlayers.pitchers));
      
      // Process each pitcher to refresh their game history
      for (let i = 0; i < updatedPitchers.length; i++) {
        const pitcher = updatedPitchers[i];
        try {
          // Fetch updated data for this pitcher using the current history setting
          const updatedPitcherData = await requestHistoryRefresh('pitcher', pitcher.id, pitcherGamesHistory);
          
          if (updatedPitcherData) {
            // Update game history fields based on the new data
            for (let gameNum = 1; gameNum <= pitcherGamesHistory; gameNum++) {
              const dateKey = `game${gameNum}Date`;
              const ipKey = `game${gameNum}IP`;
              const kKey = `game${gameNum}K`;
              const erKey = `game${gameNum}ER`;
              const pcStKey = `game${gameNum}PC_ST`;
              const hKey = `game${gameNum}H`;
              const rKey = `game${gameNum}R`;
              const bbKey = `game${gameNum}BB`;
              const hrKey = `game${gameNum}HR`;
              
              // Update each game history field if data is available
              if (updatedPitcherData[dateKey] !== undefined) {
                updatedPitchers[i][dateKey] = updatedPitcherData[dateKey];
                updatedPitchers[i][ipKey] = updatedPitcherData[ipKey] || '0';
                updatedPitchers[i][kKey] = updatedPitcherData[kKey] || '0';
                updatedPitchers[i][erKey] = updatedPitcherData[erKey] || '0';
                updatedPitchers[i][pcStKey] = updatedPitcherData[pcStKey] || 'N/A';
                updatedPitchers[i][hKey] = updatedPitcherData[hKey] || '0';
                updatedPitchers[i][rKey] = updatedPitcherData[rKey] || '0';
                updatedPitchers[i][bbKey] = updatedPitcherData[bbKey] || '0';
                updatedPitchers[i][hrKey] = updatedPitcherData[hrKey] || '0';
              }
            }
          }
        } catch (error) {
          console.error(`[CapSheet] Error refreshing pitcher ${pitcher.name}:`, error);
        }
      }
      
      // Update the state with the refreshed pitchers
      setSelectedPlayers(prev => ({
        ...prev,
        pitchers: updatedPitchers
      }));
      
      // Force a re-render of the pitchers table
      setPitcherRefreshKey(Date.now());
      
    } catch (error) {
      console.error("[CapSheet] Error in refreshPitchersData:", error);
    } finally {
      // End the refreshing state
      setIsRefreshingPitchers(false);
    }
  }, [isRefreshingPitchers, selectedPlayers.pitchers, pitcherGamesHistory, requestHistoryRefresh]);

  // Effect hooks to trigger the refresh functions when the refresh state changes
  useEffect(() => {
    if (isRefreshingHitters) {
      refreshHittersData();
    }
  }, [isRefreshingHitters, refreshHittersData]);

  useEffect(() => {
    if (isRefreshingPitchers) {
      refreshPitchersData();
    }
  }, [isRefreshingPitchers, refreshPitchersData]);

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

  // Handle Hitter Games History change
  const handleHitterGamesHistoryChange = (newValue) => {
    if (newValue !== hitterGamesHistory) {
      setHitterGamesHistory(newValue);
      // This will trigger a reload of player data in the usePlayerData hook
      setHasProcessedData(false);
      
      // Show the legend when changing the value
      setShowHitterLegend(true);
      
      // Trigger refresh of existing hitters in the table
      if (selectedPlayers.hitters.length > 0) {
        setIsRefreshingHitters(true);
      }
    }
  };
  
  // Handle Pitcher Games History change
  const handlePitcherGamesHistoryChange = (newValue) => {
    if (newValue !== pitcherGamesHistory) {
      setPitcherGamesHistory(newValue);
      // This will trigger a reload of player data in the usePlayerData hook
      setHasProcessedData(false);
      
      // Show the legend when changing the value
      setShowPitcherLegend(true);
      
      // Trigger refresh of existing pitchers in the table
      if (selectedPlayers.pitchers.length > 0) {
        setIsRefreshingPitchers(true);
      }
    }
  };

  // Toggle hitter game history legend visibility
  const toggleHitterLegend = () => {
    setShowHitterLegend(!showHitterLegend);
  };

  // Toggle pitcher game history legend visibility
  const togglePitcherLegend = () => {
    setShowPitcherLegend(!showPitcherLegend);
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
    // Combine both hitter and pitcher handicappers for export
    const allHandicappers = [
      ...hitterHandicappers, 
      ...pitcherHandicappers
    ];
    
    // Remove duplicates by ID if any handicapper appears in both lists
    const uniqueHandicappers = [];
    const seen = new Set();
    
    allHandicappers.forEach(handicapper => {
      if (!seen.has(handicapper.id)) {
        seen.add(handicapper.id);
        uniqueHandicappers.push(handicapper);
      }
    });
    
    // Call export with players and unique handicappers
    exportToCSV(selectedPlayers, uniqueHandicappers);
  };

  // Handle file selection for import
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log("[Import] No file selected");
      return;
    }
    
    // Check file extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }
    
    console.log(`[Import] Processing file: ${file.name}, size: ${file.size} bytes`);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        
        if (!content || content.length === 0) {
          throw new Error('File is empty');
        }
        
        console.log(`[Import] File loaded, content length: ${content.length} bytes`);
        console.log(`[Import] Content preview: ${content.substring(0, 100)}...`);
        
        // Parse the CSV content
        const parsedData = parseImportedCSV(content);
        
        if (!parsedData) {
          throw new Error('Failed to parse CSV data');
        }
        
        if (parsedData.hitters.length === 0 && parsedData.pitchers.length === 0) {
          throw new Error('No valid player data found in CSV');
        }
        
        // Step 1: Process handicappers first
        if (parsedData.handicappers && parsedData.handicappers.length > 0) {
          console.log(`[Import] Processing ${parsedData.handicappers.length} handicappers`);
          
          // Process each handicapper
          parsedData.handicappers.forEach(handicapper => {
            // Look for existing handicapper in master list
            const existingInMaster = masterHandicappersList.find(
              h => h.id.toLowerCase() === handicapper.id.toLowerCase()
            );
            
            if (!existingInMaster) {
              console.log(`[Import] Adding new handicapper to master list: ${handicapper.name} (${handicapper.id})`);
              
              // Add to master list - this would be done through your existing function
              // This is an approximation since we don't have the full implementation
              const updatedMasterList = [...masterHandicappersList, handicapper];
              //setMasterHandicappersList(updatedMasterList);
              
              // Save to server if possible (using your existing saveHandicapper function)
              try {
                saveHandicapper(handicapper);
              } catch (error) {
                console.warn(`[Import] Failed to save handicapper to server: ${error.message}`);
              }
            }
            
            // Check if used for hitters
            const usedForHitters = parsedData.hitters.some(
              hitter => hitter.handicapperPicks && hitter.handicapperPicks[handicapper.id]
            );
            
            // Check if used for pitchers
            const usedForPitchers = parsedData.pitchers.some(
              pitcher => pitcher.handicapperPicks && pitcher.handicapperPicks[handicapper.id]
            );
            
            // Add to active hitter handicappers if used
            if (usedForHitters) {
              console.log(`[Import] Activating handicapper for hitters: ${handicapper.name}`);
              const existingInHitterList = hitterHandicappers.some(h => h.id === handicapper.id);
              
              if (!existingInHitterList) {
                setHitterHandicappers(prev => [...prev, handicapper]);
              }
            }
            
            // Add to active pitcher handicappers if used
            if (usedForPitchers) {
              console.log(`[Import] Activating handicapper for pitchers: ${handicapper.name}`);
              const existingInPitcherList = pitcherHandicappers.some(h => h.id === handicapper.id);
              
              if (!existingInPitcherList) {
                setPitcherHandicappers(prev => [...prev, handicapper]);
              }
            }
          });
        }
        
        // Step 2: Update player data with any modifications to ensure handicapper IDs are consistent
        // This ensures the imported picks will match our activated handicappers
        const updatedHitters = parsedData.hitters.map(hitter => {
          // Keep existing handicapper picks
          const updatedPicks = {...hitter.handicapperPicks};
          return {...hitter, handicapperPicks: updatedPicks};
        });
        
        const updatedPitchers = parsedData.pitchers.map(pitcher => {
          // Keep existing handicapper picks
          const updatedPicks = {...pitcher.handicapperPicks};
          return {...pitcher, handicapperPicks: updatedPicks};
        });
        
        // Step 3: Update the app state with the imported data
        setSelectedPlayers({
          hitters: updatedHitters,
          pitchers: updatedPitchers
        });
        
        // Force re-render of tables after import
        setHitterRefreshKey(Date.now());
        setPitcherRefreshKey(Date.now());
        
        alert(`Data imported successfully! ${updatedHitters.length} hitters and ${updatedPitchers.length} pitchers loaded.`);
        
      } catch (error) {
        console.error('[Import] Error importing data:', error);
        alert(`Failed to import betting slip. ${error.message || ''}\nPlease check the file format and content.`);
      } finally {
        // Reset file input value to allow selecting the same file again
        if (event.target) {
          event.target.value = null;
        }
      }
    };
    
    reader.onerror = (error) => {
      console.error('[Import] Error reading file:', error);
      alert('Error reading file: ' + (error.message || 'Unknown error'));
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="cap-sheet">
      <h2>CapSheet - {formattedDate}</h2>
      <p>{playerDataSource === 'historical' && localHistoricalDate
        ? `Using player data from: ${localHistoricalDate.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}`
        : `Previous game stats based on data available up to: ${formattedPreviousDate}`}</p>

      {playerDataSource === 'historical' && (
        <div className="historical-data-notice">
          <p>Notice: Using player data from previous games as current day data might be incomplete or unavailable.</p>
        </div>
      )}

      {/* Control Actions Section */}
      <div className="cap-sheet-controls">
        <ControlActions
          onShowSaveModal={handleSaveButtonClick}
          onShowSlipGallery={() => setShowSlipGallery(true)}
          onExport={handleExportToCsv}
          onImport={handleFileSelect}
        />
      </div>
      
      {/* Loading state during data refresh */}
      {isLoadingPlayers && hasProcessedData === false && (
        <div className="loading-indicator">
          <div className="loading-spinner"></div>
          <span>Updating player data with new game history settings...</span>
        </div>
      )}

      {/* Conditional rendering based on loading state */}
      {isLoadingHandicappers ? (
        <div className="loading-indicator">Loading handicappers...</div>
      ) : (
        <>
          {/* Hitters Section */}
          <section key={`hitters-section-${hitterRefreshKey}`}>
            {/* Hitter Games History Configuration */}
            <div className="games-history-section">
              <GamesHistoryConfig 
                gamesHistory={hitterGamesHistory}
                setGamesHistory={handleHitterGamesHistoryChange}
                minGames={1}
                maxGames={7}
                label="Hitter Games History:"
                // Ensure unique IDs by adding a prefix to the games history config
                id="hitter-games-history"
              />
              
              <button 
                className="toggle-legend-btn"
                onClick={toggleHitterLegend}
                aria-expanded={showHitterLegend}
              >
                {showHitterLegend ? 'Hide Details' : 'Learn About Games History'}
              </button>
            </div>
            
            {/* Hitter Game History Legend (collapsible) */}
            {showHitterLegend && (
              <GameHistoryLegend 
                gamesHistory={hitterGamesHistory} 
                playerType="hitter" 
              />
            )}

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
              fetchPitcherById={fetchPitcherById} 
              teams={teams}
              handicappers={hitterHandicappers}
              isLoadingPlayers={isLoadingPlayers}
              isRefreshingHitters={isRefreshingHitters} 
              onAddHitter={handleAddHitterById}
              onRemovePlayer={handleRemovePlayer}
              onFieldChange={handleHitterFieldChange}
              onPitcherSelect={handlePitcherSelect}
              onBetTypeChange={handleHitterBetTypeChange}
              onPickChange={handleHitterPickChange}
              onAddHandicapper={() => setShowHitterModal(true)}
              onRemoveHandicapper={handleRemoveHitterHandicapperWithUpdate}
              getPitcherOptionsForOpponent={getPitcherOptionsForOpponent}
              gamesHistory={hitterGamesHistory} // Use hitter-specific games history
              refreshKey={hitterRefreshKey} // Pass refresh key to trigger re-render
            />
          </section>
          {selectedPlayers.hitters.some(h => h.pitcherId) && (
            <div className="chart-overlay-legend">
              <h4>About Pitcher Overlay</h4>
              <p>
                When you select a pitcher for a hitter, you can enable the overlay toggle <span className="legend-icon">📊</span> to compare the pitcher's performance with the hitter's performance.
              </p>
              <div className="legend-items">
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: "#3b82f6"}}></div>
                  <span>Hitter performance (Batting Average)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: "#22c55e"}}></div>
                  <span>Pitcher performance (K/IP ratio)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: "#ef4444"}}></div>
                  <span>Home runs (Hitter) / Earned runs (Pitcher)</span>
                </div>
              </div>
            </div>
          )}

          {/* Hitter Handicap Summary */}
          {selectedPlayers.hitters.length > 0 && hitterHandicappers.length > 0 && (
            <EnhancedHitterHandicapSummary 
              hitters={selectedPlayers.hitters} 
              handicappers={hitterHandicappers} 
              teams={teams} 
              gamesHistory={hitterGamesHistory} // Use hitter-specific games history
              key={`hitter-summary-${hitterRefreshKey}`} // Add a key to force re-render
            />
          )}

          <section key={`pitchers-section-${pitcherRefreshKey}`}>
            {/* Pitcher Games History Configuration */}
            <div className="games-history-section">
              <GamesHistoryConfig 
                gamesHistory={pitcherGamesHistory}
                setGamesHistory={handlePitcherGamesHistoryChange}
                minGames={1}
                maxGames={7}
                label="Pitcher Games History:"
                // Ensure unique IDs by adding a prefix to the games history config
                id="pitcher-games-history"
              />
              
              <button 
                className="toggle-legend-btn"
                onClick={togglePitcherLegend}
                aria-expanded={showPitcherLegend}
              >
                {showPitcherLegend ? 'Hide Details' : 'Learn About Games History'}
              </button>
            </div>
            
            {/* Pitcher Game History Legend (collapsible) */}
            {showPitcherLegend && (
              <GameHistoryLegend 
                gamesHistory={pitcherGamesHistory} 
                playerType="pitcher" 
              />
            )}

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
              handicappers={pitcherHandicappers}
              isLoadingPlayers={isLoadingPlayers}
              isRefreshingPitchers={isRefreshingPitchers}
              onAddPitcher={handleAddPitcherById}
              onRemovePlayer={handleRemovePlayer}
              onFieldChange={handlePitcherFieldChange}
              onBetTypeChange={handlePitcherBetTypeChange}
              onPickChange={handlePitcherPickChange}
              onRemoveHandicapper={handleRemovePitcherHandicapperWithUpdate}
              gamesHistory={pitcherGamesHistory} // Use pitcher-specific games history
              refreshKey={pitcherRefreshKey} // Pass refresh key to trigger re-render
            />
          </section>
        </>
      )}

      {/* Pitcher Handicap Summary */}
      {selectedPlayers.pitchers.length > 0 && pitcherHandicappers.length > 0 && (
        <EnhancedPitcherHandicapSummary
          pitchers={selectedPlayers.pitchers} 
          handicappers={pitcherHandicappers} 
          teams={teams} 
          gamesHistory={pitcherGamesHistory} // Use pitcher-specific games history
          key={`pitcher-summary-${pitcherRefreshKey}`} // Add a key to force re-render
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
        filteredHandicappers={filteredHandicappers || []}
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
        filteredHandicappers={filteredHandicappers || []}
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