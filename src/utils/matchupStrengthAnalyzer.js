/**
 * Matchup Strength Analyzer
 * Comprehensive utility for determining pitcher vulnerability and batter strength
 * in matchup contexts beyond simple statistical averages
 */

import teamPerformanceService from '../services/teamPerformanceService';
import stadiumContextService from '../services/stadiumContextService';
import weatherContextService from '../services/weatherContextService';

export class MatchupStrengthAnalyzer {
  constructor() {
    this.analysisCache = new Map();
    this.cacheTimeout = 20 * 60 * 1000; // 20 minutes
  }

  /**
   * Comprehensive matchup strength analysis
   * @param {Object} pitcher - Pitcher data with stats and form
   * @param {Array} batters - Array of batter predictions against this pitcher
   * @param {Object} gameContext - Game context (stadium, weather, etc.)
   * @returns {Object} Detailed strength/weakness analysis
   */
  async analyzeMatchupStrength(pitcher, batters, gameContext = {}) {
    const cacheKey = `matchup-${pitcher.pitcher}-${batters.length}-${Date.now()}`;
    
    try {
      console.log(`🔍 Analyzing matchup strength for ${pitcher.pitcher} vs ${batters.length} batters`);

      const analysis = {
        pitcher: await this.analyzePitcherStrengthFactors(pitcher, gameContext),
        offense: await this.analyzeOffensiveStrengthFactors(batters, gameContext),
        contextual: await this.analyzeContextualFactors(pitcher, batters, gameContext),
        recommendations: [],
        confidenceLevel: 0.5
      };

      // Generate strategic recommendations
      analysis.recommendations = this.generateStrategicRecommendations(analysis);
      analysis.confidenceLevel = this.calculateAnalysisConfidence(analysis);
      analysis.summary = this.generateAnalysisSummary(analysis);

      // Cache for performance
      this.analysisCache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      });

