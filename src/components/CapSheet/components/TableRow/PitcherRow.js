import React, { useState, useEffect } from 'react';
import { getTeamColors } from '../../utils/formatters';
import PitcherPerformanceLineChart from '../PitcherPerformanceLineChart';

/**
 * Component for a pitcher row in the table
 * Enhanced with visual performance line chart and additional statistics
 * Now with proper refreshing when game history changes
 * 
 * @param {Object} player - Pitcher player object
 * @param {Object} teams - Teams data for styling
 * @param {Array} handicappers - Array of handicapper objects
 * @param {function} onFieldChange - Function to handle field changes
 * @param {function} onBetTypeChange - Function to handle bet type changes
 * @param {function} onPickChange - Function to handle handicapper pick changes
 * @param {function} onRemove - Function to handle player removal
 * @param {number} gamesHistory - Number of games to display in history
 * @param {number} refreshKey - Key to force re-render when data refreshes
 * @param {boolean} isRefreshingPitchers - Whether pitcher data is currently refreshing
 * @param {function} fetchPitcherById - Function to fetch pitcher data by ID
 */
const PitcherRow = ({
  player,
  teams,
  handicappers,
  onFieldChange,
  onBetTypeChange,
  onPickChange,
  onRemove,
  gamesHistory,
  refreshKey,
  isRefreshingPitchers,
  fetchPitcherById // Add this prop to fetch pitcher data
}) => {
  // State for the pitcher data to handle updates
  const [selectedPitcher, setSelectedPitcher] = useState(player);
  const [isLoadingPitcher, setIsLoadingPitcher] = useState(false);

  const teamColors = getTeamColors(player.team, teams);

  // Effect to fetch pitcher data when gamesHistory or refreshKey changes
  useEffect(() => {
    const loadPitcherData = async () => {
      if (!player.id) {
        setSelectedPitcher(player); // Fallback to prop data if no ID
        return;
      }

      setIsLoadingPitcher(true);
      try {
        console.log(`[PitcherRow] Fetching pitcher data for: ${player.id} with ${gamesHistory} games history`);
        const pitcher = await fetchPitcherById(player.id);
        console.log(`[PitcherRow] Received updated pitcher data:`, pitcher);
        setSelectedPitcher(pitcher);
      } catch (error) {
        console.error(`[PitcherRow] Error loading pitcher data:`, error);
        setSelectedPitcher(player); // Fallback to prop data on error
      } finally {
        setIsLoadingPitcher(false);
      }
    };

    loadPitcherData();
  }, [player.id, fetchPitcherById, gamesHistory, refreshKey]);

  // Debugging helper - render a small indicator to show full re-renders
  const renderCount = React.useRef(0);
  React.useEffect(() => {
    renderCount.current += 1;
  });

  // Display the pitcher's throwing arm
  const throwingArm = selectedPitcher.throwingArm ? ` (${selectedPitcher.throwingArm})` : '';

  return (
    <tr 
      style={teamColors}
      data-pitcher-id={player.id}
      data-render-count={renderCount.current}
      data-games-history={gamesHistory}
      className={isRefreshingPitchers || isLoadingPitcher ? "loading-row" : ""}
    >
      <td className="player-name">
        {selectedPitcher.name}{throwingArm}
        {(isRefreshingPitchers || isLoadingPitcher) && <span className="loading-indicator">⟳</span>}
      </td>
      <td>{selectedPitcher.team}</td>
      <td>{selectedPitcher.prevGameIP || selectedPitcher.IP || '0'}</td>
<td>{selectedPitcher.prevGameK || selectedPitcher.K || '0'}</td>
<td>{selectedPitcher.prevGameER || selectedPitcher.ER || '0'}</td>
<td>{selectedPitcher.prevGameH || selectedPitcher.H || '0'}</td>
<td>{selectedPitcher.prevGameR || selectedPitcher.R || '0'}</td>
<td>{selectedPitcher.prevGameBB || selectedPitcher.BB || '0'}</td>
<td>{selectedPitcher.prevGameHR || selectedPitcher.HR || '0'}</td>
<td>{selectedPitcher.prevGamePC_ST || selectedPitcher.PC_ST || 'N/A'}</td>
<td>{selectedPitcher.ERA || '0.00'}</td>
      
      {/* Performance Line Chart - Now using the selectedPitcher with refreshed data */}
      <td className="performance-chart-cell">
        <PitcherPerformanceLineChart 
          key={`chart-${player.id}-${refreshKey}-${gamesHistory}`} 
          player={selectedPitcher}
          gamesHistory={gamesHistory}
          isLoading={isLoadingPitcher || isRefreshingPitchers}
        />
      </td>
      
      {/* Opponent */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={player.opponent || ''} 
          onChange={(e) => onFieldChange(player.id, 'opponent', e.target.value)} 
          placeholder="Enter team" 
        />
      </td>
      
      {/* Pitch Count */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={player.expectedPitch || ''} 
          onChange={(e) => onFieldChange(player.id, 'expectedPitch', e.target.value)} 
          placeholder="0" 
        />
      </td>
      
      {/* Expected K */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={player.expectedK || ''} 
          onChange={(e) => onFieldChange(player.id, 'expectedK', e.target.value)} 
          placeholder="0.0" 
        />
      </td>
      
      {/* Stadium */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={player.stadium || ''} 
          onChange={(e) => onFieldChange(player.id, 'stadium', e.target.value)} 
          placeholder="Stadium" 
        />
      </td>
      
      {/* Game O/U */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={player.gameOU || ''} 
          onChange={(e) => onFieldChange(player.id, 'gameOU', e.target.value)} 
          placeholder="0.0" 
        />
      </td>
      
      {/* Bet types */}
      <td>
        <input 
          type="checkbox" 
          className="custom-checkbox" 
          checked={player.betTypes?.K || false} 
          onChange={(e) => onBetTypeChange(player.id, 'K', e.target.checked)} 
        />
      </td>
      <td>
        <input 
          type="checkbox" 
          className="custom-checkbox" 
          checked={player.betTypes?.OU || false} 
          onChange={(e) => onBetTypeChange(player.id, 'OU', e.target.checked)} 
        />
      </td>
      
      {/* Handicapper picks */}
      {handicappers.map(handicapper => (
        <td key={handicapper.id}>
          <div className="checkbox-group">
            <label className="checkbox-label" title="Public">
              <input 
                type="checkbox" 
                className="custom-checkbox eye-checkbox" 
                checked={player.handicapperPicks[handicapper.id]?.public || false} 
                onChange={(e) => onPickChange(player.id, handicapper.id, 'public', e.target.checked)} 
              />
              <span className="eye-icon">👁️</span>
            </label>
            <label className="checkbox-label" title="Private">
              <input 
                type="checkbox" 
                className="custom-checkbox" 
                checked={player.handicapperPicks[handicapper.id]?.private || false} 
                onChange={(e) => onPickChange(player.id, handicapper.id, 'private', e.target.checked)} 
              /> $
            </label>
            <label className="checkbox-label" title="Straight">
              <input 
                type="checkbox" 
                className="custom-checkbox" 
                checked={player.handicapperPicks[handicapper.id]?.straight || false} 
                onChange={(e) => onPickChange(player.id, handicapper.id, 'straight', e.target.checked)} 
              /> S
            </label>
            <div className="bet-type-checkboxes">
              <label className="mini-checkbox-label" title="Strikeouts">
                <input 
                  type="checkbox" 
                  className="mini-checkbox" 
                  checked={player.handicapperPicks[handicapper.id]?.K || false} 
                  onChange={(e) => onPickChange(player.id, handicapper.id, 'K', e.target.checked)} 
                /> K
              </label>
              <label className="mini-checkbox-label" title="Over/Under">
                <input 
                  type="checkbox" 
                  className="mini-checkbox" 
                  checked={player.handicapperPicks[handicapper.id]?.OU || false} 
                  onChange={(e) => onPickChange(player.id, handicapper.id, 'OU', e.target.checked)} 
                /> O/U
              </label>
            </div>
          </div>
        </td>
      ))}
      
      {/* Actions */}
      <td>
        <button 
          className="action-btn remove-btn" 
          onClick={() => onRemove(player.id, 'pitcher')} 
          title="Remove player"
        >
          Remove
        </button>
      </td>
    </tr>
  );
};

export default PitcherRow;