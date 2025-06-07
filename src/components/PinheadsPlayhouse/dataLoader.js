// dataLoader.js
// Data loading and aggregation module matching Python's data_loader.py

import { 
  cleanPlayerName, 
  matchPlayerNameToRoster, 
  getApproximatedPA,
  calculateMetricRanges,
  calculateLeagueAverages2025
} from './dataUtils';

// Load daily game data from JSON files
export const loadDailyGameData = async (dataPath = "/data/") => {
  const dailyData = {};
  
  // For React app, we'll need to adjust how we load these files
  // This assumes you have a way to list available files or know the date range
  try {
    // You'll need to implement a way to get available dates
    // For now, let's assume we're loading specific months
    const year = 2025;
    const months = ['april', 'may', 'june'];
    
    for (const month of months) {
      // This would need to be adjusted based on your actual file structure
      const response = await fetch(`${dataPath}${year}/${month}/games_data.json`);
      if (response.ok) {
        const monthData = await response.json();
        // Process each day in the month
        Object.entries(monthData).forEach(([date, data]) => {
          dailyData[date] = data;
        });
      }
    }
    
    console.log(`Successfully loaded daily data for ${Object.keys(dailyData).length} dates.`);
  } catch (error) {
    console.error("Error loading daily game data:", error);
  }
  
  return dailyData;
};

// Load multi-year historical data
export const loadMultiYearData = async (years, dataPath = "/data/") => {
  console.log("Loading Multi-Year Historical Data (CSVs)...");
  const historicalData = {};
  
  const relevantHistoricalYears = years.filter(y => y < 2025);
  
  for (const year of relevantHistoricalYears) {
    console.log(`Loading ${year} data...`);
    historicalData[year] = {};
    
    const historicalFileSpecs = [
      { key: 'hitter_arsenal', file: `hitterpitcharsenalstats_${year}.csv` },
      { key: 'pitcher_arsenal', file: `pitcherpitcharsenalstats_${year}.csv` }
    ];
    
    for (const spec of historicalFileSpecs) {
      try {
        const response = await fetch(`${dataPath}stats/${spec.file}`);
        if (response.ok) {
          const csvText = await response.text();
          const parsed = parseCSV(csvText);
          historicalData[year][spec.key] = parsed;
          console.log(`  Loaded ${year} ${spec.key} (${parsed.length} rows)`);
        }
      } catch (error) {
        console.warn(`  Warning: No data loaded for ${year} ${spec.key}`);
      }
    }
  }
  
  console.log("Multi-year historical data loading complete.");
  return historicalData;
};

// Parse CSV text to array of objects
const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      let value = values[index]?.trim();
      // Convert numeric values
      if (value && !isNaN(value)) {
        value = parseFloat(value);
      }
      row[header] = value;
    });
    data.push(row);
  }
  
  return data;
};

