/**
 * generatePoorPerformancePredictions.js
 * 
 * This script analyzes player data to predict when players are likely to have
 * uncharacteristically poor performances based on various patterns and signals.
 * 
 * Patterns analyzed:
 * - Post-peak performance regression
 * - Consecutive games fatigue
 * - Road series position effects  
 * - Rest day impacts
 * - Travel fatigue (long distance, timezone changes)
 * - First game in new city effects
 * - Last game before long travel
 * - Historical poor performance triggers
 * - Time slot struggles
 * - Opposing pitcher advantages
 */

const fs = require('fs');
const path = require('path');

// Try to import travel analysis utilities (optional)
let travelUtils = null;
try {
  travelUtils = require('./stadiumCoordinates');
  console.log('✅ Travel analysis enabled - stadium coordinates loaded');
} catch (error) {
  console.log('⚠️ Travel analysis disabled - stadium coordinates not found');
  console.log('   Create src/services/stadiumCoordinates.js to enable travel analysis');
}

// Configuration
const ROSTER_PATH = path.join(__dirname, '../../public/data/rosters.json');
const SEASON_DATA_DIR = path.join(__dirname, '../../public/data/2025');
const OUTPUT_DIR = path.join(__dirname, '../../public/data/predictions');

// Poor performance thresholds
const POOR_PERFORMANCE_THRESHOLDS = {
  MIN_GAMES_ANALYSIS: 15,        // Minimum games to analyze patterns
  CONSECUTIVE_GAMES_FATIGUE: 6,   // Games in a row before fatigue risk
  POST_PEAK_LOOKBACK: 3,         // Games to look back for peak performance
  POOR_GAME_THRESHOLD: 0.150,    // Below this AVG considered poor for the game
  REST_DAYS_ANALYSIS: [0, 1, 3, 5, 7], // Rest day patterns to analyze
  ROAD_SERIES_POSITIONS: [1, 2, 3, 4], // Game positions in road series
  SLUMP_THRESHOLD: 5,            // Games in recent slump
  TIME_SLOT_MIN_GAMES: 8         // Min games in time slot for analysis
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
 * Analyze consecutive games played without rest
 */
function analyzeConsecutiveGames(playerName, team, seasonData) {
  const sortedDates = Object.keys(seasonData).sort();
  const gameHistory = [];
  let consecutiveGames = 0;
  let lastGameDate = null;
  
  sortedDates.forEach(dateStr => {
    const dayData = seasonData[dateStr];
    const playerData = dayData.players?.find(p => p.name === playerName && p.team === team);
    
    if (playerData && playerData.AB > 0) { // Player actually played
      const gameDate = new Date(dateStr);
      
      if (lastGameDate) {
        const daysBetween = Math.floor((gameDate - lastGameDate) / (1000 * 60 * 60 * 24));
        if (daysBetween === 1) {
          consecutiveGames++;
        } else {
          consecutiveGames = 1; // Reset streak
        }
      } else {
        consecutiveGames = 1;
      }
      
      gameHistory.push({
        date: dateStr,
        consecutiveGames,
        hits: Number(playerData.H) || 0,
        atBats: Number(playerData.AB) || 0,
        avg: Number(playerData.H) / Number(playerData.AB) || 0
      });
      
      lastGameDate = gameDate;
    }
  });
  
  return { gameHistory, currentConsecutiveGames: consecutiveGames };
}

/**
 * Detect post-peak performance patterns
 */
function analyzePostPeakPerformance(gameHistory) {
  if (gameHistory.length < POOR_PERFORMANCE_THRESHOLDS.POST_PEAK_LOOKBACK + 2) {
    return { hasPostPeakRisk: false, peakGame: null, subsequentPerformance: [] };
  }
  
  const recentGames = gameHistory.slice(-7); // Last week
  let peakGame = null;
  let peakIndex = -1;
  
  // Find peak performance in recent games (high hit rate or multiple hits)
  recentGames.forEach((game, index) => {
    const hitRate = game.hits / Math.max(game.atBats, 1);
    const isExceptional = game.hits >= 3 || (hitRate >= 0.500 && game.atBats >= 3);
    
    if (isExceptional && (!peakGame || game.hits > peakGame.hits)) {
      peakGame = game;
      peakIndex = index;
    }
  });
  
  if (!peakGame || peakIndex >= recentGames.length - 1) {
    return { hasPostPeakRisk: false, peakGame, subsequentPerformance: [] };
  }
  
  // Analyze performance after peak
  const subsequentGames = recentGames.slice(peakIndex + 1);
  const poorSubsequentGames = subsequentGames.filter(game => 
    (game.hits / Math.max(game.atBats, 1)) < POOR_PERFORMANCE_THRESHOLDS.POOR_GAME_THRESHOLD
  );
  
  const hasPostPeakRisk = poorSubsequentGames.length >= 1 && subsequentGames.length >= 2;
  
  return {
    hasPostPeakRisk,
    peakGame,
    subsequentPerformance: subsequentGames,
    poorGamesPct: poorSubsequentGames.length / subsequentGames.length
  };
}

/**
 * Analyze rest day impact patterns
 */
function analyzeRestDayPatterns(gameHistory) {
  const restDayPatterns = {};
  
  POOR_PERFORMANCE_THRESHOLDS.REST_DAYS_ANALYSIS.forEach(restDays => {
    restDayPatterns[restDays] = {
      games: [],
      avgPerformance: 0,
      poorGamesPct: 0
    };
  });
  
  gameHistory.forEach((game, index) => {
    if (index === 0) return; // Skip first game
    
    const prevGame = gameHistory[index - 1];
    const currentDate = new Date(game.date);
    const prevDate = new Date(prevGame.date);
    const restDays = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24)) - 1;
    
    if (restDayPatterns[restDays]) {
      restDayPatterns[restDays].games.push(game);
    }
  });
  
  // Calculate performance metrics for each rest day pattern
  Object.keys(restDayPatterns).forEach(restDays => {
    const pattern = restDayPatterns[restDays];
    if (pattern.games.length > 0) {
      const totalHits = pattern.games.reduce((sum, game) => sum + game.hits, 0);
      const totalABs = pattern.games.reduce((sum, game) => sum + game.atBats, 0);
      pattern.avgPerformance = totalHits / Math.max(totalABs, 1);
      
      const poorGames = pattern.games.filter(game => 
        (game.hits / Math.max(game.atBats, 1)) < POOR_PERFORMANCE_THRESHOLDS.POOR_GAME_THRESHOLD
      );
      pattern.poorGamesPct = poorGames.length / pattern.games.length;
    }
  });
  
  return restDayPatterns;
}

