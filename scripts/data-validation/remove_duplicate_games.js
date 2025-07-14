#!/usr/bin/env node

/**
 * Remove Duplicate Games Script
 * 
 * Removes confirmed duplicate game entries that are causing data inaccuracies
 * in milestone tracking and player statistics.
 * 
 * Usage: node scripts/data-validation/remove_duplicate_games.js
 */

const fs = require('fs').promises;
const path = require('path');

// Confirmed duplicate games to remove
const DUPLICATE_GAMES_TO_REMOVE = [
  {
    file: 'public/data/2025/april/april_27_2025.json',
    gameId: '401769356',
    reason: 'Duplicate of gameId 401695317 - same NYY vs TOR game with different ID range',
    affectedPlayers: ['C. Bellinger', 'A. Judge', 'B. Bichette', 'V. Guerrero Jr.', 'G. Springer']
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
 * Remove duplicate game entries from a JSON file
 */
async function removeDuplicateGames(filePath, gameIdsToRemove) {
  console.log(`\n🔍 Processing file: ${filePath}`);
  
  // Read the file
  const fullPath = path.resolve(filePath);
  const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
  
  let removedCount = 0;
  let playersRemoved = 0;
  const removedPlayerNames = new Set();
  
  // Remove players with the specified gameIds
  if (Array.isArray(data.players)) {
    const originalLength = data.players.length;
    data.players = data.players.filter(player => {
      if (gameIdsToRemove.includes(player.gameId)) {
        removedPlayerNames.add(player.name);
        playersRemoved++;
        return false;
      }
      return true;
    });
    removedCount = originalLength - data.players.length;
  } else if (Array.isArray(data)) {
    // Handle direct array format
    const originalLength = data.length;
    const filteredData = data.filter(player => {
      if (gameIdsToRemove.includes(player.gameId)) {
        removedPlayerNames.add(player.name);
        playersRemoved++;
        return false;
      }
      return true;
    });
    
    // Write back as the same structure
    await fs.writeFile(fullPath, JSON.stringify(filteredData, null, 2));
    removedCount = originalLength - filteredData.length;
    
    console.log(`✅ Removed ${removedCount} entries for gameId(s): ${gameIdsToRemove.join(', ')}`);
    console.log(`👥 Affected players: ${Array.from(removedPlayerNames).join(', ')}`);
    return { removedCount, playersRemoved, removedPlayerNames: Array.from(removedPlayerNames) };
  }
  
  // Write back the modified data
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
  
  console.log(`✅ Removed ${removedCount} entries for gameId(s): ${gameIdsToRemove.join(', ')}`);
  console.log(`👥 Affected players: ${Array.from(removedPlayerNames).join(', ')}`);
  
  return { removedCount, playersRemoved, removedPlayerNames: Array.from(removedPlayerNames) };
}

/**
 * Verify that duplicate games have been removed
 */
async function verifyRemoval(filePath, gameIdsToRemove) {
  const fullPath = path.resolve(filePath);
  const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
  
  let foundDuplicates = [];
  const playersArray = Array.isArray(data.players) ? data.players : data;
  
  playersArray.forEach(player => {
    if (gameIdsToRemove.includes(player.gameId)) {
      foundDuplicates.push(`${player.name} (${player.gameId})`);
    }
  });
  
  if (foundDuplicates.length === 0) {
    console.log(`✅ Verification passed: No duplicate games found`);
    return true;
  } else {
    console.log(`❌ Verification failed: Found remaining duplicates: ${foundDuplicates.join(', ')}`);
    return false;
  }
}

/**
 * Calculate C. Bellinger's hit count before and after cleanup
 */
async function calculateBellingerStats(mode = 'current') {
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
              file: filePath
            });
          }
        });
      }
    } catch (error) {
      // Month directory might not exist
      continue;
    }
  }
  
  return { totalHits, gamesPlayed, gamesList };
}

/**
 * Main execution function
 */
async function main() {
  console.log('🧹 Starting duplicate game removal process...\n');
  
  try {
    // Calculate Bellinger's stats before cleanup
    console.log('📊 Calculating C. Bellinger\'s stats before cleanup...');
    const statsBefore = await calculateBellingerStats();
    console.log(`Before cleanup: ${statsBefore.totalHits} hits in ${statsBefore.gamesPlayed} games\n`);
    
    // Process each duplicate game removal
    for (const duplicate of DUPLICATE_GAMES_TO_REMOVE) {
      console.log(`🎯 Removing duplicate game: ${duplicate.gameId}`);
      console.log(`Reason: ${duplicate.reason}`);
      console.log(`Expected affected players: ${duplicate.affectedPlayers.join(', ')}\n`);
      
      // Create backup
      const backupPath = await createBackup(duplicate.file);
      
      // Remove duplicate games
      const result = await removeDuplicateGames(duplicate.file, [duplicate.gameId]);
      
      // Verify removal
      const verified = await verifyRemoval(duplicate.file, [duplicate.gameId]);
      
      if (!verified) {
        console.log(`❌ Failed to remove duplicates from ${duplicate.file}`);
        // Restore from backup
        await fs.copyFile(backupPath, duplicate.file);
        console.log(`🔄 Restored from backup due to verification failure`);
        continue;
      }
      
      console.log(`✅ Successfully processed ${duplicate.file}\n`);
    }
    
    // Calculate Bellinger's stats after cleanup
    console.log('📊 Calculating C. Bellinger\'s stats after cleanup...');
    const statsAfter = await calculateBellingerStats();
    console.log(`After cleanup: ${statsAfter.totalHits} hits in ${statsAfter.gamesPlayed} games`);
    
    const hitsDifference = statsBefore.totalHits - statsAfter.totalHits;
    const gamesDifference = statsBefore.gamesPlayed - statsAfter.gamesPlayed;
    
    console.log(`\n📈 Summary:`);
    console.log(`  • Hits reduced by: ${hitsDifference}`);
    console.log(`  • Games reduced by: ${gamesDifference}`);
    console.log(`  • Expected final hits: 92 (Baseball Reference)`);
    console.log(`  • Actual final hits: ${statsAfter.totalHits}`);
    
    if (statsAfter.totalHits === 92) {
      console.log(`✅ SUCCESS: C. Bellinger's hit count now matches Baseball Reference!`);
    } else {
      console.log(`⚠️  WARNING: Hit count still doesn't match Baseball Reference (expected 92)`);
    }
    
    console.log('\n🎉 Duplicate game removal process completed!');
    
  } catch (error) {
    console.error('❌ Error during duplicate removal:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  removeDuplicateGames,
  verifyRemoval,
  calculateBellingerStats,
  DUPLICATE_GAMES_TO_REMOVE
};