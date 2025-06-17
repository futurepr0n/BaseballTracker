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

// Import travel analysis utilities
const {
  getTeamDistance,
  categorizeTravelDistance,
  getTimezoneDifference,
  assessTravelDifficulty,
  TEAM_TO_STADIUM
} = require('./stadiumCoordinates');
console.log('✅ Travel analysis enabled - stadium coordinates loaded');

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
 * Analyze consecutive games played without rest - PLAYER-SPECIFIC ANALYSIS
 */
function analyzeConsecutiveGames(playerName, team, seasonData) {
  const sortedDates = Object.keys(seasonData).sort();
  const gameHistory = [];
  let consecutiveGames = 0;
  let lastGameDate = null;
  const fatiguePatterns = new Map(); // consecutive games -> performance data
  
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
      
      const gamePerformance = {
        date: dateStr,
        consecutiveGames,
        hits: Number(playerData.H) || 0,
        atBats: Number(playerData.AB) || 0,
        avg: Number(playerData.H) / Number(playerData.AB) || 0
      };
      
      gameHistory.push(gamePerformance);
      
      // Track performance at different consecutive game levels
      if (!fatiguePatterns.has(consecutiveGames)) {
        fatiguePatterns.set(consecutiveGames, []);
      }
      fatiguePatterns.get(consecutiveGames).push(gamePerformance);
      
      lastGameDate = gameDate;
    }
  });
  
  // Calculate player-specific fatigue risk based on their historical patterns
  const fatigueAnalysis = {};
  for (const [consGames, performances] of fatiguePatterns) {
    if (performances.length >= 3) { // Need at least 3 games for meaningful analysis
      const avgPerformance = performances.reduce((sum, game) => sum + game.avg, 0) / performances.length;
      const poorGames = performances.filter(game => game.avg < 0.200).length;
      fatigueAnalysis[consGames] = {
        games: performances.length,
        avgPerformance: avgPerformance,
        poorGameRate: poorGames / performances.length,
        isStatisticallySignificant: performances.length >= 5
      };
    }
  }
  
  return { 
    gameHistory, 
    currentConsecutiveGames: consecutiveGames,
    playerSpecificFatiguePatterns: fatigueAnalysis
  };
}

/**
 * Detect post-peak performance patterns - PLAYER-SPECIFIC ANALYSIS
 */
function analyzePostPeakPerformance(gameHistory, playerName) {
  if (gameHistory.length < 10) {
    return { hasPostPeakRisk: false, peakGame: null, subsequentPerformance: [], playerSpecificPattern: null };
  }
  
  // Find ALL historical peak games for this player to understand their pattern
  const allPeakGames = [];
  const postPeakAnalysis = [];
  
  gameHistory.forEach((game, index) => {
    const hitRate = game.hits / Math.max(game.atBats, 1);
    const isExceptional = game.hits >= 3 || (hitRate >= 0.500 && game.atBats >= 3);
    
    if (isExceptional && index < gameHistory.length - 1) { // Must have games after to analyze
      const peakGame = game;
      const gamesAfterPeak = gameHistory.slice(index + 1, Math.min(index + 4, gameHistory.length)); // Next 3 games
      
      if (gamesAfterPeak.length >= 2) {
        const poorGamesAfter = gamesAfterPeak.filter(g => g.avg < 0.200).length;
        const postPeakRate = poorGamesAfter / gamesAfterPeak.length;
        
        allPeakGames.push(peakGame);
        postPeakAnalysis.push({
          peakGame: peakGame,
          gamesAnalyzed: gamesAfterPeak.length,
          poorPerformanceRate: postPeakRate,
          avgPerformanceAfter: gamesAfterPeak.reduce((sum, g) => sum + g.avg, 0) / gamesAfterPeak.length
        });
      }
    }
  });
  
  // Calculate player-specific post-peak tendency
  let playerSpecificPostPeakRate = 0;
  if (postPeakAnalysis.length >= 3) { // Need meaningful sample size
    playerSpecificPostPeakRate = postPeakAnalysis.reduce((sum, analysis) => sum + analysis.poorPerformanceRate, 0) / postPeakAnalysis.length;
  }
  
  // Check recent games for current peak and risk
  const recentGames = gameHistory.slice(-7);
  let currentPeakGame = null;
  let currentPeakIndex = -1;
  
  recentGames.forEach((game, index) => {
    const hitRate = game.hits / Math.max(game.atBats, 1);
    const isExceptional = game.hits >= 3 || (hitRate >= 0.500 && game.atBats >= 3);
    
    if (isExceptional && (!currentPeakGame || game.hits > currentPeakGame.hits)) {
      currentPeakGame = game;
      currentPeakIndex = index;
    }
  });
  
  const hasPostPeakRisk = currentPeakGame && currentPeakIndex < recentGames.length - 1 && playerSpecificPostPeakRate > 0.3;
  
  return {
    hasPostPeakRisk,
    peakGame: currentPeakGame,
    subsequentPerformance: currentPeakGame ? recentGames.slice(currentPeakIndex + 1) : [],
    playerSpecificPattern: {
      historicalPeakGames: allPeakGames.length,
      postPeakPoorPerformanceRate: playerSpecificPostPeakRate,
      isReliablePattern: postPeakAnalysis.length >= 3
    }
  };
}

