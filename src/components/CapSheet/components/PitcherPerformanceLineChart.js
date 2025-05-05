import React from 'react';
import PropTypes from 'prop-types';
import { formatGameDate } from '../utils/formatters';
import './PitcherPerformanceLineChart.css';

/**
 * A line graph visualization of a pitcher's performance over their recent games
 * Shows strikeout trend and earned runs with color-coded markers
 * Enhanced with more robust data validation and fallbacks
 * 
 * @param {Object} player - The pitcher player object with game data
 * @param {number} width - Width of the chart (default: full width)
 * @param {number} height - Height of the chart (default: 90px)
 */
const PitcherPerformanceLineChart = ({ player, width = 260, height = 90 }) => {
  // Determine how many games are available in the player object
  const getAvailableGames = () => {
    const games = [];
    let gameIndex = 1;
    
    // Keep adding games as long as we find date properties in the player object
    while (player[`game${gameIndex}Date`] !== undefined) {
      // Only add the game if it has a valid date
      if (player[`game${gameIndex}Date`]) {
        games.push({
          date: player[`game${gameIndex}Date`],
          ip: parseFloat(player[`game${gameIndex}IP`] || '0') || 0,
          k: parseInt(player[`game${gameIndex}K`] || '0') || 0,
          er: parseInt(player[`game${gameIndex}ER`] || '0') || 0,
          kPerIP: parseFloat(player[`game${gameIndex}IP`] || '0') > 0 
            ? parseInt(player[`game${gameIndex}K`] || '0') / parseFloat(player[`game${gameIndex}IP`] || '0') 
            : 0
        });
      }
      gameIndex++;
    }
    
    // Add game 0 data (most recent game) if we have it but no game1 data
    if (games.length === 0 && player.prevGameIP && parseFloat(player.prevGameIP) > 0) {
      games.push({
        date: 'Last Game',
        ip: parseFloat(player.prevGameIP || '0') || 0,
        k: parseInt(player.prevGameK || '0') || 0,
        er: parseInt(player.prevGameER || '0') || 0,
        kPerIP: parseFloat(player.prevGameIP || '0') > 0 
          ? parseInt(player.prevGameK || '0') / parseFloat(player.prevGameIP || '0') 
          : 0
      });
    }
    
    return games.reverse(); // Display oldest to newest (left to right)
  };
  
  // Get all available games with better validation
  const games = getAvailableGames();
  
  // Filter out games with minimal innings pitched (might be relief appearances too short to be relevant)
  // You could adjust this threshold based on your preference
  const validGames = games.filter(game => game.ip >= 0.1);
  
  // Enhanced data availability check - if we have at least 2 valid games, or at least 1 with good stats
  const hasEnoughDataForTrend = validGames.length >= 2 || 
                               (validGames.length === 1 && 
                                validGames[0].ip >= 1.0 && 
                                validGames[0].k >= 1);
  
  // Visual constants
  const padding = { top: 15, right: 20, bottom: 25, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // No data to display with better message
  if (!hasEnoughDataForTrend) {
    return (
      <div className="no-game-data">
        {validGames.length === 0 
          ? "No game data available for performance trend" 
          : "Not enough game data for complete trend display"}
      </div>
    );
  }
  
  // Calculate trend direction (green for upward K/IP, red for downward)
  const firstGameKRate = validGames[0].kPerIP;
  const lastGameKRate = validGames[validGames.length - 1].kPerIP;
  
  // Determine trend direction and set color accordingly
  const trendDirection = lastGameKRate > firstGameKRate ? 'up' : 
                        lastGameKRate < firstGameKRate ? 'down' : 
                        'neutral';
  
  const lineColor = trendDirection === 'up' ? '#22c55e' : // green
                    trendDirection === 'down' ? '#ef4444' : // red
                    '#3b82f6'; // blue for neutral
  
  // Maximum K/IP in the dataset for scaling (at least 3 to ensure proper scaling)
  const maxKPerIP = Math.max(3, ...validGames.map(g => g.kPerIP));
  
  // Calculate positions for the chart
  const getX = (index, total) => {
    // If only 1 or 2 games, space them more reasonably
    if (total <= 2) {
      return padding.left + (index * (chartWidth / 2));
    }
    // Otherwise use regular spacing
    const divisor = Math.max(1, total - 1);
    return padding.left + (index * (chartWidth / divisor));
  };
  
  // Scale K/IP to chart height
  const getY = (kPerIP) => padding.top + chartHeight - ((kPerIP / maxKPerIP) * chartHeight);
  
  // Create points for the line
  const points = validGames.map((game, i) => ({
    x: getX(i, validGames.length),
    y: getY(game.kPerIP),
    ...game
  }));
  
  // Create the path for the line if we have multiple points
  const linePath = points.length > 1 
    ? points.map((point, i) => (i === 0 ? "M" : "L") + point.x + "," + point.y).join(" ")
    : "";
  
  return (
    <div className="performance-chart-container">
      <svg width={width} height={height} className="performance-line-chart">
        {/* Y-axis (K/IP) */}
        <line 
          x1={padding.left} 
          y1={padding.top} 
          x2={padding.left} 
          y2={height - padding.bottom} 
          stroke="#ddd" 
          strokeWidth="1" 
        />
        
        {/* X-axis (games) */}
        <line 
          x1={padding.left} 
          y1={height - padding.bottom} 
          x2={width - padding.right} 
          y2={height - padding.bottom} 
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
          K/IP
        </text>
        
        {/* Line chart representing K/IP (only if multiple points) */}
        {points.length > 1 && (
          <path 
            d={linePath} 
            fill="none" 
            stroke={lineColor} 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        )}
        
        {/* Data points */}
        {points.map((point, i) => {
          // Format date for display (MM/DD)
          const formattedDate = typeof point.date === 'string' && point.date === 'Last Game'
            ? 'Last' 
            : formatGameDate(point.date);
          
          // Determine circle color based on earned runs (darker red for more ER)
          const erColor = point.er === 0 ? '#22c55e' : // green for 0 ER
                        point.er === 1 ? '#fbbf24' : // yellow for 1 ER
                        point.er <= 3 ? '#f97316' : // orange for 2-3 ER
                        '#ef4444'; // red for 4+ ER
          
          return (
            <g key={i}>
              {/* Date labels on x-axis */}
              <text 
                x={point.x} 
                y={height - 10} 
                fontSize="10" 
                textAnchor="middle" 
                fill="#555"
              >
                {formattedDate}
              </text>
              
              {/* IP/K labels */}
              <text 
                x={point.x} 
                y={point.y - 12} 
                fontSize="9" 
                textAnchor="middle" 
                fill="#555"
              >
                {point.k}/{point.ip.toFixed(1)}
              </text>
              
              {/* Data point circles - color coded by ER */}
              <circle 
                cx={point.x} 
                cy={point.y} 
                r={8} 
                fill={erColor}
                stroke="white" 
                strokeWidth="1"
              />
              
              {/* ER text inside circles */}
              <text 
                x={point.x} 
                y={point.y + 3} 
                fontSize="9" 
                textAnchor="middle" 
                fill="white" 
                fontWeight="bold"
              >
                {point.er}
              </text>
              
              {/* K/IP rate below */}
              <text 
                x={point.x} 
                y={point.y + 20} 
                fontSize="9" 
                textAnchor="middle" 
                fill="#666"
                fontWeight="bold"
              >
                {point.kPerIP.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

PitcherPerformanceLineChart.propTypes = {
  player: PropTypes.shape({
    // Dynamic PropTypes validation for variable game history
    // We only require the player object itself
    name: PropTypes.string.isRequired,
    team: PropTypes.string.isRequired,
  }).isRequired,
  width: PropTypes.number,
  height: PropTypes.number
};

export default PitcherPerformanceLineChart;