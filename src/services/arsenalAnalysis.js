/**
 * Arsenal Analysis Service
 * Provides comprehensive pitcher arsenal analysis and hitter matchup evaluations
 */

import _ from 'lodash';

/**
 * Arsenal Analyzer Class
 */
export class ArsenalAnalyzer {
  constructor(hitterData, pitcherData, activeYears = [2025, 2024, 2023, 2022]) {
    this.hitterData = hitterData;
    this.pitcherData = pitcherData;
    this.activeYears = activeYears.sort((a, b) => b - a);
    this.currentYear = Math.max(...activeYears);
    
    console.log(`[ArsenalAnalyzer] Initialized with ${hitterData.length} hitter records and ${pitcherData.length} pitcher records`);
  }

  /**
   * Enhanced name matching that handles roster format (G. Perdomo) to CSV format (Perdomo, Geraldo)
   */
  findPlayerInCSV(rosterPlayer, csvData) {
    if (!rosterPlayer || !csvData || csvData.length === 0) return [];
    
    const matches = [];
    
    // Strategy 1: Use fullName if available for exact matching
    if (rosterPlayer.fullName) {
      const parts = rosterPlayer.fullName.split(' ');
      if (parts.length >= 2) {
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        const csvFormat = `${lastName}, ${firstName}`;
        
        const exactMatches = csvData.filter(row => 
          row['last_name, first_name'] === csvFormat && 
          row.team_name_alt === rosterPlayer.team &&
          this.activeYears.includes(row.year)
        );
        
        if (exactMatches.length > 0) {
          console.log(`[ArsenalAnalyzer] Found ${exactMatches.length} exact matches for ${rosterPlayer.fullName} using fullName`);
          return exactMatches;
        }
      }
    }
    
    // Strategy 2: Extract last name from short name (G. Perdomo -> Perdomo)
    if (rosterPlayer.name) {
      const nameParts = rosterPlayer.name.split(' ');
      const lastName = nameParts[nameParts.length - 1];
      
      // Find all players with matching last name and team
      const lastNameMatches = csvData.filter(row => {
        const csvName = row['last_name, first_name'];
        return csvName && 
               csvName.toLowerCase().startsWith(lastName.toLowerCase() + ',') &&
               row.team_name_alt === rosterPlayer.team &&
               this.activeYears.includes(row.year);
      });
      
      if (lastNameMatches.length > 0) {
        console.log(`[ArsenalAnalyzer] Found ${lastNameMatches.length} last name matches for ${rosterPlayer.name}`);
        return lastNameMatches;
      }
    }
    
    console.log(`[ArsenalAnalyzer] No matches found for ${rosterPlayer.name} (${rosterPlayer.fullName})`);
    return [];
  }

  /**
   * Analyze a pitcher's arsenal
   */
  analyzePitcherArsenal(pitcher) {
    console.log(`[ArsenalAnalyzer] Analyzing arsenal for pitcher: ${pitcher.name} (${pitcher.fullName})`);
    
    const pitcherStats = this.findPlayerInCSV(pitcher, this.pitcherData);
    
    if (pitcherStats.length === 0) {
      console.log(`[ArsenalAnalyzer] No pitcher data found for ${pitcher.name}`);
      return null;
    }
    
    // Group by pitch type across years
    const pitchGroups = _.groupBy(pitcherStats, 'pitch_type');
    const arsenal = [];
    
    Object.entries(pitchGroups).forEach(([pitchType, pitchData]) => {
      if (!pitchType || pitchType === 'null' || pitchType === 'undefined') return;
      
      // Calculate weighted averages based on pitches thrown
      const totalPitches = _.sumBy(pitchData, 'pitches') || 0;
      if (totalPitches === 0) return;
      
      const weightedStats = this.calculateWeightedPitchStats(pitchData);
      
      arsenal.push({
        pitchType,
        pitchName: pitchData[0].pitch_name || pitchType,
        usage: weightedStats.usage,
        totalPitches,
        runValuePer100: weightedStats.runValuePer100,
        battingAverageAgainst: weightedStats.ba,
        wobaAgainst: weightedStats.woba,
        whiffPercent: weightedStats.whiffPercent,
        strikeoutPercent: weightedStats.kPercent,
        hardHitPercent: weightedStats.hardHitPercent || 0,
        yearlyBreakdown: this.getYearlyBreakdown(pitchData)
      });
    });
    
    // Sort by usage
    arsenal.sort((a, b) => b.usage - a.usage);
    
    console.log(`[ArsenalAnalyzer] Found ${arsenal.length} pitch types for ${pitcher.name}`);
    
    return {
      pitcher: pitcher.name,
      team: pitcher.team,
      totalPitchTypes: arsenal.length,
      arsenal,
      primaryPitches: arsenal.filter(p => p.usage > 0.15),
      confidence: this.calculatePitcherConfidence(pitcherStats),
      dataYears: [...new Set(pitcherStats.map(s => s.year))].sort((a, b) => b - a)
    };
  }

