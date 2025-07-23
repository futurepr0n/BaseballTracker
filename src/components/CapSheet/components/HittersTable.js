import React, { useState } from 'react';
import HitterRow from './TableRow/HitterRow';
import PlayerSelector from './PlayerSelector';
import { getMatchupFromTeam } from '../../../services/startingLineupService';
import { usePlayerScratchpad } from '../../../contexts/PlayerScratchpadContext';
import './HitterPerformanceLineChart.css';
import '../styles/CapSheetTable.css';

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
  // State for auto-fill functionality
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillStatus, setAutoFillStatus] = useState('');
  
  // State for scratchpad dump functionality
  const [isDumpingFromScratchpad, setIsDumpingFromScratchpad] = useState(false);
  const [dumpStatus, setDumpStatus] = useState('');
  
  // Access scratchpad context
  const { getHitters: getScratchpadHitters, playerCount, hitterCount } = usePlayerScratchpad();

  // Check if any hitter has a second pitcher to determine if we need those columns
  const hasAnySecondPitcher = hitters.some(hitter => {
    // Check if second pitcher exists in the player object
    return hitter.secondPitcherId || hitter.secondPitcher;
  });

  // Auto-fill pitchers from starting lineups
  const handleAutoFillPitchers = async () => {
    setIsAutoFilling(true);
    setAutoFillStatus('Loading starting lineups...');
    
    try {
      let successCount = 0;
      let totalCount = 0;
      
      for (const hitter of hitters) {
        // Skip if pitcher already selected
        if (hitter.pitcherId) continue;
        
        // Need opponent team to look up pitcher
        if (!hitter.team) continue;
        
        totalCount++;
        setAutoFillStatus(`Processing ${hitter.name}...`);
        
        try {
          const matchupData = await getMatchupFromTeam(hitter.team);
          if (matchupData && matchupData.opponentPitcher && matchupData.opponentPitcher !== 'TBD') {
            // Find the pitcher ID from options
            const pitcherOption = getPitcherOptionsForOpponent(hitter.team)?.find(
              p => p.label.includes(matchupData.opponentPitcher)
            );
            
            if (pitcherOption) {
              onPitcherSelect(hitter.id, pitcherOption.value);
              successCount++;
              console.log(`Auto-filled pitcher for ${hitter.name}: ${matchupData.opponentPitcher}`);
            }
          }
        } catch (error) {
          console.warn(`Failed to auto-fill pitcher for ${hitter.name}:`, error);
        }
      }
      
      setAutoFillStatus(`Auto-filled ${successCount} of ${totalCount} pitchers`);
      setTimeout(() => setAutoFillStatus(''), 3000);
      
    } catch (error) {
      console.error('Error during auto-fill:', error);
      setAutoFillStatus('Error loading starting lineups');
      setTimeout(() => setAutoFillStatus(''), 3000);
    } finally {
      setIsAutoFilling(false);
    }
  };

  // Enhanced dump hitters from scratchpad using bet slip scanner logic
  const handleDumpFromScratchpad = async () => {
    const scratchpadHitters = getScratchpadHitters();
    
    if (scratchpadHitters.length === 0) {
      setDumpStatus('No hitters in scratchpad');
      setTimeout(() => setDumpStatus(''), 3000);
      return;
    }

    setIsDumpingFromScratchpad(true);
    setDumpStatus(`Processing ${scratchpadHitters.length} hitters from scratchpad...`);

    try {
      // Import enhanced matching utility
      const { processScratchpadPlayerForCapSheet } = await import('../../../utils/enhancedPlayerMatching');
      
      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let notFoundCount = 0;

      for (const scratchpadPlayer of scratchpadHitters) {
        setDumpStatus(`Processing ${scratchpadPlayer.name}...`);

        try {
          // Use enhanced player matching logic
          const result = processScratchpadPlayerForCapSheet(
            scratchpadPlayer,
            hitterOptions,
            hitters
          );

          if (result.success) {
            // Found a match - add using the matched player ID
            await onAddHitter(result.playerId);
            successCount++;
            console.log(`✅ Successfully added hitter: ${scratchpadPlayer.name} (${scratchpadPlayer.team})`);
          } else if (result.reason === 'already_exists') {
            skippedCount++;
            console.log(`⏭️ Hitter ${scratchpadPlayer.name} already in table`);
          } else if (result.reason === 'no_match') {
            notFoundCount++;
            console.warn(`❌ No match found for ${scratchpadPlayer.name} (${scratchpadPlayer.team})`);
          }
          
        } catch (error) {
          console.error(`💥 Error adding hitter ${scratchpadPlayer.name}:`, error);
          errorCount++;
        }
      }

      // Create comprehensive status message
      const statusParts = [
        successCount > 0 ? `Added ${successCount} hitters` : null,
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
        <button
          className="action-btn auto-fill-btn"
          onClick={handleAutoFillPitchers}
          disabled={isAutoFilling || hitters.length === 0}
          title="Auto-fill pitchers from starting lineups data"
        >
          {isAutoFilling ? '⟳ Auto-filling...' : '🔄 Auto-fill Pitchers'}
        </button>
        {hitterCount > 0 && (
          <button
            className="action-btn scratchpad-dump-btn"
            onClick={handleDumpFromScratchpad}
            disabled={isDumpingFromScratchpad || hitterCount === 0}
            title={`Dump ${hitterCount} hitters from scratchpad to CapSheet`}
          >
            {isDumpingFromScratchpad ? '⟳ Adding...' : `📝 Dump ${hitterCount} Hitters`}
          </button>
        )}
        {autoFillStatus && (
          <span className="auto-fill-status">
            {autoFillStatus}
          </span>
        )}
        {dumpStatus && (
          <span className="dump-status">
            {dumpStatus}
          </span>
        )}
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
          <table className="capsheet-hitters-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th className="capsheet-hitters-stat-header">HR Last</th>
                <th className="capsheet-hitters-stat-header">AB Last</th>
                <th className="capsheet-hitters-stat-header">H Last</th>
                
                {/* Performance Chart */}
                <th className="avg-header">Performance Trend</th>
                
                {/* Primary Pitcher */}
                <th>Primary Pitcher</th>
                <th className="capsheet-hitters-stat-header">Last IP</th>
                <th className="capsheet-hitters-stat-header">PC_ST</th>
                <th className="capsheet-hitters-stat-header">K</th>
                <th className="capsheet-hitters-stat-header">HR</th>
                <th className="throws-header">Throws</th>
                
                {/* Second Pitcher - Only show if needed */}
                <th>Second Pitcher</th>
                
                {/* Dynamic second pitcher columns */}
                {hasAnySecondPitcher ? (
                  <>
                    <th className="capsheet-hitters-stat-header second-pitcher-header">Last IP</th>
                    <th className="capsheet-hitters-stat-header second-pitcher-header">PC_ST</th>
                    <th className="capsheet-hitters-stat-header second-pitcher-header">K</th>
                    <th className="capsheet-hitters-stat-header second-pitcher-header">HR</th>
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