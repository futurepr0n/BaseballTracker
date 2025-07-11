/**
 * Baseball Analysis API Service
 * Service module for interfacing with the FastAPI baseball analysis backend
 */

import { useState, useEffect, useCallback } from 'react';
import dashboardContextService from './dashboardContextService.js';
import { badgeManager } from '../utils/playerBadgeSystem.js';

class BaseballAnalysisService {
  constructor(baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.initialized = false;
  }

  /**
   * Helper method to make API requests
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Check if the API is healthy and data is initialized
   */
  async checkHealth() {
    try {
      const health = await this.makeRequest('/health');
      
      // For enhanced API, also check data status
      try {
        const dataStatus = await this.getDataStatus();
        this.initialized = dataStatus.initialization_status === 'completed';
        return { ...health, dataStatus, initialized: this.initialized };
      } catch (statusError) {
        // Fallback for original API
        this.initialized = health.initialized || false;
        return health;
      }
    } catch (error) {
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Get data initialization status
   */
  async getDataStatus() {
    return await this.makeRequest('/data/status');
  }

  /**
   * Get data quality information (Enhanced API)
   */
  async getDataQuality() {
    try {
      return await this.makeRequest('/analyze/data-quality');
    } catch (error) {
      console.warn('Enhanced data quality endpoint not available:', error.message);
      return { enhanced_features_active: false };
    }
  }

  /**
   * Transform API response to match React component expectations
   */
  transformPrediction(prediction) {
    const outcome_probabilities = prediction.outcome_probabilities || {};
    const recentData = prediction.recent_N_games_raw_data?.trends_summary_obj || {};
    const details = prediction.details || {};
    const componentBreakdown = prediction.component_breakdown || prediction.matchup_components || {};
    
    // Helper function to safely extract numeric values
    const safeNumber = (value, defaultValue = 0) => {
      if (typeof value === 'number' && !isNaN(value)) return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return !isNaN(parsed) ? parsed : defaultValue;
      }
      return defaultValue;
    };

    // Helper function to format percentage
    const formatPercent = (value, defaultValue = 0) => {
      const num = safeNumber(value, defaultValue);
      return num > 1 ? num : num * 100; // Convert decimal to percentage if needed
    };
    
    const result = {
      // Map API fields to expected React component fields
      player_name: prediction.batter_name || prediction.player_name,
      team: prediction.team || prediction.batter_team,
      batter_hand: prediction.batter_hand,
      pitcher_hand: prediction.pitcher_hand,
      
      // Core scores
      hr_score: safeNumber(prediction.score || prediction.hr_score, 0),
      confidence: safeNumber(prediction.confidence, 0),
      data_source: prediction.data_source,
      
      // Probabilities - API returns as numbers, component expects them
      hr_probability: safeNumber(outcome_probabilities.homerun || prediction.hr_probability, 0),
      hit_probability: safeNumber(outcome_probabilities.hit || prediction.hit_probability, 0),
      reach_base_probability: safeNumber(outcome_probabilities.reach_base || prediction.reach_base_probability, 0),
      strikeout_probability: safeNumber(outcome_probabilities.strikeout || prediction.strikeout_probability, 0),
      
      // Recent performance - extract from recent data structure
      recent_avg: safeNumber(recentData.avg_avg || prediction.recent_avg, 0),
      hr_rate: formatPercent(recentData.hr_per_pa || recentData.hr_rate || prediction.hr_rate, 0),
      obp: safeNumber(recentData.obp_calc || prediction.obp, 0),
      
      // Due factors - extract from details
      ab_due: safeNumber(details.due_for_hr_ab_raw_score || prediction.ab_due, 0),
      hits_due: safeNumber(details.due_for_hr_hits_raw_score || prediction.hits_due, 0),
      ab_since_last_hr: safeNumber(details.ab_since_last_hr || prediction.ab_since_last_hr, 0),
      expected_ab_per_hr: safeNumber(details.expected_ab_per_hr || prediction.expected_ab_per_hr, 0),
      h_since_last_hr: safeNumber(details.h_since_last_hr || prediction.h_since_last_hr, 0),
      expected_h_per_hr: safeNumber(details.expected_h_per_hr || prediction.expected_h_per_hr, 0),
      
      // Trend information - extract from details and recent data
      heating_up: safeNumber(details.heating_up_contact_raw_score || prediction.heating_up, 0),
      cold: Math.abs(safeNumber(details.cold_batter_contact_raw_score || prediction.cold, 0)), // Convert negative to positive for display
      contact_trend: details.contact_trend || recentData.trend_direction || prediction.contact_trend || 'stable',
      recent_trend_dir: recentData.trend_direction || prediction.recent_trend_dir || 'stable',
      
      // Component scores - extract from component breakdown
      arsenal_matchup: safeNumber(componentBreakdown.arsenal_matchup || prediction.arsenal_matchup, 0),
      batter_overall: safeNumber(componentBreakdown.batter_overall || prediction.batter_overall, 0),
      pitcher_overall: safeNumber(componentBreakdown.pitcher_overall || prediction.pitcher_overall, 0),
      historical_yoy_csv: safeNumber(componentBreakdown.historical_yoy_csv || prediction.historical_yoy_csv, 0),
      recent_daily_games: safeNumber(componentBreakdown.recent_daily_games || prediction.recent_daily_games, 0),
      contextual: safeNumber(componentBreakdown.contextual || prediction.contextual, 0),
      
      // Historical data - extract from details or direct fields
      iso_2024: safeNumber(details.iso_2024 || prediction.iso_2024, 0),
      iso_2025: safeNumber(details.iso_2025_adj_for_trend || details.batter_iso_adj || prediction.iso_2025, 0),
      iso_trend: details.iso_trend_2025v2024 ? (details.iso_trend_2025v2024 > 0 ? 'improving' : details.iso_trend_2025v2024 < 0 ? 'declining' : 'stable') : (prediction.iso_trend || 'stable'),
      batter_pa_2025: safeNumber(details.batter_pa_2025 || prediction.batter_pa_2025, 0),
      
      // Matchup specific - extract from details if available
      ev_matchup_score: safeNumber(details.ev_matchup_score || prediction.ev_matchup_score, 0),
      hitter_slg: safeNumber(details.hitter_slg || prediction.hitter_slg, 0),
      pitcher_slg: safeNumber(details.pitcher_slg || prediction.pitcher_slg, 0),
      
      // Pitcher info - extract from prediction or provide defaults
      pitcher_era: safeNumber(prediction.pitcher_era, 4.20),
      pitcher_whip: safeNumber(prediction.pitcher_whip, 1.30),
      pitcher_recent_era: safeNumber(prediction.pitcher_recent_era, prediction.pitcher_era || 4.20),
      
      // Pitcher per-game stats  
      pitcher_h_per_game: safeNumber(prediction.pitcher_h_per_game, 0),
      pitcher_hr_per_game: safeNumber(prediction.pitcher_hr_per_game, 0),
      pitcher_k_per_game: safeNumber(prediction.pitcher_k_per_game, 0),
      
      // Pitcher home stats - extract from prediction
      pitcher_home_h_total: safeNumber(prediction.pitcher_home_h_total, 0),
      pitcher_home_hr_total: safeNumber(prediction.pitcher_home_hr_total, 0),
      pitcher_home_k_total: safeNumber(prediction.pitcher_home_k_total, 0),
      pitcher_home_games: safeNumber(prediction.pitcher_home_games, 0),
      
      // Weather/Environmental factors (from dashboard context or defaults)
      weather_factor: safeNumber(details.weather_factor || prediction.weather_factor, 1.0),
      wind_factor: safeNumber(details.wind_factor || prediction.wind_factor, 1.0),
      
      // Enhanced/calculated fields
      score: safeNumber(prediction.score || prediction.hr_score, 0), // Alias for sorting
      hit: safeNumber(outcome_probabilities.hit || prediction.hit_probability, 0), // Alias for sorting
      reach_base: safeNumber(outcome_probabilities.reach_base || prediction.reach_base_probability, 0), // Alias for sorting
      strikeout: safeNumber(outcome_probabilities.strikeout || prediction.strikeout_probability, 0), // Alias for sorting
      hr: safeNumber(outcome_probabilities.homerun || prediction.hr_probability, 0), // Alias for sorting
      
      // Keep any additional fields that might exist
      ...prediction
    };
    
    // Calculate pitcher trend direction based on recent vs season ERA
    const pitcher_era = safeNumber(prediction.pitcher_era, 4.20);
    const pitcher_recent_era = safeNumber(prediction.pitcher_recent_era, pitcher_era);
    
    if (pitcher_recent_era !== pitcher_era) {
      const era_difference = pitcher_recent_era - pitcher_era;
      if (era_difference < -0.5) {
        result.pitcher_trend_dir = 'improving'; // Recent ERA significantly better
      } else if (era_difference > 0.5) {
        result.pitcher_trend_dir = 'declining'; // Recent ERA significantly worse
      } else {
        result.pitcher_trend_dir = 'stable'; // Small difference
      }
    } else {
      result.pitcher_trend_dir = prediction.pitcher_trend_dir || 'stable';
    }
    
    return result;
  }

  /**
   * Enhance predictions with dashboard context
   * @param {Array} predictions - Array of prediction objects
   * @param {string} date - Date for dashboard context (optional)
   * @returns {Array} Enhanced predictions with dashboard context
   */
  async enhancePredictionsWithDashboardContext(predictions, date = null) {
    if (!predictions || predictions.length === 0) {
      console.log(`❌ No predictions to enhance`);
      return predictions;
    }

    console.log(`🔄 Starting enhancement for ${predictions.length} predictions`);

    try {
      // Process predictions in parallel for performance
      const enhancedPredictions = await Promise.all(
        predictions.map(async (prediction, index) => {
          try {
            console.log(`🔄 Enhancing prediction ${index + 1}: ${prediction.player_name} (${prediction.team})`);
            
            // Get dashboard context for this player
            const context = await dashboardContextService.getPlayerContext(
              prediction.player_name,
              prediction.team,
              date
            );

            // Create badges based on context
            const badges = [];
            context.badges.forEach(badgeText => {
              // Parse badge text to extract badge type
              const badgeType = this.parseBadgeType(badgeText);
              if (badgeType) {
                const badge = badgeManager.createBadge(badgeType, {
                  source: 'dashboard_context'
                });
                if (badge) badges.push(badge);
              }
            });

            // Calculate standout score
            const standoutInfo = badgeManager.getStandoutScore(
              prediction.hr_score || prediction.score || 0,
              badges
            );

            // Categorize player
            const category = badgeManager.categorizePlayer(
              badges,
              prediction.hr_score || prediction.score || 0
            );

            // Debug category assignment
            console.log(`🏷️ Player ${prediction.player_name}: Category = ${category.label}, Badges = ${badges.length}, Score = ${prediction.hr_score || prediction.score || 0}`);

            // Generate tooltip content
            const tooltipContent = badgeManager.generateTooltipContent(badges);

            // Return enhanced prediction
            return {
              ...prediction,
              dashboard_context: {
                badges: badges.map(badge => badgeManager.formatBadge(badge)),
                badgeObjects: badges,
                confidence_boost: context.confidenceBoost,
                standout_reasons: context.standoutReasons,
                risk_factors: context.riskFactors,
                context_summary: context.contextSummary,
                standout_score: standoutInfo.standoutScore,
                is_standout: standoutInfo.isStandout,
                category: category,
                tooltip_content: tooltipContent
              },
              // Add enhanced confidence if it wasn't already present
              enhanced_confidence: (prediction.confidence || 50) + context.confidenceBoost,
              // Update hr_score with dashboard boost for sorting
              enhanced_hr_score: (prediction.hr_score || prediction.score || 0) + context.confidenceBoost
            };
          } catch (error) {
            console.error(`Error enhancing prediction for ${prediction.player_name}:`, error);
            // Return original prediction if enhancement fails
            return {
              ...prediction,
              dashboard_context: {
                badges: [],
                confidence_boost: 0,
                standout_reasons: [],
                risk_factors: ['Error loading dashboard context'],
                context_summary: 'Dashboard context unavailable'
              }
            };
          }
        })
      );

      return enhancedPredictions;
    } catch (error) {
      console.error('Error enhancing predictions with dashboard context:', error);
      return predictions; // Return original predictions if enhancement fails
    }
  }

  /**
   * Parse badge text to determine badge type
   * @param {string} badgeText - Badge text (e.g., "🔥 Hot Streak")
   * @returns {string|null} Badge type key
   */
  parseBadgeType(badgeText) {
    const badgeMap = {
      '🔥 Hot Streak': 'HOT_STREAK',
      '🔥 Active Streak': 'ACTIVE_STREAK',
      '⚡ Due for HR': 'DUE_FOR_HR',
      '⚡ HR Candidate': 'HR_CANDIDATE',
      '📈 Likely Hit': 'LIKELY_HIT',
      '🎯 Multi-Hit': 'MULTI_HIT',
      '⚠️ Risk': 'RISK',
      '🏠 Home Advantage': 'HOME_ADVANTAGE',
      '⏰ Time Slot': 'TIME_SLOT',
      '🆚 Matchup Edge': 'MATCHUP_EDGE',
      '📉 Bounce Back': 'BOUNCE_BACK',
      '📊 Improved Form': 'IMPROVED_FORM',
      // Stadium Context Badges
      '🚀 Launch Pad': 'LAUNCH_PAD',
      '🏟️ Hitter Paradise': 'HITTER_PARADISE',
      '🛡️ Pitcher Fortress': 'PITCHER_FORTRESS',
      '⚾ Pitcher Park': 'PITCHER_FRIENDLY',
      // Weather Context Badges
      '🌪️ Wind Boost': 'WIND_BOOST',
      '💨 Wind Helper': 'WIND_HELPER',
      '🔥 Hot Weather': 'HOT_WEATHER',
      '🏟️ Dome Game': 'DOME_GAME',
      '🥶 Cold Weather': 'COLD_WEATHER',
      '🌬️ Wind Against': 'WIND_AGAINST',
      // Multi-Hit Context Badges
      '🎯 Multi-Hit Pro': 'MULTI_HIT_SPECIALIST',
      '📈 Due Multi-Hit': 'DUE_MULTI_HIT',
      '🔥 Multi-Hit Streak': 'MULTI_HIT_STREAK'
    };

    return badgeMap[badgeText] || null;
  }

  /**
   * Search for players
   */
  async searchPlayers(query, playerType = null) {
    try {
      // Try new POST endpoint first
      const requestData = {
        name: query,
        player_type: playerType
      };
      
      return await this.makeRequest('/players/search', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
    } catch (error) {
      // Fallback to GET endpoint with query params
      console.warn('POST search failed, trying GET:', error.message);
      const params = new URLSearchParams({ query });
      if (playerType) {
        params.append('player_type', playerType);
      }
      
      return await this.makeRequest(`/players/search?${params}`);
    }
  }

  /**
   * Analyze pitcher vs team matchup (Enhanced version with fallback)
   */
  async analyzePitcherVsTeam({
    pitcherName,
    teamAbbr,
    sortBy = 'score',
    ascending = false,
    limit = 20,
    detailed = false,
    includeConfidence = true,
    includeDashboardContext = true,
    date = null
  }) {
    const requestData = {
      pitcher_name: pitcherName,
      team: teamAbbr,
      sort_by: sortBy,
      max_results: limit,
      include_confidence: includeConfidence
    };

    // Try enhanced endpoint first, fallback to original, then to client-side fallback
    let result;
    let usedFallback = false;
    
    try {
      result = await this.makeRequest('/analyze/pitcher-vs-team', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      // Transform the response to match what the React component expects
      if (result && result.predictions) {
        console.log(`🔄 SINGLE: Transforming ${result.predictions.length} predictions`);
        console.log(`🔍 SINGLE: First prediction before transform:`, result.predictions[0]);
        result.predictions = result.predictions.map(prediction => this.transformPrediction(prediction));
        console.log(`✅ SINGLE: First prediction after transform:`, result.predictions[0]);
      }
    } catch (error) {
      console.warn('Enhanced endpoint failed, trying original:', error.message);
      
      try {
        // Fallback to original endpoint format
        const fallbackData = {
          pitcher_name: pitcherName,
          team_abbr: teamAbbr,
          sort_by: sortBy,
          ascending,
          limit,
          detailed
        };
        
        result = await this.makeRequest('/pitcher-vs-team', {
          method: 'POST',
          body: JSON.stringify(fallbackData)
        });
        
        // Transform fallback response too
        if (result && result.predictions) {
          result.predictions = result.predictions.map(prediction => this.transformPrediction(prediction));
        }
      } catch (fallbackError) {
        console.warn('Original endpoint also failed, using client-side fallback:', fallbackError.message);
        
        // Use client-side fallback when API completely fails to find pitcher
        result = await this.generateFallbackPredictions(pitcherName, teamAbbr, limit);
        usedFallback = true;
      }
    }

    // Add fallback indicator to result
    if (result) {
      result.used_client_fallback = usedFallback;
      if (usedFallback) {
        result.fallback_reason = `Pitcher "${pitcherName}" not found in data - using league average projections`;
      }
    }

    // Enhance with dashboard context if requested
    if (includeDashboardContext && result && result.predictions) {
      try {
        console.log(`🎯 Enhancing ${result.predictions.length} predictions with dashboard context`);
        result.predictions = await this.enhancePredictionsWithDashboardContext(result.predictions, date);
        result.enhanced_with_dashboard = true;
        console.log(`✅ Dashboard enhancement complete`);
      } catch (error) {
        console.error('Failed to enhance with dashboard context:', error);
        result.enhanced_with_dashboard = false;
      }
    } else {
      console.log(`❌ Dashboard enhancement skipped:`, {
        includeDashboardContext,
        hasResult: !!result,
        hasPredictions: !!(result && result.predictions)
      });
    }
    
    return result;
  }

  /**
   * Generate fallback predictions using league averages when pitcher not found
   */
  async generateFallbackPredictions(pitcherName, teamAbbr, limit = 20) {
    console.log(`🔄 Generating fallback predictions for ${pitcherName} vs ${teamAbbr}`);
    
    try {
      // Load team roster to get batter lineup
      const teamBatters = await this.getTeamBatters(teamAbbr);
      
      if (!teamBatters || teamBatters.length === 0) {
        throw new Error(`No batters found for team ${teamAbbr}`);
      }
      
      // Generate league average predictions for ALL batters (not limited yet)
      console.log(`🔄 Generating predictions for all ${teamBatters.length} batters for proper sorting...`);
      const fallbackPredictionPromises = teamBatters.map((batter, index) => {
        return this.generateLeagueAveragePrediction(batter, pitcherName, teamAbbr, index);
      });
      
      const allPredictions = await Promise.all(fallbackPredictionPromises);
      
      // Now sort ALL predictions by hr_score (descending by default)
      allPredictions.sort((a, b) => {
        const aScore = a.hr_score || a.score || 0;
        const bScore = b.hr_score || b.score || 0;
        return bScore - aScore; // Descending order (best scores first)
      });
      
      // Take only the top N after sorting
      const fallbackPredictions = allPredictions.slice(0, limit);
      
      console.log(`✅ Generated ${allPredictions.length} total predictions, returning top ${fallbackPredictions.length}`);
      console.log(`📊 Score range: ${fallbackPredictions[0]?.hr_score?.toFixed(1)} to ${fallbackPredictions[fallbackPredictions.length-1]?.hr_score?.toFixed(1)}`);
      
      return {
        predictions: fallbackPredictions,
        pitcher_name: pitcherName,
        team_abbr: teamAbbr,
        total_predictions: fallbackPredictions.length,
        confidence_distribution: {
          high: 0,
          medium: fallbackPredictions.length, // All medium confidence for league averages
          low: 0
        },
        analysis_summary: {
          avg_hr_score: 45.0, // League average baseline
          avg_confidence: 0.4, // Lower confidence for fallback
          data_completeness: 0.3 // Low completeness since using fallbacks
        },
        fallback_info: {
          type: 'league_average',
          reason: `Pitcher "${pitcherName}" not found in training data`,
          methodology: 'Using league average performance vs typical pitcher profile'
        }
      };
      
    } catch (error) {
      console.error('Error generating fallback predictions:', error);
      throw new Error(`Failed to generate fallback predictions: ${error.message}`);
    }
  }

  /**
   * Get today's starting lineup for a team
   */
  async getTodaysStartingLineup(teamAbbr) {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Try multiple possible lineup file formats
      const possiblePaths = [
        `/data/lineups/starting_lineups_${dateStr}.json`,
        `/data/predictions/today_lineups.json`,
        `/data/schedule/today_games.json`
      ];
      
      for (const filePath of possiblePaths) {
        try {
          const response = await fetch(filePath);
          if (response.ok) {
            const lineupData = await response.json();
            
            // Handle different lineup data formats
            let teamLineup = null;
            
            if (Array.isArray(lineupData)) {
              // Array format: find team in array
              const teamGame = lineupData.find(game => 
                game.team === teamAbbr || 
                game.homeTeam === teamAbbr || 
                game.awayTeam === teamAbbr
              );
              teamLineup = teamGame?.lineup || teamGame?.batters;
            } else if (lineupData[teamAbbr]) {
              // Object format: direct team lookup
              teamLineup = lineupData[teamAbbr].lineup || lineupData[teamAbbr].batters;
            }
            
            if (teamLineup && teamLineup.length > 0) {
              console.log(`✅ Found starting lineup in ${filePath} for ${teamAbbr}`);
              return teamLineup.map((player, index) => ({
                name: player.name || player.fullName,
                fullName: player.fullName || player.name,
                team: teamAbbr,
                type: 'batter',
                bats: player.bats || 'R',
                status: 'active',
                battingOrder: index + 1,
                fromStartingLineup: true // Flag to indicate this is today's confirmed lineup
              }));
            }
          }
        } catch (fileError) {
          // Continue to next file path
          continue;
        }
      }
      
      return null; // No starting lineup found
    } catch (error) {
      console.warn(`Error loading starting lineup for ${teamAbbr}:`, error.message);
      return null;
    }
  }

  /**
   * Get team batters from roster data
   */
  async getTeamBatters(teamAbbr) {
    try {
      // Step 1: Try to load today's actual starting lineup first (highest priority)
      console.log(`🔄 Checking for today's starting lineup for ${teamAbbr}...`);
      const todayLineup = await this.getTodaysStartingLineup(teamAbbr);
      if (todayLineup && todayLineup.length > 0) {
        console.log(`✅ Found today's starting lineup: ${todayLineup.length} batters for ${teamAbbr}`);
        return todayLineup;
      }
      
      // Step 2: Try to get players from recent daily game data (active players only)
      console.log(`🔄 Loading recent game data for ${teamAbbr}...`);
      const recentPlayers = await this.getPlayersFromRecentGames(teamAbbr);
      if (recentPlayers.length > 0) {
        console.log(`✅ Found ${recentPlayers.length} batters from recent games for ${teamAbbr}`);
        return recentPlayers;
      }
      
      // Step 3: Fall back to roster data only if no recent game data available
      console.log(`🔄 Loading roster data for ${teamAbbr}...`);
      const response = await fetch('/data/rosters.json');
      if (response.ok) {
        const rosters = await response.json();
        const teamBatters = rosters.filter(player => 
          player.team === teamAbbr && 
          player.type === 'hitter'
        );
        
        if (teamBatters.length > 0) {
          console.log(`⚠️ Using roster data: ${teamBatters.length} batters for ${teamAbbr} (no recent lineup data)`);
          return teamBatters.map(player => ({
            name: player.name,
            fullName: player.fullName || player.name,
            team: teamAbbr,
            type: 'batter',
            bats: player.bats || 'R',
            status: 'active',
            fromRoster: true // Flag to indicate this is roster data, not active lineup
          }));
        }
      }
      
      // Step 4: Generate meaningful fallback with real-sounding names
      console.log(`⚠️ No lineup or roster data for ${teamAbbr}, using fallback lineup`);
      return this.generateMeaningfulFallback(teamAbbr);
      
    } catch (error) {
      console.warn('Could not load team data, using fallback lineup:', error.message);
      return this.generateMeaningfulFallback(teamAbbr);
    }
  }

  /**
   * Get players from recent daily game data
   */
  async getPlayersFromRecentGames(teamAbbr) {
    try {
      const today = new Date();
      const dates = [];
      
      // Check last 7 days for recent game data
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        dates.push(dateStr);
      }
      
      for (const date of dates) {
        try {
          const [year, month, day] = date.split('-');
          const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' }).toLowerCase();
          const filePath = `/data/${year}/${monthName}/${monthName}_${day.padStart(2, '0')}_${year}.json`;
          
          const response = await fetch(filePath);
          if (response.ok) {
            const gameData = await response.json();
            
            // Look for players in this team's games
            if (gameData.players) {
              const teamBatters = gameData.players.filter(player => 
                player.team === teamAbbr && 
                player.playerType !== 'pitcher' &&
                player.name
              );
              
              if (teamBatters.length > 0) {
                // Convert to standard format
                return teamBatters.slice(0, 9).map(player => ({
                  name: player.name,
                  fullName: player.name, // Use same name as fullName
                  team: teamAbbr,
                  type: 'batter',
                  bats: 'R', // Default to right-handed
                  status: 'active',
                  fromRecentGames: true
                }));
              }
            }
          }
        } catch (fileError) {
          // Continue to next date if this file doesn't exist
          continue;
        }
      }
      
      return [];
      
    } catch (error) {
      console.warn('Error loading recent game data:', error.message);
      return [];
    }
  }

  /**
   * Generate meaningful fallback names instead of positions
   */
  generateMeaningfulFallback(teamAbbr) {
    // Common baseball player last names to make it look more realistic
    const commonLastNames = [
      'Rodriguez', 'Martinez', 'Johnson', 'Williams', 'Brown', 
      'Davis', 'Miller', 'Wilson', 'Garcia', 'Anderson',
      'Taylor', 'Thomas', 'Jackson', 'White', 'Harris'
    ];
    
    const commonFirstNames = [
      'Alex', 'Mike', 'Chris', 'John', 'David', 'Jose', 'Luis',
      'Carlos', 'Ryan', 'Tyler', 'Brandon', 'Kevin', 'Jake', 'Matt', 'Tony'
    ];
    
    const positions = ['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'C', 'DH'];
    
    return positions.map((position, index) => {
      const firstName = commonFirstNames[index % commonFirstNames.length];
      const lastName = commonLastNames[index % commonLastNames.length];
      const playerName = `${firstName} ${lastName}`;
      
      return {
        name: playerName,
        fullName: playerName,
        team: teamAbbr,
        type: 'batter',
        position: position,
        status: 'active',
        battingOrder: index + 1,
        bats: Math.random() > 0.7 ? 'L' : 'R',
        isFallback: true
      };
    });
  }

  /**
   * Generate league average prediction for a single batter
   * Creates complete field structure matching API predictions (75 fields)
   */
  async generateLeagueAveragePrediction(batter, pitcherName, teamAbbr, battingOrderPosition) {
    // League average baseline stats (from BaseballAPI fallback data)
    const leagueAverages = {
      hr_probability: 4.5 + (Math.random() * 3), // 4.5-7.5% range
      hit_probability: 24.5 + (Math.random() * 6), // 24.5-30.5% range
      reach_base_probability: 32.0 + (Math.random() * 8), // 32-40% range
      strikeout_probability: 22.8 + (Math.random() * 6), // 22.8-28.8% range
      hr_score: 40 + (Math.random() * 20), // 40-60 baseline range
      confidence: 0.35 + (Math.random() * 0.15) // 35-50% confidence
    };

    // Adjust for batting order position (top of order slightly better)
    const orderAdjustment = Math.max(0.9, 1.1 - (battingOrderPosition * 0.02));
    
    // Apply handedness adjustments (rough estimates)
    const handsAdjustment = this.getHandednessAdjustment(batter.bats);
    
    // Generate realistic pitcher stats based on league averages + variation
    const pitcherStats = await this.generateRealisticPitcherStats(pitcherName);
    
    // Check for low-data conditions and set appropriate flags
    const lowDataFlags = this.checkForLowDataConditions(batter, pitcherStats);
    
    const prediction = {
      // Core player identification (matches API structure)
      player_name: batter.name || batter.fullName,
      team: teamAbbr,
      batter_hand: batter.bats || 'R',
      pitcher_hand: 'R', // Assume RHP (70% of pitchers)
      
      // Core scores and probabilities
      hr_score: Math.min(100, leagueAverages.hr_score * orderAdjustment * handsAdjustment),
      confidence: Math.max(0.1, leagueAverages.confidence - lowDataFlags.confidencePenalty),
      data_source: 'fallback_league_average',
      
      // Probabilities (already as percentages like API)
      hr_probability: Math.min(20, leagueAverages.hr_probability * orderAdjustment * handsAdjustment),
      hit_probability: Math.min(50, leagueAverages.hit_probability * orderAdjustment),
      reach_base_probability: Math.min(60, leagueAverages.reach_base_probability * orderAdjustment),
      strikeout_probability: Math.max(10, leagueAverages.strikeout_probability / orderAdjustment),
      
      // Recent performance metrics
      recent_avg: 0.240 + (Math.random() * 0.080), // .240-.320 range
      hr_rate: (0.035 + (Math.random() * 0.025)) * 100, // 3.5-6% as percentage
      obp: 0.315 + (Math.random() * 0.070), // .315-.385 range
      
      // Due factors (league average ranges)
      ab_due: 15 + (Math.random() * 25), // 15-40 range
      hits_due: 8 + (Math.random() * 15), // 8-23 range 
      ab_since_last_hr: Math.floor(20 + Math.random() * 40), // 20-60 ABs
      expected_ab_per_hr: 25 + (Math.random() * 15), // 25-40 expected
      h_since_last_hr: Math.floor(6 + Math.random() * 12), // 6-18 hits
      expected_h_per_hr: 8 + (Math.random() * 6), // 8-14 expected
      
      // Trend information
      heating_up: 15 + (Math.random() * 20), // 15-35 range
      cold: Math.abs(10 + (Math.random() * 15)), // 10-25 range (positive)
      contact_trend: Math.random() > 0.5 ? 'improving' : 'stable',
      recent_trend_dir: Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining',
      
      // Component scores (league averages with variation)
      arsenal_matchup: 42.0 + (Math.random() * 16), // 42-58 range
      batter_overall: 45.0 + (Math.random() * 20), // 45-65 range  
      pitcher_overall: 48.0 + (Math.random() * 14), // 48-62 range
      historical_yoy_csv: 8.0 + (Math.random() * 4), // 8-12 range
      recent_daily_games: 46.0 + (Math.random() * 18), // 46-64 range
      contextual: 50.0 + (Math.random() * 20), // 50-70 range
      
      // Historical data
      iso_2024: 0.140 + (Math.random() * 0.060), // .140-.200 range
      iso_2025: 0.135 + (Math.random() * 0.065), // .135-.200 range
      iso_trend: Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining',
      batter_pa_2025: Math.floor(180 + Math.random() * 220), // 180-400 PA
      
      // Matchup specific data
      ev_matchup_score: 25 + (Math.random() * 30), // 25-55 range
      hitter_slg: 0.380 + (Math.random() * 0.120), // .380-.500 range
      pitcher_slg: 0.420 + (Math.random() * 0.080), // .420-.500 range
      
      // Pitcher information (using generated realistic stats)
      pitcher_era: pitcherStats.era,
      pitcher_whip: pitcherStats.whip,
      pitcher_recent_era: pitcherStats.recent_era,
      
      // Pitcher per-game stats
      pitcher_h_per_game: pitcherStats.h_per_game,
      pitcher_hr_per_game: pitcherStats.hr_per_game,
      pitcher_k_per_game: pitcherStats.k_per_game,
      
      // Pitcher home stats
      pitcher_home_h_total: pitcherStats.home_h_total,
      pitcher_home_hr_total: pitcherStats.home_hr_total,
      pitcher_home_k_total: pitcherStats.home_k_total,
      pitcher_home_games: pitcherStats.home_games,
      
      // Environmental factors
      weather_factor: 1.0,
      wind_factor: 1.0,
      
      // Enhanced fields matching API response
      score: Math.min(100, leagueAverages.hr_score * orderAdjustment * handsAdjustment),
      hit: leagueAverages.hit_probability * orderAdjustment,
      reach_base: leagueAverages.reach_base_probability * orderAdjustment,
      strikeout: leagueAverages.strikeout_probability / orderAdjustment,
      hr: leagueAverages.hr_probability * orderAdjustment * handsAdjustment,
      
      // API field names for compatibility
      batter_name: batter.name || batter.fullName,
      batter_team: teamAbbr,
      pitcher_name: pitcherName,
      pitcher_team: await this.determinePitcherTeam(pitcherName, teamAbbr), // Determine opposing team
      opponent_team: teamAbbr, // Team the pitcher is facing
      original_score: leagueAverages.hr_score * orderAdjustment * handsAdjustment,
      
      // Detailed component breakdown (matching API structure)
      details: {
        due_for_hr_ab_raw_score: 15 + (Math.random() * 25),
        due_for_hr_hits_raw_score: 8 + (Math.random() * 15),
        heating_up_contact_raw_score: 15 + (Math.random() * 20),
        cold_batter_contact_raw_score: -(10 + (Math.random() * 15)),
        ev_matchup_score: 25 + (Math.random() * 30),
        iso_2024: 0.140 + (Math.random() * 0.060),
        iso_2025_adj_for_trend: 0.135 + (Math.random() * 0.065),
        batter_pa_2025: Math.floor(180 + Math.random() * 220)
      },
      
      // Component breakdown structure
      component_breakdown: {
        arsenal_matchup: 42.0 + (Math.random() * 16),
        batter_overall: 45.0 + (Math.random() * 20),
        pitcher_overall: 48.0 + (Math.random() * 14),
        historical_yoy_csv: 8.0 + (Math.random() * 4),
        recent_daily_games: 46.0 + (Math.random() * 18),
        contextual: 50.0 + (Math.random() * 20)
      },
      
      // Matchup components (alternate field name)
      matchup_components: {
        arsenal_matchup: 42.0 + (Math.random() * 16),
        contextual: 50.0 + (Math.random() * 20),
        batter_overall: 45.0 + (Math.random() * 20),
        recent_daily_games: 46.0 + (Math.random() * 18),
        pitcher_overall: 48.0 + (Math.random() * 14),
        historical_yoy_csv: 8.0 + (Math.random() * 4)
      },
      
      // Weights used in calculation
      weights_used: {
        arsenal_matchup: 0.4,
        contextual: 0.2,
        batter_overall: 0.15,
        recent_daily_games: 0.1,
        pitcher_overall: 0.1,
        historical_yoy_csv: 0.05
      },
      
      // Outcome probabilities structure
      outcome_probabilities: {
        homerun: leagueAverages.hr_probability * orderAdjustment * handsAdjustment,
        hit: leagueAverages.hit_probability * orderAdjustment,
        reach_base: leagueAverages.reach_base_probability * orderAdjustment,
        strikeout: leagueAverages.strikeout_probability / orderAdjustment
      },
      
      // Recent N games raw data structure
      recent_N_games_raw_data: {
        games_list: [], // Empty for fallback
        trends_summary_obj: {
          total_games: 10,
          avg_avg: 0.240 + (Math.random() * 0.080),
          hr_rate: (0.035 + (Math.random() * 0.025)),
          hr_per_pa: (0.035 + (Math.random() * 0.025)),
          obp_calc: 0.315 + (Math.random() * 0.070),
          trend_direction: Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining',
          trend_magnitude: Math.random() * 0.05,
          trend_early_val: 0.235 + (Math.random() * 0.070),
          trend_recent_val: 0.245 + (Math.random() * 0.070),
          trend_metric: 'avg'
        },
        at_bats: []
      },
      
      // Data quality summary
      data_quality_summary: {
        completeness: 0.3,
        confidence: leagueAverages.confidence,
        fallback_level: 'high',
        source: 'league_averages'
      },
      
      // Player ID (fallback)
      player_id: `fallback_${teamAbbr}_${battingOrderPosition + 1}`,
      
      // Pitcher trend direction
      pitcher_trend_dir: Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining',
      
      // Matchup tagging fields
      matchup_pitcher: pitcherName,
      matchup_team: teamAbbr,
      
      // Fallback indicators
      used_fallback: true,
      fallback_reason: `Pitcher "${pitcherName}" not found in training data`,
      is_fallback_prediction: true,
      fallback_type: 'league_average',
      data_quality: lowDataFlags.hasLowData ? 'very_low' : 'low',
      
      // Low-data warning flags
      low_data_warning: lowDataFlags.hasLowData,
      low_data_reasons: lowDataFlags.reasons,
      small_sample_size: lowDataFlags.smallSampleSize,
      limited_pitcher_data: lowDataFlags.limitedPitcherData,
      
      // Position in lineup
      batting_order: battingOrderPosition + 1,
      
      // Source indicators for debugging
      from_starting_lineup: batter.fromStartingLineup || false,
      from_recent_games: batter.fromRecentGames || false,
      from_roster: batter.fromRoster || false,
      is_fallback_player: batter.isFallback || false
    };

    return prediction;
  }

  /**
   * Determine the pitcher's team based on context
   */
  async determinePitcherTeam(pitcherName, battingTeam) {
    try {
      // First, try to find the pitcher in recent game data (search broader range)
      const today = new Date();
      const dates = [];
      
      // Check last 30 days for game data to find pitcher's team
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        dates.push(dateStr);
      }
      
      for (const date of dates) {
        try {
          const [year, month, day] = date.split('-');
          const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' }).toLowerCase();
          const filePath = `/data/${year}/${monthName}/${monthName}_${day.padStart(2, '0')}_${year}.json`;
          
          const response = await fetch(filePath);
          if (response.ok) {
            const gameData = await response.json();
            
            // Look for this pitcher in the games
            if (gameData.players) {
              const pitcher = gameData.players.find(player => 
                player.playerType === 'pitcher' && 
                (player.name === pitcherName || 
                 player.fullName === pitcherName ||
                 (player.name && player.name.toLowerCase().includes(pitcherName.toLowerCase())))
              );
              
              if (pitcher && pitcher.team) {
                console.log(`✅ Found pitcher ${pitcherName} on team ${pitcher.team}`);
                return pitcher.team;
              }
            }
          }
        } catch (fileError) {
          continue;
        }
      }
      
      // If not found in recent games, try to determine from today's schedule/lineup data
      const scheduleTeam = await this.findPitcherTeamFromSchedule(pitcherName, battingTeam);
      if (scheduleTeam) {
        return scheduleTeam;
      }
      
      // Last resort: return a placeholder that indicates uncertainty
      console.warn(`Could not determine team for pitcher ${pitcherName}, using placeholder`);
      return 'OPP'; // Indicates opposing team (generic)
      
    } catch (error) {
      console.error(`Error determining pitcher team for ${pitcherName}:`, error);
      return 'OPP';
    }
  }

  /**
   * Try to find pitcher team from schedule/lineup data
   */
  async findPitcherTeamFromSchedule(pitcherName, battingTeam) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const possiblePaths = [
        `/data/lineups/starting_lineups_${today}.json`,
        `/data/schedule/today_games.json`,
        `/data/predictions/today_lineups.json`
      ];
      
      for (const filePath of possiblePaths) {
        try {
          const response = await fetch(filePath);
          if (response.ok) {
            const data = await response.json();
            
            // Look for games involving the batting team
            if (Array.isArray(data)) {
              for (const game of data) {
                if (game.homeTeam === battingTeam || game.awayTeam === battingTeam) {
                  // Return the opposing team
                  const opposingTeam = game.homeTeam === battingTeam ? game.awayTeam : game.homeTeam;
                  console.log(`📅 Found pitcher ${pitcherName} likely on ${opposingTeam} (opposing ${battingTeam})`);
                  return opposingTeam;
                }
              }
            } else if (data.games) {
              // Handle different data structure
              for (const game of data.games) {
                if (game.homeTeam === battingTeam || game.awayTeam === battingTeam) {
                  const opposingTeam = game.homeTeam === battingTeam ? game.awayTeam : game.homeTeam;
                  return opposingTeam;
                }
              }
            }
          }
        } catch (fileError) {
          continue;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check for low-data conditions that should trigger warnings
   */
  checkForLowDataConditions(batter, pitcherStats) {
    const reasons = [];
    let confidencePenalty = 0;
    let smallSampleSize = false;
    let limitedPitcherData = false;
    
    // Check pitcher data quality
    if (pitcherStats.data_source === 'league_average_generated') {
      reasons.push('Pitcher stats generated from league averages');
      limitedPitcherData = true;
      confidencePenalty += 0.1;
    } else if (pitcherStats.games_found && pitcherStats.games_found < 10) {
      reasons.push(`Limited pitcher data: only ${pitcherStats.games_found} games found`);
      limitedPitcherData = true;
      confidencePenalty += 0.05;
    }
    
    // Check if pitcher has very few games
    if (pitcherStats.home_games && pitcherStats.home_games < 10) {
      reasons.push(`Pitcher has limited games: ${pitcherStats.home_games} games`);
      smallSampleSize = true;
      confidencePenalty += 0.08;
    }
    
    // Check batter data source
    if (batter.isFallback) {
      reasons.push('Player generated from fallback lineup');
      confidencePenalty += 0.15;
    } else if (batter.fromRoster && !batter.fromRecentGames && !batter.fromStartingLineup) {
      reasons.push('Player from roster data (may not be in active lineup)');
      confidencePenalty += 0.05;
    }
    
    // Flag as low data if we have multiple issues
    const hasLowData = reasons.length >= 2 || confidencePenalty >= 0.15;
    
    if (hasLowData) {
      confidencePenalty += 0.1; // Additional penalty for multiple issues
    }
    
    return {
      hasLowData,
      reasons,
      confidencePenalty: Math.min(0.4, confidencePenalty), // Cap at 40% penalty
      smallSampleSize,
      limitedPitcherData
    };
  }

  /**
   * Generate comprehensive pitcher stats using ALL data sources (CSV + JSON + rosters)
   * This implements the full data integration like BaseballAPI does
   */
  async generateRealisticPitcherStats(pitcherName) {
    console.log(`🔍 Loading comprehensive pitcher data for "${pitcherName}" from all sources...`);
    
    // Step 1: Try to find pitcher data from daily JSON files first
    const pitcherDataFromJSON = await this.searchPitcherInJSON(pitcherName);
    
    // Step 2: Try to find pitcher data from CSV files (like BaseballAPI does)
    const pitcherDataFromCSV = await this.searchPitcherInCSV(pitcherName);
    
    // Step 3: Integrate data sources (prioritize CSV for season stats, JSON for recent form)
    if (pitcherDataFromCSV || pitcherDataFromJSON) {
      const integratedStats = this.integratePitcherData(pitcherDataFromCSV, pitcherDataFromJSON);
      console.log(`✅ Using integrated real data for pitcher "${pitcherName}"`);
      return integratedStats;
    }
    
    console.log(`📊 No real data found, generating league average stats for pitcher "${pitcherName}"`);
    
    // Fallback: Generate realistic league average stats with variation
    const games = Math.floor(12 + Math.random() * 8); // 12-20 games
    const era = 3.80 + (Math.random() * 2.40); // 3.80-6.20 ERA range
    const whip = 1.15 + (Math.random() * 0.40); // 1.15-1.55 WHIP range
    const k_per_game = 4.5 + (Math.random() * 3.5); // 4.5-8.0 K/game range
    
    // Calculate derived stats
    const innings_per_game = 5.0 + (Math.random() * 2.0); // 5-7 innings per game
    const total_innings = games * innings_per_game;
    const h_per_game = (whip * innings_per_game) - (1.5 + Math.random() * 1.0); // WHIP includes walks
    const hr_per_game = (era * innings_per_game) / 9.0 * 0.12; // ~12% of earned runs from HRs
    
    return {
      era: Math.round(era * 100) / 100,
      whip: Math.round(whip * 100) / 100,
      recent_era: Math.round((era + (Math.random() - 0.5) * 1.0) * 100) / 100,
      h_per_game: Math.round(h_per_game * 10) / 10,
      hr_per_game: Math.round(hr_per_game * 10) / 10,
      k_per_game: Math.round(k_per_game * 10) / 10,
      home_games: games,
      home_h_total: Math.round(h_per_game * games),
      home_hr_total: Math.round(hr_per_game * games),
      home_k_total: Math.round(k_per_game * games),
      data_source: 'league_average_generated'
    };
  }

  /**
   * Search for pitcher data in CSV files (like BaseballAPI does)
   * Handles "lastname, firstname" format and matches to pitcher names
   */
  async searchPitcherInCSV(pitcherName) {
    try {
      console.log(`🔍 Searching CSV files for pitcher "${pitcherName}"...`);
      
      // Try to load the same CSV files that BaseballAPI uses
      const csvSources = [
        '/data/stats/custom_pitcher_2025.csv',
        '/data/stats/pitcher_exit_velocity_2025.csv', 
        '/data/stats/pitcherpitcharsenalstats_2025.csv'
      ];
      
      for (const csvPath of csvSources) {
        try {
          const response = await fetch(csvPath);
          if (!response.ok) continue;
          
          const csvText = await response.text();
          const pitcherStats = this.parseCSVForPitcher(csvText, pitcherName);
          
          if (pitcherStats) {
            console.log(`✅ Found pitcher "${pitcherName}" in ${csvPath}`);
            return {
              ...pitcherStats,
              data_source: 'csv_stats',
              source_file: csvPath
            };
          }
        } catch (fileError) {
          console.warn(`Could not load ${csvPath}:`, fileError.message);
          continue;
        }
      }
      
      console.log(`🔍 No CSV data found for pitcher "${pitcherName}"`);
      return null;
      
    } catch (error) {
      console.error(`❌ Error searching CSV files for pitcher "${pitcherName}":`, error);
      return null;
    }
  }

  /**
   * Parse CSV text to find pitcher data
   * Handles "lastname, firstname" format matching
   */
  parseCSVForPitcher(csvText, pitcherName) {
    try {
      const lines = csvText.split('\n');
      if (lines.length < 2) return null;
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Convert pitcher name to possible CSV formats
      const searchNames = this.generatePitcherNameVariations(pitcherName);
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length < headers.length) continue;
        
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });
        
        // Check if this row matches our pitcher
        const csvPlayerName = rowData.name || rowData.player_name || rowData['last_name, first_name'];
        
        if (csvPlayerName && searchNames.some(name => 
          csvPlayerName.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(csvPlayerName.toLowerCase())
        )) {
          // Extract relevant pitcher stats
          return this.extractPitcherStatsFromCSVRow(rowData);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return null;
    }
  }

  /**
   * Generate name variations for matching
   * "John Smith" -> ["Smith, John", "J. Smith", "John Smith", etc.]
   */
  generatePitcherNameVariations(pitcherName) {
    const variations = [pitcherName];
    
    const parts = pitcherName.trim().split(' ');
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      
      // Add "lastname, firstname" format
      variations.push(`${lastName}, ${firstName}`);
      
      // Add "initial lastname" format
      variations.push(`${firstName.charAt(0)}. ${lastName}`);
      
      // Add just lastname for partial matching
      variations.push(lastName);
    }
    
    return variations;
  }

