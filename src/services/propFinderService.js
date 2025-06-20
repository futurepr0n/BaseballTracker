/**
 * propFinderService.js
 * 
 * Analyzes player props based on recent performance data
 * Calculates hit rates, power rates, and betting prop probabilities
 */

class PropFinderService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
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

    const propOpportunities = [];

    for (const prediction of predictions) {
      try {
        const playerProps = await this.analyzePlayerProps(prediction, gameData);
        if (playerProps && playerProps.length > 0) {
          propOpportunities.push({
            playerName: prediction.player_name,
            team: prediction.team,
            props: playerProps,
            bestProp: this.getBestProp(playerProps),
            confidence: this.calculateOverallConfidence(playerProps),
            situationalBoost: this.calculateSituationalBoost(prediction)
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze props for ${prediction.player_name}:`, error);
      }
    }

    // Sort by confidence and prop quality
    propOpportunities.sort((a, b) => {
      const aScore = a.confidence * (a.bestProp?.probability || 0);
      const bScore = b.confidence * (b.bestProp?.probability || 0);
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

    // RBI Props
    const rbiProps = this.analyzeRBIProps(last10Games);
    props.push(...rbiProps);

    // Runs Props
    const runsProps = this.analyzeRunsProps(last10Games);
    props.push(...runsProps);

    // Total Bases Props
    const totalBasesProps = this.analyzeTotalBasesProps(last10Games);
    props.push(...totalBasesProps);

    // Strikeout Props (for high-K batters)
    const strikeoutProps = this.analyzeStrikeoutProps(last10Games);
    props.push(...strikeoutProps);

    // Filter to high-probability props only
    return props.filter(prop => prop.probability >= 40); // 40%+ hit rate
  }

  /**
   * Analyze hitting props (1+, 2+, 3+ hits)
   */
  analyzeHittingProps(games) {
    const props = [];
    const gameCount = games.length;

    // 1+ Hits
    const oneHitGames = games.filter(g => g.hits >= 1).length;
    const oneHitRate = (oneHitGames / gameCount) * 100;
    
    if (oneHitRate >= 50) {
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
   * Analyze RBI props
   */
  analyzeRBIProps(games) {
    const props = [];
    const gameCount = games.length;

    // 1+ RBI
    const oneRBIGames = games.filter(g => g.rbi >= 1).length;
    const oneRBIRate = (oneRBIGames / gameCount) * 100;
    
    if (oneRBIRate >= 40) {
      props.push({
        type: "1+ RBI",
        probability: oneRBIRate,
        last10: `${oneRBIGames}/${gameCount}`,
        trend: this.getTrend(games.slice(-5).filter(g => g.rbi >= 1).length, 5),
        confidence: this.calculatePropConfidence(oneRBIRate, gameCount),
        category: 'rbi'
      });
    }

    // 2+ RBI
    const twoRBIGames = games.filter(g => g.rbi >= 2).length;
    const twoRBIRate = (twoRBIGames / gameCount) * 100;
    
    if (twoRBIRate >= 20) {
      props.push({
        type: "2+ RBI",
        probability: twoRBIRate,
        last10: `${twoRBIGames}/${gameCount}`,
        trend: this.getTrend(games.slice(-5).filter(g => g.rbi >= 2).length, 5),
        confidence: this.calculatePropConfidence(twoRBIRate, gameCount),
        category: 'rbi'
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

  /**
   * Analyze strikeout props (for high-K batters)
   */
  analyzeStrikeoutProps(games) {
    const props = [];
    const gameCount = games.length;
    const avgStrikeouts = games.reduce((sum, g) => sum + (g.strikeouts || 0), 0) / gameCount;

    // Only analyze K props for players who strike out frequently
    if (avgStrikeouts >= 1.0) {
      // 1+ Strikeouts
      const oneKGames = games.filter(g => (g.strikeouts || 0) >= 1).length;
      const oneKRate = (oneKGames / gameCount) * 100;
      
      if (oneKRate >= 60) {
        props.push({
          type: "1+ Strikeouts",
          probability: oneKRate,
          last10: `${oneKGames}/${gameCount}`,
          trend: this.getTrend(games.slice(-5).filter(g => (g.strikeouts || 0) >= 1).length, 5),
          confidence: this.calculatePropConfidence(oneKRate, gameCount),
          category: 'strikeouts'
        });
      }
    }

    return props;
  }

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