import { useState, useEffect } from 'react';

/**
 * Custom hook to manage slips (saved player selections)
 * @param {string} formattedDate - The current date in formatted string for saving with slips
 * @returns {Object} Slip state and methods
 */
const useSlips = (formattedDate) => {
  // State for saving and loading slips
  const [savedSlips, setSavedSlips] = useState([]);
  const [showSlipGallery, setShowSlipGallery] = useState(false);
  const [slipName, setSlipName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Generate a unique slip ID
  const generateSlipId = () => `slip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Load saved slips from localStorage on component mount
  useEffect(() => {
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

  // Save a slip with the current player data
  const saveSlip = (playerData) => {
    if (!slipName.trim()) {
      alert('Please enter a name for this slip');
      return false;
    }

    const newSlip = {
      id: generateSlipId(),
      name: slipName,
      date: formattedDate,
      timestamp: Date.now(),
      data: playerData
    };

    const updatedSlips = [...savedSlips, newSlip];
    setSavedSlips(updatedSlips);

    try {
      localStorage.setItem('capsheet_slips', JSON.stringify(updatedSlips));
      alert(`Slip "${slipName}" saved successfully!`);
      setSlipName('');
      setShowSaveModal(false);
      return true;
    } catch (error) {
      console.error('Error saving slip:', error);
      alert('Failed to save slip. Local storage might be full or unavailable.');
      return false;
    }
  };

  // Load a saved slip
  const loadSlip = (slip) => {
    const confirmed = window.confirm(`Load slip "${slip.name}"? This will replace your current selections.`);
    if (!confirmed) return null;

    // Basic validation of loaded data structure
    if (slip.data && slip.data.hitters && slip.data.pitchers) {
      setShowSlipGallery(false);
      alert(`Slip "${slip.name}" loaded.`);
      return slip.data;
    } else {
      alert(`Error: Slip data for "${slip.name}" appears to be corrupted.`);
      console.error("Corrupted slip data:", slip);
      return null;
    }
  };

  // Delete a saved slip
  const deleteSlip = (slipId) => {
    const confirmed = window.confirm('Are you sure you want to delete this slip?');
    if (!confirmed) return false;

    const updatedSlips = savedSlips.filter(slip => slip.id !== slipId);
    setSavedSlips(updatedSlips);
    try {
      localStorage.setItem('capsheet_slips', JSON.stringify(updatedSlips));
      return true;
    } catch (error) {
      console.error('Error updating localStorage after deletion:', error);
      return false;
    }
  };

  return {
    // State
    savedSlips,
    showSlipGallery,
    setShowSlipGallery,
    slipName,
    setSlipName,
    showSaveModal,
    setShowSaveModal,
    // Methods
    saveSlip,
    loadSlip,
    deleteSlip
  };
};

export default useSlips;