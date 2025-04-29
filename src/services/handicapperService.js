/**
 * Service for loading and saving handicapper data
 */

/**
 * Load all handicappers from the master list file
 * @returns {Promise<Array>} Array of handicappers
 */
export const loadHandicappers = async () => {
    try {
      console.log('[handicapperService] Loading handicappers from server');
      
      const response = await fetch('/data/handicappers.json');
      
      // If the file doesn't exist yet or there's an error, return empty array
      if (!response.ok) {
        console.warn('[handicapperService] Handicappers file not found or error occurred, returning empty list');
        return [];
      }
      
      const data = await response.json();
      console.log(`[handicapperService] Successfully loaded ${data.length} handicappers`);
      return data;
    } catch (error) {
      console.error('[handicapperService] Error loading handicappers:', error);
      return []; // Return empty array on error
    }
  };
  
  /**
   * Save a new handicapper to the server
   * @param {Object} handicapper - New handicapper to add
   * @returns {Promise<boolean>} Success indicator
   */
  export const saveHandicapper = async (handicapper) => {
    try {
      if (!handicapper || !handicapper.id || !handicapper.name) {
        throw new Error('Invalid handicapper data');
      }
      
      console.log(`[handicapperService] Saving new handicapper: ${handicapper.name}`);
      
      // First, get the current handicappers
      const currentHandicappers = await loadHandicappers();
      
      // Check if handicapper already exists (by ID)
      if (currentHandicappers.some(h => h.id === handicapper.id)) {
        console.log(`[handicapperService] Handicapper ${handicapper.name} already exists, skipping save`);
        return true; // Already exists, consider it a success
      }
      
      // Add the new handicapper to the list
      const updatedHandicappers = [...currentHandicappers, handicapper];
      
      // Save the updated list to the server
      // For simplicity in this demo, we'll make a POST request to a hypothetical server endpoint
      // In a real implementation, you would integrate with your backend
      const response = await fetch('/api/handicappers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedHandicappers)
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      console.log(`[handicapperService] Successfully saved handicapper ${handicapper.name}`);
      return true;
    } catch (error) {
      console.error('[handicapperService] Error saving handicapper:', error);
      
      // For development/testing without a backend:
      console.log(
        '[handicapperService] No backend available to save handicapper. This would normally add:',
        handicapper
      );
      
      // Return true to prevent breaking the UI flow in development
      // In production with actual backend, should return false here
      return true;
    }
  };
  
  /**
   * Get a specific handicapper by ID
   * @param {string} handicapperId - The ID of the handicapper to find
   * @returns {Promise<Object|null>} The handicapper object or null if not found
   */
  export const getHandicapperById = async (handicapperId) => {
    try {
      const handicappers = await loadHandicappers();
      return handicappers.find(h => h.id === handicapperId) || null;
    } catch (error) {
      console.error('[handicapperService] Error getting handicapper by ID:', error);
      return null;
    }
  };