  /**
   * Extract pitcher statistics from CSV row data
   */
  extractPitcherStatsFromCSVRow(rowData) {
    // Extract common pitcher stats from CSV (adapt field names as needed)
    const games = parseInt(rowData.G || rowData.games || 15);
    const innings = parseFloat(rowData.IP || rowData.innings || 0);
    const era = parseFloat(rowData.ERA || rowData.era || 4.50);
    const whip = parseFloat(rowData.WHIP || rowData.whip || 1.30);
    const strikeouts = parseInt(rowData.K || rowData.SO || rowData.strikeouts || 0);
    const hits = parseInt(rowData.H || rowData.hits || 0);
    const walks = parseInt(rowData.BB || rowData.walks || 0);
    const homeRuns = parseInt(rowData.HR || rowData.hr || 0);
    
    // Calculate per-game stats
    const k_per_game = games > 0 ? strikeouts / games : 6.0;
    const h_per_game = games > 0 ? hits / games : 6.5;
    const hr_per_game = games > 0 ? homeRuns / games : 1.0;
    
    return {
      era: Math.round(era * 100) / 100,
      whip: Math.round(whip * 100) / 100,
      recent_era: Math.round(era * 100) / 100, // Use same ERA for recent
      k_per_game: Math.round(k_per_game * 10) / 10,
      h_per_game: Math.round(h_per_game * 10) / 10,
      hr_per_game: Math.round(hr_per_game * 10) / 10,
      home_games: games,
      home_k_total: strikeouts,
      home_h_total: hits,
      home_hr_total: homeRuns,
      total_innings: Math.round(innings * 10) / 10,
      csv_source_data: rowData // Keep original for debugging
    };
  }

