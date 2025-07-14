#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function validatePlayerCleanup() {
  console.log('🔍 VALIDATING PLAYER CLEANUP LOGIC');
  console.log('===================================\n');
  
  // Check 5 specific players mentioned in cleanup to verify the logic
  const testPlayers = [
    'P. Crow-Armstrong',
    'T. Story', 
    'B. Singer',
    'Y. Diaz',
    'M. Keller'
  ];
  
  for (const playerName of testPlayers) {
    await validatePlayerSpecific(playerName);
  }
  
  // Also do a broad validation
  await validateOverallCleanupLogic();
}

async function validatePlayerSpecific(playerName) {
  console.log(`🔍 Validating: ${playerName}`);
  console.log('-'.repeat(40));
  
  const dataDir = 'public/data/2025/july';
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).sort();
  const playerEntries = [];
  
  // Find all entries for this player
  for (const file of files) {
    try {
      const filePath = path.join(dataDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const players = data.players || [];
      
      const playerGames = players.filter(p => 
        p.name && (p.name === playerName || p.name.includes(playerName.split(' ')[1]))
      );
      
      playerGames.forEach(game => {
        playerEntries.push({
          date: file.replace('.json', ''),
          file: file,
          gameId: game.gameId,
          hits: game.H || 0,
          team: game.team
        });
      });
    } catch (e) {
      // Skip problematic files
    }
  }
  
  // Group by gameId
  const gameIdGroups = {};
  playerEntries.forEach(entry => {
    if (!gameIdGroups[entry.gameId]) {
      gameIdGroups[entry.gameId] = [];
    }
    gameIdGroups[entry.gameId].push(entry);
  });
  
  console.log(`Total entries found: ${playerEntries.length}`);
  
  // Check for duplicates
  const duplicateGameIds = Object.entries(gameIdGroups).filter(([gameId, entries]) => entries.length > 1);
  
  if (duplicateGameIds.length === 0) {
    console.log('✅ No duplicate gameIds found - cleanup was successful\n');
    return true;
  }
  
  console.log(`⚠️  Found ${duplicateGameIds.length} duplicate gameIds:`);
  duplicateGameIds.forEach(([gameId, entries]) => {
    console.log(`\n🎮 GameId ${gameId}:`);
    entries.forEach(entry => {
      console.log(`   - ${entry.date}: ${entry.hits} hits (${entry.file})`);
    });
    
    // Check if this game exists in any games array
    const gamesArrayCheck = checkGameInGamesArray(gameId, entries);
    console.log(`   Games array status: ${gamesArrayCheck}`);
  });
  
  console.log();
  return duplicateGameIds.length === 0;
}

function checkGameInGamesArray(gameId, entries) {
  // Check if this gameId exists in the games array of any of the files
  const gamesArrayOccurrences = [];
  
  entries.forEach(entry => {
    try {
      const filePath = `public/data/2025/july/${entry.file}`;
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const games = data.games || [];
      
      const gameExists = games.some(g => 
        g.originalId === parseInt(gameId) || 
        g.gameId === parseInt(gameId) ||
        g.originalId === gameId ||
        g.gameId === gameId
      );
      
      if (gameExists) {
        gamesArrayOccurrences.push(entry.date);
      }
    } catch (e) {
      // Skip
    }
  });
  
  if (gamesArrayOccurrences.length === 0) {
    return 'No games array entries (good - was cleaned)';
  } else if (gamesArrayOccurrences.length === 1) {
    return `Game exists on ${gamesArrayOccurrences[0]} only (correct)`;
  } else {
    return `⚠️ Game exists on multiple dates: ${gamesArrayOccurrences.join(', ')}`;
  }
}

async function validateOverallCleanupLogic() {
  console.log('🔍 OVERALL CLEANUP VALIDATION');
  console.log('=============================\n');
  
  // Run the same duplicate detection that found the 2060 entries
  const dataDir = 'public/data/2025/july';
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).sort();
  let totalDuplicatesFound = 0;
  let validDuplicatesFound = 0;
  let questionableDuplicatesFound = 0;
  
  for (let i = 0; i < files.length - 1; i++) {
    const currentFile = files[i];
    const currentPath = path.join(dataDir, currentFile);
    const currentData = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
    
    for (let j = i + 1; j < Math.min(i + 4, files.length); j++) {
      const futureFile = files[j];
      const futurePath = path.join(dataDir, futureFile);
      const futureData = JSON.parse(fs.readFileSync(futurePath, 'utf8'));
      
      const currentPlayers = currentData.players || [];
      const futurePlayers = futureData.players || [];
      
      for (const player of currentPlayers) {
        const duplicatePlayer = futurePlayers.find(fp => 
          fp.gameId === player.gameId && 
          fp.name === player.name
        );
        
        if (duplicatePlayer) {
          totalDuplicatesFound++;
          
          // Check if this game still exists in the future date's games array
          const futureGames = futureData.games || [];
          const gameStillExists = futureGames.some(g => 
            (g.originalId === player.gameId || g.gameId === player.gameId)
          );
          
          if (!gameStillExists) {
            validDuplicatesFound++;
            
            // Sample first few to verify
            if (validDuplicatesFound <= 5) {
              console.log(`✅ Valid duplicate found:`);
              console.log(`   Player: ${player.name} (${player.team})`);
              console.log(`   GameId: ${player.gameId}`);
              console.log(`   Original: ${currentFile.replace('.json', '')}`);
              console.log(`   Duplicate: ${futureFile.replace('.json', '')}`);
              console.log(`   Hits in duplicate: ${duplicatePlayer.H || 0}`);
              console.log(`   Game removed from games array: YES\n`);
            }
          } else {
            questionableDuplicatesFound++;
            
            if (questionableDuplicatesFound <= 3) {
              console.log(`⚠️  Questionable case:`);
              console.log(`   Player: ${player.name}`);
              console.log(`   GameId: ${player.gameId}`);
              console.log(`   Game still exists in games array on ${futureFile.replace('.json', '')}`);
              console.log(`   This was NOT cleaned\n`);
            }
          }
        }
      }
    }
  }
  
  console.log('📊 OVERALL VALIDATION SUMMARY:');
  console.log(`Total player duplicates found: ${totalDuplicatesFound}`);
  console.log(`Valid cleanups (game removed from games array): ${validDuplicatesFound}`);
  console.log(`Questionable cases (game still in games array): ${questionableDuplicatesFound}`);
  
  if (validDuplicatesFound > 2000) {
    console.log('\n✅ VALIDATION PASSED: Large number of valid duplicates found');
    console.log('   The 2060 cleanup appears to be legitimate');
  } else {
    console.log('\n⚠️  VALIDATION CONCERN: Lower number of valid duplicates than expected');
  }
  
  const accuracy = validDuplicatesFound / (validDuplicatesFound + questionableDuplicatesFound) * 100;
  console.log(`Cleanup accuracy: ${accuracy.toFixed(1)}%`);
}

validatePlayerCleanup().catch(console.error);