/**
 * Analyze rest day impact patterns - PLAYER-SPECIFIC ANALYSIS
 */
function analyzeRestDayPatterns(gameHistory, playerName) {
  const restDayPatterns = {};
  const playerSeasonAvg = gameHistory.reduce((sum, game) => sum + game.avg, 0) / Math.max(gameHistory.length, 1);
  
  // Analyze all possible rest day patterns for this player
  gameHistory.forEach((game, index) => {
    if (index === 0) return; // Skip first game
    
    const prevGame = gameHistory[index - 1];
    const currentDate = new Date(game.date);
    const prevDate = new Date(prevGame.date);
    const restDays = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24)) - 1;
    
    if (restDays >= 0 && restDays <= 10) { // Analyze reasonable rest day ranges
      if (!restDayPatterns[restDays]) {
        restDayPatterns[restDays] = {
          games: [],
          avgPerformance: 0,
          poorGamesPct: 0,
          performanceVsSeasonAvg: 0
        };
      }
      restDayPatterns[restDays].games.push(game);
    }
  });
  
  // Calculate player-specific performance metrics for each rest day pattern
  Object.keys(restDayPatterns).forEach(restDays => {
    const pattern = restDayPatterns[restDays];
    if (pattern.games.length >= 3) { // Need meaningful sample size
      const totalHits = pattern.games.reduce((sum, game) => sum + game.hits, 0);
      const totalABs = pattern.games.reduce((sum, game) => sum + game.atBats, 0);
      pattern.avgPerformance = totalHits / Math.max(totalABs, 1);
      
      // Use player's own poor performance threshold (20% below their season average)
      const playerPoorThreshold = Math.max(0.150, playerSeasonAvg * 0.8);
      const poorGames = pattern.games.filter(game => game.avg < playerPoorThreshold);
      pattern.poorGamesPct = poorGames.length / pattern.games.length;
      
      // Performance relative to this player's season average
      pattern.performanceVsSeasonAvg = pattern.avgPerformance - playerSeasonAvg;
      pattern.isPlayerStruggle = pattern.performanceVsSeasonAvg < -0.050; // 50+ points below season avg
      pattern.sampleSize = pattern.games.length;
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
 * Analyze travel-related performance patterns - FULLY ENABLED WITH STADIUM COORDINATES
 */
function analyzeTravelPatterns(playerName, team, seasonData, todaysGameContext) {
  const sortedDates = Object.keys(seasonData).sort();
  const travelAnalysis = {
    afterLongTravel: { games: [], poorPerformanceRate: 0 },
    afterCrossCountryTravel: { games: [], poorPerformanceRate: 0 },
    afterTimezoneChange: { games: [], poorPerformanceRate: 0 },
    firstGameInNewCity: { games: [], poorPerformanceRate: 0 },
    afterNoRestTravel: { games: [], poorPerformanceRate: 0 },
    afterRestTravel: { games: [], poorPerformanceRate: 0 },
    playerSpecificTravelTolerance: null
  };
  
  let lastGameLocation = null;
  let lastGameDate = null;
  const playerSeasonAvg = getPlayerSeasonAverage(playerName, team, seasonData);
  
  for (let i = 0; i < sortedDates.length; i++) {
    const dateStr = sortedDates[i];
    const dayData = seasonData[dateStr];
    const playerData = dayData.players?.find(p => p.name === playerName && p.team === team);
    
    if (playerData && playerData.AB > 0) {
      const currentDate = new Date(dateStr);
      
      // Determine game location
      const teamGames = dayData.games?.filter(game => 
        game.homeTeam === team || game.awayTeam === team
      ) || [];
      
      const isAwayGame = teamGames.some(game => game.awayTeam === team);
      const currentGameLocation = isAwayGame ? 
        teamGames.find(game => game.awayTeam === team)?.homeTeam : team;
      
      if (lastGameLocation && lastGameDate && currentGameLocation) {
        const daysBetween = Math.floor((currentDate - lastGameDate) / (1000 * 60 * 60 * 24));
        const travelDistance = getTeamDistance(lastGameLocation, currentGameLocation);
        const timezoneDiff = getTimezoneDifference(
          TEAM_TO_STADIUM[lastGameLocation],
          TEAM_TO_STADIUM[currentGameLocation]
        );
        
        const gamePerformance = {
          date: dateStr,
          hits: Number(playerData.H) || 0,
          atBats: Number(playerData.AB) || 0,
          avg: Number(playerData.H) / Number(playerData.AB) || 0,
          travelDistance,
          timezoneDiff,
          daysBetween,
          isFirstGameInCity: daysBetween > 0 && currentGameLocation !== lastGameLocation
        };
        
        // Categorize travel impact
        if (travelDistance && travelDistance >= 1500) {
          travelAnalysis.afterLongTravel.games.push(gamePerformance);
          if (travelDistance >= 2500) {
            travelAnalysis.afterCrossCountryTravel.games.push(gamePerformance);
          }
        }
        
        if (Math.abs(timezoneDiff) >= 2) {
          travelAnalysis.afterTimezoneChange.games.push(gamePerformance);
        }
        
        if (gamePerformance.isFirstGameInCity) {
          travelAnalysis.firstGameInNewCity.games.push(gamePerformance);
        }
        
        if (daysBetween === 1 && travelDistance >= 800) {
          travelAnalysis.afterNoRestTravel.games.push(gamePerformance);
        } else if (daysBetween >= 2 && travelDistance >= 800) {
          travelAnalysis.afterRestTravel.games.push(gamePerformance);
        }
      }
      
      lastGameLocation = currentGameLocation;
      lastGameDate = currentDate;
    }
  }
  
  // Calculate poor performance rates for each travel category
  Object.keys(travelAnalysis).forEach(category => {
    if (category !== 'playerSpecificTravelTolerance' && travelAnalysis[category].games.length >= 3) {
      const games = travelAnalysis[category].games;
      const playerPoorThreshold = Math.max(0.150, playerSeasonAvg * 0.8);
      const poorGames = games.filter(game => game.avg < playerPoorThreshold);
      travelAnalysis[category].poorPerformanceRate = poorGames.length / games.length;
      travelAnalysis[category].avgPerformance = games.reduce((sum, game) => sum + game.avg, 0) / games.length;
      travelAnalysis[category].performanceVsSeasonAvg = travelAnalysis[category].avgPerformance - playerSeasonAvg;
    }
  });
  
  return travelAnalysis;
}

/**
 * Analyze today's travel context - FULLY ENABLED
 */
function analyzeTodaysTravelContext(team, seasonData, todaysGameContext) {
  if (!todaysGameContext) return null;
  
  const sortedDates = Object.keys(seasonData).sort();
  const recentDates = sortedDates.slice(-5); // Last 5 games
  
  let lastGameLocation = null;
  let lastGameDate = null;
  
  // Find the most recent game location
  for (let i = recentDates.length - 1; i >= 0; i--) {
    const dateStr = recentDates[i];
    const dayData = seasonData[dateStr];
    
    const teamGames = dayData.games?.filter(game => 
      game.homeTeam === team || game.awayTeam === team
    ) || [];
    
    if (teamGames.length > 0) {
      const isAwayGame = teamGames.some(game => game.awayTeam === team);
      lastGameLocation = isAwayGame ? 
        teamGames.find(game => game.awayTeam === team)?.homeTeam : team;
      lastGameDate = new Date(dateStr);
      break;
    }
  }
  
  if (!lastGameLocation) return null;
  
  // Determine today's game location
  const todaysLocation = todaysGameContext.isAwayGame ? 
    todaysGameContext.opposingTeam : team;
  
  if (lastGameLocation === todaysLocation) {
    return { travelRequired: false, sameLocation: true };
  }
  
  const travelDistance = getTeamDistance(lastGameLocation, todaysLocation);
  const timezoneDiff = getTimezoneDifference(
    TEAM_TO_STADIUM[lastGameLocation],
    TEAM_TO_STADIUM[todaysLocation]
  );
  
  const daysSinceLastGame = lastGameDate ? 
    Math.floor((new Date() - lastGameDate) / (1000 * 60 * 60 * 24)) : 0;
  
  const travelDifficulty = assessTravelDifficulty(travelDistance, timezoneDiff);
  
  return {
    travelRequired: true,
    fromLocation: lastGameLocation,
    toLocation: todaysLocation,
    distance: travelDistance,
    distanceCategory: categorizeTravelDistance(travelDistance),
    timezoneDiff,
    daysSinceLastGame,
    travelDifficulty,
    isFirstGameInNewCity: true,
    hasAdequateRest: daysSinceLastGame >= 2
  };
}

/**
 * Calculate comprehensive poor performance risk score
 */
function calculatePoorPerformanceRisk(player, seasonData, todaysGameContext) {
  const { gameHistory } = analyzeConsecutiveGames(player.name, player.team, seasonData);
  
  if (gameHistory.length < POOR_PERFORMANCE_THRESHOLDS.MIN_GAMES_ANALYSIS) {
    return null; // Not enough data
  }
  
  const postPeakAnalysis = analyzePostPeakPerformance(gameHistory, player.name);
  const restDayPatterns = analyzeRestDayPatterns(gameHistory, player.name);
  const roadSeriesAnalysis = analyzeRoadSeriesPatterns(player.name, player.team, seasonData);
  const travelPatterns = analyzeTravelPatterns(player.name, player.team, seasonData, todaysGameContext);
  const todaysTravelContext = analyzeTodaysTravelContext(player.team, seasonData, todaysGameContext);
  
  let riskScore = 0;
  const riskFactors = [];
  
  // Factor 1: Player-specific consecutive games fatigue
  const currentConsecutive = gameHistory[gameHistory.length - 1]?.consecutiveGames || 0;
  const { playerSpecificFatiguePatterns } = analyzeConsecutiveGames(player.name, player.team, seasonData);
  
  if (currentConsecutive >= 3 && playerSpecificFatiguePatterns[currentConsecutive]) {
    const fatiguePattern = playerSpecificFatiguePatterns[currentConsecutive];
    if (fatiguePattern.isStatisticallySignificant && fatiguePattern.poorGameRate > 0.4) {
      const fatigueRisk = Math.min(35, fatiguePattern.poorGameRate * 50);
      riskScore += fatigueRisk;
      riskFactors.push({
        type: 'player_specific_fatigue',
        description: `${currentConsecutive} consecutive games - historically struggles (${(fatiguePattern.poorGameRate * 100).toFixed(1)}% poor rate)`,
        riskPoints: fatigueRisk,
        playerHistoricalRate: fatiguePattern.poorGameRate,
        sampleSize: fatiguePattern.games
      });
    }
  } else if (currentConsecutive >= 8) {
    // Fallback for extreme fatigue when no specific pattern exists
    const genericFatigueRisk = Math.min(20, (currentConsecutive - 7) * 3);
    riskScore += genericFatigueRisk;
    riskFactors.push({
      type: 'extreme_consecutive_games',
      description: `${currentConsecutive} consecutive games - extreme fatigue risk`,
      riskPoints: genericFatigueRisk
    });
  }
  
  // Factor 2: Player-specific post-peak performance regression
  if (postPeakAnalysis.hasPostPeakRisk && postPeakAnalysis.playerSpecificPattern.isReliablePattern) {
    const playerPostPeakRate = postPeakAnalysis.playerSpecificPattern.postPeakPoorPerformanceRate;
    const postPeakRisk = Math.min(30, playerPostPeakRate * 40);
    riskScore += postPeakRisk;
    riskFactors.push({
      type: 'player_specific_post_peak',
      description: `Post-peak regression risk - historically ${(playerPostPeakRate * 100).toFixed(1)}% poor rate after exceptional games`,
      riskPoints: postPeakRisk,
      peakGame: postPeakAnalysis.peakGame,
      historicalPattern: postPeakAnalysis.playerSpecificPattern
    });
  }
  
  // Factor 3: Player-specific rest day struggles
  const todaysRestDays = 0; // Assuming game today after yesterday's game
  if (restDayPatterns[todaysRestDays] && restDayPatterns[todaysRestDays].sampleSize >= 3) {
    const restPattern = restDayPatterns[todaysRestDays];
    if (restPattern.isPlayerStruggle) {
      const restDayRisk = Math.min(25, restPattern.poorGamesPct * 30);
      riskScore += restDayRisk;
      riskFactors.push({
        type: 'player_specific_rest_struggle',
        description: `Struggles with ${todaysRestDays} rest days - ${(restPattern.performanceVsSeasonAvg * 1000).toFixed(0)} pts below season avg`,
        riskPoints: restDayRisk,
        historicalPoorPct: restPattern.poorGamesPct,
        performanceVsAvg: restPattern.performanceVsSeasonAvg,
        sampleSize: restPattern.sampleSize
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
  
  // Factor 5: Travel-related risks - FULLY ENABLED
  if (todaysTravelContext && todaysTravelContext.travelRequired) {
    const travelContext = todaysTravelContext;
    let travelRisk = 0;
    
    // Long distance travel risk
    if (travelContext.distance >= 1500 && travelPatterns.afterLongTravel.games.length >= 3) {
      const longTravelPattern = travelPatterns.afterLongTravel;
      if (longTravelPattern.poorPerformanceRate > 0.4) {
        travelRisk += longTravelPattern.poorPerformanceRate * 25;
      }
    }
    
    // Timezone change impact
    if (Math.abs(travelContext.timezoneDiff) >= 2 && travelPatterns.afterTimezoneChange.games.length >= 3) {
      const timezonePattern = travelPatterns.afterTimezoneChange;
      if (timezonePattern.poorPerformanceRate > 0.4) {
        travelRisk += timezonePattern.poorPerformanceRate * 20;
      }
    }
    
    // First game in new city
    if (travelContext.isFirstGameInNewCity && travelPatterns.firstGameInNewCity.games.length >= 3) {
      const newCityPattern = travelPatterns.firstGameInNewCity;
      if (newCityPattern.poorPerformanceRate > 0.4) {
        travelRisk += newCityPattern.poorPerformanceRate * 15;
      }
    }
    
    // No rest travel (back-to-back with travel)
    if (!travelContext.hasAdequateRest && travelContext.distance >= 800 && travelPatterns.afterNoRestTravel.games.length >= 3) {
      const noRestTravelPattern = travelPatterns.afterNoRestTravel;
      if (noRestTravelPattern.poorPerformanceRate > 0.4) {
        travelRisk += noRestTravelPattern.poorPerformanceRate * 30;
      }
    }
    
    if (travelRisk > 5) {
      riskScore += Math.min(35, travelRisk);
      riskFactors.push({
        type: 'travel_related_fatigue',
        description: `Travel from ${travelContext.fromLocation} to ${travelContext.toLocation} (${travelContext.distance}mi, ${travelContext.timezoneDiff}hr timezone diff)`,
        riskPoints: Math.min(35, travelRisk),
        travelDetails: travelContext,
        playerTravelPatterns: {
          longTravel: travelPatterns.afterLongTravel,
          timezoneChange: travelPatterns.afterTimezoneChange,
          newCity: travelPatterns.firstGameInNewCity
        }
      });
    }
  }
  
  // Factor 6: Player-specific recent slump
  const recentGames = gameHistory.slice(-POOR_PERFORMANCE_THRESHOLDS.SLUMP_THRESHOLD);
  if (recentGames.length >= POOR_PERFORMANCE_THRESHOLDS.SLUMP_THRESHOLD) {
    const recentAvg = recentGames.reduce((sum, game) => sum + game.avg, 0) / recentGames.length;
    const seasonAvg = gameHistory.reduce((sum, game) => sum + game.avg, 0) / gameHistory.length;
    
    // Use player-specific slump threshold (30% below their own average instead of generic 30%)
    if (recentAvg < seasonAvg * 0.7) {
      const slumpSeverity = (seasonAvg - recentAvg) / seasonAvg; // Percentage decline
      const slumpRisk = Math.min(25, slumpSeverity * 50);
      riskScore += slumpRisk;
      riskFactors.push({
        type: 'player_specific_slump',
        description: `Recent slump: ${(slumpSeverity * 100).toFixed(1)}% below personal season average`,
        riskPoints: slumpRisk,
        recentAvg: recentAvg.toFixed(3),
        seasonAvg: seasonAvg.toFixed(3),
        slumpSeverity: slumpSeverity
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
      consecutiveGames: currentConsecutive,
      playerSpecificFatiguePatterns: analyzeConsecutiveGames(player.name, player.team, seasonData).playerSpecificFatiguePatterns
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
    travelAnalysisEnabled: true,
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
    console.log('🧳 Travel analysis: ENABLED');
    
    // Log top 5 risks
    console.log('\nTop 5 Poor Performance Risks:');
    poorPerformancePredictions.slice(0, 5).forEach((prediction, index) => {
      console.log(`${index + 1}. ${prediction.playerName} (${prediction.team}) - ${prediction.totalRiskScore} points (${prediction.riskLevel})`);
      prediction.riskFactors.forEach(factor => {
        console.log(`   - ${factor.description} (+${Math.round(factor.riskPoints)} pts)`);
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