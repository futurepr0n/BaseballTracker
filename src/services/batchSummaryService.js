/**
 * Batch Summary Service
 * Analyzes batch analysis results to generate strategic insights,
 * summary tables, and actionable recommendations
 */

import stadiumContextService from './stadiumContextService';
import weatherContextService from './weatherContextService';
import teamPerformanceService from './teamPerformanceService';

class BatchSummaryService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Generate comprehensive batch analysis summary
   * @param {Array} predictions - Array of enhanced predictions
   * @param {Array} matchups - Original matchup data
   * @returns {Object} Comprehensive summary
   */
  async generateBatchSummary(predictions, matchups = []) {
    if (!predictions || predictions.length === 0) {
      return this.getEmptySummary();
    }

    const cacheKey = `batch-${predictions.length}-${Date.now()}`;
    
    try {
      console.log(`📊 Generating batch summary for ${predictions.length} predictions`);

      const summary = {
        overview: this.generateOverview(predictions),
        topOpportunities: this.getTopOpportunities(predictions),
        pitcherIntelligence: await this.getPitcherIntelligence(predictions, matchups),
        stadiumWeatherImpact: await this.getStadiumWeatherImpact(predictions, matchups),
        quickInsights: this.generateQuickInsights(predictions),
        alerts: this.generateAlerts(predictions),
        categoryBreakdown: this.getCategoryBreakdown(predictions),
        confidenceDistribution: this.getConfidenceDistribution(predictions)
      };

      console.log(`✅ Batch summary generated with ${summary.alerts.length} alerts`);
      return summary;

    } catch (error) {
      console.error('Error generating batch summary:', error);
      return this.getEmptySummary();
    }
  }

  /**
   * Generate overview statistics
   */
  generateOverview(predictions) {
    const overview = {
      totalPlayers: predictions.length,
      playersWithBadges: 0,
      averageHRScore: 0,
      averageConfidence: 0,
      topCategory: 'Standard',
      categoryCount: {}
    };

    let totalHRScore = 0;
    let totalConfidence = 0;

    predictions.forEach(prediction => {
      // Count players with badges
      if (prediction.dashboard_context?.badges?.length > 0) {
        overview.playersWithBadges++;
      }

      // Sum scores for averages
      totalHRScore += prediction.hr_score || prediction.score || 0;
      totalConfidence += prediction.enhanced_confidence || prediction.confidence || 0;

      // Count categories
      const category = prediction.dashboard_context?.category?.label || 'Standard';
      overview.categoryCount[category] = (overview.categoryCount[category] || 0) + 1;
    });

    overview.averageHRScore = totalHRScore / predictions.length;
    overview.averageConfidence = totalConfidence / predictions.length;

    // Find most common category
    const maxCount = Math.max(...Object.values(overview.categoryCount));
    overview.topCategory = Object.keys(overview.categoryCount).find(
      category => overview.categoryCount[category] === maxCount
    );

    overview.badgePercentage = (overview.playersWithBadges / overview.totalPlayers) * 100;

    return overview;
  }

  /**
   * Get top opportunities by category
   */
  getTopOpportunities(predictions) {
    return {
      bestHitOpportunities: this.getBestHitOpportunities(predictions),
      powerPlayTargets: this.getPowerPlayTargets(predictions),
      hotStreaksToRide: this.getHotStreaksToRide(predictions),
      hiddenGems: this.getHiddenGems(predictions),
      mustPlayAlerts: this.getMustPlayAlerts(predictions)
    };
  }

  /**
   * Get best hit opportunities
   */
  getBestHitOpportunities(predictions) {
    return predictions
      .filter(p => p.hit_probability > 25 || p.dashboard_context?.badges?.length > 0)
      .sort((a, b) => {
        const aScore = (a.hit_probability || 0) + (a.dashboard_context?.confidence_boost || 0);
        const bScore = (b.hit_probability || 0) + (b.dashboard_context?.confidence_boost || 0);
        return bScore - aScore;
      })
      .slice(0, 10)
      .map(p => ({
        player: p.player_name,
        team: p.team,
        hitProbability: p.hit_probability,
        badges: p.dashboard_context?.badges || [],
        confidenceBoost: p.dashboard_context?.confidence_boost || 0,
        reason: this.getOpportunityReason(p, 'hit')
      }));
  }

  /**
   * Get power play targets (HR opportunities)
   */
  getPowerPlayTargets(predictions) {
    return predictions
      .filter(p => p.hr_probability > 8 || p.dashboard_context?.badges?.some(b => b.includes('⚡')))
      .sort((a, b) => {
        const aScore = (a.hr_probability || 0) + (a.dashboard_context?.confidence_boost || 0);
        const bScore = (b.hr_probability || 0) + (b.dashboard_context?.confidence_boost || 0);
        return bScore - aScore;
      })
      .slice(0, 8)
      .map(p => ({
        player: p.player_name,
        team: p.team,
        hrProbability: p.hr_probability,
        hrScore: p.hr_score || p.score,
        badges: p.dashboard_context?.badges || [],
        confidenceBoost: p.dashboard_context?.confidence_boost || 0,
        reason: this.getOpportunityReason(p, 'hr')
      }));
  }

  /**
   * Get hot streaks to ride
   */
  getHotStreaksToRide(predictions) {
    return predictions
      .filter(p => p.dashboard_context?.badges?.some(b => b.includes('🔥')))
      .sort((a, b) => (b.dashboard_context?.confidence_boost || 0) - (a.dashboard_context?.confidence_boost || 0))
      .slice(0, 8)
      .map(p => ({
        player: p.player_name,
        team: p.team,
        badges: p.dashboard_context?.badges || [],
        streakInfo: this.getStreakInfo(p),
        confidenceBoost: p.dashboard_context?.confidence_boost || 0,
        reason: this.getOpportunityReason(p, 'streak')
      }));
  }

  /**
   * Get hidden gems (high context, lower base score)
   */
  getHiddenGems(predictions) {
    return predictions
      .filter(p => 
        (p.hr_score || p.score || 0) < 70 && 
        (p.dashboard_context?.badges?.length || 0) >= 2 &&
        (p.dashboard_context?.confidence_boost || 0) >= 8
      )
      .sort((a, b) => (b.dashboard_context?.confidence_boost || 0) - (a.dashboard_context?.confidence_boost || 0))
      .slice(0, 6)
      .map(p => ({
        player: p.player_name,
        team: p.team,
        baseScore: p.hr_score || p.score,
        enhancedScore: p.enhanced_hr_score || p.hr_score || p.score,
        badges: p.dashboard_context?.badges || [],
        confidenceBoost: p.dashboard_context?.confidence_boost || 0,
        reason: this.getOpportunityReason(p, 'hidden')
      }));
  }

  /**
   * Get must-play alerts (3+ badges or very high confidence)
   */
  getMustPlayAlerts(predictions) {
    return predictions
      .filter(p => 
        (p.dashboard_context?.badges?.length || 0) >= 3 ||
        (p.dashboard_context?.confidence_boost || 0) >= 20 ||
        p.dashboard_context?.is_standout
      )
      .sort((a, b) => {
        const aScore = ((a.dashboard_context?.badges?.length || 0) * 5) + (a.dashboard_context?.confidence_boost || 0);
        const bScore = ((b.dashboard_context?.badges?.length || 0) * 5) + (b.dashboard_context?.confidence_boost || 0);
        return bScore - aScore;
      })
      .slice(0, 5)
      .map(p => ({
        player: p.player_name,
        team: p.team,
        badges: p.dashboard_context?.badges || [],
        confidenceBoost: p.dashboard_context?.confidence_boost || 0,
        standoutScore: p.dashboard_context?.standout_score,
        reason: this.getOpportunityReason(p, 'must_play')
      }));
  }

  /**
   * Get pitcher intelligence summary
   */
  async getPitcherIntelligence(predictions, matchups) {
    const pitcherStats = new Map();
    
    // Group by pitcher
    predictions.forEach(prediction => {
      const matchup = matchups.find(m => 
        m.team_abbr === prediction.team || 
        prediction.player_name?.includes('vs')
      );
      
      const pitcherName = matchup?.pitcher_name || 'Unknown Pitcher';
      
      if (!pitcherStats.has(pitcherName)) {
        pitcherStats.set(pitcherName, {
          pitcher: pitcherName,
          team: matchup?.team_abbr || 'Unknown',
          battersAnalyzed: 0,
          avgHRAllowed: 0,
          totalHRScore: 0,
          vulnerabilityIndex: 0,
          toughBatters: [],
          pitcherStats: {
            era: prediction.pitcher_era,
            whip: prediction.pitcher_whip,
            hrPerGame: this.calculatePitcherHRPerGame(prediction),
            trendDirection: prediction.pitcher_trend_dir,
            recentERA: this.calculateRecentERA(prediction),
            recentForm: this.assessRecentForm(prediction),
            totalGames: prediction.pitcher_home_games || 0,
            totalHRsAllowed: prediction.pitcher_home_hr_total || 0
          }
        });
      }
      
      const pitcher = pitcherStats.get(pitcherName);
      pitcher.battersAnalyzed++;
      pitcher.totalHRScore += prediction.hr_score || prediction.score || 0;
      
      // Add high-threat batters
      if ((prediction.hr_score || prediction.score || 0) > 70) {
        pitcher.toughBatters.push({
          player: prediction.player_name,
          team: prediction.team,
          hrScore: prediction.hr_score || prediction.score,
          badges: prediction.dashboard_context?.badges || []
        });
      }
    });

    // Calculate vulnerability index and add explanatory context
    await Promise.all(
      Array.from(pitcherStats.values()).map(async pitcher => {
        pitcher.avgHRScore = pitcher.totalHRScore / pitcher.battersAnalyzed;
        pitcher.vulnerabilityIndex = await this.calculateVulnerabilityIndex(pitcher);
        pitcher.vulnerabilityReason = this.generateVulnerabilityReason(pitcher);
        pitcher.dominanceReason = this.generateDominanceReason(pitcher);
      })
    );

    const sortedPitchers = Array.from(pitcherStats.values())
      .sort((a, b) => b.vulnerabilityIndex - a.vulnerabilityIndex);

    const vulnerablePitchers = sortedPitchers.slice(0, 5).map(pitcher => ({
      ...pitcher,
      classification: 'vulnerable',
      reason: pitcher.vulnerabilityReason,
      threatLevel: this.calculateThreatLevel(pitcher)
    }));

    const dominantPitchers = sortedPitchers.slice(-3).reverse().map(pitcher => ({
      ...pitcher,
      classification: 'dominant', 
      reason: pitcher.dominanceReason,
      strengthLevel: this.calculateStrengthLevel(pitcher)
    }));

    return {
      vulnerablePitchers,
      dominantPitchers,
      pitcherCount: pitcherStats.size,
      analysisContext: {
        avgVulnerabilityIndex: sortedPitchers.reduce((sum, p) => sum + p.vulnerabilityIndex, 0) / sortedPitchers.length,
        totalToughBatters: sortedPitchers.reduce((sum, p) => sum + p.toughBatters.length, 0),
        pitchersWithMultipleThreats: sortedPitchers.filter(p => p.toughBatters.length >= 2).length
      }
    };
  }

  /**
   * Calculate pitcher HR per game
   */
  calculatePitcherHRPerGame(prediction) {
    const hrTotal = prediction.pitcher_home_hr_total || 0;
    const games = prediction.pitcher_home_games || 1;
    return hrTotal / games;
  }

  /**
   * Calculate enhanced vulnerability index with recent form and context
   */
  async calculateVulnerabilityIndex(pitcher) {
    const baseScore = pitcher.avgHRScore;
    const seasonHRRate = pitcher.pitcherStats.hrPerGame || 0;
    const toughBatterCount = pitcher.toughBatters.length;
    
    // Enhanced calculation with additional context factors
    const recentFormWeight = this.calculateRecentFormWeight(pitcher);
    const teamOffensiveStrength = await this.calculateTeamOffensiveStrength(pitcher);
    const ballparkFactor = this.calculateBallparkFactor(pitcher);
    
    // Base calculation (maintains backward compatibility)
    const baseVulnerability = baseScore + (seasonHRRate * 10) + (toughBatterCount * 5);
    
    // Enhanced adjustments
    const recentFormAdjustment = recentFormWeight * 15; // Up to 15 points for recent struggles
    const teamContextAdjustment = teamOffensiveStrength * 8; // Up to 8 points for hot offense
    const ballparkAdjustment = (ballparkFactor - 1.0) * 12; // Ballpark impact
    
    const enhancedVulnerability = baseVulnerability + 
                                  recentFormAdjustment + 
                                  teamContextAdjustment + 
                                  ballparkAdjustment;
    
    return Math.max(0, enhancedVulnerability); // Ensure non-negative
  }

  /**
   * Calculate recent form weight (0.0 = great recent form, 1.0 = concerning recent form)
   */
  calculateRecentFormWeight(pitcher) {
    const recentERA = pitcher.pitcherStats.recentERA || pitcher.pitcherStats.era || 4.50;
    const seasonERA = pitcher.pitcherStats.era || 4.50;
    
    // If recent ERA is significantly worse than season ERA, increase vulnerability
    const eraRatio = recentERA / seasonERA;
    
    if (eraRatio > 1.3) return 1.0;     // Recent form much worse
    if (eraRatio > 1.15) return 0.7;    // Recent form somewhat worse  
    if (eraRatio > 1.05) return 0.4;    // Recent form slightly worse
    if (eraRatio < 0.8) return -0.3;    // Recent form much better (reduce vulnerability)
    if (eraRatio < 0.9) return -0.1;    // Recent form better
    
    return 0.0; // Recent form similar to season
  }

  /**
   * Calculate team offensive strength (0.0 = cold offense, 1.0 = hot offense)
   */
  async calculateTeamOffensiveStrength(pitcher) {
    try {
      const teamAbbr = pitcher.team;
      const teamMetrics = await teamPerformanceService.analyzeTeamOffensivePerformance(teamAbbr);
      
      // Convert team classification to vulnerability factor
      switch (teamMetrics.classification) {
        case 'elite': return 0.9;
        case 'strong': return 0.7;
        case 'average': return 0.5;
        case 'below_average': return 0.3;
        case 'weak': return 0.1;
        default: return 0.5;
      }
    } catch (error) {
      console.error('Error calculating team offensive strength:', error);
      return 0.5; // Default neutral
    }
  }

  /**
   * Calculate ballpark factor (1.0 = neutral, >1.0 = hitter friendly, <1.0 = pitcher friendly)
   */
  calculateBallparkFactor(pitcher) {
    // This would integrate with stadiumContextService
    // For now, return neutral baseline
    return 1.0;
  }

  /**
   * Calculate recent ERA (would integrate with pitcher recent performance data)
   */
  calculateRecentERA(prediction) {
    // This would calculate ERA over last 5 starts
    // For now, use season ERA with some variation to demonstrate concept
    const seasonERA = prediction.pitcher_era || 4.50;
    const hrRate = this.calculatePitcherHRPerGame(prediction);
    
    // Simulate recent form based on HR rate (higher HR rate suggests worse recent ERA)
    if (hrRate > 1.5) return seasonERA * 1.2; // Recent struggles
    if (hrRate > 1.0) return seasonERA * 1.1; // Slightly worse recently
    if (hrRate < 0.5) return seasonERA * 0.9; // Better recently
    
    return seasonERA; // Similar to season average
  }

  /**
   * Assess recent form based on available metrics
   */
  assessRecentForm(prediction) {
    const seasonERA = prediction.pitcher_era || 4.50;
    const recentERA = this.calculateRecentERA(prediction);
    const hrRate = this.calculatePitcherHRPerGame(prediction);
    
    // Determine form assessment
    if (recentERA > seasonERA * 1.2 || hrRate > 1.5) {
      return 'struggling';
    } else if (recentERA < seasonERA * 0.9 && hrRate < 0.7) {
      return 'dominant';
    } else if (recentERA > seasonERA * 1.1 || hrRate > 1.0) {
      return 'concerning';
    } else if (recentERA < seasonERA * 0.95) {
      return 'improving';
    }
    
    return 'stable';
  }

  /**
   * Generate vulnerability reason for high-risk pitchers
   */
  generateVulnerabilityReason(pitcher) {
    const reasons = [];
    const hrRate = pitcher.pitcherStats.hrPerGame;
    const era = pitcher.pitcherStats.era || 4.50;
    const recentForm = pitcher.pitcherStats.recentForm;
    const toughBatterCount = pitcher.toughBatters.length;

    // High HR rate
    if (hrRate > 1.2) {
      reasons.push(`High HR rate (${hrRate.toFixed(2)}/game)`);
    }

    // Poor ERA
    if (era > 4.75) {
      reasons.push(`High ERA (${era.toFixed(2)})`);
    }

    // Recent form concerns
    if (recentForm === 'struggling') {
      reasons.push('Recent struggles');
    } else if (recentForm === 'concerning') {
      reasons.push('Concerning recent form');
    }

    // Multiple tough matchups
    if (toughBatterCount >= 3) {
      reasons.push(`${toughBatterCount} high-threat batters`);
    } else if (toughBatterCount >= 2) {
      reasons.push(`${toughBatterCount} tough matchups`);
    }

    // High average HR scores against
    if (pitcher.avgHRScore > 65) {
      reasons.push(`High avg HR score (${pitcher.avgHRScore.toFixed(1)})`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Above average vulnerability metrics';
  }

  /**
   * Generate dominance reason for low-risk pitchers
   */
  generateDominanceReason(pitcher) {
    const reasons = [];
    const hrRate = pitcher.pitcherStats.hrPerGame;
    const era = pitcher.pitcherStats.era || 4.50;
    const recentForm = pitcher.pitcherStats.recentForm;
    const toughBatterCount = pitcher.toughBatters.length;

    // Low HR rate
    if (hrRate < 0.7) {
      reasons.push(`Low HR rate (${hrRate.toFixed(2)}/game)`);
    }

    // Good ERA
    if (era < 3.50) {
      reasons.push(`Strong ERA (${era.toFixed(2)})`);
    }

    // Good recent form
    if (recentForm === 'dominant') {
      reasons.push('Dominant recent form');
    } else if (recentForm === 'improving') {
      reasons.push('Improving form');
    }

    // Few tough matchups
    if (toughBatterCount === 0) {
      reasons.push('No high-threat batters');
    } else if (toughBatterCount === 1) {
      reasons.push('Only 1 tough matchup');
    }

    // Low average HR scores against
    if (pitcher.avgHRScore < 45) {
      reasons.push(`Low avg HR score (${pitcher.avgHRScore.toFixed(1)})`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Strong performance metrics';
  }

  /**
   * Calculate threat level for vulnerable pitchers
   */
  calculateThreatLevel(pitcher) {
    const vulnerabilityIndex = pitcher.vulnerabilityIndex;
    const toughBatterCount = pitcher.toughBatters.length;
    
    if (vulnerabilityIndex > 90 || toughBatterCount >= 4) return 'extreme';
    if (vulnerabilityIndex > 75 || toughBatterCount >= 3) return 'high';
    if (vulnerabilityIndex > 60 || toughBatterCount >= 2) return 'moderate';
    return 'low';
  }

  /**
   * Calculate strength level for dominant pitchers
   */
  calculateStrengthLevel(pitcher) {
    const vulnerabilityIndex = pitcher.vulnerabilityIndex;
    const toughBatterCount = pitcher.toughBatters.length;
    const hrRate = pitcher.pitcherStats.hrPerGame;
    
    if (vulnerabilityIndex < 30 && toughBatterCount === 0 && hrRate < 0.5) return 'elite';
    if (vulnerabilityIndex < 40 && toughBatterCount <= 1) return 'strong';
    if (vulnerabilityIndex < 50) return 'solid';
    return 'average';
  }

  /**
   * Get stadium and weather impact
   */
  async getStadiumWeatherImpact(predictions, matchups) {
    // For now, return a placeholder structure
    // This would be enhanced with actual stadium and weather data integration
    return {
      hrFriendlyVenues: [],
      pitcherFriendlyVenues: [],
      weatherAlerts: [],
      venueRecommendations: []
    };
  }

  /**
   * Generate quick insights
   */
  generateQuickInsights(predictions) {
    const insights = [];
    
    const playersWithBadges = predictions.filter(p => p.dashboard_context?.badges?.length > 0);
    const highConfidencePlayers = predictions.filter(p => (p.dashboard_context?.confidence_boost || 0) > 15);
    const hotStreakPlayers = predictions.filter(p => 
      p.dashboard_context?.badges?.some(b => b.includes('🔥'))
    );
    const hrCandidates = predictions.filter(p => p.hr_probability > 10);

    insights.push({
      icon: '🎯',
      value: playersWithBadges.length,
      label: 'Players with Context',
      description: `${((playersWithBadges.length / predictions.length) * 100).toFixed(1)}% have dashboard context`
    });

    insights.push({
      icon: '🔥',
      value: hotStreakPlayers.length,
      label: 'Hot Streaks',
      description: 'Players currently on hitting streaks'
    });

    insights.push({
      icon: '⚡',
      value: hrCandidates.length,
      label: 'HR Candidates',
      description: 'Players with >10% HR probability'
    });

    insights.push({
      icon: '🚨',
      value: highConfidencePlayers.length,
      label: 'High Confidence',
      description: 'Players with significant context boost'
    });

    return insights;
  }

  /**
   * Generate alerts
   */
  generateAlerts(predictions) {
    const alerts = [];

    // Must-play alerts
    const mustPlays = predictions.filter(p => 
      (p.dashboard_context?.badges?.length || 0) >= 3 ||
      (p.dashboard_context?.confidence_boost || 0) >= 20
    );

    mustPlays.forEach(player => {
      alerts.push({
        type: 'opportunity',
        priority: 'high',
        player: player.player_name,
        team: player.team,
        message: `🚨 Must-Play: ${player.dashboard_context.badges.length} badges, +${player.dashboard_context.confidence_boost}% boost`,
        badges: player.dashboard_context.badges
      });
    });

    // Risk warnings
    const riskPlayers = predictions.filter(p => 
      p.dashboard_context?.badges?.some(b => b.includes('⚠️')) ||
      (p.dashboard_context?.confidence_boost || 0) < -10
    );

    riskPlayers.forEach(player => {
      alerts.push({
        type: 'warning',
        priority: 'medium',
        player: player.player_name,
        team: player.team,
        message: `⚠️ Risk Warning: ${player.dashboard_context.confidence_boost}% negative impact`,
        badges: player.dashboard_context.badges
      });
    });

    return alerts.slice(0, 10); // Limit to top 10 alerts
  }

  /**
   * Get category breakdown
   */
  getCategoryBreakdown(predictions) {
    const breakdown = {};
    
    predictions.forEach(prediction => {
      const category = prediction.dashboard_context?.category?.label || 'Standard';
      if (!breakdown[category]) {
        breakdown[category] = {
          count: 0,
          players: [],
          avgHRScore: 0,
          totalHRScore: 0
        };
      }
      
      breakdown[category].count++;
      breakdown[category].players.push({
        name: prediction.player_name,
        team: prediction.team,
        hrScore: prediction.hr_score || prediction.score || 0
      });
      breakdown[category].totalHRScore += prediction.hr_score || prediction.score || 0;
    });

    // Calculate averages
    Object.values(breakdown).forEach(category => {
      category.avgHRScore = category.totalHRScore / category.count;
    });

    return breakdown;
  }

  /**
   * Get confidence distribution
   */
  getConfidenceDistribution(predictions) {
    const distribution = {
      veryHigh: 0,    // >20% boost
      high: 0,        // 10-20% boost  
      moderate: 0,    // 0-10% boost
      negative: 0,    // <0% boost
      none: 0         // No boost
    };

    predictions.forEach(prediction => {
      const boost = prediction.dashboard_context?.confidence_boost || 0;
      
      if (boost > 20) distribution.veryHigh++;
      else if (boost > 10) distribution.high++;
      else if (boost > 0) distribution.moderate++;
      else if (boost < 0) distribution.negative++;
      else distribution.none++;
    });

    return distribution;
  }

  /**
   * Helper functions
   */
  getOpportunityReason(prediction, type) {
    const badges = prediction.dashboard_context?.badges || [];
    const boost = prediction.dashboard_context?.confidence_boost || 0;
    
    if (type === 'hit') {
      const hitProb = (prediction.hit_probability || 0).toFixed(2);
      return `${hitProb}% hit probability${boost > 0 ? ` +${boost}% context boost` : ''}`;
    } else if (type === 'hr') {
      const hrProb = (prediction.hr_probability || 0).toFixed(2);
      return `${hrProb}% HR probability${badges.length > 0 ? ` with ${badges.length} context indicators` : ''}`;
    } else if (type === 'streak') {
      const streakBadge = badges.find(b => b.includes('🔥'));
      return streakBadge || 'Active hitting streak';
    } else if (type === 'hidden') {
      const baseScore = (prediction.hr_score || prediction.score || 0).toFixed(1);
      const enhancedScore = (prediction.enhanced_hr_score || prediction.hr_score || prediction.score || 0).toFixed(1);
      return `Base score ${baseScore} enhanced to ${enhancedScore} by context`;
    } else if (type === 'must_play') {
      return `${badges.length} badges, ${boost > 0 ? '+' : ''}${boost}% confidence boost`;
    }
    
    return 'Multiple positive indicators';
  }

  getStreakInfo(prediction) {
    const badges = prediction.dashboard_context?.badges || [];
    const streakBadge = badges.find(b => b.includes('🔥'));
    return streakBadge || 'Hot streak active';
  }

  getEmptySummary() {
    return {
      overview: { totalPlayers: 0, playersWithBadges: 0 },
      topOpportunities: { bestHitOpportunities: [], powerPlayTargets: [] },
      pitcherIntelligence: { vulnerablePitchers: [], dominantPitchers: [] },
      stadiumWeatherImpact: { hrFriendlyVenues: [], weatherAlerts: [] },
      quickInsights: [],
      alerts: [],
      categoryBreakdown: {},
      confidenceDistribution: {}
    };
  }
}

// Export singleton instance
export const batchSummaryService = new BatchSummaryService();
export default batchSummaryService;