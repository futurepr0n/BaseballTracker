/**
 * Comprehensive Matchup Service
 * Integrates all data sources for ultimate venue psychology and matchup analysis
 */

import { fetchPlayerData } from './dataService';
import venuePersonalityService from './venuePersonalityService';
import travelImpactAnalyzer from './travelImpactAnalyzer';
import environmentalAdaptationService from './environmentalAdaptationService';
import scheduleAnalysisService from './scheduleAnalysisService';
import baseballAnalysisService from './baseballAnalysisService';
import enhancedTravelService from './enhancedTravelService';
import comprehensiveWeatherService from './comprehensiveWeatherService';
import advancedPitcherIntelligence from './advancedPitcherIntelligence';
import enhancedPitcherIntelligenceService from './enhancedPitcherIntelligenceService';
import { debugLog } from '../utils/debugConfig';
import { normalizeToEnglish, createAllNameVariants, namesMatch } from '../utils/universalNameNormalizer';

class ComprehensiveMatchupService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes for faster updates
  }

  /**
   * Validate if a date is within reasonable MLB season range (RELAXED VERSION)
   */
  isValidMLBDate(dateStr) {
    // Basic format check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 0-based to 1-based
    
    // Check for valid year (reasonable range)
    if (year < 2020 || year > 2030) return false;
    
    // RELAXED: Only block obvious off-season months to prevent major spam
    // Allow most dates since we have various data sources and fallbacks
    if (year <= 2024 && month === 1) return false; // Only block January for past years
    
    return true; // Let the system handle missing data gracefully
  }

  /**
   * Extract active players from today's games only (PERFORMANCE OPTIMIZATION)
   */
  extractActivePlayersFromGames(gameData, lineupData) {
    const activeTeams = new Set();
    const activePlayerSet = new Set();
    
    // Get teams playing today
    gameData.forEach(game => {
      activeTeams.add(game.homeTeam);
      activeTeams.add(game.awayTeam);
    });
    
    // If we have lineup data, use actual starting lineups
    if (lineupData && lineupData.games) {
      lineupData.games.forEach(game => {
        // Add players from confirmed lineups
        if (game.lineups?.home?.batting_order && game.lineups.home.batting_order.length > 0) {
          game.lineups.home.batting_order.forEach(player => {
            if (player.name) activePlayerSet.add(`${player.name}:${game.teams.home.abbr}`);
          });
        }
        if (game.lineups?.away?.batting_order && game.lineups.away.batting_order.length > 0) {
          game.lineups.away.batting_order.forEach(player => {
            if (player.name) activePlayerSet.add(`${player.name}:${game.teams.away.abbr}`);
          });
        }
      });
    }
    
    return {
      activeTeams: Array.from(activeTeams),
      activePlayerKeys: Array.from(activePlayerSet),
      hasLineupsPosted: activePlayerSet.size > 0
    };
  }

  /**
   * Generate comprehensive matchup analysis for a specific date
   */
  async generateComprehensiveMatchups(currentDate, gameData) {
    // Ensure currentDate is a valid Date object
    if (!currentDate || (typeof currentDate !== 'object' && typeof currentDate !== 'string')) {
      throw new Error('Invalid currentDate provided to generateComprehensiveMatchups');
    }
    
    const dateObj = currentDate instanceof Date ? currentDate : new Date(currentDate);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided to generateComprehensiveMatchups');
    }
    
    
    const cacheKey = `comprehensive_matchups_${dateObj.toISOString().split('T')[0]}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      debugLog.log('SERVICES', 'Generating comprehensive matchup analysis...');
      
      let dateStr = dateObj.toISOString().split('T')[0];
      debugLog.log('SERVICES', 'Current date object:', dateObj);
      debugLog.log('SERVICES', 'Calculated dateStr:', dateStr);
      
      // Allow natural date progression - no hardcoded date corrections
      
      debugLog.log('SERVICES', 'Looking for lineup file:', `/data/lineups/starting_lineups_${dateStr}.json`);
      
      // PERFORMANCE OPTIMIZATION: Load lineup data to filter players
      const lineupData = await this.loadPredictionData(`/data/lineups/starting_lineups_${dateStr}.json`);
      const activePlayerInfo = this.extractActivePlayersFromGames(gameData, lineupData);
      
      debugLog.log('SERVICES', `Active teams today: ${activePlayerInfo.activeTeams.join(', ')}`);
      debugLog.log('SERVICES', `Starting lineups posted: ${activePlayerInfo.hasLineupsPosted ? 'YES' : 'NO'}`);
      
      // RELAXED: Only skip obviously invalid dates, allow system to handle missing data
      if (!this.isValidMLBDate(dateStr)) {
        debugLog.log('SERVICES', `Potentially invalid MLB date: ${dateStr}, trying prediction-based analysis`);
        return await this.generatePredictionBasedAnalysis(dateObj, gameData, dateStr);
      }
      
      // Get player data for the date
      const playerData = await fetchPlayerData(dateStr);
      
      // If no historical player data, try to generate predictions using prediction data
      if (!playerData || playerData.length === 0) {
        debugLog.log('SERVICES', 'No historical player data found, generating prediction-based analysis...');
        return await this.generatePredictionBasedAnalysis(dateObj, gameData, dateStr);
      }
      
      // PERFORMANCE OPTIMIZATION: Filter to only players from active teams (if available)
      let filteredPlayerData = playerData;
      
      if (activePlayerInfo.activeTeams.length > 0) {
        filteredPlayerData = playerData.filter(player => 
          activePlayerInfo.activeTeams.includes(player.team) || 
          activePlayerInfo.activeTeams.includes(player.Team)
        );
        
        // If filtering results in very few players, use all data to ensure analysis works
        if (filteredPlayerData.length < 20) {
          debugLog.log('SERVICES', `Filtered data too small (${filteredPlayerData.length}), using all player data`);
          filteredPlayerData = playerData;
        }
      }
      
      // Final safety: limit to prevent overload but ensure we have enough data
      if (filteredPlayerData.length > 200) {
        filteredPlayerData = filteredPlayerData.slice(0, 200);
      }

      debugLog.log('SERVICES', `Using ${filteredPlayerData.length} players for analysis (was ${playerData.length})`);

      // Generate analyses for each game (using filtered player data) with timeout protection
      const gameAnalysisPromises = gameData.map(game => 
        Promise.race([
          this.analyzeIndividualGame(game, filteredPlayerData, dateObj, lineupData),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Game analysis timeout for ${game.homeTeam} vs ${game.awayTeam}`)), 15000)
          )
        ]).catch(error => {
          console.warn(`Failed to analyze game ${game.homeTeam} vs ${game.awayTeam}:`, error.message);
          return null; // Return null for failed game analyses
        })
      );
      
      const gameAnalyses = await Promise.all(gameAnalysisPromises);

      const comprehensiveAnalysis = {
        date: dateStr,
        totalGames: gameData.length,
        gameAnalyses: gameAnalyses.filter(analysis => analysis !== null),
        summary: this.generateOverallSummary(gameAnalyses),
        topOpportunities: this.identifyTopOpportunities(gameAnalyses),
        riskWarnings: this.identifyRiskWarnings(gameAnalyses),
        venueInsights: this.generateVenueInsights(gameAnalyses),
        environmentalFactors: this.summarizeEnvironmentalFactors(gameAnalyses)
      };

      this.cache.set(cacheKey, {
        data: comprehensiveAnalysis,
        timestamp: Date.now()
      });

      return comprehensiveAnalysis;
    } catch (error) {
      console.error('Error generating comprehensive matchups:', error);
      return this.getEmptyAnalysis();
    }
  }


  /**
   * Analyze individual game matchup
   */
  async analyzeIndividualGame(game, playerData, currentDate, lineupData = null) {
    try {
      const { homeTeam, awayTeam, pitcher } = game;
      
      // Ensure currentDate is a valid Date object
      const dateObj = currentDate instanceof Date ? currentDate : new Date(currentDate);
      
      // Use pre-loaded lineup data if available, otherwise load it
      let gameLineupData = null;
      if (lineupData) {
        gameLineupData = this.findGameLineupData(lineupData, homeTeam, awayTeam);
      } else {
        // No lineup data provided - skip pitcher extraction
        gameLineupData = null;
      }
      
      // Extract pitcher information from lineup data
      const pitchers = this.extractPitchersFromLineup(gameLineupData, homeTeam, awayTeam);
      debugLog.log('SERVICES', 'Extracted pitchers for individual game:', pitchers);
      
      // Get players for both teams
      const homeTeamPlayers = playerData.filter(player => 
        (player.team === homeTeam || player.Team === homeTeam)
      );
      const awayTeamPlayers = playerData.filter(player => 
        (player.team === awayTeam || player.Team === awayTeam)
      );

      // Analyze each team's players
      const homeAnalysis = await this.analyzeTeamPlayers(
        homeTeamPlayers, homeTeam, game, dateObj, true
      );
      const awayAnalysis = await this.analyzeTeamPlayers(
        awayTeamPlayers, awayTeam, game, dateObj, false
      );

      // Get BaseballAPI predictions if available
      let apiPredictions = null;
      try {
        // Use pitcher from lineup data if available, fallback to game data
        const pitcherForAPI = pitchers.home || pitchers.away || pitcher;
        if (pitcherForAPI && pitcherForAPI.name) {
          const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
          apiPredictions = await baseballAnalysisService.analyzePitcherVsTeam(
            pitcherForAPI.name, 
            homeTeam, 
            allPlayers
          );
        }
      } catch (error) {
        console.warn('BaseballAPI integration failed:', error);
      }

      return {
        gameId: `${homeTeam}_vs_${awayTeam}`,
        homeTeam,
        awayTeam,
        pitcher,
        pitchers, // Add extracted pitchers data
        venue: homeTeam,
        gameTime: game.dateTime || game.time,
        homeTeamAnalysis: homeAnalysis,
        awayTeamAnalysis: awayAnalysis,
        apiPredictions,
        gameContext: this.analyzeGameContext(game, dateObj),
        overallGameRating: this.calculateOverallGameRating(homeAnalysis, awayAnalysis, apiPredictions)
      };
    } catch (error) {
      console.error('Error analyzing individual game:', error);
      return null;
    }
  }

  /**
   * Analyze team players with comprehensive factors
   */
  async analyzeTeamPlayers(players, teamCode, game, currentDate, isHome) {
    if (players.length === 0) {
      return this.getEmptyTeamAnalysis(teamCode);
    }

    const venue = isHome ? teamCode : game.homeTeam;
    
    // Analyze each player with all factors (with timeout protection)
    const playerAnalysisPromises = players.slice(0, 15).map(player => // Limit to top 15 players for performance
      Promise.race([
        this.analyzePlayerComprehensively(player, venue, teamCode, currentDate, isHome),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Player analysis timeout for ${player.name}`)), 10000)
        )
      ]).catch(error => {
        console.warn(`Failed to analyze player ${player.name}:`, error.message);
        return null; // Return null for failed analyses
      })
    );
    
    const playerAnalyses = await Promise.all(playerAnalysisPromises);

    const validAnalyses = playerAnalyses.filter(analysis => analysis !== null);

    return {
      teamCode,
      isHome,
      venue,
      totalPlayers: validAnalyses.length,
      playerAnalyses: validAnalyses,
      teamSummary: this.summarizeTeamAnalysis(validAnalyses),
      teamAdvantages: this.identifyTeamAdvantages(validAnalyses, isHome),
      teamConcerns: this.identifyTeamConcerns(validAnalyses),
      recommendedTargets: this.identifyRecommendedTargets(validAnalyses)
    };
  }

  /**
   * Analyze player with all comprehensive factors
   */
  async analyzePlayerComprehensively(player, venue, teamCode, currentDate, isHome) {
    try {
      const playerName = player.name || player.fullName;
      
      // Run all analyses in parallel for performance
      const [
        venueAnalysis,
        travelAnalysis,
        environmentalAnalysis,
        scheduleAnalysis
      ] = await Promise.all([
        venuePersonalityService.analyzePlayerVenueHistory(playerName, venue),
        travelImpactAnalyzer.analyzeTravelImpact(teamCode, currentDate, []),
        environmentalAdaptationService.analyzeUpcomingGameEnvironmentalImpact(
          playerName, venue, { expectedTemp: 75 }
        ),
        scheduleAnalysisService.analyzePlayerScheduleImpact(playerName, teamCode, currentDate)
      ]);

      // Calculate comprehensive score
      const comprehensiveScore = this.calculateComprehensiveScore({
        baseStats: player,
        venueAnalysis,
        travelAnalysis,
        environmentalAnalysis,
        scheduleAnalysis,
        isHome
      });

      return {
        playerName,
        team: teamCode,
        isHome,
        baseStats: this.extractRelevantStats(player),
        venueAnalysis,
        travelAnalysis,
        environmentalAnalysis,
        scheduleAnalysis,
        comprehensiveScore,
        factorBreakdown: this.createFactorBreakdown(comprehensiveScore),
        recommendation: this.generatePlayerRecommendation(comprehensiveScore),
        confidenceLevel: this.calculateConfidenceLevel(comprehensiveScore)
      };
    } catch (error) {
      console.error(`Error analyzing player ${player.name}:`, error);
      return null;
    }
  }

  /**
   * Calculate comprehensive performance score
   */
  calculateComprehensiveScore(factors) {
    const { baseStats, venueAnalysis, travelAnalysis, environmentalAnalysis, scheduleAnalysis, isHome } = factors;
    
    // Base performance score (0-100)
    let baseScore = this.calculateBasePerformanceScore(baseStats);
    
    // Venue psychology factor (-20 to +25 points)
    const venueImpact = this.calculateVenueImpact(venueAnalysis);
    
    // Travel impact factor (-15 to +12 points)
    const travelImpact = travelAnalysis.performanceImpact?.netPerformanceImpact || 0;
    
    // Environmental factor (-15 to +15 points)
    const environmentalImpact = environmentalAnalysis.totalEnvironmentalImpact || 0;
    
    // Schedule factor (-10 to +12 points)
    const scheduleImpact = this.calculateScheduleImpact(scheduleAnalysis);
    
    // Home field advantage (+5 points for home team)
    const homeFieldBonus = isHome ? 5 : 0;
    
    const totalScore = Math.max(0, Math.min(100, 
      baseScore + venueImpact + travelImpact + environmentalImpact + scheduleImpact + homeFieldBonus
    ));

    return {
      totalScore,
      baseScore,
      adjustments: {
        venue: venueImpact,
        travel: travelImpact,
        environmental: environmentalImpact,
        schedule: scheduleImpact,
        homeField: homeFieldBonus
      },
      netAdjustment: venueImpact + travelImpact + environmentalImpact + scheduleImpact + homeFieldBonus
    };
  }

  /**
   * Calculate base performance score from player stats
   */
  calculateBasePerformanceScore(stats) {
    // Use recent performance indicators if available
    const battingAvg = stats.AVG || stats.BA || 0.250;
    const homeRuns = stats.HR || 0;
    const hits = stats.H || 0;
    const atBats = stats.AB || 1;
    
    // Base score from batting average (0-40 points)
    let score = Math.max(0, (battingAvg - 0.180) * 200); // .180 = 0 points, .380 = 40 points
    
    // Home run bonus (0-20 points)
    score += Math.min(20, homeRuns * 4);
    
    // Hit consistency bonus (0-15 points)
    if (atBats > 0) {
      const hitRate = hits / atBats;
      score += Math.min(15, hitRate * 30);
    }
    
    // Recent form bonus if available (0-25 points)
    if (stats.last7_AVG) {
      const recentBonus = Math.max(-10, Math.min(15, (stats.last7_AVG - 0.250) * 60));
      score += recentBonus;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate venue impact score
   */
  calculateVenueImpact(venueAnalysis) {
    if (!venueAnalysis || !venueAnalysis.venuePersonality) {
      return 0;
    }

    const { classification, psychologicalFactor } = venueAnalysis.venuePersonality;
    
    switch (classification) {
      case 'venue_master': return 25;
      case 'favorite_park': return 18;
      case 'comfortable': return 8;
      case 'neutral': return 0;
      case 'below_average': return -8;
      case 'house_of_horrors': return -20;
      default: return psychologicalFactor || 0;
    }
  }

  /**
   * Calculate schedule impact score
   */
  calculateScheduleImpact(scheduleAnalysis) {
    if (!scheduleAnalysis || !scheduleAnalysis.currentScheduleStatus) {
      return 0;
    }

    const { fatigueRisk, restAdvantage, schedulePhase } = scheduleAnalysis.currentScheduleStatus;
    
    let impact = 0;
    
    // Rest advantage
    impact += (restAdvantage || 0) * 0.8;
    
    // Fatigue penalty
    impact -= (fatigueRisk || 0) * 0.4;
    
    // Schedule phase adjustment
    const phaseAdjustments = {
      'fresh_start': 8,
      'normal_rhythm': 0,
      'active_streak': -2,
      'extended_streak': -6,
      'back_to_back': -4
    };
    
    impact += phaseAdjustments[schedulePhase] || 0;
    
    return Math.max(-10, Math.min(12, impact));
  }

  /**
   * Create factor breakdown for display
   */
  createFactorBreakdown(comprehensiveScore) {
    const { baseScore, adjustments } = comprehensiveScore;
    
    return {
      basePerformance: {
        score: baseScore,
        description: this.describeBasePerformance(baseScore)
      },
      venueFactors: {
        score: adjustments.venue,
        description: this.describeVenueFactors(adjustments.venue)
      },
      travelFactors: {
        score: adjustments.travel,
        description: this.describeTravelFactors(adjustments.travel)
      },
      environmentalFactors: {
        score: adjustments.environmental,
        description: this.describeEnvironmentalFactors(adjustments.environmental)
      },
      scheduleFactors: {
        score: adjustments.schedule,
        description: this.describeScheduleFactors(adjustments.schedule)
      },
      homeFieldAdvantage: {
        score: adjustments.homeField,
        description: adjustments.homeField > 0 ? 'Home field advantage' : 'Away game'
      }
    };
  }

  /**
   * Generate player recommendation
   */
  generatePlayerRecommendation(comprehensiveScore) {
    const { totalScore, netAdjustment } = comprehensiveScore;
    
    if (totalScore >= 85) return { 
      action: 'STRONG_TARGET', 
      reason: 'Elite opportunity with multiple favorable factors',
      priority: 'high'
    };
    
    if (totalScore >= 75) return { 
      action: 'TARGET', 
      reason: 'Strong opportunity with favorable context',
      priority: 'high'
    };
    
    if (totalScore >= 65) return { 
      action: 'CONSIDER', 
      reason: 'Solid opportunity worth consideration',
      priority: 'medium'
    };
    
    if (totalScore >= 50) return { 
      action: 'NEUTRAL', 
      reason: 'Average opportunity with mixed factors',
      priority: 'medium'
    };
    
    if (totalScore >= 35) return { 
      action: 'CAUTION', 
      reason: 'Below average opportunity with concerns',
      priority: 'low'
    };
    
    return { 
      action: 'AVOID', 
      reason: 'Poor opportunity with multiple negative factors',
      priority: 'low'
    };
  }

  /**
   * Calculate confidence level
   */
  calculateConfidenceLevel(comprehensiveScore) {
    const { baseScore, adjustments } = comprehensiveScore;
    
    // Start with base confidence
    let confidence = 60;
    
    // Increase confidence with more data sources
    const factorCount = Object.values(adjustments).filter(adj => Math.abs(adj) > 1).length;
    confidence += factorCount * 8;
    
    // Decrease confidence for extreme adjustments (might indicate data issues)
    const totalAdjustment = Math.abs(comprehensiveScore.netAdjustment);
    if (totalAdjustment > 30) confidence -= 10;
    
    // Increase confidence for consistent factors
    const positiveFactors = Object.values(adjustments).filter(adj => adj > 5).length;
    const negativeFactors = Object.values(adjustments).filter(adj => adj < -5).length;
    
    if (positiveFactors >= 3 || negativeFactors >= 3) confidence += 15;
    
    return Math.max(20, Math.min(95, confidence));
  }

  /**
   * Analyze game context
   */
  analyzeGameContext(game, currentDate) {
    // Ensure currentDate is a valid Date object
    const dateObj = currentDate instanceof Date ? currentDate : new Date(currentDate);
    
    return {
      gameTime: game.dateTime || game.time,
      dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      pitcher: game.pitcher,
      weather: game.weather || 'Unknown',
      gameImportance: this.assessGameImportance(game, dateObj),
      seasonContext: this.getSeasonContext(dateObj)
    };
  }

  /**
   * Extract relevant stats from player data
   */
  extractRelevantStats(player) {
    return {
      name: player.name || player.fullName,
      team: player.team || player.Team,
      battingAverage: player.AVG || player.BA || 0,
      homeRuns: player.HR || 0,
      hits: player.H || 0,
      atBats: player.AB || 0,
      rbi: player.RBI || 0,
      recent: {
        last7_AVG: player.last7_AVG,
        last7_HR: player.last7_HR,
        streak: player.streak
      }
    };
  }

  /**
   * Calculate overall game rating
   */
  calculateOverallGameRating(homeAnalysis, awayAnalysis, apiPredictions) {
    let rating = 0;
    let factors = 0;
    
    // Home team factor
    if (homeAnalysis && homeAnalysis.teamSummary) {
      rating += homeAnalysis.teamSummary.averageScore || 50;
      factors++;
    }
    
    // Away team factor
    if (awayAnalysis && awayAnalysis.teamSummary) {
      rating += awayAnalysis.teamSummary.averageScore || 50;
      factors++;
    }
    
    // API predictions factor
    if (apiPredictions && apiPredictions.predictions) {
      const avgApiScore = apiPredictions.predictions.reduce((sum, pred) => 
        sum + (pred.hr_score || 50), 0) / apiPredictions.predictions.length;
      rating += avgApiScore;
      factors++;
    }
    
    const finalRating = factors > 0 ? rating / factors : 50;
    
    return {
      score: Math.round(finalRating),
      classification: this.classifyGameRating(finalRating),
      factors: factors
    };
  }

  /**
   * Classify game rating
   */
  classifyGameRating(rating) {
    if (rating >= 80) return 'ELITE_GAME';
    if (rating >= 70) return 'HIGH_QUALITY';
    if (rating >= 60) return 'ABOVE_AVERAGE';
    if (rating >= 50) return 'AVERAGE';
    if (rating >= 40) return 'BELOW_AVERAGE';
    return 'LOW_QUALITY';
  }

  /**
   * Summarize team analysis
   */
  summarizeTeamAnalysis(playerAnalyses) {
    if (playerAnalyses.length === 0) {
      return { averageScore: 50, topPlayers: [], teamStrength: 'unknown' };
    }

    const scores = playerAnalyses.map(p => p.comprehensiveScore.totalScore);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const topPlayers = playerAnalyses
      .sort((a, b) => b.comprehensiveScore.totalScore - a.comprehensiveScore.totalScore)
      .slice(0, 5)
      .map(p => ({
        name: p.playerName,
        score: p.comprehensiveScore.totalScore,
        recommendation: p.recommendation
      }));

    return {
      averageScore: Math.round(averageScore),
      topPlayers,
      teamStrength: this.classifyTeamStrength(averageScore),
      highConfidencePlayers: playerAnalyses.filter(p => p.confidenceLevel >= 80).length
    };
  }

  /**
   * Classify team strength
   */
  classifyTeamStrength(averageScore) {
    if (averageScore >= 75) return 'ELITE';
    if (averageScore >= 65) return 'STRONG';
    if (averageScore >= 55) return 'AVERAGE';
    if (averageScore >= 45) return 'BELOW_AVERAGE';
    return 'WEAK';
  }

  /**
   * Helper methods for descriptions
   */
  describeBasePerformance(score) {
    if (score >= 80) return 'Elite recent performance';
    if (score >= 65) return 'Strong recent performance';
    if (score >= 50) return 'Average recent performance';
    if (score >= 35) return 'Below average performance';
    return 'Poor recent performance';
  }

  describeVenueFactors(score) {
    if (score >= 20) return 'Venue mastery - elite historical performance';
    if (score >= 10) return 'Venue advantage - strong historical performance';
    if (score >= 5) return 'Venue comfort - positive historical performance';
    if (score >= -5) return 'Neutral venue performance';
    if (score >= -15) return 'Venue struggles - concerning historical performance';
    return 'Venue nightmare - poor historical performance';
  }

  describeTravelFactors(score) {
    if (score >= 10) return 'Travel advantage - well rested';
    if (score >= 5) return 'Positive travel situation';
    if (score >= -5) return 'Neutral travel impact';
    if (score >= -10) return 'Travel concerns - moderate fatigue';
    return 'Significant travel fatigue';
  }

  describeEnvironmentalFactors(score) {
    if (score >= 10) return 'Favorable environmental conditions';
    if (score >= 5) return 'Positive environmental factors';
    if (score >= -5) return 'Neutral environmental impact';
    if (score >= -10) return 'Environmental concerns';
    return 'Unfavorable environmental conditions';
  }

  describeScheduleFactors(score) {
    if (score >= 8) return 'Excellent schedule situation - well rested';
    if (score >= 4) return 'Favorable schedule factors';
    if (score >= -2) return 'Normal schedule rhythm';
    if (score >= -6) return 'Schedule concerns - fatigue risk';
    return 'Poor schedule situation - high fatigue';
  }

  /**
   * Generate prediction-based analysis when no historical data is available
   */
  async generatePredictionBasedAnalysis(currentDate, gameData, dateStr) {
    try {
      // Load prediction data sources
      const [hrPredictions, lineupData, pitcherMatchups] = await Promise.all([
        this.loadPredictionData(`/data/predictions/hr_predictions_${dateStr}.json`),
        this.loadPredictionData(`/data/lineups/starting_lineups_${dateStr}.json`),
        this.loadPredictionData(`/data/predictions/pitcher_matchups_${dateStr}.json`)
      ]);

      if (!gameData || gameData.length === 0) {
        return this.getEmptyAnalysis();
      }

      // Generate analysis for each game using prediction data
      const gameAnalyses = await Promise.all(
        gameData.map(game => this.analyzePredictiveGame(game, hrPredictions, lineupData, pitcherMatchups, currentDate))
      );

      const validAnalyses = gameAnalyses.filter(analysis => analysis !== null);

      return {
        date: dateStr,
        totalGames: gameData.length,
        gameAnalyses: validAnalyses,
        summary: this.generatePredictiveSummary(validAnalyses),
        topOpportunities: this.identifyPredictiveOpportunities(validAnalyses),
        riskWarnings: this.identifyPredictiveWarnings(validAnalyses),
        venueInsights: this.generatePredictiveVenueInsights(validAnalyses),
        environmentalFactors: this.summarizePredictiveFactors(validAnalyses),
        predictionBased: true
      };
    } catch (error) {
      console.error('Error generating prediction-based analysis:', error);
      return this.getEmptyAnalysis();
    }
  }

  /**
   * Load prediction data from JSON files
   */
  async loadPredictionData(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(`Failed to load prediction data: ${path}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.warn(`Error loading prediction data from ${path}:`, error);
      return null;
    }
  }

  /**
   * Analyze game using predictive data
   */
  async analyzePredictiveGame(game, hrPredictions, lineupData, pitcherMatchups, currentDate) {
    try {
      console.log('analyzePredictiveGame called for:', game.homeTeam, 'vs', game.awayTeam);
      const { homeTeam, awayTeam } = game;
      
      // Ensure currentDate is a valid Date object
      const dateObj = currentDate instanceof Date ? currentDate : new Date(currentDate);
      let dateStr = dateObj.toISOString().split('T')[0];
      
      // Allow natural date progression - no hardcoded date corrections
      
      // Find game-specific lineup data
      debugLog.log('SERVICES', 'Looking for lineup data for:', homeTeam, 'vs', awayTeam);
      const gameLineupData = this.findGameLineupData(lineupData, homeTeam, awayTeam);
      debugLog.log('SERVICES', 'Found lineup data:', gameLineupData ? 'YES' : 'NO');
      if (gameLineupData) {
        debugLog.log('SERVICES', 'Lineup pitchers:', gameLineupData.pitchers);
      }
      
      // Extract players for both teams using hierarchical approach
      const homeTeamPlayers = await this.extractTeamPlayers(hrPredictions, homeTeam, gameLineupData, currentDate);
      const awayTeamPlayers = await this.extractTeamPlayers(hrPredictions, awayTeam, gameLineupData, currentDate);
      
      debugLog.log('SERVICES', `Final player counts: ${homeTeam}=${homeTeamPlayers.length}, ${awayTeam}=${awayTeamPlayers.length}`);
      debugLog.log('SERVICES', `Home team players:`, homeTeamPlayers.map(p => `${p.name} (${p.source})`));
      debugLog.log('SERVICES', `Away team players:`, awayTeamPlayers.map(p => `${p.name} (${p.source})`));
      debugLog.log('SERVICES', `Players with HR context: Home=${homeTeamPlayers.filter(p => p.hrContextAvailable).length}, Away=${awayTeamPlayers.filter(p => p.hrContextAvailable).length}`);

      // Find pitcher matchup data and generate advanced pitcher intelligence first
      const matchupData = this.findPitcherMatchupData(pitcherMatchups, homeTeam, awayTeam);
      
      // Extract pitcher information from lineup data
      const pitchers = this.extractPitchersFromLineup(gameLineupData, homeTeam, awayTeam);
      debugLog.log('SERVICES', 'Extracted pitchers:', pitchers);
      
      // Prepare pitcher data for analysis
      const homePitcher = pitchers.home || (game.pitcher && game.homeTeam === homeTeam ? game.pitcher : null);
      const awayPitcher = pitchers.away || (game.pitcher && game.awayTeam === awayTeam ? game.pitcher : null);
      
      // Generate comprehensive pitcher intelligence with enhanced service
      let pitcherIntelligence = null;
      if (pitchers.home || pitchers.away) {
        try {
          pitcherIntelligence = await enhancedPitcherIntelligenceService.generateGamePitcherIntelligence(
            pitchers,
            homeTeamPlayers,
            awayTeamPlayers,
            { 
              venue: game.venue, 
              gameTime: game.dateTime, 
              homeTeam, 
              awayTeam,
              gameDate: dateStr
            }
          );
          
          debugLog.log('SERVICES', 'Enhanced pitcher intelligence generated:', pitcherIntelligence);
        } catch (error) {
          console.warn('Enhanced pitcher intelligence failed, trying basic:', error);
          
          // Fallback to basic pitcher intelligence
          if (homePitcher || awayPitcher || game.pitcher || matchupData?.pitcher) {
            const pitcher = homePitcher || awayPitcher || game.pitcher || matchupData.pitcher;
            
            if (pitcher) {
              const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
              
              try {
                pitcherIntelligence = await advancedPitcherIntelligence.generateComprehensivePitcherAnalysis(
                  pitcher, 
                  allPlayers, 
                  { venue: game.venue, gameTime: game.dateTime, homeTeam, awayTeam, pitchers }
                );
              } catch (fallbackError) {
                console.warn('Basic pitcher intelligence also failed:', fallbackError);
              }
            }
          }
        }
      }

      // Generate predictive analysis for each team (now with pitcher intelligence)
      const homeAnalysis = await this.analyzePredictiveTeam(
        homeTeamPlayers, homeTeam, game, gameLineupData, hrPredictions, true, pitcherIntelligence
      );
      const awayAnalysis = await this.analyzePredictiveTeam(
        awayTeamPlayers, awayTeam, game, gameLineupData, hrPredictions, false, pitcherIntelligence
      );

      return {
        gameId: `${homeTeam}_vs_${awayTeam}`,
        homeTeam,
        awayTeam,
        venue: game.venue || homeTeam,
        gameTime: game.dateTime || game.time,
        pitcher: homePitcher || awayPitcher || null, // Add pitcher info for PitcherStatsSection
        pitchers, // Add both pitchers for comprehensive analysis
        homeTeamAnalysis: homeAnalysis,
        awayTeamAnalysis: awayAnalysis,
        matchupData,
        pitcherIntelligence,
        gameContext: this.analyzeGameContext(game, dateObj),
        overallGameRating: this.calculateEnhancedPredictiveGameRating(homeAnalysis, awayAnalysis, matchupData, pitcherIntelligence),
        predictionBased: true,
        enhancedAnalysis: true
      };
    } catch (error) {
      console.error('Error analyzing predictive game:', error);
      return null;
    }
  }

  /**
   * Extract team players using hierarchical approach
   * 1. Batting order from lineup (when available)
   * 2. Roster data for all team players (with restrictions for non-lineup players)
   * 3. HR predictions as enhancement context
   */
  async extractTeamPlayers(predictions, team, gameLineupData = null, currentDate = new Date()) {
    debugLog.log('SERVICES', `Extracting players for team: ${team}`);
    
    try {
      // Step 1: Try to get players from batting order (when lineups are posted)
      const battingOrderPlayers = this.extractPlayersFromBattingOrder(gameLineupData, team);
      
      if (battingOrderPlayers.length > 0) {
        debugLog.log('SERVICES', `✅ Found ${battingOrderPlayers.length} players from LINEUP for ${team} (no restrictions applied)`);
        return await this.enhancePlayersWithHRContext(battingOrderPlayers, predictions, team);
      }
      
      // Step 2: Fall back to roster data for comprehensive team analysis
      debugLog.log('SERVICES', `No batting order available, using roster data for ${team} with restrictions (10+ games, active in last 3 games)`);
      const rosterPlayers = await this.extractPlayersFromRoster(team, 10, currentDate);
      
      if (rosterPlayers.length > 0) {
        debugLog.log('SERVICES', `🔍 Found ${rosterPlayers.length} players from ROSTER for ${team} (after applying restrictions)`);
        return await this.enhancePlayersWithHRContext(rosterPlayers, predictions, team);
      }
      
      // Step 3: Emergency fallback to HR predictions only
      debugLog.log('SERVICES', `No roster data available, using HR predictions only for ${team}`);
      return this.extractPlayersFromHRPredictions(predictions, team);
      
    } catch (error) {
      console.error(`Error in hierarchical player extraction for ${team}:`, error);
      return this.extractPlayersFromHRPredictions(predictions, team);
    }
  }

  /**
   * Extract players from batting order when lineups are posted
   */
  extractPlayersFromBattingOrder(gameLineupData, team) {
    if (!gameLineupData || !gameLineupData.lineups) {
      return [];
    }
    
    const isHome = gameLineupData.teams?.home?.abbr === team;
    const isAway = gameLineupData.teams?.away?.abbr === team;
    
    if (!isHome && !isAway) {
      return [];
    }
    
    const lineup = isHome ? gameLineupData.lineups.home : gameLineupData.lineups.away;
    
    if (!lineup?.batting_order || lineup.batting_order.length === 0) {
      return [];
    }
    
    // Convert batting order to player objects
    return lineup.batting_order.map((player, index) => ({
      name: player.name || player.fullName,
      fullName: player.fullName || player.name,
      team: team,
      battingOrder: index + 1,
      position: player.position,
      source: 'batting_order',
      // Include any available stats from lineup data
      battingAvg: player.avg || 0,
      homeRuns: player.hr || 0,
      rbi: player.rbi || 0
    }));
  }

  /**
   * Check if a player has played in the last N games
   */
  async hasPlayedInRecentGames(playerName, team, currentDate, daysToCheck = 3) {
    try {
      const { fetchPlayerDataForDateRange } = await import('./dataService');
      
      // Get the last N days of data
      const endDate = new Date(currentDate);
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - daysToCheck);
      
      const recentData = await fetchPlayerDataForDateRange(startDate, endDate);
      
      if (!recentData || recentData.length === 0) {
        return false;
      }
      
      // Check if player appears in any of the recent game data
      for (const dayData of recentData) {
        if (Array.isArray(dayData)) {
          const foundPlayer = dayData.find(player => 
            (player.name === playerName || player.fullName === playerName) && 
            player.team === team &&
            (player.AB > 0 || player.H > 0 || player.games > 0) // Actual game participation
          );
          if (foundPlayer) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.warn(`Error checking recent games for ${playerName}:`, error);
      // If we can't check recent games, assume they're active to avoid false negatives
      return true;
    }
  }

  /**
   * Extract players from roster data (fallback when no batting order)
   * 
   * RESTRICTIONS FOR NON-LINEUP PLAYERS:
   * - Minimum 10 games played in 2024 season (changed from 20)
   * - Must have played in at least one of the last 3 games
   * - This eliminates outlier players who haven't played significantly
   * 
   * NOTE: These restrictions only apply when sourcing from roster data.
   * Players from batting order (lineup) are NOT filtered.
   */
  async extractPlayersFromRoster(team, minGames = 10, currentDate = new Date()) {
    try {
      const { fetchRosterData } = await import('./dataService');
      const rosterData = await fetchRosterData();
      
      if (!rosterData || !Array.isArray(rosterData)) {
        console.warn(`No roster data available for ${team}`);
        return [];
      }
      
      // Apply initial filtering for team, type, and basic stats
      const initialFilter = rosterData.filter(player => 
        player.team === team && 
        player.type === 'hitter' && 
        player.stats &&
        player.stats['2024_Games'] >= minGames // Must have played at least minimum games
      );

      debugLog.log('SERVICES', `Initial roster filter for ${team}: ${initialFilter.length} players with ${minGames}+ games`);
      
      // Apply recent activity restriction
      const activePlayersPromises = initialFilter.map(async (player) => {
        const hasRecentActivity = await this.hasPlayedInRecentGames(
          player.name, 
          team, 
          currentDate, 
          3 // Last 3 days
        );
        
        return hasRecentActivity ? player : null;
      });
      
      const activePlayersResults = await Promise.all(activePlayersPromises);
      const teamPlayers = activePlayersResults
        .filter(player => player !== null)
        .sort((a, b) => (b.stats['2024_Games'] || 0) - (a.stats['2024_Games'] || 0)); // Sort by games played
      
      debugLog.log('SERVICES', `After recent activity filter for ${team}: ${teamPlayers.length} active players`);
      
      if (initialFilter.length > teamPlayers.length) {
        const filtered = initialFilter.length - teamPlayers.length;
        debugLog.log('SERVICES', `⚠️ Filtered out ${filtered} players from ${team} roster (inactive in last 3 games)`);
      }
      
      // Convert roster players to consistent format
      return teamPlayers.map(rosterPlayer => ({
        name: rosterPlayer.name,
        fullName: rosterPlayer.fullName,
        team: rosterPlayer.team,
        source: 'roster_filtered', // Indicates this player passed the 10+ games & recent activity filter
        // Include comprehensive stats from roster
        gamesPlayed: rosterPlayer.stats['2024_Games'] || 0,
        homeRunsThisSeason: rosterPlayer.stats['2024_HR'] || 0,
        battingAvg: rosterPlayer.stats['2024_AVG'] || 0,
        slugging: rosterPlayer.stats['2024_SLG'] || 0,
        onBase: rosterPlayer.stats['2024_OBP'] || 0,
        atBats: rosterPlayer.stats['2024_AB'] || 0,
        runs: rosterPlayer.stats['2024_R'] || 0,
        hits: rosterPlayer.stats['2024_H'] || 0,
        rbi: rosterPlayer.stats['2024_RBI'] || 0,
        strikeouts: rosterPlayer.stats['2024_SO'] || 0,
        walks: rosterPlayer.stats['2024_BB'] || 0,
        hrRate: rosterPlayer.stats['2024_Games'] > 0 ? 
          (rosterPlayer.stats['2024_HR'] || 0) / rosterPlayer.stats['2024_Games'] : 0
      }));
      
    } catch (error) {
      console.error(`Error loading roster data for ${team}:`, error);
      return [];
    }
  }

  /**
   * Enhance players with HR prediction context (not as filter)
   */
  async enhancePlayersWithHRContext(players, hrPredictions, team) {
    if (!hrPredictions?.predictions || !Array.isArray(hrPredictions.predictions)) {
      // Return players without HR enhancement if no predictions available
      return players.map(player => ({
        ...player,
        isDue: false,
        dueScore: 0,
        hrContextAvailable: false
      }));
    }
    
    const hrPredictionMap = new Map();
    hrPredictions.predictions
      .filter(pred => pred.team === team || pred.Team === team)
      .forEach(pred => {
        hrPredictionMap.set(pred.name || pred.fullName, pred);
      });
    
    return players.map(player => {
      const playerKey = player.name || player.fullName;
      const hrData = hrPredictionMap.get(playerKey);
      
      if (hrData) {
        // Enhanced player with HR prediction context
        return {
          ...player,
          // HR prediction enhancements
          isDue: hrData.isDue || false,
          dueScore: hrData.dueScore || 0,
          gamesSinceLastHR: hrData.gamesSinceLastHR,
          daysSinceLastHR: hrData.daysSinceLastHR,
          lastHRDate: hrData.lastHRDate,
          expectedGamesBetweenHRs: hrData.expectedGamesBetweenHRs,
          hrDeficit: hrData.hrDeficit,
          hrContextAvailable: true,
          source: `${player.source}_enhanced`
        };
      } else {
        // Player without HR prediction data
        return {
          ...player,
          isDue: false,
          dueScore: 0,
          hrContextAvailable: false
        };
      }
    });
  }

  /**
   * Fallback: Extract players from HR predictions only (emergency)
   */
  extractPlayersFromHRPredictions(predictions, team) {
    if (!predictions || !Array.isArray(predictions)) return [];
    
    return predictions.filter(player => 
      player.team === team || player.Team === team
    ).map(player => ({
      ...player,
      source: 'hr_prediction_only',
      hrContextAvailable: true
    })).slice(0, 15); // Limit for performance
  }

  /**
   * Extract pitcher information from lineup data
   */
  extractPitchersFromLineup(gameLineupData, homeTeam, awayTeam) {
    if (!gameLineupData || !gameLineupData.pitchers) {
      return { home: null, away: null };
    }

    const pitchers = gameLineupData.pitchers;
    
    return {
      home: pitchers.home ? {
        name: pitchers.home.name,
        id: pitchers.home.id,
        throws: pitchers.home.throws,
        era: pitchers.home.era,
        record: pitchers.home.record,
        team: homeTeam,
        status: pitchers.home.status,
        confidence: pitchers.home.confidence
      } : null,
      away: pitchers.away ? {
        name: pitchers.away.name,
        id: pitchers.away.id,
        throws: pitchers.away.throws,
        era: pitchers.away.era,
        record: pitchers.away.record,
        team: awayTeam,
        status: pitchers.away.status,
        confidence: pitchers.away.confidence
      } : null
    };
  }

  /**
   * Analyze team using predictive data
   */
  async analyzePredictiveTeam(players, teamCode, game, lineupData, hrPredictions, isHome, pitcherIntelligence = null) {
    if (players.length === 0) {
      return this.getEmptyTeamAnalysis(teamCode);
    }

    // Generate predictive analysis for each player
    const playerAnalyses = await Promise.all(
      players.map(player => 
        this.analyzePredictivePlayer(player, teamCode, game, isHome, pitcherIntelligence)
      )
    );
    
    const validAnalyses = playerAnalyses.filter(analysis => analysis !== null);

    return {
      teamCode,
      isHome,
      venue: isHome ? teamCode : game.homeTeam,
      totalPlayers: validAnalyses.length,
      playerAnalyses: validAnalyses,
      teamSummary: this.summarizePredictiveTeam(validAnalyses),
      teamAdvantages: this.identifyPredictiveAdvantages(validAnalyses, isHome),
      teamConcerns: this.identifyPredictiveConcerns(validAnalyses),
      recommendedTargets: this.identifyPredictiveTargets(validAnalyses),
      predictionBased: true
    };
  }

  /**
   * Analyze individual player using predictive data + venue/travel analysis
   */
  async analyzePredictivePlayer(player, teamCode, game, isHome, pitcherIntelligence = null) {
    try {
      const playerName = player.fullName || player.name;
      const venue = game.venue || (isHome ? teamCode : game.homeTeam);
      
      // Get comprehensive analysis using enhanced services
      const [venueAnalysis, enhancedTravelAnalysis, weatherAnalysis] = await Promise.all([
        venuePersonalityService.analyzePlayerVenueHistory(playerName, venue).catch(err => {
          console.warn(`Venue analysis failed for ${playerName}:`, err);
          return null;
        }),
        enhancedTravelService.analyzeRealTravelImpact(teamCode, new Date(), venue).catch(err => {
          console.warn(`Enhanced travel analysis failed for ${teamCode}:`, err);
          return null;
        }),
        comprehensiveWeatherService.analyzeWeatherImpact(venue, game.dateTime || new Date(), [player]).catch(err => {
          console.warn(`Weather analysis failed for ${venue}:`, err);
          // Return a fallback weather analysis instead of null
          return {
            overallImpact: 0,
            totalEnvironmentalImpact: 0,
            conditions: 'Weather data unavailable',
            windImpact: 'Unknown',
            temperatureImpact: 'Unknown',
            precipitationImpact: 'Unknown',
            playerImpacts: [],
            environmentalFactors: {
              description: 'Weather data could not be loaded',
              impacts: ['No weather data available']
            },
            environmentalImpacts: {
              climate: { factor: 0, description: 'Weather data unavailable' },
              altitude: { factor: 0, description: 'Standard altitude' },
              dome: { factor: 0, description: 'Unknown conditions' }
            },
            classification: 'unknown',
            recommendation: 'Weather impact unknown'
          };
        })
      ]);
      
      // Calculate comprehensive score including all factors
      const comprehensiveScore = await this.calculateUltimateComprehensiveScore(
        player, 
        isHome, 
        venueAnalysis, 
        enhancedTravelAnalysis, 
        weatherAnalysis
      );
      
      return {
        playerName,
        team: teamCode,
        isHome,
        baseStats: this.extractPredictiveStats(player),
        comprehensiveScore,
        factorBreakdown: this.createUltimateFactorBreakdown(
          comprehensiveScore, 
          player, 
          venueAnalysis, 
          enhancedTravelAnalysis, 
          weatherAnalysis,
          pitcherIntelligence
        ),
        recommendation: this.generatePlayerRecommendation(comprehensiveScore),
        confidenceLevel: this.calculateEnhancedConfidence(player, venueAnalysis, weatherAnalysis),
        venueAnalysis,
        travelAnalysis: enhancedTravelAnalysis,
        environmentalAnalysis: weatherAnalysis,
        predictionBased: true,
        enhancedAnalysis: true,
        hrPredictionData: {
          isDue: player.isDue,
          dueScore: player.dueScore,
          gamesSinceLastHR: player.gamesSinceLastHR,
          daysSinceLastHR: player.daysSinceLastHR,
          hrRate: player.hrRate,
          expectedHRs: player.expectedHRs
        }
      };
    } catch (error) {
      console.error(`Error analyzing predictive player ${player.name}:`, error);
      return null;
    }
  }

  /**
   * Calculate ultimate comprehensive score including all enhanced factors + contextual bonuses
   */
  async calculateUltimateComprehensiveScore(player, isHome, venueAnalysis, enhancedTravelAnalysis, weatherAnalysis) {
    // Base score from HR prediction data
    let baseScore = 50; // Start with neutral
    
    // Due factor (major component)
    if (player.isDue && player.dueScore) {
      baseScore += Math.min(30, player.dueScore * 5); // Up to 30 points for being due
    }
    
    // HR rate factor
    if (player.hrRate) {
      const hrRateScore = Math.min(15, (player.hrRate - 0.05) * 150); // Bonus for high HR rate
      baseScore += Math.max(-5, hrRateScore);
    }
    
    // Games since last HR (pressure factor)
    if (player.gamesSinceLastHR) {
      const pressureScore = Math.min(10, (player.gamesSinceLastHR - 10) * 0.5);
      baseScore += Math.max(0, pressureScore);
    }
    
    // Enhanced factors
    const venueImpact = this.calculateVenueImpact(venueAnalysis);
    const travelImpact = enhancedTravelAnalysis?.travelImpact || 0;
    const weatherImpact = weatherAnalysis?.overallImpact || 0;
    const restAdvantage = enhancedTravelAnalysis?.restAdvantage || 0;
    
    // Home field advantage
    const homeFieldBonus = isHome ? 5 : 0;
    
    // NEW: Calculate contextual bonuses from additional analysis systems
    const contextualAnalysis = await this.calculateEnhancedContextualScore(player, baseScore);
    
    const totalScore = Math.max(20, Math.min(95, 
      baseScore + venueImpact + travelImpact + weatherImpact + restAdvantage + homeFieldBonus + contextualAnalysis.contextualBonus
    ));
    
    return {
      totalScore,
      baseScore,
      contextualBonus: contextualAnalysis.contextualBonus,
      contextualBadges: contextualAnalysis.badges,
      hellraiserData: contextualAnalysis.hellraiserData,
      adjustments: {
        venue: venueImpact,
        travel: travelImpact,
        environmental: weatherImpact,
        schedule: restAdvantage,
        homeField: homeFieldBonus,
        contextual: contextualAnalysis.contextualBonus,
        // Additional predictive adjustments
        due: player.isDue ? (player.dueScore * 5) : 0,
        hrRate: player.hrRate ? ((player.hrRate - 0.05) * 150) : 0,
        pressure: player.gamesSinceLastHR ? Math.max(0, (player.gamesSinceLastHR - 10) * 0.5) : 0
      },
      scoringBreakdown: contextualAnalysis.explanation,
      netAdjustment: totalScore - 50,
      enhancedFactors: {
        realTravel: enhancedTravelAnalysis !== null,
        weatherData: weatherAnalysis !== null,
        venueHistory: venueAnalysis !== null,
        contextualAnalysis: contextualAnalysis.hasData
      }
    };
  }

  /**
   * Calculate enhanced predictive performance score including venue/travel (fallback)
   */
  calculateEnhancedPredictiveScore(player, isHome, venueAnalysis, travelAnalysis) {
    // Base score from HR prediction data
    let baseScore = 50; // Start with neutral
    
    // Due factor (major component)
    if (player.isDue && player.dueScore) {
      baseScore += Math.min(30, player.dueScore * 5); // Up to 30 points for being due
    }
    
    // HR rate factor
    if (player.hrRate) {
      const hrRateScore = Math.min(15, (player.hrRate - 0.05) * 150); // Bonus for high HR rate
      baseScore += Math.max(-5, hrRateScore);
    }
    
    // Games since last HR (pressure factor)
    if (player.gamesSinceLastHR) {
      const pressureScore = Math.min(10, (player.gamesSinceLastHR - 10) * 0.5);
      baseScore += Math.max(0, pressureScore);
    }
    
    // Venue impact (if available)
    const venueImpact = this.calculateVenueImpact(venueAnalysis);
    
    // Travel impact (if available)
    const travelImpact = travelAnalysis?.performanceImpact?.netPerformanceImpact || 0;
    
    // Home field advantage
    const homeFieldBonus = isHome ? 5 : 0;
    
    const totalScore = Math.max(20, Math.min(95, baseScore + venueImpact + travelImpact + homeFieldBonus));
    
    return {
      totalScore,
      baseScore,
      adjustments: {
        venue: venueImpact,
        travel: travelImpact,
        environmental: 0, // No environmental data in predictive mode
        schedule: 0, // No schedule data in predictive mode
        homeField: homeFieldBonus,
        // Additional predictive adjustments
        due: player.isDue ? (player.dueScore * 5) : 0,
        hrRate: player.hrRate ? ((player.hrRate - 0.05) * 150) : 0,
        pressure: player.gamesSinceLastHR ? Math.max(0, (player.gamesSinceLastHR - 10) * 0.5) : 0
      },
      netAdjustment: totalScore - 50
    };
  }

  /**
   * Calculate predictive performance score (fallback without venue/travel)
   */
  calculatePredictiveScore(player, isHome) {
    // Base score from HR prediction data
    let baseScore = 50; // Start with neutral
    
    // Due factor (major component)
    if (player.isDue && player.dueScore) {
      baseScore += Math.min(30, player.dueScore * 5); // Up to 30 points for being due
    }
    
    // HR rate factor
    if (player.hrRate) {
      const hrRateScore = Math.min(15, (player.hrRate - 0.05) * 150); // Bonus for high HR rate
      baseScore += Math.max(-5, hrRateScore);
    }
    
    // Games since last HR (pressure factor)
    if (player.gamesSinceLastHR) {
      const pressureScore = Math.min(10, (player.gamesSinceLastHR - 10) * 0.5);
      baseScore += Math.max(0, pressureScore);
    }
    
    // Home field advantage
    const homeFieldBonus = isHome ? 5 : 0;
    
    const totalScore = Math.max(20, Math.min(95, baseScore + homeFieldBonus));
    
    return {
      totalScore,
      baseScore,
      adjustments: {
        venue: 0, // No venue data in predictive mode
        travel: 0, // No travel data in predictive mode
        environmental: 0, // No environmental data in predictive mode
        schedule: 0, // No schedule data in predictive mode
        homeField: homeFieldBonus,
        // Additional predictive adjustments
        due: player.isDue ? (player.dueScore * 5) : 0,
        hrRate: player.hrRate ? ((player.hrRate - 0.05) * 150) : 0,
        pressure: player.gamesSinceLastHR ? Math.max(0, (player.gamesSinceLastHR - 10) * 0.5) : 0
      },
      netAdjustment: totalScore - 50
    };
  }

  /**
   * Calculate predictive confidence
   */
  calculatePredictiveConfidence(player) {
    let confidence = 60; // Base confidence for prediction data
    
    // Increase confidence for players with clear due indicators
    if (player.isDue && player.dueScore > 3) confidence += 15;
    
    // Increase confidence for recent HR history
    if (player.hrRate > 0.1) confidence += 10;
    
    // Decrease confidence for very cold streaks (might indicate injury/slump)
    if (player.gamesSinceLastHR > 30) confidence -= 10;
    
    // Increase confidence if we have complete data
    if (player.gamesPlayed && player.homeRunsThisSeason && player.lastHRDate) confidence += 10;
    
    return Math.max(30, Math.min(85, confidence));
  }

  /**
   * Extract relevant stats from prediction data
   */
  extractPredictiveStats(player) {
    return {
      name: player.fullName || player.name,
      team: player.team || player.Team,
      gamesPlayed: player.gamesPlayed || 0,
      homeRuns: player.homeRunsThisSeason || 0,
      hrRate: player.hrRate || 0,
      expectedHRs: player.expectedHRs || 0,
      gamesSinceLastHR: player.gamesSinceLastHR || 0,
      isDue: player.isDue || false,
      dueScore: player.dueScore || 0
    };
  }

  /**
   * Create ultimate factor breakdown with all enhanced data
   */
  createUltimateFactorBreakdown(comprehensiveScore, player, venueAnalysis, enhancedTravelAnalysis, weatherAnalysis, pitcherIntelligence = null) {
    const { baseScore, adjustments } = comprehensiveScore;
    
    return {
      basePerformance: {
        score: baseScore,
        description: 'Predictive baseline performance'
      },
      venueFactors: venueAnalysis ? {
        score: adjustments.venue || 0,
        description: this.describeVenueFactors(adjustments.venue || 0)
      } : null,
      travelFactors: enhancedTravelAnalysis ? {
        score: adjustments.travel || 0,
        description: enhancedTravelAnalysis.description || this.describeTravelFactors(adjustments.travel || 0)
      } : null,
      environmentalFactors: weatherAnalysis ? {
        score: adjustments.environmental || 0,
        description: weatherAnalysis.environmentalFactors?.description || 'Weather impact analyzed'
      } : {
        score: 0,
        description: 'Weather data not available'
      },
      scheduleFactors: enhancedTravelAnalysis ? {
        score: adjustments.schedule || 0,
        description: enhancedTravelAnalysis.travelType === 'SAME_SERIES' ? 
          'Rest advantage from continuing series' : 
          'Standard schedule factors'
      } : {
        score: 0,
        description: 'Schedule data not available'
      },
      homeFieldAdvantage: {
        score: adjustments.homeField || 0,
        description: adjustments.homeField > 0 ? 'Home field advantage' : 'Away game'
      },
      // Predictive factors
      dueFactors: {
        score: adjustments.due || 0,
        description: player.isDue ? 
          `Due for HR (${player.gamesSinceLastHR} games since last)` : 
          'Not currently due for HR'
      },
      hrRateFactors: {
        score: adjustments.hrRate || 0,
        description: `Season HR rate: ${((player.hrRate || 0) * 100).toFixed(1)}%`
      },
      pressureFactors: {
        score: adjustments.pressure || 0,
        description: player.gamesSinceLastHR > 15 ? 
          `Building pressure (${player.gamesSinceLastHR} games)` : 
          'Normal pressure situation'
      },
      // Pitcher Intelligence factors
      pitcherIntelligence: pitcherIntelligence ? {
        overall: {
          score: this.calculatePitcherMatchupScore(player, pitcherIntelligence),
          description: this.generatePitcherMatchupDescription(player, pitcherIntelligence)
        },
        arsenalMatchup: pitcherIntelligence.arsenalMatchups ? 
          this.findPlayerArsenalMatchup(player, pitcherIntelligence.arsenalMatchups) : null,
        threatLevel: this.assessPlayerThreatLevel(player, pitcherIntelligence),
        strategicRecommendation: this.getPlayerPitcherStrategy(player, pitcherIntelligence)
      } : {
        overall: { score: 0, description: 'No pitcher intelligence available' },
        arsenalMatchup: null,
        threatLevel: 'unknown',
        strategicRecommendation: 'Standard approach'
      }
    };
  }

  /**
   * Calculate enhanced confidence including data quality
   */
  calculateEnhancedConfidence(player, venueAnalysis, weatherAnalysis) {
    let confidence = 60; // Base confidence for prediction data
    
    // Increase confidence for players with clear due indicators
    if (player.isDue && player.dueScore > 3) confidence += 15;
    
    // Increase confidence for recent HR history
    if (player.hrRate > 0.1) confidence += 10;
    
    // Decrease confidence for very cold streaks (might indicate injury/slump)
    if (player.gamesSinceLastHR > 30) confidence -= 10;
    
    // Increase confidence if we have complete data
    if (player.gamesPlayed && player.homeRunsThisSeason && player.lastHRDate) confidence += 10;
    
    // Boost confidence with real venue data
    if (venueAnalysis && venueAnalysis.venuePersonality) confidence += 8;
    
    // Boost confidence with weather data
    if (weatherAnalysis && !weatherAnalysis.conditions.includes('unavailable')) confidence += 5;
    
    return Math.max(30, Math.min(95, confidence));
  }

  /**
   * Create enhanced factor breakdown including venue/travel analysis (fallback)
   */
  createEnhancedPredictiveFactorBreakdown(comprehensiveScore, player, venueAnalysis, travelAnalysis) {
    const { baseScore, adjustments } = comprehensiveScore;
    
    return {
      basePerformance: {
        score: baseScore,
        description: 'Predictive baseline performance'
      },
      venueFactors: venueAnalysis ? {
        score: adjustments.venue || 0,
        description: this.describeVenueFactors(adjustments.venue || 0)
      } : null,
      travelFactors: travelAnalysis ? {
        score: adjustments.travel || 0,
        description: this.describeTravelFactors(adjustments.travel || 0)
      } : null,
      environmentalFactors: {
        score: 0,
        description: 'Environmental data not available for predictions'
      },
      scheduleFactors: {
        score: 0,
        description: 'Schedule data not available for predictions'
      },
      homeFieldAdvantage: {
        score: adjustments.homeField || 0,
        description: adjustments.homeField > 0 ? 'Home field advantage' : 'Away game'
      },
      // Predictive factors
      dueFactors: {
        score: adjustments.due || 0,
        description: player.isDue ? 
          `Due for HR (${player.gamesSinceLastHR} games since last)` : 
          'Not currently due for HR'
      },
      hrRateFactors: {
        score: adjustments.hrRate || 0,
        description: `Season HR rate: ${((player.hrRate || 0) * 100).toFixed(1)}%`
      },
      pressureFactors: {
        score: adjustments.pressure || 0,
        description: player.gamesSinceLastHR > 15 ? 
          `Building pressure (${player.gamesSinceLastHR} games)` : 
          'Normal pressure situation'
      }
    };
  }

  /**
   * Create factor breakdown for predictive analysis (fallback)
   */
  createPredictiveFactorBreakdown(comprehensiveScore, player) {
    const { baseScore, adjustments } = comprehensiveScore;
    
    return {
      basePerformance: {
        score: baseScore,
        description: 'Predictive baseline performance'
      },
      // Only include the factors we actually have data for
      dueFactors: {
        score: adjustments.due || 0,
        description: player.isDue ? 
          `Due for HR (${player.gamesSinceLastHR} games since last)` : 
          'Not currently due for HR'
      },
      hrRateFactors: {
        score: adjustments.hrRate || 0,
        description: `Season HR rate: ${((player.hrRate || 0) * 100).toFixed(1)}%`
      },
      pressureFactors: {
        score: adjustments.pressure || 0,
        description: player.gamesSinceLastHR > 15 ? 
          `Building pressure (${player.gamesSinceLastHR} games)` : 
          'Normal pressure situation'
      },
      homeFieldAdvantage: {
        score: adjustments.homeField || 0,
        description: adjustments.homeField > 0 ? 'Home field advantage' : 'Away game'
      }
    };
  }

  /**
   * Generate empty analysis structure
   */
  getEmptyAnalysis() {
    return {
      date: new Date().toISOString().split('T')[0],
      totalGames: 0,
      gameAnalyses: [],
      summary: { message: 'No games found for analysis' },
      topOpportunities: [],
      riskWarnings: [],
      venueInsights: [],
      environmentalFactors: []
    };
  }

  getEmptyTeamAnalysis(teamCode) {
    return {
      teamCode,
      isHome: false,
      venue: teamCode,
      totalPlayers: 0,
      playerAnalyses: [],
      teamSummary: { averageScore: 50, topPlayers: [], teamStrength: 'unknown' },
      teamAdvantages: [],
      teamConcerns: [],
      recommendedTargets: []
    };
  }

  /**
   * Missing methods needed by analyzeGameContext
   */
  assessGameImportance(game, currentDate) {
    // Basic game importance assessment
    const dayOfWeek = currentDate.getDay();
    
    // Weekend games might be more important
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'weekend_game';
    }
    
    // Weekday games
    return 'regular_season';
  }

  getSeasonContext(currentDate) {
    const month = currentDate.getMonth() + 1; // 0-based to 1-based
    
    if (month >= 3 && month <= 5) {
      return 'early_season';
    } else if (month >= 6 && month <= 8) {
      return 'mid_season';
    } else if (month >= 9 && month <= 10) {
      return 'late_season';
    }
    
    return 'off_season';
  }

  generateOverallSummary(gameAnalyses) {
    const validAnalyses = gameAnalyses.filter(analysis => analysis !== null);
    
    if (validAnalyses.length === 0) {
      return { message: 'No valid game analyses available' };
    }

    const avgRating = validAnalyses.reduce((sum, game) => 
      sum + (game.overallGameRating?.score || 50), 0) / validAnalyses.length;

    return {
      totalValidGames: validAnalyses.length,
      averageGameRating: Math.round(avgRating),
      message: `Analysis of ${validAnalyses.length} games with average rating ${Math.round(avgRating)}`
    };
  }

  identifyTopOpportunities(gameAnalyses) {
    const opportunities = [];
    
    gameAnalyses.forEach(game => {
      if (!game) return;
      
      const allPlayers = [
        ...(game.homeTeamAnalysis?.playerAnalyses || []),
        ...(game.awayTeamAnalysis?.playerAnalyses || [])
      ];
      
      const targets = allPlayers
        .filter(p => p?.recommendation?.action === 'STRONG_TARGET' || p?.recommendation?.action === 'TARGET')
        .map(p => ({
          playerName: p.playerName,
          team: p.team,
          score: p.comprehensiveScore?.totalScore || 0,
          reason: p.recommendation?.reason || 'Strong opportunity'
        }));
      
      opportunities.push(...targets);
    });
    
    return opportunities
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  identifyRiskWarnings(gameAnalyses) {
    const warnings = [];
    
    gameAnalyses.forEach(game => {
      if (!game) return;
      
      const allPlayers = [
        ...(game.homeTeamAnalysis?.playerAnalyses || []),
        ...(game.awayTeamAnalysis?.playerAnalyses || [])
      ];
      
      const risks = allPlayers
        .filter(p => p?.recommendation?.action === 'AVOID' || p?.recommendation?.action === 'CAUTION')
        .map(p => ({
          playerName: p.playerName,
          team: p.team,
          reason: p.recommendation?.reason || 'Risk identified'
        }));
      
      warnings.push(...risks);
    });
    
    return warnings.slice(0, 5);
  }

  generateVenueInsights(gameAnalyses) {
    return gameAnalyses
      .filter(game => game !== null)
      .map(game => ({
        venue: game.venue || game.homeTeam,
        advantagePlayers: (game.homeTeamAnalysis?.totalPlayers || 0) + (game.awayTeamAnalysis?.totalPlayers || 0),
        environmentalFactor: 'Standard conditions',
        recommendations: [
          `${game.homeTeamAnalysis?.totalPlayers || 0} home players analyzed`,
          `${game.awayTeamAnalysis?.totalPlayers || 0} away players analyzed`
        ]
      }));
  }

  summarizeEnvironmentalFactors(gameAnalyses) {
    const validGames = gameAnalyses.filter(game => game !== null);
    
    return {
      totalGames: validGames.length,
      averageConditions: 'Standard',
      insights: validGames.map(game => ({
        venue: game.venue || game.homeTeam,
        conditions: 'Standard'
      }))
    };
  }

  identifyTeamAdvantages(playerAnalyses, isHome) {
    const advantages = [];
    
    if (playerAnalyses.length > 8) {
      advantages.push('Deep lineup');
    }
    
    const highScorers = playerAnalyses.filter(p => p?.comprehensiveScore?.totalScore > 70);
    if (highScorers.length >= 3) {
      advantages.push(`${highScorers.length} high-scoring players`);
    }
    
    if (isHome) {
      advantages.push('Home field advantage');
    }
    
    return advantages;
  }

  identifyTeamConcerns(playerAnalyses) {
    const concerns = [];
    
    const lowScorers = playerAnalyses.filter(p => p?.comprehensiveScore?.totalScore < 40);
    if (lowScorers.length >= 3) {
      concerns.push(`${lowScorers.length} below-average players`);
    }
    
    if (playerAnalyses.length < 6) {
      concerns.push('Limited lineup depth');
    }
    
    return concerns;
  }

  identifyRecommendedTargets(playerAnalyses) {
    return playerAnalyses
      .filter(p => p?.recommendation?.action === 'STRONG_TARGET' || p?.recommendation?.action === 'TARGET')
      .slice(0, 5)
      .map(p => ({
        name: p.playerName,
        score: p.comprehensiveScore?.totalScore || 0,
        reason: p.recommendation?.reason || 'Target opportunity'
      }));
  }

  /**
   * Helper methods for predictive analysis
   */
  findGameLineupData(lineupData, homeTeam, awayTeam) {
    if (!lineupData || !lineupData.games) {
      return null;
    }
    
    const foundGame = lineupData.games.find(game => 
      (game.teams?.home?.abbr === homeTeam && game.teams?.away?.abbr === awayTeam)
    );
    
    debugLog.log('SERVICES', `Lineup data for ${homeTeam} vs ${awayTeam}:`, foundGame ? 'Found' : 'Not found');
    return foundGame;
  }

  findPitcherMatchupData(pitcherMatchups, homeTeam, awayTeam) {
    if (!pitcherMatchups || !pitcherMatchups.matchups) return null;
    
    return pitcherMatchups.matchups.find(matchup => 
      (matchup.homeTeam === homeTeam && matchup.awayTeam === awayTeam)
    );
  }

  summarizePredictiveTeam(playerAnalyses) {
    if (playerAnalyses.length === 0) {
      return { averageScore: 50, topPlayers: [], teamStrength: 'unknown' };
    }

    const scores = playerAnalyses.map(p => p.comprehensiveScore.totalScore);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const topPlayers = playerAnalyses
      .sort((a, b) => b.comprehensiveScore.totalScore - a.comprehensiveScore.totalScore)
      .slice(0, 5)
      .map(p => ({
        name: p.playerName,
        score: p.comprehensiveScore.totalScore,
        recommendation: p.recommendation,
        isDue: p.hrPredictionData?.isDue || false
      }));

    return {
      averageScore: Math.round(averageScore),
      topPlayers,
      teamStrength: this.classifyTeamStrength(averageScore),
      highConfidencePlayers: playerAnalyses.filter(p => p.confidenceLevel >= 70).length,
      duePlayers: playerAnalyses.filter(p => p.hrPredictionData?.isDue).length
    };
  }

  identifyPredictiveAdvantages(playerAnalyses, isHome) {
    const advantages = [];
    
    // Count due players
    const duePlayers = playerAnalyses.filter(p => p.hrPredictionData?.isDue);
    if (duePlayers.length >= 2) {
      advantages.push(`${duePlayers.length} players due for HRs`);
    }
    
    // High HR rate players
    const powerHitters = playerAnalyses.filter(p => 
      p.baseStats?.hrRate > 0.12
    );
    if (powerHitters.length >= 2) {
      advantages.push(`${powerHitters.length} high HR rate players`);
    }
    
    // Home field advantage
    if (isHome) {
      advantages.push('Home field advantage');
    }
    
    return advantages;
  }

  identifyPredictiveConcerns(playerAnalyses) {
    const concerns = [];
    
    // Very cold players
    const coldPlayers = playerAnalyses.filter(p => 
      p.hrPredictionData?.gamesSinceLastHR > 25
    );
    if (coldPlayers.length >= 2) {
      concerns.push(`${coldPlayers.length} players in extended cold streaks`);
    }
    
    // Low HR rate team
    const avgHrRate = playerAnalyses.reduce((sum, p) => 
      sum + (p.baseStats?.hrRate || 0), 0) / playerAnalyses.length;
    if (avgHrRate < 0.06) {
      concerns.push('Below average power production');
    }
    
    return concerns;
  }

  identifyPredictiveTargets(playerAnalyses) {
    return playerAnalyses
      .filter(p => 
        p.recommendation.action === 'STRONG_TARGET' || 
        p.recommendation.action === 'TARGET'
      )
      .slice(0, 5)
      .map(p => ({
        name: p.playerName,
        score: p.comprehensiveScore.totalScore,
        reason: p.recommendation.reason,
        isDue: p.hrPredictionData?.isDue || false
      }));
  }

  generatePredictiveSummary(gameAnalyses) {
    const totalPlayers = gameAnalyses.reduce((sum, game) => 
      sum + (game.homeTeamAnalysis?.totalPlayers || 0) + (game.awayTeamAnalysis?.totalPlayers || 0), 0
    );
    
    const totalDuePlayers = gameAnalyses.reduce((sum, game) => 
      sum + (game.homeTeamAnalysis?.teamSummary?.duePlayers || 0) + 
      (game.awayTeamAnalysis?.teamSummary?.duePlayers || 0), 0
    );

    return {
      message: `Predictive analysis for ${gameAnalyses.length} games`,
      totalPlayers,
      totalDuePlayers,
      averageGameRating: gameAnalyses.reduce((sum, game) => 
        sum + (game.overallGameRating?.score || 50), 0) / gameAnalyses.length
    };
  }

  identifyPredictiveOpportunities(gameAnalyses) {
    const opportunities = [];
    
    gameAnalyses.forEach(game => {
      // Collect due players from both teams
      const allPlayers = [
        ...(game.homeTeamAnalysis?.playerAnalyses || []),
        ...(game.awayTeamAnalysis?.playerAnalyses || [])
      ];
      
      const strongTargets = allPlayers
        .filter(p => 
          p.recommendation.action === 'STRONG_TARGET' && 
          p.hrPredictionData?.isDue
        )
        .map(p => ({
          playerName: p.playerName,
          team: p.team,
          score: p.comprehensiveScore.totalScore,
          reason: `Due for HR (${p.hrPredictionData.gamesSinceLastHR} games)`,
          game: `${game.awayTeam} @ ${game.homeTeam}`
        }));
      
      opportunities.push(...strongTargets);
    });
    
    return opportunities
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  identifyPredictiveWarnings(gameAnalyses) {
    const warnings = [];
    
    gameAnalyses.forEach(game => {
      const allPlayers = [
        ...(game.homeTeamAnalysis?.playerAnalyses || []),
        ...(game.awayTeamAnalysis?.playerAnalyses || [])
      ];
      
      const riskPlayers = allPlayers
        .filter(p => 
          p.hrPredictionData?.gamesSinceLastHR > 30 ||
          (p.baseStats?.hrRate < 0.03 && p.comprehensiveScore.totalScore > 60)
        )
        .map(p => ({
          playerName: p.playerName,
          team: p.team,
          reason: p.hrPredictionData?.gamesSinceLastHR > 30 ? 
            `Extended cold streak (${p.hrPredictionData.gamesSinceLastHR} games)` :
            'Low power despite high score'
        }));
      
      warnings.push(...riskPlayers);
    });
    
    return warnings.slice(0, 5);
  }

  generatePredictiveVenueInsights(gameAnalyses) {
    return gameAnalyses.map(game => ({
      venue: game.venue,
      advantagePlayers: (game.homeTeamAnalysis?.teamSummary?.duePlayers || 0) + 
                       (game.awayTeamAnalysis?.teamSummary?.duePlayers || 0),
      environmentalFactor: 'Standard conditions',
      recommendations: [
        `${game.homeTeamAnalysis?.teamSummary?.duePlayers || 0} home players due for HRs`,
        `${game.awayTeamAnalysis?.teamSummary?.duePlayers || 0} away players due for HRs`
      ]
    }));
  }

  summarizePredictiveFactors(gameAnalyses) {
    return {
      predictionBased: true,
      totalGames: gameAnalyses.length,
      averageOpportunities: gameAnalyses.reduce((sum, game) => 
        sum + (game.homeTeamAnalysis?.teamSummary?.duePlayers || 0) + 
        (game.awayTeamAnalysis?.teamSummary?.duePlayers || 0), 0
      ) / gameAnalyses.length
    };
  }

  /**
   * Calculate enhanced game rating including pitcher intelligence
   */
  calculateEnhancedPredictiveGameRating(homeAnalysis, awayAnalysis, matchupData, pitcherIntelligence) {
    let rating = 50; // Base rating
    
    // Home team due players
    const homeDuePlayers = homeAnalysis?.teamSummary?.duePlayers || 0;
    rating += homeDuePlayers * 8;
    
    // Away team due players  
    const awayDuePlayers = awayAnalysis?.teamSummary?.duePlayers || 0;
    rating += awayDuePlayers * 8;
    
    // Team averages
    const homeAvg = homeAnalysis?.teamSummary?.averageScore || 50;
    const awayAvg = awayAnalysis?.teamSummary?.averageScore || 50;
    rating += (homeAvg + awayAvg - 100) * 0.3;
    
    // Pitcher intelligence factor
    if (pitcherIntelligence) {
      const pitcherVulnerability = pitcherIntelligence.vulnerabilityIndex || 50;
      const threatLevel = pitcherIntelligence.overallThreatLevel || 50;
      
      // Higher vulnerability and threat level = higher scoring game potential
      rating += (pitcherVulnerability - 50) * 0.2;
      rating += (threatLevel - 50) * 0.2;
    }
    
    // Matchup data enhancement (when available)
    if (matchupData?.quality) {
      rating += matchupData.quality * 0.1;
    }
    
    const finalRating = Math.max(30, Math.min(95, rating));
    
    return {
      score: Math.round(finalRating),
      classification: this.classifyGameRating(finalRating),
      factors: pitcherIntelligence ? 4 : 3,
      predictionBased: true,
      enhancedWithPitcherIntel: pitcherIntelligence !== null
    };
  }

  calculatePredictiveGameRating(homeAnalysis, awayAnalysis, matchupData) {
    let rating = 50; // Base rating
    
    // Home team due players
    const homeDuePlayers = homeAnalysis?.teamSummary?.duePlayers || 0;
    rating += homeDuePlayers * 8;
    
    // Away team due players  
    const awayDuePlayers = awayAnalysis?.teamSummary?.duePlayers || 0;
    rating += awayDuePlayers * 8;
    
    // Team averages
    const homeAvg = homeAnalysis?.teamSummary?.averageScore || 50;
    const awayAvg = awayAnalysis?.teamSummary?.averageScore || 50;
    rating += (homeAvg + awayAvg - 100) * 0.3;
    
    // Matchup data enhancement (when available)
    if (matchupData?.quality) {
      rating += matchupData.quality * 0.1;
    }
    
    const finalRating = Math.max(30, Math.min(95, rating));
    
    return {
      score: Math.round(finalRating),
      classification: this.classifyGameRating(finalRating),
      factors: 3,
      predictionBased: true
    };
  }

  /**
   * Calculate pitcher matchup score for individual player
   */
  calculatePitcherMatchupScore(player, pitcherIntelligence) {
    if (!pitcherIntelligence || !pitcherIntelligence.arsenalMatchups) return 0;
    
    const playerName = player.fullName || player.name;
    const matchup = pitcherIntelligence.arsenalMatchups.find(m => 
      m.batter && m.batter.toLowerCase().includes(playerName.toLowerCase())
    );
    
    if (!matchup) return 0;
    
    // Convert pitcher advantage to hitter score (inverse relationship)
    const hitterAdvantage = 25 - (matchup.pitcherAdvantage || 0);
    return Math.max(-10, Math.min(15, hitterAdvantage));
  }

  /**
   * Generate pitcher matchup description for player
   */
  generatePitcherMatchupDescription(player, pitcherIntelligence) {
    if (!pitcherIntelligence) return 'No pitcher data available';
    
    const playerName = player.fullName || player.name;
    const matchup = pitcherIntelligence.arsenalMatchups?.find(m => 
      m.batter && m.batter.toLowerCase().includes(playerName.toLowerCase())
    );
    
    if (!matchup) return 'Player not found in pitcher analysis';
    
    const threatLevel = matchup.threatLevel || 'medium';
    const pitcherAdvantage = matchup.pitcherAdvantage || 0;
    
    if (pitcherAdvantage > 18) return `Strong pitcher advantage (${threatLevel} threat)`;
    if (pitcherAdvantage > 12) return `Moderate pitcher advantage (${threatLevel} threat)`;  
    if (pitcherAdvantage > 6) return `Slight pitcher advantage (${threatLevel} threat)`;
    return `Favorable matchup for hitter (${threatLevel} threat)`;
  }

  /**
   * Find specific player's arsenal matchup data
   */
  findPlayerArsenalMatchup(player, arsenalMatchups) {
    if (!arsenalMatchups) return null;
    
    const playerName = player.fullName || player.name;
    return arsenalMatchups.find(m => 
      m.batter && m.batter.toLowerCase().includes(playerName.toLowerCase())
    ) || null;
  }

  /**
   * Assess player threat level against pitcher
   */
  assessPlayerThreatLevel(player, pitcherIntelligence) {
    if (!pitcherIntelligence || !pitcherIntelligence.arsenalMatchups) return 'unknown';
    
    const playerName = player.fullName || player.name;
    const matchup = pitcherIntelligence.arsenalMatchups.find(m => 
      m.batter && m.batter.toLowerCase().includes(playerName.toLowerCase())
    );
    
    return matchup?.threatLevel || 'medium';
  }

  /**
   * Get strategic recommendation for player vs pitcher
   */
  getPlayerPitcherStrategy(player, pitcherIntelligence) {
    if (!pitcherIntelligence || !pitcherIntelligence.arsenalMatchups) return 'Standard approach';
    
    const playerName = player.fullName || player.name;
    const matchup = pitcherIntelligence.arsenalMatchups.find(m => 
      m.batter && m.batter.toLowerCase().includes(playerName.toLowerCase())
    );
    
    return matchup?.strategicRecommendation || 'Standard approach';
  }

  /**
   * Calculate enhanced contextual score using Hellraiser and badge systems
   */
  async calculateEnhancedContextualScore(player, baseScore) {
    debugLog.log('SERVICES', `🔥 Calculating contextual bonuses for ${player.name || player.fullName}`);
    
    let contextualBonus = 0;
    const badges = [];
    const explanations = [];
    let hellraiserData = null;
    let hasData = false;

    try {
      // 1. Load and analyze Hellraiser data
      hellraiserData = await this.extractHellraiserMetrics(player);
      if (hellraiserData.isHellraiserPick) {
        hasData = true;
        
        // Base Hellraiser bonus
        contextualBonus += 15;
        badges.push({ type: 'HELLRAISER_PICK', emoji: '🔥', bonus: 15 });
        explanations.push('Hellraiser Pick (+15)');

        // Pathway bonus
        if (hellraiserData.pathway === 'perfectStorm') {
          contextualBonus += 20;
          badges.push({ type: 'PERFECT_STORM', emoji: '⚡', bonus: 20 });
          explanations.push('Perfect Storm Pathway (+20)');
        } else if (hellraiserData.pathway === 'batterDriven') {
          contextualBonus += 15;
          badges.push({ type: 'BATTER_DRIVEN', emoji: '💪', bonus: 15 });
          explanations.push('Batter-Driven Analysis (+15)');
        } else if (hellraiserData.pathway === 'pitcherDriven') {
          contextualBonus += 12;
          badges.push({ type: 'PITCHER_VULNERABLE', emoji: '🎯', bonus: 12 });
          explanations.push('Pitcher Vulnerability (+12)');
        }

        // Elite metrics bonuses
        if (hellraiserData.exitVelocity >= 94) {
          contextualBonus += 15;
          badges.push({ type: 'ELITE_EXIT_VELOCITY', emoji: '🚀', bonus: 15 });
          explanations.push(`Elite Exit Velocity ${hellraiserData.exitVelocity}mph (+15)`);
        } else if (hellraiserData.exitVelocity >= 92) {
          contextualBonus += 10;
          badges.push({ type: 'STRONG_EXIT_VELOCITY', emoji: '💨', bonus: 10 });
          explanations.push(`Strong Exit Velocity ${hellraiserData.exitVelocity}mph (+10)`);
        }

        if (hellraiserData.barrelRate >= 20) {
          contextualBonus += 12;
          badges.push({ type: 'ELITE_BARREL_RATE', emoji: '🎯', bonus: 12 });
          explanations.push(`Elite Barrel Rate ${hellraiserData.barrelRate}% (+12)`);
        } else if (hellraiserData.barrelRate >= 15) {
          contextualBonus += 8;
          badges.push({ type: 'STRONG_BARREL_RATE', emoji: '📊', bonus: 8 });
          explanations.push(`Strong Barrel Rate ${hellraiserData.barrelRate}% (+8)`);
        }

        if (hellraiserData.hardContact >= 55) {
          contextualBonus += 8;
          badges.push({ type: 'ELITE_HARD_CONTACT', emoji: '💥', bonus: 8 });
          explanations.push(`Elite Hard Contact ${hellraiserData.hardContact}% (+8)`);
        }

        // Market efficiency bonus
        if (hellraiserData.marketEdge > 0.1) {
          contextualBonus += 10;
          badges.push({ type: 'STRONG_VALUE', emoji: '💰', bonus: 10 });
          explanations.push(`Strong Value Bet (+10)`);
        } else if (hellraiserData.marketEdge > 0) {
          contextualBonus += 5;
          badges.push({ type: 'SLIGHT_VALUE', emoji: '💸', bonus: 5 });
          explanations.push(`Value Bet (+5)`);
        }

        debugLog.log('SERVICES', `🔥 Hellraiser bonuses for ${player.name}: +${contextualBonus - 15} (excluding base)`);
      }

      // 2. Badge system integration (for additional context)
      const playerBadges = await this.calculatePlayerBadges(player);
      badges.push(...playerBadges);
      
      playerBadges.forEach(badge => {
        if (badge.type !== 'HELLRAISER_PICK') { // Avoid double-counting
          contextualBonus += badge.bonus;
          explanations.push(`${badge.label} (${badge.bonus >= 0 ? '+' : ''}${badge.bonus})`);
        }
      });

      // 3. Additional analysis bonuses
      const bounceBackBonus = this.calculateBounceBackBonus(player);
      const stadiumBonus = this.calculateStadiumBonus(player);
      const teamContextBonus = this.calculateTeamContextBonus(player);

      contextualBonus += bounceBackBonus + stadiumBonus + teamContextBonus;
      
      if (bounceBackBonus > 0) explanations.push(`Bounce Back Potential (+${bounceBackBonus})`);
      if (stadiumBonus > 0) explanations.push(`Stadium Advantage (+${stadiumBonus})`);
      if (teamContextBonus > 0) explanations.push(`Team Context (+${teamContextBonus})`);

      debugLog.log('SERVICES', `🔥 Total contextual bonus for ${player.name}: +${contextualBonus}`);

    } catch (error) {
      console.error(`Error calculating contextual score for ${player.name}:`, error);
    }

    return {
      contextualBonus: Math.min(40, contextualBonus), // Cap at 40 points
      badges,
      hellraiserData,
      explanation: explanations.join(', '),
      hasData
    };
  }

  /**
   * Extract Hellraiser metrics for player (similar to BarrelMatchupCard approach)
   */
  async extractHellraiserMetrics(player) {
    try {
      // Import hellraiser service
      const { default: hellraiserAnalysisService } = await import('./hellraiserAnalysisService');
      
      // Get current date (same logic as other components)
      const currentDate = new Date();
      let dateStr = currentDate.toISOString().split('T')[0];
      
      // Allow natural date progression - no hardcoded date corrections
      
      // Load Hellraiser analysis
      const analysis = await hellraiserAnalysisService.analyzeDay(dateStr);
      
      if (!analysis?.picks || analysis.picks.length === 0) {
        return { isHellraiserPick: false };
      }

      // Find this player in Hellraiser analysis
      const playerName = player.fullName || player.name;
      const playerTeam = player.team || player.Team;
      
      const hellraiserPick = analysis.picks.find(pick => 
        (pick.playerName === playerName || pick.playerName.includes(playerName.split(' ')[0])) &&
        pick.team === playerTeam
      );

      if (!hellraiserPick) {
        return { isHellraiserPick: false };
      }

      // Extract metrics from reasoning text (like BarrelMatchupCard does)
      const reasoning = hellraiserPick.reasoning || '';
      
      // Extract exit velocity
      const exitVeloMatch = reasoning.match(/(?:Elite|Strong) exit velocity \(([0-9.]+) mph\)/);
      const exitVelocity = exitVeloMatch ? parseFloat(exitVeloMatch[1]) : 0;
      
      // Extract barrel rate
      const barrelRateMatch = reasoning.match(/(?:Elite|Strong) barrel rate \(([0-9.]+)%\)/);
      const barrelRate = barrelRateMatch ? parseFloat(barrelRateMatch[1]) : 0;
      
      // Extract hard contact rate
      const hardContactMatch = reasoning.match(/(?:Elite|Strong) hard contact \(([0-9.]+)%\)/);
      const hardContact = hardContactMatch ? parseFloat(hardContactMatch[1]) : 0;

      // Market edge
      const marketEdge = hellraiserPick.marketEfficiency?.edge || 0;

      debugLog.log('SERVICES', `🔥 Found Hellraiser data for ${playerName}: Exit Velo: ${exitVelocity}, Barrel: ${barrelRate}%, Hard Contact: ${hardContact}%`);

      return {
        isHellraiserPick: true,
        pathway: hellraiserPick.pathway,
        classification: hellraiserPick.classification,
        confidenceScore: hellraiserPick.confidenceScore,
        exitVelocity,
        barrelRate,
        hardContact,
        marketEdge,
        reasoning,
        odds: hellraiserPick.odds
      };

    } catch (error) {
      console.error(`Error extracting Hellraiser metrics for ${player.name}:`, error);
      return { isHellraiserPick: false };
    }
  }

  /**
   * Calculate player badges (simplified version of badge system)
   */
  async calculatePlayerBadges(player) {
    const badges = [];

    // HR Due badge
    if (player.isDue && player.dueScore > 3) {
      badges.push({
        type: 'DUE_FOR_HR',
        emoji: '⚡',
        label: 'Due for HR',
        bonus: 12
      });
    }

    // HR Rate badge  
    if (player.hrRate > 0.15) {
      badges.push({
        type: 'POWER_HITTER',
        emoji: '💪',
        label: 'Power Hitter',
        bonus: 8
      });
    }

    // Games since last HR pressure
    if (player.gamesSinceLastHR > 15 && player.gamesSinceLastHR < 30) {
      badges.push({
        type: 'BUILDING_PRESSURE',
        emoji: '📈',
        label: 'Building Pressure', 
        bonus: 6
      });
    }

    return badges;
  }

  /**
   * Calculate bounce back bonus (simplified)
   */
  calculateBounceBackBonus(player) {
    // Simple bounce back logic - can be enhanced with real service later
    if (player.gamesSinceLastHR > 10 && player.gamesSinceLastHR < 20 && player.hrRate > 0.08) {
      return 8;
    }
    return 0;
  }

  /**
   * Calculate stadium bonus (simplified)
   */
  calculateStadiumBonus(player) {
    // Simple stadium logic - can be enhanced with real service later
    // For now, just give bonus for known hitter-friendly parks
    // This would be replaced with real stadium context service integration
    return 0;
  }

  /**
   * Calculate team context bonus (simplified)
   */
  calculateTeamContextBonus(player) {
    // Simple team context logic - can be enhanced with real service later
    return 0;
  }
}

// Create and export singleton instance
const comprehensiveMatchupService = new ComprehensiveMatchupService();
export default comprehensiveMatchupService;