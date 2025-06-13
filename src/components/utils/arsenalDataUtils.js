import Papa from 'papaparse';

/**
 * Load and parse arsenal CSV data for a specific year
 * @param {number} year - The year to load data for (default: 2025)
 * @returns {Object} Parsed and mapped arsenal data
 */
export const loadArsenalData = async (year = 2025) => {
  try {
    const [pitcherResponse, hitterResponse] = await Promise.all([
      fetch(`/data/stats/pitcherpitcharsenalstats_${year}.csv`),
      fetch(`/data/stats/hitterpitcharsenalstats_${year}.csv`)
    ]);

    if (!pitcherResponse.ok || !hitterResponse.ok) {
      throw new Error(`Failed to load arsenal data for year ${year}`);
    }

    const [pitcherText, hitterText] = await Promise.all([
      pitcherResponse.text(),
      hitterResponse.text()
    ]);

    // Parse CSV data with consistent options
    const parseOptions = {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      transformHeader: header => header.trim().replace(/"/g, '')
    };

    const pitcherData = Papa.parse(pitcherText, parseOptions);
    const hitterData = Papa.parse(hitterText, parseOptions);

    // Create lookup maps
    const pitcherArsenalMap = new Map();
    const hitterArsenalMap = new Map();

    // Process pitcher data
    pitcherData.data.forEach(row => {
      const fullName = row['last_name, first_name'] || `${row.last_name}, ${row.first_name}`;
      const playerId = row.player_id;
      const key = `${playerId}_${row.team_name_alt}`;
      
      if (!pitcherArsenalMap.has(key)) {
        pitcherArsenalMap.set(key, {
          playerId,
          fullName,
          team: row.team_name_alt,
          pitches: []
        });
      }
      
      pitcherArsenalMap.get(key).pitches.push({
        pitch_type: row.pitch_type,
        pitch_name: row.pitch_name,
        pitch_usage: row.pitch_usage || 0,
        pitches: row.pitches || 0,
        pa: row.pa || 0,
        ba: row.ba || 0,
        slg: row.slg || 0,
        woba: row.woba || 0,
        whiff_percent: row.whiff_percent || 0,
        k_percent: row.k_percent || 0,
        put_away: row.put_away || 0,
        est_ba: row.est_ba || 0,
        est_slg: row.est_slg || 0,
        est_woba: row.est_woba || 0,
        hard_hit_percent: row.hard_hit_percent || 0,
        run_value_per_100: row.run_value_per_100 || 0,
        run_value: row.run_value || 0
      });
    });

    // Process hitter data
    hitterData.data.forEach(row => {
      const fullName = row['last_name, first_name'] || `${row.last_name}, ${row.first_name}`;
      const playerId = row.player_id;
      const key = `${playerId}_${row.team_name_alt}`;
      
      if (!hitterArsenalMap.has(key)) {
        hitterArsenalMap.set(key, {
          playerId,
          fullName,
          team: row.team_name_alt,
          pitchStats: {}
        });
      }
      
      hitterArsenalMap.get(key).pitchStats[row.pitch_type] = {
        pitch_name: row.pitch_name,
        pitches: row.pitches || 0,
        pa: row.pa || 0,
        ba: row.ba || 0,
        slg: row.slg || 0,
        woba: row.woba || 0,
        whiff_percent: row.whiff_percent || 0,
        k_percent: row.k_percent || 0,
        hard_hit_percent: row.hard_hit_percent || 0,
        run_value_per_100: row.run_value_per_100 || 0
      };
    });

    return {
      pitcherArsenalMap,
      hitterArsenalMap,
      rawPitcherData: pitcherData.data,
      rawHitterData: hitterData.data
    };
  } catch (error) {
    console.error('Error loading arsenal data:', error);
    return {
      pitcherArsenalMap: new Map(),
      hitterArsenalMap: new Map(),
      rawPitcherData: [],
      rawHitterData: []
    };
  }
};

/**
 * Find pitcher arsenal data by name and team
 * @param {Map} pitcherArsenalMap - The pitcher arsenal map
 * @param {string} pitcherName - The pitcher's name (can be partial)
 * @param {string} team - The team abbreviation
 * @returns {Array|null} Array of pitch data or null if not found
 */
export const findPitcherArsenal = (pitcherArsenalMap, pitcherName, team) => {
  if (!pitcherArsenalMap || !pitcherName || !team) return null;

  // Clean the pitcher name
  const cleanName = pitcherName.trim().toLowerCase();
  
  // Try exact match first
  for (const [key, data] of pitcherArsenalMap) {
    if (data.team === team) {
      const fullNameLower = data.fullName.toLowerCase();
      if (fullNameLower.includes(cleanName) || cleanName.includes(fullNameLower.split(',')[0].trim())) {
        return data.pitches;
      }
    }
  }
  
  // Try last name only match
  for (const [key, data] of pitcherArsenalMap) {
    if (data.team === team) {
      const lastName = data.fullName.split(',')[0].trim().toLowerCase();
      if (cleanName.includes(lastName) || lastName.includes(cleanName)) {
        return data.pitches;
      }
    }
  }
  
  return null;
};

/**
 * Find hitter performance against specific pitch types
 * @param {Map} hitterArsenalMap - The hitter arsenal map
 * @param {string} hitterName - The hitter's name
 * @param {string} team - The team abbreviation
 * @returns {Object|null} Pitch type performance data or null
 */
export const findHitterPitchStats = (hitterArsenalMap, hitterName, team) => {
  if (!hitterArsenalMap || !hitterName || !team) return null;

  const cleanName = hitterName.trim().toLowerCase();
  
  for (const [key, data] of hitterArsenalMap) {
    if (data.team === team) {
      const fullNameLower = data.fullName.toLowerCase();
      if (fullNameLower.includes(cleanName) || cleanName.includes(fullNameLower.split(',')[0].trim())) {
        return data.pitchStats;
      }
    }
  }
  
  return null;
};

/**
 * Calculate matchup advantages between a pitcher's arsenal and a hitter
 * @param {Array} pitcherArsenal - Array of pitcher's pitches
 * @param {Object} hitterPitchStats - Hitter's performance vs pitch types
 * @returns {Object} Matchup analysis with recommendations
 */
export const calculateMatchupAdvantages = (pitcherArsenal, hitterPitchStats) => {
  if (!pitcherArsenal || !hitterPitchStats) return null;

  const matchupResults = [];
  let overallAdvantage = 0;

  pitcherArsenal.forEach(pitch => {
    const hitterStats = hitterPitchStats[pitch.pitch_type];
    
    if (hitterStats) {
      // Calculate advantage (positive = hitter advantage)
      const wobaDiff = hitterStats.woba - pitch.woba;
      const slgDiff = hitterStats.slg - pitch.slg;
      const whiffDiff = pitch.whiff_percent - hitterStats.whiff_percent;
      
      const advantage = (wobaDiff * 0.4) + (slgDiff * 0.3) + (whiffDiff * 0.003);
      
      matchupResults.push({
        pitch_type: pitch.pitch_type,
        pitch_name: pitch.pitch_name,
        usage: pitch.pitch_usage,
        advantage: advantage,
        hitterWoba: hitterStats.woba,
        pitcherWoba: pitch.woba,
        recommendation: advantage > 0.05 ? 'Target' : 
                       advantage < -0.05 ? 'Avoid' : 'Neutral'
      });
      
      // Weight by usage for overall advantage
      overallAdvantage += advantage * (pitch.pitch_usage / 100);
    }
  });

  // Sort by advantage (best for hitter first)
  matchupResults.sort((a, b) => b.advantage - a.advantage);

  return {
    matchups: matchupResults,
    overallAdvantage,
    bestPitchToTarget: matchupResults[0],
    worstPitchToFace: matchupResults[matchupResults.length - 1]
  };
};

/**
 * Get summary statistics for a pitcher's arsenal
 * @param {Array} pitcherArsenal - Array of pitcher's pitches
 * @returns {Object} Summary statistics
 */
export const getArsenalSummary = (pitcherArsenal) => {
  if (!pitcherArsenal || pitcherArsenal.length === 0) return null;

  const totalUsage = pitcherArsenal.reduce((sum, p) => sum + p.pitch_usage, 0);
  
  const weightedWhiff = pitcherArsenal.reduce((sum, p) => 
    sum + (p.whiff_percent * p.pitch_usage), 0) / totalUsage;
  
  const weightedK = pitcherArsenal.reduce((sum, p) => 
    sum + (p.k_percent * p.pitch_usage), 0) / totalUsage;
  
  const weightedHardHit = pitcherArsenal.reduce((sum, p) => 
    sum + (p.hard_hit_percent * p.pitch_usage), 0) / totalUsage;

  const primaryPitch = pitcherArsenal.reduce((max, p) => 
    p.pitch_usage > max.pitch_usage ? p : max);

  return {
    pitchCount: pitcherArsenal.length,
    avgWhiffPercent: weightedWhiff,
    avgKPercent: weightedK,
    avgHardHitPercent: weightedHardHit,
    primaryPitch: {
      type: primaryPitch.pitch_type,
      name: primaryPitch.pitch_name,
      usage: primaryPitch.pitch_usage
    },
    pitchMix: pitcherArsenal.map(p => ({
      type: p.pitch_type,
      name: p.pitch_name,
      usage: p.pitch_usage
    })).sort((a, b) => b.usage - a.usage)
  };
};