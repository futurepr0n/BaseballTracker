/**
 * Data loading and processing for the Baseball HR Prediction System (JavaScript version).
 * Direct port from data_loader.py to ensure data consistency.
 */

import { cleanPlayerName, matchPlayerNameToRoster, getApproximatedPA, calculateMetricRanges } from './utils.js';
import { LEAGUE_AVERAGE_STATS, K_PA_THRESHOLD_FOR_LEAGUE_AVG } from './config.js';

/**
 * Load CSV data and parse it
 */
async function loadCSVData(filename) {
    try {
        const response = await fetch(`/data/${filename}`);
        if (!response.ok) return [];
        
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length !== headers.length) continue;
            
            const row = {};
            headers.forEach((header, index) => {
                const value = values[index];
                if (value !== '' && !isNaN(value) && !isNaN(parseFloat(value))) {
                    row[header] = parseFloat(value);
                } else {
                    row[header] = value;
                }
            });
            
            // Clean player names
            if (row.name) row.cleaned_name = cleanPlayerName(row.name);
            if (row.fullName) row.cleaned_fullName = cleanPlayerName(row.fullName);
            if (row['last_name, first_name']) row.cleaned_fullName = cleanPlayerName(row['last_name, first_name']);
            
            data.push(row);
        }
        
        console.log(`Loaded ${data.length} records from ${filename}`);
        return data;
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return [];
    }
}

/**
 * Load JSON data
 */
async function loadJSONData(filename) {
    try {
        const response = await fetch(`/data/${filename}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return null;
    }
}

/**
 * Load daily game data from JSON files
 */
export async function loadDailyGameData() {
    const dailyData = {};
    const today = new Date();
    
    // Load last 30 days of data
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const year = date.getFullYear();
        const month = date.toLocaleString('default', { month: 'long' }).toLowerCase();
        const day = String(date.getDate()).padStart(2, '0');
        
        const filename = `${year}/${month}/${month}_${day}_${year}.json`;
        const dayData = await loadJSONData(filename);
        if (dayData) {
            const dateKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${day}`;
            dailyData[dateKey] = dayData;
        }
    }
    
    console.log(`Loaded daily data for ${Object.keys(dailyData).length} dates`);
    return dailyData;
}

/**
 * Aggregate 2025 player stats from daily game data
 * Direct port of aggregate_2025_player_stats_from_daily from data_loader.py
 */
