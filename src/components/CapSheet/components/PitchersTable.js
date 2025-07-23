import React, { useState } from 'react';
import PitcherRow from './TableRow/PitcherRow';
import PlayerSelector from './PlayerSelector';
import { usePlayerScratchpad } from '../../../contexts/PlayerScratchpadContext';
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
  
  // State for scratchpad dump functionality
  const [isDumpingFromScratchpad, setIsDumpingFromScratchpad] = useState(false);
  const [dumpStatus, setDumpStatus] = useState('');
  
  // Access scratchpad context
  const { getPitchers: getScratchpadPitchers, playerCount, pitcherCount } = usePlayerScratchpad();

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

  // Enhanced dump pitchers from scratchpad using bet slip scanner logic
  const handleDumpFromScratchpad = async () => {
    const scratchpadPitchers = getScratchpadPitchers();
    
    if (scratchpadPitchers.length === 0) {
      setDumpStatus('No pitchers in scratchpad');
      setTimeout(() => setDumpStatus(''), 3000);
      return;
    }

    setIsDumpingFromScratchpad(true);
    setDumpStatus(`Processing ${scratchpadPitchers.length} pitchers from scratchpad...`);

    try {
      // Import enhanced matching utility
      const { processScratchpadPlayerForCapSheet } = await import('../../../utils/enhancedPlayerMatching');
      
      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let notFoundCount = 0;

      for (const scratchpadPlayer of scratchpadPitchers) {
        setDumpStatus(`Processing ${scratchpadPlayer.name}...`);

        try {
          // Use enhanced player matching logic
          const result = processScratchpadPlayerForCapSheet(
            scratchpadPlayer,
            pitcherOptions,
            pitchers
          );

          if (result.success) {
            // Found a match - add using the matched player ID
            await onAddPitcher(result.playerId);
            successCount++;
            console.log(`✅ Successfully added pitcher: ${scratchpadPlayer.name} (${scratchpadPlayer.team})`);
          } else if (result.reason === 'already_exists') {
            skippedCount++;
            console.log(`⏭️ Pitcher ${scratchpadPlayer.name} already in table`);
          } else if (result.reason === 'no_match') {
            notFoundCount++;
            console.warn(`❌ No match found for ${scratchpadPlayer.name} (${scratchpadPlayer.team})`);
          }
          
        } catch (error) {
          console.error(`💥 Error adding pitcher ${scratchpadPlayer.name}:`, error);
          errorCount++;
        }
      }

      // Create comprehensive status message
      const statusParts = [
        successCount > 0 ? `Added ${successCount} pitchers` : null,
        skippedCount > 0 ? `${skippedCount} already in table` : null,
        notFoundCount > 0 ? `${notFoundCount} not found` : null,
        errorCount > 0 ? `${errorCount} failed` : null
      ].filter(Boolean);

      const finalStatus = statusParts.length > 0 ? statusParts.join(', ') : 'No changes made';
      setDumpStatus(finalStatus);
      
      // Show longer status for complex results
      const timeoutDuration = (notFoundCount > 0 || errorCount > 0) ? 7000 : 5000;
      setTimeout(() => setDumpStatus(''), timeoutDuration);

      // Log summary
      console.log(`🏁 Scratchpad dump complete: ${finalStatus}`);

    } catch (error) {
      console.error('💥 Error during enhanced scratchpad dump:', error);
      setDumpStatus('Error during dump operation - check console');
      setTimeout(() => setDumpStatus(''), 5000);
    } finally {
      setIsDumpingFromScratchpad(false);
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
        {pitcherCount > 0 && (
          <button
            className="action-btn scratchpad-dump-btn"
            onClick={handleDumpFromScratchpad}
            disabled={isDumpingFromScratchpad || pitcherCount === 0}
            title={`Dump ${pitcherCount} pitchers from scratchpad to CapSheet`}
          >
            {isDumpingFromScratchpad ? '⟳ Adding...' : `📝 Dump ${pitcherCount} Pitchers`}
          </button>
        )}
        {batchAddStatus && (
          <span className="batch-add-status">
            {batchAddStatus}
          </span>
        )}
        {dumpStatus && (
          <span className="dump-status">
            {dumpStatus}
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