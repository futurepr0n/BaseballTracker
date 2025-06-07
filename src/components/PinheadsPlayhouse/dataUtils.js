// dataUtils.js
// Core utility functions matching Python's utils.py and data processing functions

// Clean player name - standardize for consistent matching
export const cleanPlayerName = (nameInput) => {
  if (!nameInput) return null;
  
  let name = String(nameInput);
  
  // Handle "LastName, FirstName" format
  if (name.includes(',')) {
    const parts = name.split(',', 2);
    if (parts.length === 2) {
      name = `${parts[1].trim()} ${parts[0].trim()}`;
    }
  }
  
  // Standardize whitespace
  name = name.replace(/\s+/g, ' ').trim();
  
  // Title case
  name = name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  // Standardize suffixes (Jr, Sr, II, III, IV)
  name = name.replace(/\s+(Jr|Sr|Ii|Iii|Iv)\.?$/i, (match, suffix) => {
    const suffixMap = {
      'jr': 'Jr', 'sr': 'Sr', 'ii': 'II', 'iii': 'III', 'iv': 'IV'
    };
    return ` ${suffixMap[suffix.toLowerCase()] || suffix}`;
  });
  
  // Remove periods from initials
  name = name.replace(/(?<=\b[A-Z])\.(?=\s|$)/g, '');
  
  return name;
};

// Get approximate plate appearances
export const getApproximatedPA = (statsDict) => {
  if (!statsDict || typeof statsDict !== 'object') return 0;
  
  return (statsDict.AB || 0) + (statsDict.BB || 0) + (statsDict.HBP || 0) + 
         (statsDict.SF || 0) + (statsDict.SAC || 0);
};

// Match player name to roster
export const matchPlayerNameToRoster = (shortNameCleaned, rosterDataList) => {
  if (!shortNameCleaned) return null;
  
  // Direct match first
  for (const player of rosterDataList) {
    if (player.name_cleaned === shortNameCleaned || player.name === shortNameCleaned) {
      return player.fullName_cleaned || player.fullName;
    }
  }
  
  // Handle abbreviated names (e.g., "J. Smith" -> "John Smith")
  if (shortNameCleaned.includes('.') || 
      (shortNameCleaned.split(' ').length === 2 && shortNameCleaned.split(' ')[0].length <= 2)) {
    const parts = shortNameCleaned.split(' ');
    if (parts.length >= 2) {
      const firstInitialPart = parts[0].replace('.', '').toUpperCase();
      const lastNamePart = parts.slice(1).join(' ');
      
      const potentialMatches = [];
      for (const player of rosterDataList) {
        const fullNameCleaned = player.fullName_cleaned || player.fullName || '';
        const fullParts = fullNameCleaned.split(' ');
        if (fullParts.length >= 2) {
          const rosterFirstName = fullParts[0];
          const rosterLastName = fullParts.slice(1).join(' ');
          if (rosterFirstName.toUpperCase().startsWith(firstInitialPart) && 
              rosterLastName === lastNamePart) {
            potentialMatches.push(fullNameCleaned);
          }
        }
      }
      
      if (potentialMatches.length === 1) {
        return potentialMatches[0];
      }
    }
  }
  
  // Fuzzy match could be added here if needed
  
  return null;
};

// Find player ID by name
export const findPlayerIdByName = (nameQuery, playerTypeFilter, masterPlayerData, nameToIdMap) => {
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
      rInfo.fullName,
      rInfo.name_cleaned,
      rInfo.name
    ];
    
    for (const nameVariant of namesToCheck) {
      if (nameVariant && cleanPlayerName(nameVariant) === cleanedQueryName) {
        return pid;
      }
    }
  }
  
  return null;
};

