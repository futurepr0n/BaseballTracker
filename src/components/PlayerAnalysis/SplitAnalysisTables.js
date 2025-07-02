import React from 'react';
import './SplitAnalysisTables.css';

/**
 * SplitAnalysisTables Component
 * 
 * Displays detailed statistical splits similar to the image:
 * - Recent form analysis (Last 5, 10, 15, 20 games)
 * - Team vs opponent splits
 * - Home/Away performance
 * - Advanced statistical breakdowns
 */
const SplitAnalysisTables = ({ splitAnalysis, player }) => {
  if (!splitAnalysis) {
    return (
      <div className="split-analysis-tables loading">
        <div className="tables-header">
          <h3>📊 Split Analysis Tables</h3>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading split analysis data...</p>
        </div>
      </div>
    );
  }

  const renderRecentFormTable = () => {
    const { recentForm } = splitAnalysis;
    if (!recentForm) return null;

    return (
      <div className="split-table-container">
        <h4>🔥 Recent Form Analysis</h4>
        <table className="split-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Games</th>
              <th>AVG</th>
              <th>HR</th>
              <th>RBI</th>
              <th>OBP</th>
              <th>SLG</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Last 5</td>
              <td>{recentForm.last5?.games || 0}</td>
              <td>{recentForm.last5?.AVG || '.000'}</td>
              <td>{recentForm.last5?.HR || 0}</td>
              <td>{recentForm.last5?.RBI || 0}</td>
              <td>{recentForm.last5?.OBP || '.000'}</td>
              <td>{recentForm.last5?.SLG || '.000'}</td>
            </tr>
            <tr>
              <td>Last 10</td>
              <td>{recentForm.last10?.games || 0}</td>
              <td>{recentForm.last10?.AVG || '.000'}</td>
              <td>{recentForm.last10?.HR || 0}</td>
              <td>{recentForm.last10?.RBI || 0}</td>
              <td>{recentForm.last10?.OBP || '.000'}</td>
              <td>{recentForm.last10?.SLG || '.000'}</td>
            </tr>
            <tr>
              <td>Last 15</td>
              <td>{recentForm.last15?.games || 0}</td>
              <td>{recentForm.last15?.AVG || '.000'}</td>
              <td>{recentForm.last15?.HR || 0}</td>
              <td>{recentForm.last15?.RBI || 0}</td>
              <td>{recentForm.last15?.OBP || '.000'}</td>
              <td>{recentForm.last15?.SLG || '.000'}</td>
            </tr>
            <tr>
              <td>Last 20</td>
              <td>{recentForm.last20?.games || 0}</td>
              <td>{recentForm.last20?.AVG || '.000'}</td>
              <td>{recentForm.last20?.HR || 0}</td>
              <td>{recentForm.last20?.RBI || 0}</td>
              <td>{recentForm.last20?.OBP || '.000'}</td>
              <td>{recentForm.last20?.SLG || '.000'}</td>
            </tr>
            <tr className="season-total">
              <td>Season</td>
              <td>{splitAnalysis.season?.games || 0}</td>
              <td>{splitAnalysis.season?.AVG || '.000'}</td>
              <td>{splitAnalysis.season?.HR || 0}</td>
              <td>{splitAnalysis.season?.RBI || 0}</td>
              <td>{splitAnalysis.season?.OBP || '.000'}</td>
              <td>{splitAnalysis.season?.SLG || '.000'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderHandednessSplits = () => {
    const { vsLHP, vsRHP } = splitAnalysis;
    
    return (
      <div className="split-table-container">
        <h4>⚾ Handedness Splits</h4>
        <table className="split-table">
          <thead>
            <tr>
              <th>vs Pitcher</th>
              <th>Attack Angle</th>
              <th>Bat Speed</th>
              <th>Swing Score</th>
              <th>Sample Size</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>vs LHP</td>
              <td>{vsLHP?.attack_angle ? `${vsLHP.attack_angle.toFixed(1)}°` : 'N/A'}</td>
              <td>{vsLHP?.bat_speed ? `${vsLHP.bat_speed.toFixed(1)} mph` : 'N/A'}</td>
              <td>{vsLHP?.swing_optimization_score ? vsLHP.swing_optimization_score.toFixed(1) : 'N/A'}</td>
              <td>{vsLHP?.swing_count || 'N/A'}</td>
            </tr>
            <tr>
              <td>vs RHP</td>
              <td>{vsRHP?.attack_angle ? `${vsRHP.attack_angle.toFixed(1)}°` : 'N/A'}</td>
              <td>{vsRHP?.bat_speed ? `${vsRHP.bat_speed.toFixed(1)} mph` : 'N/A'}</td>
              <td>{vsRHP?.swing_optimization_score ? vsRHP.swing_optimization_score.toFixed(1) : 'N/A'}</td>
              <td>{vsRHP?.swing_count || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="split-analysis-tables">
      <div className="tables-header">
        <h3>📊 Split Analysis Tables</h3>
        <p>Detailed performance breakdowns across different contexts</p>
      </div>

      <div className="tables-grid">
        {renderRecentFormTable()}
        {renderHandednessSplits()}
      </div>

      <div className="analysis-summary">
        <div className="summary-insights">
          <div className="insight-item">
            <span className="insight-label">Best Recent Period:</span>
            <span className="insight-value">
              {splitAnalysis.recentForm ? 
                Object.entries(splitAnalysis.recentForm)
                  .reduce((best, [period, stats]) => 
                    parseFloat(stats?.AVG || 0) > parseFloat(best.stats?.AVG || 0) 
                      ? { period: period.replace('last', 'Last '), stats } 
                      : best, 
                    { period: 'None', stats: { AVG: '0' } }
                  ).period
                : 'N/A'
              }
            </span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Handedness Advantage:</span>
            <span className="insight-value">
              {splitAnalysis.vsLHP && splitAnalysis.vsRHP ? 
                (splitAnalysis.vsLHP.swing_optimization_score > splitAnalysis.vsRHP.swing_optimization_score 
                  ? 'vs LHP' : 'vs RHP')
                : 'N/A'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitAnalysisTables;