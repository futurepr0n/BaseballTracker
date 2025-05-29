/**
 * Enhanced Matchup Analysis System
 * src/services/EnhancedMatchupAnalysis.js
 * 
 * Provides comprehensive batter vs pitcher analysis using multiple data points
 */

import _ from 'lodash';

/**
 * Main Enhanced Matchup Analyzer Class
 */
export class EnhancedMatchupAnalyzer {
  constructor(hitterData, pitcherData, rosterData, activeYears = [2025, 2024, 2023, 2022]) {
    this.hitterData = hitterData;
    this.pitcherData = pitcherData;
    this.rosterData = rosterData;
    this.activeYears = activeYears.sort((a, b) => b - a); // Most recent first
    this.currentYear = Math.max(...activeYears);
    
    // Pre-process and filter data
    this.processedData = this.preprocessData();
  }

  /**
   * Filter data to only include players active in current year
   */
  preprocessData() {
    // Get players active in current year
    const currentYearPlayers = new Set();
    
    // From roster data (current active players)
    this.rosterData.forEach(player => {
      const key = `${player.name}_${player.team}`;
      currentYearPlayers.add(key);
      
      // Also add fullName variant if exists
      if (player.fullName) {
        const fullNameKey = `${player.fullName}_${player.team}`;
        currentYearPlayers.add(fullNameKey);
      }
    });
    
    // From current year game data
    const currentYearHitters = this.hitterData.filter(row => row.year === this.currentYear);
    const currentYearPitchers = this.pitcherData.filter(row => row.year === this.currentYear);
    
    currentYearHitters.forEach(hitter => {
      if (hitter['last_name, first_name']) {
        const key = `${hitter['last_name, first_name']}_${hitter.team_name_alt}`;
        currentYearPlayers.add(key);
      }
    });
    
    currentYearPitchers.forEach(pitcher => {
      if (pitcher['last_name, first_name']) {
        const key = `${pitcher['last_name, first_name']}_${pitcher.team_name_alt}`;
        currentYearPlayers.add(key);
      }
    });
    
    console.log(`Found ${currentYearPlayers.size} active players for ${this.currentYear}`);
    
    // Filter historical data to only include active players
    const filteredHitterData = this.hitterData.filter(row => {
      if (!row['last_name, first_name'] || !row.team_name_alt) return false;
      const key = `${row['last_name, first_name']}_${row.team_name_alt}`;
      return currentYearPlayers.has(key);
    });
    
    const filteredPitcherData = this.pitcherData.filter(row => {
      if (!row['last_name, first_name'] || !row.team_name_alt) return false;
      const key = `${row['last_name, first_name']}_${row.team_name_alt}`;
      return currentYearPlayers.has(key);
    });
    
    console.log(`Filtered to ${filteredHitterData.length} hitter records and ${filteredPitcherData.length} pitcher records for active players`);
    
    return {
      hitters: filteredHitterData,
      pitchers: filteredPitcherData,
      activePlayerKeys: currentYearPlayers
    };
  }