  /**
   * Integrate pitcher data from multiple sources (CSV + JSON)
   * CSV data takes priority for season stats, JSON for recent form
   */
  integratePitcherData(csvData, jsonData) {
    // Start with CSV data as base (more comprehensive season stats)
    const integrated = csvData ? { ...csvData } : {};
    
    // Overlay JSON data for recent form and game-specific stats
    if (jsonData) {
      integrated.recent_era = jsonData.era || integrated.era || 4.50;
      integrated.recent_games = jsonData.games_found || integrated.home_games || 10;
      integrated.json_data_available = true;
      
      // If we have more recent data from JSON, use it for per-game calculations
      if (jsonData.games_found && jsonData.games_found >= 5) {
        integrated.k_per_game = jsonData.k_per_game;
        integrated.h_per_game = jsonData.h_per_game;
        integrated.hr_per_game = jsonData.hr_per_game;
      }
    }
    
    // Ensure all required fields are present
    integrated.era = integrated.era || 4.50;
    integrated.whip = integrated.whip || 1.30;
    integrated.recent_era = integrated.recent_era || integrated.era;
    integrated.k_per_game = integrated.k_per_game || 6.0;
    integrated.h_per_game = integrated.h_per_game || 6.5;
    integrated.hr_per_game = integrated.hr_per_game || 1.0;
    integrated.home_games = integrated.home_games || 15;
    integrated.home_k_total = integrated.home_k_total || Math.round(integrated.k_per_game * integrated.home_games);
    integrated.home_h_total = integrated.home_h_total || Math.round(integrated.h_per_game * integrated.home_games);
    integrated.home_hr_total = integrated.home_hr_total || Math.round(integrated.hr_per_game * integrated.home_games);
    
    integrated.data_source = csvData && jsonData ? 'csv_json_integrated' : 
                             csvData ? 'csv_only' : 'json_only';
    
    return integrated;
  }