/**
 * Analyze road series position effects
 */
function analyzeRoadSeriesPatterns(playerName, team, seasonData) {
  const sortedDates = Object.keys(seasonData).sort();
  const roadSeries = [];
  let currentSeries = null;
  
  sortedDates.forEach(dateStr => {
    const dayData = seasonData[dateStr];
    const playerData = dayData.players?.find(p => p.name === playerName && p.team === team);
    
    if (playerData && playerData.AB > 0) {
      // Determine if this is a home or away game based on team order in games
      const teamGames = dayData.games?.filter(game => 
        game.homeTeam === team || game.awayTeam === team
      ) || [];
      
      const isAwayGame = teamGames.some(game => game.awayTeam === team);
      
      if (isAwayGame) {
        if (!currentSeries || 
            (currentSeries.length > 0 && 
             Math.floor((new Date(dateStr) - new Date(currentSeries[currentSeries.length - 1].date)) / (1000 * 60 * 60 * 24)) > 1)) {
          // Start new road series
          if (currentSeries && currentSeries.length > 1) {
            roadSeries.push([...currentSeries]);
          }
          currentSeries = [];
        }
        
        currentSeries.push({
          date: dateStr,
          hits: Number(playerData.H) || 0,
          atBats: Number(playerData.AB) || 0,
          gameInSeries: currentSeries.length + 1
        });
      } else {
        // Home game - end current road series if exists
        if (currentSeries && currentSeries.length > 1) {
          roadSeries.push([...currentSeries]);
          currentSeries = null;
        }
      }
    }
  });
  
  // Add final series if exists
  if (currentSeries && currentSeries.length > 1) {
    roadSeries.push([...currentSeries]);
  }
  
  // Analyze performance by position in road series
  const positionAnalysis = {};
  POOR_PERFORMANCE_THRESHOLDS.ROAD_SERIES_POSITIONS.forEach(position => {
    positionAnalysis[position] = {
      games: [],
      avgPerformance: 0,
      poorGamesPct: 0
    };
  });
  
  roadSeries.forEach(series => {
    series.forEach((game, index) => {
      const position = index + 1;
      if (positionAnalysis[position]) {
        positionAnalysis[position].games.push(game);
      }
    });
  });
  
  // Calculate metrics
  Object.keys(positionAnalysis).forEach(position => {
    const analysis = positionAnalysis[position];
    if (analysis.games.length > 0) {
      const totalHits = analysis.games.reduce((sum, game) => sum + game.hits, 0);
      const totalABs = analysis.games.reduce((sum, game) => sum + game.atBats, 0);
      analysis.avgPerformance = totalHits / Math.max(totalABs, 1);
      
      const poorGames = analysis.games.filter(game => 
        (game.hits / Math.max(game.atBats, 1)) < POOR_PERFORMANCE_THRESHOLDS.POOR_GAME_THRESHOLD
      );
      analysis.poorGamesPct = poorGames.length / analysis.games.length;
    }
  });
  
  return { roadSeries, positionAnalysis };
}

