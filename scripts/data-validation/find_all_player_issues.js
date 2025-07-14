#!/usr/bin/env node

/**
 * Find All Player Data Issues
 * 
 * Scans all player data to identify potential issues like:
 * - Duplicate game entries
 * - Suspicious statistical patterns
 * - Multiple entries per date
 * 
 * Usage: node scripts/data-validation/find_all_player_issues.js
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Get all player games from daily JSON files
 */
async function getAllPlayerGames() {
  const dataDir = 'public/data/2025';
  const months = ['march', 'april', 'may', 'june', 'july'];
  
  const playerGames = new Map(); // key: "playerName_team", value: array of games
  
  for (const month of months) {
    const monthDir = path.resolve(dataDir, month);
    
    try {
      const files = await fs.readdir(monthDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
      
      for (const file of jsonFiles) {
        const filePath = path.join(monthDir, file);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        const playersArray = Array.isArray(data.players) ? data.players : data;
        
        playersArray.forEach(player => {
          if (player.playerType === 'hitter' && player.name && player.team) {
            const key = `${player.name}_${player.team}`;
            
            if (!playerGames.has(key)) {
              playerGames.set(key, []);
            }
            
            playerGames.get(key).push({
              date: data.date || file.replace('.json', '').replace(month + '_', ''),
              month: month,
              file: file,
              gameId: player.gameId,
              hits: parseInt(player.H) || 0,
              ab: parseInt(player.AB) || 0,
              runs: parseInt(player.R) || 0,
              rbi: parseInt(player.RBI) || 0,
              hr: parseInt(player.HR) || 0,
              avg: player.AVG,
              player: player
            });
          }
        });
      }
    } catch (error) {
      continue;
    }
  }
  
  return playerGames;
}

/**
 * Analyze player games for issues
 */
function analyzePlayerForIssues(playerName, games) {
  const issues = [];
  
  // Sort games by date
  games.sort((a, b) => a.date.localeCompare(b.date));
  
  // Check for duplicate gameIds
  const gameIdMap = new Map();
  games.forEach(game => {
    if (gameIdMap.has(game.gameId)) {
      const existingGame = gameIdMap.get(game.gameId);
      issues.push({
        type: 'duplicate_gameId',
        severity: 'high',
        description: `GameId ${game.gameId} appears on both ${existingGame.date} and ${game.date}`,
        games: [existingGame, game],
        extraHits: game.hits
      });
    } else {
      gameIdMap.set(game.gameId, game);
    }
  });
  
  // Check for multiple games on same date (potential legitimate doubleheaders)
  const dateMap = new Map();
  games.forEach(game => {
    if (!dateMap.has(game.date)) {
      dateMap.set(game.date, []);
    }
    dateMap.get(game.date).push(game);
  });
  
  for (const [date, dateGames] of dateMap) {
    if (dateGames.length > 1) {
      // Check if gameIds are different (legitimate doubleheader) or same (duplicate)
      const uniqueGameIds = new Set(dateGames.map(g => g.gameId));
      
      if (uniqueGameIds.size < dateGames.length) {
        issues.push({
          type: 'same_gameId_multiple_entries',
          severity: 'critical',
          description: `Same gameId appears multiple times on ${date}`,
          games: dateGames,
          extraHits: dateGames.slice(1).reduce((sum, g) => sum + g.hits, 0)
        });
      } else if (dateGames.length > 2) {
        issues.push({
          type: 'unusual_multiple_games',
          severity: 'medium',
          description: `${dateGames.length} games on ${date} (unusual, verify if legitimate)`,
          games: dateGames
        });
      }
    }
  }
  
  // Check for suspicious statistics
  games.forEach(game => {
    if (game.hits > 5) {
      issues.push({
        type: 'unusual_hit_count',
        severity: 'low',
        description: `${game.hits} hits on ${game.date} is unusually high`,
        games: [game]
      });
    }
    
    if (game.hits > 0 && game.ab === 0) {
      issues.push({
        type: 'impossible_stats',
        severity: 'high',
        description: `${game.hits} hits with 0 at-bats on ${game.date}`,
        games: [game]
      });
    }
    
    if (parseFloat(game.avg) > 1.0) {
      issues.push({
        type: 'impossible_average',
        severity: 'high',
        description: `Batting average ${game.avg} is impossible on ${game.date}`,
        games: [game]
      });
    }
  });
  
  // Calculate total stats
  const totalStats = games.reduce((acc, game) => {
    acc.hits += game.hits;
    acc.games += 1;
    acc.ab += game.ab;
    acc.runs += game.runs;
    acc.rbi += game.rbi;
    acc.hr += game.hr;
    return acc;
  }, { hits: 0, games: 0, ab: 0, runs: 0, rbi: 0, hr: 0 });
  
  return {
    playerName,
    totalStats,
    issues,
    games: games.length
  };
}

/**
 * Generate report of all players with issues
 */
function generateReport(playersWithIssues) {
  console.log('🔍 PLAYER DATA INTEGRITY REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Summary
  const totalPlayers = playersWithIssues.length;
  const playersWithDuplicates = playersWithIssues.filter(p => 
    p.issues.some(i => i.type === 'duplicate_gameId' || i.type === 'same_gameId_multiple_entries')
  );
  
  console.log(`📊 SUMMARY:`);
  console.log(`Total players analyzed: ${totalPlayers}`);
  console.log(`Players with issues: ${playersWithIssues.filter(p => p.issues.length > 0).length}`);
  console.log(`Players with duplicate games: ${playersWithDuplicates.length}\n`);
  
  // Critical issues (duplicates that inflate stats)
  console.log(`🚨 CRITICAL ISSUES (Stats Inflation):`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
  
  let criticalCount = 0;
  playersWithDuplicates.forEach(player => {
    const duplicateIssues = player.issues.filter(i => 
      i.type === 'duplicate_gameId' || i.type === 'same_gameId_multiple_entries'
    );
    
    if (duplicateIssues.length > 0) {
      const totalExtraHits = duplicateIssues.reduce((sum, issue) => sum + (issue.extraHits || 0), 0);
      
      console.log(`${player.playerName}:`);
      console.log(`  Current total: ${player.totalStats.hits} hits in ${player.totalStats.games} games`);
      console.log(`  Duplicate games: ${duplicateIssues.length}`);
      console.log(`  Extra hits from duplicates: ${totalExtraHits}`);
      console.log(`  Issues:`);
      
      duplicateIssues.forEach(issue => {
        console.log(`    - ${issue.description}`);
      });
      
      console.log('');
      criticalCount++;
    }
  });
  
  if (criticalCount === 0) {
    console.log('  ✅ No critical duplicate issues found\n');
  }
  
  // Other issues
  console.log(`⚠️  OTHER DATA QUALITY ISSUES:`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
  
  let otherIssueCount = 0;
  playersWithIssues.forEach(player => {
    const otherIssues = player.issues.filter(i => 
      i.type !== 'duplicate_gameId' && i.type !== 'same_gameId_multiple_entries'
    );
    
    if (otherIssues.length > 0) {
      console.log(`${player.playerName}:`);
      otherIssues.forEach(issue => {
        console.log(`  - [${issue.severity}] ${issue.description}`);
      });
      console.log('');
      otherIssueCount++;
    }
  });
  
  if (otherIssueCount === 0) {
    console.log('  ✅ No other data quality issues found\n');
  }
  
  // Top players by hits (for manual verification)
  console.log(`📈 TOP 20 PLAYERS BY HITS (verify against external sources):`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
  
  const topPlayers = playersWithIssues
    .sort((a, b) => b.totalStats.hits - a.totalStats.hits)
    .slice(0, 20);
  
  topPlayers.forEach((player, idx) => {
    const duplicateCount = player.issues.filter(i => 
      i.type === 'duplicate_gameId' || i.type === 'same_gameId_multiple_entries'
    ).length;
    
    const flag = duplicateCount > 0 ? ' 🚨' : '';
    console.log(`${(idx + 1).toString().padStart(2)}. ${player.playerName.padEnd(25)} ${player.totalStats.hits.toString().padStart(3)} hits in ${player.totalStats.games.toString().padStart(3)} games${flag}`);
  });
  
  return {
    totalPlayers,
    playersWithIssues: playersWithIssues.filter(p => p.issues.length > 0).length,
    playersWithDuplicates: playersWithDuplicates.length,
    criticalIssues: criticalCount
  };
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🔍 Scanning all player data for integrity issues...\n');
    
    // Get all player games
    const allPlayerGames = await getAllPlayerGames();
    console.log(`Found ${allPlayerGames.size} unique player-team combinations\n`);
    
    // Analyze each player
    const playersWithIssues = [];
    
    for (const [playerKey, games] of allPlayerGames) {
      const analysis = analyzePlayerForIssues(playerKey, games);
      if (analysis.issues.length > 0 || analysis.totalStats.hits > 50) { // Include high-hit players for verification
        playersWithIssues.push(analysis);
      }
    }
    
    // Generate report
    const summary = generateReport(playersWithIssues);
    
    // Save detailed report
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary,
      playersWithIssues: playersWithIssues.filter(p => p.issues.length > 0)
    };
    
    await fs.writeFile(
      'player_data_issues_report.json',
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n📄 Detailed report saved to: player_data_issues_report.json');
    console.log('\n🏁 SCAN COMPLETE');
    
    if (summary.criticalIssues > 0) {
      console.log(`\n💡 Next Steps:`);
      console.log(`1. Review players with duplicate games listed above`);
      console.log(`2. Verify their stats against Baseball Reference`);
      console.log(`3. Use remove_duplicate_games.js to fix confirmed issues`);
      console.log(`4. Re-run milestone tracking after fixes`);
    }
    
  } catch (error) {
    console.error('❌ Error during player data scan:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  getAllPlayerGames,
  analyzePlayerForIssues,
  generateReport
};