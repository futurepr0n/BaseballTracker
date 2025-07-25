import React, { useState, useEffect } from 'react';
import useTeamFilteredData from '../../useTeamFilter';
import { fetchPlayerData, fetchGameData } from '../../../services/dataService';
import { useTooltip } from '../../utils/TooltipContext';
import { createSafeId } from '../../utils/tooltipUtils';
import { debugLog } from '../../../utils/debugConfig';
import dynamicGameDateService from '../../../services/dynamicGameDateService';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import '../../common/MobilePlayerCard.css';
import './PitcherHRsAllowedCard.css';

/**
 * Card component showing pitchers ranked by home runs allowed
 * with breakdowns for home/away and opposing teams
 */
const PitcherHRsAllowedCard = ({ currentDate, teams, maxItems = 15 }) => {
  const [pitcherHRData, setPitcherHRData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataRange, setDataRange] = useState({ startDate: null, endDate: null, totalDays: 0 });
  const { openTooltip } = useTooltip();

  // Apply team filtering
  const filteredData = useTeamFilteredData(pitcherHRData, 'team');

  useEffect(() => {
    const analyzePitcherHRs = async () => {
      setIsLoading(true);
      
      try {
        debugLog.log('CARDS', '[PitcherHRsAllowedCard] Starting pitcher HR analysis...');
        
        // Get current date string for dynamic discovery
        const currentDateStr = currentDate ? currentDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        
        // Use dynamic file discovery to find actual game dates
        debugLog.log('CARDS', '[PitcherHRsAllowedCard] Discovering actual game dates from data files...');
        const gameDates = await dynamicGameDateService.getGameDatesForAnalysis(currentDateStr, {
          maxDaysBack: 120
        });
        
        if (!gameDates || gameDates.length === 0) {
          console.warn('[PitcherHRsAllowedCard] No game dates discovered');
          setPitcherHRData([]);
          setIsLoading(false);
          return;
        }
        
        debugLog.log('CARDS', `[PitcherHRsAllowedCard] Discovered ${gameDates.length} actual game dates from ${gameDates[0]} to ${gameDates[gameDates.length - 1]}`);
        
        // Load player data for each discovered game date
        const seasonData = {};
        let loadedDates = 0;
        
        for (const gameDate of gameDates) {
          try {
            const playersForDate = await fetchPlayerData(gameDate);
            if (playersForDate && playersForDate.length > 0) {
              seasonData[gameDate] = { players: playersForDate };
              loadedDates++;
            }
          } catch (error) {
            debugLog.log('CARDS', `[PitcherHRsAllowedCard] No data for ${gameDate}: ${error.message}`);
            // Continue with other dates - this is expected for some dates
          }
        }
        
        const dateKeys = Object.keys(seasonData).sort();
        debugLog.log('CARDS', `[PitcherHRsAllowedCard] Successfully loaded ${loadedDates} of ${gameDates.length} discovered dates`);
        
        if (dateKeys.length === 0) {
          console.warn('[PitcherHRsAllowedCard] No historical data found in discovered dates');
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

        debugLog.log('CARDS', `[PitcherHRsAllowedCard] Analyzing ${dateKeys.length} days of data`);
        
        // Map to store pitcher data: pitcherKey -> analysis
        const pitcherAnalysis = new Map();
        
        // Process each date
        for (const dateKey of dateKeys) {
          const playersForDate = seasonData[dateKey].players;
          
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
        
        debugLog.log('CARDS', `[PitcherHRsAllowedCard] Analysis complete: ${sortedPitchers.length} pitchers with HRs allowed`);
        
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

  const handlePitcherClick = (pitcher, event) => {
    const safeId = createSafeId(pitcher.name, pitcher.team);
    const tooltipId = `pitcher_hrs_${safeId}`;
    
    openTooltip(tooltipId, event.currentTarget, {
      type: 'pitcher_hrs',
      player: pitcher
    });
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
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🔥 Most HRs Allowed (Pitchers)</h3>
          </div>
          <div className="loading-indicator">
            Loading pitcher HR analysis...
          </div>
        </div>
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div className="card pitcher-hrs-allowed-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h3>🔥 Most HRs Allowed (Pitchers)</h3>
          </div>
          <div className="no-data">
            No pitcher HR data available for the selected period.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card pitcher-hrs-allowed-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>🔥 Most HRs Allowed (Pitchers)</h3>
          {dataRange.startDate && (
            <p className="card-subtitle">
              {formatDateRange()}
            </p>
          )}
        </div>
        
        {/* Desktop View */}
        <div className="desktop-view">
          <div className="scrollable-container">
            <ul className="player-list">
              {displayData.map((pitcher, index) => {
                const pitcherKey = `${pitcher.name}_${pitcher.team}`;
                // Use same approach as working DayOfWeekHitsCard
                const teamData = teams && pitcher.team ? teams[pitcher.team] : null;
                const logoUrl = teamData ? teamData.logoUrl : null;
                
                return (
                  <li key={pitcherKey} className="player-item pitcher-hr-item">
                    <div className="player-rank" style={{ backgroundColor: '#f43f5e' }}>
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
                    
                    <div className="player-info" onClick={(e) => handlePitcherClick(pitcher, e)}>
                      <div className="player-name">{pitcher.name}</div>
                      <div className="player-team">{pitcher.team}</div>
                    </div>
                    
                    <div className="player-stat pitcher-hr-stats">
                      <div className="total-hrs">
                        <span className="stat-value" style={{ color: '#f43f5e' }}>{pitcher.totalHRsAllowed}</span>
                        <span className="stat-label">Total HRs</span>
                      </div>
                      <div className="hr-rate">
                        <span className="stat-detail">{pitcher.hrsPerGame}/game</span>
                      </div>
                    </div>

                    <button 
                      className="expand-toggle tooltip-trigger"
                      onClick={(e) => handlePitcherClick(pitcher, e)}
                      aria-label="View detailed statistics"
                    >
                      ℹ️
                    </button>
                    
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
        </div>
        
        {/* Mobile View */}
        <div className="mobile-view">
          <div className="mobile-cards">
            {displayData.map((pitcher, index) => {
              const pitcherKey = `${pitcher.name}_${pitcher.team}`;
              const teamData = teams && pitcher.team ? teams[pitcher.team] : null;
              
              return (
                <MobilePlayerCard
                  key={pitcherKey}
                  item={{
                    name: pitcher.name,
                    team: pitcher.team
                  }}
                  index={index}
                  showRank={true}
                  showExpandButton={true}
                  primaryMetric={{
                    value: pitcher.totalHRsAllowed,
                    label: 'HRs Allowed'
                  }}
                  secondaryMetrics={[
                    { label: 'Per Game', value: pitcher.hrsPerGame },
                    { label: 'Games', value: pitcher.gamesPlayed },
                    { label: 'Home Rate', value: pitcher.homeHRRate },
                    { label: 'Away Rate', value: pitcher.awayHRRate }
                  ]}
                  expandableContent={
                    <div className="mobile-analysis">
                      <div className="metrics-grid">
                        <div className="metric-item">
                          <div className="metric-item-value">{pitcher.totalHRsAllowed}</div>
                          <div className="metric-item-label">Total HRs</div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-item-value">{pitcher.hrsPerGame}</div>
                          <div className="metric-item-label">Per Game</div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-item-value">{pitcher.gamesPlayed}</div>
                          <div className="metric-item-label">Games</div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-item-value">{pitcher.homeHRRate}</div>
                          <div className="metric-item-label">Home Rate</div>
                        </div>
                      </div>
                      
                      <div className="analysis-item">
                        <strong>Home vs Away:</strong> {pitcher.homeHRRate} home, {pitcher.awayHRRate} away
                      </div>
                      
                      <div className="analysis-item">
                        <strong>Most Vulnerable vs:</strong> {pitcher.mostVulnerableTeam} ({pitcher.mostVulnerableTeamHRs} HRs)
                      </div>
                      
                      <div className="analysis-item">
                        <strong>Games Split:</strong> {pitcher.gamesAtHome} home, {pitcher.gamesAway} away games
                      </div>
                      
                      {pitcher.opposingTeamsArray && pitcher.opposingTeamsArray.length > 0 && (
                        <div className="analysis-item">
                          <strong>Top Opponents:</strong><br />
                          {pitcher.opposingTeamsArray.slice(0, 3).map(opp => 
                            `${opp.team}: ${opp.hrs} HRs`
                          ).join(', ')}
                        </div>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PitcherHRsAllowedCard;