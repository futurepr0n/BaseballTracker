/**
 * handednessSwingDataService.js
 * Service for loading and processing pitcher handedness-specific swing path data
 */

class HandednessSwingDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load JSON data for specific handedness
   */
  async loadHandednessData(handedness) {
    const cacheKey = `swing_data_${handedness}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      let jsonPath;
      if (handedness === 'RHP') {
        jsonPath = '/data/handedness/rhp.json';
      } else if (handedness === 'LHP') {
        jsonPath = '/data/handedness/lhp.json';
      } else if (handedness === 'ALL') {
        jsonPath = '/data/handedness/all.json';
      } else {
        throw new Error(`Invalid handedness: ${handedness}. Must be RHP, LHP, or ALL`);
      }

      const response = await fetch(jsonPath);
      if (!response.ok) {
        throw new Error(`Failed to load ${handedness} data: ${response.status}`);
      }

      const jsonData = await response.json();
      const data = jsonData.players || [];
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      console.log(`Loaded ${data.length} players for ${handedness} handedness`);
      
      // Debug: log first few player names to check format
      if (data.length > 0) {
        console.log(`First 3 ${handedness} players:`, data.slice(0, 3).map(p => p.name));
      }
      
      return data;
    } catch (error) {
      console.error(`Error loading handedness data for ${handedness}:`, error);
      return [];
    }
  }


  /**
   * Get combined data for all handedness types
   */
  async getAllHandednessData() {
    try {
      const [rhpData, lhpData] = await Promise.all([
        this.loadHandednessData('RHP'),
        this.loadHandednessData('LHP')
      ]);

      // Create a combined dataset with average values
      const playerMap = new Map();

      // Process RHP data
      rhpData.forEach(player => {
        if (!playerMap.has(player.name)) {
          playerMap.set(player.name, {
            name: player.name,
            side: player.side,
            id: player.id,
            rhp: player,
            lhp: null
          });
        } else {
          playerMap.get(player.name).rhp = player;
        }
      });

      // Process LHP data
      lhpData.forEach(player => {
        if (!playerMap.has(player.name)) {
          playerMap.set(player.name, {
            name: player.name,
            side: player.side,
            id: player.id,
            rhp: null,
            lhp: player
          });
        } else {
          playerMap.get(player.name).lhp = player;
        }
      });

      // Calculate combined averages
      const combinedData = Array.from(playerMap.values()).map(playerData => {
        const rhp = playerData.rhp;
        const lhp = playerData.lhp;
        
        // If only one handedness available, use that data
        if (rhp && !lhp) {
          return { ...rhp, handedness_data: { rhp_only: true } };
        }
        if (lhp && !rhp) {
          return { ...lhp, handedness_data: { lhp_only: true } };
        }
        
        // If both available, calculate weighted averages based on competitive swings
        if (rhp && lhp) {
          const rhpSwings = rhp.competitive_swings || 0;
          const lhpSwings = lhp.competitive_swings || 0;
          const totalSwings = rhpSwings + lhpSwings;
          
          if (totalSwings === 0) {
            return { ...rhp, handedness_data: { insufficient_data: true } };
          }
          
          const rhpWeight = rhpSwings / totalSwings;
          const lhpWeight = lhpSwings / totalSwings;
          
          return {
            name: playerData.name,
            side: playerData.side,
            id: playerData.id,
            avg_bat_speed: (rhp.avg_bat_speed * rhpWeight) + (lhp.avg_bat_speed * lhpWeight),
            swing_tilt: (rhp.swing_tilt * rhpWeight) + (lhp.swing_tilt * lhpWeight),
            attack_angle: (rhp.attack_angle * rhpWeight) + (lhp.attack_angle * lhpWeight),
            attack_direction: (rhp.attack_direction * rhpWeight) + (lhp.attack_direction * lhpWeight),
            ideal_attack_angle_rate: (rhp.ideal_attack_angle_rate * rhpWeight) + (lhp.ideal_attack_angle_rate * lhpWeight),
            avg_intercept_y_vs_plate: (rhp.avg_intercept_y_vs_plate * rhpWeight) + (lhp.avg_intercept_y_vs_plate * lhpWeight),
            avg_intercept_y_vs_batter: (rhp.avg_intercept_y_vs_batter * rhpWeight) + (lhp.avg_intercept_y_vs_batter * lhpWeight),
            competitive_swings: totalSwings,
            handedness_data: {
              rhp_swings: rhpSwings,
              lhp_swings: lhpSwings,
              rhp_weight: rhpWeight,
              lhp_weight: lhpWeight
            }
          };
        }
        
        return null;
      }).filter(Boolean);

      return combinedData;
    } catch (error) {
      console.error('Error getting all handedness data:', error);
      return [];
    }
  }

  /**
   * Get swing data for a specific player and handedness
   */
  async getPlayerHandednessData(playerName, handedness = 'ALL') {
    try {
      let data;
      
      if (handedness === 'ALL') {
        data = await this.getAllHandednessData();
        return data.find(player => 
          player.name.toLowerCase().includes(playerName.toLowerCase()) ||
          playerName.toLowerCase().includes(player.name.toLowerCase())
        );
      } else {
        data = await this.loadHandednessData(handedness);
        return data.find(player => 
          player.name.toLowerCase().includes(playerName.toLowerCase()) ||
          playerName.toLowerCase().includes(player.name.toLowerCase())
        );
      }
    } catch (error) {
      console.error(`Error getting player data for ${playerName} vs ${handedness}:`, error);
      return null;
    }
  }

  /**
   * Get enhanced metrics for a player across all handedness types
   */
  async getPlayerHandednessSplits(playerName) {
    try {
      const [rhpData, lhpData, allData] = await Promise.all([
        this.getPlayerHandednessData(playerName, 'RHP'),
        this.getPlayerHandednessData(playerName, 'LHP'),
        this.getPlayerHandednessData(playerName, 'ALL')
      ]);

      return {
        playerName,
        rhp: rhpData,
        lhp: lhpData,
        combined: allData,
        splits: this.calculateSplits(rhpData, lhpData),
        recommendation: this.getHandednessRecommendation(rhpData, lhpData)
      };
    } catch (error) {
      console.error(`Error getting handedness splits for ${playerName}:`, error);
      return null;
    }
  }

  /**
   * Calculate performance splits between RHP and LHP
   */
  calculateSplits(rhpData, lhpData) {
    if (!rhpData || !lhpData) return null;

    return {
      batSpeed: {
        rhp: rhpData.avg_bat_speed,
        lhp: lhpData.avg_bat_speed,
        difference: rhpData.avg_bat_speed - lhpData.avg_bat_speed,
        advantage: rhpData.avg_bat_speed > lhpData.avg_bat_speed ? 'RHP' : 'LHP'
      },
      attackAngle: {
        rhp: rhpData.attack_angle,
        lhp: lhpData.attack_angle,
        difference: rhpData.attack_angle - lhpData.attack_angle,
        advantage: Math.abs(rhpData.attack_angle - 12.5) < Math.abs(lhpData.attack_angle - 12.5) ? 'RHP' : 'LHP'
      },
      idealRate: {
        rhp: rhpData.ideal_attack_angle_rate,
        lhp: lhpData.ideal_attack_angle_rate,
        difference: rhpData.ideal_attack_angle_rate - lhpData.ideal_attack_angle_rate,
        advantage: rhpData.ideal_attack_angle_rate > lhpData.ideal_attack_angle_rate ? 'RHP' : 'LHP'
      },
      sampleSize: {
        rhp: rhpData.competitive_swings,
        lhp: lhpData.competitive_swings,
        total: rhpData.competitive_swings + lhpData.competitive_swings
      }
    };
  }

  /**
   * Get handedness-based recommendation
   */
  getHandednessRecommendation(rhpData, lhpData) {
    if (!rhpData && !lhpData) return { type: 'insufficient_data', message: 'No handedness data available' };
    if (!rhpData) return { type: 'lhp_only', message: 'Only LHP data available' };
    if (!lhpData) return { type: 'rhp_only', message: 'Only RHP data available' };

    const splits = this.calculateSplits(rhpData, lhpData);
    let advantages = 0;
    let strongAdvantage = '';

    // Check bat speed advantage
    if (Math.abs(splits.batSpeed.difference) > 1.5) {
      advantages += splits.batSpeed.advantage === 'RHP' ? 1 : -1;
      if (Math.abs(splits.batSpeed.difference) > 3) {
        strongAdvantage = splits.batSpeed.advantage;
      }
    }

    // Check ideal rate advantage
    if (Math.abs(splits.idealRate.difference) > 0.05) {
      advantages += splits.idealRate.advantage === 'RHP' ? 1 : -1;
      if (Math.abs(splits.idealRate.difference) > 0.1) {
        strongAdvantage = splits.idealRate.advantage;
      }
    }

    if (strongAdvantage) {
      return {
        type: 'strong_preference',
        handedness: strongAdvantage,
        message: `Strong advantage vs ${strongAdvantage}`
      };
    } else if (advantages > 0) {
      return {
        type: 'slight_preference',
        handedness: 'RHP',
        message: 'Slight advantage vs RHP'
      };
    } else if (advantages < 0) {
      return {
        type: 'slight_preference',
        handedness: 'LHP',
        message: 'Slight advantage vs LHP'
      };
    } else {
      return {
        type: 'balanced',
        message: 'Similar performance vs both handedness'
      };
    }
  }

  /**
   * Load all handedness datasets at once for toggle functionality
   */
  async loadAllHandednessDatasets() {
    try {
      const [rhpData, lhpData, allData] = await Promise.all([
        this.loadHandednessData('RHP'),
        this.loadHandednessData('LHP'), 
        this.loadHandednessData('ALL')
      ]);

      // Create unified dataset structure
      const datasets = {
        RHP: new Map(),
        LHP: new Map(),
        ALL: new Map()
      };

      // Populate maps for fast lookup
      rhpData.forEach(player => {
        datasets.RHP.set(player.name.toLowerCase(), player);
      });

      lhpData.forEach(player => {
        datasets.LHP.set(player.name.toLowerCase(), player);
      });

      allData.forEach(player => {
        datasets.ALL.set(player.name.toLowerCase(), player);
      });

      return datasets;
    } catch (error) {
      console.error('Error loading all handedness datasets:', error);
      return {
        RHP: new Map(),
        LHP: new Map(),
        ALL: new Map()
      };
    }
  }

  /**
   * Get player data for specific handedness from pre-loaded datasets
   */
  getPlayerDataByHandedness(datasets, playerName, handedness) {
    if (!datasets || !datasets[handedness]) {
      console.log(`No dataset for ${handedness}`);
      return null;
    }
    
    const dataset = datasets[handedness];
    const playerKey = playerName.toLowerCase();
    
    // Debug for Cal Raleigh specifically
    const isCalRaleigh = playerName.toLowerCase().includes('raleigh');
    if (isCalRaleigh) {
      console.log(`Looking for Cal Raleigh in ${handedness} data:`, {
        originalName: playerName,
        searchKey: playerKey,
        datasetSize: dataset.size
      });
    }
    
    // Try direct match first
    let playerData = dataset.get(playerKey);
    if (playerData) {
      if (isCalRaleigh) console.log('Found direct match!', playerData);
      return playerData;
    }
    
    // Try name format conversions
    // Convert "Cal Raleigh" to "Raleigh, Cal" format
    const nameParts = playerName.split(' ');
    if (nameParts.length >= 2) {
      const lastName = nameParts[nameParts.length - 1];
      const firstName = nameParts.slice(0, -1).join(' ');
      const convertedKey = `${lastName}, ${firstName}`.toLowerCase();
      if (isCalRaleigh) console.log('Trying converted key:', convertedKey);
      playerData = dataset.get(convertedKey);
      if (playerData) {
        if (isCalRaleigh) console.log('Found converted match!', playerData);
        return playerData;
      }
    }
    
    // Try partial matching as last resort
    for (const [key, data] of dataset) {
      if (key.includes(playerKey) || playerKey.includes(key)) {
        if (isCalRaleigh) console.log('Found partial match:', key, data);
        return data;
      }
    }
    
    if (isCalRaleigh) console.log('No match found for Cal Raleigh');
    return null;
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
const handednessSwingDataService = new HandednessSwingDataService();
export default handednessSwingDataService;