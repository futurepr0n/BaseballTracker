import React, { useState, useEffect, useCallback } from 'react';
import hellraiserAnalysisService from '../../services/hellraiserAnalysisService';
import { fetchPlayerData, fetchGameData, fetchTeamData } from '../../services/dataService';
import { useTeamFilter } from '../TeamFilterContext';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard, { GlassScrollableContainer } from './GlassCard/GlassCard';
import { getPlayerDisplayName, getTeamDisplayName } from '../../utils/playerNameUtils';
import './StrategicIntelligenceCard.css';

const StrategicIntelligenceCard = ({ currentDate, playerData, gameData, teamData, rollingStats, topPerformers, poorPerformancePredictions, positiveMomentumPredictions }) => {
  const [strategicIntelligence, setStrategicIntelligence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'netScore', direction: 'desc' });
  const [viewMode, setViewMode] = useState('opportunities'); // 'opportunities', 'risks', 'all'
  const [expandedFactors, setExpandedFactors] = useState({}); // Track which players have expanded factors
  const [rosterData, setRosterData] = useState([]);
  const [streakAnalysisData, setStreakAnalysisData] = useState(null);
  const [leagueStandings, setLeagueStandings] = useState(null); // Unfiltered league data
  
  const { selectedTeam, includeMatchup, matchupTeam } = useTeamFilter();
  const { themeMode } = useTheme();

  // Load roster data for name mapping
  useEffect(() => {
    const loadRosterData = async () => {
      try {
        const response = await fetch('/data/rosters.json');
        if (response.ok) {
          const rosters = await response.json();
          setRosterData(rosters);
        }
      } catch (err) {
        console.error('Error loading roster data:', err);
      }
    };
    loadRosterData();
  }, []);

  // Load streak analysis data (same as Dashboard)
  useEffect(() => {
    const loadStreakAnalysisData = async () => {
      try {
        if (!currentDate) return;
        
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Try to load specific date first
        let response = await fetch(`/data/predictions/hit_streak_analysis_${dateStr}.json`);
        
        // If not found, try latest
        if (!response.ok) {
          response = await fetch('/data/predictions/hit_streak_analysis_latest.json');
        }
        
        if (response.ok) {
          const streakData = await response.json();
          setStreakAnalysisData(streakData);
          console.log('🎯 Loaded streak analysis data:', {
            hitStreaks: streakData.hitStreaks?.length || 0,
            likelyToContinueStreak: streakData.likelyToContinueStreak?.length || 0
          });
        } else {
          console.warn('No hit streak analysis data found');
          setStreakAnalysisData(null);
        }
      } catch (err) {
        console.error('Error loading streak analysis data:', err);
        setStreakAnalysisData(null);
      }
    };
    loadStreakAnalysisData();
  }, [currentDate]);

  // Load unfiltered league standings for true league rankings
  useEffect(() => {
    const loadLeagueStandings = async () => {
      try {
        if (!currentDate) return;
        
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Try to load unfiltered rolling stats (same logic as Dashboard but without filtering)
        let response = await fetch(`/data/rolling_stats/rolling_stats_season_${dateStr}.json`);
        
        if (!response.ok) {
          response = await fetch('/data/rolling_stats/rolling_stats_season_latest.json');
        }
        
        if (response.ok) {
          const data = await response.json();
          setLeagueStandings({
            hitters: data.topHitters || [],
            homers: data.topHRLeaders || [],
            // Also include player performance data if available
            hrRate: data.topHRRate || [],
            recent: data.recentPerformers || []
          });
          console.log('🎯 Loaded league standings:', {
            hitters: (data.topHitters || []).length,
            homers: (data.topHRLeaders || []).length
          });
        } else {
          console.warn('No league standings data found');
          setLeagueStandings(null);
        }
      } catch (err) {
        console.error('Error loading league standings:', err);
        setLeagueStandings(null);
      }
    };
    loadLeagueStandings();
  }, [currentDate]);

  // Helper function to find player using multiple name formats
  const findPlayerByName = (playerName, team, playerDataArray) => {
    if (!playerDataArray || !Array.isArray(playerDataArray)) return null;
    
    // Try exact match first (both name formats)
    let player = playerDataArray.find(p => 
      (p.name && p.name.toLowerCase() === playerName.toLowerCase()) ||
      (p.Name && p.Name.toLowerCase() === playerName.toLowerCase())
    );
    
    if (player) return player;
    
    // Try using roster mapping (hellraiser uses "Aaron Judge", roster has "A. Judge" -> "Aaron Judge")
    if (rosterData.length > 0) {
      const rosterEntry = rosterData.find(r => 
        r.fullName && r.fullName.toLowerCase() === playerName.toLowerCase() && 
        r.team === team
      );
      
      if (rosterEntry) {
        // Look for player using roster "name" format (e.g., "A. Judge")
        player = playerDataArray.find(p => 
          (p.name && p.name.toLowerCase() === rosterEntry.name.toLowerCase()) ||
          (p.Name && p.Name.toLowerCase() === rosterEntry.name.toLowerCase())
        );
        
        if (player) {
          console.log(`🎯 Mapped ${playerName} -> ${rosterEntry.name} -> Found player data`);
          return player;
        }
      }
    }
    
    // Try partial name matching (last name only)
    const lastName = playerName.split(' ').pop();
    if (lastName && lastName.length > 3) {
      player = playerDataArray.find(p => {
        const pName = p.name || p.Name || '';
        return pName.toLowerCase().includes(lastName.toLowerCase());
      });
      
      if (player) {
        console.log(`🎯 Partial match ${playerName} -> ${player.name || player.Name} (by last name)`);
        return player;
      }
    }
    
    console.log(`🎯 No player match found for: ${playerName} (${team})`);
    return null;
  };

  // Helper function to check if player is in top performance rankings
  const findPlayerRankings = (playerName, team) => {
    const rankings = [];
    
    // Convert hellraiser name to roster format for matching
    let searchName = playerName;
    if (rosterData.length > 0) {
      const rosterEntry = rosterData.find(r => 
        r.fullName && r.fullName.toLowerCase() === playerName.toLowerCase() && 
        r.team === team
      );
      if (rosterEntry) {
        searchName = rosterEntry.name; // Use "A. Judge" format
      }
    }
    
    // Helper function to find player in a dataset
    const findPlayerInDataset = (dataset, playerName, searchName, team) => {
      if (!dataset || !Array.isArray(dataset)) return -1;
      return dataset.findIndex(p => 
        (p.name && (
          p.name.toLowerCase() === searchName.toLowerCase() || 
          p.name.toLowerCase() === playerName.toLowerCase()
        )) && p.team === team
      );
    };
    
    // 1. CHECK LEAGUE RANKINGS (using unfiltered data)
    let leagueHitterRank = -1;
    let leagueHomerRank = -1;
    
    if (leagueStandings) {
      leagueHitterRank = findPlayerInDataset(leagueStandings.hitters, playerName, searchName, team);
      leagueHomerRank = findPlayerInDataset(leagueStandings.homers, playerName, searchName, team);
    }
    
    // 2. CHECK TEAM/FILTERED RANKINGS (using filtered data from Dashboard)
    let teamHitterRank = -1;
    let teamHomerRank = -1;
    
    if (rollingStats) {
      teamHitterRank = findPlayerInDataset(rollingStats.hitters, playerName, searchName, team);
      teamHomerRank = findPlayerInDataset(rollingStats.homers, playerName, searchName, team);
    }
    
    // 3. DETERMINE CONTEXT LABELS
    const getContextLabel = () => {
      if (!selectedTeam) return 'League';
      if (includeMatchup && matchupTeam) return 'Matchup';
      return 'Team';
    };
    
    const contextLabel = getContextLabel();
    const isFiltered = selectedTeam !== null;
    
    // 4. PROCESS HITTER RANKINGS
    if (leagueHitterRank !== -1 || teamHitterRank !== -1) {
      let label = '';
      let description = '';
      let score = 0;
      let impact = 'medium';
      
      if (leagueHitterRank !== -1) {
        // Player is a league leader
        const leaguePos = leagueHitterRank + 1;
        const teamPos = teamHitterRank !== -1 ? teamHitterRank + 1 : null;
        
        // Base league score
        if (leaguePos <= 5) {
          score = 15;
          impact = 'high';
        } else if (leaguePos <= 10) {
          score = 12;
          impact = 'high';
        } else if (leaguePos <= 15) {
          score = 10;
          impact = 'medium';
        } else {
          score = 8;
          impact = 'medium';
        }
        
        // Team rank bonus (1-5 points)
        if (teamPos && teamPos <= 5) {
          score += Math.max(1, 6 - teamPos);
        }
        
        // Create label
        if (isFiltered && teamPos) {
          label = `Top Hitter (League #${leaguePos}, ${contextLabel} #${teamPos})`;
          description = `Elite league performer (#${leaguePos} overall, #${teamPos} in ${contextLabel.toLowerCase()})`;
        } else {
          label = `Top Hitter (League #${leaguePos})`;
          description = `Ranked #${leaguePos} among all MLB hitters - elite offensive production`;
        }
        
      } else if (teamHitterRank !== -1) {
        // Player is only a team/filtered leader, not league
        const teamPos = teamHitterRank + 1;
        
        if (contextLabel === 'Team') {
          if (teamPos <= 3) {
            score = 15 - ((teamPos - 1) * 2); // 15, 13, 11 for positions 1, 2, 3
            impact = teamPos === 1 ? 'high' : 'medium';
          } else {
            score = 8;
            impact = 'medium';
          }
          label = `Top Hitter (Team #${teamPos})`;
          description = `Team's #${teamPos} hitter - key offensive contributor`;
        } else if (contextLabel === 'Matchup') {
          score = Math.max(6, 12 - (teamPos * 2)); // 12, 10, 8, 6 for positions 1, 2, 3, 4+
          impact = teamPos <= 2 ? 'medium' : 'low';
          label = `Top Hitter (Matchup #${teamPos})`;
          description = `#${teamPos} hitter in today's matchup - strong offensive option`;
        }
      }
      
      if (score > 0) {
        rankings.push({
          category: 'Elite Performance',
          factor: label,
          description,
          impact,
          confidence: 85,
          score,
          type: 'opportunity'
        });
      }
    }
    
    // 5. PROCESS HOME RUN RANKINGS
    if (leagueHomerRank !== -1 || teamHomerRank !== -1) {
      let label = '';
      let description = '';
      let score = 0;
      let impact = 'medium';
      
      if (leagueHomerRank !== -1) {
        // Player is a league leader
        const leaguePos = leagueHomerRank + 1;
        const teamPos = teamHomerRank !== -1 ? teamHomerRank + 1 : null;
        
        // Base league score (higher for HR leaders)
        if (leaguePos <= 5) {
          score = 18;
          impact = 'high';
        } else if (leaguePos <= 10) {
          score = 15;
          impact = 'high';
        } else if (leaguePos <= 15) {
          score = 12;
          impact = 'medium';
        } else {
          score = 10;
          impact = 'medium';
        }
        
        // Team rank bonus (1-5 points)
        if (teamPos && teamPos <= 5) {
          score += Math.max(1, 6 - teamPos);
        }
        
        // Create label
        if (isFiltered && teamPos) {
          label = `Home Run Leader (League #${leaguePos}, ${contextLabel} #${teamPos})`;
          description = `Elite power producer (#${leaguePos} in MLB, #${teamPos} in ${contextLabel.toLowerCase()})`;
        } else {
          label = `Home Run Leader (League #${leaguePos})`;
          description = `Ranked #${leaguePos} among all MLB home run leaders - elite power threat`;
        }
        
      } else if (teamHomerRank !== -1) {
        // Player is only a team/filtered leader, not league
        const teamPos = teamHomerRank + 1;
        
        if (contextLabel === 'Team') {
          if (teamPos <= 3) {
            score = 18 - ((teamPos - 1) * 3); // 18, 15, 12 for positions 1, 2, 3
            impact = teamPos === 1 ? 'high' : 'medium';
          } else {
            score = 10;
            impact = 'medium';
          }
          label = `Home Run Leader (Team #${teamPos})`;
          description = `Team's #${teamPos} power hitter - primary threat for deep balls`;
        } else if (contextLabel === 'Matchup') {
          score = Math.max(8, 15 - (teamPos * 2)); // 15, 13, 11, 9, 8 for positions 1, 2, 3, 4, 5+
          impact = teamPos <= 2 ? 'medium' : 'low';
          label = `Home Run Leader (Matchup #${teamPos})`;
          description = `#${teamPos} power threat in today's matchup - significant HR potential`;
        }
      }
      
      if (score > 0) {
        rankings.push({
          category: 'Power Production',
          factor: label,
          description,
          impact,
          confidence: 90,
          score,
          type: 'opportunity'
        });
      }
    }
    
    // 6. CHECK OTHER PERFORMANCE CATEGORIES (HR Rate, Recent Form)
    if (topPerformers) {
      // HR Rate leaders (these are typically league-wide)
      if (topPerformers.hrRate) {
        const hrRateRank = findPlayerInDataset(topPerformers.hrRate, playerName, searchName, team);
        if (hrRateRank !== -1 && hrRateRank < 15) {
          rankings.push({
            category: 'Elite Efficiency',
            factor: `HR Rate Leader (League #${hrRateRank + 1})`,
            description: `Elite home run efficiency - optimal HR/AB ratio`,
            impact: 'high',
            confidence: 85,
            score: 13,
            type: 'opportunity'
          });
        }
      }
      
      // Recent form leaders
      if (topPerformers.recent) {
        const recentRank = findPlayerInDataset(topPerformers.recent, playerName, searchName, team);
        if (recentRank !== -1 && recentRank < 10) {
          rankings.push({
            category: 'Recent Form',
            factor: `Recent Performance Leader (#${recentRank + 1})`,
            description: `Exceptional recent production - trending upward`,
            impact: 'high',
            confidence: 80,
            score: 11,
            type: 'opportunity'
          });
        }
      }
    }
    
    return rankings;
  };

  // Helper function to find player in streak analysis data
  const findPlayerInStreakData = (playerName, team) => {
    if (!streakAnalysisData) return null;
    
    // First try to convert hellraiser name to roster format using roster mapping
    if (rosterData.length > 0) {
      const rosterEntry = rosterData.find(r => 
        r.fullName && r.fullName.toLowerCase() === playerName.toLowerCase() && 
        r.team === team
      );
      
      if (rosterEntry) {
        // Look for player in all streak arrays using roster "name" format (e.g., "S. Steer")
        const streakArrays = [
          streakAnalysisData.hitStreaks || [],
          streakAnalysisData.likelyToContinueStreak || [],
          streakAnalysisData.likelyToGetHit || [],
          streakAnalysisData.noHitStreaks || []
        ];
        
        for (const array of streakArrays) {
          const found = array.find(p => 
            p.name && p.name.toLowerCase() === rosterEntry.name.toLowerCase() &&
            p.team === team
          );
          if (found) {
            console.log(`🎯 Found streak data for ${playerName} -> ${rosterEntry.name}:`, {
              currentStreak: found.currentStreak,
              isHitStreak: found.isHitStreak,
              inContinueStreak: streakAnalysisData.likelyToContinueStreak?.includes(found),
              inHitStreaks: streakAnalysisData.hitStreaks?.includes(found)
            });
            return found;
          }
        }
      }
    }
    
    return null;
  };

  // Helper function to check if player is in Poor Performance predictions
  const checkPoorPerformancePrediction = (playerName, team) => {
    if (!poorPerformancePredictions || !Array.isArray(poorPerformancePredictions)) return null;
    
    // Try different name formats for matching
    return poorPerformancePredictions.find(prediction => {
      if (!prediction.playerName || prediction.team !== team) return false;
      
      // Direct match
      if (prediction.playerName.toLowerCase() === playerName.toLowerCase()) return true;
      
      // Try roster name mapping (hellraiser "Aaron Judge" -> roster "A. Judge")
      if (rosterData.length > 0) {
        const rosterEntry = rosterData.find(r => 
          r.fullName && r.fullName.toLowerCase() === playerName.toLowerCase() && 
          r.team === team
        );
        if (rosterEntry && prediction.playerName.toLowerCase() === rosterEntry.name.toLowerCase()) {
          return true;
        }
      }
      
      return false;
    });
  };

  // Helper function to check if player is in Positive Momentum predictions
  const checkPositiveMomentumPrediction = (playerName, team) => {
    if (!positiveMomentumPredictions || !Array.isArray(positiveMomentumPredictions)) return null;
    
    // Try different name formats for matching
    return positiveMomentumPredictions.find(prediction => {
      if (!prediction.playerName || prediction.team !== team) return false;
      
      // Direct match
      if (prediction.playerName.toLowerCase() === playerName.toLowerCase()) return true;
      
      // Try roster name mapping (hellraiser "Aaron Judge" -> roster "A. Judge")
      if (rosterData.length > 0) {
        const rosterEntry = rosterData.find(r => 
          r.fullName && r.fullName.toLowerCase() === playerName.toLowerCase() && 
          r.team === team
        );
        if (rosterEntry && prediction.playerName.toLowerCase() === rosterEntry.name.toLowerCase()) {
          return true;
        }
      }
      
      return false;
    });
  };

  const loadStrategicIntelligence = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert currentDate to YYYY-MM-DD format
      let analyzeDate;
      if (currentDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        analyzeDate = `${year}-${month}-${day}`;
      } else {
        analyzeDate = new Date().toISOString().split('T')[0];
      }
      
      // Get team filter parameters
      const teamFilter = selectedTeam && includeMatchup ? [selectedTeam, matchupTeam] : selectedTeam ? [selectedTeam] : null;
      
      // Load hellraiser analysis for swing path and barrel data
      const hellraiserAnalysis = await hellraiserAnalysisService.analyzeDay(analyzeDate, teamFilter);
      
      if (hellraiserAnalysis.error && (!hellraiserAnalysis.picks || !Array.isArray(hellraiserAnalysis.picks))) {
        setError(hellraiserAnalysis.error);
        return;
      }
      
      // Load additional data for comprehensive analysis - use recent dates with actual game data
      const loadHistoricalData = async () => {
        const today = new Date(analyzeDate);
        const dataAttempts = [];
        
        // Try to get data from the last 5 days (games may have been played)
        for (let i = 1; i <= 5; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          const dateStr = checkDate.toISOString().split('T')[0];
          dataAttempts.push(dateStr);
        }
        
        console.log('🎯 Attempting to load player/game data from dates:', dataAttempts);
        
        let bestPlayerData = playerData || [];
        let bestGameData = gameData || [];
        
        for (const dateStr of dataAttempts) {
          try {
            const [dayPlayerData, dayGameData] = await Promise.all([
              fetchPlayerData(dateStr).catch(() => []),
              fetchGameData(dateStr).catch(() => [])
            ]);
            
            // Use the first date that has actual player data
            if (dayPlayerData && Array.isArray(dayPlayerData) && dayPlayerData.length > 0) {
              console.log(`🎯 Found player data for ${dateStr}: ${dayPlayerData.length} players`);
              bestPlayerData = dayPlayerData;
              bestGameData = dayGameData || [];
              break;
            }
          } catch (err) {
            console.log(`🎯 No data for ${dateStr}`);
          }
        }
        
        return [bestPlayerData, bestGameData];
      };
      
      const [todaysPlayerData, todaysGameData] = await loadHistoricalData();
      
      // Debug logging to understand data structure
      console.log('🎯 Strategic Intelligence Debug:', {
        hellraiserPicks: (hellraiserAnalysis.picks || []).length,
        playerData: (todaysPlayerData || playerData || []).length,
        gameData: (todaysGameData || gameData || []).length,
        teamData: teamData,
        teamDataType: typeof teamData,
        teamDataIsArray: Array.isArray(teamData)
      });
      
      // Process strategic intelligence with safe fallbacks
      const intelligence = await processStrategicIntelligence(
        hellraiserAnalysis.picks || [],
        todaysPlayerData || playerData || [],
        todaysGameData || gameData || [],
        (Array.isArray(teamData) ? teamData : [])
      );
      
      setStrategicIntelligence(intelligence);
    } catch (err) {
      console.error('Error loading Strategic Intelligence:', err);
      setError('Failed to load Strategic Intelligence: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentDate, selectedTeam, includeMatchup, matchupTeam, playerData, gameData, teamData, rosterData, streakAnalysisData, rollingStats, topPerformers, leagueStandings, poorPerformancePredictions, positiveMomentumPredictions]);

  useEffect(() => {
    loadStrategicIntelligence();
  }, [loadStrategicIntelligence]);

  // Reset expanded factors when view mode changes
  useEffect(() => {
    setExpandedFactors({});
  }, [viewMode]);

  const processStrategicIntelligence = async (hellraiserPicks, players, games, teams) => {
    const intelligence = [];
    
    // Ensure data is in expected format
    const safeHellraiserPicks = Array.isArray(hellraiserPicks) ? hellraiserPicks : [];
    const safePlayers = Array.isArray(players) ? players : [];
    const safeGames = Array.isArray(games) ? games : [];
    const safeTeams = Array.isArray(teams) ? teams : [];
    
    for (const pick of safeHellraiserPicks) {
      // Find corresponding player data using enhanced name matching
      const playerInfo = findPlayerByName(pick.playerName, pick.team, safePlayers);
      
      // Check if player is in top performance rankings
      const playerRankings = findPlayerRankings(pick.playerName, pick.team);
      
      // Find team data - handle different possible team data structures
      let teamInfo = null;
      if (safeTeams.length > 0) {
        teamInfo = safeTeams.find(t => 
          (t.abbreviation === pick.team) || 
          (t.name === pick.team) ||
          (t.code === pick.team) ||
          (t.abbr === pick.team)
        );
      }
      
      // Analyze opportunities and risks
      const opportunities = [];
      const risks = [];
      let opportunityScore = 0;
      let riskScore = 0;
      
      // 1. SWING PATH & BARREL ANALYSIS
      if (pick.swing_bat_speed && pick.swing_attack_angle !== undefined) {
        const attackAngle = pick.swing_attack_angle;
        const batSpeed = pick.swing_bat_speed;
        const swingScore = pick.swing_optimization_score || 0;
        
        if (attackAngle >= 8 && attackAngle <= 17 && batSpeed >= 72) {
          opportunities.push({
            category: 'Launch Mechanics',
            factor: 'Elite Launch Angle',
            description: `Perfect swing path (${attackAngle.toFixed(1)}°) with strong bat speed (${batSpeed.toFixed(1)} mph)`,
            impact: 'high',
            confidence: 90
          });
          opportunityScore += 15;
        } else if (attackAngle >= 5 && attackAngle <= 20 && batSpeed >= 69) {
          opportunities.push({
            category: 'Launch Mechanics',
            factor: 'Optimal Launch Angle',
            description: `Good swing path (${attackAngle.toFixed(1)}°) with decent bat speed (${batSpeed.toFixed(1)} mph)`,
            impact: 'medium',
            confidence: 75
          });
          opportunityScore += 10;
        } else {
          // Add risk for poor swing mechanics
          if (attackAngle < 3 || attackAngle > 25) {
            risks.push({
              category: 'Launch Mechanics',
              factor: 'Poor Launch Angle',
              description: `Problematic swing path (${attackAngle.toFixed(1)}°) - too flat or too steep for power`,
              impact: 'medium',
              confidence: 80
            });
            riskScore += 10;
          }
          
          if (batSpeed < 67) {
            risks.push({
              category: 'Swing Mechanics',
              factor: 'Low Bat Speed',
              description: `Below-average bat speed (${batSpeed.toFixed(1)} mph) limits power potential`,
              impact: 'medium',
              confidence: 75
            });
            riskScore += 8;
          }
        }
        
        if (swingScore >= 85) {
          opportunities.push({
            category: 'Swing Optimization',
            factor: 'Elite Swing Path',
            description: `Exceptional swing optimization score (${swingScore})`,
            impact: 'high',
            confidence: 85
          });
          opportunityScore += 12;
        } else if (swingScore < 50) {
          risks.push({
            category: 'Swing Optimization',
            factor: 'Poor Swing Path',
            description: `Low swing optimization score (${swingScore}) indicates mechanical issues`,
            impact: 'high',
            confidence: 80
          });
          riskScore += 12;
        }
      } else {
        // Add risk for missing swing data
        risks.push({
          category: 'Data Limitation',
          factor: 'No Swing Data',
          description: 'Missing swing path analysis - increased uncertainty in power assessment',
          impact: 'low',
          confidence: 60
        });
        riskScore += 4;
      }
      
      // 1.5. ELITE PERFORMANCE RANKINGS
      playerRankings.forEach(ranking => {
        if (ranking.type === 'opportunity') {
          opportunities.push({
            category: ranking.category,
            factor: ranking.factor,
            description: ranking.description,
            impact: ranking.impact,
            confidence: ranking.confidence
          });
          opportunityScore += ranking.score;
          
          console.log(`🎯 Found ranking for ${pick.playerName}: ${ranking.factor} (+${ranking.score} points)`);
        }
      });
      
      // 2. STREAK ANALYSIS (using processed streak data)
      const streakInfo = findPlayerInStreakData(pick.playerName, pick.team);
      
      if (streakInfo) {
        // Active hit streak analysis
        if (streakInfo.isHitStreak && streakInfo.currentStreak >= 5) {
          if (streakInfo.currentStreak >= 10) {
            opportunities.push({
              category: 'Hot Streak',
              factor: 'Extended Hit Streak',
              description: `${streakInfo.currentStreak}-game hit streak - riding strong momentum`,
              impact: 'high',
              confidence: 85
            });
            opportunityScore += 15;
          } else if (streakInfo.currentStreak >= 7) {
            opportunities.push({
              category: 'Hot Streak', 
              factor: 'Active Hit Streak',
              description: `${streakInfo.currentStreak}-game hit streak - consistent hitting`,
              impact: 'medium',
              confidence: 80
            });
            opportunityScore += 12;
          } else {
            opportunities.push({
              category: 'Hot Streak',
              factor: 'Building Momentum',
              description: `${streakInfo.currentStreak}-game hit streak - gaining confidence`,
              impact: 'medium',
              confidence: 75
            });
            opportunityScore += 8;
          }
        }
        
        // Likely to continue streak analysis
        const isLikelyContinue = streakAnalysisData?.likelyToContinueStreak?.some(p => 
          p.name === streakInfo.name && p.team === streakInfo.team
        );
        
        if (isLikelyContinue) {
          opportunities.push({
            category: 'Streak Continuation',
            factor: 'Streak Likely to Continue',
            description: `Analytics suggest high probability of extending current ${streakInfo.currentStreak}-game streak`,
            impact: 'high',
            confidence: 80
          });
          opportunityScore += 13;
        }
        
        // Cold streak analysis (risk)
        if (!streakInfo.isHitStreak && streakInfo.currentStreak >= 3) {
          if (streakInfo.currentStreak >= 5) {
            risks.push({
              category: 'Cold Streak',
              factor: 'Extended Slump',
              description: `${streakInfo.currentStreak}-game hitless streak - concerning form`,
              impact: 'high',
              confidence: 80
            });
            riskScore += 15;
          } else {
            // Shorter cold streak might be bounce back opportunity
            opportunities.push({
              category: 'Bounce Back',
              factor: 'Due for Hit',
              description: `${streakInfo.currentStreak}-game hitless streak - due for positive regression`,
              impact: 'medium',
              confidence: 65
            });
            opportunityScore += 8;
          }
        }
        
      } else if (playerInfo) {
        // Fallback to basic analysis if no streak data but have player info
        const seasonAvg = playerInfo.AVG || 0;
        if (seasonAvg < 0.220) {
          risks.push({
            category: 'Season Performance',
            factor: 'Poor Season Average',
            description: `Low season batting average (${(seasonAvg * 1000).toFixed(0)}) indicates struggles`,
            impact: 'medium',
            confidence: 85
          });
          riskScore += 8;
        }
      } else {
        // No streak data or player info = risk
        risks.push({
          category: 'Data Limitation',
          factor: 'No Streak Analysis',
          description: 'Missing streak analysis data - cannot assess current form',
          impact: 'medium',
          confidence: 70
        });
        riskScore += 6;
      }
      
      // 3. PITCHER VULNERABILITY ANALYSIS
      const reasoning = pick.reasoning || '';
      
      // Extract pitcher metrics
      const pitcherHRRateMatch = reasoning.match(/(?:High|Moderate) HR rate allowed \(([0-9.]+)\/game\)/);
      const lowHRRateMatch = reasoning.match(/(?:Low|Very low) HR rate allowed \(([0-9.]+)\/game\)/);
      
      if (pitcherHRRateMatch) {
        const hrRate = parseFloat(pitcherHRRateMatch[1]);
        if (hrRate >= 1.5) {
          opportunities.push({
            category: 'Pitcher Vulnerability',
            factor: 'HR-Prone Pitcher',
            description: `Pitcher allows ${hrRate.toFixed(2)} HR/game - highly vulnerable`,
            impact: 'high',
            confidence: 85
          });
          opportunityScore += 14;
        } else if (hrRate >= 1.0) {
          opportunities.push({
            category: 'Pitcher Vulnerability',
            factor: 'Moderate HR Vulnerability',
            description: `Pitcher allows ${hrRate.toFixed(2)} HR/game - exploitable`,
            impact: 'medium',
            confidence: 75
          });
          opportunityScore += 10;
        }
      } else if (lowHRRateMatch) {
        const hrRate = parseFloat(lowHRRateMatch[1]);
        if (hrRate <= 0.5) {
          risks.push({
            category: 'Pitcher Strength',
            factor: 'Dominant Pitcher',
            description: `Pitcher allows only ${hrRate.toFixed(2)} HR/game - very tough matchup`,
            impact: 'high',
            confidence: 85
          });
          riskScore += 15;
        } else if (hrRate <= 0.8) {
          risks.push({
            category: 'Pitcher Strength',
            factor: 'Strong Pitcher',
            description: `Pitcher allows only ${hrRate.toFixed(2)} HR/game - difficult matchup`,
            impact: 'medium',
            confidence: 75
          });
          riskScore += 10;
        }
      } else {
        // No clear pitcher data = risk
        risks.push({
          category: 'Matchup Uncertainty',
          factor: 'Unknown Pitcher Profile',
          description: 'Insufficient pitcher analysis - unclear power matchup',
          impact: 'medium',
          confidence: 60
        });
        riskScore += 7;
      }
      
      // Pitcher contact vulnerability
      if (reasoning.includes('Pitcher allows hard contact') || reasoning.includes('Pitcher vulnerable to barrels')) {
        opportunities.push({
          category: 'Pitcher Vulnerability',
          factor: 'Contact Quality Vulnerable',
          description: 'Pitcher struggles with hard contact and barrel prevention',
          impact: 'medium',
          confidence: 70
        });
        opportunityScore += 8;
      } else if (reasoning.includes('Pitcher limits hard contact') || reasoning.includes('Pitcher dominates') || reasoning.includes('Elite pitcher')) {
        risks.push({
          category: 'Pitcher Strength',
          factor: 'Elite Pitcher Matchup',
          description: 'Pitcher has strong track record limiting hard contact and power',
          impact: 'high',
          confidence: 80
        });
        riskScore += 12;
      }
      
      // 4. TEAM SITUATIONAL FACTORS
      // Add default team performance risks based on common patterns
      if (pick.confidenceScore < 60) {
        risks.push({
          category: 'Model Confidence',
          factor: 'Low Confidence Pick',
          description: `Model shows only ${pick.confidenceScore}% confidence - high uncertainty`,
          impact: 'medium',
          confidence: 75
        });
        riskScore += 8;
      }
      
      // Find recent team performance
      if (safeGames.length > 0) {
        const teamGames = safeGames.filter(g => 
          g.homeTeam === pick.team || g.awayTeam === pick.team
        ).slice(0, 5); // Last 5 games
        
        if (teamGames.length >= 3) {
          const recentWins = teamGames.reduce((acc, game) => {
            const won = (game.homeTeam === pick.team && game.homeScore > game.awayScore) ||
                       (game.awayTeam === pick.team && game.awayScore > game.homeScore);
            return acc + (won ? 1 : 0);
          }, 0);
          
          if (recentWins >= 4) {
            opportunities.push({
              category: 'Team Momentum',
              factor: 'Hot Team',
              description: `Team won ${recentWins} of last ${teamGames.length} games - offensive confidence high`,
              impact: 'medium',
              confidence: 70
            });
            opportunityScore += 7;
          } else if (recentWins <= 1) {
            risks.push({
              category: 'Team Struggles',
              factor: 'Cold Team',
              description: `Team lost ${teamGames.length - recentWins} of last ${teamGames.length} games - offensive struggles`,
              impact: 'medium',
              confidence: 65
            });
            riskScore += 8;
          }
        }
      } else {
        // Fallback: Add risk for unknown team performance
        risks.push({
          category: 'Data Uncertainty',
          factor: 'Limited Team Data',
          description: 'Insufficient recent team performance data for analysis',
          impact: 'low',
          confidence: 50
        });
        riskScore += 3;
      }
      
      // 5. VENUE ANALYSIS
      const venue = pick.venue || '';
      const hittersParks = ['Yankee Stadium', 'Coors Field', 'Fenway Park', 'Camden Yards', 'Minute Maid Park', 'Globe Life Field'];
      const pitchersParks = ['Petco Park', 'Marlins Park', 'Tropicana Field', 'Oakland Coliseum'];
      
      if (hittersParks.some(park => venue.includes(park))) {
        opportunities.push({
          category: 'Venue',
          factor: 'Hitter-Friendly Park',
          description: `Playing at ${venue} - known for offensive production`,
          impact: 'medium',
          confidence: 75
        });
        opportunityScore += 6;
      } else if (pitchersParks.some(park => venue.includes(park))) {
        risks.push({
          category: 'Venue',
          factor: 'Pitcher-Friendly Park',
          description: `Playing at ${venue} - suppresses offensive numbers`,
          impact: 'medium',
          confidence: 75
        });
        riskScore += 7;
      }
      
      // 6. CONFIDENCE & MARKET ANALYSIS
      if (pick.confidenceScore >= 90) {
        opportunities.push({
          category: 'Model Confidence',
          factor: 'High Confidence Pick',
          description: `Model shows ${pick.confidenceScore}% confidence - strong analytical backing`,
          impact: 'high',
          confidence: 95
        });
        opportunityScore += 10;
      }
      
      if (pick.marketEfficiency && pick.marketEfficiency.edge > 0.05) {
        opportunities.push({
          category: 'Market Value',
          factor: 'Positive Market Edge',
          description: `${(pick.marketEfficiency.edge * 100).toFixed(1)}% positive edge - market undervalues`,
          impact: 'medium',
          confidence: 80
        });
        opportunityScore += 8;
      } else if (pick.marketEfficiency && pick.marketEfficiency.edge < -0.05) {
        // Lowered threshold from -0.1 to -0.05 to catch more risks
        risks.push({
          category: 'Market Value',
          factor: 'Negative Market Edge',
          description: `${Math.abs(pick.marketEfficiency.edge * 100).toFixed(1)}% negative edge - market overvalues`,
          impact: pick.marketEfficiency.edge < -0.1 ? 'high' : 'medium',
          confidence: 85
        });
        riskScore += pick.marketEfficiency.edge < -0.1 ? 12 : 8;
      } else if (!pick.marketEfficiency) {
        // No market data = risk
        risks.push({
          category: 'Market Analysis',
          factor: 'No Market Data',
          description: 'Missing market efficiency analysis - pricing uncertainty',
          impact: 'low',
          confidence: 60
        });
        riskScore += 4;
      }
      
      // 7. POOR PERFORMANCE AND POSITIVE MOMENTUM DETECTION
      // Check if player is in Poor Performance predictions
      const poorPerformancePrediction = checkPoorPerformancePrediction(pick.playerName, pick.team);
      if (poorPerformancePrediction) {
        const riskLevel = poorPerformancePrediction.riskLevel || 'MEDIUM';
        const totalRiskScore = poorPerformancePrediction.totalRiskScore || 0;
        
        risks.push({
          category: 'Performance Risk',
          factor: 'Poor Performance Alert',
          description: `${riskLevel} risk player (${totalRiskScore} risk points) - concerning recent patterns identified`,
          impact: riskLevel === 'HIGH' ? 'high' : riskLevel === 'MEDIUM' ? 'medium' : 'low',
          confidence: 85
        });
        
        // Scale risk score based on risk level
        if (riskLevel === 'HIGH') {
          riskScore += 15;
        } else if (riskLevel === 'MEDIUM') {
          riskScore += 10;
        } else {
          riskScore += 6;
        }
      }
      
      // Check if player is in Positive Momentum predictions
      const positiveMomentumPrediction = checkPositiveMomentumPrediction(pick.playerName, pick.team);
      if (positiveMomentumPrediction) {
        const momentumLevel = positiveMomentumPrediction.momentumLevel || 'MEDIUM';
        const totalPositiveScore = positiveMomentumPrediction.totalPositiveScore || 0;
        
        opportunities.push({
          category: 'Positive Momentum',
          factor: 'Momentum Alert',
          description: `${momentumLevel} momentum player (${totalPositiveScore} positive points) - favorable trends identified`,
          impact: momentumLevel === 'HIGH' ? 'high' : momentumLevel === 'MEDIUM' ? 'medium' : 'low',
          confidence: 85
        });
        
        // Scale opportunity score based on momentum level
        if (momentumLevel === 'HIGH') {
          opportunityScore += 12;
        } else if (momentumLevel === 'MEDIUM') {
          opportunityScore += 8;
        } else {
          opportunityScore += 5;
        }
      }
      
      // Calculate net opportunity score
      const netScore = opportunityScore - riskScore;
      
      // Debug logging for first few players
      if (intelligence.length < 3) {
        console.log(`🎯 Player: ${pick.playerName}, Opportunities: ${opportunities.length}, Risks: ${risks.length}, OpportunityScore: ${opportunityScore}, RiskScore: ${riskScore}, NetScore: ${netScore}`);
      }
      
      // Determine overall assessment
      let assessment = '';
      let assessmentColor = '';
      if (netScore >= 40) {
        assessment = 'Elite Opportunity';
        assessmentColor = '#2E7D32';
      } else if (netScore >= 25) {
        assessment = 'Strong Opportunity';
        assessmentColor = '#4CAF50';
      } else if (netScore >= 15) {
        assessment = 'Good Opportunity';
        assessmentColor = '#66BB6A';
      } else if (netScore >= 5) {
        assessment = 'Moderate Opportunity';
        assessmentColor = '#FFC107';
      } else if (netScore >= -10) {
        assessment = 'Neutral';
        assessmentColor = '#FF9800';
      } else {
        assessment = 'High Risk';
        assessmentColor = '#F44336';
      }
      
      intelligence.push({
        ...pick,
        opportunities,
        risks,
        opportunityScore,
        riskScore,
        netScore,
        assessment,
        assessmentColor,
        totalFactors: opportunities.length + risks.length
      });
    }
    
    return intelligence.sort((a, b) => b.netScore - a.netScore);
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key] || 0;
      let bValue = b[sortConfig.key] || 0;
      
      if (aValue === bValue) return 0;
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const getSortIndicator = (column) => {
    if (sortConfig.key !== column) return '↕️';
    return sortConfig.direction === 'desc' ? '↓' : '↑';
  };

  const toggleFactorExpansion = (playerIndex) => {
    setExpandedFactors(prev => ({
      ...prev,
      [playerIndex]: !prev[playerIndex]
    }));
  };

  const getFilteredData = () => {
    console.log('🎯 Filtering data:', { 
      viewMode, 
      totalPlayers: strategicIntelligence.length,
      opportunities: strategicIntelligence.filter(p => p.netScore > 0).length,
      risks: strategicIntelligence.filter(p => p.netScore <= 0).length
    });
    
    if (viewMode === 'opportunities') {
      return strategicIntelligence.filter(player => player.netScore > 0);
    } else if (viewMode === 'risks') {
      return strategicIntelligence.filter(player => player.netScore <= 0);
    }
    return strategicIntelligence;
  };

  if (loading) {
    return (
      <GlassCard 
        className={`strategic-intelligence-card ${themeMode}`} 
        variant={themeMode === 'glass' ? 'glass' : 'default'}
      >
        <div className="card-header">
          <h3>🎯 Strategic Intelligence</h3>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Analyzing strategic opportunities...</p>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard 
        className={`strategic-intelligence-card ${themeMode}`} 
        variant={themeMode === 'glass' ? 'glass' : 'default'}
      >
        <div className="card-header">
          <h3>🎯 Strategic Intelligence</h3>
        </div>
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={loadStrategicIntelligence} className="retry-button">
            Retry Analysis
          </button>
        </div>
      </GlassCard>
    );
  }

  const filteredData = getFilteredData();
  const sortedData = sortData(filteredData);
  
  console.log('🎯 Render data:', {
    viewMode,
    filteredCount: filteredData.length,
    sortedCount: sortedData.length,
    sortConfig
  });

  return (
    <GlassCard 
      className={`strategic-intelligence-card ${themeMode}`} 
      variant={themeMode === 'glass' ? 'glass' : 'default'}
    >
      <div className="glass-header">
        <h3>🎯 Strategic Intelligence</h3>
        <span className="card-subtitle">Comprehensive opportunity & risk analysis • Click headers to sort</span>
        
        <div className="view-controls">
          <button 
            className={`view-button ${viewMode === 'opportunities' ? 'active' : ''}`}
            onClick={() => setViewMode('opportunities')}
          >
            🟢 Opportunities ({strategicIntelligence.filter(p => p.netScore > 0).length})
          </button>
          <button 
            className={`view-button ${viewMode === 'risks' ? 'active' : ''}`}
            onClick={() => setViewMode('risks')}
          >
            🔴 Risks ({strategicIntelligence.filter(p => p.netScore <= 0).length})
          </button>
          <button 
            className={`view-button ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            📊 All ({strategicIntelligence.length})
          </button>
        </div>
      </div>

      <GlassScrollableContainer className="intelligence-container">
        <div className="desktop-view">
          <table className="intelligence-table">
            <thead>
              <tr>
                <th className="rank-col">Rank</th>
                <th className="player-col">Player</th>
                <th className="sortable" onClick={() => handleSort('netScore')}>
                  Net Score {getSortIndicator('netScore')}
                  <span className="header-subtitle">Opp - Risk</span>
                </th>
                <th className="sortable" onClick={() => handleSort('totalFactors')}>
                  Factors {getSortIndicator('totalFactors')}
                  <span className="header-subtitle">Count</span>
                </th>
                <th className="sortable" onClick={() => handleSort('confidenceScore')}>
                  Confidence {getSortIndicator('confidenceScore')}
                </th>
                <th className="assessment-col">Assessment</th>
                <th className="details-col">Key Factors</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((player, index) => (
                <tr key={index} className="intelligence-row">
                  <td className="rank-cell">
                    <span className="rank-number">#{index + 1}</span>
                  </td>
                  <td className="player-cell">
                    <div className="player-info">
                      <span className="player-name">{getPlayerDisplayName(player)}</span>
                      <span className="team-info">{getTeamDisplayName(player)} vs {player.pitcher}</span>
                    </div>
                  </td>
                  <td className="score-cell">
                    <div className="net-score-breakdown">
                      <div className="net-score" style={{ color: player.assessmentColor }}>
                        {player.netScore > 0 ? '+' : ''}{player.netScore}
                      </div>
                      <div className="score-breakdown">
                        <span className="opp-score">+{player.opportunityScore}</span>
                        <span className="risk-score">-{player.riskScore}</span>
                      </div>
                    </div>
                  </td>
                  <td className="factors-cell">
                    <div className="factors-count">
                      <span className="total-factors">{player.totalFactors}</span>
                      <div className="factors-breakdown">
                        <span className="opp-factors">{player.opportunities.length} 🟢</span>
                        <span className="risk-factors">{player.risks.length} 🔴</span>
                      </div>
                    </div>
                  </td>
                  <td className="confidence-cell">
                    {player.confidenceScore}
                  </td>
                  <td className="assessment-cell">
                    <div 
                      className="assessment-badge"
                      style={{ backgroundColor: player.assessmentColor + '20', color: player.assessmentColor }}
                    >
                      {player.assessment}
                    </div>
                  </td>
                  <td className="details-cell">
                    <div className="key-factors">
                      {expandedFactors[index] ? (
                        // Show ALL factors when expanded
                        <>
                          {player.opportunities.map((opp, i) => (
                            <div key={`opp-${i}`} className="factor-item opportunity">
                              <span className="factor-icon">🟢</span>
                              <span className="factor-text" title={opp.description}>
                                {opp.factor}
                              </span>
                              <span className="factor-impact">{opp.impact}</span>
                            </div>
                          ))}
                          {player.risks.map((risk, i) => (
                            <div key={`risk-${i}`} className="factor-item risk">
                              <span className="factor-icon">🔴</span>
                              <span className="factor-text" title={risk.description}>
                                {risk.factor}
                              </span>
                              <span className="factor-impact">{risk.impact}</span>
                            </div>
                          ))}
                          <div 
                            className="factor-item toggle"
                            onClick={() => toggleFactorExpansion(index)}
                          >
                            <span className="toggle-text">▲ Show Less</span>
                          </div>
                        </>
                      ) : (
                        // Show condensed view
                        <>
                          {/* Show top 2 opportunities */}
                          {player.opportunities.slice(0, 2).map((opp, i) => (
                            <div key={`opp-${i}`} className="factor-item opportunity">
                              <span className="factor-icon">🟢</span>
                              <span className="factor-text" title={opp.description}>
                                {opp.factor}
                              </span>
                            </div>
                          ))}
                          {/* Show top 1 risk */}
                          {player.risks.slice(0, 1).map((risk, i) => (
                            <div key={`risk-${i}`} className="factor-item risk">
                              <span className="factor-icon">🔴</span>
                              <span className="factor-text" title={risk.description}>
                                {risk.factor}
                              </span>
                            </div>
                          ))}
                          {/* Show "and X more" if there are additional factors */}
                          {(player.opportunities.length + player.risks.length) > 3 && (
                            <div 
                              className="factor-item toggle"
                              onClick={() => toggleFactorExpansion(index)}
                            >
                              <span className="toggle-text">
                                ▼ +{(player.opportunities.length + player.risks.length) - 3} more
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="mobile-view">
          <div className="mobile-intelligence">
            {sortedData.map((player, index) => (
              <div key={index} className="mobile-intelligence-card">
                <div className="mobile-intelligence-header">
                  <div className="mobile-rank">#{index + 1}</div>
                  <div className="mobile-player-info">
                    <div className="mobile-player-name">{getPlayerDisplayName(player)}</div>
                    <div className="mobile-team-info">{getTeamDisplayName(player)} vs {player.pitcher}</div>
                  </div>
                  <div 
                    className="mobile-assessment"
                    style={{ backgroundColor: player.assessmentColor + '20', color: player.assessmentColor }}
                  >
                    {player.assessment}
                  </div>
                </div>
                
                <div className="mobile-scores">
                  <div className="mobile-score-item">
                    <span className="mobile-score-label">Net Score</span>
                    <span className="mobile-score-value" style={{ color: player.assessmentColor }}>
                      {player.netScore > 0 ? '+' : ''}{player.netScore}
                    </span>
                  </div>
                  <div className="mobile-score-item">
                    <span className="mobile-score-label">Factors</span>
                    <span className="mobile-score-value">{player.totalFactors}</span>
                  </div>
                  <div className="mobile-score-item">
                    <span className="mobile-score-label">Confidence</span>
                    <span className="mobile-score-value">{player.confidenceScore}</span>
                  </div>
                </div>
                
                <div className="mobile-factors">
                  <div className="mobile-factors-section">
                    <h5>🟢 Opportunities</h5>
                    {player.opportunities.slice(0, 3).map((opp, i) => (
                      <div key={i} className="mobile-factor-item">
                        <strong>{opp.factor}:</strong> {opp.description}
                      </div>
                    ))}
                  </div>
                  {player.risks.length > 0 && (
                    <div className="mobile-factors-section">
                      <h5>🔴 Risks</h5>
                      {player.risks.slice(0, 2).map((risk, i) => (
                        <div key={i} className="mobile-factor-item">
                          <strong>{risk.factor}:</strong> {risk.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassScrollableContainer>

      <div className="card-footer">
        <div className="summary-stats">
          <span className="stat-item">
            Elite Opportunities: {strategicIntelligence.filter(p => p.netScore >= 40).length}
          </span>
          <span className="stat-item">
            High Risk: {strategicIntelligence.filter(p => p.netScore <= -10).length}
          </span>
          <span className="stat-item">
            Total Players: {strategicIntelligence.length}
          </span>
        </div>
        <div className="last-updated">
          <small>
            Updated: {new Date().toLocaleTimeString()}
          </small>
        </div>
      </div>
    </GlassCard>
  );
};

export default StrategicIntelligenceCard;