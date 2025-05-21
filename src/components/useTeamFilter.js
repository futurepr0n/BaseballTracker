import { useMemo } from 'react';
import { useTeamFilter } from './TeamFilterContext';

/**
 * useTeamFilteredData - Hook for filtering data based on team selection
 * 
 * @param {Array} data - Array of objects with team property
 * @param {string} teamField - Field name for the team property (default: 'team')
 * @returns {Array} Filtered data
 */
function useTeamFilteredData(data, teamField = 'team') {
  const { selectedTeam, includeMatchup, matchupTeam, shouldIncludePlayer } = useTeamFilter();
  
  // Filter the data based on team selection
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!selectedTeam) return data;
    
    return data.filter(item => {
      const itemTeam = item[teamField];
      return shouldIncludePlayer(itemTeam);
    });
  }, [data, selectedTeam, includeMatchup, matchupTeam, teamField, shouldIncludePlayer]);
  
  return filteredData;
}

/**
 * useTeamFilteredObject - Hook for filtering object properties based on team
 * For objects where each property/key is a player or has a team property
 * 
 * @param {Object} obj - Object with team-based properties
 * @param {Function} getTeamFn - Function to extract team from each item (key, value)
 * @returns {Object} Filtered object
 */
export function useTeamFilteredObject(obj, getTeamFn) {
  const { selectedTeam, includeMatchup, matchupTeam, shouldIncludePlayer } = useTeamFilter();
  
  // Filter the object based on team selection
  const filteredObj = useMemo(() => {
    if (!obj || typeof obj !== 'object') return {};
    if (!selectedTeam) return obj;
    
    return Object.fromEntries(
      Object.entries(obj).filter(([key, value]) => {
        const itemTeam = getTeamFn(key, value);
        return shouldIncludePlayer(itemTeam);
      })
    );
  }, [obj, selectedTeam, includeMatchup, matchupTeam, getTeamFn, shouldIncludePlayer]);
  
  return filteredObj;
}

export default useTeamFilteredData;