#!/usr/bin/env node

/**
 * Duplicate Game Detection Utility
 * 
 * Scans all daily JSON files to detect potential duplicate games that could
 * cause data inaccuracies in milestone tracking and player statistics.
 * 
 * Usage: node scripts/data-validation/detect_duplicates.js
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Scan a single file for potential duplicate games
 */
async function scanFileForDuplicates(filePath) {
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  const playersArray = Array.isArray(data.players) ? data.players : data;
  
  // Group players by team matchups on the same date
  const gameMatchups = new Map();
  const gameIds = new Set();
  const suspiciousGames = [];
  
  playersArray.forEach(player => {
    if (!player.gameId || !player.team) return;
    
    gameIds.add(player.gameId);
    
    const key = `${player.gameId}`;
    if (!gameMatchups.has(key)) {
      gameMatchups.set(key, {
        gameId: player.gameId,
        teams: new Set(),
        players: [],
        isHitter: false,
        isPitcher: false
      });
    }
    
    const game = gameMatchups.get(key);
    game.teams.add(player.team);
    game.players.push(player);
    
    if (player.playerType === 'hitter') game.isHitter = true;
    if (player.playerType === 'pitcher') game.isPitcher = true;
  });
  
  // Detect suspicious patterns
  for (const [gameId, gameInfo] of gameMatchups) {
    // Check for suspicious gameId patterns (different ranges)
    const gameIdNum = parseInt(gameId);
    if (gameIdNum && (gameIdNum < 400000000 || gameIdNum > 500000000)) {
      suspiciousGames.push({
        type: 'suspicious_id_range',
        gameId: gameId,
        reason: `GameId ${gameId} is outside normal ESPN range (400000000-500000000)`,
        teamsInvolved: Array.from(gameInfo.teams),
        playerCount: gameInfo.players.length
      });
    }
    
    // Check for incomplete games (missing hitters or pitchers)
    if (!gameInfo.isHitter && !gameInfo.isPitcher) {
      suspiciousGames.push({
        type: 'incomplete_game_data',
        gameId: gameId,
        reason: `Game ${gameId} has no hitters or pitchers`,
        teamsInvolved: Array.from(gameInfo.teams),
        playerCount: gameInfo.players.length
      });
    }
  }
  
  // Check for potential team duplicate games (same teams multiple times)
  const teamPairings = new Map();
  for (const [gameId, gameInfo] of gameMatchups) {
    if (gameInfo.teams.size === 2) {
      const teams = Array.from(gameInfo.teams).sort().join(' vs ');
      if (!teamPairings.has(teams)) {
        teamPairings.set(teams, []);
      }
      teamPairings.get(teams).push({ gameId, playerCount: gameInfo.players.length });
    }
  }
  
  // Flag potential duplicates
  for (const [teamPair, games] of teamPairings) {
    if (games.length > 1) {
      // Check if this might be a legitimate doubleheader vs suspicious duplicate
      const playerCounts = games.map(g => g.playerCount);
      const avgPlayerCount = playerCounts.reduce((a, b) => a + b, 0) / playerCounts.length;
      const countVariance = playerCounts.some(count => Math.abs(count - avgPlayerCount) > avgPlayerCount * 0.3);
      
      if (countVariance) {
        suspiciousGames.push({
          type: 'potential_duplicate_teams',
          gameIds: games.map(g => g.gameId),
          reason: `Teams "${teamPair}" appear in ${games.length} games with varying player counts`,
          games: games,
          likely_duplicate: true
        });
      } else {
        suspiciousGames.push({
          type: 'potential_doubleheader',
          gameIds: games.map(g => g.gameId),
          reason: `Teams "${teamPair}" appear in ${games.length} games (possibly legitimate doubleheader)`,
          games: games,
          likely_duplicate: false
        });
      }
    }
  }
  
  return {
    filePath,
    date: data.date || path.basename(filePath, '.json'),
    totalGames: gameIds.size,
    totalPlayers: playersArray.length,
    suspiciousGames
  };
}

/**
 * Scan all files for duplicates
 */
