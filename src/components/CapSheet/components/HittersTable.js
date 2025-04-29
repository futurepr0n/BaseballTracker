import React from 'react';
import HitterRow from './TableRow/HitterRow';
import PlayerSelector from './PlayerSelector';

/**
 * Component for displaying the hitters table section
 * 
 * @param {Object} props - Component props
 */
const HittersTable = ({
  hitters,
  hitterOptions,
  teams,
  handicappers,
  isLoadingPlayers,
  onAddHitter,
  onRemovePlayer,
  onFieldChange,
  onPitcherSelect,
  onBetTypeChange,
  onPickChange,
  onAddHandicapper,
  onRemoveHandicapper,
  getPitcherOptionsForOpponent
}) => {
  return (
    <div className="section-container">
      <h3 className="section-header">Hitters</h3>
      <div className="control-bar">
        <PlayerSelector
          options={hitterOptions}
          onSelect={onAddHitter}
          isLoading={isLoadingPlayers}
          isDisabled={isLoadingPlayers || hitterOptions.length === 0}
          placeholder="Search and select a hitter..."
          noOptionsMessage="No hitters found"
        />
      </div>

      <div className="table-container">
        {isLoadingPlayers && hitters.length === 0 ? (
          <div className="loading-indicator">Loading player data...</div>
        ) : (
          <table className="capsheet-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th className="stat-header">HR Last</th>
                <th className="stat-header">AB Last</th>
                <th className="stat-header">H Last</th>
                {/* Game 1 */}
                <th className="avg-header">G1 Date</th>
                <th className="avg-header">G1 HR</th>
                <th className="avg-header">G1 AB</th>
                <th className="avg-header">G1 H</th>
                {/* Game 2 */}
                <th className="avg-header">G2 Date</th>
                <th className="avg-header">G2 HR</th>
                <th className="avg-header">G2 AB</th>
                <th className="avg-header">G2 H</th>
                {/* Game 3 */}
                <th className="avg-header">G3 Date</th>
                <th className="avg-header">G3 HR</th>
                <th className="avg-header">G3 AB</th>
                <th className="avg-header">G3 H</th>
                <th>Pitcher</th>
                <th>Throws</th>
                <th>Exp SO</th>
                <th>Stadium</th>
                <th>Game O/U</th>
                <th>H</th>
                <th>HR</th>
                <th>B</th>
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
              {hitters.length > 0 ? (
                hitters.map(player => {
                  // Get pitcher options for this hitter (based on opponent team)
                  const pitcherOptions = player.opponentTeam
                    ? getPitcherOptionsForOpponent(player.opponentTeam)
                    : [];

                  return (
                    <HitterRow
                      key={player.id}
                      player={player}
                      teams={teams}
                      handicappers={handicappers}
                      pitcherOptions={pitcherOptions}
                      onFieldChange={onFieldChange}
                      onPitcherSelect={onPitcherSelect}
                      onBetTypeChange={onBetTypeChange}
                      onPickChange={onPickChange}
                      onRemove={onRemovePlayer}
                    />
                  );
                })
              ) : (
                <tr>
                  {/* Adjusted colspan: 25 base + handicappers + 1 action */}
                  <td colSpan={25 + handicappers.length + 1} className="no-data">
                    No hitters added. Search and select hitters above to track them.
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

export default HittersTable;
