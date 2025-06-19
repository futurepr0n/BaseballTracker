/**
 * Starting Lineup Service
 * Handles loading and managing MLB starting lineup data for auto-population
 * in Pinheads-Playhouse component
 */

// Cache for lineup data to minimize file reads
const lineupCache = {
  data: null,
  lastLoaded: null,
  cacheTimeout: 15 * 60 * 1000 // 15 minutes
};

/**
 * Format date as string (YYYY-MM-DD)
 */
const formatDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if cached data is still fresh
 */
const isCacheFresh = () => {
  if (!lineupCache.data || !lineupCache.lastLoaded) {
    return false;
  }
  
  const now = Date.now();
  return (now - lineupCache.lastLoaded) < lineupCache.cacheTimeout;
};

/**
 * Load lineup data from file
 */
const loadLineupData = async (dateStr = null) => {
  try {
    if (!dateStr) {
      dateStr = formatDateString(new Date());
    }
    
    const filePath = `/data/lineups/starting_lineups_${dateStr}.json`;
    const response = await fetch(filePath);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Update cache
    lineupCache.data = data;
    lineupCache.lastLoaded = Date.now();
    
    return data;
  } catch (error) {
    console.error(`Error loading lineup data for ${dateStr}:`, error);
    return null;
  }
};

/**
 * Get today's lineup data with caching
 */
export const getTodaysLineups = async (date = null) => {
  try {
    // Use cache if fresh
    if (!date && isCacheFresh()) {
      return lineupCache.data;
    }
    
    const dateStr = date || formatDateString(new Date());
    const data = await loadLineupData(dateStr);
    
    if (data) {
      console.log(`✅ Loaded lineup data: ${data.totalGames} games, ${data.gamesWithLineups} with lineups`);
      return data;
    }
    
    // Try previous day if today's data not available
    if (!date) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDateString(yesterday);
      
      console.warn(`Today's lineup data not available, trying ${yesterdayStr}`);
      return await loadLineupData(yesterdayStr);
    }
    
    return null;
  } catch (error) {
    console.error('Error in getTodaysLineups:', error);
    return null;
  }
};

/**
 * Get matchup data for a specific team
 */
export const getMatchupFromTeam = async (teamAbbr) => {
  try {
    if (!teamAbbr || teamAbbr.length !== 3) {
      return null;
    }
    
    const lineupData = await getTodaysLineups();
    if (!lineupData || !lineupData.quickLookup) {
      return null;
    }
    
    const teamData = lineupData.quickLookup.byTeam[teamAbbr.toUpperCase()];
    if (teamData) {
      return {
        opponentPitcher: teamData.opponentPitcher,
        opponent: teamData.opponent,
        gameTime: teamData.gameTime,
        homeAway: teamData.homeAway,
        confidence: teamData.pitcher !== 'TBD' ? 85 : 50
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting matchup for team ${teamAbbr}:`, error);
    return null;
  }
};

/**
 * Get team data for a specific pitcher
 */
export const getTeamFromPitcher = async (pitcherName) => {
  try {
    if (!pitcherName || pitcherName.length < 3) {
      return null;
    }
    
    const lineupData = await getTodaysLineups();
    if (!lineupData || !lineupData.quickLookup) {
      return null;
    }
    
    // Try exact match first
    let pitcherData = lineupData.quickLookup.byPitcher[pitcherName];
    
    // Try partial match if exact match fails
    if (!pitcherData) {
      const searchName = pitcherName.toLowerCase();
      for (const [pitcher, data] of Object.entries(lineupData.quickLookup.byPitcher)) {
        if (pitcher.toLowerCase().includes(searchName) || searchName.includes(pitcher.toLowerCase())) {
          pitcherData = data;
          break;
        }
      }
    }
    
    if (pitcherData) {
      return {
        team: pitcherData.team,
        opponent: pitcherData.opponent,
        opponentPitcher: pitcherData.opponentPitcher,
        gameTime: pitcherData.gameTime,
        venue: pitcherData.venue,
        confidence: 90
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting team for pitcher ${pitcherName}:`, error);
    return null;
  }
};

/**
 * Get lineup status and freshness information
 */
export const getLineupsStatus = async () => {
  try {
    const lineupData = await getTodaysLineups();
    if (!lineupData) {
      return {
        available: false,
        lastUpdated: null,
        updateCount: 0,
        dataQuality: 'unavailable',
        gamesCount: 0,
        lineupsCount: 0
      };
    }
    
    return {
      available: true,
      lastUpdated: lineupData.lastUpdated,
      updateCount: lineupData.updateCount || 1,
      dataQuality: lineupData.metadata?.dataQuality || 'unknown',
      gamesCount: lineupData.totalGames || 0,
      lineupsCount: lineupData.gamesWithLineups || 0,
      alerts: lineupData.alerts || [],
      nextUpdate: lineupData.metadata?.nextUpdateScheduled
    };
  } catch (error) {
    console.error('Error getting lineup status:', error);
    return {
      available: false,
      lastUpdated: null,
      updateCount: 0,
      dataQuality: 'error',
      gamesCount: 0,
      lineupsCount: 0
    };
  }
};

/**
 * Check if lineup data is fresh (updated within last 4 hours)
 */
export const isLineupDataFresh = (lineupData) => {
  if (!lineupData || !lineupData.lastUpdated) {
    return false;
  }
  
  try {
    const lastUpdated = new Date(lineupData.lastUpdated);
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000));
    
    return lastUpdated > fourHoursAgo;
  } catch (error) {
    console.error('Error checking data freshness:', error);
    return false;
  }
};

