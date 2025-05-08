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
const HR_DEFICIT_THRESHOLD = 2; // Threshold for considering a player "due"

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
    // Create directory if it doesn't exist
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
  // Format date for checking
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  // const dateStr = `${year}-${month}-${day}`; // Not used directly in logic below
  
  // Get month name (lowercase)
  const monthName = targetDate.toLocaleString('default', { month: 'long' }).toLowerCase();
  
  // Check if month directory exists
  const monthDir = path.join(SEASON_DATA_DIR, monthName);
  console.log(`[findMostRecentDataFile] Looking for month directory: ${monthDir}`);
  
  if (!fs.existsSync(monthDir)) {
    console.log(`[findMostRecentDataFile] Month directory not found: ${monthDir}. Attempting fallback.`);
    
    if (!fs.existsSync(SEASON_DATA_DIR)) {
        console.error(`[findMostRecentDataFile] CRITICAL: SEASON_DATA_DIR does not exist: ${SEASON_DATA_DIR}`);
        return null;
    }

    const subdirs = fs.readdirSync(SEASON_DATA_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort((a, b) => { // Sort months chronologically if possible, otherwise alphabetically
          const dateA = new Date(`01 ${a} 2000`);
          const dateB = new Date(`01 ${b} 2000`);
          if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA; // Most recent month first
          return b.localeCompare(a);
      });
    
    console.log(`[findMostRecentDataFile] Found subdirectories in ${SEASON_DATA_DIR}: ${subdirs.join(', ')}`);
    
    if (subdirs.length === 0) {
      console.log('[findMostRecentDataFile] No month subdirectories found in SEASON_DATA_DIR.');
      return null;
    }
    
    for (const subdir of subdirs) { // Iterate most recent months first if sort worked
      const subdirPath = path.join(SEASON_DATA_DIR, subdir);
      console.log(`[findMostRecentDataFile] Checking in fallback directory: ${subdirPath}`);
      const files = fs.readdirSync(subdirPath)
        .filter(file => file.endsWith('.json'))
        .sort()
        .reverse(); // Sort in descending order (lexicographically by filename)
      
      if (files.length > 0) {
        console.log(`[findMostRecentDataFile] Using most recent file from ${subdir}: ${files[0]}`);
        return path.join(subdirPath, files[0]);
      }
    }
    
    console.log('[findMostRecentDataFile] No JSON files found in any subdirectory.');
    return null;
  }
  
  // Month directory exists, try exact date
  const exactFileName = `${monthName}_${day}_${year}.json`;
  const exactFilePath = path.join(monthDir, exactFileName);
  
  console.log(`[findMostRecentDataFile] Checking for exact file: ${exactFilePath}`);
  
  if (fs.existsSync(exactFilePath)) {
    console.log(`[findMostRecentDataFile] Found exact file: ${exactFilePath}`);
    return exactFilePath;
  }
  
  console.log("[findMostRecentDataFile] Exact file not found, searching for closest previous file in the same month...");
  
  const filesInMonthDir = fs.readdirSync(monthDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .reverse(); 
  
  console.log(`[findMostRecentDataFile] Found ${filesInMonthDir.length} JSON files in ${monthDir}`);
  
  if (filesInMonthDir.length > 0) {
    // Find the file that is on or before targetDate
    // Filename format: monthname_DD_YYYY.json
    const targetFilePrefix = `${monthName}_${day}_${year}`;
    for (const file of filesInMonthDir) { // filesInMonthDir is sorted latest first
        // A simple lexicographical comparison should work if DD is padded and filenames are consistent
        if (file <= targetFilePrefix || filesInMonthDir.indexOf(file) === 0 ) { // Use latest if no exact or earlier found
             console.log(`[findMostRecentDataFile] Using file from ${monthName} month: ${file}`);
             return path.join(monthDir, file);
        }
    }
    // If loop finishes, means all files are 'later' than target date, which is odd.
    // Default to the most recent one in this month.
    console.log(`[findMostRecentDataFile] No file on or before target date in ${monthName}, using most recent: ${filesInMonthDir[0]}`);
    return path.join(monthDir, filesInMonthDir[0]);
  }

  // If no files in current month, check previous months (more robustly)
  console.log(`[findMostRecentDataFile] No files in ${monthName} directory. Checking previous months.`);
  const allMonthDirs = fs.readdirSync(SEASON_DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  // Sort months chronologically descending
  const sortedMonthDirs = allMonthDirs.sort((a, b) => {
    const dateA = new Date(`${a} 1, ${year}`); // Assuming all data is for `year`
    const dateB = new Date(`${b} 1, ${year}`);
    if (isNaN(dateA) || isNaN(dateB)) return b.localeCompare(a); // Fallback to string compare
    return dateB - dateA; // Sorts most recent month first
  });
  
  const currentMonthOrder = sortedMonthDirs.indexOf(monthName);

  for (let i = 0; i < sortedMonthDirs.length; i++) {
      // Start from the month that is targetDate's month or the first one before it.
      if (i < currentMonthOrder && currentMonthOrder !== -1) continue; // Skip months newer than targetDate's month

      const prevMonthName = sortedMonthDirs[i];
      // If current month was already checked and was empty, this loop will start from it,
      // but since it's empty, it will go to the next (older) one.
      if (prevMonthName === monthName && filesInMonthDir.length > 0) continue; // Already handled

      const prevMonthDir = path.join(SEASON_DATA_DIR, prevMonthName);
      console.log(`[findMostRecentDataFile] Checking previous month directory: ${prevMonthDir}`);
      
      const prevMonthFiles = fs.readdirSync(prevMonthDir)
        .filter(file => file.endsWith('.json'))
        .sort()
        .reverse(); // Most recent file in that month first
      
      if (prevMonthFiles.length > 0) {
        console.log(`[findMostRecentDataFile] Using most recent file from ${prevMonthName}: ${prevMonthFiles[0]}`);
        return path.join(prevMonthDir, prevMonthFiles[0]);
      }
  }
    
  console.log('[findMostRecentDataFile] No suitable data file found after all checks.');
  return null;
}

/**
 * Load all season data (to find game history)
 */
function loadAllSeasonData() {
  console.log('[loadAllSeasonData] Loading season data...');
  const seasonData = {};

  if (!fs.existsSync(SEASON_DATA_DIR)) {
    console.error(`[loadAllSeasonData] CRITICAL: SEASON_DATA_DIR does not exist: ${SEASON_DATA_DIR}`);
    return seasonData; // Return empty object
  }

  const monthDirs = fs.readdirSync(SEASON_DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`[loadAllSeasonData] Found month directories: ${monthDirs.join(', ')}`);

  monthDirs.forEach(monthDirName => {
    const monthDirPath = path.join(SEASON_DATA_DIR, monthDirName);
    const files = fs.readdirSync(monthDirPath)
      .filter(file => file.endsWith('.json'));
    
    // console.log(`[loadAllSeasonData] Processing ${files.length} files from ${monthDirName}`); // Can be too verbose
    
    for (const file of files) {
      const filePath = path.join(monthDirPath, file);
      const data = readJsonFile(filePath);
      
      if (data) {
        const parts = file.replace('.json', '').split('_');
        if (parts.length === 3) {
          const fileMonthName = parts[0];
          const day = parts[1].padStart(2, '0');
          const year = parts[2];
          
          const date = new Date(`${fileMonthName} 1, ${year}`); // Use file's month name
          if (isNaN(date.getTime())) {
            console.warn(`[loadAllSeasonData] Could not parse date from filename: ${file} (Month: ${fileMonthName})`);
            continue;
          }
          const monthNum = date.getMonth() + 1;
          const monthNumStr = String(monthNum).padStart(2, '0');
          
          const dateKey = `${year}-${monthNumStr}-${day}`;
          // console.log(`[loadAllSeasonData] Adding data for date: ${dateKey} from file: ${file}`); // Can be too verbose
          seasonData[dateKey] = data;
        } else {
            console.warn(`[loadAllSeasonData] Filename ${file} does not match expected format monthname_DD_YYYY.json`);
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
  
  Object.keys(seasonData).sort().forEach(dateKey => { // Sort date keys to process in chronological order
    const gameData = seasonData[dateKey];
    
    if (gameData.players) {
      const playerEntry = gameData.players.find(p => 
        p.name === playerName && p.team === playerTeam && 
        (p.playerType === 'hitter' || !p.playerType)); // Ensure it's a hitter
      
      if (playerEntry) {
        const hr = playerEntry.HR === 'DNP' ? 0 : (Number(playerEntry.HR) || 0);
        gameHistory.push({
          date: dateKey,
          homeRuns: hr,
          didPlay: playerEntry.HR !== 'DNP' && playerEntry.AB > 0 // Consider didPlay if At Bats > 0
        });
      }
    }
  });
  
  // No need to sort again if keys were sorted, but doesn't hurt.
  return gameHistory.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate games since last home run
 */
function calculateGamesSinceLastHR(gameHistory) {
  if (!gameHistory || gameHistory.length === 0) {
    return {
      gamesSinceLastHR: 0,
      daysSinceLastHR: 0,
      gamesPlayed: 0,
      homeRunsThisSeason: 0
    };
  }
  
  const gamesPlayedList = gameHistory.filter(game => game.didPlay);
  const gamesPlayed = gamesPlayedList.length;
  const homeRunsThisSeason = gameHistory.reduce((sum, game) => sum + game.homeRuns, 0);
  
  let lastHRGameIndexInPlayedList = -1;
  for (let i = gamesPlayedList.length - 1; i >= 0; i--) {
    if (gamesPlayedList[i].homeRuns > 0) {
      lastHRGameIndexInPlayedList = i;
      break;
    }
  }
  
  let gamesSinceLastHR = 0;
  let daysSinceLastHR = 0;

  if (lastHRGameIndexInPlayedList !== -1) {
    gamesSinceLastHR = gamesPlayedList.length - 1 - lastHRGameIndexInPlayedList;
    
    const lastHRDate = new Date(gamesPlayedList[lastHRGameIndexInPlayedList].date);
    const latestGameDate = gamesPlayedList.length > 0 ? new Date(gamesPlayedList[gamesPlayedList.length - 1].date) : new Date(gameHistory[gameHistory.length-1].date);
    daysSinceLastHR = Math.floor((latestGameDate - lastHRDate) / (1000 * 60 * 60 * 24));

  } else { // No HRs this season
    gamesSinceLastHR = gamesPlayed;
    if (gamesPlayed > 0) {
        const firstGameDate = new Date(gamesPlayedList[0].date);
        const latestGameDate = new Date(gamesPlayedList[gamesPlayedList.length - 1].date);
        daysSinceLastHR = Math.floor((latestGameDate - firstGameDate) / (1000 * 60 * 60 * 24)) + 1; // Total span of days played
    } else {
        daysSinceLastHR = 0;
    }
  }
  
  return {
    gamesSinceLastHR,
    daysSinceLastHR,
    gamesPlayed,
    homeRunsThisSeason
  };
}

/**
 * Generate HR predictions for a specific date
 */
async function generateHRPredictions(targetDate = new Date()) {
  console.log(`[generateHRPredictions] Generating HR predictions for ${targetDate.toDateString()}`);
  
  console.log('[generateHRPredictions] 1. Loading roster data...');
  const rosterData = readJsonFile(ROSTER_PATH);
  if (!rosterData) {
    console.error('[generateHRPredictions] Failed to load roster data. Aborting HR predictions.');
    return false;
  }
  console.log(`[generateHRPredictions] Loaded ${rosterData.length} players from roster.`);
  
  console.log('[generateHRPredictions] 2. Finding most recent game data file...');
  const mostRecentDataFile = findMostRecentDataFile(targetDate);
  if (!mostRecentDataFile) {
    console.error('[generateHRPredictions] No suitable game data file found. Aborting HR predictions.');
    return false;
  }
  console.log(`[generateHRPredictions] Using game data file: ${mostRecentDataFile}`);
  const gameData = readJsonFile(mostRecentDataFile);
  if (!gameData) {
    console.error('[generateHRPredictions] Failed to load game data from file. Aborting HR predictions.');
    return false;
  }
  
  console.log('[generateHRPredictions] 3. Loading all season data for game history...');
  const seasonData = loadAllSeasonData();
  if (Object.keys(seasonData).length === 0) {
    console.warn('[generateHRPredictions] Season data is empty. Predictions might be inaccurate or empty.');
  }
  
  console.log('[generateHRPredictions] 4. Finding players scheduled for today\'s games...');
  const scheduledPlayerTeams = new Set();
  if (gameData.games && Array.isArray(gameData.games)) {
    gameData.games.forEach(game => {
      if (game.homeTeam) scheduledPlayerTeams.add(game.homeTeam);
      if (game.awayTeam) scheduledPlayerTeams.add(game.awayTeam);
    });
  } else {
    console.warn(`[generateHRPredictions] 'gameData.games' is missing or not an array in ${mostRecentDataFile}. Cannot determine scheduled teams.`);
  }
  console.log(`[generateHRPredictions] Found ${scheduledPlayerTeams.size} teams scheduled to play based on ${mostRecentDataFile}.`);

  console.log('[generateHRPredictions] 5. Calculating HR predictions...');
  const batterData = (gameData.players || []).filter(player => 
    player.playerType === 'hitter' || !player.playerType);
  console.log(`[generateHRPredictions] Found ${batterData.length} batters in gameData file.`);
  
  let processedPlayerCount = 0;
  const playersWithPredictionDetails = batterData
    .map(player => {
      processedPlayerCount++;
      if (!scheduledPlayerTeams.has(player.team)) {
        // console.log(`[generateHRPredictions] Skipping ${player.name} (${player.team}) - team not in scheduledPlayerTeams.`);
        return null;
      }
      
      const rosterPlayer = rosterData.find(r => 
        r.name === player.name && r.team === player.team && 
        (r.type === 'hitter' || !r.type));
      
      if (!rosterPlayer) {
        // console.log(`[generateHRPredictions] Skipping ${player.name} (${player.team}) - not found in roster or not a hitter.`);
        return null;
      }
      
      const gamesLastYear = rosterPlayer.stats ? (Number(rosterPlayer.stats['2024_Games']) || 0) : 0;
      const hrsLastYear = rosterPlayer.stats ? (Number(rosterPlayer.stats['2024_HR']) || 0) : 0;
      
      if (gamesLastYear <= 0) {
        // console.log(`[generateHRPredictions] Skipping ${player.name} (${player.team}) - no games played last year or invalid stat.`);
        return null;
      }
      
      const hrRate = hrsLastYear / gamesLastYear;
      if (hrRate <= 0) { // If no HRs last year, they can't be "due" by this historical rate logic
         // console.log(`[generateHRPredictions] Skipping ${player.name} (${player.team}) - HR rate is 0 from last year.`);
        return null;
      }
      
      const gameHistory = findPlayerGameHistory(player.name, player.team, seasonData);
      const { 
        gamesSinceLastHR, 
        daysSinceLastHR, 
        gamesPlayed, 
        homeRunsThisSeason 
      } = calculateGamesSinceLastHR(gameHistory);
      
      if (gamesPlayed === 0) { // No games played this season, can't be due yet.
          // console.log(`[generateHRPredictions] Skipping ${player.name} (${player.team}) - no games played this season.`);
          return null;
      }

      const expectedHRs = hrRate * gamesPlayed;
      const actualHRs = homeRunsThisSeason;
      const hrDeficit = expectedHRs - actualHRs;
      const expectedGamesBetweenHRs = Math.round(1 / hrRate);
      
      const isDueByDeficit = hrDeficit > HR_DEFICIT_THRESHOLD;
      const isDueByStreak = gamesSinceLastHR > (expectedGamesBetweenHRs * 1.5);
      const isDue = isDueByDeficit || isDueByStreak;
      
      const dueScore = (hrDeficit * 0.6) + 
                        ( (expectedGamesBetweenHRs > 0 ? gamesSinceLastHR / expectedGamesBetweenHRs : 0) * 0.4); // Avoid division by zero if expectedGamesBetweenHRs is 0
      
      return {
        name: player.name,
        fullName: rosterPlayer.fullName || player.name,
        team: player.team,
        hrRate,
        expectedHRs,
        actualHRs,
        hrDeficit,
        gamesSinceLastHR,
        daysSinceLastHR,
        gamesPlayed,
        expectedGamesBetweenHRs,
        isDue,
        isDueByDeficit, // For logging
        isDueByStreak,  // For logging
        dueScore
      };
    })
    .filter(Boolean); 
  
  console.log(`[generateHRPredictions] Processed ${processedPlayerCount} batters from gameData. Found ${playersWithPredictionDetails.length} potentially relevant players after initial filters.`);

  if (playersWithPredictionDetails.length > 0 && playersWithPredictionDetails.length < 10) { // Log for a few players if list is small
    console.log('[generateHRPredictions] Details for some processed players (before final "isDue" filter):');
    playersWithPredictionDetails.slice(0, 5).forEach(p => {
      console.log(`  Player: ${p.fullName} (${p.team})`);
      console.log(`    GamesPlayed (2025): ${p.gamesPlayed}, HR (2025): ${p.actualHRs}`);
      console.log(`    Hist HR_Rate: ${p.hrRate.toFixed(3)}, Exp. HR (2025): ${p.expectedHRs.toFixed(2)}, HR_Deficit: ${p.hrDeficit.toFixed(2)} (Threshold: ${HR_DEFICIT_THRESHOLD})`);
      console.log(`    GamesSinceLastHR: ${p.gamesSinceLastHR}, Exp. GamesBetweenHR: ${p.expectedGamesBetweenHRs}`);
      console.log(`    IsDueByDeficit: ${p.isDueByDeficit}, IsDueByStreak: ${p.isDueByStreak} (Streak > ${p.expectedGamesBetweenHRs * 1.5})`);
      console.log(`    Overall isDue: ${p.isDue}, DueScore: ${p.dueScore.toFixed(2)}`);
    });
  }

  const playersActuallyDue = playersWithPredictionDetails
    .filter(player => player.isDue)
    .sort((a, b) => b.dueScore - a.dueScore);
  
  console.log(`[generateHRPredictions] Found ${playersActuallyDue.length} players considered "due" for a HR.`);

  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    predictions: playersActuallyDue.slice(0, 10) // Top 10 most due
  };
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const outputFileName = `hr_predictions_${year}-${month}-${day}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  console.log(`[generateHRPredictions] Writing ${outputData.predictions.length} predictions to ${outputPath}...`);
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
    console.error('[generatePlayerPerformance] Failed to load roster data. Aborting player performance.');
    return false;
  }
  
  console.log('[generatePlayerPerformance] 2. Loading all season data...');
  const seasonData = loadAllSeasonData();
  if (Object.keys(seasonData).length === 0) {
    console.warn('[generatePlayerPerformance] Season data is empty. Performance data will be empty.');
  }
  
  console.log('[generatePlayerPerformance] 3. Processing player performance...');
  const allPlayersMap = new Map(); 
  
  Object.keys(seasonData).forEach(dateKey => {
    const gameData = seasonData[dateKey];
    if (gameData.players) {
      gameData.players.forEach(player => {
        if (player.playerType === 'hitter' || !player.playerType) {
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
    
    const rosterPlayer = rosterData.find(r => 
      r.name === name && r.team === team && 
      (r.type === 'hitter' || !r.type));
    
    if (!rosterPlayer || !rosterPlayer.stats) {
      continue;
    }
    
    const gamesLastYear = Number(rosterPlayer.stats['2024_Games']) || 0;
    const hrsLastYear = Number(rosterPlayer.stats['2024_HR']) || 0;
    const historicalHRRate = gamesLastYear > 0 ? hrsLastYear / gamesLastYear : 0;
    
    const gameHistory = findPlayerGameHistory(name, team, seasonData);
    if (gameHistory.length === 0) {
      continue;
    }
    
    const currentSeasonStats = calculateGamesSinceLastHR(gameHistory);
    const { gamesPlayed, homeRunsThisSeason, gamesSinceLastHR, daysSinceLastHR } = currentSeasonStats;

    if (gamesPlayed === 0) continue;

    const actualHRRate = homeRunsThisSeason / gamesPlayed;
    const expectedHRs = historicalHRRate * gamesPlayed;
    const hrDifference = homeRunsThisSeason - expectedHRs;
    
    const performanceIndicator = historicalHRRate > 0 ? 
      (actualHRRate / historicalHRRate - 1) * 100 : // (current_rate / hist_rate - 1) * 100
      (actualHRRate > 0 ? 100 : 0); // If no historical rate, any HR is "infinitely" better
    
    let lastHRDate = null;
    for (let i = gameHistory.length - 1; i >= 0; i--) {
      if (gameHistory[i].homeRuns > 0) {
        lastHRDate = gameHistory[i].date;
        break;
      }
    }
    
    processedPlayers.push({
      name,
      fullName: rosterPlayer.fullName || name,
      team,
      gamesPlayed,
      homeRunsThisSeason,
      historicalHRRate,
      actualHRRate,
      expectedHRs,
      hrDifference,
      performanceIndicator,
      lastHRDate,
      gamesSinceLastHR,
      daysSinceLastHR,
      status: performanceIndicator > 0 ? "over-performing" : (performanceIndicator < 0 ? "under-performing" : "as-expected")
    });
  }
  
  processedPlayers.sort((a, b) => b.homeRunsThisSeason - a.homeRunsThisSeason);
  
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    players: processedPlayers
  };
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const outputFileName = `player_performance_${year}-${month}-${day}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  console.log(`[generatePlayerPerformance] Writing ${processedPlayers.length} player performance entries to ${outputPath}...`);
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
  if (!predictionsSuccess) {
    console.error('Failed to generate HR predictions or an issue occurred within.');
  }
  
  const performanceSuccess = await generatePlayerPerformance(targetDate);
  if (!performanceSuccess) {
    console.error('Failed to generate player performance data or an issue occurred within.');
  }
  
  return predictionsSuccess && performanceSuccess;
}

if (require.main === module) {
  let targetDate = new Date();
  if (process.argv.length > 2) {
    const dateArg = process.argv[2]; 
    const parsedDate = new Date(dateArg);
    if (!isNaN(parsedDate.getTime())) {
        targetDate = parsedDate;
        // Ensure targetDate uses local timezone midnight, not UTC midnight from YYYY-MM-DD
        targetDate = new Date(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate());
    } else {
        console.warn(`Invalid date argument: ${dateArg}. Using today's date.`);
    }
  }
  
  generateAllData(targetDate)
    .then(success => {
      if (success) {
        console.log('Successfully generated all data sets that could be processed.');
      } else {
        console.error('One or more data generation processes encountered issues or failed.');
        // process.exit(1); // You might not want to exit if one part partially works
      }
    })
    .catch(error => {
      console.error('Critical error during data generation:', error);
      process.exit(1);
    });
}

module.exports = { generateHRPredictions, generatePlayerPerformance, generateAllData };