import React, { useMemo } from 'react';
import { getTeamColors } from '../utils/formatters';
import ColoredPerformanceLineChart from './ColoredPerformanceLineChart';
import './HitterHandicapSummary.css';

/**
 * Component for summarizing handicapper activity on hitters
 * Displays a heat map of which hitters have the most handicapper attention
 * 
 * @param {Array} hitters - Array of hitter objects with handicapper picks
 * @param {Array} handicappers - Array of handicapper objects
 * @param {Object} teams - Teams data for styling
 */
const HitterHandicapSummary = ({ hitters, handicappers, teams }) => {
  // Process the data to calculate handicapper activity
  const summaryData = useMemo(() => {
    if (!hitters || hitters.length === 0 || !handicappers || handicappers.length === 0) {
      return [];
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
    return allCombinations.sort((a, b) => {
      // Primary sort: handicapper count (descending)
      if (b.handicapperCount !== a.handicapperCount) {
        return b.handicapperCount - a.handicapperCount;
      }
      // Secondary sort: total activity (descending)
      if (b.totalActivity !== a.totalActivity) {
        return b.totalActivity - a.totalActivity;
      }
      // Tertiary sort: bet type (alphabetically)
      if (a.betType !== b.betType) {
        return a.betType.localeCompare(b.betType);
      }
      // Quaternary sort: hitter name (alphabetically)
      return a.hitterName.localeCompare(b.hitterName);
    });
  }, [hitters, handicappers]);

  // No data to display
  if (summaryData.length === 0) {
    return null;
  }

  // Helper function to render heat indicator
  const renderHeatIndicator = (count) => {
    // Scale: 1-2 handicappers (🔥), 3-4 (🔥🔥), 5+ (🔥🔥🔥)
    const fireEmojis = count >= 5 ? '🔥🔥🔥' : count >= 3 ? '🔥🔥' : '🔥';
    return <span className="heat-indicator" title={`${count} handicappers on this position`}>{fireEmojis}</span>;
  };

  return (
    <div className="hitter-handicap-summary">
      <h3 className="summary-header">Popular Hitter Positions</h3>
      <div className="table-container">
        <table className="summary-table">
          <thead>
            <tr>
              <th>Hitter</th>
              <th>Team</th>
              <th>Position</th>
              <th>Handicappers</th>
              <th>Performance Trend</th>
              <th>Heat</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((row, index) => {
              const teamColors = getTeamColors(row.team, teams);
              
              return (
                <tr key={`${row.hitterId}-${row.betType}`} style={teamColors}>
                  <td className="hitter-name">{row.hitterName}</td>
                  <td>{row.team}</td>
                  <td>
                    {/* Wrap the position value in a div for proper centering */}
                    <div className="position-value-container">
                      <span className="position-value">{row.betType}</span>
                    </div>
                  </td>
                  <td className="handicappers-list">{row.handicappers}</td>
                  <td className="trend-cell">
                    <ColoredPerformanceLineChart player={row.hitter} width={220} height={80} />
                  </td>
                  <td className="heat-cell">{renderHeatIndicator(row.handicapperCount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HitterHandicapSummary;