import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// Create the context
const PlayerScratchpadContext = createContext();

// Custom hook to use the context
export const usePlayerScratchpad = () => {
  const context = useContext(PlayerScratchpadContext);
  if (!context) {
    throw new Error('usePlayerScratchpad must be used within a PlayerScratchpadProvider');
  }
  return context;
};

// localStorage keys
const STORAGE_KEYS = {
  players: 'scratchpad-players',
  filterEnabled: 'scratchpad-filter-enabled',
  widgetMinimized: 'scratchpad-widget-minimized',
  widgetPosition: 'scratchpad-widget-position',
  positionPreset: 'scratchpad-position-preset'
};

// Helper functions for localStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
};

// Default position calculation based on screen size
const getDefaultPosition = () => {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    return { x: 10, y: 70 }; // Mobile: left side, below header
  } else {
    return { x: window.innerWidth - 350, y: 80 }; // Desktop: right side, below header  
  }
};

export const PlayerScratchpadProvider = ({ children }) => {
  // State management
  const [players, setPlayers] = useState(() => loadFromStorage(STORAGE_KEYS.players, []));
  const [filterEnabled, setFilterEnabled] = useState(() => loadFromStorage(STORAGE_KEYS.filterEnabled, false));
  const [widgetMinimized, setWidgetMinimized] = useState(() => loadFromStorage(STORAGE_KEYS.widgetMinimized, false));
  const [widgetPosition, setWidgetPosition] = useState(() => 
    loadFromStorage(STORAGE_KEYS.widgetPosition, getDefaultPosition())
  );
  const [positionPreset, setPositionPreset] = useState(() => 
    loadFromStorage(STORAGE_KEYS.positionPreset, 'right')
  );
  
  // Use ref to maintain current players state for stable function references
  const playersRef = useRef(players);
  
  // Update ref when players change
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Persist players to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.players, players);
  }, [players]);

  // Persist filter state to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.filterEnabled, filterEnabled);
  }, [filterEnabled]);

  // Persist widget state to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.widgetMinimized, widgetMinimized);
  }, [widgetMinimized]);

  // Persist widget position to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.widgetPosition, widgetPosition);
  }, [widgetPosition]);

  // Persist position preset to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.positionPreset, positionPreset);
  }, [positionPreset]);

  // Listen for storage changes (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.players) {
        setPlayers(loadFromStorage(STORAGE_KEYS.players, []));
      } else if (e.key === STORAGE_KEYS.filterEnabled) {
        setFilterEnabled(loadFromStorage(STORAGE_KEYS.filterEnabled, false));
      } else if (e.key === STORAGE_KEYS.widgetMinimized) {
        setWidgetMinimized(loadFromStorage(STORAGE_KEYS.widgetMinimized, false));
      } else if (e.key === STORAGE_KEYS.widgetPosition) {
        setWidgetPosition(loadFromStorage(STORAGE_KEYS.widgetPosition, getDefaultPosition()));
      } else if (e.key === STORAGE_KEYS.positionPreset) {
        setPositionPreset(loadFromStorage(STORAGE_KEYS.positionPreset, 'right'));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Player management functions
  const addPlayer = useCallback((playerData) => {
    const player = {
      id: `${playerData.name}-${playerData.team}`.toLowerCase().replace(/\s+/g, '-'),
      name: playerData.name,
      fullName: playerData.fullName || playerData.name,
      team: playerData.team,
      playerType: playerData.playerType || 'hitter',
      addedAt: Date.now(),
      source: playerData.source || 'unknown'
    };

    setPlayers(prev => {
      // Check if player already exists
      const exists = prev.some(p => p.id === player.id);
      if (exists) {
        console.log(`Player ${player.name} already in scratchpad`);
        return prev;
      }
      
      console.log(`Added ${player.name} (${player.team}) to scratchpad`);
      return [...prev, player];
    });
  }, []);

  const removePlayer = useCallback((playerId) => {
    setPlayers(prev => {
      const filtered = prev.filter(p => p.id !== playerId);
      const removedPlayer = prev.find(p => p.id === playerId);
      if (removedPlayer) {
        console.log(`Removed ${removedPlayer.name} from scratchpad`);
      }
      return filtered;
    });
  }, []);

  const clearAllPlayers = useCallback(() => {
    console.log('Cleared all players from scratchpad');
    setPlayers([]);
  }, []);

  const togglePlayer = useCallback((playerData) => {
    const playerId = `${playerData.name}-${playerData.team}`.toLowerCase().replace(/\s+/g, '-');
    
    setPlayers(prev => {
      const exists = prev.some(p => p.id === playerId);
      
      if (exists) {
        // Remove player
        const filtered = prev.filter(p => p.id !== playerId);
        const removedPlayer = prev.find(p => p.id === playerId);
        if (removedPlayer) {
          console.log(`Removed ${removedPlayer.name} from scratchpad`);
        }
        return filtered;
      } else {
        // Add player
        const player = {
          id: playerId,
          name: playerData.name,
          fullName: playerData.fullName || playerData.name,
          team: playerData.team,
          playerType: playerData.playerType || 'hitter',
          addedAt: Date.now(),
          source: playerData.source || 'unknown'
        };
        
        console.log(`Added ${player.name} (${player.team}) to scratchpad`);
        return [...prev, player];
      }
    });
  }, []); // No dependencies!

  // Check if player is in scratchpad - use ref to avoid recreating this function
  const isPlayerInScratchpad = useCallback((playerData) => {
    if (!playerData?.name || !playerData?.team) return false;
    const playerId = `${playerData.name}-${playerData.team}`.toLowerCase().replace(/\s+/g, '-');
    return playersRef.current.some(p => p.id === playerId);
  }, []); // No dependencies - uses stable ref!

  // Filter functions
  const shouldIncludePlayer = useCallback((playerData) => {
    if (!filterEnabled) return true;
    if (!playerData?.name || !playerData?.team) return false;
    const playerId = `${playerData.name}-${playerData.team}`.toLowerCase().replace(/\s+/g, '-');
    return playersRef.current.some(p => p.id === playerId);
  }, [filterEnabled]); // Only depends on filterEnabled

  // Get players by type - use ref to avoid dependencies
  const getHitters = useCallback(() => {
    return playersRef.current.filter(p => p.playerType === 'hitter');
  }, []);

  const getPitchers = useCallback(() => {
    return playersRef.current.filter(p => p.playerType === 'pitcher');
  }, []);

  // Widget controls
  const toggleWidget = useCallback(() => {
    setWidgetMinimized(prev => !prev);
  }, []);

  const toggleFilter = useCallback(() => {
    setFilterEnabled(prev => !prev);
  }, []);

  // Position management functions
  const updateWidgetPosition = useCallback((newPosition) => {
    setWidgetPosition(newPosition);
    setPositionPreset('custom'); // Mark as custom when manually positioned
  }, []);

  const setPositionToLeft = useCallback(() => {
    const newPos = { x: 20, y: widgetPosition.y };
    setWidgetPosition(newPos);
    setPositionPreset('left');
  }, [widgetPosition.y]);

  const setPositionToRight = useCallback(() => {
    const newPos = { x: window.innerWidth - 350, y: widgetPosition.y };
    setWidgetPosition(newPos);
    setPositionPreset('right');
  }, [widgetPosition.y]);

  const setPositionToCenter = useCallback(() => {
    const centerX = (window.innerWidth - 300) / 2;
    const newPos = { x: centerX, y: widgetPosition.y };
    setWidgetPosition(newPos);
    setPositionPreset('center');
  }, [widgetPosition.y]);

  const resetWidgetPosition = useCallback(() => {
    const defaultPos = getDefaultPosition();
    setWidgetPosition(defaultPos);
    setPositionPreset('right');
  }, []);

  // Context value
  const value = {
    // State
    players,
    filterEnabled,
    widgetMinimized,
    widgetPosition,
    positionPreset,
    
    // Player management
    addPlayer,
    removePlayer,
    clearAllPlayers,
    togglePlayer,
    isPlayerInScratchpad,
    
    // Filtering
    shouldIncludePlayer,
    toggleFilter,
    
    // Player type getters
    getHitters,
    getPitchers,
    
    // Widget controls
    toggleWidget,
    
    // Position controls
    updateWidgetPosition,
    setPositionToLeft,
    setPositionToRight,
    setPositionToCenter,
    resetWidgetPosition,
    
    // Computed values
    playerCount: players.length,
    hitterCount: players.filter(p => p.playerType === 'hitter').length,
    pitcherCount: players.filter(p => p.playerType === 'pitcher').length,
    isEmpty: players.length === 0
  };

  return (
    <PlayerScratchpadContext.Provider value={value}>
      {children}
    </PlayerScratchpadContext.Provider>
  );
};

export default PlayerScratchpadContext;