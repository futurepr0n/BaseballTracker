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
  
  // Estimate record (wins at .500 rate as baseline)
  const estimatedWins = Math.round(stats.totalGames * 0.5);
  const estimatedLosses = stats.totalGames - estimatedWins;
  stats.estimatedRecord = `${estimatedWins}-${estimatedLosses}`;
  
  // Home/Away split estimates
  stats.estimatedHomeRecord = `${Math.round(estimatedWins * 0.55)}-${Math.round(estimatedLosses * 0.45)}`;
  stats.estimatedAwayRecord = `${Math.round(estimatedWins * 0.45)}-${Math.round(estimatedLosses * 0.55)}`;
  
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
  
  // Calculate stats for each team
  const allTeamStats = {};
  
  for (const team of MLB_TEAMS) {
    const teamStats = calculateTeamStats(rollingData, team);
    if (teamStats) {
      allTeamStats[team] = teamStats;
      console.log(`✅ ${team}: ${teamStats.players} players, ${teamStats.teamBA} BA, ${teamStats.runsPerGame} R/G`);
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