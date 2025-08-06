/**
 * generatePropAnalysis.js
 * 
 * This script pre-computes player prop analysis data to avoid real-time processing
 * bottlenecks in the PlayerPropsLadderCard component. 
 * 
 * Analysis includes:
 * - Player prop probabilities for hits, RBI, runs, home runs, walks
 * - Strategic Intelligence integration for HR analysis
 * - Multi-hit performance data integration
 * - Team filtering support with proper player grouping
 * - Performance optimizations through pre-computation
 * 
 * Generated data structure matches PlayerPropsLadderCard requirements
 * and eliminates the need for real-time Strategic Intelligence calculations.
 */

const fs = require('fs');
const path = require('path');

// Import centralized configuration
const { paths } = require('../../config/dataPath');

// Configuration
const ROSTER_PATH = paths.rosters;
const ROLLING_STATS_PATH = path.join(paths.rollingStats, 'rolling_stats_season_latest.json');
const MULTI_HIT_STATS_PATH = path.join(paths.multiHitStats, 'multi_hit_stats_latest.json');
const OUTPUT_DIR = paths.propAnalysis;

// Prop analysis configuration matching PlayerPropsLadderCard
const PROP_OPTIONS = [
  { key: 'hits', label: 'Hits', icon: '⚾', statKey: 'H' },
  { key: 'rbi', label: 'RBI', icon: '🏃', statKey: 'RBI' },
  { key: 'runs', label: 'Runs', icon: '🏠', statKey: 'R' },
  { key: 'home_runs', label: 'Home Runs', icon: '🏟️', statKey: 'HR' },
  { key: 'walks', label: 'Walks', icon: '🚶', statKey: 'totalBBs' }
];

/**
 * Map rolling stats statKey to individual game data field names
 * Rolling stats use aggregated names like 'totalBBs', but individual game data uses 'BB'
 */
function mapStatKeyToGameField(statKey) {
  const mapping = {
    'H': 'H',           // Hits - same name
    'RBI': 'RBI',       // RBI - same name  
    'R': 'R',           // Runs - same name
    'HR': 'HR',         // Home Runs - same name
    'totalBBs': 'BB'    // Walks - rolling stats use 'totalBBs', game data uses 'BB'
  };
  
  return mapping[statKey] || statKey;
}

// Analysis thresholds
const ANALYSIS_THRESHOLDS = {
  MIN_GAMES_PLAYED: 5,
  MIN_SEASON_RATE: 0.1,
  PLAYERS_PER_TEAM: 50,
  TOP_PLAYERS_ALL_TEAMS: 50
};

/**
 * Read JSON file safely
 */
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

/**
 * Write JSON file safely
 */
function writeJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return false;
  }
}

/**
 * Get data sections based on prop type (matches PlayerPropsLadderCard logic)
 */
function getSectionsForProp(propKey) {
  switch(propKey) {
    case 'home_runs':
      return ['allHRLeaders', 'topHRLeaders'];
    case 'walks':
      return ['allHitters', 'allPlayerStats'];
    default:
      return ['allHitters', 'topHitters', 'topHRLeaders', 'allHRLeaders', 'allPlayerStats'];
  }
}

/**
 * Calculate strategic factors for HR enhancement (simplified version)
 * This is a simplified version of the PlayerPropsLadderCard strategic factors
 * to avoid complex stadium/weather service dependencies in the generation script
 */
function calculateBasicStrategicFactors(player) {
  const badges = [];
  let confidenceBoost = 0;
  const parkFactor = 1.0; // Default neutral park factor
  
  // Basic HR performance badges
  if (player.HR >= 30) {
    badges.push({
      type: 'HR_CANDIDATE',
      source: 'hr_analysis',
      reason: `${player.HR} HRs this season`,
      boost: 12
    });
    confidenceBoost += 12;
  } else if (player.HR >= 20) {
    badges.push({
      type: 'DUE_FOR_HR',
      source: 'hr_analysis', 
      reason: `${player.HR} HRs - due for power surge`,
      boost: 8
    });
    confidenceBoost += 8;
  }
  
  // Games played factor for confidence
  if (player.G >= 50) {
    confidenceBoost += 3; // Bonus for substantial sample size
  }
  
  return {
    badges,
    parkFactor,
    confidenceBoost,
    stadiumContext: null // Not available in generation script
  };
}

