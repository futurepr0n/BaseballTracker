// src/components/CapSheet/CapSheet.js
import React, { useState, useEffect } from 'react';
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
 * Now with multi-game history display and smart pitcher selection
 */
function CapSheet({ playerData, gameData, currentDate }) {
  // Local state for historical date to avoid dependency issues
  const [localHistoricalDate, setLocalHistoricalDate] = useState(null);
  
  // Initialize player data hook
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

  // Load players from roster and enhance with historical data
  useEffect(() => {
    const loadPlayerData = async () => {
      if (hasProcessedData) return;
      
      setIsLoadingPlayers(true);
      console.log("[CapSheet] Loading players from roster");
      
      try {
        // Process player data as needed
        // This is a simplified version - your actual implementation may be more complex
        
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
    setIsLoadingPlayers,
    setHasProcessedData
  ]);

  // Handle handicapper modification with player data update
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

  // Handle export to CSV - UPDATED FOR FIX
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

  // Handle file selection for import - UPDATED FOR FIX
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

          {/* Hitter Handicap Summary */}
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