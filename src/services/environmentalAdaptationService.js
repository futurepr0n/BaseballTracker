/**
 * Environmental Adaptation Service
 * Analyzes player performance across different climate and environmental conditions
 */

import { fetchPlayerDataForDateRange } from './dataService';
import { getSeasonSafeDateRange, formatDateRangeDescription } from '../utils/seasonDateUtils';

class EnvironmentalAdaptationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.climateZones = this.initializeClimateZones();
    this.stadiumEnvironments = this.initializeStadiumEnvironments();
  }

  initializeClimateZones() {
    return {
      'hot_dry': { 
        avgTemp: 88, 
        avgHumidity: 25, 
        characteristics: ['desert', 'low_humidity', 'high_heat'],
        ballCarryFactor: 1.05,
        teams: ['ARI', 'LAA', 'LAD', 'SD', 'SF', 'OAK']
      },
      'hot_humid': { 
        avgTemp: 85, 
        avgHumidity: 75, 
        characteristics: ['subtropical', 'high_humidity', 'heavy_air'],
        ballCarryFactor: 0.98,
        teams: ['HOU', 'TEX', 'MIA', 'TB', 'ATL']
      },
      'warm_humid': { 
        avgTemp: 78, 
        avgHumidity: 65, 
        characteristics: ['temperate', 'moderate_humidity'],
        ballCarryFactor: 1.0,
        teams: ['STL', 'CIN', 'KC']
      },
      'warm_dry': { 
        avgTemp: 80, 
        avgHumidity: 45, 
        characteristics: ['mediterranean', 'dry_heat'],
        ballCarryFactor: 1.03,
        teams: ['COL']
      },
      'moderate_humid': { 
        avgTemp: 75, 
        avgHumidity: 60, 
        characteristics: ['continental', 'four_seasons'],
        ballCarryFactor: 1.0,
        teams: ['NYY', 'NYM', 'PHI', 'WSH', 'BAL']
      },
      'moderate_dry': { 
        avgTemp: 74, 
        avgHumidity: 50, 
        characteristics: ['continental_dry', 'mild'],
        ballCarryFactor: 1.01,
        teams: []
      },
      'cool_moderate': { 
        avgTemp: 68, 
        avgHumidity: 55, 
        characteristics: ['temperate', 'mild_summers'],
        ballCarryFactor: 0.99,
        teams: ['BOS', 'CLE', 'DET', 'CHC', 'CHW', 'MIL', 'MIN', 'PIT', 'SEA']
      },
      'cool_dry': { 
        avgTemp: 65, 
        avgHumidity: 40, 
        characteristics: ['arid_cool', 'thin_air'],
        ballCarryFactor: 1.02,
        teams: []
      }
    };
  }

  initializeStadiumEnvironments() {
    return {
      'LAA': { climate: 'hot_dry', altitude: 150, domeStatus: 'outdoor', windPattern: 'variable' },
      'HOU': { climate: 'hot_humid', altitude: 43, domeStatus: 'dome', windPattern: 'controlled' },
      'OAK': { climate: 'moderate_dry', altitude: 56, domeStatus: 'outdoor', windPattern: 'marine' },
      'TOR': { climate: 'cool_moderate', altitude: 173, domeStatus: 'dome', windPattern: 'controlled' },
      'ATL': { climate: 'warm_humid', altitude: 1050, domeStatus: 'outdoor', windPattern: 'variable' },
      'MIL': { climate: 'cool_moderate', altitude: 635, domeStatus: 'dome', windPattern: 'controlled' },
      'STL': { climate: 'warm_humid', altitude: 465, domeStatus: 'outdoor', windPattern: 'variable' },
      'CHC': { climate: 'cool_moderate', altitude: 595, domeStatus: 'outdoor', windPattern: 'lakefront' },
      'ARI': { climate: 'hot_dry', altitude: 1090, domeStatus: 'dome', windPattern: 'controlled' },
      'LAD': { climate: 'hot_dry', altitude: 340, domeStatus: 'outdoor', windPattern: 'variable' },
      'SF': { climate: 'cool_dry', altitude: 63, domeStatus: 'outdoor', windPattern: 'marine' },
      'CLE': { climate: 'cool_moderate', altitude: 650, domeStatus: 'outdoor', windPattern: 'lakefront' },
      'SEA': { climate: 'cool_moderate', altitude: 59, domeStatus: 'dome', windPattern: 'controlled' },
      'MIA': { climate: 'hot_humid', altitude: 8, domeStatus: 'dome', windPattern: 'controlled' },
      'NYM': { climate: 'moderate_humid', altitude: 38, domeStatus: 'outdoor', windPattern: 'coastal' },
      'WSH': { climate: 'moderate_humid', altitude: 56, domeStatus: 'outdoor', windPattern: 'variable' },
      'BAL': { climate: 'moderate_humid', altitude: 54, domeStatus: 'outdoor', windPattern: 'coastal' },
      'SD': { climate: 'hot_dry', altitude: 62, domeStatus: 'outdoor', windPattern: 'marine' },
      'PHI': { climate: 'moderate_humid', altitude: 60, domeStatus: 'outdoor', windPattern: 'variable' },
      'PIT': { climate: 'cool_moderate', altitude: 745, domeStatus: 'outdoor', windPattern: 'river' },
      'TEX': { climate: 'hot_humid', altitude: 551, domeStatus: 'dome', windPattern: 'controlled' },
      'TB': { climate: 'hot_humid', altitude: 11, domeStatus: 'dome', windPattern: 'controlled' },
      'BOS': { climate: 'cool_moderate', altitude: 20, domeStatus: 'outdoor', windPattern: 'coastal' },
      'CIN': { climate: 'warm_humid', altitude: 550, domeStatus: 'outdoor', windPattern: 'river' },
      'COL': { climate: 'cool_dry', altitude: 5280, domeStatus: 'outdoor', windPattern: 'mountain' },
      'MIN': { climate: 'cool_moderate', altitude: 815, domeStatus: 'outdoor', windPattern: 'continental' },
      'DET': { climate: 'cool_moderate', altitude: 585, domeStatus: 'outdoor', windPattern: 'lakefront' },
      'KC': { climate: 'warm_humid', altitude: 750, domeStatus: 'outdoor', windPattern: 'continental' },
      'CHW': { climate: 'cool_moderate', altitude: 595, domeStatus: 'outdoor', windPattern: 'lakefront' },
      'NYY': { climate: 'moderate_humid', altitude: 55, domeStatus: 'outdoor', windPattern: 'urban' }
    };
  }

  /**
   * Analyze player's environmental adaptation patterns
   */
  async analyzePlayerEnvironmentalAdaptation(playerName, maxDaysBack = 90) {
    const cacheKey = `env_adaptation_${playerName}_${maxDaysBack}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Use season-limited date range to prevent fetching non-existent files
      const currentDate = new Date();
      const dateRange = getSeasonSafeDateRange(currentDate, maxDaysBack);
      
      console.log(`🌍 Environmental adaptation analysis for ${playerName}: ${formatDateRangeDescription(dateRange)}`);
      
      const historicalData = await fetchPlayerDataForDateRange(dateRange.startDate, dateRange.endDate);
      
      const playerGames = historicalData.filter(data => 
        (data.name === playerName || data.fullName === playerName)
      );

      if (playerGames.length === 0) {
        return this.getDefaultEnvironmentalProfile(playerName);
      }

      const environmentalProfile = this.analyzeEnvironmentalPatterns(playerGames);
      
      this.cache.set(cacheKey, {
        data: environmentalProfile,
        timestamp: Date.now()
      });

      return environmentalProfile;
    } catch (error) {
      console.error('Error analyzing environmental adaptation:', error);
      return this.getDefaultEnvironmentalProfile(playerName);
    }
  }

  /**
   * Analyze environmental performance patterns
   */
  analyzeEnvironmentalPatterns(games) {
    const climatePerformance = {};
    const altitudePerformance = {};
    const domeVsOutdoor = { dome: [], outdoor: [] };
    const temperaturePerformance = {};

    // Group games by environmental factors
    games.forEach(game => {
      const venue = this.determineVenue(game);
      const environment = this.stadiumEnvironments[venue];
      
      if (!environment) return;

      // Climate zone performance
      const climate = environment.climate;
      if (!climatePerformance[climate]) {
        climatePerformance[climate] = [];
      }
      climatePerformance[climate].push(game);

      // Altitude performance
      const altitudeCategory = this.categorizeAltitude(environment.altitude);
      if (!altitudePerformance[altitudeCategory]) {
        altitudePerformance[altitudeCategory] = [];
      }
      altitudePerformance[altitudeCategory].push(game);

      // Dome vs outdoor
      domeVsOutdoor[environment.domeStatus].push(game);

      // Temperature performance (estimated)
      const tempCategory = this.estimateTemperatureCategory(climate, game.date);
      if (!temperaturePerformance[tempCategory]) {
        temperaturePerformance[tempCategory] = [];
      }
      temperaturePerformance[tempCategory].push(game);
    });

    return {
      climatePreferences: this.analyzeClimatePreferences(climatePerformance),
      altitudeAdaptation: this.analyzeAltitudeAdaptation(altitudePerformance),
      domePreference: this.analyzeDomePreference(domeVsOutdoor),
      temperatureOptimal: this.analyzeTemperatureOptimal(temperaturePerformance),
      environmentalType: this.determineEnvironmentalType(climatePerformance, altitudePerformance, domeVsOutdoor),
      adaptationScore: 0 // Will be calculated
    };
  }

  /**
   * Determine venue from game data
   */
  determineVenue(game) {
    // Try to determine venue from game data
    if (game.venue && typeof game.venue === 'string') {
      // Try to extract team code from venue
      for (const [teamCode, env] of Object.entries(this.stadiumEnvironments)) {
        if (game.venue.toLowerCase().includes(teamCode.toLowerCase())) {
          return teamCode;
        }
      }
    }
    
    // Fallback: if player's team != opponent team, assume away game
    if (game.opponent && game.team !== game.opponent) {
      return game.opponent;
    }
    
    // Default to player's home team
    return game.team || game.Team;
  }

  /**
   * Categorize altitude levels
   */
  categorizeAltitude(altitude) {
    if (altitude < 500) return 'sea_level';
    if (altitude < 1000) return 'low_elevation';
    if (altitude < 3000) return 'moderate_elevation';
    return 'high_elevation';
  }

  /**
   * Estimate temperature category based on climate and date
   */
  estimateTemperatureCategory(climate, gameDate) {
    const month = new Date(gameDate).getMonth() + 1; // 1-12
    const climateData = this.climateZones[climate];
    
    if (!climateData) return 'moderate';
    
    // Adjust for seasonal variation
    let adjustedTemp = climateData.avgTemp;
    if (month <= 3 || month >= 11) adjustedTemp -= 15; // Winter
    else if (month >= 6 && month <= 8) adjustedTemp += 5; // Summer
    
    if (adjustedTemp < 65) return 'cold';
    if (adjustedTemp < 75) return 'cool';
    if (adjustedTemp < 85) return 'moderate';
    if (adjustedTemp < 95) return 'warm';
    return 'hot';
  }

  /**
   * Analyze climate preferences
   */
  analyzeClimatePreferences(climatePerformance) {
    const preferences = {};
    
    for (const [climate, games] of Object.entries(climatePerformance)) {
      if (games.length < 3) continue; // Need minimum sample
      
      const stats = this.calculateEnvironmentalStats(games);
      preferences[climate] = {
        ...stats,
        sampleSize: games.length,
        preference: this.classifyPreference(stats.battingAverage, stats.homeRuns, games.length)
      };
    }
    
    return preferences;
  }

  /**
   * Analyze altitude adaptation
   */
  analyzeAltitudeAdaptation(altitudePerformance) {
    const adaptation = {};
    
    for (const [altitude, games] of Object.entries(altitudePerformance)) {
      if (games.length < 2) continue;
      
      const stats = this.calculateEnvironmentalStats(games);
      adaptation[altitude] = {
        ...stats,
        sampleSize: games.length,
        adaptation: this.classifyAltitudeAdaptation(altitude, stats.battingAverage, stats.homeRuns)
      };
    }
    
    return adaptation;
  }

  /**
   * Analyze dome vs outdoor preference
   */
  analyzeDomePreference(domeVsOutdoor) {
    const domeStats = this.calculateEnvironmentalStats(domeVsOutdoor.dome);
    const outdoorStats = this.calculateEnvironmentalStats(domeVsOutdoor.outdoor);
    
    const domeDiff = domeStats.battingAverage - outdoorStats.battingAverage;
    
    return {
      domeStats: { ...domeStats, sampleSize: domeVsOutdoor.dome.length },
      outdoorStats: { ...outdoorStats, sampleSize: domeVsOutdoor.outdoor.length },
      preference: domeDiff > 0.020 ? 'dome_preferred' : 
                  domeDiff < -0.020 ? 'outdoor_preferred' : 'neutral',
      difference: domeDiff
    };
  }

  /**
   * Analyze temperature optimal range
   */
  analyzeTemperatureOptimal(temperaturePerformance) {
    const tempPrefs = {};
    
    for (const [temp, games] of Object.entries(temperaturePerformance)) {
      if (games.length < 2) continue;
      
      const stats = this.calculateEnvironmentalStats(games);
      tempPrefs[temp] = {
        ...stats,
        sampleSize: games.length
      };
    }
    
    // Find optimal temperature range
    let bestTemp = null;
    let bestAvg = 0;
    
    for (const [temp, stats] of Object.entries(tempPrefs)) {
      if (stats.sampleSize >= 3 && stats.battingAverage > bestAvg) {
        bestTemp = temp;
        bestAvg = stats.battingAverage;
      }
    }
    
    return {
      preferences: tempPrefs,
      optimalRange: bestTemp,
      temperatureType: this.classifyTemperatureType(tempPrefs)
    };
  }

  /**
   * Calculate environmental statistics
   */
  calculateEnvironmentalStats(games) {
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
      acc.doubles += game['2B'] || 0;
      acc.triples += game['3B'] || 0;
      return acc;
    }, { hits: 0, atBats: 0, homeRuns: 0, rbi: 0, walks: 0, doubles: 0, triples: 0 });

    const battingAverage = totals.atBats > 0 ? totals.hits / totals.atBats : 0;
    const totalBases = totals.hits + totals.doubles + (totals.triples * 2) + (totals.homeRuns * 3);
    const sluggingPercentage = totals.atBats > 0 ? totalBases / totals.atBats : 0;
    const onBasePercentage = (totals.atBats + totals.walks) > 0 ? 
      (totals.hits + totals.walks) / (totals.atBats + totals.walks) : 0;

    return {
      battingAverage: parseFloat(battingAverage.toFixed(3)),
      homeRuns: totals.homeRuns,
      hits: totals.hits,
      atBats: totals.atBats,
      rbi: totals.rbi,
      sluggingPercentage: parseFloat(sluggingPercentage.toFixed(3)),
      onBasePercentage: parseFloat(onBasePercentage.toFixed(3))
    };
  }

  /**
   * Classify environmental preference
   */
  classifyPreference(battingAvg, homeRuns, sampleSize) {
    if (sampleSize < 5) return 'insufficient_data';
    
    if (battingAvg >= 0.320 && homeRuns >= 2) return 'highly_favorable';
    if (battingAvg >= 0.280 && homeRuns >= 1) return 'favorable';
    if (battingAvg >= 0.220) return 'neutral';
    if (battingAvg < 0.180) return 'unfavorable';
    return 'below_average';
  }

  /**
   * Classify altitude adaptation
   */
  classifyAltitudeAdaptation(altitudeCategory, battingAvg, homeRuns) {
    if (altitudeCategory === 'high_elevation') {
      if (battingAvg >= 0.300 || homeRuns >= 3) return 'high_altitude_mastery';
      if (battingAvg < 0.200) return 'altitude_struggles';
      return 'altitude_neutral';
    }
    
    if (altitudeCategory === 'sea_level') {
      if (battingAvg >= 0.300) return 'sea_level_specialist';
      return 'sea_level_neutral';
    }
    
    return 'elevation_neutral';
  }

  /**
   * Classify temperature preference type
   */
  classifyTemperatureType(tempPrefs) {
    const temps = Object.keys(tempPrefs);
    if (temps.length < 2) return 'unknown';
    
    const hotPerformance = tempPrefs.hot?.battingAverage || 0;
    const coldPerformance = tempPrefs.cold?.battingAverage || 0;
    const moderatePerformance = tempPrefs.moderate?.battingAverage || 0;
    
    if (hotPerformance > moderatePerformance + 0.030) return 'heat_lover';
    if (coldPerformance > moderatePerformance + 0.030) return 'cold_weather_specialist';
    if (moderatePerformance > Math.max(hotPerformance, coldPerformance) + 0.020) return 'moderate_weather_optimal';
    return 'temperature_neutral';
  }

  /**
   * Determine overall environmental type
   */
  determineEnvironmentalType(climatePerf, altitudePerf, domeVsOutdoor) {
    const climateCount = Object.keys(climatePerf).length;
    const altitudeCount = Object.keys(altitudePerf).length;
    const domePreference = domeVsOutdoor.dome.length > 0 && domeVsOutdoor.outdoor.length > 0;
    
    // Check for high altitude specialization
    if (altitudePerf.high_elevation && altitudePerf.high_elevation.length >= 5) {
      const highAltStats = this.calculateEnvironmentalStats(altitudePerf.high_elevation);
      if (highAltStats.battingAverage >= 0.300) return 'altitude_specialist';
    }
    
    // Check for climate specialization
    const bestClimate = this.findBestClimate(climatePerf);
    if (bestClimate && bestClimate.games >= 10 && bestClimate.avg >= 0.310) {
      return 'climate_specialist';
    }
    
    // Check for dome preference
    const domeStats = this.calculateEnvironmentalStats(domeVsOutdoor.dome);
    const outdoorStats = this.calculateEnvironmentalStats(domeVsOutdoor.outdoor);
    const domeDiff = domeStats.battingAverage - outdoorStats.battingAverage;
    
    if (Math.abs(domeDiff) > 0.040 && Math.min(domeVsOutdoor.dome.length, domeVsOutdoor.outdoor.length) >= 5) {
      return domeDiff > 0 ? 'dome_specialist' : 'outdoor_specialist';
    }
    
    // General adaptability
    if (climateCount >= 4 && altitudeCount >= 3) return 'highly_adaptable';
    if (climateCount >= 3 || altitudeCount >= 2) return 'adaptable';
    return 'limited_exposure';
  }

  /**
   * Find best climate performance
   */
  findBestClimate(climatePerf) {
    let best = null;
    let bestAvg = 0;
    
    for (const [climate, games] of Object.entries(climatePerf)) {
      if (games.length >= 5) {
        const stats = this.calculateEnvironmentalStats(games);
        if (stats.battingAverage > bestAvg) {
          best = { climate, avg: stats.battingAverage, games: games.length };
          bestAvg = stats.battingAverage;
        }
      }
    }
    
    return best;
  }

  /**
   * Analyze environmental impact for upcoming game
   */
  async analyzeUpcomingGameEnvironmentalImpact(playerName, venueTeam, gameConditions = {}) {
    const playerProfile = await this.analyzePlayerEnvironmentalAdaptation(playerName);
    const venueEnvironment = this.stadiumEnvironments[venueTeam];
    
    if (!venueEnvironment) {
      return this.getDefaultEnvironmentalImpact(playerName, venueTeam);
    }
    
    const climate = venueEnvironment.climate;
    const altitude = this.categorizeAltitude(venueEnvironment.altitude);
    const domeStatus = venueEnvironment.domeStatus;
    
    // Calculate environmental factors
    const climateImpact = this.calculateClimateImpact(playerProfile.climatePreferences[climate]);
    const altitudeImpact = this.calculateAltitudeImpact(playerProfile.altitudeAdaptation[altitude]);
    const domeImpact = this.calculateDomeImpact(playerProfile.domePreference, domeStatus);
    const temperatureImpact = this.calculateTemperatureImpact(playerProfile.temperatureOptimal, gameConditions);
    
    const totalImpact = climateImpact + altitudeImpact + domeImpact + temperatureImpact;
    
    return {
      playerName,
      venueTeam,
      venueEnvironment,
      environmentalImpacts: {
        climate: { factor: climateImpact, details: playerProfile.climatePreferences[climate] },
        altitude: { factor: altitudeImpact, details: playerProfile.altitudeAdaptation[altitude] },
        dome: { factor: domeImpact, details: playerProfile.domePreference },
        temperature: { factor: temperatureImpact, details: playerProfile.temperatureOptimal }
      },
      totalEnvironmentalImpact: totalImpact,
      classification: this.classifyEnvironmentalImpact(totalImpact),
      recommendation: this.getEnvironmentalRecommendation(totalImpact, playerProfile.environmentalType),
      adaptationProfile: playerProfile
    };
  }

  /**
   * Calculate climate impact score
   */
  calculateClimateImpact(climateStats) {
    if (!climateStats || climateStats.sampleSize < 3) return 0;
    
    const { battingAverage, homeRuns, sampleSize, preference } = climateStats;
    
    // Base impact from batting average vs expected (.250)
    let impact = (battingAverage - 0.250) * 40;
    
    // Home run bonus
    if (homeRuns >= 2 && sampleSize >= 8) impact += 5;
    if (homeRuns >= 4 && sampleSize >= 12) impact += 5;
    
    // Preference adjustment
    const preferenceBonus = {
      'highly_favorable': 8,
      'favorable': 4,
      'neutral': 0,
      'below_average': -3,
      'unfavorable': -8
    };
    
    impact += preferenceBonus[preference] || 0;
    
    return Math.max(-15, Math.min(15, impact));
  }

  /**
   * Calculate altitude impact score
   */
  calculateAltitudeImpact(altitudeStats) {
    if (!altitudeStats || altitudeStats.sampleSize < 2) return 0;
    
    const { adaptation, homeRuns, sampleSize } = altitudeStats;
    
    const adaptationScores = {
      'high_altitude_mastery': 12,
      'altitude_struggles': -12,
      'altitude_neutral': 0,
      'sea_level_specialist': 5,
      'elevation_neutral': 0
    };
    
    let impact = adaptationScores[adaptation] || 0;
    
    // High altitude HR bonus
    if (adaptation.includes('high_altitude') && homeRuns >= 2) {
      impact += 5;
    }
    
    return Math.max(-15, Math.min(12, impact));
  }

  /**
   * Calculate dome impact score
   */
  calculateDomeImpact(domePreference, venueStatus) {
    if (!domePreference || Math.min(domePreference.domeStats.sampleSize, domePreference.outdoorStats.sampleSize) < 3) {
      return 0;
    }
    
    const { preference, difference } = domePreference;
    const impact = difference * 25; // Convert batting average difference to impact points
    
    if (venueStatus === 'dome' && preference === 'dome_preferred') {
      return Math.min(10, Math.abs(impact));
    }
    
    if (venueStatus === 'outdoor' && preference === 'outdoor_preferred') {
      return Math.min(8, Math.abs(impact));
    }
    
    if ((venueStatus === 'dome' && preference === 'outdoor_preferred') ||
        (venueStatus === 'outdoor' && preference === 'dome_preferred')) {
      return Math.max(-8, -Math.abs(impact));
    }
    
    return 0;
  }

  /**
   * Calculate temperature impact score
   */
  calculateTemperatureImpact(temperatureOptimal, gameConditions) {
    if (!temperatureOptimal.optimalRange || !gameConditions.expectedTemp) {
      return 0;
    }
    
    const { optimalRange, temperatureType } = temperatureOptimal;
    const expectedTempCategory = this.categorizeGameTemperature(gameConditions.expectedTemp);
    
    if (expectedTempCategory === optimalRange) {
      return temperatureType === 'heat_lover' && expectedTempCategory === 'hot' ? 8 :
             temperatureType === 'cold_weather_specialist' && expectedTempCategory === 'cold' ? 6 : 4;
    }
    
    // Penalty for non-optimal conditions
    const tempDifference = Math.abs(this.getTemperatureValue(expectedTempCategory) - this.getTemperatureValue(optimalRange));
    return Math.max(-6, -tempDifference);
  }

  /**
   * Categorize game temperature
   */
  categorizeGameTemperature(temp) {
    if (temp < 65) return 'cold';
    if (temp < 75) return 'cool';
    if (temp < 85) return 'moderate';
    if (temp < 95) return 'warm';
    return 'hot';
  }

  /**
   * Get numeric value for temperature category
   */
  getTemperatureValue(category) {
    const values = { cold: 1, cool: 2, moderate: 3, warm: 4, hot: 5 };
    return values[category] || 3;
  }

  /**
   * Classify overall environmental impact
   */
  classifyEnvironmentalImpact(totalImpact) {
    if (totalImpact >= 15) return 'highly_favorable';
    if (totalImpact >= 8) return 'favorable';
    if (totalImpact >= -5) return 'neutral';
    if (totalImpact >= -12) return 'unfavorable';
    return 'highly_unfavorable';
  }

  /**
   * Get environmental recommendation
   */
  getEnvironmentalRecommendation(totalImpact, environmentalType) {
    if (totalImpact >= 15) return 'Strong environmental advantage - prioritize player';
    if (totalImpact >= 8) return 'Favorable environmental conditions';
    if (totalImpact >= -5) return 'Neutral environmental impact';
    if (totalImpact >= -12) return 'Environmental concerns - approach with caution';
    return 'Significant environmental disadvantage - avoid player';
  }

  /**
   * Get default environmental impact
   */
  getDefaultEnvironmentalImpact(playerName, venueTeam) {
    return {
      playerName,
      venueTeam,
      venueEnvironment: this.stadiumEnvironments[venueTeam] || {},
      environmentalImpacts: {
        climate: { factor: 0, details: null },
        altitude: { factor: 0, details: null },
        dome: { factor: 0, details: null },
        temperature: { factor: 0, details: null }
      },
      totalEnvironmentalImpact: 0,
      classification: 'neutral',
      recommendation: 'Insufficient environmental data',
      adaptationProfile: this.getDefaultEnvironmentalProfile(playerName)
    };
  }

  /**
   * Get default environmental profile
   */
  getDefaultEnvironmentalProfile(playerName) {
    return {
      playerName,
      climatePreferences: {},
      altitudeAdaptation: {},
      domePreference: {
        domeStats: { battingAverage: 0.250, sampleSize: 0 },
        outdoorStats: { battingAverage: 0.250, sampleSize: 0 },
        preference: 'neutral',
        difference: 0
      },
      temperatureOptimal: {
        preferences: {},
        optimalRange: null,
        temperatureType: 'unknown'
      },
      environmentalType: 'limited_exposure',
      adaptationScore: 0
    };
  }

  /**
   * Get environmental context for venue
   */
  getVenueEnvironmentalContext(venueTeam) {
    const environment = this.stadiumEnvironments[venueTeam];
    if (!environment) return null;
    
    const climateData = this.climateZones[environment.climate];
    
    return {
      venue: venueTeam,
      climate: environment.climate,
      climateCharacteristics: climateData?.characteristics || [],
      altitude: environment.altitude,
      altitudeCategory: this.categorizeAltitude(environment.altitude),
      domeStatus: environment.domeStatus,
      windPattern: environment.windPattern,
      ballCarryFactor: climateData?.ballCarryFactor || 1.0,
      environmentalChallenges: this.identifyEnvironmentalChallenges(environment, climateData)
    };
  }

  /**
   * Identify environmental challenges for venue
   */
  identifyEnvironmentalChallenges(environment, climateData) {
    const challenges = [];
    
    if (environment.altitude > 3000) challenges.push('high_altitude');
    if (climateData?.avgHumidity > 70) challenges.push('high_humidity');
    if (climateData?.avgTemp > 90) challenges.push('extreme_heat');
    if (climateData?.avgTemp < 65) challenges.push('cold_weather');
    if (environment.windPattern === 'marine') challenges.push('variable_winds');
    if (environment.climate === 'hot_humid') challenges.push('heavy_air');
    
    return challenges;
  }
}

// Create and export singleton instance
const environmentalAdaptationService = new EnvironmentalAdaptationService();
export default environmentalAdaptationService;