
/**
 * generateHRPredictions.js
 * 
 * This script processes player statistics to determine which players are
 * "due" for a home run and generates a daily JSON file with the predictions.
 * 
 * Run this script daily to update the predictions.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROSTER_PATH = path.join(__dirname, '../../public/data/rosters.json');
const SEASON_DATA_DIR = path.join(__dirname, '../../public/data/2025');
const OUTPUT_DIR = path.join(__dirname, '../../public/data/predictions');
const HR_DEFICIT_THRESHOLD = 2.5; // Threshold for HR deficit to be considered "due"
const INACTIVITY_THRESHOLD_DAYS = 10; // Player is inactive if no game played in last X days
const MIN_GAMES_FOR_CURRENT_SEASON_RATE_FALLBACK = 20; // Min games for current season rate if no history
const DEFAULT_EXPECTED_GAMES_BETWEEN_HRS = 30; // Default if no history and not enough current season data

/**
 * Safely format a number with toFixed, handling undefined/null/NaN values
 */
function safeToFixed(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) { // Check if not a number or NaN
    return 0; // Default to 0
  }
  return parseFloat(value.toFixed(decimals));
}

/**
 * Read JSON file
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
 * Write JSON file
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
 * Find the most recent data file for a given date
 */
function findMostRecentDataFile(targetDate) {
  const year = targetDate.getFullYear();
  // const month = String(targetDate.getMonth() + 1).padStart(2, '0'); // Not directly used for monthDir
  const day = String(targetDate.getDate()).padStart(2, '0');
  const monthName = targetDate.toLocaleString('default', { month: 'long' }).toLowerCase();
  const monthDir = path.join(SEASON_DATA_DIR, monthName);

  console.log(`[findMostRecentDataFile] Looking for data for ${targetDate.toDateString()} (month: ${monthName})`);

  if (!fs.existsSync(SEASON_DATA_DIR)) {
      console.error(`[findMostRecentDataFile] CRITICAL: SEASON_DATA_DIR does not exist: ${SEASON_DATA_DIR}`);
      return null;
  }

  const exactFileName = `${monthName}_${day}_${year}.json`;
  const exactFilePath = path.join(monthDir, exactFileName);
  if (fs.existsSync(exactFilePath)) {
    console.log(`[findMostRecentDataFile] Found exact file: ${exactFilePath}`);
    return exactFilePath;
  }
  console.log(`[findMostRecentDataFile] Exact file not found: ${exactFilePath}. Searching...`);

  const allFiles = [];
  const monthDirs = fs.readdirSync(SEASON_DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const mDirName of monthDirs) {
    const currentMonthPath = path.join(SEASON_DATA_DIR, mDirName);
    try {
      const filesInDir = fs.readdirSync(currentMonthPath)
        .filter(file => file.endsWith('.json') && file.startsWith(mDirName + '_'))
        .map(file => {
          const parts = file.slice(0, -5).split('_');
          if (parts.length === 3) {
            const fileDate = new Date(`${parts[0]} ${parts[1]}, ${parts[2]}`);
             if (!isNaN(fileDate.getTime())) { // Check if date is valid
                return { path: path.join(currentMonthPath, file), date: fileDate };
            }
          }
          return null;
        })
        .filter(Boolean);
      allFiles.push(...filesInDir);
    } catch (e) {
        console.warn(`[findMostRecentDataFile] Could not read directory ${currentMonthPath}: ${e.message}`);
    }
  }

  if (allFiles.length === 0) {
    console.log('[findMostRecentDataFile] No JSON data files found in any month directory.');
    return null;
  }

  const eligibleFiles = allFiles.filter(f => f.date <= targetDate);

  if (eligibleFiles.length === 0) {
    console.log(`[findMostRecentDataFile] No data files found on or before ${targetDate.toDateString()}. Attempting to use the absolute most recent file available if any.`);
     allFiles.sort((a, b) => b.date - a.date); 
     if (allFiles.length > 0) {
         console.log(`[findMostRecentDataFile] Using latest overall file: ${allFiles[0].path}`);
         return allFiles[0].path;
     }
     console.log('[findMostRecentDataFile] No data files found at all.');
     return null; 
  }

  eligibleFiles.sort((a, b) => b.date - a.date);
  console.log(`[findMostRecentDataFile] Found ${eligibleFiles.length} eligible files. Using most recent: ${eligibleFiles[0].path}`);
  return eligibleFiles[0].path;
}

