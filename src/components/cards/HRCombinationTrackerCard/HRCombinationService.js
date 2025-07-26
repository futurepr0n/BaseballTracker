/**
 * HRCombinationService.js
 * 
 * Service for analyzing home run combinations across multiple players.
 * Finds groups of 2, 3, or 4 players who have all hit home runs on the same day
 * and tracks how frequently these combinations occur throughout the season.
 */

import { fetchPlayerData } from '../../../services/dataService';
import dynamicGameDateService from '../../../services/dynamicGameDateService';

class HRCombinationService {
  constructor() {
    this.cache = new Map();
    this.processingCache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Get all players scheduled for today's games
   */
  async getTodaysScheduledPlayers(gameData, playerData, dateStr) {
    console.log('🏟️ getTodaysScheduledPlayers called with:', { 
      gameDataLength: gameData?.length, 
      playerDataLength: playerData?.length,
      dateStr,
      gameDataSample: gameData?.[0],
      playerDataSample: playerData?.[0]
    });
    
    if (!gameData || !Array.isArray(gameData)) {
      console.warn('No game data provided for today');
      return [];
    }

    const scheduledPlayers = [];
    const teamsPlayingToday = new Set();

    // Extract teams playing today
    gameData.forEach(game => {
      if (game.homeTeam) teamsPlayingToday.add(game.homeTeam);
      if (game.awayTeam) teamsPlayingToday.add(game.awayTeam);
    });

    console.log(`Teams playing today (${teamsPlayingToday.size} teams): ${Array.from(teamsPlayingToday).join(', ')}`);

    // Use the provided player data
    if (!playerData || !Array.isArray(playerData)) {
      console.warn('No player data provided');
      return [];
    }
    
    console.log('📊 Using provided player data:', {
      hasData: !!playerData,
      isArray: Array.isArray(playerData),
      length: playerData?.length,
      samplePlayer: playerData?.[0]
    });
    
    try {
      if (playerData && Array.isArray(playerData)) {
        // First, try to filter for players on teams playing today
        let activePlayers = [];
        
        if (teamsPlayingToday.size > 0) {
          // Filter for players on teams playing today and exclude pitchers
          activePlayers = playerData.filter(player => {
            const playerTeam = player.team || player.Team;
            const isHitter = !player.playerType || player.playerType === 'hitter';
            return teamsPlayingToday.has(playerTeam) && isHitter;
          });
          
          console.log(`📊 Filtered to ${activePlayers.length} active hitters from teams playing today`);
        }
        
        // If no teams playing today or no players found, just get all hitters
        if (activePlayers.length === 0) {
          console.log('📊 No players found from teams playing today, using all hitters from playerData');
          activePlayers = playerData.filter(player => {
            const isHitter = !player.playerType || player.playerType === 'hitter';
            return isHitter;
          });
          console.log(`📊 Found ${activePlayers.length} total hitters in playerData`);
        }

        activePlayers.forEach(player => {
          scheduledPlayers.push({
            name: player.name || player.Name,
            team: player.team || player.Team,
            gameId: player.gameId || `${player.name}_${player.team}`
          });
        });
      }
    } catch (error) {
      console.error('Error processing player data:', error);
    }

    console.log(`Found ${scheduledPlayers.length} scheduled players for today`);
    return scheduledPlayers;
  }

  /**
   * Load historical home run data for the entire season
   */
  async loadHistoricalHRData() {
    const cacheKey = 'historical_hr_data_2025';
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('Using cached historical HR data');
        return cached.data;
      }
    }

    console.log('Loading historical HR data for entire season...');
    const startTime = Date.now();

