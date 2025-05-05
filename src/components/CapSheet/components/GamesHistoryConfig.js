import React from 'react';

/**
 * Component for configuring the number of games to display in player history
 * 
 * @param {number} gamesHistory - Current number of games to display
 * @param {function} setGamesHistory - Function to update the games history setting
 * @param {number} minGames - Minimum number of games allowed (default: 1)
 * @param {number} maxGames - Maximum number of games allowed (default: 7)
 * @param {string} label - Custom label for the selector (default: "Games History:")
 * @param {string} id - Unique ID for the select element (required to avoid duplicate IDs)
 */
const GamesHistoryConfig = ({ 
  gamesHistory, 
  setGamesHistory, 
  minGames = 1, 
  maxGames = 7,
  label = "Games History:",
  id = "games-history-select" // Default ID, but can be overridden
}) => {
  // Generate options for select
  const options = [];
  for (let i = minGames; i <= maxGames; i++) {
    options.push(i);
  }

  return (
    <div className="games-history-config">
      <label htmlFor={id}>
        {label}
        <select
          id={id}
          value={gamesHistory}
          onChange={(e) => setGamesHistory(Number(e.target.value))}
          className="games-history-select"
        >
          {options.map(num => (
            <option key={num} value={num}>
              {num} {num === 1 ? 'Game' : 'Games'}
            </option>
          ))}
        </select>
      </label>
      <span className="games-history-info">
        Shows performance trends for the selected number of previous games
      </span>
    </div>
  );
};

export default GamesHistoryConfig;