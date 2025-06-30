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
    return new Promise((resolve, reject) => {
      Papa.parse(filepath, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  processSwingData(data, handedness) {
    const playerMap = new Map();

    data.forEach(row => {
      if (!row.name || !row.id) return;

      const playerData = {
        id: row.id,
        name: row.name,
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

      playerMap.set(row.name, playerData);
    });

    // Calculate percentiles and scores
    this.calculatePercentiles(playerMap);
    this.calculateOptimizationScores(playerMap);

    return playerMap;
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
    const dataMap = handedness === 'RHP' ? this.cache.rhp :
                    handedness === 'LHP' ? this.cache.lhp :
                    this.cache.combined;
    
    if (!dataMap) return null;

    // Try exact match first
    let playerData = dataMap.get(playerName);
    
    // If not found, try fuzzy matching
    if (!playerData) {
      const normalizedSearch = playerName.toLowerCase().replace(/[^a-z]/g, '');
      for (const [name, data] of dataMap.entries()) {
        const normalizedName = name.toLowerCase().replace(/[^a-z]/g, '');
        if (normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName)) {
          playerData = data;
          break;
        }
      }
    }

    return playerData;
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