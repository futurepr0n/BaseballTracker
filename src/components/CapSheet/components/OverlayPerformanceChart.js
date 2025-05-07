import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { formatGameDate } from '../utils/formatters';

/**
 * Enhanced overlay performance chart component
 * Displays hitter performance with optional pitcher overlay
 * Now with loading state for hitter data refreshes
 * 
 * @param {Object} hitter - The hitter player object with game data
 * @param {Object} pitcher - Primary pitcher object (optional)
 * @param {Object} secondPitcher - Second pitcher object (optional)
 * @param {boolean} showPitcherOverlay - Whether to show primary pitcher overlay
 * @param {boolean} showSecondPitcherOverlay - Whether to show second pitcher overlay
 * @param {boolean} isLoadingPitcher - Whether primary pitcher data is loading
 * @param {boolean} isLoadingSecondPitcher - Whether second pitcher data is loading
 * @param {boolean} isLoadingHitter - Whether hitter data is refreshing
 * @param {number} width - Width of the chart (default: 260px)
 * @param {number} height - Height of the chart (default: 90px)
 */
const OverlayPerformanceChart = ({ 
  hitter, 
  pitcher = null, 
  secondPitcher = null,
  showPitcherOverlay = false,
  showSecondPitcherOverlay = false,
  isLoadingPitcher = false,
  isLoadingSecondPitcher = false,
  isLoadingHitter = false,
  width = 260, 
  height = 90 
}) => {
  // Logging to help debug when this component renders
  useEffect(() => {
    console.log(`[OverlayChart] Rendering chart for ${hitter.name} with data:`, {
      hitterGames: getAvailableHitterGames().length,
      pitcherOverlay: showPitcherOverlay,
      secondPitcherOverlay: showSecondPitcherOverlay,
      isLoadingHitter: isLoadingHitter
    });
  }, [hitter.name, isLoadingHitter]);

  // Visual constants
  const padding = { top: 15, right: 20, bottom: 35, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Helper functions to get game data
  const getAvailableHitterGames = () => {
    const games = [];
    let gameIndex = 1;
    
    // Keep adding games as long as we find date properties in the hitter object
    while (hitter[`game${gameIndex}Date`] !== undefined) {
      // Only add games with valid data
      if (hitter[`game${gameIndex}Date`]) {
        games.push({
          date: hitter[`game${gameIndex}Date`],
          ab: parseInt(hitter[`game${gameIndex}AB`] || '0') || 0,
          h: parseInt(hitter[`game${gameIndex}H`] || '0') || 0,
          hr: parseInt(hitter[`game${gameIndex}HR`] || '0') || 0,
          avg: parseInt(hitter[`game${gameIndex}AB`] || '0') > 0 
            ? parseInt(hitter[`game${gameIndex}H`] || '0') / parseInt(hitter[`game${gameIndex}AB`] || '0') 
            : 0
        });
      }
      gameIndex++;
    }
    
    return games.reverse(); // Display oldest to newest (left to right)
  };
  
  // Get pitcher games with memoization
  const getAvailablePitcherGames = () => {
    if (!pitcher) return [];
    
    const games = [];
    let gameIndex = 1;
    
    // Keep adding games as long as we find date properties in the pitcher object
    while (pitcher[`game${gameIndex}Date`] !== undefined) {
      // Only add games with valid data
      if (pitcher[`game${gameIndex}Date`]) {
        games.push({
          date: pitcher[`game${gameIndex}Date`],
          ip: parseFloat(pitcher[`game${gameIndex}IP`] || '0') || 0,
          k: parseInt(pitcher[`game${gameIndex}K`] || '0') || 0,
          er: parseInt(pitcher[`game${gameIndex}ER`] || '0') || 0,
          kPerIP: parseFloat(pitcher[`game${gameIndex}IP`] || '0') > 0 
            ? parseInt(pitcher[`game${gameIndex}K`] || '0') / parseFloat(pitcher[`game${gameIndex}IP`] || '0') 
            : 0
        });
      }
      gameIndex++;
    }
    
    return games.reverse(); // Display oldest to newest (left to right)
  };
  
  // Get second pitcher games with memoization
  const getAvailableSecondPitcherGames = () => {
    if (!secondPitcher) return [];
    
    const games = [];
    let gameIndex = 1;
    
    // Keep adding games as long as we find date properties in the secondPitcher object
    while (secondPitcher[`game${gameIndex}Date`] !== undefined) {
      // Only add games with valid data
      if (secondPitcher[`game${gameIndex}Date`]) {
        games.push({
          date: secondPitcher[`game${gameIndex}Date`],
          ip: parseFloat(secondPitcher[`game${gameIndex}IP`] || '0') || 0,
          k: parseInt(secondPitcher[`game${gameIndex}K`] || '0') || 0,
          er: parseInt(secondPitcher[`game${gameIndex}ER`] || '0') || 0,
          kPerIP: parseFloat(secondPitcher[`game${gameIndex}IP`] || '0') > 0 
            ? parseInt(secondPitcher[`game${gameIndex}K`] || '0') / parseFloat(secondPitcher[`game${gameIndex}IP`] || '0') 
            : 0
        });
      }
      gameIndex++;
    }
    
    return games.reverse(); // Display oldest to newest (left to right)
  };
  
  // Use memoized values for better performance and to prevent recalculations
  const hitterGames = useMemo(() => getAvailableHitterGames(), [hitter]);
  const pitcherGames = useMemo(() => getAvailablePitcherGames(), [pitcher]);
  const secondPitcherGames = useMemo(() => getAvailableSecondPitcherGames(), [secondPitcher]);
  
  // Filter out games with no at-bats/innings pitched
  const validHitterGames = useMemo(() => hitterGames.filter(game => game.ab > 0), [hitterGames]);
  const validPitcherGames = useMemo(() => pitcherGames.filter(game => game.ip > 0), [pitcherGames]);
  const validSecondPitcherGames = useMemo(() => secondPitcherGames.filter(game => game.ip > 0), [secondPitcherGames]);
  
  // Check if we have enough data to show trends
  const hasHitterData = validHitterGames.length > 1;
  const hasPitcherData = validPitcherGames.length > 1;
  const hasSecondPitcherData = validSecondPitcherGames.length > 1;
  
  // Calculate max K/IP for scaling
  const maxKPerIP = useMemo(() => {
    return Math.max(
      3, 
      ...(hasPitcherData ? validPitcherGames.map(g => g.kPerIP) : []),
      ...(hasSecondPitcherData ? validSecondPitcherGames.map(g => g.kPerIP) : [])
    );
  }, [hasPitcherData, hasSecondPitcherData, validPitcherGames, validSecondPitcherGames]);
  
  // Scale functions to convert data values to chart coordinates
  const getX = (index, total) => {
    // If only 1 or 2 games, space them more reasonably
    if (total <= 2) {
      return padding.left + (index * (chartWidth / 2));
    }
    // Otherwise use regular spacing
    const divisor = Math.max(1, total - 1);
    return padding.left + (index * (chartWidth / divisor));
  };
  
  const getHitterY = (avg) => padding.top + chartHeight - (avg * chartHeight);
  const getPitcherY = (kPerIP) => padding.top + chartHeight - ((kPerIP / maxKPerIP) * chartHeight);
  
  // Create points for the lines
  const hitterPoints = useMemo(() => {
    return validHitterGames.map((game, i) => ({
      x: getX(i, validHitterGames.length),
      y: getHitterY(game.avg),
      ...game
    }));
  }, [validHitterGames]);
  
  const pitcherPoints = useMemo(() => {
    if (!hasPitcherData) return [];
    return validPitcherGames.map((game, i) => ({
      x: getX(i, validPitcherGames.length),
      y: getPitcherY(game.kPerIP),
      ...game
    }));
  }, [validPitcherGames, hasPitcherData, maxKPerIP]);
  
  const secondPitcherPoints = useMemo(() => {
    if (!hasSecondPitcherData) return [];
    return validSecondPitcherGames.map((game, i) => ({
      x: getX(i, validSecondPitcherGames.length),
      y: getPitcherY(game.kPerIP),
      ...game
    }));
  }, [validSecondPitcherGames, hasSecondPitcherData, maxKPerIP]);
  
  // Create the paths for the lines
  const hitterPath = useMemo(() => {
    return hitterPoints.length > 1 
      ? hitterPoints.map((point, i) => (i === 0 ? "M" : "L") + point.x + "," + point.y).join(" ")
      : "";
  }, [hitterPoints]);
    
  const pitcherPath = useMemo(() => {
    return pitcherPoints.length > 1 
      ? pitcherPoints.map((point, i) => (i === 0 ? "M" : "L") + point.x + "," + point.y).join(" ")
      : "";
  }, [pitcherPoints]);
    
  const secondPitcherPath = useMemo(() => {
    return secondPitcherPoints.length > 1 
      ? secondPitcherPoints.map((point, i) => (i === 0 ? "M" : "L") + point.x + "," + point.y).join(" ")
      : "";
  }, [secondPitcherPoints]);

  // Handle loading states
  if (isLoadingHitter) {
    return (
      <div className="loading-hitter-data" style={{ width, height }}>
        <div className="chart-loading-spinner"></div>
        <span>Updating hitter data...</span>
      </div>
    );
  }
  
  if (isLoadingPitcher && showPitcherOverlay) {
    return (
      <div className="loading-pitcher-data" style={{ width, height }}>
        <div className="chart-loading-spinner"></div>
        <span>Loading pitcher data...</span>
      </div>
    );
  }
  
  if (!hasHitterData) {
    return (
      <div className="no-game-data" style={{ width, height }}>
        Not enough game data for trend display
      </div>
    );
  }

  // Render the chart
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
        
        {/* Second pitcher line (if overlay active) */}
        {showSecondPitcherOverlay && secondPitcherPoints.length > 1 && (
          <path 
            d={secondPitcherPath} 
            fill="none" 
            stroke="#16a34a" // Darker green for second pitcher
            strokeWidth="2.5" 
            strokeDasharray="5,3" // Different dash pattern for second pitcher
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
        
        {/* Pitcher data points */}
        {showPitcherOverlay && pitcherPoints.map((point, i) => {
          // Format date for display (MM/DD)
          const formattedDate = formatGameDate(point.date);
          
          // Determine circle color based on earned runs
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
        
        {/* Second pitcher data points */}
        {showSecondPitcherOverlay && secondPitcherPoints.map((point, i) => {
          // Format date for display (MM/DD)
          const formattedDate = formatGameDate(point.date);
          
          // Determine circle color based on earned runs (darker variations for second pitcher)
          const erColor = point.er === 0 ? '#15803d' : // darker green for 0 ER
                        point.er === 1 ? '#ca8a04' : // darker yellow for 1 ER
                        point.er <= 3 ? '#c2410c' : // darker orange for 2-3 ER
                        '#b91c1c'; // darker red for 4+ ER
          
          return (
            <g key={`second-pitcher-${i}`}>
              {/* Date labels on x-axis (second pitcher dates at bottom) */}
              <text 
                x={point.x} 
                y={height - padding.bottom + 38} // Position below first pitcher dates
                fontSize="9" 
                textAnchor="middle" 
                fill="#15803d" // Darker green for second pitcher
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
                fill="#15803d" // Darker green for second pitcher
                fontWeight="bold"
              >
                {point.k}/{point.ip.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

OverlayPerformanceChart.propTypes = {
  hitter: PropTypes.object.isRequired,
  pitcher: PropTypes.object,
  secondPitcher: PropTypes.object,
  showPitcherOverlay: PropTypes.bool,
  showSecondPitcherOverlay: PropTypes.bool,
  isLoadingPitcher: PropTypes.bool,
  isLoadingSecondPitcher: PropTypes.bool,
  isLoadingHitter: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number
};

export default React.memo(OverlayPerformanceChart);