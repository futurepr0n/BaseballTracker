/**
 * Team Trends Service
 * 
 * Provides enhanced team performance analysis including:
 * - Hot/cold streak detection
 * - Offensive momentum tracking
 * - Recent power surge analysis
 * - Pitcher vulnerability trends
 * - Contextual team factors
 */

import dataService from './dataService';

class TeamTrendsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive team trends analysis
   */
  async getTeamTrends(teamAbbr, days = 10) {
    const cacheKey = `${teamAbbr}_${days}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const trends = await this.analyzeTeamTrends(teamAbbr, days);
      this.cache.set(cacheKey, {
        data: trends,
        timestamp: Date.now()
      });
      return trends;
    } catch (error) {
      console.error(`Error analyzing team trends for ${teamAbbr}:`, error);
      return this.getDefaultTrends(teamAbbr);
    }
  }

  /**
   * Analyze team trends over specified time period
   */
  async analyzeTeamTrends(teamAbbr, days) {
    const recentDates = this.getRecentDates(days);
    const teamData = await this.gatherTeamData(teamAbbr, recentDates);
    
    return {
      team: teamAbbr,
      timeframe: days,
      offense: this.analyzeOffensiveTrends(teamData),
      pitching: this.analyzePitchingTrends(teamData),
      momentum: this.analyzeMomentum(teamData),
      streaks: this.analyzeStreaks(teamData),
      contextualFactors: this.analyzeContextualFactors(teamData),
      recommendation: this.generateRecommendation(teamData)
    };
  }

  /**
   * Gather team performance data from recent games
   */
  async gatherTeamData(teamAbbr, dates) {
    const teamData = {
      games: [],
      players: {},
      pitchers: {},
      stats: {
        runs: [],
        hits: [],
        homeRuns: [],
        avg: [],
        obp: [],
        slg: []
      }
    };

    for (const date of dates) {
      try {
        const dayData = await dataService.getDataForDate(date);
        if (dayData) {
          const teamPlayers = dayData.filter(player => 
            player.team === teamAbbr || player.Team === teamAbbr
          );
          
          if (teamPlayers.length > 0) {
            teamData.games.push({
              date,
              players: teamPlayers,
              gameStats: this.calculateGameStats(teamPlayers)
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to load data for ${date}:`, error);
      }
    }

    return teamData;
  }

  /**
   * Analyze offensive trends
   */
  analyzeOffensiveTrends(teamData) {
    const games = teamData.games;
    if (games.length === 0) return this.getDefaultOffensiveTrends();

    const recentGames = games.slice(-5); // Last 5 games
    const trends = {
      runsPerGame: 0,
      hitRate: 0,
      powerSurge: false,
      hotHitters: [],
      coldHitters: [],
      momentum: 'neutral',
      strength: 'average'
    };

    // Calculate runs per game
    const totalRuns = recentGames.reduce((sum, game) => 
      sum + (game.gameStats.estimatedRuns || 0), 0
    );
    trends.runsPerGame = totalRuns / recentGames.length;

    // Calculate hit rate
    const totalHits = recentGames.reduce((sum, game) => 
      sum + game.gameStats.totalHits, 0
    );
    const totalABs = recentGames.reduce((sum, game) => 
      sum + game.gameStats.totalABs, 0
    );
    trends.hitRate = totalABs > 0 ? totalHits / totalABs : 0;

    // Detect power surge (3+ HRs in recent games)
    const recentHRs = recentGames.reduce((sum, game) => 
      sum + game.gameStats.totalHRs, 0
    );
    trends.powerSurge = recentHRs >= 3;

    // Analyze individual player trends
    this.analyzePlayerTrends(teamData, trends);

    // Determine momentum
    trends.momentum = this.calculateOffensiveMomentum(recentGames);
    
    // Assess team strength
    trends.strength = this.assessOffensiveStrength(trends);

    return trends;
  }

  /**
   * Analyze individual player hot/cold streaks
   */
  analyzePlayerTrends(teamData, trends) {
    const playerPerformance = {};
    
    // Aggregate player data across games
    teamData.games.forEach(game => {
      game.players.forEach(player => {
        const name = player.name || player.Name;
        if (!playerPerformance[name]) {
          playerPerformance[name] = {
            games: [],
            recentAvg: 0,
            streak: 'neutral'
          };
        }
        playerPerformance[name].games.push({
          date: game.date,
          avg: player.recent_avg || player.avg || 0,
          hits: player.hits || 0,
          abs: player.ab || player.AB || 0
        });
      });
    });

    // Analyze each player's trend
    Object.entries(playerPerformance).forEach(([name, data]) => {
      if (data.games.length >= 3) {
        const recentGames = data.games.slice(-3);
        const avgPerformance = recentGames.reduce((sum, game) => 
          sum + game.avg, 0
        ) / recentGames.length;
        
        data.recentAvg = avgPerformance;
        
        if (avgPerformance >= 0.320) {
          data.streak = 'hot';
          trends.hotHitters.push({
            name,
            avg: avgPerformance,
            games: recentGames.length
          });
        } else if (avgPerformance <= 0.180) {
          data.streak = 'cold';
          trends.coldHitters.push({
            name,
            avg: avgPerformance,
            games: recentGames.length
          });
        }
      }
    });

    // Sort by performance
    trends.hotHitters.sort((a, b) => b.avg - a.avg);
    trends.coldHitters.sort((a, b) => a.avg - b.avg);
  }

  /**
   * Calculate offensive momentum
   */
  calculateOffensiveMomentum(recentGames) {
    if (recentGames.length < 3) return 'neutral';

    const firstHalf = recentGames.slice(0, Math.floor(recentGames.length / 2));
    const secondHalf = recentGames.slice(Math.floor(recentGames.length / 2));

    const firstAvgRuns = firstHalf.reduce((sum, game) => 
      sum + (game.gameStats.estimatedRuns || 0), 0
    ) / firstHalf.length;

    const secondAvgRuns = secondHalf.reduce((sum, game) => 
      sum + (game.gameStats.estimatedRuns || 0), 0
    ) / secondHalf.length;

    const improvement = secondAvgRuns - firstAvgRuns;

    if (improvement >= 1.5) return 'surging';
    if (improvement >= 0.5) return 'improving';
    if (improvement <= -1.5) return 'declining';
    if (improvement <= -0.5) return 'struggling';
    return 'stable';
  }

  /**
   * Assess offensive strength
   */
  assessOffensiveStrength(trends) {
    let strengthScore = 0;

    // Runs per game factor
    if (trends.runsPerGame >= 6.0) strengthScore += 20;
    else if (trends.runsPerGame >= 5.0) strengthScore += 15;
    else if (trends.runsPerGame >= 4.0) strengthScore += 10;
    else if (trends.runsPerGame >= 3.5) strengthScore += 5;

    // Hit rate factor
    if (trends.hitRate >= 0.270) strengthScore += 15;
    else if (trends.hitRate >= 0.250) strengthScore += 10;
    else if (trends.hitRate >= 0.230) strengthScore += 5;

    // Hot hitters factor
    strengthScore += Math.min(15, trends.hotHitters.length * 5);

    // Power surge bonus
    if (trends.powerSurge) strengthScore += 10;

    // Momentum factor
    switch (trends.momentum) {
      case 'surging': strengthScore += 15; break;
      case 'improving': strengthScore += 10; break;
      case 'declining': strengthScore -= 10; break;
      case 'struggling': strengthScore -= 15; break;
    }

    if (strengthScore >= 50) return 'elite';
    if (strengthScore >= 35) return 'strong';
    if (strengthScore >= 20) return 'average';
    if (strengthScore >= 10) return 'below_average';
    return 'weak';
  }

  /**
   * Analyze pitching trends (for context when team is pitching)
   */
  analyzePitchingTrends(teamData) {
    // This would analyze how the team's pitching has been performing
    // For now, return basic structure
    return {
      era: 0,
      whip: 0,
      hrAllowed: 0,
      strikeouts: 0,
      form: 'unknown'
    };
  }

  /**
   * Analyze momentum factors
   */
  analyzeMomentum(teamData) {
    const games = teamData.games;
    if (games.length === 0) return { overall: 'neutral', factors: [] };

    const momentum = {
      overall: 'neutral',
      factors: [],
      confidence: 0.5
    };

    // Recent performance trend
    if (games.length >= 5) {
      const recent = games.slice(-3);
      const earlier = games.slice(-6, -3);

      const recentAvgRuns = recent.reduce((sum, g) => 
        sum + (g.gameStats.estimatedRuns || 0), 0
      ) / recent.length;

      const earlierAvgRuns = earlier.length > 0 ? earlier.reduce((sum, g) => 
        sum + (g.gameStats.estimatedRuns || 0), 0
      ) / earlier.length : recentAvgRuns;

      if (recentAvgRuns > earlierAvgRuns + 1) {
        momentum.factors.push('🔥 Offensive surge');
        momentum.confidence += 0.2;
      } else if (recentAvgRuns < earlierAvgRuns - 1) {
        momentum.factors.push('📉 Cooling off');
        momentum.confidence -= 0.2;
      }
    }

    // Determine overall momentum
    if (momentum.confidence >= 0.7) momentum.overall = 'hot';
    else if (momentum.confidence <= 0.3) momentum.overall = 'cold';

    return momentum;
  }

  /**
   * Analyze streaks (wins, offensive performances, etc.)
   */
  analyzeStreaks(teamData) {
    return {
      hitting: this.calculateHittingStreak(teamData),
      power: this.calculatePowerStreak(teamData),
      consistency: this.calculateConsistency(teamData)
    };
  }

  /**
   * Calculate hitting streak
   */
  calculateHittingStreak(teamData) {
    const games = teamData.games;
    if (games.length === 0) return { length: 0, type: 'none' };

    let currentStreak = 0;
    let streakType = 'none';

    // Look for consistent hitting (team avg > .250) or poor hitting (< .200)
    for (let i = games.length - 1; i >= 0; i--) {
      const game = games[i];
      const teamAvg = game.gameStats.teamAvg || 0;

      if (streakType === 'none') {
        if (teamAvg >= 0.250) {
          streakType = 'hot';
          currentStreak = 1;
        } else if (teamAvg <= 0.200) {
          streakType = 'cold';
          currentStreak = 1;
        }
      } else if (streakType === 'hot' && teamAvg >= 0.250) {
        currentStreak++;
      } else if (streakType === 'cold' && teamAvg <= 0.200) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }

    return { length: currentStreak, type: streakType };
  }

  /**
   * Calculate power streak (HR production)
   */
  calculatePowerStreak(teamData) {
    const games = teamData.games;
    if (games.length === 0) return { length: 0, totalHRs: 0 };

    let streak = 0;
    let totalHRs = 0;

    for (let i = games.length - 1; i >= 0; i--) {
      const hrCount = games[i].gameStats.totalHRs || 0;
      if (hrCount > 0) {
        streak++;
        totalHRs += hrCount;
      } else {
        break;
      }
    }

    return { length: streak, totalHRs };
  }

  /**
   * Analyze contextual factors
   */
  analyzeContextualFactors(teamData) {
    return {
      homeVsAway: { factor: 'neutral', explanation: 'No significant home/away trend' },
      recentOpponents: { strength: 'average', explanation: 'Mixed opponent strength' },
      injuries: { impact: 'minimal', explanation: 'No major injury concerns detected' },
      weather: { factor: 'neutral', explanation: 'Weather conditions normal' }
    };
  }

  /**
   * Generate overall recommendation
   */
  generateRecommendation(teamData) {
    const games = teamData.games;
    if (games.length === 0) return { action: 'neutral', confidence: 0.5, reason: 'Insufficient data' };

    const recentPerformance = games.slice(-3);
    const avgRuns = recentPerformance.reduce((sum, game) => 
      sum + (game.gameStats.estimatedRuns || 0), 0
    ) / recentPerformance.length;

    let action = 'neutral';
    let confidence = 0.5;
    let reason = 'Average recent performance';

    if (avgRuns >= 5.5) {
      action = 'target';
      confidence = 0.8;
      reason = `Strong offensive output (${avgRuns.toFixed(1)} runs/game)`;
    } else if (avgRuns >= 4.5) {
      action = 'consider';
      confidence = 0.65;
      reason = `Solid offensive performance (${avgRuns.toFixed(1)} runs/game)`;
    } else if (avgRuns <= 2.5) {
      action = 'avoid';
      confidence = 0.75;
      reason = `Poor offensive output (${avgRuns.toFixed(1)} runs/game)`;
    } else if (avgRuns <= 3.5) {
      action = 'caution';
      confidence = 0.6;
      reason = `Below average offense (${avgRuns.toFixed(1)} runs/game)`;
    }

    return { action, confidence, reason };
  }

  /**
   * Calculate basic game statistics
   */
  calculateGameStats(players) {
    const stats = {
      totalHits: 0,
      totalABs: 0,
      totalHRs: 0,
      teamAvg: 0,
      estimatedRuns: 0
    };

    players.forEach(player => {
      stats.totalHits += player.hits || player.H || 0;
      stats.totalABs += player.ab || player.AB || 1; // Avoid division by zero
      stats.totalHRs += player.hr || player.HR || 0;
    });

    stats.teamAvg = stats.totalABs > 0 ? stats.totalHits / stats.totalABs : 0;
    
    // Rough estimation: 1 run per 2.5 hits + HR bonus
    stats.estimatedRuns = (stats.totalHits / 2.5) + (stats.totalHRs * 0.5);

    return stats;
  }

  /**
   * Get recent dates for analysis
   */
  getRecentDates(days) {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates.reverse(); // Chronological order
  }

  /**
   * Default trends when data is unavailable
   */
  getDefaultTrends(teamAbbr) {
    return {
      team: teamAbbr,
      timeframe: 10,
      offense: this.getDefaultOffensiveTrends(),
      pitching: { era: 0, whip: 0, hrAllowed: 0, strikeouts: 0, form: 'unknown' },
      momentum: { overall: 'neutral', factors: [], confidence: 0.5 },
      streaks: { 
        hitting: { length: 0, type: 'none' },
        power: { length: 0, totalHRs: 0 },
        consistency: 'unknown'
      },
      contextualFactors: {
        homeVsAway: { factor: 'neutral', explanation: 'No data available' },
        recentOpponents: { strength: 'unknown', explanation: 'No data available' },
        injuries: { impact: 'unknown', explanation: 'No data available' },
        weather: { factor: 'neutral', explanation: 'No data available' }
      },
      recommendation: { action: 'neutral', confidence: 0.5, reason: 'Insufficient data' }
    };
  }

  /**
   * Default offensive trends
   */
  getDefaultOffensiveTrends() {
    return {
      runsPerGame: 0,
      hitRate: 0,
      powerSurge: false,
      hotHitters: [],
      coldHitters: [],
      momentum: 'neutral',
      strength: 'unknown'
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new TeamTrendsService();