  /**
   * Calculate weighted pitch statistics
   */
  calculateWeightedPitchStats(pitchData) {
    const totalPitches = _.sumBy(pitchData, 'pitches') || 1;
    
    const weightedSum = (field) => {
      return _.sumBy(pitchData, row => {
        const value = parseFloat(row[field]) || 0;
        const weight = (row.pitches || 0) / totalPitches;
        return value * weight;
      });
    };
    
    return {
      usage: weightedSum('pitch_usage') / 100, // Convert to decimal
      runValuePer100: weightedSum('run_value_per_100'),
      ba: weightedSum('ba'),
      woba: weightedSum('woba'),
      whiffPercent: weightedSum('whiff_percent'),
      kPercent: weightedSum('k_percent'),
      hardHitPercent: weightedSum('hard_hit_percent')
    };
  }

  /**
   * Get yearly breakdown for a pitch
   */
  getYearlyBreakdown(pitchData) {
    return pitchData.map(row => ({
      year: row.year,
      usage: row.pitch_usage,
      runValuePer100: row.run_value_per_100,
      ba: row.ba,
      woba: row.woba,
      pitches: row.pitches
    })).sort((a, b) => b.year - a.year);
  }

  /**
   * Analyze hitter performance against specific pitch types
   */
  analyzeHitterVsPitches(hitter, pitcherArsenal) {
    console.log(`[ArsenalAnalyzer] Analyzing ${hitter.name} vs pitcher arsenal`);
    
    const hitterStats = this.findPlayerInCSV(hitter, this.hitterData);
    
    if (hitterStats.length === 0) {
      console.log(`[ArsenalAnalyzer] No hitter data found for ${hitter.name}`);
      return null;
    }
    
    const pitchMatchups = [];
    
    // Analyze hitter performance against each pitch type in the arsenal
    pitcherArsenal.forEach(pitch => {
      const hitterVsPitch = hitterStats.filter(row => row.pitch_type === pitch.pitchType);
      
      if (hitterVsPitch.length > 0) {
        const hitterPitchStats = this.calculateWeightedPitchStats(hitterVsPitch);
        
        // Calculate matchup advantage (positive = hitter advantage)
        const matchupAdvantage = this.calculateMatchupAdvantage(
          hitterPitchStats,
          pitch
        );
        
        pitchMatchups.push({
          pitchType: pitch.pitchType,
          pitchName: pitch.pitchName,
          pitcherUsage: pitch.usage,
          matchupAdvantage,
          hitterPerformance: {
            ba: hitterPitchStats.ba,
            woba: hitterPitchStats.woba,
            whiffPercent: hitterPitchStats.whiffPercent,
            dataPoints: hitterVsPitch.length
          },
          recommendation: this.getRecommendation(matchupAdvantage)
        });
      } else {
        // No specific data - use league average estimate
        pitchMatchups.push({
          pitchType: pitch.pitchType,
          pitchName: pitch.pitchName,
          pitcherUsage: pitch.usage,
          matchupAdvantage: 0,
          hitterPerformance: null,
          recommendation: 'neutral'
        });
      }
    });
    
    // Calculate overall assessment
    const overallAssessment = this.calculateOverallAssessment(pitchMatchups);
    
    return {
      hitter: hitter.name,
      team: hitter.team,
      pitchMatchups,
      overallAssessment,
      confidence: this.calculateHitterConfidence(hitterStats, pitchMatchups),
      hitterTrends: this.analyzeHitterTrends(hitterStats)
    };
  }

