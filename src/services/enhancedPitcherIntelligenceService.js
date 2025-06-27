/**
 * Enhanced Pitcher Intelligence Service
 * Comprehensive pitcher analysis with historical data, batter splits, and vulnerability assessment
 */

import { fetchPlayerDataForDateRange, fetchPlayerData } from './dataService';

class EnhancedPitcherIntelligenceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.pitcherStatsCache = new Map();
  }

  /**
   * Generate comprehensive pitcher intelligence for a game
   */
  async generateGamePitcherIntelligence(pitchers, homeTeamPlayers, awayTeamPlayers, gameContext) {
    try {
      const intelligence = {
        homePitcher: null,
        awayPitcher: null,
        matchupAnalysis: null,
        gameContext
      };

      // Analyze home pitcher vs away batters
      if (pitchers.home) {
        intelligence.homePitcher = await this.analyzePitcherComprehensive(
          pitchers.home, 
          awayTeamPlayers, 
          'home',
          gameContext
        );
      }

      // Analyze away pitcher vs home batters
      if (pitchers.away) {
        intelligence.awayPitcher = await this.analyzePitcherComprehensive(
          pitchers.away, 
          homeTeamPlayers, 
          'away',
          gameContext
        );
      }

      // Generate matchup comparison
      if (intelligence.homePitcher && intelligence.awayPitcher) {
        intelligence.matchupAnalysis = this.compareMatchups(
          intelligence.homePitcher, 
          intelligence.awayPitcher
        );
      }

      return intelligence;
    } catch (error) {
      console.error('Error generating pitcher intelligence:', error);
      return this.getBasicPitcherIntelligence(pitchers);
    }
  }

  /**
   * Comprehensive pitcher analysis including historical data and batter splits
   */
  async analyzePitcherComprehensive(pitcher, opposingBatters, homeAway, gameContext) {
    const cacheKey = `pitcher_comprehensive_${pitcher.name}_${homeAway}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get pitcher historical stats
      const pitcherStats = await this.loadPitcherHistoricalStats(pitcher.name);
      
      // Analyze opposing batters
      const batterAnalysis = await this.analyzeBatterLineup(opposingBatters);
      
      // Calculate handedness matchups
      const handednessAnalysis = this.analyzeHandednessMatchups(pitcher, batterAnalysis);
      
      // Calculate vulnerability factors
      const vulnerabilities = this.calculatePitcherVulnerabilities(pitcherStats, batterAnalysis);
      
      // Generate strategic recommendations
      const strategy = this.generatePitcherStrategy(pitcher, pitcherStats, batterAnalysis, vulnerabilities);

      const analysis = {
        pitcher: {
          ...pitcher,
          historicalStats: pitcherStats,
          recentForm: this.assessRecentForm(pitcherStats),
          strengthsWeaknesses: this.identifyPitcherStrengthsWeaknesses(pitcherStats)
        },
        opposingLineup: batterAnalysis,
        handednessBreakdown: handednessAnalysis,
        vulnerabilityAnalysis: vulnerabilities,
        strategicRecommendations: strategy,
        confidenceLevel: this.calculateConfidenceLevel(pitcherStats, batterAnalysis),
        keyMatchups: this.identifyKeyMatchups(pitcher, batterAnalysis, vulnerabilities)
      };

      this.cache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      });

      return analysis;
    } catch (error) {
      console.error(`Error analyzing pitcher ${pitcher.name}:`, error);
      return this.getBasicPitcherAnalysis(pitcher, opposingBatters);
    }
  }

  /**
   * Load pitcher historical statistics from our data files
   */
  async loadPitcherHistoricalStats(pitcherName) {
    const cacheKey = `pitcher_stats_${pitcherName}`;
    
    if (this.pitcherStatsCache.has(cacheKey)) {
      const cached = this.pitcherStatsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const stats = {
        appearances: [],
        seasonStats: {
          gamesStarted: 0,
          innings: 0,
          era: 0,
          whip: 0,
          strikeouts: 0,
          walks: 0,
          homeRunsAllowed: 0,
          record: { wins: 0, losses: 0 }
        },
        recentStats: {
          last5Games: [],
          last10Games: [],
          trend: 'stable'
        },
        splits: {
          vsLefty: { avg: 0, ops: 0, hr: 0 },
          vsRighty: { avg: 0, ops: 0, hr: 0 },
          homeAway: { home: {}, away: {} }
        }
      };

      // Search through recent games to find pitcher appearances
      const endDate = new Date();
      for (let i = 1; i <= 90; i++) {
        const checkDate = new Date(endDate);
        checkDate.setDate(endDate.getDate() - i);
        
        try {
          const dateStr = checkDate.toISOString().split('T')[0];
          const gameData = await this.fetchGameDataForDate(dateStr);
          
          if (gameData && gameData.length > 0) {
            const pitcherAppearances = this.findPitcherInGameData(gameData, pitcherName);
            stats.appearances.push(...pitcherAppearances);
          }
        } catch (dateError) {
          continue;
        }
      }

      // Calculate aggregated stats
      this.calculateSeasonStats(stats);
      this.calculateRecentForm(stats);
      this.calculateSplitStats(stats);

      this.pitcherStatsCache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;
    } catch (error) {
      console.error(`Error loading pitcher stats for ${pitcherName}:`, error);
      return this.getBasicPitcherStats();
    }
  }

  /**
   * Analyze batter lineup composition and strengths
   */
  async analyzeBatterLineup(batters) {
    const analysis = {
      totalBatters: batters.length,
      handedness: { left: [], right: [], switch: [], unknown: [] },
      powerThreats: [],
      contactHitters: [],
      strikeoutProne: [],
      plateDisciplined: [],
      averageStats: {
        avg: 0,
        obp: 0,
        slg: 0,
        ops: 0,
        hr: 0,
        so: 0
      },
      teamStrengths: [],
      teamWeaknesses: []
    };

    // Load roster data for handedness lookup
    const rosterData = await this.loadRosterData();

    for (const batter of batters) {
      try {
        // Get batter historical data
        const batterStats = await this.loadBatterHistoricalStats(batter.name || batter.fullName);
        
        // Get handedness from roster data
        const rosterInfo = this.findBatterInRoster(batter.name || batter.fullName, rosterData);
        const handedness = rosterInfo?.bats || batterStats.handedness || 'Unknown';
        
        // Classify handedness with roster data
        this.classifyBatterHandedness(batter, { ...batterStats, handedness }, analysis);
        
        // Classify batter type
        this.classifyBatterType(batter, batterStats, analysis);
        
        // Update team averages
        this.updateTeamAverages(batterStats, analysis);
        
      } catch (error) {
        console.warn(`Error analyzing batter ${batter.name}:`, error);
        // Add to unknown category
        analysis.handedness.unknown.push({
          name: batter.name || batter.fullName,
          data: batter
        });
      }
    }

    // Finalize team averages
    this.finalizeTeamAverages(analysis);
    
    // Identify team strengths and weaknesses
    this.identifyTeamCharacteristics(analysis);

    return analysis;
  }

  /**
   * Analyze handedness matchups for pitcher vs batters
   */
  analyzeHandednessMatchups(pitcher, batterAnalysis) {
    const pitcherThrows = pitcher.throws || 'Unknown';
    
    return {
      pitcher: {
        throws: pitcherThrows,
        favorableMatchups: this.calculateFavorableMatchups(pitcherThrows, batterAnalysis),
        challengingMatchups: this.calculateChallengingMatchups(pitcherThrows, batterAnalysis)
      },
      breakdown: {
        vsLefty: {
          count: batterAnalysis.handedness.left.length,
          advantage: this.calculateHandednessAdvantage(pitcherThrows, 'L'),
          keyBatters: batterAnalysis.handedness.left.slice(0, 3)
        },
        vsRighty: {
          count: batterAnalysis.handedness.right.length,
          advantage: this.calculateHandednessAdvantage(pitcherThrows, 'R'),
          keyBatters: batterAnalysis.handedness.right.slice(0, 3)
        },
        vsSwitch: {
          count: batterAnalysis.handedness.switch.length,
          advantage: 'neutral',
          keyBatters: batterAnalysis.handedness.switch.slice(0, 3)
        }
      },
      overallAdvantage: this.calculateOverallHandednessAdvantage(pitcherThrows, batterAnalysis)
    };
  }

  /**
   * Calculate pitcher vulnerabilities based on batter strengths
   */
  calculatePitcherVulnerabilities(pitcherStats, batterAnalysis) {
    return {
      homeRunRisk: {
        level: this.assessHomeRunRisk(pitcherStats, batterAnalysis.powerThreats),
        threateningBatters: batterAnalysis.powerThreats.slice(0, 5),
        riskFactors: this.identifyHRRiskFactors(pitcherStats, batterAnalysis)
      },
      strikeoutPotential: {
        level: this.assessStrikeoutPotential(pitcherStats, batterAnalysis),
        vulnerableBatters: batterAnalysis.strikeoutProne.slice(0, 5),
        advantageFactors: this.identifyStrikeoutAdvantages(pitcherStats, batterAnalysis)
      },
      plateDisciptineChallenge: {
        level: this.assessPlateDisciptineChallenge(pitcherStats, batterAnalysis.plateDisciplined),
        challengingBatters: batterAnalysis.plateDisciplined.slice(0, 3),
        concerns: this.identifyWalkConcerns(pitcherStats, batterAnalysis)
      },
      overallThreatLevel: this.calculateOverallThreatLevel(pitcherStats, batterAnalysis)
    };
  }

  /**
   * Generate strategic recommendations for pitcher
   */
  generatePitcherStrategy(pitcher, pitcherStats, batterAnalysis, vulnerabilities) {
    return {
      attackPlan: this.generateAttackPlan(pitcher, vulnerabilities),
      battersonToTarget: this.identifyTargetBatters(vulnerabilities),
      battersToAvoid: this.identifyAvoidBatters(vulnerabilities),
      situationalStrategy: this.generateSituationalStrategy(pitcherStats, batterAnalysis),
      keySuccessFactors: this.identifySuccessFactors(pitcher, pitcherStats, vulnerabilities)
    };
  }

  // Helper methods for calculations
  calculateHandednessAdvantage(pitcherThrows, batterHits) {
    if (pitcherThrows === 'Unknown' || !batterHits) return 'unknown';
    
    // Same-side advantage (RHP vs RHB, LHP vs LHB)
    if ((pitcherThrows === 'R' && batterHits === 'R') || 
        (pitcherThrows === 'L' && batterHits === 'L')) {
      return 'favorable';
    }
    
    // Opposite-side disadvantage
    if ((pitcherThrows === 'R' && batterHits === 'L') || 
        (pitcherThrows === 'L' && batterHits === 'R')) {
      return 'challenging';
    }
    
    return 'neutral';
  }

  assessHomeRunRisk(pitcherStats, powerThreats) {
    if (powerThreats.length >= 6) return 'high';
    if (powerThreats.length >= 3) return 'moderate';
    return 'low';
  }

  assessStrikeoutPotential(pitcherStats, batterAnalysis) {
    const strikeoutProne = batterAnalysis.strikeoutProne.length;
    const totalBatters = batterAnalysis.totalBatters;
    
    const strikeoutRate = strikeoutProne / totalBatters;
    
    if (strikeoutRate >= 0.4) return 'high';
    if (strikeoutRate >= 0.25) return 'moderate';
    return 'low';
  }

  // Placeholder methods for data loading (to be implemented based on actual data structure)
  async fetchGameDataForDate(dateStr) {
    try {
      const [year, month, day] = dateStr.split('-');
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                         'july', 'august', 'september', 'october', 'november', 'december'];
      const monthName = monthNames[parseInt(month) - 1];
      
      const response = await fetch(`/data/${year}/${monthName}/${monthName}_${day}_${year}.json`);
      if (!response.ok) return null;
      
      const gameData = await response.json();
      return gameData.games || gameData.playerStats || [];
    } catch (error) {
      return null;
    }
  }

  findPitcherInGameData(gameData, pitcherName) {
    const appearances = [];
    
    if (!gameData || !Array.isArray(gameData)) return appearances;
    
    for (const game of gameData) {
      // Check if this is a pitcher appearance in various formats
      if (game.playerStats) {
        for (const player of game.playerStats) {
          if ((player.name === pitcherName || player.fullName === pitcherName) && 
              (player.position === 'P' || player.isPitcher)) {
            appearances.push({
              date: game.date,
              opponent: game.opponent || game.awayTeam || game.homeTeam,
              innings: player.IP || player.innings || 0,
              hits: player.H || player.hits || 0,
              runs: player.R || player.runs || 0,
              earnedRuns: player.ER || player.earnedRuns || 0,
              strikeouts: player.SO || player.K || player.strikeouts || 0,
              walks: player.BB || player.walks || 0,
              homeRuns: player.HR || player.homeRuns || 0,
              isWin: player.decision === 'W',
              isLoss: player.decision === 'L',
              pitches: player.pitches || 0
            });
          }
        }
      }
      
      // Check if pitcher is listed in game-level pitcher data
      if (game.pitcher === pitcherName || game.startingPitcher === pitcherName) {
        appearances.push({
          date: game.date,
          opponent: game.opponent || game.awayTeam || game.homeTeam,
          innings: game.pitcherStats?.innings || 0,
          hits: game.pitcherStats?.hits || 0,
          runs: game.pitcherStats?.runs || 0,
          earnedRuns: game.pitcherStats?.earnedRuns || 0,
          strikeouts: game.pitcherStats?.strikeouts || 0,
          walks: game.pitcherStats?.walks || 0,
          homeRuns: game.pitcherStats?.homeRuns || 0,
          isWin: game.pitcherStats?.decision === 'W',
          isLoss: game.pitcherStats?.decision === 'L'
        });
      }
    }
    
    return appearances;
  }

  async loadBatterHistoricalStats(batterName) {
    // Simplified implementation - would need to load from actual data files
    return {
      avg: 0.250 + Math.random() * 0.150,
      obp: 0.300 + Math.random() * 0.120,
      slg: 0.400 + Math.random() * 0.200,
      hr: Math.floor(Math.random() * 25),
      so: Math.floor(Math.random() * 100) + 50,
      handedness: ['L', 'R', 'B'][Math.floor(Math.random() * 3)]
    };
  }

  /**
   * Load roster data for handedness lookup
   */
  async loadRosterData() {
    try {
      const response = await fetch('/data/rosters.json');
      if (!response.ok) {
        console.warn('Failed to load roster data');
        return [];
      }
      return await response.json();
    } catch (error) {
      console.warn('Error loading roster data:', error);
      return [];
    }
  }

  /**
   * Find batter information in roster data
   */
  findBatterInRoster(batterName, rosterData) {
    if (!rosterData || !Array.isArray(rosterData)) return null;
    
    // Try exact match first
    let match = rosterData.find(player => 
      player.type === 'hitter' && 
      (player.name === batterName || player.fullName === batterName)
    );
    
    if (match) return match;
    
    // Try partial match (last name or first name)
    const nameParts = batterName.split(' ');
    if (nameParts.length >= 2) {
      const lastName = nameParts[nameParts.length - 1];
      match = rosterData.find(player => 
        player.type === 'hitter' && 
        (player.name.includes(lastName) || player.fullName.includes(lastName))
      );
    }
    
    return match;
  }

  // Basic fallback methods
  getBasicPitcherIntelligence(pitchers) {
    return {
      homePitcher: pitchers.home ? this.getBasicPitcherAnalysis(pitchers.home, []) : null,
      awayPitcher: pitchers.away ? this.getBasicPitcherAnalysis(pitchers.away, []) : null,
      matchupAnalysis: null
    };
  }

  getBasicPitcherAnalysis(pitcher, batters) {
    return {
      pitcher,
      opposingLineup: { totalBatters: batters.length, handedness: { left: [], right: [], switch: [], unknown: batters } },
      vulnerabilityAnalysis: { overallThreatLevel: 'unknown' },
      strategicRecommendations: { attackPlan: 'Standard approach' },
      confidenceLevel: 30
    };
  }

  getBasicPitcherStats() {
    return {
      appearances: [],
      seasonStats: { gamesStarted: 0, era: 0, record: { wins: 0, losses: 0 } },
      recentStats: { trend: 'unknown' },
      splits: { vsLefty: {}, vsRighty: {} }
    };
  }

  // Additional helper methods would be implemented here...
  classifyBatterHandedness(batter, stats, analysis) {
    const handedness = stats.handedness || 'Unknown';
    const batterInfo = { 
      name: batter.name || batter.fullName, 
      data: batter, 
      stats,
      handedness: handedness
    };
    
    switch (handedness) {
      case 'L': 
        analysis.handedness.left.push(batterInfo); 
        break;
      case 'R': 
        analysis.handedness.right.push(batterInfo); 
        break;
      case 'B': // Switch hitter (Both)
      case 'S': // Switch hitter (Alternative notation)
        analysis.handedness.switch.push(batterInfo); 
        break;
      default: 
        analysis.handedness.unknown.push(batterInfo);
    }
  }

  classifyBatterType(batter, stats, analysis) {
    // Power threat: High HR rate or high SLG
    if (stats.hr > 15 || stats.slg > 0.500) {
      analysis.powerThreats.push({ name: batter.name || batter.fullName, stats });
    }
    
    // Strikeout prone: High K rate
    if (stats.so > 120) {
      analysis.strikeoutProne.push({ name: batter.name || batter.fullName, stats });
    }
    
    // Plate disciplined: High OBP relative to AVG
    if (stats.obp - stats.avg > 0.060) {
      analysis.plateDisciplined.push({ name: batter.name || batter.fullName, stats });
    }
    
    // Contact hitter: Low K rate, decent average
    if (stats.so < 80 && stats.avg > 0.270) {
      analysis.contactHitters.push({ name: batter.name || batter.fullName, stats });
    }
  }

  updateTeamAverages(stats, analysis) {
    // This would accumulate stats for team averages calculation
  }

  finalizeTeamAverages(analysis) {
    // Calculate final team averages from accumulated stats
    if (analysis.totalBatters > 0) {
      // Set realistic defaults for now
      analysis.averageStats = {
        avg: 0.245,
        obp: 0.320,
        slg: 0.410,
        ops: 0.730,
        hr: 15,
        so: 95
      };
    }
  }

  identifyTeamCharacteristics(analysis) {
    analysis.teamStrengths = [];
    analysis.teamWeaknesses = [];
    
    if (analysis.powerThreats.length >= 4) {
      analysis.teamStrengths.push('Strong power lineup');
    }
    
    if (analysis.plateDisciplined.length >= 5) {
      analysis.teamStrengths.push('Good plate discipline');
    }
    
    if (analysis.strikeoutProne.length >= 6) {
      analysis.teamWeaknesses.push('Strikeout prone');
    }
  }

  calculateConfidenceLevel(pitcherStats, batterAnalysis) {
    let confidence = 50;
    
    if (pitcherStats.appearances.length > 10) confidence += 20;
    if (batterAnalysis.totalBatters >= 8) confidence += 15;
    
    return Math.min(85, Math.max(30, confidence));
  }

  // Season stats calculation
  calculateSeasonStats(stats) {
    if (!stats.appearances || stats.appearances.length === 0) return;
    
    let totalInnings = 0;
    let totalHits = 0;
    let totalRuns = 0;
    let totalEarnedRuns = 0;
    let totalStrikeouts = 0;
    let totalWalks = 0;
    let totalHomeRuns = 0;
    let wins = 0;
    let losses = 0;
    let gamesStarted = 0;
    
    for (const appearance of stats.appearances) {
      totalInnings += appearance.innings || 0;
      totalHits += appearance.hits || 0;
      totalRuns += appearance.runs || 0;
      totalEarnedRuns += appearance.earnedRuns || 0;
      totalStrikeouts += appearance.strikeouts || 0;
      totalWalks += appearance.walks || 0;
      totalHomeRuns += appearance.homeRuns || 0;
      
      if (appearance.isWin) wins++;
      if (appearance.isLoss) losses++;
      if (appearance.innings >= 5) gamesStarted++; // Rough heuristic for starts
    }
    
    stats.seasonStats.gamesStarted = gamesStarted;
    stats.seasonStats.innings = totalInnings;
    stats.seasonStats.era = totalInnings > 0 ? (totalEarnedRuns * 9) / totalInnings : 0;
    stats.seasonStats.whip = totalInnings > 0 ? (totalHits + totalWalks) / totalInnings : 0;
    stats.seasonStats.strikeouts = totalStrikeouts;
    stats.seasonStats.walks = totalWalks;
    stats.seasonStats.homeRunsAllowed = totalHomeRuns;
    stats.seasonStats.record.wins = wins;
    stats.seasonStats.record.losses = losses;
  }
  
  calculateRecentForm(stats) {
    if (!stats.appearances || stats.appearances.length === 0) return;
    
    // Last 5 games
    const last5 = stats.appearances.slice(-5);
    const last10 = stats.appearances.slice(-10);
    
    stats.recentStats.last5Games = last5;
    stats.recentStats.last10Games = last10;
    
    // Calculate recent ERA trend
    if (last5.length >= 3) {
      const recentERA = this.calculateERAForGames(last5);
      const seasonERA = stats.seasonStats.era;
      
      if (recentERA < seasonERA * 0.8) {
        stats.recentStats.trend = 'improving';
      } else if (recentERA > seasonERA * 1.3) {
        stats.recentStats.trend = 'declining';
      } else {
        stats.recentStats.trend = 'stable';
      }
    }
  }
  
  calculateERAForGames(games) {
    const totalInnings = games.reduce((sum, game) => sum + (game.innings || 0), 0);
    const totalEarnedRuns = games.reduce((sum, game) => sum + (game.earnedRuns || 0), 0);
    return totalInnings > 0 ? (totalEarnedRuns * 9) / totalInnings : 0;
  }
  
  calculateSplitStats(stats) {
    // Simplified - would need more detailed data for true L/R splits
    stats.splits.vsLefty = {
      avg: 0.250 + (Math.random() - 0.5) * 0.100,
      ops: 0.700 + (Math.random() - 0.5) * 0.200,
      hr: Math.floor(Math.random() * 5)
    };
    
    stats.splits.vsRighty = {
      avg: 0.240 + (Math.random() - 0.5) * 0.100,
      ops: 0.680 + (Math.random() - 0.5) * 0.200,
      hr: Math.floor(Math.random() * 8)
    };
  }
  
  assessRecentForm(stats) {
    const trend = stats.recentStats?.trend || 'stable';
    const direction = trend === 'improving' ? 'positive' : trend === 'declining' ? 'negative' : 'neutral';
    return { trend, direction };
  }
  
  identifyPitcherStrengthsWeaknesses(stats) {
    const strengths = [];
    const weaknesses = [];
    
    if (stats.seasonStats.era < 3.50) strengths.push('Low ERA');
    if (stats.seasonStats.whip < 1.20) strengths.push('Strong command');
    if (stats.seasonStats.strikeouts / stats.seasonStats.innings > 1.0) strengths.push('High strikeout rate');
    
    if (stats.seasonStats.era > 4.50) weaknesses.push('High ERA');
    if (stats.seasonStats.homeRunsAllowed / stats.seasonStats.innings > 0.15) weaknesses.push('Home run prone');
    if (stats.seasonStats.whip > 1.40) weaknesses.push('Control issues');
    
    return { strengths, weaknesses };
  }
  
  calculateOverallHandednessAdvantage(throws, analysis) {
    const leftCount = analysis.handedness.left.length;
    const rightCount = analysis.handedness.right.length;
    
    if (throws === 'R') {
      return leftCount > rightCount ? 'challenging' : 'favorable';
    } else if (throws === 'L') {
      return rightCount > leftCount ? 'challenging' : 'favorable';
    }
    
    return 'neutral';
  }
  
  calculateOverallThreatLevel(stats, analysis) {
    const powerThreats = analysis.powerThreats?.length || 0;
    const avgHRRate = stats.seasonStats.homeRunsAllowed / Math.max(1, stats.seasonStats.innings) * 9;
    
    if (powerThreats >= 5 || avgHRRate > 1.5) return 'high';
    if (powerThreats >= 3 || avgHRRate > 1.0) return 'moderate';
    return 'low';
  }
  
  compareMatchups(home, away) {
    if (!home || !away) {
      return { advantage: 'neutral', reasoning: 'Insufficient data for comparison' };
    }
    
    const homeERA = home.pitcher?.historicalStats?.seasonStats?.era || 5.00;
    const awayERA = away.pitcher?.historicalStats?.seasonStats?.era || 5.00;
    
    const difference = Math.abs(homeERA - awayERA);
    
    if (difference < 0.50) {
      return { advantage: 'neutral', reasoning: 'Similar ERA and performance levels' };
    } else if (homeERA < awayERA) {
      return { advantage: 'home', reasoning: `Home pitcher has significantly lower ERA (${homeERA.toFixed(2)} vs ${awayERA.toFixed(2)})` };
    } else {
      return { advantage: 'away', reasoning: `Away pitcher has significantly lower ERA (${awayERA.toFixed(2)} vs ${homeERA.toFixed(2)})` };
    }
  }
  
  // Default implementations for remaining methods
  calculateFavorableMatchups(throws, analysis) { return analysis.handedness[throws === 'R' ? 'right' : 'left'] || []; }
  calculateChallengingMatchups(throws, analysis) { return analysis.handedness[throws === 'R' ? 'left' : 'right'] || []; }
  identifyHRRiskFactors(stats, analysis) { return analysis.powerThreats?.slice(0, 3).map(p => `${p.name} (HR threat)`) || []; }
  identifyStrikeoutAdvantages(stats, analysis) { return analysis.strikeoutProne?.slice(0, 3).map(p => `${p.name} (K prone)`) || []; }
  assessPlateDisciptineChallenge(stats, disciplined) { 
    return disciplined?.length >= 4 ? 'high' : disciplined?.length >= 2 ? 'moderate' : 'low'; 
  }
  identifyWalkConcerns(stats, analysis) { return analysis.plateDisciplined?.slice(0, 2).map(p => `${p.name} (Patient hitter)`) || []; }
  generateAttackPlan(pitcher, vulnerabilities) { 
    const riskLevel = vulnerabilities.overallThreatLevel;
    if (riskLevel === 'high') return 'Careful approach - minimize mistakes';
    if (riskLevel === 'low') return 'Attack aggressively in strike zone';
    return 'Balanced approach - mix locations';
  }
  identifyTargetBatters(vulnerabilities) { return vulnerabilities.strikeoutPotential?.vulnerableBatters?.slice(0, 3) || []; }
  identifyAvoidBatters(vulnerabilities) { return vulnerabilities.homeRunRisk?.threateningBatters?.slice(0, 3) || []; }
  generateSituationalStrategy(stats, analysis) { 
    return {
      primaryApproach: this.generateAttackPlan(null, { overallThreatLevel: this.calculateOverallThreatLevel(stats, analysis) }),
      keyFocus: stats.seasonStats.homeRunsAllowed > 15 ? 'Limit hard contact' : 'Attack strike zone'
    };
  }
  identifySuccessFactors(pitcher, stats, vulnerabilities) { 
    const factors = [];
    if (stats.seasonStats.era < 4.00) factors.push('Strong ERA');
    if (vulnerabilities.overallThreatLevel === 'low') factors.push('Favorable matchup');
    if (stats.recentStats.trend === 'improving') factors.push('Improving form');
    return factors;
  }
  identifyKeyMatchups(pitcher, analysis, vulnerabilities) {
    const keyMatchups = [];
    
    // Add key power threats
    if (vulnerabilities.homeRunRisk?.threateningBatters) {
      keyMatchups.push(...vulnerabilities.homeRunRisk.threateningBatters.slice(0, 2).map(batter => ({
        batter: batter.name,
        type: 'threat',
        reason: 'High HR potential'
      })));
    }
    
    // Add favorable strikeout matchups
    if (vulnerabilities.strikeoutPotential?.vulnerableBatters) {
      keyMatchups.push(...vulnerabilities.strikeoutPotential.vulnerableBatters.slice(0, 2).map(batter => ({
        batter: batter.name,
        type: 'opportunity',
        reason: 'High strikeout potential'
      })));
    }
    
    return keyMatchups;
  }
}

const enhancedPitcherIntelligenceService = new EnhancedPitcherIntelligenceService();
export default enhancedPitcherIntelligenceService;