/**
 * Enhanced Home Run Analysis Service
 * src/services/HRAnalysis/HRAnalysisService.js
 * 
 * Provides comprehensive HR analysis with confidence adjustments,
 * trend analysis, and contextual factors
 */

import _ from 'lodash';
import { formatDateString } from '../dataService';

export class HRAnalysisService {
  constructor(options = {}) {
    // Confidence parameters
    this.confidenceK = options.confidenceK || 100; // PA threshold for confidence
    this.minPAForFullConfidence = options.minPAForFullConfidence || 300;
    
    // League averages (will be calculated from data)
    this.leagueAverages = {
      iso: 0.150,
      hrRate: 0.030,
      hardHitPercent: 0.380,
      exitVelo: 88.5
    };
  }

  /**
   * Calculate confidence factor based on plate appearances
   */
  calculateConfidence(pa) {
    return pa / (pa + this.confidenceK);
  }

  /**
   * Adjust a stat based on confidence and league average
   */
  adjustStatForConfidence(playerStat, leagueAvg, pa) {
    const confidence = this.calculateConfidence(pa);
    return confidence * playerStat + (1 - confidence) * leagueAvg;
  }

  /**
   * Analyze HR potential with confidence adjustments
   */
  analyzeHRPotential(batter, pitcher, historicalData = {}) {
    const analysis = {
      batter: batter.name,
      pitcher: pitcher.name,
      potential: 'Low',
      confidence: 0,
      metrics: {},
      warnings: [],
      insights: []
    };

    // Get batter's current season stats
    const batterStats = this.getBatterSeasonStats(batter, historicalData);
    const pitcherStats = this.getPitcherSeasonStats(pitcher, historicalData);

    // Calculate confidence based on PA
    const batterPA = batterStats.totalPA || 0;
    analysis.confidence = this.calculateConfidence(batterPA);

    // Add warning for low data
    if (batterPA < 50) {
      analysis.warnings.push({
        type: 'low_data',
        message: `Analysis based on only ${batterPA} plate appearances`,
        severity: 'high'
      });
    }

    // Adjust ISO for confidence
    const rawISO = batterStats.iso || 0;
    const adjustedISO = this.adjustStatForConfidence(
      rawISO, 
      this.leagueAverages.iso, 
      batterPA
    );

    // Calculate HR rate metrics
    const rawHRRate = batterStats.hrRate || 0;
    const adjustedHRRate = this.adjustStatForConfidence(
      rawHRRate,
      this.leagueAverages.hrRate,
      batterPA
    );

    analysis.metrics = {
      rawISO,
      adjustedISO,
      rawHRRate,
      adjustedHRRate,
      hrPerAB: adjustedHRRate > 0 ? Math.round(1 / adjustedHRRate) : 999,
      totalHRs: batterStats.totalHRs || 0,
      totalABs: batterStats.totalABs || 0,
      confidence: analysis.confidence
    };

    // Time since last HR analysis
    const timeSinceLastHR = this.calculateTimeSinceLastHR(batter, historicalData);
    if (timeSinceLastHR) {
      analysis.metrics.timeSinceLastHR = timeSinceLastHR;
      
      // Check if "due" for HR
      if (timeSinceLastHR.absSinceLastHR > analysis.metrics.hrPerAB * 1.5) {
        analysis.insights.push({
          type: 'due_for_hr',
          message: `${timeSinceLastHR.absSinceLastHR} ABs since last HR (expected every ${analysis.metrics.hrPerAB})`,
          importance: 'medium'
        });
      }
    }

    // Home/Away split analysis
    const splitAnalysis = this.analyzeSplits(batter, pitcher, historicalData);
    if (splitAnalysis) {
      analysis.metrics.splits = splitAnalysis;
      
      if (splitAnalysis.relevantAdvantage > 0.05) {
        analysis.insights.push({
          type: 'favorable_split',
          message: `Batter performs ${splitAnalysis.relevantAdvantage.toFixed(1)}% better ${splitAnalysis.venue}`,
          importance: 'high'
        });
      }
    }

    // Year-over-year trend analysis
    const trendAnalysis = this.analyzeTrends(batter, historicalData);
    if (trendAnalysis) {
      analysis.metrics.trends = trendAnalysis;
      
      if (trendAnalysis.improvement > 0.02) {
        analysis.insights.push({
          type: 'improving_power',
          message: `ISO improved by ${(trendAnalysis.improvement * 100).toFixed(1)}% from 2024`,
          importance: 'medium'
        });
      }
    }

    // Arsenal matchup analysis
    const arsenalMatchup = this.analyzeArsenalMatchup(batter, pitcher, historicalData);
    if (arsenalMatchup) {
      analysis.metrics.arsenalMatchup = arsenalMatchup;
      
      if (arsenalMatchup.vulnerablePitches.length > 0) {
        analysis.insights.push({
          type: 'arsenal_advantage',
          message: `Strong vs ${arsenalMatchup.vulnerablePitches.join(', ')} (${(arsenalMatchup.bestMatchupAdvantage * 100).toFixed(1)}% usage)`,
          importance: 'high'
        });
      }
    }

    // Exit velocity analysis
    const exitVeloAnalysis = this.analyzeExitVelocity(batter, pitcher, historicalData);
    if (exitVeloAnalysis) {
      analysis.metrics.exitVelocity = exitVeloAnalysis;
      
      if (exitVeloAnalysis.matchupAdvantage > 2) {
        analysis.insights.push({
          type: 'exit_velo_advantage',
          message: `Batter avg exit velo ${exitVeloAnalysis.matchupAdvantage.toFixed(1)} mph higher than pitcher allows`,
          importance: 'high'
        });
      }
    }

    // Calculate final HR potential rating
    analysis.potential = this.calculateHRPotentialRating(analysis.metrics);

    // Add context-aware recommendation
    analysis.recommendation = this.generateRecommendation(analysis);

    return analysis;
  }

