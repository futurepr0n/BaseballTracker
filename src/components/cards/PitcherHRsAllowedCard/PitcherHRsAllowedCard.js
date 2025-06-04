import React, { useState, useEffect } from 'react';
import useTeamFilteredData from '../../useTeamFilter';
import { fetchPlayerDataForDateRange, fetchGameData } from '../../../services/dataService';
import './PitcherHRsAllowedCard.css';

/**
 * Card component showing pitchers ranked by home runs allowed
 * with breakdowns for home/away and opposing teams
 */
const PitcherHRsAllowedCard = ({ currentDate, teams, maxItems = 15 }) => {
  const [pitcherHRData, setPitcherHRData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPitcher, setExpandedPitcher] = useState(null);
  const [dataRange, setDataRange] = useState({ startDate: null, endDate: null, totalDays: 0 });

  // Apply team filtering
  const filteredData = useTeamFilteredData(pitcherHRData, 'team');

  useEffect(() => {
    const analyzePitcherHRs = async () => {
      setIsLoading(true);
      
      try {
        console.log('[PitcherHRsAllowedCard] Starting pitcher HR analysis...');
        
        // Fetch historical data for last 90 days
        const startDate = new Date(currentDate);
        const daysToLookBack = 90;
        
        const dateRangeData = await fetchPlayerDataForDateRange(startDate, daysToLookBack);
        const dateKeys = Object.keys(dateRangeData).sort();
        
        if (dateKeys.length === 0) {
          console.warn('[PitcherHRsAllowedCard] No historical data found');
          setPitcherHRData([]);
          setIsLoading(false);
          return;
        }

        const actualStartDate = new Date(dateKeys[0]);
        const actualEndDate = new Date(dateKeys[dateKeys.length - 1]);
        
        setDataRange({
          startDate: actualStartDate,
          endDate: actualEndDate,
          totalDays: dateKeys.length
        });

        console.log(`[PitcherHRsAllowedCard] Analyzing ${dateKeys.length} days of data`);
        
        // Map to store pitcher data: pitcherKey -> analysis
        const pitcherAnalysis = new Map();
        
        // Process each date
        for (const dateKey of dateKeys) {
          const playersForDate = dateRangeData[dateKey];
          
          // Get game data for this date to determine home/away
          let gameDataForDate = [];
          try {
            gameDataForDate = await fetchGameData(dateKey);
          } catch (error) {
            console.warn(`[PitcherHRsAllowedCard] Could not load game data for ${dateKey}`);
          }
          
          // Process each pitcher who played on this date
          const pitchers = playersForDate.filter(player => 
            player.playerType === 'pitcher' && 
            player.HR !== 'DNP' && 
            player.HR !== null &&
            Number(player.HR) >= 0
          );
          
          for (const pitcher of pitchers) {
            const pitcherKey = `${pitcher.name}_${pitcher.team}`;
            const hrsAllowed = Number(pitcher.HR) || 0;
            
            // Determine if pitcher was playing at home or away
            const pitcherGame = gameDataForDate.find(game => 
              game.homeTeam === pitcher.team || game.awayTeam === pitcher.team
            );
            
            const isHome = pitcherGame ? pitcherGame.homeTeam === pitcher.team : null;
            const opposingTeam = pitcherGame ? 
              (isHome ? pitcherGame.awayTeam : pitcherGame.homeTeam) : 'Unknown';
            
            // Initialize pitcher analysis if not exists
            if (!pitcherAnalysis.has(pitcherKey)) {
              pitcherAnalysis.set(pitcherKey, {
                name: pitcher.name,
                team: pitcher.team,
                totalHRsAllowed: 0,
                homeHRsAllowed: 0,
                awayHRsAllowed: 0,
                gamesPlayed: 0,
                gamesAtHome: 0,
                gamesAway: 0,
                opposingTeams: new Map(), // team -> HRs allowed
                gameLog: []
              });
            }
            
            const analysis = pitcherAnalysis.get(pitcherKey);
            
            // Update totals
            analysis.totalHRsAllowed += hrsAllowed;
            analysis.gamesPlayed += 1;
            
            // Update home/away stats
            if (isHome === true) {
              analysis.homeHRsAllowed += hrsAllowed;
              analysis.gamesAtHome += 1;
            } else if (isHome === false) {
              analysis.awayHRsAllowed += hrsAllowed;
              analysis.gamesAway += 1;
            }
            
            // Update opposing team stats
            if (opposingTeam !== 'Unknown') {
              const currentHRsVsTeam = analysis.opposingTeams.get(opposingTeam) || 0;
              analysis.opposingTeams.set(opposingTeam, currentHRsVsTeam + hrsAllowed);
            }
            
            // Add to game log
            analysis.gameLog.push({
              date: dateKey,
              hrsAllowed,
              isHome,
              opposingTeam,
              inningsPitched: pitcher.IP || 0
            });
          }
        }
        
        // Convert to array and calculate additional stats
        const pitcherArray = Array.from(pitcherAnalysis.values()).map(pitcher => {
          // Find team that pitcher has allowed most HRs to
          let mostHRsTeam = 'None';
          let mostHRsCount = 0;
          
          for (const [team, hrsAllowed] of pitcher.opposingTeams) {
            if (hrsAllowed > mostHRsCount) {
              mostHRsCount = hrsAllowed;
              mostHRsTeam = team;
            }
          }
          
          return {
            ...pitcher,
            hrsPerGame: pitcher.gamesPlayed > 0 ? 
              (pitcher.totalHRsAllowed / pitcher.gamesPlayed).toFixed(2) : '0.00',
            homeHRRate: pitcher.gamesAtHome > 0 ? 
              (pitcher.homeHRsAllowed / pitcher.gamesAtHome).toFixed(2) : '0.00',
            awayHRRate: pitcher.gamesAway > 0 ? 
              (pitcher.awayHRsAllowed / pitcher.gamesAway).toFixed(2) : '0.00',
            mostVulnerableTeam: mostHRsTeam,
            mostVulnerableTeamHRs: mostHRsCount,
            opposingTeamsArray: Array.from(pitcher.opposingTeams.entries())
              .map(([team, hrs]) => ({ team, hrs }))
              .sort((a, b) => b.hrs - a.hrs)
          };
        });
        
        // Sort by total HRs allowed (descending)
        const sortedPitchers = pitcherArray
          .filter(pitcher => pitcher.totalHRsAllowed > 0) // Only include pitchers who have allowed HRs
          .sort((a, b) => b.totalHRsAllowed - a.totalHRsAllowed);
        
        console.log(`[PitcherHRsAllowedCard] Analysis complete: ${sortedPitchers.length} pitchers with HRs allowed`);
        
        setPitcherHRData(sortedPitchers);
        
      } catch (error) {
        console.error('[PitcherHRsAllowedCard] Error analyzing pitcher HRs:', error);
        setPitcherHRData([]);
      } finally {
        setIsLoading(false);
      }
    };

    analyzePitcherHRs();
  }, [currentDate]);

  const toggleExpansion = (pitcherKey) => {
    setExpandedPitcher(expandedPitcher === pitcherKey ? null : pitcherKey);
  };

  const formatDateRange = () => {
    if (!dataRange.startDate || !dataRange.endDate) return '';
    
    const start = dataRange.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = dataRange.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `${start} - ${end} (${dataRange.totalDays} days)`;
  };

  const getTeamLogo = (teamCode) => {
    if (!teams[teamCode]) return null;
    return `/data/logos/${teamCode.toLowerCase()}_logo.png`;
  };

  const displayData = filteredData.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className="card pitcher-hrs-allowed-card">
        <h3>🔥 Most HRs Allowed (Pitchers)</h3>
        <div className="loading-indicator">
          Loading pitcher HR analysis...
        </div>
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div className="card pitcher-hrs-allowed-card">
        <h3>🔥 Most HRs Allowed (Pitchers)</h3>
        <div className="no-data">
          No pitcher HR data available for the selected period.
        </div>
      </div>
    );
  }

  return (
    <div className="card pitcher-hrs-allowed-card">
      <h3>🔥 Most HRs Allowed (Pitchers)</h3>
      {dataRange.startDate && (
        <div className="card-subtitle">
          {formatDateRange()}
        </div>
      )}
      
      <div className="scrollable-container">
        <ul className="player-list">
          {displayData.map((pitcher, index) => {
            const pitcherKey = `${pitcher.name}_${pitcher.team}`;
            const isExpanded = expandedPitcher === pitcherKey;
            const teamLogo = getTeamLogo(pitcher.team);
            
            return (
              <li key={pitcherKey} className="player-item pitcher-hr-item">
                {/* Team logo background */}
                {teamLogo && (
                  <img 
                    src={teamLogo} 
                    alt={`${pitcher.team} logo`} 
                    className="team-logo-bg"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                
                <div className="player-rank" style={{ backgroundColor: teams[pitcher.team]?.colors?.primary || '#333' }}>
                  {teamLogo && (
                    <img 
                      src={teamLogo} 
                      alt={`${pitcher.team} logo`} 
                      className="rank-logo"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="rank-overlay"></div>
                  <span className="rank-number">{index + 1}</span>
                </div>
                
                <div className="player-info" onClick={() => toggleExpansion(pitcherKey)}>
                  <div className="player-name">{pitcher.name}</div>
                  <div className="player-team">{pitcher.team}</div>
                </div>
                
                <div className="player-stat pitcher-hr-stats">
                  <div className="total-hrs">
                    <span className="stat-value">{pitcher.totalHRsAllowed}</span>
                    <span className="stat-label">Total HRs</span>
                  </div>
                  <div className="hr-rate">
                    <span className="stat-detail">{pitcher.hrsPerGame}/game</span>
                  </div>
                </div>

                <button 
                  className="expand-toggle"
                  onClick={() => toggleExpansion(pitcherKey)}
                  aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>

                {isExpanded && (
                  <div className="pitcher-hr-details">
                    <div className="hr-breakdown">
                      <div className="breakdown-section">
                        <h4>🏠 Home vs Away Breakdown</h4>
                        <div className="home-away-stats">
                          <div className="stat-group">
                            <span className="venue-label">At Home:</span>
                            <span className="venue-stats">
                              {pitcher.homeHRsAllowed} HRs in {pitcher.gamesAtHome} games
                              <span className="venue-rate">({pitcher.homeHRRate}/game)</span>
                            </span>
                          </div>
                          <div className="stat-group">
                            <span className="venue-label">On Road:</span>
                            <span className="venue-stats">
                              {pitcher.awayHRsAllowed} HRs in {pitcher.gamesAway} games
                              <span className="venue-rate">({pitcher.awayHRRate}/game)</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="breakdown-section">
                        <h4>⚾ Most Vulnerable Against</h4>
                        <div className="vulnerable-team">
                          <div className="top-opponent">
                            <span className="opponent-team">{pitcher.mostVulnerableTeam}</span>
                            <span className="opponent-hrs">{pitcher.mostVulnerableTeamHRs} HRs</span>
                          </div>
                        </div>
                        
                        {pitcher.opposingTeamsArray.length > 1 && (
                          <div className="all-opponents">
                            <h5>All Opposing Teams:</h5>
                            <div className="opponents-grid">
                              {pitcher.opposingTeamsArray.slice(0, 6).map(({ team, hrs }) => (
                                <div key={team} className="opponent-stat">
                                  <span className="opponent-name">{team}</span>
                                  <span className="opponent-count">{hrs}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="breakdown-section">
                        <h4>📊 Recent Performance</h4>
                        <div className="recent-games">
                          {pitcher.gameLog.slice(-5).reverse().map((game, idx) => (
                            <div key={idx} className="game-entry">
                              <span className="game-date">
                                {new Date(game.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                              <span className="game-venue">{game.isHome ? 'vs' : '@'}</span>
                              <span className="game-opponent">{game.opposingTeam}</span>
                              <span className="game-hrs">
                                {game.hrsAllowed} HR{game.hrsAllowed !== 1 ? 's' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default PitcherHRsAllowedCard;