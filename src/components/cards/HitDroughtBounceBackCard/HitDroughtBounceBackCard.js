// src/components/cards/HitDroughtBounceBackCard/HitDroughtBounceBackCard.js
import React, { useState, useEffect } from 'react';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData 
} from '../../../services/dataService';

const HitDroughtBounceBackCard = ({ gameData, currentDate, teams }) => {
  const [bounceBackData, setBounceBackData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const analyzeBounceBackPatterns = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load historical data (1 year for good sample)
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          30,   // Initial lookback
          365   // Max lookback (1 year)
        );
        
        // Load current roster to focus on active players
        const rosterData = await fetchRosterData();
        const activePlayers = rosterData.filter(player => 
          player.type === 'hitter' || !player.type
        );
        
        // Get teams playing today
        const teamsPlayingToday = new Set();
        gameData.forEach(game => {
          teamsPlayingToday.add(game.homeTeam);
          teamsPlayingToday.add(game.awayTeam);
        });
        
        // Analyze each active player's bounce back patterns
        const playerBounceBackStats = [];
        
        activePlayers.forEach(player => {
          // Only analyze players whose teams are playing today
          if (teamsPlayingToday.has(player.team)) {
            const stats = analyzeBounceBackPattern(
              player.name,
              player.team,
              dateRangeData
            );
            
            if (stats && stats.totalDroughts >= 3) {
              playerBounceBackStats.push(stats);
            }
          }
        });
        
        // Sort by best bounce back rate (fastest to recover)
        const sortedStats = playerBounceBackStats
          .sort((a, b) => a.avgGamesToBounceBack - b.avgGamesToBounceBack)
          .slice(0, 25);
        
        setBounceBackData(sortedStats);
        
      } catch (err) {
        console.error('Error analyzing bounce back patterns:', err);
        setError('Failed to load bounce back data');
        setBounceBackData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (gameData.length > 0) {
      analyzeBounceBackPatterns();
    }
  }, [gameData, currentDate]);

  /**
   * Analyze a player's bounce back pattern after hitless games
   */
  const analyzeBounceBackPattern = (playerName, playerTeam, dateRangeData) => {
    const gameHistory = [];
    
    // Build chronological game history
    const sortedDates = Object.keys(dateRangeData).sort();
    
    sortedDates.forEach(dateStr => {
      const playersForDate = dateRangeData[dateStr];
      const playerData = playersForDate.find(p => 
        p.name === playerName && p.team === playerTeam
      );
      
      if (playerData && playerData.H !== 'DNP') {
        const hits = Number(playerData.H) || 0;
        gameHistory.push({
          date: dateStr,
          hadHit: hits > 0,
          hits: hits
        });
      }
    });
    
    if (gameHistory.length < 10) return null; // Need minimum games for analysis
    
    // Find drought periods and bounce back times
    const droughtRecoveries = [];
    let inDrought = false;
    let droughtStartIndex = -1;
    
    for (let i = 0; i < gameHistory.length; i++) {
      const game = gameHistory[i];
      
      if (!game.hadHit && !inDrought) {
        // Start of drought
        inDrought = true;
        droughtStartIndex = i;
      } else if (game.hadHit && inDrought) {
        // End of drought - record recovery time
        const gamesToRecover = i - droughtStartIndex;
        droughtRecoveries.push({
          droughtStart: gameHistory[droughtStartIndex].date,
          recoveryDate: game.date,
          gamesToRecover: gamesToRecover,
          droughtLength: gamesToRecover
        });
        inDrought = false;
      }
    }
    
    if (droughtRecoveries.length === 0) return null;
    
    // Calculate statistics
    const totalDroughts = droughtRecoveries.length;
    const totalGamesToRecover = droughtRecoveries.reduce((sum, recovery) => 
      sum + recovery.gamesToRecover, 0);
    const avgGamesToBounceBack = totalGamesToRecover / totalDroughts;
    
    // Count distribution of recovery times
    const recoveryDistribution = {};
    droughtRecoveries.forEach(recovery => {
      const games = recovery.gamesToRecover;
      recoveryDistribution[games] = (recoveryDistribution[games] || 0) + 1;
    });
    
    // Calculate bounce back percentages
    const oneGameBounceBack = (recoveryDistribution[1] || 0) / totalDroughts;
    const twoGameBounceBack = ((recoveryDistribution[1] || 0) + (recoveryDistribution[2] || 0)) / totalDroughts;
    const threeGameBounceBack = ((recoveryDistribution[1] || 0) + (recoveryDistribution[2] || 0) + (recoveryDistribution[3] || 0)) / totalDroughts;
    
    // Find current drought status
    let currentDrought = 0;
    for (let i = gameHistory.length - 1; i >= 0; i--) {
      if (!gameHistory[i].hadHit) {
        currentDrought++;
      } else {
        break;
      }
    }
    
    return {
      name: playerName,
      team: playerTeam,
      totalDroughts,
      avgGamesToBounceBack: avgGamesToBounceBack.toFixed(1),
      oneGameBounceBackPct: (oneGameBounceBack * 100).toFixed(0),
      twoGameBounceBackPct: (twoGameBounceBack * 100).toFixed(0),
      threeGameBounceBackPct: (threeGameBounceBack * 100).toFixed(0),
      recoveryDistribution,
      currentDrought,
      isCurrentlyInDrought: currentDrought > 0,
      bounceBackScore: (oneGameBounceBack * 3 + twoGameBounceBack * 2 + threeGameBounceBack * 1), // Weighted score
      recentDroughts: droughtRecoveries.slice(-5) // Last 5 droughts for reference
    };
  };

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { 
      name: teamAbbr, 
      primaryColor: '#4CAF50', 
      logoUrl: null 
    };
  };

  if (loading) {
    return (
      <div className="card">
        <h3>🔄 Hit Expected After Drought</h3>
        <div className="loading-indicator">Analyzing bounce back patterns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>🔄 Hit Expected After Drought</h3>
        <div className="no-data">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>🔄 Hit Expected After Drought</h3>
      <p className="card-subtitle">
        Players most likely to bounce back quickly after hitless games
      </p>
      
      {bounceBackData.length === 0 ? (
        <div className="no-data">
          No sufficient bounce back data available for today's players
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {bounceBackData.map((player, index) => {
              const teamInfo = getTeamInfo(player.team);
              
              return (
                <li key={`${player.name}_${player.team}`} className="player-item">
                  {/* Team logo background */}
                  {teamInfo.logoUrl && (
                    <img 
                      src={teamInfo.logoUrl} 
                      alt={`${teamInfo.name} logo`}
                      className="team-logo-bg"
                    />
                  )}
                  
                  <div className="player-rank" style={{ backgroundColor: '#4CAF50' }}>
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  
                  <div className="player-info">
                    <div className="player-name">
                      {player.name}
                      {player.isCurrentlyInDrought && (
                        <span className="drought-indicator" title={`Currently ${player.currentDrought} games without a hit`}>
                          🔥{player.currentDrought}
                        </span>
                      )}
                    </div>
                    <div className="player-team">{teamInfo.name}</div>
                  </div>
                  
                  <div className="player-stat">
                    <span className="stat-highlight" style={{ color: '#4CAF50' }}>
                      {player.avgGamesToBounceBack} Avg Games
                    </span>
                    <small className="stat-note">
                      1G: {player.oneGameBounceBackPct}% | 
                      2G: {player.twoGameBounceBackPct}% | 
                      3G: {player.threeGameBounceBackPct}%
                      <br />
                      ({player.totalDroughts} droughts analyzed)
                    </small>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HitDroughtBounceBackCard;