import React, { useState, useEffect, useCallback } from 'react';
import BetSlipScannerModal from './BetSlipScannerModal';
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

// Import testing utilities for data validation
import { testPlayerValidation, getCapSheetCacheStats, fetchRosterData } from './services/capSheetDataService';


// PHASE 4 ENHANCED: Scan Results Notification Component with Validation Display
const ScanResultsNotification = ({ results, onDismiss }) => {
  if (!results) return null;
  
  const matchStats = results.matchStats || { 
    matched: 0, 
    added: results.player_data?.length || 0, 
    total: results.player_data?.length || 0,
    validated: 0,
    invalid: 0
  };
  
  const validationSummary = results.validationSummary;
  const hasValidation = validationSummary && validationSummary.total > 0;
  
  return (
    <div className="scan-results-notification">
      <div className="notification-content">
        <div>
          <p className="scan-result-title">
            <span role="img" aria-label="Success">✅</span> Bet Slip Scan Complete
          </p>
          
          {hasValidation ? (
            <>
              <p className="scan-result-stats">
                <strong>Validation Results:</strong> {validationSummary.valid} valid players, {validationSummary.invalid} invalid entries
              </p>
              <p className="scan-result-stats">
                Added {matchStats.added} validated players to CapSheet
                {matchStats.matched > 0 && 
                  <span className="stat-detail">
                    ({matchStats.matched} matched with roster)
                  </span>
                }
              </p>
              
              {/* Show invalid entries if any */}
              {results.invalidEntries && results.invalidEntries.length > 0 && (
                <div className="invalid-entries-summary">
                  <p className="validation-warning">
                    ⚠️ {results.invalidEntries.length} entries were rejected (not found in roster)
                  </p>
                  <details className="invalid-details">
                    <summary>View rejected entries</summary>
                    <ul className="invalid-list">
                      {results.invalidEntries.map((entry, idx) => (
                        <li key={idx} className="invalid-item">
                          "{entry.originalText}" - {entry.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
              
              {/* Show warnings if any */}
              {results.warnings && results.warnings.length > 0 && (
                <div className="scan-warnings-summary">
                  <p className="validation-warning">
                    ⚠️ {results.warnings.length} parsing warnings
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="scan-result-stats">
              Added {matchStats.added} players to CapSheet
              {matchStats.matched > 0 && 
                <span className="stat-detail">
                  ({matchStats.matched} matched with roster)
                </span>
              }
            </p>
          )}
        </div>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
};

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
    fetchHitterById,
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

  // New state for the scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResults, setScanResults] = useState(null);

  // Test function to verify Pete Alonso data validation fix
  const testDataValidation = useCallback(async () => {
    console.log('[CapSheet] Testing Pete Alonso data validation...');
    
    try {
      // Test the specific case that was problematic
      const testResult = await testPlayerValidation('P. Alonso', 'NYM', '2025-07-01');
      console.log('[CapSheet] Pete Alonso test result:', testResult);
      
      // Test a known valid case for comparison  
      const validTest = await testPlayerValidation('Vladimir Guerrero Jr.', 'TOR', '2025-07-01');
      console.log('[CapSheet] Valid player test result:', validTest);
      
      // Show cache stats
      const cacheStats = getCapSheetCacheStats();
      console.log('[CapSheet] Cache statistics:', cacheStats);
      
      alert(`Data validation test complete. Check console for results.\n\nPete Alonso on 07/01: ${testResult.isValid ? 'VALID' : 'INVALID'}\nReason: ${testResult.reason}`);
      
    } catch (error) {
      console.error('[CapSheet] Test failed:', error);
      alert(`Test failed: ${error.message}`);
    }
  }, []);

  // PHASE 4 ENHANCEMENT: Validate scanned players against roster data
  const validateScannedPlayers = async (scannedPlayers, rosterData) => {
    const validPlayers = [];
    const invalidEntries = [];
    const warnings = [];
    
    for (const scannedPlayer of scannedPlayers) {
      const processed = processPlayerLine(scannedPlayer);
      
      if (processed) {
        // Validate against roster
        const rosterMatch = findPlayerInRoster(processed.name, rosterData);
        
        if (rosterMatch) {
          console.log(`[Phase 4] ✅ Validated: ${processed.name} (${rosterMatch.team}) - ${processed.prop_type}`);
          validPlayers.push({
            ...processed,
            ...rosterMatch,
            validated: true,
            _rosterMatch: true
          });
        } else {
          console.log(`[Phase 4] ❌ Invalid: ${processed.name} - not found in roster`);
          invalidEntries.push({
            originalText: `${scannedPlayer.name} - ${scannedPlayer.prop_type}`,
            extractedName: processed.name,
            reason: 'Player not found in roster',
            scannedData: scannedPlayer
          });
        }
      } else {
        console.log(`[Phase 4] ⚠️ Warning: Could not parse scanned player data`);
        warnings.push(`Could not parse: ${JSON.stringify(scannedPlayer)}`);
      }
    }
    
    return {
      validPlayers,
      invalidEntries, 
      warnings,
      summary: {
        total: scannedPlayers.length,
        valid: validPlayers.length,
        invalid: invalidEntries.length,
        warnings: warnings.length
      }
    };
  };

  const processPlayerLine = (scannedPlayer) => {
    // Extract player information from scanned data
    if (!scannedPlayer || !scannedPlayer.name) {
      return null;
    }
    
    return {
      name: scannedPlayer.name,
      team: scannedPlayer.team || '',
      prop_type: scannedPlayer.prop_type || '',
      line: scannedPlayer.line || '',
      odds: scannedPlayer.odds || ''
    };
  };

  const findPlayerInRoster = (playerName, rosterData) => {
    if (!playerName || !rosterData) return null;
    
    // Filter out obvious non-players
    const nonPlayerPatterns = [
      'profit boost', 'bonus', 'parlay', 'bet', 'odds', 'line', 'promo'
    ];
    
    const normalizedInput = playerName.toLowerCase().trim();
    
    // Check if this looks like a non-player entry
    if (nonPlayerPatterns.some(pattern => normalizedInput.includes(pattern))) {
      console.log(`[Phase 4] Filtering out non-player entry: "${playerName}"`);
      return null;
    }
    
    // Clean the input - remove common prefixes
    let cleanedInput = normalizedInput;
    const prefixPatterns = [
      /^a\s+/,           // "a Riley Greene" → "Riley Greene"
      /^ro\s+/,          // "Ro Seiya Suzuki" → "Seiya Suzuki"  
      /^the\s+/,         // "the Player" → "Player"
      /^\w{1,2}\s+/      // Any 1-2 character prefix + space
    ];
    
    for (const pattern of prefixPatterns) {
      const cleaned = normalizedInput.replace(pattern, '');
      if (cleaned.length > 0 && cleaned !== normalizedInput) {
        cleanedInput = cleaned;
        console.log(`[Phase 4] Cleaned "${normalizedInput}" → "${cleanedInput}"`);
        break;
      }
    }
    
    // Strategy 1: Exact match on name field (short format like "C. Seager")
    let match = rosterData.find(p => 
      p.name && p.name.toLowerCase() === cleanedInput
    );
    if (match) {
      console.log(`[Phase 4] ✅ Exact name match: "${cleanedInput}" → "${match.name}"`);
      return match;
    }
    
    // Strategy 2: Exact match on fullName field (full format like "Corey Seager")
    match = rosterData.find(p => 
      p.fullName && p.fullName.toLowerCase() === cleanedInput
    );
    if (match) {
      console.log(`[Phase 4] ✅ Exact fullName match: "${cleanedInput}" → "${match.fullName}"`);
      return match;
    }
    
    const inputParts = cleanedInput.split(' ').filter(part => part.length > 0);
    
    // Strategy 3: Match "Firstname Lastname" against fullName field
    if (inputParts.length === 2) {
      const [firstName, lastName] = inputParts;
      
      match = rosterData.find(p => {
        if (!p.fullName) return false;
        const fullNameParts = p.fullName.toLowerCase().split(' ');
        if (fullNameParts.length >= 2) {
          const rosterFirst = fullNameParts[0];
          const rosterLast = fullNameParts[fullNameParts.length - 1];
          return rosterFirst === firstName && rosterLast === lastName;
        }
        return false;
      });
      
      if (match) {
        console.log(`[Phase 4] ✅ First+Last name match: "${firstName} ${lastName}" → "${match.fullName}"`);
        return match;
      }
    }
    
    // Strategy 4: Match against abbreviated name format (First initial + Last name)
    if (inputParts.length === 2) {
      const [firstName, lastName] = inputParts;
      const firstInitial = firstName.charAt(0);
      
      match = rosterData.find(p => {
        if (!p.name) return false;
        const nameParts = p.name.toLowerCase().split(' ');
        if (nameParts.length >= 2) {
          const rosterInitial = nameParts[0].replace('.', '').charAt(0);
          const rosterLast = nameParts[nameParts.length - 1];
          return rosterInitial === firstInitial && rosterLast === lastName;
        }
        return false;
      });
      
      if (match) {
        console.log(`[Phase 4] ✅ Initial+Last match: "${firstInitial}. ${lastName}" → "${match.name}"`);
        return match;
      }
    }
    
    // Strategy 5: Last name only match
    if (inputParts.length === 1 || inputParts.length === 2) {
      const lastName = inputParts[inputParts.length - 1];
      
      // Check fullName field
      match = rosterData.find(p => {
        if (!p.fullName) return false;
        const fullNameParts = p.fullName.toLowerCase().split(' ');
        return fullNameParts[fullNameParts.length - 1] === lastName;
      });
      
      if (match) {
        console.log(`[Phase 4] ✅ Last name match: "${lastName}" → "${match.fullName}"`);
        return match;
      }
      
      // Check name field
      match = rosterData.find(p => {
        if (!p.name) return false;
        const nameParts = p.name.toLowerCase().split(' ');
        return nameParts[nameParts.length - 1] === lastName;
      });
      
      if (match) {
        console.log(`[Phase 4] ✅ Last name match: "${lastName}" → "${match.name}"`);
        return match;
      }
    }
    
    console.log(`[Phase 4] ❌ No match found for: "${playerName}" (cleaned: "${cleanedInput}")`);
    return null;
  };

  // Handle scan completion
  const handleScanComplete = async (results) => {
  console.log("Scan complete, processing results:", results);
  setScanResults(results);

  if (results.player_data && results.player_data.length > 0) {
    console.log(`Processing ${results.player_data.length} players from scan results`);
    
    // PHASE 4 ENHANCEMENT: Add roster validation to scan results
    console.log(`[Phase 4] Fetching roster data for scan validation...`);
    const rosterData = await fetchRosterData();
    console.log(`[Phase 4] Loaded ${rosterData.length} roster entries for validation`);
    
    const validatedResults = await validateScannedPlayers(results.player_data, rosterData);
    console.log(`[Phase 4] Validation complete: ${validatedResults.validPlayers.length} valid, ${validatedResults.invalidEntries.length} invalid`);
    
    // Update scan results with validation information
    const enhancedResults = {
      ...results,
      validationSummary: validatedResults.summary,
      validPlayers: validatedResults.validPlayers,
      invalidEntries: validatedResults.invalidEntries,
      warnings: validatedResults.warnings
    };
    setScanResults(enhancedResults);
    
    const matchResults = { 
      matched: 0, 
      added: 0, 
      total: results.player_data.length,
      validated: validatedResults.validPlayers.length,
      invalid: validatedResults.invalidEntries.length
    };
    const pendingBetTypeUpdates = []; // Track updates to make after all players are added
    
    // PHASE 4 ENHANCEMENT: Process only validated players
    console.log(`[Phase 4] Processing ${validatedResults.validPlayers.length} validated players (skipping ${validatedResults.invalidEntries.length} invalid entries)`);
    
    for (const scannedPlayer of validatedResults.validPlayers) {
      console.log(`Processing validated player: ${scannedPlayer.name}, prop type: ${scannedPlayer.prop_type}`);
      
      // Use your existing player matching logic
      const findBestPlayerMatch = (scannedName, scannedTeam) => {
        if (!scannedName) return null;
        const cleanName = scannedName.replace(/[^a-zA-Z0-9\s\.]/g, '').trim();
        let match = hitterSelectOptions.find(option => 
          option.label.toLowerCase() === cleanName.toLowerCase()
        );
        if (match) return match;
        const nameParts = cleanName.split(' ');
        if (nameParts.length > 1) {
          const abbreviatedName = `${nameParts[0][0]}. ${nameParts.slice(1).join(' ')}`;
          match = hitterSelectOptions.find(option => 
            option.label.toLowerCase().includes(abbreviatedName.toLowerCase())
          );
          if (match) return match;
        }
        if (nameParts.length > 1) {
          const lastName = nameParts[nameParts.length - 1];
          const possibleMatches = hitterSelectOptions.filter(option => 
            option.label.toLowerCase().includes(lastName.toLowerCase())
          );
          if (scannedTeam && possibleMatches.length > 1) {
            const teamMatches = possibleMatches.filter(option => {
              const teamInfo = option.label.match(/\(([^)]+)\)/);
              return teamInfo && teamInfo[1] && 
                    teamInfo[1].toLowerCase() === scannedTeam.toLowerCase();
            });
            if (teamMatches.length > 0) return teamMatches[0];
          }
          if (possibleMatches.length > 0) {
            return possibleMatches.sort((a, b) => a.label.length - b.label.length)[0];
          }
        }
        return null;
      };
      
      const match = findBestPlayerMatch(scannedPlayer.name, scannedPlayer.team);
      
      if (match) {
        matchResults.matched++;
        const playerId = match.value;
        
        // Check if player already exists in the sheet
        const existingPlayerInSheet = selectedPlayers.hitters.some(p => p.id === playerId);
        
        if (!existingPlayerInSheet) {
          console.log(`Adding player ${match.label} (ID: ${playerId}) using handleAddHitterById`);
          
          try {
            // Use your existing function to add the player
            await handleAddHitterById(playerId);
            matchResults.added++;
            
            // Track this player's bet type to update after all players are added
            pendingBetTypeUpdates.push({
              playerId: playerId,
              betType: scannedPlayer.prop_type
            });
            
          } catch (error) {
            console.error(`Error adding player ${match.label}:`, error);
          }
        } else {
          console.log(`Player ${match.label} already exists in CapSheet, skipping.`);
        }
      } else {
        // No match found in hitterSelectOptions, add based on scanned data only
        matchResults.added++;
        console.log(`No match found, adding player with scanned data: ${scannedPlayer.name}`);
        
        let nameForNewPlayer = scannedPlayer.name;
        let teamForNewPlayer = scannedPlayer.team || ''; 
        const scannedNameTeamRegex = /^(.*?)\s*\(([^)]+)\)\s*$/;
        const scannedNameParts = scannedPlayer.name.match(scannedNameTeamRegex);
        if (scannedNameParts) {
            nameForNewPlayer = scannedNameParts[1].trim();
            if (!teamForNewPlayer) teamForNewPlayer = scannedNameParts[2].trim();
        }
        
        const newPlayerId = `scanned-${nameForNewPlayer.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}`;
        
        // Create a minimal player - keep your existing manual creation for unmatched players
        const newPlayerFromScan = {
          id: newPlayerId, 
          name: nameForNewPlayer, 
          team: teamForNewPlayer, 
          playerType: 'hitter',
          bats: '', 
          fullName: nameForNewPlayer,
          prevGameHR: '0', prevGameAB: '0', prevGameH: '0',
          opponentTeam: '',
          stadium: '',
          gameOU: '',
          pitcher: '', 
          pitcherId: '', 
          pitcherHand: '', 
          expectedSO: '',
          // Set bet types directly here for manually added players
          betTypes: { 
            H: scannedPlayer.prop_type === 'H', 
            HR: scannedPlayer.prop_type === 'HR', 
            B: scannedPlayer.prop_type === 'B' 
          },
          handicapperPicks: {},
        };
        
        // Initialize handicapper picks
        hitterHandicappers.forEach(handicapper => {
          newPlayerFromScan.handicapperPicks[handicapper.id] = {
            public: false, private: false, straight: false,
            H: scannedPlayer.prop_type === 'H',
            HR: scannedPlayer.prop_type === 'HR', 
            B: scannedPlayer.prop_type === 'B'
          };
        });
        
        // Add player
        setSelectedPlayers(prev => ({
          ...prev,
          hitters: [...prev.hitters, newPlayerFromScan]
        }));
      }
    }
    
    // Force a re-render of the hitter table
    setHitterRefreshKey(Date.now());
    
    // Apply bet types after a small delay to ensure all players are added
    if (pendingBetTypeUpdates.length > 0) {
      setTimeout(() => {
        console.log("Applying pending bet type updates:", pendingBetTypeUpdates);
        
        // First approach: Use the handler function
        pendingBetTypeUpdates.forEach(update => {
          if (update.betType === 'H') {
            handleHitterBetTypeChange(update.playerId, 'H', true);
          } else if (update.betType === 'HR') {
            handleHitterBetTypeChange(update.playerId, 'HR', true);
          } else if (update.betType === 'B') {
            handleHitterBetTypeChange(update.playerId, 'B', true);
          }
        });
        
        // Second approach (backup): Update state directly
        setSelectedPlayers(prev => {
          const updatedHitters = [...prev.hitters];
          
          pendingBetTypeUpdates.forEach(update => {
            const playerIndex = updatedHitters.findIndex(p => p.id === update.playerId);
            if (playerIndex !== -1) {
              const player = updatedHitters[playerIndex];
              
              // Update betTypes
              const updatedBetTypes = { ...player.betTypes };
              if (update.betType === 'H') updatedBetTypes.H = true;
              else if (update.betType === 'HR') updatedBetTypes.HR = true;
              else if (update.betType === 'B') updatedBetTypes.B = true;
              
              // Update the player
              updatedHitters[playerIndex] = {
                ...player,
                betTypes: updatedBetTypes
              };
              
              console.log(`Directly updated bet types for ${player.name} to ${update.betType}`);
            }
          });
          
          return {
            ...prev,
            hitters: updatedHitters
          };
        });
        
        // Force another refresh after updating bet types
        setHitterRefreshKey(Date.now());
      }, 500); // 500ms delay to ensure players are fully added
    }
    
    setScanResults(prevResults => ({ ...prevResults, matchStats: matchResults }));
  } else {
    console.log("Scan results contained no player data.");
    setScanResults(prevResults => ({ ...prevResults, matchStats: { matched: 0, added: 0, total: 0 } }));
  }
};




  // Calculate statistics
  const calculatedStats = useCalculations(selectedPlayers);

  // Update localHistoricalDate when playerDataSource changes
  useEffect(() => {
    if (playerDataSource === 'historical') {
      setLocalHistoricalDate(new Date());
    }
  }, [playerDataSource]);



   // Add custom CSS for scan notification
  useEffect(() => {
    // Add custom styles for scan notification
    const styleId = 'scan-notification-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.innerHTML = `
        .scan-results-notification {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: #f0fff4;
          border: 1px solid #16a34a;
          border-left: 4px solid #16a34a;
          border-radius: 4px;
          padding: 12px 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
          animation: slide-in 0.3s ease-out;
          max-width: 400px;
        }
        
        .scan-result-title {
          font-weight: 600;
          margin: 0 0 4px 0;
        }
        
        .scan-result-stats {
          margin: 0;
          font-size: 0.9rem;
          color: #555;
        }
        
        .stat-detail {
          margin-left: 4px;
          font-style: italic;
        }
        
        .notification-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .notification-content button {
          background: none;
          border: none;
          color: #16a34a;
          cursor: pointer;
          font-weight: 500;
          margin-left: 15px;
          padding: 5px 10px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .notification-content button:hover {
          background-color: rgba(22, 163, 74, 0.1);
        }
        
        @keyframes slide-in {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styleEl);
    }
    
    // Clean up the style element when the component unmounts
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Function to refresh hitters with new game history
  const refreshHittersData = useCallback(() => {
    if (!isRefreshingHitters || selectedPlayers.hitters.length === 0) return;
    
    console.log("[CapSheet] Initiating hitter data refresh with history setting:", hitterGamesHistory);
    
    // This now just triggers the refresh via the requestHistoryRefresh function
    requestHistoryRefresh('hitter', hitterGamesHistory);
    
    // The actual refresh will be handled by the useEffect in usePlayerData.js
  }, [isRefreshingHitters, selectedPlayers.hitters, hitterGamesHistory, requestHistoryRefresh]);
  

  // Function to refresh pitchers with new game history
  const refreshPitchersData = useCallback(() => {
    if (!isRefreshingPitchers || selectedPlayers.pitchers.length === 0) return;
    
    console.log("[CapSheet] Initiating pitcher data refresh with history setting:", pitcherGamesHistory);
    
    // This now just triggers the refresh via the requestHistoryRefresh function
    requestHistoryRefresh('pitcher', pitcherGamesHistory);
    
    // The actual refresh will be handled by the useEffect in usePlayerData.js
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

// In the handleHitterGamesHistoryChange function:
/**
 * Handler for hitter games history changes with direct refresh trigger
 * @param {number} newValue - New number of games to display
 */
const handleHitterGamesHistoryChange = (newValue) => {
  if (newValue !== hitterGamesHistory) {
    console.log(`[CapSheet] Hitter games history changing from ${hitterGamesHistory} to ${newValue}`);
    setHitterGamesHistory(newValue);
    
    // Show the legend when changing the value
    setShowHitterLegend(true);
    
    // Immediately trigger refresh for all existing hitters
    if (selectedPlayers.hitters.length > 0) {
      console.log(`[CapSheet] Explicitly requesting hitter history refresh with ${newValue} games for ${selectedPlayers.hitters.length} hitters`);
      
      // IMPORTANT: Set refreshing flag first
      setIsRefreshingHitters(true);
      
      // Then call the refresh function with explicit Promise handling
      requestHistoryRefresh('hitter', newValue)
        .then(() => {
          console.log(`[CapSheet] Hitter history refresh complete for ${newValue} games`);
          // Force a re-render with a new key
          setHitterRefreshKey(Date.now());
        })
        .finally(() => {
          // Clear the refreshing flag when done or on error
          setIsRefreshingHitters(false);
        });
    }
  }
};


// In the handlePitcherGamesHistoryChange function:
const handlePitcherGamesHistoryChange = (newValue) => {
  if (newValue !== pitcherGamesHistory) {
    console.log(`[CapSheet] Pitcher games history changing from ${pitcherGamesHistory} to ${newValue}`);
    setPitcherGamesHistory(newValue);
    
    // Show the legend when changing the value
    setShowPitcherLegend(true);
    
    // Immediately trigger refresh for all existing pitchers
    if (selectedPlayers.pitchers.length > 0) {
      console.log(`[CapSheet] Explicitly requesting pitcher history refresh with ${newValue} games for ${selectedPlayers.pitchers.length} pitchers`);
      
      // IMPORTANT: Set refreshing flag first
      setIsRefreshingPitchers(true);
      
      // Then call the refresh function with explicit Promise handling
      requestHistoryRefresh('pitcher', newValue)
        .then(() => {
          console.log(`[CapSheet] Pitcher history refresh complete for ${newValue} games`);
          // Force a re-render with a new key
          setPitcherRefreshKey(Date.now());
        })
        .finally(() => {
          // Clear the refreshing flag when done or on error
          setIsRefreshingPitchers(false);
        });
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
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        
        if (!content || content.length === 0) {
          throw new Error('File is empty');
        }
        
        console.log(`[Import] File loaded, content length: ${content.length} bytes`);
        console.log(`[Import] Content preview: ${content.substring(0, 100)}...`);
        
        // PHASE 3 ENHANCEMENT: Parse the CSV content with roster data for handedness preservation
        console.log(`[Import] Fetching roster data for handedness enhancement...`);
        const rosterData = await fetchRosterData();
        console.log(`[Import] Loaded ${rosterData.length} roster entries for enhancement`);
        
        const parsedData = await parseImportedCSV(content, rosterData);
        
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
  {/* Add a distinct style for the scan button to make it stand out */}
  <button 
    className="action-btn scan-btn" 
    onClick={() => setIsScannerOpen(true)}
    style={{
      backgroundColor: '#22c55e', 
      marginLeft: '10px'
    }}
  >
          <span className="action-icon">📷</span> Scan Bet Slip
        </button>
        
        {/* Test button for data validation - Development only */}
        {process.env.NODE_ENV === 'development' && (
          <button 
            className="action-btn test-btn" 
            onClick={testDataValidation}
            style={{
              backgroundColor: '#f59e0b', 
              marginLeft: '10px'
            }}
            title="Test Pete Alonso data validation fix"
          >
            <span className="action-icon">🧪</span> Test Validation
          </button>
        )}
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
              fetchHitterById={fetchHitterById} // Add this new prop
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
              gamesHistory={hitterGamesHistory} 
              refreshKey={hitterRefreshKey} 
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
              gamesHistory={pitcherGamesHistory}
              refreshKey={pitcherRefreshKey}
              fetchPitcherById={fetchPitcherById} // Add this prop
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

      <BetSlipScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
        context="capsheet"  // Tell scanner this is for CapSheet
      />
      
      {/* If we have scan results, show a notification */}
      {scanResults && (
        <ScanResultsNotification 
          results={scanResults} 
          onDismiss={() => setScanResults(null)} 
        />
      )}
    </div>
  );
}

export default CapSheet;