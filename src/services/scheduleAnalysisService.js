/**
 * Schedule Analysis Service
 * Analyzes consecutive games, rest patterns, and schedule-related performance impacts
 */

import { fetchPlayerDataForDateRange, fetchGameData, convertDataMapToArray } from './dataService.js';

class ScheduleAnalysisService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Analyze player's schedule impact patterns
   */
  async analyzePlayerScheduleImpact(playerName, teamCode, currentDate, lookbackDays = 180) {
    const cacheKey = `schedule_analysis_${playerName}_${teamCode}_${currentDate.toISOString().split('T')[0]}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get historical player data
      const historicalDataMap = await fetchPlayerDataForDateRange(currentDate, lookbackDays, lookbackDays);
      
      // CRITICAL FIX: fetchPlayerDataForDateRange now returns a Map, not an array
      const historicalData = convertDataMapToArray(historicalDataMap);
      
      // Filter for this player's games
      const playerGames = historicalData.filter(data => 
        (data.name === playerName || data.fullName === playerName) && 
        (data.team === teamCode || data.Team === teamCode)
      );

      if (playerGames.length === 0) {
        return this.getDefaultScheduleAnalysis(playerName, teamCode);
      }

      // Sort games by date
      const sortedGames = playerGames.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const scheduleAnalysis = this.performScheduleAnalysis(sortedGames, currentDate);
      
      this.cache.set(cacheKey, {
        data: scheduleAnalysis,
        timestamp: Date.now()
      });

      return scheduleAnalysis;
    } catch (error) {
      console.error('Error analyzing schedule impact:', error);
      return this.getDefaultScheduleAnalysis(playerName, teamCode);
    }
  }

  /**
   * Perform comprehensive schedule analysis
   */
  performScheduleAnalysis(games, currentDate) {
    return {
      currentScheduleStatus: this.analyzeCurrentScheduleStatus(games, currentDate),
      consecutiveGamePatterns: this.analyzeConsecutiveGamePatterns(games),
      restDayPerformance: this.analyzeRestDayPerformance(games),
      scheduleStrengthAnalysis: this.analyzeScheduleStrength(games),
      fatigueIndicators: this.analyzeFatigueIndicators(games),
      performanceByScheduleDensity: this.analyzePerformanceByScheduleDensity(games),
      scheduleRecommendation: null // Will be calculated
    };
  }

  /**
   * Analyze current schedule status leading up to game
   */
  analyzeCurrentScheduleStatus(games, currentDate) {
    const recentGames = this.getRecentGames(games, currentDate, 14); // Last 2 weeks
    
    if (recentGames.length === 0) {
      return this.getDefaultCurrentStatus();
    }

    const currentStreak = this.calculateCurrentConsecutiveStreak(recentGames, currentDate);
    const lastGameDate = this.getLastGameDate(recentGames);
    const daysSinceLastGame = this.calculateDaysBetween(lastGameDate, currentDate);
    const upcomingDensity = this.calculateUpcomingDensity(recentGames, currentDate);

    return {
      consecutiveGamesPlayed: currentStreak.consecutive,
      daysOfRest: daysSinceLastGame,
      lastGameDate,
      recentGameDensity: this.calculateRecentDensity(recentGames),
      upcomingDensity,
      schedulePhase: this.determineSchedulePhase(currentStreak.consecutive, daysSinceLastGame),
      fatigueRisk: this.calculateFatigueRisk(currentStreak.consecutive, daysSinceLastGame, upcomingDensity),
      restAdvantage: this.calculateRestAdvantage(daysSinceLastGame)
    };
  }

  /**
   * Analyze consecutive game performance patterns
   */
  analyzeConsecutiveGamePatterns(games) {
    const patterns = {
      streakPerformance: {},
      optimalConsecutive: 0,
      fatigueThreshold: 0,
      recoveryPattern: {}
    };

    // Group games by consecutive game count
    const consecutiveGroups = this.groupGamesByConsecutiveCount(games);
    
    for (const [consecutiveCount, gamesInStreak] of Object.entries(consecutiveGroups)) {
      if (gamesInStreak.length < 3) continue; // Need minimum sample
      
      const stats = this.calculateGameStats(gamesInStreak);
      patterns.streakPerformance[consecutiveCount] = {
        ...stats,
        sampleSize: gamesInStreak.length,
        performance: this.classifyPerformance(stats.battingAverage, stats.homeRuns)
      };
    }

    // Find optimal consecutive game count
    patterns.optimalConsecutive = this.findOptimalConsecutiveCount(patterns.streakPerformance);
    
    // Determine fatigue threshold
    patterns.fatigueThreshold = this.findFatigueThreshold(patterns.streakPerformance);
    
    // Analyze recovery patterns after extended streaks
    patterns.recoveryPattern = this.analyzeRecoveryPatterns(games);
    
    return patterns;
  }

  /**
   * Analyze rest day performance impact
   */
  analyzeRestDayPerformance(games) {
    const restGroups = this.groupGamesByRestDays(games);
    const restAnalysis = {};
    
    for (const [restDays, gamesAfterRest] of Object.entries(restGroups)) {
      if (gamesAfterRest.length < 2) continue;
      
      const stats = this.calculateGameStats(gamesAfterRest);
      restAnalysis[restDays] = {
        ...stats,
        sampleSize: gamesAfterRest.length,
        performance: this.classifyPerformance(stats.battingAverage, stats.homeRuns),
        impact: this.calculateRestImpact(stats.battingAverage, restDays)
      };
    }

    return {
      restDayGroups: restAnalysis,
      optimalRestDays: this.findOptimalRestDays(restAnalysis),
      restTolerance: this.calculateRestTolerance(restAnalysis),
      restAdvantageThreshold: this.findRestAdvantageThreshold(restAnalysis)
    };
  }

  /**
   * Analyze schedule strength and difficulty
   */
  analyzeScheduleStrength(games) {
    // This would ideally integrate with opponent strength data
    // For now, we'll analyze game frequency and patterns
    
    const gamesByWeek = this.groupGamesByWeek(games);
    const weeklyAnalysis = {};
    
    for (const [week, weekGames] of Object.entries(gamesByWeek)) {
      if (weekGames.length === 0) continue;
      
      const stats = this.calculateGameStats(weekGames);
      weeklyAnalysis[week] = {
        gamesPlayed: weekGames.length,
        ...stats,
        scheduleDensity: weekGames.length, // Games per week
        performance: this.classifyPerformance(stats.battingAverage, stats.homeRuns)
      };
    }

    return {
      weeklyPerformance: weeklyAnalysis,
      averageGamesPerWeek: this.calculateAverageGamesPerWeek(weeklyAnalysis),
      performanceByDensity: this.analyzePerformanceByWeeklyDensity(weeklyAnalysis),
      scheduleStress: this.calculateScheduleStress(weeklyAnalysis)
    };
  }

  /**
   * Analyze fatigue indicators
   */
  analyzeFatigueIndicators(games) {
    const indicators = {
      performanceDecline: this.analyzeLateGameDecline(games),
      streakFatigue: this.analyzeStreakFatigue(games),
      cumulativeFatigue: this.analyzeCumulativeFatigue(games),
      recoveryTime: this.analyzeRecoveryTime(games)
    };

    return {
      ...indicators,
      overallFatigueScore: this.calculateOverallFatigueScore(indicators),
      fatigueWarnings: this.generateFatigueWarnings(indicators),
      fatigueType: this.classifyFatigueType(indicators)
    };
  }

  /**
   * Group games by consecutive count
   */
  groupGamesByConsecutiveCount(games) {
    const groups = {};
    let currentStreak = 1;
    let lastDate = null;

    for (const game of games) {
      const gameDate = new Date(game.date);
      
      if (lastDate) {
        const daysBetween = this.calculateDaysBetween(lastDate, gameDate);
        if (daysBetween === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }

      if (!groups[currentStreak]) {
        groups[currentStreak] = [];
      }
      groups[currentStreak].push(game);
      
      lastDate = gameDate;
    }

    return groups;
  }

  /**
   * Group games by rest days before each game
   */
  groupGamesByRestDays(games) {
    const groups = {};
    
    for (let i = 1; i < games.length; i++) {
      const currentGame = games[i];
      const previousGame = games[i - 1];
      
      const restDays = this.calculateDaysBetween(new Date(previousGame.date), new Date(currentGame.date)) - 1;
      const restKey = Math.min(restDays, 5); // Cap at 5+ days
      
      if (!groups[restKey]) {
        groups[restKey] = [];
      }
      groups[restKey].push(currentGame);
    }

    return groups;
  }

  /**
   * Calculate current consecutive game streak
   */
  calculateCurrentConsecutiveStreak(games, currentDate) {
    let consecutive = 0;
    let lastGameDate = null;
    
    // Work backwards from current date
    const sortedGames = games.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    for (const game of sortedGames) {
      const gameDate = new Date(game.date);
      
      if (lastGameDate === null) {
        consecutive = 1;
        lastGameDate = gameDate;
      } else {
        const daysBetween = this.calculateDaysBetween(gameDate, lastGameDate);
        if (daysBetween === 1) {
          consecutive++;
          lastGameDate = gameDate;
        } else {
          break;
        }
      }
    }

    return { consecutive, lastGameDate };
  }

  /**
   * Calculate days between two dates
   */
  calculateDaysBetween(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate game statistics
   */
  calculateGameStats(games) {
    if (games.length === 0) {
      return {
        battingAverage: 0,
        homeRuns: 0,
        hits: 0,
        atBats: 0,
        rbi: 0,
        sluggingPercentage: 0
      };
    }

    const totals = games.reduce((acc, game) => {
      acc.hits += game.H || 0;
      acc.atBats += game.AB || 0;
      acc.homeRuns += game.HR || 0;
      acc.rbi += game.RBI || 0;
      acc.doubles += game['2B'] || 0;
      acc.triples += game['3B'] || 0;
      return acc;
    }, { hits: 0, atBats: 0, homeRuns: 0, rbi: 0, doubles: 0, triples: 0 });

    const battingAverage = totals.atBats > 0 ? totals.hits / totals.atBats : 0;
    const totalBases = totals.hits + totals.doubles + (totals.triples * 2) + (totals.homeRuns * 3);
    const sluggingPercentage = totals.atBats > 0 ? totalBases / totals.atBats : 0;

    return {
      battingAverage: parseFloat(battingAverage.toFixed(3)),
      homeRuns: totals.homeRuns,
      hits: totals.hits,
      atBats: totals.atBats,
      rbi: totals.rbi,
      sluggingPercentage: parseFloat(sluggingPercentage.toFixed(3))
    };
  }

  /**
   * Classify performance level
   */
  classifyPerformance(battingAvg, homeRuns) {
    if (battingAvg >= 0.320 && homeRuns >= 2) return 'excellent';
    if (battingAvg >= 0.280 && homeRuns >= 1) return 'good';
    if (battingAvg >= 0.220) return 'average';
    if (battingAvg < 0.180) return 'poor';
    return 'below_average';
  }

  /**
   * Find optimal consecutive game count
   */
  findOptimalConsecutiveCount(streakPerformance) {
    let bestCount = 1;
    let bestAvg = 0;
    
    for (const [count, stats] of Object.entries(streakPerformance)) {
      if (stats.sampleSize >= 5 && stats.battingAverage > bestAvg) {
        bestCount = parseInt(count);
        bestAvg = stats.battingAverage;
      }
    }
    
    return bestCount;
  }

  /**
   * Find fatigue threshold
   */
  findFatigueThreshold(streakPerformance) {
    const counts = Object.keys(streakPerformance).map(Number).sort((a, b) => a - b);
    
    for (let i = 1; i < counts.length; i++) {
      const current = streakPerformance[counts[i]];
      const previous = streakPerformance[counts[i - 1]];
      
      if (current.battingAverage < previous.battingAverage - 0.050) {
        return counts[i];
      }
    }
    
    return 7; // Default threshold
  }

  /**
   * Analyze recovery patterns
   */
  analyzeRecoveryPatterns(games) {
    // Find games after extended streaks (5+ consecutive)
    const recoveryGames = [];
    let consecutiveCount = 1;
    let lastDate = null;
    
    for (const game of games) {
      const gameDate = new Date(game.date);
      
      if (lastDate) {
        const daysBetween = this.calculateDaysBetween(lastDate, gameDate);
        if (daysBetween === 1) {
          consecutiveCount++;
        } else if (consecutiveCount >= 5) {
          // This is the first game after an extended streak
          recoveryGames.push({
            ...game,
            streakLength: consecutiveCount,
            restDays: daysBetween - 1
          });
          consecutiveCount = 1;
        } else {
          consecutiveCount = 1;
        }
      }
      
      lastDate = gameDate;
    }

    if (recoveryGames.length === 0) {
      return { recoveryRate: 0, averageRecoveryTime: 0, recoveryPattern: 'insufficient_data' };
    }

    const goodRecoveries = recoveryGames.filter(game => 
      (game.H || 0) >= 2 || (game.HR || 0) >= 1 || (game.AB > 0 && (game.H || 0) / game.AB >= 0.300)
    );

    return {
      recoveryRate: goodRecoveries.length / recoveryGames.length,
      averageRecoveryTime: recoveryGames.reduce((sum, game) => sum + game.restDays, 0) / recoveryGames.length,
      recoveryPattern: goodRecoveries.length / recoveryGames.length >= 0.6 ? 'quick_recovery' : 'slow_recovery',
      sampleSize: recoveryGames.length
    };
  }

  /**
   * Calculate fatigue risk
   */
  calculateFatigueRisk(consecutiveGames, daysOfRest, upcomingDensity) {
    let risk = 0;
    
    // Consecutive game penalty
    if (consecutiveGames >= 7) risk += 25;
    else if (consecutiveGames >= 5) risk += 15;
    else if (consecutiveGames >= 3) risk += 5;
    
    // Rest day bonus
    if (daysOfRest >= 2) risk -= 10;
    else if (daysOfRest === 1) risk -= 3;
    else if (daysOfRest === 0) risk += 8;
    
    // Upcoming density penalty
    if (upcomingDensity >= 6) risk += 10;
    else if (upcomingDensity >= 5) risk += 5;
    
    return Math.max(0, Math.min(50, risk));
  }

  /**
   * Calculate rest advantage
   */
  calculateRestAdvantage(daysOfRest) {
    if (daysOfRest >= 3) return 12; // Well rested
    if (daysOfRest === 2) return 8;  // Good rest
    if (daysOfRest === 1) return 3;  // Standard rest
    return 0; // No rest advantage
  }

  /**
   * Get recent games within specified days
   */
  getRecentGames(games, currentDate, days) {
    const cutoffDate = new Date(currentDate);
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return games.filter(game => new Date(game.date) >= cutoffDate);
  }

  /**
   * Get last game date from recent games
   */
  getLastGameDate(recentGames) {
    if (recentGames.length === 0) return null;
    
    const dates = recentGames.map(game => new Date(game.date));
    return new Date(Math.max(...dates));
  }

  /**
   * Calculate recent game density
   */
  calculateRecentDensity(recentGames) {
    if (recentGames.length <= 1) return 0;
    
    const dates = recentGames.map(game => new Date(game.date)).sort((a, b) => a - b);
    const daySpan = this.calculateDaysBetween(dates[0], dates[dates.length - 1]) + 1;
    
    return recentGames.length / Math.max(1, daySpan) * 7; // Games per week
  }

  /**
   * Calculate upcoming density (estimated)
   */
  calculateUpcomingDensity(recentGames, currentDate) {
    // This is a simplified estimation
    // In a real implementation, you'd look at actual upcoming schedule
    const recentDensity = this.calculateRecentDensity(recentGames);
    return Math.min(7, Math.max(3, recentDensity)); // Estimate based on recent pattern
  }

  /**
   * Determine schedule phase
   */
  determineSchedulePhase(consecutiveGames, daysOfRest) {
    if (daysOfRest >= 2) return 'fresh_start';
    if (consecutiveGames >= 6) return 'extended_streak';
    if (consecutiveGames >= 3) return 'active_streak';
    if (daysOfRest === 1) return 'normal_rhythm';
    return 'back_to_back';
  }

  /**
   * Get default schedule analysis
   */
  getDefaultScheduleAnalysis(playerName, teamCode) {
    return {
      playerName,
      teamCode,
      currentScheduleStatus: this.getDefaultCurrentStatus(),
      consecutiveGamePatterns: {
        streakPerformance: {},
        optimalConsecutive: 3,
        fatigueThreshold: 6,
        recoveryPattern: { recoveryRate: 0.5, recoveryPattern: 'unknown' }
      },
      restDayPerformance: {
        restDayGroups: {},
        optimalRestDays: 1,
        restTolerance: 'average',
        restAdvantageThreshold: 2
      },
      scheduleStrengthAnalysis: {
        averageGamesPerWeek: 5,
        scheduleStress: 'moderate'
      },
      fatigueIndicators: {
        overallFatigueScore: 0,
        fatigueWarnings: [],
        fatigueType: 'none'
      },
      scheduleRecommendation: 'Insufficient schedule data for analysis'
    };
  }

  /**
   * Get default current status
   */
  getDefaultCurrentStatus() {
    return {
      consecutiveGamesPlayed: 1,
      daysOfRest: 1,
      lastGameDate: null,
      recentGameDensity: 4,
      upcomingDensity: 4,
      schedulePhase: 'normal_rhythm',
      fatigueRisk: 5,
      restAdvantage: 3
    };
  }
}

// Create and export singleton instance
const scheduleAnalysisService = new ScheduleAnalysisService();
export default scheduleAnalysisService;