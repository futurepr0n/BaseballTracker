/**
 * Enhanced generateRollingStats.js - Complete Implementation
 * 
 * This script crawls through all season data files and generates comprehensive
 * rolling statistics for players, including multi-hit performance analysis
 * to support the dashboard with pre-processed data.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SEASON_DATA_DIR = path.join(__dirname, '../../public/data/2025');
const OUTPUT_DIR = path.join(__dirname, '../../public/data/rolling_stats');
const MULTI_HIT_OUTPUT_DIR = path.join(__dirname, '../../public/data/multi_hit_stats');
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

  monthDirs.forEach(monthDir => {
    const monthPath = path.join(SEASON_DATA_DIR, monthDir);
    
    try {
      const files = fs.readdirSync(monthPath).filter(f => f.endsWith('.json'));
      console.log(`[loadAllSeasonData] Processing ${files.length} files in ${monthDir}`);
      
      files.forEach(file => {
        const filePath = path.join(monthPath, file);
        const data = readJsonFile(filePath);
        
        if (data && data.date) {
          seasonData[data.date] = data;
        } else if (data) {
          // Try to extract date from filename if not in data
          const match = file.match(/(\w+)_(\d{1,2})_(\d{4})\.json/);
          if (match) {
            const [, monthName, day, year] = match;
            const monthMap = {
              'january': '01', 'february': '02', 'march': '03', 'april': '04',
              'may': '05', 'june': '06', 'july': '07', 'august': '08',
              'september': '09', 'october': '10', 'november': '11', 'december': '12'
            };
            
            const monthNum = monthMap[monthName.toLowerCase()];
            if (monthNum) {
              const dateKey = `${year}-${monthNum}-${day.padStart(2, '0')}`;
              data.date = dateKey;
              seasonData[dateKey] = data;
            }
          }
        }
      });
    } catch (error) {
      console.error(`[loadAllSeasonData] Error processing ${monthDir}:`, error);
    }
  });

  console.log(`[loadAllSeasonData] Loaded ${Object.keys(seasonData).length} dates`);
  return seasonData;
}

/**
 * Calculate multi-hit game performance for a player
 * UPDATED: Excludes 0 from multi-performance and adds drought analysis
 */
