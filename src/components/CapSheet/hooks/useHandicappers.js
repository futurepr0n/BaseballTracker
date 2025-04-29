import { useState, useEffect } from 'react';
import { loadHandicappers, saveHandicapper } from '../../../services/handicapperService';

/**
 * Custom hook to manage handicappers
 * @returns {Object} Handicapper state and methods
 */
const useHandicappers = () => {
  // State for the complete list of all known handicappers (from JSON file)
  const [masterHandicappersList, setMasterHandicappersList] = useState([]);
  
  // State for handicappers currently active in each table (empty by default)
  const [activeHitterHandicappers, setActiveHitterHandicappers] = useState([]);
  const [activePitcherHandicappers, setActivePitcherHandicappers] = useState([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [showHitterModal, setShowHitterModal] = useState(false);
  const [showPitcherModal, setShowPitcherModal] = useState(false);
  const [newHandicapperName, setNewHandicapperName] = useState('');
  const [handicapperSearch, setHandicapperSearch] = useState('');
  const [filteredHandicappers, setFilteredHandicappers] = useState([]);

  // Load all known handicappers from server on mount
  useEffect(() => {
    const loadAllHandicappers = async () => {
      try {
        setIsLoading(true);
        console.log("[useHandicappers] Loading handicappers from server");
        
        const handicappersList = await loadHandicappers();
        console.log(`[useHandicappers] Loaded ${handicappersList.length} handicappers`);
        
        setMasterHandicappersList(handicappersList);
        // Initial CapSheet view has no active handicappers for both tables
        setActiveHitterHandicappers([]);
        setActivePitcherHandicappers([]);
      } catch (error) {
        console.error("[useHandicappers] Error loading handicappers:", error);
        setMasterHandicappersList([]); // Fallback to empty array
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAllHandicappers();
  }, []);

  // Filter handicappers based on search input (for the modal)
  useEffect(() => {
    if (handicapperSearch) {
      // Filter from master list to show all available options
      const filtered = masterHandicappersList.filter(h =>
        h.name.toLowerCase().includes(handicapperSearch.toLowerCase())
      );
      setFilteredHandicappers(filtered);
    } else {
      setFilteredHandicappers(masterHandicappersList);
    }
  }, [masterHandicappersList, handicapperSearch]);

  /**
   * Add a handicapper to the active list for a specific player type
   * @param {string} handicapperId - ID of the handicapper to activate
   * @param {string} playerType - 'hitter' or 'pitcher'
   * @returns {Object|null} The handicapper that was activated, or null if failed
   */
  const activateHandicapper = (handicapperId, playerType) => {
    // Find the handicapper in the master list
    const handicapper = masterHandicappersList.find(h => h.id === handicapperId);
    if (!handicapper) {
      console.error(`[useHandicappers] Cannot find handicapper with ID: ${handicapperId}`);
      return null;
    }

    if (playerType === 'hitter') {
      // Check if already active for hitters
      if (activeHitterHandicappers.some(h => h.id === handicapperId)) {
        console.log(`[useHandicappers] Handicapper ${handicapper.name} already active for hitters`);
        return null;
      }

      // Add to active hitters list
      const updatedActive = [...activeHitterHandicappers, handicapper];
      setActiveHitterHandicappers(updatedActive);
    } else if (playerType === 'pitcher') {
      // Check if already active for pitchers
      if (activePitcherHandicappers.some(h => h.id === handicapperId)) {
        console.log(`[useHandicappers] Handicapper ${handicapper.name} already active for pitchers`);
        return null;
      }

      // Add to active pitchers list
      const updatedActive = [...activePitcherHandicappers, handicapper];
      setActivePitcherHandicappers(updatedActive);
    } else {
      console.error(`[useHandicappers] Invalid player type: ${playerType}`);
      return null;
    }

    return handicapper;
  };

  /**
   * Remove a handicapper from the active list for a specific player type
   * @param {string} handicapperId - ID of the handicapper to deactivate
   * @param {string} playerType - 'hitter' or 'pitcher'
   * @returns {string|null} The ID of the handicapper that was removed, or null if failed
   */
  const deactivateHandicapper = (handicapperId, playerType) => {
    const confirmed = window.confirm(`Are you sure you want to remove this handicapper from the ${playerType === 'hitter' ? 'Hitters' : 'Pitchers'} table?`);
    if (!confirmed) return null;

    if (playerType === 'hitter') {
      // Find the handicapper to be removed (for return value)
      const handicapper = activeHitterHandicappers.find(h => h.id === handicapperId);
      if (!handicapper) return null;

      // Update active list for hitters
      const updatedActive = activeHitterHandicappers.filter(h => h.id !== handicapperId);
      setActiveHitterHandicappers(updatedActive);
    } else if (playerType === 'pitcher') {
      // Find the handicapper to be removed (for return value)
      const handicapper = activePitcherHandicappers.find(h => h.id === handicapperId);
      if (!handicapper) return null;

      // Update active list for pitchers
      const updatedActive = activePitcherHandicappers.filter(h => h.id !== handicapperId);
      setActivePitcherHandicappers(updatedActive);
    } else {
      console.error(`[useHandicappers] Invalid player type: ${playerType}`);
      return null;
    }
    
    // Return the removed handicapper ID so the parent can update player state
    return handicapperId;
  };

  /**
   * Add a new handicapper to the master list and activate it for a specific player type
   * @param {string} playerType - 'hitter' or 'pitcher'
   * @returns {Object|null} The new handicapper that was added, or null if failed
   */
  const addNewHandicapper = async (playerType) => {
    if (!newHandicapperName.trim()) return null;
    if (playerType !== 'hitter' && playerType !== 'pitcher') {
      console.error(`[useHandicappers] Invalid player type: ${playerType}`);
      return null;
    }

    const nameWithoutAt = newHandicapperName.startsWith('@')
      ? newHandicapperName.substring(1)
      : newHandicapperName;
    
    const id = nameWithoutAt.toLowerCase().replace(/\s+/g, '');

    // Check if already exists in master list
    if (masterHandicappersList.some(h => h.id.toLowerCase() === id.toLowerCase())) {
      // Get the existing handicapper
      const existingHandicapper = masterHandicappersList.find(
        h => h.id.toLowerCase() === id.toLowerCase()
      );
      
      // If it exists in the master list but not active for this player type, activate it
      if (playerType === 'hitter' && 
          !activeHitterHandicappers.some(h => h.id.toLowerCase() === id.toLowerCase())) {
        setActiveHitterHandicappers([...activeHitterHandicappers, existingHandicapper]);
        setNewHandicapperName('');
        setShowHitterModal(false);
        setShowPitcherModal(false);
        return existingHandicapper;
      } else if (playerType === 'pitcher' && 
                !activePitcherHandicappers.some(h => h.id.toLowerCase() === id.toLowerCase())) {
        setActivePitcherHandicappers([...activePitcherHandicappers, existingHandicapper]);
        setNewHandicapperName('');
        setShowHitterModal(false);
        setShowPitcherModal(false);
        return existingHandicapper;
      } else {
        alert(`This handicapper is already active in the ${playerType === 'hitter' ? 'Hitters' : 'Pitchers'} table`);
        return null;
      }
    }

    // Create new handicapper object
    const newHandicapper = {
      id,
      name: newHandicapperName.startsWith('@') ? newHandicapperName : `@${newHandicapperName}`
    };

    // Add to master list
    const updatedMasterList = [...masterHandicappersList, newHandicapper];
    setMasterHandicappersList(updatedMasterList);
    
    // Add to the appropriate active list
    if (playerType === 'hitter') {
      setActiveHitterHandicappers([...activeHitterHandicappers, newHandicapper]);
    } else {
      setActivePitcherHandicappers([...activePitcherHandicappers, newHandicapper]);
    }
    
    // Save to server (only the new handicapper needs to be saved)
    try {
      await saveHandicapper(newHandicapper);
    } catch (error) {
      console.warn("[useHandicappers] Failed to save new handicapper to server:", error);
      // Continue anyway to maintain app functionality
    }
    
    setNewHandicapperName('');
    setShowHitterModal(false);
    setShowPitcherModal(false);

    // Return the new handicapper so parent components can update their state
    return newHandicapper;
  };

  // Handler for selecting an existing handicapper from the list in modal
  const handleSelectHandicapper = (handicapper) => {
    setNewHandicapperName(handicapper.name);
    setHandicapperSearch('');
  };

  return {
    // State
    masterHandicappersList,
    hitterHandicappers: activeHitterHandicappers,
    pitcherHandicappers: activePitcherHandicappers,
    setHitterHandicappers: setActiveHitterHandicappers,
    setPitcherHandicappers: setActivePitcherHandicappers,
    showHitterModal,
    setShowHitterModal,
    showPitcherModal,
    setShowPitcherModal,
    newHandicapperName,
    setNewHandicapperName,
    handicapperSearch,
    setHandicapperSearch,
    filteredHandicappers,
    isLoading,
    
    // Methods
    handleAddHandicapper: addNewHandicapper,
    handleSelectHandicapper,
    handleRemoveHandicapper: deactivateHandicapper,
    activateHandicapper
  };
};

export default useHandicappers;