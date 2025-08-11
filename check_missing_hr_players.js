const fs = require('fs');

// Load August 9 data
const aug9Data = JSON.parse(fs.readFileSync('/Users/futurepr0n/Development/Capping.Pro/Claude-Code/BaseballData/data/2025/august/august_09_2025.json', 'utf8'));

// Load performance data
const perfData = JSON.parse(fs.readFileSync('/Users/futurepr0n/Development/Capping.Pro/Claude-Code/BaseballData/data/predictions/player_performance_latest.json', 'utf8'));

// Find players with HRs on Aug 9
const aug9HRPlayers = [];
if (aug9Data.players) {
  aug9Data.players.forEach(player => {
    if (player.playerType === 'hitter' && player.HR > 0) {
      aug9HRPlayers.push({
        name: player.name,
        team: player.team,
        hrs: player.HR
      });
    }
  });
}

// Check which Aug 9 HR players are missing from performance data
const missingPlayers = [];
aug9HRPlayers.forEach(aug9Player => {
  const found = perfData.players.find(perfPlayer => 
    perfPlayer.name === aug9Player.name && 
    perfPlayer.team === aug9Player.team &&
    perfPlayer.lastHRDate === '2025-08-09'
  );
  if (!found) {
    missingPlayers.push(aug9Player);
  }
});

console.log('Players who hit HRs on Aug 9 but missing from performance data:');
missingPlayers.forEach(player => {
  console.log(`- ${player.name} (${player.team}) - ${player.hrs} HR(s)`);
});
console.log(`\nTotal missing: ${missingPlayers.length} out of ${aug9HRPlayers.length} HR hitters`);