  /**
   * Search for pitcher data in daily JSON files
   * This implements your requirement to search JSON files for pitcher data
   */
  async searchPitcherInJSON(pitcherName) {
    try {
      // Import dataService functions for searching JSON files
      const { fetchPlayerDataForDateRange, formatDateString } = await import('./dataService');
      
      // Search ENTIRE 2025 season for comprehensive pitcher statistics
      const endDate = new Date();
      const startDate = new Date('2025-01-01'); // Start from beginning of 2025 season
      
      console.log(`🔍 Searching entire 2025 season for pitcher "${pitcherName}" statistics...`);
      
      // Get date range data to search for pitcher stats (full season)
      const dateRangeData = await fetchPlayerDataForDateRange(
        formatDateString(startDate),
        formatDateString(endDate),
        365 // Search entire year
      );
      
      // Aggregate pitcher statistics from daily game files
      const pitcherGames = [];
      const sortedDates = Object.keys(dateRangeData).sort();
      
      for (const dateStr of sortedDates) {
        const playersForDate = dateRangeData[dateStr];
        
        // Search for pitcher in this date's players
        const pitcherData = playersForDate.find(p => {
          return p.playerType === 'pitcher' && 
                 (p.name === pitcherName || 
                  p.fullName === pitcherName ||
                  (p.name && p.name.toLowerCase().includes(pitcherName.toLowerCase())) ||
                  (p.fullName && p.fullName.toLowerCase().includes(pitcherName.toLowerCase())));
        });
        
        if (pitcherData) {
          pitcherGames.push({
            date: dateStr,
            ...pitcherData
          });
        }
      }
      
      // If we found pitcher games, calculate aggregate statistics
      if (pitcherGames.length > 0) {
        console.log(`📊 Found ${pitcherGames.length} games for pitcher "${pitcherName}" in JSON files`);
        
        // Calculate aggregate statistics
        const totalGames = pitcherGames.length;
        let totalInnings = 0;
        let totalHits = 0;
        let totalRuns = 0;
        let totalEarnedRuns = 0;
        let totalWalks = 0;
        let totalStrikeouts = 0;
        let totalHomeRuns = 0;
        
        pitcherGames.forEach(game => {
          // Parse game statistics (handle different field formats)
          const innings = parseFloat(game.IP || game.innings || 0);
          const hits = parseInt(game.H || game.hits || 0);
          const runs = parseInt(game.R || game.runs || 0);
          const earnedRuns = parseInt(game.ER || game.earnedRuns || 0);
          const walks = parseInt(game.BB || game.walks || 0);
          const strikeouts = parseInt(game.K || game.strikeouts || 0);
          const homeRuns = parseInt(game.HR || game.homeRuns || 0);
          
          totalInnings += innings;
          totalHits += hits;
          totalRuns += runs;
          totalEarnedRuns += earnedRuns;
          totalWalks += walks;
          totalStrikeouts += strikeouts;
          totalHomeRuns += homeRuns;
        });
        
        // Calculate season-long statistics
        const era = totalInnings > 0 ? (totalEarnedRuns * 9.0) / totalInnings : 4.50;
        const whip = totalInnings > 0 ? (totalWalks + totalHits) / totalInnings : 1.30;
        const h_per_game = totalGames > 0 ? totalHits / totalGames : 6.0;
        const hr_per_game = totalGames > 0 ? totalHomeRuns / totalGames : 1.0;
        const k_per_game = totalGames > 0 ? totalStrikeouts / totalGames : 5.5;
        
        // Calculate recent form (last 10 games) for trend analysis
        const recentGames = pitcherGames.slice(-10); // Last 10 games
        let recentEarnedRuns = 0;
        let recentInnings = 0;
        let recentStrikeouts = 0;
        let recentHomeRuns = 0;
        
        recentGames.forEach(game => {
          recentEarnedRuns += parseInt(game.ER || game.earnedRuns || 0);
          recentInnings += parseFloat(game.IP || game.innings || 0);
          recentStrikeouts += parseInt(game.K || game.strikeouts || 0);
          recentHomeRuns += parseInt(game.HR || game.homeRuns || 0);
        });
        
        const recent_era = recentInnings > 0 ? (recentEarnedRuns * 9.0) / recentInnings : era;
        const recent_k_per_game = recentGames.length > 0 ? recentStrikeouts / recentGames.length : k_per_game;
        const recent_hr_per_game = recentGames.length > 0 ? recentHomeRuns / recentGames.length : hr_per_game;
        
        const calculatedStats = {
          // Season totals
          era: Math.round(era * 100) / 100,
          whip: Math.round(whip * 100) / 100,
          h_per_game: Math.round(h_per_game * 10) / 10,
          hr_per_game: Math.round(hr_per_game * 10) / 10,
          k_per_game: Math.round(k_per_game * 10) / 10,
          
          // Recent form (last 10 games)
          recent_era: Math.round(recent_era * 100) / 100,
          recent_k_per_game: Math.round(recent_k_per_game * 10) / 10,
          recent_hr_per_game: Math.round(recent_hr_per_game * 10) / 10,
          
          // Game totals (for compatibility with existing code)
          home_games: totalGames,
          home_h_total: totalHits,
          home_hr_total: totalHomeRuns,
          home_k_total: totalStrikeouts,
          
          // Additional comprehensive stats
          total_innings: Math.round(totalInnings * 10) / 10,
          total_walks: totalWalks,
          total_earned_runs: totalEarnedRuns,
          
          // Metadata
          data_source: 'json_aggregated_full_season',
          games_found: totalGames,
          recent_games_analyzed: recentGames.length,
          season_date_range: {
            first_game: pitcherGames[0]?.date,
            last_game: pitcherGames[pitcherGames.length - 1]?.date
          }
        };
        
        console.log(`📈 Calculated stats for ${pitcherName}:`, calculatedStats);
        return calculatedStats;
      }
      
      console.log(`🔍 No pitcher data found for "${pitcherName}" in JSON files`);
      return null;
      
    } catch (error) {
      console.error(`❌ Error searching for pitcher "${pitcherName}" in JSON files:`, error);
      return null;
    }
  }