// Calculate metric ranges for normalization
export const calculateMetricRanges = (masterPlayerData) => {
  console.log("Calculating metric ranges for normalization...");
  const allMetricsValues = {};
  
  for (const [pid, pdata] of Object.entries(masterPlayerData)) {
    // Batter exit velocity stats
    const evStats = pdata.hitter_overall_ev_stats || {};
    if (evStats && typeof evStats === 'object') {
      if (evStats.brl_percent !== null && evStats.brl_percent !== undefined) {
        addMetricValue(allMetricsValues, 'brl_percent', evStats.brl_percent / 100.0);
      }
      if (evStats.hard_hit_percent !== null && evStats.hard_hit_percent !== undefined) {
        addMetricValue(allMetricsValues, 'hard_hit_percent', evStats.hard_hit_percent / 100.0);
      }
      if (evStats.slg_percent !== null && evStats.slg_percent !== undefined) {
        addMetricValue(allMetricsValues, 'slg', evStats.slg_percent);
      }
      
      const isoVal = evStats.iso_percent;
      if (isoVal !== null && isoVal !== undefined) {
        addMetricValue(allMetricsValues, 'iso', isoVal);
      } else if (evStats.slg_percent && evStats.batting_avg) {
        addMetricValue(allMetricsValues, 'iso', evStats.slg_percent - evStats.batting_avg);
      }
    }
    
    // Pitcher exit velocity stats
    const pevStats = pdata.pitcher_overall_ev_stats || {};
    if (pevStats && typeof pevStats === 'object') {
      if (pevStats.brl_percent !== null && pevStats.brl_percent !== undefined) {
        addMetricValue(allMetricsValues, 'brl_percent', pevStats.brl_percent / 100.0);
      }
      if (pevStats.hard_hit_percent !== null && pevStats.hard_hit_percent !== undefined) {
        addMetricValue(allMetricsValues, 'hard_hit_percent', pevStats.hard_hit_percent / 100.0);
      }
      if (pevStats.slg_percent !== null && pevStats.slg_percent !== undefined) {
        addMetricValue(allMetricsValues, 'slg', pevStats.slg_percent);
      }
    }
    
    // Hitter pitch arsenal stats
    const hArsenal = pdata.hitter_pitch_arsenal_stats || {};
    if (hArsenal && typeof hArsenal === 'object') {
      for (const [pitchType, statsDict] of Object.entries(hArsenal)) {
        if (statsDict && typeof statsDict === 'object') {
          if (statsDict.slg !== null && statsDict.slg !== undefined) {
            addMetricValue(allMetricsValues, 'slg', statsDict.slg);
          }
          if (statsDict.woba !== null && statsDict.woba !== undefined) {
            addMetricValue(allMetricsValues, 'woba', statsDict.woba);
          }
          if (statsDict.hr !== null && statsDict.hr !== undefined) {
            addMetricValue(allMetricsValues, 'hr', statsDict.hr);
          }
          if (statsDict.hard_hit_percent !== null && statsDict.hard_hit_percent !== undefined) {
            addMetricValue(allMetricsValues, 'hard_hit_percent', statsDict.hard_hit_percent / 100.0);
          }
          if (statsDict.run_value_per_100 !== null && statsDict.run_value_per_100 !== undefined) {
            addMetricValue(allMetricsValues, 'run_value_per_100', statsDict.run_value_per_100);
          }
          if (statsDict.k_percent !== null && statsDict.k_percent !== undefined) {
            addMetricValue(allMetricsValues, 'k_rate', statsDict.k_percent / 100.0);
          }
        }
      }
    }
    
    // Pitcher pitch arsenal stats
    const pArsenal = pdata.pitcher_pitch_arsenal_stats || {};
    if (pArsenal && typeof pArsenal === 'object') {
      for (const [pitchType, statsDict] of Object.entries(pArsenal)) {
        if (statsDict && typeof statsDict === 'object') {
          if (statsDict.slg !== null && statsDict.slg !== undefined) {
            addMetricValue(allMetricsValues, 'slg', statsDict.slg);
          }
          if (statsDict.woba !== null && statsDict.woba !== undefined) {
            addMetricValue(allMetricsValues, 'woba', statsDict.woba);
          }
          if (statsDict.hr !== null && statsDict.hr !== undefined) {
            addMetricValue(allMetricsValues, 'hr', statsDict.hr);
          }
          if (statsDict.hard_hit_percent !== null && statsDict.hard_hit_percent !== undefined) {
            addMetricValue(allMetricsValues, 'hard_hit_percent', statsDict.hard_hit_percent / 100.0);
          }
          if (statsDict.run_value_per_100 !== null && statsDict.run_value_per_100 !== undefined) {
            addMetricValue(allMetricsValues, 'run_value_per_100', statsDict.run_value_per_100);
          }
          if (statsDict.k_percent !== null && statsDict.k_percent !== undefined) {
            addMetricValue(allMetricsValues, 'k_rate', statsDict.k_percent / 100.0);
          }
          if (statsDict.pitch_usage !== null && statsDict.pitch_usage !== undefined) {
            addMetricValue(allMetricsValues, 'pitch_usage', statsDict.pitch_usage);
          }
        }
      }
    }
    
    // Batted ball stats
    const bbbData = pdata.batted_ball_stats || {};
    if (bbbData && typeof bbbData === 'object') {
      for (const [matchupKey, pitchDictVal] of Object.entries(bbbData)) {
        if (pitchDictVal && typeof pitchDictVal === 'object') {
          for (const [pitchType, statsDict] of Object.entries(pitchDictVal)) {
            if (statsDict && typeof statsDict === 'object') {
              if (statsDict.fb_rate !== null && statsDict.fb_rate !== undefined) {
                addMetricValue(allMetricsValues, 'fb_rate', statsDict.fb_rate);
              }
              if (statsDict.pull_air_rate !== null && statsDict.pull_air_rate !== undefined) {
                addMetricValue(allMetricsValues, 'pull_air_rate', statsDict.pull_air_rate);
              }
            }
          }
        }
      }
    }
  }
  
  // Default ranges if calculation fails
  const defaultMetricRangesFallback = {
    'fb_rate': { min: 0.1, max: 0.6 },
    'pull_air_rate': { min: 0.1, max: 0.6 },
    'slg': { min: 0.1, max: 1.0 },
    'woba': { min: 0.1, max: 0.6 },
    'hr': { min: 0, max: 25 },
    'iso': { min: 0.0, max: 0.5 },
    'brl_percent': { min: 0.0, max: 0.3 },
    'hard_hit_percent': { min: 0.15, max: 0.7 },
    'run_value_per_100': { min: -10, max: 10 },
    'pitch_usage': { min: 0, max: 100 },
    'k_rate': { min: 0.05, max: 0.5 },
    'hit_rate': { min: 0.1, max: 0.5 },
    'hr_rate': { min: 0.0, max: 0.15 },
    'obp': { min: 0.2, max: 0.5 }
  };
  
  const metricRangesCalculated = {};
  
  for (const [metric, valuesList] of Object.entries(allMetricsValues)) {
    const validValues = valuesList.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (validValues.length > 0) {
      // Calculate 2nd and 98th percentiles
      validValues.sort((a, b) => a - b);
      const p2Index = Math.floor(validValues.length * 0.02);
      const p98Index = Math.floor(validValues.length * 0.98);
      
      let minVal = validValues[p2Index];
      let maxVal = validValues[p98Index];
      
      if (minVal === maxVal) {
        minVal = Math.min(...validValues);
        maxVal = Math.max(...validValues);
      }
      
      if (minVal === maxVal) {
        const fallback = defaultMetricRangesFallback[metric] || { min: 0, max: 1 };
        minVal = fallback.min;
        maxVal = fallback.max;
      }
      
      metricRangesCalculated[metric] = { min: minVal, max: maxVal };
    } else {
      metricRangesCalculated[metric] = defaultMetricRangesFallback[metric] || { min: 0, max: 1 };
    }
  }
  
  console.log("Metric ranges calculation complete.");
  return metricRangesCalculated;
};

// Helper function to add metric values
const addMetricValue = (allMetricsValues, metric, value) => {
  if (!allMetricsValues[metric]) {
    allMetricsValues[metric] = [];
  }
  allMetricsValues[metric].push(value);
};

// Normalize a stat value within pre-calculated range
export const normalizeCalculated = (value, metricName, metricRanges, scale = 100, higherIsBetter = true) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }
  
  const rangeInfo = metricRanges[metricName];
  if (!rangeInfo) {
    // Check if it's a typical rate/percentage metric
    if (typeof value === 'number' && value >= 0.0 && value <= 1.0 &&
        ['rate', 'percent', 'avg', 'slg', 'obp', 'woba', 'iso'].some(substr => 
          metricName.toLowerCase().includes(substr))) {
      let normVal = value;
      if (!higherIsBetter) {
        normVal = 1.0 - normVal;
      }
      return Math.max(0, Math.min(1, normVal)) * scale;
    }
    return scale / 2; // Neutral if no range
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
};

// Adjust stat with confidence based on sample size
export const adjustStatWithConfidence = (
  playerStatValue, playerPa, statNameKey, 
  leagueAvgStats, kConfidencePa = 100, defaultLeagueAvgOverride = null
) => {
  const leagueAvgForStat = leagueAvgStats[statNameKey] || defaultLeagueAvgOverride;
  
  if (playerStatValue === null || playerStatValue === undefined || isNaN(playerStatValue) ||
      leagueAvgForStat === null || leagueAvgForStat === undefined ||
      playerPa === null || playerPa === undefined || isNaN(playerPa) || playerPa < 0) {
    return playerStatValue;
  }
  
  const confidence = playerPa / (playerPa + kConfidencePa);
  return confidence * playerStatValue + (1 - confidence) * leagueAvgForStat;
};

// Calculate league averages for 2025
export const calculateLeagueAverages2025 = (masterPlayerData, kPaThreshold = 30) => {
  console.log("Calculating 2025 League Averages...");
  const allCollectedValues = {};
  let qualifiedHitters = 0;
  
  const leagueAvgStats = {
    'AVG': 0.245, 'SLG': 0.400, 'ISO': 0.155,
    'AVG_K_PERCENT': 0.22, 'AVG_BB_PERCENT': 0.08,
    'AVG_HARD_HIT_PERCENT': 0.35, 'AVG_BRL_PERCENT': 0.06,
    'AVG_BRL_PA_PERCENT': 0.035
  };
  
  for (const [pid, pdata] of Object.entries(masterPlayerData)) {
    if (pdata.roster_info?.type === 'hitter') {
      const stats2025Agg = pdata.stats_2025_aggregated || {};
      const hEvStats = pdata.hitter_overall_ev_stats || {};
      const pa2025 = stats2025Agg.PA_approx || 0;
      
      if (pa2025 >= kPaThreshold) {
        qualifiedHitters++;
        
        // Batting average
        if (hEvStats.batting_avg !== null && hEvStats.batting_avg !== undefined) {
          addMetricValue(allCollectedValues, 'AVG', hEvStats.batting_avg);
        } else if (stats2025Agg.AB > 0) {
          addMetricValue(allCollectedValues, 'AVG', stats2025Agg.H / stats2025Agg.AB);
        }
        
        // Slugging
        if (hEvStats.slg_percent !== null && hEvStats.slg_percent !== undefined) {
          addMetricValue(allCollectedValues, 'SLG', hEvStats.slg_percent);
        } else if (stats2025Agg.AB > 0) {
          const singles = stats2025Agg.H - stats2025Agg['2B'] - stats2025Agg['3B'] - stats2025Agg.HR;
          const tb = singles + 2 * stats2025Agg['2B'] + 3 * stats2025Agg['3B'] + 4 * stats2025Agg.HR;
          addMetricValue(allCollectedValues, 'SLG', tb / stats2025Agg.AB);
        }
        
        // ISO
        const isoVal = hEvStats.iso_percent;
        if (isoVal !== null && isoVal !== undefined) {
          addMetricValue(allCollectedValues, 'ISO', isoVal);
        } else if (hEvStats.slg_percent && hEvStats.batting_avg) {
          addMetricValue(allCollectedValues, 'ISO', hEvStats.slg_percent - hEvStats.batting_avg);
        }
        
        // Plate discipline
        if (pa2025 > 0) {
          addMetricValue(allCollectedValues, 'AVG_K_PERCENT', (stats2025Agg.K || 0) / pa2025);
          addMetricValue(allCollectedValues, 'AVG_BB_PERCENT', (stats2025Agg.BB || 0) / pa2025);
        }
        
        // Quality of contact
        if (hEvStats.hard_hit_percent !== null && hEvStats.hard_hit_percent !== undefined) {
          addMetricValue(allCollectedValues, 'AVG_HARD_HIT_PERCENT', hEvStats.hard_hit_percent / 100.0);
        }
        if (hEvStats.brl_percent !== null && hEvStats.brl_percent !== undefined) {
          addMetricValue(allCollectedValues, 'AVG_BRL_PERCENT', hEvStats.brl_percent / 100.0);
        }
        if (hEvStats.barrels_per_pa_percent !== null && hEvStats.barrels_per_pa_percent !== undefined) {
          addMetricValue(allCollectedValues, 'AVG_BRL_PA_PERCENT', hEvStats.barrels_per_pa_percent / 100.0);
        }
      }
    }
  }
  
  // Calculate averages
  if (qualifiedHitters > 0) {
    for (const [statKey, valuesList] of Object.entries(allCollectedValues)) {
      const validVals = valuesList.filter(v => v !== null && v !== undefined && !isNaN(v));
      if (validVals.length > 0) {
        leagueAvgStats[statKey] = validVals.reduce((sum, val) => sum + val, 0) / validVals.length;
      }
    }
  }
  
  console.log(`Calculated 2025 League Averages (from ${qualifiedHitters} hitters with >= ${kPaThreshold} PA):`);
  for (const [k, v] of Object.entries(leagueAvgStats)) {
    console.log(`  ${k}: ${v.toFixed(3)}`);
  }
  
  return leagueAvgStats;
};

