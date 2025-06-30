// Player name standardization utilities
// Ensures consistent player name display across all components

/**
 * Gets the best available player name, preferring fullName over name
 * @param {Object} player - Player object that may have name, fullName, playerName properties
 * @returns {string} - The best available player name
 */
export const getPlayerDisplayName = (player) => {
  if (!player) return 'Unknown Player';
  
  // Try different property names that cards might use
  const fullName = player.fullName || player.full_name || player.playerFullName;
  const name = player.name || player.playerName || player.player_name;
  
  // Return fullName if available, otherwise fallback to name
  return fullName || name || 'Unknown Player';
};

/**
 * Gets team abbreviation for display, handling long team names
 * @param {Object} player - Player object with team information
 * @returns {string} - Team abbreviation (3-letter code)
 */
export const getTeamDisplayName = (player) => {
  if (!player) return '';
  
  // Try different team property names
  const team = player.team || player.Team || player.teamAbbr;
  
  if (!team) return '';
  
  // If it's already 3 characters or less, return as-is
  if (team.length <= 3) return team;
  
  // Map of common long team names to abbreviations
  const teamMap = {
    'Diamondbacks': 'ARI',
    'Braves': 'ATL', 
    'Orioles': 'BAL',
    'Red Sox': 'BOS',
    'Cubs': 'CHC',
    'White Sox': 'CWS',
    'Reds': 'CIN',
    'Guardians': 'CLE',
    'Rockies': 'COL',
    'Tigers': 'DET',
    'Astros': 'HOU',
    'Royals': 'KC',
    'Angels': 'LAA',
    'Dodgers': 'LAD',
    'Marlins': 'MIA',
    'Brewers': 'MIL',
    'Twins': 'MIN',
    'Mets': 'NYM',
    'Yankees': 'NYY',
    'Athletics': 'OAK',
    'Phillies': 'PHI',
    'Pirates': 'PIT',
    'Padres': 'SD',
    'Giants': 'SF',
    'Mariners': 'SEA',
    'Cardinals': 'STL',
    'Rays': 'TB',
    'Rangers': 'TEX',
    'Blue Jays': 'TOR',
    'Nationals': 'WAS'
  };
  
  return teamMap[team] || team.substring(0, 3).toUpperCase();
};

/**
 * Formats opponent display text for "vs" scenarios
 * Only shows opponent team, not player's team (since it's in the rank symbol)
 * @param {Object} player - Player object
 * @param {string} opponent - Opponent team or info
 * @returns {string} - Formatted opponent display
 */
export const getOpponentDisplayText = (player, opponent) => {
  if (!opponent) return '';
  
  // If opponent already starts with "vs", clean it up
  if (opponent.toLowerCase().startsWith('vs ')) {
    opponent = opponent.substring(3).trim();
  }
  
  // If opponent contains the player's team, remove it
  const playerTeam = getTeamDisplayName(player);
  if (opponent.includes(playerTeam)) {
    // Extract just the opponent team
    const parts = opponent.split(' vs ');
    const opponentTeam = parts.find(part => !part.includes(playerTeam));
    return opponentTeam ? `vs ${getTeamDisplayName({ team: opponentTeam })}` : `vs ${opponent}`;
  }
  
  return `vs ${getTeamDisplayName({ team: opponent })}`;
};

/**
 * Gets a shortened description for player-item displays
 * @param {string} description - Full description
 * @param {number} maxLength - Maximum length (default 30)
 * @returns {string} - Shortened description
 */
export const getShortDescription = (description, maxLength = 30) => {
  if (!description) return '';
  
  if (description.length <= maxLength) return description;
  
  return description.substring(0, maxLength - 3) + '...';
};

/**
 * Standardizes player-item data for consistent display
 * @param {Object} player - Raw player data
 * @returns {Object} - Standardized player data
 */
export const standardizePlayerData = (player) => {
  if (!player) return null;
  
  return {
    ...player,
    displayName: getPlayerDisplayName(player),
    teamAbbr: getTeamDisplayName(player),
    // Preserve original properties for backward compatibility
    name: player.name || player.playerName,
    fullName: player.fullName || player.full_name,
    team: player.team || player.Team
  };
};