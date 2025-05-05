import React from 'react';
import PitcherRow from './TableRow/PitcherRow';
import PlayerSelector from './PlayerSelector';
import './PitcherPerformanceLineChart.css'; // Make sure to import the CSS file

/**
 * Component for displaying the pitchers table section
 * Updated with visual performance trend and additional statistics
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
  onRemoveHandicapper,
  gamesHistory
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

      {/* Legend for the performance chart */}
      <div className="pitcher-chart-legend">
        <span className="legend-title">Performance Chart:</span>
        <div className="legend-item">
          <div className="legend-line legend-up"></div>
          <span>Improving K/IP</span>
        </div>
        <div className="legend-item">
          <div className="legend-line legend-down"></div>
          <span>Declining K/IP</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle legend-er-0"></div>
          <span>0 ER</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle legend-er-1"></div>
          <span>1 ER</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle legend-er-2"></div>
          <span>2-3 ER</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle legend-er-4"></div>
          <span>4+ ER</span>
        </div>
        <div className="legend-note">
          (Games shown oldest to newest)
        </div>
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
                <th className="stat-header">H Last</th>
                <th className="stat-header">R Last</th>
                <th className="stat-header">BB Last</th>
                <th className="stat-header">HR Last</th>
                <th className="stat-header">PC_ST</th>
                <th className="stat-header">ERA</th>
                
                {/* Single column for performance chart instead of 12 game stats columns */}
                <th className="avg-header">Performance Trend</th>
                
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
                  {/* Adjusted colspan for new table structure */}
                  <td colSpan={19 + handicappers.length} className="no-data">
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