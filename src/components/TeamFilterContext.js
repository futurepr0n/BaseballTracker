import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the context
const TeamFilterContext = createContext();

/**
 * TeamFilterProvider - Context provider for team filtering functionality
 * This allows components to access team filtering state and functions
 */
export function TeamFilterProvider({ children, teamData, gameData }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [includeMatchup, setIncludeMatchup] = useState(false);
  const [matchupTeam, setMatchupTeam] = useState(null);

  // Create a map of team codes to roster players for quick lookups
  const [teamRosterMap, setTeamRosterMap] = useState({});
  
  // Find the matchup team for the selected team
  useEffect(() => {
    if (selectedTeam) {
      // Find a game where the selected team is playing
      const teamGame = gameData.find(game => 
        game.homeTeam === selectedTeam || game.awayTeam === selectedTeam
      );
      
      if (teamGame) {
        // Set the opponent team
        const opponent = teamGame.homeTeam === selectedTeam 
          ? teamGame.awayTeam 
          : teamGame.homeTeam;
        
        setMatchupTeam(opponent);
      } else {
        setMatchupTeam(null);
      }
    } else {
      setMatchupTeam(null);
      setIncludeMatchup(false);
    }
  }, [selectedTeam, gameData]);

  // Load roster data to map players to teams
  useEffect(() => {
    // This would typically be an async function that loads roster data
    // For now, we'll create a placeholder implementation
    const loadRosterData = async () => {
      try {
        // You might want to fetch this from '/data/rosters.json' or a similar endpoint
        const response = await fetch('/data/rosters.json');
        if (response.ok) {
          const rosterData = await response.json();
          
          // Create a map of team codes to player names for quick lookups
          const rosterMap = {};
          
          rosterData.forEach(player => {
            if (player.team) {
              if (!rosterMap[player.team]) {
                rosterMap[player.team] = [];
              }
              rosterMap[player.team].push(player.name.toLowerCase());
            }
          });
          
          setTeamRosterMap(rosterMap);
        }
      } catch (error) {
        console.error('Error loading roster data:', error);
      }
    };
    
    loadRosterData();
  }, []);
  
  // Toggle matchup inclusion
  const toggleMatchup = () => {
    setIncludeMatchup(prev => !prev);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSelectedTeam(null);
    setIncludeMatchup(false);
    setMatchupTeam(null);
  };
  
  // Helper function to check if a player should be filtered based on team
  // This improved version handles multiple ways of identifying a player's team
  const shouldIncludePlayer = (playerTeam, playerName) => {
    // If no team is selected, include all players
    if (!selectedTeam) return true;
    
    // First try direct match with team codes (most common case)
    if (playerTeam === selectedTeam) return true;
    if (includeMatchup && playerTeam === matchupTeam) return true;
    
    // If team codes don't match, try looking up team by name
    // This handles cases where player data uses full team names
    const selectedTeamName = teamData[selectedTeam]?.name;
    const matchupTeamName = matchupTeam ? teamData[matchupTeam]?.name : null;
    
    if (selectedTeamName && playerTeam === selectedTeamName) return true;
    if (includeMatchup && matchupTeamName && playerTeam === matchupTeamName) return true;
    
    // If we have a player name and roster data, check if player is on selected team's roster
    if (playerName && teamRosterMap[selectedTeam]) {
      const normalizedName = playerName.toLowerCase();
      if (teamRosterMap[selectedTeam].includes(normalizedName)) return true;
    }
    
    // If including matchup, also check matchup team's roster
    if (includeMatchup && playerName && matchupTeam && teamRosterMap[matchupTeam]) {
      const normalizedName = playerName.toLowerCase();
      if (teamRosterMap[matchupTeam].includes(normalizedName)) return true;
    }
    
    // If no match found, don't include the player
    return false;
  };
  
  // Helper function to check if a game should be filtered based on team
  const shouldIncludeGame = (game) => {
    if (!selectedTeam) return true;
    return game.homeTeam === selectedTeam || game.awayTeam === selectedTeam;
  };
  
  // Helper function to get team name
  const getTeamName = (teamCode) => {
    return teamData[teamCode]?.name || teamCode;
  };
  
  // Debug function to log filter status
  const logFilterStatus = () => {
    console.log('Team Filter Status:', {
      selectedTeam,
      selectedTeamName: teamData[selectedTeam]?.name,
      matchupTeam,
      matchupTeamName: teamData[matchupTeam]?.name,
      includeMatchup,
      rosterMapKeys: Object.keys(teamRosterMap)
    });
  };
  
  // Create the context value object
  const contextValue = {
    selectedTeam,
    setSelectedTeam,
    includeMatchup,
    matchupTeam,
    toggleMatchup,
    resetFilters,
    shouldIncludePlayer,
    shouldIncludeGame,
    getTeamName,
    logFilterStatus,
    isFiltering: !!selectedTeam
  };
  
  return (
    <TeamFilterContext.Provider value={contextValue}>
      {children}
    </TeamFilterContext.Provider>
  );
}

// Custom hook to use the team filter context
export function useTeamFilter() {
  const context = useContext(TeamFilterContext);
  if (!context) {
    throw new Error('useTeamFilter must be used within a TeamFilterProvider');
  }
  return context;
}

export default TeamFilterContext;