  /**
   * Calculate matchup advantage between hitter and pitch
   */
  calculateMatchupAdvantage(hitterStats, pitchStats) {
    // Compare hitter's performance vs pitch to pitcher's average
    const wobaAdvantage = (hitterStats.woba || 0.320) - (pitchStats.wobaAgainst || 0.320);
    const baAdvantage = (hitterStats.ba || 0.250) - (pitchStats.battingAverageAgainst || 0.250);
    const whiffDisadvantage = (hitterStats.whiffPercent || 20) - (pitchStats.whiffPercent || 20);
    
    // Weighted combination (wOBA is most important)
    const advantage = (wobaAdvantage * 10) + (baAdvantage * 5) - (whiffDisadvantage * 0.1);
    
    return advantage;
  }

  /**
   * Get recommendation based on matchup advantage
   */
  getRecommendation(advantage) {
    if (advantage > 2) return 'strong_hitter_advantage';
    if (advantage > 0.5) return 'hitter_advantage';
    if (advantage < -2) return 'strong_pitcher_advantage';
    if (advantage < -0.5) return 'pitcher_advantage';
    return 'neutral';
  }

  /**
   * Calculate overall assessment for hitter
   */
  calculateOverallAssessment(pitchMatchups) {
    // Weight matchups by pitcher's usage
    let totalWeight = 0;
    let weightedAdvantage = 0;
    const strengths = [];
    const weaknesses = [];
    
    pitchMatchups.forEach(matchup => {
      const weight = matchup.pitcherUsage;
      totalWeight += weight;
      weightedAdvantage += matchup.matchupAdvantage * weight;
      
      if (matchup.matchupAdvantage > 1) {
        strengths.push({
          pitch: matchup.pitchName,
          advantage: matchup.matchupAdvantage
        });
      } else if (matchup.matchupAdvantage < -1) {
        weaknesses.push({
          pitch: matchup.pitchName,
          disadvantage: Math.abs(matchup.matchupAdvantage)
        });
      }
    });
    
    return {
      overallAdvantage: totalWeight > 0 ? weightedAdvantage / totalWeight : 0,
      strengthCount: strengths.length,
      weaknessCount: weaknesses.length,
      keyStrengths: strengths.sort((a, b) => b.advantage - a.advantage).slice(0, 3),
      keyWeaknesses: weaknesses.sort((a, b) => b.disadvantage - a.disadvantage).slice(0, 3)
    };
  }

  /**
   * Calculate confidence scores
   */
  calculatePitcherConfidence(pitcherStats) {
    const totalPitches = _.sumBy(pitcherStats, 'pitches') || 0;
    const yearsOfData = [...new Set(pitcherStats.map(s => s.year))].length;
    
    // Base confidence on data volume and recency
    let confidence = Math.min(1, totalPitches / 5000) * 0.5;
    confidence += Math.min(1, yearsOfData / 3) * 0.3;
    
    // Bonus for recent data
    if (pitcherStats.some(s => s.year === this.currentYear)) {
      confidence += 0.2;
    }
    
    return Math.min(1, confidence);
  }

