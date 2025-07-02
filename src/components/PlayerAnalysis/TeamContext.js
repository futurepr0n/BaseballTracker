import React from 'react';
import './TeamContext.css';

/**
 * TeamContext Component
 * 
 * Displays team-related context and performance data:
 * - Team overall statistics
 * - Home/Away splits
 * - Lineup position context
 * - Team offensive rankings
 * - Recent team performance trends
 */
const TeamContext = ({ teamSplits, player }) => {
  if (!teamSplits) {
    return (
      <div className="team-context loading">
        <div className="context-header">
          <h3>🏟️ Team Context</h3>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading team context data...</p>
        </div>
      </div>
    );
  }

  // Use real team context data from teamSplits
  const teamData = teamSplits || {
    overall: {
      record: 'N/A',
      runsPerGame: '0.0',
      teamBA: '.000',
      teamOPS: '.000',
      homeRecord: 'N/A',
      awayRecord: 'N/A'
    },
    rankings: {
      offense: 30,
      runs: 30,
      homeRuns: 30,
      battingAverage: 30,
      onBasePercentage: 30
    },
    recent: {
      last10: 'N/A',
      runsLast10: '0.0',
      trending: 'unknown'
    }
  };

  const getRankingColor = (rank) => {
    if (rank <= 5) return '#4caf50'; // Top 5 - Green
    if (rank <= 10) return '#ff9800'; // Top 10 - Orange
    if (rank <= 20) return '#2196f3'; // Top 20 - Blue
    return '#f44336'; // Bottom - Red
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="team-context">
      <div className="context-header">
        <h3>🏟️ Team Context</h3>
        <p>Team performance and situational factors for {player.team}</p>
      </div>

      <div className="context-grid">
        <div className="team-overview">
          <h4>📊 Team Overview</h4>
          <div className="overview-stats">
            <div className="stat-row">
              <span className="stat-label">Record:</span>
              <span className="stat-value">{teamData.overall.record}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Runs/Game:</span>
              <span className="stat-value">{teamData.overall.runsPerGame}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Team BA:</span>
              <span className="stat-value">{teamData.overall.teamBA}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Team OPS:</span>
              <span className="stat-value">{teamData.overall.teamOPS}</span>
            </div>
          </div>
        </div>

        <div className="home-away-splits">
          <h4>🏠 Home/Away Splits</h4>
          <div className="splits-comparison">
            <div className="split-item home">
              <div className="split-header">
                <span className="split-icon">🏠</span>
                <span className="split-label">Home</span>
              </div>
              <div className="split-record">{teamData.overall.homeRecord}</div>
              <div className="split-stats">
                <div className="split-stat">
                  <span>AVG: {teamData.overall.teamBA ? parseFloat(teamData.overall.teamBA).toFixed(3) : '.000'}</span>
                </div>
                <div className="split-stat">
                  <span>Runs/G: {teamData.overall.runsPerGame || '0.0'}</span>
                </div>
              </div>
            </div>

            <div className="split-item away">
              <div className="split-header">
                <span className="split-icon">✈️</span>
                <span className="split-label">Away</span>
              </div>
              <div className="split-record">{teamData.overall.awayRecord}</div>
              <div className="split-stats">
                <div className="split-stat">
                  <span>OPS: {teamData.overall.teamOPS ? parseFloat(teamData.overall.teamOPS).toFixed(3) : '.000'}</span>
                </div>
                <div className="split-stat">
                  <span>Trend: {teamData.recent.trending === 'up' ? '📈' : teamData.recent.trending === 'down' ? '📉' : '➡️'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="team-rankings">
          <h4>🏆 MLB Rankings</h4>
          <div className="rankings-grid">
            <div className="ranking-item">
              <span className="ranking-label">Overall Offense</span>
              <span 
                className="ranking-value"
                style={{ color: getRankingColor(teamData.rankings.offense) }}
              >
                #{teamData.rankings.offense}
              </span>
            </div>
            <div className="ranking-item">
              <span className="ranking-label">Runs Scored</span>
              <span 
                className="ranking-value"
                style={{ color: getRankingColor(teamData.rankings.runs) }}
              >
                #{teamData.rankings.runs}
              </span>
            </div>
            <div className="ranking-item">
              <span className="ranking-label">Home Runs</span>
              <span 
                className="ranking-value"
                style={{ color: getRankingColor(teamData.rankings.homeRuns) }}
              >
                #{teamData.rankings.homeRuns}
              </span>
            </div>
            <div className="ranking-item">
              <span className="ranking-label">Batting Average</span>
              <span 
                className="ranking-value"
                style={{ color: getRankingColor(teamData.rankings.battingAverage) }}
              >
                #{teamData.rankings.battingAverage}
              </span>
            </div>
            <div className="ranking-item">
              <span className="ranking-label">On-Base %</span>
              <span 
                className="ranking-value"
                style={{ color: getRankingColor(teamData.rankings.onBasePercentage) }}
              >
                #{teamData.rankings.onBasePercentage}
              </span>
            </div>
          </div>
        </div>

        <div className="recent-form">
          <h4>
            {getTrendIcon(teamData.recent.trending)} Recent Performance
          </h4>
          <div className="form-stats">
            <div className="form-item">
              <span className="form-label">Last 10:</span>
              <span className="form-value">{teamData.recent.last10 || '5-5'}</span>
            </div>
            <div className="form-item">
              <span className="form-label">R/G (L10):</span>
              <span className="form-value">{teamData.recent.runsLast10 || teamData.overall.runsPerGame}</span>
            </div>
            <div className="form-item">
              <span className="form-label">Trend:</span>
              <span className={`form-value trend-${teamData.recent.trending}`}>
                {teamData.recent.trending === 'up' ? '🔥 Hot' : 
                 teamData.recent.trending === 'down' ? '❄️ Cold' : '➡️ Stable'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="context-insights">
        <div className="insight-card">
          <h5>💡 Key Insights</h5>
          <ul className="insights-list">
            <li>
              Strong home performance ({teamData.overall.homeRecord}) suggests 
              favorable conditions for {player.name} at home venue
            </li>
            <li>
              Top-{teamData.rankings.homeRuns} power ranking indicates good 
              lineup protection and HR-friendly approach
            </li>
            <li>
              Recent {teamData.recent.trending === 'up' ? 'hot' : 'cold'} streak 
              ({teamData.recent.last10}) may impact individual player confidence
            </li>
            <li>
              Team OPS of {teamData.overall.teamOPS} ranks in 
              {teamData.rankings.offense <= 10 ? 'top third' : 'middle tier'} 
              of MLB offenses
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TeamContext;