// Calculate recent trends from game performance
export const calculateRecentTrends = (gamesPerformance) => {
  if (!gamesPerformance || gamesPerformance.length === 0) {
    return {};
  }
  
  const numGames = gamesPerformance.length;
  
  // Calculate totals
  const totals = gamesPerformance.reduce((acc, g) => ({
    ab: acc.ab + (g.AB || 0),
    h: acc.h + (g.H || 0),
    hr: acc.hr + (g.HR || 0),
    bb: acc.bb + (g.BB || 0),
    k: acc.k + (g.K || 0),
    pa: acc.pa + getApproximatedPA(g)
  }), { ab: 0, h: 0, hr: 0, bb: 0, k: 0, pa: 0 });
  
  // Calculate averages
  const avgAvg = gamesPerformance
    .filter(g => g.AB > 0)
    .reduce((sum, g) => sum + g.AVG, 0) / gamesPerformance.filter(g => g.AB > 0).length || 0;
  
  const avgObp = gamesPerformance
    .filter(g => getApproximatedPA(g) > 0)
    .reduce((sum, g) => sum + g.OBP, 0) / gamesPerformance.filter(g => getApproximatedPA(g) > 0).length || 0;
  
  const avgSlg = gamesPerformance
    .filter(g => g.AB > 0)
    .reduce((sum, g) => sum + g.SLG, 0) / gamesPerformance.filter(g => g.AB > 0).length || 0;
  
  const recentStats = {
    total_games: numGames,
    total_ab: totals.ab,
    total_hits: totals.h,
    total_hrs: totals.hr,
    total_bb: totals.bb,
    total_k: totals.k,
    total_pa_approx: totals.pa,
    avg_avg: avgAvg,
    avg_obp: avgObp,
    avg_slg: avgSlg,
    hit_rate: totals.ab > 0 ? totals.h / totals.ab : 0,
    hr_rate: totals.ab > 0 ? totals.hr / totals.ab : 0,
    hr_per_pa: totals.pa > 0 ? totals.hr / totals.pa : 0,
    k_rate: totals.pa > 0 ? totals.k / totals.pa : 0,
    bb_rate: totals.pa > 0 ? totals.bb / totals.pa : 0,
    obp_calc: totals.pa > 0 ? (totals.h + totals.bb) / totals.pa : 0
  };
  
  // Calculate trends (first half vs second half)
  if (numGames >= 2) {
    const midPoint = Math.floor(numGames / 2);
    const recentHalf = gamesPerformance.slice(0, midPoint); // More recent games
    const earlierHalf = gamesPerformance.slice(midPoint); // Earlier games
    
    if (recentHalf.length > 0 && earlierHalf.length > 0) {
      // HR/PA trend
      const recentHrTrend = recentHalf.reduce((sum, g) => sum + g.HR, 0);
      const recentPaTrend = recentHalf.reduce((sum, g) => sum + getApproximatedPA(g), 0);
      const recentVal = recentPaTrend > 0 ? recentHrTrend / recentPaTrend : 0;
      
      const earlyHrTrend = earlierHalf.reduce((sum, g) => sum + g.HR, 0);
      const earlyPaTrend = earlierHalf.reduce((sum, g) => sum + getApproximatedPA(g), 0);
      const earlyVal = earlyPaTrend > 0 ? earlyHrTrend / earlyPaTrend : 0;
      
      recentStats.trend_metric = 'HR_per_PA';
      recentStats.trend_recent_val = Math.round(recentVal * 1000) / 1000;
      recentStats.trend_early_val = Math.round(earlyVal * 1000) / 1000;
      recentStats.trend_direction = recentVal > earlyVal ? 'improving' : 
                                   recentVal < earlyVal ? 'declining' : 'stable';
      recentStats.trend_magnitude = Math.abs(recentVal - earlyVal);
      
      // Hit rate trend
      const recentHits = recentHalf.reduce((sum, g) => sum + g.H, 0);
      const recentAbs = recentHalf.reduce((sum, g) => sum + g.AB, 0);
      const recentHitRate = recentAbs > 0 ? recentHits / recentAbs : 0;
      
      const earlyHits = earlierHalf.reduce((sum, g) => sum + g.H, 0);
      const earlyAbs = earlierHalf.reduce((sum, g) => sum + g.AB, 0);
      const earlyHitRate = earlyAbs > 0 ? earlyHits / earlyAbs : 0;
      
      recentStats.hit_rate_trend = {
        early_val: Math.round(earlyHitRate * 1000) / 1000,
        recent_val: Math.round(recentHitRate * 1000) / 1000,
        direction: recentHitRate > earlyHitRate ? 'improving' : 
                  recentHitRate < earlyHitRate ? 'declining' : 'stable',
        magnitude: Math.abs(recentHitRate - earlyHitRate)
      };
    }
  }
  
  return recentStats;
};

