/**
 * Utility functions for the Baseball HR Prediction System (JavaScript version).
 * Direct port from utils.py to ensure calculation consistency.
 */

import { DEFAULT_METRIC_RANGES } from './config.js';

/**
 * Standardize player names for consistent matching.
 * Direct port of clean_player_name from utils.py
 */
export function cleanPlayerName(nameInput) {
    if (!nameInput) return null;
    
    let name = String(nameInput);
    
    // Handle "LastName, FirstName" format
    if (name.includes(',')) {
        const parts = name.split(',');
        if (parts.length === 2) {
            name = `${parts[1].trim()} ${parts[0].trim()}`;
        }
    }
    
    // Standardize whitespace
    name = name.replace(/\s+/g, ' ').trim();
    
    // Convert to title case
    name = name.replace(/\b\w/g, l => l.toUpperCase());
    
    // Standardize suffixes (Jr, Sr, I, II, III, IV)
    name = name.replace(/\s+(Jr|Sr|Ii|Iii|Iv)\.?$/i, (match, suffix) => {
        return ` ${suffix.toUpperCase().replace('II', 'II').replace('III', 'III').replace('IV', 'IV')}`;
    });
    
    // Remove periods from initials
    name = name.replace(/(?<=\b[A-Z])\.(?=\s|$)/g, '');
    
    return name;
}

/**
 * Calculate approximate plate appearances from available stats.
 * Direct port of get_approximated_pa from utils.py
 */
export function getApproximatedPA(statsDict) {
    if (!statsDict || typeof statsDict !== 'object') {
        return 0;
    }
    
    return (statsDict.AB || 0) + 
           (statsDict.BB || 0) + 
           (statsDict.HBP || 0) + 
           (statsDict.SF || 0) + 
           (statsDict.SAC || 0);
}

/**
 * Normalize a stat value within a pre-calculated range.
 * Direct port of normalize_calculated from utils.py
 */
export function normalizeCalculated(value, metricName, metricRanges = DEFAULT_METRIC_RANGES, scale = 100, higherIsBetter = true) {
    if (value == null || isNaN(value)) {
        return 0;
    }
    
    const rangeInfo = metricRanges[metricName];
    if (!rangeInfo) {
        // Handle typical rate stats (0.0 to 1.0 range)
        if (typeof value === 'number' && value >= 0.0 && value <= 1.0 && 
            ['rate', 'percent', 'avg', 'slg', 'obp', 'woba', 'iso'].some(substr => 
                metricName.toLowerCase().includes(substr))) {
            let normVal = value;
            if (!higherIsBetter) {
                normVal = 1.0 - normVal;
            }
            return Math.max(0, Math.min(1, normVal)) * scale;
        }
        return scale / 2; // Neutral if no range and not a typical rate
    }
    
    const { min, max } = rangeInfo;
    if (max === min) {
        return value >= min ? scale / 2 : 0;
    }
    
    let norm = (value - min) / (max - min);
    if (!higherIsBetter) {
        norm = 1 - norm;
    }
    
    return Math.max(0, Math.min(1, norm)) * scale;
}

/**
 * Adjust a player stat based on sample size confidence.
 * Direct port of adjust_stat_with_confidence from utils.py
 */
export function adjustStatWithConfidence(playerStatValue, playerPA, statNameKeyInLeagueAvg, 
                                       leagueAvgStats, kConfidencePA = 100, defaultLeagueAvgOverride = null) {
    const leagueAvgForStat = leagueAvgStats[statNameKeyInLeagueAvg] ?? defaultLeagueAvgOverride;
    
    if (playerStatValue == null || leagueAvgForStat == null || 
        playerPA == null || isNaN(playerPA) || playerPA < 0) {
        return playerStatValue;
    }
    
    const confidence = playerPA / (playerPA + kConfidencePA);
    return confidence * playerStatValue + (1 - confidence) * leagueAvgForStat;
}

/**
 * Match a short/abbreviated player name to full roster name.
 * Direct port of match_player_name_to_roster from utils.py
 */
