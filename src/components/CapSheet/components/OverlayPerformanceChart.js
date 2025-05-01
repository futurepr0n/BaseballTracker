// src/components/CapSheet/components/OverlayPerformanceChart.js

import React from 'react';
import PropTypes from 'prop-types';
import { formatGameDate } from '../utils/formatters';

/**
 * Enhanced chart component that displays hitter performance with pitcher overlay
 * Handles cases with misaligned dates between hitter and pitcher games
 * 
 * @param {Object} hitter - The hitter player object with game data
 * @param {Object} pitcher - The pitcher player object (optional)
 * @param {boolean} showPitcherOverlay - Whether to show pitcher performance overlay
 * @param {boolean} isLoadingPitcher - Whether pitcher data is loading
 * @param {number} width - Width of the chart (default: full width)
 * @param {number} height - Height of the chart (default: 90px)
 */
const OverlayPerformanceChart = ({ 
  hitter, 
  pitcher = null, 
  showPitcherOverlay = false,
  isLoadingPitcher = false,
  width = 260, 
  height = 90 
}) => {
  // Get hitter games
  const getHitterGames = () => {
    const games = [];
    let gameIndex = 1;
    
    while (hitter[`game${gameIndex}Date`] !== undefined) {
      games.push({
        date: hitter[`game${gameIndex}Date`],
        ab: parseInt(hitter[`game${gameIndex}AB`]) || 0,
        h: parseInt(hitter[`game${gameIndex}H`]) || 0,
        hr: parseInt(hitter[`game${gameIndex}HR`]) || 0,
        avg: parseInt(hitter[`game${gameIndex}AB`]) > 0 
          ? parseInt(hitter[`game${gameIndex}H`]) / parseInt(hitter[`game${gameIndex}AB`]) 
          : 0
      });
      gameIndex++;
    }
    
    return games.reverse(); // Display oldest to newest (left to right)
  };
  
  // Get pitcher games if available
  const getPitcherGames = () => {
    if (!pitcher) return [];
    
    const games = [];
    let gameIndex = 1;
    
    while (pitcher[`game${gameIndex}Date`] !== undefined) {
      games.push({
        date: pitcher[`game${gameIndex}Date`],
        ip: parseFloat(pitcher[`game${gameIndex}IP`]) || 0,
        k: parseInt(pitcher[`game${gameIndex}K`]) || 0,
        er: parseInt(pitcher[`game${gameIndex}ER`]) || 0,
        kPerIP: parseFloat(pitcher[`game${gameIndex}IP`]) > 0 
          ? parseInt(pitcher[`game${gameIndex}K`]) / parseFloat(pitcher[`game${gameIndex}IP`]) 
          : 0
      });
      gameIndex++;
    }
    
    return games.reverse();
  };
  
  // Get all available games
  const hitterGames = getHitterGames();
  const pitcherGames = showPitcherOverlay ? getPitcherGames() : [];
  
  // Filter out games with no at-bats/innings pitched
  const validHitterGames = hitterGames.filter(game => game.ab > 0);
  const validPitcherGames = pitcherGames.filter(game => game.ip > 0);
  
  // Check if we have enough data to show trends
  const hasHitterData = validHitterGames.length > 1;
  const hasPitcherData = validPitcherGames.length > 1;
  
  // No data to display
  if (!hasHitterData) {
    return (
      <div className="no-game-data" style={{ width, height }}>
        Not enough game data for trend display
      </div>
    );
  }
  
  // If loading pitcher data, show a loading indicator
  if (showPitcherOverlay && isLoadingPitcher) {
    return (
      <div className="loading-pitcher-data" style={{ width, height }}>
        <div className="chart-loading-spinner"></div>
        <span>Loading pitcher data...</span>
      </div>
    );
  }
  
  // Visual constants
  const padding = { top: 15, right: 20, bottom: 35, left: 40 }; // More bottom padding for dual dates
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Calculate positions for the chart
  // For X-coordinates, we'll position based on the game index rather than trying to align dates
  const getX = (index, total) => {
    const divisor = Math.max(1, total - 1);
    return padding.left + (index * (chartWidth / divisor));
  };
  
  // Scale Y values for different metrics
  const getHitterY = (avg) => padding.top + chartHeight - (avg * chartHeight); // Scale 0-1 to chart height
  
  // Maximum K/IP in the dataset for scaling (at least 3 to ensure proper scaling)
  const maxKPerIP = hasPitcherData ? Math.max(3, ...validPitcherGames.map(g => g.kPerIP)) : 3;
  const getPitcherY = (kPerIP) => padding.top + chartHeight - ((kPerIP / maxKPerIP) * chartHeight);
  
  // Create points for the lines
  const hitterPoints = validHitterGames.map((game, i) => ({
    x: getX(i, validHitterGames.length),
    y: getHitterY(game.avg),
    ...game
  }));
  
  const pitcherPoints = hasPitcherData ? validPitcherGames.map((game, i) => ({
    x: getX(i, validPitcherGames.length),
    y: getPitcherY(game.kPerIP),
    ...game
  })) : [];
  
  // Create the paths for the lines
  const hitterPath = hitterPoints.length > 1 
    ? hitterPoints.map((point, i) => (i === 0 ? "M" : "L") + point.x + "," + point.y).join(" ")
    : "";
    
  const pitcherPath = pitcherPoints.length > 1 
    ? pitcherPoints.map((point, i) => (i === 0 ? "M" : "L") + point.x + "," + point.y).join(" ")
    : "";
  
  return (
    <div className="performance-chart-container">
      <svg width={width} height={height} className="performance-line-chart">
        {/* Y-axis (primary for hitter) */}
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
        
        {/* Y-axis label for hitter */}
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
        
        {/* Y-axis label for pitcher (right side) if overlay active */}
        {showPitcherOverlay && hasPitcherData && (
          <text 
            x={width - 10} 
            y={padding.top + chartHeight/2} 
            fontSize="10" 
            textAnchor="middle" 
            transform={`rotate(-90, ${width - 10}, ${padding.top + chartHeight/2})`}
            fill="#22c55e" // Green for pitcher
          >
            K/IP
          </text>
        )}
        
        {/* Hitter line */}
        {hitterPoints.length > 1 && (
          <path 
            d={hitterPath} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        )}
        
        {/* Pitcher line (if overlay active) */}
        {showPitcherOverlay && pitcherPoints.length > 1 && (
          <path 
            d={pitcherPath} 
            fill="none" 
            stroke="#22c55e" // Green for pitcher
            strokeWidth="2.5" 
            strokeDasharray="4,2" // Dashed line for pitcher
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        )}
        
        {/* Hitter data points */}
        {hitterPoints.map((point, i) => {
          // Format date for display (MM/DD)
          const formattedDate = formatGameDate(point.date);
          
          return (
            <g key={`hitter-${i}`}>
              {/* Date labels on x-axis (hitter dates on bottom) */}
              <text 
                x={point.x} 
                y={height - padding.bottom + 12} 
                fontSize="9" 
                textAnchor="middle" 
                fill="#3b82f6" // Blue for hitter dates
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
        
        {/* Pitcher data points (if overlay active) */}
        {showPitcherOverlay && pitcherPoints.map((point, i) => {
          // Format date for display (MM/DD)
          const formattedDate = formatGameDate(point.date);
          
          // Determine circle color based on earned runs (darker red for more ER)
          const erColor = point.er === 0 ? '#22c55e' : // green for 0 ER
                        point.er === 1 ? '#fbbf24' : // yellow for 1 ER
                        point.er <= 3 ? '#f97316' : // orange for 2-3 ER
                        '#ef4444'; // red for 4+ ER
          
          return (
            <g key={`pitcher-${i}`}>
              {/* Date labels on x-axis (pitcher dates on top) */}
              <text 
                x={point.x} 
                y={height - padding.bottom + 25} 
                fontSize="9" 
                textAnchor="middle" 
                fill="#22c55e" // Green for pitcher dates
              >
                {formattedDate}
              </text>
              
              {/* Data point circles - color coded by ER */}
              <circle 
                cx={point.x} 
                cy={point.y} 
                r={8} 
                fill={erColor}
                stroke="white" 
                strokeWidth="1"
                opacity="0.8" // Make slightly transparent
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
              
              {/* K/IP rate to the right side */}
              <text 
                x={point.x} 
                y={point.y - 12} 
                fontSize="9" 
                textAnchor="middle" 
                fill="#22c55e"
                fontWeight="bold"
              >
                {point.k}/{point.ip.toFixed(1)}
              </text>
            </g>
          );
        })}
        
        {/* Chart type labels */}
        {showPitcherOverlay && hasPitcherData && (
          <>
            {/* Hitter label */}
            <text 
              x={padding.left + 5} 
              y={padding.top + 10} 
              fontSize="9" 
              fill="#3b82f6"
              fontWeight="bold"
            >
              Hitter
            </text>
            
            {/* Pitcher label */}
            <text 
              x={width - padding.right - 40} 
              y={padding.top + 10} 
              fontSize="9" 
              fill="#22c55e"
              fontWeight="bold"
            >
              Pitcher
            </text>
          </>
        )}
        
        {/* Overlay legend (if active) */}
        {showPitcherOverlay && hasPitcherData && (
          <g className="overlay-legend">
            <rect x={padding.left + 50} y={padding.top} width={80} height={35} fill="rgba(255,255,255,0.8)" rx="4" />
            
            {/* Hitter legend */}
            <line x1={padding.left + 55} y1={padding.top + 10} x2={padding.left + 65} y2={padding.top + 10} 
              stroke="#3b82f6" strokeWidth="2" />
            <circle cx={padding.left + 60} cy={padding.top + 10} r="3" fill="#3b82f6" />
            <text x={padding.left + 70} y={padding.top + 13} fontSize="8" fill="#666">AVG</text>
            
            {/* Pitcher legend */}
            <line x1={padding.left + 55} y1={padding.top + 22} x2={padding.left + 65} y2={padding.top + 22} 
              stroke="#22c55e" strokeWidth="2" strokeDasharray="3,2" />
            <circle cx={padding.left + 60} cy={padding.top + 22} r="3" fill="#22c55e" />
            <text x={padding.left + 70} y={padding.top + 25} fontSize="8" fill="#666">K/IP</text>
          </g>
        )}
      </svg>
    </div>
  );
};

OverlayPerformanceChart.propTypes = {
  hitter: PropTypes.shape({
    name: PropTypes.string.isRequired,
    team: PropTypes.string.isRequired,
  }).isRequired,
  pitcher: PropTypes.shape({
    name: PropTypes.string,
    team: PropTypes.string,
  }),
  showPitcherOverlay: PropTypes.bool,
  isLoadingPitcher: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number
};

export default OverlayPerformanceChart;