  calculateHitterConfidence(hitterStats, pitchMatchups) {
    const totalPA = _.sumBy(hitterStats, 'pa') || 0;
    const matchupsWithData = pitchMatchups.filter(m => m.hitterPerformance !== null).length;
    const matchupCoverage = pitchMatchups.length > 0 ? matchupsWithData / pitchMatchups.length : 0;
    
    let confidence = Math.min(1, totalPA / 1000) * 0.4;
    confidence += matchupCoverage * 0.4;
    
    // Bonus for recent data
    if (hitterStats.some(s => s.year === this.currentYear)) {
      confidence += 0.2;
    }
    
    return Math.min(1, confidence);
  }

  /**
   * Analyze hitter trends
   */
  analyzeHitterTrends(hitterStats) {
    const yearlyStats = _.groupBy(hitterStats, 'year');
    const years = Object.keys(yearlyStats).sort((a, b) => b - a);
    
    if (years.length < 2) {
      return { trend: 'insufficient_data' };
    }
    
    // Calculate year-over-year changes
    const recentYear = years[0];
    const previousYear = years[1];
    
    const recentWOBA = _.meanBy(yearlyStats[recentYear], 'woba') || 0;
    const previousWOBA = _.meanBy(yearlyStats[previousYear], 'woba') || 0;
    
    return {
      trend: recentWOBA > previousWOBA ? 'improving' : 'declining',
      wobaChange: recentWOBA - previousWOBA,
      years: years
    };
  }

  /**
   * Analyze pitcher year-over-year trends
   */
  analyzePitcherTrends(pitcherStats) {
    const yearlyStats = _.groupBy(pitcherStats, 'year');
    const years = Object.keys(yearlyStats).sort((a, b) => b - a);
    
    if (years.length < 2) {
      return {
        overall: { trend: 'insufficient_data' },
        byPitch: {}
      };
    }
    
    // Overall trends
    const yearlyAverages = years.map(year => {
      const yearData = yearlyStats[year];
      return {
        year: parseInt(year),
        avgWOBAAgainst: _.meanBy(yearData, 'woba') || 0,
        avgWhiffPercent: _.meanBy(yearData, 'whiff_percent') || 0,
        avgUsage: _.meanBy(yearData, 'pitch_usage') || 0
      };
    });
    
    // Pitch-specific trends
    const pitchTypes = [...new Set(pitcherStats.map(s => s.pitch_type))].filter(Boolean);
    const byPitch = {};
    
    pitchTypes.forEach(pitchType => {
      const pitchYearlyData = pitcherStats.filter(s => s.pitch_type === pitchType);
      const pitchByYear = _.groupBy(pitchYearlyData, 'year');
      
      if (Object.keys(pitchByYear).length >= 2) {
        const recentYear = Math.max(...Object.keys(pitchByYear).map(Number));
        const previousYear = recentYear - 1;
        
        if (pitchByYear[recentYear] && pitchByYear[previousYear]) {
          const recentUsage = _.meanBy(pitchByYear[recentYear], 'pitch_usage') || 0;
          const previousUsage = _.meanBy(pitchByYear[previousYear], 'pitch_usage') || 0;
          const recentWOBA = _.meanBy(pitchByYear[recentYear], 'woba') || 0;
          const previousWOBA = _.meanBy(pitchByYear[previousYear], 'woba') || 0;
          
          byPitch[pitchType] = {
            changes: {
              usage: (recentUsage - previousUsage) / 100,
              effectiveness: recentWOBA - previousWOBA
            }
          };
        }
      }
    });
    
    // Determine overall trend
    const recentData = yearlyAverages[0];
    const previousData = yearlyAverages[1];
    const wobaImproved = recentData.avgWOBAAgainst < previousData.avgWOBAAgainst;
    const whiffImproved = recentData.avgWhiffPercent > previousData.avgWhiffPercent;
    
    const improvements = [];
    const regressions = [];
    
    if (wobaImproved) improvements.push('Reduced wOBA against');
    else regressions.push('Increased wOBA against');
    
    if (whiffImproved) improvements.push('Improved whiff rate');
    else regressions.push('Decreased whiff rate');
    
    return {
      overall: {
        trend: improvements.length > regressions.length ? 'improving' : 'declining',
        yearlyStats: yearlyAverages,
        summary: { improvements, regressions }
      },
      byPitch
    };
  }
}