    try {
      // Get all available game dates for 2025
      const gameDates = await dynamicGameDateService.getGameDatesForAnalysis(150); // Full season
      
      console.log(`Found ${gameDates.length} game dates to analyze`);

      const historicalHRData = [];
      let processedDates = 0;

      // Process dates in batches to prevent browser freeze
      const batchSize = 10;
      for (let i = 0; i < gameDates.length; i += batchSize) {
        const batch = gameDates.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (dateStr) => {
          try {
            const playerData = await fetchPlayerData(dateStr);
            
            if (playerData && Array.isArray(playerData)) {
              // Find all players who hit HRs on this date
              const hrPlayers = playerData
                .filter(player => {
                  const hrCount = parseInt(player.HR) || 0;
                  const isHitter = !player.playerType || player.playerType === 'hitter';
                  return hrCount > 0 && isHitter;
                })
                .map(player => ({
                  name: player.name || player.Name,
                  team: player.team || player.Team,
                  hrCount: parseInt(player.HR) || 0,
                  gameId: player.gameId
                }));

              if (hrPlayers.length >= 2) { // Need at least 2 players for combinations
                return {
                  date: dateStr,
                  hrPlayers
                };
              }
            }
          } catch (error) {
            // Silent error handling for missing dates
            return null;
          }
          return null;
        });

        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(result => result !== null);
        
        historicalHRData.push(...validResults);
        processedDates += batch.length;

        // Log progress
        if (processedDates % 20 === 0) {
          console.log(`Processed ${processedDates}/${gameDates.length} dates (${Math.round(processedDates / gameDates.length * 100)}%)`);
        }
      }

      const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Historical HR data loaded in ${loadTime}s: ${historicalHRData.length} dates with HR data`);

      // Cache the results
      this.cache.set(cacheKey, {
        data: historicalHRData,
        timestamp: Date.now()
      });

      return historicalHRData;

    } catch (error) {
      console.error('Error loading historical HR data:', error);
      return [];
    }
  }

  /**
   * Generate all possible combinations of players
   */
  generateCombinations(players, groupSize) {
    if (groupSize < 2 || groupSize > 4 || players.length < groupSize) {
      return [];
    }

    const combinations = [];

    function backtrack(start, currentCombination) {
      if (currentCombination.length === groupSize) {
        combinations.push([...currentCombination]);
        return;
      }

      for (let i = start; i < players.length; i++) {
        currentCombination.push(players[i]);
        backtrack(i + 1, currentCombination);
        currentCombination.pop();
      }
    }

    backtrack(0, []);
    return combinations;
  }

  /**
   * Create a unique key for a player combination (order-independent)
   */
  createCombinationKey(players) {
    return players
      .map(p => `${p.name}_${p.team}`)
      .sort()
      .join('|');
  }

  /**
   * Load pre-generated HR combinations data and filter for scheduled players
   */
  async analyzeHRCombinations(scheduledPlayers, groupSize = 3, showAllResults = false) {
    console.log(`Loading HR combinations for group size: ${groupSize}`);
    
    // Load pre-generated combinations data
    const cacheKey = 'hr_combinations_data';
    
    let combinationsData = null;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('Using cached combinations data');
        combinationsData = cached.data;
      }
    }
    
    // Load from file if not cached
    if (!combinationsData) {
      try {
        console.log('🔥 FETCHING HR combinations data from /data/hr_combinations/hr_combinations_latest.json');
        const response = await fetch('/data/hr_combinations/hr_combinations_latest.json');
        console.log('🔥 Response status:', response.status, response.ok);
        
        if (response.ok) {
          combinationsData = await response.json();
          
          console.log('🔥 LOADED DATA STRUCTURE:', {
            hasGroup2: !!combinationsData.group_2,
            hasGroup3: !!combinationsData.group_3,
            hasGroup4: !!combinationsData.group_4,
            group2Length: combinationsData.group_2?.length,
            group3Length: combinationsData.group_3?.length,
            group4Length: combinationsData.group_4?.length,
            metadata: combinationsData.metadata
          });
          
          // Cache the data
          this.cache.set(cacheKey, {
            data: combinationsData,
            timestamp: Date.now()
          });
          
          console.log('🔥 HR combinations data loaded and cached successfully');
        } else {
          console.warn('🔥 FAILED to load HR combinations data - response not ok');
          return [];
        }
      } catch (error) {
        console.error('🔥 ERROR loading HR combinations data:', error);
        return [];
      }
    }
    
    // Get combinations for the requested group size
    const groupKey = `group_${groupSize}`;
    const allCombinations = combinationsData[groupKey] || [];
    
    console.log(`🔥 GROUP KEY: ${groupKey}`);
    console.log(`🔥 FOUND ${allCombinations.length} total ${groupSize}-player combinations in data`);
    
    if (allCombinations.length === 0) {
      console.log('🔥 NO COMBINATIONS FOUND - returning empty array');
      return [];
    }
    
    // If no scheduled players provided, return combinations based on showAllResults flag
    if (!scheduledPlayers || scheduledPlayers.length === 0) {
      if (showAllResults) {
        console.log('🔥 NO SCHEDULED PLAYERS - returning ALL combinations');
        console.log('🔥 RETURNING:', allCombinations.length, 'combinations');
        return allCombinations;
      } else {
        console.log('🔥 NO SCHEDULED PLAYERS - returning first 50 combinations');
        const result = allCombinations.slice(0, 50);
        console.log('🔥 RETURNING:', result.length, 'combinations');
        return result;
      }
    }
    
    // Filter for combinations where at least one player is scheduled for today
    const scheduledPlayerKeys = new Set(
      scheduledPlayers.map(p => `${p.name}_${p.team}`)
    );
    
    const relevantCombinations = allCombinations.filter(combo => {
      // Check if any player in this combination is scheduled today
      const hasScheduledPlayer = combo.players.some(player => 
        scheduledPlayerKeys.has(`${player.name}_${player.team}`)
      );
      return hasScheduledPlayer;
    });

    console.log(`Found ${relevantCombinations.length} relevant combinations with scheduled players`);
    
    // If no relevant combinations found, return top combinations anyway (for demo)
    if (relevantCombinations.length === 0) {
      console.log('No combinations with scheduled players found, showing top combinations');
      return allCombinations.slice(0, 20);
    }
    
    return relevantCombinations;
  }

  /**
   * Apply team filtering to combinations using standardized filtering pattern
   * This matches the filtering pattern used by other dashboard cards
   */
  filterCombinationsByTeam(combinations, shouldIncludePlayer) {
    if (!shouldIncludePlayer) {
      console.log('🚀 No shouldIncludePlayer function provided - returning all combinations');
      return combinations; // No filtering function provided
    }

    console.log(`🚀 Filtering ${combinations.length} combinations with shouldIncludePlayer function`);

    const filteredCombos = combinations.filter(combo => {
      // At least one player in the combination must pass the team filter
      const hasMatchingPlayer = combo.players.some(player => {
        const playerTeam = player.team || player.Team || '';
        const playerName = player.name || player.Name || '';
        
        const shouldInclude = shouldIncludePlayer(playerTeam, playerName);
        
        // Debug log for first few players
        if (combinations.indexOf(combo) < 3) {
          console.log(`🚀 Player check: ${playerName} (${playerTeam}) -> shouldInclude: ${shouldInclude}`);
        }
        
        return shouldInclude;
      });
      
      return hasMatchingPlayer;
    });

    console.log(`🚀 Team filtering result: ${filteredCombos.length}/${combinations.length} combinations kept`);
    
    return filteredCombos;
  }

  /**
   * Calculate days since a given date
   */
  calculateDaysSince(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now - date;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get summary statistics for combinations
   */
  getCombinationStats(combinations) {
    if (!combinations || combinations.length === 0) {
      return {
        totalCombinations: 0,
        averageOccurrences: 0,
        mostFrequent: null,
        recentCombinations: 0
      };
    }

    const totalOccurrences = combinations.reduce((sum, combo) => sum + combo.occurrences, 0);
    const averageOccurrences = totalOccurrences / combinations.length;
    const mostFrequent = combinations[0]; // Already sorted by frequency
    const recentCombinations = combinations.filter(combo => combo.daysSinceLastOccurrence <= 7).length;

    return {
      totalCombinations: combinations.length,
      averageOccurrences: Math.round(averageOccurrences * 10) / 10,
      mostFrequent,
      recentCombinations
    };
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache() {
    this.cache.clear();
    this.processingCache.clear();
    console.log('HR Combination Service cache cleared');
  }
}

// Export singleton instance
const hrCombinationService = new HRCombinationService();
export default hrCombinationService;