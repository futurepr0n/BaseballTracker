/**
 * Enhanced Travel Service
 * Real travel analysis using stadium coordinates and previous game data
 */

import { STADIUM_COORDINATES, TEAM_TO_STADIUM } from './stadiumCoordinates.js';
import { fetchGameData } from './dataService.js';

class EnhancedTravelService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Analyze real travel impact using coordinates and game history
   * @param {string} team - The team code (e.g., 'ATL')
   * @param {Date} currentDate - The date of the current game
   * @param {string} currentVenue - The venue where the game is being played today
   */
  async analyzeRealTravelImpact(team, currentDate, currentVenue) {
    console.log(`🛫 TRAVEL SERVICE: Analyzing ${team} travel to ${currentVenue}`);
    console.log(`🛫 PARAMS: team="${team}", date="${currentDate.toISOString().split('T')[0]}", venue="${currentVenue}"`);
    
    const cacheKey = `travel_${team}_${currentDate.toISOString().split('T')[0]}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`🛫 TRAVEL SERVICE: Using cached data for ${team}`);
        return cached.data;
      }
    }

    try {
      const previousGameData = await this.getPreviousGameLocation(team, currentDate);
      
      if (!previousGameData) {
        console.log(`🛫 TRAVEL SERVICE: No previous game found for ${team}, returning no travel data`);
        return this.getNoTravelData();
      }
      
      console.log(`🛫 TRAVEL SERVICE: Found previous game for ${team} at ${previousGameData.venue}`);

      // Calculate real travel impact
      const travelAnalysis = this.calculateRealTravelData(previousGameData.venue, currentVenue, previousGameData);
      
      this.cache.set(cacheKey, {
        data: travelAnalysis,
        timestamp: Date.now()
      });

      return travelAnalysis;
    } catch (error) {
      console.error('Error analyzing real travel impact:', error);
      return this.getNoTravelData();
    }
  }

  /**
   * Get previous game location from JSON files (looks back up to 5 days)
   */
  async getPreviousGameLocation(team, currentDate) {
    console.log(`🛫 LOOKUP: Searching for ${team} previous games from ${currentDate.toISOString().split('T')[0]}`);
    
    // Look back up to 5 days to find the previous game
    for (let daysBack = 1; daysBack <= 5; daysBack++) {
      try {
        const checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() - daysBack);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        console.log(`🛫 CHECKING: ${dateStr} (${daysBack} days back)`);
        
        const games = await fetchGameData(dateStr);
        console.log(`🛫 DATA: ${dateStr} - Found ${games?.length || 0} games`);
        
        if (!games || !Array.isArray(games) || games.length === 0) {
          console.log(`🛫 SKIP: ${dateStr} - No game data`);
          continue;
        }

        // Find team's game on this date
        console.log(`🛫 GAMES: ${dateStr} - Games found:`, games.map(g => `${g.awayTeam} @ ${g.homeTeam}`));
        
        const teamGame = games.find(game => 
          game.homeTeam === team || game.awayTeam === team
        );

        console.log(`🛫 SEARCH: Looking for ${team} in games, found:`, teamGame ? `${teamGame.awayTeam} @ ${teamGame.homeTeam}` : 'NONE');

        if (teamGame) {
          // If venue is not specified or is a team code, use the home team's stadium
          let gameVenue = teamGame.venue;
          if (!gameVenue || gameVenue.length === 3) {
            gameVenue = TEAM_TO_STADIUM[teamGame.homeTeam] || teamGame.homeTeam;
          }
          
          return {
            venue: gameVenue,
            isHome: teamGame.homeTeam === team,
            opponent: teamGame.homeTeam === team ? teamGame.awayTeam : teamGame.homeTeam,
            gameDate: dateStr,
            daysAgo: daysBack
          };
        }
      } catch (error) {
        console.warn(`   Error loading data for day ${daysBack}:`, error.message);
      }
    }
    
    return null;
  }

  /**
   * Calculate real travel data using stadium coordinates
   */
  calculateRealTravelData(previousVenue, currentVenue, yesterdayData) {
    // Check if same venue (continuing series)
    const isSameSeries = previousVenue === currentVenue;
    
    if (isSameSeries) {
      return {
        travelType: 'SAME_SERIES',
        distance: 0,
        travelDistance: 0, // UI expects this
        travelClassification: 'no_travel',
        travelImpact: 0,
        seriesGame: 2, // Assuming game 2+ of series
        restAdvantage: 5, // Advantage of staying in same city
        description: `Continuing series at ${currentVenue}`,
        daysOfRest: (yesterdayData.daysAgo || 1) - 1, // UI expects this
        consecutiveGames: 2, // Continuing series
        previousGame: yesterdayData,
        // UI expects performanceImpact object
        performanceImpact: {
          netPerformanceImpact: 0,
          recommendation: `Continuing series at ${currentVenue}. No travel fatigue.`
        }
      };
    }

    // Calculate real distance between venues
    const distance = this.calculateVenueDistance(previousVenue, currentVenue);
    const travelClassification = this.classifyTravelDistance(distance);
    const daysAgo = yesterdayData.daysAgo || 1;
    const travelImpact = this.calculateTravelFatigue(distance, travelClassification, daysAgo);

    return {
      travelType: 'TRAVELED',
      distance: Math.round(distance),
      travelDistance: Math.round(distance), // UI expects this
      travelClassification,
      travelImpact,
      seriesGame: 1, // First game in new city
      restAdvantage: 0,
      description: `Traveled ${Math.round(distance)} miles from ${previousVenue}`,
      daysOfRest: daysAgo - 1, // UI expects this
      consecutiveGames: 1, // Simple implementation for now
      previousGame: yesterdayData,
      fatigueFactors: this.analyzeFatigueFactors(distance, travelClassification),
      // UI expects performanceImpact object
      performanceImpact: {
        netPerformanceImpact: travelImpact,
        recommendation: `Traveled ${Math.round(distance)} miles from ${previousVenue}. ${travelClassification.replace('_', ' ')} trip with ${travelImpact} impact.`
      }
    };
  }

  /**
   * Calculate distance between two venues using coordinates
   */
  calculateVenueDistance(venue1, venue2) {
    const coord1 = this.getVenueCoordinates(venue1);
    const coord2 = this.getVenueCoordinates(venue2);
    
    if (!coord1 || !coord2) {
      console.warn(`Could not find coordinates for ${venue1} or ${venue2}`);
      return 0;
    }

    return this.haversineDistance(coord1.lat, coord1.lng, coord2.lat, coord2.lng);
  }

  /**
   * Get venue coordinates from stadium coordinates
   */
  getVenueCoordinates(venue) {
    // Try exact match first
    if (STADIUM_COORDINATES[venue]) {
      return STADIUM_COORDINATES[venue];
    }
    
    // Check if it's a team code (e.g., "ATL", "STL")
    if (venue.length === 3 && TEAM_TO_STADIUM[venue]) {
      const stadiumName = TEAM_TO_STADIUM[venue];
      return STADIUM_COORDINATES[stadiumName];
    }

    // Try partial matching for venue names
    const venueKey = Object.keys(STADIUM_COORDINATES).find(key => 
      key.toLowerCase().includes(venue.toLowerCase()) ||
      venue.toLowerCase().includes(key.toLowerCase())
    );

    return venueKey ? STADIUM_COORDINATES[venueKey] : null;
  }

  /**
   * Haversine formula for distance calculation
   */
  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Classify travel distance impact
   */
  classifyTravelDistance(distance) {
    if (distance === 0) return 'no_travel';
    if (distance < 300) return 'short_trip';
    if (distance < 800) return 'medium_trip';
    if (distance < 1500) return 'long_trip';
    return 'cross_country';
  }

  /**
   * Calculate travel fatigue impact score
   */
  calculateTravelFatigue(distance, classification, daysAgo = 1) {
    const baseImpact = {
      'no_travel': 0,
      'short_trip': -2,
      'medium_trip': -5,
      'long_trip': -8,
      'cross_country': -12
    };
    
    let impact = baseImpact[classification] || 0;
    
    // Reduce impact if team had rest days
    if (daysAgo > 1) {
      const restBonus = Math.min((daysAgo - 1) * 2, 6); // Up to 6 points recovery
      impact = Math.min(0, impact + restBonus);
    }

    return impact;
  }

  /**
   * Analyze fatigue factors
   */
  analyzeFatigueFactors(distance, classification) {
    const factors = [];
    
    if (classification === 'cross_country') {
      factors.push('Potential timezone adjustment');
      factors.push('Long flight fatigue');
    } else if (classification === 'long_trip') {
      factors.push('Moderate travel fatigue');
    } else if (classification === 'medium_trip') {
      factors.push('Some travel fatigue');
    }

    if (distance > 1000) {
      factors.push('Potential jet lag effects');
    }

    return factors;
  }

  /**
   * Return empty travel data when no previous game found
   */
  getNoTravelData() {
    return {
      travelType: 'UNKNOWN',
      distance: 0,
      travelDistance: 0, // UI expects this
      travelClassification: 'unknown',
      travelImpact: 0,
      description: 'Previous game location unknown',
      previousGame: null,
      daysOfRest: 0, // UI expects this
      consecutiveGames: 1, // UI expects this
      // UI expects performanceImpact object
      performanceImpact: {
        netPerformanceImpact: 0,
        recommendation: 'Previous game location unknown - no travel data available'
      }
    };
  }
}

const enhancedTravelService = new EnhancedTravelService();
export default enhancedTravelService;