  /**
   * Enhanced name matching with multiple fallback strategies
   */
  findPlayerMatch(targetPlayer, playerList, teamMatch = true) {
    if (!targetPlayer || !playerList || !playerList.length) return null;
    
    const targetName = typeof targetPlayer === 'object' ? targetPlayer.name : targetPlayer;
    const targetTeam = typeof targetPlayer === 'object' ? targetPlayer.team : null;
    
    // Strategy 1: Exact name match
    let match = playerList.find(p => p['last_name, first_name'] === targetName);
    if (match && (!teamMatch || !targetTeam || match.team_name_alt === targetTeam)) return match;
    
    // Strategy 2: Convert full name format
    if (typeof targetPlayer === 'object' && targetPlayer.fullName) {
      const convertedFullName = this.convertPlayerName({ fullName: targetPlayer.fullName }, 'lastFirst');
      match = playerList.find(p => p['last_name, first_name'] === convertedFullName);
      if (match && (!teamMatch || !targetTeam || match.team_name_alt === targetTeam)) return match;
    }
    
    // Strategy 3: Convert name format
    const convertedName = this.convertPlayerName(targetName, 'lastFirst');
    if (convertedName && convertedName !== targetName) {
      match = playerList.find(p => p['last_name, first_name'] === convertedName);
      if (match && (!teamMatch || !targetTeam || match.team_name_alt === targetTeam)) return match;
    }
    
    // Strategy 4: Last name matching with team verification
    if (targetName.includes(' ')) {
      let lastName;
      if (targetName.includes('.')) {
        lastName = targetName.split(' ')[1];
      } else if (typeof targetPlayer === 'object' && targetPlayer.fullName) {
        const parts = targetPlayer.fullName.split(' ');
        if (parts.length >= 2) lastName = parts[parts.length - 1];
      } else {
        const parts = targetName.split(' ');
        lastName = parts[parts.length - 1];
      }
      
      if (lastName) {
        const lastNameMatches = playerList.filter(p => 
          p['last_name, first_name'] && p['last_name, first_name'].startsWith(lastName + ',')
        );
        
        if (lastNameMatches.length === 1) return lastNameMatches[0];
        else if (lastNameMatches.length > 1 && targetTeam) {
          const teamMatch = lastNameMatches.find(p => p.team_name_alt === targetTeam);
          if (teamMatch) return teamMatch;
        }
      }
    }
    
    return null;
  }

