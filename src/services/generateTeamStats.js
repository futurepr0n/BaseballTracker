#!/usr/bin/env node

/**
 * Generate Team Stats
 * 
 * This script generates comprehensive team statistics by aggregating
 * player data from rolling stats. It creates a team_stats.json file
 * that can be used for team context analysis.
 * 
 * Usage: node src/services/generateTeamStats.js [YYYY-MM-DD]
 */

const fs = require('fs').promises;
const path = require('path');

// MLB team abbreviations
const MLB_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CHW', 'CIN', 'CLE', 'COL', 'DET',
  'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'OAK',
  'PHI', 'PIT', 'SD', 'SF', 'SEA', 'STL', 'TB', 'TEX', 'TOR', 'WSH'
];

async function loadRollingStats(dateStr) {
  try {
    const statsPath = path.join(__dirname, '../../public/data/rolling_stats', `rolling_stats_season_${dateStr}.json`);
    const data = await fs.readFile(statsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Try latest file as fallback
    try {
      const latestPath = path.join(__dirname, '../../public/data/rolling_stats', 'rolling_stats_season_latest.json');
      const data = await fs.readFile(latestPath, 'utf-8');
      return JSON.parse(data);
    } catch (fallbackError) {
      console.error('Could not load rolling stats:', error.message);
      return null;
    }
  }
}

async function calculateRealTeamRecords(targetDate) {
  console.log('📊 Calculating real team records from game data...');
  
  const records = {};
  
  // Initialize all teams
  MLB_TEAMS.forEach(team => {
    records[team] = {
      wins: 0,
      losses: 0,
      homeWins: 0,
      homeLosses: 0,
      awayWins: 0,
      awayLosses: 0
    };
  });

  // Parse target date to determine which files to scan
  const targetDateObj = new Date(targetDate);
  const currentYear = targetDateObj.getFullYear();
  
  // Get all months up to target date
  const months = ['april', 'may', 'june', 'july', 'august', 'september', 'october'];
  const targetMonth = targetDateObj.getMonth() + 1; // JavaScript months are 0-indexed
  
  console.log(`📅 Target date: ${targetDate}, Target month: ${targetMonth}`);
  
  for (let monthIndex = 4; monthIndex <= targetMonth; monthIndex++) { // Start from April (month 4)
    if (monthIndex > 12) break;
    
    const monthName = months[monthIndex - 4]; // Adjust for array index
    const monthDir = path.join(__dirname, '../../public/data', currentYear.toString(), monthName);
    
    console.log(`📂 Checking month: ${monthName} (${monthIndex}), Directory: ${monthDir}`);
    
    try {
      const files = await fs.readdir(monthDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
      console.log(`  📁 Found ${jsonFiles.length} JSON files in ${monthName}`);
      
      // Show first few files for debugging
      if (jsonFiles.length > 0) {
        console.log(`  📋 Sample files: ${jsonFiles.slice(0, 3).join(', ')}${jsonFiles.length > 3 ? '...' : ''}`);
      }
      
      for (const file of jsonFiles) {
        const filePath = path.join(monthDir, file);
        const fileDate = file.replace(`${monthName}_`, '').replace(`_${currentYear}.json`, '');
        const day = parseInt(fileDate);
        const gameDate = new Date(currentYear, monthIndex - 1, day);
        
        // Only process games up to target date
        if (gameDate <= targetDateObj) {
          let gamesProcessed = 0;
          try {
            const gameData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            
            if (gameData.games) {
              gameData.games.forEach(game => {
                if (game.status === 'Final' && game.homeScore !== null && game.awayScore !== null) {
                  const homeTeam = game.homeTeam;
                  const awayTeam = game.awayTeam;
                  const homeScore = parseInt(game.homeScore);
                  const awayScore = parseInt(game.awayScore);
                  
                  if (!records[homeTeam]) {
                    console.warn(`⚠️  Unknown home team: ${homeTeam}`);
                    return;
                  }
                  if (!records[awayTeam]) {
                    console.warn(`⚠️  Unknown away team: ${awayTeam}`);
                    return;
                  }
                  
                  if (homeScore > awayScore) {
                    // Home team wins
                    records[homeTeam].wins++;
                    records[homeTeam].homeWins++;
                    records[awayTeam].losses++;
                    records[awayTeam].awayLosses++;
                    gamesProcessed++;
                  } else if (awayScore > homeScore) {
                    // Away team wins
                    records[awayTeam].wins++;
                    records[awayTeam].awayWins++;
                    records[homeTeam].losses++;
                    records[homeTeam].homeLosses++;
                    gamesProcessed++;
                  }
                }
              });
            }
            
            if (gamesProcessed > 0) {
              console.log(`    ✅ Found ${gamesProcessed} completed games`);
            }
          } catch (fileError) {
            console.warn(`⚠️  Could not process ${filePath}:`, fileError.message);
          }
        }
      }
    } catch (dirError) {
      console.warn(`⚠️  Could not read directory ${monthDir}:`, dirError.message);
    }
  }
  
  console.log(`✅ Calculated real team records through ${targetDate}`);
  return records;
}

function calculateTeamStats(rollingData, teamAbbr) {
  // Collect all players from this team
  const teamPlayersMap = new Map();
  
  // Get player data from allHitters
  if (rollingData.allHitters) {
    rollingData.allHitters
      .filter(p => p.team === teamAbbr)
      .forEach(player => {
        teamPlayersMap.set(player.name, { ...player });
      });
  }
  
  // Merge HR data from allHRLeaders
  if (rollingData.allHRLeaders) {
    rollingData.allHRLeaders
      .filter(p => p.team === teamAbbr)
      .forEach(player => {
        const existing = teamPlayersMap.get(player.name) || {};
        teamPlayersMap.set(player.name, {
          ...existing,
          HR: player.HR,
          hrsPerGame: player.hrsPerGame
        });
      });
  }
  
  // Merge SB data if available
  if (rollingData.allSBLeaders) {
    rollingData.allSBLeaders
      .filter(p => p.team === teamAbbr)
      .forEach(player => {
        const existing = teamPlayersMap.get(player.name) || {};
        teamPlayersMap.set(player.name, {
          ...existing,
          SB: player.SB
        });
      });
  }
  
  const teamPlayers = Array.from(teamPlayersMap.values());
  
  if (teamPlayers.length === 0) {
    return null;
  }
  
  // Calculate aggregates
  const stats = {
    players: teamPlayers.length,
    totalGames: Math.max(...teamPlayers.map(p => p.games || 0)),
    totalHits: teamPlayers.reduce((sum, p) => sum + (p.H || 0), 0),
    totalAB: teamPlayers.reduce((sum, p) => sum + (p.AB || 0), 0),
    totalRuns: teamPlayers.reduce((sum, p) => sum + (p.R || 0), 0),
    totalHR: teamPlayers.reduce((sum, p) => sum + (p.HR || 0), 0),
    totalRBI: teamPlayers.reduce((sum, p) => sum + (p.RBI || 0), 0),
    totalSB: teamPlayers.reduce((sum, p) => sum + (p.SB || 0), 0)
  };
  
  // Calculate averages
  stats.teamBA = stats.totalAB > 0 ? (stats.totalHits / stats.totalAB).toFixed(3) : '.000';
  stats.runsPerGame = stats.totalGames > 0 ? (stats.totalRuns / stats.totalGames).toFixed(1) : '0.0';
  stats.hrPerGame = stats.totalGames > 0 ? (stats.totalHR / stats.totalGames).toFixed(1) : '0.0';
  stats.sbPerGame = stats.totalGames > 0 ? (stats.totalSB / stats.totalGames).toFixed(1) : '0.0';
  
  // Simple OPS calculation
  const obp = stats.totalAB > 0 ? (stats.totalHits / stats.totalAB) : 0;
  const slg = stats.totalAB > 0 ? ((stats.totalHits + stats.totalHR * 3) / stats.totalAB) : 0;
  stats.teamOPS = (obp + slg).toFixed(3);
  
  return stats;
}

function rankTeams(allTeamStats) {
  const teams = Object.entries(allTeamStats)
    .filter(([_, stats]) => stats !== null)
    .map(([team, stats]) => ({ team, ...stats }));
  
  // Create rankings for different categories
  const rankings = {};
  
  // Sort by various metrics
  const metrics = [
    { key: 'teamBA', name: 'battingAverage' },
    { key: 'runsPerGame', name: 'runs' },
    { key: 'totalHR', name: 'homeRuns' },
    { key: 'teamOPS', name: 'onBasePercentage' }
  ];
  
  metrics.forEach(({ key, name }) => {
    const sorted = [...teams].sort((a, b) => {
      const aVal = parseFloat(a[key]) || 0;
      const bVal = parseFloat(b[key]) || 0;
      return bVal - aVal; // Descending order
    });
    
    sorted.forEach((team, index) => {
      if (!rankings[team.team]) rankings[team.team] = {};
      rankings[team.team][name] = index + 1;
    });
  });
  
  // Overall offense ranking (average of other rankings)
  teams.forEach(team => {
    const teamRankings = rankings[team.team];
    const avgRank = Math.round(
      (teamRankings.battingAverage + teamRankings.runs + teamRankings.homeRuns + teamRankings.onBasePercentage) / 4
    );
    teamRankings.offense = avgRank;
  });
  
  return rankings;
}

async function generateTeamStats(targetDate) {
  console.log(`📊 Generating team stats for ${targetDate}`);
  
  // Load rolling stats
  const rollingData = await loadRollingStats(targetDate);
  if (!rollingData) {
    console.error('❌ Failed to load rolling stats');
    return;
  }
  
  console.log(`✅ Loaded rolling stats with ${rollingData.totalPlayers} players`);
  
  // Calculate real team records from game data
  const teamRecords = await calculateRealTeamRecords(targetDate);
  
  // Calculate stats for each team
  const allTeamStats = {};
  
  for (const team of MLB_TEAMS) {
    const teamStats = calculateTeamStats(rollingData, team);
    if (teamStats) {
      // Add real team records instead of estimates
      const record = teamRecords[team];
      if (record) {
        const totalGames = record.wins + record.losses;
        teamStats.actualRecord = `${record.wins}-${record.losses}`;
        teamStats.homeRecord = `${record.homeWins}-${record.homeLosses}`;
        teamStats.awayRecord = `${record.awayWins}-${record.awayLosses}`;
        teamStats.winPercentage = totalGames > 0 ? (record.wins / totalGames).toFixed(3) : '.000';
        teamStats.homeWinPercentage = (record.homeWins + record.homeLosses) > 0 ? 
          (record.homeWins / (record.homeWins + record.homeLosses)).toFixed(3) : '.000';
        teamStats.awayWinPercentage = (record.awayWins + record.awayLosses) > 0 ? 
          (record.awayWins / (record.awayWins + record.awayLosses)).toFixed(3) : '.000';
      } else {
        // Fallback if no record data available
        teamStats.actualRecord = '0-0';
        teamStats.homeRecord = '0-0';
        teamStats.awayRecord = '0-0';
        teamStats.winPercentage = '.000';
        teamStats.homeWinPercentage = '.000';
        teamStats.awayWinPercentage = '.000';
      }
      
      allTeamStats[team] = teamStats;
      console.log(`✅ ${team}: ${teamStats.actualRecord} (${teamStats.winPercentage}), ${teamStats.players} players, ${teamStats.teamBA} BA`);
    } else {
      console.log(`⚠️  ${team}: No data found`);
    }
  }
  
  // Calculate rankings
  const rankings = rankTeams(allTeamStats);
  
  // Add rankings to team stats
  Object.keys(allTeamStats).forEach(team => {
    if (allTeamStats[team] && rankings[team]) {
      allTeamStats[team].rankings = rankings[team];
    }
  });
  
  // Create output object
  const output = {
    generatedAt: new Date().toISOString(),
    targetDate,
    teams: allTeamStats,
    metadata: {
      totalTeams: Object.keys(allTeamStats).length,
      dataSource: 'rolling_stats'
    }
  };
  
  // Write to file
  const outputDir = path.join(__dirname, '../../public/data/team_stats');
  await fs.mkdir(outputDir, { recursive: true });
  
  const outputPath = path.join(outputDir, `team_stats_${targetDate}.json`);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  
  // Also write as latest
  const latestPath = path.join(outputDir, 'team_stats_latest.json');
  await fs.writeFile(latestPath, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Team stats generated successfully!`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📁 Latest: ${latestPath}`);
}

// Main execution
const targetDate = process.argv[2] || new Date().toISOString().split('T')[0];
generateTeamStats(targetDate)
  .catch(error => {
    console.error('❌ Error generating team stats:', error);
    process.exit(1);
  });