function calculateMultiHitPerformance(playerEntries) {
  const hitDistribution = {};
  const hrDistribution = {};
  let totalMultiHitGames = 0;
  let totalMultiHRGames = 0;
  let totalGames = 0;
  let totalHits = 0;
  let totalHRs = 0;
  let maxHitsInGame = 0;
  let maxHRsInGame = 0;
  
  // Drought tracking
  let hitDroughts = [];
  let hrDroughts = [];
  let currentHitDrought = 0;
  let currentHRDrought = 0;

  playerEntries.forEach(entry => {
    entry.games.forEach(game => {
      const { player } = game;
      
      // Skip DNP entries
      if (player.H === 'DNP' && player.AB === 'DNP') {
        return;
      }

      if (player.playerType === 'hitter' || !player.playerType) {
        const hits = Number(player.H) || 0;
        const hrs = Number(player.HR) || 0;
        
        totalGames++;
        totalHits += hits;
        totalHRs += hrs;
        maxHitsInGame = Math.max(maxHitsInGame, hits);
        maxHRsInGame = Math.max(maxHRsInGame, hrs);
        
        // Track hit distribution (including 0)
        hitDistribution[hits] = (hitDistribution[hits] || 0) + 1;
        
        // Track HR distribution (including 0)
        hrDistribution[hrs] = (hrDistribution[hrs] || 0) + 1;
        
        // UPDATED: Multi-hit games exclude 0 hits
        if (hits >= 2) totalMultiHitGames++;
        
        // UPDATED: Multi-HR games exclude 0 HRs  
        if (hrs >= 1) totalMultiHRGames++;
        
        // Drought tracking for hits
        if (hits >= 2) {
          if (currentHitDrought > 0) {
            hitDroughts.push(currentHitDrought);
            currentHitDrought = 0;
          }
        } else {
          currentHitDrought++;
        }
        
        // Drought tracking for HRs
        if (hrs >= 1) {
          if (currentHRDrought > 0) {
            hrDroughts.push(currentHRDrought);
            currentHRDrought = 0;
          }
        } else {
          currentHRDrought++;
        }
      }
    });
  });

  // Calculate drought statistics
  const avgHitDrought = hitDroughts.length > 0 ? 
    parseFloat((hitDroughts.reduce((sum, d) => sum + d, 0) / hitDroughts.length).toFixed(1)) : 
    currentHitDrought;
    
  const avgHRDrought = hrDroughts.length > 0 ? 
    parseFloat((hrDroughts.reduce((sum, d) => sum + d, 0) / hrDroughts.length).toFixed(1)) : 
    currentHRDrought;

  const multiHitRate = totalGames > 0 ? (totalMultiHitGames / totalGames * 100) : 0;
  const multiHRRate = totalGames > 0 ? (totalMultiHRGames / totalGames * 100) : 0;
  const avgHitsPerGame = totalGames > 0 ? (totalHits / totalGames) : 0;
  const avgHRsPerGame = totalGames > 0 ? (totalHRs / totalGames) : 0;

  return {
    totalGames,
    totalMultiHitGames,
    totalMultiHRGames,
    multiHitRate: parseFloat(multiHitRate.toFixed(1)),
    multiHRRate: parseFloat(multiHRRate.toFixed(1)),
    avgHitsPerGame: parseFloat(avgHitsPerGame.toFixed(2)),
    avgHRsPerGame: parseFloat(avgHRsPerGame.toFixed(2)),
    hitDistribution,
    hrDistribution,
    maxHitsInGame,
    maxHRsInGame,
    
    // NEW: Drought statistics
    avgGamesBetweenMultiHits: avgHitDrought,
    avgGamesBetweenHRs: avgHRDrought,
    currentHitDrought,
    currentHRDrought,
    longestHitDrought: hitDroughts.length > 0 ? Math.max(...hitDroughts, currentHitDrought) : currentHitDrought,
    longestHRDrought: hrDroughts.length > 0 ? Math.max(...hrDroughts, currentHRDrought) : currentHRDrought
  };
}

/**
 * Generate comprehensive multi-hit performance data
 */
function generateMultiHitStats(seasonData, targetDate = new Date()) {
  console.log(`[generateMultiHitStats] Generating season-long multi-hit performance data`);
  
  // Create player tracking map
  const playerGameMap = new Map();
  
  // Get ALL dates for season-long analysis, sorted chronologically
  const allDates = Object.keys(seasonData).sort();
  
  console.log(`[generateMultiHitStats] Processing ${allDates.length} dates for multi-hit analysis`);
  
  // Process each date
  allDates.forEach(dateKey => {
    const gameData = seasonData[dateKey];
    
    if (gameData.players) {
      // Group players by name and team
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
        
        // Add this date's games
        playerGameMap.get(playerKey).entries.push({
          date: dateKey,
          games
        });
      });
    }
  });

  console.log(`[generateMultiHitStats] Processing ${playerGameMap.size} unique players`);

  // Calculate multi-hit performance for each player
  const allMultiHitPerformers = [];
  const allMultiHRPerformers = [];

  playerGameMap.forEach((playerData, playerKey) => {
    const { name, team, entries } = playerData;
    
    if (entries.length === 0) return;
    
    const performance = calculateMultiHitPerformance(entries);
    
    // Only include players with meaningful game counts
    if (performance.totalGames >= 5) {
      const playerStats = {
        name,
        team,
        ...performance
      };
      
      // Add to multi-hit performers if they have multi-hit games
      if (performance.totalMultiHitGames > 0) {
        allMultiHitPerformers.push(playerStats);
      }
      
      // Add to multi-HR performers if they have multi-HR games  
      if (performance.totalMultiHRGames > 0) {
        allMultiHRPerformers.push(playerStats);
      }
    }
  });

  // Sort by multi-hit games (descending)
  allMultiHitPerformers.sort((a, b) => b.totalMultiHitGames - a.totalMultiHitGames);
  allMultiHRPerformers.sort((a, b) => b.totalMultiHRGames - a.totalMultiHRGames);

  console.log(`[generateMultiHitStats] Found ${allMultiHitPerformers.length} multi-hit performers and ${allMultiHRPerformers.length} multi-HR performers`);

  return {
    generatedAt: new Date().toISOString(),
    dataType: "season-long",
    seasonYear: "2025",
    
    // Top performers for quick dashboard display
    topMultiHitPerformers: allMultiHitPerformers.slice(0, 20),
    topMultiHRPerformers: allMultiHRPerformers.slice(0, 20),
    
    // Complete data for full functionality
    allMultiHitPerformers,
    allMultiHRPerformers,
    
    // Summary statistics
    summary: {
      totalMultiHitPerformers: allMultiHitPerformers.length,
      totalMultiHRPerformers: allMultiHRPerformers.length,
      avgMultiHitGames: allMultiHitPerformers.length > 0 ? 
        parseFloat((allMultiHitPerformers.reduce((sum, p) => sum + p.totalMultiHitGames, 0) / allMultiHitPerformers.length).toFixed(1)) : 0,
      avgMultiHRGames: allMultiHRPerformers.length > 0 ?
        parseFloat((allMultiHRPerformers.reduce((sum, p) => sum + p.totalMultiHRGames, 0) / allMultiHRPerformers.length).toFixed(1)) : 0,
      highestMultiHitRate: allMultiHitPerformers.length > 0 ? 
        Math.max(...allMultiHitPerformers.map(p => p.multiHitRate)) : 0,
      highestMultiHRRate: allMultiHRPerformers.length > 0 ?
        Math.max(...allMultiHRPerformers.map(p => p.multiHRRate)) : 0
    }
  };
}

