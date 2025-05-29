/**
 * Arsenal Analysis Module
 * src/services/arsenalAnalysis.js
 * 
 * Analyzes pitcher arsenals and hitter performance against specific pitch types
 * Includes year-over-year trend analysis for both pitchers and hitters
 */

import _ from 'lodash';

/**
 * Main Arsenal Analyzer Class
 */
export class ArsenalAnalyzer {
  constructor(hitterData, pitcherData, activeYears = [2025, 2024, 2023, 2022]) {
    this.hitterData = hitterData;
    this.pitcherData = pitcherData;
    this.activeYears = activeYears.sort((a, b) => b - a); // Most recent first
    this.currentYear = Math.max(...activeYears);
    
    console.log('[ArsenalAnalyzer] Initialized with years:', activeYears);
  }

  /**
   * Find pitcher by name and team in CSV data
   */
  findPitcherInData(pitcher) {
    const searchName = this.convertToCSVName(pitcher.name);
    const matches = this.pitcherData.filter(p => 
      p['last_name, first_name'] === searchName && 
      p.team_name_alt === pitcher.team
    );
    
    console.log(`[ArsenalAnalyzer] Found ${matches.length} records for pitcher ${pitcher.name}`);
    return matches;
  }

  /**
   * Find hitter by name and team in CSV data
   */
  findHitterInData(hitter) {
    const searchName = this.convertToCSVName(hitter.name);
    const matches = this.hitterData.filter(h => 
      h['last_name, first_name'] === searchName && 
      h.team_name_alt === hitter.team
    );
    
    console.log(`[ArsenalAnalyzer] Found ${matches.length} records for hitter ${hitter.name}`);
    return matches;
  }

  /**
   * Convert roster name format to CSV format (LastName, FirstName)
   */
  convertToCSVName(name) {
    if (!name) return null;
    
    // If already in CSV format, return as-is
    if (name.includes(',')) return name;
    
    // Convert "FirstName LastName" to "LastName, FirstName"
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      return `${lastName}, ${firstName}`;
    }
    
