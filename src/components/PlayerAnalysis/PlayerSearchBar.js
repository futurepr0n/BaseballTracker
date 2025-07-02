import React, { useState, useEffect } from 'react';
import { fetchPlayerData } from '../../services/dataService';
import { getPlayerRollingStats } from '../../services/rollingStatsService';
import './PlayerSearchBar.css';

/**
 * PlayerSearchBar Component
 * 
 * Provides search functionality to find and select players
 * Replaces the basic table view with focused player selection
 */
const PlayerSearchBar = ({ onPlayerSelect, currentDate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [daysWithData, setDaysWithData] = useState(0);

  // Load all available players only once when component mounts
  useEffect(() => {
    loadAvailablePlayers();
  }, []); // Remove currentDate dependency - we want ALL players regardless of selected date

  // Search functionality - enhanced with full name search
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const searchLower = searchTerm.toLowerCase();
      const filtered = allPlayers.filter(player => {
        // Search in abbreviated name
        if (player.name.toLowerCase().includes(searchLower)) return true;
        
        // Search in team abbreviation
        if (player.team.toLowerCase().includes(searchLower)) return true;
        
        // Search in full name (if available)
        if (player.fullName && player.fullName.toLowerCase().includes(searchLower)) return true;
        
        // Special handling for common searches like "Judge" finding "A. Judge"
        const lastName = player.name.split(' ').pop(); // Get last part of abbreviated name
        if (lastName && lastName.toLowerCase().includes(searchLower)) return true;
        
        return false;
      });
      
      // Sort results to prioritize exact matches and start-of-name matches
      const sortedResults = filtered.sort((a, b) => {
        const aFullLower = (a.fullName || a.name).toLowerCase();
        const aNameLower = a.name.toLowerCase();
        const bFullLower = (b.fullName || b.name).toLowerCase();
        const bNameLower = b.name.toLowerCase();
        
        // Exact matches first
        if (aFullLower === searchLower || aNameLower === searchLower) return -1;
        if (bFullLower === searchLower || bNameLower === searchLower) return 1;
        
        // Then start-of-name matches
        if (aFullLower.startsWith(searchLower) || aNameLower.startsWith(searchLower)) return -1;
        if (bFullLower.startsWith(searchLower) || bNameLower.startsWith(searchLower)) return 1;
        
        // Otherwise alphabetical
        return a.name.localeCompare(b.name);
      });
      
      setSearchResults(sortedResults.slice(0, 10)); // Limit to 10 results
      setSelectedIndex(-1);
    } else {
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  }, [searchTerm, allPlayers]);

  const loadAvailablePlayers = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Loading players from rolling stats...');
      
      // Load roster data for full names
      let rosterMap = new Map();
      try {
        const rosterResponse = await fetch('/data/rosters.json');
        if (rosterResponse.ok) {
          const rosterData = await rosterResponse.json();
          // Create map for quick lookup by abbreviated name
          rosterData.forEach(player => {
            if (player.fullName) {
              rosterMap.set(`${player.name}_${player.team}`, player.fullName);
            }
          });
          console.log(`✅ Loaded ${rosterMap.size} full names from roster`);
        }
      } catch (rosterError) {
        console.log('Could not load roster data for full names');
      }
      
      // Load from rolling stats - much more efficient and accurate
      const currentDateStr = new Date().toISOString().split('T')[0];
      
      try {
        const response = await fetch(`/data/rolling_stats/rolling_stats_season_latest.json`);
        if (!response.ok) {
          throw new Error('Could not load rolling stats');
        }
        
        const rollingData = await response.json();
        console.log(`✅ Loaded rolling stats with ${rollingData.totalPlayers} players`);
        
        if (rollingData.allHitters && rollingData.allHitters.length > 0) {
          // Helper function to merge player data from multiple sections
          const mergePlayerData = (hitterData) => {
            let mergedStats = { ...hitterData };
            
            // Merge HR data from allHRLeaders section
            if (rollingData.allHRLeaders) {
              const hrData = rollingData.allHRLeaders.find(p => 
                p.name === hitterData.name && p.team === hitterData.team
              );
              if (hrData) {
                mergedStats.HR = hrData.HR;
                mergedStats.hrsPerGame = hrData.hrsPerGame;
              }
            }
            
            // Merge additional stats from allPlayerStats if available
            if (rollingData.allPlayerStats) {
              const playerData = rollingData.allPlayerStats.find(p =>
                p.name === hitterData.name && p.team === hitterData.team
              );
              if (playerData) {
                mergedStats.totalHRs = playerData.totalHRs;
                mergedStats.totalHits = playerData.totalHits;
                mergedStats.totalRBIs = playerData.totalRBIs;
              }
            }
            
            return mergedStats;
          };

          const playersList = rollingData.allHitters.map(player => {
            const mergedPlayer = mergePlayerData(player);
            
            // Look up full name from roster
            const fullName = rosterMap.get(`${mergedPlayer.name}_${mergedPlayer.team}`) || '';
            
            return {
              name: mergedPlayer.name,
              team: mergedPlayer.team,
              fullName: fullName,
              lastSeen: currentDateStr, // Current as of rolling stats generation
              position: 'OF', // Rolling stats don't include position
              recentStats: {
                AVG: mergedPlayer.avg || mergedPlayer.battingAvg || '.000',
                HR: mergedPlayer.HR || mergedPlayer.totalHRs || 0,
                RBI: mergedPlayer.RBI || mergedPlayer.totalRBIs || 0,
                H: mergedPlayer.H || mergedPlayer.totalHits || 0
              },
              // Store full season stats for display
              seasonStats: {
                H: mergedPlayer.H || mergedPlayer.totalHits || 0,
                AB: mergedPlayer.AB || mergedPlayer.totalABs || 0,
                games: mergedPlayer.games || mergedPlayer.gamesPlayed || 0,
                R: mergedPlayer.R || mergedPlayer.totalRuns || 0,
                HR: mergedPlayer.HR || mergedPlayer.totalHRs || 0,
                RBI: mergedPlayer.RBI || mergedPlayer.totalRBIs || 0,
                AVG: mergedPlayer.avg || mergedPlayer.battingAvg || '.000',
                OBP: mergedPlayer.obp || '.000',
                SLG: mergedPlayer.slg || '.000',
                OPS: mergedPlayer.ops || '.000'
              }
            };
          }).sort((a, b) => a.name.localeCompare(b.name));
          
          setAllPlayers(playersList);
          setDaysWithData(rollingData.totalPlayers > 0 ? 84 : 0); // Approximate season games
          
          console.log(`✅ Loaded ${playersList.length} players from rolling stats`);
          
        } else {
          throw new Error('No hitters found in rolling stats');
        }
        
      } catch (rollingError) {
        console.error('Error loading from rolling stats:', rollingError);
        console.log('🔄 Falling back to daily data aggregation...');
        
        // Fallback to original method if rolling stats fail
        await loadPlayersFromDailyData();
      }
      
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fallback method for loading from daily data
  const loadPlayersFromDailyData = async () => {
    const players = new Map();
    let daysWithData = 0;
    let consecutiveEmptyDays = 0;
    const maxEmptyDays = 14;
    
    let checkDate = new Date();
    const seasonStart = new Date('2025-03-01');
    
    while (checkDate >= seasonStart && consecutiveEmptyDays < maxEmptyDays) {
      const dateStr = checkDate.toISOString().split('T')[0];
      
      try {
        const dayPlayers = await fetchPlayerData(dateStr);
        if (dayPlayers && dayPlayers.length > 0) {
          daysWithData++;
          consecutiveEmptyDays = 0;
          
          dayPlayers.forEach(player => {
            if (player.playerType === 'hitter' && player.name && player.team) {
              const key = `${player.name}_${player.team}`;
              players.set(key, {
                name: player.name,
                team: player.team,
                lastSeen: dateStr,
                position: player.position || 'Unknown',
                recentStats: {
                  AVG: player.AVG || '.000',
                  HR: player.HR || 0,
                  RBI: player.RBI || 0
                }
              });
            }
          });
        } else {
          consecutiveEmptyDays++;
        }
      } catch (error) {
        consecutiveEmptyDays++;
      }
      
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    const playersList = Array.from(players.values())
      .sort((a, b) => a.name.localeCompare(b.name));
    
    setAllPlayers(playersList);
    setDaysWithData(daysWithData);
  };

  const handleKeyDown = (e) => {
    if (searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectPlayer(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setSearchResults([]);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const selectPlayer = (player) => {
    onPlayerSelect(player);
    setSearchTerm('');
    setSearchResults([]);
    setSelectedIndex(-1);
  };

  const getTeamColor = (team) => {
    // Basic team color mapping - could be enhanced with full team data
    const teamColors = {
      'NYY': '#132448',
      'BOS': '#BD3039',
      'LAD': '#005A9C',
      'SF': '#FD5A1E',
      'HOU': '#002D62',
      'ATL': '#CE1141',
      'STL': '#C41E3A',
      'CHC': '#0E3386'
    };
    return teamColors[team] || '#666666';
  };

  if (loading) {
    return (
      <div className="player-search-container">
        <div className="search-header">
          <h2>🔍 Player Analysis</h2>
          <p>Search for any player to view comprehensive analysis</p>
        </div>
        <div className="loading-players">
          <div className="loading-spinner"></div>
          <p>Loading player database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="player-search-container">
      <div className="search-header">
        <h2>🔍 Enhanced Player Analysis</h2>
        <p>Search for any player to view comprehensive matchup analysis, splits, and advanced metrics</p>
      </div>

      <div className="search-interface">
        <div className="search-input-container">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by player name (full or abbreviated) or team..."
            className="player-search-input"
            autoFocus
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
              }}
            >
              ✕
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((player, index) => (
              <div
                key={`${player.name}_${player.team}`}
                className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => selectPlayer(player)}
              >
                <div className="player-info">
                  <div className="player-header">
                    <span className="player-name">
                      {player.fullName || player.name}
                      {player.fullName && player.fullName !== player.name && (
                        <span className="abbreviated-name"> ({player.name})</span>
                      )}
                    </span>
                    <span 
                      className="player-team"
                      style={{ color: getTeamColor(player.team) }}
                    >
                      {player.team}
                    </span>
                  </div>
                  <div className="player-details">
                    <span className="position">{player.position}</span>
                    <span className="recent-stats">
                      AVG: {player.recentStats.AVG} | 
                      H: {player.recentStats.H} | 
                      HR: {player.recentStats.HR} | 
                      RBI: {player.recentStats.RBI}
                    </span>
                  </div>
                  <div className="last-seen">
                    Last seen: {new Date(player.lastSeen).toLocaleDateString()}
                  </div>
                </div>
                <div className="select-arrow">→</div>
              </div>
            ))}
          </div>
        )}

        {searchTerm.length >= 2 && searchResults.length === 0 && (
          <div className="no-results">
            <p>No players found matching "{searchTerm}"</p>
            <p className="search-hint">Try searching by first name, last name, or team abbreviation</p>
          </div>
        )}
      </div>

      <div className="search-stats">
        <div className="stat-item">
          <span className="stat-number">{allPlayers.length}</span>
          <span className="stat-label">Players Available</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">30</span>
          <span className="stat-label">MLB Teams</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{daysWithData || 'Loading...'}</span>
          <span className="stat-label">Days of Data</span>
        </div>
      </div>

      <div className="search-help">
        <h3>What You'll Get:</h3>
        <div className="feature-grid">
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <span className="feature-text">Matchup Analysis</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <span className="feature-text">Performance Splits</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📈</span>
            <span className="feature-text">Prop Betting Analysis</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span className="feature-text">Advanced Metrics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerSearchBar;