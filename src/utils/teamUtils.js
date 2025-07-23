/**
 * Team utilities for logo URLs and team colors
 */

// Team logo mappings
const TEAM_LOGOS = {
  'ARI': '/data/logos/arizona-diamondbacks.png',
  'ATL': '/data/logos/atlanta-braves.png',
  'BAL': '/data/logos/baltimore-orioles.png',
  'BOS': '/data/logos/boston-red-sox.png',
  'CHC': '/data/logos/chicago-cubs.png',
  'CHW': '/data/logos/chicago-white-sox.png',
  'CIN': '/data/logos/cincinnati-reds.png',
  'CLE': '/data/logos/cleveland-guardians.png',
  'COL': '/data/logos/colorado-rockies.png',
  'DET': '/data/logos/detroit-tigers.png',
  'HOU': '/data/logos/houston-astros.png',
  'KC': '/data/logos/kansas-city-royals.png',
  'LAA': '/data/logos/los-angeles-angels.png',
  'LAD': '/data/logos/los-angeles-dodgers.png',
  'MIA': '/data/logos/miami-marlins.png',
  'MIL': '/data/logos/milwaukee-brewers.png',
  'MIN': '/data/logos/minnesota-twins.png',
  'NYM': '/data/logos/new-york-mets.png',
  'NYY': '/data/logos/new-york-yankees.png',
  'OAK': '/data/logos/oakland-athletics.png',
  'PHI': '/data/logos/philadelphia-phillies.png',
  'PIT': '/data/logos/pittsburgh-pirates.png',
  'SD': '/data/logos/san-diego-padres.png',
  'SF': '/data/logos/san-francisco-giants.png',
  'SEA': '/data/logos/seattle-mariners.png',
  'STL': '/data/logos/st-louis-cardinals.png',
  'TB': '/data/logos/tampa-bay-rays.png',
  'TEX': '/data/logos/texas-rangers.png',
  'TOR': '/data/logos/toronto-blue-jays.png',
  'WSH': '/data/logos/washington-nationals.png'
};

// Team color mappings
const TEAM_COLORS = {
  'ARI': '#A71930',
  'ATL': '#CE1141',
  'BAL': '#DF4601',
  'BOS': '#BD3039',
  'CHC': '#0E3386',
  'CHW': '#27251F',
  'CIN': '#C6011F',
  'CLE': '#E31937',
  'COL': '#33006F',
  'DET': '#0C2340',
  'HOU': '#002D62',
  'KC': '#004687',
  'LAA': '#BA0021',
  'LAD': '#005A9C',
  'MIA': '#00A3E0',
  'MIL': '#12284B',
  'MIN': '#002B5C',
  'NYM': '#002D72',
  'NYY': '#132448',
  'OAK': '#003831',
  'PHI': '#E81828',
  'PIT': '#FDB827',
  'SD': '#2F241D',
  'SF': '#FD5A1E',
  'SEA': '#0C2C56',
  'STL': '#C41E3A',
  'TB': '#092C5C',
  'TEX': '#003278',
  'TOR': '#134A8E',
  'WSH': '#AB0003'
};

/**
 * Get team logo URL for a given team code
 * @param {string} teamCode - Team abbreviation (e.g., 'NYY', 'BOS')
 * @returns {string|null} - Team logo URL or null if not found
 */
export const getTeamLogoUrl = (teamCode) => {
  if (!teamCode) return null;
  return TEAM_LOGOS[teamCode.toUpperCase()] || null;
};

/**
 * Get team primary color for a given team code
 * @param {string} teamCode - Team abbreviation (e.g., 'NYY', 'BOS')
 * @returns {string} - Team primary color hex code or default blue
 */
export const getTeamColor = (teamCode) => {
  if (!teamCode) return '#4f46e5';
  return TEAM_COLORS[teamCode.toUpperCase()] || '#4f46e5';
};

/**
 * Get team data object with logo and color
 * @param {string} teamCode - Team abbreviation
 * @returns {Object} - Object with logoUrl and primaryColor
 */
export const getTeamData = (teamCode) => {
  return {
    logoUrl: getTeamLogoUrl(teamCode),
    primaryColor: getTeamColor(teamCode)
  };
};

/**
 * Check if team logo exists
 * @param {string} teamCode - Team abbreviation
 * @returns {boolean} - True if team logo mapping exists
 */
export const hasTeamLogo = (teamCode) => {
  if (!teamCode) return false;
  return teamCode.toUpperCase() in TEAM_LOGOS;
};

export default {
  getTeamLogoUrl,
  getTeamColor,
  getTeamData,
  hasTeamLogo
};