async function scanAllFiles() {
  const dataDir = 'public/data/2025';
  const months = ['march', 'april', 'may', 'june', 'july', 'august', 'september'];
  
  console.log('🔍 Scanning all files for potential duplicate games...\n');
  
  const allSuspiciousGames = [];
  let totalFilesScanned = 0;
  
  for (const month of months) {
    const monthDir = path.resolve(dataDir, month);
    
    try {
      const files = await fs.readdir(monthDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
      
      console.log(`📅 Scanning ${month}: ${jsonFiles.length} files`);
      
      for (const file of jsonFiles) {
        const filePath = path.join(monthDir, file);
        
        try {
          const result = await scanFileForDuplicates(filePath);
          totalFilesScanned++;
          
          if (result.suspiciousGames.length > 0) {
            allSuspiciousGames.push(result);
            console.log(`  ⚠️  Found ${result.suspiciousGames.length} suspicious pattern(s) in ${file}`);
            
            result.suspiciousGames.forEach(suspiciousGame => {
              if (suspiciousGame.likely_duplicate) {
                console.log(`    🚨 LIKELY DUPLICATE: ${suspiciousGame.reason}`);
              } else {
                console.log(`    ℹ️  ${suspiciousGame.reason}`);
              }
            });
          }
        } catch (error) {
          console.log(`  ❌ Error scanning ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      // Month directory might not exist
      continue;
    }
  }
  
  return { allSuspiciousGames, totalFilesScanned };
}

/**
 * Generate a detailed report
 */
function generateReport(scanResults) {
  const { allSuspiciousGames, totalFilesScanned } = scanResults;
  
  console.log(`\n📊 DUPLICATE DETECTION SUMMARY`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`Total files scanned: ${totalFilesScanned}`);
  console.log(`Files with suspicious patterns: ${allSuspiciousGames.length}`);
  
  let likelyDuplicates = 0;
  let suspiciousIdRanges = 0;
  let potentialDoubleheaders = 0;
  let incompleteGames = 0;
  
  // Categorize issues
  allSuspiciousGames.forEach(fileResult => {
    fileResult.suspiciousGames.forEach(suspiciousGame => {
      switch (suspiciousGame.type) {
        case 'suspicious_id_range':
          suspiciousIdRanges++;
          break;
        case 'potential_duplicate_teams':
          if (suspiciousGame.likely_duplicate) likelyDuplicates++;
          break;
        case 'potential_doubleheader':
          potentialDoubleheaders++;
          break;
        case 'incomplete_game_data':
          incompleteGames++;
          break;
      }
    });
  });
  
  console.log(`\n📈 Issue Breakdown:`);
  console.log(`  🚨 Likely duplicates: ${likelyDuplicates}`);
  console.log(`  ⚠️  Suspicious game ID ranges: ${suspiciousIdRanges}`);
  console.log(`  ⚾ Potential doubleheaders: ${potentialDoubleheaders}`);
  console.log(`  📋 Incomplete game data: ${incompleteGames}`);
  
  // Detailed breakdown of likely duplicates
  if (likelyDuplicates > 0) {
    console.log(`\n🚨 LIKELY DUPLICATES (Requiring Investigation):`);
    console.log(`═══════════════════════════════════════════════════════════`);
    
    allSuspiciousGames.forEach(fileResult => {
      fileResult.suspiciousGames.forEach(suspiciousGame => {
        if (suspiciousGame.type === 'potential_duplicate_teams' && suspiciousGame.likely_duplicate) {
          console.log(`\n📁 File: ${fileResult.filePath}`);
          console.log(`📅 Date: ${fileResult.date}`);
          console.log(`🎯 Issue: ${suspiciousGame.reason}`);
          console.log(`🆔 Game IDs: ${suspiciousGame.gameIds.join(', ')}`);
          console.log(`📊 Player counts: ${suspiciousGame.games.map(g => g.playerCount).join(', ')}`);
        }
      });
    });
  }
  
  // Suspicious ID ranges (like the 401769356 issue)
  if (suspiciousIdRanges > 0) {
    console.log(`\n⚠️  SUSPICIOUS GAME ID RANGES:`);
    console.log(`═══════════════════════════════════════════════════════════`);
    
    allSuspiciousGames.forEach(fileResult => {
      fileResult.suspiciousGames.forEach(suspiciousGame => {
        if (suspiciousGame.type === 'suspicious_id_range') {
          console.log(`\n📁 File: ${fileResult.filePath}`);
          console.log(`📅 Date: ${fileResult.date}`);
          console.log(`🆔 Game ID: ${suspiciousGame.gameId}`);
          console.log(`👥 Teams: ${suspiciousGame.teamsInvolved.join(', ')}`);
          console.log(`🎯 Issue: ${suspiciousGame.reason}`);
        }
      });
    });
  }
  
  return {
    totalIssues: likelyDuplicates + suspiciousIdRanges,
    criticalIssues: likelyDuplicates,
    warningIssues: suspiciousIdRanges
  };
}

/**
 * Main execution function
 */
async function main() {
  try {
    const scanResults = await scanAllFiles();
    const reportSummary = generateReport(scanResults);
    
    console.log(`\n🏁 SCAN COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════`);
    
    if (reportSummary.totalIssues === 0) {
      console.log(`✅ No issues found! Data appears clean.`);
    } else {
      console.log(`⚠️  Found ${reportSummary.totalIssues} potential issues:`);
      console.log(`   • ${reportSummary.criticalIssues} critical (likely duplicates)`);
      console.log(`   • ${reportSummary.warningIssues} warnings (suspicious patterns)`);
      
      if (reportSummary.criticalIssues > 0) {
        console.log(`\n💡 Next Steps:`);
        console.log(`   1. Review the likely duplicates listed above`);
        console.log(`   2. Use remove_duplicate_games.js to clean up confirmed duplicates`);
        console.log(`   3. Re-run milestone tracking after cleanup`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during duplicate detection:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  scanFileForDuplicates,
  scanAllFiles,
  generateReport
};