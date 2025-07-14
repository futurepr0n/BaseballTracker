#!/usr/bin/env node

/**
 * Fix C. Bellinger Duplicate Games
 * 
 * Removes duplicate game entries that are causing inflated hit counts
 * for C. Bellinger and potentially other players.
 * 
 * Usage: node scripts/data-validation/fix_bellinger_duplicates.js
 */

const fs = require('fs').promises;
const path = require('path');

// Identified duplicate games that need to be removed
const DUPLICATE_GAME_FIXES = [
  // Based on Baseball Reference verification, these appear to be the duplicate entries:
  {
    description: 'July 2-3 duplicate - keep July 3 game, remove July 2 duplicate',
    action: 'remove',
    file: 'public/data/2025/july/july_02_2025.json',
    gameId: '401696198',
    reason: 'Game appears on both July 2 and July 3, keep July 3 as actual game date'
  },
  {
    description: 'July 4-5 duplicate - keep July 5 game, remove July 4 duplicate', 
    action: 'remove',
    file: 'public/data/2025/july/july_04_2025.json',
    gameId: '401696225',
    reason: 'Game appears on both July 4 and July 5, keep July 5 as actual game date'
  },
  {
    description: 'July 6-7 duplicate - keep July 7 game, remove July 6 duplicate',
    action: 'remove', 
    file: 'public/data/2025/july/july_06_2025.json',
    gameId: '401696255',
    reason: 'Game appears on both July 6 and July 7, keep July 7 as actual game date'
  },
  {
    description: 'July 8-9 duplicate - keep July 9 game, remove July 8 duplicate',
    action: 'remove',
    file: 'public/data/2025/july/july_08_2025.json', 
    gameId: '401696276',
    reason: 'Game appears on both July 8 and July 9, keep July 9 as actual game date'
  }
];

/**
 * Create backup of file before modification
 */
