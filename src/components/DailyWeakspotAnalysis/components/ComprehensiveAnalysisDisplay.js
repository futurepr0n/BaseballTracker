import React, { useState, useEffect } from 'react';
import './ComprehensiveAnalysisDisplay.css';
import pitchMatchupService from '../services/pitchMatchupService';
import dashboardContextService from '../../../services/dashboardContextService';
import { calculateEnhancedPropAnalysis } from '../../../services/playerAnalysisService';
import { fetchPlayerData, fetchPlayerDataForDateRange, fetchFullSeasonPlayerData } from '../../../services/dataService';
import { useTooltip } from '../../utils/TooltipContext';
import { createSafeId } from '../../utils/tooltipUtils';
import { normalizeToEnglish, createAllNameVariants, namesMatch, findPlayerInRoster } from '../../../utils/universalNameNormalizer';
import { getAnalysisCellColor } from '../../../utils/colorThresholds';
import leagueAverageService from '../../../services/leagueAverageService';

const ComprehensiveAnalysisDisplay = ({ analysis }) => {
  
  // Utility function to safely format numbers with toFixed
  const safeToFixed = (value, decimals = 1, fallback = 'N/A') => {
    if (value === null || value === undefined || isNaN(value)) {
      return fallback;
    }
    return Number(value).toFixed(decimals);
  };

  // Helper function to get color class for analysis cells
  const getCellColorClass = (cellType, value, options = {}) => {
    return getAnalysisCellColor(cellType, value, {
      leagueAverages,
      ...options
    });
  };
  
  const [expandedSections, setExpandedSections] = useState({
    away: true,
    home: true,
    optimal: true,
    overall: true
  });
  const [selectedMatchupIndex, setSelectedMatchupIndex] = useState(0);
  const [lineupData, setLineupData] = useState(null);
  const [optimalMatchups, setOptimalMatchups] = useState({});
  const [playerContexts, setPlayerContexts] = useState({});
  const [playerPropAnalyses, setPlayerPropAnalyses] = useState({});
  const [selectedPlayerTooltip, setSelectedPlayerTooltip] = useState(null);
  const [rosterData, setRosterData] = useState([]);
  const [leagueAverages, setLeagueAverages] = useState(null);
  const { openTooltip } = useTooltip();

  // Load roster data for handedness information
  useEffect(() => {
    const loadRosterData = async () => {
      try {
        const response = await fetch('/data/rosters.json');
        if (response.ok) {
          const rosters = await response.json();
          setRosterData(rosters);
        }
      } catch (error) {
        console.error('Error loading roster data:', error);
      }
    };

    loadRosterData();
  }, []);

  // Load league averages for color-coding thresholds
  useEffect(() => {
    const loadLeagueAverages = async () => {
      try {
        console.log('[ComprehensiveAnalysisDisplay] Loading league averages for color-coding...');
        const averages = await leagueAverageService.loadLeagueAverages();
        setLeagueAverages(averages);
        console.log('[ComprehensiveAnalysisDisplay] League averages loaded:', averages);
      } catch (error) {
        console.error('[ComprehensiveAnalysisDisplay] Error loading league averages:', error);
        // Component will fall back to default color thresholds
      }
    };

    loadLeagueAverages();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const showDashboardTooltip = (player, tooltipType, event) => {
    console.log('🔧 showDashboardTooltip called:', { 
      player: player?.playerName || player?.name, 
      tooltipType, 
      playerData: player 
    });
    
    // Stop event propagation to ensure this handler gets called
    event.preventDefault();
    event.stopPropagation();
    
    const safeId = createSafeId(player.playerName || player.name, player.team);
    const tooltipId = `${tooltipType}_${safeId}`;
    
    console.log('🔧 Opening tooltip:', { tooltipId, tooltipType, hasOpenTooltip: !!openTooltip });
    
    try {
      openTooltip(tooltipId, event.currentTarget, {
        type: tooltipType,
        player: player
      });
      console.log('🔧 Tooltip opened successfully');
    } catch (error) {
      console.error('🔧 Error opening tooltip:', error);
    }
  };

  // Helper function to match player names (handles variations like "Nick Castellanos" vs "N. Castellanos")
  const matchPlayerNames = (name1, name2) => {
    if (!name1 || !name2) return false;
    
    // Clean both names - remove periods and punctuation, but preserve the structure
    const clean1 = name1.toLowerCase().replace(/\./g, '').replace(/[^a-z\s]/g, '').trim();
    const clean2 = name2.toLowerCase().replace(/\./g, '').replace(/[^a-z\s]/g, '').trim();
    
    // Direct match
    if (clean1 === clean2) return true;
    
    // Handle abbreviated names (e.g., "N. Castellanos" vs "Nick Castellanos")
    const parts1 = clean1.split(/\s+/);
    const parts2 = clean2.split(/\s+/);
    
    if (parts1.length >= 2 && parts2.length >= 2) {
      const lastName1 = parts1[parts1.length - 1];
      const lastName2 = parts2[parts2.length - 1];
      
      // Last names must match exactly - this is the CRITICAL check
      if (lastName1 !== lastName2) return false;
      
      // For names with middle initials like "J.T. Realmuto" 
      // Handle special case where first part might be compound like "jt"
      const firstName1 = parts1[0];
      const firstName2 = parts2[0];
      
      // If we have compound initials like "jt", handle specially
      // "jt realmuto" should match "J.T. Realmuto" but NOT "T. Ward"
      if (firstName1.length === 2 && firstName2.length === 1) {
        // Check if the single initial matches the last character of the compound
        // This prevents "jt" from matching just "t"
        return false; // Don't match compound initials with single initials
      }
      if (firstName2.length === 2 && firstName1.length === 1) {
        // Same check in reverse
        return false; // Don't match compound initials with single initials
      }
      
      // If both are single letters (initials), they must match exactly
      if (firstName1.length === 1 && firstName2.length === 1) {
        return firstName1 === firstName2;
      }
      
      // Check if one is an initial of the other (but only for non-compound names)
      if (firstName1.length === 1 && firstName2.length > 2 && firstName2.startsWith(firstName1)) return true;
      if (firstName2.length === 1 && firstName1.length > 2 && firstName1.startsWith(firstName2)) return true;
      
      // Direct first name match
      if (firstName1 === firstName2) return true;
    }
    
    return false;
  };

  const showPlayerSummary = (playerName, playerContext) => {
    console.log('📋 SHOW PLAYER SUMMARY CALLED:', {
      playerName,
      hasContext: !!playerContext,
      hasMilestoneData: !!playerContext?.milestoneTrackingData,
      milestoneDataStructure: playerContext?.milestoneTrackingData,
      contextKeys: playerContext ? Object.keys(playerContext) : []
    });
    setSelectedPlayerTooltip({ playerName, playerContext });
  };

  const closePlayerTooltip = () => {
    setSelectedPlayerTooltip(null);
  };

  // Helper function to get player handedness from roster data
  const getPlayerHandedness = (playerName, team) => {
    if (!rosterData || !playerName) return null;

    // Find player in roster data using name matching
    const player = rosterData.find(p => {
      // Try exact match first
      if (p.name === playerName || p.fullName === playerName) return true;
      
      // Try normalized matching for various name formats
      const normalizedSearchName = normalizeToEnglish(playerName.toLowerCase());
      const normalizedRosterName = normalizeToEnglish((p.name || '').toLowerCase());
      const normalizedFullName = normalizeToEnglish((p.fullName || '').toLowerCase());
      
      return normalizedRosterName === normalizedSearchName || 
             normalizedFullName === normalizedSearchName;
    });

    if (player) {
      return {
        bats: player.bats || player.battingHand || 'R', // Default to R if not specified
        throws: player.throws || player.pitchingHand || 'R'
      };
    }

    return { bats: 'R', throws: 'R' }; // Default values
  };

  // Helper function to get pitcher handedness from analysis data
  const getPitcherHandedness = (pitcherName) => {
    // Try to extract from analysis data if available
    if (analysis?.matchup_analysis) {
      for (const matchup of Object.values(analysis.matchup_analysis)) {
        if (matchup.away_pitcher_analysis?.pitcher_name === pitcherName) {
          return matchup.away_pitcher_analysis.pitcher_hand || 'R';
        }
        if (matchup.home_pitcher_analysis?.pitcher_name === pitcherName) {
          return matchup.home_pitcher_analysis.pitcher_hand || 'R';
        }
      }
    }

    // Try direct analysis format
    if (analysis?.away_pitcher_analysis?.pitcher_name === pitcherName) {
      return analysis.away_pitcher_analysis.pitcher_hand || 'R';
    }
    if (analysis?.home_pitcher_analysis?.pitcher_name === pitcherName) {
      return analysis.home_pitcher_analysis.pitcher_hand || 'R';
    }

    // Fallback to roster data
    const pitcherHandedness = getPlayerHandedness(pitcherName);
    return pitcherHandedness?.throws || 'R';
  };

  // Helper function to format handedness matchup display
  const formatHandednessMatchup = (batterHand, pitcherHand) => {
    const bH = batterHand === 'S' ? 'S' : (batterHand || 'R');
    const pH = pitcherHand || 'R';
    
    // Return formatted string with advantage indicator
    const matchupText = `${pH}HP vs ${bH}HB`;
    
    // Determine matchup advantage
    let advantage = '';
    if (bH === 'S') {
      advantage = '⚖️'; // Switch hitter - balanced
    } else if ((bH === 'L' && pH === 'R') || (bH === 'R' && pH === 'L')) {
      advantage = '⚔️'; // Favorable matchup
    } else {
      advantage = '🛡️'; // Same-handed (slight pitcher advantage)
    }
    
    return `${advantage} ${matchupText}`;
  };

  // Load player prop analysis data for Over 0.5 Hits and Over 0.5 HRs
  // Helper function to calculate recent performance stats for last N games
  const calculateRecentPerformance = (playerHistory, gameCount = 3) => {
    if (!playerHistory || playerHistory.length === 0) return null;
    
    const recentGames = playerHistory.slice(0, gameCount);
    if (recentGames.length === 0) return null;
    
    let totalAB = 0, totalH = 0, totalHR = 0, totalRBI = 0;
    const gameStats = recentGames.map(game => {
      const ab = parseInt(game.AB) || 0;
      const h = parseInt(game.H) || 0;
      const hr = parseInt(game.HR) || 0;
      const rbi = parseInt(game.RBI) || 0;
      
      totalAB += ab;
      totalH += h;
      totalHR += hr;
      totalRBI += rbi;
      
      return {
        date: game.gameDate,
        AB: ab,
        H: h,
        HR: hr,
        RBI: rbi,
        AVG: ab > 0 ? (h / ab).toFixed(3) : '.000'
      };
    });
    
    const recentAvg = totalAB > 0 ? (totalH / totalAB).toFixed(3) : '.000';
    
    return {
      games: gameStats,
      totals: {
        AB: totalAB,
        H: totalH,
        HR: totalHR,
        RBI: totalRBI,
        AVG: recentAvg
      },
      gameCount: recentGames.length
    };
  };

  const loadPlayerPropAnalysis = async (playerName, team, currentDate) => {
    try {
      console.log(`🎯 PROP ANALYSIS: Loading data for ${playerName} (${team}) on ${currentDate}`);
      
      // Use today's date if currentDate is not provided or invalid
      let targetDate;
      if (currentDate && currentDate !== 'undefined') {
        targetDate = currentDate;
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`;
      }
      
      console.log(`🎯 PROP ANALYSIS: Using target date ${targetDate} for ${playerName}`);
      
      // First, get the full name from rosters.json for better matching
      let fullName = null;
      let rosterData = null;
      try {
        const rosterResponse = await fetch('/data/rosters.json');
        if (rosterResponse.ok) {
          rosterData = await rosterResponse.json();
          // Find player by name and optional team
          const playerRoster = rosterData.find(p => 
            namesMatch(playerName, p.name) && (!team || p.team === team)
          );
          if (playerRoster && playerRoster.fullName) {
            fullName = playerRoster.fullName;
            console.log(`🔍 Found full name in roster: ${fullName} for search name: ${playerName}`);
          }
        }
      } catch (rosterError) {
        console.log('Could not load roster data for full name lookup');
      }
      
      // Convert targetDate string to Date object for data fetching
      const targetDateObj = new Date(targetDate);
      
      // Calculate days from season start to ensure we get full season data
      const seasonStart = new Date('2025-03-01');
      const daysFromSeasonStart = Math.ceil((targetDateObj - seasonStart) / (1000 * 60 * 60 * 24));
      const daysToLoad = Math.max(180, daysFromSeasonStart + 30); // At least 180 days or full season + buffer
      
      console.log(`🎯 PROP ANALYSIS: Loading ${daysToLoad} days of full season data for ${playerName}`);
      
      // Use fetchFullSeasonPlayerData for consistency with /players route
      const dateRangeData = await fetchFullSeasonPlayerData(targetDateObj, daysToLoad);
      
      if (!dateRangeData || Object.keys(dateRangeData).length === 0) {
        console.warn(`🎯 PROP ANALYSIS: No historical data found for ${playerName} - dateRangeData:`, dateRangeData);
        return null;
      }
      
      console.log(`🎯 PROP ANALYSIS: Found ${Object.keys(dateRangeData).length} days of data for analysis`);

      // Create comprehensive search variants for matching
      const searchVariants = new Set();
      
      // Add original player name variants
      const playerNameVariants = createAllNameVariants(playerName);
      playerNameVariants.forEach(variant => searchVariants.add(variant));
      
      // Add full name variants if found in roster
      if (fullName) {
        const fullNameVariants = createAllNameVariants(fullName);
        fullNameVariants.forEach(variant => searchVariants.add(variant));
        
        // Add CSV format variants for full name
        const nameParts = fullName.split(' ');
        if (nameParts.length >= 2) {
          const lastName = nameParts[nameParts.length - 1];
          const firstName = nameParts.slice(0, -1).join(' ');
          const csvFormat = `${lastName}, ${firstName}`;
          const csvVariants = createAllNameVariants(csvFormat);
          csvVariants.forEach(variant => searchVariants.add(variant));
        }
      }
      
      console.log(`🔍 Using comprehensive search variants for ${playerName}:`, Array.from(searchVariants).slice(0, 8));

      // Extract player history from the date range data with comprehensive matching
      const playerHistory = [];
      console.log(`🎯 PROP ANALYSIS: Searching for player "${playerName}" in historical data using comprehensive matching...`);
      
      for (const [date, playersArray] of Object.entries(dateRangeData)) {
        if (Array.isArray(playersArray)) {
          const playerData = playersArray.find(p => {
            if (!p.name && !p.Name) return false;
            
            const dataPlayerName = p.name || p.Name;
            
            // Use comprehensive name matching
            if (namesMatch(playerName, dataPlayerName)) {
              return true;
            }
            
            // Try full name matching if available
            if (fullName && namesMatch(fullName, dataPlayerName)) {
              return true;
            }
            
            // Additional fallback: try direct normalized comparison
            const normalizedSearch = normalizeToEnglish(playerName).toLowerCase();
            const normalizedData = normalizeToEnglish(dataPlayerName).toLowerCase();
            if (normalizedSearch === normalizedData) {
              return true;
            }
            
            // Final fallback: partial matching for cases where one name contains the other
            if (normalizedSearch.length > 3 && normalizedData.includes(normalizedSearch)) {
              return true;
            }
            if (normalizedData.length > 3 && normalizedSearch.includes(normalizedData)) {
              return true;
            }
            
            return false;
          });
          
          if (playerData) {
            console.log(`🎯 PROP ANALYSIS: Found data for ${playerName} on ${date}:`, {
              matchedName: playerData.name || playerData.Name,
              searchName: playerName,
              fullName: fullName,
              hits: playerData.H,
              homeRuns: playerData.HR,
              rbis: playerData.RBI,
              runs: playerData.R
            });
            playerHistory.push({ 
              ...playerData, 
              H: playerData.H, 
              HR: playerData.HR, 
              RBI: playerData.RBI, 
              R: playerData.R, 
              gameDate: date 
            });
          }
        }
      }

      if (playerHistory.length === 0) {
        console.warn(`🎯 PROP ANALYSIS: No player history found for "${playerName}"`);
        console.warn(`🎯 PROP ANALYSIS: Available players in first day:`, 
          dateRangeData[Object.keys(dateRangeData)[0]]?.slice(0, 3).map(p => p.name || p.Name)
        );
        return null;
      }
      
      console.log(`🎯 PROP ANALYSIS: Built history for ${playerName}: ${playerHistory.length} games`);

      // Calculate prop analysis using the same service as the players component
      console.log(`🎯 PROP ANALYSIS: Calling calculateEnhancedPropAnalysis for ${playerName} with ${playerHistory.length} games`);
      
      // Log sample game data for debugging
      if (playerHistory.length > 0) {
        const sampleGame = playerHistory[0];
        console.log(`🎯 PROP ANALYSIS: Sample game data for ${playerName}:`, {
          date: sampleGame.gameDate,
          hits: sampleGame.H,
          hrs: sampleGame.HR,
          rbis: sampleGame.RBI,
          runs: sampleGame.R,
          strikeouts: sampleGame.K,
          rawData: sampleGame
        });
      }
      
      const propAnalysis = calculateEnhancedPropAnalysis(playerHistory, null);
      
      if (propAnalysis) {
        // The propAnalysis object has nested structure with season2025 property
        const season2025Props = propAnalysis.season2025 || {};
        // Calculate recent performance for last 3 games
        const recentPerformance = calculateRecentPerformance(playerHistory, 3);
        
        const result = {
          hitsOver05: season2025Props.hits?.over05 || null,
          hrsOver05: season2025Props.homeRuns?.over05 || null,
          sampleSize: playerHistory.length,
          dataQuality: playerHistory.length >= 10 ? 'good' : 'limited',
          recentPerformance: recentPerformance,
          playerHistory: playerHistory  // Include for potential future use
        };
        
        console.log(`🎯 PROP ANALYSIS SUCCESS: Calculated for ${playerName}:`, {
          hitsOver05Percentage: result.hitsOver05?.percentage,
          hitsOver05Success: result.hitsOver05?.success,
          hitsOver05Total: result.hitsOver05?.total,
          hrsOver05Percentage: result.hrsOver05?.percentage,
          hrsOver05Success: result.hrsOver05?.success,
          hrsOver05Total: result.hrsOver05?.total,
          sampleSize: result.sampleSize,
          dataQuality: result.dataQuality,
          rawPropAnalysis: propAnalysis
        });
        
        return result;
      } else {
        console.error(`🎯 PROP ANALYSIS: calculateEnhancedPropAnalysis returned null for ${playerName}, playerHistory:`, playerHistory.slice(0, 2));
      }
      
      console.warn(`🎯 PROP ANALYSIS: calculateEnhancedPropAnalysis returned null for ${playerName}`);
      return null;
    } catch (error) {
      console.error(`🎯 PROP ANALYSIS ERROR: Failed to load data for ${playerName}:`, error);
      return null;
    }
  };

  // Load lineup data when analysis changes
  useEffect(() => {
    const loadLineupData = async () => {
      if (!analysis) return;
      
      try {
        // Get the current matchup to determine the date
        const allMatchups = Object.values(analysis.matchup_analysis);
        if (allMatchups.length > 0) {
          const firstMatchup = allMatchups[0];
          // Get date without timezone conversion
          let date;
          if (firstMatchup.matchup?.date) {
            date = firstMatchup.matchup.date;
          } else {
            // Get current date without timezone issues
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            date = `${year}-${month}-${day}`;
          }
          
          const response = await fetch(`/data/lineups/starting_lineups_${date}.json`);
          if (response.ok) {
            const data = await response.json();
            setLineupData(data);
          } else {
            console.warn('No lineup data available for date:', date);
          }
        }
      } catch (error) {
        console.error('Error loading lineup data:', error);
      }
    };

    loadLineupData();
  }, [analysis]);

  // Load optimal matchups when lineup data is available
  useEffect(() => {
    const loadOptimalMatchups = async () => {
      if (!lineupData || !analysis) {
        return;
      }

      const allMatchups = Object.values(analysis.matchup_analysis);
      const newOptimalMatchups = {};

      for (const [index, matchupData] of allMatchups.entries()) {
        const awayOptimal = await pitchMatchupService.analyzeOptimalMatchups(
          matchupData.away_pitcher_analysis?.pitch_vulnerabilities,
          matchupData.away_pitcher_analysis?.opposing_team,
          lineupData
        );

        const homeOptimal = await pitchMatchupService.analyzeOptimalMatchups(
          matchupData.home_pitcher_analysis?.pitch_vulnerabilities,
          matchupData.home_pitcher_analysis?.opposing_team,
          lineupData
        );

        newOptimalMatchups[index] = {
          away_pitcher_matchups: awayOptimal,
          home_pitcher_matchups: homeOptimal
        };
      }

      setOptimalMatchups(newOptimalMatchups);
    };

    loadOptimalMatchups();
  }, [lineupData, analysis]);

  // Load player dashboard contexts when lineup data is available
  useEffect(() => {
    const loadPlayerContexts = async () => {
      if (!lineupData || !analysis) return;

      const allMatchups = Object.values(analysis.matchup_analysis);
      const playerContextMap = {};

      for (const matchupData of allMatchups) {
        const date = matchupData.matchup?.date || new Date().toISOString().split('T')[0];
        
        // Process both teams
        const teams = [
          { name: matchupData.away_pitcher_analysis?.opposing_team, side: 'away' },
          { name: matchupData.home_pitcher_analysis?.opposing_team, side: 'home' }
        ];

        for (const team of teams) {
          if (!team.name) continue;

          // Find the game for this team
          const game = lineupData.games?.find(g => 
            g.teams?.away?.abbr === team.name || g.teams?.home?.abbr === team.name
          );
          
          if (!game) continue;

          // Get lineup for this team
          const isAway = game.teams?.away?.abbr === team.name;
          const lineup = isAway ? game.lineups?.away : game.lineups?.home;
          
          if (!lineup) continue;

          // Handle both 'batters' and 'batting_order' data structures
          let batters = [];
          if (lineup.batters) {
            batters = lineup.batters;
          } else if (lineup.batting_order) {
            batters = lineup.batting_order.map(batter => ({
              name: batter.name,
              batting_order: batter.position,
              season_stats: batter.season_stats,
              status: batter.status || 'confirmed'
            }));
          }

          // Load dashboard context for each player
          for (const batter of batters) {
            const playerKey = `${batter.name}-${team.name}`;
            if (!playerContextMap[playerKey]) {
              try {
                const context = await dashboardContextService.getPlayerContext(
                  batter.name, 
                  team.name, 
                  date
                );
                
                // Debug milestone data when storing context
                if (context?.milestoneTrackingData) {
                  console.log(`💾 STORING CONTEXT WITH MILESTONE for ${playerKey}:`, {
                    playerName: context.playerName,
                    team: context.team,
                    milestoneData: context.milestoneTrackingData,
                    milestoneKeys: Object.keys(context.milestoneTrackingData)
                  });
                }
                
                playerContextMap[playerKey] = context;
              } catch (error) {
                playerContextMap[playerKey] = null;
              }
            }
          }
        }
      }
      // Debug what's being stored in playerContexts
      console.log('📦 SETTING PLAYER CONTEXTS:', {
        totalPlayers: Object.keys(playerContextMap).length,
        samplePlayer: Object.keys(playerContextMap)[0],
        sampleContext: playerContextMap[Object.keys(playerContextMap)[0]]
      });
      
      // Check specifically for milestone data
      Object.entries(playerContextMap).forEach(([key, context]) => {
        if (context?.milestoneTrackingData) {
          console.log(`✅ Player ${key} HAS milestone data:`, context.milestoneTrackingData);
        }
      });
      
      setPlayerContexts(playerContextMap);
    };

    loadPlayerContexts();
  }, [lineupData, analysis]);

  // Load player prop analyses when lineup data is available
  useEffect(() => {
    const loadPlayerPropAnalyses = async () => {
      try {
        if (!lineupData || !analysis) {
          console.log(`🎯 PROP ANALYSIS EFFECT: Skipping - lineupData:`, !!lineupData, 'analysis:', !!analysis);
          return;
        }

        console.log(`🎯 PROP ANALYSIS EFFECT: Starting to load prop analyses with lineupData games:`, lineupData.games?.length);
        const allMatchups = Object.values(analysis.matchup_analysis);
        const playerPropMap = {};
        let totalPlayersToProcess = 0;

        for (const matchupData of allMatchups) {
          const date = matchupData.matchup?.date || new Date().toISOString().split('T')[0];
          
          // Process both teams
          const teams = [
            { name: matchupData.away_pitcher_analysis?.opposing_team, side: 'away' },
            { name: matchupData.home_pitcher_analysis?.opposing_team, side: 'home' }
          ];

          for (const team of teams) {
            if (!team.name) continue;

            // Find the game for this team
            const game = lineupData.games?.find(g => 
              g.teams?.away?.abbr === team.name || g.teams?.home?.abbr === team.name
            );
            
            if (!game) continue;

            // Get lineup for this team
            const isAway = game.teams?.away?.abbr === team.name;
            const lineup = isAway ? game.lineups?.away : game.lineups?.home;
            
            if (!lineup) continue;

            // Handle both 'batters' and 'batting_order' data structures
            let batters = [];
            if (lineup.batters) {
              batters = lineup.batters;
            } else if (lineup.batting_order) {
              batters = lineup.batting_order.map(batter => ({
                name: batter.name,
                batting_order: batter.position,
                season_stats: batter.season_stats,
                status: batter.status || 'confirmed'
              }));
            }

            // Load prop analysis for each player (with error handling per player)
            for (const batter of batters) {
              totalPlayersToProcess++;
              const playerKey = `${batter.name}-${team.name}`;
              console.log(`🎯 PROP ANALYSIS EFFECT: Processing player ${totalPlayersToProcess}: ${batter.name} (${team.name})`);
              console.log(`🎯 PROP ANALYSIS EFFECT: Creating player key: "${playerKey}"`);
              
              if (!playerPropMap[playerKey]) {
                try {
                  const propAnalysis = await loadPlayerPropAnalysis(
                    batter.name, 
                    team.name, 
                    date
                  );
                  playerPropMap[playerKey] = propAnalysis;
                  console.log(`🎯 PROP ANALYSIS EFFECT: Stored result for "${playerKey}":`, propAnalysis ? 'SUCCESS' : 'NULL');
                  if (propAnalysis) {
                    console.log(`🎯 PROP ANALYSIS EFFECT: Stored data structure for "${playerKey}":`, {
                      hitsOver05: !!propAnalysis.hitsOver05,
                      hrsOver05: !!propAnalysis.hrsOver05,
                      sampleSize: propAnalysis.sampleSize
                    });
                  }
                } catch (error) {
                  console.error(`🎯 PROP ANALYSIS EFFECT: Error for ${batter.name}:`, error);
                  playerPropMap[playerKey] = null; // Set to null to prevent retries
                }
              } else {
                console.log(`🎯 PROP ANALYSIS EFFECT: Already have data for ${playerKey}`);
              }
            }
          }
        }
        
        console.log(`🎯 PROP ANALYSIS: Loaded ${Object.keys(playerPropMap).length} player prop analyses`);
        console.log('🎯 PROP ANALYSIS: Final playerPropMap keys:', Object.keys(playerPropMap));
        setPlayerPropAnalyses(playerPropMap);
        
      } catch (error) {
        console.error('🎯 PROP ANALYSIS: Critical error in loadPlayerPropAnalyses:', error);
        // Don't fail the entire component, just set empty prop analyses
        setPlayerPropAnalyses({});
      }
    };

    // Add a small delay to prevent blocking the main render
    const timeoutId = setTimeout(() => {
      loadPlayerPropAnalyses();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [lineupData, analysis]);

  // Helper function to get lineup hitter for a specific position
  const getLineupHitterForPosition = (position, opposingTeam) => {
    if (!lineupData || !opposingTeam) return null;
    
    
    // Find the game for this team
    const game = lineupData.games?.find(g => 
      g.teams?.away?.abbr === opposingTeam || g.teams?.home?.abbr === opposingTeam
    );
    
    if (!game) {
      console.warn('No game found for team:', opposingTeam);
      return null;
    }
    
    // Determine if this team is home or away
    const isAway = game.teams?.away?.abbr === opposingTeam;
    const lineup = isAway ? game.lineups?.away : game.lineups?.home;
    
    if (!lineup) {
      console.warn('No lineup data found for team:', opposingTeam);
      return null;
    }
    
    // Handle both 'batters' and 'batting_order' data structures
    let batters = [];
    if (lineup.batters) {
      batters = lineup.batters;
    } else if (lineup.batting_order) {
      batters = lineup.batting_order.map(batter => ({
        name: batter.name,
        batting_order: batter.position,
        season_stats: batter.season_stats,
        status: batter.status || 'confirmed'
      }));
    }
    
    if (!batters || batters.length === 0) {
      console.warn('No batters found for team:', opposingTeam);
      return null;
    }
    
    // Find the batter in the specified position (1-9)
    const batter = batters.find(b => b.batting_order === position);
    
    if (batter) {
      return {
        name: batter.name,
        batting_avg: batter.season_stats?.avg,
        status: batter.status || 'confirmed'
      };
    }
    
    return null;
  };

  // Render optimal pitch-type matchups
  const renderOptimalMatchups = (matchups, pitcherName) => {
    if (!matchups || matchups.length === 0) {
      return <div className="no-data">No optimal matchups identified</div>;
    }

    return (
      <div className="optimal-matchups-section">
        <div className="matchups-header">
          <span className="pitcher-name">{pitcherName}</span>
          <span className="matchup-count">({matchups.length} opportunities)</span>
        </div>
        
        <div className="matchups-grid">
          {matchups.slice(0, 5).map((matchup, index) => (
            <div key={index} className={`matchup-card opportunity-${Math.floor(matchup.opportunityScore / 20)}`}>
              <div className="matchup-header">
                <div className="hitter-info">
                  <span className="hitter-name">{matchup.hitter}</span>
                  <span className="batting-position">#{matchup.battingPosition}</span>
                </div>
                <div className="opportunity-score">
                  <span className="score">{safeToFixed(matchup.opportunityScore, 0)}%</span>
                  <span className="label">Opportunity</span>
                </div>
              </div>
              
              <div className="pitch-type-info">
                <span className="pitch-type">{matchup.pitchType}</span>
                <span className="pitch-name">{matchup.pitchName}</span>
              </div>
              
              <div className="matchup-stats">
                <div className="stat-group">
                  <div className="stat-label">Pitcher Vulnerability</div>
                  <div className="stat-values">
                    <span>HR: {matchup.stats.pitcher.hr_rate}%</span>
                    <span>Hit: {matchup.stats.pitcher.hit_rate}%</span>
                    <span>({matchup.stats.pitcher.sample_size} AB)</span>
                  </div>
                </div>
                
                <div className="stat-group">
                  <div className="stat-label">Hitter Strength</div>
                  <div className="stat-values">
                    <span>BA: {matchup.stats.hitter.ba}</span>
                    <span>SLG: {matchup.stats.hitter.slg}</span>
                    <span>wOBA: {matchup.stats.hitter.woba}</span>
                    <span>HH%: {matchup.stats.hitter.hard_hit_percent}%</span>
                  </div>
                </div>
              </div>
              
              <div className="reasoning">
                <span className="reasoning-text">{matchup.reasoning}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!analysis || !analysis.matchup_analysis) {
    return null;
  }

  // Get all matchups from matchup_analysis
  const allMatchups = Object.values(analysis.matchup_analysis);
  if (!allMatchups || allMatchups.length === 0) return null;

  // Get the currently selected matchup
  const currentMatchup = allMatchups[selectedMatchupIndex];
  if (!currentMatchup) return null;

  const { 
    away_pitcher_analysis, 
    home_pitcher_analysis, 
    overall_matchup_assessment,
    matchup 
  } = currentMatchup;

  const renderPitchVulnerabilities = (vulnerabilities) => {
    if (!vulnerabilities || Object.keys(vulnerabilities).length === 0) {
      return <div className="no-data">No pitch vulnerability data available</div>;
    }

    return (
      <div className="pitch-vulnerabilities-grid">
        {Object.entries(vulnerabilities).map(([pitch, data]) => (
          <div key={pitch} className="pitch-card">
            <div className="pitch-header">
              <span className="pitch-name">{pitch}</span>
              <span className={`vulnerability-badge ${(data.vulnerability_score || 0) > 3 ? 'high' : (data.vulnerability_score || 0) > 1 ? 'medium' : 'low'}`}>
                {safeToFixed(data.vulnerability_score)} vuln
              </span>
            </div>
            <div className="pitch-stats">
              <div className="stat-row">
                <span className="stat-label">HR Rate:</span>
                <span className="stat-value">{safeToFixed(data.hr_rate * 100, 1)}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Hit Rate:</span>
                <span className="stat-value">{safeToFixed(data.hit_rate * 100, 1)}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">K Rate:</span>
                <span className="stat-value">{safeToFixed(data.strikeout_rate * 100, 1)}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Sample:</span>
                <span className="stat-value">{data.sample_size} pitches</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderInningPatterns = (patterns) => {
    if (!patterns || Object.keys(patterns).length === 0) {
      return <div className="no-data">No inning pattern data available</div>;
    }

    return (
      <div className="inning-patterns-grid">
        {Object.entries(patterns)
          .sort(([a], [b]) => {
            const inningA = parseInt(a.replace('inning_', ''));
            const inningB = parseInt(b.replace('inning_', ''));
            return inningA - inningB;
          })
          .map(([inning, data]) => (
            <div key={inning} className={`inning-card ${(data.vulnerability_score || 0) > 20 ? 'high-vuln' : (data.vulnerability_score || 0) > 10 ? 'med-vuln' : 'low-vuln'}`}>
              <div className="inning-header">
                <span className="inning-label">Inning {inning.replace('inning_', '')}</span>
                <span className="vulnerability-score">{safeToFixed(data.vulnerability_score, 1)}%</span>
              </div>
              <div className="inning-stats">
                <span className="hr-freq">HR: {safeToFixed(data.hr_frequency * 100, 1)}%</span>
                <span className="hit-freq">Hit: {safeToFixed(data.hit_frequency * 100, 1)}%</span>
                <span className="sample">({data.sample_size || 0} AB)</span>
              </div>
            </div>
          ))}
      </div>
    );
  };

  const renderPositionVulnerabilities = (positions, opposingTeam, pitcherSide, pitcherData = null) => {
    if (!positions || Object.keys(positions).length === 0) {
      return <div className="no-data">No position vulnerability data available</div>;
    }


    return (
      <div className="position-vulnerabilities-grid">
          {Object.entries(positions)
          .sort(([a], [b]) => {
            const posA = parseInt(a.replace('position_', ''));
            const posB = parseInt(b.replace('position_', ''));
            return posA - posB;
          })
          .map(([position, data]) => {
            const posNum = parseInt(position.replace('position_', ''));
            const positionNames = {
              1: 'Leadoff', 2: '#2 Hitter', 3: '#3 Hitter', 4: 'Cleanup',
              5: '#5 Hitter', 6: '#6 Hitter', 7: '#7 Hitter', 8: '#8 Hitter', 9: '#9 Hitter'
            };
            
            // Get actual lineup hitter for this position
            const lineupHitter = getLineupHitterForPosition(posNum, opposingTeam);
            
            // Get dashboard context and prop analysis for this player
            let playerContext = null;
            let playerPropAnalysis = null;
            let handednessInfo = null;
            if (lineupHitter) {
              const playerKey = `${lineupHitter.name}-${opposingTeam}`;
              
              // Debug: Show all available keys for this team
              const teamKeys = Object.keys(playerContexts).filter(k => k.endsWith(`-${opposingTeam}`));
              console.log(`🔍 Looking for "${playerKey}" in playerContexts. Available keys for ${opposingTeam}:`, teamKeys);
              
              playerContext = playerContexts[playerKey];
              
              // If not found, try to find by matching player name variations
              if (!playerContext) {
                console.log(`⚠️ No context found for key "${playerKey}", trying variations...`);
                // Try to find a matching context by checking all stored contexts
                for (const [key, context] of Object.entries(playerContexts)) {
                  if (key.endsWith(`-${opposingTeam}`)) {
                    const storedName = key.replace(`-${opposingTeam}`, '');
                    // Debug the name comparison
                    const isMatch = matchPlayerNames(storedName, lineupHitter.name);
                    if (isMatch) {
                      console.log(`✅ Found context match: "${key}" matches "${playerKey}"`);
                      console.log(`   Stored name: "${storedName}" matches lineup name: "${lineupHitter.name}"`);
                      playerContext = context;
                      break;
                    }
                  }
                }
                
                // If still not found, log what we tried
                if (!playerContext) {
                  console.log(`❌ Could not find context for "${lineupHitter.name}" (${opposingTeam})`);
                  console.log(`   Tried key: "${playerKey}"`);
                  console.log(`   Available keys for ${opposingTeam}:`, teamKeys);
                }
              } else {
                console.log(`✅ Found direct context match for "${playerKey}"`);
              }
              
              playerPropAnalysis = playerPropAnalyses[playerKey];
              
              // Get handedness information for this matchup
              const playerHandedness = getPlayerHandedness(lineupHitter.name, opposingTeam);
              const pitcherHandedness = getPitcherHandedness(pitcherData?.pitcher_name);
              
              if (playerHandedness) {
                handednessInfo = {
                  batterHand: playerHandedness.bats,
                  pitcherHand: pitcherHandedness,
                  matchupDisplay: formatHandednessMatchup(playerHandedness.bats, pitcherHandedness)
                };
              }
              
              // Debug: Log prop analysis lookup
              console.log(`🎯 RENDER: Looking up prop analysis for key: "${playerKey}"`);
              console.log(`🎯 RENDER: Available prop keys (${Object.keys(playerPropAnalyses).length}):`, Object.keys(playerPropAnalyses));
              console.log(`🎯 RENDER: Found prop analysis:`, !!playerPropAnalysis, playerPropAnalysis);
              console.log(`🎯 HANDEDNESS: ${lineupHitter.name} vs ${pitcherData?.pitcher_name}:`, handednessInfo);
              
              // Additional debug: Show the player name being looked up
              console.log(`🔧 Rendering badge: { playerName: '${lineupHitter.name}', team: '${opposingTeam}', lookupKey: '${playerKey}' }`);
            }
            
            // Keep original vulnerability class (no color changes)
            const enhancedVulnClass = data.vulnerability_score > 15 ? 'high-vuln' : 
                                     data.vulnerability_score > 10 ? 'med-vuln' : 'low-vuln';
            
            return (
              <div key={position} className={`position-card ${enhancedVulnClass}`}>
                <div className="position-header">
                  <span className="position-number">#{posNum}</span>
                  <span className="position-name">{positionNames[posNum]}</span>
                  {lineupHitter && (
                    <div className="actual-hitter">
                      <span className="hitter-name">
                        {lineupHitter.name}
                        {handednessInfo && (
                          <span className="handedness-matchup" title={`Handedness matchup: ${handednessInfo.batterHand} vs ${handednessInfo.pitcherHand}`}>
                            {handednessInfo.matchupDisplay}
                          </span>
                        )}
                        {playerContext && playerContext.badges && playerContext.badges.length > 0 && (
                          <span 
                            className="dashboard-indicator" 
                            title={`Dashboard insights: ${playerContext.badges.map(badge => {
                              if (typeof badge === 'string') return badge;
                              return badge.fullText || badge.text || badge.emoji || 'Insight';
                            }).join(', ')}`}
                            onClick={() => {
                              // Debug what we're passing to showPlayerSummary
                              console.log('🚀 BADGE CLICK DEBUG:', {
                                lineupHitterName: lineupHitter.name,
                                contextPlayerName: playerContext.playerName,
                                hasMilestoneData: !!playerContext.milestoneTrackingData,
                                milestoneDataKeys: playerContext.milestoneTrackingData ? Object.keys(playerContext.milestoneTrackingData) : [],
                                badges: playerContext.badges,
                                fullContext: playerContext
                              });
                              showPlayerSummary(lineupHitter.name, playerContext);
                            }}
                          >
                            🚀
                          </span>
                        )}
                      </span>
                      {lineupHitter.batting_avg && (
                        <span className="hitter-avg">.{lineupHitter.batting_avg}</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Dashboard Card Insights */}
                {playerContext && playerContext.badges && playerContext.badges.length > 0 && (
                  <div className="dashboard-insights">
                    <div className="insight-badges">
                      {playerContext.badges.slice(0, 3).map((badge, idx) => {
                        // Get tooltip type from badge structure or fallback to text analysis
                        const tooltipType = badge.type || (() => {
                          const badgeText = typeof badge === 'string' ? badge : (badge.fullText || badge.text || badge.emoji || '');
                          if (typeof badgeText !== 'string') return 'positive_momentum'; // fallback if not string
                          if (badgeText.includes('Hot Streak') || badgeText.includes('Active Streak')) return 'streak_hit';
                          if (badgeText.includes('Due for HR') || badgeText.includes('HR Candidate')) return 'hr_prediction';
                          if (badgeText.includes('Positive Momentum') || badgeText.includes('Improved Form')) return 'positive_momentum';
                          if (badgeText.includes('Risk')) return 'poor_performance';
                          if (badgeText.includes('Likely Hit')) return 'likely_hit';
                          if (badgeText.includes('Multi-Hit')) return 'multi_hit';
                          if (badgeText.includes('Time Slot')) return 'time_slot';
                          if (badgeText.includes('Matchup Edge')) return 'matchup_edge';
                          return 'positive_momentum'; // default
                        })();
                        
                        const playerData = {
                          playerName: lineupHitter.name,
                          team: opposingTeam,
                          // Include the raw data from the specific prediction type
                          ...(playerContext.positivePerformanceData || {}),
                          ...(playerContext.poorPerformanceData || {}),
                          ...(playerContext.hitStreakData || {}),
                          ...(playerContext.hrPredictionData || {}),
                          ...(playerContext.likelyToHitData || {}),
                          ...(playerContext.timeSlotData || {}),
                          ...(playerContext.opponentMatchupData || {})
                        };
                        
                        const badgeDisplay = typeof badge === 'string' ? badge : (badge.emoji || badge.text || badge.fullText || '🚀');
                        const badgeTitle = typeof badge === 'string' ? badge : (badge.text || badge.fullText || 'Analysis');
                        
                        console.log('🔧 Rendering badge:', { 
                          badgeDisplay, 
                          badgeTitle, 
                          tooltipType, 
                          playerName: lineupHitter.name,
                          hasPlayerData: !!playerData,
                          playerDataKeys: Object.keys(playerData)
                        });
                        
                        return (
                          <span 
                            key={idx} 
                            className={`insight-badge clickable ${tooltipType.toLowerCase().replace('_', '-')}`} 
                            title={`Click for detailed ${badgeTitle} analysis`}
                            onClick={(e) => {
                              console.log('🔧 Badge clicked!', { playerName: lineupHitter.name, tooltipType });
                              showDashboardTooltip(playerData, tooltipType, e);
                            }}
                          >
                            {badgeDisplay}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Performance Banner - Last 3 Games */}
                {playerPropAnalysis && playerPropAnalysis.recentPerformance && (() => {
                  // Determine performance level based on average
                  const avg = parseFloat(playerPropAnalysis.recentPerformance.totals.AVG);
                  let performanceClass = 'recent-performance-average'; // default
                  
                  if (avg >= .300) {
                    performanceClass = 'recent-performance-excellent'; // .300+ is excellent (green)
                  } else if (avg >= .250) {
                    performanceClass = 'recent-performance-above-average'; // .250-.299 is above average (light green)
                  } else if (avg >= .200) {
                    performanceClass = 'recent-performance-average'; // .200-.249 is average (orange)
                  } else {
                    performanceClass = 'recent-performance-below-average'; // below .200 is below average (red)
                  }
                  
                  return (
                    <div className={`recent-performance-banner ${performanceClass}`}>
                      <div className="recent-performance-header">
                        <span className="recent-label">Last {playerPropAnalysis.recentPerformance.gameCount} Games</span>
                        <span className="recent-avg">AVG: {playerPropAnalysis.recentPerformance.totals.AVG}</span>
                      </div>
                    <div className="recent-games-grid">
                      {playerPropAnalysis.recentPerformance.games.map((game, idx) => (
                        <div key={idx} className="recent-game-stat">
                          <div className="game-date">{game.date.split('-').slice(1).join('/')}</div>
                          <div className="game-stats">
                            <span className="stat-item">AB: {game.AB}</span>
                            <span className="stat-item">H: {game.H}</span>
                            <span className="stat-item">HR: {game.HR}</span>
                            <span className="stat-item">AVG: {game.AVG}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="recent-totals">
                      <span>Totals:</span>
                      <span>AB: {playerPropAnalysis.recentPerformance.totals.AB}</span>
                      <span>H: {playerPropAnalysis.recentPerformance.totals.H}</span>
                      <span>HR: {playerPropAnalysis.recentPerformance.totals.HR}</span>
                      <span>RBI: {playerPropAnalysis.recentPerformance.totals.RBI}</span>
                    </div>
                  </div>
                  );
                })()}

                <div className="position-stats">
                  <div className={`stat vulnerability-score ${getCellColorClass('vuln', data.vulnerability_score)}`}>
                    <span className="label">Vuln:</span>
                    <span className="value">{safeToFixed(data.vulnerability_score, 1)}</span>
                  </div>
                  <div className={`stat performance-rate ${getCellColorClass('hr_rate', data.hr_rate)}`}>
                    <span className="label">HR:</span>
                    <span className="value">{safeToFixed(data.hr_rate * 100, 1)}%</span>
                  </div>
                  <div className={`stat performance-rate ${getCellColorClass('hit_rate', data.hit_rate)}`}>
                    <span className="label">Hit:</span>
                    <span className="value">{safeToFixed(data.hit_rate * 100, 1)}%</span>
                  </div>
                  <div className={`stat sample-size-indicator ${getCellColorClass('ab', data.sample_size)}`}>
                    <span className="label">AB:</span>
                    <span className="value">{data.sample_size}</span>
                  </div>
                  
                  {/* Enhanced Player Prop Analysis */}
                  {playerPropAnalysis ? (
                    <>
                      <div className={`stat prop-stat prop-comparison ${getCellColorClass('over_05_hits', playerPropAnalysis.hitsOver05?.percentage)}`}>
                        <span className="label" title={`Player's probability of getting over 0.5 hits (${playerPropAnalysis.hitsOver05?.success || 0}/${playerPropAnalysis.hitsOver05?.total || 0} recent games)`}>
                          Over 0.5 H:
                        </span>
                        <span className="value prop-value">
                          {playerPropAnalysis.hitsOver05?.percentage || 'N/A'}%
                        </span>
                      </div>
                      <div className={`stat prop-stat prop-comparison ${getCellColorClass('over_05_hr', playerPropAnalysis.hrsOver05?.percentage)}`}>
                        <span className="label" title={`Player's probability of hitting over 0.5 home runs (${playerPropAnalysis.hrsOver05?.success || 0}/${playerPropAnalysis.hrsOver05?.total || 0} recent games)`}>
                          Over 0.5 HR:
                        </span>
                        <span className="value prop-value">
                          {playerPropAnalysis.hrsOver05?.percentage || 'N/A'}%
                        </span>
                      </div>
                      {/* Separate Pitcher and Batter Sample Stats */}
                      <div className={`stat sample-stat sample-size-indicator ${getCellColorClass('batter_sample', playerPropAnalysis.sampleSize)}`}>
                        <span className="label">Batter Sample:</span>
                        <span className="value">
                          {playerPropAnalysis.sampleSize} games
                        </span>
                      </div>
                      {pitcherData && pitcherData.recent_form && (
                        <div className="stat sample-stat">
                          <span className="label">Pitcher Sample:</span>
                          <span className="value">
                            {pitcherData.recent_form.games_analyzed || 0} games
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="stat warning-stat">
                      <span className="label" title="Prop analysis data not yet loaded or unavailable">
                        🔄 Loading Prop Data...
                      </span>
                    </div>
                  )}
                  
                  {/* Show data quality indicator */}
                  {playerPropAnalysis && playerPropAnalysis.dataQuality === 'limited' && (
                    <div className="stat warning-stat">
                      <span className="label warning" title="Limited data - less than 10 recent games">
                        ⚠️ Limited Data
                      </span>
                    </div>
                  )}
                  {lineupHitter && lineupHitter.status && (
                    <div className="hitter-status">
                      <span className={`status ${lineupHitter.status.toLowerCase()}`}>
                        {lineupHitter.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Player Highlights and Warnings */}
                {playerContext && (playerContext.highlights?.length > 0 || playerContext.warnings?.length > 0) && (
                  <div className="player-intelligence">
                    {playerContext.highlights && playerContext.highlights.length > 0 && (
                      <div className="highlights">
                        {playerContext.highlights.slice(0, 2).map((highlight, idx) => (
                          <div key={idx} className="highlight">
                            ✨ {highlight}
                          </div>
                        ))}
                      </div>
                    )}
                    {playerContext.warnings && playerContext.warnings.length > 0 && (
                      <div className="warnings">
                        {playerContext.warnings.slice(0, 1).map((warning, idx) => (
                          <div key={idx} className="warning">
                            ⚠️ {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  };

  const renderPatternRecognition = (patterns) => {
    if (!patterns || patterns.predictability_score === 0) {
      return <div className="no-data">No pattern recognition data available</div>;
    }

    return (
      <div className="pattern-recognition-section">
        <div className="predictability-header">
          <span className="label">Predictability Score:</span>
          <span className={`score ${(patterns.predictability_score || 0) > 70 ? 'high' : (patterns.predictability_score || 0) > 40 ? 'medium' : 'low'}`}>
            {safeToFixed(patterns.predictability_score, 1)}%
          </span>
          {patterns.confidence_score && (
            <span className={`confidence ${(patterns.confidence_score || 0) > 70 ? 'high' : (patterns.confidence_score || 0) > 40 ? 'medium' : 'low'}`}>
              Confidence: {safeToFixed(patterns.confidence_score, 1)}%
            </span>
          )}
          <span className="sequences-analyzed">({patterns.total_sequences_analyzed} sequences)</span>
        </div>
        
        {patterns.analysis_reliability && (
          <div className="analysis-reliability">
            <span className={`reliability ${patterns.analysis_reliability}`}>
              Analysis Reliability: {patterns.analysis_reliability.toUpperCase()}
            </span>
            {patterns.three_pitch_sequences > 0 && (
              <span className="sequence-breakdown">
                3+ pitch: {patterns.three_pitch_sequences}, 2-pitch: {patterns.two_pitch_sequences}
              </span>
            )}
          </div>
        )}
        
        {patterns.top_sequences && patterns.top_sequences.length > 0 && (
          <div className="top-sequences">
            <h5>Most Predictable Sequences:</h5>
            <div className="sequences-list">
              {patterns.top_sequences.map((seq, idx) => (
                <div key={idx} className={`sequence-item ${seq.sequence_type}`}>
                  <span className="sequence-pattern">{seq.sequence}</span>
                  <div className="sequence-stats">
                    <span className="frequency">{safeToFixed(seq.frequency * 100, 1)}% freq</span>
                    <span className="success">{safeToFixed(seq.success_rate * 100, 1)}% success</span>
                    <span className="count">({seq.count || 0} times)</span>
                    {seq.confidence_multiplier && (
                      <span className="confidence-mult">Conf: {safeToFixed(seq.confidence_multiplier, 1)}x</span>
                    )}
                    <span className={`sequence-type-badge ${seq.sequence_type}`}>
                      {seq.sequence_type}
                    </span>
                  </div>
                  {seq.inning_consistency !== undefined && (
                    <div className="consistency-indicators">
                      {seq.inning_consistency && <span className="consistency inning">Inning Consistent</span>}
                      {seq.count_consistency && <span className="consistency count">Count Specific</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTimingWindows = (windows) => {
    if (!windows || Object.keys(windows).length === 0) {
      return <div className="no-data">No timing window data available</div>;
    }

    return (
      <div className="timing-windows-grid">
        {Object.entries(windows).map(([range, data]) => (
          <div key={range} className={`timing-card ${(data.vulnerability_score || 0) > 20 ? 'high-vuln' : (data.vulnerability_score || 0) > 15 ? 'med-vuln' : 'low-vuln'}`}>
            <div className="timing-header">
              <span className="pitch-range">Pitches {range}</span>
              <span className="vulnerability">{safeToFixed(data.vulnerability_score, 1)}%</span>
            </div>
            <div className="timing-stats">
              <span className="hit-rate">Hit: {safeToFixed(data.hit_rate * 100, 1)}%</span>
              <span className="velocity">~{safeToFixed(data.average_velocity, 1)} mph</span>
              <span className="sample">({data.sample_size || 0} pitches)</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPitcherAnalysis = (pitcherData, pitcherName, side) => {
    if (!pitcherData || pitcherData.games_analyzed === 0) {
      return (
        <div className="pitcher-no-data">
          <h4>{pitcherName || 'Unknown Pitcher'}</h4>
          <p>No historical data available for this pitcher</p>
        </div>
      );
    }

    return (
      <div className="pitcher-analysis-section">
        <div className="pitcher-header">
          <h4>{pitcherData.pitcher_name || pitcherName}</h4>
          <div className="pitcher-meta">
            <span className="games-analyzed">{pitcherData.games_analyzed || 0} games analyzed</span>
            <span className="vulnerability-score">
              Overall Vulnerability: {pitcherData.overall_vulnerability_score ? pitcherData.overall_vulnerability_score.toFixed(1) : 'N/A'}
            </span>
            <span className="opposing-team">vs {pitcherData.opposing_team || 'Unknown'}</span>
          </div>
        </div>

        <div className="analysis-sections">
          <div className="analysis-category">
            <h5>⚡ Pitch Vulnerabilities</h5>
            {renderPitchVulnerabilities(pitcherData.pitch_vulnerabilities)}
          </div>

          <div className="analysis-category">
            <h5>🕐 Inning Patterns</h5>
            {renderInningPatterns(pitcherData.inning_patterns)}
          </div>

          <div className="analysis-category">
            <h5>🎯 Position Vulnerabilities</h5>
            {renderPositionVulnerabilities(pitcherData.position_vulnerabilities, pitcherData.opposing_team, side, pitcherData)}
          </div>

          <div className="analysis-category">
            <h5>🔍 Pattern Recognition</h5>
            {renderPatternRecognition(pitcherData.pattern_recognition)}
          </div>

          <div className="analysis-category">
            <h5>📊 Timing Windows (Pitch Count)</h5>
            {renderTimingWindows(pitcherData.timing_windows)}
          </div>

          {pitcherData.recent_form && (
            <div className="analysis-category">
              <h5>📈 Recent Form</h5>
              <div className="recent-form">
                <span className={`trend ${pitcherData.recent_form.trend || 'unknown'}`}>
                  Trend: {pitcherData.recent_form.trend || 'Unknown'}
                </span>
                <span>
                  HR/Game: {pitcherData.recent_form.hr_rate_per_game ? pitcherData.recent_form.hr_rate_per_game.toFixed(2) : 'N/A'}
                </span>
                <span>
                  Hit Rate: {pitcherData.recent_form.hit_rate ? (pitcherData.recent_form.hit_rate * 100).toFixed(1) : 'N/A'}%
                </span>
                <span>Games: {pitcherData.recent_form.games_analyzed || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="comprehensive-analysis-display">
      <div className="analysis-header">
        <div className="header-main">
          <h2>📊 Comprehensive Weakspot Analysis Results</h2>
          {allMatchups.length > 1 && (
            <div className="matchup-selector">
              <label>Select Matchup:</label>
              <select 
                value={selectedMatchupIndex} 
                onChange={(e) => setSelectedMatchupIndex(parseInt(e.target.value))}
                className="matchup-dropdown"
              >
                {allMatchups.map((matchupData, index) => {
                  const m = matchupData.matchup;
                  return (
                    <option key={index} value={index}>
                      {m ? `${m.away_team} @ ${m.home_team}` : `Matchup ${index + 1}`}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
        {matchup && (
          <div className="matchup-info">
            <span className="teams">{matchup.away_team} @ {matchup.home_team}</span>
            <span className="venue">{matchup.venue}</span>
            <span className="date">{matchup.date}</span>
            {allMatchups.length > 1 && (
              <span className="matchup-counter">Matchup {selectedMatchupIndex + 1} of {allMatchups.length}</span>
            )}
          </div>
        )}
      </div>

      {/* Away Pitcher Analysis */}
      <div className="analysis-section">
        <div className="section-header" onClick={() => toggleSection('away')}>
          <h3>⚾ Away Pitcher Analysis</h3>
          <span className="toggle-icon">{expandedSections.away ? '▼' : '▶'}</span>
        </div>
        {expandedSections.away && (
          <div className="section-content">
            {renderPitcherAnalysis(away_pitcher_analysis, matchup?.away_pitcher, 'away')}
          </div>
        )}
      </div>

      {/* Home Pitcher Analysis */}
      <div className="analysis-section">
        <div className="section-header" onClick={() => toggleSection('home')}>
          <h3>🏠 Home Pitcher Analysis</h3>
          <span className="toggle-icon">{expandedSections.home ? '▼' : '▶'}</span>
        </div>
        {expandedSections.home && (
          <div className="section-content">
            {renderPitcherAnalysis(home_pitcher_analysis, matchup?.home_pitcher, 'home')}
          </div>
        )}
      </div>

      {/* Optimal Pitch-Type Matchups */}
      {optimalMatchups[selectedMatchupIndex] && (
        <div className="analysis-section">
          <div className="section-header" onClick={() => toggleSection('optimal')}>
            <h3>⚡ Optimal Hitter vs Pitch Matchups</h3>
            <span className="toggle-icon">{expandedSections.optimal ? '▼' : '▶'}</span>
          </div>
          {expandedSections.optimal && (
            <div className="section-content">
              <div className="optimal-matchups-container">
                <div className="away-matchups">
                  <h4>🏃 Away Pitcher Vulnerabilities</h4>
                  {renderOptimalMatchups(
                    optimalMatchups[selectedMatchupIndex]?.away_pitcher_matchups,
                    matchup?.away_pitcher
                  )}
                </div>
                
                <div className="home-matchups">
                  <h4>🏠 Home Pitcher Vulnerabilities</h4>
                  {renderOptimalMatchups(
                    optimalMatchups[selectedMatchupIndex]?.home_pitcher_matchups,
                    matchup?.home_pitcher
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overall Matchup Assessment */}
      {overall_matchup_assessment && (
        <div className="analysis-section">
          <div className="section-header" onClick={() => toggleSection('overall')}>
            <h3>🎯 Overall Matchup Assessment</h3>
            <span className="toggle-icon">{expandedSections.overall ? '▼' : '▶'}</span>
          </div>
          {expandedSections.overall && (
            <div className="section-content">
              <div className="overall-assessment">
                <div className="assessment-header">
                  <span className={`advantage ${overall_matchup_assessment.advantage_type}`}>
                    {overall_matchup_assessment.advantage} Advantage ({overall_matchup_assessment.advantage_type})
                  </span>
                  <span className="vulnerable-pitcher">
                    Vulnerable Pitcher: {overall_matchup_assessment.vulnerable_pitcher || 'None'}
                  </span>
                </div>
                
                <div className="vulnerability-comparison">
                  <div className="pitcher-vuln">
                    <span className="label">Away Pitcher:</span>
                    <span className="value">
                      {overall_matchup_assessment.away_pitcher_vulnerability ? 
                        overall_matchup_assessment.away_pitcher_vulnerability.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="pitcher-vuln">
                    <span className="label">Home Pitcher:</span>
                    <span className="value">
                      {overall_matchup_assessment.home_pitcher_vulnerability ? 
                        overall_matchup_assessment.home_pitcher_vulnerability.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="pitcher-vuln">
                    <span className="label">Difference:</span>
                    <span className="value">
                      {overall_matchup_assessment.vulnerability_difference ? 
                        overall_matchup_assessment.vulnerability_difference.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                </div>

                {overall_matchup_assessment.key_patterns && overall_matchup_assessment.key_patterns.length > 0 && (
                  <div className="key-patterns">
                    <h5>Key Patterns Identified:</h5>
                    <ul>
                      {overall_matchup_assessment.key_patterns.map((pattern, idx) => (
                        <li key={idx}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {overall_matchup_assessment.recommended_strategy && (
                  <div className="recommended-strategy">
                    <h5>Recommended Strategy:</h5>
                    <p>{overall_matchup_assessment.recommended_strategy}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Player Tooltip Modal */}
      {selectedPlayerTooltip && (
        <div className="player-tooltip-overlay" onClick={closePlayerTooltip}>
          <div className="player-tooltip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tooltip-header">
              <h3>{selectedPlayerTooltip.playerName} - Dashboard Insights</h3>
              <button className="close-tooltip" onClick={closePlayerTooltip}>×</button>
            </div>
            <div className="tooltip-content">
              {selectedPlayerTooltip.playerContext.badges && selectedPlayerTooltip.playerContext.badges.length > 0 && (
                <div className="tooltip-badges">
                  <h4>Dashboard Cards (click for details):</h4>
                  <div className="badge-list">
                    {selectedPlayerTooltip.playerContext.badges.map((badge, idx) => {
                      // Get tooltip type from badge structure or fallback to text analysis
                      const tooltipType = badge.type || (() => {
                        const badgeText = typeof badge === 'string' ? badge : (badge.fullText || badge.text || badge.emoji || '');
                        if (typeof badgeText !== 'string') return 'positive_momentum'; // fallback if not string
                        if (badgeText.includes('Hot Streak') || badgeText.includes('Active Streak')) return 'streak_hit';
                        if (badgeText.includes('Due for HR') || badgeText.includes('HR Candidate')) return 'hr_prediction';
                        if (badgeText.includes('Positive Momentum') || badgeText.includes('Improved Form')) return 'positive_momentum';
                        if (badgeText.includes('Risk')) return 'poor_performance';
                        if (badgeText.includes('Likely Hit')) return 'likely_hit';
                        if (badgeText.includes('Multi-Hit')) return 'multi_hit';
                        if (badgeText.includes('Milestone Alert') || badgeText.includes('Milestone Watch') || badgeText.includes('Milestone Near')) return 'milestone_tracking';
                        if (badgeText.includes('Power Surge') || badgeText.includes('Recent Power')) return 'recent_homers';
                        if (badgeText.includes('Elite Streak') || badgeText.includes('Extended Streak')) return 'hit_streak_extended';
                        return 'positive_momentum'; // default
                      })();
                      // Debug milestone data specifically
                      const milestoneData = selectedPlayerTooltip.playerContext?.milestoneTrackingData;
                      console.log('🎯 COMPREHENSIVE DEBUG - Milestone tooltip:', {
                        playerName: selectedPlayerTooltip.playerName,
                        tooltipType,
                        hasMilestoneTrackingData: !!milestoneData,
                        milestoneTrackingData: milestoneData,
                        milestoneKeys: milestoneData ? Object.keys(milestoneData) : [],
                        contextPlayerName: selectedPlayerTooltip.playerContext?.playerName,
                        contextTeam: selectedPlayerTooltip.playerContext?.team,
                        allContextKeys: selectedPlayerTooltip.playerContext ? Object.keys(selectedPlayerTooltip.playerContext) : [],
                        fullContext: selectedPlayerTooltip.playerContext
                      });
                      
                      // Verify player name consistency
                      if (selectedPlayerTooltip.playerContext?.playerName !== selectedPlayerTooltip.playerName) {
                        console.warn('⚠️ MISMATCH: Tooltip player name does not match context player name!');
                        console.warn(`   Tooltip says: "${selectedPlayerTooltip.playerName}"`);
                        console.warn(`   Context says: "${selectedPlayerTooltip.playerContext?.playerName}"`);
                      }
                      
                      let playerData;
                      if (tooltipType === 'milestone_tracking') {
                        if (milestoneData) {
                          // For milestone tooltips, pass the milestone data directly
                          playerData = milestoneData;
                          console.log('🎯 PASSING MILESTONE DATA DIRECTLY:', playerData);
                        } else {
                          // Try to find milestone data in the playerContexts map as a fallback
                          console.log('⚠️ NO MILESTONE DATA in selectedPlayerTooltip for', selectedPlayerTooltip.playerName);
                          
                          // Try to get it from the stored contexts
                          const playerKey = `${selectedPlayerTooltip.playerName}-${selectedPlayerTooltip.playerContext?.team || ''}`;
                          const storedContext = playerContexts[playerKey];
                          console.log('🔍 Looking for stored context with key:', playerKey);
                          console.log('🔍 Found stored context:', !!storedContext);
                          console.log('🔍 Stored context has milestone data:', !!storedContext?.milestoneTrackingData);
                          
                          if (storedContext?.milestoneTrackingData) {
                            playerData = storedContext.milestoneTrackingData;
                            console.log('✅ FOUND MILESTONE DATA IN STORED CONTEXT:', playerData);
                          } else {
                            console.log('❌ NO MILESTONE DATA FOUND ANYWHERE');
                            playerData = {
                              playerName: selectedPlayerTooltip.playerName,
                              team: selectedPlayerTooltip.playerContext?.team || '',
                              // Empty milestone structure to avoid confusion
                              milestone: null,
                              timeline: null,
                              momentum: null
                            };
                          }
                        }
                      } else {
                        // For other tooltips, spread the appropriate data
                        playerData = {
                          playerName: selectedPlayerTooltip.playerName,
                          // Include all raw data from dashboard context
                          ...selectedPlayerTooltip.playerContext.positivePerformanceData,
                          ...selectedPlayerTooltip.playerContext.poorPerformanceData,
                          ...selectedPlayerTooltip.playerContext.hitStreakData,
                          ...selectedPlayerTooltip.playerContext.hrPredictionData,
                          ...selectedPlayerTooltip.playerContext.likelyToHitData,
                          ...selectedPlayerTooltip.playerContext.recentHomersData,
                          ...selectedPlayerTooltip.playerContext.extendedHitStreakData
                        };
                      }
                      
                      return (
                        <span 
                          key={idx} 
                          className="tooltip-badge clickable"
                          onClick={(e) => {
                            closePlayerTooltip(); // Close summary first
                            showDashboardTooltip(playerData, tooltipType, e);
                          }}
                        >
                          {typeof badge === 'string' ? badge : (badge.fullText || badge.text || badge.emoji || 'Insight')}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {selectedPlayerTooltip.playerContext.standoutReasons && selectedPlayerTooltip.playerContext.standoutReasons.length > 0 && (
                <div className="tooltip-reasons">
                  <h4>Key Factors:</h4>
                  <ul>
                    {selectedPlayerTooltip.playerContext.standoutReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedPlayerTooltip.playerContext.positivePerformanceData && (
                <div className="tooltip-detailed-data">
                  <h4>Positive Performance Analysis:</h4>
                  <div className="performance-score">
                    Score: {selectedPlayerTooltip.playerContext.positivePerformanceData.totalPositiveScore}
                  </div>
                  <div className="momentum-level">
                    Momentum: {selectedPlayerTooltip.playerContext.positivePerformanceData.momentumLevel}
                  </div>
                  
                  {selectedPlayerTooltip.playerContext.positivePerformanceData.positiveFactors && (
                    <div className="positive-factors">
                      <h5>Positive Factors:</h5>
                      {selectedPlayerTooltip.playerContext.positivePerformanceData.positiveFactors.map((factor, idx) => (
                        <div key={idx} className="factor-item">
                          <strong>{factor.type}:</strong> {factor.description} ({factor.positivePoints} pts)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {selectedPlayerTooltip.playerContext.contextSummary && (
                <div className="tooltip-summary">
                  <h4>Summary:</h4>
                  <p>{selectedPlayerTooltip.playerContext.contextSummary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveAnalysisDisplay;