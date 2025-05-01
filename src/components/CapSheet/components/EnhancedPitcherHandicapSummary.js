import React, { useMemo } from 'react';
import { getTeamColors } from '../utils/formatters';
import PitcherPerformanceLineChart from './PitcherPerformanceLineChart';
import './EnhancedPitcherHandicapSummary.css';

/**
 * Helper function to get a message about the games history setting
 * @param {number} gamesHistory - Number of games in history setting
 * @returns {string} Formatted message about games history
 */
const getGameHistoryMessage = (gamesHistory) => {
  return `Performance trends showing ${gamesHistory} ${gamesHistory === 1 ? 'game' : 'games'} of history`;
};

/**
 * Enhanced component for summarizing handicapper activity on pitchers
 * Uses a consolidated layout to group the same player data and reduce repetition
 * 
 * @param {Array} pitchers - Array of pitcher objects with handicapper picks
 * @param {Array} handicappers - Array of handicapper objects
 * @param {Object} teams - Teams data for styling
 * @param {number} gamesHistory - Number of games to display in history (default: 3)
 */
const EnhancedPitcherHandicapSummary = ({ pitchers, handicappers, teams, gamesHistory = 3 }) => {
  // Process the data to calculate handicapper activity and group by player
  const summaryData = useMemo(() => {
    if (!pitchers || pitchers.length === 0 || !handicappers || handicappers.length === 0) {
      return { players: [], totalPositions: 0 };
    }

    // Create a dataset with all relevant combinations of pitchers and bet types
    const betTypes = ['K', 'OU'];
    const allCombinations = [];

    pitchers.forEach(pitcher => {
      betTypes.forEach(betType => {
        // Count handicappers on this position
        const handicappersOnPosition = handicappers.filter(
          handicapper => pitcher.handicapperPicks[handicapper.id]?.[betType]
        );

        if (handicappersOnPosition.length > 0) {
          allCombinations.push({
            pitcher: pitcher, // Store the entire pitcher object for performance chart
            pitcherId: pitcher.id,
            pitcherName: pitcher.name,
            team: pitcher.team,
            betType,
            handicapperCount: handicappersOnPosition.length,
            handicappers: handicappersOnPosition.map(h => h.name.replace('@', '')).join(', '),
            // For sorting by total activity - public, private, and straight all count
            totalActivity: handicappersOnPosition.reduce((sum, h) => {
              const picks = pitcher.handicapperPicks[h.id];
              return sum + (picks.public ? 1 : 0) + (picks.private ? 1 : 0) + (picks.straight ? 1 : 0);
            }, 0)
          });
        }
      });
    });

    // Sort by handicapper count (descending)
    const sortedCombinations = allCombinations.sort((a, b) => {
      // Primary sort: handicapper count (descending)
      if (b.handicapperCount !== a.handicapperCount) {
        return b.handicapperCount - a.handicapperCount;
      }
      // Secondary sort: total activity (descending)
      if (b.totalActivity !== a.totalActivity) {
        return b.totalActivity - a.totalActivity;
      }
      // Tertiary sort: pitcher name (alphabetically)
      return a.pitcherName.localeCompare(b.pitcherName);
    });

    // Group by player
    const groupedData = {};
    sortedCombinations.forEach(item => {
      if (!groupedData[item.pitcherId]) {
        groupedData[item.pitcherId] = {
          pitcher: item.pitcher,
          name: item.pitcherName,
          team: item.team,
          positions: []
        };
      }
      
      groupedData[item.pitcherId].positions.push({
        betType: item.betType,
        handicappers: item.handicappers,
        handicapperCount: item.handicapperCount
      });
    });

    return { 
      players: Object.values(groupedData),
      totalPositions: sortedCombinations.length
    };
  }, [pitchers, handicappers]);

  // No data to display
  if (summaryData.players.length === 0) {
    return null;
  }

  // Helper function to render heat indicator
  const renderHeatIndicator = (count) => {
    // Scale: 1-2 handicappers (🔥), 3-4 (🔥🔥), 5+ (🔥🔥🔥)
    const fireEmojis = count >= 5 ? '🔥🔥🔥' : count >= 3 ? '🔥🔥' : '🔥';
    return <span className="heat-indicator" title={`${count} handicappers on this position`}>{fireEmojis}</span>;
  };

  return (
    <div className="enhanced-pitcher-summary">
      <h3 className="summary-header">
        Popular Pitcher Positions
        <span className="count-badge">{summaryData.totalPositions} positions tracked</span>
        <span className="games-history-badge">{getGameHistoryMessage(gamesHistory)}</span>
      </h3>
      <div className="table-container">
        <table className="summary-table">
          <thead>
            <tr>
              <th className="player-col">Pitcher</th>
              <th className="team-col">Team</th>
              <th className="trend-col">Performance Trend</th>
              <th className="position-col">Position</th>
              <th className="handicappers-col">Handicappers</th>
              <th className="heat-col">Heat</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.players.map((player) => {
              const teamColors = getTeamColors(player.team, teams);
              const rowCount = player.positions.length;
              
              return (
                <React.Fragment key={player.pitcher.id}>
                  {player.positions.map((position, posIndex) => (
                    <tr 
                      key={`${player.pitcher.id}-${position.betType}`} 
                      style={teamColors}
                      className={posIndex === 0 ? 'first-player-row' : 'subsequent-player-row'}
                    >
                      {posIndex === 0 && (
                        <>
                          <td className="player-name" rowSpan={rowCount}>
                            {player.name}
                            {player.pitcher.throwingArm && <span className="throwing-arm"> ({player.pitcher.throwingArm})</span>}
                          </td>
                          <td rowSpan={rowCount}>{player.team}</td>
                          <td className="trend-cell" rowSpan={rowCount}>
                            <PitcherPerformanceLineChart player={player.pitcher} width={220} height={80} />
                          </td>
                        </>
                      )}
                      <td className="position-value-container">
                        <span className="position-value">{position.betType}</span>
                      </td>
                      <td className="handicappers-list">{position.handicappers}</td>
                      <td className="heat-cell">{renderHeatIndicator(position.handicapperCount)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EnhancedPitcherHandicapSummary;