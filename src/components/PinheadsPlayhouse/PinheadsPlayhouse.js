import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBaseballAnalysis } from '../../services/baseballAnalysisService';
import './PinheadsPlayhouse.css';


const SearchableDropdown = ({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  displayKey = 'label', 
  valueKey = 'value',
  showSecondary = false,
  secondaryKey = 'secondary'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    
    const term = searchTerm.toLowerCase();
    return options.filter(option => {
      const display = option[displayKey]?.toLowerCase() || '';
      const value = option[valueKey]?.toLowerCase() || '';
      const secondary = option[secondaryKey]?.toLowerCase() || '';
      return display.includes(term) || value.includes(term) || secondary.includes(term);
    });
  }, [options, searchTerm, displayKey, valueKey, secondaryKey]);

  const handleSelect = (option) => {
    onChange(option[valueKey]);
    setSearchTerm(option[displayKey]);
    setIsOpen(false);
  };

  // Update search term when value changes externally
  useEffect(() => {
    const selected = options.find(opt => opt[valueKey] === value);
    if (selected) {
      setSearchTerm(selected[displayKey]);
    } else if (!isOpen) {
      setSearchTerm('');
    }
  }, [value, options, valueKey, displayKey, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.pitcher-search-group')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="pitcher-search-input"
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="search-dropdown">
          {filteredOptions.map((option, idx) => (
            <div
              key={idx}
              className="search-result"
              onClick={() => handleSelect(option)}
            >
              <span className="pitcher-name">{option[displayKey]}</span>
              {showSecondary && option[secondaryKey] && (
                <span className="pitcher-team">({option[secondaryKey]})</span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};


/**
 * PinheadsPlayhouse Component - FastAPI Backend Version
 * 
 * Now uses the FastAPI backend for all analysis instead of complex JavaScript calculations.
 * Provides a clean interface for baseball HR prediction and analysis.
 */



const PinheadsPlayhouse = () => {
  // API service hook
  const { 
    initialized, 
    loading: apiLoading, 
    error: apiError, 
    analyzePitcherVsTeam,
    batchAnalysis,
    searchPlayers,
    service
  } = useBaseballAnalysis();

  // Component state
  const [analysisType, setAnalysisType] = useState('single'); // 'single' or 'batch'

  const [teamsData, setTeamsData] = useState({});
  const [rostersData, setRostersData] = useState([]);

  const [singleAnalysisParams, setSingleAnalysisParams] = useState({
    pitcherName: '',
    teamAbbr: '',
    sortBy: 'hr',
    ascending: false,
    limit: 20,
    detailed: false
  });

  const [batchMatchups, setBatchMatchups] = useState([
    { pitcher_name: '', team_abbr: '' }
  ]);

  const [batchParams, setBatchParams] = useState({
    sortBy: 'hr',
    ascending: false,
    limit: 50,
    applyFilters: null,
    hittersFilter: null
  });

  // Results state
  const [predictions, setPredictions] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Search state
  const [pitcherSearchTerm, setPitcherSearchTerm] = useState('');
  const [pitcherSearchResults, setPitcherSearchResults] = useState([]);
  const [showPitcherSearch, setShowPitcherSearch] = useState(false);

  // Dashboard filtering state
  const [dashboardFilters, setDashboardFilters] = useState({
    showStandoutOnly: false,
    showHotStreaksOnly: false,
    showHiddenGemsOnly: false,
    showRiskWarningsOnly: false,
    showSituationalOnly: false,
    minConfidenceBoost: null,
    categories: []
  });

  // Sort options
  const [sortOptions, setSortOptions] = useState({});
  const [selectedColumns, setSelectedColumns] = useState([
    'player_name', 'team', 'dashboard_badges', 'standout_score', 'hr_score', 'hr_probability', 'hit_probability', 
    'recent_avg', 'hr_rate', 'ab_due', 'arsenal_matchup', 'enhanced_confidence', 'category',
    'pitcher_hand', 'pitcher_trend_dir', 'pitcher_home_hr_total'
  ]);

  // Available columns for table display
  const availableColumns = [
    { key: 'player_name', label: 'Player', always: true },
    { key: 'team', label: 'Team', always: true },
    { key: 'batter_hand', label: 'B Hand' },
    { key: 'hr_score', label: 'HR Score', always: true },
    { key: 'hr_probability', label: 'HR Prob %' },
    { key: 'hit_probability', label: 'Hit Prob %' },
    { key: 'reach_base_probability', label: 'Reach Base %' },
    { key: 'strikeout_probability', label: 'K Prob %' },
    { key: 'recent_avg', label: 'Recent Avg' },
    { key: 'hr_rate', label: 'HR Rate %' },
    { key: 'obp', label: 'OBP' },
    { key: 'ab_due', label: 'AB Due' },
    { key: 'hits_due', label: 'Hits Due' },
    { key: 'heating_up', label: 'Heating Up' },
    { key: 'cold', label: 'Cold' },
    { key: 'arsenal_matchup', label: 'Arsenal' },
    { key: 'batter_overall', label: 'Batter' },
    { key: 'pitcher_overall', label: 'Pitcher' },
    { key: 'historical_yoy_csv', label: 'Historical' },
    { key: 'recent_daily_games', label: 'Recent' },
    { key: 'contextual', label: 'Context' },
    { key: 'ab_since_last_hr', label: 'AB Since HR' },
    { key: 'expected_ab_per_hr', label: 'Exp AB/HR' },
    { key: 'h_since_last_hr', label: 'H Since HR' },
    { key: 'expected_h_per_hr', label: 'Exp H/HR' },
    { key: 'contact_trend', label: 'Contact Trend' },
    { key: 'iso_2024', label: 'ISO 2024' },
    { key: 'iso_2025', label: 'ISO 2025' },
    { key: 'iso_trend', label: 'ISO Trend' },
    { key: 'batter_pa_2025', label: 'PA 2025' },
    { key: 'ev_matchup_score', label: 'EV Matchup' },
    { key: 'hitter_slg', label: 'Hitter SLG' },
    { key: 'pitcher_slg', label: 'Pitcher SLG' },
    // Trend directions
    { key: 'recent_trend_dir', label: 'Recent Trend Dir' },
    // Pitcher information (same for all batters)
    { key: 'pitcher_hand', label: 'P Hand' },
    { key: 'pitcher_era', label: 'P ERA' },
    { key: 'pitcher_whip', label: 'P WHIP' },
    { key: 'pitcher_trend_dir', label: 'P Trend Dir' },
    { key: 'pitcher_h_per_game', label: 'P H/Game' },
    { key: 'pitcher_hr_per_game', label: 'P HR/Game' },
    { key: 'pitcher_k_per_game', label: 'P K/Game' },
    // Pitcher home stats (comprehensive data)
    { key: 'pitcher_home_h_total', label: 'P Home H Total' },
    { key: 'pitcher_home_hr_total', label: 'P Home HR Total' },
    { key: 'pitcher_home_k_total', label: 'P Home K Total' },
    { key: 'pitcher_home_games', label: 'P Home Games' },
    
    // Dashboard Context Columns (Enhanced Analysis)
    { key: 'dashboard_badges', label: 'Context', description: 'Dashboard context badges' },
    { key: 'standout_score', label: 'Standout Score', description: 'Enhanced score with dashboard context' },
    { key: 'enhanced_confidence', label: 'Enhanced Confidence', description: 'Confidence with dashboard boost' },
    { key: 'context_summary', label: 'Summary', description: 'Context summary' },
    { key: 'category', label: 'Category', description: 'Player category (Hidden Gem, High Confidence, etc.)' }
  ];

  // Load JSON data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamsResponse, rostersResponse] = await Promise.all([
          fetch('/data/teams.json'),
          fetch('/data/rosters.json')
        ]);

        if (!teamsResponse.ok || !rostersResponse.ok) {
          throw new Error('Failed to load data files');
        }

        const teams = await teamsResponse.json();
        const rosters = await rostersResponse.json();

        setTeamsData(teams);
        setRostersData(rosters);
      } catch (error) {
        console.error('Error loading data:', error);
        // Don't set error state - fallback to manual entry
      }
    };

    loadData();
  }, []);

  // Load sort options on mount
  useEffect(() => {
    const loadSortOptions = async () => {
      try {
        const response = await service.getSortOptions();
        // Handle both API response format and fallback format
        const optionsArray = response.options || response.sort_options || [];
        
        // Convert array to key-value object for dropdown compatibility
        const optionsObject = {};
        optionsArray.forEach(option => {
          optionsObject[option.key] = option.label || option.description;
        });
        
        setSortOptions(optionsObject);
      } catch (error) {
        console.error('Failed to load sort options:', error);
        // Set default options as fallback
        setSortOptions({
          'score': 'Overall HR Score',
          'hr': 'HR Probability',
          'hit': 'Hit Probability',
          'reach_base': 'Reach Base Probability',
          'strikeout': 'Strikeout Probability',
          'enhanced_hr_score': 'Standout Score (Dashboard Enhanced)',
          'enhanced_confidence': 'Enhanced Confidence',
          'dashboard_context': 'Dashboard Context Level'
        });
      }
    };

    if (initialized) {
      loadSortOptions();
    }
  }, [initialized, service]);

  // Debounced pitcher search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (pitcherSearchTerm.length > 2) {
        try {
          const results = await searchPlayers(pitcherSearchTerm, 'pitcher');
          setPitcherSearchResults(results.players || []);
          setShowPitcherSearch(true);
        } catch (error) {
          console.error('Search failed:', error);
          setPitcherSearchResults([]);
        }
      } else {
        setPitcherSearchResults([]);
        setShowPitcherSearch(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [pitcherSearchTerm, searchPlayers]);


  // Prepare dropdown options
  const pitcherOptions = useMemo(() => {
    return rostersData
      .filter(player => player.type === 'pitcher')
      .map(pitcher => ({
        value: pitcher.fullName || pitcher.name,
        label: pitcher.fullName || pitcher.name,
        secondary: pitcher.team
      }));
  }, [rostersData]);

  const teamOptions = useMemo(() => {
    return Object.entries(teamsData).map(([abbr, team]) => ({
      value: abbr,
      label: team.name,
      secondary: abbr
    }));
  }, [teamsData]);
  // Handle single matchup analysis
  const handleSingleAnalysis = useCallback(async () => {
    if (!singleAnalysisParams.pitcherName || !singleAnalysisParams.teamAbbr) {
      setAnalysisError('Please enter both pitcher name and team abbreviation');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const result = await analyzePitcherVsTeam(singleAnalysisParams);
      setPredictions(result.predictions || []);
      setAnalysisResults(result);
    } catch (error) {
      setAnalysisError(error.message);
      setPredictions([]);
    } finally {
      setAnalysisLoading(false);
    }
  }, [singleAnalysisParams, analyzePitcherVsTeam]);

  // Handle batch analysis
  const handleBatchAnalysis = useCallback(async () => {
    const validMatchups = batchMatchups.filter(m => m.pitcher_name && m.team_abbr);
    
    if (validMatchups.length === 0) {
      setAnalysisError('Please add at least one valid matchup');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const result = await batchAnalysis({
        matchups: validMatchups,
        ...batchParams
      });
      setPredictions(result.predictions || []);
      setAnalysisResults(result);
    } catch (error) {
      setAnalysisError(error.message);
      setPredictions([]);
    } finally {
      setAnalysisLoading(false);
    }
  }, [batchMatchups, batchParams, batchAnalysis]);

  // Handle adding/removing batch matchups
  const addBatchMatchup = () => {
    setBatchMatchups([...batchMatchups, { pitcher_name: '', team_abbr: '' }]);
  };

  const removeBatchMatchup = (index) => {
    setBatchMatchups(batchMatchups.filter((_, i) => i !== index));
  };

  const updateBatchMatchup = (index, field, value) => {
    const updated = [...batchMatchups];
    updated[index][field] = value;
    setBatchMatchups(updated);
  };

  // Format percentage values (they're already percentages from API)
  const formatPercentage = (value) => {
    return typeof value === 'number' ? `${value.toFixed(1)}%` : 'N/A';
  };

  // Format numeric values
  const formatNumber = (value, decimals = 1) => {
    return typeof value === 'number' ? value.toFixed(decimals) : 'N/A';
  };

  // Get value color class for visual feedback
  const getValueColorClass = (value, type) => {
    if (typeof value !== 'number') return '';
    
    switch (type) {
      case 'hr_score':
        if (value >= 70) return 'value-excellent';
        if (value >= 50) return 'value-good';
        if (value >= 30) return 'value-average';
        return 'value-poor';
      case 'hr_probability':
        if (value >= 15) return 'value-excellent';  // 15% or higher
        if (value >= 10) return 'value-good';       // 10-15%
        if (value >= 5) return 'value-average';     // 5-10%
        return 'value-poor';                        // Under 5%
      case 'ab_due':
        if (value >= 15) return 'value-excellent';
        if (value >= 10) return 'value-good';
        if (value >= 5) return 'value-average';
        return 'value-poor';
      default:
        return '';
    }
  };

  // Render loading state
  if (apiLoading) {
    return (
      <div className="pinheads-playhouse">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading Analysis System...</h2>
          <p>Initializing baseball data and models...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (apiError) {
    return (
      <div className="pinheads-playhouse">
        <div className="error-container">
          <h2>System Error</h2>
          <p>{apiError}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      </div>
    );
  }

  // Render not initialized state
  if (!initialized) {
    return (
      <div className="pinheads-playhouse">
        <div className="initializing-container">
          <h2>Initializing Data...</h2>
          <p>Please wait while the baseball analysis system loads.</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Filter predictions based on dashboard context
  const filteredPredictions = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];

    return predictions.filter(prediction => {
      const context = prediction.dashboard_context;
      if (!context) return true; // Include predictions without context

      // Show standout players only
      if (dashboardFilters.showStandoutOnly && !context.is_standout) {
        return false;
      }

      // Show hot streaks only
      if (dashboardFilters.showHotStreaksOnly) {
        const hasHotStreak = context.badges.some(badge => 
          badge.includes('🔥') || badge.includes('Hot Streak') || badge.includes('Active Streak')
        );
        if (!hasHotStreak) return false;
      }

      // Show hidden gems only
      if (dashboardFilters.showHiddenGemsOnly) {
        const isHiddenGem = context.category?.category === 'hidden_gem';
        if (!isHiddenGem) return false;
      }

      // Show risk warnings only
      if (dashboardFilters.showRiskWarningsOnly) {
        const hasRisk = context.badges.some(badge => badge.includes('⚠️') || badge.includes('Risk'));
        if (!hasRisk) return false;
      }

      // Show situational players only
      if (dashboardFilters.showSituationalOnly) {
        const isSituational = context.badges.some(badge => 
          badge.includes('⏰') || badge.includes('🆚') || badge.includes('🏠')
        );
        if (!isSituational) return false;
      }

      // Minimum confidence boost filter
      if (dashboardFilters.minConfidenceBoost !== null) {
        if ((context.confidence_boost || 0) < dashboardFilters.minConfidenceBoost) {
          return false;
        }
      }

      // Category filter
      if (dashboardFilters.categories.length > 0) {
        const playerCategory = context.category?.category;
        if (!dashboardFilters.categories.includes(playerCategory)) {
          return false;
        }
      }

      return true;
    });
  }, [predictions, dashboardFilters]);

  return (
    <div className="pinheads-playhouse">
      <div className="playhouse-header">
        <h1>🎯 Pinheads Playhouse</h1>
        <p>Advanced Baseball Home Run Analysis - Powered by AI</p>
      </div>

      {/* Analysis Type Selector */}
      <div className="analysis-type-selector">
        <button
          className={analysisType === 'single' ? 'active' : ''}
          onClick={() => setAnalysisType('single')}
        >
          Single Matchup
        </button>
        <button
          className={analysisType === 'batch' ? 'active' : ''}
          onClick={() => setAnalysisType('batch')}
        >
          Batch Analysis
        </button>
      </div>

      {/* Single Analysis Form */}
      {analysisType === 'single' && (
        <div className="analysis-form single-form">
          <h3>Single Pitcher vs Team Analysis</h3>
          <div className="form-row">
            <div className="form-group pitcher-search-group">
              <label>Pitcher Name:</label>
              {pitcherOptions.length > 0 ? (
                <SearchableDropdown
                  value={singleAnalysisParams.pitcherName}
                  onChange={(value) => setSingleAnalysisParams({...singleAnalysisParams, pitcherName: value})}
                  options={pitcherOptions}
                  placeholder="Search for a pitcher..."
                  showSecondary={true}
                />
              ) : (
                <input
                  type="text"
                  value={singleAnalysisParams.pitcherName}
                  onChange={(e) => setSingleAnalysisParams({...singleAnalysisParams, pitcherName: e.target.value})}
                  placeholder="e.g., MacKenzie Gore"
                />
              )}
            </div>
            <div className="form-group pitcher-search-group">
              <label>Team Abbreviation:</label>
              {teamOptions.length > 0 ? (
                <SearchableDropdown
                  value={singleAnalysisParams.teamAbbr}
                  onChange={(value) => setSingleAnalysisParams({...singleAnalysisParams, teamAbbr: value})}
                  options={teamOptions}
                  placeholder="Search for a team..."
                  displayKey="label"
                  showSecondary={true}
                />
              ) : (
                <input
                  type="text"
                  value={singleAnalysisParams.teamAbbr}
                  onChange={(e) => setSingleAnalysisParams({...singleAnalysisParams, teamAbbr: e.target.value.toUpperCase()})}
                  placeholder="e.g., SEA"
                  maxLength="3"
                />
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Sort By:</label>
              <select
                value={singleAnalysisParams.sortBy}
                onChange={(e) => setSingleAnalysisParams({...singleAnalysisParams, sortBy: e.target.value})}
              >
                {Object.entries(sortOptions).map(([key, description]) => (
                  <option key={key} value={key}>{description}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Order:</label>
              <select
                value={singleAnalysisParams.ascending}
                onChange={(e) => setSingleAnalysisParams({...singleAnalysisParams, ascending: e.target.value === 'true'})}
              >
                <option value="false">Highest First</option>
                <option value="true">Lowest First</option>
              </select>
            </div>
            <div className="form-group">
              <label>Limit:</label>
              <input
                type="number"
                value={singleAnalysisParams.limit}
                onChange={(e) => setSingleAnalysisParams({...singleAnalysisParams, limit: parseInt(e.target.value)})}
                min="1"
                max="50"
              />
            </div>
          </div>
          <button
            onClick={handleSingleAnalysis}
            disabled={analysisLoading || !singleAnalysisParams.pitcherName || !singleAnalysisParams.teamAbbr}
            className="analyze-btn"
          >
            {analysisLoading ? 'Analyzing...' : 'Analyze Matchup'}
          </button>
        </div>
      )}

      {/* Batch Analysis Form */}
      {analysisType === 'batch' && (
        <div className="analysis-form batch-form">
          <h3>Batch Pitcher vs Team Analysis</h3>
          <div className="batch-matchups">
            <h4>Matchups</h4>
            {batchMatchups.map((matchup, index) => (
              <div key={index} className="batch-matchup-row">
                <div className="pitcher-search-group" style={{flex: 1}}>
                  {pitcherOptions.length > 0 ? (
                    <SearchableDropdown
                      value={matchup.pitcher_name}
                      onChange={(value) => updateBatchMatchup(index, 'pitcher_name', value)}
                      options={pitcherOptions}
                      placeholder="Search pitcher..."
                      showSecondary={true}
                    />
                  ) : (
                    <input
                      type="text"
                      value={matchup.pitcher_name}
                      onChange={(e) => updateBatchMatchup(index, 'pitcher_name', e.target.value)}
                      placeholder="Pitcher name"
                    />
                  )}
                </div>
                <div className="pitcher-search-group" style={{flex: 1}}>
                  {teamOptions.length > 0 ? (
                    <SearchableDropdown
                      value={matchup.team_abbr}
                      onChange={(value) => updateBatchMatchup(index, 'team_abbr', value)}
                      options={teamOptions}
                      placeholder="Search team..."
                      displayKey="label"
                      showSecondary={true}
                    />
                  ) : (
                    <input
                      type="text"
                      value={matchup.team_abbr}
                      onChange={(e) => updateBatchMatchup(index, 'team_abbr', e.target.value.toUpperCase())}
                      placeholder="Team"
                      maxLength="3"
                    />
                  )}
                </div>
                {batchMatchups.length > 1 && (
                  <button 
                    className="remove-btn"
                    onClick={() => removeBatchMatchup(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button className="add-matchup-btn" onClick={addBatchMatchup}>
              + Add Matchup
            </button>
          </div>
          <div className="batch-options">
            <div className="form-group">
              <label>Sort By:</label>
              <select
                value={batchParams.sortBy}
                onChange={(e) => setBatchParams({...batchParams, sortBy: e.target.value})}
              >
                {Object.entries(sortOptions).map(([key, description]) => (
                  <option key={key} value={key}>{description}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Total Results Limit:</label>
              <input
                type="number"
                value={batchParams.limit}
                onChange={(e) => setBatchParams({...batchParams, limit: parseInt(e.target.value)})}
                min="1"
                max="100"
              />
            </div>
          </div>
          <button
            onClick={handleBatchAnalysis}
            disabled={analysisLoading}
            className="analyze-btn"
          >
            {analysisLoading ? 'Analyzing...' : 'Run Batch Analysis'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {analysisError && (
        <div className="error-message">
          <span>⚠️ {analysisError}</span>
          <button onClick={() => setAnalysisError(null)}>×</button>
        </div>
      )}

      {/* Column Selector */}
      {predictions.length > 0 && (
        <div className="column-selector">
          <h4>Table Columns:</h4>
          <div className="column-checkboxes">
            {availableColumns.map(col => (
              <label key={col.key} className="column-checkbox">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col.key)}
                  onChange={(e) => {
                    if (col.always) return; // Can't uncheck always-shown columns
                    if (e.target.checked) {
                      setSelectedColumns([...selectedColumns, col.key]);
                    } else {
                      setSelectedColumns(selectedColumns.filter(c => c !== col.key));
                    }
                  }}
                  disabled={col.always}
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Results Table */}
      {predictions.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3>Analysis Results</h3>
            {analysisResults && (
              <div className="results-summary">
                <span>Total Predictions: {analysisResults.total_predictions || predictions.length}</span>
                {analysisResults.matchup_summaries && (
                  <span>Matchups: {analysisResults.matchup_summaries.length}</span>
                )}
              </div>
            )}
          </div>

          {/* Dashboard Filtering Controls */}
          <div className="dashboard-filters">
            <h4>🎯 Dashboard Context Filters</h4>
            <div className="filter-grid">
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={dashboardFilters.showStandoutOnly}
                  onChange={(e) => setDashboardFilters({
                    ...dashboardFilters,
                    showStandoutOnly: e.target.checked
                  })}
                />
                ⭐ Standout Players Only
              </label>

              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={dashboardFilters.showHotStreaksOnly}
                  onChange={(e) => setDashboardFilters({
                    ...dashboardFilters,
                    showHotStreaksOnly: e.target.checked
                  })}
                />
                🔥 Hot Streaks Only
              </label>

              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={dashboardFilters.showHiddenGemsOnly}
                  onChange={(e) => setDashboardFilters({
                    ...dashboardFilters,
                    showHiddenGemsOnly: e.target.checked
                  })}
                />
                💎 Hidden Gems Only
              </label>

              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={dashboardFilters.showRiskWarningsOnly}
                  onChange={(e) => setDashboardFilters({
                    ...dashboardFilters,
                    showRiskWarningsOnly: e.target.checked
                  })}
                />
                ⚠️ Risk Warnings Only
              </label>

              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={dashboardFilters.showSituationalOnly}
                  onChange={(e) => setDashboardFilters({
                    ...dashboardFilters,
                    showSituationalOnly: e.target.checked
                  })}
                />
                🎯 Situational Stars Only
              </label>

              <div className="filter-input-group">
                <label>Minimum Confidence Boost:</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="5"
                  value={dashboardFilters.minConfidenceBoost || ''}
                  onChange={(e) => setDashboardFilters({
                    ...dashboardFilters,
                    minConfidenceBoost: e.target.value ? parseInt(e.target.value) : null
                  })}
                  placeholder="e.g., 10"
                />
              </div>

              <button 
                className="clear-filters-btn"
                onClick={() => setDashboardFilters({
                  showStandoutOnly: false,
                  showHotStreaksOnly: false,
                  showHiddenGemsOnly: false,
                  showRiskWarningsOnly: false,
                  showSituationalOnly: false,
                  minConfidenceBoost: null,
                  categories: []
                })}
              >
                🗑️ Clear All Filters
              </button>
            </div>
            
            <div className="filter-results-summary">
              Showing {filteredPredictions.length} of {predictions.length} predictions
              {filteredPredictions.length !== predictions.length && (
                <span className="filter-applied-indicator"> (filtered)</span>
              )}
            </div>
          </div>

          <div className="table-container">
            <table className="predictions-table">
              <thead>
                <tr>
                  {selectedColumns.map(colKey => {
                    const col = availableColumns.find(c => c.key === colKey);
                    return <th key={colKey}>{col?.label || colKey}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredPredictions.map((prediction, index) => (
                  <tr key={index}>
                    {selectedColumns.map(colKey => {
                      let value = prediction[colKey];
                      let displayValue = value;
                      let className = '';

                      // Format different types of values
                      if (colKey === 'dashboard_badges') {
                        // Display badges as emoji string
                        const context = prediction.dashboard_context;
                        displayValue = context?.badges?.join(' ') || '';
                        className = 'dashboard-badges';
                      } else if (colKey === 'standout_score') {
                        // Display standout score with enhanced formatting
                        const context = prediction.dashboard_context;
                        value = context?.standout_score || prediction.enhanced_hr_score || prediction.hr_score;
                        displayValue = formatNumber(value, 1);
                        className = context?.is_standout ? 'value-standout' : getValueColorClass(value, 'hr_score');
                      } else if (colKey === 'enhanced_confidence') {
                        // Display enhanced confidence with boost indicator
                        const context = prediction.dashboard_context;
                        value = prediction.enhanced_confidence || prediction.confidence;
                        const boost = context?.confidence_boost || 0;
                        displayValue = `${formatNumber(value, 1)}% ${boost > 0 ? `(+${boost})` : boost < 0 ? `(${boost})` : ''}`;
                        className = boost > 10 ? 'value-excellent' : boost > 0 ? 'value-good' : boost < 0 ? 'value-poor' : '';
                      } else if (colKey === 'context_summary') {
                        // Display context summary
                        const context = prediction.dashboard_context;
                        displayValue = context?.context_summary || 'No context';
                        className = 'context-summary';
                      } else if (colKey === 'category') {
                        // Display player category with appropriate styling
                        const context = prediction.dashboard_context;
                        const category = context?.category;
                        displayValue = category?.label || 'Standard';
                        className = `category-${category?.category || 'standard'}`;
                      } else if (colKey.includes('probability') || colKey === 'hr_rate') {
                        displayValue = formatPercentage(value);  // Already percentages
                        className = getValueColorClass(value, colKey);
                      } else if (colKey === 'hr_score') {
                        displayValue = formatNumber(value, 1);
                        className = getValueColorClass(value, colKey);
                      } else if (colKey === 'recent_avg' || colKey === 'obp') {
                        displayValue = formatNumber(value, 3);
                      } else if (colKey === 'pitcher_era' || colKey === 'pitcher_whip') {
                        displayValue = formatNumber(value, 2);
                      } else if (colKey === 'contact_trend' || colKey === 'pitcher_trend_dir') {
                        displayValue = value || 'N/A';
                      } else if (colKey === 'batter_hand' || colKey === 'pitcher_hand') {
                        displayValue = value || '';
                      } else if (typeof value === 'number') {
                        displayValue = formatNumber(value, 1);
                        if (colKey === 'ab_due') {
                          className = getValueColorClass(value, colKey);
                        }
                      }

                      return (
                        <td key={colKey} className={className}>
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analysisLoading && predictions.length === 0 && !analysisError && (
        <div className="empty-state">
          <h3>Ready for Analysis</h3>
          <p>Enter a pitcher and team above to get started with home run predictions.</p>
        </div>
      )}
    </div>
  );
};

export default PinheadsPlayhouse;