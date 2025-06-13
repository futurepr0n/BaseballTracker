// Create this file at: src/components/PitcherArsenalDisplay/PitcherArsenalDisplay.js

import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import './PitcherArsenalDisplay.css';

// Utility function to load and parse CSV data
const loadArsenalData = async (year = 2025) => {
  try {
    const [pitcherResponse, hitterResponse] = await Promise.all([
      fetch(`/data/stats/pitcherpitcharsenalstats_${year}.csv`),
      fetch(`/data/stats/hitterpitcharsenalstats_${year}.csv`)
    ]);

    if (!pitcherResponse.ok || !hitterResponse.ok) {
      throw new Error('Failed to load arsenal data');
    }

    const [pitcherText, hitterText] = await Promise.all([
      pitcherResponse.text(),
      hitterResponse.text()
    ]);

    // Parse CSV data
    const pitcherData = Papa.parse(pitcherText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim()
    });

    const hitterData = Papa.parse(hitterText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim()
    });

    // Create lookup maps for efficient access
    const pitcherArsenalMap = new Map();
    const hitterArsenalMap = new Map();

    // Process pitcher data
    pitcherData.data.forEach(row => {
      const fullName = row['last_name, first_name'];
      const playerId = row.player_id;
      const key = `${playerId}_${row.team_name_alt}`;
      
      if (!pitcherArsenalMap.has(key)) {
        pitcherArsenalMap.set(key, {
          playerId,
          fullName,
          team: row.team_name_alt,
          pitches: []
        });
      }
      
      pitcherArsenalMap.get(key).pitches.push({
        pitch_type: row.pitch_type,
        pitch_name: row.pitch_name,
        pitch_usage: row.pitch_usage,
        pitches: row.pitches,
        pa: row.pa,
        ba: row.ba,
        slg: row.slg,
        woba: row.woba,
        whiff_percent: row.whiff_percent,
        k_percent: row.k_percent,
        put_away: row.put_away,
        est_ba: row.est_ba,
        est_slg: row.est_slg,
        est_woba: row.est_woba,
        hard_hit_percent: row.hard_hit_percent,
        run_value_per_100: row.run_value_per_100,
        run_value: row.run_value
      });
    });

    // Process hitter data
    hitterData.data.forEach(row => {
      const fullName = row['last_name, first_name'];
      const playerId = row.player_id;
      const key = `${playerId}_${row.team_name_alt}`;
      
      if (!hitterArsenalMap.has(key)) {
        hitterArsenalMap.set(key, {
          playerId,
          fullName,
          team: row.team_name_alt,
          pitchStats: {}
        });
      }
      
      hitterArsenalMap.get(key).pitchStats[row.pitch_type] = {
        pitch_name: row.pitch_name,
        pitches: row.pitches,
        pa: row.pa,
        ba: row.ba,
        slg: row.slg,
        woba: row.woba,
        whiff_percent: row.whiff_percent,
        k_percent: row.k_percent,
        hard_hit_percent: row.hard_hit_percent,
        run_value_per_100: row.run_value_per_100
      };
    });

    return {
      pitcherArsenalMap,
      hitterArsenalMap,
      rawPitcherData: pitcherData.data,
      rawHitterData: hitterData.data
    };
  } catch (error) {
    console.error('Error loading arsenal data:', error);
    return {
      pitcherArsenalMap: new Map(),
      hitterArsenalMap: new Map(),
      rawPitcherData: [],
      rawHitterData: []
    };
  }
};

// Helper function to find pitcher data by name and team
const findPitcherArsenal = (pitcherArsenalMap, pitcherName, team) => {
  // Try to find by exact match first
  for (const [key, data] of pitcherArsenalMap) {
    if (data.team === team && 
        (data.fullName.includes(pitcherName) || 
         pitcherName.includes(data.fullName.split(',')[0].trim()))) {
      return data.pitches;
    }
  }
  
  // Try fuzzy match
  for (const [key, data] of pitcherArsenalMap) {
    const lastName = data.fullName.split(',')[0].trim().toLowerCase();
    if (data.team === team && pitcherName.toLowerCase().includes(lastName)) {
      return data.pitches;
    }
  }
  
  return null;
};

