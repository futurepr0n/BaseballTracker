import React from 'react';
import HitterRow from './TableRow/HitterRow';
import PlayerSelector from './PlayerSelector';
import './HitterPerformanceLineChart.css';

/**
 * Component for displaying the hitters table section
 * Updated to pass fetchHitterById for individual hitter refreshes
 * 
 * @param {Object} props - Component props
 */
const HittersTable = ({
  hitters,
  hitterOptions,
  fetchPitcherById, 
  fetchHitterById, // New prop to pass down to HitterRow
  teams,
  handicappers,
  isLoadingPlayers,
  isRefreshingHitters,
  onAddHitter,
  onRemovePlayer,
  onFieldChange,
  onPitcherSelect,
  onBetTypeChange,
  onPickChange,
  onAddHandicapper,
  onRemoveHandicapper,
  getPitcherOptionsForOpponent,
  gamesHistory,
  refreshKey // Add refresh key to force re-render when needed
}) => {
  // Check if any hitter has a second pitcher to determine if we need those columns
  const hasAnySecondPitcher = hitters.some(hitter => {
    // Check if second pitcher exists in the player object
    return hitter.secondPitcherId || hitter.secondPitcher;
  });

  return (
    <div className="section-container">
      <h3 className="section-header">
        Hitters
        {isRefreshingHitters && (
          <span className="refreshing-indicator">
            <div className="refreshing-spinner"></div>
            Refreshing charts...
          </span>
        )}
        <span className="games-history-indicator">
          Showing {gamesHistory} game{gamesHistory !== 1 ? 's' : ''} of history
        </span>
      </h3>
      <div className="control-bar">
        <PlayerSelector
          options={hitterOptions}
          onSelect={onAddHitter}
          isLoading={isLoadingPlayers}
          isDisabled={isLoadingPlayers || hitterOptions.length === 0}
          placeholder="Search and select a hitter..."
          noOptionsMessage="No hitters found"
          selectId="hitter-selector"
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
        
        {/* Add pitcher overlay legend items */}
        <div className="chart-legend-item">
          <div className="chart-legend-line" style={{backgroundColor: "#22c55e", borderStyle: "dashed"}}></div>
          <span>Primary Pitcher (K/IP)</span>
        </div>
        <div className="chart-legend-item">
          <div className="chart-legend-line" style={{backgroundColor: "#16a34a", borderStyle: "dashed"}}></div>
          <span>Second Pitcher (K/IP)</span>
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
                
                {/* Performance Chart */}
                <th className="avg-header">Performance Trend</th>
                
                {/* Primary Pitcher */}
                <th>Primary Pitcher</th>
                <th className="stat-header">Last IP</th>
                <th className="stat-header">PC_ST</th>
                <th className="stat-header">K</th>
                <th className="stat-header">HR</th>
                <th className="throws-header">Throws</th>
                
                {/* Second Pitcher - Only show if needed */}
                <th>Second Pitcher</th>
                
                {/* Dynamic second pitcher columns */}
                {hasAnySecondPitcher ? (
                  <>
                    <th className="stat-header second-pitcher-header">Last IP</th>
                    <th className="stat-header second-pitcher-header">PC_ST</th>
                    <th className="stat-header second-pitcher-header">K</th>
                    <th className="stat-header second-pitcher-header">HR</th>
                    <th className="throws-header second-pitcher-header">Throws</th>
                  </>
                ) : null}
                
                {/* Rest of columns */}
                <th>Exp SO</th>
                <th>Stadium</th>
                <th>Game O/U</th>
                <th>H</th>
                <th>HR</th>
                <th>B</th>
                
                {/* Handicapper columns */}
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
                hitters.map((player, index) => {
                  // Get pitcher options for this hitter (based on opponent team)
                  const pitcherOptions = player.opponentTeam
                    ? getPitcherOptionsForOpponent(player.opponentTeam)
                    : [];

                  return (
                    <HitterRow
                      key={`${player.id}-${refreshKey}-${index}`} // Include refresh key in the key to force re-render
                      player={player}
                      teams={teams}
                      handicappers={handicappers}
                      pitcherOptions={pitcherOptions}
                      fetchPitcherById={fetchPitcherById}
                      fetchHitterById={fetchHitterById} // Pass the new function
                      onFieldChange={onFieldChange}
                      onPitcherSelect={onPitcherSelect}
                      onBetTypeChange={onBetTypeChange}
                      onPickChange={onPickChange}
                      onRemove={onRemovePlayer}
                      hasAnySecondPitcher={hasAnySecondPitcher}
                      gamesHistory={gamesHistory}
                      refreshKey={refreshKey}
                      rowIndex={index}
                      isRefreshingHitters={isRefreshingHitters}
                    />
                  );
                })
              ) : (
                <tr>
                  {/* Dynamic colspan calculation */}
                  <td colSpan={
                    20 + // Base columns
                    (hasAnySecondPitcher ? 5 : 0) + // Second pitcher columns
                    handicappers.length // Handicapper columns
                  } className="no-data">
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