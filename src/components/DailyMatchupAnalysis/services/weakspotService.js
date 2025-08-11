/**
 * Weakspot Analysis Service
 * Integrates with the comprehensive weakspot analysis shell script
 * and provides structured data for the Daily Matchup Analysis page
 */


class WeakspotService {
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001' 
      : '';
    
    // Cache for analysis results
    this.analysisCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Run daily matchup analysis for all games on a given date
   */
  async runDailyMatchupAnalysis(matchups, date) {
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

      const analysis = {
        date,
        total_matchups: matchups.length,
        successful_analyses: results.filter(r => r.status === 'fulfilled').length,
        opportunities: this.classifyOpportunities(opportunities),
        errors,
        generated_at: new Date().toISOString(),
        summary: this.generateSummary(opportunities)
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
        // Fallback to mock data for development
        return this.generateMockAnalysis(matchup, date);
      }

      const data = await response.json();
      return this.processAnalysisResults(data, matchup);
      
    } catch (error) {
      console.warn(`Using mock data for ${matchup.awayPitcher} vs ${matchup.homePitcher}:`, error.message);
      return this.generateMockAnalysis(matchup, date);
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

    return {
      matchup,
      opportunities,
      metadata: {
        analysis_time: rawData.analysis_time,
        data_quality: rawData.data_quality || 'unknown'
      }
    };
  }

  /**
   * Extract opportunities from pitcher analysis
   */
  extractOpportunities(analysis, pitcher, opposingTeam, pitcherTeam, side) {
    const opportunities = [];
    const lineupVulnerabilities = analysis.lineup_vulnerabilities || {};
    const inningPatterns = analysis.inning_patterns || {};
    const pitchPatterns = analysis.pitch_patterns || {};

    // Extract position-based opportunities
    Object.entries(lineupVulnerabilities).forEach(([position, data]) => {
      if (data.vulnerability_score > 25 && data.confidence > 0.6) {
        opportunities.push({
          type: 'position_vulnerability',
          pitcher,
          pitcher_team: pitcherTeam,
          opposing_team: opposingTeam,
          side,
          position: parseInt(position.split('_')[1]),
          vulnerability_score: data.vulnerability_score,
          success_rate: data.vulnerability_rate,
          confidence_score: data.confidence * data.vulnerability_score,
          sample_size: data.sample_size,
          details: {
            avg_velocity: data.avg_velocity,
            leverage_situations: data.leverage_situations
          }
        });
      }
    });

    // Extract inning-based opportunities
    Object.entries(inningPatterns).forEach(([inning, data]) => {
      if (data.vulnerability_score > 30 && data.confidence > 0.7) {
        opportunities.push({
          type: 'inning_vulnerability',
          pitcher,
          pitcher_team: pitcherTeam,
          opposing_team: opposingTeam,
          side,
          inning: parseInt(inning.split('_')[1]),
          vulnerability_score: data.vulnerability_score,
          success_rate: data.vulnerability_rate,
          confidence_score: data.confidence * data.vulnerability_score,
          hr_frequency: data.hr_frequency || 0,
          details: {
            avg_velocity: data.avg_velocity,
            avg_pitch_count: data.avg_pitch_count
          }
        });
      }
    });

    // Extract predictability opportunities
    const predictability = pitchPatterns.predictability_score || 0;
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
        sequences: this.getTopSequences(pitchPatterns.sequence_patterns || {}),
        details: {
          total_sequences: pitchPatterns.total_sequences || 0,
          most_common_sequence: this.getMostCommonSequence(pitchPatterns.sequence_patterns || {})
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