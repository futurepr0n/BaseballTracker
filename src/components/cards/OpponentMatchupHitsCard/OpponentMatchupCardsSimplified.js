// src/components/cards/OpponentMatchupHitsCard/OpponentMatchupCardsSimplified.js
import React, { useState, useEffect } from 'react';
import { getPlayerDisplayName } from '../../../utils/playerNameUtils';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import '../../common/MobilePlayerCard.css';
import './OpponentMatchupHitsCard.css';

/**
 * Simplified Opponent Matchup Cards
 * 
 * Loads pre-generated daily opponent matchup data instead of calculating in real-time.
 * This solves performance issues by using pre-processed files from generateOpponentMatchupStats.js
 */

const OpponentMatchupHitsCard = ({ gameData, currentDate, teams }) => {
  const [matchupData, setMatchupData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const loadMatchupData = async () => {
      try {
        setLoading(true);
        setError(null);
        setDebugInfo('Loading pre-generated hits matchup data...');
        
        if (!gameData || gameData.length === 0) {
          setMatchupData([]);
          setDebugInfo('No games scheduled for today');
          return;
        }
        
        // Load from pre-generated daily file
        const response = await fetch('/data/opponent_matchups/opponent_matchups_latest.json');
        
        if (!response.ok) {
          throw new Error('Pre-generated matchup data not found');
        }
        
        const data = await response.json();
        
        if (data.hits && Array.isArray(data.hits)) {
          setMatchupData(data.hits);
          setDebugInfo(`Loaded ${data.hits.length} pre-calculated hits matchups (generated: ${data.generatedAt})`);
          console.log('[OpponentMatchupHitsCard] Successfully loaded pre-generated matchup data');
        } else {
          setMatchupData([]);
          setDebugInfo('No hits matchup data in pre-generated file');
        }
        
      } catch (err) {
        console.error('Error loading opponent matchup data:', err);
        setError('Failed to load pre-generated matchup data');
        setDebugInfo(`Error: ${err.message}`);
        setMatchupData([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadMatchupData();
  }, [gameData, currentDate]);

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { 
      name: teamAbbr, 
      primaryColor: '#666', 
      logoUrl: null 
    };
  };

  if (loading) {
    return (
      <div className="card opponent-matchup-hits-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🎯 Hits vs Current Opponent</h3>
          </div>
          <div className="loading-indicator">
            Loading pre-generated matchup data...
            <br />
            <small style={{ fontSize: '0.8em', color: '#666' }}>
              {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card opponent-matchup-hits-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🎯 Hits vs Current Opponent</h3>
          </div>
          <div className="no-data">
            Error: {error}
            <br />
            <small style={{ fontSize: '0.8em', color: '#666' }}>
              {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card opponent-matchup-hits-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>🎯 Hits vs Current Opponent</h3>
          <p className="card-subtitle">
            Players with best performance vs today's opponent (min. 3 games)
          </p>
        </div>
        
        {matchupData.length === 0 ? (
          <div className="no-data">
            No sufficient matchup history available for today's games
            <br />
            <small style={{ fontSize: '0.8em', color: '#999' }}>
              {debugInfo}
            </small>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="scrollable-container desktop-view">
              <ul className="player-list">
                {matchupData.map((player, index) => {
                  const teamInfo = getTeamInfo(player.playerTeam);
                  const teamData = teams && player.playerTeam ? teams[player.playerTeam] : null;
                  const logoUrl = teamData ? teamData.logoUrl : null;
                  
                  return (
                    <li key={`${player.playerName}_${player.playerTeam}_${index}`} className="player-item">
                      <div className="player-rank" style={{ backgroundColor: teams[player.playerTeam]?.colors?.primary || '#007bff' }}>
                        {logoUrl && (
                          <>
                            <img 
                              src={logoUrl} 
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
                        <div className="player-name">{getPlayerDisplayName(player)}</div>
                        <div className="player-team">vs {player.opponentTeam}</div>
                      </div>
                      
                      <div className="player-stat">
                        <div className="stat-highlight" style={{ color: teams[player.playerTeam]?.colors?.primary || '#007bff' }}>
                          {player.ratePerGame} H/G
                        </div>
                        <small>{player.totalValue}H in {player.gamesVsOpponent}G vs {player.opponentTeam}</small>
                        {player.battingAvg && <small>({player.battingAvg} AVG){player.recentForm && ` | ${player.recentForm}`}</small>}
                        {player.opponentHistory && player.opponentHistory.length > 0 && (
                          <small style={{ fontSize: '10px', color: '#777' }}>
                            Recent: {player.opponentHistory.slice(0, 5).map(game => game.value || 0).join('-')}
                          </small>
                        )}
                      </div>
                      
                      {/* Enhanced background logo */}
                      {logoUrl && (
                        <img 
                          src={logoUrl} 
                          alt="" 
                          className="team-logo-bg" 
                          loading="lazy"
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            
            {/* Mobile View */}
            <div className="mobile-view">
              <div className="mobile-cards">
                {matchupData.slice(0, 10).map((player, index) => {
                  const secondaryMetrics = [
                    { label: 'Games vs Opp', value: player.gamesVsOpponent },
                    { label: 'Batting Avg', value: player.battingAvg || 'N/A' }
                  ];

                  const expandableContent = (
                    <div className="mobile-matchup-details">
                      {/* Summary Metrics */}
                      <div className="mobile-metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px'}}>
                        <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                          <div style={{fontSize: '16px', fontWeight: 'bold', color: '#14b8a6'}}>{player.totalValue}</div>
                          <div style={{fontSize: '11px', color: '#ccc'}}>Total Hits</div>
                        </div>
                        <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                          <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{player.gamesVsOpponent}</div>
                          <div style={{fontSize: '11px', color: '#ccc'}}>Games</div>
                        </div>
                        <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                          <div style={{fontSize: '16px', fontWeight: 'bold', color: '#2196F3'}}>{player.battingAvg || 'N/A'}</div>
                          <div style={{fontSize: '11px', color: '#ccc'}}>Batting Avg</div>
                        </div>
                      </div>

                      {/* Opponent Context */}
                      <div className="mobile-opponent-context" style={{marginBottom: '16px', textAlign: 'center'}}>
                        <strong>Performance vs {player.opponentTeam}:</strong>
                        <div style={{marginTop: '8px', fontSize: '12px', color: '#ccc'}}>
                          {player.totalValue} hits in {player.gamesVsOpponent} games vs {player.opponentTeam}
                        </div>
                      </div>

                      {/* Recent Games */}
                      {player.opponentHistory && player.opponentHistory.length > 0 && (
                        <div className="mobile-recent-games" style={{marginBottom: '16px'}}>
                          <strong>Recent vs {player.opponentTeam}:</strong>
                          <div style={{marginTop: '8px', fontSize: '11px'}}>
                            {player.opponentHistory.slice(0, 5).map((game, idx) => {
                              const gameDate = new Date(game.date);
                              return (
                                <div 
                                  key={idx} 
                                  style={{
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    padding: '4px 8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '4px',
                                    margin: '2px 0'
                                  }}
                                >
                                  <span>{gameDate.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}</span>
                                  <span style={{color: game.value > 0 ? '#4CAF50' : '#ff6b6b'}}>
                                    {game.value} H {game.ab && `(${game.ab} AB)`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Performance Analysis */}
                      <div className="mobile-performance-analysis">
                        <strong>Matchup Analysis:</strong>
                        <div style={{marginTop: '8px', fontSize: '11px', color: '#ccc'}}>
                          {parseFloat(player.ratePerGame) >= 1.5 ? 
                            `Excellent performer vs ${player.opponentTeam} with ${player.ratePerGame} H/G average` :
                          parseFloat(player.ratePerGame) >= 1.0 ? 
                            `Good matchup vs ${player.opponentTeam} with consistent production` :
                            `Moderate history vs ${player.opponentTeam} - sample size: ${player.gamesVsOpponent} games`
                          }
                          {player.recentForm && ` | Current form: ${player.recentForm}`}
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <MobilePlayerCard
                      key={index}
                      item={{
                        name: player.playerName,
                        team: player.playerTeam
                      }}
                      index={index}
                      showRank={true}
                      showExpandButton={true}
                      primaryMetric={{
                        value: player.ratePerGame,
                        label: 'H/G vs ' + player.opponentTeam,
                        color: '#14b8a6'
                      }}
                      secondaryMetrics={secondaryMetrics}
                      expandableContent={expandableContent}
                      className="mobile-opponent-matchup-card"
                      scratchpadSource="opponent-matchup-hits"
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
        
        {/* Debug info when in development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            fontSize: '0.7em', 
            color: '#999', 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px' 
          }}>
            <strong>Debug:</strong> {debugInfo}
          </div>
        )}
      </div>
    </div>
  );
};

// Home Runs vs Current Opponent Card
const OpponentMatchupHRCard = ({ gameData, currentDate, teams }) => {
  const [matchupData, setMatchupData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const loadMatchupData = async () => {
      try {
        setLoading(true);
        setError(null);
        setDebugInfo('Loading pre-generated HR matchup data...');
        
        if (!gameData || gameData.length === 0) {
          setMatchupData([]);
          setDebugInfo('No games scheduled for today');
          return;
        }
        
        // Load from pre-generated daily file
        const response = await fetch('/data/opponent_matchups/opponent_matchups_latest.json');
        
        if (!response.ok) {
          throw new Error('Pre-generated matchup data not found');
        }
        
        const data = await response.json();
        
        if (data.homeRuns && Array.isArray(data.homeRuns)) {
          setMatchupData(data.homeRuns);
          setDebugInfo(`Loaded ${data.homeRuns.length} pre-calculated HR matchups (generated: ${data.generatedAt})`);
          console.log('[OpponentMatchupHRCard] Successfully loaded pre-generated matchup data');
        } else {
          setMatchupData([]);
          setDebugInfo('No HR matchup data in pre-generated file');
        }
        
      } catch (err) {
        console.error('Error loading opponent HR matchup data:', err);
        setError('Failed to load pre-generated matchup data');
        setDebugInfo(`Error: ${err.message}`);
        setMatchupData([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadMatchupData();
  }, [gameData, currentDate]);

  const getTeamInfo = (teamAbbr) => {
    return teams[teamAbbr] || { 
      name: teamAbbr, 
      primaryColor: '#e63946', 
      logoUrl: null 
    };
  };

  if (loading) {
    return (
      <div className="card opponent-matchup-hr-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>💥 HRs vs Current Opponent</h3>
          </div>
          <div className="loading-indicator">
            Loading pre-generated matchup data...
            <br />
            <small style={{ fontSize: '0.8em', color: '#666' }}>
              {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card opponent-matchup-hr-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>💥 HRs vs Current Opponent</h3>
          </div>
          <div className="no-data">
            Error: {error}
            <br />
            <small style={{ fontSize: '0.8em', color: '#666' }}>
              {debugInfo}
            </small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card opponent-matchup-hr-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>💥 HRs vs Current Opponent</h3>
          <p className="card-subtitle">
            Home run performance vs today's opponent (min. 1 HR)
          </p>
        </div>
        
        {matchupData.length === 0 ? (
          <div className="no-data">
            No sufficient HR matchup history for today's games
            <br />
            <small style={{ fontSize: '0.8em', color: '#999' }}>
              {debugInfo}
            </small>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="scrollable-container desktop-view">
              <ul className="player-list">
                {matchupData.map((player, index) => {
                  const teamInfo = getTeamInfo(player.playerTeam);
                  const teamData = teams && player.playerTeam ? teams[player.playerTeam] : null;
                  const logoUrl = teamData ? teamData.logoUrl : null;
                  
                  return (
                    <li key={`${player.playerName}_${player.playerTeam}_${index}`} className="player-item">
                      <div className="player-rank" style={{ backgroundColor: teams[player.playerTeam]?.colors?.primary || '#e63946' }}>
                        {logoUrl && (
                          <>
                            <img 
                              src={logoUrl} 
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
                        <div className="player-name">{getPlayerDisplayName(player)}</div>
                        <div className="player-team">vs {player.opponentTeam}</div>
                      </div>
                      
                      <div className="player-stat">
                        <div className="stat-highlight" style={{ color: teams[player.playerTeam]?.colors?.primary || '#e63946' }}>
                          {player.ratePerGame} HR/G
                        </div>
                        <small>{player.totalValue} HRs in {player.gamesVsOpponent}G vs {player.opponentTeam}</small>
                        {player.recentForm && <small>{player.recentForm}</small>}
                        {player.opponentHistory && player.opponentHistory.length > 0 && (
                          <small style={{ fontSize: '10px', color: '#777' }}>
                            Recent: {player.opponentHistory.slice(0, 5).map(game => game.value || 0).join('-')}
                          </small>
                        )}
                      </div>
                      
                      {/* Enhanced background logo */}
                      {logoUrl && (
                        <img 
                          src={logoUrl} 
                          alt="" 
                          className="team-logo-bg" 
                          loading="lazy"
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            
            {/* Mobile View */}
            <div className="mobile-view">
              <div className="mobile-cards">
                {matchupData.slice(0, 10).map((player, index) => {
                  const secondaryMetrics = [
                    { label: 'Games vs Opp', value: player.gamesVsOpponent },
                    { label: 'HR Rate', value: player.ratePerGame + '/G' }
                  ];

                  const expandableContent = (
                    <div className="mobile-hr-matchup-details">
                      {/* Summary Metrics */}
                      <div className="mobile-metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px'}}>
                        <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                          <div style={{fontSize: '16px', fontWeight: 'bold', color: '#fb7185'}}>{player.totalValue}</div>
                          <div style={{fontSize: '11px', color: '#ccc'}}>Total HRs</div>
                        </div>
                        <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                          <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{player.gamesVsOpponent}</div>
                          <div style={{fontSize: '11px', color: '#ccc'}}>Games</div>
                        </div>
                        <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                          <div style={{fontSize: '16px', fontWeight: 'bold', color: '#2196F3'}}>{player.ratePerGame}</div>
                          <div style={{fontSize: '11px', color: '#ccc'}}>HR/Game</div>
                        </div>
                      </div>

                      {/* Opponent Context */}
                      <div className="mobile-opponent-context" style={{marginBottom: '16px', textAlign: 'center'}}>
                        <strong>HR Performance vs {player.opponentTeam}:</strong>
                        <div style={{marginTop: '8px', fontSize: '12px', color: '#ccc'}}>
                          {player.totalValue} home runs in {player.gamesVsOpponent} games vs {player.opponentTeam}
                        </div>
                      </div>

                      {/* Recent Games */}
                      {player.opponentHistory && player.opponentHistory.length > 0 && (
                        <div className="mobile-recent-games" style={{marginBottom: '16px'}}>
                          <strong>Recent HRs vs {player.opponentTeam}:</strong>
                          <div style={{marginTop: '8px', fontSize: '11px'}}>
                            {player.opponentHistory.slice(0, 5).map((game, idx) => {
                              const gameDate = new Date(game.date);
                              return (
                                <div 
                                  key={idx} 
                                  style={{
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    padding: '4px 8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '4px',
                                    margin: '2px 0'
                                  }}
                                >
                                  <span>{gameDate.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}</span>
                                  <span style={{color: game.value > 0 ? '#4CAF50' : '#666'}}>
                                    {game.value} HR{game.value > 1 ? 's' : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Performance Analysis */}
                      <div className="mobile-performance-analysis">
                        <strong>Power Analysis:</strong>
                        <div style={{marginTop: '8px', fontSize: '11px', color: '#ccc'}}>
                          {parseFloat(player.ratePerGame) >= 0.5 ? 
                            `Elite power vs ${player.opponentTeam} with ${player.ratePerGame} HR/G rate` :
                          parseFloat(player.ratePerGame) >= 0.3 ? 
                            `Strong power matchup vs ${player.opponentTeam} - above average production` :
                          parseFloat(player.ratePerGame) >= 0.1 ? 
                            `Moderate power vs ${player.opponentTeam} - occasional deep balls` :
                            `Limited power history vs ${player.opponentTeam} but has connected before`
                          }
                          {player.recentForm && ` | Current form: ${player.recentForm}`}
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <MobilePlayerCard
                      key={index}
                      item={{
                        name: player.playerName,
                        team: player.playerTeam
                      }}
                      index={index}
                      showRank={true}
                      showExpandButton={true}
                      primaryMetric={{
                        value: player.ratePerGame,
                        label: 'HR/G vs ' + player.opponentTeam,
                        color: '#fb7185'
                      }}
                      secondaryMetrics={secondaryMetrics}
                      expandableContent={expandableContent}
                      className="mobile-opponent-hr-card"
                      scratchpadSource="opponent-matchup-hrs"
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
        
        {/* Debug info when in development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            fontSize: '0.7em', 
            color: '#999', 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px' 
          }}>
            <strong>Debug:</strong> {debugInfo}
          </div>
        )}
      </div>
    </div>
  );
};

export {
  OpponentMatchupHitsCard,
  OpponentMatchupHRCard
};