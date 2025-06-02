import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const ArsenalAnalysisDisplay = ({ arsenalAnalysis, onClose }) => {
  const [activeTab, setActiveTab] = useState('arsenal');
  const [selectedHitter, setSelectedHitter] = useState(null);
  const [expandedPitch, setExpandedPitch] = useState(null);

  if (!arsenalAnalysis || !arsenalAnalysis.pitcher) {
    return (
      <div className="arsenal-analysis-container">
        <div className="analysis-header">
          <h2>Arsenal Analysis</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="no-data">No arsenal analysis available</div>
      </div>
    );
  }

  const { pitcher, hitters, teamSummary, analysisMetadata } = arsenalAnalysis;

  // Format pitch effectiveness colors
  const getPitchEffectivenessColor = (runValue) => {
    if (runValue < -2) return '#22c55e'; // Very effective (green)
    if (runValue < 0) return '#84cc16'; // Effective (light green)
    if (runValue < 2) return '#eab308'; // Neutral (yellow)
    if (runValue < 4) return '#f97316'; // Poor (orange)
    return '#ef4444'; // Very poor (red)
  };

  // Format advantage colors
  const getAdvantageColor = (advantage) => {
    if (advantage > 1) return '#22c55e'; // Strong hitter advantage
    if (advantage > 0.3) return '#84cc16'; // Hitter advantage
    if (advantage > -0.3) return '#eab308'; // Neutral
    if (advantage > -1) return '#f97316'; // Pitcher advantage
    return '#ef4444'; // Strong pitcher advantage
  };

  // Format trend indicators
  const getTrendIcon = (improvement) => {
    if (improvement > 0.02) return '📈'; // Strong improvement
    if (improvement > 0.005) return '↗️'; // Slight improvement
    if (improvement < -0.02) return '📉'; // Strong decline
    if (improvement < -0.005) return '↘️'; // Slight decline
    return '➡️'; // Stable
  };

  const ArsenalTab = () => (
    <div className="arsenal-tab">
      <div className="pitcher-info">
        <h3>{pitcher.pitcher} Arsenal Analysis</h3>
        <div className="pitcher-stats">
          <div className="stat-box">
            <span className="stat-label">Total Pitch Types</span>
            <span className="stat-value">{pitcher.totalPitchTypes}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Primary Pitches</span>
            <span className="stat-value">{pitcher.primaryPitches.length}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Confidence</span>
            <span className="stat-value">{(pitcher.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Data Years</span>
            <span className="stat-value">{pitcher.dataYears.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Arsenal Chart */}
      <div className="chart-container">
        <h4>Pitch Arsenal - Usage & Effectiveness</h4>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={pitcher.arsenal}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="pitchName" 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" orientation="left" label={{ value: 'Usage %', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Run Value/100', angle: 90, position: 'insideRight' }} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'usage') return [`${(value * 100).toFixed(1)}%`, 'Usage'];
                if (name === 'runValuePer100') return [value.toFixed(2), 'Run Value/100'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="usage" fill="#3b82f6" name="Usage %" />
            <Line yAxisId="right" type="monotone" dataKey="runValuePer100" stroke="#ef4444" strokeWidth={3} name="Run Value/100" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Pitch Breakdown */}
      <div className="pitch-breakdown">
        <h4>Detailed Pitch Analysis</h4>
        <div className="pitch-cards">
          {pitcher.arsenal.map((pitch, index) => (
            <div 
              key={index} 
              className={`pitch-card ${expandedPitch === index ? 'expanded' : ''}`}
              onClick={() => setExpandedPitch(expandedPitch === index ? null : index)}
            >
              <div className="pitch-header">
                <div className="pitch-name">
                  <span className="pitch-type">{pitch.pitchName}</span>
                  <span className="pitch-usage">{(pitch.usage * 100).toFixed(1)}%</span>
                </div>
                <div 
                  className="effectiveness-indicator"
                  style={{ backgroundColor: getPitchEffectivenessColor(pitch.runValuePer100) }}
                >
                  {pitch.runValuePer100 > 0 ? '+' : ''}{pitch.runValuePer100.toFixed(1)}
                </div>
              </div>
              
              {expandedPitch === index && (
                <div className="pitch-details">
                  <div className="pitch-stats-grid">
                    <div className="pitch-stat">
                      <span className="label">BA Against</span>
                      <span className="value">{pitch.battingAverageAgainst.toFixed(3)}</span>
                    </div>
                    <div className="pitch-stat">
                      <span className="label">wOBA Against</span>
                      <span className="value">{pitch.wobaAgainst.toFixed(3)}</span>
                    </div>
                    <div className="pitch-stat">
                      <span className="label">Whiff %</span>
                      <span className="value">{pitch.whiffPercent.toFixed(1)}%</span>
                    </div>
                    <div className="pitch-stat">
                      <span className="label">K %</span>
                      <span className="value">{pitch.strikeoutPercent.toFixed(1)}%</span>
                    </div>
                    <div className="pitch-stat">
                      <span className="label">Hard Hit %</span>
                      <span className="value">{pitch.hardHitPercent.toFixed(1)}%</span>
                    </div>
                    <div className="pitch-stat">
                      <span className="label">Total Pitches</span>
                      <span className="value">{pitch.totalPitches.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Pitch trends if available */}
                  {pitcher.yearOverYearTrends.byPitch?.[pitch.pitchType] && (
                    <div className="pitch-trends">
                      <h5>Year-over-Year Trends</h5>
                      <div className="trend-indicators">
                        <div className="trend-item">
                          <span>Usage: </span>
                          <span>{getTrendIcon(pitcher.yearOverYearTrends.byPitch[pitch.pitchType].changes.usage)}</span>
                          <span>{pitcher.yearOverYearTrends.byPitch[pitch.pitchType].changes.usage > 0 ? '+' : ''}{(pitcher.yearOverYearTrends.byPitch[pitch.pitchType].changes.usage * 100).toFixed(1)}%</span>
                        </div>
                        <div className="trend-item">
                          <span>Effectiveness: </span>
                          <span>{getTrendIcon(-pitcher.yearOverYearTrends.byPitch[pitch.pitchType].changes.effectiveness)}</span>
                          <span>{pitcher.yearOverYearTrends.byPitch[pitch.pitchType].changes.effectiveness < 0 ? 'Better' : 'Worse'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Overall Pitcher Trends */}
      {pitcher.yearOverYearTrends.overall && pitcher.yearOverYearTrends.overall.trend !== 'insufficient_data' && (
        <div className="pitcher-trends">
          <h4>Overall Pitcher Development</h4>
          <div className="trend-summary">
            <div className="trend-chart">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={pitcher.yearOverYearTrends.overall.yearlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgWOBAAgainst" stroke="#8884d8" name="wOBA Against" />
                  <Line type="monotone" dataKey="avgWhiffPercent" stroke="#82ca9d" name="Whiff %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="trend-narrative">
              <h5>Development Summary:</h5>
              <div className="improvements">
                {pitcher.yearOverYearTrends.overall.summary.improvements.map((improvement, idx) => (
                  <div key={idx} className="improvement-item">✅ {improvement}</div>
                ))}
              </div>
              <div className="regressions">
                {pitcher.yearOverYearTrends.overall.summary.regressions.map((regression, idx) => (
                  <div key={idx} className="regression-item">⚠️ {regression}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const MatchupsTab = () => (
    <div className="matchups-tab">
      <div className="team-summary">
        <h3>Team Matchup Summary</h3>
        <div className="summary-stats">
          <div className="summary-card favorable">
            <span className="summary-number">{teamSummary.favorableMatchups}</span>
            <span className="summary-label">Favorable Matchups</span>
          </div>
          <div className="summary-card difficult">
            <span className="summary-number">{teamSummary.difficultMatchups}</span>
            <span className="summary-label">Difficult Matchups</span>
          </div>
          <div className="summary-card neutral">
            <span className="summary-number">{hitters.length - teamSummary.favorableMatchups - teamSummary.difficultMatchups}</span>
            <span className="summary-label">Neutral Matchups</span>
          </div>
          <div className="summary-card average">
            <span className="summary-number">{teamSummary.averageAdvantage.toFixed(2)}</span>
            <span className="summary-label">Avg Advantage</span>
          </div>
        </div>
      </div>

      {/* Hitter Matchup List */}
      <div className="hitter-matchups">
        <h4>Individual Hitter Analysis</h4>
        <div className="hitter-list">
          {hitters
            .sort((a, b) => b.overallAssessment.overallAdvantage - a.overallAssessment.overallAdvantage)
            .map((hitter, index) => (
            <div 
              key={index} 
              className={`hitter-card ${selectedHitter === index ? 'selected' : ''}`}
              onClick={() => setSelectedHitter(selectedHitter === index ? null : index)}
            >
              <div className="hitter-header">
                <div className="hitter-name">{hitter.hitter}</div>
                <div className="hitter-team">{hitter.team}</div>
                <div 
                  className="advantage-score"
                  style={{ color: getAdvantageColor(hitter.overallAssessment.overallAdvantage) }}
                >
                  {hitter.overallAssessment.overallAdvantage > 0 ? '+' : ''}{hitter.overallAssessment.overallAdvantage.toFixed(2)}
                </div>
              </div>
              
              <div className="matchup-summary">
                <span className="strengths">⚡ {hitter.overallAssessment.strengthCount} strengths</span>
                <span className="weaknesses">🎯 {hitter.overallAssessment.weaknessCount} weaknesses</span>
                <span className="confidence">📊 {(hitter.confidence * 100).toFixed(0)}% confidence</span>
              </div>

              {selectedHitter === index && (
                <div className="hitter-details">
                  <div className="pitch-matchups">
                    <h5>Pitch-by-Pitch Breakdown</h5>
                    <div className="pitch-matchup-grid">
                      {hitter.pitchMatchups.map((matchup, pitchIdx) => (
                        <div key={pitchIdx} className="pitch-matchup-item">
                          <div className="pitch-info">
                            <span className="pitch-name">{matchup.pitchName}</span>
                            <span className="pitcher-usage">{(matchup.pitcherUsage * 100).toFixed(1)}%</span>
                          </div>
                          <div 
                            className="matchup-advantage"
                            style={{ color: getAdvantageColor(matchup.matchupAdvantage) }}
                          >
                            {matchup.matchupAdvantage > 0 ? '+' : ''}{matchup.matchupAdvantage.toFixed(2)}
                          </div>
                          {matchup.hitterPerformance && (
                            <div className="performance-stats">
                              <span>BA: {matchup.hitterPerformance.ba.toFixed(3)}</span>
                              <span>wOBA: {matchup.hitterPerformance.woba.toFixed(3)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Strengths & Weaknesses */}
                  <div className="strengths-weaknesses">
                    {hitter.overallAssessment.keyStrengths.length > 0 && (
                      <div className="strengths-section">
                        <h5>Key Strengths</h5>
                        {hitter.overallAssessment.keyStrengths.map((strength, idx) => (
                          <div key={idx} className="strength-item">
                            ⚡ Strong vs {strength.pitch} (+{strength.advantage.toFixed(2)})
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {hitter.overallAssessment.keyWeaknesses.length > 0 && (
                      <div className="weaknesses-section">
                        <h5>Key Weaknesses</h5>
                        {hitter.overallAssessment.keyWeaknesses.map((weakness, idx) => (
                          <div key={idx} className="weakness-item">
                            🎯 Vulnerable to {weakness.pitch} (-{weakness.disadvantage.toFixed(2)})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hitter Trends */}
                  {hitter.hitterTrends && hitter.hitterTrends.trend !== 'insufficient_data' && (
                    <div className="hitter-trends">
                      <h5>Development Trends</h5>
                      <div className="trend-summary-small">
                        <div className="trend-item">
                          Overall: {hitter.hitterTrends.summary.overall === 'improving' ? '📈 Improving' : 
                                   hitter.hitterTrends.summary.overall === 'declining' ? '📉 Declining' : '➡️ Stable'}
                        </div>
                        <div className="trend-item">
                          wOBA Change: {getTrendIcon(hitter.hitterTrends.overallTrend.woba)} 
                          {hitter.hitterTrends.overallTrend.woba > 0 ? '+' : ''}{hitter.hitterTrends.overallTrend.woba.toFixed(3)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const InsightsTab = () => (
    <div className="insights-tab">
      <h3>Strategic Insights</h3>
      
      <div className="insight-sections">
        {/* Top Targets */}
        <div className="insight-section">
          <h4>🎯 Priority Targets</h4>
          <p>Hitters most vulnerable to this pitcher's arsenal:</p>
          <div className="target-list">
            {teamSummary.topTargets.map((target, idx) => (
              <div key={idx} className="target-item">
                <span className="target-name">{target.name}</span>
                <span className="target-advantage" style={{ color: getAdvantageColor(target.advantage) }}>
                  {target.advantage.toFixed(2)} advantage to pitcher
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Toughest Matchups */}
        <div className="insight-section">
          <h4>⚠️ Challenging Matchups</h4>
          <p>Hitters who could exploit this pitcher's arsenal:</p>
          <div className="challenge-list">
            {teamSummary.toughestMatchups.map((challenge, idx) => (
              <div key={idx} className="challenge-item">
                <span className="challenge-name">{challenge.name}</span>
                <span className="challenge-disadvantage" style={{ color: getAdvantageColor(-challenge.disadvantage) }}>
                  {challenge.disadvantage.toFixed(2)} advantage to hitter
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Arsenal Recommendations */}
        <div className="insight-section">
          <h4>🎨 Arsenal Strategy</h4>
          <div className="arsenal-insights">
            <div className="primary-weapons">
              <h5>Primary Weapons</h5>
              {pitcher.primaryPitches.map((pitch, idx) => (
                <div key={idx} className="weapon-item">
                  <span className="weapon-name">{pitch.pitchName}</span>
                  <span className="weapon-usage">{(pitch.usage * 100).toFixed(1)}% usage</span>
                  <span 
                    className="weapon-effectiveness"
                    style={{ color: getPitchEffectivenessColor(pitch.runValuePer100) }}
                  >
                    {pitch.runValuePer100 > 0 ? 'Needs work' : 'Effective'}
                  </span>
                </div>
              ))}
            </div>

            {/* Pitch Development Areas */}
            {pitcher.yearOverYearTrends.overall && (
              <div className="development-areas">
                <h5>Development Focus</h5>
                {pitcher.yearOverYearTrends.overall.summary.regressions.length > 0 ? (
                  <div className="regression-focus">
                    <p>Areas needing attention:</p>
                    {pitcher.yearOverYearTrends.overall.summary.regressions.map((regression, idx) => (
                      <div key={idx} className="regression-item">⚠️ {regression}</div>
                    ))}
                  </div>
                ) : (
                  <div className="positive-development">
                    <p>✅ Strong development trajectory across all metrics</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Data Quality */}
        <div className="insight-section">
          <h4>📊 Analysis Confidence</h4>
          <div className="confidence-metrics">
            <div className="confidence-item">
              <span className="label">Pitcher Data Confidence:</span>
              <span className="value">{(analysisMetadata.pitcherConfidence * 100).toFixed(0)}%</span>
            </div>
            <div className="confidence-item">
              <span className="label">Average Hitter Confidence:</span>
              <span className="value">{(analysisMetadata.averageHitterConfidence * 100).toFixed(0)}%</span>
            </div>
            <div className="confidence-item">
              <span className="label">Total Pitcher Data Points:</span>
              <span className="value">{analysisMetadata.pitcherDataPoints.toLocaleString()}</span>
            </div>
            <div className="confidence-item">
              <span className="label">Analysis Years:</span>
              <span className="value">{analysisMetadata.activeYears.join(', ')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="arsenal-analysis-container">
      <div className="analysis-header">
        <h2>Arsenal Analysis: {pitcher.pitcher}</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="analysis-tabs">
        <button 
          className={`tab-btn ${activeTab === 'arsenal' ? 'active' : ''}`}
          onClick={() => setActiveTab('arsenal')}
        >
          Pitcher Arsenal
        </button>
        <button 
          className={`tab-btn ${activeTab === 'matchups' ? 'active' : ''}`}
          onClick={() => setActiveTab('matchups')}
        >
          Hitter Matchups
        </button>
        <button 
          className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          Strategic Insights
        </button>
      </div>

      <div className="analysis-content">
        {activeTab === 'arsenal' && <ArsenalTab />}
        {activeTab === 'matchups' && <MatchupsTab />}
        {activeTab === 'insights' && <InsightsTab />}
      </div>

      <style jsx>{`
        .arsenal-analysis-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 1000;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .analysis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 2px solid #e5e7eb;
          background: #f9fafb;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .analysis-header h2 {
          margin: 0;
          color: #1f2937;
          font-size: 1.5rem;
        }

        .close-btn {
          background: #ef4444;
          color: white;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .analysis-tabs {
          display: flex;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
          padding: 0 20px;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 12px 24px;
          cursor: pointer;
          font-weight: 600;
          color: #6b7280;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: #374151;
        }

        .tab-btn.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .analysis-content {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Arsenal Tab Styles */
        .pitcher-info h3 {
          color: #1f2937;
          margin-bottom: 16px;
        }

        .pitcher-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-box {
          background: #f3f4f6;
          padding: 16px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }

        .chart-container {
          margin: 24px 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .chart-container h4 {
          margin-top: 0;
          color: #1f2937;
        }

        .pitch-breakdown {
          margin-top: 24px;
        }

        .pitch-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .pitch-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pitch-card:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .pitch-card.expanded {
          border-color: #3b82f6;
          background: #f8fafc;
        }

        .pitch-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .pitch-name {
          display: flex;
          flex-direction: column;
        }

        .pitch-type {
          font-weight: 700;
          color: #1f2937;
        }

        .pitch-usage {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .effectiveness-indicator {
          padding: 4px 8px;
          border-radius: 4px;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .pitch-details {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .pitch-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .pitch-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .pitch-stat .label {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 2px;
        }

        .pitch-stat .value {
          font-weight: 600;
          color: #1f2937;
        }

        .pitch-trends {
          background: #f8fafc;
          padding: 12px;
          border-radius: 6px;
        }

        .pitch-trends h5 {
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .trend-indicators {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .trend-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.875rem;
        }

        .pitcher-trends {
          margin-top: 32px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .trend-summary {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          align-items: start;
        }

        .trend-narrative h5 {
          margin-top: 0;
          color: #1f2937;
        }

        .improvement-item {
          color: #059669;
          margin: 4px 0;
          font-size: 0.875rem;
        }

        .regression-item {
          color: #dc2626;
          margin: 4px 0;
          font-size: 0.875rem;
        }

        /* Matchups Tab Styles */
        .team-summary {
          margin-bottom: 32px;
        }

        .team-summary h3 {
          margin-bottom: 16px;
          color: #1f2937;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .summary-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .summary-card.favorable {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .summary-card.difficult {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .summary-card.neutral {
          border-color: #f59e0b;
          background: #fffbeb;
        }

        .summary-card.average {
          border-color: #6366f1;
          background: #f8fafc;
        }

        .summary-number {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
        }

        .summary-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 4px;
        }

        .hitter-matchups h4 {
          color: #1f2937;
          margin-bottom: 16px;
        }

        .hitter-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hitter-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .hitter-card:hover {
          border-color: #3b82f6;
          transform: translateX(4px);
        }

        .hitter-card.selected {
          border-color: #3b82f6;
          background: #f8fafc;
        }

        .hitter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .hitter-name {
          font-weight: 700;
          color: #1f2937;
        }

        .hitter-team {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .advantage-score {
          font-weight: 700;
          font-size: 1.125rem;
        }

        .matchup-summary {
          display: flex;
          gap: 16px;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .hitter-details {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .pitch-matchups h5 {
          margin: 0 0 12px 0;
          color: #1f2937;
        }

        .pitch-matchup-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .pitch-matchup-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
        }

        .pitch-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .pitch-name {
          font-weight: 600;
          color: #1f2937;
        }

        .pitcher-usage {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .matchup-advantage {
          font-weight: 700;
          font-size: 1.1rem;
          margin-bottom: 4px;
        }

        .performance-stats {
          display: flex;
          gap: 12px;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .strengths-weaknesses {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 16px;
        }

        .strengths-section, .weaknesses-section {
          background: #f9fafb;
          border-radius: 6px;
          padding: 12px;
        }

        .strengths-section h5, .weaknesses-section h5 {
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .strength-item {
          color: #059669;
          margin: 4px 0;
          font-size: 0.875rem;
        }

        .weakness-item {
          color: #dc2626;
          margin: 4px 0;
          font-size: 0.875rem;
        }

        .hitter-trends {
          margin-top: 16px;
          background: #f3f4f6;
          border-radius: 6px;
          padding: 12px;
        }

        .hitter-trends h5 {
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .trend-summary-small {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 0.875rem;
        }

        /* Insights Tab Styles */
        .insights-tab h3 {
          color: #1f2937;
          margin-bottom: 24px;
        }

        .insight-sections {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .insight-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
        }

        .insight-section h4 {
          margin: 0 0 12px 0;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .insight-section p {
          color: #6b7280;
          margin-bottom: 16px;
        }

        .target-list, .challenge-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .target-item, .challenge-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .target-name, .challenge-name {
          font-weight: 600;
          color: #1f2937;
        }

        .target-advantage, .challenge-disadvantage {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .arsenal-insights {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .primary-weapons, .development-areas {
          background: #f9fafb;
          border-radius: 6px;
          padding: 16px;
        }

        .primary-weapons h5, .development-areas h5 {
          margin: 0 0 12px 0;
          color: #1f2937;
        }

        .weapon-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .weapon-item:last-child {
          border-bottom: none;
        }

        .weapon-name {
          font-weight: 600;
          color: #1f2937;
        }

        .weapon-usage {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .weapon-effectiveness {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .regression-focus p {
          color: #dc2626;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .positive-development p {
          color: #059669;
          font-weight: 600;
        }

        .confidence-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .confidence-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .confidence-item .label {
          color: #6b7280;
        }

        .confidence-item .value {
          font-weight: 600;
          color: #1f2937;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #6b7280;
          font-size: 1.1rem;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .analysis-content {
            padding: 12px;
          }

          .pitcher-stats {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
          }

          .pitch-cards {
            grid-template-columns: 1fr;
          }

          .summary-stats {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
          }

          .trend-summary {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .arsenal-insights {
            grid-template-columns: 1fr;
          }

          .strengths-weaknesses {
            grid-template-columns: 1fr;
          }

          .pitch-matchup-grid {
            grid-template-columns: 1fr;
          }

          .confidence-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ArsenalAnalysisDisplay;