import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './NavigationPlayerSearch.css';

function NavigationPlayerSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Load all players from rolling stats on mount
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        console.log('🔍 Loading players from rolling stats for navigation search...');
        
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
            
            return mergedStats;
          };
          
          const playersList = rollingData.allHitters.map(player => {
            const mergedPlayer = mergePlayerData(player);
            
            return {
              name: mergedPlayer.name,
              team: mergedPlayer.team,
              lastSeen: new Date().toISOString().split('T')[0],
              position: 'OF', // Rolling stats don't include position
              recentStats: {
                AVG: mergedPlayer.avg || mergedPlayer.battingAvg || '.000',
                HR: mergedPlayer.HR || mergedPlayer.totalHRs || 0,
                RBI: mergedPlayer.RBI || mergedPlayer.totalRBIs || 0,
                H: mergedPlayer.H || mergedPlayer.totalHits || 0
              }
            };
          }).sort((a, b) => a.name.localeCompare(b.name));
          
          setAllPlayers(playersList);
          console.log(`✅ Loaded ${playersList.length} players for navigation search`);
        }
      } catch (error) {
        console.error('Error loading players for navigation search:', error);
      }
    };

    loadPlayers();
  }, []);

  // Search function with fuzzy matching
  const searchPlayers = (term) => {
    if (!term || !allPlayers.length) {
      setSearchResults([]);
      return;
    }

    const searchLower = term.toLowerCase();
    const results = [];

    // Score each player based on match quality
    allPlayers.forEach(player => {
      const nameLower = player.name.toLowerCase();
      const teamLower = player.team.toLowerCase();
      let score = 0;

      // Exact match
      if (nameLower === searchLower) {
        score = 1000;
      }
      // Starts with search term
      else if (nameLower.startsWith(searchLower)) {
        score = 900;
      }
      // First name starts with
      else if (nameLower.split(' ')[0].startsWith(searchLower)) {
        score = 800;
      }
      // Last name starts with
      else if (nameLower.split(' ')[1]?.startsWith(searchLower)) {
        score = 700;
      }
      // Contains search term
      else if (nameLower.includes(searchLower)) {
        score = 500;
      }
      // Team match
      else if (teamLower === searchLower || teamLower.startsWith(searchLower)) {
        score = 400;
      }
      // Abbreviated name match (e.g., "MJ" for "Mike Jones")
      else {
        const nameParts = player.name.split(' ');
        const abbrev = nameParts.map(part => part[0]).join('').toLowerCase();
        if (abbrev.includes(searchLower)) {
          score = 300;
        }
      }

      if (score > 0) {
        results.push({ ...player, score });
      }
    });

    // Sort by score and limit results
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setSearchResults(sortedResults);
    setSelectedIndex(-1);
    setIsDropdownOpen(sortedResults.length > 0);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchPlayers(value);
  };

  // Handle player selection
  const handleSelectPlayer = (player) => {
    setSearchTerm('');
    setSearchResults([]);
    setIsDropdownOpen(false);
    
    // Navigate to players page with the selected player
    navigate('/players', { 
      state: { 
        selectedPlayer: player.name,
        selectedTeam: player.team 
      } 
    });
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isDropdownOpen || searchResults.length === 0) return;

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
          handleSelectPlayer(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="nav-player-search" ref={searchRef}>
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        onKeyDown={handleKeyDown}
        placeholder="Search players..."
        className="nav-search-input"
        aria-label="Search players"
      />
      <button className="search-button" aria-label="Submit search">
        🔍
      </button>
      
      {isDropdownOpen && searchResults.length > 0 && (
        <div className="nav-search-dropdown">
          {searchResults.map((player, index) => (
            <div
              key={`${player.name}-${player.team}`}
              className={`nav-search-result ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelectPlayer(player)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="nav-player-info">
                <span className="nav-player-name">{player.name}</span>
                <span className="nav-player-team">{player.team}</span>
              </div>
              <div className="nav-player-stats">
                <span>{player.recentStats.AVG} AVG</span>
                <span>{player.recentStats.HR} HR</span>
                <span>{player.recentStats.RBI} RBI</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NavigationPlayerSearch;