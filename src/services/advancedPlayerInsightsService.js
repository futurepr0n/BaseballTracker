/**
 * Advanced Player Insights Aggregation Service
 * Unified comprehensive analysis service that aggregates all player insights
 * Provides complete player analysis with enhanced context and recommendations
 */

import enhancedGameOpportunitiesService from './enhancedGameOpportunitiesService';
import seriesContextService from './seriesContextService';
import venuePersonalityService from './venuePersonalityService';
import teamPerformanceService from './teamPerformanceService';
import { fetchPlayerDataForDateRange } from './dataService';
import { getSeasonSafeDateRange, formatDateRangeDescription } from '../utils/seasonDateUtils';

class AdvancedPlayerInsightsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Generate comprehensive analysis for a single player
   */
  async generatePlayerComprehensiveAnalysis(player, currentDate, includeSeriesContext = true) {
    const cacheKey = `player_comprehensive_${player.playerName}_${player.team}_${currentDate.toISOString().split('T')[0]}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      console.log(`🔍 Generating comprehensive analysis for ${player.playerName}...`);
      
      const [
        enhancedInsights,
        seriesContext,
        venueHistory,
        teamContext,
        recentPerformance,
        seasonStats
      ] = await Promise.all([
        this.getEnhancedPlayerInsights(player, currentDate),
        includeSeriesContext ? this.getPlayerSeriesContext(player, currentDate) : null,
        this.getPlayerVenueHistory(player, currentDate),
        this.getPlayerTeamContext(player, currentDate),
        this.getPlayerRecentPerformance(player, currentDate),
        this.getPlayerSeasonStats(player, currentDate)
      ]);

      // Aggregate all insights into comprehensive analysis
      const comprehensiveAnalysis = this.aggregatePlayerInsights({
        player,
        enhancedInsights,
        seriesContext,
        venueHistory,
        teamContext,
        recentPerformance,
        seasonStats,
        currentDate
      });

      // Generate strategic recommendations
      const recommendations = this.generateStrategicRecommendations(comprehensiveAnalysis);
      
      // Calculate confidence and data quality scores
      const qualityAssessment = this.assessDataQuality(comprehensiveAnalysis);

      const result = {
        player: {
          ...player,
          analysisDate: currentDate.toISOString()
        },
        insights: comprehensiveAnalysis,
        recommendations,
        qualityAssessment,
        generatedAt: new Date().toISOString(),
        version: '1.0'
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error(`Error generating comprehensive analysis for ${player.playerName}:`, error);
      return this.getDefaultComprehensiveAnalysis(player, currentDate);
    }
  }

  /**
   * Generate batch comprehensive analysis for multiple players
   */
  async generateBatchComprehensiveAnalysis(players, currentDate, options = {}) {
    try {
      console.log(`🔍 Generating batch comprehensive analysis for ${players.length} players...`);
      
      const {
        includeSeriesContext = true,
        maxConcurrentAnalyses = 5,
        priorityPlayers = []
      } = options;

      // Process players in batches to avoid overwhelming the services
      const batches = this.createPlayerBatches(players, maxConcurrentAnalyses);
      const allResults = [];

      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(player => 
            this.generatePlayerComprehensiveAnalysis(player, currentDate, includeSeriesContext)
          )
        );
        allResults.push(...batchResults);
      }

      // Sort results by insight score and priority
      const sortedResults = this.sortBatchResults(allResults, priorityPlayers);
      
      // Generate batch summary insights
      const batchSummary = this.generateBatchSummary(sortedResults, currentDate);

      return {
        analyses: sortedResults,
        summary: batchSummary,
        totalPlayers: players.length,
        successfulAnalyses: allResults.filter(r => r.qualityAssessment.overallScore >= 30).length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating batch comprehensive analysis:', error);
      return {
        analyses: [],
        summary: this.getDefaultBatchSummary(),
        totalPlayers: 0,
        successfulAnalyses: 0,
        error: error.message
      };
    }
  }

  /**
   * Get enhanced player insights using the enhanced opportunities service
   */
  async getEnhancedPlayerInsights(player, currentDate) {
    try {
      const insights = await enhancedGameOpportunitiesService.getPlayerComprehensiveInsight(player, currentDate);
      return insights.enhancedInsights || {};
    } catch (error) {
      console.error('Error getting enhanced player insights:', error);
      return {};
    }
  }

  /**
   * Get player series context
   */
  async getPlayerSeriesContext(player, currentDate) {
    try {
      return await seriesContextService.analyzePlayerSeriesContext(
        player.playerName,
        player.team,
        currentDate
      );
    } catch (error) {
      console.error('Error getting player series context:', error);
      return null;
    }
  }

  /**
   * Get comprehensive venue history
   */
  async getPlayerVenueHistory(player, currentDate) {
    try {
      if (!player.venue) return null;
      
      const venueAnalysis = await venuePersonalityService.analyzePlayerVenueHistory(
        player.playerName,
        player.venue
      );
      
      return {
        venueAnalysis,
        advantages: this.identifyVenueAdvantages(venueAnalysis),
        disadvantages: this.identifyVenueDisadvantages(venueAnalysis)
      };
    } catch (error) {
      console.error('Error getting player venue history:', error);
      return null;
    }
  }

  /**
   * Get team context and performance
   */
  async getPlayerTeamContext(player, currentDate) {
    try {
      const teamAnalysis = await teamPerformanceService.analyzeTeamOffensivePerformance(player.team);
      
      return {
        teamAnalysis,
        playerRole: this.assessPlayerRoleInTeam(player, teamAnalysis),
        teamMomentum: this.assessTeamMomentum(teamAnalysis),
        lineupPosition: this.estimateLineupPosition(player)
      };
    } catch (error) {
      console.error('Error getting player team context:', error);
      return null;
    }
  }

  /**
   * Get recent performance metrics
   */
  async getPlayerRecentPerformance(player, currentDate) {
    try {
      // Get recent performance data (limited to current season)
      const dateRange = getSeasonSafeDateRange(currentDate, 14); // 14 days back or season start
      console.log(`📈 Recent performance for ${player.playerName}: ${formatDateRangeDescription(dateRange)}`);
      
      const recentGames = await fetchPlayerDataForDateRange(
        dateRange.startDate,
        dateRange.endDate
      );

      const playerGames = recentGames.filter(game => 
        game.name?.toLowerCase().includes(player.playerName.toLowerCase()) && 
        game.team === player.team
      );

      return this.analyzeRecentPerformance(playerGames);
    } catch (error) {
      console.error('Error getting player recent performance:', error);
      return null;
    }
  }

  /**
   * Get season statistics and trends
   */
  async getPlayerSeasonStats(player, currentDate) {
    try {
      // Load season stats from rolling stats
      const response = await fetch('/data/rolling_stats/rolling_stats_season_latest.json');
      if (!response.ok) return null;
      
      const seasonData = await response.json();
      
      const playerStats = seasonData.topHitters?.find(p => 
        p.name.toLowerCase().includes(player.playerName.toLowerCase()) &&
        p.team === player.team
      );

      if (!playerStats) return null;

      return {
        seasonStats: playerStats,
        rankings: this.calculateSeasonRankings(playerStats, seasonData),
        trends: this.identifySeasonTrends(playerStats),
        milestones: this.identifyUpcomingMilestones(playerStats)
      };
    } catch (error) {
      console.error('Error getting player season stats:', error);
      return null;
    }
  }

  /**
   * Aggregate all insights into comprehensive analysis
   */
  aggregatePlayerInsights(data) {
    const {
      player,
      enhancedInsights,
      seriesContext,
      venueHistory,
      teamContext,
      recentPerformance,
      seasonStats,
      currentDate
    } = data;

    return {
      // Core Performance Insights
      performance: {
        recent: recentPerformance,
        season: seasonStats,
        trends: this.identifyPerformanceTrends(recentPerformance, seasonStats)
      },

      // Contextual Insights
      context: {
        series: seriesContext,
        venue: venueHistory,
        team: teamContext,
        situational: this.analyzeSituationalFactors(data)
      },

      // Enhanced Insights from opportunities service
      enhanced: enhancedInsights,

      // Predictive Insights
      predictions: {
        nextGameExpectation: this.calculateNextGameExpectation(data),
        streakProbability: this.calculateStreakProbability(data),
        breakoutPotential: this.assessBreakoutPotential(data)
      },

      // Risk Assessment
      risks: {
        slumpRisk: this.assessSlumpRisk(data),
        injuryRisk: this.assessInjuryRisk(data),
        variabilityRisk: this.assessVariabilityRisk(data)
      },

      // Opportunity Identification
      opportunities: {
        immediate: this.identifyImmediateOpportunities(data),
        emerging: this.identifyEmergingOpportunities(data),
        longTerm: this.identifyLongTermOpportunities(data)
      }
    };
  }

  /**
   * Generate strategic recommendations based on comprehensive analysis
   */
  generateStrategicRecommendations(insights) {
    const recommendations = {
      primary: [],
      secondary: [],
      warnings: [],
      actionItems: []
    };

    // Analyze each insight category and generate recommendations
    this.addPerformanceRecommendations(recommendations, insights.performance);
    this.addContextualRecommendations(recommendations, insights.context);
    this.addPredictiveRecommendations(recommendations, insights.predictions);
    this.addRiskRecommendations(recommendations, insights.risks);
    this.addOpportunityRecommendations(recommendations, insights.opportunities);

    // Prioritize recommendations
    return this.prioritizeRecommendations(recommendations);
  }

  /**
   * Assess data quality and confidence
   */
  assessDataQuality(insights) {
    const qualityScores = {
      performanceData: this.assessPerformanceDataQuality(insights.performance),
      contextualData: this.assessContextualDataQuality(insights.context),
      enhancedData: this.assessEnhancedDataQuality(insights.enhanced),
      predictiveData: this.assessPredictiveDataQuality(insights.predictions)
    };

    const overallScore = Object.values(qualityScores).reduce((sum, score) => sum + score, 0) / 4;
    
    return {
      ...qualityScores,
      overallScore,
      confidence: this.calculateConfidenceLevel(overallScore),
      dataCompleteness: this.assessDataCompleteness(insights),
      recommendation: this.getQualityRecommendation(overallScore)
    };
  }

  /**
   * Helper methods for analysis
   */
  identifyVenueAdvantages(venueAnalysis) {
    if (!venueAnalysis || !venueAnalysis.venueStats) return [];
    
    const advantages = [];
    const { venueStats } = venueAnalysis;
    
    if (venueStats.battingAverage >= 0.300) {
      advantages.push({
        type: 'high_average',
        description: `Excellent batting average at venue (.${Math.round(venueStats.battingAverage * 1000)})`,
        strength: 'high'
      });
    }
    
    if (venueStats.homeRuns >= 3) {
      advantages.push({
        type: 'power_production',
        description: `Strong home run production (${venueStats.homeRuns} HR)`,
        strength: 'high'
      });
    }
    
    return advantages;
  }

  identifyVenueDisadvantages(venueAnalysis) {
    if (!venueAnalysis || !venueAnalysis.venueStats) return [];
    
    const disadvantages = [];
    const { venueStats } = venueAnalysis;
    
    if (venueStats.battingAverage <= 0.200 && venueAnalysis.gamesPlayed >= 5) {
      disadvantages.push({
        type: 'poor_average',
        description: `Struggles at venue (.${Math.round(venueStats.battingAverage * 1000)})`,
        severity: 'high'
      });
    }
    
    return disadvantages;
  }

  analyzeRecentPerformance(playerGames) {
    if (!playerGames || playerGames.length === 0) return null;
    
    const totalHits = playerGames.reduce((sum, g) => sum + (g.H || 0), 0);
    const totalAB = playerGames.reduce((sum, g) => sum + (g.AB || 0), 0);
    const totalHR = playerGames.reduce((sum, g) => sum + (g.HR || 0), 0);
    const totalRBI = playerGames.reduce((sum, g) => sum + (g.RBI || 0), 0);
    
    return {
      gamesPlayed: playerGames.length,
      average: totalAB > 0 ? totalHits / totalAB : 0,
      homeRuns: totalHR,
      rbi: totalRBI,
      trend: this.calculateTrend(playerGames),
      consistency: this.calculateConsistency(playerGames),
      powerSurge: totalHR >= 3,
      hotStreak: this.detectHotStreak(playerGames)
    };
  }

  calculateTrend(games) {
    if (games.length < 5) return 'insufficient_data';
    
    const recent3 = games.slice(-3);
    const previous3 = games.slice(-6, -3);
    
    const recentAvg = this.calculateGameGroupAverage(recent3);
    const previousAvg = this.calculateGameGroupAverage(previous3);
    
    if (recentAvg > previousAvg + 0.100) return 'improving';
    if (recentAvg < previousAvg - 0.100) return 'declining';
    return 'stable';
  }

  calculateGameGroupAverage(games) {
    const hits = games.reduce((sum, g) => sum + (g.H || 0), 0);
    const abs = games.reduce((sum, g) => sum + (g.AB || 0), 0);
    return abs > 0 ? hits / abs : 0;
  }

  calculateConsistency(games) {
    const averages = games.map(g => (g.AB || 0) > 0 ? (g.H || 0) / (g.AB || 0) : 0);
    const mean = averages.reduce((sum, avg) => sum + avg, 0) / averages.length;
    const variance = averages.reduce((sum, avg) => sum + Math.pow(avg - mean, 2), 0) / averages.length;
    
    return {
      variance,
      rating: variance < 0.05 ? 'consistent' : variance < 0.15 ? 'moderate' : 'volatile'
    };
  }

  detectHotStreak(games) {
    let consecutiveGames = 0;
    for (let i = games.length - 1; i >= 0; i--) {
      if ((games[i].H || 0) >= 1) {
        consecutiveGames++;
      } else {
        break;
      }
    }
    
    return {
      active: consecutiveGames >= 3,
      length: consecutiveGames,
      strength: consecutiveGames >= 5 ? 'strong' : consecutiveGames >= 3 ? 'moderate' : 'none'
    };
  }

  createPlayerBatches(players, batchSize) {
    const batches = [];
    for (let i = 0; i < players.length; i += batchSize) {
      batches.push(players.slice(i, i + batchSize));
    }
    return batches;
  }

  sortBatchResults(results, priorityPlayers) {
    return results.sort((a, b) => {
      // Priority players first
      const aPriority = priorityPlayers.includes(a.player.playerName);
      const bPriority = priorityPlayers.includes(b.player.playerName);
      
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;
      
      // Then by overall quality score
      return b.qualityAssessment.overallScore - a.qualityAssessment.overallScore;
    });
  }

  generateBatchSummary(results, currentDate) {
    const successful = results.filter(r => r.qualityAssessment.overallScore >= 50);
    const highConfidence = results.filter(r => r.qualityAssessment.confidence === 'high');
    const topOpportunities = results.filter(r => 
      r.insights.opportunities.immediate.length > 0
    ).slice(0, 10);

    return {
      totalAnalyzed: results.length,
      successfulAnalyses: successful.length,
      highConfidenceAnalyses: highConfidence.length,
      topOpportunities: topOpportunities.map(r => ({
        player: r.player,
        opportunities: r.insights.opportunities.immediate.slice(0, 3)
      })),
      averageQualityScore: results.reduce((sum, r) => sum + r.qualityAssessment.overallScore, 0) / results.length,
      generatedAt: currentDate.toISOString()
    };
  }

  // Placeholder methods for detailed implementations
  addPerformanceRecommendations(recommendations, performance) {
    if (performance?.recent?.hotStreak?.active) {
      recommendations.primary.push({
        type: 'ride_hot_streak',
        message: 'Ride the hot streak - player showing consistent performance',
        confidence: 'high'
      });
    }
  }

  addContextualRecommendations(recommendations, context) {
    if (context?.venue?.advantages?.length > 0) {
      recommendations.primary.push({
        type: 'venue_advantage',
        message: 'Strong venue performance indicates opportunity',
        confidence: 'medium'
      });
    }
  }

  addPredictiveRecommendations(recommendations, predictions) {
    // Add predictive recommendations
  }

  addRiskRecommendations(recommendations, risks) {
    // Add risk-based recommendations
  }

  addOpportunityRecommendations(recommendations, opportunities) {
    // Add opportunity-based recommendations
  }

  prioritizeRecommendations(recommendations) {
    // Sort recommendations by priority and confidence
    Object.keys(recommendations).forEach(key => {
      recommendations[key] = recommendations[key].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.confidence] - priorityOrder[a.confidence];
      });
    });
    
    return recommendations;
  }

  // Assessment methods
  assessPerformanceDataQuality(performance) {
    if (!performance) return 0;
    
    let score = 0;
    if (performance.recent) score += 40;
    if (performance.season) score += 40;
    if (performance.trends) score += 20;
    
    return score;
  }

  assessContextualDataQuality(context) {
    if (!context) return 0;
    
    let score = 0;
    if (context.series) score += 25;
    if (context.venue) score += 25;
    if (context.team) score += 25;
    if (context.situational) score += 25;
    
    return score;
  }

  assessEnhancedDataQuality(enhanced) {
    if (!enhanced) return 0;
    return Object.keys(enhanced).length > 0 ? 80 : 20;
  }

  assessPredictiveDataQuality(predictions) {
    if (!predictions) return 0;
    return Object.keys(predictions).length > 0 ? 70 : 30;
  }

  calculateConfidenceLevel(score) {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'very_low';
  }

  assessDataCompleteness(insights) {
    const totalSections = 5; // performance, context, enhanced, predictions, risks
    const completeSections = Object.values(insights).filter(section => 
      section && Object.keys(section).length > 0
    ).length;
    
    return (completeSections / totalSections) * 100;
  }

  getQualityRecommendation(score) {
    if (score >= 80) return 'Excellent data quality - high confidence in analysis';
    if (score >= 60) return 'Good data quality - reliable analysis';
    if (score >= 40) return 'Moderate data quality - use with caution';
    return 'Poor data quality - analysis may be unreliable';
  }

  // Default/fallback methods
  getDefaultComprehensiveAnalysis(player, currentDate) {
    return {
      player: {
        ...player,
        analysisDate: currentDate.toISOString()
      },
      insights: {
        performance: null,
        context: null,
        enhanced: null,
        predictions: null,
        risks: null,
        opportunities: null
      },
      recommendations: {
        primary: [],
        secondary: [],
        warnings: [],
        actionItems: []
      },
      qualityAssessment: {
        overallScore: 0,
        confidence: 'very_low',
        recommendation: 'Insufficient data for analysis'
      },
      error: 'Failed to generate comprehensive analysis'
    };
  }

  getDefaultBatchSummary() {
    return {
      totalAnalyzed: 0,
      successfulAnalyses: 0,
      highConfidenceAnalyses: 0,
      topOpportunities: [],
      averageQualityScore: 0
    };
  }

  // Placeholder methods for future implementation
  identifyPerformanceTrends() { return {}; }
  analyzeSituationalFactors() { return {}; }
  calculateNextGameExpectation() { return {}; }
  calculateStreakProbability() { return {}; }
  assessBreakoutPotential() { return {}; }
  assessSlumpRisk() { return {}; }
  assessInjuryRisk() { return {}; }
  assessVariabilityRisk() { return {}; }
  identifyImmediateOpportunities() { return []; }
  identifyEmergingOpportunities() { return []; }
  identifyLongTermOpportunities() { return []; }
  assessPlayerRoleInTeam() { return {}; }
  assessTeamMomentum() { return {}; }
  estimateLineupPosition() { return null; }
  calculateSeasonRankings() { return {}; }
  identifySeasonTrends() { return {}; }
  identifyUpcomingMilestones() { return []; }
}

// Create and export singleton instance
const advancedPlayerInsightsService = new AdvancedPlayerInsightsService();
export default advancedPlayerInsightsService;