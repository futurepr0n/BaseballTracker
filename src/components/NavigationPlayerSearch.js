import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayerRollingStats, getAllPlayersFromRollingStats } from '../services/rollingStatsService';
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
        const rollingData = await getAllPlayersFromRollingStats();
        
        if (rollingData && rollingData.players) {
          const playersList = rollingData.players.map(player => ({
            name: player.name,
            team: player.team,
            lastSeen: rollingData.lastUpdated || new Date().toISOString().split('T')[0],
            position: 'OF', // Rolling stats don't include position
            recentStats: {
              AVG: player.avg || player.battingAvg || '.000',
              HR: player.HR || player.totalHRs || 0,
              RBI: player.RBI || player.totalRBIs || 0,
              H: player.H || player.totalHits || 0
            }
          })).sort((a, b) => a.name.localeCompare(b.name));
          
          setAllPlayers(playersList);
        }
      } catch (error) {
        console.error('Error loading players:', error);
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