// Get last N games performance for a player
export const getLastNGamesPerformance = (playerFullNameResolved, dailyData, rosterDataList, nGames = 7) => {
  // Find player's name as used in daily data
  let dailyPlayerJsonName = null;
  
  for (const playerRoster of rosterDataList) {
    if (playerRoster.fullName_cleaned === playerFullNameResolved || 
        playerRoster.fullName === playerFullNameResolved) {
      dailyPlayerJsonName = playerRoster.name;
      break;
    }
  }
  
  // If not found via roster match, search in daily data
  if (!dailyPlayerJsonName && Object.keys(dailyData).length > 0) {
    const tempDates = Object.keys(dailyData).sort().reverse().slice(0, 5);
    for (const dateStr of tempDates) {
      const dayData = dailyData[dateStr];
      for (const playerDaily of (dayData.players || [])) {
        const resolvedName = matchPlayerNameToRoster(
          cleanPlayerName(playerDaily.name),
          rosterDataList
        );
        if (resolvedName === playerFullNameResolved) {
          dailyPlayerJsonName = playerDaily.name;
          break;
        }
      }
      if (dailyPlayerJsonName) break;
    }
  }
  
  if (!dailyPlayerJsonName) {
    return [];
  }
  
  // Collect games in chronological order
  const gamesChronological = [];
  const sortedDates = Object.keys(dailyData).sort();
  
  for (const dateStr of sortedDates) {
    const dayData = dailyData[dateStr];
    let playerDataToday = null;
    
    for (const playerInDay of (dayData.players || [])) {
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
          AVG: parseFloat(playerDataToday.AVG || 0),
          OBP: parseFloat(playerDataToday.OBP || 0),
          SLG: parseFloat(playerDataToday.SLG || 0),
          HBP: parseInt(playerDataToday.HBP || 0),
          SF: parseInt(playerDataToday.SF || 0),
          SAC: parseInt(playerDataToday.SAC || 0)
        };
        gamesChronological.push(gameStats);
      } catch (error) {
        console.error(`Error parsing game data for ${dateStr}:`, error);
      }
    }
  }
  
  // Return last N games in reverse chronological order
  return gamesChronological.slice(-nGames).reverse();
};