/**
 * Real Team Trends Service
 * 
 * Provides actual team performance analysis using real game data including:
 * - Last 5 games performance (hits, HRs, strikeouts, runs)
 * - Hit/HR droughts and hot streaks
 * - Team batting trends
 * - Key player performance within teams
 * - Pitcher performance trends
 */

import { fetchPlayerData } from './dataService';

class RealTeamTrendsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Get comprehensive real team trends analysis
   */
  async getRealTeamTrends(teamAbbr, days = 7) {
    const cacheKey = `${teamAbbr}_${days}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const trends = await this.analyzeRealTeamTrends(teamAbbr, days);
      this.cache.set(cacheKey, {
        data: trends,
        timestamp: Date.now()
      });
      return trends;
    } catch (error) {
      console.error(`Error analyzing real team trends for ${teamAbbr}:`, error);
      return this.getDefaultTrends(teamAbbr);
    }
  }

  /**
   * Analyze real team trends over specified time period
   */
  async analyzeRealTeamTrends(teamAbbr, days) {
    const recentDates = this.getRecentDates(days);
    const teamGameData = await this.gatherRealTeamGameData(teamAbbr, recentDates);
    
    return {
      team: teamAbbr,
      timeframe: days,
      gamesAnalyzed: teamGameData.games.length,
      
      // Batting performance
      battingTrends: this.analyzeBattingTrends(teamGameData),
      
      // Power trends (HRs)
      powerTrends: this.analyzePowerTrends(teamGameData),
      
      // Pitching trends
      pitchingTrends: this.analyzePitchingTrends(teamGameData),
      
      // Key players
      keyPlayers: this.identifyKeyPlayers(teamGameData),
      
      // Momentum analysis
      momentum: this.analyzeMomentum(teamGameData),
      
      // Recommendation
      recommendation: this.generateRecommendation(teamGameData)
    };
  }

  /**
   * Gather real team game data from recent games
   */
  async gatherRealTeamGameData(teamAbbr, dates) {
    const teamGameData = {
      games: [],
      allPlayers: new Map(), // Track all players across games
      stats: {
        gameByGame: [],
        totals: {
          runs: 0,
          hits: 0,
          hrs: 0,
          abs: 0,
          strikeouts: 0
        }
      }
    };

    for (const date of dates) {
      try {
        const dayData = await fetchPlayerData(date);
        if (dayData) {
          const teamPlayers = dayData.filter(player => 
            (player.team === teamAbbr || player.Team === teamAbbr) && 
            player.name && player.name.trim() !== ''
          );
          
          if (teamPlayers.length > 0) {
            const gameStats = this.calculateGameStats(teamPlayers);
            teamGameData.games.push({
              date,
              players: teamPlayers,
              gameStats
            });

            // Track all players
            teamPlayers.forEach(player => {
              const playerName = player.name || player.Name;
              if (!teamGameData.allPlayers.has(playerName)) {
                teamGameData.allPlayers.set(playerName, {
                  name: playerName,
                  games: [],
                  totals: { hits: 0, hrs: 0, abs: 0, avg: 0, recentForm: [] }
                });
              }
              
              const playerData = teamGameData.allPlayers.get(playerName);
              playerData.games.push({
                date,
                hits: player.hits || player.H || 0,
                hrs: player.hr || player.HR || 0,
                abs: player.ab || player.AB || 0,
                avg: player.avg || player.AVG || 0
              });
            });

            // Add to totals
            teamGameData.stats.totals.runs += gameStats.estimatedRuns;
            teamGameData.stats.totals.hits += gameStats.totalHits;
            teamGameData.stats.totals.hrs += gameStats.totalHRs;
            teamGameData.stats.totals.abs += gameStats.totalABs;
            teamGameData.stats.totals.strikeouts += gameStats.estimatedStrikeouts;
            
            teamGameData.stats.gameByGame.push({
              date,
              runs: gameStats.estimatedRuns,
              hits: gameStats.totalHits,
              hrs: gameStats.totalHRs,
              abs: gameStats.totalABs,
              avg: gameStats.teamAvg
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to load data for ${date}:`, error);
      }
    }

    return teamGameData;
  }

  /**
   * Analyze batting trends
   */
  analyzeBattingTrends(teamGameData) {
    const games = teamGameData.stats.gameByGame;
    if (games.length === 0) return this.getDefaultBattingTrends();

    const recentGames = games.slice(-5); // Last 5 games
    const trends = {
      avgHitsPerGame: 0,
      avgRunsPerGame: 0,
      teamAverage: 0,
      hitStreak: this.calculateHitStreak(games),
      drought: this.calculateDrought(games),
      momentum: 'neutral',
      keyStats: []
    };

    // Calculate averages
    trends.avgHitsPerGame = recentGames.reduce((sum, g) => sum + g.hits, 0) / recentGames.length;
    trends.avgRunsPerGame = recentGames.reduce((sum, g) => sum + g.runs, 0) / recentGames.length;
    
    const totalHits = recentGames.reduce((sum, g) => sum + g.hits, 0);
    const totalABs = recentGames.reduce((sum, g) => sum + g.abs, 0);
    trends.teamAverage = totalABs > 0 ? totalHits / totalABs : 0;

    // Assess momentum
    if (recentGames.length >= 3) {
      const first2 = recentGames.slice(0, 2);
      const last3 = recentGames.slice(-3);
      
      const earlyAvg = first2.reduce((sum, g) => sum + g.avg, 0) / first2.length;
      const lateAvg = last3.reduce((sum, g) => sum + g.avg, 0) / last3.length;
      
      if (lateAvg > earlyAvg + 0.050) trends.momentum = 'heating_up';
      else if (lateAvg < earlyAvg - 0.050) trends.momentum = 'cooling_down';
      else if (trends.teamAverage >= 0.270) trends.momentum = 'hot';
      else if (trends.teamAverage <= 0.200) trends.momentum = 'cold';
    }

    // Key stats
    if (trends.avgRunsPerGame >= 6) trends.keyStats.push('High scoring offense');
    if (trends.avgRunsPerGame <= 2.5) trends.keyStats.push('Struggling to score');
    if (trends.teamAverage >= 0.280) trends.keyStats.push('Team hitting well');
    if (trends.teamAverage <= 0.200) trends.keyStats.push('Team struggling at plate');
    if (trends.hitStreak.length >= 3) trends.keyStats.push(`${trends.hitStreak.length}-game hit streak`);
    if (trends.drought.hits >= 2) trends.keyStats.push(`Hit drought (${trends.drought.hits} games)`);

    return trends;
  }

  /**
   * Analyze power trends (home runs)
   */
  analyzePowerTrends(teamGameData) {
    const games = teamGameData.stats.gameByGame;
    if (games.length === 0) return this.getDefaultPowerTrends();

    const recentGames = games.slice(-5);
    const trends = {
      avgHRsPerGame: 0,
      totalRecentHRs: 0,
      powerSurge: false,
      hrDrought: 0,
      powerStreak: this.calculatePowerStreak(games),
      keyStats: []
    };

    // Calculate HR metrics
    trends.totalRecentHRs = recentGames.reduce((sum, g) => sum + g.hrs, 0);
    trends.avgHRsPerGame = trends.totalRecentHRs / recentGames.length;
    trends.powerSurge = trends.totalRecentHRs >= 4; // 4+ HRs in 5 games
    trends.hrDrought = this.calculateHRDrought(games);

    // Key stats
    if (trends.powerSurge) trends.keyStats.push('Power surge (4+ recent HRs)');
    if (trends.avgHRsPerGame >= 1.5) trends.keyStats.push('Strong power output');
    if (trends.avgHRsPerGame <= 0.4) trends.keyStats.push('Low power production');
    if (trends.hrDrought >= 3) trends.keyStats.push(`HR drought (${trends.hrDrought} games)`);
    if (trends.powerStreak.length >= 3) trends.keyStats.push(`HR in ${trends.powerStreak.length} straight games`);

    return trends;
  }

  /**
   * Analyze pitching trends (when team is pitching)
   */
  analyzePitchingTrends(teamGameData) {
    // This would require opponent data - simplified for now
    return {
      recentERA: 0,
      strikeoutsPerGame: 0,
      keyStats: ['Pitching data requires opponent analysis']
    };
  }

  /**
   * Identify key players driving trends
   */
  identifyKeyPlayers(teamGameData) {
    const players = Array.from(teamGameData.allPlayers.values());
    const keyPlayers = {
      hotHitters: [],
      coldHitters: [],
      powerSources: [],
      strugglers: []
    };

    players.forEach(player => {
      if (player.games.length >= 3) {
        const recentGames = player.games.slice(-3);
        const totalHits = recentGames.reduce((sum, g) => sum + g.hits, 0);
        const totalABs = recentGames.reduce((sum, g) => sum + g.abs, 0);
        const totalHRs = recentGames.reduce((sum, g) => sum + g.hrs, 0);
        const recentAvg = totalABs > 0 ? totalHits / totalABs : 0;

        // Hot hitters
        if (recentAvg >= 0.350 || totalHits >= 4) {
          keyPlayers.hotHitters.push({
            name: player.name,
            recentAvg: recentAvg.toFixed(3),
            hits: totalHits,
            games: recentGames.length
          });
        }

        // Cold hitters
        if (recentAvg <= 0.150 && totalABs >= 6) {
          keyPlayers.coldHitters.push({
            name: player.name,
            recentAvg: recentAvg.toFixed(3),
            hits: totalHits,
            games: recentGames.length
          });
        }

        // Power sources
        if (totalHRs >= 2) {
          keyPlayers.powerSources.push({
            name: player.name,
            hrs: totalHRs,
            games: recentGames.length
          });
        }

        // Strugglers
        if (totalHits <= 1 && totalABs >= 6) {
          keyPlayers.strugglers.push({
            name: player.name,
            hits: totalHits,
            abs: totalABs,
            games: recentGames.length
          });
        }
      }
    });

    // Sort by performance
    keyPlayers.hotHitters.sort((a, b) => parseFloat(b.recentAvg) - parseFloat(a.recentAvg));
    keyPlayers.coldHitters.sort((a, b) => parseFloat(a.recentAvg) - parseFloat(b.recentAvg));
    keyPlayers.powerSources.sort((a, b) => b.hrs - a.hrs);
    keyPlayers.strugglers.sort((a, b) => a.hits - b.hits);

    return keyPlayers;
  }

  /**
   * Calculate hit streak
   */
  calculateHitStreak(games) {
    const streak = [];
    for (let i = games.length - 1; i >= 0; i--) {
      if (games[i].hits >= 8) { // Team got 8+ hits
        streak.unshift(games[i]);
      } else {
        break;
      }
    }
    return streak;
  }

  /**
   * Calculate drought
   */
  calculateDrought(games) {
    let hitDrought = 0;
    let runDrought = 0;

    for (let i = games.length - 1; i >= 0; i--) {
      if (games[i].hits <= 5) hitDrought++;
      else break;
    }

    for (let i = games.length - 1; i >= 0; i--) {
      if (games[i].runs <= 2) runDrought++;
      else break;
    }

    return { hits: hitDrought, runs: runDrought };
  }

  /**
   * Calculate power streak
   */
  calculatePowerStreak(games) {
    const streak = [];
    for (let i = games.length - 1; i >= 0; i--) {
      if (games[i].hrs >= 1) {
        streak.unshift(games[i]);
      } else {
        break;
      }
    }
    return streak;
  }

  /**
   * Calculate HR drought
   */
  calculateHRDrought(games) {
    let drought = 0;
    for (let i = games.length - 1; i >= 0; i--) {
      if (games[i].hrs === 0) drought++;
      else break;
    }
    return drought;
  }

  /**
   * Analyze momentum factors
   */
  analyzeMomentum(teamGameData) {
    const games = teamGameData.stats.gameByGame;
    if (games.length < 3) return { overall: 'insufficient_data', factors: [] };

    const momentum = {
      overall: 'neutral',
      factors: [],
      confidence: 0.5,
      direction: 'stable'
    };

    const recentGames = games.slice(-3);
    const earlierGames = games.slice(-6, -3);

    if (earlierGames.length > 0) {
      const recentAvgRuns = recentGames.reduce((sum, g) => sum + g.runs, 0) / recentGames.length;
      const earlierAvgRuns = earlierGames.reduce((sum, g) => sum + g.runs, 0) / earlierGames.length;
      
      const recentAvgHits = recentGames.reduce((sum, g) => sum + g.hits, 0) / recentGames.length;
      const earlierAvgHits = earlierGames.reduce((sum, g) => sum + g.hits, 0) / earlierGames.length;

      if (recentAvgRuns > earlierAvgRuns + 1.5) {
        momentum.factors.push('🔥 Offensive surge');
        momentum.confidence += 0.3;
        momentum.direction = 'improving';
      }

      if (recentAvgHits > earlierAvgHits + 2) {
        momentum.factors.push('📈 Hit production up');
        momentum.confidence += 0.2;
      }

      if (recentAvgRuns < earlierAvgRuns - 1.5) {
        momentum.factors.push('📉 Scoring decline');
        momentum.confidence -= 0.3;
        momentum.direction = 'declining';
      }

      if (recentAvgHits < earlierAvgHits - 2) {
        momentum.factors.push('⬇️ Hit production down');
        momentum.confidence -= 0.2;
      }
    }

    // Determine overall momentum
    if (momentum.confidence >= 0.7) momentum.overall = 'hot';
    else if (momentum.confidence <= 0.3) momentum.overall = 'cold';
    else if (momentum.direction === 'improving') momentum.overall = 'warming_up';
    else if (momentum.direction === 'declining') momentum.overall = 'cooling_down';

    return momentum;
  }

  /**
   * Generate overall recommendation
   */
  generateRecommendation(teamGameData) {
    const battingTrends = this.analyzeBattingTrends(teamGameData);
    const powerTrends = this.analyzePowerTrends(teamGameData);
    const momentum = this.analyzeMomentum(teamGameData);

    let action = 'neutral';
    let confidence = 0.5;
    let reasons = [];

    // Positive factors
    if (battingTrends.avgRunsPerGame >= 5.5) {
      action = 'target';
      confidence += 0.2;
      reasons.push(`Strong offense (${battingTrends.avgRunsPerGame.toFixed(1)} R/G)`);
    }

    if (powerTrends.powerSurge) {
      confidence += 0.15;
      reasons.push('Power surge in progress');
    }

    if (momentum.overall === 'hot' || momentum.overall === 'warming_up') {
      confidence += 0.2;
      reasons.push('Positive momentum');
    }

    // Negative factors
    if (battingTrends.avgRunsPerGame <= 2.5) {
      action = 'avoid';
      confidence = Math.max(0.1, confidence - 0.3);
      reasons.push(`Poor offense (${battingTrends.avgRunsPerGame.toFixed(1)} R/G)`);
    }

    if (battingTrends.drought.hits >= 3) {
      confidence = Math.max(0.1, confidence - 0.2);
      reasons.push('In hitting drought');
    }

    if (momentum.overall === 'cold' || momentum.overall === 'cooling_down') {
      confidence = Math.max(0.1, confidence - 0.2);
      reasons.push('Negative momentum');
    }

    // Final action determination
    if (confidence >= 0.7 && action !== 'avoid') action = 'target';
    else if (confidence <= 0.3) action = 'avoid';
    else if (confidence >= 0.55) action = 'consider';
    else if (confidence <= 0.45) action = 'caution';

    return {
      action,
      confidence: Math.max(0.1, Math.min(0.95, confidence)),
      reasons: reasons.join(', ') || 'Standard performance indicators',
      summary: this.generateSummary(battingTrends, powerTrends, momentum)
    };
  }

  /**
   * Generate summary
   */
  generateSummary(battingTrends, powerTrends, momentum) {
    const parts = [];
    
    if (battingTrends.avgRunsPerGame >= 5) parts.push('high scoring');
    else if (battingTrends.avgRunsPerGame <= 3) parts.push('low scoring');
    else parts.push('average scoring');

    if (powerTrends.powerSurge) parts.push('power surge');
    else if (powerTrends.hrDrought >= 3) parts.push('power drought');

    if (momentum.overall !== 'neutral') parts.push(momentum.overall.replace('_', ' '));

    return parts.join(', ') || 'neutral performance';
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
      estimatedRuns: 0,
      estimatedStrikeouts: 0
    };

    players.forEach(player => {
      const hits = player.hits || player.H || 0;
      const abs = player.ab || player.AB || 0;
      const hrs = player.hr || player.HR || 0;

      stats.totalHits += hits;
      stats.totalABs += abs;
      stats.totalHRs += hrs;
    });

    stats.teamAvg = stats.totalABs > 0 ? stats.totalHits / stats.totalABs : 0;
    
    // Rough estimations
    stats.estimatedRuns = (stats.totalHits / 2.7) + (stats.totalHRs * 1.4);
    stats.estimatedStrikeouts = Math.max(0, stats.totalABs - stats.totalHits) * 0.6;

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
   * Default trends when no data is available
   */
  getDefaultTrends(teamAbbr) {
    return {
      team: teamAbbr,
      timeframe: 7,
      gamesAnalyzed: 0,
      battingTrends: this.getDefaultBattingTrends(),
      powerTrends: this.getDefaultPowerTrends(),
      pitchingTrends: { recentERA: 0, strikeoutsPerGame: 0, keyStats: ['No data available'] },
      keyPlayers: { hotHitters: [], coldHitters: [], powerSources: [], strugglers: [] },
      momentum: { overall: 'unknown', factors: [], confidence: 0.5, direction: 'unknown' },
      recommendation: { action: 'neutral', confidence: 0.5, reasons: 'Insufficient data', summary: 'No recent data available' }
    };
  }

  getDefaultBattingTrends() {
    return {
      avgHitsPerGame: 0,
      avgRunsPerGame: 0,
      teamAverage: 0,
      hitStreak: [],
      drought: { hits: 0, runs: 0 },
      momentum: 'unknown',
      keyStats: []
    };
  }

  getDefaultPowerTrends() {
    return {
      avgHRsPerGame: 0,
      totalRecentHRs: 0,
      powerSurge: false,
      hrDrought: 0,
      powerStreak: [],
      keyStats: []
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new RealTeamTrendsService();