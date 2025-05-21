import React from 'react';
import { useTeamFilter } from './TeamFilterContext';

/**
 * FilteredEmptyState - Component to show when no data is found after filtering
 * 
 * @param {Object} props Component props
 * @param {string} props.message Custom message to show (optional)
 * @param {string} props.type Type of data that's empty (optional)
 */
const FilteredEmptyState = ({ message, type = 'data' }) => {
  const { selectedTeam, getTeamName, includeMatchup, matchupTeam, resetFilters } = useTeamFilter();
  
  // Skip if not filtering
  if (!selectedTeam) return null;
  
  // Create a message about the current filter
  const teamName = getTeamName(selectedTeam);
  const matchupName = matchupTeam ? getTeamName(matchupTeam) : '';
  
  const defaultMessage = includeMatchup && matchupTeam
    ? `No ${type} found for ${teamName} vs ${matchupName}`
    : `No ${type} found for ${teamName}`;
  
  return (
    <div className="filtered-empty-state">
      <div className="empty-icon">🔍</div>
      <h3>No Results Found</h3>
      <p>{message || defaultMessage}</p>
      <button className="reset-btn" onClick={resetFilters}>
        Reset Filters
      </button>
    </div>
  );
};

export default FilteredEmptyState;