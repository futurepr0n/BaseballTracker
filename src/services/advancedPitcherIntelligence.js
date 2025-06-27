/**
 * Advanced Pitcher Intelligence Service
 * Comprehensive pitcher analysis using arsenal stats and batter matchups
 */

class AdvancedPitcherIntelligence {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour (stats don't change frequently)
    this.statsCache = {
      pitcherArsenal: null,
      hitterVsPitches: null,
      customBatter: null,
      customPitcher: null
    };
  }

  /**
   * Generate comprehensive pitcher intelligence analysis
   */
  async generateComprehensivePitcherAnalysis(pitcher, lineup, gameContext = {}) {
    const cacheKey = `pitcher_intel_${pitcher.name}_${lineup.map(p => p.name).join('_')}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Load all stats data
      await this.loadStatsData();
      
      // Analyze pitcher profile
      const pitcherProfile = await this.analyzePitcherProfile(pitcher);
      
      // Analyze lineup composition
      const lineupAnalysis = this.analyzeLineupComposition(lineup);
      
      // Calculate arsenal vs lineup matchups
      const arsenalMatchups = await this.calculateArsenalMatchups(pitcherProfile, lineup);
      
      // Assess threat levels
      const threatAssessment = this.assessBatterThreats(arsenalMatchups, lineupAnalysis);
      
      // Generate strategic recommendations
      const strategicAnalysis = this.generateStrategicAnalysis(
        pitcherProfile, 
        lineupAnalysis, 
        arsenalMatchups, 
        threatAssessment
      );

      const comprehensiveAnalysis = {
        pitcherProfile,
        lineupAnalysis,
        arsenalMatchups,
        threatAssessment,
        strategicAnalysis,
        overallThreatLevel: this.calculateOverallThreatLevel(threatAssessment),
        vulnerabilityIndex: this.calculateVulnerabilityIndex(arsenalMatchups, threatAssessment),
        recommendations: this.generateRecommendations(strategicAnalysis)
      };

      this.cache.set(cacheKey, {
        data: comprehensiveAnalysis,
        timestamp: Date.now()
      });

      return comprehensiveAnalysis;
    } catch (error) {
      console.error('Error generating pitcher intelligence:', error);
      return this.getBasicPitcherAnalysis(pitcher, lineup);
    }
  }

  /**
   * Load all stats data files
   */
  async loadStatsData() {
    try {
      if (!this.statsCache.pitcherArsenal) {
        this.statsCache.pitcherArsenal = await this.loadCSVData('/data/stats/pitcherarsenalstats_2025.csv');
      }
      
      if (!this.statsCache.hitterVsPitches) {
        this.statsCache.hitterVsPitches = await this.loadCSVData('/data/stats/hitterpitcharsenalstats_2025.csv');
      }
      
      if (!this.statsCache.customBatter) {
        this.statsCache.customBatter = await this.loadCSVData('/data/stats/custom_batter_2025.csv');
      }
      
      if (!this.statsCache.customPitcher) {
        this.statsCache.customPitcher = await this.loadCSVData('/data/stats/custom_pitcher_2025.csv');
      }
    } catch (error) {
      console.error('Error loading stats data:', error);
    }
  }

  /**
   * Load CSV data and parse
   */
  async loadCSVData(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(`Failed to load ${path}`);
        return [];
      }
      
      const text = await response.text();
      return this.parseCSV(text);
    } catch (error) {
      console.error(`Error loading CSV ${path}:`, error);
      return [];
    }
  }

  /**
   * Parse CSV text to objects
   */
  parseCSV(text) {
    const lines = text.split('\n');
    if (lines.length < 2) return [];
    
    // Clean and parse header
    const header = lines[0].replace(/[""]/g, '').split(',').map(h => h.trim());
    
    return lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = this.parseCSVLine(line);
        const obj = {};
        header.forEach((key, index) => {
          obj[key] = values[index] || '';
        });
        return obj;
      })
      .filter(obj => obj[header[0]]); // Filter out empty rows
  }

  /**
   * Parse CSV line handling quoted values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Analyze pitcher profile from arsenal data
   */
  async analyzePitcherProfile(pitcher) {
    const pitcherName = this.normalizeName(pitcher.name);
    
    // Find pitcher in arsenal stats
    const arsenalData = this.statsCache.pitcherArsenal?.filter(row => 
      this.normalizeName(row['last_name, first_name']).includes(pitcherName) ||
      pitcherName.includes(this.normalizeName(row['last_name, first_name']))
    ) || [];

    // Find pitcher in custom stats
    const customData = this.statsCache.customPitcher?.find(row =>
      this.normalizeName(row['last_name, first_name']).includes(pitcherName) ||
      pitcherName.includes(this.normalizeName(row['last_name, first_name']))
    );

    if (arsenalData.length === 0) {
      return this.getBasicPitcherProfile(pitcher);
    }

    // Analyze arsenal
    const arsenal = this.analyzeArsenal(arsenalData);
    
    // Get handedness and other details
    const details = this.getPitcherDetails(customData, pitcher);

    return {
      name: pitcher.name,
      handedness: details.handedness,
      primaryPitches: arsenal.primaryPitches,
      arsenalEffectiveness: arsenal.effectiveness,
      pitchUsage: arsenal.usage,
      vulnerabilities: arsenal.vulnerabilities,
      strengths: arsenal.strengths,
      pitchCount: arsenalData.length,
      details
    };
  }

  /**
   * Analyze pitcher's arsenal from stats
   */
  analyzeArsenal(arsenalData) {
    // Sort by usage percentage
    const sortedByUsage = arsenalData
      .map(pitch => ({
        type: pitch.pitch_type,
        name: pitch.pitch_name,
        usage: parseFloat(pitch.pitch_usage) || 0,
        effectiveness: this.calculatePitchEffectiveness(pitch),
        stats: pitch
      }))
      .sort((a, b) => b.usage - a.usage);

    const primaryPitches = sortedByUsage.slice(0, 3);
    
    return {
      primaryPitches,
      effectiveness: this.calculateOverallEffectiveness(sortedByUsage),
      usage: sortedByUsage.map(p => ({ type: p.type, usage: p.usage })),
      vulnerabilities: this.identifyArsenalVulnerabilities(sortedByUsage),
      strengths: this.identifyArsenalStrengths(sortedByUsage)
    };
  }

  /**
   * Calculate pitch effectiveness score
   */
  calculatePitchEffectiveness(pitch) {
    const whiffPercent = parseFloat(pitch.whiff_percent) || 0;
    const kPercent = parseFloat(pitch.k_percent) || 0;
    const ba = parseFloat(pitch.ba) || 0;
    const woba = parseFloat(pitch.woba) || 0;
    
    // Higher whiff/K rates are better, lower BA/wOBA are better
    const effectiveness = (whiffPercent + kPercent) / 2 - (ba * 100 + woba * 100);
    
    return Math.max(0, Math.min(100, effectiveness + 50)); // Normalize to 0-100
  }

  /**
   * Analyze lineup composition
   */
  analyzeLineupComposition(lineup) {
    const leftHanded = [];
    const rightHanded = [];
    const unknown = [];

    lineup.forEach(player => {
      const handedness = this.getBatterHandedness(player);
      if (handedness === 'L') {
        leftHanded.push(player);
      } else if (handedness === 'R') {
        rightHanded.push(player);
      } else {
        unknown.push(player);
      }
    });

    return {
      leftHanded: leftHanded.map(p => ({ name: p.name || p.playerName, player: p })),
      rightHanded: rightHanded.map(p => ({ name: p.name || p.playerName, player: p })),
      unknown: unknown.map(p => ({ name: p.name || p.playerName, player: p })),
      split: {
        leftCount: leftHanded.length,
        rightCount: rightHanded.length,
        unknownCount: unknown.length,
        leftPercentage: Math.round((leftHanded.length / lineup.length) * 100),
        rightPercentage: Math.round((rightHanded.length / lineup.length) * 100)
      },
      advantageAnalysis: this.analyzeHandednessAdvantage(leftHanded.length, rightHanded.length)
    };
  }

  /**
   * Get batter handedness from available data
   */
  getBatterHandedness(player) {
    const playerName = this.normalizeName(player.name || player.playerName);
    
    // Try to find in custom batter stats
    const batterData = this.statsCache.customBatter?.find(row =>
      this.normalizeName(row['last_name, first_name']).includes(playerName) ||
      playerName.includes(this.normalizeName(row['last_name, first_name']))
    );

    if (batterData?.bat_side) {
      return batterData.bat_side;
    }

    // Try to find in hitter vs pitch stats (may have handedness info)
    const hitterData = this.statsCache.hitterVsPitches?.find(row =>
      this.normalizeName(row['last_name, first_name']).includes(playerName) ||
      playerName.includes(this.normalizeName(row['last_name, first_name']))
    );

    // If we can't determine, return unknown
    return 'Unknown';
  }

  /**
   * Calculate arsenal matchups vs lineup
   */
  async calculateArsenalMatchups(pitcherProfile, lineup) {
    const matchups = [];

    for (const player of lineup) {
      const playerName = this.normalizeName(player.name || player.playerName);
      
      // Find batter's performance vs pitcher's pitches
      const batterVsPitches = this.getBatterVsPitchPerformance(playerName, pitcherProfile.primaryPitches);
      
      // Calculate overall matchup advantage
      const matchupAdvantage = this.calculateMatchupAdvantage(pitcherProfile, batterVsPitches, player);
      
      matchups.push({
        batter: player.name || player.playerName,
        batterProfile: player,
        pitcherAdvantage: matchupAdvantage.advantage,
        matchupDetails: batterVsPitches,
        threatLevel: matchupAdvantage.threatLevel,
        exitVelocityProfile: this.estimateExitVelocityThreat(player, matchupAdvantage),
        strategicRecommendation: matchupAdvantage.recommendation
      });
    }

    return matchups;
  }

  /**
   * Get batter performance vs specific pitch types
   */
  getBatterVsPitchPerformance(batterName, primaryPitches) {
    const performances = [];

    primaryPitches.forEach(pitch => {
      const performance = this.statsCache.hitterVsPitches?.find(row =>
        (this.normalizeName(row['last_name, first_name']).includes(batterName) ||
         batterName.includes(this.normalizeName(row['last_name, first_name']))) &&
        row.pitch_type === pitch.type
      );

      performances.push({
        pitchType: pitch.type,
        pitchName: pitch.name,
        pitcherUsage: pitch.usage,
        batterPerformance: performance ? {
          ba: parseFloat(performance.ba) || 0,
          slg: parseFloat(performance.slg) || 0,
          woba: parseFloat(performance.woba) || 0,
          hardHitPercent: parseFloat(performance.hard_hit_percent) || 0,
          whiffPercent: parseFloat(performance.whiff_percent) || 0
        } : null
      });
    });

    return performances;
  }

  /**
   * Calculate matchup advantage
   */
  calculateMatchupAdvantage(pitcherProfile, batterVsPitches, player) {
    let advantageScore = 0;
    let threatLevel = 'medium';
    let details = [];

    batterVsPitches.forEach(matchup => {
      if (matchup.batterPerformance) {
        const perf = matchup.batterPerformance;
        
        // Higher batter performance = higher threat to pitcher
        const threatScore = (perf.ba * 100) + (perf.slg * 50) + (perf.woba * 50) + (perf.hardHitPercent * 0.5);
        
        // Weight by pitch usage
        const weightedThreat = threatScore * (matchup.pitcherUsage / 100);
        advantageScore += weightedThreat;
        
        details.push({
          pitch: matchup.pitchName,
          usage: matchup.pitcherUsage,
          batterSuccess: threatScore,
          threat: weightedThreat > 15 ? 'high' : weightedThreat > 8 ? 'medium' : 'low'
        });
      }
    });

    // Determine overall threat level
    if (advantageScore > 20) {
      threatLevel = 'high';
    } else if (advantageScore < 8) {
      threatLevel = 'low';
    }

    return {
      advantage: Math.max(0, 25 - advantageScore), // Higher advantage for pitcher = lower threat
      threatLevel,
      recommendation: this.generateMatchupRecommendation(advantageScore, threatLevel, details),
      details
    };
  }

  /**
   * Assess overall batter threats
   */
  assessBatterThreats(arsenalMatchups, lineupAnalysis) {
    const threats = arsenalMatchups.map(matchup => ({
      name: matchup.batter,
      threatLevel: matchup.threatLevel,
      advantage: matchup.pitcherAdvantage,
      handedness: this.getBatterHandedness(matchup.batterProfile)
    }));

    const highThreats = threats.filter(t => t.threatLevel === 'high');
    const mediumThreats = threats.filter(t => t.threatLevel === 'medium');
    const lowThreats = threats.filter(t => t.threatLevel === 'low');

    return {
      highThreats,
      mediumThreats,
      lowThreats,
      threatCounts: {
        high: highThreats.length,
        medium: mediumThreats.length,
        low: lowThreats.length
      },
      handednessThreat: this.analyzeHandednessThreat(threats, lineupAnalysis)
    };
  }

  /**
   * Generate strategic analysis
   */
  generateStrategicAnalysis(pitcherProfile, lineupAnalysis, arsenalMatchups, threatAssessment) {
    return {
      pitcherStrengths: this.identifyPitcherStrengths(pitcherProfile, threatAssessment),
      lineupWeaknesses: this.identifyLineupWeaknesses(arsenalMatchups),
      strategicAdvantages: this.identifyStrategicAdvantages(pitcherProfile, lineupAnalysis),
      riskFactors: this.identifyRiskFactors(threatAssessment, arsenalMatchups),
      gameplan: this.generateGameplan(pitcherProfile, threatAssessment)
    };
  }

  /**
   * Helper methods for analysis
   */
  normalizeName(name) {
    return name?.toLowerCase().replace(/[^a-z\s]/g, '').trim() || '';
  }

  calculateOverallThreatLevel(threatAssessment) {
    const { high, medium, low } = threatAssessment.threatCounts;
    const totalThreats = high + medium + low;
    
    if (totalThreats === 0) return 50;
    
    const weightedScore = (high * 3 + medium * 2 + low * 1) / totalThreats;
    return Math.round(weightedScore * 33.33); // Scale to 0-100
  }

  calculateVulnerabilityIndex(arsenalMatchups, threatAssessment) {
    const avgThreat = arsenalMatchups.reduce((sum, m) => sum + (25 - m.pitcherAdvantage), 0) / arsenalMatchups.length;
    const threatMultiplier = threatAssessment.threatCounts.high * 1.5 + threatAssessment.threatCounts.medium;
    
    return Math.min(100, Math.round(avgThreat + threatMultiplier));
  }

  /**
   * Get basic pitcher analysis when stats unavailable
   */
  getBasicPitcherAnalysis(pitcher, lineup) {
    return {
      pitcherProfile: this.getBasicPitcherProfile(pitcher),
      lineupAnalysis: {
        leftHanded: [],
        rightHanded: [],
        unknown: lineup.map(p => ({ name: p.name || p.playerName, player: p })),
        split: { leftCount: 0, rightCount: 0, unknownCount: lineup.length }
      },
      arsenalMatchups: [],
      threatAssessment: { threatCounts: { high: 0, medium: lineup.length, low: 0 } },
      strategicAnalysis: { pitcherStrengths: [], riskFactors: ['Limited data available'] },
      overallThreatLevel: 50,
      vulnerabilityIndex: 50,
      recommendations: ['Analyze based on available prediction data']
    };
  }

  getBasicPitcherProfile(pitcher) {
    return {
      name: pitcher.name,
      handedness: 'Unknown',
      primaryPitches: [],
      arsenalEffectiveness: 50,
      pitchUsage: [],
      vulnerabilities: ['Data not available'],
      strengths: ['Analysis pending'],
      details: {}
    };
  }

  getPitcherDetails(customData, pitcher) {
    if (!customData) {
      return { handedness: 'Unknown' };
    }

    return {
      handedness: customData.p_throws || 'Unknown',
      age: customData.player_age,
      era: customData.era,
      whip: customData.whip,
      strikeouts: customData.strikeout,
      walks: customData.walk
    };
  }

  // Additional helper methods would continue here...
  calculateOverallEffectiveness(pitches) {
    if (pitches.length === 0) return 50;
    return pitches.reduce((sum, p) => sum + p.effectiveness, 0) / pitches.length;
  }

  identifyArsenalVulnerabilities(pitches) {
    return pitches
      .filter(p => p.effectiveness < 40)
      .map(p => `Vulnerable ${p.name} (${p.usage.toFixed(1)}% usage)`);
  }

  identifyArsenalStrengths(pitches) {
    return pitches
      .filter(p => p.effectiveness > 60)
      .map(p => `Strong ${p.name} (${p.usage.toFixed(1)}% usage)`);
  }

  analyzeHandednessAdvantage(leftCount, rightCount) {
    const total = leftCount + rightCount;
    if (total === 0) return 'Unknown';
    
    if (leftCount > rightCount * 1.5) return 'Left-heavy lineup';
    if (rightCount > leftCount * 1.5) return 'Right-heavy lineup';
    return 'Balanced lineup';
  }

  estimateExitVelocityThreat(player, matchupAdvantage) {
    // Estimate based on HR data and matchup
    const hrRate = player.hrPredictionData?.hrRate || 0;
    const threat = matchupAdvantage.threatLevel;
    
    let exitVelocity = 85 + (hrRate * 100);
    
    if (threat === 'high') exitVelocity += 5;
    else if (threat === 'low') exitVelocity -= 3;
    
    return {
      estimated: exitVelocity,
      threat: exitVelocity > 90 ? 'high' : exitVelocity > 87 ? 'medium' : 'low'
    };
  }

  generateMatchupRecommendation(advantageScore, threatLevel, details) {
    if (threatLevel === 'high') {
      return 'Avoid primary pitches, use secondary arsenal';
    } else if (threatLevel === 'low') {
      return 'Attack with primary pitches';
    }
    return 'Standard approach, monitor situation';
  }

  analyzeHandednessThreat(threats, lineupAnalysis) {
    const leftThreats = threats.filter(t => t.handedness === 'L' && t.threatLevel === 'high');
    const rightThreats = threats.filter(t => t.handedness === 'R' && t.threatLevel === 'high');
    
    return {
      leftHandedThreats: leftThreats.length,
      rightHandedThreats: rightThreats.length,
      primaryThreat: leftThreats.length > rightThreats.length ? 'lefties' : 'righties'
    };
  }

  identifyPitcherStrengths(pitcherProfile, threatAssessment) {
    const strengths = [...pitcherProfile.strengths];
    
    if (threatAssessment.threatCounts.low > threatAssessment.threatCounts.high) {
      strengths.push('Favorable matchups vs this lineup');
    }
    
    return strengths;
  }

  identifyLineupWeaknesses(arsenalMatchups) {
    return arsenalMatchups
      .filter(m => m.pitcherAdvantage > 15)
      .map(m => `${m.batter} struggles vs pitcher's arsenal`);
  }