// Component to display pitcher's arsenal with detailed stats
const PitcherArsenalDisplay = ({ pitcher, opponentBatters = [] }) => {
  const [arsenalData, setArsenalData] = useState(null);
  const [expandedView, setExpandedView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Map pitch types to display names and colors
  const pitchTypeConfig = {
    'FF': { name: '4-Seam', color: '#ff4444', emoji: '🔥' },
    'SI': { name: 'Sinker', color: '#ff6644', emoji: '📉' },
    'FC': { name: 'Cutter', color: '#ff8844', emoji: '✂️' },
    'SL': { name: 'Slider', color: '#4488ff', emoji: '↗️' },
    'CU': { name: 'Curve', color: '#44aaff', emoji: '🌙' },
    'CH': { name: 'Change', color: '#44ff88', emoji: '🎭' },
    'FS': { name: 'Splitter', color: '#88ff44', emoji: '🔻' },
    'KC': { name: 'Knuckle Curve', color: '#8844ff', emoji: '🌀' },
    'KN': { name: 'Knuckle', color: '#ff44ff', emoji: '🦋' }
  };

  // Load arsenal data when component mounts or pitcher changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const { pitcherArsenalMap, hitterArsenalMap } = await loadArsenalData();
      
      // Find pitcher's arsenal
      const pitcherStats = findPitcherArsenal(
        pitcherArsenalMap, 
        pitcher.fullName || pitcher.name, 
        pitcher.team
      );
      
      if (pitcherStats) {
        setArsenalData({
          pitcherStats,
          hitterArsenalMap
        });
      }
      
      setIsLoading(false);
    };
    
    if (pitcher) {
      loadData();
    }
  }, [pitcher]);

  // Calculate effectiveness rating for each pitch
  const getPitchEffectiveness = (stats) => {
    // Lower is better for these metrics from pitcher perspective
    const score = (
      (1 - stats.ba) * 0.3 +
      (1 - stats.slg) * 0.3 +
      (stats.whiff_percent / 100) * 0.2 +
      (stats.k_percent / 100) * 0.2
    );
    
    if (score >= 0.7) return { rating: 'Elite', color: '#10b981' };
    if (score >= 0.6) return { rating: 'Good', color: '#3b82f6' };
    if (score >= 0.5) return { rating: 'Average', color: '#f59e0b' };
    return { rating: 'Below Avg', color: '#ef4444' };
  };

  // Get matchup advantage for specific batter vs pitch type
  const getBatterMatchup = (pitchType, batterName, batterTeam) => {
    if (!arsenalData?.hitterArsenalMap || !batterName) return null;
    
    // Find batter in the map
    for (const [key, data] of arsenalData.hitterArsenalMap) {
      if (data.team === batterTeam && 
          (data.fullName.includes(batterName) || 
           batterName.includes(data.fullName.split(',')[0].trim()))) {
        const batterVsPitch = data.pitchStats[pitchType];
        if (batterVsPitch) {
          return batterVsPitch;
        }
      }
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="pitcher-arsenal-display">
        <div className="arsenal-loading">Loading arsenal data...</div>
      </div>
    );
  }

  if (!arsenalData?.pitcherStats || arsenalData.pitcherStats.length === 0) {
    return (
      <div className="pitcher-arsenal-display">
        <div className="arsenal-no-data">No arsenal data available for {pitcher.name}</div>
      </div>
    );
  }

  const pitcherStats = arsenalData.pitcherStats;

  return (
    <div className="pitcher-arsenal-display">
      <div className="arsenal-header">
        <h4 className="arsenal-title">
          ⚾ {pitcher.name}'s Arsenal
          <span className="pitch-count-label">({pitcherStats.length} pitches)</span>
        </h4>
        <button
          onClick={() => setExpandedView(!expandedView)}
          className="view-toggle-btn"
        >
          {expandedView ? 'Compact' : 'Detailed'} View
        </button>
      </div>

      {/* Compact View - Pitch Usage Bar */}
      <div className="pitch-usage-bar">
        <div className="usage-bar">
          {pitcherStats
            .sort((a, b) => b.pitch_usage - a.pitch_usage)
            .map((pitch, idx) => {
              const config = pitchTypeConfig[pitch.pitch_type] || { 
                name: pitch.pitch_type, 
                color: '#666', 
                emoji: '⚾' 
              };
              return (
                <div
                  key={idx}
                  className="usage-segment"
                  style={{
                    width: `${pitch.pitch_usage}%`,
                    backgroundColor: config.color,
                  }}
                  title={`${config.name}: ${pitch.pitch_usage.toFixed(1)}%`}
                >
                  <span className="usage-emoji">
                    {pitch.pitch_usage > 10 && config.emoji}
                  </span>
                </div>
              );
            })}
        </div>
        <div className="usage-labels">
          <span>Primary</span>
          <span>Secondary</span>
        </div>
      </div>

      {/* Pitch Details Grid */}
      <div className={`pitch-grid ${expandedView ? 'expanded' : 'compact'}`}>
        {pitcherStats
          .sort((a, b) => b.pitch_usage - a.pitch_usage)
          .map((pitch, idx) => {
            const config = pitchTypeConfig[pitch.pitch_type] || { 
              name: pitch.pitch_type, 
              color: '#666', 
              emoji: '⚾' 
            };
            const effectiveness = getPitchEffectiveness(pitch);

            return (
              <div key={idx} className="pitch-card">
                {/* Pitch Header */}
                <div className="pitch-header">
                  <div className="pitch-info">
                    <span className="pitch-emoji">{config.emoji}</span>
                    <div>
                      <div className="pitch-name">
                        {pitch.pitch_name || config.name}
                      </div>
                      <div className="pitch-usage">
                        {pitch.pitch_usage.toFixed(1)}% usage ({pitch.pitches} thrown)
                      </div>
                    </div>
                  </div>
                  <div 
                    className="effectiveness-badge"
                    style={{ backgroundColor: effectiveness.color + '20', color: effectiveness.color }}
                  >
                    {effectiveness.rating}
                  </div>
                </div>

                {/* Key Stats */}
                <div className="pitch-stats">
                  <div className="stat-item">
                    <div className="stat-label">Whiff%</div>
                    <div className="stat-value">
                      {pitch.whiff_percent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">K%</div>
                    <div className="stat-value">
                      {pitch.k_percent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Hard Hit%</div>
                    <div className="stat-value">
                      {pitch.hard_hit_percent.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                {expandedView && (
                  <div className="detailed-stats">
                    <div className="performance-stats">
                      <div className="perf-stat">
                        <span className="perf-label">BA:</span>
                        <span className="perf-value">{pitch.ba.toFixed(3)}</span>
                      </div>
                      <div className="perf-stat">
                        <span className="perf-label">SLG:</span>
                        <span className="perf-value">{pitch.slg.toFixed(3)}</span>
                      </div>
                      <div className="perf-stat">
                        <span className="perf-label">wOBA:</span>
                        <span className="perf-value">{pitch.woba.toFixed(3)}</span>
                      </div>
                    </div>
                    <div className="run-value">
                      <span className="rv-label">Run Value/100:</span>
                      <span className={`rv-value ${pitch.run_value_per_100 < 0 ? 'positive' : 'negative'}`}>
                        {pitch.run_value_per_100.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Opponent Matchups (if provided) */}
                {expandedView && opponentBatters.length > 0 && (
                  <div className="opponent-matchups">
                    <div className="matchup-header">vs Opponent:</div>
                    <div className="matchup-list">
                      {opponentBatters.slice(0, 3).map((batter, bIdx) => {
                        const matchup = getBatterMatchup(pitch.pitch_type, batter.name, batter.team);
                        if (!matchup) return null;
                        
                        return (
                          <div key={bIdx} className="matchup-item">
                            <span className="batter-name">{batter.name}</span>
                            <span className={`matchup-woba ${matchup.woba > pitch.woba ? 'negative' : 'positive'}`}>
                              {matchup.woba.toFixed(3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Summary Stats */}
      <div className="arsenal-summary">
        <div className="summary-title">📊 Arsenal Summary</div>
        <div className="summary-grid">
          <div className="summary-stat">
            <span className="summary-label">Avg Whiff%:</span>
            <span className="summary-value">
              {(pitcherStats.reduce((sum, p) => sum + p.whiff_percent * p.pitch_usage, 0) / 
                pitcherStats.reduce((sum, p) => sum + p.pitch_usage, 0)).toFixed(1)}%
            </span>
          </div>
          <div className="summary-stat">
            <span className="summary-label">Avg K%:</span>
            <span className="summary-value">
              {(pitcherStats.reduce((sum, p) => sum + p.k_percent * p.pitch_usage, 0) / 
                pitcherStats.reduce((sum, p) => sum + p.pitch_usage, 0)).toFixed(1)}%
            </span>
          </div>
          <div className="summary-stat">
            <span className="summary-label">Primary Pitch:</span>
            <span className="summary-value">
              {pitcherStats[0].pitch_name} ({pitcherStats[0].pitch_usage.toFixed(0)}%)
            </span>
          </div>
          <div className="summary-stat">
            <span className="summary-label">Pitch Mix:</span>
            <span className="summary-value">
              {pitcherStats.length} pitches
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PitcherArsenalDisplay;