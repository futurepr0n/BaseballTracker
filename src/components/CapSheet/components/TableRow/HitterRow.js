import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { getTeamColors } from '../../utils/formatters';
import OverlayPerformanceChart from '../OverlayPerformanceChart';

/**
 * Component for a hitter row in the table
 * Modified to fix dropdown and chart visibility issues on mobile
 */
const HitterRow = ({
  player,
  teams,
  handicappers,
  pitcherOptions,
  fetchPitcherById,
  fetchHitterById,
  onFieldChange,
  onPitcherSelect,
  onBetTypeChange,
  onPickChange,
  onRemove,
  hasAnySecondPitcher,
  gamesHistory,
  refreshKey,
  rowIndex,
  isRefreshingHitters
}) => {
  // States for primary pitcher
  const [showPitcherOverlay, setShowPitcherOverlay] = useState(false);
  const [selectedPitcher, setSelectedPitcher] = useState(null);
  const [isLoadingPitcher, setIsLoadingPitcher] = useState(false);
  
  // States for second pitcher
  const [showSecondPitcher, setShowSecondPitcher] = useState(false);
  const [secondPitcherId, setSecondPitcherId] = useState(player.secondPitcherId || null);
  const [secondPitcher, setSecondPitcher] = useState(player.secondPitcher || '');
  const [selectedSecondPitcher, setSelectedSecondPitcher] = useState(null);
  const [showSecondPitcherOverlay, setShowSecondPitcherOverlay] = useState(false);
  const [isLoadingSecondPitcher, setIsLoadingSecondPitcher] = useState(false);
  
  // New states for hitter data
  const [selectedHitter, setSelectedHitter] = useState(player);
  const [isLoadingHitter, setIsLoadingHitter] = useState(false);

  const teamColors = getTeamColors(player.team, teams);

  // Debug log to track player prop updates and refreshes
  useEffect(() => {
    console.log(`[HitterRow] Rendering player ${player.name} with ${gamesHistory} games history (refresh key: ${refreshKey})`);
    
    // Log the available game data
    let gameCount = 0;
    let i = 1;
    while (player[`game${i}Date`]) {
      gameCount++;
      i++;
    }
    console.log(`[HitterRow] Player ${player.name} has ${gameCount} game history entries`);
  }, [player, gamesHistory, refreshKey]);

  // Effect to fetch hitter data when gamesHistory or refreshKey changes
  useEffect(() => {
    const loadHitterData = async () => {
      if (!player.id) {
        setSelectedHitter(player); // Fallback to prop data if no ID
        return;
      }

      setIsLoadingHitter(true);
      try {
        console.log(`[HitterRow] Fetching hitter data for: ${player.id} with ${gamesHistory} games history`);
        const hitter = await fetchHitterById(player.id, gamesHistory);
        console.log(`[HitterRow] Received hitter data:`, hitter);
        setSelectedHitter(hitter);
      } catch (error) {
        console.error(`[HitterRow] Error loading hitter data:`, error);
        setSelectedHitter(player); // Fallback to prop data on error
      } finally {
        setIsLoadingHitter(false);
      }
    };

    loadHitterData();
  }, [player.id, fetchHitterById, gamesHistory, refreshKey]);

  // Effect to fetch primary pitcher data when pitcherId changes
  useEffect(() => {
    const loadPitcherData = async () => {
      if (!player.pitcherId) {
        setSelectedPitcher(null);
        setShowPitcherOverlay(false);
        return;
      }
      
      setIsLoadingPitcher(true);
      try {
        console.log(`[HitterRow] Fetching primary pitcher data for: ${player.pitcherId}`);
        const pitcher = await fetchPitcherById(player.pitcherId);
        console.log(`[HitterRow] Received primary pitcher data:`, pitcher);
        setSelectedPitcher(pitcher);
      } catch (error) {
        console.error(`[HitterRow] Error loading pitcher data:`, error);
        setSelectedPitcher(null);
      } finally {
        setIsLoadingPitcher(false);
      }
    };
    
    loadPitcherData();
  }, [player.pitcherId, fetchPitcherById, refreshKey]);

  // Effect to fetch second pitcher data
  useEffect(() => {
    const loadSecondPitcherData = async () => {
      if (!secondPitcherId) {
        setSelectedSecondPitcher(null);
        setShowSecondPitcherOverlay(false);
        return;
      }
      
      setIsLoadingSecondPitcher(true);
      try {
        console.log(`[HitterRow] Fetching second pitcher data for: ${secondPitcherId}`);
        const pitcher = await fetchPitcherById(secondPitcherId);
        console.log(`[HitterRow] Received second pitcher data:`, pitcher);
        setSelectedSecondPitcher(pitcher);
      } catch (error) {
        console.error(`[HitterRow] Error loading second pitcher data:`, error);
        setSelectedSecondPitcher(null);
      } finally {
        setIsLoadingSecondPitcher(false);
      }
    };
    
    loadSecondPitcherData();
  }, [secondPitcherId, fetchPitcherById, refreshKey]);
  
  // Handle second pitcher selection
  const handleSecondPitcherSelect = (option) => {
    setSecondPitcherId(option ? option.value : null);
    setSecondPitcher(option ? option.label : '');
    if (!option) {
      setShowSecondPitcherOverlay(false);
    }
    // Update parent state with second pitcher info
    onFieldChange(player.id, 'secondPitcherId', option ? option.value : null);
    onFieldChange(player.id, 'secondPitcher', option ? option.label : '');
  };
  
  // Extract pitcher stats safely
  const getPitcherStats = (pitcher) => {
    if (!pitcher) return { IP: 'N/A', PC_ST: 'N/A', K: 'N/A', HR: 'N/A' };
    
    const lastIP = pitcher.game1IP || pitcher.prevGameIP || pitcher.IP || '0';
    const pcSt = pitcher.game1PC_ST || pitcher.PC_ST || 'N/A';
    const k = pitcher.game1K || pitcher.K || '0';
    const hr = pitcher.game1HR || pitcher.HR || '0';
    
    return {
      IP: lastIP,
      PC_ST: pcSt,
      K: k,
      HR: hr,
      throwingArm: pitcher.throwingArm || ''
    };
  };

  const primaryPitcherStats = getPitcherStats(selectedPitcher);
  const secondPitcherStats = getPitcherStats(selectedSecondPitcher);
  
  const hasSecondPitcher = selectedSecondPitcher !== null;

  // Debugging helper - render a small indicator to show full re-renders
  const renderCount = React.useRef(0);
  React.useEffect(() => {
    renderCount.current += 1;
  });

  // Custom styles for select dropdown to fix cutoff issue
  const customSelectStyles = {
    // Control is the main input element
    control: (base) => ({
      ...base,
      minHeight: '30px',
      height: '30px',
      fontSize: '0.9em'
    }),
    // Make sure the menu appears in front of other elements
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      width: 'auto', // Allow menu to expand beyond control width
      minWidth: '100%' // But start at control width
    }),
    // Make sure the menu portal is positioned correctly
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999
    })
  };

  return (
    <tr 
      style={teamColors} 
      data-hitter-id={player.id} 
      data-render-count={renderCount.current} 
      data-games-history={gamesHistory}
      className={isRefreshingHitters || isLoadingHitter ? "loading-row" : ""}
    >
      <td className="player-name">
        {selectedHitter.name}
        {(isRefreshingHitters || isLoadingHitter) && <span className="loading-indicator">⟳</span>}
      </td>
      <td>{selectedHitter.team}</td>
      <td>{selectedHitter.prevGameHR}</td>
      <td>{selectedHitter.prevGameAB}</td>
      <td>{selectedHitter.prevGameH}</td>
      
      {/* Performance Chart */}
      <td className="performance-chart-cell">
        <OverlayPerformanceChart 
          key={`chart-${player.id}-${refreshKey}-${gamesHistory}`}
          hitter={selectedHitter} // Use locally fetched hitter data
          pitcher={selectedPitcher}
          secondPitcher={selectedSecondPitcher}
          showPitcherOverlay={showPitcherOverlay && selectedPitcher !== null}
          showSecondPitcherOverlay={showSecondPitcherOverlay && selectedSecondPitcher !== null}
          isLoadingPitcher={isLoadingPitcher}
          isLoadingSecondPitcher={isLoadingSecondPitcher}
          isLoadingHitter={isLoadingHitter || isRefreshingHitters}
        />
      </td>
      
      {/* Primary Pitcher */}
      <td>
        {pitcherOptions.length > 0 ? (
          <div className="pitcher-selection-container">
            <Select
              className="editable-cell"
              classNamePrefix="select"
              options={pitcherOptions}
              value={player.pitcherId ? { value: player.pitcherId, label: player.pitcher } : null}
              onChange={(option) => {
                onPitcherSelect(player.id, option ? option.value : null);
                if (!option) {
                  setShowPitcherOverlay(false);
                }
              }}
              isClearable
              placeholder="Select pitcher..."
              styles={customSelectStyles}
              // Render dropdown in portal to avoid container clipping
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
            {player.pitcherId && (
              <button 
                className={`overlay-toggle-btn ${showPitcherOverlay ? 'active' : ''}`}
                onClick={() => setShowPitcherOverlay(!showPitcherOverlay)}
                title={showPitcherOverlay ? "Hide pitcher overlay" : "Show pitcher overlay"}
              >
                <span className="overlay-icon">📊</span>
              </button>
            )}
          </div>
        ) : (
          <input 
            type="text" 
            className="editable-cell" 
            value={player.pitcher || ''} 
            onChange={(e) => onFieldChange(player.id, 'pitcher', e.target.value)} 
            placeholder={player.opponentTeam ? "No pitchers found" : "Enter name"} 
            readOnly={!player.opponentTeam}
          />
        )}
      </td>
      
      {/* Primary Pitcher Stats */}
      <td className="pitcher-stat">{primaryPitcherStats.IP}</td>
      <td className="pitcher-stat">{primaryPitcherStats.PC_ST}</td>
      <td className="pitcher-stat">{primaryPitcherStats.K}</td>
      <td className="pitcher-stat">{primaryPitcherStats.HR}</td>
      
      {/* Primary Pitcher Throws */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={player.pitcherHand || primaryPitcherStats.throwingArm} 
          onChange={(e) => onFieldChange(player.id, 'pitcherHand', e.target.value)} 
          placeholder="R/L" 
          maxLength="1"
        />
      </td>
      
      {/* Second Pitcher - Add/Select Section */}
      <td className="second-pitcher-container">
        {player.pitcherId && !showSecondPitcher ? (
          <button 
            className="action-btn add-pitcher-btn"
            onClick={() => setShowSecondPitcher(true)}
            title="Add a second pitcher"
          >
            + Add Pitcher
          </button>
        ) : showSecondPitcher ? (
          <div className="pitcher-selection-container">
            <Select
              className="editable-cell"
              classNamePrefix="select"
              options={pitcherOptions}
              value={secondPitcherId ? { value: secondPitcherId, label: secondPitcher } : null}
              onChange={(option) => handleSecondPitcherSelect(option)}
              isClearable
              placeholder="Select 2nd pitcher..."
              styles={customSelectStyles}
              // Render dropdown in portal to avoid container clipping
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
            {secondPitcherId && (
              <button 
                className={`overlay-toggle-btn ${showSecondPitcherOverlay ? 'active green-active' : ''}`}
                onClick={() => setShowSecondPitcherOverlay(!showSecondPitcherOverlay)}
                title={showSecondPitcherOverlay ? "Hide second pitcher overlay" : "Show second pitcher overlay"}
              >
                <span className="overlay-icon">📊</span>
              </button>
            )}
          </div>
        ) : (
          '-'
        )}
      </td>
      
      {/* Second Pitcher Stats - Always render cells if any row has second pitcher */}
      {hasAnySecondPitcher && (
        <>
          <td className="pitcher-stat">{hasSecondPitcher ? secondPitcherStats.IP : ''}</td>
          <td className="pitcher-stat">{hasSecondPitcher ? secondPitcherStats.PC_ST : ''}</td>
          <td className="pitcher-stat">{hasSecondPitcher ? secondPitcherStats.K : ''}</td>
          <td className="pitcher-stat">{hasSecondPitcher ? secondPitcherStats.HR : ''}</td>
          <td>
            {hasSecondPitcher ? (
              <input 
                type="text" 
                className="editable-cell" 
                value={player.secondPitcherHand || secondPitcherStats.throwingArm} 
                onChange={(e) => onFieldChange(player.id, 'secondPitcherHand', e.target.value)} 
                placeholder="R/L" 
                maxLength="1"
              />
            ) : null}
          </td>
        </>
      )}
      
      {/* Expected SO */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={selectedHitter.expectedSO || ''} 
          onChange={(e) => onFieldChange(player.id, 'expectedSO', e.target.value)} 
          placeholder="0.0" 
        />
      </td>
      
      {/* Stadium */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={selectedHitter.stadium || ''} 
          onChange={(e) => onFieldChange(player.id, 'stadium', e.target.value)} 
          placeholder="Stadium" 
        />
      </td>
      
      {/* Game O/U */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={selectedHitter.gameOU || ''} 
          onChange={(e) => onFieldChange(player.id, 'gameOU', e.target.value)} 
          placeholder="0.0" 
        />
      </td>
      
      {/* Bet Types */}
      <td>
        <input 
          type="checkbox" 
          className="custom-checkbox" 
          checked={selectedHitter.betTypes?.H || false} 
          onChange={(e) => onBetTypeChange(player.id, 'H', e.target.checked)} 
        />
      </td>
      <td>
        <input 
          type="checkbox" 
          className="custom-checkbox" 
          checked={selectedHitter.betTypes?.HR || false} 
          onChange={(e) => onBetTypeChange(player.id, 'HR', e.target.checked)} 
        />
      </td>
      <td>
        <input 
          type="checkbox" 
          className="custom-checkbox" 
          checked={selectedHitter.betTypes?.B || false} 
          onChange={(e) => onBetTypeChange(player.id, 'B', e.target.checked)} 
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
                checked={selectedHitter.handicapperPicks[handicapper.id]?.public || false} 
                onChange={(e) => onPickChange(player.id, handicapper.id, 'public', e.target.checked)} 
              />
              <span className="eye-icon">👁️</span>
            </label>
            <label className="checkbox-label" title="Private">
              <input 
                type="checkbox" 
                className="custom-checkbox" 
                checked={selectedHitter.handicapperPicks[handicapper.id]?.private || false} 
                onChange={(e) => onPickChange(player.id, handicapper.id, 'private', e.target.checked)} 
              /> $
            </label>
            <label className="checkbox-label" title="Straight">
              <input 
                type="checkbox" 
                className="custom-checkbox" 
                checked={selectedHitter.handicapperPicks[handicapper.id]?.straight || false} 
                onChange={(e) => onPickChange(player.id, handicapper.id, 'straight', e.target.checked)} 
              /> S
            </label>
            <div className="bet-type-checkboxes">
              <label className="mini-checkbox-label" title="Hits">
                <input 
                  type="checkbox" 
                  className="mini-checkbox" 
                  checked={selectedHitter.handicapperPicks[handicapper.id]?.H || false} 
                  onChange={(e) => onPickChange(player.id, handicapper.id, 'H', e.target.checked)} 
                /> H
              </label>
              <label className="mini-checkbox-label" title="Home Runs">
                <input 
                  type="checkbox" 
                  className="mini-checkbox" 
                  checked={selectedHitter.handicapperPicks[handicapper.id]?.HR || false} 
                  onChange={(e) => onPickChange(player.id, handicapper.id, 'HR', e.target.checked)} 
                /> HR
              </label>
              <label className="mini-checkbox-label" title="Bases">
                <input 
                  type="checkbox" 
                  className="mini-checkbox" 
                  checked={selectedHitter.handicapperPicks[handicapper.id]?.B || false} 
                  onChange={(e) => onPickChange(player.id, handicapper.id, 'B', e.target.checked)} 
                /> B
              </label>
            </div>
          </div>
        </td>
      ))}
      
      {/* Actions */}
      <td>
        <button 
          className="action-btn remove-btn" 
          onClick={() => onRemove(player.id, 'hitter')} 
          title="Remove player"
        >
          Remove
        </button>
      </td>
    </tr>
  );
};

export default HitterRow;