    return name;
  }

  /**
   * Build comprehensive pitcher arsenal analysis
   */
  analyzePitcherArsenal(pitcher) {
    console.log(`[ArsenalAnalyzer] Analyzing arsenal for ${pitcher.name}`);
    
    const pitcherRecords = this.findPitcherInData(pitcher);
    if (pitcherRecords.length === 0) {
      return {
        pitcher: pitcher.name,
        team: pitcher.team,
        arsenal: [],
        yearOverYearTrends: {},
        totalPitchTypes: 0,
        primaryPitches: [],
        confidence: 0
      };
    }

    // Group by year and pitch type
    const recordsByYear = _.groupBy(pitcherRecords, 'year');
    const recordsByPitchType = _.groupBy(pitcherRecords, 'pitch_type');

    console.log(`[ArsenalAnalyzer] ${pitcher.name} data by year:`, Object.keys(recordsByYear));
    console.log(`[ArsenalAnalyzer] ${pitcher.name} pitch types:`, Object.keys(recordsByPitchType));

    // Build arsenal for current year (most recent available)
    const currentYearRecords = recordsByYear[this.currentYear] || [];
    const arsenal = this.buildArsenal(currentYearRecords);

    // Analyze year-over-year trends
    const yearOverYearTrends = this.analyzePitcherTrends(recordsByYear, recordsByPitchType);

    return {
      pitcher: pitcher.name,
      team: pitcher.team,
      arsenal,
      yearOverYearTrends,
      totalPitchTypes: arsenal.length,
      primaryPitches: arsenal.filter(pitch => pitch.usage > 0.15), // Used more than 15%
      confidence: this.calculateArsenalConfidence(pitcherRecords),
      dataYears: Object.keys(recordsByYear).map(y => parseInt(y)).sort((a,b) => b-a)
    };
  }

  /**
   * Build arsenal from pitcher records
   */
  buildArsenal(pitcherRecords) {
    if (pitcherRecords.length === 0) return [];

    const arsenal = pitcherRecords.map(record => ({
      pitchType: record.pitch_type,
      pitchName: record.pitch_name,
      usage: parseFloat(record.pitch_usage) || 0,
      runValuePer100: parseFloat(record.run_value_per_100) || 0,
      totalPitches: parseInt(record.pitches) || 0,
      
      // Effectiveness metrics
      battingAverageAgainst: parseFloat(record.ba) || 0,
      sluggingAgainst: parseFloat(record.slg) || 0,
      wobaAgainst: parseFloat(record.woba) || 0,
      whiffPercent: parseFloat(record.whiff_percent) || 0,
      strikeoutPercent: parseFloat(record.k_percent) || 0,
      putAwayRate: parseFloat(record.put_away) || 0,
      
      // Quality metrics
      hardHitPercent: parseFloat(record.hard_hit_percent) || 0,
      
      // Estimated stats
      estimatedBA: parseFloat(record.est_ba) || 0,
      estimatedSLG: parseFloat(record.est_slg) || 0,
      estimatedWOBA: parseFloat(record.est_woba) || 0,
      
      year: record.year
    }));

    // Sort by usage (most used first)
    return arsenal.sort((a, b) => b.usage - a.usage);
  }

  /**
   * Analyze pitcher trends year-over-year
   */
  analyzePitcherTrends(recordsByYear, recordsByPitchType) {
    const trends = {};
    const years = Object.keys(recordsByYear).map(y => parseInt(y)).sort();

    // Overall trends
    trends.overall = this.calculateOverallPitcherTrends(recordsByYear, years);

    // Pitch-specific trends
    trends.byPitch = {};
    Object.entries(recordsByPitchType).forEach(([pitchType, records]) => {
      if (records.length > 1) {
        trends.byPitch[pitchType] = this.calculatePitchSpecificTrends(records);
      }
    });

    return trends;
  }

  /**
   * Calculate overall pitcher trends
   */
  calculateOverallPitcherTrends(recordsByYear, years) {
    if (years.length < 2) return { trend: 'insufficient_data' };

    const yearlyStats = years.map(year => {
      const yearRecords = recordsByYear[year] || [];
      return {
        year,
        totalPitches: _.sumBy(yearRecords, r => parseInt(r.pitches) || 0),
        avgRunValuePer100: _.meanBy(yearRecords, r => parseFloat(r.run_value_per_100) || 0),
        avgWOBAAgainst: _.meanBy(yearRecords, r => parseFloat(r.woba) || 0),
        avgWhiffPercent: _.meanBy(yearRecords, r => parseFloat(r.whiff_percent) || 0),
        avgStrikeoutPercent: _.meanBy(yearRecords, r => parseFloat(r.k_percent) || 0),
        pitchTypeCount: yearRecords.length
      };
    });

    // Calculate trends
    const firstYear = yearlyStats[0];
    const lastYear = yearlyStats[yearlyStats.length - 1];

    return {
      trend: 'multi_year_data',
      years: years,
      yearlyStats,
      improvements: {
        runValue: lastYear.avgRunValuePer100 - firstYear.avgRunValuePer100, // Negative is better for pitcher
        wobaAgainst: lastYear.avgWOBAAgainst - firstYear.avgWOBAAgainst, // Negative is better for pitcher
        whiffRate: lastYear.avgWhiffPercent - firstYear.avgWhiffPercent, // Positive is better for pitcher
        strikeoutRate: lastYear.avgStrikeoutPercent - firstYear.avgStrikeoutPercent // Positive is better for pitcher
      },
      summary: this.generatePitcherTrendSummary(firstYear, lastYear)
    };
  }

  /**
   * Calculate pitch-specific trends
   */
  calculatePitchSpecificTrends(pitchRecords) {
    const recordsByYear = _.groupBy(pitchRecords, 'year');
    const years = Object.keys(recordsByYear).map(y => parseInt(y)).sort();

    if (years.length < 2) return { trend: 'insufficient_data' };

    const yearlyStats = years.map(year => {
      const record = recordsByYear[year][0]; // Should be one record per year per pitch type
      return {
        year,
        usage: parseFloat(record.pitch_usage) || 0,
        runValuePer100: parseFloat(record.run_value_per_100) || 0,
        wobaAgainst: parseFloat(record.woba) || 0,
        whiffPercent: parseFloat(record.whiff_percent) || 0,
        strikeoutPercent: parseFloat(record.k_percent) || 0,
        totalPitches: parseInt(record.pitches) || 0
      };
    });

    const firstYear = yearlyStats[0];
    const lastYear = yearlyStats[yearlyStats.length - 1];

    return {
      pitchType: pitchRecords[0].pitch_type,
      pitchName: pitchRecords[0].pitch_name,
      years,
      yearlyStats,
      changes: {
        usage: lastYear.usage - firstYear.usage,
        effectiveness: lastYear.runValuePer100 - firstYear.runValuePer100, // Negative is better
        whiffRate: lastYear.whiffPercent - firstYear.whiffPercent,
        strikeoutRate: lastYear.strikeoutPercent - firstYear.strikeoutPercent
      },
      summary: this.generatePitchTrendSummary(pitchRecords[0], firstYear, lastYear)
    };
  }

  /**
   * Analyze how opposing hitters perform against pitcher's arsenal
   */
  analyzeHittersVsArsenal(hitters, pitcherArsenal) {
    console.log(`[ArsenalAnalyzer] Analyzing ${hitters.length} hitters vs arsenal`);
    
    const hitterAnalyses = hitters.map(hitter => {
      const hitterRecords = this.findHitterInData(hitter);
      
      if (hitterRecords.length === 0) {
        return {
          hitter: hitter.name,
          team: hitter.team,
          pitchMatchups: [],
          overallAssessment: this.getDefaultHitterAssessment(),
          confidence: 0
        };
      }

      // Analyze against each pitch in arsenal
      const pitchMatchups = pitcherArsenal.arsenal.map(pitch => 
        this.analyzeHitterVsPitch(hitter, hitterRecords, pitch)
      );

      // Calculate overall assessment
      const overallAssessment = this.calculateOverallHitterAssessment(pitchMatchups, pitcherArsenal.arsenal);

      // Analyze hitter trends
      const hitterTrends = this.analyzeHitterTrends(hitterRecords);

      return {
        hitter: hitter.name,
        team: hitter.team,
        pitchMatchups,
        overallAssessment,
        hitterTrends,
        confidence: this.calculateHitterConfidence(hitterRecords),
        dataYears: [...new Set(hitterRecords.map(r => r.year))].sort((a,b) => b-a)
      };
    });

    return hitterAnalyses;
  }

  /**
   * Analyze individual hitter vs specific pitch type
   */
  analyzeHitterVsPitch(hitter, hitterRecords, pitch) {
    // Find records for this specific pitch type
    const pitchRecords = hitterRecords.filter(record => record.pitch_type === pitch.pitchType);

    if (pitchRecords.length === 0) {
      return {
        pitchType: pitch.pitchType,
        pitchName: pitch.pitchName,
        pitcherUsage: pitch.usage,
        hitterPerformance: null,
        matchupAdvantage: 0,
        confidence: 0,
        recommendation: 'insufficient_data'
      };
    }

    // Calculate weighted performance (more recent years weighted higher)
    const weightedStats = this.calculateWeightedHitterStats(pitchRecords);

    // Calculate matchup advantage
    const matchupAdvantage = this.calculateMatchupAdvantage(weightedStats, pitch);

    // Analyze trends for this pitch type
    const pitchTrends = this.analyzeHitterPitchTrends(pitchRecords, pitch.pitchType);

    return {
      pitchType: pitch.pitchType,
      pitchName: pitch.pitchName,
      pitcherUsage: pitch.usage,
      pitcherStats: {
        runValuePer100: pitch.runValuePer100,
        battingAverageAgainst: pitch.battingAverageAgainst,
        wobaAgainst: pitch.wobaAgainst,
        whiffPercent: pitch.whiffPercent
      },
      hitterPerformance: weightedStats,
      hitterTrends: pitchTrends,
      matchupAdvantage,
      confidence: this.calculatePitchMatchupConfidence(pitchRecords),
      recommendation: this.generateMatchupRecommendation(matchupAdvantage, weightedStats, pitch)
    };
  }

  /**
   * Calculate weighted hitter stats (recent years weighted more)
   */
  calculateWeightedHitterStats(records) {
    const yearWeights = {
      2025: 4.0,
      2024: 2.0,
      2023: 1.0,
      2022: 0.5
    };

    let totalWeight = 0;
    let weightedSums = {
      ba: 0, slg: 0, woba: 0, whiff_percent: 0, k_percent: 0,
      run_value_per_100: 0, hard_hit_percent: 0, pitches: 0
    };

    records.forEach(record => {
      const weight = yearWeights[record.year] || 0.25;
      totalWeight += weight;

      Object.keys(weightedSums).forEach(stat => {
        const value = parseFloat(record[stat]) || 0;
        weightedSums[stat] += value * weight;
      });
    });

    const weightedStats = {};
    Object.keys(weightedSums).forEach(stat => {
      weightedStats[stat] = totalWeight > 0 ? weightedSums[stat] / totalWeight : 0;
    });

    return {
      ...weightedStats,
      totalPitches: weightedSums.pitches,
      dataPoints: records.length,
      years: [...new Set(records.map(r => r.year))].sort((a,b) => b-a)
    };
  }

  /**
   * Calculate matchup advantage score
   */
  calculateMatchupAdvantage(hitterStats, pitcherStats) {
    // Compare hitter performance vs pitcher effectiveness
    // Positive = advantage to hitter, Negative = advantage to pitcher
    
    let advantage = 0;
    let factors = 0;

    // wOBA comparison (most important)
    if (hitterStats.woba && pitcherStats.wobaAgainst) {
      const wobaAdvantage = hitterStats.woba - pitcherStats.wobaAgainst;
      advantage += wobaAdvantage * 10; // Scale up for visibility
      factors++;
    }

    // Whiff rate comparison
    if (hitterStats.whiff_percent && pitcherStats.whiffPercent) {
      const whiffAdvantage = pitcherStats.whiffPercent - hitterStats.whiff_percent; // Lower hitter whiff is better
      advantage += whiffAdvantage * 0.05;
      factors++;
    }

    // Run value comparison
    if (hitterStats.run_value_per_100 && pitcherStats.runValuePer100) {
      const runValueAdvantage = hitterStats.run_value_per_100 - pitcherStats.runValuePer100;
      advantage += runValueAdvantage * 0.1;
      factors++;
    }

    return factors > 0 ? advantage / factors : 0;
  }

  /**
   * Analyze hitter trends for specific pitch type
   */
  analyzeHitterPitchTrends(records, pitchType) {
    const recordsByYear = _.groupBy(records, 'year');
    const years = Object.keys(recordsByYear).map(y => parseInt(y)).sort();

    if (years.length < 2) return { trend: 'insufficient_data' };

    const yearlyStats = years.map(year => {
      const record = recordsByYear[year][0];
      return {
        year,
        ba: parseFloat(record.ba) || 0,
        woba: parseFloat(record.woba) || 0,
        runValue: parseFloat(record.run_value_per_100) || 0,
        whiffPercent: parseFloat(record.whiff_percent) || 0,
        pitches: parseInt(record.pitches) || 0
      };
    });

    const firstYear = yearlyStats[0];
    const lastYear = yearlyStats[yearlyStats.length - 1];

    return {
      pitchType,
      years,
      yearlyStats,
      improvements: {
        battingAverage: lastYear.ba - firstYear.ba,
        woba: lastYear.woba - firstYear.woba,
        runValue: lastYear.runValue - firstYear.runValue,
        whiffRate: lastYear.whiffPercent - firstYear.whiffPercent // Negative is better for hitter
      },
      summary: this.generateHitterPitchTrendSummary(pitchType, firstYear, lastYear)
    };
  }

  /**
   * Analyze overall hitter trends across all pitch types
   */
  analyzeHitterTrends(hitterRecords) {
    const recordsByYear = _.groupBy(hitterRecords, 'year');
    const years = Object.keys(recordsByYear).map(y => parseInt(y)).sort();

    if (years.length < 2) return { trend: 'insufficient_data' };

    const yearlyStats = years.map(year => {
      const yearRecords = recordsByYear[year] || [];
      return {
        year,
        avgBA: _.meanBy(yearRecords, r => parseFloat(r.ba) || 0),
        avgWOBA: _.meanBy(yearRecords, r => parseFloat(r.woba) || 0),
        avgRunValue: _.meanBy(yearRecords, r => parseFloat(r.run_value_per_100) || 0),
        avgWhiffPercent: _.meanBy(yearRecords, r => parseFloat(r.whiff_percent) || 0),
        totalPitches: _.sumBy(yearRecords, r => parseInt(r.pitches) || 0),
        pitchTypeCount: yearRecords.length
      };
    });

    const firstYear = yearlyStats[0];
    const lastYear = yearlyStats[yearlyStats.length - 1];

    return {
      years,
      yearlyStats,
      overallTrend: {
        battingAverage: lastYear.avgBA - firstYear.avgBA,
        woba: lastYear.avgWOBA - firstYear.avgWOBA,
        runValue: lastYear.avgRunValue - firstYear.avgRunValue,
        whiffRate: lastYear.avgWhiffPercent - firstYear.avgWhiffPercent
      },
      summary: this.generateHitterOverallTrendSummary(firstYear, lastYear)
    };
  }

  /**
   * Helper methods for confidence calculations and summaries
   */
  calculateArsenalConfidence(pitcherRecords) {
    if (pitcherRecords.length === 0) return 0;
    
    const totalPitches = _.sumBy(pitcherRecords, r => parseInt(r.pitches) || 0);
    const yearSpread = Math.max(...pitcherRecords.map(r => r.year)) - Math.min(...pitcherRecords.map(r => r.year)) + 1;
    
    // Higher confidence for more pitches and more years of data
    return Math.min(1.0, (totalPitches / 1000) * (yearSpread / 4));
  }

  calculateHitterConfidence(hitterRecords) {
    if (hitterRecords.length === 0) return 0;
    
    const totalPitches = _.sumBy(hitterRecords, r => parseInt(r.pitches) || 0);
    const pitchTypeCount = [...new Set(hitterRecords.map(r => r.pitch_type))].length;
    
    return Math.min(1.0, (totalPitches / 500) * (pitchTypeCount / 8));
  }

  calculatePitchMatchupConfidence(pitchRecords) {
    if (pitchRecords.length === 0) return 0;
    
    const totalPitches = _.sumBy(pitchRecords, r => parseInt(r.pitches) || 0);
    const yearCount = [...new Set(pitchRecords.map(r => r.year))].length;
    
    return Math.min(1.0, (totalPitches / 100) * (yearCount / 4));
  }

  calculateOverallHitterAssessment(pitchMatchups, arsenal) {
    if (pitchMatchups.length === 0) return this.getDefaultHitterAssessment();

    const totalUsage = _.sumBy(arsenal, 'usage');
    let weightedAdvantage = 0;
    let totalWeight = 0;

    pitchMatchups.forEach(matchup => {
      if (matchup.hitterPerformance) {
        const pitchWeight = matchup.pitcherUsage / totalUsage;
        weightedAdvantage += matchup.matchupAdvantage * pitchWeight;
        totalWeight += pitchWeight;
      }
    });

    const overallAdvantage = totalWeight > 0 ? weightedAdvantage / totalWeight : 0;

    return {
      overallAdvantage,
      strengthCount: pitchMatchups.filter(m => m.matchupAdvantage > 0.5).length,
      weaknessCount: pitchMatchups.filter(m => m.matchupAdvantage < -0.5).length,
      neutralCount: pitchMatchups.filter(m => Math.abs(m.matchupAdvantage) <= 0.5).length,
      recommendation: this.getOverallRecommendation(overallAdvantage),
      keyStrengths: pitchMatchups
        .filter(m => m.matchupAdvantage > 0.5)
        .sort((a, b) => b.matchupAdvantage - a.matchupAdvantage)
        .slice(0, 3)
        .map(m => ({ pitch: m.pitchName, advantage: m.matchupAdvantage })),
      keyWeaknesses: pitchMatchups
        .filter(m => m.matchupAdvantage < -0.5)
        .sort((a, b) => a.matchupAdvantage - b.matchupAdvantage)
        .slice(0, 3)
        .map(m => ({ pitch: m.pitchName, disadvantage: Math.abs(m.matchupAdvantage) }))
    };
  }

  getDefaultHitterAssessment() {
    return {
      overallAdvantage: 0,
      strengthCount: 0,
      weaknessCount: 0,
      neutralCount: 0,
      recommendation: 'insufficient_data',
      keyStrengths: [],
      keyWeaknesses: []
    };
  }

  /**
   * Summary generation methods
   */
  generatePitcherTrendSummary(firstYear, lastYear) {
    const improvements = [];
    const regressions = [];

    if (lastYear.avgWOBAAgainst < firstYear.avgWOBAAgainst) {
      improvements.push(`Better run prevention (wOBA against: ${firstYear.avgWOBAAgainst.toFixed(3)} → ${lastYear.avgWOBAAgainst.toFixed(3)})`);
    } else if (lastYear.avgWOBAAgainst > firstYear.avgWOBAAgainst) {
      regressions.push(`Worse run prevention (wOBA against: ${firstYear.avgWOBAAgainst.toFixed(3)} → ${lastYear.avgWOBAAgainst.toFixed(3)})`);
    }

    if (lastYear.avgWhiffPercent > firstYear.avgWhiffPercent) {
      improvements.push(`Higher whiff rate (${firstYear.avgWhiffPercent.toFixed(1)}% → ${lastYear.avgWhiffPercent.toFixed(1)}%)`);
    }

    return {
      improvements,
      regressions,
      overall: improvements.length > regressions.length ? 'improving' : 
               improvements.length < regressions.length ? 'declining' : 'stable'
    };
  }

  generatePitchTrendSummary(pitch, firstYear, lastYear) {
    const changes = [];
    
    if (Math.abs(lastYear.usage - firstYear.usage) > 0.05) {
      changes.push(`Usage ${lastYear.usage > firstYear.usage ? 'increased' : 'decreased'} by ${Math.abs(lastYear.usage - firstYear.usage).toFixed(1)}%`);
    }
    
    if (lastYear.runValuePer100 < firstYear.runValuePer100) {
      changes.push(`More effective (better run value)`);
    } else if (lastYear.runValuePer100 > firstYear.runValuePer100) {
      changes.push(`Less effective (worse run value)`);
    }

    return {
      changes,
      overall: changes.length > 0 ? 'changed' : 'stable'
    };
  }

  generateHitterPitchTrendSummary(pitchType, firstYear, lastYear) {
    const improvements = [];
    
    if (lastYear.woba > firstYear.woba) {
      improvements.push(`Better wOBA vs ${pitchType} (${firstYear.woba.toFixed(3)} → ${lastYear.woba.toFixed(3)})`);
    }
    
    if (lastYear.whiffPercent < firstYear.whiffPercent) {
      improvements.push(`Lower whiff rate vs ${pitchType}`);
    }

    return {
      improvements,
      overall: improvements.length > 0 ? 'improving' : 'declining'
    };
  }

  generateHitterOverallTrendSummary(firstYear, lastYear) {
    return {
      battingImprovement: lastYear.avgBA - firstYear.avgBA,
      powerImprovement: lastYear.avgWOBA - firstYear.avgWOBA,
      contactImprovement: firstYear.avgWhiffPercent - lastYear.avgWhiffPercent,
      overall: lastYear.avgWOBA > firstYear.avgWOBA ? 'improving' : 'declining'
    };
  }

  generateMatchupRecommendation(advantage, hitterStats, pitcherStats) {
    if (advantage > 1.0) return 'strong_hitter_advantage';
    if (advantage > 0.3) return 'hitter_advantage';
    if (advantage < -1.0) return 'strong_pitcher_advantage';
    if (advantage < -0.3) return 'pitcher_advantage';
    return 'neutral';
  }

  getOverallRecommendation(overallAdvantage) {
    if (overallAdvantage > 0.5) return 'favorable_matchup';
    if (overallAdvantage < -0.5) return 'difficult_matchup';
    return 'neutral_matchup';
  }
}

