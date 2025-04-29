import React from 'react';
import HitterRow from './TableRow/HitterRow';
import PlayerSelector from './PlayerSelector';
import HitterHandicapSummary from './HitterHandicapSummary';
import './HitterPerformanceLineChart.css'; // Add this CSS file for styling

/**
 * Component for displaying the hitters table section
 * Updated with visual performance line chart instead of individual game statistics columns
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
    <>
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

        {/* Legend for the performance chart */}
        <div className="line-chart-legend">
          <span className="legend-title">Performance Chart:</span>
          <div className="chart-legend-item">
            <div className="chart-legend-line"></div>
            <span>Batting Avg Trend</span>
          </div>
          <div className="chart-legend-item">
            <div className="chart-legend-point"></div>
            <span>Hits/At-Bats</span>
          </div>
          <div className="chart-legend-item">
            <div className="chart-legend-hr"></div>
            <span>Home Runs</span>
          </div>
          <div className="legend-note">
            (Games shown oldest to newest)
          </div>
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
                  
                  {/* Single column for performance chart instead of 12 game stats columns */}
                  <th className="avg-header">Performance Trend</th>
                  
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
                    {/* Adjusted colspan for new table structure */}
                    <td colSpan={14 + handicappers.length} className="no-data">
                      No hitters added. Search and select hitters above to track them.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Add the HitterHandicapSummary component */}
      {hitters.length > 0 && handicappers.length > 0 && (
        <HitterHandicapSummary 
          hitters={hitters} 
          handicappers={handicappers} 
          teams={teams} 
        />
      )}
    </>
  );
};

export default HittersTable;