/**
 * Get available lineup dates (for historical lookup)
 */
export const getAvailableLineupDates = async () => {
  const dates = [];
  const today = new Date();
  
  // Check last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatDateString(date);
    
    try {
      const data = await loadLineupData(dateStr);
      if (data) {
        dates.push({
          date: dateStr,
          gamesCount: data.totalGames || 0,
          lineupsCount: data.gamesWithLineups || 0,
          quality: data.metadata?.dataQuality || 'unknown'
        });
      }
    } catch (error) {
      // Ignore errors for missing dates
    }
  }
  
  return dates;
};

/**
 * Force refresh lineup data from MLB API (fetches new data)
 */
export const refreshLineupData = async () => {
  try {
    console.log('🔄 Requesting fresh lineup data from MLB API...');
    
    // Call the BaseballAPI to fetch fresh data
    const response = await fetch('http://localhost:8000/refresh-lineups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Refresh failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Fresh lineup data fetched successfully');
      
      // Clear cache and reload from new file
      lineupCache.data = null;
      lineupCache.lastLoaded = null;
      
      return await getTodaysLineups();
    } else {
      throw new Error(result.message || 'Refresh failed');
    }
    
  } catch (error) {
    console.error('❌ Failed to refresh lineup data:', error);
    
    // Fallback to cache clear only
    console.log('🔄 Falling back to cache refresh only...');
    lineupCache.data = null;
    lineupCache.lastLoaded = null;
    return await getTodaysLineups();
  }
};

/**
 * Get all today's matchups for quick reference
 */
export const getTodaysMatchups = async () => {
  try {
    const lineupData = await getTodaysLineups();
    if (!lineupData || !lineupData.games) {
      return [];
    }
    
    // Use actual games data instead of quickLookup to get all games including doubleheaders
    const matchups = lineupData.games.map(game => ({
      away: game.teams.away.abbr,
      home: game.teams.home.abbr,
      awayPitcher: game.pitchers.away.name,
      homePitcher: game.pitchers.home.name,
      gameTime: game.gameTime,
      gameId: game.gameId,
      matchupKey: game.matchupKey || `${game.teams.away.abbr}@${game.teams.home.abbr}_${game.gameTime}`,
      venue: game.venue.name,
      status: game.status
    }));
    
    return matchups.sort((a, b) => a.gameTime.localeCompare(b.gameTime));
  } catch (error) {
    console.error('Error getting today\'s matchups:', error);
    return [];
  }
};

/**
 * Auto-populate form based on partial input
 */
export const autoPopulateForm = async (pitcherName = '', teamAbbr = '') => {
  const result = {
    pitcher: pitcherName,
    team: teamAbbr,
    confidence: 0,
    source: 'manual'
  };
  
  try {
    // If pitcher provided, try to get team
    if (pitcherName && !teamAbbr) {
      const pitcherData = await getTeamFromPitcher(pitcherName);
      if (pitcherData) {
        result.team = pitcherData.opponent; // Opponent is who they're facing
        result.confidence = pitcherData.confidence;
        result.source = 'pitcher_lookup';
        result.gameInfo = {
          venue: pitcherData.venue,
          gameTime: pitcherData.gameTime,
          pitcherTeam: pitcherData.team
        };
      }
    }
    
    // If team provided, try to get pitcher
    if (teamAbbr && !pitcherName) {
      const matchupData = await getMatchupFromTeam(teamAbbr);
      if (matchupData) {
        result.pitcher = matchupData.opponentPitcher;
        result.confidence = matchupData.confidence;
        result.source = 'team_lookup';
        result.gameInfo = {
          gameTime: matchupData.gameTime,
          homeAway: matchupData.homeAway,
          opponent: matchupData.opponent
        };
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error in auto-populate:', error);
    return result;
  }
};

export default {
  getTodaysLineups,
  getMatchupFromTeam,
  getTeamFromPitcher,
  getLineupsStatus,
  isLineupDataFresh,
  getAvailableLineupDates,
  refreshLineupData,
  getTodaysMatchups,
  autoPopulateForm
};