/**
 * Load historical game data for chart generation with proper opponent matching
 */
async function loadHistoricalGameData(playerName, playerTeam, statKey, maxDaysBack = 120) {
  const historicalGames = [];
  const now = new Date();
  
  for (let daysBack = 0; daysBack < maxDaysBack; daysBack++) {
    const searchDate = new Date(now);
    searchDate.setDate(searchDate.getDate() - daysBack);
    
    // REMOVED: Skip weekends - MLB plays games on weekends including Sunday doubleheaders
    // const dayOfWeek = searchDate.getDay();
    // if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    // Check if it's a valid MLB season date
    const year = searchDate.getFullYear();
    const seasonStart = year === 2025 ? new Date('2025-03-18') : new Date(`${year}-03-20`);
    const seasonEnd = new Date(`${year}-10-31`);
    if (searchDate < seasonStart || searchDate > seasonEnd) continue;
    
    try {
      const dateStr = searchDate.toISOString().split('T')[0];
      const [year, /* month */, day] = dateStr.split('-');
      const monthName = searchDate.toLocaleString('default', { month: 'long' }).toLowerCase();
      const filePath = paths.gameDataFile(parseInt(year), monthName, parseInt(day));
      
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (data.players && Array.isArray(data.players)) {
          // FIXED: Use filter() to get ALL player instances (handles doubleheaders)
          const allPlayerData = data.players.filter(p => 
            (p.name === playerName || p.Name === playerName) && 
            (p.team === playerTeam || p.Team === playerTeam)
          );
          
          // Process each game this player appeared in on this date
          for (const playerData of allPlayerData) {
            // Map statKey to the correct field name in individual game data
            const gameFieldName = mapStatKeyToGameField(statKey);
            
            if (playerData && playerData[gameFieldName] !== undefined) {
              const propValue = playerData[gameFieldName] || 0;
              
              // Extract opponent information from games section
              let opponent = 'Unknown';
              let venue = '';
              
              if (data.games && Array.isArray(data.games) && playerData.gameId) {
                // FIXED: Use gameId matching instead of team matching for proper game association
                const game = data.games.find(g => 
                  g.originalId === parseInt(playerData.gameId) || 
                  g.gameId === parseInt(playerData.gameId) || 
                  g.espnGameId === parseInt(playerData.gameId) ||
                  g.originalId === playerData.gameId || 
                  g.gameId === playerData.gameId || 
                  g.espnGameId === playerData.gameId
                );
                
                if (game) {
                  const opponentTeam = game.homeTeam === playerTeam ? game.awayTeam : game.homeTeam;
                  const isHome = game.homeTeam === playerTeam;
                  opponent = isHome ? `vs ${opponentTeam}` : `@ ${opponentTeam}`;
                  venue = game.venue || '';
                }
              }
              
              // Fallback: check if player data already has opponent info
              if (opponent === 'Unknown') {
                opponent = playerData.opponent || playerData.Opponent || playerData.vs || playerData.VS || 'Unknown';
              }
              
              historicalGames.push({
                date: dateStr,
                displayDate: searchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: propValue,
                success1Plus: propValue >= 1,
                success2Plus: propValue >= 2,
                opponent: opponent,
                venue: venue,
                gameData: playerData,
                gameId: playerData.gameId // Include gameId for debugging/verification
              });
            }
          }
        }
      }
    } catch (error) {
      // Silent handling of missing files
      continue;
    }
  }
  
  return historicalGames.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Generate chart-ready data structures for player
 */
