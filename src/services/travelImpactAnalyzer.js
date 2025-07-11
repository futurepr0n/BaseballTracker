/**
 * Travel Impact Analyzer
 * Analyzes travel patterns, fatigue, and performance impacts
 */

import { fetchPlayerDataForDateRange, convertDataMapToArray } from './dataService.js';

class TravelImpactAnalyzer {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.stadiumLocations = this.initializeStadiumLocations();
  }

  initializeStadiumLocations() {
    return {
      'LAA': { lat: 33.8003, lon: -117.8827, city: 'Anaheim', timezone: 'America/Los_Angeles' },
      'HOU': { lat: 29.7573, lon: -95.3556, city: 'Houston', timezone: 'America/Chicago' },
      'OAK': { lat: 37.7516, lon: -122.2008, city: 'Oakland', timezone: 'America/Los_Angeles' },
      'TOR': { lat: 43.6426, lon: -79.3899, city: 'Toronto', timezone: 'America/Toronto' },
      'ATL': { lat: 33.8906, lon: -84.4677, city: 'Atlanta', timezone: 'America/New_York' },
      'MIL': { lat: 43.0280, lon: -87.9712, city: 'Milwaukee', timezone: 'America/Chicago' },
      'STL': { lat: 38.6226, lon: -90.1928, city: 'St. Louis', timezone: 'America/Chicago' },
      'CHC': { lat: 41.9484, lon: -87.6553, city: 'Chicago', timezone: 'America/Chicago' },
      'ARI': { lat: 33.4453, lon: -112.0667, city: 'Phoenix', timezone: 'America/Phoenix' },
      'LAD': { lat: 34.0739, lon: -118.2400, city: 'Los Angeles', timezone: 'America/Los_Angeles' },
      'SF': { lat: 37.7786, lon: -122.3893, city: 'San Francisco', timezone: 'America/Los_Angeles' },
      'CLE': { lat: 41.4962, lon: -81.6852, city: 'Cleveland', timezone: 'America/New_York' },
      'SEA': { lat: 47.5914, lon: -122.3326, city: 'Seattle', timezone: 'America/Los_Angeles' },
      'MIA': { lat: 25.7781, lon: -80.2197, city: 'Miami', timezone: 'America/New_York' },
      'NYM': { lat: 40.7571, lon: -73.8458, city: 'New York', timezone: 'America/New_York' },
      'WSH': { lat: 38.8730, lon: -77.0074, city: 'Washington', timezone: 'America/New_York' },
      'BAL': { lat: 39.2838, lon: -76.6218, city: 'Baltimore', timezone: 'America/New_York' },
      'SD': { lat: 32.7073, lon: -117.1566, city: 'San Diego', timezone: 'America/Los_Angeles' },
      'PHI': { lat: 39.9061, lon: -75.1665, city: 'Philadelphia', timezone: 'America/New_York' },
      'PIT': { lat: 40.4469, lon: -80.0061, city: 'Pittsburgh', timezone: 'America/New_York' },
      'TEX': { lat: 32.7513, lon: -97.0832, city: 'Arlington', timezone: 'America/Chicago' },
      'TB': { lat: 27.7682, lon: -82.6534, city: 'St. Petersburg', timezone: 'America/New_York' },
      'BOS': { lat: 42.3467, lon: -71.0972, city: 'Boston', timezone: 'America/New_York' },
      'CIN': { lat: 39.0974, lon: -84.5061, city: 'Cincinnati', timezone: 'America/New_York' },
      'COL': { lat: 39.7559, lon: -104.9942, city: 'Denver', timezone: 'America/Denver' },
      'MIN': { lat: 44.9818, lon: -93.2776, city: 'Minneapolis', timezone: 'America/Chicago' },
      'DET': { lat: 42.3390, lon: -83.0485, city: 'Detroit', timezone: 'America/New_York' },
      'KC': { lat: 39.0517, lon: -94.4803, city: 'Kansas City', timezone: 'America/Chicago' },
      'CHW': { lat: 41.8300, lon: -87.6338, city: 'Chicago', timezone: 'America/Chicago' },
      'NYY': { lat: 40.8296, lon: -73.9262, city: 'New York', timezone: 'America/New_York' }
    };
  }

  /**
   * Calculate distance between two stadiums
   */
  calculateDistance(team1, team2) {
    const loc1 = this.stadiumLocations[team1];
    const loc2 = this.stadiumLocations[team2];
    
    if (!loc1 || !loc2) return 0;

    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLon = this.toRadians(loc2.lon - loc1.lon);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(loc1.lat)) * Math.cos(this.toRadians(loc2.lat)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate time zone difference
   */
  calculateTimeZoneDifference(team1, team2) {
    const timezones = {
      'America/Los_Angeles': -8,
      'America/Denver': -7,
      'America/Chicago': -6,
      'America/New_York': -5,
      'America/Phoenix': -7,
      'America/Toronto': -5
    };

    const tz1 = this.stadiumLocations[team1]?.timezone || 'America/New_York';
    const tz2 = this.stadiumLocations[team2]?.timezone || 'America/New_York';
    
    return Math.abs((timezones[tz2] || -5) - (timezones[tz1] || -5));
  }

  /**
   * Analyze travel impact for a team/player
   */
  async analyzeTravelImpact(teamCode, currentDate, gameHistory) {
    const cacheKey = `travel_impact_${teamCode}_${currentDate.toISOString().split('T')[0]}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const travelAnalysis = await this.analyzeTravelPattern(teamCode, currentDate, gameHistory);
      
      this.cache.set(cacheKey, {
        data: travelAnalysis,
        timestamp: Date.now()
      });

      return travelAnalysis;
    } catch (error) {
      console.error('Error analyzing travel impact:', error);
      return this.getDefaultTravelAnalysis(teamCode);
    }
  }

  /**
   * Analyze travel pattern from game history
   */
  async analyzeTravelPattern(teamCode, currentDate, gameHistory) {
    // Get recent games to determine travel pattern
    const recentGames = this.getRecentGames(gameHistory, teamCode, 10);
    
    if (recentGames.length < 2) {
      return this.getDefaultTravelAnalysis(teamCode);
    }

    // Determine last location and current location
    const lastGame = recentGames[0];
    const lastLocation = this.determineGameLocation(lastGame, teamCode);
    
    // Calculate travel details
    const travelDistance = this.calculateDistance(lastLocation, teamCode);
    const timeZoneChange = this.calculateTimeZoneDifference(lastLocation, teamCode);
    
    // Analyze travel pattern
    const travelPattern = this.analyzeTravelSequence(recentGames, teamCode);
    
    // Calculate fatigue factors
    const fatigueFactors = this.calculateFatigueFactors(recentGames, teamCode, travelDistance, timeZoneChange);
    
    return {
      teamCode,
      currentLocation: teamCode,
      lastLocation,
      travelDistance,
      timeZoneChange,
      travelClassification: this.classifyTravelDistance(travelDistance),
      isFirstGameAfterTravel: travelDistance > 100,
      daysOfRest: this.calculateDaysOfRest(recentGames),
      consecutiveGames: this.calculateConsecutiveGames(recentGames, teamCode),
      roadTripLength: this.calculateRoadTripLength(recentGames, teamCode),
      travelPattern,
      fatigueFactors,
      performanceImpact: this.calculatePerformanceImpact(fatigueFactors)
    };
  }

  /**
   * Get recent games for analysis
   */
  getRecentGames(gameHistory, teamCode, count = 10) {
    if (!gameHistory || !Array.isArray(gameHistory)) return [];
    
    return gameHistory
      .filter(game => game.homeTeam === teamCode || game.awayTeam === teamCode)
      .sort((a, b) => new Date(b.dateTime || b.date) - new Date(a.dateTime || a.date))
      .slice(0, count);
  }

  /**
   * Determine where a game was played
   */
  determineGameLocation(game, teamCode) {
    if (game.homeTeam === teamCode) {
      return teamCode; // Home game
    } else {
      return game.homeTeam; // Away game
    }
  }

  /**
   * Classify travel distance
   */
  classifyTravelDistance(distance) {
    if (distance === 0) return 'no_travel';
    if (distance < 200) return 'short';
    if (distance < 800) return 'medium';
    if (distance < 2000) return 'long';
    return 'extreme';
  }

  /**
   * Calculate days of rest
   */
  calculateDaysOfRest(recentGames) {
    if (recentGames.length < 2) return 0;
    
    const lastGame = new Date(recentGames[0].dateTime || recentGames[0].date);
    const previousGame = new Date(recentGames[1].dateTime || recentGames[1].date);
    
    const diffTime = Math.abs(lastGame - previousGame);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
    
    return Math.max(0, diffDays);
  }

  /**
   * Calculate consecutive games played
   */
  calculateConsecutiveGames(recentGames, teamCode) {
    let consecutive = 0;
    let lastDate = null;
    
    for (const game of recentGames) {
      const gameDate = new Date(game.dateTime || game.date);
      
      if (lastDate) {
        const diffDays = Math.ceil((lastDate - gameDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 1) break; // Gap in games
      }
      
      consecutive++;
      lastDate = gameDate;
    }
    
    return consecutive;
  }

  /**
   * Calculate current road trip length
   */
  calculateRoadTripLength(recentGames, teamCode) {
    let roadGames = 0;
    
    for (const game of recentGames) {
      if (game.awayTeam === teamCode) {
        roadGames++;
      } else {
        break; // Hit a home game
      }
    }
    
    return roadGames;
  }

  /**
   * Analyze travel sequence pattern
   */
  analyzeTravelSequence(recentGames, teamCode) {
    const locations = recentGames.map(game => this.determineGameLocation(game, teamCode));
    const distances = [];
    
    for (let i = 0; i < locations.length - 1; i++) {
      distances.push(this.calculateDistance(locations[i], locations[i + 1]));
    }
    
    const totalTravel = distances.reduce((sum, dist) => sum + dist, 0);
    const averageDistance = distances.length > 0 ? totalTravel / distances.length : 0;
    
    return {
      totalTravel,
      averageDistance,
      maxDistance: Math.max(...distances, 0),
      travelDirection: this.determineTravelDirection(locations)
    };
  }

  /**
   * Determine primary travel direction
   */
  determineTravelDirection(locations) {
    if (locations.length < 3) return 'unknown';
    
    const eastCoast = ['BOS', 'NYY', 'NYM', 'PHI', 'BAL', 'WSH', 'ATL', 'MIA', 'TB'];
    const westCoast = ['LAA', 'LAD', 'SF', 'OAK', 'SEA', 'SD'];
    
    let eastToWest = 0;
    let westToEast = 0;
    
    for (let i = 0; i < locations.length - 1; i++) {
      const from = locations[i];
      const to = locations[i + 1];
      
      if (eastCoast.includes(from) && westCoast.includes(to)) eastToWest++;
      if (westCoast.includes(from) && eastCoast.includes(to)) westToEast++;
    }
    
    if (eastToWest > westToEast) return 'east_to_west';
    if (westToEast > eastToWest) return 'west_to_east';
    return 'regional';
  }

  /**
   * Calculate comprehensive fatigue factors
   */
  calculateFatigueFactors(recentGames, teamCode, travelDistance, timeZoneChange) {
    const consecutiveGames = this.calculateConsecutiveGames(recentGames, teamCode);
    const roadTripLength = this.calculateRoadTripLength(recentGames, teamCode);
    const daysOfRest = this.calculateDaysOfRest(recentGames);
    
    return {
      travelFatigue: this.calculateTravelFatigue(travelDistance, timeZoneChange),
      consecutiveGameFatigue: this.calculateConsecutiveFatigue(consecutiveGames),
      roadTripFatigue: this.calculateRoadTripFatigue(roadTripLength),
      restBonus: this.calculateRestBonus(daysOfRest),
      totalFatigueScore: 0 // Will be calculated
    };
  }

  /**
   * Calculate travel-specific fatigue
   */
  calculateTravelFatigue(distance, timeZoneChange) {
    let fatigueScore = 0;
    
    // Distance penalty
    if (distance > 2000) fatigueScore += 15;
    else if (distance > 1000) fatigueScore += 10;
    else if (distance > 500) fatigueScore += 5;
    
    // Time zone penalty
    fatigueScore += timeZoneChange * 3;
    
    return Math.min(fatigueScore, 25); // Cap at 25%
  }

  /**
   * Calculate consecutive game fatigue
   */
  calculateConsecutiveFatigue(consecutiveGames) {
    if (consecutiveGames <= 3) return 0;
    return Math.min((consecutiveGames - 3) * 3, 20); // 3% per game after 3rd, cap at 20%
  }

  /**
   * Calculate road trip fatigue
   */
  calculateRoadTripFatigue(roadTripLength) {
    if (roadTripLength <= 3) return 0;
    return Math.min((roadTripLength - 3) * 2, 15); // 2% per game after 3rd, cap at 15%
  }

  /**
   * Calculate rest bonus
   */
  calculateRestBonus(daysOfRest) {
    if (daysOfRest >= 2) return 12; // 12% bonus for 2+ days rest
    if (daysOfRest === 1) return 5;  // 5% bonus for 1 day rest
    return 0;
  }

  /**
   * Calculate overall performance impact
   */
  calculatePerformanceImpact(fatigueFactors) {
    const totalFatigue = fatigueFactors.travelFatigue + 
                        fatigueFactors.consecutiveGameFatigue + 
                        fatigueFactors.roadTripFatigue;
    
    const netImpact = fatigueFactors.restBonus - totalFatigue;
    
    fatigueFactors.totalFatigueScore = totalFatigue;
    
    return {
      netPerformanceImpact: netImpact,
      classification: this.classifyPerformanceImpact(netImpact),
      recommendation: this.getPerformanceRecommendation(netImpact)
    };
  }

  /**
   * Classify performance impact
   */
  classifyPerformanceImpact(impact) {
    if (impact >= 10) return 'significant_boost';
    if (impact >= 5) return 'moderate_boost';
    if (impact >= -5) return 'neutral';
    if (impact >= -15) return 'moderate_penalty';
    return 'significant_penalty';
  }

  /**
   * Get performance recommendation
   */
  getPerformanceRecommendation(impact) {
    if (impact >= 10) return 'Strong travel advantage - target players';
    if (impact >= 5) return 'Slight travel advantage';
    if (impact >= -5) return 'Neutral travel impact';
    if (impact >= -15) return 'Moderate travel concern';
    return 'Significant travel fatigue - avoid players';
  }

  /**
   * Get default travel analysis
   */
  getDefaultTravelAnalysis(teamCode) {
    return {
      teamCode,
      currentLocation: teamCode,
      lastLocation: teamCode,
      travelDistance: 0,
      timeZoneChange: 0,
      travelClassification: 'no_travel',
      isFirstGameAfterTravel: false,
      daysOfRest: 1,
      consecutiveGames: 1,
      roadTripLength: 0,
      travelPattern: {
        totalTravel: 0,
        averageDistance: 0,
        maxDistance: 0,
        travelDirection: 'unknown'
      },
      fatigueFactors: {
        travelFatigue: 0,
        consecutiveGameFatigue: 0,
        roadTripFatigue: 0,
        restBonus: 5,
        totalFatigueScore: 0
      },
      performanceImpact: {
        netPerformanceImpact: 5,
        classification: 'neutral',
        recommendation: 'Normal travel situation'
      }
    };
  }

  /**
   * Analyze player-specific travel impact
   */
  async analyzePlayerTravelPattern(playerName, teamCode, dateRange = 180) {
    try {
      const historicalDataMap = await fetchPlayerDataForDateRange(new Date(), dateRange, dateRange);
      
      // CRITICAL FIX: fetchPlayerDataForDateRange now returns a Map, not an array
      const historicalData = convertDataMapToArray(historicalDataMap);
      
      // Filter for this player's games
      const playerGames = historicalData.filter(data => 
        (data.name === playerName || data.fullName === playerName) && 
        data.team === teamCode
      );

      // Analyze travel performance patterns
      return this.calculatePlayerTravelProfile(playerGames, teamCode);
    } catch (error) {
      console.error('Error analyzing player travel pattern:', error);
      return this.getDefaultPlayerTravelProfile(playerName);
    }
  }

  /**
   * Calculate player travel performance profile
   */
  calculatePlayerTravelProfile(games, teamCode) {
    // This would need game location data to be fully implemented
    // For now, return a basic profile structure
    
    return {
      travelType: 'average_traveler', // travel_warrior, home_comfort, average_traveler
      firstGameAfterTravelBA: 0.265,
      crossCountryPerformance: 0.245,
      timeZoneAdjustmentPattern: 'normal', // fast, normal, slow
      roadTripPerformance: 0.255,
      consecutiveGameTolerance: 'average' // high, average, low
    };
  }

  /**
   * Get default player travel profile
   */
  getDefaultPlayerTravelProfile(playerName) {
    return {
      playerName,
      travelType: 'average_traveler',
      firstGameAfterTravelBA: 0.250,
      crossCountryPerformance: 0.250,
      timeZoneAdjustmentPattern: 'normal',
      roadTripPerformance: 0.250,
      consecutiveGameTolerance: 'average'
    };
  }
}

// Create and export singleton instance
const travelImpactAnalyzer = new TravelImpactAnalyzer();
export default travelImpactAnalyzer;