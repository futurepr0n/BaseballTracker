/**
 * pitcherStrikeoutAnalyzer.js
 * 
 * Analyzes pitcher strikeout props based on:
 * - Pitcher K/9 rate and recent form
 * - Opposing team strikeout vulnerability  
 * - Home/road splits and handedness matchups
 * - Expected innings pitched
 * 
 * Generates proper PITCHER strikeout props (4+, 5+, 6+, 7+, 8+)
 */

class PitcherStrikeoutAnalyzer {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Main method to analyze pitcher strikeout props for a game
   */
  async analyzePitcherStrikeoutProps(predictions, gameData) {
    const pitcherProps = [];
    
    try {
      // Group predictions by pitcher (extract unique pitchers from batter predictions)
      const pitcherData = this.extractPitcherDataFromPredictions(predictions);
      
      for (const pitcher of pitcherData) {
        const props = await this.analyzeIndividualPitcher(pitcher, predictions);
        pitcherProps.push(...props);
      }
      
      console.log(`✅ Generated ${pitcherProps.length} pitcher strikeout props`);
      return pitcherProps;
      
    } catch (error) {
      console.error('Error analyzing pitcher strikeout props:', error);
      return [];
    }
  }

  /**
   * Extract unique pitcher data from batter predictions
   */
  extractPitcherDataFromPredictions(predictions) {
    const pitchers = new Map();
    
    predictions.forEach(prediction => {
      // Extract pitcher info from prediction data
      const pitcherName = prediction.pitcher_name || 'Unknown Pitcher';
      const pitcherTeam = prediction.pitcher_team || prediction.opponent_team;
      const opposingTeam = prediction.team;
      
      if (!pitchers.has(pitcherName)) {
        pitchers.set(pitcherName, {
          name: pitcherName,
          team: pitcherTeam,
          opposingTeam: opposingTeam,
          hand: prediction.pitcher_hand || 'R',
          
          // Pitcher stats from prediction
          kPerGame: prediction.pitcher_k_per_game || 
                   (prediction.pitcher_home_k_total / (prediction.pitcher_home_games || 1)) || 
                   6.5,
          era: prediction.pitcher_era || 4.50,
          whip: prediction.pitcher_whip || 1.30,
          homeKTotal: prediction.pitcher_home_k_total || 0,
          homeGames: prediction.pitcher_home_games || 1,
          recentForm: prediction.pitcher_trend_dir || 'stable',
          
          // Opposing batters for this pitcher
          opposingBatters: []
        });
      }
      
      // Add batter to opposing lineup
      pitchers.get(pitcherName).opposingBatters.push({
        name: prediction.player_name,
        hand: prediction.batter_hand || 'R',
        strikeoutRate: this.estimateBatterStrikeoutRate(prediction)
      });
    });
    
    return Array.from(pitchers.values());
  }

  /**
   * Estimate batter strikeout rate from available data
   */
  estimateBatterStrikeoutRate(prediction) {
    // Try to extract from any available strikeout data
    // This is a fallback - in real implementation, we'd have better batter K rates
    const baseRate = 0.22; // MLB average ~22% strikeout rate
    
    // Adjust based on any available indicators
    if (prediction.recent_avg && prediction.recent_avg < 0.200) {
      return baseRate * 1.2; // Struggling batters strike out more
    } else if (prediction.recent_avg && prediction.recent_avg > 0.300) {
      return baseRate * 0.8; // Hot batters strike out less
    }
    
    return baseRate;
  }

  /**
   * Analyze strikeout props for an individual pitcher
   */
  async analyzeIndividualPitcher(pitcher, allPredictions) {
    const props = [];
    
    try {
      // Calculate expected strikeouts
      const expectedStrikeouts = this.calculateExpectedStrikeouts(pitcher);
      
      if (expectedStrikeouts < 4.0) {
        // Don't generate props below 4+ threshold
        return props;
      }
      
      // Generate props for different thresholds
      const thresholds = [
        { level: 4, threshold: 4.5 },
        { level: 5, threshold: 5.5 },
        { level: 6, threshold: 6.5 },
        { level: 7, threshold: 7.3 },
        { level: 8, threshold: 8.0 }
      ];
      
      thresholds.forEach(({ level, threshold }) => {
        if (expectedStrikeouts >= threshold) {
          const probability = this.calculateStrikeoutProbability(expectedStrikeouts, level);
          
          if (probability >= 55) { // Minimum 55% confidence
            props.push({
              type: `${level}+ Strikeouts`,
              playerName: pitcher.name,
              playerType: 'pitcher',
              team: pitcher.team,
              opposingTeam: pitcher.opposingTeam,
              probability: Math.round(probability),
              expectedValue: Math.round(expectedStrikeouts * 10) / 10,
              confidence: this.calculateConfidence(pitcher, expectedStrikeouts),
              category: 'pitcher_strikeouts',
              notes: this.generatePropNotes(pitcher, expectedStrikeouts, level),
              context: {
                pitcherKRate: pitcher.kPerGame,
                opposingTeamKRate: this.calculateTeamStrikeoutRate(pitcher.opposingBatters),
                expectedIP: this.estimateInningsPitched(pitcher),
                recentForm: pitcher.recentForm
              }
            });
          }
        }
      });
      
      return props;
      
    } catch (error) {
      console.error(`Error analyzing pitcher ${pitcher.name}:`, error);
      return [];
    }
  }

