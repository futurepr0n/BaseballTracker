import React from 'react';

/**
 * Component to display selected player information with handedness
 * 
 * @param {Object} props - Component props
 * @param {Object} props.player - The player object with name, team, and handedness
 * @param {string} props.role - Either "batter" or "pitcher"
 * @param {Object} props.matchupResult - Optional matchup result for display
 */
const PlayerInfoDisplay = ({ player, role, matchupResult = null }) => {
  if (!player) return null;
  
  // Determine handedness label based on role
  const handednessLabel = role === 'batter' ? 'Bats' : 'Throws';
  
  // Get handedness value
  const handedness = role === 'batter' 
    ? (player.bats || 'Unknown')
    : (player.throws || 'Unknown');
  
  // Determine full handedness display text
  const handednessText = handedness === 'L' 
    ? 'Left' 
    : handedness === 'R' 
      ? 'Right' 
      : handedness === 'S' || handedness === 'B' 
        ? 'Switch' 
        : 'Unknown';
  
  return (
    <div className="bg-white p-4 rounded shadow-sm mb-2">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{player.name}</h3>
          <div className="text-sm text-gray-600">
            Team: {player.team}
          </div>
          <div className="text-sm text-gray-600">
            {handednessLabel}: <span className="font-medium">{handednessText}</span>
          </div>
        </div>
        
        {matchupResult && (
          <div className={`text-center px-3 py-1 rounded-lg ${
            matchupResult.advantage === 'Hitter' 
              ? 'bg-red-100 text-red-700' 
              : matchupResult.advantage === 'Pitcher'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
          }`}>
            <div className="text-sm font-medium">{matchupResult.advantage} Advantage</div>
            <div className="text-xs">Factor: {matchupResult.factor.toFixed(2)}×</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerInfoDisplay;