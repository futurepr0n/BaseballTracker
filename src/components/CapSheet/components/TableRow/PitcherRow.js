import React from 'react';
import { formatGameDate, getTeamColors } from '../../utils/formatters';

/**
 * Component for a pitcher row in the table
 * 
 * @param {Object} player - Pitcher player object
 * @param {Object} teams - Teams data for styling
 * @param {Array} handicappers - Array of handicapper objects
 * @param {function} onFieldChange - Function to handle field changes
 * @param {function} onBetTypeChange - Function to handle bet type changes
 * @param {function} onPickChange - Function to handle handicapper pick changes
 * @param {function} onRemove - Function to handle player removal
 */
const PitcherRow = ({
  player,
  teams,
  handicappers,
  onFieldChange,
  onBetTypeChange,
  onPickChange,
  onRemove
}) => {
  const teamColors = getTeamColors(player.team, teams);
  
  // Format dates for display (MM/DD)
  const game1Date = formatGameDate(player.game1Date);
  const game2Date = formatGameDate(player.game2Date);
  const game3Date = formatGameDate(player.game3Date);

  // Display the pitcher's throwing arm
  const throwingArm = player.throwingArm ? ` (${player.throwingArm})` : '';

  return (
    <tr style={teamColors}>
      <td className="player-name">
        {player.name}{throwingArm}
      </td>
      <td>{player.team}</td>
      <td>{player.prevGameIP}</td>
      <td>{player.prevGameK}</td>
      <td>{player.prevGameER}</td>
      
      {/* Game 1 Stats */}
      <td className="avg-cell">{game1Date}</td>
      <td className="avg-cell">{player.game1IP}</td>
      <td className="avg-cell">{player.game1K}</td>
      <td className="avg-cell">{player.game1ER}</td>
      
      {/* Game 2 Stats */}
      <td className="avg-cell">{game2Date}</td>
      <td className="avg-cell">{player.game2IP}</td>
      <td className="avg-cell">{player.game2K}</td>
      <td className="avg-cell">{player.game2ER}</td>
      
      {/* Game 3 Stats */}
      <td className="avg-cell">{game3Date}</td>
      <td className="avg-cell">{player.game3IP}</td>
      <td className="avg-cell">{player.game3K}</td>
      <td className="avg-cell">{player.game3ER}</td>
      
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