/**
 * Team Normalization Utilities
 * Handles team abbreviation inconsistencies across different data sources
 * 
 * Solves critical issues:
 * - Chicago White Sox: CHW (rosters) vs CWS (lineups, scraper)
 * - Oakland Athletics: ATH vs OAK variations
 * - Other team abbreviation mismatches
 */

/**
 * Team mappings for known abbreviation inconsistencies
 * Includes bidirectional mappings to handle all data sources
 */
const TEAM_MAPPINGS = {
  // Forward mappings (less common → standard)
  'ATH': 'OAK',  // Athletics
  'CWS': 'CHW',  // White Sox  
  'LAD': 'LA',   // Dodgers
  'NYM': 'NYN',  // Mets
  'NYY': 'NY',   // Yankees
  'SD': 'SDN',   // Padres
  'SF': 'SFN',   // Giants
  'TB': 'TBR',   // Rays
  'WSH': 'WAS',  // Nationals
  
  // Reverse mappings (standard → less common)
  'OAK': 'ATH',
  'CHW': 'CWS', 
  'LA': 'LAD',
  'NYN': 'NYM',
  'NY': 'NYY',
  'SDN': 'SD',
  'SFN': 'SF',
  'TBR': 'TB',
  'WAS': 'WSH'
};

/**
 * Normalize team abbreviation to handle inconsistencies
 * @param {string} team - Team abbreviation to normalize
 * @returns {string} - Normalized team abbreviation, or original if no mapping exists
 */
export const normalizeTeamAbbreviation = (team) => {
  if (!team || typeof team !== 'string') {
    return team;
  }
  
  const upperTeam = team.toUpperCase();
  return TEAM_MAPPINGS[upperTeam] || upperTeam;
};

/**
 * Get all possible team abbreviations for a given team
 * Useful for comprehensive matching across different data sources
 * @param {string} team - Team abbreviation
 * @returns {string[]} - Array of all possible abbreviations for this team
 */
export const getAllTeamVariants = (team) => {
  if (!team || typeof team !== 'string') {
    return [team];
  }
  
  const upperTeam = team.toUpperCase();
  const variants = new Set([upperTeam]);
  
  // Add mapped variant if it exists
  const mapped = TEAM_MAPPINGS[upperTeam];
  if (mapped) {
    variants.add(mapped);
  }
  
  // Check reverse mapping
  const reverseMapping = Object.entries(TEAM_MAPPINGS).find(([key, value]) => value === upperTeam);
  if (reverseMapping) {
    variants.add(reverseMapping[0]);
  }
  
  return Array.from(variants);
};

/**
 * Check if two team abbreviations refer to the same team
 * Handles all known abbreviation variations
 * @param {string} team1 - First team abbreviation
 * @param {string} team2 - Second team abbreviation  
 * @returns {boolean} - True if teams match (considering variations)
 */
export const teamsMatch = (team1, team2) => {
  if (!team1 || !team2) {
    return false;
  }
  
  const normalized1 = normalizeTeamAbbreviation(team1);
  const normalized2 = normalizeTeamAbbreviation(team2);
  
  // Direct match
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Check if they map to each other
  return TEAM_MAPPINGS[normalized1] === normalized2 || 
         TEAM_MAPPINGS[normalized2] === normalized1;
};

/**
 * Get standardized team abbreviation for consistent display
 * Returns the most commonly used abbreviation across the system
 * @param {string} team - Team abbreviation
 * @returns {string} - Standardized team abbreviation
 */
export const getStandardTeamAbbreviation = (team) => {
  if (!team || typeof team !== 'string') {
    return team;
  }
  
  const upperTeam = team.toUpperCase();
  
  // Define preferred standard abbreviations
  const standardMappings = {
    'CWS': 'CHW',  // Prefer CHW for Chicago White Sox
    'ATH': 'OAK',  // Prefer OAK for Oakland Athletics
    'LA': 'LAD',   // Prefer LAD for Los Angeles Dodgers
    'NYN': 'NYM',  // Prefer NYM for New York Mets
    'NY': 'NYY',   // Prefer NYY for New York Yankees
    'SDN': 'SD',   // Prefer SD for San Diego Padres
    'SFN': 'SF',   // Prefer SF for San Francisco Giants
    'TBR': 'TB',   // Prefer TB for Tampa Bay Rays
    'WAS': 'WSH'   // Prefer WSH for Washington Nationals
  };
  
  return standardMappings[upperTeam] || upperTeam;
};

export default {
  normalizeTeamAbbreviation,
  getAllTeamVariants,
  teamsMatch,
  getStandardTeamAbbreviation
};