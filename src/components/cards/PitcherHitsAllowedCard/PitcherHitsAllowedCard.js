import React, { useState, useEffect } from 'react';
import useTeamFilteredData from '../../useTeamFilter';
import { fetchPlayerDataForDateRange, fetchGameData } from '../../../services/dataService';
import { useTooltip } from '../../utils/TooltipContext';
import { createSafeId } from '../../utils/tooltipUtils';
import { debugLog } from '../../../utils/debugConfig';
import './PitcherHitsAllowedCard.css';

/**
 * Card component showing pitchers ranked by hits allowed
 * with breakdowns for home/away and opposing teams
 */
const PitcherHitsAllowedCard = ({ currentDate, teams, maxItems = 15 }) => {
  const [pitcherHitsData, setPitcherHitsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataRange, setDataRange] = useState({ startDate: null, endDate: null, totalDays: 0 });
  const { openTooltip } = useTooltip();

  // Apply team filtering
  const filteredData = useTeamFilteredData(pitcherHitsData, 'team');

  useEffect(() => {
    const analyzePitcherHits = async () => {
      setIsLoading(true);
      
      try {
        debugLog.log('CARDS', '[PitcherHitsAllowedCard] Starting pitcher hits analysis...');
        
        // Fetch historical data for last 90 days
        const startDate = new Date(currentDate);
        const daysToLookBack = 90;
        
        const dateRangeData = await fetchPlayerDataForDateRange(startDate, daysToLookBack);
        const dateKeys = Object.keys(dateRangeData).sort();
        
        if (dateKeys.length === 0) {
          console.warn('[PitcherHitsAllowedCard] No historical data found');
          setPitcherHitsData([]);
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

        debugLog.log('CARDS', `[PitcherHitsAllowedCard] Analyzing ${dateKeys.length} days of data`);
        
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
            console.warn(`[PitcherHitsAllowedCard] Could not load game data for ${dateKey}`);
          }
          
          // Process each pitcher who played on this date
          const pitchers = playersForDate.filter(player => 
            player.playerType === 'pitcher' && 
            player.H !== 'DNP' && 
            player.H !== null &&
            Number(player.H) >= 0
          );
          
          for (const pitcher of pitchers) {
            const pitcherKey = `${pitcher.name}_${pitcher.team}`;
            const hitsAllowed = Number(pitcher.H) || 0;
            const inningsPitched = Number(pitcher.IP) || 0;
            
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
                totalHitsAllowed: 0,
                totalInningsPitched: 0,
                homeHitsAllowed: 0,
                awayHitsAllowed: 0,
                homeInnings: 0,
                awayInnings: 0,
                gamesPlayed: 0,
                gamesAtHome: 0,
                gamesAway: 0,
                opposingTeams: new Map(), // team -> { hits, innings }
                gameLog: []
              });
            }
            
            const analysis = pitcherAnalysis.get(pitcherKey);
            
            // Update totals
            analysis.totalHitsAllowed += hitsAllowed;
            analysis.totalInningsPitched += inningsPitched;
            analysis.gamesPlayed += 1;
            
            // Update home/away stats
            if (isHome === true) {
              analysis.homeHitsAllowed += hitsAllowed;
              analysis.homeInnings += inningsPitched;
              analysis.gamesAtHome += 1;
            } else if (isHome === false) {
              analysis.awayHitsAllowed += hitsAllowed;
              analysis.awayInnings += inningsPitched;
              analysis.gamesAway += 1;
            }
            
            // Update opposing team stats
            if (opposingTeam !== 'Unknown') {
              const currentStats = analysis.opposingTeams.get(opposingTeam) || { hits: 0, innings: 0 };
              analysis.opposingTeams.set(opposingTeam, {
                hits: currentStats.hits + hitsAllowed,
                innings: currentStats.innings + inningsPitched
              });
            }
            
            // Add to game log
            analysis.gameLog.push({
              date: dateKey,
              hitsAllowed,
              inningsPitched,
              isHome,
              opposingTeam,
              hitsPerInning: inningsPitched > 0 ? (hitsAllowed / inningsPitched).toFixed(2) : '0.00'
            });
          }
        }
        
        // Convert to array and calculate additional stats
        const pitcherArray = Array.from(pitcherAnalysis.values()).map(pitcher => {
          // Find team that pitcher has allowed most hits to
          let mostHitsTeam = 'None';
          let mostHitsCount = 0;
          let mostHitsPerInning = 0;
          
          for (const [team, stats] of pitcher.opposingTeams) {
            if (stats.hits > mostHitsCount) {
              mostHitsCount = stats.hits;
              mostHitsTeam = team;
              mostHitsPerInning = stats.innings > 0 ? (stats.hits / stats.innings) : 0;
            }
          }
          
          return {
            ...pitcher,
            hitsPerGame: pitcher.gamesPlayed > 0 ? 
              (pitcher.totalHitsAllowed / pitcher.gamesPlayed).toFixed(1) : '0.0',
            hitsPerInning: pitcher.totalInningsPitched > 0 ? 
              (pitcher.totalHitsAllowed / pitcher.totalInningsPitched).toFixed(2) : '0.00',
            homeHitRate: pitcher.homeInnings > 0 ? 
              (pitcher.homeHitsAllowed / pitcher.homeInnings).toFixed(2) : '0.00',
            awayHitRate: pitcher.awayInnings > 0 ? 
              (pitcher.awayHitsAllowed / pitcher.awayInnings).toFixed(2) : '0.00',
            mostVulnerableTeam: mostHitsTeam,
            mostVulnerableTeamHits: mostHitsCount,
            mostVulnerableTeamRate: mostHitsPerInning.toFixed(2),
            opposingTeamsArray: Array.from(pitcher.opposingTeams.entries())
              .map(([team, stats]) => ({ 
                team, 
                hits: stats.hits,
                hitsPerInning: stats.innings > 0 ? (stats.hits / stats.innings).toFixed(2) : '0.00'
              }))
              .sort((a, b) => b.hits - a.hits)
          };
        });
        
        // Sort by total hits allowed (descending)
        const sortedPitchers = pitcherArray
          .filter(pitcher => pitcher.totalHitsAllowed > 0) // Only include pitchers who have allowed hits
          .sort((a, b) => b.totalHitsAllowed - a.totalHitsAllowed);
        
        debugLog.log('CARDS', `[PitcherHitsAllowedCard] Analysis complete: ${sortedPitchers.length} pitchers with hits allowed`);
        
        setPitcherHitsData(sortedPitchers);
        
      } catch (error) {
        console.error('[PitcherHitsAllowedCard] Error analyzing pitcher hits:', error);
        setPitcherHitsData([]);
      } finally {
        setIsLoading(false);
      }
    };

    analyzePitcherHits();
  }, [currentDate]);

  const handlePitcherClick = (pitcher, event) => {
    const safeId = createSafeId(pitcher.name, pitcher.team);
    const tooltipId = `pitcher_hits_${safeId}`;
    
    openTooltip(tooltipId, event.currentTarget, {
      type: 'pitcher_hits',
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
      <div className="card pitcher-hits-allowed-card">
        <h3>📈 Most Hits Allowed (Pitchers)</h3>
        <div className="loading-indicator">
          Loading pitcher hits analysis...
        </div>
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div className="card pitcher-hits-allowed-card">
        <h3>📈 Most Hits Allowed (Pitchers)</h3>
        <div className="no-data">
          No pitcher hits data available for the selected period.
        </div>
      </div>
    );
  }

  return (
    <div className="card pitcher-hits-allowed-card">
      <h3>📈 Most Hits Allowed (Pitchers)</h3>
      {dataRange.startDate && (
        <div className="card-subtitle">
          {formatDateRange()}
        </div>
      )}
      
      <div className="scrollable-container">
        <ul className="player-list">
          {displayData.map((pitcher, index) => {
            const pitcherKey = `${pitcher.name}_${pitcher.team}`;
            // Use same approach as working DayOfWeekHitsCard
            const teamData = teams && pitcher.team ? teams[pitcher.team] : null;
            const logoUrl = teamData ? teamData.logoUrl : null;
            
            return (
              <li key={pitcherKey} className="player-item pitcher-hits-item">
                <div className="player-rank" style={{ backgroundColor: teams[pitcher.team]?.colors?.primary || '#333' }}>
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
                
                <div className="player-stat pitcher-hits-stats">
                  <div className="total-hits">
                    <span className="stat-value">{pitcher.totalHitsAllowed}</span>
                    <span className="stat-label">Total Hits</span>
                  </div>
                  <div className="hits-rate">
                    <span className="stat-detail">{pitcher.hitsPerInning}/IP</span>
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
  );
};

export default PitcherHitsAllowedCard;