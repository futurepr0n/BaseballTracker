import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTeamFilter } from '../TeamFilterContext';
import useTeamFilteredData from '../useTeamFilter';
import GlassCard from './GlassCard/GlassCard';
import MobilePlayerCard from '../common/MobilePlayerCard';
import SeasonOverviewChart from './PlayerPropsLadderCard/SeasonOverviewChart';
import Recent5GamesChart from './PlayerPropsLadderCard/Recent5GamesChart';
import OpponentHistoryChart from './PlayerPropsLadderCard/OpponentHistoryChart';
import enhancedGameDataService from '../../services/enhancedGameDataService';
import './PlayerPropsLadderCard.css';
import './PlayerPropsLadderCard/PlayerPropsCharts.css';
import '../common/MobilePlayerCard.css';

const PlayerPropsLadderCard = ({ currentDate, gameData }) => {
  const [selectedProp, setSelectedProp] = useState('hits');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [propAnalysisData, setPropAnalysisData] = useState(null);
  const [propDataCache, setPropDataCache] = useState({});  // NEW: Cache for prop-specific data
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerChartData, setPlayerChartData] = useState(null);
  const [recentGamesData, setRecentGamesData] = useState(null);
  const [mobileExpandedPlayer, setMobileExpandedPlayer] = useState(null);
  const [opponentHistoryLoading, setOpponentHistoryLoading] = useState(false);
  const [enhancedOpponentData, setEnhancedOpponentData] = useState(null);
  
  const { selectedTeam, includeMatchup, matchupTeam } = useTeamFilter();

  // Memoize the date string to prevent unnecessary re-renders
  const currentDateString = useMemo(() => {
    if (!currentDate) {
      console.log('📅 No currentDate provided, using today');
      // Fallback to today's date if none provided
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
    
    // Validate that currentDate is actually a Date object and valid
    if (!(currentDate instanceof Date)) {
      console.warn('📅 currentDate is not a Date object:', typeof currentDate, currentDate);
      // Try to convert it to a Date
      try {
        const convertedDate = new Date(currentDate);
        if (!isNaN(convertedDate.getTime())) {
          const dateString = convertedDate.toISOString().split('T')[0];
          console.log('📅 Converted and generated date string:', dateString);
          return dateString;
        }
      } catch (conversionError) {
        console.error('📅 Failed to convert currentDate:', conversionError);
      }
      // Fall back to today
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
    
    if (isNaN(currentDate.getTime())) {
      console.warn('📅 currentDate is an invalid Date:', currentDate);
      // Fall back to today
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
    
    try {
      const dateString = currentDate.toISOString().split('T')[0];
      console.log('📅 Generated date string:', dateString);
      return dateString;
    } catch (error) {
      console.error('📅 Error generating date string:', error);
      // Fall back to today
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
  }, [currentDate]);

  // Specialized data loading that bypasses SharedDataManager's 30-date limit
  const loadPlayerDataUnlimited = useCallback(async (endDate, playerName, playerTeam) => {
    try {
      console.log(`🔍 UNLIMITED: Loading comprehensive data for ${playerName} (${playerTeam})`);
      console.log(`📅 FIXED: Using app selected date for consistency with other components: ${endDate.toISOString().split('T')[0]}`);
      
      // Phase 1: Try to get recent data (last 30 days) with higher priority
      const recentData = {};
      const now = new Date(endDate);
      
      // Load the most recent 60 days first to ensure we get July data
      for (let daysBack = 0; daysBack < 60; daysBack++) {
        const searchDate = new Date(now);
        searchDate.setDate(searchDate.getDate() - daysBack);
        
        // FIXED: Removed weekend skipping - MLB plays 7 days a week
        // Note: Baseball games happen on weekends, so we need to search all days
        
        // Check if it's a valid MLB season date
        const year = searchDate.getFullYear();
        const seasonStart = year === 2025 ? new Date('2025-03-18') : new Date(`${year}-03-20`);
        const seasonEnd = new Date(`${year}-10-31`);
        if (searchDate < seasonStart || searchDate > seasonEnd) continue;
        
        const dateStr = searchDate.toISOString().split('T')[0];
        
        try {
          // Direct file loading to bypass SharedDataManager limits
          const [year, /* month */, day] = dateStr.split('-');
          const monthName = searchDate.toLocaleString('default', { month: 'long' }).toLowerCase();
          const filePath = `/data/${year}/${monthName}/${monthName}_${day}_${year}.json`;
          
          const response = await fetch(filePath);
          if (response.ok) {
            const data = await response.json();
            if (data.players && Array.isArray(data.players) && data.players.length > 0) {
              recentData[dateStr] = data.players;
              console.log(`📅 UNLIMITED: Loaded ${data.players.length} players for ${dateStr}`);
            }
          }
        } catch (error) {
          // Silent handling of missing dates
          continue;
        }
      }
      
      // Phase 2: If we need more historical data (for opponent matching), load additional dates
      const recentCount = Object.keys(recentData).length;
      console.log(`📊 UNLIMITED: Phase 1 complete - loaded ${recentCount} recent dates`);
      
      if (recentCount < 30) {
        console.log(`📅 UNLIMITED: Loading additional historical data...`);
        
        // Load additional 90 days for historical context
        for (let daysBack = 60; daysBack < 150; daysBack++) {
          const searchDate = new Date(now);
          searchDate.setDate(searchDate.getDate() - daysBack);
          
          // Skip weekends and off-season dates
          const dayOfWeek = searchDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;
          
          const year = searchDate.getFullYear();
          const seasonStart = year === 2025 ? new Date('2025-03-18') : new Date(`${year}-03-20`);
          const seasonEnd = new Date(`${year}-10-31`);
          if (searchDate < seasonStart || searchDate > seasonEnd) continue;
          
          const dateStr = searchDate.toISOString().split('T')[0];
          
          // Skip if we already have this date
          if (recentData[dateStr]) continue;
          
          try {
            const [year, /* month */, day] = dateStr.split('-');
            const monthName = searchDate.toLocaleString('default', { month: 'long' }).toLowerCase();
            const filePath = `/data/${year}/${monthName}/${monthName}_${day}_${year}.json`;
            
            const response = await fetch(filePath);
            if (response.ok) {
              const data = await response.json();
              if (data.players && Array.isArray(data.players) && data.players.length > 0) {
                recentData[dateStr] = data.players;
              }
            }
          } catch (error) {
            continue;
          }
        }
      }
      
      const totalCount = Object.keys(recentData).length;
      console.log(`📊 UNLIMITED: Complete - loaded ${totalCount} total dates with data`);
      
      return recentData;
      
    } catch (error) {
      console.error('❌ UNLIMITED: Error loading player data:', error);
      return {};
    }
  }, []);

  // Available props configuration (memoized to prevent re-creation)
  const propOptions = useMemo(() => [
    { key: 'hits', label: 'Hits', icon: '⚾', statKey: 'H' },
    { key: 'rbi', label: 'RBI', icon: '🏃', statKey: 'RBI' },
    { key: 'runs', label: 'Runs', icon: '🏠', statKey: 'R' },
    { key: 'home_runs', label: 'Home Runs', icon: '🏟️', statKey: 'HR' },
    { key: 'walks', label: 'Walks', icon: '🚶', statKey: 'totalBBs' }
  ], []);

  // Load prop-specific data with caching
  const loadPlayerPropData = useCallback(async (targetProp, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1); // Progressive delay
    
    // Check cache first
    const cacheKey = `${targetProp}_${currentDateString}`;
    if (propDataCache[cacheKey]) {
      console.log(`🎯 Using cached data for ${targetProp}`, cacheKey);
      setPropAnalysisData(propDataCache[cacheKey]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🎯 Loading prop-specific data for ${targetProp}...`, { 
        currentDate, 
        currentDateString,
        targetProp,
        cacheKey,
        loadAttempt: new Date().toISOString(),
        retryCount,
        maxRetries
      });
      
      // Try to load date-specific prop file first, fallback to latest
      let propAnalysisResponse;
      let dateSpecificFound = false;
      
      if (currentDateString) {
        const dateSpecificUrl = `/data/prop_analysis/${targetProp}_analysis_${currentDateString}.json`;
        console.log('📅 Trying date-specific prop URL:', dateSpecificUrl);
        
        // Add fetch timeout and better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          propAnalysisResponse = await fetch(dateSpecificUrl, {
            signal: controller.signal,
            cache: 'no-cache', // Bypass browser cache on retry
            headers: {
              'Cache-Control': retryCount > 0 ? 'no-cache' : 'default'
            }
          });
          clearTimeout(timeoutId);
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timed out after 10 seconds');
          }
          throw fetchError;
        }
        
        // Check if we got HTML instead of JSON (React dev server behavior for missing files)
        const contentType = propAnalysisResponse.headers.get('content-type');
        const isHtml = contentType && contentType.includes('text/html');
        
        if (!propAnalysisResponse.ok || isHtml) {
          if (isHtml) {
            console.log(`📅 Date-specific ${targetProp} file returned HTML (missing), using latest`);
          } else {
            console.log(`📅 Date-specific ${targetProp} analysis not found, using latest`);
          }
          // Apply same timeout and cache control to latest file
          const latestController = new AbortController();
          const latestTimeoutId = setTimeout(() => latestController.abort(), 10000);
          
          try {
            propAnalysisResponse = await fetch(`/data/prop_analysis/${targetProp}_analysis_latest.json`, {
              signal: latestController.signal,
              cache: 'no-cache',
              headers: {
                'Cache-Control': retryCount > 0 ? 'no-cache' : 'default'
              }
            });
            clearTimeout(latestTimeoutId);
          } catch (latestFetchError) {
            clearTimeout(latestTimeoutId);
            if (latestFetchError.name === 'AbortError') {
              throw new Error('Latest file request timed out after 10 seconds');
            }
            throw latestFetchError;
          }
        } else {
          dateSpecificFound = true;
        }
      } else {
        console.log(`📅 No currentDate provided, using latest for ${targetProp}`);
        // Apply same timeout and cache control to initial latest fetch
        const initialController = new AbortController();
        const initialTimeoutId = setTimeout(() => initialController.abort(), 10000);
        
        try {
          propAnalysisResponse = await fetch(`/data/prop_analysis/${targetProp}_analysis_latest.json`, {
            signal: initialController.signal,
            cache: 'no-cache',
            headers: {
              'Cache-Control': retryCount > 0 ? 'no-cache' : 'default'
            }
          });
          clearTimeout(initialTimeoutId);
        } catch (initialFetchError) {
          clearTimeout(initialTimeoutId);
          if (initialFetchError.name === 'AbortError') {
            throw new Error('Initial latest file request timed out after 10 seconds');
          }
          throw initialFetchError;
        }
      }
      
      console.log('📡 Fetch response status:', propAnalysisResponse.status, propAnalysisResponse.statusText);
      
      // Check for HTML response again (could happen with latest file too)
      const finalContentType = propAnalysisResponse.headers.get('content-type');
      const isFinalHtml = finalContentType && finalContentType.includes('text/html');
      
      if (!propAnalysisResponse.ok || isFinalHtml) {
        const errorDetails = {
          status: propAnalysisResponse.status,
          statusText: propAnalysisResponse.statusText,
          contentType: finalContentType,
          url: propAnalysisResponse.url,
          isHtml: isFinalHtml,
          targetProp
        };
        console.error('❌ HTTP Error details:', errorDetails);
        
        if (isFinalHtml) {
          throw new Error(`${targetProp} prop analysis files not found (server returned HTML). Please run: node src/services/generatePropAnalysis.js`);
        } else if (propAnalysisResponse.status === 404) {
          throw new Error(`${targetProp} prop analysis file not found. Please run: node src/services/generatePropAnalysis.js`);
        } else {
          throw new Error(`Failed to load ${targetProp} prop analysis data (HTTP ${propAnalysisResponse.status}: ${propAnalysisResponse.statusText})`);
        }
      }
      
      const propData = await propAnalysisResponse.json();
      console.log(`✅ Pre-computed ${targetProp} analysis loaded:`, {
        date: propData.date,
        propType: propData.propType,
        totalPlayers: propData.totalPlayers,
        generatedAt: propData.generatedAt,
        dataSize: JSON.stringify(propData).length
      });
      
      // Cache the loaded data
      setPropDataCache(prev => ({
        ...prev,
        [cacheKey]: propData
      }));
      
      setPropAnalysisData(propData);
      
    } catch (err) {
      console.error(`❌ Error loading ${targetProp} prop analysis:`, err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        currentDate: currentDate,
        currentDateString: currentDateString,
        targetProp,
        retryCount
      });
      
      // Retry logic for transient failures
      if (retryCount < maxRetries && (
        err.message.includes('server returned HTML') ||
        err.message.includes('HTML instead of JSON') ||
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('timed out') ||
        err.message.includes('Unexpected token')
      )) {
        console.log(`🔄 Retrying ${targetProp} in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries + 1})`);
        setLoading(false); // Allow UI to show retry state briefly
        
        setTimeout(() => {
          loadPlayerPropData(targetProp, retryCount + 1);
        }, retryDelay);
        
        return; // Don't set error state, we're retrying
      }
      
      setError(`${targetProp} prop analysis data not available. ${err.message}`);
    } finally {
      if (retryCount === 0 || retryCount >= maxRetries) {
        setLoading(false);
      }
    }
  }, [currentDateString, currentDate, propDataCache]);

  // Load player prop data for initial selectedProp
  useEffect(() => {
    loadPlayerPropData(selectedProp);
  }, [loadPlayerPropData, currentDateString]);

  // Reload data when selectedProp changes
  useEffect(() => {
    loadPlayerPropData(selectedProp);
  }, [selectedProp, loadPlayerPropData]);

  // Load recent games and opponent history from historical data  
  const loadPlayerRecentGames = useCallback(async (player, propKey) => {
    try {
      console.log(`🔍 Loading games for ${player.name} (${player.team}) - ${propKey}`);
      
      // Get comprehensive data using specialized unlimited approach
      // FIXED: Use app's selected date for consistency with other components like EnhancedPlayerAnalysis
      const endDate = currentDate || new Date(); // Use app's selected date for consistency
      const historicalData = await loadPlayerDataUnlimited(endDate, player.name, player.team);
      
      const propOption = propOptions.find(p => p.key === propKey);
      
      console.log(`📅 Loaded historical data:`, Object.keys(historicalData || {}).length, 'dates');
      
      // Get today's opponent by looking at current team filter
      let opponentTeam = null;
      if (selectedTeam && includeMatchup && matchupTeam) {
        // If we're in matchup mode, the opponent is the other team
        opponentTeam = selectedTeam === player.team ? matchupTeam : selectedTeam;
        console.log(`🆚 Found opponent from matchup context: ${opponentTeam}`);
      }
      
      // FIRST PASS: Collect ALL games for this player
      const allGames = [];
      if (historicalData && propOption && typeof historicalData === 'object') {
        const dateKeys = Object.keys(historicalData).sort().reverse(); // Most recent first
        
        dateKeys.forEach(dateKey => {
          const dayData = historicalData[dateKey];
          
          if (dayData && Array.isArray(dayData) && dayData.length > 0) {
            const playerData = dayData.find(p => 
              p && (p.name === player.name || p.Name === player.name) && 
              (p.team === player.team || p.Team === player.team)
            );
            
            if (playerData && propOption.statKey) {
              const propValue = playerData[propOption.statKey] || 0;
              
              // FIXED: Resolve opponent using game cross-reference instead of non-existent fields
              let gameOpponent = null;
              let opponentDisplay = null;
              
              // Try to resolve opponent using gameId cross-reference
              if (playerData.gameId && dayData.games) {
                const opponentInfo = enhancedGameDataService.resolveOpponentForPlayer(
                  player.team, 
                  playerData.gameId, 
                  dayData.games
                );
                if (opponentInfo) {
                  gameOpponent = opponentInfo.team;
                  opponentDisplay = opponentInfo.formattedOpponent;
                }
              }
              
              // Fallback: try to extract from existing fields (for backwards compatibility)
              if (!gameOpponent) {
                gameOpponent = playerData.opponent || playerData.Opponent || 
                              playerData.vs || playerData.VS || playerData.opposingTeam;
                opponentDisplay = gameOpponent;
              }
              
              const gameData = {
                date: dateKey,
                displayDate: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: propValue,
                success1Plus: propValue >= 1,
                success2Plus: propValue >= 2,
                opponent: gameOpponent,
                opponentDisplay: opponentDisplay, // Properly formatted opponent display
                gameId: playerData.gameId, // Include gameId for reference
                rawData: playerData
              };
              
              allGames.push(gameData);
            }
          }
        });
      }
      
      // Try to find opponent from game data if not found from context
      if (!opponentTeam && allGames.length > 0) {
        for (const game of allGames.slice(0, 5)) {
          if (game.opponent && game.opponent !== player.team) {
            opponentTeam = game.opponent;
            console.log(`🆚 Found opponent from game data: ${opponentTeam}`);
            break;
          }
        }
      }
      
      console.log(`📊 Found ${allGames.length} total games for ${player.name}`);
      
      // SECOND PASS: Separate into categories (FIXED - return proper structure)
      const recentGames = allGames.slice(0, 5).map(game => ({
        ...game,
        gameType: 'recent'
      }));
      
      // Get ALL games vs opponent (separate from recent games)
      const opponentHistory = allGames
        .filter(game => opponentTeam && game.opponent === opponentTeam)
        .map(game => ({
          ...game,
          gameType: 'opponent'  
        }));
      
      console.log(`📊 Separated: ${recentGames.length} recent games, ${opponentHistory.length} opponent history games`);
      
      // FIXED: Return structured data instead of combined array
      // This prevents Recent5GamesChart from receiving mixed data
      const structuredData = {
        recentGames: recentGames,
        opponentHistory: opponentHistory,
        opponentInfo: opponentTeam ? {
          team: opponentTeam,
          count: opponentHistory.length
        } : null
      };
      
      console.log(`📊 Returning structured data: ${recentGames.length} recent, ${opponentHistory.length} opponent vs ${opponentTeam}`);
      
      return structuredData;
    } catch (err) {
      console.error('Error loading recent games:', err);
      return [];
    }
  }, [currentDate, propOptions, selectedTeam, includeMatchup, matchupTeam]);

  // Load player details when a player is selected (enhanced for separate charts)
  const loadPlayerDetails = useCallback(async (player) => {
    try {
      console.log(`📊 Loading enhanced chart data for ${player.name}...`);
      
      // Check if player has pre-computed chart data
      if (player.chartData) {
        console.log(`✅ Using pre-computed chart data for ${player.name}`);
        setPlayerChartData(player.chartData);
        setRecentGamesData(player.chartData.recent3Games || []);
      } else {
        console.log(`⚠️ No pre-computed data, falling back to dynamic loading for ${player.name}`);
        
        // Fallback: Generate basic chart data structure
        const fallbackChartData = {
          seasonOverview: {
            seasonTotal: player.seasonTotal || 0,
            seasonAverage: player.rate || 0,
            gamesPlayed: player.games || 0,
            leagueAverage: getLeagueAverageForProp(selectedProp),
            projectedTotal: Math.round((player.rate || 0) * 162)
          },
          recent3Games: [],
          opponentHistory: {}
        };
        
        setPlayerChartData(fallbackChartData);
        
        // Load recent games data using existing method as fallback
        const gameData = await loadPlayerRecentGames(player, selectedProp);
        // FIXED: Handle new structured data format
        if (gameData && gameData.recentGames) {
          setRecentGamesData(gameData.recentGames || []);
        } else if (Array.isArray(gameData)) {
          // Fallback for legacy format
          setRecentGamesData(gameData.slice(0, 5) || []);
        } else {
          setRecentGamesData([]);
        }
      }
      
    } catch (err) {
      console.error('Error loading player details:', err);
      setPlayerChartData(null);
      setRecentGamesData([]);
    }
  }, [selectedProp, loadPlayerRecentGames]);

  // Enhanced opponent history loading when team matchup context is available
  const loadEnhancedOpponentHistory = useCallback(async (player, targetOpponent, statKey) => {
    if (!player || !targetOpponent || !statKey) {
      console.log('🆚 Enhanced opponent loading: Missing required parameters');
      setEnhancedOpponentData(null);
      return;
    }

    try {
      setOpponentHistoryLoading(true);
      console.log(`🔍 ENHANCED: Loading opponent history for ${player.name} vs ${targetOpponent} (${statKey})`);
      
      // Use enhanced game data service to get proper opponent history
      const opponentAnalysis = await enhancedGameDataService.getPlayerVsOpponentAnalysis(
        player.name, 
        player.team, 
        targetOpponent, 
        statKey
      );
      
      console.log(`✅ ENHANCED: Found opponent data:`, opponentAnalysis);
      setEnhancedOpponentData(opponentAnalysis);
      
    } catch (error) {
      console.error('❌ Enhanced opponent history loading failed:', error);
      setEnhancedOpponentData(null);
    } finally {
      setOpponentHistoryLoading(false);
    }
  }, []);

  // Automatic opponent detection from today's schedule
  const getAutomaticOpponent = useCallback((playerTeam) => {
    if (!gameData || !playerTeam || !Array.isArray(gameData)) return null;
    
    // Find today's game for this player's team
    const todaysGame = gameData.find(game => 
      game.homeTeam === playerTeam || game.awayTeam === playerTeam
    );
    
    if (todaysGame) {
      const opponent = todaysGame.homeTeam === playerTeam 
        ? todaysGame.awayTeam 
        : todaysGame.homeTeam;
      
      console.log(`🎯 Auto-detected opponent for ${playerTeam}: ${opponent} (from today's schedule)`);
      return opponent;
    }
    
    console.log(`🎯 No game found for ${playerTeam} in today's schedule`);
    return null;
  }, [gameData]);

  // Determine current opponent with priority: today's schedule → team filter → historical
  const getCurrentOpponent = useCallback(() => {
    // Priority 1: Automatic detection from today's schedule
    if (selectedPlayer && selectedPlayer.team) {
      const automaticOpponent = getAutomaticOpponent(selectedPlayer.team);
      if (automaticOpponent) {
        return automaticOpponent;
      }
    }
    
    // Priority 2: Manual team filter context
    if (selectedTeam && includeMatchup && matchupTeam && selectedPlayer) {
      return selectedTeam === selectedPlayer.team ? matchupTeam : selectedTeam;
    }
    
    return null;
  }, [selectedTeam, includeMatchup, matchupTeam, selectedPlayer, getAutomaticOpponent]);

  // Helper function to get league average for prop types
  const getLeagueAverageForProp = useCallback((propKey) => {
    const leagueAverages = {
      hits: 1.0,
      rbi: 0.6,
      runs: 0.6,
      home_runs: 0.9,
      walks: 0.4
    };
    return leagueAverages[propKey] || 0.5;
  }, []);

  // Helper function to detect opponent from recent games data
  const getDetectedOpponent = useCallback(() => {
    if (!recentGamesData || recentGamesData.length === 0) return null;
    
    // Look for opponent info in recent games data
    if (recentGamesData.opponentInfo) {
      return recentGamesData.opponentInfo.team;
    }
    
    // Fallback: get opponent from most recent game
    const mostRecentGame = recentGamesData[0];
    return mostRecentGame?.opponent || null;
  }, [recentGamesData]);

  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerDetails(selectedPlayer);
    } else {
      setPlayerChartData(null);
      setRecentGamesData(null);
    }
  }, [selectedPlayer, loadPlayerDetails]);

  // Enhanced opponent history loading - automatically detects current opponent
  useEffect(() => {
    const currentOpponent = getCurrentOpponent();
    
    if (selectedPlayer && currentOpponent) {
      // Load opponent history automatically when current opponent is detected
      console.log(`🎯 Auto-loading enhanced opponent history for ${selectedPlayer.name} vs ${currentOpponent}`);
      
      // Get the stat key for current prop
      const propOption = propOptions.find(p => p.key === selectedProp);
      if (propOption && propOption.statKey) {
        loadEnhancedOpponentHistory(selectedPlayer, currentOpponent, propOption.statKey);
      }
    } else {
      // Clear enhanced opponent data when no opponent detected
      if (!currentOpponent) {
        console.log('🎯 No current opponent detected: Clearing enhanced opponent data');
      }
      setEnhancedOpponentData(null);
    }
  }, [selectedPlayer, selectedProp, getCurrentOpponent, loadEnhancedOpponentHistory]);

  // Get base player data for selected prop (updated for individual prop files)
  const getBasePlayerData = useMemo(() => {
    if (!propAnalysisData || !selectedProp) {
      console.log('No prop analysis data or selected prop');
      return [];
    }
    
    // New structure: data is directly at root level for individual prop files
    if (propAnalysisData.propType !== selectedProp) {
      console.log(`Prop data mismatch: expected ${selectedProp}, got ${propAnalysisData.propType}`);
      return [];
    }
    
    // Always use topPlayers as base data, team filtering will be applied separately
    const topPlayers = propAnalysisData.topPlayers || [];
    console.log(`Base data: ${topPlayers.length} players available for ${selectedProp}`);
    return topPlayers;
  }, [propAnalysisData, selectedProp]);
  
  // Apply team filtering using the standard hook
  const filteredPlayers = useTeamFilteredData(getBasePlayerData, 'team');


  // Loading state
  if (loading) {
    return (
      <GlassCard className="player-props-ladder-card" variant="default">
        <div className="glass-header">
          <h3>📊 Player Props Ladder</h3>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading pre-computed prop analysis...</p>
        </div>
      </GlassCard>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassCard className="player-props-ladder-card" variant="default">
        <div className="glass-header">
          <h3>📊 Player Props Ladder</h3>
        </div>
        <div className="error-state">
          <p>Error: {error}</p>
          <div className="error-actions">
            <button onClick={() => loadPlayerPropData(selectedProp)} className="retry-button">
              Retry Analysis
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="refresh-button"
              style={{marginLeft: '10px'}}
            >
              Refresh Page
            </button>
          </div>
          <div className="debug-info" style={{marginTop: '10px', fontSize: '12px', color: '#666'}}>
            <details>
              <summary>Debug Info</summary>
              <div>Date: {currentDateString}</div>
              <div>Selected Prop: {selectedProp}</div>
              <div>Files checked: {selectedProp}_analysis_{currentDateString}.json, {selectedProp}_analysis_latest.json</div>
              <div>Cache keys: {Object.keys(propDataCache).length > 0 ? Object.keys(propDataCache).join(', ') : 'None'}</div>
              <div>Note: Now using individual prop files for better performance</div>
            </details>
          </div>
        </div>
      </GlassCard>
    );
  }

  const currentPropOption = propOptions.find(p => p.key === selectedProp);
  
  // Display limit based on filtering state
  const displayLimit = selectedTeam ? (includeMatchup && matchupTeam ? 50 : 50) : 25;
  const displayPlayers = filteredPlayers.slice(0, displayLimit);
  
  console.log(`Team filtering: ${filteredPlayers.length} filtered, showing ${displayPlayers.length}`);

  return (
    <GlassCard className="player-props-ladder-card" variant="default">
      <div className="glass-header">
        <h3>📊 Player Props Ladder</h3>
        <span className="card-subtitle">
          {selectedTeam ? 
            (includeMatchup && matchupTeam ? `${selectedTeam} vs ${matchupTeam} Matchup` : `${selectedTeam} Players`) : 
            'Top Opportunities Across All Teams'
          }
        </span>
      </div>

      {/* Prop Selection Buttons */}
      <div className="prop-selector">
        <div className="prop-buttons">
          {propOptions.map(prop => (
            <button
              key={prop.key}
              className={`prop-button ${selectedProp === prop.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedProp(prop.key);
                setSelectedPlayer(null); // Reset selection when changing prop
                setMobileExpandedPlayer(null); // Reset mobile expansion when changing prop
              }}
            >
              <span className="prop-icon">{prop.icon}</span>
              <span className="prop-label">{prop.label}</span>
            </button>
          ))}
        </div>
        
        {/* Team Filter Status */}
        <div className="matchup-toggle">
          <span className="toggle-text">
            {selectedTeam ? 
              (includeMatchup && matchupTeam ? `Showing ${selectedTeam} vs ${matchupTeam} players` : `Showing ${selectedTeam} players`) :
              `Showing top ${displayLimit} players league-wide`
            }
          </span>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="chart-section">
        {/* Desktop View - Main Content Area */}
        <div className="desktop-view">
          {/* Player Selection List */}
          <div className="player-selection-area">
            <h4 className="section-title">
              Top {currentPropOption?.label} Opportunities
            </h4>
            <div className="player-list">
              {displayPlayers.map((player, index) => (
                <div 
                  key={player.id}
                  className={`player-item ${selectedPlayer?.id === player.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="player-rank">#{index + 1}</div>
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-team">{player.team}</div>
                  </div>
                  <div className="player-stats">
                    <div className="stat-value">{player.seasonTotal}</div>
                    <div className="stat-label">Season</div>
                  </div>
                  <div className="player-rate">
                    <div className="rate-value">{player.rate}</div>
                    <div className="rate-label">Per Game</div>
                  </div>
                  <div className="player-prob">
                    <div className="prob-value">{player.prob1Plus}%</div>
                    <div className="prob-label">1+ Prob</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        
        {/* Enhanced Player Charts - Three Separate Charts */}
        {selectedPlayer && (
          <div className="player-charts">
            <h4 className="section-title">
              {selectedPlayer.name} - {currentPropOption?.label} Analysis
            </h4>
            
            <div className="enhanced-charts-container">
              {/* Season Overview Chart */}
              <SeasonOverviewChart 
                player={selectedPlayer}
                seasonData={playerChartData?.seasonOverview}
                propOption={currentPropOption}
              />
              
              {/* Recent 5 Games Chart */}
              <Recent5GamesChart 
                recentGamesData={playerChartData?.recent5Games || recentGamesData}
                propOption={currentPropOption}
              />
              
              {/* Opponent History Chart */}
              <OpponentHistoryChart 
                opponentHistoryData={enhancedOpponentData || playerChartData?.opponentHistory}
                currentOpponent={getCurrentOpponent() || getDetectedOpponent()}
                propOption={currentPropOption}
                loading={opponentHistoryLoading}
                enhanced={!!enhancedOpponentData}
              />
            </div>
            
            {/* Player Stats Summary */}
            <div className="player-summary">
              <div className="summary-stat">
                <span className="summary-label">Season Total:</span>
                <span className="summary-value">{selectedPlayer.seasonTotal}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-label">Per Game Rate:</span>
                <span className="summary-value">{selectedPlayer.rate}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-label">Recent Form:</span>
                <span className={`summary-value trend-${selectedPlayer.trend}`}>
                  {selectedPlayer.recentRate} 
                  {selectedPlayer.trend === 'up' ? '📈' : selectedPlayer.trend === 'down' ? '📉' : '➡️'}
                </span>
              </div>
              <div className="summary-stat">
                <span className="summary-label">Confidence:</span>
                <span className={`summary-value confidence-${selectedPlayer.confidence}`}>
                  {selectedPlayer.confidence.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}
        
          {/* No Player Selected State */}
          {!selectedPlayer && (
            <div className="no-selection-state">
              <p>👆 Select a player from the list above to view detailed analysis</p>
              <p>Charts will show probability comparisons and recent game performance</p>
            </div>
          )}
        </div>

        {/* Mobile View */}
        <div className="mobile-view">
        <div className="mobile-cards">
          {displayPlayers.map((player, index) => {
            const secondaryMetrics = [
              { label: 'Season', value: player.seasonTotal },
              { label: 'Per Game', value: player.rate },
              { label: '1+ Prob', value: `${player.prob1Plus}%` }
            ];

            const expandableContent = mobileExpandedPlayer === player.id ? (
              <div className="mobile-player-details">
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-item-value">{player.seasonTotal}</div>
                    <div className="metric-item-label">Season Total</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-item-value">{player.rate}</div>
                    <div className="metric-item-label">Per Game</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-item-value">{player.recentRate}</div>
                    <div className="metric-item-label">Recent Form</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-item-value">{player.confidence.toUpperCase()}</div>
                    <div className="metric-item-label">Confidence</div>
                  </div>
                </div>
                
                {/* Mobile Charts - Same as desktop view */}
                <div className="mobile-charts">
                  {selectedPlayer && selectedPlayer.id === player.id && playerChartData && (
                    <>
                      {/* Season Overview Chart */}
                      <SeasonOverviewChart 
                        player={selectedPlayer}
                        seasonData={playerChartData?.seasonOverview}
                        propOption={currentPropOption}
                      />
                      
                      {/* Recent 5 Games Chart */}
                      <Recent5GamesChart 
                        recentGamesData={playerChartData?.recent5Games || recentGamesData}
                        propOption={currentPropOption}
                      />
                      
                      {/* Opponent History Chart - Now automatically shows current opponent */}
                      <OpponentHistoryChart 
                        opponentHistoryData={enhancedOpponentData || playerChartData?.opponentHistory}
                        currentOpponent={getCurrentOpponent() || getDetectedOpponent()}
                        propOption={currentPropOption}
                        loading={opponentHistoryLoading}
                        enhanced={!!enhancedOpponentData}
                      />
                    </>
                  )}
                </div>
                
                <div className="mobile-analysis">
                  <div className="analysis-item">
                    <strong>Trend:</strong> {player.trend === 'up' ? '📈 Trending Up' : player.trend === 'down' ? '📉 Trending Down' : '➡️ Stable Form'}
                  </div>
                  <div className="analysis-item">
                    <strong>Probability Analysis:</strong>
                    <div style={{marginTop: '4px', fontSize: '11px'}}>
                      <div>1+ {currentPropOption?.label}: {player.prob1Plus}%</div>
                      <div>2+ {currentPropOption?.label}: {player.prob2Plus}%</div>
                    </div>
                  </div>
                  {selectedPlayer?.id === player.id && recentGamesData && recentGamesData.length > 0 && (
                    <div className="analysis-item">
                      <strong>Game History:</strong>
                      <div style={{marginTop: '4px', fontSize: '11px'}}>
                        <div><em>Recent Games:</em></div>
                        {recentGamesData.slice(0, 3).map((game, idx) => (
                          <div key={idx} style={{marginBottom: '2px', paddingLeft: '8px'}}>
                            {game.displayDate || game.date}: {game.value} {currentPropOption?.label.toLowerCase()} 
                            {game.opponent && ` vs ${game.opponent}`}
                          </div>
                        ))}
                        {recentGamesData.opponentInfo && (
                          <div style={{marginTop: '8px'}}>
                            <div><em>vs {recentGamesData.opponentInfo.team} History ({recentGamesData.opponentInfo.count} games):</em></div>
                            {recentGamesData.slice(3).map((game, idx) => (
                              <div key={`opp-${idx}`} style={{marginBottom: '2px', color: '#ff9800', paddingLeft: '8px'}}>
                                {game.displayDate || game.date}: {game.value} {currentPropOption?.label.toLowerCase()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null;

            return (
              <MobilePlayerCard
                key={player.id}
                item={{
                  name: player.name,
                  team: player.team
                }}
                index={index}
                showRank={true}
                showExpandButton={true}
                primaryMetric={{
                  value: `${player.prob1Plus}%`,
                  label: '1+ Prob'
                }}
                secondaryMetrics={secondaryMetrics}
                controlled={true}
                isExpanded={mobileExpandedPlayer === player.id}
                onExpandChange={(expanded) => {
                  setMobileExpandedPlayer(expanded ? player.id : null);
                  // When expanding on mobile, also select the player for chart data loading
                  if (expanded) {
                    setSelectedPlayer(player);
                  }
                }}
                onCardClick={(item, idx) => {
                  // Set selectedPlayer for desktop charts (async) - separate from mobile expansion
                  setSelectedPlayer(selectedPlayer?.id === player.id ? null : player);
                }}
                expandableContent={expandableContent}
                className={selectedPlayer?.id === player.id ? 'selected' : ''}
              />
            );
          })}
        </div>
        </div>
      </div>

      {/* Footer with Legend */}
      <div className="card-footer">
        <div className="legend">
          <span className="legend-item">📈 Trending Up</span>
          <span className="legend-item">📉 Trending Down</span>
          <span className="legend-item">➡️ Stable Form</span>
          {selectedPlayer && (
            <span className="legend-item">🎯 Selected: {selectedPlayer.name}</span>
          )}
        </div>
        <div className="last-updated">
          <small>Data: {propAnalysisData?.generatedAt ? new Date(propAnalysisData.generatedAt).toLocaleString() : 'Loading...'}</small>
        </div>
      </div>
    </GlassCard>
  );
};

export default PlayerPropsLadderCard;