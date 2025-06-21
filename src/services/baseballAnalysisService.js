/**
 * Baseball Analysis API Service
 * Service module for interfacing with the FastAPI baseball analysis backend
 */

import { useState, useEffect, useCallback } from 'react';
import dashboardContextService from './dashboardContextService';
import { badgeManager } from '../utils/playerBadgeSystem';

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
    
    return {
      // Map API fields to expected React component fields
      player_name: prediction.batter_name || prediction.player_name,
      team: prediction.team || prediction.batter_team,
      batter_hand: prediction.batter_hand,
      pitcher_hand: prediction.pitcher_hand,
      
      // Core scores
      hr_score: prediction.score || prediction.hr_score,
      confidence: prediction.confidence,
      data_source: prediction.data_source,
      
      // Probabilities - API returns as numbers, component expects them
      hr_probability: outcome_probabilities.homerun || prediction.hr_probability,
      hit_probability: outcome_probabilities.hit || prediction.hit_probability,
      reach_base_probability: outcome_probabilities.reach_base || prediction.reach_base_probability,
      strikeout_probability: outcome_probabilities.strikeout || prediction.strikeout_probability,
      
      // Recent performance
      recent_avg: prediction.recent_N_games_raw_data?.trends_summary_obj?.avg_avg || prediction.recent_avg || 0,
      hr_rate: prediction.recent_N_games_raw_data?.trends_summary_obj?.hr_rate || prediction.hr_rate || 0,
      obp: prediction.recent_N_games_raw_data?.trends_summary_obj?.obp_calc || prediction.obp || 0,
      
      // Due factors
      ab_due: prediction.ab_due,
      hits_due: prediction.hits_due,
      ab_since_last_hr: prediction.ab_since_last_hr,
      expected_ab_per_hr: prediction.expected_ab_per_hr,
      h_since_last_hr: prediction.h_since_last_hr,
      expected_h_per_hr: prediction.expected_h_per_hr,
      
      // Trend information
      heating_up: prediction.heating_up,
      cold: prediction.cold,
      contact_trend: prediction.contact_trend,
      
      // Component scores
      arsenal_matchup: prediction.arsenal_matchup,
      batter_overall: prediction.batter_overall,
      pitcher_overall: prediction.pitcher_overall,
      historical_yoy_csv: prediction.historical_yoy_csv,
      recent_daily_games: prediction.recent_daily_games,
      contextual: prediction.contextual,
      
      // Historical data
      iso_2024: prediction.iso_2024,
      iso_2025: prediction.iso_2025,
      iso_trend: prediction.iso_trend,
      batter_pa_2025: prediction.batter_pa_2025,
      
      // Matchup specific
      ev_matchup_score: prediction.ev_matchup_score,
      hitter_slg: prediction.hitter_slg,
      pitcher_slg: prediction.pitcher_slg,
      
      // Trend directions
      recent_trend_dir: prediction.recent_trend_dir,
      
      // Pitcher info (will be same for all batters in a matchup)
      pitcher_era: prediction.pitcher_era,
      pitcher_whip: prediction.pitcher_whip,
      pitcher_trend_dir: prediction.pitcher_trend_dir || 'stable',  // Add fallback in transformation
      
      // Pitcher home stats (comprehensive data from all games)
      pitcher_home_h_total: prediction.pitcher_home_h_total,
      pitcher_home_hr_total: prediction.pitcher_home_hr_total,
      pitcher_home_k_total: prediction.pitcher_home_k_total,
      pitcher_home_games: prediction.pitcher_home_games,
      
      // Keep any additional fields that might exist
      ...prediction
    };
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
        result.predictions = result.predictions.map(prediction => this.transformPrediction(prediction));
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
      
      // Generate league average predictions for each batter
      const fallbackPredictions = teamBatters.slice(0, limit).map((batter, index) => {
        return this.generateLeagueAveragePrediction(batter, pitcherName, teamAbbr, index);
      });
      
      console.log(`✅ Generated ${fallbackPredictions.length} fallback predictions`);
      
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
   * Get team batters from roster data
   */
  async getTeamBatters(teamAbbr) {
    try {
      // Step 1: Try to load roster data from public endpoint
      console.log(`🔄 Loading roster data for ${teamAbbr}...`);
      const response = await fetch('/data/rosters.json');
      if (response.ok) {
        const rosters = await response.json();
        // Fix: roster data uses "hitter" not "batter"
        const teamBatters = rosters.filter(player => 
          player.team === teamAbbr && 
          player.type === 'hitter'
        );
        
        // If we have roster data, use it
        if (teamBatters.length > 0) {
          console.log(`✅ Found ${teamBatters.length} batters in roster for ${teamAbbr}`);
          return teamBatters.map(player => ({
            name: player.name,
            fullName: player.fullName || player.name,
            team: teamAbbr,
            type: 'batter',
            bats: player.bats || 'R',
            status: 'active'
          }));
        }
      }
      
      // Step 2: Try to get players from recent daily game data
      console.log(`⚠️ No roster data for ${teamAbbr}, trying recent game data...`);
      const recentPlayers = await this.getPlayersFromRecentGames(teamAbbr);
      if (recentPlayers.length > 0) {
        console.log(`✅ Found ${recentPlayers.length} batters from recent games for ${teamAbbr}`);
        return recentPlayers;
      }
      
      // Step 3: Generate meaningful fallback with real-sounding names
      console.log(`⚠️ No recent game data for ${teamAbbr}, using fallback lineup`);
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
   */
  generateLeagueAveragePrediction(batter, pitcherName, teamAbbr, battingOrderPosition) {
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
    
    const prediction = {
      player_name: batter.name || batter.fullName,
      team: teamAbbr,
      batter_hand: batter.bats || 'R',
      pitcher_hand: 'R', // Assume RHP (70% of pitchers)
      
      // Core predictions with adjustments
      hr_score: Math.min(100, leagueAverages.hr_score * orderAdjustment * handsAdjustment),
      hr_probability: Math.min(20, leagueAverages.hr_probability * orderAdjustment * handsAdjustment),
      hit_probability: Math.min(50, leagueAverages.hit_probability * orderAdjustment),
      reach_base_probability: Math.min(60, leagueAverages.reach_base_probability * orderAdjustment),
      strikeout_probability: Math.max(10, leagueAverages.strikeout_probability / orderAdjustment),
      
      // Component scores (league averages)
      arsenal_matchup: 42.0 + (Math.random() * 16), // 42-58 range
      batter_overall: 45.0 + (Math.random() * 20), // 45-65 range  
      pitcher_overall: 48.0 + (Math.random() * 14), // 48-62 range
      historical_yoy_csv: 8.0 + (Math.random() * 4), // 8-12 range
      recent_daily_games: 46.0 + (Math.random() * 18), // 46-64 range
      contextual: 50.0 + (Math.random() * 20), // 50-70 range
      
      // Additional stats
      recent_avg: 0.240 + (Math.random() * 0.080), // .240-.320 range
      hr_rate: 0.035 + (Math.random() * 0.025), // 3.5-6% range
      obp: 0.315 + (Math.random() * 0.070), // .315-.385 range
      
      // Confidence and metadata
      confidence: leagueAverages.confidence,
      
      // Fallback indicators
      is_fallback_prediction: true,
      fallback_type: 'league_average',
      data_quality: 'low',
      
      // Pitcher info (generic)
      pitcher_era: 4.20 + (Math.random() * 1.0), // 4.2-5.2 ERA
      pitcher_whip: 1.25 + (Math.random() * 0.20), // 1.25-1.45 WHIP
      pitcher_home_hr_total: Math.floor(8 + Math.random() * 12), // 8-20 HRs
      pitcher_home_games: Math.floor(12 + Math.random() * 8), // 12-20 games
      
      // Position in lineup
      batting_order: battingOrderPosition + 1
    };

    return prediction;
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

    try {
      // Try the API batch analysis first
      result = await this.makeRequest('/batch-analysis', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      // Transform the response to match what the React component expects
      if (result && result.predictions) {
        result.predictions = result.predictions.map(prediction => this.transformPrediction(prediction));
      }
      
      // Check if we got results for all requested matchups
      const receivedPitchers = new Set();
      const receivedMatchups = new Set();
      const missingMatchups = [];
      
      if (result && result.predictions && result.predictions.length > 0) {
        result.predictions.forEach(pred => {
          // Try to identify which pitcher this prediction belongs to
          const pitcherName = pred.matchup_pitcher || pred.pitcher_name || '';
          const teamName = pred.matchup_team || pred.team || '';
          
          if (pitcherName) {
            receivedPitchers.add(pitcherName.trim().toLowerCase());
            receivedMatchups.add(`${pitcherName.trim().toLowerCase()}_${teamName.trim().toUpperCase()}`);
          }
        });
        
        console.log(`🔍 Batch API returned predictions for pitchers:`, Array.from(receivedPitchers));
        console.log(`🔍 Total predictions returned:`, result.predictions.length);
        
        // Find missing matchups that need fallback processing
        matchups.forEach(matchup => {
          const requestedPitcher = matchup.pitcher_name.trim().toLowerCase();
          const requestedTeam = matchup.team_abbr.trim().toUpperCase();
          const matchupKey = `${requestedPitcher}_${requestedTeam}`;
          
          const foundByName = receivedPitchers.has(requestedPitcher);
          const foundByMatchup = receivedMatchups.has(matchupKey);
          
          if (!foundByName && !foundByMatchup) {
            console.log(`❌ Missing results for: ${matchup.pitcher_name} vs ${matchup.team_abbr}`);
            missingMatchups.push(matchup);
          } else {
            console.log(`✅ Found results for: ${matchup.pitcher_name} vs ${matchup.team_abbr}`);
          }
        });
      } else {
        console.log(`⚠️ Batch API returned no predictions - will process all matchups individually`);
        // If we got no predictions at all, treat all matchups as missing
        missingMatchups.push(...matchups);
      }
      
      // If we have missing matchups, process them with fallback
      if (missingMatchups.length > 0) {
        console.log(`🔄 Processing ${missingMatchups.length} missing matchups with fallback...`);
        
        const fallbackPredictions = [];
        const fallbackDetails = [];
        
        for (const matchup of missingMatchups) {
          try {
            console.log(`🔄 Processing missing: ${matchup.pitcher_name} vs ${matchup.team_abbr}`);
            
            const individualResult = await this.analyzePitcherVsTeam({
              pitcherName: matchup.pitcher_name,
              teamAbbr: matchup.team_abbr,
              sortBy,
              ascending,
              limit: limit,
              includeDashboardContext: false
            });
            
            if (individualResult && individualResult.predictions) {
              // Tag each prediction with the matchup info
              const taggedPredictions = individualResult.predictions.map(pred => ({
                ...pred,
                matchup_pitcher: matchup.pitcher_name,
                matchup_team: matchup.team_abbr,
                used_fallback: individualResult.used_client_fallback,
                fallback_reason: individualResult.fallback_reason
              }));
              
              fallbackPredictions.push(...taggedPredictions);
              
              if (individualResult.used_client_fallback) {
                fallbackDetails.push({
                  pitcher: matchup.pitcher_name,
                  team: matchup.team_abbr,
                  reason: individualResult.fallback_reason
                });
              }
            }
          } catch (matchupError) {
            console.error(`Failed to process missing matchup ${matchup.pitcher_name} vs ${matchup.team_abbr}:`, matchupError.message);
            partialFailures.push({
              pitcher: matchup.pitcher_name,
              team: matchup.team_abbr,
              error: matchupError.message
            });
          }
        }
        
        // Combine API results with fallback results
        if (fallbackPredictions.length > 0) {
          const combinedPredictions = [...(result.predictions || []), ...fallbackPredictions];
          
          // Sort combined results
          combinedPredictions.sort((a, b) => {
            let aVal = a[sortBy] || a.hr_score || 0;
            let bVal = b[sortBy] || b.hr_score || 0;
            
            if (ascending) {
              return aVal - bVal;
            } else {
              return bVal - aVal;
            }
          });
          
          // Limit results
          const limitedPredictions = combinedPredictions.slice(0, limit);
          
          // Update result with combined data
          result.predictions = limitedPredictions;
          result.total_predictions = limitedPredictions.length;
          result.batch_fallback_info = {
            used_fallback: fallbackDetails.length > 0,
            fallback_count: fallbackDetails.length,
            successful_matchups: matchups.length - partialFailures.length,
            failed_matchups: partialFailures.length,
            fallback_details: fallbackDetails,
            partial_failures: partialFailures,
            methodology: 'Hybrid batch analysis with individual fallback for missing pitchers'
          };
          
          // Recalculate confidence distribution
          result.confidence_distribution = this.calculateConfidenceDistribution(limitedPredictions);
          
          // Update analysis summary
          if (result.analysis_summary) {
            result.analysis_summary.avg_hr_score = limitedPredictions.reduce((sum, p) => sum + (p.hr_score || 0), 0) / limitedPredictions.length;
            result.analysis_summary.avg_confidence = limitedPredictions.reduce((sum, p) => sum + (p.confidence || 0.4), 0) / limitedPredictions.length;
            result.analysis_summary.data_completeness = fallbackDetails.length > 0 ? 0.7 : 0.9;
          }
        }
      }
      
    } catch (error) {
      console.warn('Batch API analysis failed, falling back to individual analyses:', error.message);
      
      // Fallback: Process each matchup individually with fallback support
      const allPredictions = [];
      const matchupResults = [];
      
      for (const matchup of matchups) {
        try {
          console.log(`🔄 Processing fallback for ${matchup.pitcher_name} vs ${matchup.team_abbr}`);
          
          const individualResult = await this.analyzePitcherVsTeam({
            pitcherName: matchup.pitcher_name,
            teamAbbr: matchup.team_abbr,
            sortBy,
            ascending,
            limit: limit,
            includeDashboardContext: false // We'll do this at the end
          });
          
          if (individualResult && individualResult.predictions) {
            // Tag each prediction with the matchup info
            const taggedPredictions = individualResult.predictions.map(pred => ({
              ...pred,
              matchup_pitcher: matchup.pitcher_name,
              matchup_team: matchup.team_abbr,
              used_fallback: individualResult.used_client_fallback,
              fallback_reason: individualResult.fallback_reason
            }));
            
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
          console.error(`Failed to process ${matchup.pitcher_name} vs ${matchup.team_abbr}:`, matchupError.message);
          partialFailures.push({
            pitcher: matchup.pitcher_name,
            team: matchup.team_abbr,
            error: matchupError.message
          });
        }
      }
      
      // Sort all predictions by the requested sort criteria
      if (allPredictions.length > 0) {
        allPredictions.sort((a, b) => {
          let aVal = a[sortBy] || a.hr_score || 0;
          let bVal = b[sortBy] || b.hr_score || 0;
          
          if (ascending) {
            return aVal - bVal;
          } else {
            return bVal - aVal;
          }
        });
        
        // Limit results
        const limitedPredictions = allPredictions.slice(0, limit);
        
        // Create fallback result structure
        result = {
          predictions: limitedPredictions,
          total_predictions: limitedPredictions.length,
          confidence_distribution: this.calculateConfidenceDistribution(limitedPredictions),
          analysis_summary: {
            avg_hr_score: limitedPredictions.reduce((sum, p) => sum + (p.hr_score || 0), 0) / limitedPredictions.length,
            avg_confidence: limitedPredictions.reduce((sum, p) => sum + (p.confidence || 0.4), 0) / limitedPredictions.length,
            data_completeness: fallbackResults.length > 0 ? 0.6 : 0.8
          },
          batch_fallback_info: {
            used_fallback: fallbackResults.length > 0,
            fallback_count: fallbackResults.length,
            successful_matchups: matchupResults.length,
            failed_matchups: partialFailures.length,
            fallback_details: fallbackResults,
            partial_failures: partialFailures,
            methodology: 'Individual matchup analysis with client-side fallback when pitcher data unavailable'
          }
        };
      } else {
        // Complete failure - no predictions generated
        throw new Error(`Failed to generate any predictions for ${matchups.length} matchups`);
      }
    }

    // Enhance with dashboard context if requested
    if (includeDashboardContext && result && result.predictions) {
      try {
        console.log(`🎯 Enhancing ${result.predictions.length} batch predictions with dashboard context`);
        result.predictions = await this.enhancePredictionsWithDashboardContext(result.predictions, date);
        result.enhanced_with_dashboard = true;
        console.log(`✅ Batch dashboard enhancement complete`);
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