async function generatePlayerChartData(player, propOption, games) {
  const statKey = propOption.statKey;
  const playerName = player.name || player.Name;
  const playerTeam = player.team || player.Team;
  
  // Load historical game data
  const historicalGames = await loadHistoricalGameData(playerName, playerTeam, statKey);
  
  // Recent 5 games
  const recent5Games = historicalGames.slice(0, 5).map((game, index) => ({
    ...game,
    gameNumber: index + 1,
    gameType: 'recent'
  }));
  
  // Season overview data (simplified for pre-generation)
  const seasonOverview = {
    seasonTotal: player[statKey] || 0,
    seasonAverage: ((player[statKey] || 0) / games).toFixed(3),
    gamesPlayed: games,
    leagueAverage: getLeagueAverage(propOption.key), // Simplified league average
    projectedTotal: Math.round(((player[statKey] || 0) / games) * 162)
  };
  
  // Opponent history (will be populated dynamically based on current matchup)
  const opponentHistory = {};
  const seenOpponents = new Set();
  
  historicalGames.forEach(game => {
    if (game.opponent && !seenOpponents.has(game.opponent)) {
      seenOpponents.add(game.opponent);
      
      const opponentGames = historicalGames
        .filter(g => g.opponent === game.opponent)
        .map((g, index) => ({
          ...g,
          gameNumber: index + 1,
          gameType: 'opponent'
        }));
      
      if (opponentGames.length > 0) {
        const opponentTotal = opponentGames.reduce((sum, g) => sum + g.value, 0);
        const opponentAvg = (opponentTotal / opponentGames.length).toFixed(3);
        
        opponentHistory[game.opponent] = {
          games: opponentGames,
          stats: {
            totalGames: opponentGames.length,
            totalStat: opponentTotal,
            average: opponentAvg,
            successRate1Plus: (opponentGames.filter(g => g.success1Plus).length / opponentGames.length * 100).toFixed(1),
            successRate2Plus: (opponentGames.filter(g => g.success2Plus).length / opponentGames.length * 100).toFixed(1)
          }
        };
      }
    }
  });
  
  return {
    recent5Games,
    seasonOverview,
    opponentHistory,
    totalHistoricalGames: historicalGames.length
  };
}

/**
 * Get simplified league average for a prop type
 */
function getLeagueAverage(propKey) {
  const leagueAverages = {
    hits: 1.0,
    rbi: 0.6,
    runs: 0.6,
    home_runs: 0.9,
    walks: 0.4
  };
  return leagueAverages[propKey] || 0.5;
}

/**
 * Calculate prop probabilities (enhanced with chart data)
 */
async function calculatePropProbabilities(player, propOption, multiHitData) {
  const games = player.G || player.games || player.gamesPlayed || 1;
  const statKey = propOption.statKey;
  const seasonTotal = player[statKey] || 0;
  const seasonRate = seasonTotal / games;
  
  // Use multi-hit data for enhanced calculations if available
  let multiHitRate = 0;
  let recentForm = seasonRate;
  
  if (multiHitData && multiHitData.topMultiHitPerformers && propOption.key === 'hits') {
    const playerMultiHit = multiHitData.topMultiHitPerformers.find(p => 
      (p.name === player.name || p.Name === player.name) && 
      (p.team === player.team || p.Team === player.team)
    );
    
    if (playerMultiHit) {
      multiHitRate = playerMultiHit.multiHitRate || 0;
      recentForm = playerMultiHit.avgHitsPerGame || seasonRate;
    }
  }
  
  // Calculate base probabilities using Poisson distribution
  const effectiveRate = Math.max(0.1, (seasonRate * 0.7) + (recentForm * 0.3));
  let prob1Plus = Math.min(95, Math.max(5, (1 - Math.exp(-effectiveRate)) * 100));
  let prob2Plus = Math.min(85, Math.max(2, (1 - Math.exp(-effectiveRate) * (1 + effectiveRate)) * 100));
  
  // Enhanced probability calculation for Home Runs with basic Strategic Intelligence
  let strategicFactors = null;
  if (propOption.key === 'home_runs') {
    strategicFactors = calculateBasicStrategicFactors(player);
    
    if (strategicFactors) {
      const { confidenceBoost, parkFactor } = strategicFactors;
      
      // Apply park factor (simplified to neutral for generation)
      prob1Plus = Math.min(95, prob1Plus * parkFactor);
      prob2Plus = Math.min(85, prob2Plus * parkFactor);
      
      // Apply confidence boost
      prob1Plus = Math.min(95, prob1Plus * (1 + confidenceBoost / 100));
      prob2Plus = Math.min(85, prob2Plus * (1 + confidenceBoost / 100));
    }
  }
  
  // Generate chart data for this player
  const chartData = await generatePlayerChartData(player, propOption, games);
  
  return {
    seasonTotal: Math.round(seasonTotal),
    rate: Number(seasonRate.toFixed(3)),
    recentRate: Number(recentForm.toFixed(3)),
    prob1Plus: Number(prob1Plus.toFixed(1)),
    prob2Plus: Number(prob2Plus.toFixed(1)),
    multiHitRate: Number((multiHitRate * 100).toFixed(1)),
    trend: recentForm > seasonRate ? 'up' : recentForm < seasonRate ? 'down' : 'stable',
    confidence: games >= 20 ? 'high' : games >= 10 ? 'medium' : 'low',
    strategicFactors,
    chartData // NEW: Pre-computed chart-ready data
  };
}

