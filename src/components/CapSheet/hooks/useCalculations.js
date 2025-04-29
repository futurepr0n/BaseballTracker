import { useState, useEffect } from 'react';

/**
 * Custom hook to calculate summary statistics
 * @param {Object} selectedPlayers - The selected players object with hitters and pitchers
 * @returns {Object} Calculation statistics
 */
const useCalculations = (selectedPlayers) => {
  const [calculations, setCalculations] = useState({
    totalPicks: 0,
    publicPicks: 0,
    privatePicks: 0
  });

  // Calculate statistics based on selected players and picks
  useEffect(() => {
    let totalPicks = 0;
    let publicPicks = 0;
    let privatePicks = 0;

    const countPicks = (player) => {
      Object.values(player.handicapperPicks || {}).forEach(pick => {
        // Count each handicapper pick type
        if (pick.public) publicPicks++;
        if (pick.private) privatePicks++;
        // Count total unique picks
        if(pick.public || pick.private || pick.straight) totalPicks++;
      });
    };

    selectedPlayers.hitters.forEach(countPicks);
    selectedPlayers.pitchers.forEach(countPicks);

    setCalculations({ totalPicks, publicPicks, privatePicks });
  }, [selectedPlayers]);

  return calculations;
};

export default useCalculations;