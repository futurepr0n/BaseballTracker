// TeamLastResultCards.js
import React, { useState, useEffect, useMemo } from 'react';
import { useTeamFilter } from '../../TeamFilterContext';
import { fetchPlayerDataForDateRange, fetchGameData, formatDateString } from '../../../services/dataService';
import './TeamLastResultCards.css';

/**
 * Utility function to get the last game results for each team
 */
const getLastGameResults = (historicalGameData, historicalPlayerData, teamData) => {
  if (!historicalGameData || !historicalPlayerData || !teamData) {
    return { winTeams: [], lossTeams: [] };
  }

  console.log('[getLastGameResults] Starting analysis...');
  console.log(`Historical game data dates: ${Object.keys(historicalGameData).length}`);
  console.log(`Historical player data dates: ${Object.keys(historicalPlayerData).length}`);

  const teamLastGames = {};

  // Get sorted dates from newest to oldest
  const availableDates = Object.keys(historicalGameData).sort().reverse();
  console.log(`Available dates: ${availableDates.join(', ')}`);

  // For each team, find their most recent completed game
  Object.keys(teamData).forEach(teamCode => {
    for (const dateStr of availableDates) {
      const gamesForDate = historicalGameData[dateStr] || [];
      const playersForDate = historicalPlayerData[dateStr] || [];

      // Find a completed game for this team on this date
      const teamGame = gamesForDate.find(game => {
        const isTeamInGame = game.homeTeam === teamCode || game.awayTeam === teamCode;
        const hasScores = game.homeScore !== null && game.awayScore !== null;
        const isCompleted = game.status === 'Final' || (hasScores && game.status !== 'Scheduled');
        
        return isTeamInGame && hasScores && isCompleted;
      });

      if (teamGame) {
        console.log(`Found recent game for ${teamCode} on ${dateStr}: ${teamGame.awayTeam} @ ${teamGame.homeTeam} (${teamGame.homeScore}-${teamGame.awayScore})`);
        
        const isHome = teamGame.homeTeam === teamCode;
        const teamScore = isHome ? teamGame.homeScore : teamGame.awayScore;
        const opponentScore = isHome ? teamGame.awayScore : teamGame.homeScore;
        const opponent = isHome ? teamGame.awayTeam : teamGame.homeTeam;
        const isWin = teamScore > opponentScore;

        // Get player stats for this game - try multiple matching strategies
        let teamPlayers = playersForDate.filter(player => 
          player.team === teamCode && 
          player.gameId && 
          (player.gameId === teamGame.originalId || 
           player.gameId === teamGame.id ||
           player.gameId.toString() === teamGame.originalId?.toString())
        );

        // If no players found with gameId matching, get all players for this team on this date
        if (teamPlayers.length === 0) {
          teamPlayers = playersForDate.filter(player => player.team === teamCode);
        }

        console.log(`Found ${teamPlayers.length} players for ${teamCode} on ${dateStr}`);

        const hitters = teamPlayers.filter(p => p.playerType === 'hitter' || !p.playerType);
        const pitchers = teamPlayers.filter(p => p.playerType === 'pitcher');

        // Calculate team hitting stats (handle DNP and missing values)
        const teamHits = hitters.reduce((sum, p) => {
          const hits = p.H === 'DNP' ? 0 : (Number(p.H) || 0);
          return sum + hits;
        }, 0);
        
        const teamHRs = hitters.reduce((sum, p) => {
          const hrs = p.HR === 'DNP' ? 0 : (Number(p.HR) || 0);
          return sum + hrs;
        }, 0);
        
        const teamRBIs = hitters.reduce((sum, p) => {
          const rbis = p.RBI === 'DNP' ? 0 : (Number(p.RBI) || 0);
          return sum + rbis;
        }, 0);

        // Get individual players with hits (1 or more)
        const playersWithHits = hitters
          .filter(p => {
            const hits = p.H === 'DNP' ? 0 : (Number(p.H) || 0);
            return hits > 0;
          })
          .map(p => ({
            name: p.name,
            hits: Number(p.H),
            homeRuns: p.HR === 'DNP' ? 0 : (Number(p.HR) || 0),
            rbi: p.RBI === 'DNP' ? 0 : (Number(p.RBI) || 0)
          }))
          .sort((a, b) => b.hits - a.hits); // Sort by hits descending

        // Get individual home run hitters
        const homeRunHitters = hitters
          .filter(p => {
            const hrs = p.HR === 'DNP' ? 0 : (Number(p.HR) || 0);
            return hrs > 0;
          })
          .map(p => ({
            name: p.name,
            homeRuns: Number(p.HR),
            hits: p.H === 'DNP' ? 0 : (Number(p.H) || 0),
            rbi: p.RBI === 'DNP' ? 0 : (Number(p.RBI) || 0)
          }));

        // Get individual multi-hit players
        const multiHitPlayers = hitters
          .filter(p => {
            const hits = p.H === 'DNP' ? 0 : (Number(p.H) || 0);
            return hits > 1;
          })
          .map(p => ({
            name: p.name,
            hits: Number(p.H),
            homeRuns: p.HR === 'DNP' ? 0 : (Number(p.HR) || 0),
            rbi: p.RBI === 'DNP' ? 0 : (Number(p.RBI) || 0)
          }));

        // Calculate pitching stats
        const teamStrikeouts = pitchers.reduce((sum, p) => {
          const ks = p.K === 'DNP' ? 0 : (Number(p.K) || 0);
          return sum + ks;
        }, 0);
        
        const teamEarnedRuns = pitchers.reduce((sum, p) => {
          const ers = p.ER === 'DNP' ? 0 : (Number(p.ER) || 0);
          return sum + ers;
        }, 0);

        // Get starting pitcher (assume first pitcher listed or one with most innings)
        const startingPitcher = pitchers.reduce((starter, pitcher) => {
          const ip = pitcher.IP === 'DNP' ? 0 : (Number(pitcher.IP) || 0);
          const starterIp = starter?.IP === 'DNP' ? 0 : (Number(starter?.IP) || 0);
          return ip > starterIp ? pitcher : starter;
        }, pitchers[0]);

        console.log(`Team stats for ${teamCode}: ${teamHits}H, ${teamHRs}HR, ${teamRBIs}RBI, ${teamStrikeouts}K`);

        teamLastGames[teamCode] = {
          isWin,
          opponent,
          teamScore,
          opponentScore,
          date: dateStr,
          gameId: teamGame.originalId,
          venue: teamGame.venue,
          teamHits,
          teamHRs,
          teamRBIs,
          teamStrikeouts,
          teamEarnedRuns,
          playersWithHits,
          homeRunHitters,
          multiHitPlayers,
          startingPitcher: startingPitcher ? {
            name: startingPitcher.name,
            innings: startingPitcher.IP === 'DNP' ? 0 : (Number(startingPitcher.IP) || 0),
            strikeouts: startingPitcher.K === 'DNP' ? 0 : (Number(startingPitcher.K) || 0),
            earnedRuns: startingPitcher.ER === 'DNP' ? 0 : (Number(startingPitcher.ER) || 0),
            hits: startingPitcher.H === 'DNP' ? 0 : (Number(startingPitcher.H) || 0),
            walks: startingPitcher.BB === 'DNP' ? 0 : (Number(startingPitcher.BB) || 0)
          } : null
        };

        // Break out of date loop since we found this team's most recent game
        break;
      }
    }

    if (!teamLastGames[teamCode]) {
      console.log(`No recent completed game found for ${teamCode}`);
    }
  });

  // Separate teams by win/loss
  const winTeams = [];
  const lossTeams = [];

  Object.entries(teamLastGames).forEach(([teamCode, gameInfo]) => {
    const teamInfo = {
      teamCode,
      teamName: teamData[teamCode]?.name || teamCode,
      teamColor: teamData[teamCode]?.primaryColor || '#333',
      ...gameInfo
    };

    if (gameInfo.isWin) {
      winTeams.push(teamInfo);
    } else {
      lossTeams.push(teamInfo);
    }
  });

  console.log(`Win teams: ${winTeams.length}, Loss teams: ${lossTeams.length}`);
  return { winTeams, lossTeams };
};

