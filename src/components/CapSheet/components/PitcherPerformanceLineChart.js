import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { formatGameDate } from '../utils/formatters';
import './PitcherPerformanceLineChart.css';

/**
 * A line graph visualization of a pitcher's performance over their recent games
 * Shows strikeout trend and earned runs with color-coded markers
 * Enhanced with proper mobile display handling
 * 
 * @param {Object} player - The pitcher player object with game data
 * @param {number} gamesHistory - Number of games to display in history (default: 3)
 * @param {boolean} isLoading - Whether the pitcher data is loading
 * @param {number} width - Width of the chart (default: 100%)
 * @param {number} height - Height of the chart (default: 90px)
 */
const PitcherPerformanceLineChart = ({ 
  player, 
  gamesHistory = 3,
  isLoading = false,
  width = '100%', 
  height = 90 
}) => {
  // Logging to help debug when this component renders
  console.log(`[PitcherPerformanceLineChart] Rendering for ${player.name} with ${gamesHistory} games history`);
  
  // Must place ALL hooks at the top, before any conditional returns
  // Determine how many games are available in the player object - now with memoization
  const availableGames = useMemo(() => {
    console.log(`[PitcherPerformanceLineChart] Calculating available games for ${player.name}`);
    const games = [];
    let gameIndex = 1;
    
    // Keep adding games as long as we find date properties in the player object
    while (player[`game${gameIndex}Date`] !== undefined && gameIndex <= gamesHistory) {
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
    
    console.log(`[PitcherPerformanceLineChart] Found ${games.length} games for ${player.name}`);
    
    return games.reverse(); // Display oldest to newest (left to right)
  }, [player, gamesHistory]);
  
  // Filter out games with minimal innings pitched - also memoized
  const validGames = useMemo(() => {
    const filteredGames = availableGames.filter(game => game.ip >= 0.1);
    console.log(`[PitcherPerformanceLineChart] After filtering, ${filteredGames.length} valid games`);
    return filteredGames;
  }, [availableGames]);
  
  // Check if we have enough data to show a trend
  const hasEnoughData = useMemo(() => validGames.length > 1, [validGames]);
  
  // Visual constants - use responsive width
  const svgWidth = typeof width === 'number' ? width : 240; // Default if percentage
  const padding = { top: 15, right: 20, bottom: 25, left: 30 };
  const chartWidth = typeof width === 'number' ? width - padding.left - padding.right : '85%';
  const chartHeight = height - padding.top - padding.bottom;
  
  // Calculate trend direction and max K/IP only if we have enough data
  const { lineColor, maxKPerIP } = useMemo(() => {
    if (!hasEnoughData) {
      return {
        lineColor: '#3b82f6', // Default blue
        maxKPerIP: 3 // Default scale
      };
    }
    
    // Calculate trend direction (green for upward K/IP, red for downward)
    const firstGameKRate = validGames[0].kPerIP;
    const lastGameKRate = validGames[validGames.length - 1].kPerIP;
    
    // Determine trend direction and set color accordingly
    const trendDirection = lastGameKRate > firstGameKRate ? 'up' : 
                          lastGameKRate < firstGameKRate ? 'down' : 
                          'neutral';
    
    const color = trendDirection === 'up' ? '#22c55e' : // green
                      trendDirection === 'down' ? '#ef4444' : // red
                      '#3b82f6'; // blue for neutral
    
    // Maximum K/IP in the dataset for scaling (at least 3 to ensure proper scaling)
    const maxValue = Math.max(3, ...validGames.map(g => g.kPerIP));
    
    return {
      lineColor: color,
      maxKPerIP: maxValue
    };
  }, [hasEnoughData, validGames]);
  
  // Pre-calculate X and Y position functions for responsive display
  const getX = useMemo(() => {
    return (index, total) => {
      // Use a fallback width for percentage-based width
      const effectiveWidth = typeof chartWidth === 'number' ? chartWidth : 180; // Default if percentage
      
      // If only 1 or 2 games, space them more reasonably
      if (total <= 2) {
        return padding.left + (index * (effectiveWidth / 2));
      }
      // Otherwise use regular spacing
      const divisor = Math.max(1, total - 1);
      return padding.left + (index * (effectiveWidth / divisor));
    };
  }, [padding.left, chartWidth]);
  
  const getY = useMemo(() => {
    return (kPerIP) => padding.top + chartHeight - ((kPerIP / maxKPerIP) * chartHeight);
  }, [padding.top, chartHeight, maxKPerIP]);
  
  // Create points for the line - now memoized
  const points = useMemo(() => {
    if (!hasEnoughData) return [];
    
    return validGames.map((game, i) => ({
      x: getX(i, validGames.length),
      y: getY(game.kPerIP),
      ...game
    }));
  }, [validGames, hasEnoughData, getX, getY]);
  
  // Create the path for the line if we have multiple points - also memoized
  const linePath = useMemo(() => {
    if (!hasEnoughData || points.length < 2) return "";
    
    return points.map((point, i) => 
      (i === 0 ? "M" : "L") + point.x + "," + point.y
    ).join(" ");
  }, [points, hasEnoughData]);

  // Now we can have conditional returns
  // Display loading state
  if (isLoading) {
    return (
      <div className="loading-pitcher-data" style={{ width: '100%', height }}>
        <div className="chart-loading-spinner"></div>
        <span>Updating pitcher data...</span>
      </div>
    );
  }
  
  // No data to display with better message
  if (!hasEnoughData) {
    return (
      <div className="no-game-data">
        {validGames.length === 0 
          ? "No game data available for performance trend" 
          : "Not enough game data for complete trend display"}
      </div>
    );
  }
  
  // Render the chart if we have data - use viewBox for responsive sizing
  return (
    <div className="performance-chart-container">
      <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="xMidYMid meet" className="performance-line-chart">
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
          x2={svgWidth - padding.right} 
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
        
        {/* Line chart representing K/IP */}
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
                fontSize="9" 
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
                r={7} 
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
    name: PropTypes.string.isRequired,
    team: PropTypes.string.isRequired,
  }).isRequired,
  gamesHistory: PropTypes.number,
  isLoading: PropTypes.bool,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.number
};

export default React.memo(PitcherPerformanceLineChart);