export function matchPlayerNameToRoster(shortNameCleaned, rosterDataList) {
    if (!shortNameCleaned) return null;
    
    // Direct match first
    for (const player of rosterDataList) {
        if (player.name_cleaned === shortNameCleaned) {
            return player.fullName_cleaned;
        }
    }
    
    // Handle abbreviated names (e.g., "J. Smith" -> "John Smith")
    if (shortNameCleaned.includes('.') || (shortNameCleaned.split(' ').length === 2 && 
                                          shortNameCleaned.split(' ')[0].length <= 2)) {
        const parts = shortNameCleaned.split(' ');
        if (parts.length >= 2) {
            const firstInitialPart = parts[0].replace('.', '').toUpperCase();
            const lastNameQueryPart = parts.slice(1).join(' ');
            
            const potentialMatches = [];
            for (const player of rosterDataList) {
                const fullNameRosterCleaned = player.fullName_cleaned || '';
                if (fullNameRosterCleaned) {
                    const fullPartsRoster = fullNameRosterCleaned.split(' ');
                    if (fullPartsRoster.length >= 2) {
                        const rosterFirstName = fullPartsRoster[0];
                        const rosterLastName = fullPartsRoster.slice(1).join(' ');
                        if (rosterFirstName.toUpperCase().startsWith(firstInitialPart) && 
                            rosterLastName === lastNameQueryPart) {
                            potentialMatches.push(fullNameRosterCleaned);
                        }
                    }
                }
            }
            
            if (potentialMatches.length === 1) {
                return potentialMatches[0];
            }
        }
    }
    
    // Fuzzy match on short names
    const rosterShortNames = rosterDataList
        .map(p => p.name_cleaned)
        .filter(name => name);
    
    const shortMatch = findClosestMatch(shortNameCleaned, rosterShortNames, 0.8);
    if (shortMatch) {
        for (const player of rosterDataList) {
            if (player.name_cleaned === shortMatch) {
                return player.fullName_cleaned;
            }
        }
    }
    
    // Fuzzy match on full names
    const rosterFullNames = rosterDataList
        .map(p => p.fullName_cleaned)
        .filter(name => name);
    
    const fullMatch = findClosestMatch(shortNameCleaned, rosterFullNames, 0.75);
    return fullMatch || null;
}

/**
 * Simple fuzzy string matching (replacement for Python's get_close_matches)
 */
function findClosestMatch(target, candidates, threshold = 0.8) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const candidate of candidates) {
        const score = calculateSimilarity(target.toLowerCase(), candidate.toLowerCase());
        if (score > threshold && score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
        }
    }
    
    return bestMatch;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    
    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
}

/**
 * Find a player's ID based on their name, with optional filtering by player type.
 * Direct port of find_player_id_by_name from utils.py
 */
export function findPlayerIdByName(nameQuery, playerTypeFilter, masterPlayerData, nameToIdMap) {
    const cleanedQueryName = cleanPlayerName(nameQuery);
    if (!cleanedQueryName) return null;
    
    // Direct lookup in name map
    const playerId = nameToIdMap[cleanedQueryName];
    if (playerId && (!playerTypeFilter || 
                    masterPlayerData[playerId]?.roster_info?.type === playerTypeFilter)) {
        return playerId;
    }
    
    // Search through master data
    for (const [pid, pdata] of Object.entries(masterPlayerData)) {
        if (playerTypeFilter && pdata.roster_info?.type !== playerTypeFilter) {
            continue;
        }
        
        const rInfo = pdata.roster_info || {};
        const namesToCheck = [
            rInfo.fullName_resolved,
            rInfo.fullName_cleaned,
            rInfo.name_cleaned,
            rInfo.parsed_fullName
        ].filter(name => name);
        
        for (const nameVariant of namesToCheck) {
            if (cleanPlayerName(nameVariant) === cleanedQueryName) {
                return pid;
            }
        }
    }
    
    // Fuzzy matching as last resort
    const candidateNames = [];
    for (const [pid, pdata] of Object.entries(masterPlayerData)) {
        if (playerTypeFilter && pdata.roster_info?.type !== playerTypeFilter) {
            continue;
        }
        
        const nameRes = pdata.roster_info?.fullName_resolved;
        if (nameRes) {
            candidateNames.push({ name: nameRes, id: pid });
        }
    }
    
    const fuzzyMatch = findClosestMatch(cleanedQueryName, candidateNames.map(c => c.name), 0.8);
    if (fuzzyMatch) {
        const matchedCandidate = candidateNames.find(c => c.name === fuzzyMatch);
        return matchedCandidate?.id || null;
    }
    
    return null;
}

/**
 * Calculate metric ranges for normalization from master player data.
 * Direct port of calculate_metric_ranges from utils.py
 */