  /**
   * Get handedness adjustment factor
   */
  getHandednessAdjustment(batterHand) {
    // Rough adjustments based on handedness vs typical RHP
    if (batterHand === 'L') {
      return 1.05; // LHB vs RHP slight advantage
    } else if (batterHand === 'S') {
      return 1.02; // Switch hitter slight advantage
    }
    return 1.0; // RHB vs RHP neutral
  }

  /**
   * Analyze multiple pitcher vs team matchups with fallback support
   */
  async batchAnalysis({
    matchups,
    sortBy = 'score',
    ascending = false,
    limit = 20,
    applyFilters = null,
    hittersFilter = null,
    includeDashboardContext = true,
    date = null
  }) {
    const requestData = {
      matchups,
      sort_by: sortBy,
      ascending,
      limit,
      apply_filters: applyFilters,
      hitters_filter: hittersFilter
    };

    let result;
    let fallbackResults = [];
    let partialFailures = [];

    // Note: Removed /batch-analysis endpoint call since it was causing issues
    // Go directly to individual analysis approach which works reliably
    console.log(`🔄 Processing ${matchups.length} matchups with individual analysis calls...`);
    
    try {
      // Process each matchup individually - this ensures consistent data transformation
      const allPredictions = [];
      const matchupResults = [];
      
      for (const matchup of matchups) {
        try {
          console.log(`🔄 Processing ${matchup.pitcher_name} vs ${matchup.team_abbr}`);
          
          const individualResult = await this.analyzePitcherVsTeam({
            pitcherName: matchup.pitcher_name,
            teamAbbr: matchup.team_abbr,
            sortBy,
            ascending,
            limit: limit,
            includeDashboardContext: false // We'll do this at the end
          });
          
          if (individualResult && individualResult.predictions) {
            console.log(`🔍 BATCH: Individual result for ${matchup.pitcher_name} vs ${matchup.team_abbr}:`, individualResult.predictions.length, 'predictions');
            console.log(`🔍 BATCH: First prediction before tagging:`, individualResult.predictions[0]);
            
            // Debug pitcher-specific data
            if (individualResult.predictions[0]) {
              const firstPred = individualResult.predictions[0];
              console.log(`🎯 PITCHER DATA for ${matchup.pitcher_name}:`, {
                pitcher_name: firstPred.pitcher_name,
                pitcher_era: firstPred.pitcher_era,
                pitcher_whip: firstPred.pitcher_whip,
                pitcher_k_per_game: firstPred.pitcher_k_per_game,
                pitcher_home_hr_total: firstPred.pitcher_home_hr_total,
                pitcher_home_games: firstPred.pitcher_home_games,
                ev_matchup_score: firstPred.ev_matchup_score,
                requested_pitcher: matchup.pitcher_name,
                matches: firstPred.pitcher_name === matchup.pitcher_name
              });
            }
            
            // Tag each prediction with the matchup info
            const taggedPredictions = individualResult.predictions.map(pred => ({
              ...pred,
              matchup_pitcher: matchup.pitcher_name,
              matchup_team: matchup.team_abbr,
              used_fallback: individualResult.used_client_fallback,
              fallback_reason: individualResult.fallback_reason
            }));
            
            console.log(`🔍 BATCH: First prediction after tagging:`, taggedPredictions[0]);
            console.log(`🔍 BATCH: Key fields check - recent_trend_dir:`, taggedPredictions[0].recent_trend_dir, 'pitcher_trend_dir:', taggedPredictions[0].pitcher_trend_dir);
            
            allPredictions.push(...taggedPredictions);
            
            matchupResults.push({
              pitcher_name: matchup.pitcher_name,
              team_abbr: matchup.team_abbr,
              prediction_count: individualResult.predictions.length,
              used_fallback: individualResult.used_client_fallback,
              fallback_reason: individualResult.fallback_reason
            });
            
            if (individualResult.used_client_fallback) {
              fallbackResults.push({
                pitcher: matchup.pitcher_name,
                team: matchup.team_abbr,
                reason: individualResult.fallback_reason
              });
            }
          }
        } catch (matchupError) {
          console.error(`Failed to process matchup ${matchup.pitcher_name} vs ${matchup.team_abbr}:`, matchupError.message);
          partialFailures.push({
            pitcher: matchup.pitcher_name,
            team: matchup.team_abbr,
            error: matchupError.message
          });
        }
      }
      
      // Create a unified result structure
      result = {
        predictions: allPredictions,
        total_matchups_requested: matchups.length,
        successful_matchups: matchupResults.length,
        success_rate: matchupResults.length / matchups.length * 100,
        matchup_results: matchupResults,
        partial_failures: partialFailures.length > 0 ? partialFailures : undefined,
        analysis_summary: {
          total_predictions: allPredictions.length,
          avg_confidence: allPredictions.length > 0 ? 
            allPredictions.reduce((sum, p) => sum + (p.confidence || 0.4), 0) / allPredictions.length : 0,
          data_completeness: fallbackResults.length === 0 ? 0.9 : 0.7,
          methodology: 'Individual enhanced analysis per matchup'
        }
      };
      
      console.log(`✅ Processed ${matchupResults.length}/${matchups.length} matchups successfully`);
      console.log(`🎯 Generated ${allPredictions.length} total predictions`);
      
      // Debug: Check a few predictions to ensure fields are preserved
      if (allPredictions.length > 0) {
        console.log(`🔍 BATCH: Final combined predictions sample:`);
        console.log(`🔍 BATCH: First prediction:`, allPredictions[0]);
        console.log(`🔍 BATCH: Key fields in first prediction - recent_trend_dir:`, allPredictions[0].recent_trend_dir, 'pitcher_trend_dir:', allPredictions[0].pitcher_trend_dir);
        if (allPredictions.length > 1) {
          console.log(`🔍 BATCH: Second prediction:`, allPredictions[1]);
          console.log(`🔍 BATCH: Key fields in second prediction - recent_trend_dir:`, allPredictions[1].recent_trend_dir, 'pitcher_trend_dir:', allPredictions[1].pitcher_trend_dir);
        }
      }
      
      // Sort all predictions
      if (allPredictions.length > 0) {
        allPredictions.sort((a, b) => {
          let aVal = a[sortBy] || a.hr_score || a.score || 0;
          let bVal = b[sortBy] || b.hr_score || b.score || 0;
          
          if (ascending) {
            return aVal - bVal;
          } else {
            return bVal - aVal;
          }
        });
        
        // Apply limit
        const limitedPredictions = allPredictions.slice(0, limit);
        result.predictions = limitedPredictions;
        result.total_predictions = limitedPredictions.length;
        
        // Update analysis summary with actual data
        result.analysis_summary.total_predictions = limitedPredictions.length;
        result.analysis_summary.avg_hr_score = limitedPredictions.reduce((sum, p) => sum + (p.hr_score || p.score || 0), 0) / limitedPredictions.length;
        result.analysis_summary.avg_confidence = limitedPredictions.reduce((sum, p) => sum + (p.confidence || 0.4), 0) / limitedPredictions.length;
      }
      
    } catch (error) {
      console.error('Individual batch analysis failed:', error.message);
      throw new Error(`Batch analysis failed: ${error.message}`);
    }

    // Enhance with dashboard context if requested
    if (includeDashboardContext && result && result.predictions) {
      try {
        console.log(`🎯 Enhancing ${result.predictions.length} batch predictions with dashboard context`);
        console.log(`🔍 BATCH: Before dashboard enhancement - first prediction trend fields:`, {
          recent_trend_dir: result.predictions[0].recent_trend_dir,
          pitcher_trend_dir: result.predictions[0].pitcher_trend_dir
        });
        result.predictions = await this.enhancePredictionsWithDashboardContext(result.predictions, date);
        result.enhanced_with_dashboard = true;
        console.log(`✅ Batch dashboard enhancement complete`);
        console.log(`🔍 BATCH: After dashboard enhancement - first prediction trend fields:`, {
          recent_trend_dir: result.predictions[0].recent_trend_dir,
          pitcher_trend_dir: result.predictions[0].pitcher_trend_dir
        });
      } catch (error) {
        console.error('Failed to enhance batch predictions with dashboard context:', error);
        result.enhanced_with_dashboard = false;
      }
    } else {
      console.log(`❌ Batch dashboard enhancement skipped:`, {
        includeDashboardContext,
        hasResult: !!result,
        hasPredictions: !!(result && result.predictions)
      });
    }
    
    // Final check before returning
    console.log(`🔍 BATCH: Final result before return - total predictions:`, result.predictions?.length);
    if (result.predictions && result.predictions.length > 0) {
      console.log(`🔍 BATCH: Final first prediction trend fields:`, {
        recent_trend_dir: result.predictions[0].recent_trend_dir,
        pitcher_trend_dir: result.predictions[0].pitcher_trend_dir
      });
    }
    
    return result;
  }

