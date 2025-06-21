/**
 * propFinderService.js
 * 
 * Enhanced MLB Prop Finder with Lineup Integration
 * Analyzes player props based on recent performance data, batting order context, and confirmed lineups
 * Provides batting-order weighted RBI analysis and lineup-aware player filtering
 */

import handednessResolver from '../utils/handednessResolver.js';
import pitcherStrikeoutAnalyzer from './pitcherStrikeoutAnalyzer.js';

class PropFinderService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lineupCache = null;
    this.lineupCacheTimeout = 15 * 60 * 1000; // 15 minutes
    this.lastLineupLoad = null;
  }

  /**
   * Load today's lineup data with caching
   */
  async loadLineupData() {
    if (this.lineupCache && this.lastLineupLoad && 
        (Date.now() - this.lastLineupLoad) < this.lineupCacheTimeout) {
      return this.lineupCache;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/data/lineups/starting_lineups_${today}.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      this.lineupCache = await response.json();
      this.lastLineupLoad = Date.now();
      
      console.log(`✅ PropFinder loaded lineup data: ${this.lineupCache.totalGames} games`);
      return this.lineupCache;
    } catch (error) {
      console.warn('PropFinder: Lineup data not available:', error.message);
      return null;
    }
  }

  /**
   * Get batting order context for RBI analysis
   */
  async getBattingOrderContext(playerName, team) {
    try {
      const lineupData = await this.loadLineupData();
      if (!lineupData) {
        return { isInLineup: false, battingOrder: null, rbiMultiplier: 1.0 };
      }

      // Search for player in lineups
      for (const game of lineupData.games) {
        // Check home team
        if (game.teams.home.abbr === team && game.lineups.home.batting_order) {
          for (const player of game.lineups.home.batting_order) {
            if (this.matchPlayerName(player.name, playerName)) {
              return {
                isInLineup: true,
                battingOrder: player.order,
                position: player.position,
                rbiMultiplier: this.calculateRBIMultiplier(player.order),
                source: 'confirmed_lineup'
              };
            }
          }
        }

        // Check away team
        if (game.teams.away.abbr === team && game.lineups.away.batting_order) {
          for (const player of game.lineups.away.batting_order) {
            if (this.matchPlayerName(player.name, playerName)) {
              return {
                isInLineup: true,
                battingOrder: player.order,
                position: player.position,
                rbiMultiplier: this.calculateRBIMultiplier(player.order),
                source: 'confirmed_lineup'
              };
            }
          }
        }
      }

    } catch (error) {
      console.warn('Error getting batting order context:', error);
    }

    return { isInLineup: false, battingOrder: null, rbiMultiplier: 1.0 };
  }

  /**
   * Calculate RBI multiplier based on batting order position
   */
  calculateRBIMultiplier(battingOrder) {
    switch (battingOrder) {
      case 1: return 0.7;  // Leadoff - fewer RBI opportunities
      case 2: return 0.8;  // #2 hitter - some RBI chances
      case 3: return 1.2;  // #3 hitter - prime RBI position
      case 4: return 1.3;  // Cleanup - highest RBI potential
      case 5: return 1.2;  // #5 hitter - good RBI opportunities
      case 6: return 1.0;  // #6 hitter - average
      case 7: return 1.0;  // #7 hitter - average
      case 8: return 0.8;  // #8 hitter - fewer opportunities
      case 9: return 0.8;  // #9 hitter - least RBI chances
      default: return 1.0; // Unknown position
    }
  }

  /**
   * Get batting order description for display
   */
  getBattingOrderDescription(battingOrder) {
    switch (battingOrder) {
      case 1: return 'Leadoff';
      case 2: return '#2';
      case 3: return '#3';
      case 4: return 'Cleanup';
      case 5: return '#5';
      case 6: return '#6';
      case 7: return '#7';
      case 8: return '#8';
      case 9: return '#9';
      default: return 'Unknown';
    }
  }

  /**
   * Match player names with various formats
   */
  matchPlayerName(name1, name2) {
    if (!name1 || !name2) return false;
    
    const normalize = (name) => name.toLowerCase().trim()
      .replace(/[.,]/g, '')
      .replace(/\s+/g, ' ');
    
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    
    // Exact match
    if (n1 === n2) return true;
    
    // Check if one contains the other
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Last name match
    const lastName1 = n1.split(' ').pop();
    const lastName2 = n2.split(' ').pop();
    if (lastName1 === lastName2 && lastName1.length > 2) return true;
    
    return false;
  }

  /**
   * Filter predictions to only starting lineup players when lineups are available
   */
  async filterToStartingLineup(predictions) {
    const lineupData = await this.loadLineupData();
    if (!lineupData) {
      console.log('📋 No lineup data available - analyzing all team players');
      return predictions; // Return all if no lineup data
    }

    const startingPlayers = [];
    const benchPlayers = [];

    for (const prediction of predictions) {
      const context = await this.getBattingOrderContext(prediction.player_name, prediction.team);
      
      if (context.isInLineup) {
        startingPlayers.push({
          ...prediction,
          lineupContext: context
        });
      } else {
        benchPlayers.push(prediction);
      }
    }

    const lineupRate = (startingPlayers.length / predictions.length * 100).toFixed(1);
    console.log(`📋 Lineup filtering: ${startingPlayers.length} starters, ${benchPlayers.length} bench (${lineupRate}% lineup coverage)`);

    // Prioritize starting players but include some bench players if lineup coverage is low
    if (lineupRate < 50) {
      console.log('⚠️ Low lineup coverage - including bench players');
      return [...startingPlayers, ...benchPlayers.slice(0, 10)];
    }

    return startingPlayers;
  }

  /**
   * Analyze prop betting opportunities for all players in predictions
   * @param {Array} predictions - Array of player prediction objects
   * @param {Object} gameData - Daily game data
   * @returns {Array} Prop opportunities sorted by confidence
   */
  async analyzePropOpportunities(predictions, gameData = null) {
    const cacheKey = `props_${JSON.stringify(predictions.map(p => p.player_name).slice(0, 10))}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // Filter to starting lineup players when possible
    const filteredPredictions = await this.filterToStartingLineup(predictions);
    const propOpportunities = [];

    // 1. Analyze batter props (existing logic)
    for (const prediction of filteredPredictions) {
      try {
        const playerProps = await this.analyzePlayerProps(prediction, gameData);
        if (playerProps && playerProps.length > 0) {
          // Get lineup context for additional metadata
          const lineupContext = prediction.lineupContext || 
                               await this.getBattingOrderContext(prediction.player_name, prediction.team);

          propOpportunities.push({
            playerName: prediction.player_name,
            team: prediction.team,
            playerType: 'batter',
            props: playerProps,
            bestProp: this.getBestProp(playerProps),
            confidence: this.calculateOverallConfidence(playerProps),
            situationalBoost: this.calculateSituationalBoost(prediction),
            lineupContext: lineupContext
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze props for ${prediction.player_name}:`, error);
      }
    }

    // 2. Analyze pitcher strikeout props (NEW)
    try {
      const pitcherProps = await pitcherStrikeoutAnalyzer.analyzePitcherStrikeoutProps(
        filteredPredictions, 
        gameData
      );
      
      // Add pitcher props to opportunities
      pitcherProps.forEach(pitcherProp => {
        propOpportunities.push({
          playerName: pitcherProp.playerName,
          team: pitcherProp.team,
          playerType: 'pitcher',
          props: [pitcherProp], // Single prop per pitcher
          bestProp: pitcherProp,
          confidence: pitcherProp.confidence,
          situationalBoost: 0, // No situational boost for pitchers yet
          pitcherContext: pitcherProp.context
        });
      });
      
      console.log(`✅ Added ${pitcherProps.length} pitcher strikeout props`);
      
    } catch (error) {
      console.warn('Failed to analyze pitcher strikeout props:', error);
    }

    // Sort by confidence and prop quality, with lineup context boost
    propOpportunities.sort((a, b) => {
      const aScore = a.confidence * (a.bestProp?.probability || 0) * 
                    (a.lineupContext?.isInLineup ? 1.1 : 1.0);
      const bScore = b.confidence * (b.bestProp?.probability || 0) * 
                    (b.lineupContext?.isInLineup ? 1.1 : 1.0);
      return bScore - aScore;
    });

    const result = propOpportunities.slice(0, 25); // Top 25 opportunities
    
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Analyze individual player props based on last 10 games
   * @param {Object} prediction - Player prediction object
   * @param {Object} gameData - Optional game data context
   * @returns {Array} Array of prop objects
   */
  async analyzePlayerProps(prediction, gameData) {
    // Get last 10 games data for the player
    const last10Games = await this.getPlayerLast10Games(prediction.player_name, prediction.team);
    
    if (!last10Games || last10Games.length < 5) {
      return []; // Need at least 5 games for reliable analysis
    }

    const props = [];

    // Hitting Props
    const hitProps = this.analyzeHittingProps(last10Games);
    props.push(...hitProps);

    // Power Props  
    const powerProps = this.analyzePowerProps(last10Games);
    props.push(...powerProps);

    // RBI Props (enhanced with batting order context)
    const rbiProps = await this.analyzeRBIProps(last10Games, prediction);
    props.push(...rbiProps);

    // Runs Props
    const runsProps = this.analyzeRunsProps(last10Games);
    props.push(...runsProps);

    // Total Bases Props
    const totalBasesProps = this.analyzeTotalBasesProps(last10Games);
    props.push(...totalBasesProps);

    // TODO: Add pitcher strikeout props (separate from batter props)
    // Note: Removed incorrect batter strikeout props - strikeouts are pitcher props, not batter props

    // Filter to high-probability props only
    return props.filter(prop => prop.probability >= 40); // 40%+ hit rate
  }

  /**
   * Analyze hitting props (1+, 2+, 3+ hits)
   */
  analyzeHittingProps(games) {
    const props = [];
    const gameCount = games.length;

    // 1+ Hits - Lowered threshold to 45% to be more inclusive
    const oneHitGames = games.filter(g => g.hits >= 1).length;
    const oneHitRate = (oneHitGames / gameCount) * 100;
    
    if (oneHitRate >= 45) {
      props.push({
        type: "1+ Hits",
        probability: oneHitRate,
        last10: `${oneHitGames}/${gameCount}`,
        trend: this.getTrend(games.slice(-5).filter(g => g.hits >= 1).length, 5),
        confidence: this.calculatePropConfidence(oneHitRate, gameCount),
        category: 'hitting'
      });
    }

    // 2+ Hits  
    const twoHitGames = games.filter(g => g.hits >= 2).length;
    const twoHitRate = (twoHitGames / gameCount) * 100;
    
    if (twoHitRate >= 25) {
      props.push({
        type: "2+ Hits", 
        probability: twoHitRate,
        last10: `${twoHitGames}/${gameCount}`,
        trend: this.getTrend(games.slice(-5).filter(g => g.hits >= 2).length, 5),
        confidence: this.calculatePropConfidence(twoHitRate, gameCount),
        category: 'hitting'
      });
    }

    // 3+ Hits
    const threeHitGames = games.filter(g => g.hits >= 3).length;
    const threeHitRate = (threeHitGames / gameCount) * 100;
    
    if (threeHitRate >= 15) {
      props.push({
        type: "3+ Hits",
        probability: threeHitRate, 
        last10: `${threeHitGames}/${gameCount}`,
        trend: this.getTrend(games.slice(-5).filter(g => g.hits >= 3).length, 5),
        confidence: this.calculatePropConfidence(threeHitRate, gameCount),
        category: 'hitting'
      });
    }

    return props;
  }

  /**
   * Analyze power props (1+, 2+ home runs)
   */
  analyzePowerProps(games) {
    const props = [];
    const gameCount = games.length;

    // 1+ Home Run
    const oneHRGames = games.filter(g => g.hr >= 1).length;
    const oneHRRate = (oneHRGames / gameCount) * 100;
    
    if (oneHRRate >= 15) {
      props.push({
        type: "1+ Home Run",
        probability: oneHRRate,
        last10: `${oneHRGames}/${gameCount}`,
        trend: this.getTrend(games.slice(-5).filter(g => g.hr >= 1).length, 5),
        confidence: this.calculatePropConfidence(oneHRRate, gameCount),
        category: 'power'
      });
    }

    // 2+ Home Runs
    const twoHRGames = games.filter(g => g.hr >= 2).length;
    const twoHRRate = (twoHRGames / gameCount) * 100;
    
    if (twoHRRate >= 5) {
      props.push({
        type: "2+ Home Runs",
        probability: twoHRRate,
        last10: `${twoHRGames}/${gameCount}`,
        trend: this.getTrend(games.slice(-5).filter(g => g.hr >= 2).length, 5),
        confidence: this.calculatePropConfidence(twoHRRate, gameCount),
        category: 'power'
      });
    }

    return props;
  }

  /**
   * Analyze RBI props with batting order context
   */
  async analyzeRBIProps(games, prediction) {
    const props = [];
    const gameCount = games.length;

    // Get batting order context for RBI weighting
    const battingContext = await this.getBattingOrderContext(
      prediction.player_name, 
      prediction.team
    );

    // 1+ RBI analysis with batting order multiplier
    const oneRBIGames = games.filter(g => g.rbi >= 1).length;
    let oneRBIRate = (oneRBIGames / gameCount) * 100;
    
    // Apply batting order multiplier
    const adjustedRBIRate = oneRBIRate * battingContext.rbiMultiplier;
    
    // Dynamic threshold based on batting position
    let threshold = 45; // Default threshold
    if (battingContext.battingOrder) {
      if (battingContext.battingOrder >= 3 && battingContext.battingOrder <= 5) {
        threshold = 35; // Lower threshold for heart of order
      } else if (battingContext.battingOrder === 1) {
        threshold = 55; // Higher threshold for leadoff
      }
    }
    
    if (adjustedRBIRate >= threshold) {
      props.push({
        type: "1+ RBI",
        probability: Math.min(95, adjustedRBIRate), // Cap at 95%
        baseRate: oneRBIRate,
        last10: `${oneRBIGames}/${gameCount}`,
        trend: this.getTrend(games.slice(-5).filter(g => g.rbi >= 1).length, 5),
        confidence: this.calculatePropConfidence(adjustedRBIRate, gameCount),
        category: 'rbi',
        battingOrder: battingContext.battingOrder,
        rbiMultiplier: battingContext.rbiMultiplier,
        notes: battingContext.isInLineup ? 
          `${this.getBattingOrderDescription(battingContext.battingOrder)} hitter` : 
          'Batting order TBD'
      });
    }

    // 2+ RBI with batting order context
    const twoRBIGames = games.filter(g => g.rbi >= 2).length;
    let twoRBIRate = (twoRBIGames / gameCount) * 100;
    const adjustedTwoRBIRate = twoRBIRate * battingContext.rbiMultiplier;
    
    // 2+ RBI is harder, so lower thresholds
    let twoRBIThreshold = 20;
    if (battingContext.battingOrder >= 3 && battingContext.battingOrder <= 5) {
      twoRBIThreshold = 15; // Lower threshold for cleanup hitters
    }
    
    if (adjustedTwoRBIRate >= twoRBIThreshold) {
      props.push({
        type: "2+ RBI",
        probability: Math.min(85, adjustedTwoRBIRate), // Cap at 85%
        baseRate: twoRBIRate,
        last10: `${twoRBIGames}/${gameCount}`,
        trend: this.getTrend(games.slice(-5).filter(g => g.rbi >= 2).length, 5),
        confidence: this.calculatePropConfidence(adjustedTwoRBIRate, gameCount),
        category: 'rbi',
        battingOrder: battingContext.battingOrder,
        rbiMultiplier: battingContext.rbiMultiplier,
        notes: battingContext.isInLineup ? 
          `${this.getBattingOrderDescription(battingContext.battingOrder)} hitter` : 
          'Batting order TBD'
      });
    }

    return props;
  }

  /**
   * Analyze runs scored props
   */
  analyzeRunsProps(games) {
    const props = [];
    const gameCount = games.length;

    // 1+ Runs
    const oneRunGames = games.filter(g => g.runs >= 1).length;
    const oneRunRate = (oneRunGames / gameCount) * 100;
    
    if (oneRunRate >= 40) {
      props.push({
        type: "1+ Runs",
        probability: oneRunRate,
        last10: `${oneRunGames}/${gameCount}`,
        trend: this.getTrend(games.slice(-5).filter(g => g.runs >= 1).length, 5),
        confidence: this.calculatePropConfidence(oneRunRate, gameCount),
        category: 'runs'
      });
    }

    return props;
  }

  /**
   * Analyze total bases props
   */
  analyzeTotalBasesProps(games) {
    const props = [];
    const gameCount = games.length;

    // Calculate total bases for each game
    const gamesWithTB = games.map(game => ({
      ...game,
      totalBases: game.hits + game.doubles + (game.triples * 2) + (game.hr * 3)
    }));

    // 2+ Total Bases
    const twoTBGames = gamesWithTB.filter(g => g.totalBases >= 2).length;
    const twoTBRate = (twoTBGames / gameCount) * 100;
    
    if (twoTBRate >= 40) {
      props.push({
        type: "2+ Total Bases",
        probability: twoTBRate,
        last10: `${twoTBGames}/${gameCount}`,
        trend: this.getTrend(gamesWithTB.slice(-5).filter(g => g.totalBases >= 2).length, 5),
        confidence: this.calculatePropConfidence(twoTBRate, gameCount),
        category: 'total_bases'
      });
    }

    return props;
  }

  // Removed incorrect batter strikeout methods
  // Strikeout props belong to PITCHERS, not batters
  // TODO: Implement proper pitcher strikeout analysis in separate service

  /**
   * Calculate trend indicator
   */
  getTrend(recentCount, recentTotal) {
    const recentRate = recentCount / recentTotal;
    if (recentRate >= 0.8) return '🔥'; // Hot
    if (recentRate >= 0.6) return '📈'; // Improving
    if (recentRate >= 0.4) return '➡️'; // Stable
    if (recentRate >= 0.2) return '📉'; // Declining
    return '🥶'; // Cold
  }

  /**
   * Calculate prop confidence based on rate and sample size
   */
  calculatePropConfidence(rate, sampleSize) {
    let confidence = rate / 100; // Base confidence from success rate
    
    // Adjust for sample size
    if (sampleSize >= 10) confidence *= 1.0;
    else if (sampleSize >= 8) confidence *= 0.9;
    else if (sampleSize >= 6) confidence *= 0.8;
    else confidence *= 0.7;

    // Boost confidence for very high rates
    if (rate >= 80) confidence *= 1.1;
    else if (rate >= 70) confidence *= 1.05;

    return Math.min(1.0, confidence);
  }

  /**
   * Get best prop for a player
   */
  getBestProp(props) {
    if (!props || props.length === 0) return null;
    
    return props.reduce((best, current) => {
      const currentScore = current.probability * current.confidence;
      const bestScore = best.probability * best.confidence;
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Calculate overall confidence for player
   */
  calculateOverallConfidence(props) {
    if (!props || props.length === 0) return 0;
    
    const avgConfidence = props.reduce((sum, prop) => sum + prop.confidence, 0) / props.length;
    const highProbProps = props.filter(p => p.probability >= 60).length;
    
    // Boost confidence if player has multiple high-probability props
    let boost = 1.0;
    if (highProbProps >= 3) boost = 1.2;
    else if (highProbProps >= 2) boost = 1.1;
    
    return Math.min(1.0, avgConfidence * boost);
  }

  /**
   * Calculate situational boost from prediction data
   */
  calculateSituationalBoost(prediction) {
    const boosts = [];
    
    // Home field advantage
    if (prediction.is_home) boosts.push('+5% (Home)');
    
    // Rest day boost
    if (prediction.rest_days === 1) boosts.push('+8% (Rest Day)');
    
    // Hot streak
    if (prediction.current_streak >= 5) boosts.push('+10% (Hot Streak)');
    
    // Favorable matchup
    if (prediction.hr_score >= 70) boosts.push('+12% (Great Matchup)');
    
    // Weather factors
    if (prediction.weather_context?.windFactor?.factor > 1.1) {
      boosts.push('+6% (Wind Boost)');
    }
    
    return boosts.join(', ') || 'Standard';
  }

  /**
   * Get player's last 10 games data from existing prediction data
   * Uses the recent game data that's already available in predictions
   */
  async getPlayerLast10Games(playerName, team) {
    try {
      // Try to get data from prediction's recent form details
      // This would be enhanced with actual game log data in the future
      
      // For now, generate mock data based on player's prediction context
      // In a real implementation, this would fetch from daily game files
      
      // Generate realistic mock data based on player performance indicators
      const mockGames = this.generateMockRecentGames(playerName, team);
      return mockGames;
      
    } catch (error) {
      console.warn(`Could not fetch recent games for ${playerName}:`, error);
      return [];
    }
  }

  /**
   * Generate mock recent games data for demo purposes
   * In production, this would be replaced with actual game log fetching
   */
  generateMockRecentGames(playerName, team) {
    const games = [];
    const gameCount = 10;
    
    // Generate varied performance based on realistic baseball stats
    for (let i = 0; i < gameCount; i++) {
      const game = {
        date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        hits: Math.random() < 0.3 ? (Math.random() < 0.7 ? 1 : Math.random() < 0.8 ? 2 : 3) : 0,
        abs: Math.floor(Math.random() * 3) + 3, // 3-5 at bats
        hr: Math.random() < 0.08 ? 1 : (Math.random() < 0.02 ? 2 : 0), // 8% chance of HR
        rbi: Math.random() < 0.4 ? (Math.random() < 0.7 ? 1 : 2) : 0,
        runs: Math.random() < 0.4 ? 1 : (Math.random() < 0.1 ? 2 : 0),
        strikeouts: Math.random() < 0.25 ? (Math.random() < 0.8 ? 1 : 2) : 0,
        doubles: Math.random() < 0.1 ? 1 : 0,
        triples: Math.random() < 0.02 ? 1 : 0
      };
      
      games.push(game);
    }
    
    return games.reverse(); // Most recent first
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new PropFinderService();