// Aggregate 2025 player stats from daily data
export const aggregate2025PlayerStatsFromDaily = (dailyData, rosterData, nameToIdMap, masterPlayerData) => {
  console.log("Aggregating 2025 Player Stats from Daily Files...");
  
  const player2025Agg = {};
  
  const sortedGameDates = Object.keys(dailyData).sort();
  
  for (const dateStr of sortedGameDates) {
    const dayData = dailyData[dateStr] || {};
    
    for (const playerDailyStat of (dayData.players || [])) {
      if (playerDailyStat.playerType !== 'hitter') {
        continue;
      }
      
      const dailyPlayerNameCleaned = cleanPlayerName(playerDailyStat.name);
      const matchedFullName = matchPlayerNameToRoster(dailyPlayerNameCleaned, rosterData);
      
      if (!matchedFullName) {
        continue;
      }
      
      const mlbamId = nameToIdMap[matchedFullName];
      if (!mlbamId) {
        continue;
      }
      
      if (!player2025Agg[mlbamId]) {
        player2025Agg[mlbamId] = {
          G: 0, AB: 0, R: 0, H: 0, HR: 0, BB: 0, K: 0, '2B': 0, '3B': 0,
          HBP: 0, SF: 0, SAC: 0, RBI: 0,
          last_HR_date: null, AB_at_last_HR: 0,
          current_AB_since_last_HR: 0, H_at_last_HR: 0, current_H_since_last_HR: 0,
          game_dates: []
        };
      }
      
      const pagg = player2025Agg[mlbamId];
      
      try {
        const ab = parseInt(playerDailyStat.AB || 0);
        const h = parseInt(playerDailyStat.H || 0);
        const hr = parseInt(playerDailyStat.HR || 0);
        const bb = parseInt(playerDailyStat.BB || 0);
        const k = parseInt(playerDailyStat.K || 0);
        const r = parseInt(playerDailyStat.R || 0);
        const rbi = parseInt(playerDailyStat.RBI || 0);
        const hbp = parseInt(playerDailyStat.HBP || 0);
        const sf = parseInt(playerDailyStat.SF || 0);
        const sac = parseInt(playerDailyStat.SAC || 0);
        const doubles = parseInt(playerDailyStat['2B'] || 0);
        const triples = parseInt(playerDailyStat['3B'] || 0);
        
        // Track game appearances
        if (!pagg.game_dates.includes(dateStr)) {
          pagg.G++;
          pagg.game_dates.push(dateStr);
        }
        
        // Save current totals before adding today's stats
        const currentTotalAbBeforeGame = pagg.AB;
        const currentTotalHBeforeGame = pagg.H;
        
        // Update basic stats
        pagg.AB += ab;
        pagg.H += h;
        pagg.BB += bb;
        pagg.K += k;
        pagg.R += r;
        pagg.RBI += rbi;
        pagg.HBP += hbp;
        pagg.SF += sf;
        pagg.SAC += sac;
        pagg['2B'] += doubles;
        pagg['3B'] += triples;
        
        // Handle HR tracking for "due for HR" calculations
        if (hr > 0) {
          pagg.HR += hr;
          pagg.last_HR_date = dateStr;
          pagg.current_AB_since_last_HR = 0;
          pagg.AB_at_last_HR = currentTotalAbBeforeGame + ab;
          pagg.current_H_since_last_HR = 0;
          pagg.H_at_last_HR = currentTotalHBeforeGame + h;
        } else if (pagg.last_HR_date !== null) {
          // Only track ABs since last HR if we've had a HR this season
          pagg.current_AB_since_last_HR += ab;
          pagg.current_H_since_last_HR += h;
        } else {
          // Track ABs for players who haven't hit a HR yet this season
          pagg.current_AB_since_last_HR += ab;
          pagg.current_H_since_last_HR += h;
        }
      } catch (error) {
        console.error(`Error processing stats for player ${mlbamId} on ${dateStr}:`, error);
      }
    }
  }
  
  // Add aggregated stats to master data
  for (const [pid, astats] of Object.entries(player2025Agg)) {
    if (masterPlayerData[pid]) {
      astats.PA_approx = getApproximatedPA(astats);
      masterPlayerData[pid].stats_2025_aggregated = astats;
    }
  }
  
  console.log(`Aggregated 2025 stats for ${Object.keys(player2025Agg).length} players.`);
};

