/**
 * Dashboard Context Service
 * Aggregates data from all dashboard cards to provide contextual information
 * for enhanced baseball analysis and predictions
 */

// Dashboard Context Service - aggregates all dashboard card data

class DashboardContextService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Helper method to load prediction data files
   */
  async loadPredictionData(type, date) {
    try {
      // For dashboard context, prioritize latest files for better reliability
      // since concurrent requests seem to interfere with each other
      const cacheBuster = Date.now();
      
      console.log(`📂 Loading prediction data for type: ${type}`);
      
      // Try latest file first (most reliable)
      let response = await fetch(`/data/predictions/${type}_latest.json?cb=${cacheBuster}`);
      
      if (response.ok) {
        console.log(`✅ Successfully loaded ${type}_latest.json`);
        const jsonData = await response.json();
        return jsonData;
      }
      
      // If latest doesn't exist, try the specific date
      const dateStr = date || new Date().toISOString().split('T')[0];
      const fileName = `${type}_${dateStr}.json`;
      
      console.log(`📂 Latest not found, trying: ${fileName}`);
      response = await fetch(`/data/predictions/${fileName}?cb=${cacheBuster}`);
      
      if (response.ok) {
        console.log(`✅ Successfully loaded ${fileName}`);
        const jsonData = await response.json();
        return jsonData;
      }
      
      console.log(`❌ No data found for ${type} (tried latest and ${dateStr})`);
      return null;
      
    } catch (error) {
      console.error(`Error loading ${type} data:`, error);
      return null;
    }
  }

  /**
   * Get comprehensive player context from all dashboard cards
   * @param {string} playerName - Player name to analyze
   * @param {string} team - Player's team abbreviation
   * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
   * @returns {Object} Comprehensive player context
   */
  async getPlayerContext(playerName, team, date = null) {
    const cacheKey = `${playerName}-${team}-${date || 'today'}`;
    
    // Add debugging
    console.log(`🔍 Getting dashboard context for: ${playerName} (${team})`);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📄 Using cached context for ${playerName}`);
        return cached.data;
      }
    }

    try {
      const context = {
        playerName,
        team,
        date: date || new Date().toISOString().split('T')[0],
        badges: [],
        confidenceBoost: 0,
        standoutReasons: [],
        riskFactors: [],
        contextSummary: ''
      };

      // Aggregate data from all dashboard cards (only those with existing files)
      const [
        hitStreakStatus,
        hrPredictionRank,
        likelyToHit,
        poorPerformanceRisk,
        timeSlotAdvantage,
        opponentHistory
      ] = await Promise.all([
        this.checkHitStreakCard(playerName, team, date),
        this.checkHRPredictionCard(playerName, team, date),
        this.checkLikelyToHitCard(playerName, team, date),
        this.checkPoorPerformanceCard(playerName, team, date),
        this.checkTimeSlotCards(playerName, team, date),
        this.checkOpponentMatchupCards(playerName, team, date)
      ]);

      // Process each card result and build context
      this.processHitStreakData(context, hitStreakStatus);
      this.processHRPredictionData(context, hrPredictionRank);
      this.processLikelyToHitData(context, likelyToHit);
      this.processPoorPerformanceData(context, poorPerformanceRisk);
      this.processTimeSlotData(context, timeSlotAdvantage);
      this.processOpponentMatchupData(context, opponentHistory);

      // Calculate final confidence boost and context summary
      this.calculateFinalContext(context);

      // Cache the result
      this.cache.set(cacheKey, {
        data: context,
        timestamp: Date.now()
      });

      console.log(`🎯 Final context for ${playerName}:`, {
        badges: context.badges,
        confidenceBoost: context.confidenceBoost,
        standoutReasons: context.standoutReasons
      });

      return context;

    } catch (error) {
      console.error('Error getting player context:', error);
      return {
        playerName,
        team,
        badges: [],
        confidenceBoost: 0,
        standoutReasons: ['Error loading context data'],
        riskFactors: [],
        contextSummary: 'Context data unavailable'
      };
    }
  }

  /**
   * Check if player appears in Hit Streak card data
   */
  async checkHitStreakCard(playerName, team, date) {
    try {
      console.log(`🔥 Checking hit streak for: ${playerName} (${team})`);
      const data = await this.loadPredictionData('hit_streak_analysis', date);
      if (!data) {
        console.log(`❌ No hit streak data found`);
        return null;
      }

      // The hit streak data has 'hitStreaks' not 'players'
      const players = data.hitStreaks || data.players;
      if (!players) {
        console.log(`❌ No hitStreaks/players array found`);
        return null;
      }

      console.log(`📊 Found ${players.length} players in hit streak data`);
      
      const foundPlayer = players.find(player => 
        this.matchPlayerName(player.name, playerName) && 
        this.matchTeam(player.team, team)
      );

      if (foundPlayer) {
        console.log(`✅ Found ${playerName} with ${foundPlayer.currentStreak} game streak`);
      } else {
        console.log(`❌ ${playerName} not found in hit streak data`);
        // Debug: show available players
        console.log(`Available players:`, players.map(p => `${p.name} (${p.team})`));
      }

      return foundPlayer;
    } catch (error) {
      console.error('Error checking hit streak card:', error);
      return null;
    }
  }

  /**
   * Check if player appears in HR Prediction card data
   */
  async checkHRPredictionCard(playerName, team, date) {
    try {
      const data = await this.loadPredictionData('hr_predictions', date);
      if (!data || !data.predictions) return null;

      const playerIndex = data.predictions.findIndex(player => 
        this.matchPlayerName(player.name || player.fullName, playerName) && 
        this.matchTeam(player.team, team)
      );

      return playerIndex !== -1 ? {
        ...data.predictions[playerIndex],
        rank: playerIndex + 1
      } : null;
    } catch (error) {
      console.error('Error checking HR prediction card:', error);
      return null;
    }
  }

  /**
   * Check if player appears in Likely to Hit card data
   */
  async checkLikelyToHitCard(playerName, team, date) {
    try {
      const data = await this.loadPredictionData('player_performance', date);
      if (!data || !data.likely_to_hit) return null;

      return data.likely_to_hit.find(player => 
        this.matchPlayerName(player.name, playerName) && 
        this.matchTeam(player.team, team)
      );
    } catch (error) {
      console.error('Error checking likely to hit card:', error);
      return null;
    }
  }

  /**
   * Check if player appears in Multi-Hit card data
   */
  async checkMultiHitCard(playerName, team, date) {
    try {
      const data = await this.loadPredictionData('multi_hit_stats', date);
      if (!data || !data.players) return null;

      return data.players.find(player => 
        this.matchPlayerName(player.name, playerName) && 
        this.matchTeam(player.team, team)
      );
    } catch (error) {
      console.error('Error checking multi-hit card:', error);
      return null;
    }
  }

  /**
   * Check if player appears in Poor Performance card data
   */
  async checkPoorPerformanceCard(playerName, team, date) {
    try {
      const data = await this.loadPredictionData('poor_performance_predictions', date);
      if (!data || !data.predictions) return null;

      return data.predictions.find(player => 
        this.matchPlayerName(player.name, playerName) && 
        this.matchTeam(player.team, team)
      );
    } catch (error) {
      console.error('Error checking poor performance card:', error);
      return null;
    }
  }

  /**
   * Check time slot performance data
   */
  async checkTimeSlotCards(playerName, team, date) {
    try {
      const data = await this.loadPredictionData('day_of_week_hits', date);
      if (!data || !data.players) return null;

      return data.players.find(player => 
        this.matchPlayerName(player.name, playerName) && 
        this.matchTeam(player.team, team)
      );
    } catch (error) {
      console.error('Error checking time slot cards:', error);
      return null;
    }
  }

  /**
   * Check opponent matchup data
   */
  async checkOpponentMatchupCards(playerName, team, date) {
    try {
      // This would need to be implemented based on opponent matchup data structure
      // For now, return null as placeholder
      return null;
    } catch (error) {
      console.error('Error checking opponent matchup cards:', error);
      return null;
    }
  }

  /**
   * Process hit streak data and update context
   */
  processHitStreakData(context, hitStreakData) {
    if (!hitStreakData) {
      console.log(`🔥 No hit streak data to process`);
      return;
    }

    const streakLength = hitStreakData.currentStreak || hitStreakData.streak || 0;
    console.log(`🔥 Processing hit streak: ${streakLength} games`);
    
    if (streakLength >= 8) {
      context.badges.push('🔥 Hot Streak');
      context.confidenceBoost += 15;
      context.standoutReasons.push(`${streakLength}-game hit streak (elite level)`);
      console.log(`✅ Added Hot Streak badge (${streakLength} games)`);
    } else if (streakLength >= 5) {
      context.badges.push('🔥 Active Streak');
      context.confidenceBoost += 10;
      context.standoutReasons.push(`${streakLength}-game hit streak`);
      console.log(`✅ Added Active Streak badge (${streakLength} games)`);
    } else {
      console.log(`❌ Streak too short for badge (${streakLength} games)`);
    }
  }

  /**
   * Process HR prediction data and update context
   */
  processHRPredictionData(context, hrPredictionData) {
    if (!hrPredictionData) return;

    const rank = hrPredictionData.rank;
    
    if (rank <= 5) {
      context.badges.push('⚡ Due for HR');
      context.confidenceBoost += 12;
      context.standoutReasons.push(`Ranked #${rank} in HR predictions today`);
    } else if (rank <= 15) {
      context.badges.push('⚡ HR Candidate');
      context.confidenceBoost += 8;
      context.standoutReasons.push(`Top 15 HR prediction (rank #${rank})`);
    }
  }

  /**
   * Process likely to hit data and update context
   */
  processLikelyToHitData(context, likelyToHitData) {
    if (!likelyToHitData) return;

    context.badges.push('📈 Likely Hit');
    context.confidenceBoost += 8;
    
    if (likelyToHitData.probability) {
      context.standoutReasons.push(`${(likelyToHitData.probability * 100).toFixed(1)}% hit probability`);
    } else {
      context.standoutReasons.push('Identified as likely to get a hit');
    }
  }

  /**
   * Process multi-hit data and update context
   */
  processMultiHitData(context, multiHitData) {
    if (!multiHitData) return;

    context.badges.push('🎯 Multi-Hit');
    context.confidenceBoost += 10;
    context.standoutReasons.push('Strong candidate for multiple hits');
  }

  /**
   * Process poor performance data and update context
   */
  processPoorPerformanceData(context, poorPerformanceData) {
    if (!poorPerformanceData) return;

    context.badges.push('⚠️ Risk');
    context.confidenceBoost -= 15;
    context.riskFactors.push('Identified as poor performance risk');
  }

  /**
   * Process time slot data and update context
   */
  processTimeSlotData(context, timeSlotData) {
    if (!timeSlotData) return;

    context.badges.push('⏰ Time Slot');
    context.confidenceBoost += 5;
    context.standoutReasons.push('Favorable time slot performance');
  }

  /**
   * Process opponent matchup data and update context
   */
  processOpponentMatchupData(context, opponentData) {
    if (!opponentData) return;

    context.badges.push('🆚 Matchup Edge');
    context.confidenceBoost += 8;
    context.standoutReasons.push('Strong historical vs this opponent');
  }

  /**
   * Calculate final context summary
   */
  calculateFinalContext(context) {
    const badgeCount = context.badges.length;
    const boost = context.confidenceBoost;

    // Special bonuses for multiple appearances
    if (badgeCount >= 3) {
      context.confidenceBoost += 20;
      context.standoutReasons.push(`Appears in ${badgeCount} dashboard cards`);
    }

    // Generate context summary based on badges and boost
    if (boost < -10) {
      context.contextSummary = 'Caution advised - risk factors present';
    } else if (boost > 20) {
      context.contextSummary = 'High-confidence play with multiple positive indicators';
    } else if (boost > 10) {
      context.contextSummary = 'Solid play with favorable context';
    } else if (badgeCount > 0) {
      context.contextSummary = 'Additional context indicators present';
    } else if (boost > 0) {
      context.contextSummary = 'Some positive indicators present';
    } else {
      context.contextSummary = 'Base analysis only';
    }
  }

  /**
   * Helper method to match player names (handles variations)
   */
  matchPlayerName(name1, name2) {
    if (!name1 || !name2) return false;
    
    // Clean both names - remove punctuation and extra spaces
    const clean1 = name1.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const clean2 = name2.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    
    // Direct match
    if (clean1 === clean2) return true;
    
    // Handle abbreviated names (e.g., "J. Smith" vs "Josh Smith")
    const parts1 = clean1.split(/\s+/);
    const parts2 = clean2.split(/\s+/);
    
    // If one name has initials and the other has full first name
    if (parts1.length >= 2 && parts2.length >= 2) {
      const lastName1 = parts1[parts1.length - 1];
      const lastName2 = parts2[parts2.length - 1];
      
      // Last names must match
      if (lastName1 !== lastName2) return false;
      
      const firstName1 = parts1[0];
      const firstName2 = parts2[0];
      
      // Check if one is an initial of the other
      if (firstName1.length === 1 && firstName2.startsWith(firstName1)) return true;
      if (firstName2.length === 1 && firstName1.startsWith(firstName2)) return true;
      
      // Handle middle names/initials - just check if first names match
      if (firstName1 === firstName2) return true;
    }
    
    // Handle "lastname, firstname" format vs "firstname lastname"
    if (clean1.includes(',') || clean2.includes(',')) {
      const normalized1 = this.normalizeNameFormat(clean1);
      const normalized2 = this.normalizeNameFormat(clean2);
      return this.matchPlayerName(normalized1, normalized2);
    }
    
    return false;
  }

  /**
   * Helper to normalize "lastname, firstname" to "firstname lastname"
   */
  normalizeNameFormat(name) {
    if (name.includes(',')) {
      const [last, first] = name.split(',').map(s => s.trim());
      return `${first} ${last}`;
    }
    return name;
  }

  /**
   * Helper method to match team abbreviations
   */
  matchTeam(team1, team2) {
    if (!team1 || !team2) return false;
    
    return team1.toUpperCase() === team2.toUpperCase();
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const dashboardContextService = new DashboardContextService();
export default dashboardContextService;