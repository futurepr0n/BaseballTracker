#!/usr/bin/env node

/**
 * Analyze C. Bellinger Statistics
 * 
 * Deep dive into C. Bellinger's game-by-game stats to identify
 * where the discrepancy with external sources might be coming from.
 * 
 * Usage: node scripts/data-validation/analyze_bellinger_stats.js
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Get all C. Bellinger games from daily JSON files
 */
async function getAllBellingerGames() {
  const dataDir = 'public/data/2025';
  const months = ['march', 'april', 'may', 'june', 'july'];
  
  let allGames = [];
  
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
          if (player.name === 'C. Bellinger' && player.team === 'NYY' && player.playerType === 'hitter') {
            allGames.push({
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
  
  return allGames.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Analyze games for patterns and potential issues
 */
function analyzeGames(games) {
  const analysis = {
    totalGames: games.length,
    totalHits: 0,
    gamesWithHits: 0,
    multiHitGames: 0,
    suspiciousGames: [],
    gameIdPattern: new Map(),
    dateFrequency: new Map(),
    duplicateGameIds: [],
    hitsByMonth: {},
    gamesByDate: new Map()
  };
  
  games.forEach((game, index) => {
    analysis.totalHits += game.hits;
    
    if (game.hits > 0) {
      analysis.gamesWithHits++;
    }
    
    if (game.hits > 1) {
      analysis.multiHitGames++;
    }
    
    // Track game ID patterns
    if (analysis.gameIdPattern.has(game.gameId)) {
      analysis.duplicateGameIds.push({
        gameId: game.gameId,
        dates: [analysis.gameIdPattern.get(game.gameId).date, game.date],
        games: [analysis.gameIdPattern.get(game.gameId), game]
      });
    } else {
      analysis.gameIdPattern.set(game.gameId, game);
    }
    
    // Track date frequency
    if (analysis.dateFrequency.has(game.date)) {
      analysis.dateFrequency.set(game.date, analysis.dateFrequency.get(game.date) + 1);
    } else {
      analysis.dateFrequency.set(game.date, 1);
    }
    
    // Track hits by month
    if (!analysis.hitsByMonth[game.month]) {
      analysis.hitsByMonth[game.month] = { hits: 0, games: 0 };
    }
    analysis.hitsByMonth[game.month].hits += game.hits;
    analysis.hitsByMonth[game.month].games += 1;
    
    // Group games by date to check for multiple games per day
    if (!analysis.gamesByDate.has(game.date)) {
      analysis.gamesByDate.set(game.date, []);
    }
    analysis.gamesByDate.get(game.date).push(game);
    
    // Flag suspicious patterns
    if (game.hits > 4) {
      analysis.suspiciousGames.push({
        type: 'unusual_hit_count',
        game: game,
        reason: `${game.hits} hits in one game is unusual`
      });
    }
    
    if (game.hits > 0 && game.ab === 0) {
      analysis.suspiciousGames.push({
        type: 'hits_without_at_bats',
        game: game,
        reason: `${game.hits} hits with 0 at-bats doesn't make sense`
      });
    }
    
    if (parseFloat(game.avg) > 1.0) {
      analysis.suspiciousGames.push({
        type: 'impossible_average',
        game: game,
        reason: `Batting average ${game.avg} is impossible (>1.0)`
      });
    }
  });
  
  return analysis;
}

/**
 * Display detailed analysis results
 */
function displayAnalysis(games, analysis) {
  console.log('📊 C. BELLINGER STATISTICAL ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════');
  
  console.log(`\n🎯 Overview:`);
  console.log(`  Total games: ${analysis.totalGames}`);
  console.log(`  Total hits: ${analysis.totalHits}`);
  console.log(`  Games with hits: ${analysis.gamesWithHits}`);
  console.log(`  Multi-hit games: ${analysis.multiHitGames}`);
  console.log(`  Average hits per game: ${(analysis.totalHits / analysis.totalGames).toFixed(3)}`);
  
  console.log(`\n📅 Monthly Breakdown:`);
  Object.entries(analysis.hitsByMonth).forEach(([month, stats]) => {
    console.log(`  ${month}: ${stats.hits} hits in ${stats.games} games (${(stats.hits/stats.games).toFixed(2)} avg)`);
  });
  
  // Check for dates with multiple games
  console.log(`\n⚾ Multiple Games Per Date:`);
  let multiGameDates = 0;
  for (const [date, dateGames] of analysis.gamesByDate) {
    if (dateGames.length > 1) {
      multiGameDates++;
      console.log(`  ${date}: ${dateGames.length} games`);
      dateGames.forEach((game, idx) => {
        console.log(`    Game ${idx + 1}: ${game.hits} hits, gameId ${game.gameId}`);
      });
    }
  }
  
  if (multiGameDates === 0) {
    console.log(`  ✅ No dates with multiple games found`);
  }
  
  // Duplicate Game IDs
  if (analysis.duplicateGameIds.length > 0) {
    console.log(`\n🚨 DUPLICATE GAME IDs FOUND:`);
    analysis.duplicateGameIds.forEach(dup => {
      console.log(`  GameId ${dup.gameId} appears on: ${dup.dates.join(', ')}`);
      dup.games.forEach(game => {
        console.log(`    ${game.date}: ${game.hits} hits (${game.file})`);
      });
    });
  } else {
    console.log(`\n✅ No duplicate game IDs found`);
  }
  
  // Suspicious games
  if (analysis.suspiciousGames.length > 0) {
    console.log(`\n⚠️  SUSPICIOUS PATTERNS:`);
    analysis.suspiciousGames.forEach(suspicious => {
      console.log(`  ${suspicious.game.date}: ${suspicious.reason}`);
      console.log(`    GameId: ${suspicious.game.gameId}, File: ${suspicious.game.file}`);
    });
  } else {
    console.log(`\n✅ No suspicious patterns found`);
  }
  
  // Show all games with hits for detailed verification
  console.log(`\n🎯 ALL GAMES WITH HITS (for external verification):`);
  const gamesWithHits = games.filter(game => game.hits > 0);
  gamesWithHits.forEach(game => {
    console.log(`  ${game.date}: ${game.hits} hit${game.hits > 1 ? 's' : ''} (${game.ab} AB) - gameId: ${game.gameId}`);
  });
  
  // Recent games (last 10)
  console.log(`\n📈 LAST 10 GAMES:`);
  const last10 = games.slice(-10);
  last10.forEach(game => {
    console.log(`  ${game.date}: ${game.hits}H, ${game.ab}AB, ${game.runs}R, ${game.rbi}RBI - ${game.avg} AVG`);
  });
  
  return analysis;
}

/**
 * Compare with milestone tracking calculation
 */
async function compareMilestoneTracking() {
  console.log(`\n🎯 MILESTONE TRACKING COMPARISON:`);
  console.log(`═══════════════════════════════════════════════════════════`);
  
  try {
    // Try to read recent milestone tracking file
    const milestoneFiles = [
      'public/data/predictions/milestone_tracking_latest.json',
      'public/data/predictions/milestone_tracking_2025-07-11.json'
    ];
    
    for (const filePath of milestoneFiles) {
      try {
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        // Find C. Bellinger in milestone data
        const bellingerData = data.candidates?.find(candidate => 
          candidate.playerName.includes('Bellinger') || candidate.playerName.includes('C. Bellinger')
        );
        
        if (bellingerData) {
          console.log(`Found in ${filePath}:`);
          console.log(`  Player: ${bellingerData.playerName}`);
          console.log(`  Current hits: ${bellingerData.currentValue}`);
          console.log(`  Target milestone: ${bellingerData.targetMilestone}`);
          console.log(`  Distance: ${bellingerData.distance}`);
          console.log(`  Heat level: ${bellingerData.heatLevel}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    console.log(`  ❌ Could not read milestone tracking files: ${error.message}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🔍 Analyzing C. Bellinger\'s game-by-game statistics...\n');
    
    const games = await getAllBellingerGames();
    const analysis = analyzeGames(games);
    
    displayAnalysis(games, analysis);
    await compareMilestoneTracking();
    
    console.log(`\n🏁 ANALYSIS COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`Current total: ${analysis.totalHits} hits`);
    console.log(`External sources: 92 hits (Baseball Reference & ESPN)`);
    console.log(`Difference: ${analysis.totalHits - 92} extra hits`);
    
    if (analysis.totalHits !== 92) {
      console.log(`\n💡 Next Steps:`);
      console.log(`1. Cross-reference games with external sources`);
      console.log(`2. Check for data entry errors in high-hit games`);
      console.log(`3. Verify doubleheader games are legitimate`);
      console.log(`4. Consider if external sources use different counting methods`);
    } else {
      console.log(`\n✅ Hit count matches external sources!`);
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  getAllBellingerGames,
  analyzeGames,
  displayAnalysis
};