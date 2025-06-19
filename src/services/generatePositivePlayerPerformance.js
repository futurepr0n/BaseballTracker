/**
 * generatePositivePlayerPerformance.js
 * 
 * This script analyzes player data to predict when players are likely to have
 * exceptional positive performances based on various momentum and situational patterns.
 * 
 * Patterns analyzed:
 * - Hot streaks and momentum continuation
 * - Post-rest excellence patterns
 * - ENHANCED Bounce-back performance after struggles (with failure tracking)
 * - Home comfort and series advantages
 * - Travel advantages over opponents
 * - Favorable matchup situations
 * - Team momentum and confidence factors
 * - Historical breakout patterns
 * - Weather and stadium advantages
 * 
 * CRITICAL ENHANCEMENT: Bounce back analysis now tracks failed attempts and reduces
 * potential scores for players who repeatedly fail to bounce back from cold streaks.
 */

const fs = require('fs');
const path = require('path');

// Import travel analysis utilities
const {
  getTeamDistance,
  categorizeTravelDistance,
  getTimezoneDifference,
  assessTravelDifficulty,
  TEAM_TO_STADIUM
} = require('./stadiumCoordinates');

// Import enhanced bounce back analyzer
const {
  analyzeEnhancedBounceBackPatterns,
  generateBounceBackSummary
} = require('./enhancedBounceBackAnalyzer');
console.log('✅ Positive momentum analysis enabled - stadium coordinates loaded');

// Configuration
const ROSTER_PATH = path.join(__dirname, '../../public/data/rosters.json');
const SEASON_DATA_DIR = path.join(__dirname, '../../public/data/2025');
const OUTPUT_DIR = path.join(__dirname, '../../public/data/predictions');

// Positive performance thresholds
const POSITIVE_PERFORMANCE_THRESHOLDS = {
  MIN_GAMES_ANALYSIS: 15,        // Minimum games to analyze patterns
  HOT_STREAK_THRESHOLD: 3,       // Games in hitting streak
  EXCEPTIONAL_GAME_THRESHOLD: 0.400, // Above this AVG considered exceptional
  REST_DAYS_ANALYSIS: [1, 2, 3, 4, 5], // Rest day patterns to analyze
  HOME_SERIES_ADVANTAGE: 2,      // 2nd+ series at home
  BOUNCE_BACK_LOOKBACK: 3,       // Games to look back for bounce-back patterns
  TEAM_MOMENTUM_GAMES: 5,        // Games to analyze team momentum
  CONFIDENCE_BUILDER_DAYS: 7     // Days to look back for confidence events
};

/**
 * Read JSON file safely
 */
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

/**
 * Write JSON file safely
 */
function writeJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return false;
  }
}

/**
 * Calculate player's season average for comparison
 */
function getPlayerSeasonAverage(playerName, team, seasonData) {
  const sortedDates = Object.keys(seasonData).sort();
  let totalHits = 0;
  let totalABs = 0;
  
  sortedDates.forEach(dateStr => {
    const dayData = seasonData[dateStr];
    const playerData = dayData.players?.find(p => p.name === playerName && p.team === team);
    
    if (playerData && playerData.AB > 0) {
      totalHits += Number(playerData.H) || 0;
      totalABs += Number(playerData.AB) || 0;
    }
  });
  
  return totalABs > 0 ? totalHits / totalABs : 0;
}

/**
 * Load all season data from monthly directories
 */
function loadAllSeasonData() {
  const allData = {};
  
  try {
    const monthDirs = fs.readdirSync(SEASON_DATA_DIR).filter(dir => 
      fs.statSync(path.join(SEASON_DATA_DIR, dir)).isDirectory()
    );
    
    monthDirs.forEach(monthDir => {
      const monthPath = path.join(SEASON_DATA_DIR, monthDir);
      const files = fs.readdirSync(monthPath).filter(file => file.endsWith('.json'));
      
      files.forEach(file => {
        const filePath = path.join(monthPath, file);
        const data = readJsonFile(filePath);
        if (data && data.date) {
          allData[data.date] = data;
        }
      });
    });
    
    console.log(`Loaded data for ${Object.keys(allData).length} dates`);
    return allData;
  } catch (error) {
    console.error('Error loading season data:', error);
    return {};
  }
}

