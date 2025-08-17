// src/components/cards/HitDroughtBounceBackCard/HitDroughtBounceBackCard.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchPlayerDataForDateRange, 
  fetchRosterData 
} from '../../../services/dataService';
import { getPlayerDisplayName, getTeamDisplayName } from '../../../utils/playerNameUtils';
import { useTeamFilter } from '../../TeamFilterContext';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import { initializeCollapsibleGlass } from '../../../utils/collapsibleGlass';
import './HitDroughtBounceBackCard.css';
import '../../common/MobilePlayerCard.css';

const HitDroughtBounceBackCard = ({ gameData, currentDate, teams }) => {
  const [bounceBackData, setBounceBackData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { shouldIncludePlayer } = useTeamFilter();
  const containerRef = useRef(null);

  useEffect(() => {
    const analyzeBounceBackPatterns = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load historical data (reasonable sample for bounce back analysis)
        const dateRangeData = await fetchPlayerDataForDateRange(
          currentDate, 
          30,   // Initial lookback
          120   // Max lookback (4 months) - reduced from 365 days
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

  // Initialize collapsible functionality
  useEffect(() => {
    if (containerRef.current) {
      const glassHeader = containerRef.current.querySelector('.glass-header');
      const glassCardContainer = containerRef.current.querySelector('.glass-card-container');
      
      if (glassHeader && glassCardContainer) {
        return initializeCollapsibleGlass(glassHeader, glassCardContainer, 'hit-drought-bounce-back-card');
      }
    }
  }, []);

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
      <div className="card hit-drought-bounce-back-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🔄 Hit Expected After Drought</h3>
          </div>
          <div className="loading-indicator">Analyzing bounce back patterns...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card hit-drought-bounce-back-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🔄 Hit Expected After Drought</h3>
          </div>
          <div className="no-data">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card hit-drought-bounce-back-card" ref={containerRef}>
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>🔄 Hit Expected After Drought</h3>
          <p className="card-subtitle">
            Players most likely to bounce back quickly after hitless games
          </p>
        </div>
        
        {/* Desktop View */}
        <div className="desktop-view">
          {bounceBackData.length === 0 ? (
            <div className="no-data">
              No sufficient bounce back data available for today's players
            </div>
          ) : (
            <div className="scrollable-container">
              <ul className="player-list">
                {bounceBackData.filter(player => 
                  shouldIncludePlayer(player.team, player.name)
                ).slice(0, 10).map((player, index) => {
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
                      
                      <div className="player-rank" style={{ backgroundColor: '#10b981' }}>
                        {teamInfo.logoUrl && (
                          <>
                            <img 
                              src={teamInfo.logoUrl} 
                              alt="" 
                              className="rank-logo"
                              loading="lazy"
                              aria-hidden="true"
                            />
                            <div className="rank-overlay"></div>
                          </>
                        )}
                        <span className="rank-number">{index + 1}</span>
                      </div>
                      
                      <div className="player-info">
                        <div className="player-name">
                          {getPlayerDisplayName(player)}
                          {player.isCurrentlyInDrought && (
                            <span className="drought-indicator" title={`Currently ${player.currentDrought} games without a hit`}>
                              🔥{player.currentDrought}
                            </span>
                          )}
                        </div>
                        <div className="player-team">{getTeamDisplayName(player)}</div>
                      </div>
                      
                      <div className="player-stat">
                        <span className="stat-highlight" style={{ color: '#10b981' }}>
                          {player.avgGamesToBounceBack} Avg Games
                        </span>
                        <small className="stat-note">
                          Next Game: {player.oneGameBounceBackPct}%
                          <br />
                          {player.totalDroughts} droughts analyzed
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Mobile View */}
        <div className="mobile-view">
          {bounceBackData.length === 0 ? (
            <div className="no-data">
              No sufficient bounce back data available for today's players
            </div>
          ) : (
            <div className="mobile-cards">
              {bounceBackData.filter(player => 
                shouldIncludePlayer(player.team, player.name)
              ).slice(0, 10).map((player, index) => {
                const secondaryMetrics = [
                  { label: 'Next Game', value: `${player.oneGameBounceBackPct}%` },
                  { label: 'Droughts', value: player.totalDroughts }
                ];

                const expandableContent = (
                  <div className="mobile-drought-details">
                    {/* Summary Metrics */}
                    <div className="mobile-metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px'}}>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#10B981'}}>{player.avgGamesToBounceBack}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Avg Days</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#4CAF50'}}>{player.oneGameBounceBackPct}%</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Next Game</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{player.twoGameBounceBackPct}%</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>2 Games</div>
                      </div>
                      <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                        <div style={{fontSize: '16px', fontWeight: 'bold', color: '#2196F3'}}>{player.totalDroughts}</div>
                        <div style={{fontSize: '11px', color: '#ccc'}}>Droughts</div>
                      </div>
                    </div>

                    {/* Current Status */}
                    {player.isCurrentlyInDrought && (
                      <div className="mobile-current-drought" style={{marginBottom: '16px', textAlign: 'center'}}>
                        <strong style={{color: '#F44336'}}>🔥 Currently in Drought:</strong>
                        <div style={{marginTop: '8px', fontSize: '12px'}}>
                          {player.currentDrought} games without a hit
                        </div>
                        <div style={{fontSize: '11px', color: '#ccc', marginTop: '4px'}}>
                          {player.oneGameBounceBackPct}% chance to bounce back next game
                        </div>
                      </div>
                    )}

                    {/* Bounce Back Probabilities */}
                    <div className="mobile-probabilities" style={{marginBottom: '16px'}}>
                      <strong>Bounce Back Probabilities:</strong>
                      <div style={{marginTop: '8px', fontSize: '11px'}}>
                        <div style={{
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 8px',
                          backgroundColor: 'rgba(76, 175, 80, 0.15)',
                          borderRadius: '4px',
                          margin: '2px 0',
                          border: '1px solid rgba(76, 175, 80, 0.3)'
                        }}>
                          <span>Next Game:</span>
                          <span style={{fontWeight: 'bold', color: '#4CAF50'}}>{player.oneGameBounceBackPct}%</span>
                        </div>
                        <div style={{
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 8px',
                          backgroundColor: 'rgba(255, 152, 0, 0.15)',
                          borderRadius: '4px',
                          margin: '2px 0',
                          border: '1px solid rgba(255, 152, 0, 0.3)'
                        }}>
                          <span>Within 2 Games:</span>
                          <span style={{fontWeight: 'bold', color: '#FF9800'}}>{player.twoGameBounceBackPct}%</span>
                        </div>
                        <div style={{
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 8px',
                          backgroundColor: 'rgba(33, 150, 243, 0.15)',
                          borderRadius: '4px',
                          margin: '2px 0',
                          border: '1px solid rgba(33, 150, 243, 0.3)'
                        }}>
                          <span>Within 3 Games:</span>
                          <span style={{fontWeight: 'bold', color: '#2196F3'}}>{player.threeGameBounceBackPct}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Pattern Analysis */}
                    <div className="mobile-pattern-analysis" style={{marginBottom: '16px'}}>
                      <strong>Historical Pattern:</strong>
                      <div style={{marginTop: '8px', fontSize: '11px', color: '#ccc'}}>
                        {parseFloat(player.avgGamesToBounceBack) <= 1.5 ? 
                          'Excellent bounce back ability - quick recovery pattern' :
                        parseFloat(player.avgGamesToBounceBack) <= 2.5 ? 
                          'Good recovery pattern - typically bounces back within 2-3 games' :
                        parseFloat(player.avgGamesToBounceBack) <= 3.5 ? 
                          'Average recovery time - moderate bounce back ability' :
                          'Slower recovery pattern - may need more time to break out'
                        }
                      </div>
                    </div>

                    {/* Recovery Distribution */}
                    {player.recoveryDistribution && Object.keys(player.recoveryDistribution).length > 0 && (
                      <div className="mobile-recovery-distribution">
                        <strong>Recovery Distribution:</strong>
                        <div style={{marginTop: '8px', fontSize: '10px'}}>
                          {Object.entries(player.recoveryDistribution)
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .slice(0, 4)
                            .map(([games, count]) => (
                              <div 
                                key={games}
                                style={{
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  padding: '2px 6px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  borderRadius: '3px',
                                  margin: '1px 0'
                                }}
                              >
                                <span>{games} game{parseInt(games) > 1 ? 's' : ''}:</span>
                                <span style={{fontWeight: 'bold'}}>{count}x</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                );

                return (
                  <MobilePlayerCard
                    key={`${player.name}_${player.team}`}
                    item={{
                      name: getPlayerDisplayName(player),
                      team: player.team
                    }}
                    index={index}
                    showRank={true}
                    showExpandButton={true}
                    primaryMetric={{
                      value: player.avgGamesToBounceBack,
                      label: 'Avg Recovery'
                    }}
                    secondaryMetrics={secondaryMetrics}
                    expandableContent={expandableContent}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HitDroughtBounceBackCard;