  /**
   * Calculate expected strikeouts for a pitcher vs opposing lineup
   */
  calculateExpectedStrikeouts(pitcher) {
    // Base calculation: K/9 rate × expected innings pitched
    const expectedIP = this.estimateInningsPitched(pitcher);
    const baseStrikeouts = (pitcher.kPerGame / 9) * expectedIP;
    
    // Team vulnerability adjustment
    const teamKRate = this.calculateTeamStrikeoutRate(pitcher.opposingBatters);
    const leagueAvgKRate = 0.22; // 22% MLB average
    const teamAdjustment = teamKRate / leagueAvgKRate;
    
    // Recent form adjustment
    const formAdjustment = this.getFormAdjustment(pitcher.recentForm);
    
    // Home/road adjustment (simplified - assume home advantage)
    const homeAdjustment = 1.05; // 5% boost at home
    
    // Final calculation
    const expectedStrikeouts = baseStrikeouts * teamAdjustment * formAdjustment * homeAdjustment;
    
    return Math.max(0, expectedStrikeouts);
  }

  /**
   * Calculate team strikeout rate vs this pitcher
   */
  calculateTeamStrikeoutRate(opposingBatters) {
    if (!opposingBatters || opposingBatters.length === 0) {
      return 0.22; // League average fallback
    }
    
    const totalRate = opposingBatters.reduce((sum, batter) => sum + batter.strikeoutRate, 0);
    return totalRate / opposingBatters.length;
  }

  /**
   * Estimate innings pitched for this start
   */
  estimateInningsPitched(pitcher) {
    // Estimate based on pitcher quality and recent performance
    if (pitcher.era <= 3.00 && pitcher.whip <= 1.10) {
      return 6.5; // Ace pitcher
    } else if (pitcher.era <= 4.00 && pitcher.whip <= 1.25) {
      return 6.0; // Good pitcher
    } else if (pitcher.era <= 5.00) {
      return 5.5; // Average pitcher
    } else {
      return 5.0; // Struggling pitcher
    }
  }

  /**
   * Get form adjustment multiplier
   */
  getFormAdjustment(trendDir) {
    switch (trendDir?.toLowerCase()) {
      case 'hot':
      case 'improving': return 1.15;
      case 'stable': return 1.0;
      case 'declining': return 0.90;
      case 'cold':
      case 'struggling': return 0.85;
      default: return 1.0;
    }
  }

  /**
   * Calculate probability of reaching strikeout threshold
   */
  calculateStrikeoutProbability(expectedValue, threshold) {
    // Simple probability model - in reality this would be more sophisticated
    const diff = expectedValue - threshold;
    
    if (diff >= 2.0) return 85;
    if (diff >= 1.5) return 78;
    if (diff >= 1.0) return 72;
    if (diff >= 0.5) return 65;
    if (diff >= 0.0) return 58;
    
    return 50;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(pitcher, expectedStrikeouts) {
    let confidence = 70; // Base confidence
    
    // Boost for high-strikeout pitchers
    if (pitcher.kPerGame >= 9.0) confidence += 15;
    else if (pitcher.kPerGame >= 8.0) confidence += 10;
    else if (pitcher.kPerGame >= 7.0) confidence += 5;
    
    // Adjust for form
    if (pitcher.recentForm === 'hot') confidence += 10;
    else if (pitcher.recentForm === 'cold') confidence -= 10;
    
    // Boost for higher expected values
    if (expectedStrikeouts >= 7.0) confidence += 10;
    else if (expectedStrikeouts >= 6.0) confidence += 5;
    
    return Math.min(95, Math.max(50, confidence));
  }

  /**
   * Generate descriptive notes for the prop
   */
  generatePropNotes(pitcher, expectedStrikeouts, threshold) {
    const notes = [];
    
    if (pitcher.kPerGame >= 9.0) {
      notes.push(`Elite K pitcher (${pitcher.kPerGame.toFixed(1)}/9)`);
    } else if (pitcher.kPerGame >= 8.0) {
      notes.push(`High-K pitcher (${pitcher.kPerGame.toFixed(1)}/9)`);
    }
    
    const teamKRate = this.calculateTeamStrikeoutRate(pitcher.opposingBatters);
    if (teamKRate >= 0.25) {
      notes.push('vs high-K team');
    } else if (teamKRate <= 0.18) {
      notes.push('vs contact team');
    }
    
    if (pitcher.recentForm === 'hot') {
      notes.push('recent hot form');
    } else if (pitcher.recentForm === 'cold') {
      notes.push('recent struggles');
    }
    
    return notes.length > 0 ? notes.join(', ') : `Expected: ${expectedStrikeouts.toFixed(1)}K`;
  }
}

export default new PitcherStrikeoutAnalyzer();