/**
 * Analyze hitting streaks and hot momentum - PLAYER-SPECIFIC ANALYSIS
 */
function analyzeHotStreaks(playerName, team, seasonData) {
  const sortedDates = Object.keys(seasonData).sort();
  const gameHistory = [];
  let currentStreak = 0;
  const streakPatterns = new Map(); // streak length -> continuation data
  
  sortedDates.forEach(dateStr => {
    const dayData = seasonData[dateStr];
    const playerData = dayData.players?.find(p => p.name === playerName && p.team === team);
    
    if (playerData && playerData.AB > 0) {
      const hits = Number(playerData.H) || 0;
      const atBats = Number(playerData.AB) || 0;
      const hasHit = hits > 0;
      
      if (hasHit) {
        currentStreak++;
      } else {
        // Analyze completed streak
        if (currentStreak >= 2) {
          if (!streakPatterns.has(currentStreak)) {
            streakPatterns.set(currentStreak, { continued: 0, ended: 0 });
          }
          streakPatterns.get(currentStreak).ended++;
        }
        currentStreak = 0;
      }
      
      gameHistory.push({
        date: dateStr,
        hits,
        atBats,
        avg: hits / atBats,
        hasHit,
        streakLength: currentStreak
      });
    }
  });
  
  // Calculate streak continuation patterns
  gameHistory.forEach((game, index) => {
    if (game.streakLength >= 2 && index < gameHistory.length - 1) {
      const nextGame = gameHistory[index + 1];
      if (nextGame.hasHit) {
        if (!streakPatterns.has(game.streakLength)) {
          streakPatterns.set(game.streakLength, { continued: 0, ended: 0 });
        }
        streakPatterns.get(game.streakLength).continued++;
      }
    }
  });
  
  const streakAnalysis = {};
  for (const [streakLength, data] of streakPatterns) {
    const total = data.continued + data.ended;
    if (total >= 3) {
      streakAnalysis[streakLength] = {
        continuationRate: data.continued / total,
        totalOccurrences: total,
        isReliablePattern: total >= 5
      };
    }
  }
  
  return {
    gameHistory,
    currentStreak,
    playerSpecificStreakPatterns: streakAnalysis,
    longestStreak: Math.max(...gameHistory.map(g => g.streakLength), 0)
  };
}

/**
 * Analyze post-rest excellence patterns - PLAYER-SPECIFIC ANALYSIS
 */
function analyzePostRestExcellence(gameHistory, playerName) {
  const playerSeasonAvg = gameHistory.reduce((sum, game) => sum + game.avg, 0) / Math.max(gameHistory.length, 1);
  const restDayPatterns = {};
  
  gameHistory.forEach((game, index) => {
    if (index === 0) return;
    
    const prevGame = gameHistory[index - 1];
    const currentDate = new Date(game.date);
    const prevDate = new Date(prevGame.date);
    const restDays = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24)) - 1;
    
    if (restDays >= 1 && restDays <= 7) {
      if (!restDayPatterns[restDays]) {
        restDayPatterns[restDays] = {
          games: [],
          avgPerformance: 0,
          excellentGamesPct: 0,
          performanceVsSeasonAvg: 0
        };
      }
      restDayPatterns[restDays].games.push(game);
    }
  });
  
  // Calculate post-rest performance metrics
  Object.keys(restDayPatterns).forEach(restDays => {
    const pattern = restDayPatterns[restDays];
    if (pattern.games.length >= 3) {
      const totalHits = pattern.games.reduce((sum, game) => sum + game.hits, 0);
      const totalABs = pattern.games.reduce((sum, game) => sum + game.atBats, 0);
      pattern.avgPerformance = totalHits / Math.max(totalABs, 1);
      
      // Excellence threshold: significantly above player's season average
      const excellenceThreshold = Math.max(0.300, playerSeasonAvg * 1.3);
      const excellentGames = pattern.games.filter(game => game.avg >= excellenceThreshold);
      pattern.excellentGamesPct = excellentGames.length / pattern.games.length;
      
      pattern.performanceVsSeasonAvg = pattern.avgPerformance - playerSeasonAvg;
      pattern.isExcellencePattern = pattern.performanceVsSeasonAvg > 0.050; // 50+ points above season avg
      pattern.sampleSize = pattern.games.length;
    }
  });
  
  return restDayPatterns;
}