/**
 * Load all season data (to find game history)
 */
function loadAllSeasonData() {
  console.log('[loadAllSeasonData] Loading season data...');
  const seasonData = {};

  if (!fs.existsSync(SEASON_DATA_DIR)) {
    console.error(`[loadAllSeasonData] CRITICAL: SEASON_DATA_DIR does not exist: ${SEASON_DATA_DIR}`);
    return seasonData;
  }

  const monthDirs = fs.readdirSync(SEASON_DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  console.log(`[loadAllSeasonData] Found month directories: ${monthDirs.join(', ')}`);

  monthDirs.forEach(monthDirName => {
    const monthDirPath = path.join(SEASON_DATA_DIR, monthDirName);
    const files = fs.readdirSync(monthDirPath)
      .filter(file => file.endsWith('.json') && file.startsWith(monthDirName + '_'));
    
    for (const file of files) {
      const filePath = path.join(monthDirPath, file);
      const data = readJsonFile(filePath);
      
      if (data) {
        const parts = file.replace('.json', '').split('_');
        if (parts.length === 3) { 
          const fileMonthName = parts[0];
          const day = parts[1].padStart(2, '0');
          const year = parts[2];
          
          const tempDate = new Date(`${fileMonthName} 1, ${year}`); 
          if (isNaN(tempDate.getTime())) {
            console.warn(`[loadAllSeasonData] Could not parse month from filename: ${file} (Month: ${fileMonthName})`);
            continue;
          }
          const monthNumStr = String(tempDate.getMonth() + 1).padStart(2, '0');
          const dateKey = `${year}-${monthNumStr}-${day}`;
          seasonData[dateKey] = data;
        } else {
            console.warn(`[loadAllSeasonData] Filename ${file} in ${monthDirPath} does not match expected format monthname_DD_YYYY.json`);
        }
      }
    }
  });

  console.log(`[loadAllSeasonData] Loaded data for ${Object.keys(seasonData).length} dates`);
  return seasonData;
}

/**
 * Find a player's game history for the season
 */
function findPlayerGameHistory(playerName, playerTeam, seasonData) {
  const gameHistory = [];
  Object.keys(seasonData).sort().forEach(dateKey => {
    const gameData = seasonData[dateKey];
    if (gameData && gameData.players) {
      const playerEntry = gameData.players.find(p => 
        p.name === playerName && p.team === playerTeam && 
        (p.playerType === 'hitter' || !p.playerType));
      if (playerEntry) {
        const hr = playerEntry.HR === 'DNP' ? 0 : (Number(playerEntry.HR) || 0);
        gameHistory.push({
          date: dateKey,
          homeRuns: hr,
          didPlay: playerEntry.HR !== 'DNP' && (parseInt(playerEntry.AB) > 0 || typeof playerEntry.AB === 'undefined')
        });
      }
    }
  });
  return gameHistory;
}

/**
 * Calculate games since last home run, total HRs, games played.
 */
function calculateGamesSinceLastHR(gameHistory, targetDate) {
  const baseReturn = {
    gamesSinceLastHR: 0, daysSinceLastHR: 0, gamesPlayed: 0, homeRunsThisSeason: 0,
    lastHRGameDate: null, lastPlayedGameDate: null, daysSinceLastPlayedGame: 0 // Default to 0
  };
  if (!gameHistory || gameHistory.length === 0) return baseReturn;
  
  const gamesPlayedList = gameHistory.filter(game => game.didPlay);
  baseReturn.gamesPlayed = gamesPlayedList.length;
  baseReturn.homeRunsThisSeason = gameHistory.reduce((sum, game) => sum + game.homeRuns, 0);
  
  let lastHRGameIndexInPlayedList = -1;
  let lastHRGameDateObj = null;

  for (let i = gamesPlayedList.length - 1; i >= 0; i--) {
    if (gamesPlayedList[i].homeRuns > 0) {
      lastHRGameIndexInPlayedList = i;
      lastHRGameDateObj = new Date(gamesPlayedList[i].date);
      baseReturn.lastHRGameDate = lastHRGameDateObj.toISOString().split('T')[0];
      break;
    }
  }
  
  let lastPlayedGameDateObj = null;
  if (gamesPlayedList.length > 0) {
      lastPlayedGameDateObj = new Date(gamesPlayedList[gamesPlayedList.length - 1].date);
      baseReturn.lastPlayedGameDate = lastPlayedGameDateObj.toISOString().split('T')[0];
      baseReturn.daysSinceLastPlayedGame = Math.floor((targetDate - lastPlayedGameDateObj) / (1000 * 60 * 60 * 24));

      if (lastHRGameIndexInPlayedList !== -1 && lastHRGameDateObj) { // Ensure lastHRGameDateObj is set
        baseReturn.gamesSinceLastHR = gamesPlayedList.length - 1 - lastHRGameIndexInPlayedList;
        baseReturn.daysSinceLastHR = Math.floor((lastPlayedGameDateObj - lastHRGameDateObj) / (1000 * 60 * 60 * 24));
      } else { 
        baseReturn.gamesSinceLastHR = baseReturn.gamesPlayed;
        if (baseReturn.gamesPlayed > 0) {
            const firstGameDate = new Date(gamesPlayedList[0].date);
            baseReturn.daysSinceLastHR = Math.floor((lastPlayedGameDateObj - firstGameDate) / (1000 * 60 * 60 * 24)) + 1;
        }
      }
  }
  // Ensure daysSinceLastPlayedGame is non-null for the return
  baseReturn.daysSinceLastPlayedGame = baseReturn.daysSinceLastPlayedGame === null ? 0 : baseReturn.daysSinceLastPlayedGame;
  return baseReturn;
}

/**
 * Generate HR predictions for a specific date
 */
async function generateHRPredictions(targetDate = new Date()) {
  console.log(`[generateHRPredictions] Generating HR predictions for ${targetDate.toDateString()}`);
  
  console.log('[generateHRPredictions] 1. Loading roster data...');
  const rosterData = readJsonFile(ROSTER_PATH);
  if (!rosterData) {
    console.error('[generateHRPredictions] Failed to load roster data');
    return false;
  }
  console.log(`[generateHRPredictions] Loaded ${rosterData.length} players from roster.`);
  const hitters = rosterData.filter(player => player.type === 'hitter' || !player.type);
  console.log(`[generateHRPredictions] Found ${hitters.length} hitters in roster.`);
  
  console.log('[generateHRPredictions] 2. Finding most recent game data file...');
  const todaysDataFile = findMostRecentDataFile(targetDate);
  if (!todaysDataFile) {
    console.error('[generateHRPredictions] No suitable game data found for today based on targetDate. Predictions might be empty or use all teams.');
  }
  console.log(`[generateHRPredictions] Using game data file: ${todaysDataFile || 'None found'}`);
  
  const todaysData = todaysDataFile ? readJsonFile(todaysDataFile) : null;
  
  console.log('[generateHRPredictions] 3. Loading all season data for game history...');
  const seasonData = loadAllSeasonData();
  // Log already present in loadAllSeasonData
  
  console.log('[generateHRPredictions] 4. Finding players scheduled for today\'s games...');
  const teamsPlayingToday = new Set();
  if (todaysData && todaysData.games && todaysData.games.length > 0) {
    todaysData.games.forEach(game => {
      teamsPlayingToday.add(game.homeTeam);
      teamsPlayingToday.add(game.awayTeam);
    });
    console.log(`[generateHRPredictions] Found ${teamsPlayingToday.size} teams scheduled to play based on ${todaysDataFile}.`);
  } else {
    console.warn('[generateHRPredictions] No games found in today\'s data or data file not found. Including all teams from roster for analysis.');
    hitters.forEach(player => {
      if (player.team) teamsPlayingToday.add(player.team);
    });
  }
  
  console.log('[generateHRPredictions] 5. Calculating HR predictions...');
  let processedCount = 0;
  let teamFilteredCount = 0; 
  let sufficientDataCount = 0; 
  let activePlayerCount = 0; 
  let dueCount = 0;
  
  const playerPredictions = hitters
    .filter(player => player && player.name && player.team) 
    .map(player => {
      processedCount++;
      if (!teamsPlayingToday.has(player.team)) return null;
      teamFilteredCount++;
      
      const gameHistory = findPlayerGameHistory(player.name, player.team, seasonData);
      if (gameHistory.length === 0) return null;
      sufficientDataCount++;
      
      const stats = calculateGamesSinceLastHR(gameHistory, targetDate);

      let isActive = true;
      if (stats.lastPlayedGameDate === null || (stats.daysSinceLastPlayedGame !== null && stats.daysSinceLastPlayedGame > INACTIVITY_THRESHOLD_DAYS)) {
          isActive = false;
      }
      if(isActive) activePlayerCount++;

      let stableExpectedGamesBetweenHRs = DEFAULT_EXPECTED_GAMES_BETWEEN_HRS;
      let historicalHRRate = 0;
      let expectedHRsBasedOnHistory = 0;
      let historicalHRDeficit = 0;

      if (player.stats) {
        const gamesLastYear = Number(player.stats['2024_Games']) || 0;
        const hrsLastYear = Number(player.stats['2024_HR']) || 0;
        if (hrsLastYear > 0 && gamesLastYear > 0) {
          historicalHRRate = hrsLastYear / gamesLastYear;
          stableExpectedGamesBetweenHRs = Math.max(1, Math.round(1 / historicalHRRate));
          expectedHRsBasedOnHistory = historicalHRRate * stats.gamesPlayed;
          historicalHRDeficit = expectedHRsBasedOnHistory - stats.homeRunsThisSeason;
        } else if (stats.gamesPlayed >= MIN_GAMES_FOR_CURRENT_SEASON_RATE_FALLBACK && stats.homeRunsThisSeason > 0) {
          const currentHrRate = stats.homeRunsThisSeason / stats.gamesPlayed;
          stableExpectedGamesBetweenHRs = Math.max(1, Math.round(1 / currentHrRate));
        }
      } else if (stats.gamesPlayed >= MIN_GAMES_FOR_CURRENT_SEASON_RATE_FALLBACK && stats.homeRunsThisSeason > 0) {
        const currentHrRate = stats.homeRunsThisSeason / stats.gamesPlayed;
        stableExpectedGamesBetweenHRs = Math.max(1, Math.round(1 / currentHrRate));
      }

      const currentSeasonHRRate = stats.gamesPlayed > 0 ? stats.homeRunsThisSeason / stats.gamesPlayed : 0;
      
      let dueScore = 0;
      let isDue = false;

      if (stats.gamesPlayed > 0) {
        if (stats.homeRunsThisSeason > 0) {
          dueScore = stats.gamesSinceLastHR / stableExpectedGamesBetweenHRs;
          isDue = dueScore >= 0.80; 
        } else if (stats.gamesPlayed >= 5) {
          dueScore = stats.gamesPlayed / stableExpectedGamesBetweenHRs;
          isDue = stats.gamesPlayed >= Math.min(10, stableExpectedGamesBetweenHRs * 0.5);
        }
        if (!isDue && historicalHRRate > 0 && historicalHRDeficit >= HR_DEFICIT_THRESHOLD) {
          isDue = true;
          dueScore = Math.max(dueScore, 0.75 + (historicalHRDeficit / (HR_DEFICIT_THRESHOLD * 2)));
        }
      }
      
      if (!isActive) dueScore *= 0.3;
      if (isDue && isActive) dueCount++;

      let heatLevel = "Normal";
      if (isDue) {
        if (!isActive) heatLevel = "Due (Inactive)";
        else if (dueScore >= 1.8) heatLevel = "Very Hot";
        else if (dueScore >= 1.25) heatLevel = "Hot";
        else heatLevel = "Due";
      }
      
      return {
        name: player.name,
        fullName: player.fullName || player.name,
        team: player.team,
        gamesPlayed: stats.gamesPlayed,
        homeRunsThisSeason: stats.homeRunsThisSeason,
        currentSeasonHRRate: safeToFixed(currentSeasonHRRate, 4),
        historicalHRDeficit: safeToFixed(historicalHRDeficit, 2),
        gamesSinceLastHR: stats.gamesSinceLastHR,
        lastHRDate: stats.lastHRGameDate,
        stableExpectedGamesBetweenHRs: stableExpectedGamesBetweenHRs,
        isDue: isDue,
        dueScore: safeToFixed(dueScore, 3),
        heatLevel: heatLevel,
        isActive: isActive,
        lastPlayedDate: stats.lastPlayedGameDate,
        daysSinceLastPlayedGame: stats.daysSinceLastPlayedGame, // Already defaults to 0 if null
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.dueScore - a.dueScore);
  
  console.log(`[generateHRPredictions] Processed ${processedCount} hitters. On teams playing today: ${teamFilteredCount}. With game data: ${sufficientDataCount}. Active players: ${activePlayerCount}. Considered "due" (active & criteria met): ${dueCount}.`);
  
  const predictions = playerPredictions.slice(0, 15);
  if (predictions.length === 0) {
    console.warn('[generateHRPredictions] No predictions generated. Adding default entry.');
    predictions.push({
      name: "No Players Met Criteria", fullName: "No Players Met Criteria", team: "N/A", gamesPlayed: 0, homeRunsThisSeason: 0,
      currentSeasonHRRate: 0, historicalHRDeficit: 0, gamesSinceLastHR: 0, lastHRDate: null,
      stableExpectedGamesBetweenHRs: DEFAULT_EXPECTED_GAMES_BETWEEN_HRS, isDue: false, dueScore: 0, heatLevel: "Normal",
      isActive: false, lastPlayedDate: null, daysSinceLastPlayedGame: 0
    });
  }
  
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    predictions: predictions
  };
  
  const year = targetDate.getFullYear();
  const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(targetDate.getDate()).padStart(2, '0');
  const outputFileName = `hr_predictions_${year}-${monthStr}-${dayStr}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  console.log(`[generateHRPredictions] Writing ${predictions.length} predictions to ${outputPath}...`);
  const success = writeJsonFile(outputPath, outputData);
  if (success) {
    const latestPath = path.join(OUTPUT_DIR, 'hr_predictions_latest.json');
    writeJsonFile(latestPath, outputData);
  }
  
  console.log('[generateHRPredictions] HR predictions generation complete!');
  return success;
}

/**
 * Generate player performance data for the season-to-date
 */
async function generatePlayerPerformance(targetDate = new Date()) {
  console.log(`[generatePlayerPerformance] Generating player performance data for ${targetDate.toDateString()}`);
  
  console.log('[generatePlayerPerformance] 1. Loading roster data...');
  const rosterData = readJsonFile(ROSTER_PATH);
  if (!rosterData) {
    console.error('[generatePlayerPerformance] Failed to load roster data. Aborting.');
    return false;
  }
  
  console.log('[generatePlayerPerformance] 2. Loading all season data...');
  const seasonData = loadAllSeasonData();
  // Log from loadAllSeasonData is sufficient
  
  console.log('[generatePlayerPerformance] 3. Processing player performance...');
  const allPlayersMap = new Map(); 
  Object.keys(seasonData).forEach(dateKey => {
    const gameData = seasonData[dateKey];
    if (gameData && gameData.players) {
      gameData.players.forEach(player => {
        if (player && player.name && player.team && (player.playerType === 'hitter' || !player.playerType)) {
          const playerKey = `${player.name}_${player.team}`;
          if (!allPlayersMap.has(playerKey)) {
            allPlayersMap.set(playerKey, { name: player.name, team: player.team });
          }
        }
      });
    }
  });
  console.log(`[generatePlayerPerformance] Identified ${allPlayersMap.size} unique hitters from season data.`);

  const processedPlayers = [];
  for (const playerData of allPlayersMap.values()) {
    const { name, team } = playerData;
    const rosterPlayer = rosterData.find(r => r && r.name === name && r.team === team && (r.type === 'hitter' || !r.type));
    if (!rosterPlayer) continue;
    
    const historicalGames = Number(rosterPlayer.stats?.['2024_Games']) || 0;
    const historicalHRs = Number(rosterPlayer.stats?.['2024_HR']) || 0;
    const historicalHRRate = historicalGames > 0 ? historicalHRs / historicalGames : 0;
    
    const gameHistory = findPlayerGameHistory(name, team, seasonData);
    if (gameHistory.length === 0) continue;
    
    const currentSeasonStats = calculateGamesSinceLastHR(gameHistory, targetDate);
    if (currentSeasonStats.gamesPlayed === 0) continue;

    const actualHRRate = currentSeasonStats.homeRunsThisSeason / currentSeasonStats.gamesPlayed;
    const expectedHRsBasedOnHistory = historicalHRRate * currentSeasonStats.gamesPlayed;
    const hrDifferenceVsHistory = currentSeasonStats.homeRunsThisSeason - expectedHRsBasedOnHistory;
    
    const performanceIndicator = historicalHRRate > 0 
      ? (actualHRRate / historicalHRRate - 1) * 100 
      : (actualHRRate > 0 ? 100 : 0); 
    
    processedPlayers.push({
      name,
      fullName: rosterPlayer.fullName || name,
      team,
      gamesPlayed: currentSeasonStats.gamesPlayed,
      homeRunsThisSeason: currentSeasonStats.homeRunsThisSeason,
      historicalHRRate: safeToFixed(historicalHRRate, 4),
      actualHRRate: safeToFixed(actualHRRate, 4),
      expectedHRsBasedOnHistory: safeToFixed(expectedHRsBasedOnHistory, 2),
      hrDifferenceVsHistory: safeToFixed(hrDifferenceVsHistory, 2),
      performanceIndicator: safeToFixed(performanceIndicator, 1),
      lastHRDate: currentSeasonStats.lastHRGameDate,
      gamesSinceLastHR: currentSeasonStats.gamesSinceLastHR,
      daysSinceLastPlayedGame: currentSeasonStats.daysSinceLastPlayedGame, // Already defaults to 0
      status: performanceIndicator > 10 ? "over-performing" : (performanceIndicator < -10 ? "under-performing" : "as-expected")
    });
  }
  
  processedPlayers.sort((a, b) => b.homeRunsThisSeason - a.homeRunsThisSeason || b.performanceIndicator - a.performanceIndicator);
  console.log(`[generatePlayerPerformance] Writing ${processedPlayers.length} player performance entries...`);
  
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    players: processedPlayers
  };
  
  const year = targetDate.getFullYear();
  const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(targetDate.getDate()).padStart(2, '0');
  const outputFileName = `player_performance_${year}-${monthStr}-${dayStr}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  const success = writeJsonFile(outputPath, outputData);
  if (success) {
    const latestPath = path.join(OUTPUT_DIR, 'player_performance_latest.json');
    writeJsonFile(latestPath, outputData);
  }
  
  console.log('[generatePlayerPerformance] Player performance data generation complete!');
  return success;
}

/**
 * Main function to run all data generation processes
 */
async function generateAllData(targetDate = new Date()) {
  console.log(`Starting data generation for ${targetDate.toDateString()}`);
  const predictionsSuccess = await generateHRPredictions(targetDate);
  if (!predictionsSuccess) console.error('Failed to generate HR predictions or an issue occurred within.');
  
  const performanceSuccess = await generatePlayerPerformance(targetDate);
  if (!performanceSuccess) console.error('Failed to generate player performance data or an issue occurred within.');
  
  return predictionsSuccess && performanceSuccess;
}

if (require.main === module) {
  let targetDate = new Date();
  if (process.argv.length > 2) {
    const dateArg = process.argv[2]; 
    const parsedDate = new Date(dateArg);
    if (!isNaN(parsedDate.getTime())) {
        targetDate = new Date(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate());
    } else {
        console.warn(`Invalid date argument: ${dateArg}. Using today's date.`);
    }
  }
  
  generateAllData(targetDate)
    .then(success => {
      if (success) console.log('Successfully generated all data sets that could be processed.');
      else console.error('One or more data generation processes encountered issues or failed.');
    })
    .catch(error => {
      console.error('Critical error during data generation:', error);
      process.exit(1);
    });
}

module.exports = { generateHRPredictions, generatePlayerPerformance, generateAllData };