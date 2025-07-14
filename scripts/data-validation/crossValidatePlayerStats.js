#!/usr/bin/env node

const fs = require('fs');

async function crossValidatePlayerStats() {
  console.log('🔍 CROSS-VALIDATING PLAYER STATISTICS');
  console.log('====================================\n');
  
  // Check key players mentioned in our cleanup against rolling stats
  const testPlayers = [
    { name: 'P. Crow-Armstrong', team: 'CHC', expectedHits: 98 },
    { name: 'T. Story', team: 'BOS', expectedRange: [89, 95] }, // We know this was affected
    { name: 'C. Bellinger', team: 'NYY', expectedHits: 96 }, // Updated with correct team and expected hits
    { name: 'M. Trout', team: 'LAA', expectedRange: [85, 95] },
    { name: 'A. Judge', team: 'NYY', expectedRange: [110, 120] }
  ];
  
  // Load rolling stats
  const rollingStatsPath = 'public/data/rolling_stats/rolling_stats_season_latest.json';
  if (!fs.existsSync(rollingStatsPath)) {
    console.log('❌ Rolling stats not found - regenerate with: npm run generate-milestones');
    return;
  }
  
  const rollingStats = JSON.parse(fs.readFileSync(rollingStatsPath, 'utf8'));
  const allHitters = rollingStats.allHitters || [];
  
  console.log('📊 VALIDATION RESULTS:');
  console.log('======================\n');
  
  let validationsPassed = 0;
  let totalValidations = 0;
  
  for (const testPlayer of testPlayers) {
    totalValidations++;
    
    const playerStats = allHitters.find(p => 
      p.name === testPlayer.name && p.team === testPlayer.team
    );
    
    if (!playerStats) {
      console.log(`❌ ${testPlayer.name} (${testPlayer.team}): NOT FOUND in rolling stats`);
      continue;
    }
    
    const actualHits = playerStats.H;
    let isValid = false;
    let status = '';
    
    if (testPlayer.expectedHits) {
      isValid = actualHits === testPlayer.expectedHits;
      status = isValid ? '✅' : '❌';
      console.log(`${status} ${testPlayer.name} (${testPlayer.team}): ${actualHits} hits (expected: ${testPlayer.expectedHits})`);
    } else if (testPlayer.expectedRange) {
      isValid = actualHits >= testPlayer.expectedRange[0] && actualHits <= testPlayer.expectedRange[1];
      status = isValid ? '✅' : '⚠️';
      console.log(`${status} ${testPlayer.name} (${testPlayer.team}): ${actualHits} hits (expected: ${testPlayer.expectedRange[0]}-${testPlayer.expectedRange[1]})`);
    }
    
    if (isValid) validationsPassed++;
    
    // Show additional stats for context
    console.log(`   Games: ${playerStats.games}, AVG: ${playerStats.avg}, AB: ${playerStats.AB}\n`);
  }
  
  console.log('📈 VALIDATION SUMMARY:');
  console.log(`Validations Passed: ${validationsPassed}/${totalValidations}`);
  console.log(`Success Rate: ${(validationsPassed/totalValidations*100).toFixed(1)}%\n`);
  
  // Check overall rolling stats for any obviously wrong numbers
  await validateOverallStats(allHitters);
}

async function validateOverallStats(allHitters) {
  console.log('🔍 OVERALL STATS SANITY CHECK');
  console.log('=============================\n');
  
  // Look for players with unrealistic stats
  const suspiciousPlayers = [];
  
  allHitters.forEach(player => {
    const hits = player.H || 0;
    const games = player.games || 0;
    const ab = player.AB || 0;
    
    // Flag suspicious cases
    if (games > 0) {
      const hitsPerGame = hits / games;
      const avgFloat = parseFloat(player.avg || '0');
      
      // Check for unrealistic hit rates
      if (hitsPerGame > 4.0) {
        suspiciousPlayers.push({
          name: player.name,
          team: player.team,
          hits,
          games,
          hitsPerGame: hitsPerGame.toFixed(2),
          avg: player.avg,
          issue: 'Very high hits per game'
        });
      }
      
      // Check for mismatched average vs hits/AB
      if (ab > 0) {
        const calculatedAvg = hits / ab;
        const avgDifference = Math.abs(calculatedAvg - avgFloat);
        
        if (avgDifference > 0.05) {
          suspiciousPlayers.push({
            name: player.name,
            team: player.team,
            hits,
            ab,
            reportedAvg: player.avg,
            calculatedAvg: calculatedAvg.toFixed(3),
            difference: avgDifference.toFixed(3),
            issue: 'Average mismatch'
          });
        }
      }
    }
  });
  
  if (suspiciousPlayers.length === 0) {
    console.log('✅ No suspicious statistics found in rolling stats');
    console.log('✅ Data appears to be clean and consistent\n');
  } else {
    console.log(`⚠️  Found ${suspiciousPlayers.length} players with suspicious stats:\n`);
    
    suspiciousPlayers.slice(0, 10).forEach(player => {
      console.log(`❌ ${player.name} (${player.team}): ${player.issue}`);
      if (player.hitsPerGame) {
        console.log(`   ${player.hits} hits in ${player.games} games (${player.hitsPerGame} per game)`);
      }
      if (player.calculatedAvg) {
        console.log(`   Reported AVG: ${player.reportedAvg}, Calculated: ${player.calculatedAvg} (diff: ${player.difference})`);
      }
      console.log();
    });
    
    if (suspiciousPlayers.length > 10) {
      console.log(`... and ${suspiciousPlayers.length - 10} more`);
    }
  }
  
  // Summary stats
  const totalPlayers = allHitters.length;
  const avgHitsPerPlayer = allHitters.reduce((sum, p) => sum + (p.H || 0), 0) / totalPlayers;
  const avgGamesPerPlayer = allHitters.reduce((sum, p) => sum + (p.games || 0), 0) / totalPlayers;
  
  console.log('📊 OVERALL DATASET SUMMARY:');
  console.log(`Total Players: ${totalPlayers}`);
  console.log(`Average Hits per Player: ${avgHitsPerPlayer.toFixed(1)}`);
  console.log(`Average Games per Player: ${avgGamesPerPlayer.toFixed(1)}`);
  console.log(`Suspicious Players: ${suspiciousPlayers.length} (${(suspiciousPlayers.length/totalPlayers*100).toFixed(1)}%)`);
}

crossValidatePlayerStats().catch(console.error);