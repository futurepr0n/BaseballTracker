/**
 * generatePitcherMatchups.js
 * 
 * This script analyzes pitcher vs. batter matchups based on handedness
 * and generates prediction data for the dashboard.
 */

const fs = require('fs');
const path = require('path');

// Import centralized configuration
const { paths } = require('../../config/dataPath');

// Configuration
const ROSTER_PATH = paths.rosters;
const SEASON_DATA_DIR = paths.gameData(2025);
const OUTPUT_DIR = paths.predictions;

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
      .sort((a, b) => {
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

  // If no files in current month, check previous months
  console.log(`[findMostRecentDataFile] No files in ${monthName} directory. Checking previous months.`);
  const allMonthDirs = fs.readdirSync(SEASON_DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  // Sort months chronologically descending
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
 * Analyzes matchups between one team's pitchers and another team's batters
 */
function analyzeTeamMatchup(pitchingTeam, battingTeam, pitchersByTeam, battersByTeam, matchupsByPitcher, matchupsByTeam) {
  const pitchers = pitchersByTeam.get(pitchingTeam) || [];
  
  // If there are no pitchers for this team, skip processing
  if (pitchers.length === 0) return;
  
  // Get batters for opposing team, or use an empty array if missing
  const batters = battersByTeam.get(battingTeam) || [];
  
  // Count left and right-handed batters
  const leftHandedBatters = batters.filter(b => b.bats === 'L');
  const rightHandedBatters = batters.filter(b => b.bats === 'R');
  const switchHitters = batters.filter(b => b.bats === 'S');
  
  const totalBatters = leftHandedBatters.length + rightHandedBatters.length + switchHitters.length;
  
  // Default values for when we don't have batter data
  const defaultLeftHandedBatters = 4;  // League average approximation
  const defaultRightHandedBatters = 5; // League average approximation
  const defaultSwitchHitters = 1;      // League average approximation
  const defaultTotalBatters = defaultLeftHandedBatters + defaultRightHandedBatters + defaultSwitchHitters;
  
  // Calculate team-level stats
  let favorableMatchups = 0;
  
  // Analyze each pitcher
  pitchers.forEach(pitcher => {
    if (!pitcher.ph) return; // Skip if no pitching hand data
    
    const pitchingHand = pitcher.ph;
    
    // Batters with same-handedness (tough matchups) and opposite-handedness (favorable)
    let sameHandedBatters = [];
    let oppositeHandedBatters = [];
    let sameHandedSwitchHitters = [];
    let oppositeHandedSwitchHitters = [];
    
    if (totalBatters > 0) {
      // Use actual data if available
      if (pitchingHand === 'L') {
        // Left-handed pitcher
        sameHandedBatters = leftHandedBatters;
        oppositeHandedBatters = rightHandedBatters;
        
        // For switch hitters, we'll assign half to each category
        // We'll alternate for odd numbers to ensure we don't double count
        const halfSwitchCount = Math.floor(switchHitters.length / 2);
        sameHandedSwitchHitters = switchHitters.slice(0, Math.ceil(switchHitters.length / 2));
        oppositeHandedSwitchHitters = switchHitters.slice(Math.ceil(switchHitters.length / 2));
      } else if (pitchingHand === 'R') {
        // Right-handed pitcher
        sameHandedBatters = rightHandedBatters;
        oppositeHandedBatters = leftHandedBatters;
        
        // For switch hitters, we'll assign half to each category
        const halfSwitchCount = Math.floor(switchHitters.length / 2);
        sameHandedSwitchHitters = switchHitters.slice(0, Math.ceil(switchHitters.length / 2));
        oppositeHandedSwitchHitters = switchHitters.slice(Math.ceil(switchHitters.length / 2));
      }
    }
    
    // Calculate totals
    const totalSameHanded = sameHandedBatters.length + sameHandedSwitchHitters.length;
    const totalOppositeHanded = oppositeHandedBatters.length + oppositeHandedSwitchHitters.length;
    const actualTotalBatters = totalBatters > 0 ? totalBatters : defaultTotalBatters;
    
    // Calculate percentages
    const sameHandednessPercentage = totalBatters > 0 
      ? (totalSameHanded / actualTotalBatters) 
      : (pitchingHand === 'L' 
          ? defaultLeftHandedBatters / defaultTotalBatters 
          : defaultRightHandedBatters / defaultTotalBatters);
    
    const oppositeHandednessPercentage = totalBatters > 0 
      ? (totalOppositeHanded / actualTotalBatters) 
      : (pitchingHand === 'L' 
          ? defaultRightHandedBatters / defaultTotalBatters 
          : defaultLeftHandedBatters / defaultTotalBatters);
    
    // Combine actual batters and switch hitters for the final lists
    const allSameHandedBatters = [...sameHandedBatters, ...sameHandedSwitchHitters];
    const allOppositeHandedBatters = [...oppositeHandedBatters, ...oppositeHandedSwitchHitters];
    
    // Add pitcher matchup stats
    matchupsByPitcher.push({
      name: pitcher.fullName || pitcher.name,
      team: pitcher.team,
      pitchingHand,
      opposingTeam: battingTeam,
      sameHandedBatters: totalSameHanded,
      oppositeHandedBatters: totalOppositeHanded,
      totalBatters: actualTotalBatters,
      sameHandednessPercentage,
      oppositeHandednessPercentage,
      pitches: pitcher.pitches || [],
      isEstimated: totalBatters === 0, // Flag to indicate if we used estimated data
      sameHandedBattersList: allSameHandedBatters.map(b => ({
        name: b.fullName || b.name,
        team: b.team,
        hand: b.bats,
        isSwitch: b.bats === 'S'
      })),
      oppositeHandedBattersList: allOppositeHandedBatters.map(b => ({
        name: b.fullName || b.name,
        team: b.team,
        hand: b.bats,
        isSwitch: b.bats === 'S'
      }))
    });
    
    // Update team stats - if pitcher has more opposite-handed batters, it's favorable
    if (oppositeHandednessPercentage > 0.5) {
      favorableMatchups++;
    }
  });
  
  // Calculate team-level percentage
  const totalPitchers = pitchers.length;
  if (totalPitchers > 0) {
    const favorableMatchupPercentage = favorableMatchups / totalPitchers;
    
    // Add team matchup stats
    matchupsByTeam.push({
      team: pitchingTeam,
      opposingTeam: battingTeam,
      favorablePitcherMatchups: favorableMatchups,
      totalPitchers,
      favorableMatchupPercentage,
      opposingLeftHandedBatters: totalBatters > 0 ? leftHandedBatters.length : defaultLeftHandedBatters,
      opposingRightHandedBatters: totalBatters > 0 ? rightHandedBatters.length : defaultRightHandedBatters,
      opposingSwitchHitters: totalBatters > 0 ? switchHitters.length : defaultSwitchHitters,
      isEstimated: totalBatters === 0 // Flag to indicate if we used estimated data
    });
  }
}

/**
 * Generate pitcher matchup analysis for a specific date
 */
async function generatePitcherMatchups(targetDate = new Date()) {
  console.log(`[generatePitcherMatchups] Generating pitcher matchup analysis for ${targetDate.toDateString()}`);
  
  // 1. Load roster data for player information
  console.log('[generatePitcherMatchups] Loading roster data...');
  const rosterData = readJsonFile(ROSTER_PATH);
  if (!rosterData) {
    console.error('[generatePitcherMatchups] Failed to load roster data');
    return false;
  }
  
  // Filter out injured players
  const healthyRosterData = filterHealthyPlayers(rosterData);
  console.log(`[generatePitcherMatchups] Filtered out ${rosterData.length - healthyRosterData.length} injured players from roster`);
  
  // Create lookup maps for pitchers and batters by team (only healthy players)
  const pitchersByTeam = new Map();
  const battersByTeam = new Map();
  
  healthyRosterData.forEach(player => {
    if (!player.team) return;
    
    if (player.type === 'pitcher' || (!player.type && player.ph)) {
      if (!pitchersByTeam.has(player.team)) {
        pitchersByTeam.set(player.team, []);
      }
      pitchersByTeam.get(player.team).push(player);
    } else if (player.type === 'hitter' || (!player.type && player.bats)) {
      if (!battersByTeam.has(player.team)) {
        battersByTeam.set(player.team, []);
      }
      battersByTeam.get(player.team).push(player);
    }
  });
  
  console.log(`[generatePitcherMatchups] Created maps with ${pitchersByTeam.size} teams with pitchers and ${battersByTeam.size} teams with batters`);
  
  // 2. Find today's game data to determine matchups
  console.log('[generatePitcherMatchups] Finding most recent game data file...');
  const todaysDataFile = findMostRecentDataFile(targetDate);
  if (!todaysDataFile) {
    console.error('[generatePitcherMatchups] No suitable game data found for today');
    return false;
  }
  
  console.log(`[generatePitcherMatchups] Using game data file: ${todaysDataFile}`);
  const todaysData = readJsonFile(todaysDataFile);
  if (!todaysData) {
    console.error('[generatePitcherMatchups] Failed to load today\'s game data');
    return false;
  }
  
  // 3. Process each game to analyze pitcher vs. batter matchups
  
  console.log('[generatePitcherMatchups] Analyzing pitcher vs. batter matchups...');

const matchupsByPitcher = [];
const matchupsByTeam = [];
const teamsWithGames = new Set(); // Track teams that have games scheduled

// Check if todaysData has games
if (!todaysData.games || todaysData.games.length === 0) {
  console.warn('[generatePitcherMatchups] No games found in today\'s data.');
  return false; // No games, no analysis
} else {
  // Process each game from the schedule
  todaysData.games.forEach(game => {
    const homeTeam = game.homeTeam;
    const awayTeam = game.awayTeam;
    
    if (!homeTeam || !awayTeam) {
      console.warn(`[generatePitcherMatchups] Invalid game data: missing team info`);
      return;
    }
    
    // Track these teams as having scheduled games
    teamsWithGames.add(homeTeam);
    teamsWithGames.add(awayTeam);
    
    // Process home team pitchers vs. away team batters
    if (pitchersByTeam.has(homeTeam)) {
      analyzeTeamMatchup(homeTeam, awayTeam, pitchersByTeam, battersByTeam, matchupsByPitcher, matchupsByTeam);
    }
    
    // Process away team pitchers vs. home team batters
    if (pitchersByTeam.has(awayTeam)) {
      analyzeTeamMatchup(awayTeam, homeTeam, pitchersByTeam, battersByTeam, matchupsByPitcher, matchupsByTeam);
    }
  });
  
  // Log teams with scheduled games
  console.log(`[generatePitcherMatchups] Teams with scheduled games: ${Array.from(teamsWithGames).join(', ')}`);
  
  // REMOVED: The code that used to process teams without scheduled games
}

// Sort results
matchupsByPitcher.sort((a, b) => b.sameHandednessPercentage - a.sameHandednessPercentage);
matchupsByTeam.sort((a, b) => a.favorableMatchupPercentage - b.favorableMatchupPercentage);
  
  // Sort results
  matchupsByPitcher.sort((a, b) => b.sameHandednessPercentage - a.sameHandednessPercentage);
  matchupsByTeam.sort((a, b) => a.favorableMatchupPercentage - b.favorableMatchupPercentage);
  
  // Group all pitchers by team for the team-based view (only healthy players)
  const allPitchersByTeam = {};
  matchupsByPitcher.forEach(pitcher => {
    if (!allPitchersByTeam[pitcher.team]) {
      allPitchersByTeam[pitcher.team] = [];
    }
    allPitchersByTeam[pitcher.team].push(pitcher);
  });
  
  // Sort pitchers within each team by same-handedness percentage
  Object.keys(allPitchersByTeam).forEach(team => {
    allPitchersByTeam[team].sort((a, b) => b.sameHandednessPercentage - a.sameHandednessPercentage);
  });
  
  // Get top unfavorable pitcher matchups (tough matchups - higher % of same-handed batters)
  const toughPitcherMatchups = matchupsByPitcher
    .filter(m => m.sameHandednessPercentage >= 0.4) // At least 40% same-handed matchups
    .slice(0, 25);
  
  // Get top favorable pitcher matchups (easier matchups - higher % of opposite-handed batters)
  const favorablePitcherMatchups = [...matchupsByPitcher]
    .sort((a, b) => b.oppositeHandednessPercentage - a.oppositeHandednessPercentage)
    .filter(m => m.oppositeHandednessPercentage >= 0.6) // At least 60% opposite-handed matchups
    .slice(0, 25);
  
  // Get team handedness advantages
  const teamHandednessAdvantages = matchupsByTeam
    .filter(m => m.favorableMatchupPercentage >= 0.5)
    .slice(0, 25);
  
  // Create output data - now includes allPitchersByTeam for the team-based view
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    toughPitcherMatchups,
    favorablePitcherMatchups,
    teamHandednessAdvantages,
    allPitchersByTeam
  };
  
  // Write output files
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const outputFileName = `pitcher_matchups_${year}-${month}-${day}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  console.log(`[generatePitcherMatchups] Writing matchup analysis to ${outputPath}...`);
  const success = writeJsonFile(outputPath, outputData);
  
  // Also write to latest.json for easy access
  if (success) {
    const latestPath = path.join(OUTPUT_DIR, 'pitcher_matchups_latest.json');
    writeJsonFile(latestPath, outputData);
  }
  
  console.log('[generatePitcherMatchups] Pitcher matchup analysis complete!');
  return success;
}

/**
 * Main execution function
 */
async function main(targetDate = new Date()) {
  console.log(`Starting pitcher matchup analysis for ${targetDate.toDateString()}`);
  
  const success = await generatePitcherMatchups(targetDate);
  
  if (success) {
    console.log('Pitcher matchup analysis completed successfully.');
  } else {
    console.error('Pitcher matchup analysis failed.');
    process.exit(1);
  }
}

// Run if executed directly
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
  
  main(targetDate)
    .catch(error => {
      console.error('Critical error during pitcher matchup analysis:', error);
      process.exit(1);
    });
}

module.exports = { generatePitcherMatchups };