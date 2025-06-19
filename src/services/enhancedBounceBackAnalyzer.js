/**
 * Enhanced Bounce Back Analyzer
 * 
 * Addresses the critical flaw in current bounce back analysis where players 
 * continue to get "bounce back potential" points despite repeated failures
 * to actually bounce back from poor performance.
 * 
 * Key Improvements:
 * - Tracks failed bounce back attempts and reduces future scores
 * - Implements rolling expectation that decreases with each failure
 * - Uses adaptive analysis windows to find meaningful patterns
 * - Compares current cold streaks to historical similar situations
 */

/**
 * Enhanced bounce back analysis with failure tracking
 */
function analyzeEnhancedBounceBackPatterns(gameHistory, playerName, options = {}) {
  const {
    minAnalysisWindow = 5,
    maxAnalysisWindow = 25,
    bounceBackLookAhead = 3,
    poorGameMultiplier = 0.7,
    bounceBackMultiplier = 1.2,
    strongBounceBackThreshold = 0.400
  } = options;

  if (gameHistory.length < minAnalysisWindow) {
    return {
      isReliablePattern: false,
      bounceBackPotential: 0,
      confidence: 0,
      reason: 'Insufficient game history'
    };
  }

  const playerSeasonAvg = gameHistory.reduce((sum, game) => sum + game.avg, 0) / gameHistory.length;
  const poorGameThreshold = Math.max(0.150, playerSeasonAvg * poorGameMultiplier);
  const bounceBackThreshold = playerSeasonAvg * bounceBackMultiplier;

  // Step 1: Identify current cold streak and failed bounce back attempts
  const currentSituation = analyzeCurrentColdStreak(gameHistory, poorGameThreshold, bounceBackThreshold);
  
  // Step 2: Find historical similar cold streaks for pattern matching
  const historicalPatterns = findSimilarHistoricalStreaks(
    gameHistory, 
    currentSituation, 
    poorGameThreshold, 
    bounceBackThreshold,
    maxAnalysisWindow
  );

  // Step 3: Calculate bounce back potential with failure penalty
  const bounceBackAnalysis = calculateEnhancedBounceBackPotential(
    currentSituation,
    historicalPatterns,
    playerSeasonAvg,
    strongBounceBackThreshold
  );

  return {
    ...bounceBackAnalysis,
    currentSituation,
    historicalPatterns,
    playerSeasonAvg,
    thresholds: {
      poorGame: poorGameThreshold,
      bounceBack: bounceBackThreshold,
      strongBounceBack: strongBounceBackThreshold
    }
  };
}

/**
 * Analyze current cold streak and failed bounce back attempts
 */
function analyzeCurrentColdStreak(gameHistory, poorGameThreshold, bounceBackThreshold) {
  const recentGames = gameHistory.slice(-10); // Look at last 10 games
  let currentColdStreak = 0;
  let failedBounceBackAttempts = 0;
  let totalBounceBackOpportunities = 0;
  let lastGoodGame = null;
  let consecutivePoorGames = 0;

  // Count consecutive poor games from the end
  for (let i = recentGames.length - 1; i >= 0; i--) {
    const game = recentGames[i];
    if (game.atBats >= 2) {
      if (game.avg <= poorGameThreshold) {
        consecutivePoorGames++;
        currentColdStreak++;
      } else {
        break;
      }
    }
  }

  // Analyze failed bounce back attempts in recent games
  for (let i = 0; i < recentGames.length - 1; i++) {
    const game = recentGames[i];
    if (game.atBats >= 2 && game.avg <= poorGameThreshold) {
      totalBounceBackOpportunities++;
      
      // Check if next few games had a bounce back
      const nextGames = recentGames.slice(i + 1, Math.min(i + 4, recentGames.length));
      const hadBounceBack = nextGames.some(g => g.avg >= bounceBackThreshold);
      
      if (!hadBounceBack && nextGames.length > 0) {
        failedBounceBackAttempts++;
      }
    }
  }

  // Find last good game
  for (let i = recentGames.length - 1; i >= 0; i--) {
    const game = recentGames[i];
    if (game.atBats >= 2 && game.avg >= bounceBackThreshold) {
      lastGoodGame = {
        ...game,
        daysAgo: recentGames.length - 1 - i
      };
      break;
    }
  }

  return {
    currentColdStreak,
    consecutivePoorGames,
    failedBounceBackAttempts,
    totalBounceBackOpportunities,
    failureRate: totalBounceBackOpportunities > 0 ? failedBounceBackAttempts / totalBounceBackOpportunities : 0,
    lastGoodGame,
    daysSinceGoodGame: lastGoodGame ? lastGoodGame.daysAgo : recentGames.length
  };
}