  /**
   * Get batter's season stats from historical data
   */
  getBatterSeasonStats(batter, historicalData) {
    const stats = {
      totalPA: 0,
      totalABs: 0,
      totalHRs: 0,
      totalHits: 0,
      totalTBs: 0,
      iso: 0,
      hrRate: 0,
      games: []
    };

    // Process 2025 daily data
    if (historicalData.dailyData2025) {
      Object.entries(historicalData.dailyData2025).forEach(([date, players]) => {
        const playerData = players.find(p => 
          p.name === batter.name && p.team === batter.team
        );
        
        if (playerData && playerData.AB > 0) {
          stats.totalABs += Number(playerData.AB) || 0;
          stats.totalPA += (Number(playerData.AB) || 0) + (Number(playerData.BB) || 0);
          stats.totalHRs += Number(playerData.HR) || 0;
          stats.totalHits += Number(playerData.H) || 0;
          
          // Calculate total bases
          const singles = (Number(playerData.H) || 0) - 
                         (Number(playerData['2B']) || 0) - 
                         (Number(playerData['3B']) || 0) - 
                         (Number(playerData.HR) || 0);
          stats.totalTBs += singles + 
                           (Number(playerData['2B']) || 0) * 2 + 
                           (Number(playerData['3B']) || 0) * 3 + 
                           (Number(playerData.HR) || 0) * 4;
          
          stats.games.push({
            date,
            hrs: Number(playerData.HR) || 0,
            abs: Number(playerData.AB) || 0
          });
        }
      });
    }

    // Calculate rates
    if (stats.totalABs > 0) {
      const avg = stats.totalHits / stats.totalABs;
      const slg = stats.totalTBs / stats.totalABs;
      stats.iso = slg - avg;
      stats.hrRate = stats.totalHRs / stats.totalABs;
    }

    return stats;
  }

  /**
   * Get pitcher's season stats
   */
  getPitcherSeasonStats(pitcher, historicalData) {
    const stats = {
      totalBF: 0,
      totalHRsAllowed: 0,
      hrRateAllowed: 0,
      games: []
    };

    // Process pitcher data from CSV if available
    if (historicalData.pitcherCSV) {
      const pitcherRecords = historicalData.pitcherCSV.filter(p =>
        p['last_name, first_name'] === this.convertToCSVName(pitcher) &&
        p.team_name_alt === pitcher.team &&
        p.year === 2025
      );

      pitcherRecords.forEach(record => {
        stats.totalBF += Number(record.pa_faced) || 0;
        // Sum HRs allowed from pitch-specific data
      });
    }

    return stats;
  }

  /**
   * Calculate time since last HR
   */
  calculateTimeSinceLastHR(batter, historicalData) {
    const batterStats = this.getBatterSeasonStats(batter, historicalData);
    
    if (!batterStats.games || batterStats.games.length === 0) {
      return null;
    }

    // Sort games by date (newest first)
    const sortedGames = batterStats.games.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    let absSinceLastHR = 0;
    let gamesSinceLastHR = 0;
    let lastHRDate = null;

    for (const game of sortedGames) {
      if (game.hrs > 0) {
        lastHRDate = game.date;
        break;
      }
      absSinceLastHR += game.abs;
      gamesSinceLastHR++;
    }

    return {
      absSinceLastHR,
      gamesSinceLastHR,
      lastHRDate,
      daysSinceLastHR: lastHRDate ? 
        Math.floor((new Date() - new Date(lastHRDate)) / (1000 * 60 * 60 * 24)) : 
        null
    };
  }

  /**
   * Analyze home/away splits
   */
  analyzeSplits(batter, pitcher, historicalData) {
    // Determine venue (home/away for batter)
    const venue = this.determineVenue(batter, pitcher, historicalData);
    
    if (!venue) return null;

    // Get split-specific stats from CSV data
    const batterSplitStats = this.getBatterSplitStats(batter, venue, historicalData);
    const pitcherSplitStats = this.getPitcherSplitStats(pitcher, venue, historicalData);

    return {
      venue: venue === 'home' ? 'at home' : 'on road',
      batterISO: batterSplitStats.iso,
      batterHRRate: batterSplitStats.hrRate,
      pitcherHRRateAllowed: pitcherSplitStats.hrRateAllowed,
      relevantAdvantage: batterSplitStats.iso - this.leagueAverages.iso
    };
  }

  /**
   * Analyze year-over-year trends
   */
  analyzeTrends(batter, historicalData) {
    const stats2025 = this.getBatterSeasonStats(batter, historicalData);
    
    // Get 2024 stats from roster
    const stats2024 = this.get2024StatsFromRoster(batter, historicalData);
    
    if (!stats2024 || stats2024.abs < 50) return null;

    // Calculate ISO for 2024
    const iso2024 = stats2024.slg - stats2024.avg;
    
    return {
      iso2024,
      iso2025: stats2025.iso,
      improvement: stats2025.iso - iso2024,
      percentChange: iso2024 > 0 ? (stats2025.iso - iso2024) / iso2024 : 0,
      trajectory: stats2025.iso > iso2024 ? 'improving' : 'declining'
    };
  }

  /**
   * Get 2024 stats from roster data
   */
  get2024StatsFromRoster(batter, historicalData) {
    if (!historicalData.rosterData) return null;

    const rosterEntry = historicalData.rosterData.find(p =>
      p.name === batter.name && p.team === batter.team
    );

    if (!rosterEntry || !rosterEntry.stats) return null;

    return {
      abs: rosterEntry.stats['2024_AB'] || 0,
      hrs: rosterEntry.stats['2024_HR'] || 0,
      avg: rosterEntry.stats['2024_AVG'] || 0,
      slg: rosterEntry.stats['2024_SLG'] || 0
    };
  }

