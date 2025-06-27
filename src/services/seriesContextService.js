/**
 * Series Context Analysis Service
 * Analyzes player performance patterns across different positions within a series
 * (Game 1 vs Game 2 vs Game 3+ performance)
 */

import { fetchPlayerDataForDateRange } from './dataService';
import { getSeasonSafeDateRange, formatDateRangeDescription } from '../utils/seasonDateUtils';

class SeriesContextService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 20 * 60 * 1000; // 20 minutes
  }

  /**
   * Analyze player's series position performance patterns
   */
  async analyzePlayerSeriesContext(playerName, team, currentDate) {
    const cacheKey = `series_context_${playerName}_${team}_${currentDate.toISOString().split('T')[0]}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      console.log(`🎯 Analyzing series context for ${playerName}...`);
      
      // Get games for pattern analysis (limited to current season)
      const dateRange = getSeasonSafeDateRange(currentDate, 60); // 60 days back or season start
      console.log(`📊 Series context analysis: ${formatDateRangeDescription(dateRange)}`);
      
      const playerGames = await this.getPlayerSeriesGames(playerName, team, dateRange.startDate, dateRange.endDate);
      
      if (playerGames.length < 10) {
        return this.getDefaultSeriesContext();
      }

      const seriesAnalysis = this.categorizeGamesBySeries(playerGames);
      const performanceByPosition = this.analyzePerformanceBySeriesPosition(seriesAnalysis);
      const seriesPatterns = this.identifySeriesPatterns(performanceByPosition);
      const currentSeriesPosition = await this.getCurrentSeriesPosition(playerName, team, currentDate);

      const result = {
        performanceByPosition,
        seriesPatterns,
        currentSeriesPosition,
        totalSeriesAnalyzed: seriesAnalysis.totalSeries,
        gamesAnalyzed: playerGames.length,
        insights: this.generateSeriesInsights(performanceByPosition, seriesPatterns, currentSeriesPosition),
        confidence: this.calculateConfidence(playerGames.length, seriesAnalysis.totalSeries)
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error analyzing series context:', error);
      return this.getDefaultSeriesContext();
    }
  }

  /**
   * Get player games and organize by series
   */
  async getPlayerSeriesGames(playerName, team, startDate, endDate) {
    try {
      const allGames = await fetchPlayerDataForDateRange(startDate, endDate);
      
      // Filter for this player
      const playerGames = allGames.filter(game => 
        game.name?.toLowerCase().includes(playerName.toLowerCase()) && 
        game.team === team
      ).sort((a, b) => new Date(a.date) - new Date(b.date));

      return playerGames;
    } catch (error) {
      console.error('Error fetching player series games:', error);
      return [];
    }
  }

  /**
   * Categorize games by series and position within series
   */
  categorizeGamesBySeries(playerGames) {
    const series = [];
    let currentSeries = null;
    let gamesSinceLastOpponent = 0;

    playerGames.forEach((game, index) => {
      const opponent = this.extractOpponent(game);
      const isHome = this.isHomeGame(game);
      
      // Determine if this starts a new series
      if (index === 0 || 
          this.extractOpponent(playerGames[index - 1]) !== opponent ||
          gamesSinceLastOpponent > 5) { // New series if gap > 5 days
        
        if (currentSeries && currentSeries.games.length > 0) {
          series.push(currentSeries);
        }
        
        currentSeries = {
          opponent,
          isHome,
          startDate: game.date,
          games: [],
          venue: game.venue || 'Unknown'
        };
      }

      if (currentSeries) {
        currentSeries.games.push({
          ...game,
          seriesGame: currentSeries.games.length + 1
        });
        currentSeries.endDate = game.date;
      }

      gamesSinceLastOpponent = index > 0 ? 
        Math.ceil((new Date(game.date) - new Date(playerGames[index - 1].date)) / (1000 * 60 * 60 * 24)) : 0;
    });

    // Add the last series
    if (currentSeries && currentSeries.games.length > 0) {
      series.push(currentSeries);
    }

    return {
      series,
      totalSeries: series.length,
      totalGames: playerGames.length
    };
  }

  /**
   * Analyze performance by series position
   */
  analyzePerformanceBySeriesPosition(seriesAnalysis) {
    const positions = {
      game1: { games: [], stats: {} },
      game2: { games: [], stats: {} },
      game3Plus: { games: [], stats: {} }
    };

    seriesAnalysis.series.forEach(series => {
      series.games.forEach(game => {
        if (game.seriesGame === 1) {
          positions.game1.games.push(game);
        } else if (game.seriesGame === 2) {
          positions.game2.games.push(game);
        } else if (game.seriesGame >= 3) {
          positions.game3Plus.games.push(game);
        }
      });
    });

    // Calculate stats for each position
    Object.keys(positions).forEach(position => {
      positions[position].stats = this.calculatePositionStats(positions[position].games);
    });

    return positions;
  }

  /**
   * Calculate statistics for games in a specific series position
   */
  calculatePositionStats(games) {
    if (games.length === 0) {
      return {
        gamesPlayed: 0,
        average: 0,
        homeRuns: 0,
        rbi: 0,
        totalHits: 0,
        totalAB: 0,
        slugging: 0,
        ops: 0
      };
    }

    const totalHits = games.reduce((sum, g) => sum + (g.H || 0), 0);
    const totalAB = games.reduce((sum, g) => sum + (g.AB || 0), 0);
    const totalBB = games.reduce((sum, g) => sum + (g.BB || 0), 0);
    const total2B = games.reduce((sum, g) => sum + (g["2B"] || 0), 0);
    const total3B = games.reduce((sum, g) => sum + (g["3B"] || 0), 0);
    const totalHR = games.reduce((sum, g) => sum + (g.HR || 0), 0);
    const totalRBI = games.reduce((sum, g) => sum + (g.RBI || 0), 0);

    const average = totalAB > 0 ? totalHits / totalAB : 0;
    const obp = (totalAB + totalBB) > 0 ? (totalHits + totalBB) / (totalAB + totalBB) : 0;
    const totalBases = totalHits + total2B + (total3B * 2) + (totalHR * 3);
    const slugging = totalAB > 0 ? totalBases / totalAB : 0;
    const ops = obp + slugging;

    return {
      gamesPlayed: games.length,
      average: parseFloat(average.toFixed(3)),
      homeRuns: totalHR,
      rbi: totalRBI,
      totalHits,
      totalAB,
      obp: parseFloat(obp.toFixed(3)),
      slugging: parseFloat(slugging.toFixed(3)),
      ops: parseFloat(ops.toFixed(3)),
      multiHitGames: games.filter(g => (g.H || 0) >= 2).length,
      hitlessGames: games.filter(g => (g.H || 0) === 0).length
    };
  }

  /**
   * Identify patterns and preferences in series performance
   */
  identifySeriesPatterns(performanceByPosition) {
    const patterns = [];
    const { game1, game2, game3Plus } = performanceByPosition;

    // Game 1 specialist pattern
    if (game1.stats.gamesPlayed >= 5 && 
        game1.stats.average > Math.max(game2.stats.average, game3Plus.stats.average) + 0.050) {
      patterns.push({
        type: 'game1_specialist',
        label: 'Series Opener Specialist',
        icon: '🎯',
        description: `Excels in series openers (.${Math.round(game1.stats.average * 1000)})`,
        advantage: game1.stats.average - Math.max(game2.stats.average, game3Plus.stats.average),
        confidence: this.calculatePatternConfidence(game1.stats.gamesPlayed, game1.stats.average)
      });
    }

    // Series closer pattern
    if (game3Plus.stats.gamesPlayed >= 5 && 
        game3Plus.stats.average > Math.max(game1.stats.average, game2.stats.average) + 0.050) {
      patterns.push({
        type: 'series_closer',
        label: 'Series Closer',
        icon: '🏁',
        description: `Strong in series finale (.${Math.round(game3Plus.stats.average * 1000)})`,
        advantage: game3Plus.stats.average - Math.max(game1.stats.average, game2.stats.average),
        confidence: this.calculatePatternConfidence(game3Plus.stats.gamesPlayed, game3Plus.stats.average)
      });
    }

    // Power surge in specific games
    if (game2.stats.gamesPlayed >= 5 && 
        game2.stats.homeRuns > 0 &&
        (game2.stats.homeRuns / game2.stats.gamesPlayed) > 
        Math.max((game1.stats.homeRuns / Math.max(1, game1.stats.gamesPlayed)), 
                 (game3Plus.stats.homeRuns / Math.max(1, game3Plus.stats.gamesPlayed))) + 0.05) {
      patterns.push({
        type: 'game2_power',
        label: 'Game 2 Power Surge',
        icon: '💥',
        description: `Higher HR rate in Game 2 (${(game2.stats.homeRuns / game2.stats.gamesPlayed * 100).toFixed(1)}%)`,
        hrRate: game2.stats.homeRuns / game2.stats.gamesPlayed,
        confidence: this.calculatePatternConfidence(game2.stats.gamesPlayed, game2.stats.homeRuns / game2.stats.gamesPlayed)
      });
    }

    // Consistent performer pattern
    const averages = [game1.stats.average, game2.stats.average, game3Plus.stats.average].filter(avg => avg > 0);
    const avgVariance = this.calculateVariance(averages);
    if (averages.length >= 3 && avgVariance < 0.002 && averages.every(avg => avg >= 0.280)) {
      patterns.push({
        type: 'consistent_performer',
        label: 'Series Consistent',
        icon: '📊',
        description: 'Maintains performance throughout series',
        variance: avgVariance,
        confidence: 'high'
      });
    }

    return patterns;
  }

  /**
   * Determine current series position for the player
   */
  async getCurrentSeriesPosition(playerName, team, currentDate) {
    try {
      // Look back 7 days to find recent games against current opponent (limited to season)
      const dateRange = getSeasonSafeDateRange(currentDate, 7);
      const recentGames = await this.getPlayerSeriesGames(playerName, team, dateRange.startDate, dateRange.endDate);
      
      if (recentGames.length === 0) {
        return {
          position: 1,
          opponent: 'Unknown',
          isHome: null,
          gamesInSeries: 0,
          seriesStarted: false
        };
      }

      // Find the most recent opponent
      const lastGame = recentGames[recentGames.length - 1];
      const currentOpponent = this.extractOpponent(lastGame);
      
      // Count consecutive games against this opponent
      let gamesAgainstCurrentOpponent = 0;
      for (let i = recentGames.length - 1; i >= 0; i--) {
        if (this.extractOpponent(recentGames[i]) === currentOpponent) {
          gamesAgainstCurrentOpponent++;
        } else {
          break;
        }
      }

      return {
        position: gamesAgainstCurrentOpponent + 1,
        opponent: currentOpponent,
        isHome: this.isHomeGame(lastGame),
        gamesInSeries: gamesAgainstCurrentOpponent,
        seriesStarted: gamesAgainstCurrentOpponent > 0,
        lastGameDate: lastGame.date
      };
    } catch (error) {
      console.error('Error determining current series position:', error);
      return {
        position: 1,
        opponent: 'Unknown',
        isHome: null,
        gamesInSeries: 0,
        seriesStarted: false
      };
    }
  }

  /**
   * Generate insights based on series analysis
   */
  generateSeriesInsights(performanceByPosition, patterns, currentPosition) {
    const insights = [];

    // Current series position insight
    if (currentPosition.seriesStarted) {
      const positionKey = currentPosition.position === 1 ? 'game1' : 
                         currentPosition.position === 2 ? 'game2' : 'game3Plus';
      const positionStats = performanceByPosition[positionKey].stats;
      
      if (positionStats.gamesPlayed >= 3) {
        insights.push({
          type: 'current_position',
          title: `Game ${currentPosition.position} vs ${currentPosition.opponent}`,
          description: `Historical Game ${currentPosition.position} average: .${Math.round(positionStats.average * 1000)}`,
          icon: '📍',
          stats: positionStats,
          relevance: 'high'
        });
      }
    }

    // Pattern-based insights
    patterns.forEach(pattern => {
      if (pattern.confidence === 'high' || 
          (pattern.type === 'game1_specialist' && currentPosition.position === 1) ||
          (pattern.type === 'series_closer' && currentPosition.position >= 3) ||
          (pattern.type === 'game2_power' && currentPosition.position === 2)) {
        
        insights.push({
          type: 'pattern_match',
          title: pattern.label,
          description: pattern.description,
          icon: pattern.icon,
          relevance: currentPosition.position === 1 && pattern.type === 'game1_specialist' ? 'critical' :
                     currentPosition.position === 2 && pattern.type === 'game2_power' ? 'critical' :
                     currentPosition.position >= 3 && pattern.type === 'series_closer' ? 'critical' : 'medium'
        });
      }
    });

    // Overall series performance insight
    const allPositions = Object.values(performanceByPosition);
    const bestPosition = allPositions.reduce((best, current) => 
      current.stats.average > best.stats.average ? current : best
    );
    
    if (bestPosition.stats.gamesPlayed >= 5) {
      const positionName = bestPosition === performanceByPosition.game1 ? 'series openers' :
                          bestPosition === performanceByPosition.game2 ? 'Game 2' :
                          'later series games';
      
      insights.push({
        type: 'best_position',
        title: `Strongest in ${positionName}`,
        description: `Best performance in ${positionName} (.${Math.round(bestPosition.stats.average * 1000)})`,
        icon: '⭐',
        relevance: 'medium'
      });
    }

    return insights.sort((a, b) => {
      const relevanceOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return relevanceOrder[b.relevance] - relevanceOrder[a.relevance];
    });
  }

  /**
   * Helper methods
   */
  extractOpponent(game) {
    // Extract opponent from game data
    if (game.opponent) return game.opponent;
    if (game.vs) return game.vs.replace('@', '');
    if (game.homeTeam && game.awayTeam) {
      return game.team === game.homeTeam ? game.awayTeam : game.homeTeam;
    }
    return 'Unknown';
  }

  isHomeGame(game) {
    if (game.isHome !== undefined) return game.isHome;
    if (game.vs && game.vs.startsWith('@')) return false;
    if (game.homeTeam && game.team) return game.team === game.homeTeam;
    return null;
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  calculatePatternConfidence(gamesPlayed, metric) {
    if (gamesPlayed >= 15 && metric >= 0.300) return 'high';
    if (gamesPlayed >= 10 && metric >= 0.250) return 'medium';
    return 'low';
  }

  calculateConfidence(totalGames, totalSeries) {
    if (totalGames >= 30 && totalSeries >= 10) return 'high';
    if (totalGames >= 20 && totalSeries >= 7) return 'medium';
    if (totalGames >= 10 && totalSeries >= 4) return 'low';
    return 'insufficient';
  }

  getDefaultSeriesContext() {
    return {
      performanceByPosition: {
        game1: { games: [], stats: {} },
        game2: { games: [], stats: {} },
        game3Plus: { games: [], stats: {} }
      },
      seriesPatterns: [],
      currentSeriesPosition: {
        position: 1,
        opponent: 'Unknown',
        isHome: null,
        gamesInSeries: 0,
        seriesStarted: false
      },
      totalSeriesAnalyzed: 0,
      gamesAnalyzed: 0,
      insights: [],
      confidence: 'insufficient'
    };
  }
}

// Create and export singleton instance
const seriesContextService = new SeriesContextService();
export default seriesContextService;