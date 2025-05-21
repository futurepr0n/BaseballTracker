import React from 'react';

/**
 * FilterIndicator - Visual indicator of active filters
 * 
 * @param {Object} props Component props
 * @param {string|null} props.selectedTeam Currently selected team code
 * @param {Object} props.teamData Team data object with team information
 * @param {boolean} props.includeMatchup Whether matchup is included
 * @param {string|null} props.matchupTeam Matchup team code
 * @param {function} props.onReset Function to reset filters
 */
const FilterIndicator = ({ 
  selectedTeam, 
  teamData, 
  includeMatchup, 
  matchupTeam, 
  onReset 
}) => {
  if (!selectedTeam) return null;
  
  // Get team names for display
  const selectedTeamName = teamData[selectedTeam]?.abbreviation || selectedTeam;
  const matchupTeamName = matchupTeam && teamData[matchupTeam] ? 
    teamData[matchupTeam].name : matchupTeam;
  
  return (
    <div className="filter-indicator">
      <div className="indicator-content">
        <span>Filtered by: </span>
        <span className="team-name primary">{selectedTeamName}</span>
        {includeMatchup && matchupTeam && (
          <>
            <span className="vs-text">vs</span>
            <span className="team-name secondary">{matchupTeamName}</span>
          </>
        )}
      </div>
      <button 
        className="reset-btn" 
        onClick={onReset}
        aria-label="Reset filters"
      >
        ✕
      </button>
    </div>
  );
};

export default FilterIndicator;