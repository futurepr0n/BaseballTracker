import React from 'react';
import PropTypes from 'prop-types';
import { formatGameDate } from '../utils/formatters';

/**
 * A line graph visualization of a hitter's performance over their recent games
 * Shows batting average trend with hit/at-bat ratios and home run indicators
 * Supports dynamic number of game history entries
 * 
 * @param {Object} player - The hitter player object with game data
 */
const HitterPerformanceLineChart = ({ player }) => {
  // Determine how many games are available in the player object
  const getAvailableGames = () => {
    const games = [];
    let gameIndex = 1;
    
    // Keep adding games as long as we find date properties in the player object
    while (player[`game${gameIndex}Date`] !== undefined) {
      games.push({
        date: player[`game${gameIndex}Date`],
        ab: parseInt(player[`game${gameIndex}AB`]) || 0,
        h: parseInt(player[`game${gameIndex}H`]) || 0,
        hr: parseInt(player[`game${gameIndex}HR`]) || 0,
        avg: parseInt(player[`game${gameIndex}AB`]) > 0 
          ? parseInt(player[`game${gameIndex}H`]) / parseInt(player[`game${gameIndex}AB`]) 
          : 0
      });
      gameIndex++;
    }
    
    return games.reverse(); // Display oldest to newest (left to right)
  };
  
  // Get all available games
  const games = getAvailableGames();
  
  // Filter out games with no at-bats
  const validGames = games.filter(game => game.ab > 0);
  
  // Check if we have enough data to show a trend
  const hasEnoughData = validGames.length > 1;
  
  // Visual constants
  const svgWidth = 260;
  const svgHeight = 90;
  const padding = { top: 15, right: 20, bottom: 25, left: 40 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;
  
  // No data to display
  if (!hasEnoughData) {
    return (
      <div className="no-game-data">
        Not enough game data for trend display
      </div>
    );
  }
  
  // Calculate positions for the chart
  const getX = (index, total) => {
    // If only 2 games, space them out more
    const divisor = Math.max(1, total - 1);
    return padding.left + (index * (chartWidth / divisor));
  };
  
  const getY = (avg) => padding.top + chartHeight - (avg * chartHeight); // Scale 0-1 to chart height
  
  // Create points for the line
  const points = validGames.map((game, i) => ({
    x: getX(i, validGames.length),
    y: getY(game.avg),
    ...game
  }));
  
  // Create the path for the line if we have multiple points
  const linePath = points.length > 1 
    ? points.map((point, i) => (i === 0 ? "M" : "L") + point.x + "," + point.y).join(" ")
    : "";
  
  return (
    <div className="performance-chart-container">
      <svg width={svgWidth} height={svgHeight} className="performance-line-chart">
        {/* Y-axis (batting average) */}
        <line 
          x1={padding.left} 
          y1={padding.top} 
          x2={padding.left} 
          y2={svgHeight - padding.bottom} 
          stroke="#ddd" 
          strokeWidth="1" 
        />
        
        {/* X-axis (games) */}
        <line 
          x1={padding.left} 
          y1={svgHeight - padding.bottom} 
          x2={svgWidth - padding.right} 
          y2={svgHeight - padding.bottom} 
          stroke="#ddd" 
          strokeWidth="1" 
        />
        
        {/* Y-axis label */}
        <text 
          x={10} 
          y={padding.top + chartHeight/2} 
          fontSize="10" 
          textAnchor="middle" 
          transform={`rotate(-90, 10, ${padding.top + chartHeight/2})`}
          fill="#666"
        >
          AVG
        </text>
        
        {/* Line chart representing batting average (only if multiple points) */}
        {points.length > 1 && (
          <path 
            d={linePath} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        )}
        
        {/* Data points */}
        {points.map((point, i) => {
          // Format date for display (MM/DD)
          const formattedDate = formatGameDate(point.date);
          
          return (
            <g key={i}>
              {/* Date labels on x-axis */}
              <text 
                x={point.x} 
                y={svgHeight - 10} 
                fontSize="10" 
                textAnchor="middle" 
                fill="#555"
              >
                {formattedDate}
              </text>
              
              {/* At-bats/hits labels */}
              <text 
                x={point.x} 
                y={point.y - 12} 
                fontSize="9" 
                textAnchor="middle" 
                fill="#555"
              >
                {point.h}/{point.ab}
              </text>
              
              {/* Data point circles */}
              <circle 
                cx={point.x} 
                cy={point.y} 
                r={5} 
                fill="#3b82f6" 
                stroke="white" 
                strokeWidth="1"
              />
              
              {/* Home run indicators */}
              {point.hr > 0 && (
                <>
                  <circle 
                    cx={point.x} 
                    cy={point.y} 
                    r={9} 
                    fill="#ef4444" 
                    stroke="white" 
                    strokeWidth="1"
                  />
                  <text 
                    x={point.x} 
                    y={point.y + 3} 
                    fontSize="9" 
                    textAnchor="middle" 
                    fill="white" 
                    fontWeight="bold"
                  >
                    {point.hr}
                  </text>
                </>
              )}
              
              {/* Display batting averages */}
              <text 
                x={point.x} 
                y={point.y + 20} 
                fontSize="9" 
                textAnchor="middle" 
                fill="#666"
                fontWeight="bold"
              >
                {point.avg.toFixed(3).replace(/^0+/, '')}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

HitterPerformanceLineChart.propTypes = {
  player: PropTypes.shape({
    // Dynamic PropTypes validation for variable game history
    // We only require the player object itself
    name: PropTypes.string.isRequired,
    team: PropTypes.string.isRequired,
  }).isRequired
};

export default HitterPerformanceLineChart;