/**
 * Analyze bounce-back patterns after poor performance - PLAYER-SPECIFIC ANALYSIS
 */
// LEGACY FUNCTION - REPLACED BY ENHANCED BOUNCE BACK ANALYZER
// This function had a critical flaw: it didn't penalize repeated failed bounce back attempts
// Players could have 10 straight poor games and still get the same "bounce back potential"
// 
// function analyzeBounceBackPatterns(gameHistory, playerName) {
//   // ... old implementation commented out
//   // SEE enhancedBounceBackAnalyzer.js for improved logic that tracks failures
// }

/**
 * ENHANCED BOUNCE BACK ANALYSIS - Key Improvements:
 * 1. Tracks failed bounce back attempts and reduces scores accordingly
 * 2. Uses adaptive analysis windows to find meaningful patterns
 * 3. Compares current cold streaks to similar historical situations
 * 4. Implements rolling expectation that decreases with each failure
 * 5. Provides detailed explanations for why bounce back is/isn't likely
 */

/**
 * Analyze home field advantages and series positioning
 */
function analyzeHomeFieldAdvantages(playerName, team, seasonData) {
  const sortedDates = Object.keys(seasonData).sort();
  let homeSeriesCount = 0;
  let isCurrentlyAtHome = false;
  const homeSeriesPerformance = { 1: [], 2: [], 3: [], 4: [] };
  
  for (let i = 0; i < sortedDates.length; i++) {
    const dateStr = sortedDates[i];
    const dayData = seasonData[dateStr];
    const playerData = dayData.players?.find(p => p.name === playerName && p.team === team);
    
    if (playerData && playerData.AB > 0) {
      const teamGames = dayData.games?.filter(game => 
        game.homeTeam === team || game.awayTeam === team
      ) || [];
      
      const isHomeGame = teamGames.some(game => game.homeTeam === team);
      
      if (isHomeGame) {
        if (!isCurrentlyAtHome) {
          homeSeriesCount++;
          isCurrentlyAtHome = true;
        }
        
        if (homeSeriesCount >= 2 && homeSeriesCount <= 4) {
          const gamePerformance = {
            date: dateStr,
            hits: Number(playerData.H) || 0,
            atBats: Number(playerData.AB) || 0,
            avg: Number(playerData.H) / Number(playerData.AB) || 0,
            seriesNumber: homeSeriesCount
          };
          
          if (homeSeriesPerformance[homeSeriesCount]) {
            homeSeriesPerformance[homeSeriesCount].push(gamePerformance);
          }
        }
      } else {
        isCurrentlyAtHome = false;
      }
    }
  }
  
  // Calculate performance in 2nd+ home series
  const secondPlusSeriesGames = [
    ...homeSeriesPerformance[2],
    ...homeSeriesPerformance[3], 
    ...homeSeriesPerformance[4]
  ];
  
  const avgInSecondPlusSeries = secondPlusSeriesGames.length > 0 ?
    secondPlusSeriesGames.reduce((sum, game) => sum + game.avg, 0) / secondPlusSeriesGames.length : 0;
  
  return {
    homeSeriesPerformance,
    secondPlusSeriesGames: secondPlusSeriesGames.length,
    avgInSecondPlusSeries,
    currentHomeSeriesNumber: isCurrentlyAtHome ? homeSeriesCount : 0
  };
}

/**
 * Analyze opponent travel disadvantages and momentum
 */
function analyzeOpponentDisadvantages(team, seasonData, todaysGameContext) {
  if (!todaysGameContext || !todaysGameContext.opposingTeam) return null;
  
  const opposingTeam = todaysGameContext.opposingTeam;
  const sortedDates = Object.keys(seasonData).sort();
  const recentDates = sortedDates.slice(-7);
  
  let opponentLastLocation = null;
  let opponentLastGame = null;
  let opponentRecentLosses = 0;
  let opponentBlowoutLosses = 0;
  
  // Analyze opponent's recent travel and performance
  for (let i = recentDates.length - 1; i >= 0; i--) {
    const dateStr = recentDates[i];
    const dayData = seasonData[dateStr];
    
    const opponentGames = dayData.games?.filter(game => 
      game.homeTeam === opposingTeam || game.awayTeam === opposingTeam
    ) || [];
    
    if (opponentGames.length > 0) {
      const game = opponentGames[0];
      const opponentWasHome = game.homeTeam === opposingTeam;
      const opponentScore = opponentWasHome ? game.homeScore : game.awayScore;
      const otherScore = opponentWasHome ? game.awayScore : game.homeScore;
      
      if (!opponentLastGame) {
        opponentLastGame = {
          date: dateStr,
          location: opponentWasHome ? opposingTeam : (opponentWasHome ? game.awayTeam : game.homeTeam),
          won: opponentScore > otherScore,
          scoreDiff: opponentScore - otherScore
        };
        opponentLastLocation = opponentLastGame.location;
      }
      
      // Count recent losses and blowouts
      if (opponentScore < otherScore) {
        opponentRecentLosses++;
        if (otherScore - opponentScore >= 5) {
          opponentBlowoutLosses++;
        }
      }
    }
  }
  
  // Calculate travel burden for opponent
  let opponentTravelBurden = null;
  if (opponentLastLocation && todaysGameContext.isAwayGame === false) {
    // Opponent is visiting us
    const travelDistance = getTeamDistance(opponentLastLocation, team);
    const timezoneDiff = getTimezoneDifference(
      TEAM_TO_STADIUM[opponentLastLocation],
      TEAM_TO_STADIUM[team]
    );
    
    opponentTravelBurden = {
      distance: travelDistance,
      timezoneDiff,
      difficulty: assessTravelDifficulty(travelDistance, timezoneDiff)
    };
  }
  
  return {
    opponentRecentLosses,
    opponentBlowoutLosses,
    opponentTravelBurden,
    opponentLastGame,
    hasNegativeMomentum: opponentRecentLosses >= 3 || opponentBlowoutLosses >= 1
  };
}

/**
 * Analyze team momentum and confidence factors
 */
function analyzeTeamMomentum(team, seasonData) {
  const sortedDates = Object.keys(seasonData).sort();
  const recentDates = sortedDates.slice(-POSITIVE_PERFORMANCE_THRESHOLDS.TEAM_MOMENTUM_GAMES);
  
  let teamWins = 0;
  let teamBlowoutWins = 0;
  const recentGames = [];
  
  recentDates.forEach(dateStr => {
    const dayData = seasonData[dateStr];
    const teamGames = dayData.games?.filter(game => 
      game.homeTeam === team || game.awayTeam === team
    ) || [];
    
    if (teamGames.length > 0) {
      const game = teamGames[0];
      const teamWasHome = game.homeTeam === team;
      const teamScore = teamWasHome ? game.homeScore : game.awayScore;
      const otherScore = teamWasHome ? game.awayScore : game.homeScore;
      
      const won = teamScore > otherScore;
      const scoreDiff = teamScore - otherScore;
      
      if (won) {
        teamWins++;
        if (scoreDiff >= 5) {
          teamBlowoutWins++;
        }
      }
      
      recentGames.push({
        date: dateStr,
        won,
        scoreDiff,
        wasBlowout: Math.abs(scoreDiff) >= 5
      });
    }
  });
  
  const winRate = recentGames.length > 0 ? teamWins / recentGames.length : 0;
  
  return {
    recentWins: teamWins,
    recentGames: recentGames.length,
    winRate,
    blowoutWins: teamBlowoutWins,
    hasPositiveMomentum: winRate >= 0.6 || teamBlowoutWins >= 1
  };
}

