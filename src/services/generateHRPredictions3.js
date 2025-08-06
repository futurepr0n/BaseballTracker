/**
 * generateHRPredictions.js - ENHANCED FOR MULTIPLE GAMES
 * 
 * This script processes player statistics to determine which players are
 * "due" for a home run and generates a daily JSON file with the predictions.
 * 
 * FIXED: Now properly handles multiple games per day (doubleheaders, makeup games)
 */

const fs = require('fs');
const path = require('path');

// Import centralized configuration
const { paths } = require('../../config/dataPath');

// Configuration
const ROSTER_PATH = paths.rosters;
const SEASON_DATA_DIR = paths.gameData(2025);
const OUTPUT_DIR = paths.predictions;
const HR_DEFICIT_THRESHOLD = 2;

/**
 * Check if a player is currently injured
 */
function isPlayerInjured(player) {
  if (!player.injuries || !Array.isArray(player.injuries)) {
    return false;
  }
  
  return player.injuries.some(injury => injury.active === true);
}

/**
 * Filter out injured players from a roster array
 */
function filterHealthyPlayers(players) {
  return players.filter(player => !isPlayerInjured(player));
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
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  const monthName = targetDate.toLocaleString('default', { month: 'long' }).toLowerCase();
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
      .sort((a, b) => {
        const dateA = new Date(`01 ${a} 2000`);
        const dateB = new Date(`01 ${b} 2000`);
        if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
        return b.localeCompare(a);
      });
    
    console.log(`[findMostRecentDataFile] Found subdirectories in ${SEASON_DATA_DIR}: ${subdirs.join(', ')}`);
    
    if (subdirs.length === 0) {
      console.log('[findMostRecentDataFile] No month subdirectories found in SEASON_DATA_DIR.');
      return null;
    }
    
    for (const subdir of subdirs) {
      const subdirPath = path.join(SEASON_DATA_DIR, subdir);
      console.log(`[findMostRecentDataFile] Checking in fallback directory: ${subdirPath}`);
      const files = fs.readdirSync(subdirPath)
        .filter(file => file.endsWith('.json'))
        .sort()
        .reverse();
      
      if (files.length > 0) {
        console.log(`[findMostRecentDataFile] Using most recent file from ${subdir}: ${files[0]}`);
        return path.join(subdirPath, files[0]);
      }
    }
    
    console.log('[findMostRecentDataFile] No JSON files found in any subdirectory.');
    return null;
  }
  
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
    const targetFilePrefix = `${monthName}_${day}_${year}`;
    for (const file of filesInMonthDir) {
      if (file <= targetFilePrefix || filesInMonthDir.indexOf(file) === 0 ) {
        console.log(`[findMostRecentDataFile] Using file from ${monthName} month: ${file}`);
        return path.join(monthDir, file);
      }
    }
    console.log(`[findMostRecentDataFile] No file on or before target date in ${monthName}, using most recent: ${filesInMonthDir[0]}`);
    return path.join(monthDir, filesInMonthDir[0]);
  }

  console.log(`[findMostRecentDataFile] No files in ${monthName} directory. Checking previous months.`);
  const allMonthDirs = fs.readdirSync(SEASON_DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const sortedMonthDirs = allMonthDirs.sort((a, b) => {
    const dateA = new Date(`${a} 1, ${year}`);
    const dateB = new Date(`${b} 1, ${year}`);
    if (isNaN(dateA) || isNaN(dateB)) return b.localeCompare(a);
    return dateB - dateA;
  });
  
  const currentMonthOrder = sortedMonthDirs.indexOf(monthName);

  for (let i = 0; i < sortedMonthDirs.length; i++) {
    if (i < currentMonthOrder && currentMonthOrder !== -1) continue;

    const prevMonthName = sortedMonthDirs[i];
    if (prevMonthName === monthName && filesInMonthDir.length > 0) continue;

    const prevMonthDir = path.join(SEASON_DATA_DIR, prevMonthName);
    console.log(`[findMostRecentDataFile] Checking previous month directory: ${prevMonthDir}`);
    
    const prevMonthFiles = fs.readdirSync(prevMonthDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse();
    
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
    return seasonData;
  }

  const monthDirs = fs.readdirSync(SEASON_DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`[loadAllSeasonData] Found month directories: ${monthDirs.join(', ')}`);

  monthDirs.forEach(monthDirName => {
    const monthDirPath = path.join(SEASON_DATA_DIR, monthDirName);
    const files = fs.readdirSync(monthDirPath)
      .filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(monthDirPath, file);
      const data = readJsonFile(filePath);
      
      if (data) {
        const parts = file.replace('.json', '').split('_');
        if (parts.length === 3) {
          const fileMonthName = parts[0];
          const day = parts[1].padStart(2, '0');
          const year = parts[2];
          
          const date = new Date(`${fileMonthName} 1, ${year}`);
          if (isNaN(date.getTime())) {
            console.warn(`[loadAllSeasonData] Could not parse date from filename: ${file} (Month: ${fileMonthName})`);
            continue;
          }
          const monthNum = date.getMonth() + 1;
          const monthNumStr = String(monthNum).padStart(2, '0');
          
          const dateKey = `${year}-${monthNumStr}-${day}`;
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
 * ENHANCED: Find a player's game history for the season - HANDLES MULTIPLE GAMES PER DAY
 */
function findPlayerGameHistory(playerName, playerTeam, seasonData) {
  const gameHistory = [];
  
  Object.keys(seasonData).sort().forEach(dateKey => {
    const gameData = seasonData[dateKey];
    
    if (gameData.players) {
      // FIXED: Find ALL player entries for this date, not just the first one
      const playerEntries = gameData.players.filter(p => 
        p.name === playerName && p.team === playerTeam && 
        (p.playerType === 'hitter' || !p.playerType));
      
      if (playerEntries.length > 0) {
        console.log(`[findPlayerGameHistory] Found ${playerEntries.length} game(s) for ${playerName} on ${dateKey}`);
        
        // Aggregate stats across all games for this date
        let totalHRs = 0;
        let totalAB = 0;
        let didPlayAnyGame = false;
        let gameDetails = [];
        
        playerEntries.forEach((entry, index) => {
          const hr = entry.HR === 'DNP' ? 0 : (Number(entry.HR) || 0);
          const ab = entry.AB === 'DNP' ? 0 : (Number(entry.AB) || 0);
          const didPlay = entry.HR !== 'DNP' && ab > 0;
          
          totalHRs += hr;
          totalAB += ab;
          if (didPlay) didPlayAnyGame = true;
          
          gameDetails.push({
            gameId: entry.gameId || `game_${index + 1}`,
            hr: hr,
            ab: ab,
            didPlay: didPlay
          });
          
          console.log(`[findPlayerGameHistory]   Game ${index + 1} (${entry.gameId || 'unknown'}): ${hr} HR, ${ab} AB`);
        });
        
        console.log(`[findPlayerGameHistory]   TOTAL for ${dateKey}: ${totalHRs} HR, ${totalAB} AB, Played: ${didPlayAnyGame}`);
        
        gameHistory.push({
          date: dateKey,
          homeRuns: totalHRs,
          atBats: totalAB,
          didPlay: didPlayAnyGame,
          gameCount: playerEntries.length,
          gameDetails: gameDetails // For debugging
        });
      }
    }
  });
  
  return gameHistory.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * ENHANCED: Calculate games since last home run - HANDLES MULTIPLE GAMES PER DAY
 */
function calculateGamesSinceLastHR(gameHistory) {
  if (!gameHistory || gameHistory.length === 0) {
    return {
      gamesSinceLastHR: 0,
      daysSinceLastHR: 0,
      gamesPlayed: 0,
      homeRunsThisSeason: 0,
      lastHRDetails: null
    };
  }
  
  // Calculate totals across all games
  const gamesPlayedList = gameHistory.filter(game => game.didPlay);
  const gamesPlayed = gamesPlayedList.length;
  const homeRunsThisSeason = gameHistory.reduce((sum, game) => sum + game.homeRuns, 0);
  
  console.log(`[calculateGamesSinceLastHR] Player totals: ${gamesPlayed} games played, ${homeRunsThisSeason} HRs total`);
  
  // Find the most recent game with a home run
  let lastHRGameIndex = -1;
  let lastHRDetails = null;
  
  for (let i = gamesPlayedList.length - 1; i >= 0; i--) {
    if (gamesPlayedList[i].homeRuns > 0) {
      lastHRGameIndex = i;
      lastHRDetails = {
        date: gamesPlayedList[i].date,
        homeRuns: gamesPlayedList[i].homeRuns,
        gameCount: gamesPlayedList[i].gameCount,
        gameDetails: gamesPlayedList[i].gameDetails
      };
      
      console.log(`[calculateGamesSinceLastHR] Last HR found on ${lastHRDetails.date}: ${lastHRDetails.homeRuns} HR(s) in ${lastHRDetails.gameCount} game(s)`);
      
      // If multiple games on the HR date, show which specific games had HRs
      if (lastHRDetails.gameDetails && lastHRDetails.gameDetails.length > 1) {
        const hrGames = lastHRDetails.gameDetails.filter(g => g.hr > 0);
        console.log(`[calculateGamesSinceLastHR]   HR details:`, hrGames.map(g => `Game ${g.gameId}: ${g.hr} HR`).join(', '));
      }
      
      break;
    }
  }
  
  let gamesSinceLastHR = 0;
  let daysSinceLastHR = 0;

  if (lastHRGameIndex !== -1) {
    gamesSinceLastHR = gamesPlayedList.length - 1 - lastHRGameIndex;
    
    const lastHRDate = new Date(gamesPlayedList[lastHRGameIndex].date);
    const latestGameDate = gamesPlayedList.length > 0 ? new Date(gamesPlayedList[gamesPlayedList.length - 1].date) : new Date(gameHistory[gameHistory.length-1].date);
    daysSinceLastHR = Math.floor((latestGameDate - lastHRDate) / (1000 * 60 * 60 * 24));

    console.log(`[calculateGamesSinceLastHR] Games since last HR: ${gamesSinceLastHR}, Days since: ${daysSinceLastHR}`);
  } else {
    gamesSinceLastHR = gamesPlayed;
    if (gamesPlayed > 0) {
      const firstGameDate = new Date(gamesPlayedList[0].date);
      const latestGameDate = new Date(gamesPlayedList[gamesPlayedList.length - 1].date);
      daysSinceLastHR = Math.floor((latestGameDate - firstGameDate) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      daysSinceLastHR = 0;
    }
    
    console.log(`[calculateGamesSinceLastHR] No HRs this season. Games played: ${gamesPlayed}, Days span: ${daysSinceLastHR}`);
  }
  
  return {
    gamesSinceLastHR,
    daysSinceLastHR,
    gamesPlayed,
    homeRunsThisSeason,
    lastHRDetails
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
    console.error('[generateHRPredictions] Failed to load roster data');
    return false;
  }
  console.log(`[generateHRPredictions] Loaded ${rosterData.length} players from roster.`);
  
  const healthyRosterData = filterHealthyPlayers(rosterData);
  console.log(`[generateHRPredictions] Filtered out ${rosterData.length - healthyRosterData.length} injured players from roster`);
  
  const hitters = healthyRosterData.filter(player => 
    player.type === 'hitter' || !player.type
  );
  console.log(`[generateHRPredictions] Found ${hitters.length} healthy hitters in roster.`);
  
  console.log('[generateHRPredictions] 2. Finding most recent game data file...');
  const todaysDataFile = findMostRecentDataFile(targetDate);
  if (!todaysDataFile) {
    console.error('[generateHRPredictions] No suitable game data found for today');
    return false;
  }
  
  console.log(`[generateHRPredictions] Using game data file: ${todaysDataFile}`);
  const todaysData = readJsonFile(todaysDataFile);
  if (!todaysData) {
    console.error('[generateHRPredictions] Failed to load today\'s game data');
    return false;
  }
  
  console.log('[generateHRPredictions] 3. Loading all season data for game history...');
  const seasonData = loadAllSeasonData();
  console.log(`[generateHRPredictions] Loaded data for ${Object.keys(seasonData).length} dates`);
  
  console.log('[generateHRPredictions] 4. Finding players scheduled for today\'s games...');
  const teamsPlayingToday = new Set();
  if (todaysData.games && todaysData.games.length > 0) {
    todaysData.games.forEach(game => {
      teamsPlayingToday.add(game.homeTeam);
      teamsPlayingToday.add(game.awayTeam);
    });
    console.log(`[generateHRPredictions] Found ${teamsPlayingToday.size} teams scheduled to play based on ${todaysDataFile}.`);
  } else {
    console.warn('[generateHRPredictions] No games found in today\'s data. Including all teams.');
    healthyRosterData.forEach(player => {
      if (player.team) {
        teamsPlayingToday.add(player.team);
      }
    });
  }
  
  console.log('[generateHRPredictions] 5. Calculating HR predictions...');
  
  let processedCount = 0;
  let teamFilteredCount = 0;
  let sufficientDataCount = 0;
  let dueCount = 0;
  
  const playerPredictions = hitters
    .map(player => {
      processedCount++;
      
      if (!teamsPlayingToday.has(player.team)) {
        return null;
      }
      teamFilteredCount++;
      
      console.log(`[generateHRPredictions] Processing ${player.name} (${player.team})...`);
      
      const gameHistory = findPlayerGameHistory(player.name, player.team, seasonData);
      
      if (gameHistory.length === 0) {
        console.log(`[generateHRPredictions]   No game history found for ${player.name}`);
        return null;
      }
      sufficientDataCount++;
      
      const { 
        gamesSinceLastHR, 
        daysSinceLastHR, 
        gamesPlayed, 
        homeRunsThisSeason,
        lastHRDetails
      } = calculateGamesSinceLastHR(gameHistory);
      
      const hrRate = gamesPlayed > 0 ? homeRunsThisSeason / gamesPlayed : 0;
      const expectedGamesBetweenHRs = hrRate > 0 ? Math.round(1 / hrRate) : 30;
      const expectedHRs = hrRate * gamesPlayed;
      const hrDeficit = expectedHRs - homeRunsThisSeason;
      
      let dueScore = 0;
      
      if (homeRunsThisSeason > 0) {
        dueScore = gamesSinceLastHR / (expectedGamesBetweenHRs * 0.75);
      } else if (gamesPlayed >= 5) {
        dueScore = gamesPlayed / 20;
      }
      
      const isDue = (homeRunsThisSeason > 0 && gamesSinceLastHR >= expectedGamesBetweenHRs * 0.75) || 
                    (homeRunsThisSeason === 0 && gamesPlayed >= 10);
      
      if (isDue) {
        dueCount++;
        console.log(`[generateHRPredictions]   ✅ ${player.name} is DUE: ${gamesSinceLastHR} games since last HR (expected every ${expectedGamesBetweenHRs} games)`);
        if (lastHRDetails) {
          console.log(`[generateHRPredictions]      Last HR: ${lastHRDetails.date} (${lastHRDetails.homeRuns} HR in ${lastHRDetails.gameCount} game(s))`);
        }
      } else {
        console.log(`[generateHRPredictions]   ➖ ${player.name} not due: ${gamesSinceLastHR} games since last HR`);
      }
      
      const fullName = player.fullName || player.name;
      
      const predictionData = {
        name: player.name || "",
        fullName: fullName || player.name || "",
        team: player.team || "",
        gamesPlayed: gamesPlayed || 0,
        homeRunsThisSeason: homeRunsThisSeason || 0,
        hrRate: hrRate || 0,
        expectedHRs: expectedHRs || 0,
        actualHRs: homeRunsThisSeason || 0, 
        hrDeficit: hrDeficit || 0,
        gamesSinceLastHR: gamesSinceLastHR || 0,
        daysSinceLastHR: daysSinceLastHR || 0,
        lastHRDate: lastHRDetails?.date || null,
        lastHRDetails: lastHRDetails, // Include full details for debugging
        expectedGamesBetweenHRs: expectedGamesBetweenHRs || 0,
        isDue: isDue || false,
        dueScore: dueScore || 0
      };
      
      return isDue ? predictionData : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.dueScore - a.dueScore);
  
  console.log(`[generateHRPredictions] Processed ${processedCount} healthy hitters from roster. Found ${teamFilteredCount} on today's teams, ${sufficientDataCount} with game data, and ${dueCount} considered "due" for a HR.`);
  
  const predictions = playerPredictions;

  console.log(`[generateHRPredictions] Including ${predictions.length} players who are due for HRs in the output file.`);
  
  if (predictions.length === 0) {
    console.warn('[generateHRPredictions] No predictions generated. Adding default prediction to prevent errors.');
    predictions.push({
      name: "Default Player",
      fullName: "Default Player",
      team: "N/A",
      gamesPlayed: 0,
      homeRunsThisSeason: 0,
      hrRate: 0,
      expectedHRs: 0,
      actualHRs: 0,
      hrDeficit: 0,
      gamesSinceLastHR: 0,
      daysSinceLastHR: 0,
      lastHRDate: null,
      lastHRDetails: null,
      expectedGamesBetweenHRs: 0,
      isDue: false,
      dueScore: 0
    });
  }
  
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    predictions: predictions,
    totalDuePlayers: predictions.length,
    teamsRepresented: [...new Set(predictions.map(p => p.team))].length,
    generationNote: "ENHANCED: Now properly handles multiple games per day (doubleheaders, makeup games)"
  };
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const outputFileName = `hr_predictions_${year}-${month}-${day}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  console.log(`[generateHRPredictions] Writing ${predictions.length} predictions to ${outputPath}...`);
  const success = writeJsonFile(outputPath, outputData);
  
  if (success) {
    const latestPath = path.join(OUTPUT_DIR, 'hr_predictions_latest.json');
    writeJsonFile(latestPath, outputData);
  }
  
  console.log('[generateHRPredictions] Enhanced HR predictions generation complete!');
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
  
  const healthyRosterData = filterHealthyPlayers(rosterData);
  console.log(`[generatePlayerPerformance] Filtered out ${rosterData.length - healthyRosterData.length} injured players from roster`);
  
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
    
    const rosterPlayer = healthyRosterData.find(r => 
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
    const { gamesPlayed, homeRunsThisSeason, gamesSinceLastHR, daysSinceLastHR, lastHRDetails } = currentSeasonStats;

    if (gamesPlayed === 0) continue;

    const actualHRRate = homeRunsThisSeason / gamesPlayed;
    const expectedHRs = historicalHRRate * gamesPlayed;
    const hrDifference = homeRunsThisSeason - expectedHRs;
    
    const performanceIndicator = historicalHRRate > 0 ? 
      (actualHRRate / historicalHRRate - 1) * 100 :
      (actualHRRate > 0 ? 100 : 0);
    
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
      lastHRDate: lastHRDetails?.date || null,
      lastHRDetails: lastHRDetails, // Include enhanced details
      gamesSinceLastHR,
      daysSinceLastHR,
      status: performanceIndicator > 0 ? "over-performing" : (performanceIndicator < 0 ? "under-performing" : "as-expected")
    });
  }
  
  processedPlayers.sort((a, b) => b.homeRunsThisSeason - a.homeRunsThisSeason);
  
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    players: processedPlayers,
    enhancementNote: "Now properly handles multiple games per day in performance calculations"
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
  
  console.log('[generatePlayerPerformance] Enhanced player performance data generation complete!');
  return success;
}

/**
 * Main function to run all data generation processes
 */
async function generateAllData(targetDate = new Date()) {
  console.log(`🚀 Starting ENHANCED data generation for ${targetDate.toDateString()} (Multiple Games Support)`);
  
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
      targetDate = new Date(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate());
    } else {
      console.warn(`Invalid date argument: ${dateArg}. Using today's date.`);
    }
  }
  
  generateAllData(targetDate)
    .then(success => {
      if (success) {
        console.log('✅ Successfully generated all enhanced data sets!');
      } else {
        console.error('❌ One or more data generation processes encountered issues or failed.');
      }
    })
    .catch(error => {
      console.error('💥 Critical error during data generation:', error);
      process.exit(1);
    });
}

module.exports = { generateHRPredictions, generatePlayerPerformance, generateAllData };