/**
 * First Inning Cash Service
 * Identifies optimal first inning betting opportunities based on:
 * - Inning 1 pitcher vulnerability patterns (45% weight)
 * - Position vulnerability for leadoff/top order (30% weight) 
 * - Recent player performance/hot streaks (20% weight)
 * - Optimal matchup historical data (5% weight)
 */

class FirstInningCashService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Main method to identify first inning cash opportunities
   */
  async identifyFirstInningOpportunities(analysis, opportunities, matchups, lineupData) {
    // First inning cash analysis started

    const cacheKey = this.generateCacheKey(analysis, opportunities, matchups);
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      // If we don't have comprehensive analysis, try to use opportunities data directly
      let candidates = [];
      
      if (analysis?.matchup_analysis && Object.keys(analysis.matchup_analysis).length > 0) {
        candidates = this.processFirstInningCandidates(analysis, opportunities, matchups, lineupData);
      } else if (opportunities && opportunities.length > 0) {
        candidates = this.processOpportunitiesBasedCandidates(opportunities);
      } else if (analysis?.weakspot_opportunities && analysis.weakspot_opportunities.length > 0) {
        candidates = this.processOpportunitiesBasedCandidates(analysis.weakspot_opportunities);
      } else {
        console.warn('No suitable data for first inning analysis');
        return [];
      }

      const rankedCandidates = this.rankCandidates(candidates);
      
      const result = {
        candidates: rankedCandidates,
        summary: this.generateSummary(rankedCandidates),
        metadata: {
          totalAnalyzed: candidates.length,
          qualifyingCandidates: rankedCandidates.length,
          averageScore: this.calculateAverageScore(rankedCandidates),
          timestamp: new Date().toISOString(),
          analysisMethod: analysis?.matchup_analysis ? 'comprehensive' : 'opportunities-based'
        }
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      // Analysis complete
      return result;
    } catch (error) {
      console.error('❌ Error in first inning cash analysis:', error);
      return {
        candidates: [],
        summary: { elite: 0, strong: 0, monitoring: 0, total: 0 },
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Process all players across matchups to find first inning candidates
   */
  processFirstInningCandidates(analysis, opportunities, matchups, lineupData) {
    const candidates = [];
    
    if (!analysis?.matchup_analysis) {
      return candidates;
    }


    // Process each matchup in the analysis
    Object.entries(analysis.matchup_analysis).forEach(([matchupKey, matchupData]) => {
      const { away_pitcher_analysis, home_pitcher_analysis, matchup } = matchupData;
      
      console.log(`   Away pitcher: ${away_pitcher_analysis?.pitcher_name}`);
      console.log(`   Home pitcher: ${home_pitcher_analysis?.pitcher_name}`);
      
      // Process away team batting against home pitcher
      if (home_pitcher_analysis && matchup?.away_team) {
        
        // Check for inning patterns qualification first
        if (this.evaluateInningPatterns(home_pitcher_analysis.inning_patterns)) {
          
          // Get batters for away team from position vulnerabilities
          const awayBatters = this.extractBattersFromPositionVulnerabilities(
            home_pitcher_analysis.position_vulnerabilities, 
            matchup.away_team,
            opportunities,
            lineupData
          );
          
          awayBatters.forEach(batter => {
            const candidate = this.evaluateFirstInningCandidate(
              batter,
              home_pitcher_analysis,
              matchupData,
              'away'
            );
            if (candidate) {
              candidates.push(candidate);
            }
          });
        } else {
        }
      }

      // Process home team batting against away pitcher  
      if (away_pitcher_analysis && matchup?.home_team) {
        
        // Check for inning patterns qualification first
        if (this.evaluateInningPatterns(away_pitcher_analysis.inning_patterns)) {
          
          // Get batters for home team from position vulnerabilities
          const homeBatters = this.extractBattersFromPositionVulnerabilities(
            away_pitcher_analysis.position_vulnerabilities, 
            matchup.home_team,
            opportunities,
            lineupData
          );
          
          homeBatters.forEach(batter => {
            const candidate = this.evaluateFirstInningCandidate(
              batter,
              away_pitcher_analysis,
              matchupData,
              'home'
            );
            if (candidate) {
              candidates.push(candidate);
            }
          });
        } else {
        }
      }
    });

    return candidates;
  }

  /**
   * Process opportunities-based candidates when comprehensive analysis is not available
   */
  processOpportunitiesBasedCandidates(opportunities) {
    const candidates = [];
    
    
    if (!opportunities || !Array.isArray(opportunities)) {
      return candidates;
    }

    // Process all opportunities and look for top-order characteristics
    opportunities.forEach((opp, index) => {
      const playerName = opp.player_name || opp.playerName || opp.name;
      const position = this.extractPlayerPosition(opp);
      const team = opp.team || opp.Team || 'Unknown';
      
      
      // Check if this could be a first inning opportunity
      const isTopOrder = [1, 2, 3].includes(position);
      const hasHighScore = (opp.hr_score || 0) >= 50 || (opp.hit_probability || 0) >= 50; // Lowered threshold
      const hasGoodAverage = (opp.recent_avg || opp.batting_average || 0) >= 0.200;
      
      // More inclusive criteria for opportunities-based analysis
      const couldBeFirstInningCandidate = isTopOrder || hasHighScore || hasGoodAverage;
      
      if (couldBeFirstInningCandidate) {
        
        // Use position if available, otherwise estimate based on performance
        let estimatedPosition = position;
        if (!position) {
          // Estimate position based on performance characteristics
          if (hasHighScore && hasGoodAverage) {
            estimatedPosition = 3; // Likely cleanup/middle order
          } else if (hasGoodAverage) {
            estimatedPosition = 1; // Likely leadoff
          } else {
            estimatedPosition = 2; // Default to 2nd
          }
          console.log(`📍 Estimated position ${estimatedPosition} for ${playerName}`);
        }
        
        const candidate = this.evaluateOpportunityBasedCandidate(opp, estimatedPosition);
        if (candidate) {
          candidates.push(candidate);
        }
      } else {
      }
    });

    return candidates;
  }

  /**
   * Evaluate a single opportunity for first inning candidacy (fallback method)
   */
  evaluateOpportunityBasedCandidate(opportunity, position) {
    const playerName = opportunity.player_name || opportunity.playerName || opportunity.name;

    // Simplified criteria based on available opportunity data
    const criteria = {
      inningPatterns: false, // Not available in opportunities data
      positionVulnerability: [1, 2, 3].includes(position), // Based on position
      recentPerformance: this.evaluateRecentPerformance(opportunity),
      optimalMatchup: this.evaluateOptimalMatchup(opportunity, null)
    };

    // Must meet at least 2 criteria for opportunities-based analysis
    const qualifyingCriteria = Object.values(criteria).filter(Boolean).length;
    if (qualifyingCriteria < 2) {
      return null;
    }

    // Calculate simplified score
    const score = this.calculateOpportunityBasedScore(opportunity, criteria, position);


    return {
      player: {
        name: playerName,
        team: opportunity.team || opportunity.Team,
        position: position,
        positionName: this.getPositionName(position)
      },
      pitcher: {
        name: opportunity.pitcher || opportunity.pitcher_name || 'Unknown',
        team: 'Opponent'
      },
      matchup: {
        key: `${opportunity.team || 'Team'}_opportunity`,
        venue: opportunity.venue || 'Unknown',
        side: 'opportunity-based'
      },
      scores: {
        composite: Math.round(score * 100) / 100,
        inningPatterns: 0, // Not available
        positionVulnerability: this.calculateOpportunityPositionScore(position),
        recentPerformance: this.calculateRecentPerformanceScore(opportunity),
        optimalMatchup: this.calculateOptimalMatchupScore(opportunity, null)
      },
      criteria: criteria,
      data: {
        batterStats: this.extractBatterStats(opportunity),
        pitcherStats: { name: opportunity.pitcher || 'Unknown' },
        rawData: opportunity
      }
    };
  }

  /**
   * Calculate opportunity-based score (simplified version)
   */
  calculateOpportunityBasedScore(opportunity, criteria, position) {
    let score = 40; // Base score for opportunity-based analysis

    // Position bonus
    if (position === 1) score += 15; // Leadoff
    else if (position === 2) score += 10; // Second
    else if (position === 3) score += 12; // Third

    // Performance scores
    if (criteria.recentPerformance) {
      score += this.calculateRecentPerformanceScore(opportunity) * 0.3;
    }

    if (criteria.optimalMatchup) {
      score += this.calculateOptimalMatchupScore(opportunity, null) * 0.2;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate position score for opportunity-based analysis
   */
  calculateOpportunityPositionScore(position) {
    const baseScores = { 1: 70, 2: 60, 3: 65 };
    return baseScores[position] || 40;
  }

  /**
   * Extract batters from position vulnerabilities data and match with opportunities
   */
  extractBattersFromPositionVulnerabilities(positionVulnerabilities, teamAbbr, opportunities, lineupData) {
    const batters = [];
    
    if (!positionVulnerabilities) {
      return batters;
    }


    // Look for positions 1, 2, 3 (first three batting positions)
    [1, 2, 3].forEach(position => {
      const positionKey = `position_${position}`;
      const positionData = positionVulnerabilities[positionKey];
      
      if (positionData) {
        
        if (this.evaluatePositionVulnerability(positionVulnerabilities, position)) {
          
          // PRIORITY 1: Try to get the actual player name from lineup data FIRST
          const lineupPlayer = this.getLineupHitterForPosition(position, teamAbbr, lineupData);
          
          if (lineupPlayer) {
            
            // Try to find full player data from opportunities
            const playerData = opportunities?.find(opp => {
              const oppName = opp.player_name || opp.playerName || opp.name;
              return oppName && (
                oppName.toLowerCase() === lineupPlayer.name.toLowerCase() ||
                oppName.toLowerCase().includes(lineupPlayer.name.toLowerCase()) ||
                lineupPlayer.name.toLowerCase().includes(oppName.toLowerCase())
              );
            });
            
            batters.push({
              ...(playerData || {}),
              player_name: lineupPlayer.name,
              playerName: lineupPlayer.name,
              team: teamAbbr,
              Team: teamAbbr,
              position: position,
              positionVulnerabilityData: positionData,
              // Use player data if available, otherwise defaults
              recent_avg: playerData?.recent_avg || playerData?.batting_average || 0.250,
              recent_ops: playerData?.recent_ops || playerData?.ops || 0.700,
              hr_score: playerData?.hr_score || 50,
              hit_probability: playerData?.hit_probability || 50,
              confidence: playerData?.confidence || 60
            });
          } else {
            // PRIORITY 2: Check if the position data includes player name
            const playerName = positionData.player_name || 
                             positionData.playerName || 
                             positionData.name ||
                             positionData.hitter_name ||
                             positionData.batter_name;
            
            if (playerName) {
              
              // Try to find full player data from opportunities
              const playerData = opportunities?.find(opp => {
                const oppName = opp.player_name || opp.playerName || opp.name;
                return oppName && (
                  oppName.toLowerCase() === playerName.toLowerCase() ||
                  oppName.toLowerCase().includes(playerName.toLowerCase()) ||
                  playerName.toLowerCase().includes(oppName.toLowerCase())
                );
              });
              
              batters.push({
                ...(playerData || {}),
                player_name: playerName,
                playerName: playerName,
                team: teamAbbr,
                Team: teamAbbr,
                position: position,
                positionVulnerabilityData: positionData,
                // Use player data if available, otherwise defaults
                recent_avg: playerData?.recent_avg || playerData?.batting_average || 0.250,
                recent_ops: playerData?.recent_ops || playerData?.ops || 0.700,
                hr_score: playerData?.hr_score || 50,
                hit_probability: playerData?.hit_probability || 50,
                confidence: playerData?.confidence || 60
              });
            } else {
              // PRIORITY 3: Try to find player by position in opportunities data
              const playerInPosition = this.findPlayerInPosition(opportunities, teamAbbr, position);
              
              if (playerInPosition) {
                batters.push({
                  ...playerInPosition,
                  position: position,
                  positionVulnerabilityData: positionData
                });
              } else {
                // LAST RESORT: Create placeholder only when all else fails
                console.log(`❓ Creating placeholder for position ${position} on team ${teamAbbr} - no player name found despite trying lineup data, position data, and opportunities`);
                batters.push({
                  player_name: `Position ${position} Hitter (${teamAbbr})`,
                  playerName: `Position ${position} Hitter (${teamAbbr})`,
                  team: teamAbbr,
                  Team: teamAbbr,
                  position: position,
                  positionVulnerabilityData: positionData,
                  // Extract stats from position vulnerability data if available
                  recent_avg: positionData.hit_rate || 0.250,
                  recent_ops: 0.700,
                  hr_score: positionData.vulnerability_score || 50,
                  hit_probability: (positionData.hit_rate || 0.25) * 100,
                  confidence: 60
                });
              }
            }
          }
        }
      }
    });

    return batters;
  }

  /**
   * Find a specific player in a batting position from opportunities
   */
  findPlayerInPosition(opportunities, teamAbbr, position) {
    if (!opportunities || !Array.isArray(opportunities)) {
      return null;
    }

    return opportunities.find(opp => {
      const playerTeam = opp.team || opp.Team || '';
      const playerPosition = this.extractPlayerPosition(opp);
      
      return playerTeam.toLowerCase() === teamAbbr.toLowerCase() && 
             playerPosition === position;
    });
  }

  /**
   * Extract batters from opportunities for a specific team (legacy method for compatibility)
   */
  extractBattersFromOpportunities(opportunities, teamAbbr) {
    if (!opportunities || !Array.isArray(opportunities)) {
      return [];
    }

    return opportunities.filter(opp => {
      const playerTeam = opp.team || opp.Team || '';
      return playerTeam.toLowerCase() === teamAbbr.toLowerCase();
    });
  }

  /**
   * Evaluate a single batter for first inning candidacy
   */
  evaluateFirstInningCandidate(batter, pitcherAnalysis, matchupData, side) {
    // Get player position (1-9 batting order)
    const position = this.extractPlayerPosition(batter);
    
    // Temporarily allow all positions for testing (was 1,2,3 only)
    if (!position || position < 1 || position > 9) {
      return null;
    }


    // Evaluate criteria
    const criteria = {
      inningPatterns: this.evaluateInningPatterns(pitcherAnalysis.inning_patterns),
      positionVulnerability: this.evaluatePositionVulnerability(
        pitcherAnalysis.position_vulnerabilities, 
        position
      ),
      recentPerformance: this.evaluateRecentPerformance(batter),
      optimalMatchup: this.evaluateOptimalMatchup(batter, pitcherAnalysis)
    };


    // Temporarily reduced requirement for testing: must meet at least 1 criterion (was 2)
    const qualifyingCriteria = Object.values(criteria).filter(Boolean).length;
    if (qualifyingCriteria < 1) {
      return null;
    }

    // Calculate composite score
    const score = this.calculateFirstInningScore(batter, pitcherAnalysis, criteria, position);


    return {
      player: {
        name: batter.player_name || batter.playerName || batter.name,
        team: batter.team || batter.Team,
        position: position,
        positionName: this.getPositionName(position)
      },
      pitcher: {
        name: pitcherAnalysis.pitcher_name,
        team: side === 'away' ? matchupData.matchup?.away_team : matchupData.matchup?.home_team
      },
      matchup: {
        key: `${matchupData.matchup?.away_team}_vs_${matchupData.matchup?.home_team}`,
        venue: matchupData.matchup?.venue,
        side: side
      },
      scores: {
        composite: Math.round(score * 100) / 100,
        inningPatterns: this.calculateInningPatternsScore(pitcherAnalysis.inning_patterns),
        positionVulnerability: this.calculatePositionVulnerabilityScore(
          pitcherAnalysis.position_vulnerabilities, 
          position
        ),
        recentPerformance: this.calculateRecentPerformanceScore(batter),
        optimalMatchup: this.calculateOptimalMatchupScore(batter, pitcherAnalysis)
      },
      criteria: criteria,
      data: {
        batterStats: this.extractBatterStats(batter),
        pitcherStats: this.extractPitcherStats(pitcherAnalysis),
        rawData: batter
      }
    };
  }

  /**
   * Calculate composite first inning score using expert-recommended weights
   * Inning Patterns: 45%, Position: 30%, Recent: 20%, Optimal: 5%
   */
  calculateFirstInningScore(batter, pitcherAnalysis, criteria, position) {
    let score = 0;

    // Inning 1 Patterns (45% weight)
    if (criteria.inningPatterns) {
      const inningScore = this.calculateInningPatternsScore(pitcherAnalysis.inning_patterns);
      score += inningScore * 0.45;
    }

    // Position Vulnerability (30% weight)
    if (criteria.positionVulnerability) {
      const positionScore = this.calculatePositionVulnerabilityScore(
        pitcherAnalysis.position_vulnerabilities, 
        position
      );
      score += positionScore * 0.30;
    }

    // Recent Performance (20% weight)
    if (criteria.recentPerformance) {
      const recentScore = this.calculateRecentPerformanceScore(batter);
      score += recentScore * 0.20;
    }

    // Optimal Matchup Bonus (5% weight)
    if (criteria.optimalMatchup) {
      const matchupScore = this.calculateOptimalMatchupScore(batter, pitcherAnalysis);
      score += matchupScore * 0.05;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluate inning 1-3 patterns - check for high vulnerability (green/orange) in first 3 innings
   */
  evaluateInningPatterns(inningPatterns) {
    if (!inningPatterns) {
      return false;
    }


    // Check first 3 innings for green/orange vulnerability
    const firstThreeInnings = [1, 2, 3];
    let qualifyingInnings = 0;

    firstThreeInnings.forEach(inning => {
      const inningKey = `inning_${inning}`;
      const inningData = inningPatterns[inningKey];
      
      if (inningData) {
        const vulnerabilityScore = inningData.vulnerability_score || 0;
        console.log(`   Inning ${inning}: vulnerability_score = ${vulnerabilityScore}`);
        
        // Temporarily lowered threshold for testing
        // Green/orange threshold: 10%+ (was 15%+)
        if (vulnerabilityScore >= 10) {
          qualifyingInnings++;
        } else {
        }
      } else {
      }
    });

    // Temporarily lowered requirement for testing: must have at least 1 qualifying inning (was 2)
    const qualifies = qualifyingInnings >= 1;
    console.log(`📈 Inning patterns result: ${qualifyingInnings}/3 qualifying innings, passes: ${qualifies}`);
    return qualifies;
  }

  /**
   * Calculate inning patterns score (0-100) for first 3 innings
   */
  calculateInningPatternsScore(inningPatterns) {
    if (!inningPatterns) {
      return 0;
    }

    let score = 0;
    let inningsProcessed = 0;

    // Calculate weighted score for first 3 innings
    [1, 2, 3].forEach((inning, index) => {
      const inningKey = `inning_${inning}`;
      const inningData = inningPatterns[inningKey];
      
      if (inningData) {
        const vulnerabilityScore = inningData.vulnerability_score || 0;
        const hitRate = inningData.hit_frequency || inningData.hit_rate || 0;
        const hrRate = inningData.hr_frequency || inningData.hr_rate || 0;

        // Weight earlier innings more heavily
        const inningWeight = inning === 1 ? 0.5 : inning === 2 ? 0.3 : 0.2;
        
        let inningScore = vulnerabilityScore;
        
        // Bonus for high hit rates (convert to percentage if needed)
        const hitRatePercent = hitRate > 1 ? hitRate : hitRate * 100;
        if (hitRatePercent > 30) inningScore += 10;
        else if (hitRatePercent > 25) inningScore += 5;
        
        // Bonus for HR vulnerability (convert to percentage if needed)
        const hrRatePercent = hrRate > 1 ? hrRate : hrRate * 100;
        if (hrRatePercent > 15) inningScore += 15;
        else if (hrRatePercent > 10) inningScore += 8;

        score += inningScore * inningWeight;
        inningsProcessed++;
      }
    });

    // Scale score if we have data for all 3 innings
    if (inningsProcessed === 3) {
      score *= 1.2; // Bonus for complete data
    }

    return Math.min(100, score);
  }

  /**
   * Evaluate position vulnerability for positions 1-3
   */
  evaluatePositionVulnerability(positionVuln, position) {
    if (!positionVuln || ![1, 2, 3].includes(position)) {
      return false;
    }

    const positionData = positionVuln[`position_${position}`] || positionVuln[position];
    if (!positionData) {
      return false;
    }

    const vulnerabilityScore = positionData.vulnerability_score || 0;
    const hitRate = positionData.hit_frequency || positionData.hit_rate || 0;
    
    // Orange/green threshold based on screenshots:
    // Green bars show VULN scores like 12.9, 18.7 and HIT rates like 32.1%, 33.3%
    // Orange threshold should be around 10+ vulnerability or 25%+ hit rate
    const hasGoodVulnerability = vulnerabilityScore >= 10;
    const hasGoodHitRate = (hitRate > 1 ? hitRate : hitRate * 100) >= 25;
    
    return hasGoodVulnerability || hasGoodHitRate;
  }

  /**
   * Calculate position vulnerability score (0-100)
   */
  calculatePositionVulnerabilityScore(positionVuln, position) {
    if (!positionVuln || ![1, 2, 3].includes(position)) {
      return 0;
    }

    const positionData = positionVuln[`position_${position}`] || positionVuln[position];
    if (!positionData) {
      return 0;
    }

    const vulnerabilityScore = positionData.vulnerability_score || 0;
    const hitRate = positionData.hit_frequency || positionData.hit_rate || 0;
    const hrRate = positionData.hr_frequency || positionData.hr_rate || 0;

    // Start with base vulnerability score
    let score = vulnerabilityScore * 3; // Scale up for 0-100 range

    // Position-specific bonuses
    if (position === 1) {
      // Leadoff hitter bonus for getting first crack at pitcher
      score += 10;
    } else if (position === 3) {
      // Best hitter bonus for premium opportunity
      score += 15;
    } else if (position === 2) {
      // Setup hitter bonus
      score += 8;
    }

    // Performance bonuses (convert rates to percentages if needed)
    const hitRatePercent = hitRate > 1 ? hitRate : hitRate * 100;
    const hrRatePercent = hrRate > 1 ? hrRate : hrRate * 100;
    
    if (hitRatePercent > 30) score += 15;
    else if (hitRatePercent > 25) score += 10;
    
    if (hrRatePercent > 12) score += 20;
    else if (hrRatePercent > 8) score += 12;

    return Math.min(100, score);
  }

  /**
   * Evaluate recent performance - check for orange/green average
   */
  evaluateRecentPerformance(batter) {
    const recentAvg = this.extractRecentAverage(batter);
    const recentOPS = this.extractRecentOPS(batter);
    
    // Orange/green threshold - more realistic thresholds
    // Green: .250+ average or .700+ OPS
    // Orange: .220+ average or .650+ OPS
    const hasGoodAverage = recentAvg >= 0.220;
    const hasGoodOPS = recentOPS >= 0.650;
    
    return hasGoodAverage || hasGoodOPS;
  }

  /**
   * Calculate recent performance score (0-100)
   */
  calculateRecentPerformanceScore(batter) {
    const recentAvg = this.extractRecentAverage(batter);
    const recentOPS = this.extractRecentOPS(batter);
    
    let score = 0;

    // Recent average scoring
    if (recentAvg >= 0.300) score += 30;
    else if (recentAvg >= 0.250) score += 20;
    else if (recentAvg >= 0.200) score += 10;

    // Recent OPS bonus
    if (recentOPS >= 0.800) score += 25;
    else if (recentOPS >= 0.700) score += 15;
    else if (recentOPS >= 0.600) score += 8;

    // Hot streak detection
    if (this.detectHotStreak(batter)) {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Evaluate optimal matchup status
   */
  evaluateOptimalMatchup(batter, pitcherAnalysis) {
    // Check if this batter appears in any "optimal" or "best bet" analysis
    const hrScore = batter.hr_score || 0;
    const hitProb = batter.hit_probability || 0;
    
    // Consider it optimal if high scores in either category
    return hrScore >= 75 || hitProb >= 75;
  }

  /**
   * Calculate optimal matchup score (0-100)
   */
  calculateOptimalMatchupScore(batter, pitcherAnalysis) {
    const hrScore = batter.hr_score || 0;
    const hitProb = batter.hit_probability || 0;
    const confidence = batter.confidence || 0;

    // Weighted combination of existing scores
    return Math.min(100, (hrScore * 0.4) + (hitProb * 0.4) + (confidence * 0.2));
  }

  /**
   * Extract player position from batter data
   */
  extractPlayerPosition(batter) {
    // Look for position in various possible fields
    const position = batter.position || 
                    batter.batting_order || 
                    batter.order || 
                    batter.lineup_position;
    
    return parseInt(position) || 0;
  }

  /**
   * Get position name
   */
  getPositionName(position) {
    const positions = {
      1: 'Leadoff',
      2: '2nd Hitter', 
      3: '3rd Hitter',
      4: 'Cleanup',
      5: '5th Hitter',
      6: '6th Hitter',
      7: '7th Hitter',
      8: '8th Hitter',
      9: '9th Hitter'
    };
    return positions[position] || `Position ${position}`;
  }

  /**
   * Extract recent batting average
   */
  extractRecentAverage(batter) {
    return batter.recent_avg || 
           batter.last_15_avg || 
           batter.recent_average || 
           batter.batting_average || 0;
  }

  /**
   * Extract recent OPS
   */
  extractRecentOPS(batter) {
    return batter.recent_ops || 
           batter.last_15_ops || 
           batter.ops || 0;
  }

  /**
   * Detect hot streak
   */
  detectHotStreak(batter) {
    const last7Avg = batter.last_7_avg || 0;
    const last15Avg = batter.last_15_avg || 0;
    
    // Hot if recent 7 is significantly better than recent 15
    return last7Avg > 0.300 && last7Avg > (last15Avg + 0.050);
  }

  /**
   * Extract batter stats for display
   */
  extractBatterStats(batter) {
    return {
      recentAvg: this.extractRecentAverage(batter),
      recentOPS: this.extractRecentOPS(batter),
      hrScore: batter.hr_score || 0,
      hitProb: batter.hit_probability || 0,
      confidence: batter.confidence || 0
    };
  }

  /**
   * Extract pitcher stats for display
   */
  extractPitcherStats(pitcherAnalysis) {
    const inning1 = pitcherAnalysis.inning_patterns?.inning_1 || {};
    
    
    // Try multiple sources for ERA and WHIP data including component_scores structure
    const era = pitcherAnalysis.pitcher_era || 
                pitcherAnalysis.era || 
                pitcherAnalysis.component_scores?.pitcher_analysis?.era ||
                pitcherAnalysis.season_era || 
                pitcherAnalysis.recent_era || 
                pitcherAnalysis.overall_era ||
                pitcherAnalysis.stats?.era ||
                pitcherAnalysis.season_stats?.era ||
                pitcherAnalysis.recent_form?.era ||
                4.50; // Reasonable default instead of 0
    
    const whip = pitcherAnalysis.pitcher_whip || 
                 pitcherAnalysis.whip || 
                 pitcherAnalysis.component_scores?.pitcher_analysis?.whip ||
                 pitcherAnalysis.season_whip || 
                 pitcherAnalysis.recent_whip ||
                 pitcherAnalysis.stats?.whip ||
                 pitcherAnalysis.season_stats?.whip ||
                 pitcherAnalysis.recent_form?.whip ||
                 1.30; // Reasonable default instead of 0
    
    return {
      name: pitcherAnalysis.pitcher_name,
      era: era,
      whip: whip,
      firstInningVuln: inning1.vulnerability_score || 0,
      firstInningHitRate: inning1.hit_frequency || inning1.hit_rate || 0,
      gamesAnalyzed: pitcherAnalysis.games_analyzed || pitcherAnalysis.recent_form?.games_analyzed || 0
    };
  }

  /**
   * Rank candidates by composite score
   */
  rankCandidates(candidates) {
    return candidates
      .filter(candidate => candidate.scores.composite >= 40) // Minimum threshold
      .sort((a, b) => b.scores.composite - a.scores.composite)
      .map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
        tier: this.getTier(candidate.scores.composite)
      }));
  }

  /**
   * Get tier classification
   */
  getTier(score) {
    if (score >= 85) return 'ELITE';
    if (score >= 70) return 'STRONG';
    if (score >= 55) return 'MONITORING';
    return 'STANDARD';
  }

  /**
   * Generate summary statistics
   */
  generateSummary(candidates) {
    return {
      elite: candidates.filter(c => c.tier === 'ELITE').length,
      strong: candidates.filter(c => c.tier === 'STRONG').length,
      monitoring: candidates.filter(c => c.tier === 'MONITORING').length,
      total: candidates.length
    };
  }

  /**
   * Calculate average score
   */
  calculateAverageScore(candidates) {
    if (candidates.length === 0) return 0;
    const sum = candidates.reduce((acc, c) => acc + c.scores.composite, 0);
    return Math.round((sum / candidates.length) * 100) / 100;
  }

  /**
   * Get lineup hitter for a specific position from lineup data
   */
  getLineupHitterForPosition(position, teamAbbr, lineupData) {
    
    if (!lineupData) {
      return null;
    }

    // Handle different possible lineup data structures
    let games = lineupData.games;
    if (!games && Array.isArray(lineupData)) {
      games = lineupData; // lineupData might be the games array directly
    }
    
    if (!games || !Array.isArray(games)) {
      return null;
    }


    // Find the game for this team
    const game = games.find(game => {
      const homeTeam = game.teams?.home?.abbr || game.home_team || game.homeTeam;
      const awayTeam = game.teams?.away?.abbr || game.away_team || game.awayTeam;
      
      console.log(`🏟️ Checking game: ${awayTeam} @ ${homeTeam}`);
      
      return homeTeam?.toLowerCase() === teamAbbr.toLowerCase() || 
             awayTeam?.toLowerCase() === teamAbbr.toLowerCase();
    });

    if (!game) {
      console.log(`Available teams:`, games.map(g => ({
        away: g.teams?.away?.abbr || g.away_team || g.awayTeam,
        home: g.teams?.home?.abbr || g.home_team || g.homeTeam
      })));
      return null;
    }

    // Determine if this team is home or away
    const homeTeam = game.teams?.home?.abbr || game.home_team || game.homeTeam;
    const awayTeam = game.teams?.away?.abbr || game.away_team || game.awayTeam;
    const isHomeTeam = homeTeam?.toLowerCase() === teamAbbr.toLowerCase();
    
    console.log(`🏟️ Team ${teamAbbr} is ${isHomeTeam ? 'home' : 'away'} (away: ${awayTeam}, home: ${homeTeam})`);
    
    // Get the lineup for this team
    let lineup = null;
    if (game.lineups) {
      lineup = isHomeTeam ? game.lineups.home : game.lineups.away;
    } else if (game.lineup) {
      lineup = isHomeTeam ? game.lineup.home : game.lineup.away;
    }
    
    
    if (!lineup || !Array.isArray(lineup)) {
      return null;
    }

    console.log(`👥 Found lineup with ${lineup.length} players`);

    // Find the player in the specified position
    const player = lineup.find(player => {
      const playerPosition = parseInt(player.batting_order || player.position || player.order || player.lineup_position);
      return playerPosition === position;
    });

    if (player) {
      return {
        name: player.name,
        position: position,
        team: teamAbbr
      };
    } else {
      console.log(`Available positions:`, lineup.map(p => ({
        name: p.name, 
        position: parseInt(p.batting_order || p.position || p.order || p.lineup_position)
      })));
      return null;
    }
  }

  /**
   * Generate cache key
   */
  generateCacheKey(analysis, opportunities, matchups) {
    const analysisHash = analysis ? JSON.stringify(analysis).slice(0, 100) : 'no-analysis';
    const oppsHash = opportunities ? opportunities.length : 0;
    const matchupsHash = matchups ? JSON.stringify(matchups).slice(0, 50) : 'no-matchups';
    
    return `first-inning-${analysisHash}-${oppsHash}-${matchupsHash}`;
  }
}

// Export singleton instance
const firstInningCashService = new FirstInningCashService();
export default firstInningCashService;