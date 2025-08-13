/**
 * Weakspot Analysis Service
 * Integrates with the comprehensive weakspot analysis shell script
 * and provides structured data for the Daily Matchup Analysis page
 */


class WeakspotService {
  constructor() {
    this.baseUrl = 'http://localhost:8000';
    
    // Cache for analysis results
    this.analysisCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Run daily weakspot analysis for all games on a given date
   */
  async runDailyWeakspotAnalysis(matchups, date) {
    const cacheKey = `${date}-${matchups.length}-${JSON.stringify(matchups).substring(0, 100)}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const analysisPromises = matchups.map(matchup => 
        this.analyzeMatchup(matchup, date)
      );
      
      const results = await Promise.allSettled(analysisPromises);
      const opportunities = [];
      const errors = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          opportunities.push(...result.value.opportunities);
        } else {
          errors.push({
            matchup: matchups[index],
            error: result.reason.message
          });
        }
      });

      // Process matchup analysis data
      const matchupAnalysis = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const matchupKey = `matchup_${index}`;
          matchupAnalysis[matchupKey] = {
            matchup: matchups[index],
            ...result.value
          };
          
          console.log('🎯 WEAKSPOT SERVICE: Constructed matchup analysis:', {
            matchupKey,
            originalMatchup: matchups[index],
            resultValue: result.value,
            finalStructure: matchupAnalysis[matchupKey]
          });
          
          // Debug logging for data structure
          console.log(`🎯 WEAKSPOT SERVICE: Processing matchup ${index}:`, {
            matchupKey,
            has_away_pitcher_analysis: !!result.value.away_pitcher_analysis,
            has_home_pitcher_analysis: !!result.value.home_pitcher_analysis,
            away_pitcher: result.value.away_pitcher_analysis?.pitcher_name,
            home_pitcher: result.value.home_pitcher_analysis?.pitcher_name,
            opportunities_count: result.value.opportunities?.length || 0
          });
        }
      });

      const analysis = {
        date,
        total_matchups: matchups.length,
        successful_analyses: results.filter(r => r.status === 'fulfilled').length,
        weakspot_opportunities: this.classifyOpportunities(opportunities),
        matchup_analysis: matchupAnalysis, // Add structured matchup data
        errors,
        generated_at: new Date().toISOString(),
        summary: this.generateSummary(opportunities),
        // Add debug info to identify structure
        debug_info: {
          has_matchup_analysis: Object.keys(matchupAnalysis).length > 0,
          matchup_keys: Object.keys(matchupAnalysis),
          total_successful_results: results.filter(r => r.status === 'fulfilled').length
        }
      };

      // Cache the result
      this.setCache(cacheKey, analysis);
      
      return analysis;
      
    } catch (error) {
      throw new Error(`Failed to run daily matchup analysis: ${error.message}`);
    }
  }

  /**
   * Analyze individual matchup using our weakspot framework
   */
  async analyzeMatchup(matchup, date) {
    try {
      // For now, we'll simulate calling our shell script via an API endpoint
      // In a production setup, this would call a backend service that executes the shell script
      const response = await fetch(`${this.baseUrl}/api/weakspot-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          away_pitcher: matchup.awayPitcher,
          away_team: matchup.awayTeam,
          home_pitcher: matchup.homePitcher,
          home_team: matchup.homeTeam,
          date: date,
          venue: matchup.venue
        })
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processAnalysisResults(data, matchup);
      
    } catch (error) {
      console.error(`API call failed for ${matchup.awayPitcher} vs ${matchup.homePitcher}:`, error.message);
      // Re-throw the error instead of falling back to mock data
      throw error;
    }
  }

  /**
   * Process raw analysis results into structured format
   */
  processAnalysisResults(rawData, matchup) {
    const opportunities = [];

    // Process away pitcher vs home team
    if (rawData.away_pitcher_analysis) {
      const awayAnalysis = rawData.away_pitcher_analysis;
      opportunities.push(...this.extractOpportunities(
        awayAnalysis,
        matchup.awayPitcher,
        matchup.homeTeam,
        matchup.awayTeam,
        'away'
      ));
    }

    // Process home pitcher vs away team
    if (rawData.home_pitcher_analysis) {
      const homeAnalysis = rawData.home_pitcher_analysis;
      opportunities.push(...this.extractOpportunities(
        homeAnalysis,
        matchup.homePitcher,
        matchup.awayTeam,
        matchup.homeTeam,
        'home'
      ));
    }

    console.log(`🎯 WEAKSPOT SERVICE DEBUG: Extracted ${opportunities.length} opportunities from API response`);
    console.log('🎯 WEAKSPOT SERVICE DEBUG: API rawData.matchup:', rawData.matchup);
    console.log('🎯 WEAKSPOT SERVICE DEBUG: Original matchup:', matchup);
    
    // Return comprehensive analysis structure
    return {
      matchup: rawData.matchup || matchup, // Use API response matchup if available, fallback to original
      opportunities,
      // Preserve raw analysis data for enhanced display
      away_pitcher_analysis: rawData.away_pitcher_analysis,
      home_pitcher_analysis: rawData.home_pitcher_analysis,
      overall_matchup_assessment: rawData.overall_matchup_assessment, // Add this for direct access
      pitcher_analysis: {
        away_pitcher: rawData.away_pitcher_analysis,
        home_pitcher: rawData.home_pitcher_analysis,
        overall_assessment: rawData.overall_matchup_assessment
      },
      metadata: {
        analysis_time: rawData.generated_at,
        data_quality: rawData.data_source || 'play_by_play_historical',
        analysis_type: rawData.analysis_type
      }
    };
  }

  /**
   * Extract opportunities from pitcher analysis
   */
  extractOpportunities(analysis, pitcher, opposingTeam, pitcherTeam, side) {
    const opportunities = [];
    
    // Extract pitch vulnerability opportunities
    const pitchVulnerabilities = analysis.pitch_vulnerabilities || {};
    Object.entries(pitchVulnerabilities).forEach(([pitchType, data]) => {
      if (data.vulnerability_score > 8) { // Lower threshold for pitch vulnerabilities
        opportunities.push({
          type: 'pitch_vulnerability',
          pitcher,
          pitcher_team: pitcherTeam,
          opposing_team: opposingTeam,
          side,
          pitch_type: pitchType,
          vulnerability_score: data.vulnerability_score,
          hr_rate: data.hr_rate,
          hit_rate: data.hit_rate,
          strikeout_rate: data.strikeout_rate,
          confidence_score: Math.min(data.vulnerability_score * 10, 100),
          sample_size: data.sample_size,
          details: {
            pitch_type: pitchType,
            effectiveness: data.strikeout_rate > 0.2 ? 'effective_but_vulnerable' : 'concerning'
          }
        });
      }
    });

    // Extract inning-based opportunities
    const inningPatterns = analysis.inning_patterns || {};
    Object.entries(inningPatterns).forEach(([inning, data]) => {
      if (data.vulnerability_score > 15) { // Adjusted threshold
        opportunities.push({
          type: 'inning_vulnerability',
          pitcher,
          pitcher_team: pitcherTeam,
          opposing_team: opposingTeam,
          side,
          inning: parseInt(inning.split('_')[1]),
          vulnerability_score: data.vulnerability_score,
          hr_frequency: data.hr_frequency,
          hit_frequency: data.hit_frequency,
          walk_frequency: data.walk_frequency,
          confidence_score: data.vulnerability_score * 3,
          sample_size: data.sample_size,
          details: {
            inning: parseInt(inning.split('_')[1]),
            pattern: data.vulnerability_score > 20 ? 'high_vulnerability' : 'moderate_vulnerability'
          }
        });
      }
    });

    // Extract count weakness opportunities
    const countWeaknesses = analysis.count_weaknesses || {};
    Object.entries(countWeaknesses).forEach(([count, data]) => {
      if (data.weakness_score > 80) { // High threshold for count weaknesses
        opportunities.push({
          type: 'count_weakness',
          pitcher,
          pitcher_team: pitcherTeam,
          opposing_team: opposingTeam,
          side,
          count: count,
          weakness_score: data.weakness_score,
          control_rate: data.control_rate,
          confidence_score: Math.min(data.weakness_score, 100),
          sample_size: data.sample_size,
          details: {
            count: count,
            situation: count.startsWith('2-') || count.startsWith('3-') ? 'hitter_count' : 'neutral'
          }
        });
      }
    });

    // Extract timing window opportunities
    const timingWindows = analysis.timing_windows || {};
    Object.entries(timingWindows).forEach(([window, data]) => {
      if (data.vulnerability_score > 20) {
        opportunities.push({
          type: 'timing_window',
          pitcher,
          pitcher_team: pitcherTeam,
          opposing_team: opposingTeam,
          side,
          timing_window: window,
          vulnerability_score: data.vulnerability_score,
          hit_rate: data.hit_rate,
          average_velocity: data.average_velocity,
          confidence_score: data.vulnerability_score * 2.5,
          sample_size: data.sample_size,
          details: {
            pitch_range: window,
            fatigue_factor: window.includes('81-') || window.includes('101-') ? 'high' : 'moderate'
          }
        });
      }
    });

    // Extract individual position vulnerability opportunities
    const positionVulnerabilities = analysis.position_vulnerabilities || {};
    Object.entries(positionVulnerabilities).forEach(([position, data]) => {
      if (data.vulnerability_score > 8) { // Threshold for meaningful position vulnerabilities
        const positionNumber = parseInt(position.split('_')[1]);
        opportunities.push({
          type: 'position_vulnerability',
          pitcher,
          pitcher_team: pitcherTeam,
          opposing_team: opposingTeam,
          side,
          position: positionNumber,
          vulnerability_score: data.vulnerability_score,
          hr_rate: data.hr_rate,
          hit_rate: data.hit_rate,
          confidence_score: Math.min(data.vulnerability_score * 8, 100), // Scale to 0-100
          sample_size: data.sample_size,
          details: {
            batting_position: positionNumber,
            lineup_spot: this.getPositionDescription(positionNumber),
            effectiveness: data.hr_rate > 0.05 ? 'hr_vulnerable' : 'hit_vulnerable',
            strategic_value: this.getStrategicValue(positionNumber, data.vulnerability_score)
          }
        });
      }
    });

    // Extract predictability opportunities
    const patternRecognition = analysis.pattern_recognition || {};
    const predictability = patternRecognition.predictability_score || 0;
    if (predictability > 15) {
      opportunities.push({
        type: 'predictability',
        pitcher,
        pitcher_team: pitcherTeam,
        opposing_team: opposingTeam,
        side,
        predictability_score: predictability,
        confidence_score: Math.min(predictability * 3, 100),
        vulnerability_score: predictability,
        sequences: patternRecognition.top_sequences || [],
        details: {
          total_sequences: patternRecognition.total_sequences_analyzed || 0,
          pattern_level: predictability > 50 ? 'highly_predictable' : 'moderately_predictable'
        }
      });
    }

    return opportunities;
  }

  /**
   * Classify opportunities by type and confidence
   */
  classifyOpportunities(opportunities) {
    return opportunities.map(opp => {
      let classification = 'speculative';
      let priority = 'low';

      if (opp.confidence_score >= 70) {
        classification = 'high_confidence';
        priority = 'high';
      } else if (opp.confidence_score >= 50) {
        classification = 'moderate_confidence';  
        priority = 'medium';
      } else if (opp.confidence_score >= 30) {
        classification = 'low_confidence';
        priority = 'medium';
      }

      // Adjust for sample size
      if (opp.sample_size && opp.sample_size < 10) {
        classification = classification.replace('high_', 'moderate_');
        priority = priority === 'high' ? 'medium' : priority;
      }

      return {
        ...opp,
        classification,
        priority,
        risk_level: this.calculateRiskLevel(opp)
      };
    }).sort((a, b) => b.confidence_score - a.confidence_score);
  }

  /**
   * Calculate risk level for opportunity
   */
  calculateRiskLevel(opportunity) {
    const sampleSize = opportunity.sample_size || 100;
    const confidence = opportunity.confidence_score || 0;
    
    if (sampleSize < 5) return 'very_high';
    if (sampleSize < 15 && confidence < 40) return 'high';
    if (sampleSize < 25 && confidence < 60) return 'moderate';
    return 'low';
  }

  /**
   * Generate summary statistics
   */
  generateSummary(opportunities) {
    const total = opportunities.length;
    const highConfidence = opportunities.filter(o => o.confidence_score >= 70).length;
    const moderateConfidence = opportunities.filter(o => o.confidence_score >= 50 && o.confidence_score < 70).length;
    
    const byType = opportunities.reduce((acc, opp) => {
      acc[opp.type] = (acc[opp.type] || 0) + 1;
      return acc;
    }, {});

    return {
      total_opportunities: total,
      high_confidence: highConfidence,
      moderate_confidence: moderateConfidence,
      low_confidence: total - highConfidence - moderateConfidence,
      by_type: byType,
      avg_confidence: total > 0 ? opportunities.reduce((sum, o) => sum + (o.confidence_score || 0), 0) / total : 0
    };
  }

  /**
   * Generate mock analysis for development
   */
  generateMockAnalysis(matchup, date) {
    const awayOpportunities = this.generateMockOpportunities(
      matchup.awayPitcher,
      matchup.homeTeam,
      matchup.awayTeam,
      'away'
    );
    
    const homeOpportunities = this.generateMockOpportunities(
      matchup.homePitcher,
      matchup.awayTeam,
      matchup.homeTeam,
      'home'
    );

    return {
      matchup,
      opportunities: [...awayOpportunities, ...homeOpportunities],
      metadata: {
        analysis_time: new Date().toISOString(),
        data_quality: 'mock',
        source: 'development_mock'
      }
    };
  }

  /**
   * Generate mock opportunities for development
   */
  generateMockOpportunities(pitcher, opposingTeam, pitcherTeam, side) {
    const opportunities = [];
    
    // Mock position vulnerabilities
    [1, 3, 4, 5, 6].forEach(position => {
      if (Math.random() > 0.4) { // 60% chance of vulnerability
        opportunities.push({
          type: 'position_vulnerability',
          pitcher,
          pitcher_team: pitcherTeam,
          opposing_team: opposingTeam,
          side,
          position,
          vulnerability_score: 25 + Math.random() * 40,
          success_rate: 0.15 + Math.random() * 0.25,
          confidence_score: 30 + Math.random() * 50,
          sample_size: Math.floor(5 + Math.random() * 50),
          details: {
            avg_velocity: 88 + Math.random() * 8,
            leverage_situations: Math.floor(Math.random() * 10)
          }
        });
      }
    });

    // Mock inning vulnerabilities
    [3, 5, 6, 7].forEach(inning => {
      if (Math.random() > 0.6) { // 40% chance of inning vulnerability
        opportunities.push({
          type: 'inning_vulnerability',
          pitcher,
          pitcher_team: pitcherTeam,
          opposing_team: opposingTeam,
          side,
          inning,
          vulnerability_score: 30 + Math.random() * 35,
          success_rate: 0.18 + Math.random() * 0.22,
          confidence_score: 35 + Math.random() * 45,
          hr_frequency: Math.random() * 0.15,
          details: {
            avg_velocity: 88 + Math.random() * 6,
            avg_pitch_count: 3.5 + Math.random() * 2
          }
        });
      }
    });

    // Mock predictability opportunity
    const predictability = 5 + Math.random() * 20;
    if (predictability > 10) {
      opportunities.push({
        type: 'predictability',
        pitcher,
        pitcher_team: pitcherTeam,
        opposing_team: opposingTeam,
        side,
        predictability_score: predictability,
        confidence_score: Math.min(predictability * 5, 100),
        vulnerability_score: predictability * 2,
        sequences: ['FB -> FB', 'FB -> SL', 'SL -> FB'],
        details: {
          total_sequences: Math.floor(100 + Math.random() * 200),
          most_common_sequence: 'FB -> FB'
        }
      });
    }

    return opportunities;
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.analysisCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.analysisCache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.analysisCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Position analysis helper methods
   */
  getPositionDescription(positionNumber) {
    const descriptions = {
      1: 'Leadoff Hitter',
      2: '#2 Hitter', 
      3: '#3 Hitter',
      4: 'Cleanup Hitter',
      5: '#5 Hitter',
      6: '#6 Hitter',
      7: '#7 Hitter',
      8: '#8 Hitter',
      9: '#9 Hitter'
    };
    return descriptions[positionNumber] || `Position ${positionNumber}`;
  }

  getStrategicValue(positionNumber, vulnerabilityScore) {
    // Heart of the order (3-5) gets higher strategic value
    if ([3, 4, 5].includes(positionNumber) && vulnerabilityScore > 15) {
      return 'high_value_target';
    }
    // Power positions (4, 5) with good vulnerability
    if ([4, 5].includes(positionNumber) && vulnerabilityScore > 10) {
      return 'power_position_opportunity';
    }
    // Leadoff vulnerability
    if (positionNumber === 1 && vulnerabilityScore > 12) {
      return 'leadoff_opportunity';
    }
    // Bottom of order vulnerability
    if ([7, 8, 9].includes(positionNumber) && vulnerabilityScore > 18) {
      return 'bottom_order_exploitation';
    }
    return 'standard_opportunity';
  }

  /**
   * Utility methods
   */
  getTopSequences(sequencePatterns) {
    return Object.entries(sequencePatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([seq, count]) => ({ sequence: seq, count }));
  }

  getMostCommonSequence(sequencePatterns) {
    const entries = Object.entries(sequencePatterns);
    if (entries.length === 0) return 'No data';
    
    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }
}

// Create singleton instance
export const weakspotService = new WeakspotService();
export default weakspotService;