/**
 * Factory function to create arsenal analyzer
 */
export function createArsenalAnalyzer(hitterData, pitcherData, activeYears) {
  return new ArsenalAnalyzer(hitterData, pitcherData, activeYears);
}

/**
 * Main analysis function for a pitcher vs lineup
 */
export function analyzeArsenalMatchup(pitcher, opposingHitters, hitterData, pitcherData, activeYears) {
  console.log(`[analyzeArsenalMatchup] Starting analysis for ${pitcher.name} vs ${opposingHitters.length} hitters`);
  
  const analyzer = new ArsenalAnalyzer(hitterData, pitcherData, activeYears);
  
  // Analyze pitcher's arsenal
  const pitcherArsenal = analyzer.analyzePitcherArsenal(pitcher);
  
  if (!pitcherArsenal) {
    console.log(`[analyzeArsenalMatchup] No arsenal data found for pitcher ${pitcher.name}`);
    return null;
  }
  
  // Analyze each hitter vs the arsenal
  const hitterAnalyses = [];
  let totalAdvantage = 0;
  let favorableMatchups = 0;
  let difficultMatchups = 0;
  
  opposingHitters.forEach(hitter => {
    const analysis = analyzer.analyzeHitterVsPitches(hitter, pitcherArsenal.arsenal);
    
    if (analysis) {
      hitterAnalyses.push(analysis);
      totalAdvantage += analysis.overallAssessment.overallAdvantage;
      
      if (analysis.overallAssessment.overallAdvantage > 0.5) {
        favorableMatchups++;
      } else if (analysis.overallAssessment.overallAdvantage < -0.5) {
        difficultMatchups++;
      }
    }
  });
  
  console.log(`[analyzeArsenalMatchup] Completed analysis for ${hitterAnalyses.length} hitters`);
  
  // Calculate team summary
  const teamSummary = {
    totalHitters: opposingHitters.length,
    analyzedHitters: hitterAnalyses.length,
    favorableMatchups,
    difficultMatchups,
    averageAdvantage: hitterAnalyses.length > 0 ? totalAdvantage / hitterAnalyses.length : 0,
    topTargets: hitterAnalyses
      .filter(h => h.overallAssessment.overallAdvantage < -0.5)
      .sort((a, b) => a.overallAssessment.overallAdvantage - b.overallAssessment.overallAdvantage)
      .slice(0, 3)
      .map(h => ({
        name: h.hitter,
        advantage: Math.abs(h.overallAssessment.overallAdvantage)
      })),
    toughestMatchups: hitterAnalyses
      .filter(h => h.overallAssessment.overallAdvantage > 0.5)
      .sort((a, b) => b.overallAssessment.overallAdvantage - a.overallAssessment.overallAdvantage)
      .slice(0, 3)
      .map(h => ({
        name: h.hitter,
        disadvantage: h.overallAssessment.overallAdvantage
      }))
  };
  
  // Add year-over-year trends
  const pitcherStats = analyzer.findPlayerInCSV(pitcher, pitcherData);
  const pitcherTrends = analyzer.analyzePitcherTrends(pitcherStats);
  
  return {
    pitcher: {
      ...pitcherArsenal,
      yearOverYearTrends: pitcherTrends
    },
    hitters: hitterAnalyses,
    teamSummary,
    analysisMetadata: {
      activeYears,
      pitcherConfidence: pitcherArsenal.confidence,
      averageHitterConfidence: hitterAnalyses.length > 0 
        ? _.meanBy(hitterAnalyses, 'confidence') 
        : 0,
      pitcherDataPoints: pitcherStats.length,
      analyzedOn: new Date().toISOString()
    }
  };
}