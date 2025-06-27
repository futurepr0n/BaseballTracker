/**
 * Enhanced Travel Service
 * Real travel analysis using stadium coordinates and previous game data
 */

import { STADIUM_COORDINATES } from './stadiumCoordinates';
import { fetchGameData } from './dataService';

class EnhancedTravelService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Analyze real travel impact using coordinates and game history
   */
  async analyzeRealTravelImpact(team, currentDate, venue) {
    const cacheKey = `travel_${team}_${currentDate.toISOString().split('T')[0]}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get yesterday's game location
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayData = await this.getYesterdayGameLocation(team, yesterday);
      
      if (!yesterdayData) {
        return this.getNoTravelData();
      }

      // Calculate real travel impact
      const travelAnalysis = this.calculateRealTravelData(yesterdayData.venue, venue, yesterdayData);
      
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
   * Get yesterday's game location from JSON file
   */
  async getYesterdayGameLocation(team, yesterdayDate) {
    try {
      const dateStr = yesterdayDate.toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-');
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                         'july', 'august', 'september', 'october', 'november', 'december'];
      const monthName = monthNames[parseInt(month) - 1];
      
      const gameData = await fetchGameData(dateStr);
      if (!gameData || !gameData.games) return null;

      // Find team's game yesterday
      const teamGame = gameData.games.find(game => 
        game.homeTeam === team || game.awayTeam === team
      );

      if (!teamGame) return null;

      return {
        venue: teamGame.venue,
        isHome: teamGame.homeTeam === team,
        opponent: teamGame.homeTeam === team ? teamGame.awayTeam : teamGame.homeTeam,
        gameDate: dateStr
      };
    } catch (error) {
      console.warn('Could not load yesterday game data:', error);
      return null;
    }
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
        travelClassification: 'no_travel',
        travelImpact: 0,
        seriesGame: 2, // Assuming game 2+ of series
        restAdvantage: 5, // Advantage of staying in same city
        description: `Continuing series at ${currentVenue}`,
        previousGame: yesterdayData
      };
    }

    // Calculate real distance between venues
    const distance = this.calculateVenueDistance(previousVenue, currentVenue);
    const travelClassification = this.classifyTravelDistance(distance);
    const travelImpact = this.calculateTravelFatigue(distance, travelClassification);

    return {
      travelType: 'TRAVELED',
      distance: Math.round(distance),
      travelClassification,
      travelImpact,
      seriesGame: 1, // First game in new city
      restAdvantage: 0,
      description: `Traveled ${Math.round(distance)} miles from ${previousVenue}`,
      previousGame: yesterdayData,
      fatigueFactors: this.analyzeFatigueFactors(distance, travelClassification)
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
  calculateTravelFatigue(distance, classification) {
    const baseImpact = {
      'no_travel': 0,
      'short_trip': -2,
      'medium_trip': -5,
      'long_trip': -8,
      'cross_country': -12
    };

    return baseImpact[classification] || 0;
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
      travelClassification: 'unknown',
      travelImpact: 0,
      description: 'Previous game location unknown',
      previousGame: null
    };
  }
}

const enhancedTravelService = new EnhancedTravelService();
export default enhancedTravelService;