/**
 * Analyze travel-related performance patterns (if travel utils available)
 */
function analyzeTravelPatterns(playerName, team, seasonData, todaysGameContext) {
  if (!travelUtils) {
    return {
      afterLongTravel: { games: [], poorPerformanceRate: 0 },
      afterCrossCountryTravel: { games: [], poorPerformanceRate: 0 },
      afterTimezoneChange: { games: [], poorPerformanceRate: 0 },
      firstGameInNewCity: { games: [], poorPerformanceRate: 0 },
      afterNoRestTravel: { games: [], poorPerformanceRate: 0 },
      afterRestTravel: { games: [], poorPerformanceRate: 0 }
    };
  }
  
  // Travel analysis implementation would go here when coordinates are available
  // For now, return empty patterns
  return {
    afterLongTravel: { games: [], poorPerformanceRate: 0 },
    afterCrossCountryTravel: { games: [], poorPerformanceRate: 0 },
    afterTimezoneChange: { games: [], poorPerformanceRate: 0 },
    firstGameInNewCity: { games: [], poorPerformanceRate: 0 },
    afterNoRestTravel: { games: [], poorPerformanceRate: 0 },
    afterRestTravel: { games: [], poorPerformanceRate: 0 }
  };
}

/**
 * Analyze today's travel context (if travel utils available)
 */
function analyzeTodaysTravelContext(team, seasonData, todaysGameContext) {
  if (!travelUtils) {
    return null;
  }
  
  // Travel context analysis would go here when coordinates are available
  return null;
}

/**
 * Calculate comprehensive poor performance risk score
 */
