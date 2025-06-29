/**
 * The "Hellraiser" Home Run Analysis Model (v4.0)
 * 
 * Now loads Python-generated analysis files for accurate data correlation
 * Fallback to JavaScript-based demo picks when Python files unavailable
 */

class HellraiserAnalysisService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 1000; // 5 seconds for debugging
    
    // Clear cache on initialization to ensure fresh data
    this.clearCache();
    console.log('🔥 Hellraiser: Service initialized with aggressive cache clearing');
  }
  
  clearCache() {
    this.cache.clear();
    // Clear any browser caches as well
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    console.log('🔥 Hellraiser: All caches cleared');
  }

  /**
   * Main analysis method - loads from Python-generated files
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Array} teamFilter - Optional array of team codes to filter by
   * @returns {Promise<Object>} Analysis results with picks and reasoning
   */
  async analyzeDay(date, teamFilter = null) {
    try {
      console.log('🔥 Hellraiser: Loading Python-generated analysis for', date);
      
      const cacheKey = `hellraiser_${date}_${teamFilter ? teamFilter.join('_') : 'all'}`;
      // FORCE FRESH DATA - bypass cache completely for debugging
      console.log('🔥 Hellraiser: FORCING fresh data load (cache bypassed)');

      // Try to load Python-generated analysis file
      console.log('🔥 Hellraiser: Attempting to load Python analysis...');
      const analysis = await this.loadPythonGeneratedAnalysis(date, teamFilter);
      console.log('🔥 Hellraiser: Python analysis result:', analysis ? 'SUCCESS' : 'FAILED');
      
      if (analysis) {
        console.log('🔥 Hellraiser: RETURNING PYTHON DATA');
        return analysis;
      }

      // Fallback to legacy JavaScript analysis if Python file not found
      console.log('🔥 Hellraiser: Python analysis not found, falling back to JavaScript');
      console.log('🔥 Hellraiser: RETURNING JAVASCRIPT FALLBACK DATA');
      return this.legacyJavaScriptAnalysis(date, teamFilter);

    } catch (error) {
      console.error('🔥 Hellraiser: Error in analyzeDay:', error);
      return this.createErrorResponse(date, error.message);
    }
  }

  /**
   * Load Python-generated analysis file
   */
  async loadPythonGeneratedAnalysis(date, teamFilter = null) {
    try {
      // Always load the comprehensive analysis file (no team-specific files)
      const filename = `hellraiser_analysis_${date}.json`;
      const filePath = `/data/hellraiser/${filename}`;
      console.log(`🔥 Hellraiser: Loading Python analysis from ${filePath}`);

      // Add multiple cache-busting parameters to ensure fresh data
      const cacheBuster = new Date().getTime();
      const randomId = Math.random().toString(36).substring(7);
      const response = await fetch(`${filePath}?v=${cacheBuster}&r=${randomId}&nocache=1`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        console.error(`🔥 Hellraiser: Python analysis file not found: ${filePath} - Status: ${response.status}`);
        console.error(`🔥 Hellraiser: Full URL attempted: ${window.location.origin}${filePath}`);
        return null;
      }

      const analysis = await response.json();
      console.log(`🔥 Hellraiser: Successfully loaded Python analysis with ${analysis.picks?.length || 0} picks`);
      console.log(`🔥 Hellraiser: Generated by: ${analysis.generatedBy}`);
      console.log(`🔥 Hellraiser: First pick: ${analysis.picks?.[0]?.playerName} ${analysis.picks?.[0]?.pitcher}`);
      
      // Apply client-side team filtering if specified
      if (teamFilter && teamFilter.length > 0) {
        console.log(`🔥 Hellraiser: Applying team filter for: ${teamFilter.join(', ')}`);
        const originalCount = analysis.picks?.length || 0;
        
        // Filter picks by team
        analysis.picks = analysis.picks.filter(pick => 
          teamFilter.includes(pick.team)
        );
        
        console.log(`🔥 Hellraiser: Team filtering reduced picks from ${originalCount} to ${analysis.picks.length}`);
        
        // Re-categorize picks by pathway after filtering
        analysis.pathwayBreakdown = {
          perfectStorm: analysis.picks.filter(p => p.pathway === 'perfectStorm'),
          batterDriven: analysis.picks.filter(p => p.pathway === 'batterDriven'),
          pitcherDriven: analysis.picks.filter(p => p.pathway === 'pitcherDriven')
        };
        
        // Recalculate summary after filtering
        analysis.summary = {
          totalPicks: analysis.picks.length,
          personalStraight: analysis.picks.filter(p => p.classification === 'Personal Straight').length,
          longshots: analysis.picks.filter(p => p.classification === 'Longshot').length,
          averageOdds: analysis.picks.length > 0 ? 
            analysis.picks.reduce((sum, p) => sum + parseFloat(p.odds?.decimal || 1), 0) / analysis.picks.length : 0
        };
      }
      
      // Ensure the analysis has the expected structure
      if (!analysis.picks) analysis.picks = [];
      if (!analysis.pathwayBreakdown) {
        analysis.pathwayBreakdown = {
          perfectStorm: [],
          batterDriven: [],
          pitcherDriven: []
        };
      }
      if (!analysis.summary) {
        analysis.summary = {
          totalPicks: analysis.picks.length,
          personalStraight: analysis.picks.filter(p => p.classification === 'Personal Straight').length,
          longshots: analysis.picks.filter(p => p.classification === 'Longshot').length,
          averageOdds: analysis.picks.length > 0 ? 
            analysis.picks.reduce((sum, p) => sum + parseFloat(p.odds?.decimal || 1), 0) / analysis.picks.length : 0
        };
      }

      return analysis;

    } catch (error) {
      console.error('🔥 Hellraiser: Error loading Python analysis:', error);
      console.error('🔥 Hellraiser: Error details:', error.message);
      console.error('🔥 Hellraiser: Error stack:', error.stack);
      return null;
    }
  }

  /**
   * Legacy JavaScript analysis (fallback)
   */
  async legacyJavaScriptAnalysis(date, teamFilter = null) {
    console.log('🔥 Hellraiser: Using JavaScript fallback analysis');
    
    // Create basic demo picks for fallback
    const demoPicks = await this.createBasicDemoPicks(teamFilter);
    
    // Categorize picks by pathway
    const pathwayBreakdown = {
      perfectStorm: demoPicks.filter(p => p.pathway === 'perfectStorm'),
      batterDriven: demoPicks.filter(p => p.pathway === 'batterDriven'),
      pitcherDriven: demoPicks.filter(p => p.pathway === 'pitcherDriven')
    };
    
    return {
      date,
      updatedAt: new Date().toISOString(),
      generatedBy: 'javascript_fallback',
      picks: demoPicks,
      pathwayBreakdown,
      summary: {
        totalPicks: demoPicks.length,
        personalStraight: demoPicks.filter(p => p.classification === 'Personal Straight').length,
        longshots: demoPicks.filter(p => p.classification === 'Longshot').length,
        averageOdds: demoPicks.length > 0 ? 
          demoPicks.reduce((sum, p) => sum + parseFloat(p.odds?.decimal || 1), 0) / demoPicks.length : 0
      }
    };
  }

  /**
   * Create basic demo picks (fallback when no Python data available)
   */
  async createBasicDemoPicks(teamFilter = null) {
    console.log('🔥 Hellraiser: Creating basic demo picks for teams:', teamFilter);
    
    // Well-known players for demo when filtering by specific teams
    const demoPlayers = {
      'NYY': [
        { name: 'Aaron Judge', odds: '+280' },
        { name: 'Giancarlo Stanton', odds: '+320' },
        { name: 'Anthony Rizzo', odds: '+380' }
      ],
      'BAL': [
        { name: 'Adley Rutschman', odds: '+350' },
        { name: 'Ryan Mountcastle', odds: '+385' }
      ],
      'DET': [
        { name: 'Riley Greene', odds: '+310' },
        { name: 'Kerry Carpenter', odds: '+285' }
      ],
      'TB': [
        { name: 'Randy Arozarena', odds: '+285' },
        { name: 'Brandon Lowe', odds: '+310' }
      ],
      'SEA': [
        { name: 'Cal Raleigh', odds: '+165' },
        { name: 'Julio Rodriguez', odds: '+295' }
      ],
      'CHC': [
        { name: 'Pete Crow-Armstrong', odds: '+225' },
        { name: 'Seiya Suzuki', odds: '+225' }
      ]
    };
    
    let playersToUse = [];
    
    if (teamFilter && teamFilter.length > 0) {
      // Use players from filtered teams
      for (const team of teamFilter) {
        if (demoPlayers[team]) {
          playersToUse.push(...demoPlayers[team].map(p => ({ ...p, team })));
        }
      }
    } else {
      // Use all players
      for (const [team, players] of Object.entries(demoPlayers)) {
        playersToUse.push(...players.map(p => ({ ...p, team })));
      }
    }
    
    if (playersToUse.length === 0) {
      // Fallback to generic players
      playersToUse = [
        { name: 'Aaron Judge', team: 'NYY', odds: '+280' },
        { name: 'Cal Raleigh', team: 'SEA', odds: '+165' }
      ];
    }
    
    const picks = playersToUse.slice(0, 6).map((player, index) => {
      const confidenceScore = 82 - (index * 4);
      
      return {
        playerName: player.name,
        team: player.team,
        pitcher: 'vs TBD Pitcher',
        confidenceScore,
        classification: this.getClassificationByConfidence(confidenceScore),
        pathway: ['perfectStorm', 'batterDriven', 'pitcherDriven'][index % 3],
        reasoning: `Strategic analysis identifies ${player.name} as strong HR candidate based on recent form and matchup factors`,
        marketEfficiency: this.evaluateMarketEfficiency({ american: player.odds }, confidenceScore),
        riskFactors: [],
        game: 'Today\'s Games',
        odds: {
          american: player.odds,
          decimal: this.americanToDecimal(player.odds),
          source: 'estimated'
        }
      };
    });
    
    console.log('🔥 Hellraiser: Created', picks.length, 'basic demo picks');
    return picks;
  }

  /**
   * Create error response
   */
  createErrorResponse(date, errorMessage) {
    return {
      date,
      error: errorMessage,
      picks: [],
      pathwayBreakdown: { perfectStorm: [], batterDriven: [], pitcherDriven: [] },
      summary: { totalPicks: 0, personalStraight: 0, longshots: 0, averageOdds: 0 }
    };
  }

  /**
   * Get classification based on confidence score
   */
  getClassificationByConfidence(score) {
    if (score >= 80) return 'Personal Straight';
    if (score >= 70) return 'Straight';
    if (score >= 60) return 'Value Play';
    return 'Longshot';
  }

  /**
   * Convert American odds to decimal
   */
  americanToDecimal(americanOdds) {
    try {
      const cleanOdds = americanOdds.toString().replace(/[^0-9+-]/g, '');
      if (cleanOdds.startsWith('+')) {
        const value = parseInt(cleanOdds.substring(1));
        return ((value / 100) + 1).toFixed(2);
      } else {
        const value = parseInt(cleanOdds);
        return ((100 / Math.abs(value)) + 1).toFixed(2);
      }
    } catch (error) {
      return '1.00';
    }
  }

  /**
   * Evaluate market efficiency
   */
  evaluateMarketEfficiency(odds, confidence) {
    try {
      const decimal = parseFloat(this.americanToDecimal(odds.american));
      const impliedProb = 1 / decimal;
      const confidenceProb = confidence / 100;
      
      if (confidenceProb > impliedProb * 1.2) {
        return 'Undervalued';
      } else if (confidenceProb < impliedProb * 0.8) {
        return 'Overvalued';
      } else {
        return 'Fair Value';
      }
    } catch (error) {
      return 'Unknown';
    }
  }
}

// Create and export singleton instance
const hellraiserAnalysisService = new HellraiserAnalysisService();
export default hellraiserAnalysisService;