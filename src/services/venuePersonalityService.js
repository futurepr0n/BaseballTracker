/**
 * Venue Personality Service
 * Analyzes player venue preferences and psychological factors
 */

import { fetchPlayerDataForDateRange } from './dataService';

class VenuePersonalityService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.stadiumLocations = this.initializeStadiumData();
  }

  initializeStadiumData() {
    return {
      'LAA': { city: 'Anaheim', state: 'CA', timezone: 'America/Los_Angeles', climate: 'warm_dry', altitude: 150 },
      'HOU': { city: 'Houston', state: 'TX', timezone: 'America/Chicago', climate: 'warm_humid', altitude: 43 },
      'OAK': { city: 'Oakland', state: 'CA', timezone: 'America/Los_Angeles', climate: 'moderate_dry', altitude: 56 },
      'TOR': { city: 'Toronto', state: 'ON', timezone: 'America/Toronto', climate: 'cool_moderate', altitude: 173 },
      'ATL': { city: 'Atlanta', state: 'GA', timezone: 'America/New_York', climate: 'warm_humid', altitude: 1050 },
      'MIL': { city: 'Milwaukee', state: 'WI', timezone: 'America/Chicago', climate: 'cool_moderate', altitude: 635 },
      'STL': { city: 'St. Louis', state: 'MO', timezone: 'America/Chicago', climate: 'warm_humid', altitude: 465 },
      'CHC': { city: 'Chicago', state: 'IL', timezone: 'America/Chicago', climate: 'cool_moderate', altitude: 595 },
      'ARI': { city: 'Phoenix', state: 'AZ', timezone: 'America/Phoenix', climate: 'hot_dry', altitude: 1090 },
      'LAD': { city: 'Los Angeles', state: 'CA', timezone: 'America/Los_Angeles', climate: 'warm_dry', altitude: 340 },
      'SF': { city: 'San Francisco', state: 'CA', timezone: 'America/Los_Angeles', climate: 'cool_dry', altitude: 63 },
      'CLE': { city: 'Cleveland', state: 'OH', timezone: 'America/New_York', climate: 'cool_moderate', altitude: 650 },
      'SEA': { city: 'Seattle', state: 'WA', timezone: 'America/Los_Angeles', climate: 'cool_moderate', altitude: 59 },
      'MIA': { city: 'Miami', state: 'FL', timezone: 'America/New_York', climate: 'warm_humid', altitude: 8 },
      'NYM': { city: 'New York', state: 'NY', timezone: 'America/New_York', climate: 'moderate_humid', altitude: 38 },
      'WSH': { city: 'Washington', state: 'DC', timezone: 'America/New_York', climate: 'moderate_humid', altitude: 56 },
      'BAL': { city: 'Baltimore', state: 'MD', timezone: 'America/New_York', climate: 'moderate_humid', altitude: 54 },
      'SD': { city: 'San Diego', state: 'CA', timezone: 'America/Los_Angeles', climate: 'warm_dry', altitude: 62 },
      'PHI': { city: 'Philadelphia', state: 'PA', timezone: 'America/New_York', climate: 'moderate_humid', altitude: 60 },
      'PIT': { city: 'Pittsburgh', state: 'PA', timezone: 'America/New_York', climate: 'cool_moderate', altitude: 745 },
      'TEX': { city: 'Arlington', state: 'TX', timezone: 'America/Chicago', climate: 'hot_humid', altitude: 551 },
      'TB': { city: 'St. Petersburg', state: 'FL', timezone: 'America/New_York', climate: 'warm_humid', altitude: 11 },
      'BOS': { city: 'Boston', state: 'MA', timezone: 'America/New_York', climate: 'cool_moderate', altitude: 20 },
      'CIN': { city: 'Cincinnati', state: 'OH', timezone: 'America/New_York', climate: 'moderate_humid', altitude: 550 },
      'COL': { city: 'Denver', state: 'CO', timezone: 'America/Denver', climate: 'cool_dry', altitude: 5280 },
      'MIN': { city: 'Minneapolis', state: 'MN', timezone: 'America/Chicago', climate: 'cool_moderate', altitude: 815 },
      'DET': { city: 'Detroit', state: 'MI', timezone: 'America/New_York', climate: 'cool_moderate', altitude: 585 },
      'KC': { city: 'Kansas City', state: 'MO', timezone: 'America/Chicago', climate: 'moderate_humid', altitude: 750 },
      'CHW': { city: 'Chicago', state: 'IL', timezone: 'America/Chicago', climate: 'cool_moderate', altitude: 595 },
      'NYY': { city: 'New York', state: 'NY', timezone: 'America/New_York', climate: 'moderate_humid', altitude: 55 }
    };
  }

  /**
   * Analyze player's venue performance history
   */
  async analyzePlayerVenueHistory(playerName, venue, dateRange = 365) {
    const cacheKey = `venue_history_${playerName}_${venue}_${dateRange}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get player's historical data from multiple recent dates
      const playerGames = [];
      const endDate = new Date();
      
      console.log(`🏟️ Analyzing venue history for ${playerName} at ${venue}`);
      
      // Check last 365 days of games to find venue history (extended from 90)
      for (let i = 1; i <= 365; i++) {
        const checkDate = new Date(endDate);
        checkDate.setDate(endDate.getDate() - i);
        
        try {
          const dateStr = checkDate.toISOString().split('T')[0];
          const historicalData = await this.fetchPlayerDataForDate(dateStr);
          
          if (historicalData && historicalData.players && historicalData.games) {
            // Find this player's games at this specific venue using enhanced linking
            const playerVenueGames = historicalData.players.filter(playerData => {
              const isPlayerMatch = this.isPlayerMatch(playerData, playerName);
              const isAtVenue = this.isPlayerAtVenue(playerData, venue, historicalData.games);
              
              if (isPlayerMatch && isAtVenue) {
                console.log(`🏟️ Found game for ${playerName} at ${venue} on ${dateStr}:`, {
                  player: playerData.name,
                  stats: `${playerData.H || 0}H/${playerData.AB || 0}AB`,
                  HR: playerData.HR || 0,
                  hits: playerData.H || 0
                });
              }
              
              return isPlayerMatch && isAtVenue;
            });
            
            // Enhance player records with venue information
            const enhancedGames = playerVenueGames.map(playerData => ({
              ...playerData,
              venue: this.linkPlayerToVenue(playerData, historicalData.games),
              date: dateStr,
              // Ensure we have numerical values for stats
              H: parseInt(playerData.H) || 0,
              AB: parseInt(playerData.AB) || 0,
              HR: parseInt(playerData.HR) || 0,
              RBI: parseInt(playerData.RBI) || 0,
              BB: parseInt(playerData.BB) || 0,
              R: parseInt(playerData.R) || 0
            }));
            
            playerGames.push(...enhancedGames);
          }
        } catch (dateError) {
          // Skip dates that don't have data
          continue;
        }
        
        // Stop if we have enough games or checked enough dates  
        if (playerGames.length >= 15 || i >= 180) break;
      }
      
      console.log(`🏟️ Found ${playerGames.length} venue games for ${playerName} at ${venue}`);

      // Calculate venue-specific stats
      const venueStats = this.calculateVenueStats(playerGames);
      
      // Determine venue psychology
      const venuePersonality = this.determineVenuePersonality(venueStats, playerGames.length);
      
      const result = {
        venue,
        playerName,
        gamesPlayed: playerGames.length,
        venueStats,
        venuePersonality,
        recentPerformance: this.getRecentVenuePerformance(playerGames),
        careerTrend: this.calculateVenueTrend(playerGames)
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error analyzing venue history:', error);
      return this.getDefaultVenueAnalysis(playerName, venue);
    }
  }

  /**
   * Fetch player data for a specific date with game information
   */
  async fetchPlayerDataForDate(dateStr) {
    try {
      const [year, month, day] = dateStr.split('-');
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                         'july', 'august', 'september', 'october', 'november', 'december'];
      const monthName = monthNames[parseInt(month) - 1];
      
      const response = await fetch(`/data/${year}/${monthName}/${monthName}_${day}_${year}.json`);
      if (!response.ok) return null;
      
      const gameData = await response.json();
      
      // Return both players and games data for proper linking
      return {
        players: gameData.players || [],
        games: gameData.games || [],
        date: dateStr
      };
    } catch (error) {
      console.warn(`Failed to fetch data for ${dateStr}:`, error);
      return null;
    }
  }

  /**
   * Check if player data matches target player name (enhanced for abbreviations)
   */
  isPlayerMatch(playerData, targetPlayerName) {
    const playerName = playerData.name || playerData.fullName || playerData.playerName || '';
    const targetName = targetPlayerName.toLowerCase().trim();
    const currentName = playerName.toLowerCase().trim();
    
    // Exact match
    if (currentName === targetName) return true;
    
    // Parse name parts
    const targetParts = targetName.split(/[\s,\.]+/).filter(p => p.length > 0);
    const currentParts = currentName.split(/[\s,\.]+/).filter(p => p.length > 0);
    
    if (targetParts.length === 0 || currentParts.length === 0) return false;
    
    // Handle abbreviated first names (e.g., "T. Freeman" vs "Tyler Freeman")
    const matchesAbbreviation = (abbrev, fullName) => {
      return abbrev.length === 1 && fullName.toLowerCase().startsWith(abbrev.toLowerCase());
    };
    
    // Try different matching strategies
    for (let targetFirst of targetParts.slice(0, -1)) { // All but last part as potential first names
      for (let currentFirst of currentParts.slice(0, -1)) {
        // Check if one is abbreviation of the other
        if (matchesAbbreviation(targetFirst, currentFirst) || matchesAbbreviation(currentFirst, targetFirst)) {
          // Now check last names
          const targetLast = targetParts[targetParts.length - 1];
          const currentLast = currentParts[currentParts.length - 1];
          
          if (targetLast === currentLast || 
              targetLast.includes(currentLast) || 
              currentLast.includes(targetLast)) {
            console.log(`🏟️ Matched abbreviated name: "${targetPlayerName}" ↔ "${playerName}"`);
            return true;
          }
        }
      }
    }
    
    // Standard name part matching
    if (targetParts.length >= 2 && currentParts.length >= 2) {
      const targetLast = targetParts[targetParts.length - 1];
      const currentLast = currentParts[currentParts.length - 1];
      
      // Last names must match closely
      if (targetLast === currentLast || 
          (targetLast.length > 3 && currentLast.length > 3 && 
           (targetLast.includes(currentLast) || currentLast.includes(targetLast)))) {
        
        // Check first names (can be partial matches)
        const targetFirst = targetParts[0];
        const currentFirst = currentParts[0];
        
        if (targetFirst === currentFirst ||
            targetFirst.includes(currentFirst) ||
            currentFirst.includes(targetFirst) ||
            matchesAbbreviation(targetFirst, currentFirst) ||
            matchesAbbreviation(currentFirst, targetFirst)) {
          console.log(`🏟️ Matched name parts: "${targetPlayerName}" ↔ "${playerName}"`);
          return true;
        }
      }
    }
    
    // Fallback: check if all target parts exist somewhere in current name
    if (targetParts.length >= 2) {
      const allPartsMatch = targetParts.every(part => 
        currentParts.some(cp => 
          cp.includes(part) || part.includes(cp) || 
          matchesAbbreviation(part, cp) || matchesAbbreviation(cp, part)
        )
      );
      
      if (allPartsMatch) {
        console.log(`🏟️ Matched all parts: "${targetPlayerName}" ↔ "${playerName}"`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Link player record to venue using game data
   */
  linkPlayerToVenue(playerRecord, allGames) {
    if (!playerRecord.gameId || !allGames) return null;
    
    // Find the corresponding game for this player
    const game = allGames.find(g => 
      g.originalId?.toString() === playerRecord.gameId?.toString() ||
      g.gameId?.toString() === playerRecord.gameId?.toString()
    );
    
    return game ? game.venue : null;
  }

  /**
   * Determine if player played at specific venue (enhanced version)
   */
  isPlayerAtVenue(playerRecord, targetVenue, allGames) {
    // Get the actual venue from the linked game
    const actualVenue = this.linkPlayerToVenue(playerRecord, allGames);
    
    if (!actualVenue) return false;
    
    // Normalize venue names for comparison
    const normalizedActual = this.normalizeVenueName(actualVenue);
    const normalizedTarget = this.normalizeVenueName(targetVenue);
    
    return normalizedActual === normalizedTarget;
  }

  /**
   * Normalize venue names for consistent matching
   */
  normalizeVenueName(venue) {
    if (!venue) return '';
    
    const venueStr = venue.toString().toLowerCase().trim();
    
    // Comprehensive map of team codes to venue names and vice versa
    const venueMapping = {
      // Team codes to venues
      'col': 'coors field',
      'lad': 'dodger stadium', 
      'nyy': 'yankee stadium',
      'bos': 'fenway park',
      'hou': 'minute maid park',
      'chw': 'guaranteed rate field',
      'min': 'target field',
      'sea': 't-mobile park',
      'laa': 'angel stadium',
      'oak': 'oakland coliseum',
      'tex': 'globe life field',
      'cle': 'progressive field',
      'det': 'comerica park',
      'kc': 'kauffman stadium',
      'atl': 'truist park',
      'mia': 'loandepot park',
      'nym': 'citi field',
      'phi': 'citizens bank park',
      'wsh': 'nationals park',
      'chc': 'wrigley field',
      'cin': 'great american ball park',
      'mil': 'american family field',
      'pit': 'pnc park',
      'stl': 'busch stadium',
      'ari': 'chase field',
      'sd': 'petco park',
      'sf': 'oracle park',
      'tor': 'rogers centre',
      'bal': 'oriole park at camden yards',
      'tb': 'tropicana field',
      
      // Venue names to standardized names
      'coors field': 'coors field',
      'dodger stadium': 'dodger stadium',
      'yankee stadium': 'yankee stadium',
      'fenway park': 'fenway park',
      'minute maid park': 'minute maid park',
      'guaranteed rate field': 'guaranteed rate field',
      'target field': 'target field',
      't-mobile park': 't-mobile park',
      'angel stadium': 'angel stadium',
      'oakland coliseum': 'oakland coliseum',
      'globe life field': 'globe life field',
      'progressive field': 'progressive field',
      'comerica park': 'comerica park',
      'kauffman stadium': 'kauffman stadium',
      'truist park': 'truist park',
      'loandepot park': 'loandepot park',
      'citi field': 'citi field',
      'citizens bank park': 'citizens bank park',
      'nationals park': 'nationals park',
      'wrigley field': 'wrigley field',
      'great american ball park': 'great american ball park',
      'american family field': 'american family field',
      'pnc park': 'pnc park',
      'busch stadium': 'busch stadium',
      'chase field': 'chase field',
      'petco park': 'petco park',
      'oracle park': 'oracle park',
      'rogers centre': 'rogers centre',
      'oriole park at camden yards': 'oriole park at camden yards',
      'tropicana field': 'tropicana field'
    };
    
    return venueMapping[venueStr] || venueStr;
  }

  /**
   * Get venue name from team (simplified mapping)
   */
  getVenueFromTeam(team) {
    const teamToVenue = {
      'NYM': 'Citi Field',
      'NYY': 'Yankee Stadium', 
      'BOS': 'Fenway Park',
      'TB': 'Tropicana Field',
      'TOR': 'Rogers Centre',
      'BAL': 'Oriole Park at Camden Yards',
      'HOU': 'Minute Maid Park',
      'LAA': 'Angel Stadium',
      'OAK': 'Oakland Coliseum',
      'SEA': 'T-Mobile Park',
      'TEX': 'Globe Life Field',
      'CHW': 'Guaranteed Rate Field',
      'CLE': 'Progressive Field',
      'DET': 'Comerica Park',
      'KC': 'Kauffman Stadium',
      'MIN': 'Target Field',
      'ATL': 'Truist Park',
      'MIA': 'loanDepot Park',
      'NYM': 'Citi Field',
      'PHI': 'Citizens Bank Park',
      'WSH': 'Nationals Park',
      'CHC': 'Wrigley Field',
      'CIN': 'Great American Ball Park',
      'MIL': 'American Family Field',
      'PIT': 'PNC Park',
      'STL': 'Busch Stadium',
      'ARI': 'Chase Field',
      'COL': 'Coors Field',
      'LAD': 'Dodger Stadium',
      'SD': 'Petco Park',
      'SF': 'Oracle Park'
    };
    
    return teamToVenue[team] || '';
  }

  /**
   * Calculate venue-specific performance statistics
   */
  calculateVenueStats(games) {
    if (games.length === 0) {
      return {
        battingAverage: 0,
        homeRuns: 0,
        hits: 0,
        atBats: 0,
        sluggingPercentage: 0,
        onBasePercentage: 0,
        hitToHRRatio: 0,
        gamesPlayed: 0
      };
    }

    const totals = games.reduce((acc, game) => {
      acc.hits += game.H || 0;
      acc.atBats += game.AB || 0;
      acc.homeRuns += game.HR || 0;
      acc.rbi += game.RBI || 0;
      acc.walks += game.BB || 0;
      acc.runs += game.R || 0;
      return acc;
    }, { hits: 0, atBats: 0, homeRuns: 0, rbi: 0, walks: 0, runs: 0 });

    const battingAverage = totals.atBats > 0 ? totals.hits / totals.atBats : 0;
    const onBasePercentage = (totals.atBats + totals.walks) > 0 ? 
      (totals.hits + totals.walks) / (totals.atBats + totals.walks) : 0;

    const sluggingPercentage = totals.atBats > 0 ? 
      (totals.hits + totals.homeRuns) / totals.atBats : 0; // Simple SLG approximation
    const hitToHRRatio = totals.homeRuns > 0 ? totals.hits / totals.homeRuns : totals.hits;

    return {
      battingAverage: parseFloat(battingAverage.toFixed(3)),
      homeRuns: totals.homeRuns,
      hits: totals.hits,
      atBats: totals.atBats,
      rbi: totals.rbi,
      runs: totals.runs,
      walks: totals.walks,
      onBasePercentage: parseFloat(onBasePercentage.toFixed(3)),
      sluggingPercentage: parseFloat(sluggingPercentage.toFixed(3)),
      hitToHRRatio: parseFloat(hitToHRRatio.toFixed(1)),
      gamesPlayed: games.length
    };
  }

  /**
   * Determine venue personality/preference
   */
  determineVenuePersonality(stats, gameCount) {
    if (gameCount < 3) {
      return {
        classification: 'insufficient_data',
        confidence: 0,
        description: 'Not enough games for analysis',
        psychologicalFactor: 0
      };
    }

    const { battingAverage, homeRuns } = stats;
    
    // Define performance thresholds
    let classification, confidence, description, psychologicalFactor;

    if (battingAverage >= 0.350 && gameCount >= 8) {
      classification = 'venue_master';
      confidence = 90;
      description = 'Elite performer at this venue';
      psychologicalFactor = 25;
    } else if (battingAverage >= 0.320 && homeRuns >= 2) {
      classification = 'favorite_park';
      confidence = 80;
      description = 'Strong venue preference';
      psychologicalFactor = 18;
    } else if (battingAverage >= 0.280) {
      classification = 'comfortable';
      confidence = 70;
      description = 'Comfortable at this venue';
      psychologicalFactor = 8;
    } else if (battingAverage >= 0.220) {
      classification = 'neutral';
      confidence = 60;
      description = 'Average performance at venue';
      psychologicalFactor = 0;
    } else if (battingAverage < 0.200 && gameCount >= 5) {
      classification = 'house_of_horrors';
      confidence = 85;
      description = 'Struggles significantly at this venue';
      psychologicalFactor = -20;
    } else {
      classification = 'below_average';
      confidence = 65;
      description = 'Below average performance at venue';
      psychologicalFactor = -8;
    }

    return {
      classification,
      confidence,
      description,
      psychologicalFactor
    };
  }

  /**
   * Get recent venue performance (last 5 games)
   */
  getRecentVenuePerformance(games) {
    const recentGames = games.slice(-5);
    if (recentGames.length === 0) return null;

    const recentStats = this.calculateVenueStats(recentGames);
    return {
      ...recentStats,
      trend: this.calculateRecentTrend(recentGames)
    };
  }

  /**
   * Calculate performance trend at venue
   */
  calculateVenueTrend(games) {
    if (games.length < 4) return 'insufficient_data';

    const firstHalf = games.slice(0, Math.floor(games.length / 2));
    const secondHalf = games.slice(Math.floor(games.length / 2));

    const firstHalfAvg = this.calculateVenueStats(firstHalf).battingAverage;
    const secondHalfAvg = this.calculateVenueStats(secondHalf).battingAverage;

    const difference = secondHalfAvg - firstHalfAvg;

    if (difference >= 0.050) return 'improving';
    if (difference <= -0.050) return 'declining';
    return 'stable';
  }

  /**
   * Calculate recent trend from last few games
   */
  calculateRecentTrend(recentGames) {
    if (recentGames.length < 3) return 'unknown';

    const lastThree = recentGames.slice(-3);
    const hits = lastThree.reduce((sum, game) => sum + (game.H || 0), 0);
    const atBats = lastThree.reduce((sum, game) => sum + (game.AB || 0), 0);

    if (atBats === 0) return 'unknown';

    const recentAvg = hits / atBats;
    
    if (recentAvg >= 0.400) return 'hot';
    if (recentAvg >= 0.300) return 'good';
    if (recentAvg >= 0.200) return 'average';
    return 'cold';
  }

  /**
   * Get default analysis when data is insufficient
   */
  getDefaultVenueAnalysis(playerName, venue) {
    return {
      venue,
      playerName,
      gamesPlayed: 0,
      venueStats: {
        battingAverage: 0,
        homeRuns: 0,
        hits: 0,
        atBats: 0,
        onBasePercentage: 0,
        sluggingPercentage: 0,
        hitToHRRatio: 0,
        gamesPlayed: 0
      },
      venuePersonality: {
        classification: 'no_data',
        confidence: 0,
        description: 'No venue history available',
        psychologicalFactor: 0
      },
      recentPerformance: null,
      careerTrend: 'unknown'
    };
  }

  /**
   * Get stadium environmental data
   */
  getStadiumEnvironment(teamCode) {
    return this.stadiumLocations[teamCode] || {
      city: 'Unknown',
      state: 'Unknown',
      timezone: 'America/New_York',
      climate: 'moderate',
      altitude: 0
    };
  }

  /**
   * Analyze multiple players at a venue
   */
  async analyzeMultiplePlayersAtVenue(playerNames, venueTeam, dateRange = 365) {
    const analyses = await Promise.all(
      playerNames.map(playerName => 
        this.analyzePlayerVenueHistory(playerName, venueTeam, dateRange)
      )
    );

    return analyses.filter(analysis => analysis.gamesPlayed > 0);
  }

  /**
   * Get venue rankings for a player across all stadiums
   */
  async getPlayerVenueRankings(playerName, dateRange = 365) {
    const teamCodes = Object.keys(this.stadiumLocations);
    const venueAnalyses = await Promise.all(
      teamCodes.map(teamCode => 
        this.analyzePlayerVenueHistory(playerName, teamCode, dateRange)
      )
    );

    return venueAnalyses
      .filter(analysis => analysis.gamesPlayed >= 3)
      .sort((a, b) => b.venueStats.battingAverage - a.venueStats.battingAverage);
  }
}

// Create and export singleton instance
const venuePersonalityService = new VenuePersonalityService();
export default venuePersonalityService;