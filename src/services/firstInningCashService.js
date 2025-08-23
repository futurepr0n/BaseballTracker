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
    console.log('🥇 Starting first inning cash analysis...');
    console.log('📊 Analysis data available:', !!analysis);
    console.log('🎯 Opportunities available:', !!opportunities, opportunities?.length || 0);
    console.log('⚾ Matchups available:', !!matchups);
    
    // Debug data structure
    if (analysis) {
      console.log('📊 Analysis structure:', {
        has_matchup_analysis: !!analysis.matchup_analysis,
        matchup_analysis_keys: analysis.matchup_analysis ? Object.keys(analysis.matchup_analysis) : [],
        has_weakspot_opportunities: !!analysis.weakspot_opportunities,
        weakspot_opportunities_count: analysis.weakspot_opportunities?.length || 0,
        analysis_keys: Object.keys(analysis),
        debug_info: analysis.debug_info
      });
    }

    const cacheKey = this.generateCacheKey(analysis, opportunities, matchups);
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📚 Returning cached first inning analysis');
        return cached.data;
      }
    }

    try {
      // If we don't have comprehensive analysis, try to use opportunities data directly
      let candidates = [];
      
      if (analysis?.matchup_analysis && Object.keys(analysis.matchup_analysis).length > 0) {
        console.log('✅ Using comprehensive matchup analysis');
        console.log('🔍 Available matchups:', Object.keys(analysis.matchup_analysis));
        candidates = this.processFirstInningCandidates(analysis, opportunities, matchups, lineupData);
      } else if (opportunities && opportunities.length > 0) {
        console.log('🔄 Falling back to opportunities-based analysis');
        candidates = this.processOpportunitiesBasedCandidates(opportunities);
      } else if (analysis?.weakspot_opportunities && analysis.weakspot_opportunities.length > 0) {
        console.log('🔄 Using weakspot opportunities for first inning analysis');
        candidates = this.processOpportunitiesBasedCandidates(analysis.weakspot_opportunities);
      } else {
        console.log('❌ No suitable data for first inning analysis');
        console.log('Available data sources:', {
          matchup_analysis: !!analysis?.matchup_analysis,
          matchup_analysis_count: analysis?.matchup_analysis ? Object.keys(analysis.matchup_analysis).length : 0,
          opportunities: !!opportunities,
          opportunities_count: opportunities?.length || 0,
          weakspot_opportunities: !!analysis?.weakspot_opportunities,
          weakspot_opportunities_count: analysis?.weakspot_opportunities?.length || 0
        });
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

      console.log(`✅ First inning analysis complete: ${rankedCandidates.length} candidates found`);
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
      console.log('❌ No matchup_analysis found in analysis data');
      return candidates;
    }

    console.log('🔍 Processing first inning candidates from matchup_analysis...');
    console.log('📊 Available matchups:', Object.keys(analysis.matchup_analysis));

    // Process each matchup in the analysis
    Object.entries(analysis.matchup_analysis).forEach(([matchupKey, matchupData]) => {
      const { away_pitcher_analysis, home_pitcher_analysis, matchup } = matchupData;
      
      console.log(`🎯 Processing matchup: ${matchupKey}`);
      console.log(`   Away pitcher: ${away_pitcher_analysis?.pitcher_name}`);
      console.log(`   Home pitcher: ${home_pitcher_analysis?.pitcher_name}`);
      
      // Process away team batting against home pitcher
      if (home_pitcher_analysis && matchup?.away_team) {
        console.log(`⚾ Processing away team (${matchup.away_team}) vs home pitcher (${home_pitcher_analysis.pitcher_name})`);
        
        // Check for inning patterns qualification first
        if (this.evaluateInningPatterns(home_pitcher_analysis.inning_patterns)) {
          console.log(`✅ ${home_pitcher_analysis.pitcher_name} has qualifying inning patterns`);
          
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
          console.log(`❌ ${home_pitcher_analysis.pitcher_name} doesn't have qualifying inning patterns`);
        }
      }

      // Process home team batting against away pitcher  
      if (away_pitcher_analysis && matchup?.home_team) {
        console.log(`🏠 Processing home team (${matchup.home_team}) vs away pitcher (${away_pitcher_analysis.pitcher_name})`);
        
        // Check for inning patterns qualification first
        if (this.evaluateInningPatterns(away_pitcher_analysis.inning_patterns)) {
          console.log(`✅ ${away_pitcher_analysis.pitcher_name} has qualifying inning patterns`);
          
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
          console.log(`❌ ${away_pitcher_analysis.pitcher_name} doesn't have qualifying inning patterns`);
        }
      }
    });

    console.log(`🎯 Found ${candidates.length} total first inning candidates across ${Object.keys(analysis.matchup_analysis).length} matchups`);
    return candidates;
  }

  /**
   * Process opportunities-based candidates when comprehensive analysis is not available
   */
  processOpportunitiesBasedCandidates(opportunities) {
    const candidates = [];
    
    console.log('🔄 Processing opportunities-based first inning candidates...');
    console.log('📊 Sample opportunity data:', opportunities?.[0]);
    
    if (!opportunities || !Array.isArray(opportunities)) {
      console.log('❌ No opportunities data available');
      return candidates;
    }

    // Process all opportunities and look for top-order characteristics
    opportunities.forEach((opp, index) => {
      const playerName = opp.player_name || opp.playerName || opp.name;
      const position = this.extractPlayerPosition(opp);
      const team = opp.team || opp.Team || 'Unknown';
      
      console.log(`🔍 Checking opportunity ${index + 1}: ${playerName} (${team}) pos: ${position}`);
      
      // Check if this could be a first inning opportunity
      const isTopOrder = [1, 2, 3].includes(position);
      const hasHighScore = (opp.hr_score || 0) >= 50 || (opp.hit_probability || 0) >= 50; // Lowered threshold
      const hasGoodAverage = (opp.recent_avg || opp.batting_average || 0) >= 0.200;
      
      // More inclusive criteria for opportunities-based analysis
      const couldBeFirstInningCandidate = isTopOrder || hasHighScore || hasGoodAverage;
      
      if (couldBeFirstInningCandidate) {
        console.log(`✅ ${playerName} qualifies for evaluation (pos: ${position}, hr_score: ${opp.hr_score}, avg: ${opp.recent_avg || opp.batting_average})`);
        
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
        console.log(`❌ ${playerName} doesn't qualify (pos: ${position}, hr_score: ${opp.hr_score}, avg: ${opp.recent_avg || opp.batting_average})`);
      }
    });

    console.log(`✅ Found ${candidates.length} opportunities-based candidates`);
    return candidates;
  }

  /**
   * Evaluate a single opportunity for first inning candidacy (fallback method)
   */
  evaluateOpportunityBasedCandidate(opportunity, position) {
    const playerName = opportunity.player_name || opportunity.playerName || opportunity.name;
    console.log(`🔍 Evaluating opportunity-based candidate: ${playerName} (pos ${position})`);

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
      console.log(`❌ ${playerName} only meets ${qualifyingCriteria}/4 criteria (need 2+)`);
      return null;
    }

    // Calculate simplified score
    const score = this.calculateOpportunityBasedScore(opportunity, criteria, position);

    console.log(`✅ ${playerName} qualifies with opportunity-based score: ${score.toFixed(1)}`);

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
      console.log(`❌ No position vulnerabilities data for team ${teamAbbr}`);
      return batters;
    }

    console.log(`🔍 Examining position vulnerabilities for ${teamAbbr}:`, Object.keys(positionVulnerabilities));

    // Look for positions 1, 2, 3 (first three batting positions)
    [1, 2, 3].forEach(position => {
      const positionKey = `position_${position}`;
      const positionData = positionVulnerabilities[positionKey];
      
      if (positionData) {
        console.log(`📊 Position ${position} data for ${teamAbbr}:`, positionData);
        
        if (this.evaluatePositionVulnerability(positionVulnerabilities, position)) {
          console.log(`✅ Position ${position} has vulnerability for team ${teamAbbr}`);
          
          // PRIORITY 1: Try to get the actual player name from lineup data FIRST
          const lineupPlayer = this.getLineupHitterForPosition(position, teamAbbr, lineupData);
          
          if (lineupPlayer) {
            console.log(`👤 Found lineup player: ${lineupPlayer.name} in position ${position} for team ${teamAbbr}`);
            
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
              console.log(`👤 Found player name in position data: ${playerName}`);
              
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
                console.log(`👤 Found player ${playerInPosition.player_name || playerInPosition.playerName} in position ${position} from opportunities`);
                batters.push({
                  ...playerInPosition,
                  position: position,
                  positionVulnerabilityData: positionData
                });
              } else {
                // LAST RESORT: Create placeholder only when all else fails
                console.log(`❓ Creating placeholder for position ${position} on team ${teamAbbr} - no player name found despite trying lineup data, position data, and opportunities`);
                console.log(`🔍 Lineup data structure:`, lineupData);
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

    console.log(`🎯 Found ${batters.length} qualifying batters for team ${teamAbbr} in positions 1-3`);
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
      console.log(`❌ Invalid position ${position} for ${batter.player_name || batter.playerName}`);
      return null;
    }

    console.log(`🔍 Evaluating ${batter.player_name || batter.playerName} (pos ${position}) vs ${pitcherAnalysis.pitcher_name}`);

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

    console.log(`📊 Criteria for ${batter.player_name || batter.playerName}:`, criteria);

    // Temporarily reduced requirement for testing: must meet at least 1 criterion (was 2)
    const qualifyingCriteria = Object.values(criteria).filter(Boolean).length;
    if (qualifyingCriteria < 1) {
      console.log(`❌ ${batter.player_name || batter.playerName} only meets ${qualifyingCriteria}/4 criteria (need 1+)`);
      return null;
    }

    // Calculate composite score
    const score = this.calculateFirstInningScore(batter, pitcherAnalysis, criteria, position);

    console.log(`✅ ${batter.player_name || batter.playerName} qualifies! Score: ${score.toFixed(1)}`);

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
      console.log('❌ No inning patterns data available');
      return false;
    }

    console.log('📊 Evaluating inning patterns:', inningPatterns);

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
          console.log(`   ✅ Inning ${inning} qualifies (${vulnerabilityScore}%)`);
        } else {
          console.log(`   ❌ Inning ${inning} doesn't qualify (${vulnerabilityScore}%)`);
        }
      } else {
        console.log(`   ❌ No data for inning ${inning}`);
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
    
    // Debug logging to see the actual data structure
    console.log(`🔍 DEBUG: Pitcher analysis structure for ${pitcherAnalysis.pitcher_name}:`, {
      pitcher_era: pitcherAnalysis.pitcher_era,
      era: pitcherAnalysis.era,
      component_scores: pitcherAnalysis.component_scores,
      topLevelKeys: Object.keys(pitcherAnalysis),
      hasComponentScores: !!pitcherAnalysis.component_scores
    });
    
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
    console.log(`🔍 Looking for position ${position} hitter for team ${teamAbbr}`);
    console.log(`📊 Lineup data structure:`, lineupData);
    
    if (!lineupData) {
      console.log(`❌ No lineup data provided for team ${teamAbbr}`);
      return null;
    }

    // Handle different possible lineup data structures
    let games = lineupData.games;
    if (!games && Array.isArray(lineupData)) {
      games = lineupData; // lineupData might be the games array directly
    }
    
    if (!games || !Array.isArray(games)) {
      console.log(`❌ No games array found in lineup data for team ${teamAbbr}`);
      return null;
    }

    console.log(`🎮 Found ${games.length} games in lineup data`);

    // Find the game for this team
    const game = games.find(game => {
      const homeTeam = game.teams?.home?.abbr || game.home_team || game.homeTeam;
      const awayTeam = game.teams?.away?.abbr || game.away_team || game.awayTeam;
      
      console.log(`🏟️ Checking game: ${awayTeam} @ ${homeTeam}`);
      
      return homeTeam?.toLowerCase() === teamAbbr.toLowerCase() || 
             awayTeam?.toLowerCase() === teamAbbr.toLowerCase();
    });

    if (!game) {
      console.log(`❌ No game found for team ${teamAbbr} in lineup data`);
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
    
    console.log(`📋 Lineup structure:`, lineup);
    
    if (!lineup || !Array.isArray(lineup)) {
      console.log(`❌ No lineup found for ${isHomeTeam ? 'home' : 'away'} team ${teamAbbr}`);
      return null;
    }

    console.log(`👥 Found lineup with ${lineup.length} players`);

    // Find the player in the specified position
    const player = lineup.find(player => {
      const playerPosition = parseInt(player.batting_order || player.position || player.order || player.lineup_position);
      console.log(`🔍 Checking player ${player.name}: position ${playerPosition} vs target ${position}`);
      return playerPosition === position;
    });

    if (player) {
      console.log(`✅ Found player ${player.name} in position ${position} for team ${teamAbbr}`);
      return {
        name: player.name,
        position: position,
        team: teamAbbr
      };
    } else {
      console.log(`❌ No player found in position ${position} for team ${teamAbbr}`);
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