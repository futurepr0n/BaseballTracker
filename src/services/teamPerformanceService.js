/**
 * Team Performance Service
 * Analyzes team offensive and pitching performance trends
 * to provide context for matchup strength and weakness analysis
 */

class TeamPerformanceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Analyze team's recent offensive performance
   * @param {string} teamAbbr - Team abbreviation
   * @param {number} days - Number of recent days to analyze (default 10)
   * @returns {Object} Team offensive metrics
   */
  async analyzeTeamOffensivePerformance(teamAbbr, days = 10) {
    const cacheKey = `team-offense-${teamAbbr}-${days}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // This would integrate with actual team performance data
      // For now, return baseline metrics with some variation
      const metrics = {
        runsPerGame: 4.8 + (Math.random() - 0.5) * 2, // 3.8-5.8 range
        homeRunsPerGame: 1.2 + (Math.random() - 0.5) * 0.8, // 0.8-1.6 range
        sluggingPercentage: 0.420 + (Math.random() - 0.5) * 0.100, // 0.370-0.470 range
        onBasePercentage: 0.325 + (Math.random() - 0.5) * 0.080, // 0.285-0.365 range
        teamWRC: 100 + (Math.random() - 0.5) * 40, // 80-120 range
        
        // Trend indicators
        trend: this.calculateOffensiveTrend(),
        hotStreak: Math.random() > 0.7, // 30% chance of hot streak
        
        // Contextual factors
        vsRightHandedPitching: {
          avg: 0.245 + (Math.random() - 0.5) * 0.060,
          slg: 0.410 + (Math.random() - 0.5) * 0.100
        },
        vsLeftHandedPitching: {
          avg: 0.250 + (Math.random() - 0.5) * 0.060,
          slg: 0.395 + (Math.random() - 0.5) * 0.100
        },
        
        // Power metrics
        isolatedPower: 0.155 + (Math.random() - 0.5) * 0.060,
        barrelRate: 6.2 + (Math.random() - 0.5) * 3.0,
        hardHitRate: 35.5 + (Math.random() - 0.5) * 10.0
      };

      // Add strength/weakness classification
      metrics.classification = this.classifyOffensiveStrength(metrics);
      metrics.strengthFactors = this.identifyOffensiveStrengths(metrics);
      metrics.weaknessFactors = this.identifyOffensiveWeaknesses(metrics);

      // Cache the result
      this.cache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
      });

      return metrics;

    } catch (error) {
      console.error('Error analyzing team offensive performance:', error);
      return this.getDefaultOffensiveMetrics();
    }
  }

  /**
   * Analyze opposing pitcher's recent performance against similar offenses
   * @param {string} pitcherName - Pitcher name
   * @param {Object} teamOffensiveProfile - Team's offensive characteristics
   * @returns {Object} Matchup analysis
   */
  async analyzeMatchupContext(pitcherName, teamOffensiveProfile) {
    try {
      const matchupFactors = {
        // Team vs pitcher handedness advantage
        handednessAdvantage: this.calculateHandednessAdvantage(pitcherName, teamOffensiveProfile),
        
        // Power vs contact approach
        approachMatchup: this.analyzeApproachMatchup(pitcherName, teamOffensiveProfile),
        
        // Recent form collision
        momentumFactor: this.calculateMomentumFactor(pitcherName, teamOffensiveProfile),
        
        // Historical head-to-head (if available)
        historicalContext: await this.getHistoricalContext(pitcherName, teamOffensiveProfile.teamAbbr),
        
        // Ballpark considerations
        venueImpact: await this.calculateVenueImpact(teamOffensiveProfile.teamAbbr)
      };

      // Generate matchup recommendation
      matchupFactors.recommendation = this.generateMatchupRecommendation(matchupFactors);
      matchupFactors.confidenceLevel = this.calculateMatchupConfidence(matchupFactors);

      return matchupFactors;

    } catch (error) {
      console.error('Error analyzing matchup context:', error);
      return this.getDefaultMatchupContext();
    }
  }

  /**
   * Calculate offensive trend direction
   */
  calculateOffensiveTrend() {
    const trends = ['surging', 'improving', 'stable', 'declining', 'struggling'];
    const weights = [0.15, 0.25, 0.35, 0.20, 0.05]; // Favor stable/improving
    
    const rand = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < trends.length; i++) {
      cumulative += weights[i];
      if (rand <= cumulative) {
        return trends[i];
      }
    }
    
    return 'stable';
  }

  /**
   * Classify offensive strength level
   */
  classifyOffensiveStrength(metrics) {
    const wrcPlus = metrics.teamWRC;
    const runsPerGame = metrics.runsPerGame;
    
    if (wrcPlus > 115 && runsPerGame > 5.5) return 'elite';
    if (wrcPlus > 105 && runsPerGame > 5.0) return 'strong';
    if (wrcPlus > 95 && runsPerGame > 4.5) return 'average';
    if (wrcPlus > 85) return 'below_average';
    return 'weak';
  }

  /**
   * Identify offensive strengths
   */
  identifyOffensiveStrengths(metrics) {
    const strengths = [];
    
    if (metrics.homeRunsPerGame > 1.4) strengths.push('power');
    if (metrics.onBasePercentage > 0.340) strengths.push('plate_discipline');
    if (metrics.sluggingPercentage > 0.450) strengths.push('extra_base_hits');
    if (metrics.barrelRate > 8.0) strengths.push('hard_contact');
    if (metrics.trend === 'surging') strengths.push('hot_streak');
    if (metrics.trend === 'improving') strengths.push('momentum');
    
    return strengths;
  }

  /**
   * Identify offensive weaknesses
   */
  identifyOffensiveWeaknesses(metrics) {
    const weaknesses = [];
    
    if (metrics.homeRunsPerGame < 0.9) weaknesses.push('lack_of_power');
    if (metrics.onBasePercentage < 0.310) weaknesses.push('poor_plate_discipline');
    if (metrics.sluggingPercentage < 0.380) weaknesses.push('contact_issues');
    if (metrics.barrelRate < 4.5) weaknesses.push('weak_contact');
    if (metrics.trend === 'struggling') weaknesses.push('cold_streak');
    if (metrics.trend === 'declining') weaknesses.push('negative_momentum');
    
    return weaknesses;
  }

  /**
   * Calculate handedness advantage
   */
  calculateHandednessAdvantage(pitcherName, teamProfile) {
    // This would use actual pitcher handedness data
    // For now, simulate based on team splits
    const vsRHP = teamProfile.vsRightHandedPitching;
    const vsLHP = teamProfile.vsLeftHandedPitching;
    
    // Assume 70% of pitchers are right-handed
    const isRHP = Math.random() > 0.3;
    
    if (isRHP) {
      return {
        advantage: vsRHP.slg > vsLHP.slg ? 'slight' : 'none',
        expectedPerformance: vsRHP,
        handedness: 'RHP'
      };
    } else {
      return {
        advantage: vsLHP.slg > vsRHP.slg ? 'significant' : 'slight',
        expectedPerformance: vsLHP,
        handedness: 'LHP'
      };
    }
  }

  /**
   * Analyze approach matchup (power vs finesse, etc.)
   */
  analyzeApproachMatchup(pitcherName, teamProfile) {
    // This would use actual pitcher profile data
    return {
      pitcherType: Math.random() > 0.6 ? 'power' : 'finesse',
      teamStrength: teamProfile.isolatedPower > 0.170 ? 'power' : 'contact',
      matchupRating: Math.random() > 0.5 ? 'favorable' : 'neutral'
    };
  }

  /**
   * Calculate momentum factor
   */
  calculateMomentumFactor(pitcherName, teamProfile) {
    // This would incorporate actual recent performance data
    const teamMomentum = teamProfile.trend === 'surging' ? 1.0 : 
                        teamProfile.trend === 'improving' ? 0.6 :
                        teamProfile.trend === 'declining' ? -0.4 : 
                        teamProfile.trend === 'struggling' ? -0.8 : 0.0;
    
    const pitcherMomentum = (Math.random() - 0.5) * 1.0; // Simulated pitcher form
    
    return {
      teamMomentum,
      pitcherMomentum,
      combined: teamMomentum + pitcherMomentum,
      impact: Math.abs(teamMomentum + pitcherMomentum) > 0.5 ? 'significant' : 'minimal'
    };
  }

  /**
   * Get historical head-to-head context
   */
  async getHistoricalContext(pitcherName, teamAbbr) {
    // This would query actual historical matchup data
    return {
      gamesAgainst: Math.floor(Math.random() * 8),
      avgAgainst: 0.200 + Math.random() * 0.150,
      hrAgainst: Math.floor(Math.random() * 3),
      lastFaced: '2024-05-15', // Placeholder
      trend: Math.random() > 0.5 ? 'improving' : 'declining'
    };
  }

  /**
   * Calculate venue impact
   */
  async calculateVenueImpact(teamAbbr) {
    // This would integrate with stadiumContextService
    return {
      parkFactor: 0.95 + Math.random() * 0.20, // 0.95-1.15 range
      favorability: Math.random() > 0.5 ? 'hitter_friendly' : 'pitcher_friendly',
      impact: 'moderate'
    };
  }

  /**
   * Generate matchup recommendation
   */
  generateMatchupRecommendation(factors) {
    const scores = [
      factors.handednessAdvantage.advantage === 'significant' ? 2 : 
      factors.handednessAdvantage.advantage === 'slight' ? 1 : 0,
      
      factors.approachMatchup.matchupRating === 'favorable' ? 2 : 0,
      
      factors.momentumFactor.impact === 'significant' && factors.momentumFactor.combined > 0 ? 2 : 0,
      
      factors.venueImpact.favorability === 'hitter_friendly' ? 1 : 0
    ];
    
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    
    if (totalScore >= 5) return 'target';
    if (totalScore >= 3) return 'favorable';
    if (totalScore >= 1) return 'neutral';
    return 'avoid';
  }

  /**
   * Calculate matchup confidence level
   */
  calculateMatchupConfidence(factors) {
    const baseConfidence = 0.6;
    let adjustments = 0;
    
    if (factors.historicalContext.gamesAgainst >= 3) adjustments += 0.2;
    if (factors.momentumFactor.impact === 'significant') adjustments += 0.1;
    if (factors.handednessAdvantage.advantage !== 'none') adjustments += 0.1;
    
    return Math.min(1.0, baseConfidence + adjustments);
  }

  /**
   * Get default offensive metrics (fallback)
   */
  getDefaultOffensiveMetrics() {
    return {
      runsPerGame: 4.5,
      homeRunsPerGame: 1.1,
      sluggingPercentage: 0.410,
      onBasePercentage: 0.320,
      teamWRC: 98,
      trend: 'stable',
      hotStreak: false,
      classification: 'average',
      strengthFactors: [],
      weaknessFactors: []
    };
  }

  /**
   * Get default matchup context (fallback)
   */
  getDefaultMatchupContext() {
    return {
      handednessAdvantage: { advantage: 'none', handedness: 'RHP' },
      approachMatchup: { matchupRating: 'neutral' },
      momentumFactor: { combined: 0, impact: 'minimal' },
      recommendation: 'neutral',
      confidenceLevel: 0.5
    };
  }
}

export default new TeamPerformanceService();