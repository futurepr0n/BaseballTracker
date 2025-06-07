/**
 * Enhanced generateRollingStats.js
 * 
 * This script crawls through all season data files and generates comprehensive
 * rolling statistics for players, including ALL players with stats (not just top 50)
 * to support comprehensive team filtering in the dashboard.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SEASON_DATA_DIR = path.join(__dirname, '../../public/data/2025');
const OUTPUT_DIR = path.join(__dirname, '../../public/data/rolling_stats');
const ROSTER_PATH = path.join(__dirname, '../../public/data/rosters.json');

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
 * Load all season data from month directories
 */
function loadAllSeasonData() {
  console.log('[loadAllSeasonData] Loading complete season data...');
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
    
    console.log(`[loadAllSeasonData] Processing ${files.length} files in ${monthDirName}`);
    
    for (const file of files) {
      const filePath = path.join(monthDirPath, file);
      const data = readJsonFile(filePath);
      
      if (data && data.players) {
        const parts = file.replace('.json', '').split('_');
        if (parts.length === 3) {
          const fileMonthName = parts[0];
          const day = parts[1].padStart(2, '0');
          const year = parts[2];
          
          const date = new Date(`${fileMonthName} 1, ${year}`);
          if (isNaN(date.getTime())) {
            console.warn(`[loadAllSeasonData] Could not parse date from filename: ${file}`);
            continue;
          }
          const monthNum = date.getMonth() + 1;
          const monthNumStr = String(monthNum).padStart(2, '0');
          
          const dateKey = `${year}-${monthNumStr}-${day}`;
          seasonData[dateKey] = data;
          
          console.log(`[loadAllSeasonData] Loaded ${data.players.length} player records for ${dateKey}`);
        }
      }
    }
  });

  console.log(`[loadAllSeasonData] Loaded data for ${Object.keys(seasonData).length} dates`);
  return seasonData;
}

/**
 * Process a single player's game data and aggregate stats
 */
