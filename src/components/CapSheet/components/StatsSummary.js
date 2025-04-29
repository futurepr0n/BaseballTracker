import React from 'react';

/**
 * Component for displaying statistics summary
 * 
 * @param {Object} selectedPlayers - Object with hitters and pitchers arrays
 * @param {Object} calculations - Calculated statistics
 */
const StatsSummary = ({ selectedPlayers, calculations }) => {
  const { hitters, pitchers } = selectedPlayers;
  const { totalPicks, publicPicks, privatePicks } = calculations;

  return (
    <div className="stats-summary">
      <h3>Summary</h3>
      <ul>
        <li>Hitters Tracked: {hitters.length}</li>
        <li>Pitchers Tracked: {pitchers.length}</li>
        <li>Total Recommended Picks: {totalPicks}</li>
        <li>Public Picks: {publicPicks}</li>
        <li>Private Picks: {privatePicks}</li>
      </ul>
    </div>
  );
};

export default StatsSummary;