async function createBackup(filePath) {
  const backupPath = `${filePath}.backup.${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  await fs.copyFile(filePath, backupPath);
  console.log(`✅ Created backup: ${backupPath}`);
  return backupPath;
}

/**
 * Remove specific gameId from a file
 */
async function removeGameId(filePath, gameId) {
  console.log(`\n🔍 Processing: ${filePath}`);
  console.log(`🎯 Removing gameId: ${gameId}`);
  
  const fullPath = path.resolve(filePath);
  const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
  
  let removedCount = 0;
  let playersRemoved = [];
  
  // Handle both data structures
  if (Array.isArray(data.players)) {
    const originalLength = data.players.length;
    data.players = data.players.filter(player => {
      if (player.gameId === gameId) {
        playersRemoved.push(`${player.name} (${player.team})`);
        return false;
      }
      return true;
    });
    removedCount = originalLength - data.players.length;
  } else if (Array.isArray(data)) {
    const originalLength = data.length;
    const filteredData = data.filter(player => {
      if (player.gameId === gameId) {
        playersRemoved.push(`${player.name} (${player.team})`);
        return false;
      }
      return true;
    });
    
    await fs.writeFile(fullPath, JSON.stringify(filteredData, null, 2));
    removedCount = originalLength - filteredData.length;
    
    console.log(`✅ Removed ${removedCount} entries for gameId ${gameId}`);
    console.log(`👥 Players affected: ${playersRemoved.slice(0, 5).join(', ')}${playersRemoved.length > 5 ? '...' : ''}`);
    return { removedCount, playersRemoved };
  }
  
  // Write back modified data
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
  
  console.log(`✅ Removed ${removedCount} entries for gameId ${gameId}`);
  console.log(`👥 Players affected: ${playersRemoved.slice(0, 5).join(', ')}${playersRemoved.length > 5 ? '...' : ''}`);
  
  return { removedCount, playersRemoved };
}

/**
 * Calculate C. Bellinger's stats for verification
 */
async function calculateBellingerStats() {
  const dataDir = 'public/data/2025';
  const months = ['march', 'april', 'may', 'june', 'july'];
  
  let totalHits = 0;
  let gamesPlayed = 0;
  let gamesList = [];
  
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
            const hits = parseInt(player.H) || 0;
            totalHits += hits;
            gamesPlayed++;
            gamesList.push({
              date: data.date || file.replace('.json', '').replace(month + '_', ''),
              gameId: player.gameId,
              hits: hits,
              month: month
            });
          }
        });
      }
    } catch (error) {
      continue;
    }
  }
  
  return { totalHits, gamesPlayed, gamesList };
}

/**
 * Verify specific July games after fix
 */
async function verifyJulyGames() {
  console.log(`\n📅 JULY GAMES VERIFICATION:`);
  console.log(`═══════════════════════════════════════════════════════════`);
  
  const julyFiles = [
    'july_02_2025.json', 'july_03_2025.json',
    'july_04_2025.json', 'july_05_2025.json', 
    'july_06_2025.json', 'july_07_2025.json',
    'july_08_2025.json', 'july_09_2025.json'
  ];
  
  for (const file of julyFiles) {
    try {
      const filePath = path.resolve('public/data/2025/july', file);
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      const playersArray = Array.isArray(data.players) ? data.players : data;
      
      const bellingerGame = playersArray.find(player => 
        player.name === 'C. Bellinger' && player.team === 'NYY' && player.playerType === 'hitter'
      );
      
      if (bellingerGame) {
        console.log(`${file}: ${bellingerGame.H} hits, gameId ${bellingerGame.gameId}`);
      } else {
        console.log(`${file}: No C. Bellinger entry found`);
      }
    } catch (error) {
      console.log(`${file}: File not found or error reading`);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🧹 Starting C. Bellinger duplicate game fixes...\n');
  
  try {
    // Calculate stats before fix
    console.log('📊 Calculating C. Bellinger\'s stats before fix...');
    const statsBefore = await calculateBellingerStats();
    console.log(`Before fix: ${statsBefore.totalHits} hits in ${statsBefore.gamesPlayed} games\n`);
    
    // Process each duplicate fix
    let totalRemoved = 0;
    let filesProcessed = 0;
    
    for (const fix of DUPLICATE_GAME_FIXES) {
      console.log(`\n🎯 ${fix.description}`);
      console.log(`Reason: ${fix.reason}`);
      
      try {
        // Create backup
        const backupPath = await createBackup(fix.file);
        
        // Remove duplicate
        const result = await removeGameId(fix.file, fix.gameId);
        totalRemoved += result.removedCount;
        filesProcessed++;
        
        console.log(`✅ Successfully processed ${fix.file}`);
        
      } catch (error) {
        console.log(`❌ Error processing ${fix.file}: ${error.message}`);
      }
    }
    
    // Calculate stats after fix
    console.log('\n📊 Calculating C. Bellinger\'s stats after fix...');
    const statsAfter = await calculateBellingerStats();
    console.log(`After fix: ${statsAfter.totalHits} hits in ${statsAfter.gamesPlayed} games`);
    
    const hitsDifference = statsBefore.totalHits - statsAfter.totalHits;
    const gamesDifference = statsBefore.gamesPlayed - statsAfter.gamesPlayed;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`Files processed: ${filesProcessed}/${DUPLICATE_GAME_FIXES.length}`);
    console.log(`Total entries removed: ${totalRemoved}`);
    console.log(`Hits reduced by: ${hitsDifference}`);
    console.log(`Games reduced by: ${gamesDifference}`);
    console.log(`Expected final hits: 92 (Baseball Reference)`);
    console.log(`Actual final hits: ${statsAfter.totalHits}`);
    
    if (statsAfter.totalHits === 92) {
      console.log(`✅ SUCCESS: C. Bellinger's hit count now matches Baseball Reference!`);
    } else {
      console.log(`⚠️  PARTIAL: Hit count closer but still ${Math.abs(statsAfter.totalHits - 92)} off from Baseball Reference`);
    }
    
    // Verify July games specifically
    await verifyJulyGames();
    
    console.log('\n🎉 C. Bellinger duplicate fix process completed!');
    
  } catch (error) {
    console.error('❌ Error during duplicate fixes:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  removeGameId,
  calculateBellingerStats,
  verifyJulyGames,
  DUPLICATE_GAME_FIXES
};