  /**
   * Calculate confidence distribution for predictions
   */
  calculateConfidenceDistribution(predictions) {
    let high = 0, medium = 0, low = 0;
    
    predictions.forEach(pred => {
      const confidence = pred.confidence || 0.4;
      if (confidence >= 0.8) {
        high++;
      } else if (confidence >= 0.5) {
        medium++;
      } else {
        low++;
      }
    });
    
    return { high, medium, low };
  }

  /**
   * Get available sorting options
   */
  async getSortOptions() {
    // Always return default options to avoid API dependency
    const defaultOptions = {
      options: [
        { key: 'score', label: 'Overall HR Score', description: 'Overall home run likelihood score' },
        { key: 'hr', label: 'HR Probability', description: 'Home run probability percentage' },
        { key: 'hit', label: 'Hit Probability', description: 'Hit probability percentage' },
        { key: 'reach_base', label: 'Reach Base Probability', description: 'Reach base probability' },
        { key: 'strikeout', label: 'Strikeout Probability', description: 'Strikeout probability (lower is better)' },
        { key: 'confidence', label: 'Confidence', description: 'Data quality confidence level' }
      ]
    };

    try {
      // Try to get options from API, but don't fail if unavailable
      const apiOptions = await this.makeRequest('/sort-options');
      return apiOptions;
    } catch (error) {
      console.info('Using default sort options (API endpoint not available)');
      return defaultOptions;
    }
  }

