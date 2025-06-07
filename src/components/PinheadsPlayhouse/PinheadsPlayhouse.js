// PinheadsPlayhouse.js
// Complete React component matching Python HR prediction analysis

import React, { useState, useEffect, useCallback } from 'react';
//import './PinheadsPlayhouse.css';
import { initializeData } from './dataLoader';
import { processPitcherVsTeam } from './EnhancedMatchupAnalyzer';
import { createEnhancedPredictionsCSV, downloadCSV } from './EnhancedCSVGenerator';

const PinheadsPlayhouse = () => {
  // State for data
  const [masterPlayerData, setMasterPlayerData] = useState({});
  const [nameToPlayerIdMap, setNameToPlayerIdMap] = useState({});
  const [dailyGameData, setDailyGameData] = useState({});
  const [rostersData, setRostersData] = useState([]);
  const [historicalData, setHistoricalData] = useState({});
  const [leagueAvgStats, setLeagueAvgStats] = useState({});
  const [metricRanges, setMetricRanges] = useState({});
  
  // State for UI
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState(null);
  const [selectedPitcher, setSelectedPitcher] = useState('');
  const [opposingTeam, setOpposingTeam] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [csvExportData, setCsvExportData] = useState(null);
  
  // Get unique pitchers and teams from roster data
  const pitchers = React.useMemo(() => {
    return Object.values(masterPlayerData)
      .filter(player => player.roster_info?.type === 'pitcher')
      .map(player => ({
        id: player.roster_info.mlbam_id_resolved,
        name: player.roster_info.fullName_resolved || player.roster_info.fullName_cleaned,
        team: player.roster_info.team
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [masterPlayerData]);
  
  const teams = React.useMemo(() => {
    const teamSet = new Set();
    Object.values(masterPlayerData).forEach(player => {
      if (player.roster_info?.team) {
        teamSet.add(player.roster_info.team);
      }
    });
    return Array.from(teamSet).sort();
  }, [masterPlayerData]);
  
  // Load data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      setDataLoadError(null);
      
      try {
        console.log("Starting data initialization...");
        
        const {
          masterPlayerData: masterData,
          playerIdToNameMap,
          nameToPlayerIdMap: nameToIdMap,
          dailyGameData: dailyData,
          rostersData: rosters,
          historicalData: historical,
          leagueAvgStats: leagueAvg,
          metricRanges: ranges
        } = await initializeData('/data/', [2022, 2023, 2024, 2025]);
        
        console.log("Data initialization complete:", {
          players: Object.keys(masterData).length,
          dailyDates: Object.keys(dailyData).length,
          rosters: rosters.length
        });
        
        setMasterPlayerData(masterData);
        setNameToPlayerIdMap(nameToIdMap);
        setDailyGameData(dailyData);
        setRostersData(rosters);
        setHistoricalData(historical);
        setLeagueAvgStats(leagueAvg);
        setMetricRanges(ranges);
        
      } catch (error) {
        console.error("Failed to load data:", error);
        setDataLoadError(error.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAllData();
  }, []);
  
  // Run analysis
  const runAnalysis = useCallback(async () => {
    if (!selectedPitcher || !opposingTeam) {
      alert("Please select both a pitcher and opposing team");
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisResults([]);
    
    try {
      console.log(`Running analysis: ${selectedPitcher} vs ${opposingTeam}`);
      
      const predictions = await processPitcherVsTeam(
        selectedPitcher,
        opposingTeam,
        masterPlayerData,
        nameToPlayerIdMap,
        dailyGameData,
        rostersData,
        historicalData,
        leagueAvgStats,
        metricRanges
      );
      
      console.log(`Analysis complete: ${predictions.length} predictions`);
      
      setAnalysisResults(predictions);
      
      // Generate CSV data
      if (predictions.length > 0) {
        const csvString = createEnhancedPredictionsCSV(predictions);
        setCsvExportData({
          csv: csvString,
          filename: `analysis_enhanced_${selectedPitcher.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        });
      }
      
    } catch (error) {
      console.error("Analysis failed:", error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedPitcher, opposingTeam, masterPlayerData, nameToPlayerIdMap, dailyGameData, rostersData, historicalData, leagueAvgStats, metricRanges]);
  
  // Export CSV
  const handleExportCSV = () => {
    if (csvExportData) {
      downloadCSV(csvExportData.csv, csvExportData.filename);
    }
  };
  
  // Format number for display
  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return Number(value).toFixed(decimals);
  };
  
  // Format pitcher trend display
  const formatPitcherTrend = (pitcherData) => {
    const trends = pitcherData?.trends_summary_obj || {};
    if (!trends.trend_direction) return 'N/A';
    
    return `${trends.trend_direction} (${formatNumber(trends.avg_era, 3)} ERA)`;
  };
  
  if (isLoading) {
    return (
      <div className="pinheads-playhouse">
        <div className="loading-message">
          <h2>Loading Baseball Analysis System...</h2>
          <p>Initializing data...</p>
        </div>
      </div>
    );
  }
  
  if (dataLoadError) {
    return (
      <div className="pinheads-playhouse">
        <div className="error-message">
          <h2>Error Loading Data</h2>
          <p>{dataLoadError}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pinheads-playhouse">
      <header className="playhouse-header">
        <h1>🎯 Pinheads Playhouse</h1>
        <p>Advanced HR Prediction Analysis - Pitcher vs Team</p>
        <p className="header-stats">
          Loaded: {Object.keys(masterPlayerData).length} players • {pitchers.length} pitchers • {teams.length} teams • {Object.keys(dailyGameData).length} days of data
        </p>
      </header>
      
      <section className="analysis-controls">
        <div className="control-group">
          <label htmlFor="pitcher-select">Select Pitcher:</label>
          <select 
            id="pitcher-select"
            value={selectedPitcher} 
            onChange={(e) => setSelectedPitcher(e.target.value)}
            disabled={isAnalyzing}
          >
            <option value="">-- Select Pitcher --</option>
            {pitchers.map(pitcher => (
              <option key={pitcher.id} value={pitcher.name}>
                {pitcher.name} ({pitcher.team})
              </option>
            ))}
          </select>
        </div>
        
        <div className="control-group">
          <label htmlFor="team-select">Opposing Team:</label>
          <select 
            id="team-select"
            value={opposingTeam} 
            onChange={(e) => setOpposingTeam(e.target.value)}
            disabled={isAnalyzing}
          >
            <option value="">-- Select Team --</option>
            {teams.map(team => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          className="analyze-button"
          onClick={runAnalysis}
          disabled={isAnalyzing || !selectedPitcher || !opposingTeam}
        >
          {isAnalyzing ? '⏳ Analyzing...' : '▶️ Run Analysis'}
        </button>
      </section>
      
      {analysisResults.length > 0 && (
        <section className="results-section">
          <div className="results-header">
            <h2>
              Analysis Results: {selectedPitcher} vs {opposingTeam} 
              ({analysisResults.length} hitters)
            </h2>
            <button 
              className="export-button"
              onClick={handleExportCSV}
              disabled={!csvExportData}
            >
              📊 Export CSV
            </button>
          </div>
          
          <div className="results-filters">
            <label>
              Filters: 
              <span>All Trends</span>
            </label>
          </div>
          
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Batter</th>
                  <th>Hand</th>
                  <th>HR Score</th>
                  <th>HR %</th>
                  <th>Hit %</th>
                  <th>OB %</th>
                  <th>K %</th>
                  <th>PA</th>
                  <th>AB since HR</th>
                  <th>Exp AB/HR</th>
                  <th>AB Due</th>
                  <th>H since HR</th>
                  <th>Exp H/HR</th>
                  <th>H Due</th>
                  <th>Contact Trend</th>
                  <th>Heat</th>
                  <th>Cold</th>
                  <th>ISO 2024</th>
                  <th>ISO 2025</th>
                  <th>ISO Trend</th>
                  <th>Trend</th>
                  <th>HR Rate</th>
                  <th>AVG</th>
                  <th>Games</th>
                  <th>P Trend</th>
                  <th>Arsenal</th>
                  <th>Batter</th>
                  <th>Pitcher</th>
                  <th>Context</th>
                </tr>
              </thead>
              <tbody>
                {analysisResults.map((result, index) => {
                  const details = result.details || {};
                  const recentTrends = result.recent_N_games_raw_data?.trends_summary_obj || {};
                  const pitcherTrends = result.pitcher_recent_data?.trends_summary_obj || {};
                  const components = result.matchup_components || {};
                  
                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{result.batter_name}</td>
                      <td>{result.batter_hand}</td>
                      <td className="score-cell">{formatNumber(result.score, 2)}</td>
                      <td>{formatNumber(result.outcome_probabilities.homerun, 1)}</td>
                      <td>{formatNumber(result.outcome_probabilities.hit, 1)}</td>
                      <td>{formatNumber(result.outcome_probabilities.reach_base, 1)}</td>
                      <td>{formatNumber(result.outcome_probabilities.strikeout, 1)}</td>
                      <td>{details.batter_pa_2025 || 0}</td>
                      <td>{details.ab_since_last_hr !== undefined ? details.ab_since_last_hr : 'N/A'}</td>
                      <td>{details.expected_ab_per_hr !== undefined ? formatNumber(details.expected_ab_per_hr, 1) : 'N/A'}</td>
                      <td>{details.due_for_hr_ab_raw_score !== undefined ? formatNumber(details.due_for_hr_ab_raw_score, 1) : 'N/A'}</td>
                      <td>{details.h_since_last_hr !== undefined ? details.h_since_last_hr : 'N/A'}</td>
                      <td>{details.expected_h_per_hr !== undefined ? formatNumber(details.expected_h_per_hr, 1) : 'N/A'}</td>
                      <td>{details.due_for_hr_hits_raw_score !== undefined ? formatNumber(details.due_for_hr_hits_raw_score, 1) : 'N/A'}</td>
                      <td className="trend-cell">{details.contact_trend || 'stable'}</td>
                      <td>{formatNumber(details.heating_up_contact_raw_score, 0)}</td>
                      <td>{formatNumber(details.cold_batter_contact_raw_score, 0)}</td>
                      <td>{formatNumber(details.iso_2024, 3)}</td>
                      <td>{formatNumber(details.iso_2025_adj_for_trend, 3)}</td>
                      <td>{formatNumber(details.iso_trend_2025v2024, 3)}</td>
                      <td className="trend-cell">{recentTrends.trend_direction || 'stable'}</td>
                      <td>{formatNumber(recentTrends.hr_rate, 3)}</td>
                      <td>{formatNumber(recentTrends.avg_avg, 3)}</td>
                      <td>{recentTrends.total_games || 0}</td>
                      <td className="trend-cell">{pitcherTrends.trend_direction || 'stable'}</td>
                      <td>{formatNumber(components.arsenal_matchup, 1)}</td>
                      <td>{formatNumber(components.batter_overall, 1)}</td>
                      <td>{formatNumber(components.pitcher_overall, 1)}</td>
                      <td>{formatNumber(components.contextual, 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default PinheadsPlayhouse;