function processPlayerGameData(playerEntries, playerName, playerTeam) {
  let totalGamesPlayed = 0;
  let totalHRs = 0;
  let totalHits = 0;
  let totalABs = 0;
  let totalRuns = 0;
  let totalRBIs = 0;
  let totalDoubles = 0;
  let totalTriples = 0;
  let totalBBs = 0;
  let totalStrikeouts = 0;
  
  // For pitchers
  let totalIP = 0;
  let totalPitcherHits = 0;
  let totalER = 0;
  let totalPitcherBBs = 0;
  let totalPitcherKs = 0;
  let totalPitcherHRs = 0;
  
  const gameLog = [];
  
  playerEntries.forEach(entry => {
    const { date, games } = entry;
    
    // Process each game for this date
    games.forEach((game, gameIndex) => {
      const { player, gameId } = game;
      
      // Skip DNP entries for game counting
      if (player.H === 'DNP' && player.AB === 'DNP') {
        return;
      }
      
      totalGamesPlayed++;
      
      // Process hitter stats
      if (player.playerType === 'hitter' || !player.playerType) {
        const hrs = Number(player.HR) || 0;
        const hits = Number(player.H) || 0;
        const abs = Number(player.AB) || 0;
        const runs = Number(player.R) || 0;
        const rbis = Number(player.RBI) || 0;
        const doubles = Number(player['2B']) || 0;
        const triples = Number(player['3B']) || 0;
        const bbs = Number(player.BB) || 0;
        const ks = Number(player.K) || 0;
        
        totalHRs += hrs;
        totalHits += hits;
        totalABs += abs;
        totalRuns += runs;
        totalRBIs += rbis;
        totalDoubles += doubles;
        totalTriples += triples;
        totalBBs += bbs;
        totalStrikeouts += ks;
        
        gameLog.push({
          date,
          gameId,
          gameIndex,
          hrs,
          hits,
          abs,
          runs,
          rbis,
          avg: abs > 0 ? (hits / abs).toFixed(3) : '.000'
        });
      }
      
      // Process pitcher stats
      if (player.playerType === 'pitcher') {
        const ip = Number(player.IP) || 0;
        const hits = Number(player.H) || 0;
        const er = Number(player.ER) || 0;
        const bbs = Number(player.BB) || 0;
        const ks = Number(player.K) || 0;
        const hrs = Number(player.HR) || 0;
        
        totalIP += ip;
        totalPitcherHits += hits;
        totalER += er;
        totalPitcherBBs += bbs;
        totalPitcherKs += ks;
        totalPitcherHRs += hrs;
        
        gameLog.push({
          date,
          gameId,
          gameIndex,
          ip,
          hits,
          er,
          bbs,
          ks,
          hrs,
          era: ip > 0 ? ((er * 9) / ip).toFixed(2) : '0.00'
        });
      }
    });
  });
  
  // Calculate rates and averages
  const battingAvg = totalABs > 0 ? (totalHits / totalABs).toFixed(3) : '.000';
  const hrRate = totalABs > 0 ? (totalHRs / totalABs).toFixed(3) : '.000';
  const opsBase = totalABs > 0 ? {
    obp: ((totalHits + totalBBs) / (totalABs + totalBBs)).toFixed(3),
    slg: ((totalHits + totalDoubles + (totalTriples * 2) + (totalHRs * 3)) / totalABs).toFixed(3)
  } : { obp: '.000', slg: '.000' };
  
  const era = totalIP > 0 ? ((totalER * 9) / totalIP).toFixed(2) : '0.00';
  const whip = totalIP > 0 ? ((totalPitcherHits + totalPitcherBBs) / totalIP).toFixed(2) : '0.00';
  
  return {
    name: playerName,
    team: playerTeam,
    gamesPlayed: totalGamesPlayed,
    
    // Hitting stats
    totalHRs,
    totalHits,
    totalABs,
    totalRuns,
    totalRBIs,
    totalDoubles,
    totalTriples,
    totalBBs,
    totalStrikeouts,
    battingAvg,
    hrRate,
    obp: opsBase.obp,
    slg: opsBase.slg,
    ops: totalABs > 0 ? (parseFloat(opsBase.obp) + parseFloat(opsBase.slg)).toFixed(3) : '.000',
    
    // Pitching stats
    totalIP,
    totalPitcherHits,
    totalER,
    totalPitcherBBs,
    totalPitcherKs,
    totalPitcherHRs,
    era,
    whip,
    
    // Performance metrics
    hitsPerGame: totalGamesPlayed > 0 ? (totalHits / totalGamesPlayed).toFixed(2) : '0.00',
    hrsPerGame: totalGamesPlayed > 0 ? (totalHRs / totalGamesPlayed).toFixed(2) : '0.00',
    
    // Game log for reference
    gameLog,
    lastGameDate: gameLog.length > 0 ? gameLog[gameLog.length - 1].date : null
  };
}

/**
 * Generate comprehensive rolling stats for all players
 * ENHANCED: Now includes many more players to support team filtering
 */