  /**
   * Reinitialize data (useful for development)
   */
  async reinitializeData() {
    return await this.makeRequest('/data/reinitialize', {
      method: 'POST'
    });
  }

  /**
   * Wait for data to be initialized
   */
  async waitForInitialization(maxAttempts = 30, intervalMs = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await this.checkHealth();
        if (status.initialized) {
          return true;
        }
      } catch (error) {
        console.warn(`Initialization check attempt ${attempt + 1} failed:`, error.message);
      }
      
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    throw new Error('Data initialization timeout');
  }
}

/**
 * React Hook for using the Baseball Analysis Service
 */
export const useBaseballAnalysis = (baseURL) => {
  const [service] = useState(() => new BaseballAnalysisService(baseURL));
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check initialization status
  useEffect(() => {
    const checkInit = async () => {
      try {
        setLoading(true);
        await service.waitForInitialization();
        setInitialized(true);
        setError(null);
      } catch (err) {
        setError(err.message);
        setInitialized(false);
      } finally {
        setLoading(false);
      }
    };

    checkInit();
  }, [service]);

  // Analyze pitcher vs team with error handling
  const analyzePitcherVsTeam = useCallback(async (params) => {
    try {
      setError(null);
      return await service.analyzePitcherVsTeam(params);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [service]);

  // Batch analysis with error handling
  const batchAnalysis = useCallback(async (params) => {
    try {
      setError(null);
      return await service.batchAnalysis(params);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [service]);

  // Search players with error handling
  const searchPlayers = useCallback(async (query, playerType) => {
    try {
      setError(null);
      return await service.searchPlayers(query, playerType);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [service]);

  return {
    service,
    initialized,
    loading,
    error,
    analyzePitcherVsTeam,
    batchAnalysis,
    searchPlayers
  };
};

/**
 * Default service instance
 */
export const baseballAnalysisService = new BaseballAnalysisService();

export default BaseballAnalysisService;

/**
 * Example usage in a React component:
 * 
 * import { useBaseballAnalysis } from './services/baseballAnalysisService';
 * 
 * function PinheadsPlayhouse() {
 *   const { 
 *     initialized, 
 *     loading, 
 *     error, 
 *     analyzePitcherVsTeam,
 *     searchPlayers 
 *   } = useBaseballAnalysis();
 * 
 *   const handleAnalysis = async () => {
 *     try {
 *       const result = await analyzePitcherVsTeam({
 *         pitcherName: 'MacKenzie Gore',
 *         teamAbbr: 'SEA',
 *         sortBy: 'hr',
 *         limit: 10
 *       });
 *       
 *       // Use result.predictions for your table data
 *       console.log(result.predictions);
 *     } catch (err) {
 *       console.error('Analysis failed:', err);
 *     }
 *   };
 * 
 *   if (loading) return <div>Loading analysis system...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (!initialized) return <div>Initializing data...</div>;
 * 
 *   return (
 *     <div>
 *       <button onClick={handleAnalysis}>Run Analysis</button>
 *       // Your table component here
 *     </div>
 *   );
 * }
 */