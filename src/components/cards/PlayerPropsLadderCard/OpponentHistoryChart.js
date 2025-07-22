import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Opponent History Chart Component
 * Shows ALL games against the current opponent with enhanced data loading
 */
const OpponentHistoryChart = ({ opponentHistoryData, currentOpponent, propOption, loading = false, enhanced = false }) => {
  // Loading state for enhanced opponent data
  if (loading) {
    return (
      <div className="chart-container">
        <h5 className="chart-title">vs {currentOpponent || 'Opponent'} History</h5>
        <div className="loading-state" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-spinner" style={{ 
            width: '20px', 
            height: '20px', 
            border: '2px solid rgba(255,255,255,0.3)', 
            borderTop: '2px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }}></div>
          <p>Loading opponent history...</p>
        </div>
      </div>
    );
  }

  if (!opponentHistoryData || !currentOpponent || !opponentHistoryData[currentOpponent]) {
    return (
      <div className="chart-container">
        <h5 className="chart-title">vs {currentOpponent || 'Opponent'} History</h5>
        <div className="no-data-message">
          {currentOpponent ? 
            `No historical games found vs ${currentOpponent}` : 
            'No current opponent detected'
          }
        </div>
      </div>
    );
  }

  const opponentData = opponentHistoryData[currentOpponent];
  const games = opponentData.games || [];
  const stats = opponentData.stats || {};

  if (games.length === 0) {
    return (
      <div className="chart-container">
        <h5 className="chart-title">vs {currentOpponent} History</h5>
        <div className="no-data-message">No games found against {currentOpponent} this season</div>
      </div>
    );
  }

  // Prepare chart data - reverse to show chronological order (oldest to newest)
  const chartData = games
    .slice()
    .reverse()
    .map((game, index) => ({
      ...game,
      gameNumber: index + 1,
      displayLabel: `${game.displayDate || game.date}`
    }));

  // Calculate performance metrics
  const avgValue = parseFloat(stats.average || 0);
  const successRate1Plus = parseFloat(stats.successRate1Plus || 0);
  const successRate2Plus = parseFloat(stats.successRate2Plus || 0);

  // Custom tooltip
  const OpponentTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{data.displayLabel}</p>
          <p className="tooltip-game-type" style={{fontSize: '10px', color: '#ff9800'}}>
            vs {currentOpponent}
          </p>
          <p className="tooltip-value">
            {propOption?.label}: <span className="highlight">{data.value}</span>
          </p>
          <p className="tooltip-success">
            {data.success1Plus ? '✅ 1+ Success' : '❌ No Success'}
          </p>
          <p className="tooltip-game-number" style={{fontSize: '10px', color: '#999'}}>
            Game #{data.gameNumber} vs {currentOpponent}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container opponent-history-chart">
      <h5 className="chart-title">
        vs {currentOpponent} History - {propOption?.label}
        <span className="chart-subtitle">
          {games.length} games this season
          {enhanced && (
            <span className="enhanced-badge" style={{ 
              marginLeft: '8px', 
              padding: '2px 6px', 
              background: 'rgba(76, 175, 80, 0.2)', 
              border: '1px solid #4CAF50', 
              borderRadius: '4px', 
              fontSize: '10px',
              color: '#4CAF50'
            }}>
              ⚡ Enhanced
            </span>
          )}
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
            interval={Math.max(0, Math.floor(games.length / 8))} // Show fewer labels if many games
          />
          <YAxis stroke="#ffffff" fontSize={12} />
          <Tooltip content={<OpponentTooltip />} />
          <Legend />
          
          {/* Opponent history line */}
          <Line 
            type="monotone" 
            dataKey="value"
            stroke="#ff9800" 
            strokeWidth={3}
            dot={(props) => {
              if (!props.payload || props.payload.value === null) return null;
              
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={6}
                  fill={props.payload.success1Plus ? '#4CAF50' : '#f44336'}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              );
            }}
            name={`vs ${currentOpponent}`}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Opponent Performance Summary */}
      <div className="opponent-summary">
        <div className="summary-row">
          <div className="summary-item">
            <span className="summary-label">Games:</span>
            <span className="summary-value">{stats.totalGames}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Average:</span>
            <span className="summary-value">{avgValue.toFixed(2)} per game</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total:</span>
            <span className="summary-value">{stats.totalStat}</span>
          </div>
        </div>
        
        <div className="summary-row">
          <div className="summary-item">
            <span className="summary-label">1+ Success:</span>
            <span className="summary-value success-rate">{successRate1Plus}%</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">2+ Success:</span>
            <span className="summary-value success-rate">{successRate2Plus}%</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Performance:</span>
            <span className={`summary-value ${avgValue > 1.0 ? 'positive' : avgValue > 0.5 ? 'neutral' : 'negative'}`}>
              {avgValue > 1.0 ? '🔥 Hot' : avgValue > 0.5 ? '➡️ Average' : '❄️ Cold'}
            </span>
          </div>
        </div>

        {/* Recent vs Historical */}
        {games.length >= 3 && (
          <div className="recent-vs-historical">
            <div className="comparison-item">
              <span className="comparison-label">Last 3 vs {currentOpponent}:</span>
              <span className="comparison-value">
                {(games.slice(-3).reduce((sum, g) => sum + g.value, 0) / 3).toFixed(2)} avg
              </span>
            </div>
            <div className="comparison-item">
              <span className="comparison-label">Season vs {currentOpponent}:</span>
              <span className="comparison-value">{avgValue.toFixed(2)} avg</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpponentHistoryChart;