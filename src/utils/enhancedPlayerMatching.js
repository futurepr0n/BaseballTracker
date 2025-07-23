/**
 * Enhanced player matching utility extracted from bet slip scanner logic
 * Provides sophisticated name matching for CapSheet scratchpad dump functionality
 */

import { normalizeToEnglish, namesMatch } from './universalNameNormalizer';

/**
 * Clean and normalize player name for matching
 * Based on bet slip scanner preprocessing logic
 */
const cleanPlayerName = (name) => {
  if (!name) return '';
  
  let cleaned = name.toLowerCase().trim();
  
  // Remove common prefixes that can interfere with matching
  const prefixPatterns = [
    /^a\s+/,           // "a Riley Greene" → "Riley Greene"
    /^ro\s+/,          // "ro Seiya Suzuki" → "Seiya Suzuki"  
    /^\w{1,2}\s+/      // Any 1-2 character prefix + space
  ];
  
  for (const pattern of prefixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};

/**
 * Find player in roster data using multiple matching strategies
 * Based on findPlayerInRoster from bet slip scanner
 */
export const findPlayerInRoster = (searchName, rosterData) => {
  if (!searchName || !rosterData) return null;
  
  // 1. Exact matches first
  let match = rosterData.find(player => {
    const playerNames = [player.name, player.fullName].filter(Boolean);
    return playerNames.some(pName => pName === searchName);
  });
  
  if (match) return match;
  
  // 2. Normalized matching (handles accents/special chars)
  const searchNormalized = normalizeToEnglish(searchName);
  match = rosterData.find(player => {
    const playerNames = [player.name, player.fullName].filter(Boolean);
    return playerNames.some(pName => normalizeToEnglish(pName) === searchNormalized);
  });
  
  if (match) return match;
  
  // 3. Comprehensive variant matching
  match = rosterData.find(player => {
    const playerNames = [player.name, player.fullName].filter(Boolean);
    return playerNames.some(pName => namesMatch(searchName, pName));
  });
  
  return match;
};

/**
 * Find best player match in select options using multiple strategies
 * Based on bet slip scanner's findBestPlayerMatch logic
 */
export const findBestPlayerMatch = (playerName, playerTeam, selectOptions) => {
  if (!playerName || !selectOptions) return null;
  
  const cleanName = cleanPlayerName(playerName);
  const nameParts = cleanName.split(' ');
  
  // Strategy 1: Exact match in options
  let match = selectOptions.find(option => 
    option.label.toLowerCase().includes(cleanName.toLowerCase())
  );
  
  if (match) return match;
  
  // Strategy 2: Abbreviated name matching (First initial + Last name)
  if (nameParts.length > 1) {
    const abbreviatedName = `${nameParts[0][0]}. ${nameParts.slice(1).join(' ')}`;
    match = selectOptions.find(option => 
      option.label.toLowerCase().includes(abbreviatedName.toLowerCase())
    );
    
    if (match) return match;
  }
  
  // Strategy 3: Last name matching with team filtering
  if (nameParts.length > 1) {
    const lastName = nameParts[nameParts.length - 1];
    const possibleMatches = selectOptions.filter(option => 
      option.label.toLowerCase().includes(lastName.toLowerCase())
    );
    
    // If we have team info and multiple matches, filter by team
    if (playerTeam && possibleMatches.length > 1) {
      const teamMatches = possibleMatches.filter(option => {
        const teamInfo = option.label.match(/\(([^)]+)\)/);
        return teamInfo && teamInfo[1] && 
               teamInfo[1].toLowerCase() === playerTeam.toLowerCase();
      });
      if (teamMatches.length > 0) return teamMatches[0];
    }
    
    // Return first match if we have possibles
    if (possibleMatches.length > 0) return possibleMatches[0];
  }
  
  // Strategy 4: Fuzzy matching with normalized names
  const normalizedSearch = normalizeToEnglish(cleanName);
  match = selectOptions.find(option => {
    const normalizedLabel = normalizeToEnglish(option.label.toLowerCase());
    return normalizedLabel.includes(normalizedSearch);
  });
  
  return match;
};

/**
 * Validate scratchpad players against roster data
 * Based on validateScannedPlayers from bet slip scanner
 */
export const validateScratchpadPlayers = async (scratchpadPlayers, rosterData) => {
  const validPlayers = [];
  const invalidEntries = [];
  const warnings = [];
  
  for (const scratchpadPlayer of scratchpadPlayers) {
    try {
      // Validate against roster
      const rosterMatch = findPlayerInRoster(scratchpadPlayer.name, rosterData);
      
      if (rosterMatch) {
        validPlayers.push({
          ...scratchpadPlayer,
          ...rosterMatch,
          validated: true,
          _rosterMatch: true
        });
      } else {
        invalidEntries.push({
          originalName: scratchpadPlayer.name,
          team: scratchpadPlayer.team,
          reason: 'Player not found in roster',
          playerType: scratchpadPlayer.playerType,
          scratchpadData: scratchpadPlayer
        });
      }
    } catch (error) {
      warnings.push({
        player: scratchpadPlayer.name,
        message: `Validation error: ${error.message}`
      });
    }
  }
  
  return { validPlayers, invalidEntries, warnings };
};

/**
 * Process scratchpad player for CapSheet addition
 * Returns match result with success/failure details
 */
export const processScratchpadPlayerForCapSheet = (player, selectOptions, existingPlayers = []) => {
  // Check if player already exists
  const existingPlayer = existingPlayers.find(p => 
    p.name === player.name && p.team === player.team
  );
  
  if (existingPlayer) {
    return {
      success: false,
      reason: 'already_exists',
      player: player,
      message: `${player.name} already in table`
    };
  }
  
  // Find match in select options
  const match = findBestPlayerMatch(player.name, player.team, selectOptions);
  
  if (match) {
    return {
      success: true,
      player: player,
      match: match,
      playerId: match.value,
      message: `Found match for ${player.name}`
    };
  } else {
    return {
      success: false,
      reason: 'no_match',
      player: player,
      message: `No match found for ${player.name} (${player.team})`
    };
  }
};

export default {
  findPlayerInRoster,
  findBestPlayerMatch,
  validateScratchpadPlayers,
  processScratchpadPlayerForCapSheet,
  cleanPlayerName
};