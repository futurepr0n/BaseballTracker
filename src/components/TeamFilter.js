import React from 'react';
import './TeamFilter.css';

/**
 * TeamFilter component for filtering dashboard data by team
 * 
 * @param {Object} props Component props
 * @param {Object} props.teamData Team data object with team information
 * @param {string|null} props.selectedTeam Currently selected team code
 * @param {boolean} props.includeMatchup Whether to include matchup team
 * @param {function} props.onTeamSelect Handler for team selection
 * @param {function} props.onMatchupToggle Handler for matchup toggle
 * @param {function} props.onReset Handler for resetting filters
 */
const TeamFilter = ({ 
  teamData, 
  selectedTeam, 
  includeMatchup, 
  matchupTeam,
  onTeamSelect, 
  onMatchupToggle, 
  onReset 
}) => {
  // Convert teams object to array for dropdown
  const teams = Object.entries(teamData).map(([code, team]) => ({
    code,
    name: team.name
  })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="team-filter">
      <div className="filter-section">
        <label htmlFor="team-select">Filter By Team:</label>
        <div className="select-wrapper">
          <select 
            id="team-select" 
            value={selectedTeam || ''} 
            onChange={(e) => onTeamSelect(e.target.value || null)}
          >
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team.code} value={team.code}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="matchup-toggle">
        <label className="toggle-label">
          <input 
            type="checkbox" 
            checked={includeMatchup} 
            onChange={() => onMatchupToggle()}
            disabled={!selectedTeam}
          />
          <span className="toggle-text">Include Matchup</span>
        </label>
        
        {selectedTeam && matchupTeam && includeMatchup && (
          <div className="matchup-indicator">
            vs {teamData[matchupTeam]?.name || matchupTeam}
          </div>
        )}
      </div>

      <button 
        className="reset-filters" 
        onClick={onReset}
        disabled={!selectedTeam && !includeMatchup}
      >
        Reset Filters
      </button>
    </div>
  );
};

export default TeamFilter;