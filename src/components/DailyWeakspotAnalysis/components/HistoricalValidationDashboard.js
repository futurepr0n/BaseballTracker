// Historical Validation Dashboard - ROI tracking and performance visualization

import React, { useState, useEffect, useCallback } from 'react';
import './HistoricalValidationDashboard.css';
import historicalValidationService from '../services/historicalValidationService.js';

const HistoricalValidationDashboard = ({ isVisible, onClose }) => {
  const [validationData, setValidationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '2025-08-01',
    endDate: '2025-08-18'
  });
  const [activeTab, setActiveTab] = useState('overview');

  const loadValidationData = useCallback(async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    
    setLoading(true);
    setError(null);

    try {
      const data = await historicalValidationService.validateHistoricalPredictions(
        dateRange.startDate,
        dateRange.endDate
      );
      setValidationData(data);
    } catch (err) {
      setError(`Failed to load validation data: ${err.message}`);
      console.error('Validation error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (isVisible) {
      loadValidationData();
    }
  }, [isVisible, loadValidationData]);

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  const formatPercentage = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (!isVisible) return null;

  return (
    <div className="historical-validation-overlay">
      <div className="historical-validation-dashboard">
        <div className="dashboard-header">
          <h2>Historical Validation Dashboard</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="date-range-selector">
          <div className="date-inputs">
            <label>
              Start Date:
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                max="2025-08-31"
                min="2025-08-01"
              />
            </label>
            <label>
              End Date:
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                max="2025-08-31"
                min="2025-08-01"
              />
            </label>
            <button 
              onClick={loadValidationData}
              disabled={loading}
              className="refresh-button"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Analyzing historical predictions...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={loadValidationData}>Retry</button>
          </div>
        )}

        {validationData && !loading && (
          <div className="validation-content">
            <div className="tab-navigation">
              <button
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`tab-button ${activeTab === 'props' ? 'active' : ''}`}
                onClick={() => setActiveTab('props')}
              >
                Prop Analysis
              </button>
              <button
                className={`tab-button ${activeTab === 'calibration' ? 'active' : ''}`}
                onClick={() => setActiveTab('calibration')}
              >
                Calibration
              </button>
              <button
                className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
                onClick={() => setActiveTab('performance')}
              >
                Best/Worst
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className="overview-tab">
                <div className="summary-cards">
                  <div className="summary-card primary">
                    <h3>Total ROI</h3>
                    <div className={`metric ${validationData.summary.roi >= 0 ? 'positive' : 'negative'}`}>
                      {formatPercentage(validationData.summary.roi)}
                    </div>
                    <p>Return on Investment</p>
                  </div>

                  <div className="summary-card">
                    <h3>Total Profit</h3>
                    <div className={`metric ${validationData.summary.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(validationData.summary.totalProfit)}
                    </div>
                    <p>Units Won/Lost</p>
                  </div>

                  <div className="summary-card">
                    <h3>Win Rate</h3>
                    <div className="metric">
                      {formatPercentage(validationData.summary.accuracy)}
                    </div>
                    <p>{validationData.summary.wins}/{validationData.summary.totalBets} bets</p>
                  </div>

                  <div className="summary-card">
                    <h3>Profitable Days</h3>
                    <div className="metric">
                      {validationData.summary.profitableDays}
                    </div>
                    <p>Days with positive return</p>
                  </div>
                </div>

                <div className="daily-performance-chart">
                  <h3>Daily Performance Trend</h3>
                  <div className="chart-container">
                    {validationData.dailyPerformance.slice(0, 10).map((day, index) => (
                      <div key={day.date} className="daily-bar">
                        <div 
                          className={`profit-bar ${day.profit >= 0 ? 'positive' : 'negative'}`}
                          style={{
                            height: `${Math.max(5, Math.abs(day.profit) * 10)}px`
                          }}
                          title={`${day.date}: ${formatCurrency(day.profit)}`}
                        />
                        <div className="day-label">{day.date.split('-')[2]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'props' && (
              <div className="props-tab">
                <h3>Prop Type Performance Analysis</h3>
                <div className="prop-analysis-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Prop Type</th>
                        <th>Total Bets</th>
                        <th>Win Rate</th>
                        <th>ROI</th>
                        <th>Avg Profit</th>
                        <th>Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationData.propTypeAnalysis.map((prop, index) => (
                        <tr key={prop.type} className={index < 3 ? 'top-performer' : ''}>
                          <td className="prop-type">{prop.type}</td>
                          <td>{prop.totalBets}</td>
                          <td>{formatPercentage(prop.accuracy)}</td>
                          <td className={prop.roi >= 0 ? 'positive' : 'negative'}>
                            {formatPercentage(prop.roi)}
                          </td>
                          <td className={prop.averageProfit >= 0 ? 'positive' : 'negative'}>
                            {formatCurrency(prop.averageProfit)}
                          </td>
                          <td className="recommendation">
                            {prop.roi >= 10 ? '🟢 Strong Focus' :
                             prop.roi >= 5 ? '🟡 Moderate Focus' :
                             prop.roi >= 0 ? '⚪ Neutral' : '🔴 Avoid'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'calibration' && (
              <div className="calibration-tab">
                <h3>Model Calibration Analysis</h3>
                <p className="calibration-explanation">
                  This chart shows how well our confidence scores match actual outcomes. 
                  A perfectly calibrated model would have points on the diagonal line.
                </p>
                
                <div className="calibration-chart">
                  <table>
                    <thead>
                      <tr>
                        <th>Confidence Range</th>
                        <th>Predicted %</th>
                        <th>Actual %</th>
                        <th>Sample Size</th>
                        <th>Calibration Error</th>
                        <th>Assessment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationData.calibrationData.map((bin) => (
                        <tr key={bin.label}>
                          <td>{bin.label}</td>
                          <td>{bin.predictedConfidence}%</td>
                          <td>{bin.actualAccuracy}%</td>
                          <td>{bin.betCount}</td>
                          <td className={bin.calibrationError > 15 ? 'high-error' : bin.calibrationError > 10 ? 'medium-error' : 'low-error'}>
                            {bin.calibrationError.toFixed(1)}%
                          </td>
                          <td>
                            {bin.calibrationError <= 10 ? '🟢 Well Calibrated' :
                             bin.calibrationError <= 15 ? '🟡 Moderate' : '🔴 Poor'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="performance-tab">
                <div className="performance-sections">
                  <div className="best-performers">
                    <h3>🏆 Best Performers</h3>
                    <div className="performer-list">
                      {validationData.bestPerformers.map((performer, index) => (
                        <div key={index} className="performer-card positive">
                          <div className="performer-header">
                            <strong>{performer.playerName}</strong>
                            <span className="profit positive">{formatCurrency(performer.profit)}</span>
                          </div>
                          <div className="performer-details">
                            <span className="date">{performer.date}</span>
                            <span className="prop-type">{performer.propType}</span>
                            <span className="confidence">{performer.confidence}% confidence</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="biggest-misses">
                    <h3>❌ Biggest Misses</h3>
                    <div className="performer-list">
                      {validationData.biggestMisses.map((miss, index) => (
                        <div key={index} className="performer-card negative">
                          <div className="performer-header">
                            <strong>{miss.playerName}</strong>
                            <span className="confidence-miss">{miss.confidence}% confidence</span>
                          </div>
                          <div className="performer-details">
                            <span className="date">{miss.date}</span>
                            <span className="prop-type">{miss.propType}</span>
                          </div>
                          <div className="reasoning">
                            {miss.reasoning}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {validationData && validationData.summary.totalBets === 0 && !loading && (
          <div className="no-data-message">
            <h3>No Validation Data Found</h3>
            <p>
              No matching prediction data was found for the selected date range. 
              Please ensure:
            </p>
            <ul>
              <li>Hellraiser prediction files exist for the selected dates</li>
              <li>Actual game result files are available</li>
              <li>The date range includes games with predictions</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricalValidationDashboard;