/**
 * generateAdditionalStats.js
 * 
 * This script generates additional statistics for the MLB dashboard:
 * 1. Day of Week Hit Leaders - Players who perform best on specific days of the week
 * 2. Hit Streak Analysis - Players with hitting streaks and predictions
 * 
 * Run this script daily to update the statistics.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROSTER_PATH = path.join(__dirname, '../../public/data/rosters.json');
const SEASON_DATA_DIR = path.join(__dirname, '../../public/data/2025');
const OUTPUT_DIR = path.join(__dirname, '../../public/data/predictions');

/**
 * Read JSON file
 */
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

/**
 * Write JSON file
 */
function writeJsonFile(filePath, data) {
  try {
    // Create directory if it doesn't exist
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
 * Load all season data
 */
function loadAllSeasonData() {
  console.log('[loadAllSeasonData] Loading season data...');
  const seasonData = {};

  if (!fs.existsSync(SEASON_DATA_DIR)) {
    console.error(`[loadAllSeasonData] CRITICAL: SEASON_DATA_DIR does not exist: ${SEASON_DATA_DIR}`);
    return seasonData; // Return empty object
  }

  const monthDirs = fs.readdirSync(SEASON_DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`[loadAllSeasonData] Found month directories: ${monthDirs.join(', ')}`);

  monthDirs.forEach(monthDirName => {
    const monthDirPath = path.join(SEASON_DATA_DIR, monthDirName);
    const files = fs.readdirSync(monthDirPath)
      .filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(monthDirPath, file);
      const data = readJsonFile(filePath);
      
      if (data) {
        const parts = file.replace('.json', '').split('_');
        if (parts.length === 3) {
          const fileMonthName = parts[0];
          const day = parts[1].padStart(2, '0');
          const year = parts[2];
          
          const date = new Date(`${fileMonthName} 1, ${year}`); // Use file's month name
          if (isNaN(date.getTime())) {
            console.warn(`[loadAllSeasonData] Could not parse date from filename: ${file} (Month: ${fileMonthName})`);
            continue;
          }
          const monthNum = date.getMonth() + 1;
          const monthNumStr = String(monthNum).padStart(2, '0');
          
          const dateKey = `${year}-${monthNumStr}-${day}`;
          seasonData[dateKey] = data;
        } else {
            console.warn(`[loadAllSeasonData] Filename ${file} does not match expected format monthname_DD_YYYY.json`);
        }
      }
    }
  });

  console.log(`[loadAllSeasonData] Loaded data for ${Object.keys(seasonData).length} dates`);
  return seasonData;
}


/**
 * Generate player performance data including recent home runs
 */
async function generatePlayerPerformance(targetDate = new Date()) {
  console.log(`[generatePlayerPerformance] Generating player performance data for ${targetDate.toDateString()}`);
  
  // Load roster data
  console.log('[generatePlayerPerformance] Loading roster data...');
  const rosterData = readJsonFile(ROSTER_PATH);
  if (!rosterData) {
    console.error('[generatePlayerPerformance] Failed to load roster data');
    return false;
  }
  
  // Load all season data
  console.log('[generatePlayerPerformance] Loading all season data...');
  const seasonData = loadAllSeasonData();
  
  console.log('[generatePlayerPerformance] Analyzing player performance...');
  
  // Create a map to store player data
  const playerMap = new Map();
  
  // Get all dates and sort them chronologically
  const allDates = Object.keys(seasonData).sort();
  
  // Process each game date to build player stats
  allDates.forEach(dateKey => {
    const gameData = seasonData[dateKey];
    const gameDate = new Date(dateKey);
    
    if (gameData.players) {
      gameData.players.forEach(player => {
        // Only process hitters
        if (player.playerType === 'hitter' || !player.playerType) {
          const playerKey = `${player.name}_${player.team}`;
          
          if (!playerMap.has(playerKey)) {
            playerMap.set(playerKey, {
              name: player.name,
              fullName: player.fullName || player.name,
              team: player.team,
              homeRunsThisSeason: 0,
              gamesPlayed: 0,
              lastHRDate: null,
              daysSinceLastHR: 0,
              historicalHRRate: 0.05, // Default value
              actualHRRate: 0,
              expectedHRs: 0,
              performanceIndicator: 0,
              status: "neutral"
            });
          }
          
          const playerData = playerMap.get(playerKey);
          
          // Skip DNP entries
          if (player.H === 'DNP') {
            return;
          }
          
          // Update games played
          playerData.gamesPlayed++;
          
          // Check for home runs in this game
          const homeRuns = Number(player.HR) || 0;
          if (homeRuns > 0) {
            playerData.homeRunsThisSeason += homeRuns;
            playerData.lastHRDate = dateKey;
            
            // Calculate days since last HR (for display purposes)
            const timeDiff = targetDate.getTime() - gameDate.getTime();
            playerData.daysSinceLastHR = Math.floor(timeDiff / (1000 * 3600 * 24));
          }
        }
      });
    }
  });
  
  // Calculate additional statistics for each player
  playerMap.forEach(player => {
    if (player.gamesPlayed > 0) {
      player.actualHRRate = player.homeRunsThisSeason / player.gamesPlayed;
      player.expectedHRs = player.historicalHRRate * player.gamesPlayed;
      
      // Performance indicator (how far above/below expected)
      if (player.expectedHRs > 0) {
        const difference = player.homeRunsThisSeason - player.expectedHRs;
        player.performanceIndicator = (difference / player.expectedHRs) * 100;
        
        if (player.performanceIndicator > 10) {
          player.status = "over-performing";
        } else if (player.performanceIndicator < -10) {
          player.status = "under-performing";
        }
      }
    }
  });
  
  // Convert map to array and sort as needed
  const players = Array.from(playerMap.values())
    .filter(player => player.gamesPlayed > 0);
  
  // Sort players with most recent home runs first
  const recentHRs = [...players]
    .filter(player => player.lastHRDate)
    .sort((a, b) => {
      // Primary sort by date (most recent first)
      const dateA = new Date(a.lastHRDate);
      const dateB = new Date(b.lastHRDate);
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      
      // Secondary sort by total HRs
      return b.homeRunsThisSeason - a.homeRunsThisSeason;
    });
  
  // Prepare output data
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    players: players,
    recentHRs: recentHRs.slice(0, 50) // Keep top 50 most recent
  };
  
  // Write the output file
  const outputPath = path.join(OUTPUT_DIR, 'player_performance_latest.json');
  
  console.log(`[generatePlayerPerformance] Writing player performance data to ${outputPath}...`);
  const success = writeJsonFile(outputPath, outputData);
  
  console.log('[generatePlayerPerformance] Player performance data generation complete!');
  return success;
}

/**
 * Generate day of week hit leaders
 * Finds players who perform best on specific days of the week
 */
async function generateDayOfWeekHitLeaders(targetDate = new Date()) {
  console.log(`[generateDayOfWeekHitLeaders] Generating day of week hit leaders for ${targetDate.toDateString()}`);
  
  // Load roster data
  console.log('[generateDayOfWeekHitLeaders] Loading roster data...');
  const rosterData = readJsonFile(ROSTER_PATH);
  if (!rosterData) {
    console.error('[generateDayOfWeekHitLeaders] Failed to load roster data');
    return false;
  }
  
  // Load all season data
  console.log('[generateDayOfWeekHitLeaders] Loading all season data...');
  const seasonData = loadAllSeasonData();
  
  // Get target day of week
  const targetDayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDayName = dayNames[targetDayOfWeek];
  
  console.log(`[generateDayOfWeekHitLeaders] Analyzing hits for ${targetDayName}...`);
  
  // Create a map to store hits by player for the target day of week
  const playerHitsMap = new Map();
  
  // Process all game data
  Object.keys(seasonData).forEach(dateKey => {
    const date = new Date(dateKey);
    const dayOfWeek = date.getDay();
    
    // Only process data for the target day of week
    if (dayOfWeek === targetDayOfWeek) {
      const gameData = seasonData[dateKey];
      
      if (gameData.players) {
        gameData.players.forEach(player => {
          // Only process hitters
          if (player.playerType === 'hitter' || !player.playerType) {
            const playerKey = `${player.name}_${player.team}`;
            const hits = player.H === 'DNP' ? 0 : (Number(player.H) || 0);
            
            if (!playerHitsMap.has(playerKey)) {
              playerHitsMap.set(playerKey, {
                name: player.name,
                team: player.team,
                hits: 0,
                games: 0,
                dates: []
              });
            }
            
            const playerRecord = playerHitsMap.get(playerKey);
            playerRecord.hits += hits;
            playerRecord.games += player.H === 'DNP' ? 0 : 1;
            if (hits > 0) {
              playerRecord.dates.push(dateKey);
            }
          }
        });
      }
    }
  });
  
  // Convert map to array and sort by hits
  let playerHits = Array.from(playerHitsMap.values())
    .filter(player => player.games > 0) // Only include players who have played on this day
    .sort((a, b) => b.hits - a.hits);
  
  // Add hit rate (hits per game)
  playerHits = playerHits.map(player => ({
    ...player,
    hitRate: player.games > 0 ? player.hits / player.games : 0
  }));
  
  // Get top players by total hits
  const topHitsByTotal = playerHits.slice(0, 20);
  
  // Get top players by hit rate (minimum 3 games)
  const topHitsByRate = playerHits
    .filter(player => player.games >= 3)
    .sort((a, b) => b.hitRate - a.hitRate)
    .slice(0, 20);
  
  // Prepare the output data
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    dayOfWeek: targetDayName,
    dayOfWeekIndex: targetDayOfWeek,
    topHitsByTotal: topHitsByTotal,
    topHitsByRate: topHitsByRate
  };
  
  // Write the output file
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const outputFileName = `day_of_week_hits_${year}-${month}-${day}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  console.log(`[generateDayOfWeekHitLeaders] Writing day of week hit leaders to ${outputPath}...`);
  const success = writeJsonFile(outputPath, outputData);
  
  // Also write to latest.json for easy access
  if (success) {
    const latestPath = path.join(OUTPUT_DIR, 'day_of_week_hits_latest.json');
    writeJsonFile(latestPath, outputData);
  }
  
  console.log('[generateDayOfWeekHitLeaders] Day of week hit leaders generation complete!');
  return success;
}

/**
 * Generate hit streak analysis
 * Analyzes player hitting streaks and predicts continuation
 */
async function generateHitStreakAnalysis(targetDate = new Date()) {
  console.log(`[generateHitStreakAnalysis] Generating hit streak analysis for ${targetDate.toDateString()}`);
  
  // Load roster data
  console.log('[generateHitStreakAnalysis] Loading roster data...');
  const rosterData = readJsonFile(ROSTER_PATH);
  if (!rosterData) {
    console.error('[generateHitStreakAnalysis] Failed to load roster data');
    return false;
  }
  
  // Load all season data
  console.log('[generateHitStreakAnalysis] Loading all season data...');
  const seasonData = loadAllSeasonData();
  
  console.log('[generateHitStreakAnalysis] Analyzing hitting streaks...');
  
  // Create a map to track each player's game history
  const playerGameHistoryMap = new Map();
  
  // Get all dates and sort them chronologically
  const allDates = Object.keys(seasonData).sort();
  
  // Process each game date to build player histories
  allDates.forEach(dateKey => {
    const gameData = seasonData[dateKey];
    
    if (gameData.players) {
      gameData.players.forEach(player => {
        // Only process hitters
        if (player.playerType === 'hitter' || !player.playerType) {
          const playerKey = `${player.name}_${player.team}`;
          
          if (!playerGameHistoryMap.has(playerKey)) {
            playerGameHistoryMap.set(playerKey, {
              name: player.name,
              team: player.team,
              games: []
            });
          }
          
          const playerHistory = playerGameHistoryMap.get(playerKey);
          const hadHit = player.H !== 'DNP' && Number(player.H) > 0;
          const didPlay = player.H !== 'DNP';
          
          if (didPlay) {
            playerHistory.games.push({
              date: dateKey,
              hadHit: hadHit,
              hits: player.H === 'DNP' ? 0 : Number(player.H) || 0
            });
          }
        }
      });
    }
  });
  
  // Calculate streak statistics for each player
  const playerStreakStats = [];
  
  playerGameHistoryMap.forEach((playerHistory, playerKey) => {
    const { name, team, games } = playerHistory;
    
    // Skip players with few games
    if (games.length < 5) {
      return;
    }
    
    // Calculate current streak
    let currentStreak = 0;
    let currentNoHitStreak = 0;
    
    // Start from the most recent game
    for (let i = games.length - 1; i >= 0; i--) {
      if (games[i].hadHit) {
        if (currentStreak >= 0) {
          currentStreak++;
        } else {
          break; // End of current no-hit streak
        }
      } else {
        if (currentStreak > 0) {
          break; // End of current hit streak
        } else {
          currentNoHitStreak++;
          currentStreak = -currentNoHitStreak; // Represent no-hit streak as negative
        }
      }
    }
    
    // Analyze historical streak patterns
    const hitStreakLengths = [];
    const noHitStreakLengths = [];
    let streak = 0;
    
    // Track all streaks chronologically to analyze progression
    const allStreaks = [];
    
    for (let i = 0; i < games.length; i++) {
      if (games[i].hadHit) {
        if (streak < 0) {
          // End of a no-hit streak
          noHitStreakLengths.push(-streak);
          // Record the no-hit streak
          allStreaks.push({
            type: 'no-hit',
            length: -streak,
            endDate: games[i].date
          });
          streak = 1;
        } else {
          streak++;
        }
      } else {
        if (streak > 0) {
          // End of a hit streak
          hitStreakLengths.push(streak);
          // Record the hit streak
          allStreaks.push({
            type: 'hit',
            length: streak,
            endDate: games[i].date
          });
          streak = -1;
        } else {
          streak--;
        }
      }
      
      // Handle the last streak if we're at the end of games
      if (i === games.length - 1) {
        if (streak > 0) {
          hitStreakLengths.push(streak);
          // Record the ongoing hit streak
          allStreaks.push({
            type: 'hit',
            length: streak,
            endDate: games[i].date,
            ongoing: true
          });
        } else if (streak < 0) {
          noHitStreakLengths.push(-streak);
          // Record the ongoing no-hit streak
          allStreaks.push({
            type: 'no-hit',
            length: -streak,
            endDate: games[i].date,
            ongoing: true
          });
        }
      }
    }
    
    // Calculate average streak lengths
    const avgHitStreakLength = hitStreakLengths.length > 0 ? 
      hitStreakLengths.reduce((sum, length) => sum + length, 0) / hitStreakLengths.length : 0;
    
    const avgNoHitStreakLength = noHitStreakLengths.length > 0 ? 
      noHitStreakLengths.reduce((sum, length) => sum + length, 0) / noHitStreakLengths.length : 0;
    
    // Calculate longest streaks
    const longestHitStreak = hitStreakLengths.length > 0 ? Math.max(...hitStreakLengths) : 0;
    const longestNoHitStreak = noHitStreakLengths.length > 0 ? Math.max(...noHitStreakLengths) : 0;
    
    // Calculate frequency distributions
    const hitStreakFrequency = {};
    hitStreakLengths.forEach(length => {
      hitStreakFrequency[length] = (hitStreakFrequency[length] || 0) + 1;
    });
    
    const noHitStreakFrequency = {};
    noHitStreakLengths.forEach(length => {
      noHitStreakFrequency[length] = (noHitStreakFrequency[length] || 0) + 1;
    });
    
    // Calculate detailed streak progression statistics
    // For each streak length, calculate how often it continues vs. ends
    const hitStreakProgression = {};
    const noHitStreakProgression = {};
    
    // Initialize progression stats for all lengths up to the longest streak
    for (let i = 1; i <= longestHitStreak; i++) {
      hitStreakProgression[i] = {
        occurrences: 0,     // Total times player had exactly this streak length
        continued: 0,       // Times it continued to a longer streak
        ended: 0,           // Times it ended at this length
        continuationRate: 0, // Percentage of times it continued
        nextGameHitRate: 0  // Percentage of times the player got a hit in the next game
      };
    }
    
    for (let i = 1; i <= longestNoHitStreak; i++) {
      noHitStreakProgression[i] = {
        occurrences: 0,
        continued: 0,
        ended: 0,
        continuationRate: 0,
        nextGameHitRate: 0
      };
    }
    
    // Analyze hits in streaks chronologically
    const streaksMap = new Map(); // Temporary map to track in-progress streaks
    
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      
      // Find the current state - in a hit streak, no-hit streak, or neutral
      let currentStreakType = 'neutral';
      let currentStreakLength = 0;
      
      if (i > 0) {
        // Look back to determine current streak
        let backIndex = i - 1;
        let streakCount = 0;
        
        if (games[backIndex].hadHit) {
          // Check for hit streak
          while (backIndex >= 0 && games[backIndex].hadHit) {
            streakCount++;
            backIndex--;
          }
          if (streakCount > 0) {
            currentStreakType = 'hit';
            currentStreakLength = streakCount;
          }
        } else {
          // Check for no-hit streak
          while (backIndex >= 0 && !games[backIndex].hadHit) {
            streakCount++;
            backIndex--;
          }
          if (streakCount > 0) {
            currentStreakType = 'no-hit';
            currentStreakLength = streakCount;
          }
        }
      }
      
      // Update progression stats based on current game result
      if (currentStreakType === 'hit' && currentStreakLength > 0) {
        if (currentStreakLength <= longestHitStreak) {
          // Count the occurrence of this streak length
          hitStreakProgression[currentStreakLength].occurrences++;
          
          // Check if the streak continued or ended
          if (game.hadHit) {
            hitStreakProgression[currentStreakLength].continued++;
          } else {
            hitStreakProgression[currentStreakLength].ended++;
          }
        }
      } else if (currentStreakType === 'no-hit' && currentStreakLength > 0) {
        if (currentStreakLength <= longestNoHitStreak) {
          // Count the occurrence of this streak length
          noHitStreakProgression[currentStreakLength].occurrences++;
          
          // Check if the streak continued or ended
          if (!game.hadHit) {
            noHitStreakProgression[currentStreakLength].continued++;
          } else {
            noHitStreakProgression[currentStreakLength].ended++;
          }
        }
      }
    }
    
    // Calculate continuation rates
    for (let i = 1; i <= longestHitStreak; i++) {
      const stats = hitStreakProgression[i];
      if (stats.occurrences > 0) {
        stats.continuationRate = stats.continued / stats.occurrences;
        stats.nextGameHitRate = stats.continued / stats.occurrences;
      }
    }
    
    for (let i = 1; i <= longestNoHitStreak; i++) {
      const stats = noHitStreakProgression[i];
      if (stats.occurrences > 0) {
        stats.continuationRate = stats.continued / stats.occurrences;
        stats.nextGameHitRate = stats.ended / stats.occurrences; // For no-hit, next game hit = streak ended
      }
    }
    
    // Calculate overall continuation probability for current streak
    let continuationProbability = 0.5; // Default to 50% if we can't calculate
    
    if (currentStreak > 0) {
      // Player is on a hit streak
      // Try to use the specific streak length probability
      if (hitStreakProgression[currentStreak] && hitStreakProgression[currentStreak].occurrences > 0) {
        continuationProbability = hitStreakProgression[currentStreak].continuationRate;
      } else {
        // Fall back to general calculation
        const sameOrLongerStreaks = hitStreakLengths.filter(length => length >= currentStreak).length;
        const continuedStreaks = hitStreakLengths.filter(length => length > currentStreak).length;
        
        if (sameOrLongerStreaks > 0) {
          continuationProbability = continuedStreaks / sameOrLongerStreaks;
        }
      }
    } else if (currentStreak < 0) {
      // Player is on a no-hit streak
      const noHitStreak = -currentStreak;
      
      // Try to use the specific streak length probability
      if (noHitStreakProgression[noHitStreak] && noHitStreakProgression[noHitStreak].occurrences > 0) {
        continuationProbability = 1 - noHitStreakProgression[noHitStreak].nextGameHitRate;
      } else {
        // Fall back to general calculation
        const sameOrLongerStreaks = noHitStreakLengths.filter(length => length >= noHitStreak).length;
        const continuedStreaks = noHitStreakLengths.filter(length => length > noHitStreak).length;
        
        if (sameOrLongerStreaks > 0) {
          continuationProbability = continuedStreaks / sameOrLongerStreaks;
        }
      }
    }
    
    // Add full career progression stats
    const hitStreakProgressionArray = Object.entries(hitStreakProgression)
      .map(([length, stats]) => ({
        length: parseInt(length),
        ...stats
      }))
      .filter(item => item.occurrences > 0)
      .sort((a, b) => b.length - a.length);
    
    const noHitStreakProgressionArray = Object.entries(noHitStreakProgression)
      .map(([length, stats]) => ({
        length: parseInt(length),
        ...stats
      }))
      .filter(item => item.occurrences > 0)
      .sort((a, b) => b.length - a.length);
    
    // Add player to stats list
    playerStreakStats.push({
      name,
      team,
      totalGames: games.length,
      currentStreak,
      isHitStreak: currentStreak > 0,
      avgHitStreakLength,
      avgNoHitStreakLength,
      longestHitStreak,
      longestNoHitStreak,
      hitStreakFrequency,
      noHitStreakFrequency,
      hitStreakProgression: hitStreakProgressionArray,  // Add detailed progression stats
      noHitStreakProgression: noHitStreakProgressionArray,
      // Use specific streak length probability when available
      continuationProbability,
      streakEndProbability: 1 - continuationProbability,
      lastGameDate: games.length > 0 ? games[games.length - 1].date : null,
      lastGameHadHit: games.length > 0 ? games[games.length - 1].hadHit : false,
      recentPerformance: games.slice(-10).map(g => g.hadHit ? 1 : 0) // Last 10 games (1=hit, 0=no hit)
    });
  });
  
  // Sort players by streak length (absolute value)
  playerStreakStats.sort((a, b) => Math.abs(b.currentStreak) - Math.abs(a.currentStreak));
  
  // Get players with hit streaks
  const hitStreaks = playerStreakStats
    .filter(player => player.currentStreak > 0)
    .slice(0, 25);
  
  // Get players with no-hit streaks
  const noHitStreaks = playerStreakStats
    .filter(player => player.currentStreak < 0)
    .slice(0, 25);
  
  // Get players most likely to get a hit next game
  // Prioritize players on no-hit streaks who are likely to get a hit
  const likelyToGetHit = playerStreakStats
    .filter(player => player.currentStreak < 0)
    .sort((a, b) => b.streakEndProbability - a.streakEndProbability)
    .slice(0, 25);
  
  // Get players most likely to continue a hit streak
  const likelyToContinueStreak = playerStreakStats
    .filter(player => player.currentStreak > 0)
    .sort((a, b) => b.continuationProbability - a.continuationProbability)
    .slice(0, 25);
  
  // Prepare the output data
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    hitStreaks: hitStreaks,
    noHitStreaks: noHitStreaks,
    likelyToGetHit: likelyToGetHit,
    likelyToContinueStreak: likelyToContinueStreak
  };
  
  // Write the output file
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const outputFileName = `hit_streak_analysis_${year}-${month}-${day}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  console.log(`[generateHitStreakAnalysis] Writing hit streak analysis to ${outputPath}...`);
  const success = writeJsonFile(outputPath, outputData);
  
  // Also write to latest.json for easy access
  if (success) {
    const latestPath = path.join(OUTPUT_DIR, 'hit_streak_analysis_latest.json');
    writeJsonFile(latestPath, outputData);
  }
  
  console.log('[generateHitStreakAnalysis] Hit streak analysis generation complete!');
  return success;
}

/**
 * Generate all additional statistics
 */
async function generateAllAdditionalStats(targetDate = new Date()) {
  console.log(`Starting additional stats generation for ${targetDate.toDateString()}`);
  
  const dayOfWeekSuccess = await generateDayOfWeekHitLeaders(targetDate);
  if (!dayOfWeekSuccess) {
    console.error('Failed to generate day of week hit leaders');
  }
  
  const hitStreakSuccess = await generateHitStreakAnalysis(targetDate);
  if (!hitStreakSuccess) {
    console.error('Failed to generate hit streak analysis');
  }
  
  const playerPerformanceSuccess = await generatePlayerPerformance(targetDate);
  if (!playerPerformanceSuccess) {
    console.error('Failed to generate player performance data');
  }
  
  return dayOfWeekSuccess && hitStreakSuccess && playerPerformanceSuccess;
}
// Run the generator if this file is executed directly
if (require.main === module) {
  let targetDate = new Date();
  if (process.argv.length > 2) {
    const dateArg = process.argv[2]; 
    const parsedDate = new Date(dateArg);
    if (!isNaN(parsedDate.getTime())) {
        targetDate = parsedDate;
        // Ensure targetDate uses local timezone midnight, not UTC midnight from YYYY-MM-DD
        targetDate = new Date(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate());
    } else {
        console.warn(`Invalid date argument: ${dateArg}. Using today's date.`);
    }
  }
  
  generateAllAdditionalStats(targetDate)
    .then(success => {
      if (success) {
        console.log('Successfully generated all additional statistics.');
      } else {
        console.error('One or more additional statistic generation processes failed.');
      }
    })
    .catch(error => {
      console.error('Critical error during additional statistic generation:', error);
      process.exit(1);
    });
}

module.exports = { generateDayOfWeekHitLeaders, generateHitStreakAnalysis, generateAllAdditionalStats };