/**
 * Process player prop data for a specific prop type (enhanced with chart data)
 */
async function processPlayerPropData(rollingData, multiHitData, propOption) {
  if (!rollingData) return [];
  
  const allPlayers = [];
  const sections = getSectionsForProp(propOption.key);
  
  console.log(`Processing ${propOption.key} using sections:`, sections);
  
  sections.forEach(section => {
    if (rollingData[section] && Array.isArray(rollingData[section])) {
      console.log(`  - Section ${section}: ${rollingData[section].length} players`);
      rollingData[section].forEach(player => {
        // Ensure player object has required properties
        if (!player || (!player.name && !player.Name) || (!player.team && !player.Team)) {
          return;
        }
        
        // Normalize player properties for consistent access
        const normalizedPlayer = {
          ...player,
          name: player.name || player.Name,
          team: player.team || player.Team,
          games: player.G || player.games || 0
        };
        
        // Merge data from different sections for the same player
        const existingPlayerIndex = allPlayers.findIndex(p => 
          p.name === normalizedPlayer.name && p.team === normalizedPlayer.team
        );
        
        if (existingPlayerIndex === -1) {
          allPlayers.push(normalizedPlayer);
        } else {
          // Merge data, preferring more complete data (e.g., from allPlayerStats)
          allPlayers[existingPlayerIndex] = {
            ...allPlayers[existingPlayerIndex],
            ...normalizedPlayer
          };
        }
      });
    }
  });
  
  console.log(`  Total unique players for ${propOption.key}: ${allPlayers.length}`);
  
  // Process each player with enhanced chart data (limit to top performers for efficiency)
  const limitedPlayers = allPlayers
    .filter(player => {
      const games = player.G || player.games || player.gamesPlayed || 0;
      const statValue = player[propOption.statKey] || 0;
      const isQualified = games >= ANALYSIS_THRESHOLDS.MIN_GAMES_PLAYED && statValue > 0;
      
      // Debug logging for first few players if none qualify
      if (allPlayers.indexOf(player) < 3) {
        console.log(`    DEBUG: ${player.name} (${player.team}) - games: ${games}, ${propOption.statKey}: ${statValue}, qualified: ${isQualified}`);
      }
      
      return isQualified;
    })
    .sort((a, b) => {
      const aGames = a.G || a.games || a.gamesPlayed || 1;
      const bGames = b.G || b.games || b.gamesPlayed || 1;
      const aRate = (a[propOption.statKey] || 0) / aGames;
      const bRate = (b[propOption.statKey] || 0) / bGames;
      return bRate - aRate; // Sort by rate descending
    })
    .slice(0, 100); // Limit to top 100 for performance
  
  console.log(`  Processing top ${limitedPlayers.length} players for ${propOption.key} with chart data...`);
  
  // Process players with chart data (async)
  const playersWithData = await Promise.all(limitedPlayers.map(async (player, index) => {
    console.log(`    Processing ${index + 1}/${limitedPlayers.length}: ${player.name} (${player.team})`);
    
    const propAnalysis = await calculatePropProbabilities(player, propOption, multiHitData);
    
    return {
      id: `${player.Name || player.name}-${player.Team || player.team}`,
      name: player.Name || player.name || 'Unknown',
      fullName: player.fullName || player.Name || player.name || 'Unknown',
      team: player.Team || player.team || 'UNK',
      ...propAnalysis,
      value: propAnalysis.seasonTotal, // Add explicit value field
      games: player.G || player.games || player.gamesPlayed || 0,
      avg: player.BA || player.avg || 0,
      rawPlayer: player
    };
  }));

  // Filter players with minimum games and sort by performance
  const qualifiedPlayers = playersWithData
    .filter(p => p && p.games > ANALYSIS_THRESHOLDS.MIN_GAMES_PLAYED)
    .filter(p => p.rate >= ANALYSIS_THRESHOLDS.MIN_SEASON_RATE) // Filter out extremely low performers
    .sort((a, b) => (b.rate || 0) - (a.rate || 0));
  
  console.log(`  Qualified players after filtering: ${qualifiedPlayers.length}`);
  return qualifiedPlayers;
}

/**
 * Generate team-specific player lists
 */
function generateTeamSpecificLists(allPlayersForProp) {
  const teamLists = {};
  
  // Group players by team
  allPlayersForProp.forEach(player => {
    if (!teamLists[player.team]) {
      teamLists[player.team] = [];
    }
    teamLists[player.team].push(player);
  });
  
  // Sort each team's players and take top performers
  Object.keys(teamLists).forEach(team => {
    teamLists[team] = teamLists[team]
      .sort((a, b) => (b.rate || 0) - (a.rate || 0))
      .slice(0, ANALYSIS_THRESHOLDS.PLAYERS_PER_TEAM);
  });
  
  return teamLists;
}

/**
 * Generate comprehensive prop analysis for all players and props
 */
async function generatePropAnalysis(targetDate = new Date()) {
  console.log(`🎯 Generating prop analysis for ${targetDate.toDateString()}`);
  const startTime = new Date();
  
  // Load required data
  console.log('📊 Loading data sources...');
  const rollingData = readJsonFile(ROLLING_STATS_PATH);
  const multiHitData = readJsonFile(MULTI_HIT_STATS_PATH);
  const rosterData = readJsonFile(ROSTER_PATH);
  
  if (!rollingData) {
    console.error('❌ Failed to load rolling stats data');
    return false;
  }
  
  console.log('✅ Rolling stats loaded');
  if (multiHitData) {
    console.log('✅ Multi-hit data loaded');
  } else {
    console.warn('⚠️ Multi-hit data not available, using basic calculations');
  }
  
  // Process all prop types (now async with enhanced chart data)
  const propAnalysisResults = {};
  
  for (const propOption of PROP_OPTIONS) {
    console.log(`\n🔄 Processing ${propOption.label} analysis with enhanced chart data...`);
    
    const allPlayersForProp = await processPlayerPropData(rollingData, multiHitData, propOption);
    
    // Generate overall top players list
    const topPlayers = allPlayersForProp.slice(0, ANALYSIS_THRESHOLDS.TOP_PLAYERS_ALL_TEAMS);
    
    // Generate team-specific lists
    const teamSpecificLists = generateTeamSpecificLists(allPlayersForProp);
    
    propAnalysisResults[propOption.key] = {
      propInfo: propOption,
      totalPlayers: allPlayersForProp.length,
      topPlayers,
      teamSpecificLists,
      lastUpdated: new Date().toISOString(),
      chartDataIncluded: true // NEW: Flag indicating chart data is available
    };
    
    console.log(`✅ ${propOption.label}: ${allPlayersForProp.length} total, ${topPlayers.length} top players, ${Object.keys(teamSpecificLists).length} teams`);
  }
  
  // Save individual files for each prop type
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  let allFilesSuccess = true;
  const writtenFiles = [];
  
  console.log(`\n💾 Writing individual prop analysis files...`);
  
  // Write individual prop files
  for (const propOption of PROP_OPTIONS) {
    const propKey = propOption.key;
    const propData = propAnalysisResults[propKey];
    
    if (!propData) {
      console.warn(`⚠️ No data generated for ${propKey}, skipping...`);
      continue;
    }
    
    // Create individual prop file data structure
    const individualPropData = {
      date: targetDate.toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      propType: propKey,
      propInfo: propOption,
      analysisConfig: ANALYSIS_THRESHOLDS,
      totalPlayers: propData.totalPlayers,
      topPlayers: propData.topPlayers,
      teamSpecificLists: propData.teamSpecificLists,
      lastUpdated: propData.lastUpdated,
      chartDataIncluded: propData.chartDataIncluded,
      dataSourcesUsed: {
        rollingStats: !!rollingData,
        multiHitStats: !!multiHitData,
        rosterData: !!rosterData
      }
    };
    
    // Write date-specific file for this prop
    const propOutputFileName = `${propKey}_analysis_${dateStr}.json`;
    const propOutputPath = path.join(OUTPUT_DIR, propOutputFileName);
    
    console.log(`  📊 Writing ${propOption.label} analysis to ${propOutputFileName}...`);
    const propSuccess = writeJsonFile(propOutputPath, individualPropData);
    
    if (propSuccess) {
      writtenFiles.push(propOutputFileName);
      
      // Also write to latest file for this prop
      const propLatestPath = path.join(OUTPUT_DIR, `${propKey}_analysis_latest.json`);
      writeJsonFile(propLatestPath, individualPropData);
      writtenFiles.push(`${propKey}_analysis_latest.json`);
    } else {
      allFilesSuccess = false;
      console.error(`❌ Failed to write ${propKey} analysis file`);
    }
  }
  
  // DISABLED: Combined file generation (causes ~80MB files, GitHub issues)
  // Also create a combined file for backward compatibility (optional)
  /*
  const combinedOutputData = {
    date: targetDate.toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    propOptions: PROP_OPTIONS,
    analysisConfig: ANALYSIS_THRESHOLDS,
    propAnalysis: propAnalysisResults,
    dataSourcesUsed: {
      rollingStats: !!rollingData,
      multiHitStats: !!multiHitData,
      rosterData: !!rosterData
    },
    note: "This combined file is deprecated. Use individual prop files for better performance."
  };
  
  const combinedOutputFileName = `prop_analysis_combined_${dateStr}.json`;
  const combinedOutputPath = path.join(OUTPUT_DIR, combinedOutputFileName);
  
  console.log(`  📦 Writing combined file for backward compatibility...`);
  const combinedSuccess = writeJsonFile(combinedOutputPath, combinedOutputData);
  
  if (combinedSuccess) {
    writtenFiles.push(combinedOutputFileName);
    const combinedLatestPath = path.join(OUTPUT_DIR, 'prop_analysis_combined_latest.json');
    writeJsonFile(combinedLatestPath, combinedOutputData);
    writtenFiles.push('prop_analysis_combined_latest.json');
  }
  */
  
  // Skip combined file generation - using individual prop files only
  const combinedSuccess = false;
  
  const success = allFilesSuccess;
  
  const endTime = new Date();
  const analysisTime = ((endTime - startTime) / 1000).toFixed(1);
  
  if (success) {
    console.log(`\n✅ Prop analysis generation completed successfully!`);
    console.log(`⏱️ Total time: ${analysisTime}s`);
    console.log(`📊 Analyzed ${PROP_OPTIONS.length} prop types`);
    console.log(`📁 Generated ${writtenFiles.length} files (${PROP_OPTIONS.length * 2} prop files + ${combinedSuccess ? 2 : 0} combined files)`);
    
    // Log summary for each prop type
    PROP_OPTIONS.forEach(prop => {
      const analysis = propAnalysisResults[prop.key];
      if (analysis) {
        console.log(`   ${prop.icon} ${prop.label}: ${analysis.totalPlayers} players, ${Object.keys(analysis.teamSpecificLists).length} teams`);
        console.log(`      📄 Files: ${prop.key}_analysis_${dateStr}.json, ${prop.key}_analysis_latest.json`);
      }
    });
    
    console.log(`\n🎯 Individual prop files ready for enhanced PlayerPropsLadderCard component`);
    console.log(`📁 Prop files directory: ${OUTPUT_DIR}/`);
    console.log(`💡 Expected file size reduction: ~80% (from ${Math.round(80)} MB to ~${Math.round(16)} MB per prop)`);
    
    if (combinedSuccess) {
      console.log(`📦 Backward compatibility file: prop_analysis_combined_latest.json`);
    }
  }
  
  return success;
}

// Export for use in other modules
module.exports = {
  generatePropAnalysis,
  processPlayerPropData,
  calculatePropProbabilities,
  calculateBasicStrategicFactors,
  getSectionsForProp,
  PROP_OPTIONS
};

// Run if called directly
if (require.main === module) {
  generatePropAnalysis()
    .then(success => {
      if (success) {
        console.log('✅ Prop analysis generated successfully');
        process.exit(0);
      } else {
        console.error('❌ Failed to generate prop analysis');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Error generating prop analysis:', error);
      process.exit(1);
    });
}