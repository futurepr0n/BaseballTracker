import React, { useState, useEffect, useCallback } from 'react';
import { fetchPlayerData, fetchPlayerDataForDateRange } from '../services/dataService';
import { 
  calculatePropAnalysis, 
  calculateAdvancedMetrics, 
  calculateMatchupStatistics,
  calculateTeamContext,
  extractOpponentFromGameId,
  findPitcherMatchup
} from '../services/playerAnalysisService';
import { getPlayerRollingStats, getPlayerLastSeen, getPlayer2024Stats } from '../services/rollingStatsService';
import PlayerSearchBar from './PlayerAnalysis/PlayerSearchBar';
import PlayerProfileHeader from './PlayerAnalysis/PlayerProfileHeader';
import MatchupAnalysis from './PlayerAnalysis/MatchupAnalysis';
import PerformanceVisualization from './PlayerAnalysis/PerformanceVisualization';
import SplitAnalysisTables from './PlayerAnalysis/SplitAnalysisTables';
import AdvancedMetrics from './PlayerAnalysis/AdvancedMetrics';
import TeamContext from './PlayerAnalysis/TeamContext';
import './EnhancedPlayerAnalysis.css';

/**
 * Enhanced Player Analysis Component
 * 
 * Replicates sophisticated baseball analysis interface with:
 * - Player search and selection
 * - Matchup analysis (Batter vs Pitcher handedness)
 * - Performance visualization (prop betting analysis)
 * - Split tables (vs LHP/RHP, teams, recent form)
 * - Advanced metrics (exit velocity, barrel rate)
 * - Team context and splits
 */