function generateRollingStats(seasonData, targetDate = new Date()) {
  console.log(`[generateRollingStats] Generating rolling stats up to ${targetDate.toDateString()}`);
  
  // Create player tracking map: playerKey -> { dates: [], games: [] }
  const playerGameMap = new Map();
  
  // Get all dates up to the target date, sorted chronologically
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const allDates = Object.keys(seasonData)
    .filter(dateKey => dateKey <= targetDateStr)
    .sort();
  
  console.log(`[generateRollingStats] Processing ${allDates.length} dates up to ${targetDateStr}`);
  
  // Process each date
  allDates.forEach(dateKey => {
    const gameData = seasonData[dateKey];
    
    if (gameData.players) {
      console.log(`[generateRollingStats] Processing ${gameData.players.length} player entries for ${dateKey}`);
      
      // Group players by name and team to handle multiple games per day
      const playersByKey = new Map();
      
      gameData.players.forEach(player => {
        const playerKey = `${player.name}_${player.team}`;
        
        if (!playersByKey.has(playerKey)) {
          playersByKey.set(playerKey, []);
        }
        
        playersByKey.get(playerKey).push({
          player,
          gameId: player.gameId || 'unknown'
        });
      });
      
      // Process each unique player for this date
      playersByKey.forEach((games, playerKey) => {
        if (!playerGameMap.has(playerKey)) {
          const [name, team] = playerKey.split('_');
          playerGameMap.set(playerKey, {
            name,
            team,
            entries: []
          });
        }
        
        // Add this date's games to the player's history
        playerGameMap.get(playerKey).entries.push({
          date: dateKey,
          games
        });
      });
    }
  });
  
  console.log(`[generateRollingStats] Found ${playerGameMap.size} unique players`);
  
  // Process each player's complete game history
  const allPlayerStats = [];
  
  playerGameMap.forEach((playerData, playerKey) => {
    const { name, team, entries } = playerData;
    
    if (entries.length === 0) return;
    
    console.log(`[generateRollingStats] Processing ${name} (${team}): ${entries.length} date entries`);
    
    const playerStats = processPlayerGameData(entries, name, team);
    allPlayerStats.push(playerStats);
  });
  
  console.log(`[generateRollingStats] Processed ${allPlayerStats.length} players`);
  
  // Separate into hitters and pitchers
  const hitters = allPlayerStats.filter(player => 
    player.totalABs > 0 || player.totalHits > 0
  );
  
  const pitchers = allPlayerStats.filter(player => 
    player.totalIP > 0 || player.totalPitcherKs > 0
  );
  
  // ENHANCED: Create more comprehensive lists for team filtering support
  
  // All hitters with hits (for comprehensive team filtering)
  const allHittersWithHits = [...hitters]
    .filter(player => player.gamesPlayed >= 1 && player.totalHits > 0)
    .sort((a, b) => b.totalHits - a.totalHits);
  
  // All hitters with HRs (for comprehensive team filtering)
  const allHittersWithHRs = [...hitters]
    .filter(player => player.totalHRs > 0)
    .sort((a, b) => b.totalHRs - a.totalHRs);
  
  // All pitchers with strikeouts (for comprehensive team filtering)  
  const allPitchersWithKs = [...pitchers]
    .filter(player => player.gamesPlayed >= 1 && player.totalPitcherKs > 0)
    .sort((a, b) => b.totalPitcherKs - a.totalPitcherKs);
  
  // Create top lists for global display (limited)
  const topHitters = allHittersWithHits.slice(0, 50);
  const topHRLeaders = allHittersWithHRs.slice(0, 50);
  const topStrikeoutPitchers = allPitchersWithKs.slice(0, 50);
  
  // Create additional comprehensive lists by team for filtering
  const hittersByTeam = {};
  const hrLeadersByTeam = {};
  const strikeoutPitchersByTeam = {};
  
  // Group by team for comprehensive filtering
  allHittersWithHits.forEach(player => {
    if (!hittersByTeam[player.team]) {
      hittersByTeam[player.team] = [];
    }
    hittersByTeam[player.team].push(player);
  });
  
  allHittersWithHRs.forEach(player => {
    if (!hrLeadersByTeam[player.team]) {
      hrLeadersByTeam[player.team] = [];
    }
    hrLeadersByTeam[player.team].push(player);
  });
  
  allPitchersWithKs.forEach(player => {
    if (!strikeoutPitchersByTeam[player.team]) {
      strikeoutPitchersByTeam[player.team] = [];
    }
    strikeoutPitchersByTeam[player.team].push(player);
  });
  
  console.log(`[generateRollingStats] Created comprehensive data:
    - All Hitters: ${allHittersWithHits.length}
    - All HR Leaders: ${allHittersWithHRs.length}  
    - All Strikeout Pitchers: ${allPitchersWithKs.length}
    - Teams with Hitters: ${Object.keys(hittersByTeam).length}
    - Teams with HR Leaders: ${Object.keys(hrLeadersByTeam).length}
    - Teams with Strikeout Pitchers: ${Object.keys(strikeoutPitchersByTeam).length}`);
  
  return {
    date: targetDateStr,
    updatedAt: new Date().toISOString(),
    totalPlayers: allPlayerStats.length,
    totalHitters: hitters.length,
    totalPitchers: pitchers.length,
    
    // Top performer lists (formatted for dashboard compatibility) - LIMITED FOR GLOBAL VIEW
    topHitters: topHitters.map(player => ({
      name: player.name,
      team: player.team,
      H: player.totalHits,
      games: player.gamesPlayed,
      avg: player.battingAvg
    })),
    
    topHRLeaders: topHRLeaders.map(player => ({
      name: player.name,
      team: player.team,
      HR: player.totalHRs,
      games: player.gamesPlayed,
      rate: player.hrRate
    })),
    
    topStrikeoutPitchers: topStrikeoutPitchers.map(player => ({
      name: player.name,
      team: player.team,
      K: player.totalPitcherKs,
      games: player.gamesPlayed,
      IP: player.totalIP.toFixed(1)
    })),
    
    // COMPREHENSIVE DATA FOR TEAM FILTERING - ALL PLAYERS WITH STATS
    allHitters: allHittersWithHits.map(player => ({
      name: player.name,
      team: player.team,
      H: player.totalHits,
      games: player.gamesPlayed,
      avg: player.battingAvg,
      AB: player.totalABs,
      R: player.totalRuns,
      RBI: player.totalRBIs
    })),
    
    allHRLeaders: allHittersWithHRs.map(player => ({
      name: player.name,
      team: player.team,
      HR: player.totalHRs,
      games: player.gamesPlayed,
      rate: player.hrRate,
      hrsPerGame: player.hrsPerGame
    })),
    
    allStrikeoutPitchers: allPitchersWithKs.map(player => ({
      name: player.name,
      team: player.team,
      K: player.totalPitcherKs,
      games: player.gamesPlayed,
      IP: player.totalIP.toFixed(1),
      ERA: player.era,
      WHIP: player.whip
    })),
    
    // TEAM-ORGANIZED DATA FOR EFFICIENT FILTERING
    hittersByTeam,
    hrLeadersByTeam,
    strikeoutPitchersByTeam,
    
    // Complete player stats for further analysis
    allPlayerStats
  };
}

