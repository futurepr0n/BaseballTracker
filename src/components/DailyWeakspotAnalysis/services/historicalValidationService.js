// Historical Validation Service - Matches predictions with actual results for ROI analysis

class HistoricalValidationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load and validate historical predictions against actual results
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Object} Validation results with ROI, accuracy, and calibration data
   */
  async validateHistoricalPredictions(startDate, endDate) {
    const cacheKey = `validation_${startDate}_${endDate}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const validationData = await this.processValidationPeriod(startDate, endDate);
      
      this.cache.set(cacheKey, {
        data: validationData,
        timestamp: Date.now()
      });
      
      return validationData;
    } catch (error) {
      console.error('Error in validateHistoricalPredictions:', error);
      return this.getEmptyValidationResult();
    }
  }

  /**
   * Process validation for a date range
   */
  async processValidationPeriod(startDate, endDate) {
    const dateRange = this.getDateRange(startDate, endDate);
    const validationResults = [];
    
    for (const date of dateRange) {
      try {
        const dayResults = await this.validateDay(date);
        if (dayResults && dayResults.length > 0) {
          validationResults.push(...dayResults);
        }
      } catch (error) {
        console.warn(`Failed to validate ${date}:`, error.message);
      }
    }

    return this.analyzeValidationResults(validationResults);
  }

  /**
   * Validate predictions for a single day
   */
  async validateDay(date) {
    const [predictions, actualResults] = await Promise.all([
      this.loadHellraiserPredictions(date),
      this.loadActualGameResults(date)
    ]);

    if (!predictions || !actualResults) {
      return [];
    }

    const validatedBets = [];

    predictions.picks?.forEach(pick => {
      const actualResult = this.findMatchingResult(pick, actualResults);
      if (actualResult) {
        const betResult = this.evaluateBet(pick, actualResult);
        if (betResult) {
          validatedBets.push({
            date,
            playerName: pick.playerName,
            team: pick.team,
            pitcher: pick.pitcher,
            predictionType: this.determinePropType(pick),
            predictedConfidence: pick.confidenceScore / 100,
            actualResult: betResult.actualOutcome,
            betOutcome: betResult.win ? 'Win' : 'Loss',
            odds: pick.odds?.american || '+300',
            profit: betResult.profit,
            stake: 1.0, // Standard unit
            expectedValue: betResult.expectedValue,
            reasoning: pick.reasoning
          });
        }
      }
    });

    return validatedBets;
  }

  /**
   * Load Hellraiser predictions for a specific date
   */
  async loadHellraiserPredictions(date) {
    try {
      const response = await fetch(`/data/hellraiser/hellraiser_${date}.json`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  /**
   * Load actual game results for a specific date
   */
  async loadActualGameResults(date) {
    try {
      const [year, month, day] = date.split('-');
      const monthName = new Date(year, parseInt(month) - 1).toLocaleLString('en', { month: 'long' }).toLowerCase();
      const fileName = `${monthName}_${parseInt(day)}_${year}.json`;
      
      const response = await fetch(`/data/${year}/${monthName}/${fileName}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find matching actual result for a prediction
   */
  findMatchingResult(prediction, actualResults) {
    const playerResults = actualResults.players?.filter(player => 
      this.normalizePlayerName(player.name) === this.normalizePlayerName(prediction.playerName) &&
      player.team === prediction.team
    );

    return playerResults?.[0] || null;
  }

  /**
   * Evaluate if a bet won or lost based on prediction and actual result
   */
  evaluateBet(prediction, actualResult) {
    const propType = this.determinePropType(prediction);
    let actualOutcome = false;
    let targetValue = 0.5; // Default threshold

    switch (propType) {
      case 'HR':
        actualOutcome = parseInt(actualResult.HR || 0) > 0;
        targetValue = 0.5;
        break;
      case 'Hit':
        actualOutcome = parseInt(actualResult.H || 0) > 0;
        targetValue = 0.5;
        break;
      case 'Hits_1.5':
        actualOutcome = parseInt(actualResult.H || 0) > 1;
        targetValue = 1.5;
        break;
      case 'Hits_2.5':
        actualOutcome = parseInt(actualResult.H || 0) > 2;
        targetValue = 2.5;
        break;
      case 'RBI':
        actualOutcome = parseInt(actualResult.RBI || 0) > 0;
        targetValue = 0.5;
        break;
      case 'Runs':
        actualOutcome = parseInt(actualResult.R || 0) > 0;
        targetValue = 0.5;
        break;
      case 'Total_Bases':
        const totalBases = this.calculateTotalBases(actualResult);
        actualOutcome = totalBases > 1.5;
        targetValue = 1.5;
        break;
      default:
        return null;
    }

    const odds = this.parseOdds(prediction.odds?.american || '+300');
    const win = actualOutcome;
    const profit = win ? odds.profit : -1.0;
    const probability = prediction.confidenceScore / 100;
    const expectedValue = (probability * odds.profit) - ((1 - probability) * 1.0);

    return {
      actualOutcome,
      win,
      profit,
      expectedValue,
      odds: odds.decimal,
      propType,
      targetValue
    };
  }

  /**
   * Analyze validation results to generate summary statistics
   */
  analyzeValidationResults(validationResults) {
    if (!validationResults.length) {
      return this.getEmptyValidationResult();
    }

    // Overall metrics
    const totalBets = validationResults.length;
    const wins = validationResults.filter(bet => bet.betOutcome === 'Win').length;
    const totalProfit = validationResults.reduce((sum, bet) => sum + bet.profit, 0);
    const totalStake = validationResults.reduce((sum, bet) => sum + bet.stake, 0);

    // ROI calculation
    const roi = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0;
    const accuracy = totalBets > 0 ? (wins / totalBets) * 100 : 0;

    // Prop type analysis
    const propTypeAnalysis = this.analyzeByPropType(validationResults);

    // Confidence calibration
    const calibrationData = this.generateCalibrationCurve(validationResults);

    // Best performers
    const bestPerformers = this.findBestPerformers(validationResults);

    // Biggest misses
    const biggestMisses = this.findBiggestMisses(validationResults);

    return {
      summary: {
        totalBets,
        wins,
        losses: totalBets - wins,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalStake,
        roi: Math.round(roi * 100) / 100,
        accuracy: Math.round(accuracy * 100) / 100,
        averageBetSize: totalBets > 0 ? Math.round((totalStake / totalBets) * 100) / 100 : 0,
        profitableDays: this.countProfitableDays(validationResults)
      },
      propTypeAnalysis,
      calibrationData,
      bestPerformers,
      biggestMisses,
      dailyPerformance: this.generateDailyPerformance(validationResults),
      rawData: validationResults
    };
  }

  /**
   * Analyze performance by prop bet type
   */
  analyzeByPropType(results) {
    const propTypes = {};
    
    results.forEach(bet => {
      if (!propTypes[bet.predictionType]) {
        propTypes[bet.predictionType] = {
          totalBets: 0,
          wins: 0,
          profit: 0,
          stake: 0
        };
      }
      
      const prop = propTypes[bet.predictionType];
      prop.totalBets++;
      prop.stake += bet.stake;
      prop.profit += bet.profit;
      if (bet.betOutcome === 'Win') prop.wins++;
    });

    // Calculate metrics for each prop type
    Object.keys(propTypes).forEach(propType => {
      const prop = propTypes[propType];
      prop.accuracy = prop.totalBets > 0 ? (prop.wins / prop.totalBets) * 100 : 0;
      prop.roi = prop.stake > 0 ? (prop.profit / prop.stake) * 100 : 0;
      prop.averageProfit = prop.totalBets > 0 ? prop.profit / prop.totalBets : 0;
    });

    return Object.entries(propTypes)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.roi - a.roi);
  }

  /**
   * Generate calibration curve data
   */
  generateCalibrationCurve(results) {
    const bins = [
      { min: 0, max: 0.5, label: '0-50%' },
      { min: 0.5, max: 0.6, label: '50-60%' },
      { min: 0.6, max: 0.7, label: '60-70%' },
      { min: 0.7, max: 0.8, label: '70-80%' },
      { min: 0.8, max: 0.9, label: '80-90%' },
      { min: 0.9, max: 1.0, label: '90-100%' }
    ];

    return bins.map(bin => {
      const betsInBin = results.filter(bet => 
        bet.predictedConfidence > bin.min && bet.predictedConfidence <= bin.max
      );
      
      const actualAccuracy = betsInBin.length > 0 ? 
        betsInBin.filter(bet => bet.betOutcome === 'Win').length / betsInBin.length : 0;
      
      const avgPredictedConfidence = betsInBin.length > 0 ?
        betsInBin.reduce((sum, bet) => sum + bet.predictedConfidence, 0) / betsInBin.length : 0;

      return {
        label: bin.label,
        predictedConfidence: Math.round(avgPredictedConfidence * 100),
        actualAccuracy: Math.round(actualAccuracy * 100),
        betCount: betsInBin.length,
        calibrationError: Math.abs(avgPredictedConfidence - actualAccuracy) * 100
      };
    });
  }

  /**
   * Helper methods
   */
  getDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  normalizePlayerName(name) {
    return name?.toLowerCase().replace(/[^a-z\s]/g, '').trim() || '';
  }

  determinePropType(prediction) {
    const reasoning = prediction.reasoning?.toLowerCase() || '';
    
    if (reasoning.includes('home run') || reasoning.includes('hr')) return 'HR';
    if (reasoning.includes('multi-hit') || reasoning.includes('2+ hits')) return 'Hits_1.5';
    if (reasoning.includes('3+ hits')) return 'Hits_2.5';
    if (reasoning.includes('hit') && !reasoning.includes('multi')) return 'Hit';
    if (reasoning.includes('rbi')) return 'RBI';
    if (reasoning.includes('run') && !reasoning.includes('home')) return 'Runs';
    if (reasoning.includes('total bases')) return 'Total_Bases';
    
    return 'HR'; // Default to HR for historical compatibility
  }

  parseOdds(americanOdds) {
    const odds = parseInt(americanOdds.replace('+', ''));
    if (odds > 0) {
      return {
        decimal: (odds / 100) + 1,
        profit: odds / 100
      };
    } else {
      return {
        decimal: (100 / Math.abs(odds)) + 1,
        profit: 100 / Math.abs(odds)
      };
    }
  }

  calculateTotalBases(result) {
    const h = parseInt(result.H || 0);
    const hr = parseInt(result.HR || 0);
    // Simplified calculation - would need more detailed data for exact total bases
    return h + (hr * 3); // Approximate
  }

  countProfitableDays(results) {
    const dailyProfits = {};
    results.forEach(bet => {
      if (!dailyProfits[bet.date]) dailyProfits[bet.date] = 0;
      dailyProfits[bet.date] += bet.profit;
    });
    return Object.values(dailyProfits).filter(profit => profit > 0).length;
  }

  findBestPerformers(results) {
    return results
      .filter(bet => bet.betOutcome === 'Win' && bet.profit > 2)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)
      .map(bet => ({
        playerName: bet.playerName,
        date: bet.date,
        propType: bet.predictionType,
        confidence: Math.round(bet.predictedConfidence * 100),
        profit: bet.profit,
        odds: bet.odds
      }));
  }

  findBiggestMisses(results) {
    return results
      .filter(bet => bet.betOutcome === 'Loss' && bet.predictedConfidence > 0.8)
      .sort((a, b) => b.predictedConfidence - a.predictedConfidence)
      .slice(0, 10)
      .map(bet => ({
        playerName: bet.playerName,
        date: bet.date,
        propType: bet.predictionType,
        confidence: Math.round(bet.predictedConfidence * 100),
        reasoning: bet.reasoning?.substring(0, 100) + '...'
      }));
  }

  generateDailyPerformance(results) {
    const dailyData = {};
    
    results.forEach(bet => {
      if (!dailyData[bet.date]) {
        dailyData[bet.date] = {
          date: bet.date,
          totalBets: 0,
          wins: 0,
          profit: 0,
          stake: 0
        };
      }
      
      const day = dailyData[bet.date];
      day.totalBets++;
      day.stake += bet.stake;
      day.profit += bet.profit;
      if (bet.betOutcome === 'Win') day.wins++;
    });

    return Object.values(dailyData)
      .map(day => ({
        ...day,
        accuracy: day.totalBets > 0 ? (day.wins / day.totalBets) * 100 : 0,
        roi: day.stake > 0 ? (day.profit / day.stake) * 100 : 0
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getEmptyValidationResult() {
    return {
      summary: {
        totalBets: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        totalStake: 0,
        roi: 0,
        accuracy: 0,
        averageBetSize: 0,
        profitableDays: 0
      },
      propTypeAnalysis: [],
      calibrationData: [],
      bestPerformers: [],
      biggestMisses: [],
      dailyPerformance: [],
      rawData: []
    };
  }
}

const historicalValidationService = new HistoricalValidationService();
export default historicalValidationService;