/**
 * Team Coming Off Win Card Component
 */
const TeamComingOffWinCard = ({ teamData, currentDate }) => {
  const { selectedTeam, includeMatchup, matchupTeam } = useTeamFilter();
  const [loading, setLoading] = useState(true);
  const [historicalGameData, setHistoricalGameData] = useState({});
  const [historicalPlayerData, setHistoricalPlayerData] = useState({});

  // Fetch historical data
  useEffect(() => {
    const loadHistoricalData = async () => {
      setLoading(true);
      console.log('[TeamComingOffWinCard] Loading historical data...');

      try {
        // Look back 7 days to find completed games
        const endDate = new Date(currentDate);
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 7);

        console.log(`[TeamComingOffWinCard] Fetching data from ${formatDateString(startDate)} to ${formatDateString(endDate)}`);

        // Fetch player data for date range
        const playerData = await fetchPlayerDataForDateRange(endDate, 7, 7);
        setHistoricalPlayerData(playerData);

        // Fetch game data for each date
        const gameData = {};
        const dates = Object.keys(playerData);
        
        for (const dateStr of dates) {
          try {
            const games = await fetchGameData(dateStr);
            gameData[dateStr] = games;
            console.log(`[TeamComingOffWinCard] Loaded ${games.length} games for ${dateStr}`);
          } catch (error) {
            console.warn(`[TeamComingOffWinCard] Failed to load games for ${dateStr}:`, error);
            gameData[dateStr] = [];
          }
        }

        setHistoricalGameData(gameData);
        console.log('[TeamComingOffWinCard] Historical data loading complete');
      } catch (error) {
        console.error('[TeamComingOffWinCard] Error loading historical data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (teamData && currentDate) {
      loadHistoricalData();
    }
  }, [currentDate, teamData]);

  const { winTeams } = useMemo(() => 
    getLastGameResults(historicalGameData, historicalPlayerData, teamData), 
    [historicalGameData, historicalPlayerData, teamData]
  );

  // Filter teams based on team filter
  const filteredWinTeams = useMemo(() => {
    if (!selectedTeam) return winTeams;
    
    return winTeams.filter(team => {
      if (team.teamCode === selectedTeam) return true;
      if (includeMatchup && matchupTeam && team.teamCode === matchupTeam) return true;
      return false;
    });
  }, [winTeams, selectedTeam, includeMatchup, matchupTeam]);

  if (loading) {
    return (
      <div className="card last-result-card">
        <div className="card-header">
          <h3>🟢 Teams Coming Off Win</h3>
        </div>
        <div className="loading-indicator">
          Loading recent game results...
        </div>
      </div>
    );
  }

  if (filteredWinTeams.length === 0) {
    return (
      <div className="card last-result-card">
        <div className="card-header">
          <h3>🟢 Teams Coming Off Win</h3>
        </div>
        <div className="no-data">
          {selectedTeam ? 'No filtered teams coming off a win' : 'No teams coming off a win'}
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}>
            Debug: Found {winTeams.length} total win teams, {filteredWinTeams.length} after filtering
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card last-result-card win-card full-width-card">
      <div className="card-header">
        <h3>🟢 Teams Coming Off Win</h3>
        <span className="team-count">{filteredWinTeams.length} team(s)</span>
      </div>
      
      <div className="teams-list scrollable-container">
        {filteredWinTeams.map(team => (
          <div key={team.teamCode} className="team-result-item">
            <div className="team-header">
              <div className="team-identity">
                <div 
                  className="team-logo-circle"
                  style={{ backgroundColor: team.teamColor }}
                >
                  {team.teamCode}
                </div>
                <div className="team-info">
                  <h4>{team.teamName}</h4>
                  <div className="result-summary">
                    <span className="result-badge win">W</span>
                    <span className="score">{team.teamScore}-{team.opponentScore}</span>
                    <span className="vs">vs {teamData[team.opponent]?.name || team.opponent}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="game-stats">
              <div className="hitting-stats">
                <h5>Team Hitting</h5>
                <div className="stats-grid">
                  <div className="stat">
                    <span className="stat-value">{team.teamHits}</span>
                    <span className="stat-label">Hits</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{team.teamHRs}</span>
                    <span className="stat-label">HR</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{team.teamRBIs}</span>
                    <span className="stat-label">RBI</span>
                  </div>
                </div>

                {team.playersWithHits && team.playersWithHits.length > 0 && (
                  <div className="standout-players">
                    <strong>Players with Hits:</strong>
                    {team.playersWithHits.map((player, idx) => (
                      <span key={idx} className="player-highlight">
                        {player.name} ({player.hits}H{player.homeRuns > 0 ? `, ${player.homeRuns}HR` : ''})
                      </span>
                    ))}
                  </div>
                )}

                {team.homeRunHitters.length > 0 && (
                  <div className="standout-players">
                    <strong>Home Runs:</strong>
                    {team.homeRunHitters.map((player, idx) => (
                      <span key={idx} className="player-highlight home-run">
                        {player.name} ({player.homeRuns}HR)
                      </span>
                    ))}
                  </div>
                )}

                {team.multiHitPlayers.length > 0 && (
                  <div className="standout-players">
                    <strong>Multi-Hit:</strong>
                    {team.multiHitPlayers.map((player, idx) => (
                      <span key={idx} className="player-highlight multi-hit">
                        {player.name} ({player.hits}H)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {team.startingPitcher && (
                <div className="pitching-stats">
                  <h5>Starting Pitcher</h5>
                  <div className="pitcher-line">
                    <strong>{team.startingPitcher.name}</strong>
                    <span>{team.startingPitcher.innings} IP, {team.startingPitcher.strikeouts} K, {team.startingPitcher.earnedRuns} ER</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export components at the end to avoid initialization issues
export { TeamComingOffWinCard, TeamComingOffLossCard };

/**
 * Team Coming Off Loss Card Component
 */
const TeamComingOffLossCard = ({ teamData, currentDate }) => {
  const { selectedTeam, includeMatchup, matchupTeam } = useTeamFilter();
  const [loading, setLoading] = useState(true);
  const [historicalGameData, setHistoricalGameData] = useState({});
  const [historicalPlayerData, setHistoricalPlayerData] = useState({});

  // Fetch historical data
  useEffect(() => {
    const loadHistoricalData = async () => {
      setLoading(true);
      console.log('[TeamComingOffLossCard] Loading historical data...');

      try {
        // Look back 7 days to find completed games
        const endDate = new Date(currentDate);
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 7);

        console.log(`[TeamComingOffLossCard] Fetching data from ${formatDateString(startDate)} to ${formatDateString(endDate)}`);

        // Fetch player data for date range
        const playerData = await fetchPlayerDataForDateRange(endDate, 7, 7);
        setHistoricalPlayerData(playerData);

        // Fetch game data for each date
        const gameData = {};
        const dates = Object.keys(playerData);
        
        for (const dateStr of dates) {
          try {
            const games = await fetchGameData(dateStr);
            gameData[dateStr] = games;
            console.log(`[TeamComingOffLossCard] Loaded ${games.length} games for ${dateStr}`);
          } catch (error) {
            console.warn(`[TeamComingOffLossCard] Failed to load games for ${dateStr}:`, error);
            gameData[dateStr] = [];
          }
        }

        setHistoricalGameData(gameData);
        console.log('[TeamComingOffLossCard] Historical data loading complete');
      } catch (error) {
        console.error('[TeamComingOffLossCard] Error loading historical data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (teamData && currentDate) {
      loadHistoricalData();
    }
  }, [currentDate, teamData]);

  const { lossTeams } = useMemo(() => 
    getLastGameResults(historicalGameData, historicalPlayerData, teamData), 
    [historicalGameData, historicalPlayerData, teamData]
  );

  // Filter teams based on team filter
  const filteredLossTeams = useMemo(() => {
    if (!selectedTeam) return lossTeams;
    
    return lossTeams.filter(team => {
      if (team.teamCode === selectedTeam) return true;
      if (includeMatchup && matchupTeam && team.teamCode === matchupTeam) return true;
      return false;
    });
  }, [lossTeams, selectedTeam, includeMatchup, matchupTeam]);

  if (loading) {
    return (
      <div className="card last-result-card">
        <div className="card-header">
          <h3>🔴 Teams Coming Off Loss</h3>
        </div>
        <div className="loading-indicator">
          Loading recent game results...
        </div>
      </div>
    );
  }

  if (filteredLossTeams.length === 0) {
    return (
      <div className="card last-result-card">
        <div className="card-header">
          <h3>🔴 Teams Coming Off Loss</h3>
        </div>
        <div className="no-data">
          {selectedTeam ? 'No filtered teams coming off a loss' : 'No teams coming off a loss'}
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}>
            Debug: Found {lossTeams.length} total loss teams, {filteredLossTeams.length} after filtering
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card last-result-card loss-card full-width-card">
      <div className="card-header">
        <h3>🔴 Teams Coming Off Loss</h3>
        <span className="team-count">{filteredLossTeams.length} team(s)</span>
      </div>
      
      <div className="teams-list scrollable-container">
        {filteredLossTeams.map(team => (
          <div key={team.teamCode} className="team-result-item">
            <div className="team-header">
              <div className="team-identity">
                <div 
                  className="team-logo-circle"
                  style={{ backgroundColor: team.teamColor }}
                >
                  {team.teamCode}
                </div>
                <div className="team-info">
                  <h4>{team.teamName}</h4>
                  <div className="result-summary">
                    <span className="result-badge loss">L</span>
                    <span className="score">{team.teamScore}-{team.opponentScore}</span>
                    <span className="vs">vs {teamData[team.opponent]?.name || team.opponent}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="game-stats">
              <div className="hitting-stats">
                <h5>Team Hitting</h5>
                <div className="stats-grid">
                  <div className="stat">
                    <span className="stat-value">{team.teamHits}</span>
                    <span className="stat-label">Hits</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{team.teamHRs}</span>
                    <span className="stat-label">HR</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{team.teamRBIs}</span>
                    <span className="stat-label">RBI</span>
                  </div>
                </div>

                {team.playersWithHits && team.playersWithHits.length > 0 && (
                  <div className="standout-players">
                    <strong>Players with Hits:</strong>
                    {team.playersWithHits.map((player, idx) => (
                      <span key={idx} className="player-highlight">
                        {player.name} ({player.hits}H{player.homeRuns > 0 ? `, ${player.homeRuns}HR` : ''})
                      </span>
                    ))}
                  </div>
                )}

                {team.homeRunHitters.length > 0 && (
                  <div className="standout-players">
                    <strong>Home Runs:</strong>
                    {team.homeRunHitters.map((player, idx) => (
                      <span key={idx} className="player-highlight home-run">
                        {player.name} ({player.homeRuns}HR)
                      </span>
                    ))}
                  </div>
                )}

                {team.multiHitPlayers.length > 0 && (
                  <div className="standout-players">
                    <strong>Multi-Hit:</strong>
                    {team.multiHitPlayers.map((player, idx) => (
                      <span key={idx} className="player-highlight multi-hit">
                        {player.name} ({player.hits}H)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {team.startingPitcher && (
                <div className="pitching-stats">
                  <h5>Starting Pitcher</h5>
                  <div className="pitcher-line">
                    <strong>{team.startingPitcher.name}</strong>
                    <span>{team.startingPitcher.innings} IP, {team.startingPitcher.strikeouts} K, {team.startingPitcher.earnedRuns} ER</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};