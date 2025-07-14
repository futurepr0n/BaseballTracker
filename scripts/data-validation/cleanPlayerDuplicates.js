#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function findAndCleanPlayerDuplicates() {
  console.log('🔍 Finding player-level duplicates (games removed but players remain)...\n');
  
  const dataDir = 'public/data/2025';
  const months = ['july']; // Start with July where we know issues exist
  const playerDuplicates = [];
  
  for (const month of months) {
    const monthDir = path.join(dataDir, month);
    const files = await fs.readdir(monthDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
    
    for (let i = 0; i < jsonFiles.length - 1; i++) {
      const currentFile = jsonFiles[i];
      const currentPath = path.join(monthDir, currentFile);
      const currentData = JSON.parse(await fs.readFile(currentPath, 'utf8'));
      
      // Look at next few days
      for (let j = i + 1; j < Math.min(i + 4, jsonFiles.length); j++) {
        const futureFile = jsonFiles[j];
        const futurePath = path.join(monthDir, futureFile);
        const futureData = JSON.parse(await fs.readFile(futurePath, 'utf8'));
        
        // Check if any players have the same gameId
        const currentPlayers = currentData.players || [];
        const futurePlayers = futureData.players || [];
        
        for (const player of currentPlayers) {
          const duplicatePlayer = futurePlayers.find(fp => 
            fp.gameId === player.gameId && 
            fp.name === player.name
          );
          
          if (duplicatePlayer) {
            // Check if this game still exists in the future date's games array
            const futureGames = futureData.games || [];
            const gameStillExists = futureGames.some(g => 
              (g.originalId === player.gameId || g.gameId === player.gameId)
            );
            
            if (!gameStillExists) {
              playerDuplicates.push({
                playerName: player.name,
                team: player.team,
                gameId: player.gameId,
                originalDate: currentFile.replace('.json', ''),
                duplicateDate: futureFile.replace('.json', ''),
                duplicateFile: futurePath,
                hits: duplicatePlayer.H || duplicatePlayer.hits || 0,
                action: 'remove_player_from_duplicate_date'
              });
            }
          }
        }
      }
    }
  }
  
  console.log(`📊 Found ${playerDuplicates.length} player entries that need removal\n`);
  
  // Group by player
  const byPlayer = {};
  playerDuplicates.forEach(dup => {
    if (!byPlayer[dup.playerName]) {
      byPlayer[dup.playerName] = [];
    }
    byPlayer[dup.playerName].push(dup);
  });
  
  // Show summary
  Object.entries(byPlayer).forEach(([player, dups]) => {
    const totalExtraHits = dups.reduce((sum, d) => sum + d.hits, 0);
    console.log(`${player}: ${dups.length} duplicate entries, +${totalExtraHits} extra hits`);
    dups.forEach(d => {
      console.log(`   - GameId ${d.gameId} on ${d.duplicateDate} (${d.hits} hits)`);
    });
  });
  
  // Generate cleanup batch
  const cleanupBatch = {
    timestamp: new Date().toISOString(),
    type: 'player_duplicate_cleanup',
    removals: playerDuplicates.map(dup => ({
      action: 'remove_player_game',
      file: dup.duplicateFile,
      playerKey: `${dup.playerName}_${dup.team}`,
      gameId: dup.gameId,
      reason: `Player duplicate - game ${dup.gameId} already played on ${dup.originalDate}`,
      confidence: 1.0
    })),
    summary: {
      totalRemovals: playerDuplicates.length,
      affectedPlayers: Object.keys(byPlayer).length,
      totalExtraHits: playerDuplicates.reduce((sum, d) => sum + d.hits, 0)
    }
  };
  
  // Save cleanup batch
  const batchPath = `scripts/data-validation/player_cleanup_batch_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(batchPath, JSON.stringify(cleanupBatch, null, 2));
  
  console.log(`\n📊 Cleanup batch saved to: ${batchPath}`);
  console.log('\n✅ To execute cleanup:');
  console.log(`   node scripts/review/executeApprovedBatch.js ${batchPath}`);
}

findAndCleanPlayerDuplicates().catch(console.error);