/**
 * Factory function to create analyzer
 */
export function createArsenalAnalyzer(hitterData, pitcherData, activeYears) {
  return new ArsenalAnalyzer(hitterData, pitcherData, activeYears);
}

/**
 * Main analysis function for pitcher arsenal vs team of hitters
 */
export function analyzeArsenalMatchup(pitcher, hitters, hitterData, pitcherData, activeYears = [2025, 2024, 2023, 2022]) {
  console.log(`[analyzeArsenalMatchup] Starting analysis: ${pitcher.name} vs ${hitters.length} hitters`);
  
  const analyzer = new ArsenalAnalyzer(hitterData, pitcherData, activeYears);
  
  // Build pitcher arsenal
  const pitcherArsenal = analyzer.analyzePitcherArsenal(pitcher);
  
  // Analyze all hitters vs the arsenal
  const hitterAnalyses = analyzer.analyzeHittersVsArsenal(hitters, pitcherArsenal);
  
  // Generate summary statistics
  const summary = {
    pitcher: pitcherArsenal,
    hitters: hitterAnalyses,
    teamSummary: {
      totalHitters: hitters.length,
      favorableMatchups: hitterAnalyses.filter(h => h.overallAssessment.overallAdvantage > 0.3).length,
      difficultMatchups: hitterAnalyses.filter(h => h.overallAssessment.overallAdvantage < -0.3).length,
      averageAdvantage: _.meanBy(hitterAnalyses, h => h.overallAssessment.overallAdvantage),
      topTargets: hitterAnalyses
        .sort((a, b) => a.overallAssessment.overallAdvantage - b.overallAssessment.overallAdvantage)
        .slice(0, 3)
        .map(h => ({ name: h.hitter, advantage: h.overallAssessment.overallAdvantage })),
      toughestMatchups: hitterAnalyses
        .sort((a, b) => b.overallAssessment.overallAdvantage - a.overallAssessment.overallAdvantage)
        .slice(0, 3)
        .map(h => ({ name: h.hitter, disadvantage: Math.abs(h.overallAssessment.overallAdvantage) }))
    },
    analysisMetadata: {
      activeYears,
      pitcherDataPoints: pitcherArsenal.arsenal.reduce((sum, pitch) => sum + (pitch.totalPitches || 0), 0),
      averageHitterConfidence: _.meanBy(hitterAnalyses, h => h.confidence),
      pitcherConfidence: pitcherArsenal.confidence
    }
  };
  
  console.log(`[analyzeArsenalMatchup] Analysis complete. Arsenal: ${pitcherArsenal.arsenal.length} pitches, Hitters: ${hitterAnalyses.length}`);
  
  return summary;
}