import React from 'react';
import Select from 'react-select';
import { formatGameDate, getTeamColors } from '../../utils/formatters';

/**
 * Component for a hitter row in the table
 * 
 * @param {Object} player - Hitter player object
 * @param {Object} teams - Teams data for styling
 * @param {Array} handicappers - Array of handicapper objects
 * @param {Array} pitcherOptions - Options for pitcher selection
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
  onFieldChange,
  onPitcherSelect,
  onBetTypeChange,
  onPickChange,
  onRemove
}) => {
  const teamColors = getTeamColors(player.team, teams);
  
  // Format dates for display (MM/DD)
  const game1Date = formatGameDate(player.game1Date);
  const game2Date = formatGameDate(player.game2Date);
  const game3Date = formatGameDate(player.game3Date);

  return (
    <tr style={teamColors}>
      <td className="player-name">{player.name}</td>
      <td>{player.team}</td>
      <td>{player.prevGameHR}</td>
      <td>{player.prevGameAB}</td>
      <td>{player.prevGameH}</td>
      
      {/* Game 1 Stats */}
      <td className="avg-cell">{game1Date}</td>
      <td className="avg-cell">{player.game1HR}</td>
      <td className="avg-cell">{player.game1AB}</td>
      <td className="avg-cell">{player.game1H}</td>
      
      {/* Game 2 Stats */}
      <td className="avg-cell">{game2Date}</td>
      <td className="avg-cell">{player.game2HR}</td>
      <td className="avg-cell">{player.game2AB}</td>
      <td className="avg-cell">{player.game2H}</td>
      
      {/* Game 3 Stats */}
      <td className="avg-cell">{game3Date}</td>
      <td className="avg-cell">{player.game3HR}</td>
      <td className="avg-cell">{player.game3AB}</td>
      <td className="avg-cell">{player.game3H}</td>
      
      {/* Pitcher selection */}
      <td>
        {pitcherOptions.length > 0 ? (
          <Select
            className="editable-cell"
            classNamePrefix="select"
            options={pitcherOptions}
            value={player.pitcherId ? { value: player.pitcherId, label: player.pitcher } : null}
            onChange={(option) => onPitcherSelect(player.id, option ? option.value : null)}
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
      
      {/* Pitcher hand */}
      <td>
        <input 
          type="text" 
          className="editable-cell" 
          value={player.pitcherHand || ''} 
          onChange={(e) => onFieldChange(player.id, 'pitcherHand', e.target.value)} 
          placeholder="R/L" 
          readOnly={player.pitcherId !== ''}  // Make read-only if pitcher is selected
        />
      </td>
      
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
      
      {/* Bet types */}
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