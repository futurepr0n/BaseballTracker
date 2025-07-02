import React from 'react';
import './MatchupAnalysis.css';

/**
 * MatchupAnalysis Component
 * 
 * Replicates the detailed matchup tables from the image:
 * - Batter vs Pitcher comparison (Aaron Judge RHB vs Max Scherzer RHP)
 * - Multiple statistical categories (H/AB, BA, SLG, ISO, wOBA, etc.)
 * - Team context and handedness splits
 * - Advanced metrics and percentiles
 */
const MatchupAnalysis = ({ player, matchupContext, splitAnalysis }) => {
  // Use actual pitcher data from matchup context or fallback to placeholder
  const pitcher = matchupContext?.pitcherMatchup || {
    name: 'TBD',
    handedness: 'RHP',
    team: matchupContext?.opponent || 'OPP',
    era: 'N/A',
    whip: 'N/A',
    k9: 'N/A',
    hr9: 'N/A',
    gamesPitched: 0
  };

  // Use real matchup statistics from splitAnalysis
  const matchupStats = splitAnalysis?.matchupStats || {
    season: {
      hab: 'N/A',
      ba: '.000',
      slg: '.000',
      iso: '.000',
      woba: '.000',
      k_rate: '0.0%',
      bb_rate: '0.0%'
    },
    vsTopRP: {
      hab: 'N/A',
      ba: '.000',
      slg: '.000',
      iso: '.000',
      woba: '.000',
      k_rate: '0.0%',
      bb_rate: '0.0%'
    },
    vsLHP: {
      hab: 'N/A',
      ba: '.000',
      slg: '.000',
      iso: '.000',
      woba: '.000',
      k_rate: '0.0%',
      bb_rate: '0.0%'
    },
    vsRHP: {
      hab: 'N/A',
      ba: '.000',
      slg: '.000',
      iso: '.000',
      woba: '.000',
      k_rate: '0.0%',
      bb_rate: '0.0%'
    }
  };

  const getStatColor = (value, stat) => {
    // Color coding based on performance levels
    const numValue = parseFloat(value);
    
    switch (stat) {
      case 'ba':
        if (numValue >= 0.300) return '#4caf50';
        if (numValue >= 0.250) return '#ff9800';
        return '#f44336';
      case 'slg':
        if (numValue >= 0.500) return '#4caf50';
        if (numValue >= 0.400) return '#ff9800';
        return '#f44336';
      case 'iso':
        if (numValue >= 0.200) return '#4caf50';
        if (numValue >= 0.150) return '#ff9800';
        return '#f44336';
      case 'woba':
        if (numValue >= 0.370) return '#4caf50';
        if (numValue >= 0.320) return '#ff9800';
        return '#f44336';
      default:
        return 'inherit';
    }
  };

  if (!matchupContext && !splitAnalysis) {
    return (
      <div className="matchup-analysis loading">
        <div className="analysis-header">
          <h3>🆚 Matchup Analysis</h3>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading matchup data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="matchup-analysis">
      <div className="analysis-header">
        <h3>🆚 Matchup Analysis</h3>
        <p>Detailed statistical breakdown vs pitcher types</p>
      </div>

      <div className="matchup-title">
        <div className="batter-info">
          <h4>{player.name} <span className="handedness">RHB</span></h4>
          <p>{player.team} • Right-handed Batter</p>
        </div>
        <div className="vs-indicator">vs</div>
        <div className="pitcher-info">
          <h4>{pitcher.name} <span className="handedness">{pitcher.handedness || 'RHP'}</span></h4>
          <p>{pitcher.team} • {pitcher.era !== 'N/A' ? `${pitcher.era} ERA` : ''} • {pitcher.whip !== 'N/A' ? `${pitcher.whip} WHIP` : ''}</p>
        </div>
      </div>

      <div className="stats-tables">
        <div className="primary-table">
          <h5>Core Performance Metrics</h5>
          <table className="matchup-table">
            <thead>
              <tr>
                <th>Split</th>
                <th>H/AB</th>
                <th>BA</th>
                <th>SLG</th>
                <th>ISO</th>
                <th>wOBA</th>
                <th>K%</th>
                <th>BB%</th>
              </tr>
            </thead>
            <tbody>
              <tr className="season-row">
                <td className="split-label">Season</td>
                <td className="hab-stat">{matchupStats.season.hab}</td>
                <td style={{ color: getStatColor(matchupStats.season.ba, 'ba') }}>
                  {matchupStats.season.ba}
                </td>
                <td style={{ color: getStatColor(matchupStats.season.slg, 'slg') }}>
                  {matchupStats.season.slg}
                </td>
                <td style={{ color: getStatColor(matchupStats.season.iso, 'iso') }}>
                  {matchupStats.season.iso}
                </td>
                <td style={{ color: getStatColor(matchupStats.season.woba, 'woba') }}>
                  {matchupStats.season.woba}
                </td>
                <td>{matchupStats.season.k_rate}</td>
                <td>{matchupStats.season.bb_rate}</td>
              </tr>
              <tr className="vs-top-rp-row">
                <td className="split-label">vs TOP RP</td>
                <td className="hab-stat">{matchupStats.vsTopRP.hab}</td>
                <td style={{ color: getStatColor(matchupStats.vsTopRP.ba, 'ba') }}>
                  {matchupStats.vsTopRP.ba}
                </td>
                <td style={{ color: getStatColor(matchupStats.vsTopRP.slg, 'slg') }}>
                  {matchupStats.vsTopRP.slg}
                </td>
                <td style={{ color: getStatColor(matchupStats.vsTopRP.iso, 'iso') }}>
                  {matchupStats.vsTopRP.iso}
                </td>
                <td style={{ color: getStatColor(matchupStats.vsTopRP.woba, 'woba') }}>
                  {matchupStats.vsTopRP.woba}
                </td>
                <td>{matchupStats.vsTopRP.k_rate}</td>
                <td>{matchupStats.vsTopRP.bb_rate}</td>
              </tr>
              <tr className={`vs-lhp-row ${pitcher.handedness === 'LHP' || pitcher.handedness === 'L' ? 'highlighted' : ''}`}>
                <td className="split-label">vs LHP</td>
                <td className="hab-stat">{matchupStats.vsLHP.hab}</td>
                <td style={{ color: getStatColor(matchupStats.vsLHP.ba, 'ba') }}>
                  {matchupStats.vsLHP.ba}
                </td>
                <td style={{ color: getStatColor(matchupStats.vsLHP.slg, 'slg') }}>
                  {matchupStats.vsLHP.slg}
                </td>
                <td style={{ color: getStatColor(matchupStats.vsLHP.iso, 'iso') }}>
                  {matchupStats.vsLHP.iso}
                </td>
                <td style={{ color: getStatColor(matchupStats.vsLHP.woba, 'woba') }}>
                  {matchupStats.vsLHP.woba}
                </td>
                <td>{matchupStats.vsLHP.k_rate}</td>
                <td>{matchupStats.vsLHP.bb_rate}</td>
              </tr>
              <tr className={`vs-rhp-row ${pitcher.handedness === 'RHP' || pitcher.handedness === 'R' ? 'highlighted' : ''}`}>
                <td className="split-label">vs RHP</td>
                <td className="hab-stat">{matchupStats.vsRHP.hab}</td>
                <td style={{ color: getStatColor(matchupStats.vsRHP.ba, 'ba') }}>
                  {matchupStats.vsRHP.ba}
                </td>
                <td style={{ color: getStatColor(matchupStats.vsRHP.slg, 'slg') }}>
                  {matchupStats.vsRHP.slg}
                </td>
                <td style={{ color: getStatColor(matchupStats.vsRHP.iso, 'iso') }}>
                  {matchupStats.vsRHP.iso}
                </td>
                <td style={{ color: getStatColor(matchupStats.vsRHP.woba, 'woba') }}>
                  {matchupStats.vsRHP.woba}
                </td>
                <td>{matchupStats.vsRHP.k_rate}</td>
                <td>{matchupStats.vsRHP.bb_rate}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="analysis-insights">
          <div className="insight-card advantage">
            <h6>🎯 Matchup Advantage</h6>
            <p>
              Strong performance vs RHP with {matchupStats.vsRHP.ba} BA and {matchupStats.vsRHP.slg} SLG. 
              ISO of {matchupStats.vsRHP.iso} indicates good power potential against right-handed pitching.
            </p>
          </div>

          <div className="insight-card trends">
            <h6>📈 Recent Trends</h6>
            <p>
              {player.recentStats?.AVG > 0.280 ? 'Hot batting streak' : 'Recent cold spell'} with recent form 
              {player.recentStats?.AVG > 0.280 ? ' favoring' : ' challenging'} this matchup scenario.
            </p>
          </div>

          <div className="insight-card pitcher-context">
            <h6>⚾ Pitcher Context</h6>
            <p>
              {pitcher.name !== 'TBD' ? (
                <>
                  {pitcher.name} {pitcher.era !== 'N/A' ? `has ${pitcher.era} ERA` : ''} 
                  {pitcher.hr9 !== 'N/A' ? ` and ${pitcher.hr9} HR/9 rate. ` : '. '}
                  {pitcher.hr9 !== 'N/A' && parseFloat(pitcher.hr9) > 1.0 ? ' Vulnerable to power hitters.' : 
                   pitcher.hr9 !== 'N/A' ? ' Strong command with low HR rate.' : ''}
                </>
              ) : (
                'Opposing pitcher to be determined. Check lineup closer to game time.'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="matchup-summary">
        <div className="summary-rating">
          <span className="rating-label">Matchup Rating:</span>
          <span className="rating-value favorable">
            {parseFloat(matchupStats.vsRHP.woba) > 0.350 ? 'Favorable' : 
             parseFloat(matchupStats.vsRHP.woba) > 0.320 ? 'Neutral' : 'Difficult'}
          </span>
        </div>
        <div className="key-factors">
          <span className="factors-label">Key Factors:</span>
          <span className="factors-list">
            Handedness Match • Power vs Control • Recent Form • Stadium Context
          </span>
        </div>
      </div>
    </div>
  );
};

export default MatchupAnalysis;