/**
 * Find similar historical cold streaks for pattern matching
 */
function findSimilarHistoricalStreaks(gameHistory, currentSituation, poorGameThreshold, bounceBackThreshold, maxWindow) {
  const historicalStreaks = [];
  let analysisWindow = Math.min(maxWindow, gameHistory.length - 5); // Reserve last 5 games as current
  
  // Adaptive window - extend if not enough patterns found
  while (historicalStreaks.length < 3 && analysisWindow >= 10) {
    const historicalGames = gameHistory.slice(0, -5); // Exclude recent games
    
    for (let i = 0; i < historicalGames.length - currentSituation.currentColdStreak; i++) {
      const potential = historicalGames.slice(i, i + currentSituation.currentColdStreak);
      
      // Check if this sequence matches current cold streak pattern
      if (potential.length === currentSituation.currentColdStreak) {
        const allPoor = potential.every(g => g.atBats >= 2 && g.avg <= poorGameThreshold);
        
        if (allPoor) {
          // Analyze what happened after this historical cold streak
          const afterStreak = historicalGames.slice(i + currentSituation.currentColdStreak, i + currentSituation.currentColdStreak + 5);
          const resolution = analyzeStreakResolution(afterStreak, bounceBackThreshold);
          
          historicalStreaks.push({
            startIndex: i,
            streak: potential,
            resolution,
            similarity: calculateStreakSimilarity(potential, gameHistory.slice(-currentSituation.currentColdStreak))
          });
        }
      }
    }
    
    analysisWindow += 5; // Extend window if needed
  }

  return historicalStreaks.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}

/**
 * Analyze how a historical cold streak was resolved
 */
function analyzeStreakResolution(afterStreakGames, bounceBackThreshold) {
  if (afterStreakGames.length === 0) {
    return { type: 'unknown', gamesUntilBounceBack: null, strength: 'none' };
  }

  let gamesUntilBounceBack = null;
  let maxBounceBackStrength = 0;

  for (let i = 0; i < afterStreakGames.length; i++) {
    const game = afterStreakGames[i];
    if (game.atBats >= 2 && game.avg >= bounceBackThreshold) {
      if (gamesUntilBounceBack === null) {
        gamesUntilBounceBack = i + 1;
      }
      maxBounceBackStrength = Math.max(maxBounceBackStrength, game.avg);
    }
  }

  const strength = maxBounceBackStrength >= 0.400 ? 'strong' :
                   maxBounceBackStrength >= bounceBackThreshold ? 'moderate' : 'weak';

  return {
    type: gamesUntilBounceBack !== null ? 'bounced_back' : 'continued_struggle',
    gamesUntilBounceBack,
    strength,
    maxAverage: maxBounceBackStrength,
    immediateRecovery: gamesUntilBounceBack === 1
  };
}

/**
 * Calculate similarity between current and historical cold streaks
 */
function calculateStreakSimilarity(historical, current) {
  if (historical.length !== current.length) return 0;

  let similarity = 0;
  for (let i = 0; i < historical.length; i++) {
    const avgDiff = Math.abs(historical[i].avg - current[i].avg);
    const abDiff = Math.abs(historical[i].atBats - current[i].atBats);
    
    // Similarity based on performance and usage patterns
    const gameSimilarity = Math.max(0, 1 - (avgDiff * 2) - (abDiff * 0.1));
    similarity += gameSimilarity;
  }

  return similarity / historical.length;
}

/**
 * Calculate enhanced bounce back potential with failure penalties
 */