export function aggregate2025PlayerStatsFromDaily(dailyData, rosterData, nameToIdMap, masterPlayerData) {
    console.log("Aggregating 2025 Player Stats from Daily Files...");
    
    const player2025Agg = {};
    
    // Initialize aggregation structure for each player
    for (const playerId of Object.keys(masterPlayerData)) {
        player2025Agg[playerId] = {
            G: 0, AB: 0, R: 0, H: 0, HR: 0, BB: 0, K: 0, '2B': 0, '3B': 0,
            HBP: 0, SF: 0, SAC: 0, last_HR_date: null, AB_at_last_HR: 0,
            current_AB_since_last_HR: 0, H_at_last_HR: 0, current_H_since_last_HR: 0,
            game_dates: []
        };
    }
    
    const sortedGameDates = Object.keys(dailyData).sort();
    
    for (const dateStr of sortedGameDates) {
        const dayData = dailyData[dateStr] || {};
        
        for (const pds of dayData.players || []) {
            if (pds.playerType !== 'hitter') continue;
            
            const dailyPlayerNameCleaned = cleanPlayerName(pds.name);
            const mfn = matchPlayerNameToRoster(dailyPlayerNameCleaned, rosterData);
            if (!mfn) continue;
            
            const mlid = nameToIdMap[mfn];
            if (!mlid || !player2025Agg[mlid]) continue;
            
            const pagg = player2025Agg[mlid];
            
            try {
                const ab = parseInt(pds.AB || 0);
                const h = parseInt(pds.H || 0);
                const hr = parseInt(pds.HR || 0);
                const bb = parseInt(pds.BB || 0);
                const kv = parseInt(pds.K || 0);
                const r = parseInt(pds.R || 0);
                const hbp = parseInt(pds.HBP || 0);
                const sf = parseInt(pds.SF || 0);
                const sac = parseInt(pds.SAC || 0);
                
                // Track game appearances
                if (!pagg.game_dates.includes(dateStr)) {
                    pagg.G += 1;
                    pagg.game_dates.push(dateStr);
                }
                
                // Save current totals before adding today's stats
                const currentTotalABBeforeGame = pagg.AB;
                const currentTotalHBeforeGame = pagg.H;
                
                // Update basic stats
                pagg.AB += ab;
                pagg.H += h;
                pagg.BB += bb;
                pagg.K += kv;
                pagg.R += r;
                pagg.HBP += hbp;
                pagg.SF += sf;
                pagg.SAC += sac;
                
                // Handle HR tracking for "due for HR" calculations
                if (hr > 0) {
                    pagg.HR += hr;
                    pagg.last_HR_date = dateStr;
                    pagg.current_AB_since_last_HR = 0;
                    pagg.AB_at_last_HR = currentTotalABBeforeGame + ab;
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
                console.warn(`Error processing player stats for ${dailyPlayerNameCleaned}:`, error);
                continue;
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
}

/**
 * Calculate league averages for 2025
 * Direct port of calculate_league_averages_2025 from data_loader.py
 */
export function calculateLeagueAverages2025(masterPlayerData, kPAThreshold = K_PA_THRESHOLD_FOR_LEAGUE_AVG) {
    console.log("Calculating 2025 League Averages...");
    
    const allCollectedValues = {
        AVG: [],
        SLG: [],
        ISO: [],
        AVG_K_PERCENT: [],
        AVG_BB_PERCENT: [],
        AVG_HARD_HIT_PERCENT: [],
        AVG_BRL_PERCENT: [],
        AVG_BRL_PA_PERCENT: []
    };
    
    let qualifiedHitters = 0;
    
    for (const [pid, pdata] of Object.entries(masterPlayerData)) {
        if (pdata.roster_info?.type === 'hitter') {
            const stats2025Agg = pdata.stats_2025_aggregated || {};
            const hEVStats = pdata.hitter_overall_ev_stats || {};
            const pa2025 = stats2025Agg.PA_approx || 0;
            
            if (pa2025 >= kPAThreshold) {
                qualifiedHitters++;
                
                // Batting average
                if (hEVStats.batting_avg != null) {
                    allCollectedValues.AVG.push(hEVStats.batting_avg);
                } else if (stats2025Agg.AB > 0) {
                    allCollectedValues.AVG.push(stats2025Agg.H / stats2025Agg.AB);
                }
                
                // Slugging
                if (hEVStats.slg_percent != null) {
                    allCollectedValues.SLG.push(hEVStats.slg_percent);
                } else if (stats2025Agg.AB > 0) {
                    const singles = stats2025Agg.H - (stats2025Agg['2B'] || 0) - (stats2025Agg['3B'] || 0) - stats2025Agg.HR;
                    const tb = singles + 2 * (stats2025Agg['2B'] || 0) + 3 * (stats2025Agg['3B'] || 0) + 4 * stats2025Agg.HR;
                    allCollectedValues.SLG.push(tb / stats2025Agg.AB);
                }
                
                // Isolated power
                const isoValCSV = hEVStats.iso_percent;
                if (isoValCSV != null) {
                    allCollectedValues.ISO.push(isoValCSV);
                } else if (hEVStats.slg_percent != null && hEVStats.batting_avg != null) {
                    allCollectedValues.ISO.push(hEVStats.slg_percent - hEVStats.batting_avg);
                }
                
                // Plate discipline
                if (pa2025 > 0) {
                    allCollectedValues.AVG_K_PERCENT.push(stats2025Agg.K / pa2025);
                    allCollectedValues.AVG_BB_PERCENT.push(stats2025Agg.BB / pa2025);
                }
                
                // Quality of contact
                if (hEVStats.hard_hit_percent != null) {
                    allCollectedValues.AVG_HARD_HIT_PERCENT.push(hEVStats.hard_hit_percent / 100.0);
                }
                if (hEVStats.brl_percent != null) {
                    allCollectedValues.AVG_BRL_PERCENT.push(hEVStats.brl_percent / 100.0);
                }
                if (hEVStats.barrels_per_pa_percent != null) {
                    allCollectedValues.AVG_BRL_PA_PERCENT.push(hEVStats.barrels_per_pa_percent / 100.0);
                }
            }
        }
    }
    
    // Calculate averages if we have qualified hitters
    const leagueAvgStats = { ...LEAGUE_AVERAGE_STATS };
    
    if (qualifiedHitters > 0) {
        for (const [statKey, valuesList] of Object.entries(allCollectedValues)) {
            const validVals = valuesList.filter(v => v != null && !isNaN(v));
            if (validVals.length > 0) {
                leagueAvgStats[statKey] = validVals.reduce((sum, val) => sum + val, 0) / validVals.length;
            }
        }
    }
    
    console.log(`Calculated 2025 League Averages (from ${qualifiedHitters} hitters with >= ${kPAThreshold} PA):`);
    for (const [k, v] of Object.entries(leagueAvgStats)) {
        console.log(`  ${k}: ${v.toFixed(3)}`);
    }
    
    return leagueAvgStats;
}

/**
 * Initialize all data for analysis
 * Direct port of initialize_data from data_loader.py
 */
export async function initializeData() {
    console.log("=== Initializing Baseball Analysis System ===");
    
    // Load roster data
    const rostersListRaw = await loadJSONData("rosters.json");
    if (!rostersListRaw) {
        console.error("ERROR: rosters.json not loaded or empty.");
        return null;
    }
    
    // Clean player names in roster data
    const rosterData = rostersListRaw.map(entry => ({
        ...entry,
        fullName_cleaned: cleanPlayerName(entry.fullName),
        name_cleaned: cleanPlayerName(entry.name)
    }));
    
    // Initialize ID mapping dictionaries
    const playerIdToNameMap = {};
    const nameToPlayerIdMap = {};
    
    // Build player ID map from reference CSVs
    console.log("Building Master Player ID Map from reference CSVs...");
    
    const referenceFiles = [
        "hitter_exit_velocity_2025.csv",
        "pitcher_exit_velocity_2025.csv", 
        "hitterpitcharsenalstats_2025.csv",
        "pitcherpitcharsenalstats_2025.csv"
    ];
    
    for (const filename of referenceFiles) {
        const dfRef = await loadCSVData(filename);
        if (dfRef.length > 0) {
            for (const row of dfRef) {
                const mlbamIdStr = String(row.player_id || row.mlbam_id || '');
                let cleanedFullNameFromCSV = row.cleaned_fullName || row.cleaned_name;
                
                if (!cleanedFullNameFromCSV && row.name) {
                    cleanedFullNameFromCSV = cleanPlayerName(row.name);
                }
                
                if (mlbamIdStr && cleanedFullNameFromCSV && cleanedFullNameFromCSV.trim()) {
                    if (!playerIdToNameMap[mlbamIdStr]) {
                        playerIdToNameMap[mlbamIdStr] = cleanedFullNameFromCSV;
                    }
                    if (!nameToPlayerIdMap[cleanedFullNameFromCSV]) {
                        nameToPlayerIdMap[cleanedFullNameFromCSV] = mlbamIdStr;
                    }
                }
            }
        }
    }
    
    console.log(`Built Initial ID Map: ${Object.keys(nameToPlayerIdMap).length} name->ID entries, ${Object.keys(playerIdToNameMap).length} ID->name entries.`);
    
    // Load daily game data
    const dailyGameData = await loadDailyGameData();
    
    // Initialize master player data structure
    const masterPlayerData = {};
    let unmappedRosterPlayersCount = 0;
    
    for (const playerInfoRoster of rosterData) {
        const fullNameFromRosterCleaned = playerInfoRoster.fullName_cleaned;
        const shortNameFromRosterCleaned = playerInfoRoster.name_cleaned;
        
        let mlbamIdFromRosterField = null;
        if (playerInfoRoster.id != null && !isNaN(playerInfoRoster.id)) {
            mlbamIdFromRosterField = String(Math.floor(playerInfoRoster.id));
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
                
                // Calculate hits per HR (for "due for HR" calculations)
                const h2024 = parsed2024Stats.H || 0;
                const hr2024Stat = parsed2024Stats.HR || 0;
                parsed2024Stats.H_per_HR = hr2024Stat > 0 ? h2024 / hr2024Stat : null;
                
                masterPlayerData[resolvedMlbamId].stats_2024 = parsed2024Stats;
            }
        } else {
            unmappedRosterPlayersCount++;
        }
    }
    
    console.log(`Created/Updated entries for ${Object.keys(masterPlayerData).length} players. ${unmappedRosterPlayersCount} unmapped from roster.json.`);
    console.log(`Final ID Map: ${Object.keys(nameToPlayerIdMap).length} name->ID entries, ${Object.keys(playerIdToNameMap).length} ID->name entries.`);
    
    // Load detailed statistics from CSVs
    const detailedDfsSpecs = {
        "hitter_overall_ev_stats": "hitter_exit_velocity_2025.csv",
        "pitcher_overall_ev_stats": "pitcher_exit_velocity_2025.csv",
        "hitter_pitch_arsenal_stats": "hitterpitcharsenalstats_2025.csv",
        "pitcher_pitch_arsenal_stats": "pitcherpitcharsenalstats_2025.csv"
    };
    
    console.log("Merging Detailed 2025 CSV Stats into Master Player Data...");
    
    for (const [dataKey, dfFilename] of Object.entries(detailedDfsSpecs)) {
        const dfToMerge = await loadCSVData(dfFilename);
        if (dfToMerge.length === 0) {
            console.log(`Skipping ${dataKey} (${dfFilename}), empty or no data.`);
            continue;
        }
        
        const isMultiIndexedByPitchType = dfToMerge.some(row => row.pitch_type);
        let mergedRecordsCount = 0;
        
        for (const [mlbamIdMasterKey, playerEntryInMaster] of Object.entries(masterPlayerData)) {
            const playerRows = dfToMerge.filter(row => String(row.player_id || row.mlbam_id) === mlbamIdMasterKey);
            
            if (playerRows.length > 0) {
                try {
                    if (isMultiIndexedByPitchType) {
                        const pitchTypeData = {};
                        for (const row of playerRows) {
                            if (row.pitch_type) {
                                pitchTypeData[row.pitch_type] = row;
                            }
                        }
                        playerEntryInMaster[dataKey] = pitchTypeData;
                    } else {
                        // Take the first row for non-pitch-type data
                        playerEntryInMaster[dataKey] = playerRows[0];
                    }
                    mergedRecordsCount++;
                } catch (error) {
                    console.error(`Merge Error for ${dataKey} on player ${mlbamIdMasterKey}:`, error);
                }
            }
        }
        
        console.log(`Processed ${dataKey} (${dfFilename}): merged data for ${mergedRecordsCount} players.`);
    }
    
    // Extract pitch usage stats for pitchers
    for (const [pid, pdataEntry] of Object.entries(masterPlayerData)) {
        if (pdataEntry.roster_info?.type === 'pitcher' && pdataEntry.pitcher_pitch_arsenal_stats) {
            pdataEntry.pitch_usage_stats = {};
            for (const [ptype, stats] of Object.entries(pdataEntry.pitcher_pitch_arsenal_stats)) {
                if (typeof stats === 'object' && stats.pitch_usage != null && stats.pitch_usage > 0) {
                    pdataEntry.pitch_usage_stats[ptype] = stats.pitch_usage;
                }
            }
        }
    }
    
    // Aggregate 2025 stats from daily game data
    aggregate2025PlayerStatsFromDaily(dailyGameData, rosterData, nameToPlayerIdMap, masterPlayerData);
    
    // Calculate league averages
    const leagueAvgStats = calculateLeagueAverages2025(masterPlayerData);
    
    // Calculate metric ranges for normalization
    const metricRanges = calculateMetricRanges(masterPlayerData);
    
    console.log("Data Initialization Complete");
    
    return {
        masterPlayerData,
        playerIdToNameMap,
        nameToPlayerIdMap,
        dailyGameData,
        rosterData,
        leagueAvgStats,
        metricRanges
    };
}

/**
 * Get the performance data for a player's last N games
 * Direct port of get_last_n_games_performance from data_loader.py
 */
export function getLastNGamesPerformance(playerFullNameResolved, dailyData, rosterDataList, nGames = 7) {
    // Find player's name as used in daily data
    let dailyPlayerJsonName = null;
    
    for (const pInfoRoster of rosterDataList) {
        if (pInfoRoster.fullName_cleaned === playerFullNameResolved) {
            dailyPlayerJsonName = pInfoRoster.name;
            break;
        }
    }
    
    // If not found via roster match, search in daily data
    if (!dailyPlayerJsonName && Object.keys(dailyData).length > 0) {
        const tempDates = Object.keys(dailyData).sort().reverse().slice(0, 5);
        
        for (const dateStrRev of tempDates) {
            const dayDataRev = dailyData[dateStrRev];
            for (const playerDailyStatRev of dayDataRev.players || []) {
                const resolvedDailyToFull = matchPlayerNameToRoster(
                    cleanPlayerName(playerDailyStatRev.name),
                    rosterDataList
                );
                if (resolvedDailyToFull === playerFullNameResolved) {
                    dailyPlayerJsonName = playerDailyStatRev.name;
                    break;
                }
            }
            if (dailyPlayerJsonName) break;
        }
    }
    
    if (!dailyPlayerJsonName) {
        return [[], []];
    }
    
    // Collect games in chronological order
    const gamesPerformanceChrono = [];
    const sortedDatesChrono = Object.keys(dailyData).sort();
    
    for (const dateStr of sortedDatesChrono) {
        const dayData = dailyData[dateStr];
        let playerDataToday = null;
        
        for (const playerInDay of dayData.players || []) {
            if (playerInDay.name === dailyPlayerJsonName) {
                playerDataToday = playerInDay;
                break;
            }
        }
        
        if (playerDataToday && playerDataToday.playerType === 'hitter') {
            try {
                const gameStats = {
                    date: dateStr,
                    AB: parseInt(playerDataToday.AB || 0),
                    H: parseInt(playerDataToday.H || 0),
                    R: parseInt(playerDataToday.R || 0),
                    RBI: parseInt(playerDataToday.RBI || 0),
                    HR: parseInt(playerDataToday.HR || 0),
                    BB: parseInt(playerDataToday.BB || 0),
                    K: parseInt(playerDataToday.K || 0),
                    AVG: parseFloat(playerDataToday.AVG || 0.0),
                    OBP: parseFloat(playerDataToday.OBP || 0.0),
                    SLG: parseFloat(playerDataToday.SLG || 0.0),
                    HBP: parseInt(playerDataToday.HBP || 0),
                    SF: parseInt(playerDataToday.SF || 0),
                    SAC: parseInt(playerDataToday.SAC || 0)
                };
                gamesPerformanceChrono.push(gameStats);
            } catch (error) {
                // Skip invalid data
            }
        }
    }
    
    // Get at-bats details (simplified simulation based on game totals)
    const atBatsDetails = [];
    for (const game of gamesPerformanceChrono.slice(-nGames)) {
        const dateStr = game.date;
        const abCount = game.AB;
        const hits = game.H;
        const hrs = game.HR;
        const walks = game.BB;
        const strikeouts = game.K;
        
        // Simulate at-bat outcomes based on game totals
        for (let abIdx = 0; abIdx < abCount; abIdx++) {
            let outcome;
            if (abIdx < hrs) {
                outcome = 'HR';
            } else if (abIdx < hits) {
                outcome = 'H';
            } else if (abIdx < strikeouts) {
                outcome = 'K';
            } else {
                outcome = 'Out';
            }
            
            atBatsDetails.push({
                date: dateStr,
                ab_number: abIdx + 1,
                outcome: outcome
            });
        }
        
        // Add walks as separate PAs
        for (let walkIdx = 0; walkIdx < walks; walkIdx++) {
            atBatsDetails.push({
                date: dateStr,
                ab_number: `BB${walkIdx + 1}`,
                outcome: 'BB'
            });
        }
    }
    
    const lastNGamesData = gamesPerformanceChrono.slice(-nGames);
    // Return in reverse chronological order (most recent first)
    return [lastNGamesData.reverse(), atBatsDetails];
}