  /**
   * Analyze arsenal matchup for HR potential
   */
  analyzeArsenalMatchup(batter, pitcher, historicalData) {
    if (!historicalData.hitterCSV || !historicalData.pitcherCSV) return null;

    // Get pitcher's arsenal
    const pitcherArsenal = this.getPitcherArsenal(pitcher, historicalData);
    if (!pitcherArsenal || pitcherArsenal.length === 0) return null;

    // Analyze batter vs each pitch type
    const matchups = [];
    let bestMatchupAdvantage = 0;
    const vulnerablePitches = [];

    pitcherArsenal.forEach(pitch => {
      const batterVsPitch = this.getBatterVsPitchStats(
        batter, 
        pitch.pitchType, 
        historicalData
      );

      if (batterVsPitch && batterVsPitch.iso > this.leagueAverages.iso * 1.3) {
        matchups.push({
          pitchType: pitch.pitchType,
          usage: pitch.usage,
          batterISO: batterVsPitch.iso,
          advantage: batterVsPitch.iso - this.leagueAverages.iso
        });

        if (pitch.usage > 0.15) { // Significant usage
          vulnerablePitches.push(pitch.pitchType);
          bestMatchupAdvantage = Math.max(bestMatchupAdvantage, pitch.usage);
        }
      }
    });

    return {
      matchups,
      vulnerablePitches,
      bestMatchupAdvantage
    };
  }

  /**
   * Get pitcher's arsenal from CSV data
   */
  getPitcherArsenal(pitcher, historicalData) {
    if (!historicalData.pitcherCSV) return [];

    const pitcherRecords = historicalData.pitcherCSV.filter(p =>
      p['last_name, first_name'] === this.convertToCSVName(pitcher) &&
      p.team_name_alt === pitcher.team &&
      p.year === 2025
    );

    const arsenal = _.groupBy(pitcherRecords, 'pitch_type');
    
    return Object.entries(arsenal).map(([pitchType, records]) => ({
      pitchType,
      usage: _.meanBy(records, r => Number(r.pitch_usage) / 100) || 0,
      totalPitches: _.sumBy(records, 'pitches')
    })).filter(p => p.usage > 0.05); // Min 5% usage
  }

  /**
   * Get batter stats vs specific pitch type
   */
  getBatterVsPitchStats(batter, pitchType, historicalData) {
    if (!historicalData.hitterCSV) return null;

    const records = historicalData.hitterCSV.filter(h =>
      h['last_name, first_name'] === this.convertToCSVName(batter) &&
      h.team_name_alt === batter.team &&
      h.pitch_type === pitchType &&
      h.year === 2025
    );

    if (records.length === 0) return null;

    const totalPA = _.sumBy(records, 'pa') || 0;
    const avgISO = _.meanBy(records, 'iso') || 0;

    return {
      iso: avgISO,
      pa: totalPA,
      sampleSize: records.length
    };
  }

  /**
   * Analyze exit velocity matchup
   */
  analyzeExitVelocity(batter, pitcher, historicalData) {
    if (!historicalData.hitterExitVelo || !historicalData.pitcherExitVelo) {
      return null;
    }

    // Get batter's exit velo stats
    const batterEV = historicalData.hitterExitVelo.find(h =>
      h.player_name === batter.name
    );

    // Get pitcher's exit velo allowed
    const pitcherEV = historicalData.pitcherExitVelo.find(p =>
      p.player_name === pitcher.name
    );

    if (!batterEV || !pitcherEV) return null;

    const batterAvgEV = Number(batterEV.avg_hit_speed) || this.leagueAverages.exitVelo;
    const pitcherAvgEVAllowed = Number(pitcherEV.avg_hit_speed) || this.leagueAverages.exitVelo;
    const matchupAdvantage = batterAvgEV - pitcherAvgEVAllowed;

    // Hard hit analysis
    const batterHardHit = Number(batterEV.hard_hit_percent) || this.leagueAverages.hardHitPercent;
    const pitcherHardHitAllowed = Number(pitcherEV.hard_hit_percent) || this.leagueAverages.hardHitPercent;

    return {
      batterAvgEV,
      pitcherAvgEVAllowed,
      matchupAdvantage,
      batterHardHitPct: batterHardHit,
      pitcherHardHitPctAllowed: pitcherHardHitAllowed,
      hardHitAdvantage: batterHardHit - pitcherHardHitAllowed
    };
  }