/**
 * Generate rolling stats for multiple time periods
 */
async function generateAllRollingStats(targetDate = new Date()) {
  console.log(`Starting comprehensive rolling stats generation for ${targetDate.toDateString()}`);
  
  // Load all season data
  const seasonData = loadAllSeasonData();
  
  if (Object.keys(seasonData).length === 0) {
    console.error('No season data found. Cannot generate rolling stats.');
    return false;
  }
  
  // Generate stats for different time periods
  const periods = [
    { name: 'season', days: 365, label: 'Season to Date' },
    { name: 'last_30', days: 30, label: 'Last 30 Days' },
    { name: 'last_7', days: 7, label: 'Last 7 Days' },
    { name: 'current', days: 0, label: 'Current Date' }
  ];
  
  for (const period of periods) {
    console.log(`\n[generateAllRollingStats] Generating ${period.label} stats...`);
    
    const periodDate = new Date(targetDate);
    if (period.days > 0) {
      periodDate.setDate(periodDate.getDate() - period.days);
    }
    
    const rollingStats = generateRollingStats(seasonData, targetDate);
    
    // Write the output file
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const outputFileName = `rolling_stats_${period.name}_${year}-${month}-${day}.json`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    
    const success = writeJsonFile(outputPath, {
      ...rollingStats,
      period: period.label,
      periodDays: period.days
    });
    
    if (success) {
      // Also write to latest file for this period
      const latestPath = path.join(OUTPUT_DIR, `rolling_stats_${period.name}_latest.json`);
      writeJsonFile(latestPath, {
        ...rollingStats,
        period: period.label,
        periodDays: period.days
      });
      
      console.log(`✅ Generated ${period.label} with ${rollingStats.allHitters.length} total hitters, ${rollingStats.allHRLeaders.length} total HR leaders`);
    }
  }
  
  console.log('\n[generateAllRollingStats] Rolling stats generation complete!');
  return true;
}

/**
 * CLI execution
 */
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
  
  generateAllRollingStats(targetDate)
    .then(success => {
      if (success) {
        console.log('✅ Successfully generated all comprehensive rolling statistics!');
      } else {
        console.error('❌ Rolling statistics generation failed.');
      }
    })
    .catch(error => {
      console.error('💥 Critical error during rolling stats generation:', error);
      process.exit(1);
    });
}

module.exports = { generateRollingStats, generateAllRollingStats };