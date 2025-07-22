import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Recent 5 Games Chart Component
 * Shows the last 5 games performance with trend analysis
 */
const Recent5GamesChart = ({ recentGamesData, propOption }) => {
  if (!recentGamesData || !Array.isArray(recentGamesData) || recentGamesData.length === 0) {
    return (
      <div className="chart-container">
        <h5 className="chart-title">Recent 5 Games</h5>
        <div className="no-data-message">No recent games data available</div>
      </div>
    );
  }

  // Prepare chart data - keep most recent games on the right (left-to-right reading)
  const chartData = recentGamesData
    .slice(0, 5)
    .map((game, index) => ({
      ...game,
      gameLabel: `Game ${index + 1}`,
      displayLabel: `${game.displayDate || game.date}`
    }));

  // Calculate trend
  const values = chartData.map(g => g.value || 0);
  const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
  const trend = values.length >= 2 ? 
    (values[values.length - 1] > values[0] ? 'improving' : 
     values[values.length - 1] < values[0] ? 'declining' : 'stable') : 'insufficient';

  // Custom tooltip
  const RecentGamesTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{data.displayLabel}</p>
          <p className="tooltip-game-type" style={{fontSize: '10px', color: '#999'}}>
            Recent Game
          </p>
          <p className="tooltip-value">
            {propOption?.label}: <span className="highlight">{data.value}</span>
          </p>
          <p className="tooltip-success">
            {data.success1Plus ? '✅ 1+ Success' : '❌ No Success'}
          </p>
          {data.opponent && (
            <p className="tooltip-opponent" style={{fontSize: '10px', color: '#999'}}>
              vs {data.opponent}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container recent-games-chart">
      <h5 className="chart-title">
        Recent 5 Games - {propOption?.label}
        <span className="chart-subtitle">
          Performance trend analysis
        </span>
      </h5>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="displayLabel" 
            stroke="#ffffff"
            fontSize={12}
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke="#ffffff" fontSize={12} />
          <Tooltip content={<RecentGamesTooltip />} />
          <Legend />
          
          {/* Game performance line */}
          <Line 
            type="monotone" 
            dataKey="value"
            stroke="#9c27b0" 
            strokeWidth={3}
            dot={(props) => {
              if (!props.payload || props.payload.value === null) return null;
              
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={8}
                  fill={props.payload.success1Plus ? '#4CAF50' : '#f44336'}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              );
            }}
            name={propOption?.label}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Recent Performance Summary */}
      <div className="recent-summary">
        <div className="summary-row">
          <div className="summary-item">
            <span className="summary-label">Average:</span>
            <span className="summary-value">{avgValue.toFixed(1)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Trend:</span>
            <span className={`summary-value trend-${trend}`}>
              {trend === 'improving' ? '📈 Improving' : 
               trend === 'declining' ? '📉 Declining' : 
               trend === 'stable' ? '➡️ Stable' : '❓ Limited Data'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Success Rate:</span>
            <span className="summary-value">
              {((chartData.filter(g => g.success1Plus).length / chartData.length) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        
        {/* Game-by-game breakdown */}
        <div className="games-breakdown">
          {chartData.map((game, index) => (
            <div key={index} className={`game-item ${game.success1Plus ? 'success' : 'miss'}`}>
              <span className="game-date">{game.displayDate}</span>
              <span className="game-value">{game.value}</span>
              <span className="game-opponent">vs {game.opponent || 'Unknown'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Recent5GamesChart;