/**
 * Aggregate player stats from their game entries
 */
function aggregatePlayerStats(playerName, playerTeam, playerEntries) {
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
        
        // Add this date's games
        playerGameMap.get(playerKey).entries.push({
          date: dateKey,
          games
        });
      });
    }
  });

  console.log(`[generateRollingStats] Processing ${playerGameMap.size} unique players`);

  // Calculate stats for all players
  const allPlayerStats = [];
  
  playerGameMap.forEach((playerData, playerKey) => {
    const { name, team, entries } = playerData;
    
    if (entries.length === 0) return;
    
    const stats = aggregatePlayerStats(name, team, entries);
    allPlayerStats.push(stats);
  });

  // Filter and sort players by different categories
  const allHittersWithHits = allPlayerStats.filter(p => p.totalHits > 0);
  const allHittersWithHRs = allPlayerStats.filter(p => p.totalHRs > 0);
  const allPitchersWithKs = allPlayerStats.filter(p => p.totalPitcherKs > 0);

  // Sort and get top performers
  const topHitters = allHittersWithHits
    .sort((a, b) => b.totalHits - a.totalHits)
    .slice(0, 50);

  const topHRLeaders = allHittersWithHRs
    .sort((a, b) => b.totalHRs - a.totalHRs)
    .slice(0, 50);

  const topStrikeoutPitchers = allPitchersWithKs
    .sort((a, b) => b.totalPitcherKs - a.totalPitcherKs)
    .slice(0, 50);

  // Organize by team for efficient filtering
  const hittersByTeam = {};
  const hrLeadersByTeam = {};
  const strikeoutPitchersByTeam = {};

  allHittersWithHits.forEach(player => {
    if (!hittersByTeam[player.team]) hittersByTeam[player.team] = [];
    hittersByTeam[player.team].push({
      name: player.name,
      H: player.totalHits,
      games: player.gamesPlayed,
      avg: player.battingAvg
    });
  });

  allHittersWithHRs.forEach(player => {
    if (!hrLeadersByTeam[player.team]) hrLeadersByTeam[player.team] = [];
    hrLeadersByTeam[player.team].push({
      name: player.name,
      HR: player.totalHRs,
      games: player.gamesPlayed,
      rate: player.hrRate
    });
  });

  allPitchersWithKs.forEach(player => {
    if (!strikeoutPitchersByTeam[player.team]) strikeoutPitchersByTeam[player.team] = [];
    strikeoutPitchersByTeam[player.team].push({
      name: player.name,
      K: player.totalPitcherKs,
      games: player.gamesPlayed,
      IP: player.totalIP.toFixed(1)
    });
  });

  console.log(`[generateRollingStats] Generated stats for ${allPlayerStats.length} total players`);

  return {
    generatedAt: new Date().toISOString(),
    targetDate: targetDateStr,
    totalPlayers: allPlayerStats.length,
    
    // Top performers for display
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
    
    // ALL PLAYERS WITH STATS - FOR COMPREHENSIVE TEAM FILTERING
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
 * Generate rolling stats for multiple time periods with multi-hit integration
 */
async function generateAllRollingStats(targetDate = new Date()) {
  console.log(`Starting comprehensive rolling stats generation for ${targetDate.toDateString()}`);
  
  // Load all season data
  const seasonData = loadAllSeasonData();
  
  if (Object.keys(seasonData).length === 0) {
    console.error('No season data found. Cannot generate rolling stats.');
    return false;
  }
  
  // Generate comprehensive multi-hit stats FIRST
  console.log('\n[generateAllRollingStats] Generating multi-hit performance data...');
  const multiHitStats = generateMultiHitStats(seasonData, targetDate);
  
  // Write multi-hit stats to optimized files
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  // Ensure multi-hit output directory exists
  if (!fs.existsSync(MULTI_HIT_OUTPUT_DIR)) {
    fs.mkdirSync(MULTI_HIT_OUTPUT_DIR, { recursive: true });
  }
  
  // Write multi-hit data
  const multiHitPath = path.join(MULTI_HIT_OUTPUT_DIR, `multi_hit_stats_${dateStr}.json`);
  const multiHitLatestPath = path.join(MULTI_HIT_OUTPUT_DIR, 'multi_hit_stats_latest.json');
  
  writeJsonFile(multiHitPath, multiHitStats);
  writeJsonFile(multiHitLatestPath, multiHitStats);
  
  console.log(`✅ Generated multi-hit stats with ${multiHitStats.allMultiHitPerformers.length} multi-hit performers`);
  
  // Generate stats for different time periods
  const periods = [
    { name: 'season', days: 365, label: 'Season to Date' },
    { name: 'last_30', days: 30, label: 'Last 30 Days' },
    { name: 'last_7', days: 7, label: 'Last 7 Days' },
    { name: 'current', days: 0, label: 'Current Date' }
  ];
  
  for (const period of periods) {
    console.log(`\n[generateAllRollingStats] Generating ${period.label} stats...`);
    
    // For now, use full season data for all periods
    // You can enhance this to filter by date ranges for different periods
    const rollingStats = generateRollingStats(seasonData, targetDate);
    
    // Add multi-hit data to rolling stats
    const enhancedStats = {
      ...rollingStats,
      period: period.label,
      periodDays: period.days,
      
      // Include multi-hit summary for quick access
      multiHitSummary: multiHitStats.summary,
      topMultiHitPerformers: multiHitStats.topMultiHitPerformers,
      topMultiHRPerformers: multiHitStats.topMultiHRPerformers
    };
    
    // Write the output file
    const outputFileName = `rolling_stats_${period.name}_${dateStr}.json`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    
    const success = writeJsonFile(outputPath, enhancedStats);
    
    if (success) {
      // Also write to latest file for this period
      const latestPath = path.join(OUTPUT_DIR, `rolling_stats_${period.name}_latest.json`);
      writeJsonFile(latestPath, enhancedStats);
      
      console.log(`✅ Generated ${period.label} with ${rollingStats.allHitters.length} total hitters`);
    }
  }
  
  console.log('\n[generateAllRollingStats] Enhanced rolling stats generation complete!');
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
        console.log('✅ Successfully generated all comprehensive rolling statistics with multi-hit data!');
        process.exit(0);
      } else {
        console.error('❌ Rolling statistics generation failed.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Critical error during rolling stats generation:', error);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { 
  generateRollingStats, 
  generateAllRollingStats, 
  generateMultiHitStats,
  loadAllSeasonData,
  aggregatePlayerStats,
  calculateMultiHitPerformance,
  readJsonFile,
  writeJsonFile
};