/**
 * CLI version of generateOpponentMatchupStats.js
 * 
 * Generates opponent matchup statistics for daily processing
 * Usage: node src/services/generateOpponentMatchupStats.cjs [YYYY-MM-DD]
 */

const fs = require('fs');
const path = require('path');

// Get the target date from command line or use today
const targetDate = process.argv[2] || new Date().toISOString().split('T')[0];

console.log(`🎯 Generating opponent matchup stats for ${targetDate}...`);

async function generateOpponentMatchups() {
  try {
    // Load today's games
    const [year, month, day] = targetDate.split('-');
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }).toLowerCase();
    const gameFilePath = path.join(
      process.cwd(),
      'public/data',
      year,
      monthName,
      `${monthName}_${day.padStart(2, '0')}_${year}.json`
    );
    
    if (!fs.existsSync(gameFilePath)) {
      console.log(`❌ Game file not found: ${gameFilePath}`);
      process.exit(1);
    }
    
    const gameData = JSON.parse(fs.readFileSync(gameFilePath, 'utf8'));
    
    if (!gameData.games || gameData.games.length === 0) {
      console.log('No games scheduled - creating empty opponent matchup file');
      
      const emptyMatchups = {
        hits: [],
        homeRuns: [],
        generatedAt: new Date().toISOString(),
        targetDate: targetDate,
        gameCount: 0
      };
      
      // Ensure directory exists
      const outputDir = path.join(process.cwd(), 'public/data/opponent_matchups');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Write files
      const outputPath = path.join(outputDir, `opponent_matchups_${targetDate}.json`);
      const latestPath = path.join(outputDir, 'opponent_matchups_latest.json');
      
      fs.writeFileSync(outputPath, JSON.stringify(emptyMatchups, null, 2));
      fs.writeFileSync(latestPath, JSON.stringify(emptyMatchups, null, 2));
      
      console.log('✅ Empty opponent matchup files created');
      return;
    }
    
    console.log(`📊 Processing ${gameData.games.length} scheduled games...`);
    
    // Load prop analysis data
    const propAnalysisPath = path.join(process.cwd(), 'public/data/prop_analysis/prop_analysis_latest.json');
    
    if (!fs.existsSync(propAnalysisPath)) {
      console.log('❌ Prop analysis data not found - skipping matchup generation');
      process.exit(1);
    }
    
    const propData = JSON.parse(fs.readFileSync(propAnalysisPath, 'utf8'));
    
    const opponentMatchups = {
      hits: [],
      homeRuns: [],
      generatedAt: new Date().toISOString(),
      targetDate: targetDate,
      gameCount: gameData.games.length
    };
    
    // Process hits matchups
    if (propData.propAnalysis?.hits?.topPlayers) {
      console.log(`Processing hits matchups for ${propData.propAnalysis.hits.topPlayers.length} players...`);
      opponentMatchups.hits = await processPlayerMatchups(
        propData.propAnalysis.hits.topPlayers,
        gameData.games,
        'hits',
        targetDate,
        90 // 90 days lookback for hits
      );
    }
    
    // Process home run matchups
    if (propData.propAnalysis?.home_runs?.topPlayers) {
      console.log(`Processing HR matchups for ${propData.propAnalysis.home_runs.topPlayers.length} players...`);
      opponentMatchups.homeRuns = await processPlayerMatchups(
        propData.propAnalysis.home_runs.topPlayers,
        gameData.games,
        'home_runs',
        targetDate,
        365 // 365 days lookback for HRs
      );
    }
    
    // Ensure directory exists
    const outputDir = path.join(process.cwd(), 'public/data/opponent_matchups');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write files
    const outputPath = path.join(outputDir, `opponent_matchups_${targetDate}.json`);
    const latestPath = path.join(outputDir, 'opponent_matchups_latest.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(opponentMatchups, null, 2));
    fs.writeFileSync(latestPath, JSON.stringify(opponentMatchups, null, 2));
    
    console.log(`✅ Generated opponent matchups: ${opponentMatchups.hits.length} hits, ${opponentMatchups.homeRuns.length} HRs`);
    console.log(`📁 Saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error generating opponent matchups:', error);
    process.exit(1);
  }
}

/**
 * Process player matchups for a specific stat type
 */
async function processPlayerMatchups(players, gameData, statType, targetDate, lookbackDays) {
  const matchups = [];
  
  // Get players who have games today
  const playersWithGames = players.filter(player => {
    const hasGame = gameData.find(game => 
      game.homeTeam === player.team || game.awayTeam === player.team
    );
    return hasGame && player.seasonTotal > 0;
  }).map(player => {
    const todaysGame = gameData.find(game => 
      game.homeTeam === player.team || game.awayTeam === player.team
    );
    const opponent = todaysGame.homeTeam === player.team 
      ? todaysGame.awayTeam 
      : todaysGame.homeTeam;
    
    return {
      ...player,
      todaysOpponent: opponent,
      todaysGame: todaysGame
    };
  });
  
  console.log(`📊 Processing ${playersWithGames.length} players with games today for ${statType}`);
  
  // Process each player's historical data
  let processed = 0;
  for (const player of playersWithGames) {
    try {
      const playerStats = await analyzePlayerVsOpponent(
        player,
        targetDate,
        lookbackDays,
        statType
      );
      
      if (playerStats) {
        matchups.push(playerStats);
      }
      processed++;
      
      // Progress indicator
      if (processed % 10 === 0) {
        console.log(`   Processed ${processed}/${playersWithGames.length} players...`);
      }
    } catch (error) {
      console.error(`Error processing ${player.name}:`, error.message);
    }
  }
  
  // Sort and filter results
  const qualifiedMatchups = matchups
    .filter(p => statType === 'hits' ? p.gamesVsOpponent >= 3 : p.totalValue > 0)
    .sort((a, b) => parseFloat(b.ratePerGame) - parseFloat(a.ratePerGame))
    .slice(0, 25);
  
  console.log(`✅ Generated ${qualifiedMatchups.length} qualified ${statType} matchups`);
  return qualifiedMatchups;
}

/**
 * Analyze a player's performance vs specific opponent
 */
async function analyzePlayerVsOpponent(player, targetDate, lookbackDays, statType) {
  const endDate = new Date(targetDate);
  const historicalData = {};
  
  // Load historical data
  for (let daysBack = 0; daysBack < lookbackDays; daysBack++) {
    const searchDate = new Date(endDate);
    searchDate.setDate(searchDate.getDate() - daysBack);
    
    // Skip off-season dates
    const year = searchDate.getFullYear();
    const seasonStart = year === 2025 ? new Date('2025-03-18') : new Date(`${year}-03-20`);
    const seasonEnd = new Date(`${year}-10-31`);
    if (searchDate < seasonStart || searchDate > seasonEnd) continue;
    
    const dateStr = searchDate.toISOString().split('T')[0];
    
    try {
      const [year, month, day] = dateStr.split('-');
      const monthName = searchDate.toLocaleString('default', { month: 'long' }).toLowerCase();
      const filePath = path.join(
        process.cwd(),
        'public/data',
        year,
        monthName,
        `${monthName}_${day.padStart(2, '0')}_${year}.json`
      );
      
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (data.players && Array.isArray(data.players) && data.players.length > 0) {
          historicalData[dateStr] = data;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  // Analyze games vs today's opponent
  let totalValue = 0;
  let gamesVsOpponent = 0;
  let totalABs = 0;
  const opponentGames = [];
  
  Object.entries(historicalData).forEach(([dateStr, dayData]) => {
    const playerData = dayData.players?.find(p => 
      p.name === player.name && p.team === player.team
    );
    
    if (playerData) {
      // Check if this was a game vs today's opponent
      const gameInfo = dayData.games?.find(g => 
        (g.homeTeam === player.team || g.awayTeam === player.team) &&
        (g.homeTeam === player.todaysOpponent || g.awayTeam === player.todaysOpponent)
      );
      
      if (gameInfo) {
        const statValue = getStatValue(playerData, statType);
        totalValue += statValue;
        gamesVsOpponent++;
        
        if (statType === 'hits') {
          totalABs += playerData.AB || playerData.ab || 3;
        }
        
        opponentGames.push({
          date: dateStr,
          value: statValue,
          ab: statType === 'hits' ? (playerData.AB || playerData.ab || 3) : undefined
        });
      }
    }
  });
  
  if (gamesVsOpponent === 0) {
    return null;
  }
  
  const ratePerGame = (totalValue / gamesVsOpponent).toFixed(statType === 'hits' ? 2 : 3);
  const battingAvg = statType === 'hits' && totalABs > 0 ? (totalValue / totalABs).toFixed(3) : null;
  
  return {
    playerName: player.name,
    playerTeam: player.team,
    opponentTeam: player.todaysOpponent,
    ratePerGame: ratePerGame,
    totalValue: totalValue,
    gamesVsOpponent: gamesVsOpponent,
    battingAvg: battingAvg,
    recentForm: player.trend === 'up' ? '🔥' : player.trend === 'down' ? '❄️' : '➡️',
    opponentHistory: opponentGames.slice(-5).reverse()
  };
}

/**
 * Get statistical value for player data
 */
function getStatValue(playerData, statType) {
  if (statType === 'hits') {
    return playerData.H || playerData.hits || 0;
  } else if (statType === 'home_runs') {
    return playerData.HR || playerData.hr || playerData.homeRuns || 0;
  }
  return 0;
}

// Run the generation
generateOpponentMatchups();