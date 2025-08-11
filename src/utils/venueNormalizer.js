/**
 * Venue Normalization Utility
 * 
 * Handles inconsistencies between MLB API venue names and traditional venue names
 * used throughout the baseball analysis system.
 */

// Mapping from MLB API venue names to traditional/standard names
const VENUE_NORMALIZATIONS = {
  // Chicago White Sox - MLB API uses shortened name
  'Rate Field': 'Guaranteed Rate Field',
  
  // Houston Astros - Recent corporate naming changes
  'Daikin Park': 'Minute Maid Park',
  
  // Oakland Athletics - Corporate vs traditional naming
  'Sutter Health Park': 'Oakland Coliseum',
  
  // Add more mappings as needed based on MLB API changes
  // Format: 'MLB API Name': 'Traditional Name'
};

/**
 * Normalizes venue names from MLB API format to standard traditional names
 * @param {string} venueName - The venue name from MLB API
 * @returns {string} - The normalized traditional venue name
 */
export const normalizeVenueName = (venueName) => {
  if (!venueName || typeof venueName !== 'string') {
    return 'Unknown Venue';
  }
  
  // Return normalized name if mapping exists, otherwise return original
  return VENUE_NORMALIZATIONS[venueName] || venueName;
};

/**
 * Safely extracts and normalizes venue name from various data formats
 * @param {string|object} venue - Venue data (string or object with name property)
 * @returns {string} - The normalized venue name for display
 */
export const getVenueName = (venue) => {
  // Handle null/undefined
  if (!venue) {
    return 'TBD';
  }
  
  // Handle string format (traditional game data)
  if (typeof venue === 'string') {
    return normalizeVenueName(venue);
  }
  
  // Handle object format (MLB API lineup data)
  if (venue?.name) {
    return normalizeVenueName(venue.name);
  }
  
  // Fallback for unexpected formats
  console.warn('Unexpected venue format:', venue);
  return 'Unknown Venue';
};

/**
 * Normalizes venue data in game objects to consistent string format
 * @param {object} game - Game object with potentially inconsistent venue format
 * @returns {object} - Game object with normalized venue string
 */
export const normalizeGameVenue = (game) => {
  if (!game) return game;
  
  return {
    ...game,
    venue: getVenueName(game.venue)
  };
};

/**
 * Normalizes venue data in an array of games
 * @param {Array} games - Array of game objects
 * @returns {Array} - Array of games with normalized venue names
 */
export const normalizeGamesVenues = (games) => {
  if (!Array.isArray(games)) return games;
  
  return games.map(normalizeGameVenue);
};