export function calculateMetricRanges(masterPlayerData) {
    console.log("Calculating metric ranges for normalization...");
    
    const allMetricsValues = {};
    
    // Initialize arrays for each metric
    const metricsToTrack = [
        'brl_percent', 'hard_hit_percent', 'slg', 'iso', 'woba', 'hr', 
        'run_value_per_100', 'k_rate', 'pitch_usage', 'fb_rate', 'pull_air_rate'
    ];
    
    metricsToTrack.forEach(metric => {
        allMetricsValues[metric] = [];
    });
    
    // Collect values from all players
    for (const [pid, pdata] of Object.entries(masterPlayerData)) {
        // Batter exit velocity stats
        const evStats = pdata.hitter_overall_ev_stats || {};
        if (typeof evStats === 'object') {
            if (evStats.brl_percent != null) {
                allMetricsValues.brl_percent.push(evStats.brl_percent / 100.0);
            }
            if (evStats.hard_hit_percent != null) {
                allMetricsValues.hard_hit_percent.push(evStats.hard_hit_percent / 100.0);
            }
            if (evStats.slg_percent != null) {
                allMetricsValues.slg.push(evStats.slg_percent);
            }
            
            const isoVal = evStats.iso_percent;
            if (isoVal != null) {
                allMetricsValues.iso.push(isoVal);
            } else if (evStats.slg_percent != null && evStats.batting_avg != null) {
                allMetricsValues.iso.push(evStats.slg_percent - evStats.batting_avg);
            }
        }
        
        // Pitcher exit velocity stats
        const pevStats = pdata.pitcher_overall_ev_stats || {};
        if (typeof pevStats === 'object') {
            if (pevStats.brl_percent != null) {
                allMetricsValues.brl_percent.push(pevStats.brl_percent / 100.0);
            }
            if (pevStats.hard_hit_percent != null) {
                allMetricsValues.hard_hit_percent.push(pevStats.hard_hit_percent / 100.0);
            }
            if (pevStats.slg_percent != null) {
                allMetricsValues.slg.push(pevStats.slg_percent);
            }
        }
        
        // Arsenal stats (both hitter and pitcher)
        ['hitter_pitch_arsenal_stats', 'pitcher_pitch_arsenal_stats'].forEach(arsenalKey => {
            const arsenal = pdata[arsenalKey] || {};
            if (typeof arsenal === 'object') {
                for (const [pitchType, statsDict] of Object.entries(arsenal)) {
                    if (typeof statsDict === 'object') {
                        if (statsDict.slg != null) allMetricsValues.slg.push(statsDict.slg);
                        if (statsDict.woba != null) allMetricsValues.woba.push(statsDict.woba);
                        if (statsDict.hr != null) allMetricsValues.hr.push(statsDict.hr);
                        if (statsDict.hard_hit_percent != null) {
                            allMetricsValues.hard_hit_percent.push(statsDict.hard_hit_percent / 100.0);
                        }
                        if (statsDict.run_value_per_100 != null) {
                            allMetricsValues.run_value_per_100.push(statsDict.run_value_per_100);
                        }
                        if (statsDict.k_percent != null) {
                            allMetricsValues.k_rate.push(statsDict.k_percent / 100.0);
                        }
                        if (statsDict.pitch_usage != null) {
                            allMetricsValues.pitch_usage.push(statsDict.pitch_usage);
                        }
                    }
                }
            }
        });
        
        // Batted ball stats
        const bbbData = pdata.batted_ball_stats || {};
        if (typeof bbbData === 'object') {
            for (const [matchupKey, pitchDictVal] of Object.entries(bbbData)) {
                if (typeof pitchDictVal === 'object') {
                    for (const [pitchType, statsDict] of Object.entries(pitchDictVal)) {
                        if (typeof statsDict === 'object') {
                            if (statsDict.fb_rate != null) allMetricsValues.fb_rate.push(statsDict.fb_rate);
                            if (statsDict.pull_air_rate != null) {
                                allMetricsValues.pull_air_rate.push(statsDict.pull_air_rate);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Calculate ranges
    const metricRangesCalculated = {};
    
    for (const [metric, valuesList] of Object.entries(allMetricsValues)) {
        const validValues = valuesList.filter(v => v != null && !isNaN(v));
        
        if (validValues.length > 0) {
            validValues.sort((a, b) => a - b);
            
            // Use 2nd and 98th percentiles
            const minIndex = Math.floor(validValues.length * 0.02);
            const maxIndex = Math.floor(validValues.length * 0.98);
            
            let minVal = validValues[minIndex];
            let maxVal = validValues[maxIndex];
            
            if (minVal === maxVal) {
                minVal = Math.min(...validValues);
                maxVal = Math.max(...validValues);
            }
            
            if (minVal === maxVal) {
                // Use defaults from config
                const defaultRange = DEFAULT_METRIC_RANGES[metric];
                if (defaultRange) {
                    minVal = defaultRange.min;
                    maxVal = defaultRange.max;
                } else {
                    minVal = 0;
                    maxVal = 1;
                }
            }
            
            metricRangesCalculated[metric] = { min: minVal, max: maxVal };
        } else {
            // Use defaults from config
            const defaultRange = DEFAULT_METRIC_RANGES[metric];
            metricRangesCalculated[metric] = defaultRange || { min: 0, max: 1 };
        }
    }
    
    console.log("Metric ranges calculation complete.");
    return metricRangesCalculated;
}