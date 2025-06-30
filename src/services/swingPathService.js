// swingPathService.js - Manages swing path data with handedness awareness
import * as Papa from 'papaparse';

class SwingPathService {
  constructor() {
    this.cache = {
      rhp: null,
      lhp: null,
      combined: null,
      lastUpdate: null
    };
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async loadSwingPathData(handedness = 'BOTH') {
    const now = Date.now();
    
    // Check cache validity
    if (this.cache.lastUpdate && (now - this.cache.lastUpdate) < this.cacheTimeout) {
      if (handedness === 'RHP' && this.cache.rhp) return this.cache.rhp;
      if (handedness === 'LHP' && this.cache.lhp) return this.cache.lhp;
      if (handedness === 'BOTH' && this.cache.combined) return this.cache.combined;
    }

    try {
      // Load RHP data if needed
      if (!this.cache.rhp || handedness === 'RHP' || handedness === 'BOTH') {
        const rhpData = await this.loadCSVData('/data/stats/bat-tracking-swing-path-RHP.csv');
        this.cache.rhp = this.processSwingData(rhpData, 'RHP');
      }

      // Load LHP data if needed
      if (!this.cache.lhp || handedness === 'LHP' || handedness === 'BOTH') {
        const lhpData = await this.loadCSVData('/data/stats/bat-tracking-swing-path-LHP.csv');
        this.cache.lhp = this.processSwingData(lhpData, 'LHP');
      }

      // Combine data if needed
      if (handedness === 'BOTH' && (!this.cache.combined || !this.cache.lastUpdate)) {
        this.cache.combined = this.mergePlayerStats(this.cache.rhp, this.cache.lhp);
      }

      this.cache.lastUpdate = now;

      // Return requested data
      if (handedness === 'RHP') return this.cache.rhp;
      if (handedness === 'LHP') return this.cache.lhp;
      return this.cache.combined;

    } catch (error) {
      console.error('Error loading swing path data:', error);
      return new Map();
    }
  }

  async loadCSVData(filepath) {
    console.log(`🔄 Loading CSV data from: ${filepath}`);
    
    try {
      // First, try to fetch the file to check if it exists
      const response = await fetch(filepath);
      console.log(`📡 Fetch response status: ${response.status} for ${filepath}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      console.log(`📄 CSV text length: ${csvText.length} characters`);
      console.log(`📄 First 200 chars: ${csvText.substring(0, 200)}`);
      
      // Now parse with Papa Parse
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.error('CSV parsing errors:', results.errors);
            }
            console.log(`✅ CSV parsed: ${results.data.length} rows from ${filepath}`);
            console.log('Sample row:', results.data[0]);
            resolve(results.data);
          },
          error: (error) => {
            console.error(`❌ CSV parsing error for ${filepath}:`, error);
            reject(error);
          }
        });
      });
      
    } catch (error) {
      console.error(`❌ CSV loading error for ${filepath}:`, error);
      throw error;
    }
  }

  processSwingData(data, handedness) {
    console.log(`🔄 Processing ${data.length} swing path records for ${handedness}`);
    const playerMap = new Map();

    data.forEach((row, index) => {
      if (!row.name || !row.id) return;

      // Convert "Lastname, Firstname" to "Firstname Lastname" for matching
      const convertedName = this.convertNameFormat(row.name);
      
      if (index < 3) { // Log first 3 for debugging
        console.log(`Name conversion: "${row.name}" → "${convertedName}"`);
      }

      const playerData = {
        id: row.id,
        name: convertedName,
        originalName: row.name, // Keep original for reference
        side: row.side,
        avgBatSpeed: parseFloat(row.avg_bat_speed) || 0,
        swingTilt: parseFloat(row.swing_tilt) || 0,
        attackAngle: parseFloat(row.attack_angle) || 0,
        attackDirection: parseFloat(row.attack_direction) || 0,
        idealAttackAngleRate: parseFloat(row.ideal_attack_angle_rate) || 0,
        competitiveSwings: parseInt(row.competitive_swings) || 0,
        handedness: handedness,
        
        // Calculate derived metrics
        batSpeedPercentile: 0, // Will be calculated after all data loaded
        isIdealAttackAngle: row.attack_angle >= 5 && row.attack_angle <= 20,
        pullTendency: this.categorizePullTendency(row.attack_direction),
        swingOptimizationScore: 0 // Will be calculated
      };

      // Store with converted name for matching
      playerMap.set(convertedName, playerData);
    });

    // Calculate percentiles and scores
    this.calculatePercentiles(playerMap);
    this.calculateOptimizationScores(playerMap);

    console.log(`✅ Processed ${playerMap.size} players for ${handedness}`);
    console.log('Sample players:', Array.from(playerMap.keys()).slice(0, 5));

    return playerMap;
  }

  convertNameFormat(csvName) {
    // Convert "Lastname, Firstname" to "Firstname Lastname"
    if (csvName.includes(',')) {
      const [lastname, firstname] = csvName.split(',').map(part => part.trim());
      return `${firstname} ${lastname}`;
    }
    return csvName; // Return as-is if no comma found
  }

  categorizePullTendency(attackDirection) {
    if (attackDirection < -10) return 'extreme_pull';
    if (attackDirection < -5) return 'pull';
    if (attackDirection < 5) return 'balanced';
    if (attackDirection < 10) return 'oppo';
    return 'extreme_oppo';
  }

  calculatePercentiles(playerMap) {
    const speeds = Array.from(playerMap.values()).map(p => p.avgBatSpeed).sort((a, b) => a - b);
    
    playerMap.forEach(player => {
      const rank = speeds.findIndex(speed => speed >= player.avgBatSpeed);
      player.batSpeedPercentile = (rank / speeds.length) * 100;
    });
  }

  calculateOptimizationScores(playerMap) {
    playerMap.forEach(player => {
      // Swing Optimization Score (0-100)
      const batSpeedScore = player.batSpeedPercentile * 0.4; // 40% weight
      const attackAngleScore = player.idealAttackAngleRate * 100 * 0.3; // 30% weight
      const consistencyScore = Math.min(player.competitiveSwings / 400, 1) * 100 * 0.15; // 15% weight
      const powerScore = (player.attackAngle > 10 && player.attackAngle < 25) ? 15 : 0; // 15% weight for power angle
      
      player.swingOptimizationScore = Math.round(
        batSpeedScore + attackAngleScore + consistencyScore + powerScore
      );
    });
  }

  mergePlayerStats(rhpMap, lhpMap) {
    const combinedMap = new Map();
    const allPlayers = new Set([...rhpMap.keys(), ...lhpMap.keys()]);

    allPlayers.forEach(playerName => {
      const rhpData = rhpMap.get(playerName);
      const lhpData = lhpMap.get(playerName);

      if (rhpData && lhpData) {
        // Weight by competitive swings
        const totalSwings = rhpData.competitiveSwings + lhpData.competitiveSwings;
        const rhpWeight = rhpData.competitiveSwings / totalSwings;
        const lhpWeight = lhpData.competitiveSwings / totalSwings;

        const combined = {
          id: rhpData.id,
          name: playerName,
          side: rhpData.side,
          avgBatSpeed: rhpData.avgBatSpeed * rhpWeight + lhpData.avgBatSpeed * lhpWeight,
          swingTilt: rhpData.swingTilt * rhpWeight + lhpData.swingTilt * lhpWeight,
          attackAngle: rhpData.attackAngle * rhpWeight + lhpData.attackAngle * lhpWeight,
          attackDirection: rhpData.attackDirection * rhpWeight + lhpData.attackDirection * lhpWeight,
          idealAttackAngleRate: rhpData.idealAttackAngleRate * rhpWeight + lhpData.idealAttackAngleRate * lhpWeight,
          competitiveSwings: totalSwings,
          handedness: 'BOTH',
          
          // Store split data
          splits: {
            rhp: rhpData,
            lhp: lhpData,
            differential: {
              batSpeed: rhpData.avgBatSpeed - lhpData.avgBatSpeed,
              attackAngle: rhpData.attackAngle - lhpData.attackAngle,
              idealRate: rhpData.idealAttackAngleRate - lhpData.idealAttackAngleRate
            }
          },
          
          // Combined metrics
          batSpeedPercentile: (rhpData.batSpeedPercentile + lhpData.batSpeedPercentile) / 2,
          swingOptimizationScore: Math.round(
            rhpData.swingOptimizationScore * rhpWeight + lhpData.swingOptimizationScore * lhpWeight
          )
        };

        combined.pullTendency = this.categorizePullTendency(combined.attackDirection);
        combinedMap.set(playerName, combined);
      } else {
        // Only one split available
        combinedMap.set(playerName, rhpData || lhpData);
      }
    });

    return combinedMap;
  }

  getPlayerSwingData(playerName, handedness = 'BOTH') {
    console.log(`🔍 Looking up swing data for: "${playerName}" (${handedness})`);
    
    const dataMap = handedness === 'RHP' ? this.cache.rhp :
                    handedness === 'LHP' ? this.cache.lhp :
                    this.cache.combined;
    
    if (!dataMap) {
      console.log(`❌ No data map available for ${handedness}`);
      return null;
    }

    console.log(`📊 Data map has ${dataMap.size} players`);

    // Try exact match first
    let playerData = dataMap.get(playerName);
    if (playerData) {
      console.log(`✅ Found exact match for "${playerName}"`);
      return playerData;
    }
    
    // If not found, try different name formats and fuzzy matching
    if (!playerData) {
      // Try converting the search name to CSV format ("Firstname Lastname" to "Lastname, Firstname")
      const csvFormatName = this.convertToCsvFormat(playerName);
      
      // Search through all entries with multiple strategies
      for (const [name, data] of dataMap.entries()) {
        // Strategy 1: Check original CSV name (stored in originalName)
        if (data.originalName && this.namesMatch(data.originalName, csvFormatName)) {
          playerData = data;
          break;
        }
        
        // Strategy 2: Fuzzy matching on converted names
        if (this.namesMatch(name, playerName)) {
          playerData = data;
          break;
        }
        
        // Strategy 3: Partial name matching (for nicknames, abbreviations)
        if (this.partialNameMatch(name, playerName)) {
          playerData = data;
          break;
        }
      }
    }

    if (playerData) {
      console.log(`✅ Found match for "${playerName}" via fuzzy matching`);
    } else {
      console.log(`❌ No match found for "${playerName}"`);
    }

    return playerData;
  }

  convertToCsvFormat(playerName) {
    // Convert "Firstname Lastname" to "Lastname, Firstname"
    const parts = playerName.trim().split(' ');
    if (parts.length >= 2) {
      const firstname = parts.slice(0, -1).join(' '); // Handle middle names
      const lastname = parts[parts.length - 1];
      return `${lastname}, ${firstname}`;
    }
    return playerName;
  }

  namesMatch(name1, name2) {
    if (!name1 || !name2) return false;
    
    const normalize = (name) => name.toLowerCase()
      .replace(/[^a-z\s]/g, '') // Remove non-alphabetic except spaces
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim();
    
    const normalized1 = normalize(name1);
    const normalized2 = normalize(name2);
    
    return normalized1 === normalized2;
  }

  partialNameMatch(name1, name2) {
    if (!name1 || !name2) return false;
    
    const normalize = (name) => name.toLowerCase().replace(/[^a-z]/g, '');
    const normalized1 = normalize(name1);
    const normalized2 = normalize(name2);
    
    // Check if either name is contained in the other (for nicknames/abbreviations)
    return normalized1.includes(normalized2) || normalized2.includes(normalized1);
  }

  analyzePullTendencyWithPark(attackDirection, ballpark) {
    const pullCategory = this.categorizePullTendency(attackDirection);
    
    // This would be enhanced with actual ballpark dimension data
    const parkFactors = {
      'Yankee Stadium': { pull: 1.2, oppo: 0.9 }, // Short porch in right
      'Fenway Park': { pull: 1.1, oppo: 0.8 },    // Green Monster
      // Add more parks...
    };

    const factor = parkFactors[ballpark] || { pull: 1.0, oppo: 1.0 };
    
    let alignmentScore = 1.0;
    if (pullCategory.includes('pull') && factor.pull > 1.0) {
      alignmentScore = factor.pull;
    } else if (pullCategory.includes('oppo') && factor.oppo > 1.0) {
      alignmentScore = factor.oppo;
    }

    return {
      category: pullCategory,
      alignmentScore,
      favorable: alignmentScore > 1.0
    };
  }

  getTopSwingPathPlayers(handedness = 'BOTH', limit = 10) {
    const dataMap = handedness === 'RHP' ? this.cache.rhp :
                    handedness === 'LHP' ? this.cache.lhp :
                    this.cache.combined;
    
    if (!dataMap) return [];

    const players = Array.from(dataMap.values())
      .filter(p => p.competitiveSwings >= 100) // Minimum sample size
      .sort((a, b) => b.swingOptimizationScore - a.swingOptimizationScore)
      .slice(0, limit);

    return players;
  }
}

const swingPathService = new SwingPathService();
export default swingPathService;