/**
 * handednessResolver.js
 * 
 * Enhanced handedness resolution utility that prioritizes lineup data over roster fallbacks
 * Provides accurate batter and pitcher handedness with confidence indicators
 */

class HandednessResolver {
  constructor() {
    this.rosterCache = null;
    this.lineupCache = null;
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.lastRosterLoad = null;
    this.lastLineupLoad = null;
  }

  /**
   * Load roster data with caching
   */
  async loadRosterData() {
    if (this.rosterCache && this.lastRosterLoad && 
        (Date.now() - this.lastRosterLoad) < this.cacheTimeout) {
      return this.rosterCache;
    }

    try {
      const response = await fetch('/data/rosters.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      this.rosterCache = await response.json();
      this.lastRosterLoad = Date.now();
      
      console.log(`✅ Loaded roster data: ${this.rosterCache.length} players`);
      return this.rosterCache;
    } catch (error) {
      console.error('Error loading roster data:', error);
      return [];
    }
  }

  /**
   * Load today's lineup data with caching
   */
  async loadLineupData() {
    if (this.lineupCache && this.lastLineupLoad && 
        (Date.now() - this.lastLineupLoad) < this.cacheTimeout) {
      return this.lineupCache;
    }

    try {
      // Try today's lineup first
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/data/lineups/starting_lineups_${today}.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      this.lineupCache = await response.json();
      this.lastLineupLoad = Date.now();
      
      console.log(`✅ Loaded lineup data: ${this.lineupCache.totalGames} games`);
      return this.lineupCache;
    } catch (error) {
      console.warn('Lineup data not available:', error.message);
      return null;
    }
  }

  /**
   * Find player handedness from lineup data
   */
  findHandednessInLineups(playerName, team, lineupData) {
    if (!lineupData || !lineupData.games) {
      return null;
    }

    try {
      for (const game of lineupData.games) {
        // Check home team lineup
        if (game.teams.home.abbr === team && game.lineups.home.batting_order) {
          for (const player of game.lineups.home.batting_order) {
            if (this.matchPlayerName(player.name, playerName)) {
              return {
                handedness: player.bats,
                source: 'lineup',
                confidence: 95,
                position: player.position,
                battingOrder: player.order
              };
            }
          }
        }

        // Check away team lineup
        if (game.teams.away.abbr === team && game.lineups.away.batting_order) {
          for (const player of game.lineups.away.batting_order) {
            if (this.matchPlayerName(player.name, playerName)) {
              return {
                handedness: player.bats,
                source: 'lineup',
                confidence: 95,
                position: player.position,
                battingOrder: player.order
              };
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error searching lineup data:', error);
    }

    return null;
  }

  /**
   * Find player handedness from roster data
   */
  findHandednessInRoster(playerName, team, rosterData) {
    if (!rosterData || !Array.isArray(rosterData)) {
      return null;
    }

    try {
      // Try exact team and name match first
      let player = rosterData.find(p => 
        p.team === team && this.matchPlayerName(p.fullName || p.name, playerName)
      );

      // Try name match without team if exact match fails
      if (!player) {
        player = rosterData.find(p => 
          this.matchPlayerName(p.fullName || p.name, playerName)
        );
      }

      if (player && (player.bats || player.hand)) {
        return {
          handedness: player.bats || player.hand,
          source: 'roster',
          confidence: 80,
          playerType: player.type
        };
      }
    } catch (error) {
      console.warn('Error searching roster data:', error);
    }

    return null;
  }

  /**
   * Find pitcher handedness from lineup data
   */
  findPitcherHandednessInLineups(pitcherName, lineupData) {
    if (!lineupData || !lineupData.games) {
      return null;
    }

    try {
      for (const game of lineupData.games) {
        // Check home pitcher
        if (this.matchPlayerName(game.pitchers.home.name, pitcherName)) {
          if (game.pitchers.home.throws) {
            return {
              handedness: this.convertPitcherHandedness(game.pitchers.home.throws),
              source: 'lineup_pitcher',
              confidence: 90,
              team: game.teams.home.abbr
            };
          }
        }

        // Check away pitcher
        if (this.matchPlayerName(game.pitchers.away.name, pitcherName)) {
          if (game.pitchers.away.throws) {
            return {
              handedness: this.convertPitcherHandedness(game.pitchers.away.throws),
              source: 'lineup_pitcher',
              confidence: 90,
              team: game.teams.away.abbr
            };
          }
        }
      }
    } catch (error) {
      console.warn('Error searching pitcher lineup data:', error);
    }

    return null;
  }

  /**
   * Convert pitcher handedness format (LHP/RHP to L/R)
   */
  convertPitcherHandedness(throws) {
    if (!throws) return null;
    
    const throwsUpper = throws.toUpperCase();
    if (throwsUpper.includes('LHP') || throwsUpper === 'L') return 'L';
    if (throwsUpper.includes('RHP') || throwsUpper === 'R') return 'R';
    return throws;
  }

  /**
   * Match player names with various formats
   */
  matchPlayerName(name1, name2) {
    if (!name1 || !name2) return false;
    
    const normalize = (name) => name.toLowerCase().trim()
      .replace(/[.,]/g, '')
      .replace(/\s+/g, ' ');
    
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    
    // Exact match
    if (n1 === n2) return true;
    
    // Check if one contains the other
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Last name match
    const lastName1 = n1.split(' ').pop();
    const lastName2 = n2.split(' ').pop();
    if (lastName1 === lastName2 && lastName1.length > 2) return true;
    
    return false;
  }

  /**
   * Get batter handedness with priority: lineup > roster > fallback
   */
  async getBatterHandedness(playerName, team, prediction = null) {
    const result = {
      handedness: null,
      source: 'unknown',
      confidence: 0,
      available: false
    };

    try {
      // 1. Try lineup data first (highest priority)
      const lineupData = await this.loadLineupData();
      if (lineupData) {
        const lineupResult = this.findHandednessInLineups(playerName, team, lineupData);
        if (lineupResult && lineupResult.handedness) {
          return {
            ...result,
            ...lineupResult,
            available: true
          };
        }
      }

      // 2. Try roster data (secondary)
      const rosterData = await this.loadRosterData();
      if (rosterData) {
        const rosterResult = this.findHandednessInRoster(playerName, team, rosterData);
        if (rosterResult && rosterResult.handedness) {
          return {
            ...result,
            ...rosterResult,
            available: true
          };
        }
      }

      // 3. Try prediction data (tertiary)
      if (prediction && prediction.batter_hand && 
          prediction.batter_hand !== 'UNKNOWN' && prediction.batter_hand !== 'UNK') {
        return {
          ...result,
          handedness: prediction.batter_hand,
          source: 'prediction',
          confidence: 60,
          available: true
        };
      }

    } catch (error) {
      console.error('Error resolving batter handedness:', error);
    }

    // Fallback
    return {
      ...result,
      handedness: 'UNK',
      source: 'fallback',
      confidence: 0,
      available: false
    };
  }

  /**
   * Get pitcher handedness with priority: lineup > roster > fallback
   */
  async getPitcherHandedness(pitcherName, prediction = null) {
    const result = {
      handedness: null,
      source: 'unknown',
      confidence: 0,
      available: false
    };

    try {
      // 1. Try lineup data first (highest priority)
      const lineupData = await this.loadLineupData();
      if (lineupData) {
        const lineupResult = this.findPitcherHandednessInLineups(pitcherName, lineupData);
        if (lineupResult && lineupResult.handedness) {
          return {
            ...result,
            ...lineupResult,
            available: true
          };
        }
      }

      // 2. Try roster data (secondary)
      const rosterData = await this.loadRosterData();
      if (rosterData) {
        const rosterResult = this.findHandednessInRoster(pitcherName, null, rosterData);
        if (rosterResult && rosterResult.handedness) {
          return {
            ...result,
            ...rosterResult,
            available: true
          };
        }
      }

      // 3. Try prediction data (tertiary)
      if (prediction && prediction.pitcher_hand && 
          prediction.pitcher_hand !== 'UNKNOWN' && prediction.pitcher_hand !== 'UNK') {
        return {
          ...result,
          handedness: prediction.pitcher_hand,
          source: 'prediction',
          confidence: 60,
          available: true
        };
      }

    } catch (error) {
      console.error('Error resolving pitcher handedness:', error);
    }

    // Fallback
    return {
      ...result,
      handedness: 'UNK',
      source: 'fallback',
      confidence: 0,
      available: false
    };
  }

  /**
   * Get lineup context for a player (batting order, position)
   */
  async getLineupContext(playerName, team) {
    try {
      const lineupData = await this.loadLineupData();
      if (!lineupData) {
        return { isInLineup: false };
      }

      const lineupResult = this.findHandednessInLineups(playerName, team, lineupData);
      if (lineupResult) {
        return {
          isInLineup: true,
          battingOrder: lineupResult.battingOrder,
          position: lineupResult.position,
          source: 'confirmed_lineup'
        };
      }

    } catch (error) {
      console.error('Error getting lineup context:', error);
    }

    return { isInLineup: false };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.rosterCache = null;
    this.lineupCache = null;
    this.lastRosterLoad = null;
    this.lastLineupLoad = null;
  }
}

// Export singleton instance
const handednessResolver = new HandednessResolver();
export default handednessResolver;