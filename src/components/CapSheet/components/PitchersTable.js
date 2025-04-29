import React from 'react';
import PitcherRow from './TableRow/PitcherRow';
import PlayerSelector from './PlayerSelector';

/**
 * Component for displaying the pitchers table section
 * 
 * @param {Object} props - Component props
 */
const PitchersTable = ({
  pitchers,
  pitcherOptions,
  teams,
  handicappers,
  isLoadingPlayers,
  onAddPitcher,
  onRemovePlayer,
  onFieldChange,
  onBetTypeChange,
  onPickChange,
  onRemoveHandicapper
}) => {
  return (
    <div className="section-container">
      <h3 className="section-header">Pitchers</h3>
      <div className="control-bar">
        <PlayerSelector
          options={pitcherOptions}
          onSelect={onAddPitcher}
          isLoading={isLoadingPlayers}
          isDisabled={isLoadingPlayers || pitcherOptions.length === 0}
          placeholder="Search and select a pitcher..."
          noOptionsMessage="No pitchers found"
        />
      </div>

      <div className="table-container">
        {isLoadingPlayers && pitchers.length === 0 ? (
          <div className="loading-indicator">Loading player data...</div>
        ) : (
          <table className="capsheet-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th className="stat-header">IP Last</th>
                <th className="stat-header">K Last</th>
                <th className="stat-header">ER Last</th>
                {/* Game 1 */}
                <th className="avg-header">G1 Date</th>
                <th className="avg-header">G1 IP</th>
                <th className="avg-header">G1 K</th>
                <th className="avg-header">G1 ER</th>
                {/* Game 2 */}
                <th className="avg-header">G2 Date</th>
                <th className="avg-header">G2 IP</th>
                <th className="avg-header">G2 K</th>
                <th className="avg-header">G2 ER</th>
                {/* Game 3 */}
                <th className="avg-header">G3 Date</th>
                <th className="avg-header">G3 IP</th>
                <th className="avg-header">G3 K</th>
                <th className="avg-header">G3 ER</th>
                <th>Opponent</th>
                <th>Pitch Count</th>
                <th>Exp K</th>
                <th>Stadium</th>
                <th>Game O/U</th>
                <th>K</th>
                <th>O/U</th>
                {handicappers.map(handicapper => (
                  <th key={handicapper.id}>
                    {handicapper.name.replace('@', '')}
                    <button
                      className="action-btn remove-btn"
                      onClick={() => onRemoveHandicapper(handicapper.id)}
                      title={`Remove ${handicapper.name}`}
                    >
                      ×
                    </button>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pitchers.length > 0 ? (
                pitchers.map(player => (
                  <PitcherRow
                    key={player.id}
                    player={player}
                    teams={teams}
                    handicappers={handicappers}
                    onFieldChange={onFieldChange}
                    onBetTypeChange={onBetTypeChange}
                    onPickChange={onPickChange}
                    onRemove={onRemovePlayer}
                  />
                ))
              ) : (
                <tr>
                  {/* Adjusted colspan: 24 base + handicappers + 1 action */}
                  <td colSpan={24 + handicappers.length + 1} className="no-data">
                    No pitchers added. Search and select pitchers above to track them.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PitchersTable;