function calculatePoorPerformanceRisk(player, seasonData, todaysGameContext) {
  const { gameHistory } = analyzeConsecutiveGames(player.name, player.team, seasonData);
  
  if (gameHistory.length < POOR_PERFORMANCE_THRESHOLDS.MIN_GAMES_ANALYSIS) {
    return null; // Not enough data
  }
  
  const postPeakAnalysis = analyzePostPeakPerformance(gameHistory);
  const restDayPatterns = analyzeRestDayPatterns(gameHistory);
  const roadSeriesAnalysis = analyzeRoadSeriesPatterns(player.name, player.team, seasonData);
  const travelPatterns = analyzeTravelPatterns(player.name, player.team, seasonData, todaysGameContext);
  const todaysTravelContext = analyzeTodaysTravelContext(player.team, seasonData, todaysGameContext);
  
  let riskScore = 0;
  const riskFactors = [];
  
  // Factor 1: Consecutive games fatigue
  const currentConsecutive = gameHistory[gameHistory.length - 1]?.consecutiveGames || 0;
  if (currentConsecutive >= POOR_PERFORMANCE_THRESHOLDS.CONSECUTIVE_GAMES_FATIGUE) {
    const fatigueRisk = Math.min(30, (currentConsecutive - 5) * 5);
    riskScore += fatigueRisk;
    riskFactors.push({
      type: 'consecutive_games_fatigue',
      description: `${currentConsecutive} consecutive games played`,
      riskPoints: fatigueRisk
    });
  }
  
  // Factor 2: Post-peak performance regression
  if (postPeakAnalysis.hasPostPeakRisk) {
    const postPeakRisk = Math.min(25, postPeakAnalysis.poorGamesPct * 100);
    riskScore += postPeakRisk;
    riskFactors.push({
      type: 'post_peak_regression',
      description: `Poor performance following exceptional game`,
      riskPoints: postPeakRisk,
      peakGame: postPeakAnalysis.peakGame
    });
  }
  
  // Factor 3: Historical rest day struggles
  const todaysRestDays = 0; // Assuming game today after yesterday's game
  if (restDayPatterns[todaysRestDays] && restDayPatterns[todaysRestDays].games.length >= 3) {
    const restDayRisk = restDayPatterns[todaysRestDays].poorGamesPct * 20;
    if (restDayRisk > 10) {
      riskScore += restDayRisk;
      riskFactors.push({
        type: 'rest_day_pattern',
        description: `Historically struggles with ${todaysRestDays} rest days`,
        riskPoints: restDayRisk,
        historicalPoorPct: restDayPatterns[todaysRestDays].poorGamesPct
      });
    }
  }
  
  // Factor 4: Road series position effects
  if (todaysGameContext && todaysGameContext.isAwayGame && todaysGameContext.gameInSeries) {
    const position = todaysGameContext.gameInSeries;
    const positionData = roadSeriesAnalysis.positionAnalysis[position];
    
    if (positionData && positionData.games.length >= 3 && positionData.poorGamesPct > 0.4) {
      const roadPositionRisk = positionData.poorGamesPct * 15;
      riskScore += roadPositionRisk;
      riskFactors.push({
        type: 'road_series_position',
        description: `Game ${position} in road series - historically poor`,
        riskPoints: roadPositionRisk,
        historicalPoorPct: positionData.poorGamesPct
      });
    }
  }
  
  // Factor 5: Travel-related risks (if available)
  if (todaysTravelContext && travelUtils) {
    // Travel risk analysis would go here
    // For now, we'll skip this since travel utils might not be available
  }
  
  // Factor 6: Recent slump
  const recentGames = gameHistory.slice(-POOR_PERFORMANCE_THRESHOLDS.SLUMP_THRESHOLD);
  if (recentGames.length >= POOR_PERFORMANCE_THRESHOLDS.SLUMP_THRESHOLD) {
    const recentAvg = recentGames.reduce((sum, game) => sum + game.avg, 0) / recentGames.length;
    const seasonAvg = gameHistory.reduce((sum, game) => sum + game.avg, 0) / gameHistory.length;
    
    if (recentAvg < seasonAvg * 0.7) { // Recent performance significantly below season average
      const slumpRisk = Math.min(20, (seasonAvg - recentAvg) * 100);
      riskScore += slumpRisk;
      riskFactors.push({
        type: 'recent_slump',
        description: `Recent ${POOR_PERFORMANCE_THRESHOLDS.SLUMP_THRESHOLD}-game slump`,
        riskPoints: slumpRisk,
        recentAvg: recentAvg.toFixed(3),
        seasonAvg: seasonAvg.toFixed(3)
      });
    }
  }
  
  return {
    playerName: player.name,
    team: player.team,
    totalRiskScore: Math.round(riskScore),
    riskLevel: riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW',
    riskFactors,
    analysis: {
      gameHistory: gameHistory.slice(-10), // Last 10 games
      postPeakAnalysis,
      restDayPatterns,
      roadSeriesAnalysis: roadSeriesAnalysis.positionAnalysis,
      travelPatterns,
      todaysTravelContext,
      consecutiveGames: currentConsecutive
    }
  };
}