// Build player ID mapping from reference files
export const buildPlayerIdMapping = async (dataPath = "/data/") => {
  const playerIdToNameMap = {};
  const nameToPlayerIdMap = {};
  
  console.log("Building Master Player ID Map from reference CSVs...");
  
  const referenceFiles = [
    { file: "hitter_exit_velocity_2025.csv", idCols: ['player_id'], nameCols: ['last_name, first_name', 'name'] },
    { file: "pitcher_exit_velocity_2025.csv", idCols: ['player_id'], nameCols: ['last_name, first_name', 'name'] },
    { file: "hitterpitcharsenalstats_2025.csv", idCols: ['player_id'], nameCols: ['name', 'last_name, first_name'] },
    { file: "pitcherpitcharsenalstats_2025.csv", idCols: ['player_id'], nameCols: ['name', 'last_name, first_name'] }
  ];
  
  for (const spec of referenceFiles) {
    try {
      const response = await fetch(`${dataPath}stats/${spec.file}`);
      if (response.ok) {
        const csvText = await response.text();
        const rows = parseCSV(csvText);
        
        for (const row of rows) {
          // Find ID column
          let mlbamId = null;
          for (const idCol of spec.idCols) {
            if (row[idCol]) {
              mlbamId = String(row[idCol]);
              break;
            }
          }
          
          // Find name column
          let cleanedFullName = null;
          for (const nameCol of spec.nameCols) {
            if (row[nameCol]) {
              cleanedFullName = cleanPlayerName(row[nameCol]);
              break;
            }
          }
          
          if (mlbamId && cleanedFullName) {
            if (!playerIdToNameMap[mlbamId]) {
              playerIdToNameMap[mlbamId] = cleanedFullName;
            }
            if (!nameToPlayerIdMap[cleanedFullName]) {
              nameToPlayerIdMap[cleanedFullName] = mlbamId;
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Error loading reference file ${spec.file}:`, error);
    }
  }
  
  console.log(`Built ID Map: ${Object.keys(nameToPlayerIdMap).length} name->ID entries`);
  
  return { playerIdToNameMap, nameToPlayerIdMap };
};

// Load and process roster data
export const loadAndProcessRosterData = async (dataPath = "/data/") => {
  try {
    const response = await fetch(`${dataPath}rosters.json`);
    if (!response.ok) {
      throw new Error("Failed to load roster data");
    }
    
    const rostersListRaw = await response.json();
    
    // Clean player names in roster data
    for (const entry of rostersListRaw) {
      entry.fullName_cleaned = cleanPlayerName(entry.fullName);
      entry.name_cleaned = cleanPlayerName(entry.name);
    }
    
    return rostersListRaw;
  } catch (error) {
    console.error("Error loading roster data:", error);
    return [];
  }
};

// Initialize master player data structure
export const initializeMasterPlayerData = (
  rostersListRaw, 
  playerIdToNameMap, 
  nameToPlayerIdMap
) => {
  const masterPlayerData = {};
  let unmappedRosterPlayersCount = 0;
  
  for (const playerInfoRoster of rostersListRaw) {
    const fullNameFromRosterCleaned = playerInfoRoster.fullName_cleaned;
    const shortNameFromRosterCleaned = playerInfoRoster.name_cleaned;
    
    // Try to get ID from roster
    let mlbamIdFromRosterField = null;
    if (playerInfoRoster.id && !isNaN(playerInfoRoster.id)) {
      mlbamIdFromRosterField = String(parseInt(playerInfoRoster.id));
    }
    
    let resolvedMlbamId = null;
    let resolvedNameForMap = fullNameFromRosterCleaned;
    
    if (mlbamIdFromRosterField) {
      resolvedMlbamId = mlbamIdFromRosterField;
      if (playerIdToNameMap[resolvedMlbamId]) {
        resolvedNameForMap = playerIdToNameMap[resolvedMlbamId];
      }
    } else if (fullNameFromRosterCleaned && nameToPlayerIdMap[fullNameFromRosterCleaned]) {
      resolvedMlbamId = nameToPlayerIdMap[fullNameFromRosterCleaned];
    } else if (shortNameFromRosterCleaned && nameToPlayerIdMap[shortNameFromRosterCleaned]) {
      resolvedMlbamId = nameToPlayerIdMap[shortNameFromRosterCleaned];
      resolvedNameForMap = shortNameFromRosterCleaned;
    }
    
    if (!resolvedMlbamId && mlbamIdFromRosterField) {
      resolvedMlbamId = mlbamIdFromRosterField;
    }
    
    if (!resolvedNameForMap && resolvedMlbamId && playerIdToNameMap[resolvedMlbamId]) {
      resolvedNameForMap = playerIdToNameMap[resolvedMlbamId];
    }
    
    if (resolvedMlbamId) {
      const finalNameForMaps = fullNameFromRosterCleaned || resolvedNameForMap;
      
      if (finalNameForMaps) {
        nameToPlayerIdMap[finalNameForMaps] = resolvedMlbamId;
        playerIdToNameMap[resolvedMlbamId] = finalNameForMaps;
        
        if (shortNameFromRosterCleaned && shortNameFromRosterCleaned !== finalNameForMaps) {
          nameToPlayerIdMap[shortNameFromRosterCleaned] = resolvedMlbamId;
        }
      }
      
      if (!masterPlayerData[resolvedMlbamId]) {
        masterPlayerData[resolvedMlbamId] = {};
      }
      
      masterPlayerData[resolvedMlbamId].roster_info = {
        ...playerInfoRoster,
        mlbam_id_resolved: resolvedMlbamId,
        fullName_resolved: finalNameForMaps
      };
      
      // Add 2024 stats from roster data if available
      const raw2024Stats = playerInfoRoster.stats || {};
      if (Object.keys(raw2024Stats).length > 0) {
        const parsed2024Stats = {};
        for (const [k, v] of Object.entries(raw2024Stats)) {
          if (k.includes('2024_')) {
            parsed2024Stats[k.replace('2024_', '')] = v;
          }
        }
        parsed2024Stats.PA_approx = getApproximatedPA(parsed2024Stats);
        
        // Calculate hits per HR
        const h2024 = parsed2024Stats.H || 0;
        const hr2024Stat = parsed2024Stats.HR || 0;
        parsed2024Stats.H_per_HR = hr2024Stat > 0 ? h2024 / hr2024Stat : null;
        
        masterPlayerData[resolvedMlbamId].stats_2024 = parsed2024Stats;
      }
    } else {
      unmappedRosterPlayersCount++;
    }
  }
  
  console.log(`Created/Updated entries for ${Object.keys(masterPlayerData).length} players. ${unmappedRosterPlayersCount} unmapped.`);
  
  return masterPlayerData;
};

// Load detailed statistics from CSVs
export const loadDetailedStats = async (masterPlayerData, dataPath = "/data/") => {
  const battedBallSpecs = {
    "bbb_LHB_vs_LHP": "batters-batted-ball-bat-left-pitch-hand-left-2025.csv",
    "bbb_LHB_vs_RHP": "batters-batted-ball-bat-left-pitch-hand-right-2025.csv",
    "bbb_RHB_vs_LHP": "batters-batted-ball-bat-right-pitch-hand-left-2025.csv",
    "bbb_RHB_vs_RHP": "batters-batted-ball-bat-right-pitch-hand-right-2025.csv"
  };
  
  const otherDetailedSpecs = {
    "hitter_overall_ev_stats": "hitter_exit_velocity_2025.csv",
    "pitcher_overall_ev_stats": "pitcher_exit_velocity_2025.csv",
    "hitter_pitch_arsenal_stats": "hitterpitcharsenalstats_2025.csv",
    "pitcher_pitch_arsenal_stats": "pitcherpitcharsenalstats_2025.csv"
  };
  
  const allSpecs = { ...battedBallSpecs, ...otherDetailedSpecs };
  
  console.log("Merging Detailed 2025 CSV Stats into Master Player Data...");
  
  for (const [dataKey, fileName] of Object.entries(allSpecs)) {
    try {
      const response = await fetch(`${dataPath}stats/${fileName}`);
      if (!response.ok) {
        console.log(`Skipping ${dataKey} (${fileName}), not found.`);
        continue;
      }
      
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      
      if (rows.length === 0 || !rows[0].mlbam_id) {
        console.log(`Skipping ${dataKey} (${fileName}), empty or no mlbam_id.`);
        continue;
      }
      
      const isMultiIndexedByPitchType = rows[0].pitch_type !== undefined;
      let mergedRecordsCount = 0;
      
      // Group rows by player ID
      const playerRows = {};
      for (const row of rows) {
        const mlbamId = String(row.mlbam_id);
        if (!playerRows[mlbamId]) {
          playerRows[mlbamId] = [];
        }
        playerRows[mlbamId].push(row);
      }
      
      // Process each player
      for (const [mlbamId, playerRowList] of Object.entries(playerRows)) {
        if (!masterPlayerData[mlbamId]) {
          continue;
        }
        
        const playerEntry = masterPlayerData[mlbamId];
        
        if (dataKey.startsWith("bbb_")) {
          const battedBallSuffix = dataKey.split("bbb_")[1];
          if (!playerEntry.batted_ball_stats) {
            playerEntry.batted_ball_stats = {};
          }
          
          if (isMultiIndexedByPitchType) {
            playerEntry.batted_ball_stats[battedBallSuffix] = {};
            for (const row of playerRowList) {
              playerEntry.batted_ball_stats[battedBallSuffix][row.pitch_type] = row;
            }
          } else {
            playerEntry.batted_ball_stats[battedBallSuffix] = playerRowList[0];
          }
        } else if (isMultiIndexedByPitchType) {
          playerEntry[dataKey] = {};
          for (const row of playerRowList) {
            playerEntry[dataKey][row.pitch_type] = row;
          }
        } else {
          playerEntry[dataKey] = playerRowList[0];
        }
        
        mergedRecordsCount++;
      }
      
      console.log(`Processed ${dataKey} (${fileName}): merged data for ${mergedRecordsCount} players.`);
    } catch (error) {
      console.error(`Error loading ${fileName}:`, error);
    }
  }
  
  // Extract pitch usage stats for pitchers
  for (const [pid, pdataEntry] of Object.entries(masterPlayerData)) {
    if (pdataEntry.roster_info?.type === 'pitcher' && pdataEntry.pitcher_pitch_arsenal_stats) {
      pdataEntry.pitch_usage_stats = {};
      for (const [ptype, stats] of Object.entries(pdataEntry.pitcher_pitch_arsenal_stats)) {
        if (stats && typeof stats === 'object' && stats.pitch_usage !== null && stats.pitch_usage !== undefined) {
          pdataEntry.pitch_usage_stats[ptype] = stats.pitch_usage;
        }
      }
    }
  }
};

// Main initialization function
export const initializeData = async (dataPath = "/data/", years = [2022, 2023, 2024, 2025]) => {
  console.log("=== Initializing Baseball Analysis System ===");
  
  try {
    // Load roster data
    const rostersListRaw = await loadAndProcessRosterData(dataPath);
    if (rostersListRaw.length === 0) {
      throw new Error("No roster data loaded");
    }
    
    // Build ID mappings
    const { playerIdToNameMap, nameToPlayerIdMap } = await buildPlayerIdMapping(dataPath);
    
    // Initialize master player data
    const masterPlayerData = initializeMasterPlayerData(
      rostersListRaw,
      playerIdToNameMap,
      nameToPlayerIdMap
    );
    
    // Load daily game data
    const dailyGameData = await loadDailyGameData(dataPath);
    
    // Aggregate 2025 stats from daily data
    aggregate2025PlayerStatsFromDaily(
      dailyGameData,
      rostersListRaw,
      nameToPlayerIdMap,
      masterPlayerData
    );
    
    // Load detailed statistics
    await loadDetailedStats(masterPlayerData, dataPath);
    
    // Calculate league averages
    const leagueAvgStats = calculateLeagueAverages2025(masterPlayerData);
    
    // Load multi-year historical data
    const historicalData = await loadMultiYearData(years, dataPath);
    
    // Calculate metric ranges
    const metricRanges = calculateMetricRanges(masterPlayerData);
    
    console.log("--- Data Initialization Complete ---");
    
    return {
      masterPlayerData,
      playerIdToNameMap,
      nameToPlayerIdMap,
      dailyGameData,
      rostersData: rostersListRaw,
      historicalData,
      leagueAvgStats,
      metricRanges
    };
  } catch (error) {
    console.error("Fatal error during data initialization:", error);
    throw error;
  }
};