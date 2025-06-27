/**
 * Enhanced Game Opportunities Service
 * Central orchestration service that aggregates existing data sources to provide
 * comprehensive player insights for game opportunities with expandable details
 */

import { fetchPlayerDataForDateRange } from './dataService';
import venuePersonalityService from './venuePersonalityService';
import teamPerformanceService from './teamPerformanceService';
import { getSeasonSafeDateRange, formatDateRangeDescription } from '../utils/seasonDateUtils';

class EnhancedGameOpportunitiesService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Get comprehensive player insights for game opportunities
   */
  async getEnhancedOpportunityInsights(players, currentDate) {
    const cacheKey = `enhanced_opportunities_${currentDate.toISOString().split('T')[0]}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      console.log('🎯 Generating enhanced opportunity insights...');
      
      const enhancedPlayers = await Promise.all(
        players.map(player => this.getPlayerComprehensiveInsight(player, currentDate))
      );

      const result = {
        players: enhancedPlayers,
        generatedAt: new Date().toISOString(),
        totalOpportunities: enhancedPlayers.length
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error generating enhanced opportunity insights:', error);
      return { players: [], totalOpportunities: 0 };
    }
  }

  /**
   * Get comprehensive insight for a single player
   */
  async getPlayerComprehensiveInsight(player, currentDate) {
    try {
      const [
        seasonRankings,
        streakStatus,
        venueAdvantage,
        timeSlotPreference,
        recentForm,
        teamContext
      ] = await Promise.all([
        this.getPlayerSeasonRankings(player.playerName),
        this.getPlayerStreakStatus(player.playerName, currentDate),
        this.getPlayerVenueAdvantage(player.playerName, player.venue),
        this.getPlayerTimeSlotPreference(player.playerName, currentDate),
        this.getPlayerRecentForm(player.playerName, currentDate),
        this.getPlayerTeamContext(player.team)
      ]);

      // Generate why this player was selected as an opportunity
      const selectionReasons = this.generateSelectionReasons(player, {
        seasonRankings,
        streakStatus,
        venueAdvantage,
        timeSlotPreference,
        recentForm,
        teamContext
      });

      return {
        ...player,
        enhancedInsights: {
          seasonRankings,
          streakStatus,
          venueAdvantage,
          timeSlotPreference,
          recentForm,
          teamContext,
          selectionReasons,
          insightScore: this.calculateInsightScore({
            seasonRankings,
            streakStatus,
            venueAdvantage,
            timeSlotPreference,
            recentForm
          })
        }
      };
    } catch (error) {
      console.error(`Error getting insights for ${player.playerName}:`, error);
      return {
        ...player,
        enhancedInsights: this.getDefaultInsights()
      };
    }
  }

  /**
   * Get player's season rankings and achievements
   */
  async getPlayerSeasonRankings(playerName) {
    try {
      // Load rolling stats data
      const response = await fetch('/data/rolling_stats/season_stats.json');
      if (!response.ok) return this.getDefaultSeasonRankings();
      
      const rollingStats = await response.json();
      
      const achievements = [];
      let topRankings = {};

      // Check hits leaders
      if (rollingStats.topHitters) {
        const hitRank = rollingStats.topHitters.findIndex(p => 
          p.name.toLowerCase().includes(playerName.toLowerCase())
        ) + 1;
        
        if (hitRank > 0 && hitRank <= 10) {
          achievements.push({
            type: 'hits_leader',
            rank: hitRank,
            label: `#${hitRank} Season Hits Leader`,
            icon: '🎯',
            stats: rollingStats.topHitters[hitRank - 1]
          });
          topRankings.hits = hitRank;
        }
      }

      // Check HR leaders
      if (rollingStats.topHRLeaders) {
        const hrRank = rollingStats.topHRLeaders.findIndex(p => 
          p.name.toLowerCase().includes(playerName.toLowerCase())
        ) + 1;
        
        if (hrRank > 0 && hrRank <= 10) {
          achievements.push({
            type: 'hr_leader',
            rank: hrRank,
            label: `#${hrRank} Season HR Leader`,
            icon: '💥',
            stats: rollingStats.topHRLeaders[hrRank - 1]
          });
          topRankings.homeRuns = hrRank;
        }
      }

      return {
        achievements,
        topRankings,
        hasAchievements: achievements.length > 0
      };
    } catch (error) {
      console.error('Error fetching season rankings:', error);
      return this.getDefaultSeasonRankings();
    }
  }

  /**
   * Get player's current streak status and continuation probability
   */
  async getPlayerStreakStatus(playerName, currentDate) {
    try {
      // Load multi-hit stats data
      const response = await fetch('/data/multi_hit_stats/multi_hit_analysis.json');
      if (!response.ok) return this.getDefaultStreakStatus();
      
      const multiHitStats = await response.json();
      
      // Find player in multi-hit data
      const playerStats = multiHitStats.players?.find(p => 
        p.name.toLowerCase().includes(playerName.toLowerCase())
      );

      if (!playerStats) return this.getDefaultStreakStatus();

      const streaks = [];
      let currentStreak = null;

      // Check for active hitting streak
      if (playerStats.currentHitStreak && playerStats.currentHitStreak > 2) {
        currentStreak = {
          type: 'hitting_streak',
          length: playerStats.currentHitStreak,
          label: `${playerStats.currentHitStreak}-Game Hit Streak`,
          icon: '🔥',
          continuationProbability: this.calculateStreakContinuation(playerStats.currentHitStreak),
          isActive: true
        };
        streaks.push(currentStreak);
      }

      // Check multi-hit frequency
      if (playerStats.multiHitRate && playerStats.multiHitRate > 0.3) {
        streaks.push({
          type: 'multi_hit_tendency',
          rate: playerStats.multiHitRate,
          label: 'Multi-Hit Specialist',
          icon: '🎯',
          recentMultiHits: playerStats.recentMultiHitGames || 0,
          isActive: false
        });
      }

      return {
        streaks,
        currentStreak,
        hasActiveStreaks: streaks.some(s => s.isActive),
        multiHitProbability: playerStats.multiHitRate || 0
      };
    } catch (error) {
      console.error('Error fetching streak status:', error);
      return this.getDefaultStreakStatus();
    }
  }

  /**
   * Get player's venue-specific advantages
   */
  async getPlayerVenueAdvantage(playerName, venue) {
    try {
      if (!venue) return this.getDefaultVenueAdvantage();

      const venueAnalysis = await venuePersonalityService.analyzePlayerVenueHistory(playerName, venue);
      
      const advantages = [];
      
      if (venueAnalysis.gamesPlayed >= 3) {
        const { venueStats, venuePersonality } = venueAnalysis;
        
        if (venueStats.battingAverage >= 0.300) {
          advantages.push({
            type: 'venue_mastery',
            label: `Excellent at ${venue}`,
            icon: '🏟️',
            average: venueStats.battingAverage,
            games: venueAnalysis.gamesPlayed,
            homeRuns: venueStats.homeRuns,
            classification: venuePersonality.classification
          });
        }

        if (venueStats.homeRuns >= 3) {
          advantages.push({
            type: 'venue_power',
            label: `Power at ${venue}`,
            icon: '💪',
            homeRuns: venueStats.homeRuns,
            games: venueAnalysis.gamesPlayed,
            hrRate: (venueStats.homeRuns / venueAnalysis.gamesPlayed).toFixed(2)
          });
        }
      }

      return {
        advantages,
        venueStats: venueAnalysis.venueStats,
        gamesPlayed: venueAnalysis.gamesPlayed,
        hasAdvantages: advantages.length > 0
      };
    } catch (error) {
      console.error('Error analyzing venue advantage:', error);
      return this.getDefaultVenueAdvantage();
    }
  }

  /**
   * Get player's time slot preferences (day/night games)
   */
  async getPlayerTimeSlotPreference(playerName, currentDate) {
    try {
      // Get recent games to analyze time slot performance (limited to current season)
      const dateRange = getSeasonSafeDateRange(currentDate, 30); // 30 days back or season start
      console.log(`🕐 Time slot analysis for ${playerName}: ${formatDateRangeDescription(dateRange)}`);
      
      const recentGames = await fetchPlayerDataForDateRange(
        dateRange.startDate,
        dateRange.endDate
      );

      const playerGames = recentGames.filter(game => 
        game.name?.toLowerCase().includes(playerName.toLowerCase())
      );

      if (playerGames.length < 5) return this.getDefaultTimeSlotPreference();

      // Classify games by time (rough estimation)
      const dayGames = playerGames.filter(game => {
        const hour = new Date(game.date).getHours();
        return hour >= 10 && hour < 17; // Day games
      });

      const nightGames = playerGames.filter(game => {
        const hour = new Date(game.date).getHours();
        return hour >= 17 || hour < 3; // Night games
      });

      const preferences = [];

      if (dayGames.length >= 3) {
        const dayAvg = dayGames.reduce((sum, g) => sum + (g.H || 0), 0) / 
                      Math.max(1, dayGames.reduce((sum, g) => sum + (g.AB || 0), 0));
        
        if (dayAvg >= 0.280) {
          preferences.push({
            type: 'day_game_specialist',
            label: 'Day Game Specialist',
            icon: '☀️',
            average: dayAvg,
            games: dayGames.length
          });
        }
      }

      if (nightGames.length >= 3) {
        const nightAvg = nightGames.reduce((sum, g) => sum + (g.H || 0), 0) / 
                        Math.max(1, nightGames.reduce((sum, g) => sum + (g.AB || 0), 0));
        
        if (nightAvg >= 0.280) {
          preferences.push({
            type: 'night_game_specialist',
            label: 'Night Game Specialist',
            icon: '🌙',
            average: nightAvg,
            games: nightGames.length
          });
        }
      }

      return {
        preferences,
        dayGameStats: { games: dayGames.length, average: dayGames.length > 0 ? dayGames.reduce((sum, g) => sum + (g.H || 0), 0) / Math.max(1, dayGames.reduce((sum, g) => sum + (g.AB || 0), 0)) : 0 },
        nightGameStats: { games: nightGames.length, average: nightGames.length > 0 ? nightGames.reduce((sum, g) => sum + (g.H || 0), 0) / Math.max(1, nightGames.reduce((sum, g) => sum + (g.AB || 0), 0)) : 0 },
        hasPreferences: preferences.length > 0
      };
    } catch (error) {
      console.error('Error analyzing time slot preferences:', error);
      return this.getDefaultTimeSlotPreference();
    }
  }

  /**
   * Get player's recent form and momentum
   */
  async getPlayerRecentForm(playerName, currentDate) {
    try {
      // Get recent games for form analysis (limited to current season)
      const dateRange = getSeasonSafeDateRange(currentDate, 7); // 7 days back or season start
      console.log(`📈 Recent form analysis for ${playerName}: ${formatDateRangeDescription(dateRange)}`);
      
      const recentGames = await fetchPlayerDataForDateRange(
        dateRange.startDate,
        dateRange.endDate
      );

      const playerGames = recentGames.filter(game => 
        game.name?.toLowerCase().includes(playerName.toLowerCase())
      );

      if (playerGames.length === 0) return this.getDefaultRecentForm();

      const hits = playerGames.reduce((sum, g) => sum + (g.H || 0), 0);
      const atBats = playerGames.reduce((sum, g) => sum + (g.AB || 0), 0);
      const homeRuns = playerGames.reduce((sum, g) => sum + (g.HR || 0), 0);
      const rbi = playerGames.reduce((sum, g) => sum + (g.RBI || 0), 0);

      const average = atBats > 0 ? hits / atBats : 0;
      
      const form = [];
      
      if (average >= 0.350) {
        form.push({
          type: 'hot_streak',
          label: 'Red Hot',
          icon: '🔥',
          average,
          games: playerGames.length
        });
      } else if (average >= 0.280) {
        form.push({
          type: 'good_form',
          label: 'Good Form',
          icon: '📈',
          average,
          games: playerGames.length
        });
      }

      if (homeRuns >= 2) {
        form.push({
          type: 'power_surge',
          label: 'Power Surge',
          icon: '💥',
          homeRuns,
          games: playerGames.length
        });
      }

      return {
        form,
        recentStats: {
          games: playerGames.length,
          average,
          hits,
          homeRuns,
          rbi
        },
        momentum: this.calculateMomentum(playerGames),
        isHot: average >= 0.300
      };
    } catch (error) {
      console.error('Error analyzing recent form:', error);
      return this.getDefaultRecentForm();
    }
  }

  /**
   * Get team context and momentum
   */
  async getPlayerTeamContext(teamCode) {
    try {
      const teamAnalysis = await teamPerformanceService.analyzeTeamOffensivePerformance(teamCode);
      
      const context = [];
      
      if (teamAnalysis.classification === 'elite' || teamAnalysis.classification === 'strong') {
        context.push({
          type: 'strong_offense',
          label: 'Strong Team Offense',
          icon: '⚡',
          classification: teamAnalysis.classification
        });
      }

      if (teamAnalysis.trend === 'surging' || teamAnalysis.trend === 'improving') {
        context.push({
          type: 'team_momentum',
          label: 'Team on Fire',
          icon: '🚀',
          trend: teamAnalysis.trend
        });
      }

      return {
        context,
        teamAnalysis,
        hasPositiveContext: context.length > 0
      };
    } catch (error) {
      console.error('Error analyzing team context:', error);
      return this.getDefaultTeamContext();
    }
  }

  /**
   * Generate reasons why this player was selected as an opportunity
   */
  generateSelectionReasons(player, insights) {
    const reasons = [];

    // High score reason
    if (player.score >= 90) {
      reasons.push({
        type: 'elite_score',
        text: `Elite opportunity score of ${player.score}`,
        icon: '🌟',
        priority: 'high'
      });
    } else if (player.score >= 80) {
      reasons.push({
        type: 'high_score',
        text: `Strong opportunity score of ${player.score}`,
        icon: '⭐',
        priority: 'medium'
      });
    }

    // Season achievements
    if (insights.seasonRankings.hasAchievements) {
      insights.seasonRankings.achievements.forEach(achievement => {
        reasons.push({
          type: 'season_achievement',
          text: achievement.label,
          icon: achievement.icon,
          priority: 'high'
        });
      });
    }

    // Active streaks
    if (insights.streakStatus.hasActiveStreaks) {
      insights.streakStatus.streaks.forEach(streak => {
        if (streak.isActive) {
          reasons.push({
            type: 'active_streak',
            text: streak.label,
            icon: streak.icon,
            priority: 'high'
          });
        }
      });
    }

    // Venue advantages
    if (insights.venueAdvantage.hasAdvantages) {
      insights.venueAdvantage.advantages.forEach(advantage => {
        reasons.push({
          type: 'venue_advantage',
          text: advantage.label,
          icon: advantage.icon,
          priority: 'medium'
        });
      });
    }

    // Recent form
    if (insights.recentForm.isHot) {
      insights.recentForm.form.forEach(formItem => {
        reasons.push({
          type: 'recent_form',
          text: formItem.label,
          icon: formItem.icon,
          priority: 'medium'
        });
      });
    }

    // Team context
    if (insights.teamContext.hasPositiveContext) {
      insights.teamContext.context.forEach(contextItem => {
        reasons.push({
          type: 'team_context',
          text: contextItem.label,
          icon: contextItem.icon,
          priority: 'low'
        });
      });
    }

    return reasons.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate overall insight score
   */
  calculateInsightScore(insights) {
    let score = 50; // Base score

    // Season rankings boost
    if (insights.seasonRankings.hasAchievements) {
      score += insights.seasonRankings.achievements.length * 10;
    }

    // Active streaks boost
    if (insights.streakStatus.hasActiveStreaks) {
      score += 15;
    }

    // Venue advantages boost
    if (insights.venueAdvantage.hasAdvantages) {
      score += insights.venueAdvantage.advantages.length * 8;
    }

    // Recent form boost
    if (insights.recentForm.isHot) {
      score += 12;
    }

    // Time slot preferences boost
    if (insights.timeSlotPreference.hasPreferences) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Helper function to calculate streak continuation probability
   */
  calculateStreakContinuation(streakLength) {
    // Simple probability model - longer streaks have diminishing continuation probability
    if (streakLength <= 3) return 0.65;
    if (streakLength <= 5) return 0.55;
    if (streakLength <= 8) return 0.45;
    if (streakLength <= 12) return 0.35;
    return 0.25;
  }

  /**
   * Calculate momentum from recent games
   */
  calculateMomentum(games) {
    if (games.length < 3) return 'insufficient_data';
    
    const recent3 = games.slice(-3);
    const hits = recent3.reduce((sum, g) => sum + (g.H || 0), 0);
    const atBats = recent3.reduce((sum, g) => sum + (g.AB || 0), 0);
    
    if (atBats === 0) return 'insufficient_data';
    
    const average = hits / atBats;
    
    if (average >= 0.400) return 'excellent';
    if (average >= 0.300) return 'good';
    if (average >= 0.200) return 'average';
    return 'struggling';
  }

  // Default values for when data is not available
  getDefaultSeasonRankings() {
    return {
      achievements: [],
      topRankings: {},
      hasAchievements: false
    };
  }

  getDefaultStreakStatus() {
    return {
      streaks: [],
      currentStreak: null,
      hasActiveStreaks: false,
      multiHitProbability: 0
    };
  }

  getDefaultVenueAdvantage() {
    return {
      advantages: [],
      venueStats: {},
      gamesPlayed: 0,
      hasAdvantages: false
    };
  }

  getDefaultTimeSlotPreference() {
    return {
      preferences: [],
      dayGameStats: { games: 0, average: 0 },
      nightGameStats: { games: 0, average: 0 },
      hasPreferences: false
    };
  }

  getDefaultRecentForm() {
    return {
      form: [],
      recentStats: { games: 0, average: 0, hits: 0, homeRuns: 0, rbi: 0 },
      momentum: 'insufficient_data',
      isHot: false
    };
  }

  getDefaultTeamContext() {
    return {
      context: [],
      teamAnalysis: {},
      hasPositiveContext: false
    };
  }

  getDefaultInsights() {
    return {
      seasonRankings: this.getDefaultSeasonRankings(),
      streakStatus: this.getDefaultStreakStatus(),
      venueAdvantage: this.getDefaultVenueAdvantage(),
      timeSlotPreference: this.getDefaultTimeSlotPreference(),
      recentForm: this.getDefaultRecentForm(),
      teamContext: this.getDefaultTeamContext(),
      selectionReasons: [],
      insightScore: 50
    };
  }
}

// Create and export singleton instance
const enhancedGameOpportunitiesService = new EnhancedGameOpportunitiesService();
export default enhancedGameOpportunitiesService;