      console.log(`✅ Matchup analysis complete with ${analysis.recommendations.length} recommendations`);
      return analysis;

    } catch (error) {
      console.error('Error in matchup strength analysis:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Analyze pitcher strength factors beyond basic stats
   */
  async analyzePitcherStrengthFactors(pitcher, gameContext) {
    const factors = {
      recentForm: this.assessPitcherRecentForm(pitcher),
      effectiveness: this.calculatePitcherEffectiveness(pitcher),
      durability: this.assessPitcherDurability(pitcher),
      situationalStrength: this.analyzeSituationalStrength(pitcher, gameContext),
      vulnerabilities: this.identifyPitcherVulnerabilities(pitcher),
      advantages: this.identifyPitcherAdvantages(pitcher)
    };

    // Add contextual adjustments
    factors.ballparkAdjustment = await this.calculateBallparkImpact(pitcher, gameContext);
    factors.weatherAdjustment = await this.calculateWeatherImpact(pitcher, gameContext);
    factors.restAdvantage = this.calculateRestAdvantage(pitcher);

    return factors;
  }

  /**
   * Analyze offensive strength factors
   */
  async analyzeOffensiveStrengthFactors(batters, gameContext) {
    const teamAbbr = batters[0]?.team || 'UNK';
    const teamMetrics = await teamPerformanceService.analyzeTeamOffensivePerformance(teamAbbr);

    const factors = {
      teamStrength: teamMetrics,
      powerThreat: this.calculatePowerThreat(batters),
      contactQuality: this.calculateContactQuality(batters),
      plateApproach: this.analyzePlateApproach(batters),
      hotBatters: this.identifyHotBatters(batters),
      coldBatters: this.identifyColdBatters(batters),
      matchupAdvantages: this.findMatchupAdvantages(batters)
    };

    // Contextual adjustments
    factors.momentumFactor = this.calculateTeamMomentum(teamMetrics);
    factors.lineupDepth = this.assessLineupDepth(batters);
    factors.situationalHitters = this.identifySituationalHitters(batters);

    return factors;
  }

  /**
   * Analyze contextual factors that affect matchup dynamics
   */
  async analyzeContextualFactors(pitcher, batters, gameContext) {
    const factors = {
      historical: await this.getHistoricalMatchupData(pitcher, batters),
      stadium: await this.getStadiumImpact(gameContext),
      weather: await this.getWeatherImpact(gameContext),
      timing: this.analyzeGameTiming(gameContext),
      series: this.analyzeSeriesContext(gameContext),
      injuries: this.assessInjuryImpact(pitcher, batters)
    };

    return factors;
  }

  /**
   * Assess pitcher recent form beyond ERA
   */
  assessPitcherRecentForm(pitcher) {
    const stats = pitcher.pitcherStats;
    const recentForm = stats.recentForm || 'stable';
    const hrRate = stats.hrPerGame || 0;
    const era = stats.era || 4.50;

    return {
      classification: recentForm,
      concerns: hrRate > 1.2 || era > 5.0,
      strengths: hrRate < 0.8 && era < 3.5,
      trend: stats.trendDirection || 'stable',
      formScore: this.calculateFormScore(recentForm, hrRate, era)
    };
  }

  /**
   * Calculate pitcher effectiveness score
   */
  calculatePitcherEffectiveness(pitcher) {
    const stats = pitcher.pitcherStats;
    const whip = stats.whip || 1.30;
    const era = stats.era || 4.50;
    const hrRate = stats.hrPerGame || 1.0;

    // Lower is better for all these metrics
    const whipScore = Math.max(0, (1.50 - whip) / 1.50 * 100);
    const eraScore = Math.max(0, (6.00 - era) / 6.00 * 100);
    const hrScore = Math.max(0, (2.0 - hrRate) / 2.0 * 100);

    const effectiveness = (whipScore + eraScore + hrScore) / 3;

    return {
      overall: effectiveness,
      components: { whipScore, eraScore, hrScore },
      rating: effectiveness > 75 ? 'excellent' : 
              effectiveness > 60 ? 'good' :
              effectiveness > 45 ? 'average' : 'poor'
    };
  }

  /**
   * Calculate power threat level from batters
   */
  calculatePowerThreat(batters) {
    const hrCandidates = batters.filter(b => (b.hr_probability || 0) > 8);
    const avgHRProb = batters.reduce((sum, b) => sum + (b.hr_probability || 0), 0) / batters.length;
    const topThreat = Math.max(...batters.map(b => b.hr_probability || 0));

    return {
      level: hrCandidates.length >= 4 ? 'extreme' :
             hrCandidates.length >= 2 ? 'high' :
             hrCandidates.length >= 1 ? 'moderate' : 'low',
      candidates: hrCandidates.length,
      averageProbability: avgHRProb,
      topThreat: topThreat,
      dangerousBatters: hrCandidates.map(b => ({
        name: b.player_name,
        probability: b.hr_probability,
        score: b.hr_score || b.score
      }))
    };
  }

  /**
   * Identify hot batters in the lineup
   */
  identifyHotBatters(batters) {
    return batters
      .filter(b => b.dashboard_context?.badges?.some(badge => 
        badge.includes('🔥') || badge.includes('Hot Streak')
      ))
      .map(b => ({
        name: b.player_name,
        badges: b.dashboard_context.badges,
        confidenceBoost: b.dashboard_context.confidence_boost || 0
      }));
  }

  /**
   * Generate strategic recommendations based on analysis
   */
  generateStrategicRecommendations(analysis) {
    const recommendations = [];

    // Pitcher vulnerability recommendations
    if (analysis.pitcher.effectiveness.rating === 'poor') {
      recommendations.push({
        type: 'opportunity',
        priority: 'high',
        message: 'Target this pitcher - showing poor effectiveness metrics',
        confidence: 0.8
      });
    }

    // Power threat recommendations
    if (analysis.offense.powerThreat.level === 'extreme') {
      recommendations.push({
        type: 'strategy',
        priority: 'high', 
        message: `Extreme power lineup - ${analysis.offense.powerThreat.candidates} HR candidates`,
        confidence: 0.9
      });
    }

    // Hot batter recommendations
    if (analysis.offense.hotBatters.length >= 2) {
      recommendations.push({
        type: 'opportunity',
        priority: 'medium',
        message: `${analysis.offense.hotBatters.length} hot batters in lineup`,
        confidence: 0.7
      });
    }

    // Contextual recommendations
    if (analysis.contextual.stadium?.isHitterFriendly && analysis.offense.powerThreat.level !== 'low') {
      recommendations.push({
        type: 'context',
        priority: 'medium',
        message: 'Hitter-friendly ballpark amplifies power threat',
        confidence: 0.6
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall analysis confidence
   */
  calculateAnalysisConfidence(analysis) {
    let confidence = 0.5; // Base confidence

    // Recent data boosts confidence
    if (analysis.pitcher.recentForm.formScore > 0.7) confidence += 0.2;
    
    // Team performance data boosts confidence
    if (analysis.offense.teamStrength.classification !== 'average') confidence += 0.1;

    // Hot batters boost confidence
    if (analysis.offense.hotBatters.length > 0) confidence += 0.1;

    // Multiple threat levels boost confidence
    if (analysis.offense.powerThreat.candidates >= 2) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Generate analysis summary
   */
  generateAnalysisSummary(analysis) {
    const threats = analysis.offense.powerThreat.candidates;
    const pitcherRating = analysis.pitcher.effectiveness.rating;
    const hotBatters = analysis.offense.hotBatters.length;

    let summary = `Pitcher shows ${pitcherRating} effectiveness`;
    
    if (threats >= 2) {
      summary += `, facing ${threats} power threats`;
    }
    
    if (hotBatters > 0) {
      summary += `, ${hotBatters} hot batters`;
    }

    if (analysis.contextual.stadium?.isHitterFriendly) {
      summary += `, hitter-friendly venue`;
    }

    return summary;
  }

  /**
   * Helper methods for various calculations
   */
  calculateFormScore(recentForm, hrRate, era) {
    let score = 0.5; // Base neutral
    
    if (recentForm === 'dominant') score = 0.9;
    else if (recentForm === 'improving') score = 0.7;
    else if (recentForm === 'concerning') score = 0.3;
    else if (recentForm === 'struggling') score = 0.1;
    
    // Adjust based on metrics
    if (hrRate < 0.5 && era < 3.0) score = Math.min(1.0, score + 0.2);
    if (hrRate > 1.5 || era > 5.5) score = Math.max(0.0, score - 0.3);
    
    return score;
  }

  assessLineupDepth(batters) {
    const qualityBatters = batters.filter(b => (b.hr_score || b.score || 0) > 50).length;
    const totalBatters = batters.length;
    
    return {
      quality: qualityBatters / totalBatters,
      rating: qualityBatters >= 7 ? 'deep' :
              qualityBatters >= 5 ? 'solid' :
              qualityBatters >= 3 ? 'average' : 'thin'
    };
  }

  // Placeholder methods for future implementation
  async calculateBallparkImpact(pitcher, gameContext) { return { factor: 1.0 }; }
  async calculateWeatherImpact(pitcher, gameContext) { return { factor: 1.0 }; }
  calculateRestAdvantage(pitcher) { return { advantage: 'none' }; }
  calculateContactQuality(batters) { return { rating: 'average' }; }
  analyzePlateApproach(batters) { return { style: 'balanced' }; }
  identifyColdBatters(batters) { return []; }
  findMatchupAdvantages(batters) { return []; }
  calculateTeamMomentum(teamMetrics) { return teamMetrics.trend; }
  identifySituationalHitters(batters) { return []; }
  async getHistoricalMatchupData() { return { games: 0 }; }
  async getStadiumImpact() { return { isHitterFriendly: false }; }
  async getWeatherImpact() { return { favorable: false }; }
  analyzeGameTiming() { return { advantage: 'none' }; }
  analyzeSeriesContext() { return { momentum: 'neutral' }; }
  assessInjuryImpact() { return { impact: 'none' }; }
  assessPitcherDurability() { return { rating: 'average' }; }
  analyzeSituationalStrength() { return { rating: 'average' }; }
  identifyPitcherVulnerabilities() { return []; }
  identifyPitcherAdvantages() { return []; }

  getDefaultAnalysis() {
    return {
      pitcher: { effectiveness: { rating: 'average' } },
      offense: { powerThreat: { level: 'low', candidates: 0 }, hotBatters: [] },
      contextual: { stadium: { isHitterFriendly: false } },
      recommendations: [],
      confidenceLevel: 0.5,
      summary: 'Default analysis - insufficient data'
    };
  }
}

export default new MatchupStrengthAnalyzer();