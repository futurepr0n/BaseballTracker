// Name normalization utilities for handling special characters
// Ensures consistent name matching across all data sources

/**
 * Normalize a name by removing accents and special characters
 * @param {string} name - The name to normalize
 * @returns {string} - Normalized name
 */
export const normalizeName = (name) => {
  if (!name) return '';
  
  // Normalize Unicode characters - converts á→a, é→e, í→i, ñ→n, etc.
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return normalized;
};

/**
 * Create multiple name variants for matching
 * @param {string} name - The player name
 * @returns {string[]} - Array of name variants
 */
export const createNameVariants = (name) => {
  if (!name) return [];
  
  const variants = new Set();
  
  // Add original name
  variants.add(name);
  
  // Add normalized version
  const normalized = normalizeName(name);
  variants.add(normalized);
  
  // Handle "Last, First" format
  if (name.includes(',')) {
    const parts = name.split(',').map(p => p.trim());
    if (parts.length === 2) {
      const firstLast = `${parts[1]} ${parts[0]}`;
      variants.add(firstLast);
      variants.add(normalizeName(firstLast));
    }
  }
  
  // Handle "F. Last" format
  if (name.includes('.') && name.split(' ').length >= 2) {
    const parts = name.split(' ');
    const firstInitial = parts[0];
    const lastName = parts.slice(1).join(' ');
    
    // Try to find full first name match
    variants.add(`${firstInitial} ${lastName}`);
    variants.add(normalizeName(`${firstInitial} ${lastName}`));
  }
  
  // Handle full name to initial format
  const nameParts = name.split(' ');
  if (nameParts.length >= 2 && !name.includes('.')) {
    const initial = nameParts[0][0];
    const lastName = nameParts.slice(1).join(' ');
    variants.add(`${initial}. ${lastName}`);
    variants.add(normalizeName(`${initial}. ${lastName}`));
  }
  
  // Add lowercase versions
  Array.from(variants).forEach(v => {
    variants.add(v.toLowerCase());
  });
  
  return Array.from(variants);
};

/**
 * Match a player name across different formats
 * @param {string} searchName - The name to search for
 * @param {string[]} possibleNames - Array of possible name matches
 * @returns {boolean} - True if match found
 */
export const isNameMatch = (searchName, possibleNames) => {
  if (!searchName || !possibleNames || possibleNames.length === 0) return false;
  
  const searchVariants = createNameVariants(searchName);
  const possibleVariants = possibleNames.flatMap(name => createNameVariants(name));
  
  // Check if any search variant matches any possible variant
  return searchVariants.some(sv => 
    possibleVariants.some(pv => sv === pv)
  );
};

/**
 * Get the best matching name from a list
 * @param {string} searchName - The name to search for
 * @param {Object[]} playerList - Array of player objects with name properties
 * @returns {Object|null} - Best matching player object or null
 */
export const findBestPlayerMatch = (searchName, playerList) => {
  if (!searchName || !playerList || playerList.length === 0) return null;
  
  // Try exact match first
  let match = playerList.find(player => {
    const names = [
      player.name,
      player.fullName,
      player.playerName,
      player.player_name
    ].filter(Boolean);
    
    return names.some(name => name === searchName);
  });
  
  if (match) return match;
  
  // Try normalized matching
  const searchNormalized = normalizeName(searchName);
  match = playerList.find(player => {
    const names = [
      player.name,
      player.fullName,
      player.playerName,
      player.player_name
    ].filter(Boolean);
    
    return names.some(name => normalizeName(name) === searchNormalized);
  });
  
  if (match) return match;
  
  // Try variant matching
  match = playerList.find(player => {
    const names = [
      player.name,
      player.fullName,
      player.playerName,
      player.player_name
    ].filter(Boolean);
    
    return isNameMatch(searchName, names);
  });
  
  return match;
};

// Export all functions
export default {
  normalizeName,
  createNameVariants,
  isNameMatch,
  findBestPlayerMatch
};