function calculateEnhancedBounceBackPotential(currentSituation, historicalPatterns, playerSeasonAvg, strongThreshold) {
  let baseBounceBackPotential = 0.5; // Start with neutral expectation
  let confidence = 0.3; // Start with low confidence
  const reasons = [];
  const warnings = [];

  // Historical pattern analysis
  if (historicalPatterns.length > 0) {
    const successfulBounces = historicalPatterns.filter(p => p.resolution.type === 'bounced_back').length;
    const historicalSuccessRate = successfulBounces / historicalPatterns.length;
    
    baseBounceBackPotential = historicalSuccessRate;
    confidence += 0.3; // Historical data increases confidence
    
    reasons.push(`Historical pattern: ${(historicalSuccessRate * 100).toFixed(1)}% bounce back rate in similar ${currentSituation.currentColdStreak}-game cold streaks`);
    
    // Analyze typical recovery timeframe
    const successfulPatterns = historicalPatterns.filter(p => p.resolution.type === 'bounced_back');
    if (successfulPatterns.length > 0) {
      const avgRecoveryTime = successfulPatterns.reduce((sum, p) => sum + p.resolution.gamesUntilBounceBack, 0) / successfulPatterns.length;
      reasons.push(`Typically bounces back within ${avgRecoveryTime.toFixed(1)} games`);
    }
  }

  // Apply failure penalty - THIS IS THE KEY ENHANCEMENT
  const failurePenalty = currentSituation.failedBounceBackAttempts * 0.15; // 15% penalty per failed attempt
  baseBounceBackPotential = Math.max(0.1, baseBounceBackPotential - failurePenalty);
  
  if (currentSituation.failedBounceBackAttempts > 0) {
    warnings.push(`${currentSituation.failedBounceBackAttempts} recent failed bounce back attempts - reduced potential`);
  }

  // Cold streak length penalty
  if (currentSituation.consecutivePoorGames >= 5) {
    const streakPenalty = (currentSituation.consecutivePoorGames - 4) * 0.08; // 8% penalty per game beyond 4
    baseBounceBackPotential = Math.max(0.05, baseBounceBackPotential - streakPenalty);
    warnings.push(`Extended ${currentSituation.consecutivePoorGames}-game cold streak - significantly reduced potential`);
  }

  // Days since good game penalty
  if (currentSituation.daysSinceGoodGame >= 7) {
    const stalePenalty = Math.min(0.2, (currentSituation.daysSinceGoodGame - 6) * 0.03);
    baseBounceBackPotential = Math.max(0.05, baseBounceBackPotential - stalePenalty);
    warnings.push(`${currentSituation.daysSinceGoodGame} days since good game - stale situation`);
  }

  // Confidence adjustments
  if (currentSituation.failureRate > 0.6) {
    confidence = Math.max(0.1, confidence - 0.3);
    warnings.push(`High recent failure rate (${(currentSituation.failureRate * 100).toFixed(1)}%) - low confidence`);
  }

  // Determine overall classification
  let classification = 'avoid';
  if (baseBounceBackPotential >= 0.6 && confidence >= 0.7) {
    classification = 'strong_bounce_back_candidate';
  } else if (baseBounceBackPotential >= 0.4 && confidence >= 0.5) {
    classification = 'moderate_bounce_back_candidate';
  } else if (baseBounceBackPotential >= 0.25) {
    classification = 'weak_bounce_back_candidate';
  }

  return {
    bounceBackPotential: baseBounceBackPotential,
    confidence,
    classification,
    isReliablePattern: confidence >= 0.5 && historicalPatterns.length >= 2,
    reasons,
    warnings,
    score: baseBounceBackPotential * confidence * 100, // 0-100 scale
    recommendAction: classification !== 'avoid'
  };
}

/**
 * Generate explanatory summary for bounce back analysis
 */
function generateBounceBackSummary(analysis) {
  const { currentSituation, classification, bounceBackPotential, confidence, reasons, warnings } = analysis;
  
  let summary = `${currentSituation.consecutivePoorGames}-game cold streak`;
  
  if (currentSituation.failedBounceBackAttempts > 0) {
    summary += `, ${currentSituation.failedBounceBackAttempts} failed bounce back attempts`;
  }
  
  summary += `. ${classification.replace(/_/g, ' ')}: ${(bounceBackPotential * 100).toFixed(1)}% potential`;
  
  if (confidence < 0.5) {
    summary += ' (low confidence)';
  }

  return {
    summary,
    recommendation: classification === 'avoid' ? 
      'Avoid - extended cold streak with repeated bounce back failures' :
      `${classification.replace(/_/g, ' ')} - monitor for ${currentSituation.daysSinceGoodGame >= 5 ? 'any positive signs' : 'bounce back opportunity'}`,
    keyFactors: reasons.slice(0, 2),
    riskFactors: warnings
  };
}

module.exports = {
  analyzeEnhancedBounceBackPatterns,
  generateBounceBackSummary,
  analyzeCurrentColdStreak,
  findSimilarHistoricalStreaks
};