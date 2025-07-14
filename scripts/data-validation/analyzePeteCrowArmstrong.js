#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function findPeteCrowArmstrongGames() {
  console.log('🔍 Searching for all Pete Crow-Armstrong game entries...');
  
  const dataDir = 'public/data/2025';
  const months = ['march', 'april', 'may', 'june', 'july'];
  const allGames = [];
  
  for (const month of months) {
    const monthDir = path.join(dataDir, month);
    if (!fs.existsSync(monthDir)) continue;
    
    const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const filePath = path.join(monthDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const players = data.players || data || [];
        
        const peteGames = Array.isArray(players) ? 
          players.filter(p => p.name && p.name.includes('Crow-Armstrong')) : [];
        
        if (peteGames.length > 0) {
          peteGames.forEach(game => {
            allGames.push({
              date: file.replace('.json', '').replace(month + '_', '').replace('_2025', ''),
              file: file,
              month: month,
              gameId: game.gameId,
              hits: game.H || game.hits || 0,
              ab: game.AB || game.atBats || 0,
              team: game.team || game.Team,
              fullPath: filePath
            });
          });
        }
      } catch (e) {
        // Skip problematic files
      }
    }
  }
  
  // Sort by date
  allGames.sort((a, b) => {
    const monthOrder = { march: 3, april: 4, may: 5, june: 6, july: 7 };
    const dateA = new Date(`2025-${monthOrder[a.month]}-${a.date.padStart(2, '0')}`);
    const dateB = new Date(`2025-${monthOrder[b.month]}-${b.date.padStart(2, '0')}`);
    return dateA - dateB;
  });
  
  console.log('\n📊 Pete Crow-Armstrong Season Summary:');
  console.log('Total game entries found:', allGames.length);
  
  // Calculate cumulative hits
  let cumulativeHits = 0;
  console.log('\n📈 Game-by-game hits accumulation:');
  console.log('(Showing first 10, last 10, and multi-hit games)\n');
  
  allGames.forEach((game, idx) => {
    cumulativeHits += game.hits;
    if (idx < 10 || idx >= allGames.length - 10 || game.hits > 2) {
      console.log(`Game ${idx + 1}: ${game.month} ${game.date} - ${game.hits} hits (Total: ${cumulativeHits}) - GameId: ${game.gameId}`);
    } else if (idx === 10) {
      console.log('...');
    }
  });
  
  console.log('\n🎯 Final season hits:', cumulativeHits);
  console.log('Expected hits: 98');
  console.log('Difference:', cumulativeHits - 98, '❌');
  
  // Look for potential duplicates
  const gameIdCounts = {};
  allGames.forEach(game => {
    if (!gameIdCounts[game.gameId]) gameIdCounts[game.gameId] = [];
    gameIdCounts[game.gameId].push(game);
  });
  
  console.log('\n🔍 Checking for duplicate gameIds:');
  let duplicatesFound = false;
  Object.entries(gameIdCounts).forEach(([gameId, games]) => {
    if (games.length > 1) {
      duplicatesFound = true;
      console.log(`\n⚠️  GameId ${gameId} appears ${games.length} times:`);
      games.forEach(g => console.log(`   - ${g.month} ${g.date} in ${g.file} (${g.hits} hits)`));
    }
  });
  
  if (!duplicatesFound) {
    console.log('No duplicate gameIds found for Pete Crow-Armstrong');
    
    // If no duplicates, let's check if we're missing the cleaned games
    console.log('\n🔍 Checking if our cleanup removed his games...');
    const cleanedGameIds = [401696251, 401696252, 401696257, 401696258, 401764563, 401696303, 401696306, 538, 622, 625, 401695613, 401695844, 401696195, 401696198, 401696193, 401696207, 401696221, 401696226, 401696224, 401696222, 401696275, 401696276, 401696273, 401696282, 401696280, 401696283, 401696279, 401696287, 401696286];
    
    const missingGames = allGames.filter(g => cleanedGameIds.includes(parseInt(g.gameId)));
    if (missingGames.length > 0) {
      console.log(`\n❌ ERROR: ${missingGames.length} of Pete's games were in the cleaned game IDs!`);
      missingGames.forEach(g => {
        console.log(`   - GameId ${g.gameId} on ${g.month} ${g.date} (${g.hits} hits)`);
      });
    }
  }
  
  // Let's also check the most recent games
  console.log('\n📅 Last 5 games details:');
  allGames.slice(-5).forEach(game => {
    console.log(`   ${game.month} ${game.date}: ${game.hits}/${game.ab} (GameId: ${game.gameId})`);
  });
}

findPeteCrowArmstrongGames().catch(console.error);