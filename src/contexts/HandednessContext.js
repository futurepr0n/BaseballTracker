import React, { createContext, useContext, useState, useCallback } from 'react';
import handednessSwingDataService from '../services/handednessSwingDataService';

const HandednessContext = createContext();

export const HandednessProvider = ({ children }) => {
  const [selectedHandedness, setSelectedHandedness] = useState('ALL');
  const [handednessDatasets, setHandednessDatasets] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load all handedness datasets once
  const loadHandednessDatasets = useCallback(async () => {
    if (handednessDatasets) {
      console.log('🔍 DATASETS ALREADY LOADED');
      return; // Already loaded
    }
    
    try {
      setLoading(true);
      console.log('🔍 LOADING handedness datasets...');
      const datasets = await handednessSwingDataService.loadAllHandednessDatasets();
      console.log('🔍 LOADED datasets:', {
        RHP: datasets.RHP.size,
        LHP: datasets.LHP.size, 
        ALL: datasets.ALL.size
      });
      setHandednessDatasets(datasets);
      console.log('🔍 DATASETS SET IN STATE');
    } catch (error) {
      console.error('🔍 ERROR loading handedness datasets:', error);
    } finally {
      setLoading(false);
    }
  }, [handednessDatasets]);

  // Get player data for current handedness
  const getPlayerHandednessData = useCallback(async (playerName) => {
    if (!handednessDatasets) return null;
    return await handednessSwingDataService.getPlayerDataByHandedness(
      handednessDatasets, playerName, selectedHandedness
    );
  }, [handednessDatasets, selectedHandedness]);

  // Get player data for specific handedness (useful for comparisons)
  const getPlayerDataForHandedness = useCallback(async (playerName, handedness) => {
    if (!handednessDatasets) return null;
    return await handednessSwingDataService.getPlayerDataByHandedness(
      handednessDatasets, playerName, handedness
    );
  }, [handednessDatasets]);

  const value = {
    selectedHandedness,
    setSelectedHandedness,
    handednessDatasets,
    loading,
    loadHandednessDatasets,
    getPlayerHandednessData,
    getPlayerDataForHandedness
  };

  return (
    <HandednessContext.Provider value={value}>
      {children}
    </HandednessContext.Provider>
  );
};

export const useHandedness = () => {
  const context = useContext(HandednessContext);
  if (!context) {
    throw new Error('useHandedness must be used within a HandednessProvider');
  }
  return context;
};

export default HandednessContext;