  identifyStrategicAdvantages(pitcherProfile, lineupAnalysis) {
    const advantages = [];
    
    if (pitcherProfile.primaryPitches.length > 0) {
      advantages.push(`Strong ${pitcherProfile.primaryPitches[0].name} (${pitcherProfile.primaryPitches[0].usage.toFixed(1)}% usage)`);
    }
    
    return advantages;
  }

  identifyRiskFactors(threatAssessment, arsenalMatchups) {
    const risks = [];
    
    if (threatAssessment.threatCounts.high > 2) {
      risks.push(`${threatAssessment.threatCounts.high} high-threat batters in lineup`);
    }
    
    return risks;
  }

  generateGameplan(pitcherProfile, threatAssessment) {
    const plan = [];
    
    if (threatAssessment.threatCounts.high > 0) {
      plan.push('Extra caution with high-threat batters');
    }
    
    if (pitcherProfile.primaryPitches.length > 0) {
      plan.push(`Rely on ${pitcherProfile.primaryPitches[0].name} as primary weapon`);
    }
    
    return plan;
  }

  generateRecommendations(strategicAnalysis) {
    const recommendations = [];
    
    if (strategicAnalysis.riskFactors.length > 0) {
      recommendations.push('High-risk game - monitor closely');
    }
    
    if (strategicAnalysis.strategicAdvantages.length > 0) {
      recommendations.push('Leverage pitcher strengths');
    }
    
    return recommendations.length > 0 ? recommendations : ['Standard strategic approach'];
  }
}

const advancedPitcherIntelligence = new AdvancedPitcherIntelligence();
export default advancedPitcherIntelligence;