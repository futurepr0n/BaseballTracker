import React, { useState } from 'react';
import PitcherRow from './TableRow/PitcherRow';
import PlayerSelector from './PlayerSelector';
import './PitcherPerformanceLineChart.css';

/**
 * Component for displaying the pitchers table section
 * Updated with visual performance trend and additional statistics
 * Now properly passing fetchPitcherById and isRefreshingPitchers props
 * 
 * @param {Object} props - Component props
 */
const PitchersTable = ({
  pitchers,
  pitcherOptions,
  teams,
  handicappers,
  isLoadingPlayers,
  isRefreshingPitchers,
  onAddPitcher,
  onRemovePlayer,
  onFieldChange,
  onBetTypeChange,
  onPickChange,
  onRemoveHandicapper,
  gamesHistory,
  refreshKey,
  fetchPitcherById, // Add this prop to pass down to PitcherRow
  hitters, // Add hitters data to extract pitchers from
  pitcherSelectOptions // Add pitcher select options to find pitcher IDs
}) => {
  // State for batch add functionality
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [batchAddStatus, setBatchAddStatus] = useState('');

  // Extract unique pitchers from hitters table and batch add them
  const handleBatchAddFromHitters = async () => {
    if (!hitters || hitters.length === 0) {
      setBatchAddStatus('No hitters available to extract pitchers from');
      setTimeout(() => setBatchAddStatus(''), 3000);
      return;
    }

    setIsBatchAdding(true);
    setBatchAddStatus('Extracting pitchers from hitters...');

    try {
      // Extract unique pitcher names from hitters
      const uniquePitchers = new Set();
      const pitchersToAdd = [];

      hitters.forEach(hitter => {
        // Check primary pitcher
        if (hitter.pitcher && hitter.pitcher.trim() !== '') {
          uniquePitchers.add(hitter.pitcher.trim());
        }
        
        // Check second pitcher if exists
        if (hitter.secondPitcher && hitter.secondPitcher.trim() !== '') {
          uniquePitchers.add(hitter.secondPitcher.trim());
        }
      });

      setBatchAddStatus(`Found ${uniquePitchers.size} unique pitchers...`);

      let successCount = 0;
      let totalCount = 0;

      for (const pitcherName of uniquePitchers) {
        totalCount++;
        setBatchAddStatus(`Processing ${pitcherName}...`);

        try {
          // Check if pitcher already exists in the pitchers table
          const existingPitcher = pitchers.find(p => p.name === pitcherName);
          if (existingPitcher) {
            console.log(`Pitcher ${pitcherName} already exists, skipping`);
            continue;
          }

          // Find the pitcher in pitcherSelectOptions to get the ID
          const pitcherOption = pitcherSelectOptions?.find(
            option => option.label.includes(pitcherName)
          );

          if (pitcherOption) {
            await onAddPitcher(pitcherOption.value);
            successCount++;
            console.log(`Successfully added pitcher: ${pitcherName}`);
          } else {
            console.warn(`Pitcher ${pitcherName} not found in available options`);
          }
        } catch (error) {
          console.error(`Error adding pitcher ${pitcherName}:`, error);
        }
      }

      setBatchAddStatus(`Successfully added ${successCount} of ${totalCount} pitchers`);
      setTimeout(() => setBatchAddStatus(''), 3000);

    } catch (error) {
      console.error('Error during batch add:', error);
      setBatchAddStatus('Error during batch add operation');
      setTimeout(() => setBatchAddStatus(''), 3000);
    } finally {
      setIsBatchAdding(false);
    }
  };
  return (
    <div className="section-container">
      <h3 className="section-header">
        Pitchers
        {isRefreshingPitchers && (
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
          options={pitcherOptions}
          onSelect={onAddPitcher}
          isLoading={isLoadingPlayers}
          isDisabled={isLoadingPlayers || pitcherOptions.length === 0}
          placeholder="Search and select a pitcher..."
          noOptionsMessage="No pitchers found"
          selectId="pitcher-selector" // Add unique ID for select
        />
        <button
          className="action-btn batch-add-btn"
          onClick={handleBatchAddFromHitters}
          disabled={isBatchAdding || !hitters || hitters.length === 0}
          title="Add all unique pitchers found in the hitters table"
        >
          {isBatchAdding ? '⟳ Adding...' : '📥 Add from Hitters Table'}
        </button>
        {batchAddStatus && (
          <span className="batch-add-status">
            {batchAddStatus}
          </span>
        )}
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
                pitchers.map((player, index) => (
                  <PitcherRow
                    key={`${player.id}-${refreshKey}-${index}`} // Include refresh key in the key to force re-render
                    player={player}
                    teams={teams}
                    handicappers={handicappers}
                    onFieldChange={onFieldChange}
                    onBetTypeChange={onBetTypeChange}
                    onPickChange={onPickChange}
                    onRemove={onRemovePlayer}
                    gamesHistory={gamesHistory} // Pass down games history value
                    refreshKey={refreshKey} // Pass down refresh key
                    isRefreshingPitchers={isRefreshingPitchers} // Pass loading state
                    fetchPitcherById={fetchPitcherById} // Pass down the fetch function
                    rowIndex={index} // Add index to help create unique IDs
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