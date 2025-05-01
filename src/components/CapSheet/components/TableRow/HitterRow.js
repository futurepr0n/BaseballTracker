import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { getTeamColors } from '../../utils/formatters';
import OverlayPerformanceChart from '../OverlayPerformanceChart';

/**
 * Component for a hitter row in the table
 * Enhanced with visual performance line chart and pitcher overlay capability
 * 
 * @param {Object} player - Hitter player object
 * @param {Object} teams - Teams data for styling
 * @param {Array} handicappers - Array of handicapper objects
 * @param {Array} pitcherOptions - Options for pitcher selection
 * @param {Array} pitcherData - Array of available pitchers for overlay
 * @param {function} onFieldChange - Function to handle field changes
 * @param {function} onPitcherSelect - Function to handle pitcher selection
 * @param {function} onBetTypeChange - Function to handle bet type changes
 * @param {function} onPickChange - Function to handle handicapper pick changes
 * @param {function} onRemove - Function to handle player removal
 */
const HitterRow = ({
  player,
  teams,
  handicappers,
  pitcherOptions,
  fetchPitcherById,  // Added this prop
  onFieldChange,
  onPitcherSelect,
  onBetTypeChange,
  onPickChange,
  onRemove
}) => {
  // States for primary pitcher
  const [showPitcherOverlay, setShowPitcherOverlay] = useState(false);
  const [selectedPitcher, setSelectedPitcher] = useState(null);
  const [isLoadingPitcher, setIsLoadingPitcher] = useState(false);
  
  // States for second pitcher
  const [showSecondPitcher, setShowSecondPitcher] = useState(false);
  const [secondPitcherId, setSecondPitcherId] = useState(null);
  const [secondPitcher, setSecondPitcher] = useState('');
  const [selectedSecondPitcher, setSelectedSecondPitcher] = useState(null);
  const [showSecondPitcherOverlay, setShowSecondPitcherOverlay] = useState(false);
  const [isLoadingSecondPitcher, setIsLoadingSecondPitcher] = useState(false);
  
  const teamColors = getTeamColors(player.team, teams);

   // Effect to fetch pitcher data when pitcherId changes
    // Effect for primary pitcher
    useEffect(() => {
      const loadPitcherData = async () => {
        if (!player.pitcherId) {
          setSelectedPitcher(null);
          setShowPitcherOverlay(false);
          return;
        }
        
        setIsLoadingPitcher(true);
        try {
          console.log("Fetching primary pitcher data for:", player.pitcherId);
          const pitcher = await fetchPitcherById(player.pitcherId);
          console.log("Received primary pitcher data:", pitcher);
          setSelectedPitcher(pitcher);
        } catch (error) {
          console.error("Error loading pitcher data:", error);
          setSelectedPitcher(null);
        } finally {
          setIsLoadingPitcher(false);
        }
      };
      
      loadPitcherData();
    }, [player.pitcherId, fetchPitcherById]);


    // Effect to fetch second pitcher data
  // Effect for second pitcher
  useEffect(() => {
    const loadSecondPitcherData = async () => {
      if (!secondPitcherId) {
        setSelectedSecondPitcher(null);
        setShowSecondPitcherOverlay(false);
        return;
      }
      
      setIsLoadingSecondPitcher(true);
      try {
        console.log("Fetching second pitcher data for:", secondPitcherId);
        const pitcher = await fetchPitcherById(secondPitcherId);
        console.log("Received second pitcher data:", pitcher);
        setSelectedSecondPitcher(pitcher);
      } catch (error) {
        console.error("Error loading second pitcher data:", error);
        setSelectedSecondPitcher(null);
      } finally {
        setIsLoadingSecondPitcher(false);
      }
    };
    
    loadSecondPitcherData();
  }, [secondPitcherId, fetchPitcherById]);
  
  // Handle second pitcher selection
  const handleSecondPitcherSelect = (option) => {
    setSecondPitcherId(option ? option.value : null);
    setSecondPitcher(option ? option.label : '');
    if (!option) {
      setShowSecondPitcherOverlay(false);
    }
  };

  return (
    <tr style={teamColors}>
      <td className="player-name">{player.name}</td>
      <td>{player.team}</td>
      <td>{player.prevGameHR}</td>
      <td>{player.prevGameAB}</td>
      <td>{player.prevGameH}</td>
      
      {/* Performance Chart */}
      <td className="performance-chart-cell">
        <OverlayPerformanceChart 
          hitter={player} 
          pitcher={selectedPitcher}
          secondPitcher={selectedSecondPitcher}
          showPitcherOverlay={showPitcherOverlay && selectedPitcher !== null}
          showSecondPitcherOverlay={showSecondPitcherOverlay && selectedSecondPitcher !== null}
          isLoadingPitcher={isLoadingPitcher}
          isLoadingSecondPitcher={isLoadingSecondPitcher}
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
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '30px',
                  height: '30px',
                  fontSize: '0.9em'
                }),
                valueContainer: (base) => ({
                  ...base,
                  padding: '0 8px',
                  height: '30px'
                }),
                indicatorsContainer: (base) => ({
                  ...base,
                  height: '30px'
                })
              }}
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
      
      {/* Throws */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={player.pitcherHand || ''} 
          onChange={(e) => onFieldChange(player.id, 'pitcherHand', e.target.value)} 
          placeholder="R/L" 
          readOnly={player.pitcherId !== ''}
        />
      </td>
      
      {/* Primary Pitcher Stats */}
      <td className="pitcher-stat">{selectedPitcher ? selectedPitcher.PC_ST : 'N/A'}</td>
      <td className="pitcher-stat">{selectedPitcher ? selectedPitcher.K : 'N/A'}</td>
      <td className="pitcher-stat">{selectedPitcher ? selectedPitcher.HR : 'N/A'}</td>
      
      {/* Second Pitcher */}
      <td>
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
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '30px',
                  height: '30px',
                  fontSize: '0.9em'
                }),
                valueContainer: (base) => ({
                  ...base,
                  padding: '0 8px',
                  height: '30px'
                }),
                indicatorsContainer: (base) => ({
                  ...base,
                  height: '30px'
                })
              }}
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
      
      {/* Second Pitcher Stats */}
      <td className="pitcher-stat">{selectedSecondPitcher ? selectedSecondPitcher.PC_ST : 'N/A'}</td>
      <td className="pitcher-stat">{selectedSecondPitcher ? selectedSecondPitcher.K : 'N/A'}</td>
      <td className="pitcher-stat">{selectedSecondPitcher ? selectedSecondPitcher.HR : 'N/A'}</td>
      
      {/* Expected SO */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={player.expectedSO || ''} 
          onChange={(e) => onFieldChange(player.id, 'expectedSO', e.target.value)} 
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
      
      {/* Rest of the columns remain the same */}
      <td>
        <input 
          type="checkbox" 
          className="custom-checkbox" 
          checked={player.betTypes?.H || false} 
          onChange={(e) => onBetTypeChange(player.id, 'H', e.target.checked)} 
        />
      </td>
      <td>
        <input 
          type="checkbox" 
          className="custom-checkbox" 
          checked={player.betTypes?.HR || false} 
          onChange={(e) => onBetTypeChange(player.id, 'HR', e.target.checked)} 
        />
      </td>
      <td>
        <input 
          type="checkbox" 
          className="custom-checkbox" 
          checked={player.betTypes?.B || false} 
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
              <label className="mini-checkbox-label" title="Hits">
                <input 
                  type="checkbox" 
                  className="mini-checkbox" 
                  checked={player.handicapperPicks[handicapper.id]?.H || false} 
                  onChange={(e) => onPickChange(player.id, handicapper.id, 'H', e.target.checked)} 
                /> H
              </label>
              <label className="mini-checkbox-label" title="Home Runs">
                <input 
                  type="checkbox" 
                  className="mini-checkbox" 
                  checked={player.handicapperPicks[handicapper.id]?.HR || false} 
                  onChange={(e) => onPickChange(player.id, handicapper.id, 'HR', e.target.checked)} 
                /> HR
              </label>
              <label className="mini-checkbox-label" title="Bases">
                <input 
                  type="checkbox" 
                  className="mini-checkbox" 
                  checked={player.handicapperPicks[handicapper.id]?.B || false} 
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