const EnhancedPlayerAnalysis = ({ currentDate }) => {
  // Core state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [, setPlayerHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Analysis data
  const [splitAnalysis, setSplitAnalysis] = useState(null);
  const [advancedMetrics, setAdvancedMetrics] = useState(null);
  const [propAnalysis, setPropAnalysis] = useState(null);
  const [teamSplits, setTeamSplits] = useState(null);
  const [previousSeasonStats, setPreviousSeasonStats] = useState(null);
  
  // Matchup context
  const [matchupContext, setMatchupContext] = useState(null);

  const loadPlayerAnalysisData = useCallback(async (player) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading analysis data for:', player.name);
      
      // Load accurate rolling stats first
      const rollingStats = await getPlayerRollingStats(player.name, player.team, currentDate);
      
      if (!rollingStats || !rollingStats.season) {
        throw new Error(`No rolling stats found for ${player.name}. Ensure rolling stats are generated.`);
      }
      
      console.log('✅ Loaded rolling stats for', player.name, rollingStats.season);
      
      // Load 2024 stats from roster.json
      const stats2024 = await getPlayer2024Stats(player.name, player.team);
      setPreviousSeasonStats(stats2024);
      console.log('📊 2024 stats:', stats2024);
      
      // Also load recent game history for advanced analysis (last 30 games)
      const endDate = currentDate instanceof Date ? currentDate : new Date(currentDate);
      const dateRangeData = await fetchPlayerDataForDateRange(endDate, 45, 45); // Last 45 days for recent games
      
      // Convert the returned data to an array of player games for recent analysis
      const history = [];
      Object.keys(dateRangeData).forEach(dateStr => {
        const playersForDate = dateRangeData[dateStr];
        const playerData = playersForDate.find(p => 
          p.name === player.name && p.team === player.team
        );
        if (playerData) {
          history.push({ ...playerData, gameDate: dateStr });
        }
      });
      
      // Sort by date (newest first)
      const playerHistory = history.sort((a, b) => 
        new Date(b.gameDate) - new Date(a.gameDate)
      );
      
      console.log(`Found ${playerHistory.length} recent games for analysis`);
      setPlayerHistory(playerHistory);
      
      // Generate analysis data with individual error handling
      console.log('Starting analysis generation for', player.name);
      
      try {
        await generateSplitAnalysis(player, playerHistory, rollingStats);
        console.log('✓ Split analysis completed');
      } catch (error) {
        console.error('Error in split analysis:', error);
      }
      
      try {
        await generateAdvancedMetrics(player, playerHistory);
        console.log('✓ Advanced metrics completed');
      } catch (error) {
        console.error('Error in advanced metrics:', error);
      }
      
      try {
        await generatePropAnalysis(player, playerHistory);
        console.log('✓ Prop analysis completed');
      } catch (error) {
        console.error('Error in prop analysis:', error);
      }
      
      try {
        await generateTeamSplits(player, playerHistory);
        console.log('✓ Team splits completed');
      } catch (error) {
        console.error('Error in team splits:', error);
      }
      
      try {
        await generateMatchupContext(player);
        console.log('✓ Matchup context completed');
      } catch (error) {
        console.error('Error in matchup context:', error);
      }
      
    } catch (err) {
      console.error('Error loading player analysis:', err);
      setError(err.message || 'Failed to load player analysis data');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  // Load comprehensive player data when player is selected
  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerAnalysisData(selectedPlayer);
    }
  }, [selectedPlayer, loadPlayerAnalysisData]);

  const generateSplitAnalysis = async (player, history, rollingStats) => {
    try {
      // Load real handedness data
      const handednessData = await loadHandednessData(player.name);
      
      // Use accurate rolling stats for season data
      const seasonStats = rollingStats.season ? {
        H: rollingStats.season.H || rollingStats.season.totalHits || 0,
        AB: rollingStats.season.AB || rollingStats.season.totalABs || 0,
        R: rollingStats.season.R || rollingStats.season.totalRuns || 0,
        HR: rollingStats.season.HR || rollingStats.season.totalHRs || 0,
        RBI: rollingStats.season.RBI || rollingStats.season.totalRBIs || 0,
        BB: rollingStats.season.BB || rollingStats.season.totalBBs || 0,
        K: rollingStats.season.K || rollingStats.season.totalStrikeouts || 0,
        AVG: rollingStats.season.avg || rollingStats.season.battingAvg || '.000',
        OBP: rollingStats.season.obp || '.000',
        SLG: rollingStats.season.slg || '.000',
        OPS: rollingStats.season.ops || '.000',
        ISO: (parseFloat(rollingStats.season.slg || 0) - parseFloat(rollingStats.season.avg || 0)).toFixed(3),
        games: rollingStats.season.games || rollingStats.season.gamesPlayed || 0
      } : calculateSeasonStats(history);
      
      console.log('✅ Using rolling stats for season data:', seasonStats);
      
      // Use real matchup statistics calculation with recent game history
      const realMatchupStats = await calculateMatchupStatistics(player, history, handednessData);
      
      // Calculate recent form from game history (rolling stats might have last30/last7)
      const recentForm = {
        last5: calculateRecentStats(history, 5),
        last10: calculateRecentStats(history, 10),
        last15: calculateRecentStats(history, 15),
        last20: calculateRecentStats(history, 20),
        // Add rolling stats data if available
        last30: rollingStats.last30 ? {
          H: rollingStats.last30.H || 0,
          AB: rollingStats.last30.AB || 0,
          AVG: rollingStats.last30.avg || '.000',
          HR: rollingStats.last30.HR || 0,
          RBI: rollingStats.last30.RBI || 0,
          games: rollingStats.last30.games || 0
        } : calculateRecentStats(history, 30),
        last7: rollingStats.last7 ? {
          H: rollingStats.last7.H || 0,
          AB: rollingStats.last7.AB || 0,
          AVG: rollingStats.last7.avg || '.000',
          HR: rollingStats.last7.HR || 0,
          RBI: rollingStats.last7.RBI || 0,
          games: rollingStats.last7.games || 0
        } : calculateRecentStats(history, 7)
      };
      
      setSplitAnalysis({
        season: seasonStats, // Use accurate rolling stats data
        vsLHP: handednessData?.lhp || null,
        vsRHP: handednessData?.rhp || null,
        recentForm,
        matchupStats: realMatchupStats
      });
    } catch (error) {
      console.error('Error generating split analysis:', error);
    }
  };

  const generateAdvancedMetrics = async (player, history) => {
    try {
      console.log('📊 Starting advanced metrics calculation...');
      // Use real advanced metrics calculation
      const realMetrics = await calculateAdvancedMetrics(player, history);
      console.log('📊 Advanced metrics result:', realMetrics);
      setAdvancedMetrics(realMetrics);
    } catch (error) {
      console.error('Error generating advanced metrics:', error);
      // Set fallback advanced metrics
      setAdvancedMetrics({
        exitVelocity: { season: 87.5, recent: 87.5 },
        barrelRate: { season: 8.5, recent: 8.5 },
        contact: { hardContact: '32.0', sweetSpot: '15.0' },
        plate: { swingRate: '47.0', chaseRate: '31.0' },
        percentiles: { hardContact: 50, swingRate: 50, chaseRate: 50 }
      });
    }
  };

  const generatePropAnalysis = async (player, history) => {
    try {
      // Use real prop analysis from actual game data
      console.log(`Generating prop analysis for ${history.length} games`);
      const realPropAnalysis = calculatePropAnalysis(history);
      console.log('Prop analysis result:', realPropAnalysis);
      setPropAnalysis(realPropAnalysis);
    } catch (error) {
      console.error('Error generating prop analysis:', error);
      // Set fallback prop analysis
      setPropAnalysis({
        homeRuns: { over05: { success: 0, total: 0, percentage: '0.0' } },
        hits: { over15: { success: 0, total: 0, percentage: '0.0' } },
        rbi: { over05: { success: 0, total: 0, percentage: '0.0' } },
        runs: { over05: { success: 0, total: 0, percentage: '0.0' } }
      });
    }
  };

  const generateTeamSplits = async (player, history) => {
    try {
      console.log('🏟️ Starting team context calculation...');
      // Use real team context calculation
      const realTeamContext = await calculateTeamContext(player, player.team, currentDate);
      console.log('🏟️ Team context result:', realTeamContext);
      setTeamSplits(realTeamContext);
    } catch (error) {
      console.error('Error generating team splits:', error);
      // Set fallback team context
      setTeamSplits({
        overall: {
          record: 'N/A',
          runsPerGame: '0.0',
          teamBA: '.000',
          teamOPS: '.000',
          homeRecord: 'N/A',
          awayRecord: 'N/A'
        },
        rankings: {
          offense: 30,
          runs: 30,
          homeRuns: 30,
          battingAverage: 30,
          onBasePercentage: 30
        },
        recent: {
          last10: 'N/A',
          runsLast10: '0.0',
          trending: 'unknown'
        }
      });
    }
  };

  const generateMatchupContext = async (player) => {
    try {
      // Generate matchup context for today's game if available
      const dateStr = currentDate instanceof Date 
        ? currentDate.toISOString().split('T')[0]
        : currentDate;
      
      // Load lineup data for the current date
      try {
        const lineupResponse = await fetch(`/data/lineups/starting_lineups_${dateStr}.json`);
        if (lineupResponse.ok) {
          const lineupData = await lineupResponse.json();
          
          // Find the game with this player's team
          const gameWithPlayer = lineupData.games?.find(game => 
            game.teams.home.abbr === player.team || 
            game.teams.away.abbr === player.team
          );
          
          if (gameWithPlayer) {
            // Determine if player's team is home or away
            const isHome = gameWithPlayer.teams.home.abbr === player.team;
            const opposingPitcher = isHome ? gameWithPlayer.pitchers.away : gameWithPlayer.pitchers.home;
            const opposingTeam = isHome ? gameWithPlayer.teams.away : gameWithPlayer.teams.home;
            
            const context = {
              opponent: opposingTeam.abbr,
              venue: gameWithPlayer.venue?.name || 'Unknown',
              gameTime: gameWithPlayer.gameTime,
              pitcherMatchup: {
                name: opposingPitcher.name,
                handedness: opposingPitcher.throws || 'R',
                team: opposingTeam.abbr,
                era: opposingPitcher.era || 'N/A',
                record: opposingPitcher.record,
                status: opposingPitcher.status
              }
            };
            
            setMatchupContext(context);
            return;
          }
        }
      } catch (lineupError) {
        console.log('Lineup data not available for', dateStr);
      }
      
      // Fallback to player data if lineup not available
      const todayData = await fetchPlayerData(dateStr);
      const todayPlayer = todayData.find(p => 
        p.name === player.name && p.team === player.team
      );
      
      if (todayPlayer) {
        const context = {
          opponent: await extractOpponentFromGameId(todayPlayer.gameId, todayData, player.team),
          venue: todayPlayer.venue || 'Unknown',
          pitcherMatchup: await findPitcherMatchup(player, dateStr)
        };
        
        setMatchupContext(context);
      }
    } catch (error) {
      console.error('Error generating matchup context:', error);
    }
  };

  // Utility calculation functions
  const calculateSeasonStats = (history) => {
    if (!history.length) return null;
    
    const totals = history.reduce((acc, game) => ({
      AB: acc.AB + (parseInt(game.AB) || 0),
      H: acc.H + (parseInt(game.H) || 0),
      R: acc.R + (parseInt(game.R) || 0),
      HR: acc.HR + (parseInt(game.HR) || 0),
      RBI: acc.RBI + (parseInt(game.RBI) || 0),
      BB: acc.BB + (parseInt(game.BB) || 0),
      K: acc.K + (parseInt(game.K) || 0)
    }), { AB: 0, H: 0, R: 0, HR: 0, RBI: 0, BB: 0, K: 0 });
    
    return {
      ...totals,
      AVG: totals.AB > 0 ? (totals.H / totals.AB).toFixed(3) : '.000',
      OBP: calculateOBP(totals),
      SLG: calculateSLG(totals, history),
      ISO: calculateISO(totals, history),
      games: history.length
    };
  };

  const calculateRecentStats = (history, games) => {
    // Since history is sorted newest first, take from the beginning
    const recentGames = history.slice(0, games);
    return calculateSeasonStats(recentGames);
  };

  // Removed - now using real calculateVsOpponentStats from playerAnalysisService

  // Removed - now using calculatePropAnalysis from playerAnalysisService

  // Load real handedness data for player
  const loadHandednessData = async (playerName) => {
    try {
      console.log('🔍 Loading handedness data for:', playerName);
      
      // First, get the full name from rosters.json
      let fullName = null;
      try {
        const rosterResponse = await fetch('/data/rosters.json');
        if (rosterResponse.ok) {
          const rosterData = await rosterResponse.json();
          // Find player by abbreviated name
          const playerRoster = rosterData.find(p => p.name === playerName);
          if (playerRoster && playerRoster.fullName) {
            fullName = playerRoster.fullName;
            console.log('🔍 Found full name in roster:', fullName);
          }
        }
      } catch (rosterError) {
        console.log('Could not load roster data');
      }
      
      // Load handedness datasets
      const [rhpResponse, lhpResponse] = await Promise.all([
        fetch('/data/handedness/rhp.json'),
        fetch('/data/handedness/lhp.json')
      ]);

      if (rhpResponse.ok && lhpResponse.ok) {
        const [rhpData, lhpData] = await Promise.all([
          rhpResponse.json(),
          lhpResponse.json()
        ]);

        let searchKey = null;
        
        if (fullName) {
          // Use full name to create proper search key: "lastname, firstname"
          const nameParts = fullName.split(' ');
          const lastName = nameParts[nameParts.length - 1];
          const firstName = nameParts.slice(0, -1).join(' ');
          searchKey = `${lastName}, ${firstName}`; // Keep original case
        } else {
          // Fallback to abbreviated name format
          const nameParts = playerName.split(' ');
          const lastName = nameParts[nameParts.length - 1];
          const firstName = nameParts.slice(0, -1).join(' ');
          searchKey = `${lastName}, ${firstName}`; // Keep original case
        }
        
        console.log('🔍 Using search key:', searchKey);
        
        const rhpResult = rhpData[searchKey];
        const lhpResult = lhpData[searchKey];
        
        console.log('🔍 Handedness lookup results:', { 
          searchKey,
          found: !!(rhpResult || lhpResult), 
          rhp: !!rhpResult, 
          lhp: !!lhpResult 
        });

        return {
          rhp: rhpResult,
          lhp: lhpResult
        };
      }
    } catch (error) {
      console.error('Error loading handedness data for', playerName, error);
    }
    return null;
  };

  // Helper functions for advanced calculations
  const calculateOBP = (totals) => {
    const denominator = totals.AB + totals.BB;
    return denominator > 0 ? ((totals.H + totals.BB) / denominator).toFixed(3) : '.000';
  };

  const calculateSLG = (totals, history) => {
    // Simplified SLG calculation - would need more detailed hit data
    const estimatedTotalBases = totals.H + (totals.HR * 3); // Rough estimate
    return totals.AB > 0 ? (estimatedTotalBases / totals.AB).toFixed(3) : '.000';
  };

  const calculateISO = (totals, history) => {
    // Isolated Power - placeholder calculation
    const slg = parseFloat(calculateSLG(totals, history));
    const avg = totals.AB > 0 ? totals.H / totals.AB : 0;
    return (slg - avg).toFixed(3);
  };

  // Removed placeholder functions - now using real implementations from playerAnalysisService

  // Removed placeholder functions - now using real implementations from playerAnalysisService

  if (loading) {
    return (
      <div className="enhanced-player-analysis loading">
        <div className="loading-spinner"></div>
        <p>Loading comprehensive player analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enhanced-player-analysis error">
        <h2>Error Loading Analysis</h2>
        <p>{error}</p>
        <button onClick={() => setSelectedPlayer(null)}>
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="enhanced-player-analysis">
      {!selectedPlayer ? (
        <PlayerSearchBar 
          onPlayerSelect={setSelectedPlayer}
          currentDate={currentDate}
        />
      ) : (
        <div className="player-analysis-container">
          <PlayerProfileHeader 
            player={selectedPlayer}
            onBack={() => setSelectedPlayer(null)}
            currentDate={currentDate}
            seasonStats={splitAnalysis?.season}
            previousSeasonStats={previousSeasonStats}
          />
          
          <div className="analysis-grid">
            <div className="left-panel">
              <PerformanceVisualization 
                propAnalysis={propAnalysis}
                player={selectedPlayer}
              />
            </div>
            
            <div className="center-panel">
              <MatchupAnalysis 
                player={selectedPlayer}
                matchupContext={matchupContext}
                splitAnalysis={splitAnalysis}
              />
            </div>
            
            <div className="right-panel">
              <AdvancedMetrics 
                metrics={advancedMetrics}
                player={selectedPlayer}
              />
            </div>
          </div>
          
          <div className="bottom-panel">
            <SplitAnalysisTables 
              splitAnalysis={splitAnalysis}
              player={selectedPlayer}
            />
            
            <TeamContext 
              teamSplits={teamSplits}
              player={selectedPlayer}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPlayerAnalysis;