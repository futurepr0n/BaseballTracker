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
      
      // Try latest file first (most reliable)
      let response = await fetch(`/data/predictions/${type}_latest.json?cb=${cacheBuster}`);
      
      if (response.ok) {
        const jsonData = await response.json();
        return jsonData;
      }
      
      // If latest doesn't exist, try the specific date
      const dateStr = date || new Date().toISOString().split('T')[0];
      const fileName = `${type}_${dateStr}.json`;
      
      response = await fetch(`/data/predictions/${fileName}?cb=${cacheBuster}`);
      
      if (response.ok) {
        const jsonData = await response.json();
        return jsonData;
      }
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
    
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
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
        positivePerformance,
        poorPerformanceRisk,
        timeSlotAdvantage,
        opponentHistory
      ] = await Promise.all([
        this.checkHitStreakCard(playerName, team, date),
        this.checkHRPredictionCard(playerName, team, date),
        this.checkLikelyToHitCard(playerName, team, date),
        this.checkPositivePerformanceCard(playerName, team, date),
        this.checkPoorPerformanceCard(playerName, team, date),
        this.checkTimeSlotCards(playerName, team, date),
        this.checkOpponentMatchupCards(playerName, team, date)
      ]);

      // Store raw data for tooltips
      context.hitStreakData = hitStreakStatus;
      context.hrPredictionData = hrPredictionRank;
      context.likelyToHitData = likelyToHit;
      context.positivePerformanceData = positivePerformance;
      context.poorPerformanceData = poorPerformanceRisk;
      context.timeSlotData = timeSlotAdvantage;
      context.opponentMatchupData = opponentHistory;

      // Process each card result and build context
      this.processHitStreakData(context, hitStreakStatus);
      this.processHRPredictionData(context, hrPredictionRank);
      this.processLikelyToHitData(context, likelyToHit);
      this.processPositivePerformanceData(context, positivePerformance);
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
      const data = await this.loadPredictionData('hit_streak_analysis', date);
      if (!data) return null;

      // The hit streak data has 'hitStreaks' not 'players'
      const players = data.hitStreaks || data.players;
      if (!players) return null;
      
      const foundPlayer = players.find(player => 
        this.matchPlayerName(player.name, playerName) && 
        this.matchTeam(player.team, team)
      );

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
   * Check if player appears in Positive Performance card data
   */
  async checkPositivePerformanceCard(playerName, team, date) {
    try {
      const data = await this.loadPredictionData('positive_performance_predictions', date);
      if (!data || !data.predictions) return null;
      
      const foundPlayer = data.predictions.find(player => 
        this.matchPlayerName(player.playerName || player.name, playerName) && 
        this.matchTeam(player.team, team)
      );

      return foundPlayer;
    } catch (error) {
      console.error('Error checking positive performance card:', error);
      return null;
    }
  }

  /**
   * Check if player appears in Poor Performance card data
   */
  async checkPoorPerformanceCard(playerName, team, date) {
    try {
      const data = await this.loadPredictionData('poor_performance_risks', date);
      if (!data || !data.predictions) return null;

      return data.predictions.find(player => 
        this.matchPlayerName(player.playerName || player.name, playerName) && 
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
      if (!data) return null;
      
      // Check both topHitsByTotal and topHitsByRate arrays
      const allPlayers = [
        ...(data.topHitsByTotal || []),
        ...(data.topHitsByRate || [])
      ];
      
      // Find player and add day of week context
      const foundPlayer = allPlayers.find(player => 
        this.matchPlayerName(player.name, playerName) && 
        this.matchTeam(player.team, team)
      );
      
      if (foundPlayer) {
        return {
          ...foundPlayer,
          dayOfWeek: data.dayOfWeek,
          dayOfWeekIndex: data.dayOfWeekIndex
        };
      }
      
      return null;
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
      const data = await this.loadPredictionData('pitcher_matchups', date);
      if (!data || !data.toughPitcherMatchups) return null;
      
      // Check if player appears in any tough pitcher matchup as a batter
      for (const matchup of data.toughPitcherMatchups) {
        // Check same-handed batters
        if (matchup.sameHandedBattersList) {
          const foundInSame = matchup.sameHandedBattersList.find(batter => 
            this.matchPlayerName(batter.name, playerName) && 
            this.matchTeam(batter.team, team)
          );
          if (foundInSame) {
            return {
              ...foundInSame,
              matchupType: 'same_handed',
              opposingPitcher: matchup.name,
              opposingPitcherTeam: matchup.team,
              opposingPitcherHand: matchup.pitchingHand
            };
          }
        }
        
        // Check opposite-handed batters
        if (matchup.oppositeHandedBattersList) {
          const foundInOpposite = matchup.oppositeHandedBattersList.find(batter => 
            this.matchPlayerName(batter.name, playerName) && 
            this.matchTeam(batter.team, team)
          );
          if (foundInOpposite) {
            return {
              ...foundInOpposite,
              matchupType: 'opposite_handed',
              opposingPitcher: matchup.name,
              opposingPitcherTeam: matchup.team,
              opposingPitcherHand: matchup.pitchingHand
            };
          }
        }
      }
      
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
    if (!hitStreakData) return;

    const streakLength = hitStreakData.currentStreak || hitStreakData.streak || 0;
    
    if (streakLength >= 8) {
      context.badges.push({
        emoji: '🔥',
        text: 'Hot Streak',
        fullText: '🔥 Hot Streak',
        type: 'streak_hit'
      });
      context.confidenceBoost += 15;
      context.standoutReasons.push(`${streakLength}-game hit streak (elite level)`);
    } else if (streakLength >= 5) {
      context.badges.push({
        emoji: '🔥',
        text: 'Active Streak',
        fullText: '🔥 Active Streak',
        type: 'streak_hit'
      });
      context.confidenceBoost += 10;
      context.standoutReasons.push(`${streakLength}-game hit streak`);
    }
  }

  /**
   * Process HR prediction data and update context
   */
  processHRPredictionData(context, hrPredictionData) {
    if (!hrPredictionData) return;

    const rank = hrPredictionData.rank;
    
    if (rank <= 5) {
      context.badges.push({
        emoji: '⚡',
        text: 'Due for HR',
        fullText: '⚡ Due for HR',
        type: 'hr_prediction'
      });
      context.confidenceBoost += 12;
      context.standoutReasons.push(`Ranked #${rank} in HR predictions today`);
    } else if (rank <= 15) {
      context.badges.push({
        emoji: '⚡',
        text: 'HR Candidate',
        fullText: '⚡ HR Candidate',
        type: 'hr_prediction'
      });
      context.confidenceBoost += 8;
      context.standoutReasons.push(`Top 15 HR prediction (rank #${rank})`);
    }
  }

  /**
   * Process likely to hit data and update context
   */
  processLikelyToHitData(context, likelyToHitData) {
    if (!likelyToHitData) return;

    context.badges.push({
      emoji: '📈',
      text: 'Likely Hit',
      fullText: '📈 Likely Hit',
      type: 'likely_hit'
    });
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

    context.badges.push({
      emoji: '🎯',
      text: 'Multi-Hit',
      fullText: '🎯 Multi-Hit',
      type: 'multi_hit'
    });
    context.confidenceBoost += 10;
    context.standoutReasons.push('Strong candidate for multiple hits');
  }

  /**
   * Process positive performance data and update context
   */
  processPositivePerformanceData(context, positivePerformanceData) {
    if (!positivePerformanceData) return;

    const score = positivePerformanceData.totalPositiveScore || 0;
    const momentum = positivePerformanceData.momentumLevel || 'MEDIUM';
    
    if (momentum === 'HIGH' || score >= 50) {
      context.badges.push({
        emoji: '🚀',
        text: 'Positive Momentum',
        fullText: '🚀 Positive Momentum',
        type: 'positive_momentum'
      });
      context.confidenceBoost += 12;
      context.standoutReasons.push(`High positive momentum (score: ${score})`);
    } else if (momentum === 'MEDIUM' || score >= 35) {
      context.badges.push({
        emoji: '📈',
        text: 'Improved Form',
        fullText: '📈 Improved Form',
        type: 'positive_momentum'
      });
      context.confidenceBoost += 8;
      context.standoutReasons.push(`Positive performance indicators (score: ${score})`);
    } else {
      context.badges.push({
        emoji: '📊',
        text: 'Positive Factors',
        fullText: '📊 Positive Factors',
        type: 'positive_momentum'
      });
      context.confidenceBoost += 5;
      context.standoutReasons.push(`Some positive factors identified (score: ${score})`);
    }

    // Store full data for detailed tooltip
    context.positivePerformanceData = positivePerformanceData;
  }

  /**
   * Process poor performance data and update context
   */
  processPoorPerformanceData(context, poorPerformanceData) {
    if (!poorPerformanceData) return;

    context.badges.push({
      emoji: '⚠️',
      text: 'Risk',
      fullText: '⚠️ Risk',
      type: 'poor_performance'
    });
    context.confidenceBoost -= 15;
    context.riskFactors.push('Identified as poor performance risk');
    
    // Store full data for detailed tooltip
    context.poorPerformanceData = poorPerformanceData;
  }

  /**
   * Process time slot data and update context
   */
  processTimeSlotData(context, timeSlotData) {
    if (!timeSlotData) return;

    context.badges.push({
      emoji: '⏰',
      text: 'Time Slot',
      fullText: '⏰ Time Slot',
      type: 'time_slot'
    });
    context.confidenceBoost += 5;
    context.standoutReasons.push('Favorable time slot performance');
  }

  /**
   * Process opponent matchup data and update context
   */
  processOpponentMatchupData(context, opponentData) {
    if (!opponentData) return;

    context.badges.push({
      emoji: '🆚',
      text: 'Matchup Edge',
      fullText: '🆚 Matchup Edge',
      type: 'matchup_edge'
    });
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
    
    // Handle abbreviated names (e.g., "L. Sosa" vs "Lenyn Sosa")
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
      
      // Check if one is an initial of the other (case: "L" matches "Lenyn")
      if (firstName1.length === 1 && firstName2.startsWith(firstName1.toLowerCase())) return true;
      if (firstName2.length === 1 && firstName1.startsWith(firstName2.toLowerCase())) return true;
      
      // Handle middle names/initials - just check if first names match
      if (firstName1 === firstName2) return true;
    }
    
    // Handle "lastname, firstname" format vs "firstname lastname"
    if (clean1.includes(',') || clean2.includes(',')) {
      const normalized1 = this.normalizeNameFormat(clean1);
      const normalized2 = this.normalizeNameFormat(clean2);
      return this.matchPlayerName(normalized1, normalized2);
    }
    
    // Additional check: Try swapping positions to see if names match differently
    // This handles cases where one source has "First Last" and another has "Last First"
    if (parts1.length === 2 && parts2.length === 2) {
      const swapped1 = `${parts1[1]} ${parts1[0]}`;
      const swapped2 = `${parts2[1]} ${parts2[0]}`;
      if (swapped1 === clean2 || clean1 === swapped2) return true;
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