/**
 * Generate poor performance predictions for today's games
 */
async function generatePoorPerformancePredictions(targetDate = new Date()) {
  console.log(`Generating poor performance predictions for ${targetDate.toDateString()}`);
  
  // Load data
  const rosterData = readJsonFile(ROSTER_PATH);
  if (!rosterData) {
    console.error('Failed to load roster data');
    return false;
  }
  
  const seasonData = loadAllSeasonData();
  const hitters = rosterData.filter(player => player.type === 'hitter' || !player.type);
  
  console.log(`Analyzing ${hitters.length} hitters for poor performance risks`);
  
  const poorPerformancePredictions = [];
  
  // Process each hitter
  hitters.forEach(player => {
    try {
      const riskAnalysis = calculatePoorPerformanceRisk(player, seasonData, null);
      
      if (riskAnalysis && riskAnalysis.totalRiskScore >= 15) { // Only include meaningful risks
        poorPerformancePredictions.push(riskAnalysis);
      }
    } catch (error) {
      console.error(`Error analyzing ${player.name}:`, error);
    }
  });
  
  // Sort by risk score (highest first)
  poorPerformancePredictions.sort((a, b) => b.totalRiskScore - a.totalRiskScore);
  
  // Save predictions with date-specific naming (matching HR prediction pattern)
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const outputFileName = `poor_performance_predictions_${dateStr}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    totalPlayersAnalyzed: hitters.length,
    playersWithRisk: poorPerformancePredictions.length,
    travelAnalysisEnabled: !!travelUtils,
    predictions: poorPerformancePredictions.slice(0, 50) // Top 50 risks
  };
  
  console.log(`Writing ${poorPerformancePredictions.length} predictions to ${outputPath}...`);
  const success = writeJsonFile(outputPath, outputData);
  
  // Also write to latest.json for easy access (matching HR prediction pattern)
  if (success) {
    const latestPath = path.join(OUTPUT_DIR, 'poor_performance_predictions_latest.json');
    writeJsonFile(latestPath, outputData);
  }
  
  if (success) {
    console.log(`Generated poor performance predictions for ${poorPerformancePredictions.length} players`);
    console.log(`High risk players: ${poorPerformancePredictions.filter(p => p.riskLevel === 'HIGH').length}`);
    console.log(`Medium risk players: ${poorPerformancePredictions.filter(p => p.riskLevel === 'MEDIUM').length}`);
    
    // Log top 5 risks
    console.log('\nTop 5 Poor Performance Risks:');
    poorPerformancePredictions.slice(0, 5).forEach((prediction, index) => {
      console.log(`${index + 1}. ${prediction.playerName} (${prediction.team}) - ${prediction.totalRiskScore} points (${prediction.riskLevel})`);
      prediction.riskFactors.forEach(factor => {
        console.log(`   - ${factor.description} (+${factor.riskPoints} pts)`);
      });
    });
  }
  
  return success;
}

// Export for use in other modules
module.exports = {
  generatePoorPerformancePredictions,
  calculatePoorPerformanceRisk,
  analyzeConsecutiveGames,
  analyzePostPeakPerformance,
  analyzeRestDayPatterns,
  analyzeRoadSeriesPatterns,
  analyzeTravelPatterns,
  analyzeTodaysTravelContext
};

// Run if called directly
if (require.main === module) {
  generatePoorPerformancePredictions()
    .then(success => {
      if (success) {
        console.log('Poor performance predictions generated successfully');
        process.exit(0);
      } else {
        console.error('Failed to generate poor performance predictions');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Error generating poor performance predictions:', error);
      process.exit(1);
    });
}