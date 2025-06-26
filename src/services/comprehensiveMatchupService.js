/**
 * Comprehensive Matchup Service
 * Integrates all data sources for ultimate venue psychology and matchup analysis
 */

import { fetchPlayerData, fetchGameData, fetchPlayerDataForDateRange } from './dataService';
import venuePersonalityService from './venuePersonalityService';
import travelImpactAnalyzer from './travelImpactAnalyzer';
import environmentalAdaptationService from './environmentalAdaptationService';
import scheduleAnalysisService from './scheduleAnalysisService';
import baseballAnalysisService from './baseballAnalysisService';

class ComprehensiveMatchupService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes for faster updates
  }

  /**
   * Generate comprehensive matchup analysis for a specific date
   */
  async generateComprehensiveMatchups(currentDate, gameData) {
    const cacheKey = `comprehensive_matchups_${currentDate.toISOString().split('T')[0]}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      console.log('Generating comprehensive matchup analysis...');
      
      // Get player data for the date
      const playerData = await fetchPlayerData(currentDate.toISOString().split('T')[0]);
      
      if (!gameData || gameData.length === 0 || !playerData || playerData.length === 0) {
        return this.getEmptyAnalysis();
      }

      // Generate analyses for each game
      const gameAnalyses = await Promise.all(
        gameData.map(game => this.analyzeIndividualGame(game, playerData, currentDate))
      );

      const comprehensiveAnalysis = {
        date: currentDate.toISOString().split('T')[0],
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
  async analyzeIndividualGame(game, playerData, currentDate) {
    try {
      const { homeTeam, awayTeam, pitcher } = game;
      
      // Get players for both teams
      const homeTeamPlayers = playerData.filter(player => 
        (player.team === homeTeam || player.Team === homeTeam)
      );
      const awayTeamPlayers = playerData.filter(player => 
        (player.team === awayTeam || player.Team === awayTeam)
      );

      // Analyze each team's players
      const homeAnalysis = await this.analyzeTeamPlayers(
        homeTeamPlayers, homeTeam, game, currentDate, true
      );
      const awayAnalysis = await this.analyzeTeamPlayers(
        awayTeamPlayers, awayTeam, game, currentDate, false
      );

      // Get BaseballAPI predictions if available
      let apiPredictions = null;
      try {
        if (pitcher && pitcher.name) {
          const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
          apiPredictions = await baseballAnalysisService.analyzePitcherVsTeam(
            pitcher.name, 
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
        venue: homeTeam,
        gameTime: game.dateTime || game.time,
        homeTeamAnalysis: homeAnalysis,
        awayTeamAnalysis: awayAnalysis,
        apiPredictions,
        gameContext: this.analyzeGameContext(game, currentDate),
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
    
    // Analyze each player with all factors
    const playerAnalyses = await Promise.all(
      players.slice(0, 15).map(player => // Limit to top 15 players for performance
        this.analyzePlayerComprehensively(player, venue, teamCode, currentDate, isHome)
      )
    );

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
    return {
      gameTime: game.dateTime || game.time,
      dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      pitcher: game.pitcher,
      weather: game.weather || 'Unknown',
      gameImportance: this.assessGameImportance(game, currentDate),
      seasonContext: this.getSeasonContext(currentDate)
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
}

// Create and export singleton instance
const comprehensiveMatchupService = new ComprehensiveMatchupService();
export default comprehensiveMatchupService;