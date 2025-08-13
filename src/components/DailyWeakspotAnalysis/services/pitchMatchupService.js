/**
 * Pitch-Type Matchup Analysis Service
 * Analyzes hitter performance vs specific pitch types to identify optimal matchups
 */

class PitchMatchupService {
  constructor() {
    this.hitterPitchData = null;
    this.loadingPromise = null;
  }

  /**
   * Load hitter vs pitch type performance data
   */
  async loadHitterPitchData() {
    console.log('🔍 PITCH MATCHUP SERVICE: loadHitterPitchData called');
    if (this.hitterPitchData) {
      console.log('🔍 PITCH MATCHUP SERVICE: Returning cached data');
      return this.hitterPitchData;
    }
    
    if (this.loadingPromise) {
      console.log('🔍 PITCH MATCHUP SERVICE: Returning existing loading promise');
      return this.loadingPromise;
    }

    console.log('🔍 PITCH MATCHUP SERVICE: Starting fresh data load');
    this.loadingPromise = this._fetchHitterPitchData();
    this.hitterPitchData = await this.loadingPromise;
    return this.hitterPitchData;
  }

  async _fetchHitterPitchData() {
    try {
      console.log('📊 PITCH MATCHUP: Starting CSV data fetch...');
      const response = await fetch('/data/stats/hitterpitcharsenalstats_2025.csv');
      if (!response.ok) {
        throw new Error(`Failed to load hitter pitch data: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      console.log('📊 PITCH MATCHUP: CSV data fetched, parsing...');
      const parsedData = this._parseCSV(csvText);
      console.log('📊 PITCH MATCHUP: CSV parsing complete');
      return parsedData;
    } catch (error) {
      console.error('❌ PITCH MATCHUP: Error loading hitter pitch data:', error);
      return {};
    }
  }

  _parseCSV(csvText) {
    // Remove BOM if present
    const cleanedText = csvText.replace(/^\uFEFF/, '');
    const lines = cleanedText.trim().split('\n');
    const headers = this._parseCSVLine(lines[0]);
    const data = {};

    // Debug: Log the actual headers to see what we're working with
    console.log('📊 PARSED CSV HEADERS:', headers.map(h => `"${h}"`));

    for (let i = 1; i < lines.length; i++) {
      const values = this._parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;

      const row = {};
      headers.forEach((header, index) => {
        // Clean headers by removing quotes and trimming
        const cleanHeader = header.replace(/"/g, '').trim();
        row[cleanHeader] = values[index]?.replace(/"/g, '').trim();
      });

      // Extract player name and normalize it
      const fullName = row['last_name, first_name'];
      if (!fullName) continue;

      // Parse "Last, First" format
      const nameParts = fullName.split(',');
      if (nameParts.length !== 2) continue;

      const lastName = nameParts[0].trim();
      const firstName = nameParts[1].trim();
      const playerName = `${firstName} ${lastName}`;
      const csvFormatName = `${lastName}, ${firstName}`;
      const pitchType = row['pitch_type'];

      // Debug logging for the first few players
      if (i <= 5) {
        console.log(`📊 CSV parsing: "${fullName}" → "${playerName}" (CSV: "${csvFormatName}") | pitchType: "${pitchType}"`);
        console.log(`📊 Raw row data:`, row);
      }

      // Skip if no pitch type
      if (!pitchType) {
        if (i <= 5) {
          console.log(`❌ SKIPPING row ${i}: No pitch type found`);
        }
        continue;
      }

      // Store under both name formats for flexible matching
      const playerStats = {
        pitch_name: row['pitch_name'],
        ba: parseFloat(row['ba']) || 0,
        slg: parseFloat(row['slg']) || 0,
        woba: parseFloat(row['woba']) || 0,
        whiff_percent: parseFloat(row['whiff_percent']) || 0,
        k_percent: parseFloat(row['k_percent']) || 0,
        hard_hit_percent: parseFloat(row['hard_hit_percent']) || 0,
        run_value_per_100: parseFloat(row['run_value_per_100']) || 0,
        pitches: parseInt(row['pitches']) || 0,
        team: row['team_name_alt']
      };

      // Store under "Firstname Lastname" format (standard)
      if (!data[playerName]) {
        data[playerName] = {};
      }
      data[playerName][pitchType] = playerStats;

      // Also store under "Lastname, Firstname" format for direct CSV matching
      if (!data[csvFormatName]) {
        data[csvFormatName] = {};
      }
      data[csvFormatName][pitchType] = playerStats;
    }

    const totalEntries = Object.keys(data).length;
    const uniquePlayers = Math.floor(totalEntries / 2); // Rough estimate since we store each player twice
    console.log(`📊 Loaded hitter pitch data: ${totalEntries} total entries (~${uniquePlayers} unique players)`);
    console.log('📝 Sample player names:', Object.keys(data).slice(0, 8));
    return data;
  }

  _parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Test function to verify name matching works for specific players
   */
  async testNameMatching(testNames = ['Jackson Holliday', 'Gunnar Henderson', 'Adley Rutschman']) {
    const hitterData = await this.loadHitterPitchData();
    if (!hitterData) {
      console.log('❌ No hitter data available for testing');
      return;
    }

    console.log('\n🧪 TESTING NAME MATCHING:');
    console.log('============================');
    
    testNames.forEach(name => {
      console.log(`\n🔍 Testing: "${name}"`);
      const result = this._findHitterStats(name, hitterData);
      if (result) {
        const pitchTypes = Object.keys(result);
        console.log(`✅ FOUND! Available pitch types: ${pitchTypes.join(', ')}`);
      } else {
        console.log(`❌ NOT FOUND for: "${name}"`);
      }
    });
    
    console.log('\n============================\n');
  }

  /**
   * Create pitch type mapping between API vulnerability names and CSV data names
   * Based on actual API responses and CSV data analysis
   */
  _createPitchTypeMapping() {
    return {
      // API vulnerability names → CSV pitch_type codes (based on actual data)
      
      // Fastball variants
      'Four-seam FB': 'FF',        // API → CSV: 4-Seam Fastball
      'Four-Seam Fastball': 'FF',
      'Fourseam FB': 'FF',
      'Fastball': 'FF',
      'FF': 'FF',
      
      // Sinker
      'Sinker': 'SI',              // API → CSV: Sinker
      'Two-seam FB': 'SI',
      'SI': 'SI',
      
      // Slider
      'Slider': 'SL',              // API → CSV: Slider
      'SL': 'SL',
      
      // Changeup
      'Changeup': 'CH',            // API → CSV: Changeup
      'Change': 'CH',
      'CH': 'CH',
      
      // Curveball variants
      'Curveball': 'CU',           // API → CSV: Curveball
      'Curve': 'CU',               // API → CSV: Curveball
      'Knuckle Curve': 'CU',       // API → CSV: Curveball (knuckle curve is curveball variant)
      'CU': 'CU',
      
      // Cutter
      'Cutter': 'FC',              // API → CSV: Cutter
      'Cut FB': 'FC',
      'FC': 'FC',
      
      // Splitter/Split-finger
      'Splitter': 'CH',            // API "Splitter" → CSV: Map to Changeup (closest available)
      'Split': 'CH',               // Note: No FS in CSV data, so map to similar pitch
      'FS': 'CH',
      
      // Sweeper (new pitch type)
      'Sweeper': 'ST',             // API → CSV: Sweeper
      'ST': 'ST',
      
      // Knuckleball (rare)
      'Knuckleball': 'CU',         // Map to curveball as closest available
      'KN': 'CU'
    };
  }

  /**
   * Map API pitch type to CSV pitch type
   */
  _mapPitchType(apiPitchType) {
    const mapping = this._createPitchTypeMapping();
    const mapped = mapping[apiPitchType] || apiPitchType;
    
    if (mapped !== apiPitchType) {
      console.log(`🎯 PITCH TYPE MAPPING: "${apiPitchType}" → "${mapped}"`);
    }
    
    return mapped;
  }

  /**
   * Analyze optimal pitch-type matchups between pitcher vulnerabilities and hitter strengths
   */
  async analyzeOptimalMatchups(pitcherVulnerabilities, opposingTeam, lineupData) {
    console.log('⚡ OPTIMAL MATCHUPS: Starting analysis...');
    console.log('⚡ OPTIMAL MATCHUPS: Pitcher vulnerabilities:', pitcherVulnerabilities);
    console.log('⚡ OPTIMAL MATCHUPS: Opposing team:', opposingTeam);
    console.log('⚡ OPTIMAL MATCHUPS: Lineup data:', lineupData);
    
    const hitterData = await this.loadHitterPitchData();
    console.log('⚡ OPTIMAL MATCHUPS: Hitter data loaded:', Object.keys(hitterData).length, 'players');
    
    if (!hitterData || !pitcherVulnerabilities) {
      console.log('⚡ OPTIMAL MATCHUPS: Early return - missing data');
      return [];
    }

    const optimalMatchups = [];
    
    // Get lineup hitters for the opposing team
    const lineup = this._getTeamLineup(opposingTeam, lineupData);
    console.log('⚡ OPTIMAL MATCHUPS: Lineup for', opposingTeam, ':', lineup);
    if (!lineup) {
      console.log('⚡ OPTIMAL MATCHUPS: No lineup found for', opposingTeam);
      return [];
    }

    // Analyze each pitch type vulnerability
    const apiPitchTypes = Object.keys(pitcherVulnerabilities);
    console.log(`🎯 ANALYZING PITCH VULNERABILITIES: ${apiPitchTypes.join(', ')}`);
    
    // Show all pitch type mappings upfront
    console.log('🎯 PITCH TYPE MAPPINGS:');
    apiPitchTypes.forEach(apiType => {
      const csvType = this._mapPitchType(apiType);
      const mapped = csvType !== apiType ? '✓ MAPPED' : '→ DIRECT';
      console.log(`   "${apiType}" → "${csvType}" ${mapped}`);
    });
    console.log(`🎯 TOTAL API PITCH TYPES: ${apiPitchTypes.length}`);
    
    Object.entries(pitcherVulnerabilities).forEach(([apiPitchType, pitcherData]) => {
      console.log(`🎯 CHECKING PITCH TYPE: ${apiPitchType} with vulnerability score ${pitcherData.vulnerability_score}`);
      if (pitcherData.vulnerability_score < 5) {
        console.log(`❌ SKIPPING ${apiPitchType} - vulnerability score too low (${pitcherData.vulnerability_score} < 5)`);
        return; // Skip low vulnerabilities
      }
      console.log(`✅ ANALYZING ${apiPitchType} - vulnerability score ${pitcherData.vulnerability_score} >= 5`);
      
      // Map API pitch type to CSV pitch type
      const csvPitchType = this._mapPitchType(apiPitchType);

      // Find hitters who perform well against this pitch type
      lineup.forEach((hitter, index) => {
        const hitterStats = this._findHitterStats(hitter.name, hitterData);
        console.log(`🔍 HITTER STATS CHECK: ${hitter.name} has stats: ${!!hitterStats}, has ${apiPitchType}→${csvPitchType}: ${!!(hitterStats && hitterStats[csvPitchType])}`);
        
        // Debug: show what pitch types this hitter actually has
        if (hitterStats && index === 0) { // Only log for first hitter to avoid spam
          console.log(`🎯 AVAILABLE PITCH TYPES for ${hitter.name}:`, Object.keys(hitterStats));
        }
        
        if (!hitterStats || !hitterStats[csvPitchType]) {
          console.log(`❌ SKIPPING ${hitter.name} vs ${apiPitchType}→${csvPitchType} - no pitch type data`);
          return;
        }

        const hitterPitchStats = hitterStats[csvPitchType];
        console.log(`✅ FOUND DATA: ${hitter.name} vs ${apiPitchType}→${csvPitchType} - wOBA: ${hitterPitchStats.woba}, pitches: ${hitterPitchStats.pitches}`);
        
        // Calculate matchup opportunity score
        console.log(`🔢 CALCULATING OPPORTUNITY SCORE for ${hitter.name} vs ${apiPitchType}...`);
        const opportunityScore = this._calculateOpportunityScore(
          pitcherData,
          hitterPitchStats,
          index + 1 // batting position
        );

        console.log(`🎯 OPPORTUNITY CALC: ${hitter.name} vs ${apiPitchType} = ${opportunityScore.score.toFixed(1)}% (threshold: 60%)`);

        if (opportunityScore.score > 60) { // Restored to normal threshold
          console.log(`🎯 HIGH OPPORTUNITY FOUND: ${hitter.name} vs ${apiPitchType} = ${opportunityScore.score.toFixed(1)}%`);
          optimalMatchups.push({
            hitter: hitter.name,
            battingPosition: index + 1,
            pitchType: apiPitchType, // Display the original API pitch type name
            pitchName: hitterPitchStats.pitch_name,
            pitcherVulnerability: pitcherData.vulnerability_score,
            hitterStrength: hitterPitchStats.woba,
            opportunityScore: opportunityScore.score,
            reasoning: opportunityScore.reasoning,
            stats: {
              pitcher: {
                hr_rate: (pitcherData.hr_rate * 100).toFixed(1),
                hit_rate: (pitcherData.hit_rate * 100).toFixed(1),
                sample_size: pitcherData.sample_size
              },
              hitter: {
                ba: hitterPitchStats.ba.toFixed(3),
                slg: hitterPitchStats.slg.toFixed(3),
                woba: hitterPitchStats.woba.toFixed(3),
                hard_hit_percent: hitterPitchStats.hard_hit_percent.toFixed(1),
                sample_size: hitterPitchStats.pitches
              }
            }
          });
        }
      });
    });

    // Sort by opportunity score descending
    const sortedMatchups = optimalMatchups.sort((a, b) => b.opportunityScore - a.opportunityScore);
    
    console.log(`🎯 FINAL ANALYSIS RESULTS: Found ${sortedMatchups.length} optimal matchups above 60% threshold`);
    if (sortedMatchups.length > 0) {
      console.log('🎯 TOP MATCHUPS:', sortedMatchups.slice(0, 3).map(m => `${m.hitter} vs ${m.pitchType} (${m.opportunityScore.toFixed(1)}%)`));
    }
    
    return sortedMatchups;
  }

  _getTeamLineup(teamAbbr, lineupData) {
    if (!lineupData || !teamAbbr) {
      console.log('🎯 _getTeamLineup: Missing data - teamAbbr:', teamAbbr, 'lineupData:', !!lineupData);
      return [];
    }

    console.log('🎯 _getTeamLineup: Looking for team:', teamAbbr);
    console.log('🎯 _getTeamLineup: Available games:', lineupData.games?.length || 0);
    
    if (lineupData.games) {
      lineupData.games.forEach((game, idx) => {
        console.log(`🎯 _getTeamLineup: Game ${idx + 1}: ${game.teams?.away?.abbr} @ ${game.teams?.home?.abbr}`);
      });
    }

    const game = lineupData.games?.find(g => 
      g.teams?.away?.abbr === teamAbbr || g.teams?.home?.abbr === teamAbbr
    );

    if (!game) {
      console.log('🎯 _getTeamLineup: No game found for team:', teamAbbr);
      return [];
    }

    console.log('🎯 _getTeamLineup: Found game for', teamAbbr);
    const isAway = game.teams?.away?.abbr === teamAbbr;
    const lineup = isAway ? game.lineups?.away : game.lineups?.home;
    
    // Handle both 'batters' and 'batting_order' data structures
    let batters = [];
    if (lineup?.batters) {
      // Legacy structure
      batters = lineup.batters.sort((a, b) => a.batting_order - b.batting_order);
    } else if (lineup?.batting_order) {
      // Current structure - convert to expected format
      batters = lineup.batting_order.map(batter => ({
        name: batter.name,
        batting_order: batter.position, // position field maps to batting_order
        fieldPosition: batter.fieldPosition,
        handedness: batter.handedness
      })).sort((a, b) => a.batting_order - b.batting_order);
    }
    
    console.log(`🎯 _getTeamLineup: Found ${batters.length} batters for ${teamAbbr}:`, batters.map(b => `${b.batting_order}: ${b.name}`));
    
    return batters;
  }

  _findHitterStats(hitterName, hitterData) {
    console.log(`🔍 Looking for hitter: "${hitterName}"`);
    console.log('📋 Available players:', Object.keys(hitterData).slice(0, 5).join(', '), '...');
    
    // Try exact match first
    if (hitterData[hitterName]) {
      console.log(`✅ Exact match found for: ${hitterName}`);
      return hitterData[hitterName];
    }

    // Parse the input name into components
    const nameParts = hitterName.split(' ');
    if (nameParts.length < 2) {
      console.log(`❌ Invalid name format: ${hitterName}`);
      return null;
    }

    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    // Create comprehensive name variations to try
    const variations = [
      // Standard format
      `${firstName} ${lastName}`,
      
      // Initial format
      `${firstName.charAt(0)}. ${lastName}`,
      
      // Remove periods
      hitterName.replace(/\./g, ''),
      
      // CSV format (Lastname, Firstname) - key format that was missing
      `${lastName}, ${firstName}`,
      
      // Reverse CSV format parsing (in case data has this format)
      `${firstName} ${lastName}`,
      
      // Handle middle names/initials
      nameParts.length > 2 ? `${firstName} ${nameParts.slice(1).join(' ')}` : null,
      
      // Handle Jr./Sr. suffixes
      `${firstName} ${lastName.replace(/\s+(Jr|Sr|III|II)\.?$/i, '')}`,
    ].filter(Boolean);

    console.log(`🔄 Trying variations for "${hitterName}":`, variations);

    // Try each variation
    for (const variation of variations) {
      if (hitterData[variation]) {
        console.log(`✅ Match found with variation: "${variation}" for original: "${hitterName}"`);
        return hitterData[variation];
      }
    }

    // Try partial matching on last name (case insensitive)
    const lastNameLower = lastName.toLowerCase();
    const partialMatch = Object.keys(hitterData).find(name => {
      const nameLower = name.toLowerCase();
      return nameLower.includes(lastNameLower) || 
             nameLower.includes(firstName.toLowerCase()) ||
             // Check if it's a CSV format name that contains our components
             (nameLower.includes(',') && 
              nameLower.includes(lastNameLower) && 
              nameLower.includes(firstName.toLowerCase()));
    });

    if (partialMatch) {
      console.log(`✅ Partial match found: "${partialMatch}" for original: "${hitterName}"`);
      return hitterData[partialMatch];
    }

    // Enhanced fuzzy matching for similar names
    const fuzzyMatch = Object.keys(hitterData).find(name => {
      const dataNameParts = name.toLowerCase().replace(/[,.]/g, '').split(/\s+/);
      
      // Check if first and last name match in any order
      return dataNameParts.includes(firstName.toLowerCase()) && 
             dataNameParts.includes(lastName.toLowerCase());
    });

    if (fuzzyMatch) {
      console.log(`✅ Fuzzy match found: "${fuzzyMatch}" for original: "${hitterName}"`);
      return hitterData[fuzzyMatch];
    }

    console.log(`❌ No match found for: "${hitterName}"`);
    console.log(`📝 Sample available names:`, Object.keys(hitterData).slice(0, 10));
    return null;
  }

  _calculateOpportunityScore(pitcherData, hitterData, battingPosition) {
    // Base score from pitcher vulnerability and hitter performance
    const pitcherVuln = pitcherData.vulnerability_score;
    
    // Fix wOBA scaling: 0.25-0.45 range mapped to 0-100 scale
    // Average MLB wOBA is ~0.320, excellent is 0.400+
    const wobaScaled = Math.max(0, Math.min(100, 
      ((hitterData.woba - 0.250) / (0.450 - 0.250)) * 100
    ));
    
    // Enhanced formula: balance pitcher vulnerability and hitter strength
    // Target range: 30-90% for realistic matchups
    let score = (pitcherVuln * 8) + (wobaScaled * 0.6);
    
    console.log(`🔢 SCORE CALC: PitcherVuln=${pitcherVuln.toFixed(1)} (x8=${(pitcherVuln*8).toFixed(1)}), HitterWOBA=${hitterData.woba.toFixed(3)} → Scaled=${wobaScaled.toFixed(1)}, Base=${score.toFixed(1)}`);
    
    // Bonus factors
    const bonuses = [];
    
    // High HR rate vulnerability + good hitter power
    if (pitcherData.hr_rate > 0.05 && hitterData.slg > 0.5) {
      score += 15;
      bonuses.push('High HR potential');
    }
    
    // Low strikeout rate vulnerability + low whiff hitter
    if (pitcherData.strikeout_rate < 0.2 && hitterData.whiff_percent < 20) {
      score += 10;
      bonuses.push('Contact advantage');
    }
    
    // Prime batting position bonus (3-5 spots)
    if ([3, 4, 5].includes(battingPosition)) {
      score += 8;
      bonuses.push('Prime batting position');
    }
    
    // Hard hit percentage advantage
    if (hitterData.hard_hit_percent > 40) {
      score += 5;
      bonuses.push('Hard contact hitter');
    }
    
    // Sample size confidence
    if (pitcherData.sample_size < 10 || hitterData.pitches < 50) {
      score -= 10;
      bonuses.push('Limited sample size');
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      reasoning: bonuses.join(', ') || 'Standard matchup metrics'
    };
  }
}

// Create singleton instance
export const pitchMatchupService = new PitchMatchupService();

// Export test functions for debugging
window.testPitchMatchup = () => pitchMatchupService.testNameMatching();
window.testCSVParsing = async () => {
  console.log('🧪 TESTING CSV PARSING...');
  const data = await pitchMatchupService.loadHitterPitchData();
  
  // Test a few players to see their pitch types
  const testPlayers = ['Francisco Lindor', 'Cal Raleigh', 'TJ Friedl'];
  testPlayers.forEach(player => {
    const stats = pitchMatchupService._findHitterStats(player, data);
    if (stats) {
      const pitchTypes = Object.keys(stats);
      console.log(`🎯 ${player} pitch types:`, pitchTypes);
    } else {
      console.log(`❌ No stats found for ${player}`);
    }
  });
  
  return data;
};

export default pitchMatchupService;