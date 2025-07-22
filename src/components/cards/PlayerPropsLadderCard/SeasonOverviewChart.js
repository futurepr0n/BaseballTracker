import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Season Overview Chart Component
 * Shows seasonal performance metrics vs league average
 */
const SeasonOverviewChart = ({ player, seasonData, propOption }) => {
  if (!player || !seasonData || !propOption) {
    return (
      <div className="chart-container">
        <h5 className="chart-title">Season Overview</h5>
        <div className="no-data-message">No seasonal data available</div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = [
    {
      category: 'Season Total',
      playerValue: seasonData.seasonTotal,
      leagueAverage: seasonData.leagueAverage * seasonData.gamesPlayed,
      projected: seasonData.projectedTotal
    },
    {
      category: 'Per Game Rate',
      playerValue: parseFloat(seasonData.seasonAverage),
      leagueAverage: seasonData.leagueAverage,
      projected: parseFloat(seasonData.seasonAverage)
    }
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-value">
            Player: <span className="highlight">{data.playerValue}</span>
          </p>
          <p className="tooltip-league">
            League Avg: <span style={{color: '#FF9800'}}>{data.leagueAverage}</span>
          </p>
          {data.projected !== data.playerValue && (
            <p className="tooltip-projected">
              Projected: <span style={{color: '#2196F3'}}>{data.projected}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container season-overview-chart">
      <h5 className="chart-title">
        Season Overview - {propOption.label}
        <span className="chart-subtitle">
          {seasonData.gamesPlayed} games played
        </span>
      </h5>
      
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="category" 
            stroke="#ffffff"
            fontSize={12}
          />
          <YAxis stroke="#ffffff" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="playerValue" 
            fill="#4CAF50" 
            name="Player" 
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="leagueAverage" 
            fill="#FF9800" 
            name="League Avg" 
            radius={[4, 4, 0, 0]}
          />
          {chartData[0].projected !== chartData[0].playerValue && (
            <Bar 
              dataKey="projected" 
              fill="#2196F3" 
              name="Full Season Pace" 
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Season Summary */}
      <div className="season-summary">
        <div className="summary-item">
          <span className="summary-label">Season Rate:</span>
          <span className="summary-value">{seasonData.seasonAverage} per game</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">vs League:</span>
          <span className={`summary-value ${parseFloat(seasonData.seasonAverage) > seasonData.leagueAverage ? 'positive' : 'negative'}`}>
            {parseFloat(seasonData.seasonAverage) > seasonData.leagueAverage ? '↗' : '↘'} 
            {((parseFloat(seasonData.seasonAverage) / seasonData.leagueAverage - 1) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default SeasonOverviewChart;