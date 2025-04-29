import React, { useMemo } from 'react';
import { getTeamColors } from '../utils/formatters';
import ColoredPerformanceLineChart from './ColoredPerformanceLineChart';
import './EnhancedHitterHandicapSummary.css';

/**
 * Enhanced component for summarizing handicapper activity on hitters
 * Uses a consolidated layout to group the same player data and reduce repetition
 * 
 * @param {Array} hitters - Array of hitter objects with handicapper picks
 * @param {Array} handicappers - Array of handicapper objects
 * @param {Object} teams - Teams data for styling
 */
const EnhancedHitterHandicapSummary = ({ hitters, handicappers, teams }) => {
  // Process the data to calculate handicapper activity and group by player
  const summaryData = useMemo(() => {
    if (!hitters || hitters.length === 0 || !handicappers || handicappers.length === 0) {
      return { players: [], totalPositions: 0 };
    }

    // Create a dataset with all relevant combinations of hitters and bet types
    const betTypes = ['H', 'HR', 'B'];
    const allCombinations = [];

    hitters.forEach(hitter => {
      betTypes.forEach(betType => {
        // Count handicappers on this position
        const handicappersOnPosition = handicappers.filter(
          handicapper => hitter.handicapperPicks[handicapper.id]?.[betType]
        );

        if (handicappersOnPosition.length > 0) {
          allCombinations.push({
            hitter: hitter, // Store the entire hitter object for performance chart
            hitterId: hitter.id,
            hitterName: hitter.name,
            team: hitter.team,
            betType,
            handicapperCount: handicappersOnPosition.length,
            handicappers: handicappersOnPosition.map(h => h.name.replace('@', '')).join(', '),
            // For sorting by total activity - public, private, and straight all count
            totalActivity: handicappersOnPosition.reduce((sum, h) => {
              const picks = hitter.handicapperPicks[h.id];
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
      // Tertiary sort: hitter name (alphabetically)
      return a.hitterName.localeCompare(b.hitterName);
    });

    // Group by player
    const groupedData = {};
    sortedCombinations.forEach(item => {
      if (!groupedData[item.hitterId]) {
        groupedData[item.hitterId] = {
          hitter: item.hitter,
          name: item.hitterName,
          team: item.team,
          positions: []
        };
      }
      
      groupedData[item.hitterId].positions.push({
        betType: item.betType,
        handicappers: item.handicappers,
        handicapperCount: item.handicapperCount
      });
    });

    return { 
      players: Object.values(groupedData),
      totalPositions: sortedCombinations.length
    };
  }, [hitters, handicappers]);

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
    <div className="enhanced-hitter-summary">
      <h3 className="summary-header">
        Popular Hitter Positions
        <span className="count-badge">{summaryData.totalPositions} positions tracked</span>
      </h3>
      <div className="table-container">
        <table className="summary-table">
          <thead>
            <tr>
              <th className="player-col">Hitter</th>
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
                <React.Fragment key={player.hitter.id}>
                  {player.positions.map((position, posIndex) => (
                    <tr 
                      key={`${player.hitter.id}-${position.betType}`} 
                      style={teamColors}
                      className={posIndex === 0 ? 'first-player-row' : 'subsequent-player-row'}
                    >
                      {posIndex === 0 && (
                        <>
                          <td className="player-name" rowSpan={rowCount}>
                            {player.name}
                          </td>
                          <td rowSpan={rowCount}>{player.team}</td>
                          <td className="trend-cell" rowSpan={rowCount}>
                            <ColoredPerformanceLineChart player={player.hitter} width={220} height={80} />
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

export default EnhancedHitterHandicapSummary;