  /**
   * Convert player name formats
   */
  convertPlayerName(name, format = 'lastFirst') {
    if (!name) return null;
    if (typeof name === 'object' && name !== null) {
      if (format === 'lastFirst' && name.fullName) {
        const parts = name.fullName.split(' ');
        if (parts.length >= 2) {
          const firstName = parts[0];
          const lastName = parts.slice(1).join(' ');
          return `${lastName}, ${firstName}`;
        }
      }
      name = name.name;
    }
    if (typeof name !== 'string') return null;
    if (name.includes('.') && format === 'lastFirst') {
      const parts = name.split(' ');
      if (parts.length === 2) {
        return `${parts[1]}, ${parts[0]}`;
      }
    }
    if (name.includes(' ') && !name.includes(',') && format === 'lastFirst') {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        return `${lastName}, ${firstName}`;
      }
    }
    if (name.includes(',') && format === 'firstLast') {
      const parts = name.split(', ');
      if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
      }
    }
    return name;
  }

  /**
   * Get pitcher's arsenal from CSV data
   */
  getPitcherArsenal(pitcher) {
    const pitcherMatches = this.processedData.pitchers.filter(p => 
      this.findPlayerMatch(pitcher, [p]) !== null
    );
    
    if (pitcherMatches.length === 0) return [];
    
    // Use most recent data for arsenal
    const recentPitcherData = pitcherMatches.sort((a, b) => b.year - a.year)[0];
    
    // Extract pitch types from the data
    const pitchTypes = [];
    const pitchColumns = [
      'ff_avg_speed', 'si_avg_speed', 'fc_avg_speed', 'fs_avg_speed', 'sl_avg_speed',
      'sw_avg_speed', 'cu_avg_speed', 'kn_avg_speed', 'ch_avg_speed', 'sc_avg_speed'
    ];
    
    pitchColumns.forEach(col => {
      const pitchType = col.split('_')[0].toUpperCase();
      const speed = recentPitcherData[col];
      const usage = recentPitcherData[`${col.split('_')[0]}_usage`] || 0;
      
      if (speed && speed > 0 && usage > 0.05) { // Only include pitches used more than 5%
        pitchTypes.push({
          type: pitchType,
          avgSpeed: speed,
          usage: usage
        });
      }
    });
    
    return pitchTypes.sort((a, b) => b.usage - a.usage);
  }
  /**
   * Analyze hitter vs specific pitcher
   */
  analyzeHitterVsPitcher(hitter, pitcher) {
    const hitterMatches = this.processedData.hitters.filter(h => 
      this.findPlayerMatch(hitter, [h]) !== null
    );
    
    const pitcherMatches = this.processedData.pitchers.filter(p => 
      this.findPlayerMatch(pitcher, [p]) !== null
    );
    
    if (hitterMatches.length === 0 || pitcherMatches.length === 0) {
      return this.getDefaultAnalysis();
    }
    
    // Weight recent years more heavily
    const weightedHitterStats = this.calculateWeightedStats(hitterMatches);
    const weightedPitcherStats = this.calculateWeightedStats(pitcherMatches);
    
    return {
      type: 'direct',
      hitterStats: weightedHitterStats,
      pitcherStats: weightedPitcherStats,
      dataPoints: hitterMatches.length + pitcherMatches.length,
      yearsUsed: [...new Set([...hitterMatches.map(h => h.year), ...pitcherMatches.map(p => p.year)])].sort((a,b) => b-a)
    };
  }

  /**
   * Analyze hitter vs same-handed pitchers
   */
  analyzeHitterVsSameHanded(hitter, pitcher) {
    const pitcherHand = pitcher.throwingArm || pitcher.ph || 'R';
    
    // Get all same-handed pitchers from data
    const sameHandedPitchers = this.processedData.pitchers.filter(p => {
      const pHand = p.p_throws || pitcherHand;
      return pHand === pitcherHand;
    });
    
    const hitterMatches = this.processedData.hitters.filter(h => 
      this.findPlayerMatch(hitter, [h]) !== null
    );
    
    if (hitterMatches.length === 0 || sameHandedPitchers.length === 0) {
      return this.getDefaultAnalysis();
    }
    
    const weightedHitterStats = this.calculateWeightedStats(hitterMatches);
    const sameHandedPitcherStats = this.calculateWeightedStats(sameHandedPitchers);
    
    return {
      type: 'sameHanded',
      hitterStats: weightedHitterStats,
      pitcherGroupStats: sameHandedPitcherStats,
      pitcherHand,
      dataPoints: hitterMatches.length + sameHandedPitchers.length,
      yearsUsed: [...new Set([...hitterMatches.map(h => h.year), ...sameHandedPitchers.map(p => p.year)])].sort((a,b) => b-a)
    };
  }

  /**
   * Analyze hitter vs opposite-handed pitchers
   */
  analyzeHitterVsOppositeHanded(hitter, pitcher) {
    const pitcherHand = pitcher.throwingArm || pitcher.ph || 'R';
    const oppositeHand = pitcherHand === 'L' ? 'R' : 'L';
    
    const oppositeHandedPitchers = this.processedData.pitchers.filter(p => {
      const pHand = p.p_throws || oppositeHand;
      return pHand === oppositeHand;
    });
    
    const hitterMatches = this.processedData.hitters.filter(h => 
      this.findPlayerMatch(hitter, [h]) !== null
    );
    
    if (hitterMatches.length === 0 || oppositeHandedPitchers.length === 0) {
      return this.getDefaultAnalysis();
    }
    
    const weightedHitterStats = this.calculateWeightedStats(hitterMatches);
    const oppositeHandedPitcherStats = this.calculateWeightedStats(oppositeHandedPitchers);
    
    return {
      type: 'oppositeHanded',
      hitterStats: weightedHitterStats,
      pitcherGroupStats: oppositeHandedPitcherStats,
      pitcherHand,
      oppositeHand,
      dataPoints: hitterMatches.length + oppositeHandedPitchers.length,
      yearsUsed: [...new Set([...hitterMatches.map(h => h.year), ...oppositeHandedPitchers.map(p => p.year)])].sort((a,b) => b-a)
    };
  }

  /**
   * Analyze hitter vs all pitchers overall
   */
  analyzeHitterVsOverall(hitter) {
    const hitterMatches = this.processedData.hitters.filter(h => 
      this.findPlayerMatch(hitter, [h]) !== null
    );
    
    if (hitterMatches.length === 0) {
      return this.getDefaultAnalysis();
    }
    
    const weightedHitterStats = this.calculateWeightedStats(hitterMatches);
    const overallPitcherStats = this.calculateWeightedStats(this.processedData.pitchers);
    
    return {
      type: 'overall',
      hitterStats: weightedHitterStats,
      pitcherGroupStats: overallPitcherStats,
      dataPoints: hitterMatches.length + this.processedData.pitchers.length,
      yearsUsed: [...new Set([...hitterMatches.map(h => h.year), ...this.processedData.pitchers.map(p => p.year)])].sort((a,b) => b-a)
    };
  }

  /**
   * Calculate weighted statistics with more recent years weighted more heavily
   */
  calculateWeightedStats(playerRecords) {
    if (!playerRecords || playerRecords.length === 0) return {};
    
    // Group by year
    const recordsByYear = _.groupBy(playerRecords, 'year');
    let totalWeight = 0;
    let weightedSums = {};
    
    // Define weights for each year (more recent = higher weight)
    const yearWeights = {
      2025: 4.0,
      2024: 2.0,
      2023: 1.0,
      2022: 0.5
    };
    
    Object.entries(recordsByYear).forEach(([year, records]) => {
      const weight = yearWeights[year] || 0.25;
      const yearStats = this.calculateYearAverages(records);
      
      Object.entries(yearStats).forEach(([stat, value]) => {
        if (typeof value === 'number' && !isNaN(value)) {
          if (!weightedSums[stat]) weightedSums[stat] = 0;
          weightedSums[stat] += value * weight;
        }
      });
      
      totalWeight += weight;
    });
    
    // Calculate weighted averages
    const weightedStats = {};
    Object.entries(weightedSums).forEach(([stat, sum]) => {
      weightedStats[stat] = totalWeight > 0 ? sum / totalWeight : 0;
    });
    
    return {
      ...weightedStats,
      totalRecords: playerRecords.length,
      yearBreakdown: Object.keys(recordsByYear).sort((a,b) => b-a),
      totalWeight
    };
  }

  /**
   * Calculate year averages for a set of records
   */
  calculateYearAverages(records) {
    if (!records || records.length === 0) return {};
    
    const stats = [
      'woba', 'xwoba', 'woba_con', 'woba_pull', 'woba_cent', 'woba_oppo',
      'avg_exit_velo', 'max_exit_velo', 'barrel_batted_rate', 'hard_hit_percent',
      'whiff_percent', 'k_percent', 'bb_percent', 'chase_percent',
      'sweet_spot_percent', 'max_ev', 'avg_distance'
    ];
    
    const averages = {};
    
    stats.forEach(stat => {
      const values = records.map(r => r[stat]).filter(v => v !== null && v !== undefined && !isNaN(v));
      if (values.length > 0) {
        averages[stat] = _.mean(values);
      }
    });
    
    return averages;
  }

  /**
   * Main comprehensive matchup analysis
   */
  analyzeComprehensiveMatchup(batter, pitcher) {
    console.log(`Analyzing comprehensive matchup: ${batter.name} vs ${pitcher.name}`);
    
    // Run all four analysis types
    const directAnalysis = this.analyzeHitterVsPitcher(batter, pitcher);
    const sameHandedAnalysis = this.analyzeHitterVsSameHanded(batter, pitcher);
    const oppositeHandedAnalysis = this.analyzeHitterVsOppositeHanded(batter, pitcher);
    const overallAnalysis = this.analyzeHitterVsOverall(batter);
    
    // Get pitcher arsenal
    const pitcherArsenal = this.getPitcherArsenal(pitcher);
    
    // Calculate final weighted advantage
    const finalAdvantage = this.calculateFinalAdvantage({
      direct: directAnalysis,
      sameHanded: sameHandedAnalysis,
      oppositeHanded: oppositeHandedAnalysis,
      overall: overallAnalysis
    }, batter, pitcher, pitcherArsenal);
    
    return {
      batter: batter.name,
      pitcher: pitcher.name,
      advantage: finalAdvantage.score,
      advantageLabel: this.getAdvantageLabel(finalAdvantage.score),
      hitPotential: this.getPotentialRating(finalAdvantage.hitScore),
      hrPotential: this.getPotentialRating(finalAdvantage.hrScore),
      tbPotential: this.getPotentialRating(finalAdvantage.tbScore),
      kPotential: this.getPotentialRating(finalAdvantage.kScore),
      details: {
        predictedBA: Math.min(0.400, Math.max(0.150, finalAdvantage.predictedBA)).toFixed(3),
        predictedHR: Math.min(0.100, Math.max(0.005, finalAdvantage.predictedHR)).toFixed(3),
        predictedSLG: Math.min(0.700, Math.max(0.250, finalAdvantage.predictedSLG)).toFixed(3),
        predictedWOBA: Math.min(0.500, Math.max(0.250, finalAdvantage.predictedWOBA)).toFixed(3),
        strikeoutRate: Math.min(0.50, Math.max(0.05, finalAdvantage.strikeoutRate)).toFixed(3),
        yearsUsed: this.activeYears.join(', '),
        analysisBreakdown: finalAdvantage.breakdown,
        pitcherArsenal,
        confidence: finalAdvantage.confidence
      }
    };
  }

  /**
   * Calculate final weighted advantage from all analyses
   */
  calculateFinalAdvantage(analyses, batter, pitcher, arsenal) {
    // Base handedness advantage
    const handednessAdvantage = this.calculateHandednessAdvantage(batter, pitcher);
    
    // Weight different analysis types
    const weights = {
      direct: 0.4,        // Direct matchup gets highest weight
      sameHanded: 0.25,   // Same-handed context
      oppositeHanded: 0.25, // Opposite-handed context  
      overall: 0.1        // Overall context gets lowest weight
    };
    
    let totalAdvantage = handednessAdvantage;
    let confidence = 0.5; // Base confidence
    let breakdown = { handedness: handednessAdvantage };
    
    // Process each analysis type
    Object.entries(analyses).forEach(([type, analysis]) => {
      if (analysis.hitterStats && Object.keys(analysis.hitterStats).length > 0) {
        const typeAdvantage = this.calculateTypeAdvantage(analysis, type);
        totalAdvantage += typeAdvantage * weights[type];
        breakdown[type] = typeAdvantage;
        
        // Increase confidence based on data availability
        confidence += (analysis.dataPoints / 100) * weights[type];
      }
    });
    
    // Arsenal-specific adjustments
    if (arsenal && arsenal.length > 0) {
      const arsenalAdvantage = this.calculateArsenalAdvantage(batter, arsenal);
      totalAdvantage += arsenalAdvantage * 0.15;
      breakdown.arsenal = arsenalAdvantage;
    }
    
    // Calculate specific outcome probabilities
    const baseHitterStats = analyses.overall.hitterStats || {};
    const predictedBA = Math.max(0.150, (baseHitterStats.woba || 0.320) * 0.78);
    const predictedHR = Math.max(0.005, (baseHitterStats.barrel_batted_rate || 0.08) * 0.4);
    const predictedSLG = Math.max(0.250, predictedBA + (predictedHR * 3.5));
    const predictedWOBA = Math.max(0.250, baseHitterStats.woba || 0.320);
    const strikeoutRate = Math.min(0.50, baseHitterStats.k_percent || 0.22);
    
    // Adjust predictions based on total advantage
    const advancementFactor = 1 + (totalAdvantage * 0.15);
    
    return {
      score: totalAdvantage,
      hitScore: totalAdvantage + 0.3,
      hrScore: totalAdvantage - 0.2,
      tbScore: totalAdvantage + 0.1,
      kScore: -totalAdvantage + 0.2,
      predictedBA: predictedBA * advancementFactor,
      predictedHR: predictedHR * advancementFactor,
      predictedSLG: predictedSLG * advancementFactor,
      predictedWOBA: predictedWOBA * advancementFactor,
      strikeoutRate: strikeoutRate / advancementFactor,
      confidence: Math.min(1.0, confidence),
      breakdown
    };
  }

  /**
   * Calculate handedness-based advantage
   */
  calculateHandednessAdvantage(batter, pitcher) {
    const batterHand = batter.bats || 'R';
    const pitcherHand = pitcher.throwingArm || pitcher.ph || 'R';
    
    if (batterHand === 'S') { // Switch hitter
      return 0.8; // Always has advantage
    } else if (batterHand === pitcherHand) { // Same handedness
      return -0.6; // Disadvantage
    } else { // Opposite handedness
      return 0.6; // Advantage
    }
  }

  /**
   * Calculate advantage for a specific analysis type
   */
  calculateTypeAdvantage(analysis, type) {
    if (!analysis.hitterStats) return 0;
    
    const hitterWOBA = analysis.hitterStats.woba || 0.320;
    let referenceWOBA = 0.320; // League average
    
    if (analysis.pitcherStats) {
      referenceWOBA = analysis.pitcherStats.woba || 0.320;
    } else if (analysis.pitcherGroupStats) {
      referenceWOBA = analysis.pitcherGroupStats.woba || 0.320;
    }
    
    // Scale the difference
    return (hitterWOBA - referenceWOBA) * 5;
  }

  /**
   * Calculate arsenal-specific advantage
   */
  calculateArsenalAdvantage(batter, arsenal) {
    let advantage = 0;
    
    // Example: If pitcher relies heavily on breaking balls vs a batter who struggles with them
    const primaryPitch = arsenal[0];
    if (primaryPitch && primaryPitch.usage > 0.4) {
      // Heavy reliance on one pitch type can be good or bad
      if (['SL', 'CU', 'SW'].includes(primaryPitch.type)) {
        advantage -= 0.2; // Breaking ball specialist advantage to pitcher
      } else if (['FF', 'SI'].includes(primaryPitch.type)) {
        advantage += 0.1; // Fastball heavy slightly favors batter
      }
    }
    
    // Velocity considerations
    if (primaryPitch && primaryPitch.avgSpeed) {
      if (primaryPitch.avgSpeed > 95) {
        advantage -= 0.1; // High velocity favors pitcher
      } else if (primaryPitch.avgSpeed < 90) {
        advantage += 0.1; // Lower velocity favors batter
      }
    }
    
    return advantage;
  }

  /**
   * Helper methods
   */
  getAdvantageLabel(advantage) {
    if (advantage > 2) return 'Strong Batter Advantage';
    if (advantage > 1) return 'Batter Advantage';
    if (advantage > 0.3) return 'Slight Batter Advantage';
    if (advantage > -0.3) return 'Neutral Matchup';
    if (advantage > -1) return 'Slight Pitcher Advantage';
    if (advantage > -2) return 'Pitcher Advantage';
    return 'Strong Pitcher Advantage';
  }

  getPotentialRating(score) {
    if (score > 1.0) return 'High';
    if (score > -0.5) return 'Medium';
    return 'Low';
  }

  getDefaultAnalysis() {
    return {
      hitterStats: {},
      pitcherStats: {},
      dataPoints: 0,
      yearsUsed: []
    };
  }
}

/**
 * Factory function to create and use the enhanced analyzer
 */
export function createEnhancedMatchupAnalyzer(hitterData, pitcherData, rosterData, activeYears) {
  return new EnhancedMatchupAnalyzer(hitterData, pitcherData, rosterData, activeYears);
}

/**
 * Main analysis function to replace the current analyzeMatchupWithCSV
 */
export function analyzeEnhancedMatchup(batter, pitcher, hitterData, pitcherData, rosterData, activeYears) {
  const analyzer = new EnhancedMatchupAnalyzer(hitterData, pitcherData, rosterData, activeYears);
  return analyzer.analyzeComprehensiveMatchup(batter, pitcher);
}