/**
 * Analyze player's current context to ensure factors only apply when contextually relevant
 */
function analyzePlayerCurrentContext(playerName, team, seasonData) {
  const sortedDates = Object.keys(seasonData).sort();
  const gameHistory = [];
  
  // Build comprehensive game history
  sortedDates.forEach(dateStr => {
    const dayData = seasonData[dateStr];
    const playerData = dayData.players?.find(p => p.name === playerName && p.team === team);
    
    if (playerData && playerData.AB > 0) {
      const hits = Number(playerData.H) || 0;
      const atBats = Number(playerData.AB) || 0;
      
      gameHistory.push({
        date: dateStr,
        hits,
        atBats,
        avg: hits / atBats,
        hasHit: hits > 0
      });
    }
  });
  
  if (gameHistory.length === 0) {
    return {
      actuallyRested: false,
      restDays: 0,
      hadRecentPoorPerformance: false,
      hadRecentExceptionalPerformance: false,
      gamesPlayedInLast7Days: 0,
      lastPoorGameDate: null
    };
  }
  
  // Calculate player's season average for comparison
  const playerSeasonAvg = gameHistory.reduce((sum, game) => sum + game.avg, 0) / gameHistory.length;
  
  // 1. Determine if player actually rested since last game
  let actuallyRested = false;
  let restDays = 0;
  
  if (gameHistory.length >= 2) {
    const lastGame = gameHistory[gameHistory.length - 1];
    const previousGame = gameHistory[gameHistory.length - 2];
    
    const lastDate = new Date(lastGame.date);
    const prevDate = new Date(previousGame.date);
    const daysDiff = Math.floor((lastDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 1) {
      actuallyRested = true;
      restDays = daysDiff - 1; // Subtract 1 to get actual rest days
    }
  }
  
  // 2. Check for recent poor vs exceptional performance (last 3 games)
  const recentGames = gameHistory.slice(-3);
  const poorGameThreshold = Math.max(0.150, playerSeasonAvg * 0.7); // 30% below season avg or .150, whichever is higher
  const exceptionalGameThreshold = Math.max(0.400, playerSeasonAvg * 1.5); // 50% above season avg or .400, whichever is higher
  
  let hadRecentPoorPerformance = false;
  let hadRecentExceptionalPerformance = false;
  let lastPoorGameDate = null;
  
  recentGames.forEach(game => {
    if (game.atBats >= 2) { // Only count games with meaningful at-bats
      if (game.avg <= poorGameThreshold) {
        hadRecentPoorPerformance = true;
        if (!lastPoorGameDate || game.date > lastPoorGameDate) {
          lastPoorGameDate = game.date;
        }
      }
      
      if (game.avg >= exceptionalGameThreshold || game.hits >= 3) {
        hadRecentExceptionalPerformance = true;
      }
    }
  });
  
  // 3. Track roster activity in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  
  const gamesPlayedInLast7Days = gameHistory.filter(game => game.date >= sevenDaysAgoStr).length;
  
  return {
    actuallyRested,
    restDays,
    hadRecentPoorPerformance,
    hadRecentExceptionalPerformance,
    gamesPlayedInLast7Days,
    lastPoorGameDate,
    playerSeasonAvg,
    recentGames: recentGames.length,
    totalGamesAnalyzed: gameHistory.length
  };
}

/**
 * Calculate comprehensive positive performance score with CONTEXTUAL ACCURACY
 */
function calculatePositivePerformanceScore(player, seasonData, todaysGameContext) {
  const hotStreakAnalysis = analyzeHotStreaks(player.name, player.team, seasonData);
  
  if (hotStreakAnalysis.gameHistory.length < POSITIVE_PERFORMANCE_THRESHOLDS.MIN_GAMES_ANALYSIS) {
    return null; // Not enough data
  }
  
  // Get contextual information about player's recent activity
  const playerContext = analyzePlayerCurrentContext(player.name, player.team, seasonData);
  
  const postRestPatterns = analyzePostRestExcellence(hotStreakAnalysis.gameHistory, player.name);
  const bounceBackAnalysis = analyzeEnhancedBounceBackPatterns(hotStreakAnalysis.gameHistory, player.name);
  const homeFieldAnalysis = analyzeHomeFieldAdvantages(player.name, player.team, seasonData);
  const opponentAnalysis = analyzeOpponentDisadvantages(player.team, seasonData, todaysGameContext);
  const teamMomentumAnalysis = analyzeTeamMomentum(player.team, seasonData);
  
  let positiveScore = 0;
  const positiveFactors = [];
  const contextualWarnings = [];
  
  // Factor 1: Hot streak momentum
  if (hotStreakAnalysis.currentStreak >= POSITIVE_PERFORMANCE_THRESHOLDS.HOT_STREAK_THRESHOLD) {
    const streakPattern = hotStreakAnalysis.playerSpecificStreakPatterns[hotStreakAnalysis.currentStreak];
    if (streakPattern && streakPattern.isReliablePattern && streakPattern.continuationRate > 0.5) {
      const streakBonus = Math.min(30, streakPattern.continuationRate * 40);
      positiveScore += streakBonus;
      positiveFactors.push({
        type: 'hot_streak_momentum',
        description: `${hotStreakAnalysis.currentStreak}-game hitting streak with ${(streakPattern.continuationRate * 100).toFixed(1)}% historical continuation rate`,
        positivePoints: streakBonus,
        continuationRate: streakPattern.continuationRate,
        sampleSize: streakPattern.totalOccurrences
      });
    }
  }
  
  // Factor 2: Post-rest excellence - ONLY if player actually rested
  if (playerContext.actuallyRested && playerContext.restDays >= 1) {
    const restPattern = postRestPatterns[playerContext.restDays];
    if (restPattern && restPattern.isExcellencePattern) {
      const restBonus = Math.min(25, restPattern.excellentGamesPct * 35);
      positiveScore += restBonus;
      positiveFactors.push({
        type: 'post_rest_excellence',
        description: `Excels after ${playerContext.restDays} day rest - ${(restPattern.performanceVsSeasonAvg * 1000).toFixed(0)} pts above season avg`,
        positivePoints: restBonus,
        excellentGameRate: restPattern.excellentGamesPct,
        performanceBoost: restPattern.performanceVsSeasonAvg,
        sampleSize: restPattern.sampleSize,
        actualRestDays: playerContext.restDays
      });
    }
  }
  
  // Factor 3: ENHANCED Bounce-back potential - WITH FAILURE TRACKING
  if (playerContext.hadRecentPoorPerformance && !playerContext.hadRecentExceptionalPerformance) {
    if (bounceBackAnalysis.recommendAction && bounceBackAnalysis.confidence >= 0.3) {
      // Use the enhanced scoring system that penalizes failed attempts
      const bounceBackBonus = Math.min(25, bounceBackAnalysis.score * 0.3); // Scale the 0-100 score
      
      if (bounceBackBonus > 5) { // Only add if meaningful bonus
        positiveScore += bounceBackBonus;
        
        const summary = generateBounceBackSummary(bounceBackAnalysis);
        positiveFactors.push({
          type: 'enhanced_bounce_back_potential',
          description: summary.recommendation,
          positivePoints: bounceBackBonus,
          bounceBackPotential: bounceBackAnalysis.bounceBackPotential,
          confidence: bounceBackAnalysis.confidence,
          classification: bounceBackAnalysis.classification,
          failedAttempts: bounceBackAnalysis.currentSituation.failedBounceBackAttempts,
          coldStreakLength: bounceBackAnalysis.currentSituation.consecutivePoorGames,
          lastPoorGame: playerContext.lastPoorGameDate,
          keyFactors: summary.keyFactors,
          warnings: summary.riskFactors
        });
      }
      
      // Add warnings for concerning patterns
      if (bounceBackAnalysis.currentSituation.failedBounceBackAttempts >= 2) {
        contextualWarnings.push(`⚠️ ${bounceBackAnalysis.currentSituation.failedBounceBackAttempts} recent failed bounce back attempts - reduced confidence`);
      }
      
      if (bounceBackAnalysis.currentSituation.consecutivePoorGames >= 5) {
        contextualWarnings.push(`⚠️ Extended ${bounceBackAnalysis.currentSituation.consecutivePoorGames}-game cold streak - avoid until signs of recovery`);
      }
    } else {
      // Explicitly warn against bounce back expectations when pattern is poor
      contextualWarnings.push(`❌ Bounce back unlikely - ${bounceBackAnalysis.warnings?.join(', ') || 'poor historical pattern with recent failures'}`);
    }
  } else if (playerContext.hadRecentExceptionalPerformance) {
    contextualWarnings.push('Recent exceptional performance - bounce-back analysis not applicable');
  }
  
  // Factor 4: Home field advantage (2nd+ series)
  if (todaysGameContext && !todaysGameContext.isAwayGame && homeFieldAnalysis.currentHomeSeriesNumber >= 2) {
    const homeBonus = Math.min(15, homeFieldAnalysis.avgInSecondPlusSeries * 50);
    if (homeBonus > 5) {
      positiveScore += homeBonus;
      positiveFactors.push({
        type: 'home_series_advantage',
        description: `Game ${homeFieldAnalysis.currentHomeSeriesNumber} of home stand - rested vs traveling opponent`,
        positivePoints: homeBonus,
        homeSeriesNumber: homeFieldAnalysis.currentHomeSeriesNumber,
        avgInSecondPlusSeries: homeFieldAnalysis.avgInSecondPlusSeries
      });
    }
  }
  
  // Factor 5: Opponent disadvantages
  if (opponentAnalysis && opponentAnalysis.hasNegativeMomentum) {
    let opponentDisadvantageBonus = 0;
    
    if (opponentAnalysis.opponentBlowoutLosses >= 1) {
      opponentDisadvantageBonus += 15;
    } else if (opponentAnalysis.opponentRecentLosses >= 3) {
      opponentDisadvantageBonus += 10;
    }
    
    if (opponentAnalysis.opponentTravelBurden && opponentAnalysis.opponentTravelBurden.difficulty.level === 'high') {
      opponentDisadvantageBonus += 12;
    }
    
    if (opponentDisadvantageBonus > 0) {
      positiveScore += opponentDisadvantageBonus;
      positiveFactors.push({
        type: 'opponent_disadvantage',
        description: `Opponent momentum/travel disadvantage - ${opponentAnalysis.opponentRecentLosses} recent losses, ${opponentAnalysis.opponentTravelBurden?.distance || 0}mi travel`,
        positivePoints: opponentDisadvantageBonus,
        opponentDetails: opponentAnalysis
      });
    }
  }
  
  // Factor 6: Team positive momentum
  if (teamMomentumAnalysis.hasPositiveMomentum) {
    const teamMomentumBonus = Math.min(15, teamMomentumAnalysis.winRate * 20);
    positiveScore += teamMomentumBonus;
    positiveFactors.push({
      type: 'team_positive_momentum',
      description: `Team on hot streak - ${teamMomentumAnalysis.recentWins}/${teamMomentumAnalysis.recentGames} recent wins`,
      positivePoints: teamMomentumBonus,
      teamWinRate: teamMomentumAnalysis.winRate,
      recentWins: teamMomentumAnalysis.recentWins
    });
  }
  
  // Check for roster activity warnings
  if (playerContext.gamesPlayedInLast7Days < 3) {
    contextualWarnings.push(`Low activity: Only ${playerContext.gamesPlayedInLast7Days} games in last 7 days - may not be regular starter`);
  }
  
  return {
    playerName: player.name,
    team: player.team,
    totalPositiveScore: Math.round(positiveScore),
    momentumLevel: positiveScore >= 60 ? 'EXCEPTIONAL' : positiveScore >= 35 ? 'HIGH' : positiveScore >= 20 ? 'GOOD' : 'MODERATE',
    positiveFactors,
    contextualWarnings,
    playerContext,
    analysis: {
      hotStreakAnalysis,
      postRestPatterns,
      bounceBackAnalysis,
      homeFieldAnalysis,
      opponentAnalysis,
      teamMomentumAnalysis
    }
  };
}

/**
 * Generate positive performance predictions for today's games
 */
async function generatePositivePerformancePredictions(targetDate = new Date()) {
  console.log(`Generating positive performance predictions for ${targetDate.toDateString()}`);
  
  // Load data
  const rosterData = readJsonFile(ROSTER_PATH);
  if (!rosterData) {
    console.error('Failed to load roster data');
    return false;
  }
  
  const seasonData = loadAllSeasonData();
  const hitters = rosterData.filter(player => player.type === 'hitter' || !player.type);
  
  console.log(`Analyzing ${hitters.length} hitters for positive performance potential`);
  
  const positivePerformancePredictions = [];
  
  // Process each hitter
  hitters.forEach(player => {
    try {
      const positiveAnalysis = calculatePositivePerformanceScore(player, seasonData, null);
      
      if (positiveAnalysis && positiveAnalysis.totalPositiveScore >= 15) { // Only include meaningful positive indicators
        positivePerformancePredictions.push(positiveAnalysis);
      }
    } catch (error) {
      console.error(`Error analyzing ${player.name}:`, error);
    }
  });
  
  // Sort by positive score (highest first)
  positivePerformancePredictions.sort((a, b) => b.totalPositiveScore - a.totalPositiveScore);
  
  // Save predictions with date-specific naming
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const outputFileName = `positive_performance_predictions_${dateStr}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    totalPlayersAnalyzed: hitters.length,
    playersWithPositiveMomentum: positivePerformancePredictions.length,
    momentumAnalysisEnabled: true,
    predictions: positivePerformancePredictions.slice(0, 50) // Top 50 positive momentum players
  };
  
  console.log(`Writing ${positivePerformancePredictions.length} predictions to ${outputPath}...`);
  const success = writeJsonFile(outputPath, outputData);
  
  // Also write to latest.json for easy access
  if (success) {
    const latestPath = path.join(OUTPUT_DIR, 'positive_performance_predictions_latest.json');
    writeJsonFile(latestPath, outputData);
  }
  
  if (success) {
    console.log(`Generated positive performance predictions for ${positivePerformancePredictions.length} players`);
    console.log(`Exceptional momentum players: ${positivePerformancePredictions.filter(p => p.momentumLevel === 'EXCEPTIONAL').length}`);
    console.log(`High momentum players: ${positivePerformancePredictions.filter(p => p.momentumLevel === 'HIGH').length}`);
    console.log(`🚀 Momentum analysis: ENABLED`);
    
    // Log top 5 positive momentum players
    console.log('\nTop 5 Positive Momentum Players:');
    positivePerformancePredictions.slice(0, 5).forEach((prediction, index) => {
      console.log(`${index + 1}. ${prediction.playerName} (${prediction.team}) - ${prediction.totalPositiveScore} points (${prediction.momentumLevel})`);
      prediction.positiveFactors.forEach(factor => {
        console.log(`   + ${factor.description} (+${Math.round(factor.positivePoints)} pts)`);
      });
    });
  }
  
  return success;
}

// Export for use in other modules
module.exports = {
  generatePositivePerformancePredictions,
  calculatePositivePerformanceScore,
  analyzeHotStreaks,
  analyzePostRestExcellence,
  // analyzeBounceBackPatterns - REMOVED: Replaced by enhancedBounceBackAnalyzer
  analyzeHomeFieldAdvantages,
  analyzeOpponentDisadvantages,
  analyzeTeamMomentum,
  
  // Enhanced bounce back analysis is imported from separate module
  // See enhancedBounceBackAnalyzer.js for failure-tracking implementation
};

// Run if called directly
if (require.main === module) {
  generatePositivePerformancePredictions()
    .then(success => {
      if (success) {
        console.log('Positive performance predictions generated successfully');
        process.exit(0);
      } else {
        console.error('Failed to generate positive performance predictions');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Error generating positive performance predictions:', error);
      process.exit(1);
    });
}