  /**
   * Calculate final HR potential rating
   */
  calculateHRPotentialRating(metrics) {
    let score = 0;
    
    // Base score from adjusted ISO
    if (metrics.adjustedISO > 0.200) score += 3;
    else if (metrics.adjustedISO > 0.150) score += 2;
    else if (metrics.adjustedISO > 0.100) score += 1;

    // Exit velocity advantage
    if (metrics.exitVelocity && metrics.exitVelocity.matchupAdvantage > 3) score += 2;
    else if (metrics.exitVelocity && metrics.exitVelocity.matchupAdvantage > 1) score += 1;

    // Arsenal matchup
    if (metrics.arsenalMatchup && metrics.arsenalMatchup.vulnerablePitches.length > 1) score += 1;

    // Trends
    if (metrics.trends && metrics.trends.improvement > 0.03) score += 1;

    // Due for HR bonus
    if (metrics.timeSinceLastHR && metrics.timeSinceLastHR.absSinceLastHR > metrics.hrPerAB * 2) {
      score += 0.5;
    }

    // Apply confidence penalty for low data
    if (metrics.confidence < 0.3) {
      score = score * 0.5;
    }

    // Convert to rating
    if (score >= 5) return 'High';
    if (score >= 2.5) return 'Medium';
    return 'Low';
  }

  /**
   * Generate context-aware recommendation
   */
  generateRecommendation(analysis) {
    const recommendations = [];

    // Low confidence warning
    if (analysis.confidence < 0.3) {
      recommendations.push({
        type: 'caution',
        text: 'Limited data - use with caution'
      });
    }

    // Due for HR
    if (analysis.metrics.timeSinceLastHR && 
        analysis.metrics.timeSinceLastHR.absSinceLastHR > analysis.metrics.hrPerAB * 1.5) {
      recommendations.push({
        type: 'positive',
        text: `Due for HR (${analysis.metrics.timeSinceLastHR.absSinceLastHR} ABs)`
      });
    }

    // Strong matchup advantages
    if (analysis.insights.some(i => i.type === 'arsenal_advantage')) {
      recommendations.push({
        type: 'positive',
        text: 'Favorable pitch matchup'
      });
    }

    // Exit velo advantage
    if (analysis.metrics.exitVelocity && analysis.metrics.exitVelocity.matchupAdvantage > 2) {
      recommendations.push({
        type: 'positive',
        text: 'Exit velocity advantage'
      });
    }

    return recommendations;
  }

  /**
   * Utility functions
   */
  convertToCSVName(player) {
    if (player.fullName) {
      const parts = player.fullName.split(' ');
      if (parts.length >= 2) {
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        return `${lastName}, ${firstName}`;
      }
    }
    return player.name;
  }

  determineVenue(batter, pitcher, historicalData) {
    // This would need game context to determine home/away
    // For now, return null (would be implemented with game data)
    return null;
  }

  getBatterSplitStats(batter, venue, historicalData) {
    // Would query split-specific data
    return {
      iso: this.leagueAverages.iso,
      hrRate: this.leagueAverages.hrRate
    };
  }

  getPitcherSplitStats(pitcher, venue, historicalData) {
    // Would query split-specific data
    return {
      hrRateAllowed: this.leagueAverages.hrRate
    };
  }
}

/**
 * Factory function to create HR analysis service
 */
export function createHRAnalysisService(options) {
  return new HRAnalysisService(options);
}

/**
 * Main analysis function
 */
export async function analyzeHRMatchup(batter, pitcher, dataService, options = {}) {
  // Gather all necessary historical data
  const historicalData = {
    dailyData2025: await dataService.fetchPlayerDataForDateRange(
      new Date(),
      90 // Last 90 days
    ),
    rosterData: dataService.rosterData,
    hitterCSV: options.hitterCSV || [],
    pitcherCSV: options.pitcherCSV || [],
    hitterExitVelo: options.hitterExitVelo || [],
    pitcherExitVelo: options.pitcherExitVelo || []
  };

  const analyzer = createHRAnalysisService(options);
  return analyzer.analyzeHRPotential(batter, pitcher, historicalData);
}