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
      
      // Check last 90 days of games to find venue history
      for (let i = 1; i <= 90; i++) {
        const checkDate = new Date(endDate);
        checkDate.setDate(endDate.getDate() - i);
        
        try {
          const dateStr = checkDate.toISOString().split('T')[0];
          const historicalData = await this.fetchPlayerDataForDate(dateStr);
          
          if (historicalData && historicalData.length > 0) {
            // Find this player's games at this specific venue
            const playerVenueGames = historicalData.filter(playerData => 
              this.isPlayerMatch(playerData, playerName) &&
              this.isGameAtVenue(playerData, venue)
            );
            
            playerGames.push(...playerVenueGames);
          }
        } catch (dateError) {
          // Skip dates that don't have data
          continue;
        }
        
        // Stop if we have enough games or checked enough dates
        if (playerGames.length >= 10 || i >= 60) break;
      }

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
   * Fetch player data for a specific date
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
      return gameData.playerStats || gameData.players || [];
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if player data matches target player name
   */
  isPlayerMatch(playerData, targetPlayerName) {
    const playerName = playerData.name || playerData.fullName || playerData.playerName || '';
    const targetName = targetPlayerName.toLowerCase().trim();
    const currentName = playerName.toLowerCase().trim();
    
    // Exact match
    if (currentName === targetName) return true;
    
    // Check if names contain each other (handles "First Last" vs "Last, First" formats)
    const targetParts = targetName.split(/[\s,]+/).filter(p => p.length > 1);
    const currentParts = currentName.split(/[\s,]+/).filter(p => p.length > 1);
    
    // If both first and last names match
    if (targetParts.length >= 2 && currentParts.length >= 2) {
      return targetParts.every(part => currentParts.some(cp => cp.includes(part) || part.includes(cp)));
    }
    
    return false;
  }

  /**
   * Determine if game was played at specific venue
   */
  isGameAtVenue(playerData, venue) {
    // Check various possible venue field names in the data
    const gameVenue = playerData.venue || playerData.stadium || playerData.ballpark || '';
    
    if (gameVenue) {
      // Direct venue name match
      if (gameVenue.toLowerCase().includes(venue.toLowerCase()) || 
          venue.toLowerCase().includes(gameVenue.toLowerCase())) {
        return true;
      }
    }
    
    // Check opponent field - if player's team != opponent's home team and it matches venue
    const opponent = playerData.opponent || playerData.opposingTeam || '';
    if (opponent && this.getVenueFromTeam(opponent) === venue) {
      return true;
    }
    
    // Check if this is an away game at the venue
    const isHome = playerData.isHome || playerData.gameLocation === 'home';
    if (!isHome && opponent) {
      return this.getVenueFromTeam(opponent) === venue;
    }
    
    return false;
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
        onBasePercentage: 0
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

    return {
      battingAverage: parseFloat(battingAverage.toFixed(3)),
      homeRuns: totals.homeRuns,
      hits: totals.hits,
      atBats: totals.atBats,
      rbi: totals.rbi,
      runs: totals.runs,
      walks: totals.walks,
      onBasePercentage: parseFloat(onBasePercentage.toFixed(3)),
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