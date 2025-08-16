import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBaseballAnalysis } from '../../services/baseballAnalysisService';
import batchSummaryService from '../../services/batchSummaryService';
import startingLineupService from '../../services/startingLineupService';
import handednessResolver from '../../utils/handednessResolver';
import { normalizeToEnglish } from '../../utils/universalNameNormalizer';
import BatchSummarySection from '../BatchSummarySection';
import AutoFillButton from './AutoFillButton';
import LineupRefreshButton from './LineupRefreshButton';
import PropFinder from './PropFinder';
import MatchupContextSection from '../MatchupContextSection/MatchupContextSection';
import { batchDebugger } from '../../utils/batchAnalysisDebugger';
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

  // Filter options based on search term with Spanish character normalization
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    
    const term = searchTerm.toLowerCase();
    const normalizedTerm = normalizeToEnglish(term);
    
    return options.filter(option => {
      const display = option[displayKey]?.toLowerCase() || '';
      const value = option[valueKey]?.toLowerCase() || '';
      const secondary = option[secondaryKey]?.toLowerCase() || '';
      
      // Normalize all search targets for accent-insensitive matching
      const normalizedDisplay = normalizeToEnglish(display);
      const normalizedValue = normalizeToEnglish(value);
      const normalizedSecondary = normalizeToEnglish(secondary);
      
      // Match both original and normalized versions
      return display.includes(term) || value.includes(term) || secondary.includes(term) ||
             normalizedDisplay.includes(normalizedTerm) || 
             normalizedValue.includes(normalizedTerm) || 
             normalizedSecondary.includes(normalizedTerm);
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
    hittersFilter: null,
    recentTrendFilter: [], // Array for multiple Recent Trend Dir selections
    pitcherTrendFilter: []  // Array for multiple P Trend Dir selections
  });

  // Results state
  const [predictions, setPredictions] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Batch summary state
  const [batchSummary, setBatchSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

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
    'player_name', 'team', 'batter_hand', 'pitcher_hand', 'dashboard_badges', 'standout_score', 'hr_score', 'hr_probability', 'hit_probability', 
    'recent_avg', 'hr_rate', 'ab_due', 'arsenal_matchup', 'enhanced_confidence', 'category',
    'pitcher_trend_dir', 'pitcher_home_hr_total', 'stadium_factor', 'pitcher_vulnerability'
  ]);

  // Column selector collapsible state
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  
  // Remove the modal window state since we're using integrated section now

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
    
    // Stadium & Weather Context Columns
    { key: 'stadium_factor', label: 'Park Factor', description: 'Stadium HR park factor (>1.0 hitter friendly)' },
    { key: 'stadium_category', label: 'Park Type', description: 'Stadium category (Hitter/Pitcher Friendly)' },
    { key: 'weather_impact', label: 'Weather', description: 'Weather conditions impact on HR potential' },
    { key: 'wind_factor', label: 'Wind Factor', description: 'Wind impact on ball flight' },
    
    // Enhanced Pitcher Form Columns
    { key: 'pitcher_form_index', label: 'P Form Index', description: 'Recent pitcher performance index' },
    { key: 'pitcher_vulnerability', label: 'P Vulnerability', description: 'Pitcher vulnerability to HR (higher = more vulnerable)' },
    { key: 'pitcher_recent_era', label: 'P Recent ERA', description: 'Pitcher ERA over last 5 starts' },
    
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

  // Generate batch summary when predictions change
  useEffect(() => {
    const generateSummary = async () => {
      if (!predictions || predictions.length === 0) {
        setBatchSummary(null);
        setSummaryLoading(false);
        setSummaryError(null);
        return;
      }

      setSummaryLoading(true);
      setSummaryError(null);

      try {
        console.log(`🔄 Generating batch summary for ${predictions.length} predictions`);
        const summary = await batchSummaryService.generateBatchSummary(predictions, batchMatchups);
        setBatchSummary(summary);
        console.log(`✅ Batch summary generated successfully`);
      } catch (error) {
        console.error('Error generating batch summary:', error);
        setSummaryError(error.message);
        setBatchSummary(null);
      } finally {
        setSummaryLoading(false);
      }
    };

    generateSummary();
  }, [predictions, batchMatchups]);

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

  // Auto-populate handler for lineup integration
  const handleAutoFill = useCallback(async (result) => {
    if (result.pitcher && result.pitcher !== 'TBD') {
      setSingleAnalysisParams(prev => ({
        ...prev,
        pitcherName: result.pitcher
      }));
    }
    if (result.team) {
      setSingleAnalysisParams(prev => ({
        ...prev,
        teamAbbr: result.team
      }));
    }
  }, []);

  // Clear single matchup fields
  const clearSingleMatchup = useCallback(() => {
    setSingleAnalysisParams(prev => ({
      ...prev,
      pitcherName: '',
      teamAbbr: ''
    }));
  }, []);

  // Auto-populate when pitcher name changes
  const handlePitcherChange = useCallback(async (value) => {
    setSingleAnalysisParams(prev => ({...prev, pitcherName: value}));
    
    // Only auto-populate if team is empty and pitcher has meaningful length
    if (value && value.trim().length > 2 && !singleAnalysisParams.teamAbbr.trim()) {
      try {
        const pitcherData = await startingLineupService.getTeamFromPitcher(value);
        if (pitcherData && pitcherData.opponent) {
          setSingleAnalysisParams(prev => ({
            ...prev,
            teamAbbr: pitcherData.opponent
          }));
          console.log(`✅ Auto-populated: ${pitcherData.opponent} batters vs ${value}`);
        }
      } catch (error) {
        console.log('Auto-populate failed:', error);
      }
    }
  }, [singleAnalysisParams.teamAbbr]);

  // Auto-populate when team changes
  const handleTeamChange = useCallback(async (value) => {
    setSingleAnalysisParams(prev => ({...prev, teamAbbr: value}));
    
    // Only auto-populate if pitcher is empty and team has proper format
    if (value && value.trim().length === 3 && !singleAnalysisParams.pitcherName.trim()) {
      try {
        const matchupData = await startingLineupService.getMatchupFromTeam(value);
        if (matchupData && matchupData.opponentPitcher && matchupData.opponentPitcher !== 'TBD') {
          setSingleAnalysisParams(prev => ({
            ...prev,
            pitcherName: matchupData.opponentPitcher
          }));
          console.log(`✅ Auto-populated: ${value} batters vs ${matchupData.opponentPitcher}`);
        }
      } catch (error) {
        console.log('Auto-populate failed:', error);
      }
    }
  }, [singleAnalysisParams.pitcherName]);

  // Handle single matchup analysis
  const handleSingleAnalysis = useCallback(async () => {
    if (!singleAnalysisParams.pitcherName || !singleAnalysisParams.teamAbbr) {
      setAnalysisError('Please enter both pitcher name and team abbreviation');
      return;
    }

    // Track visitor engagement when user actually runs analysis
    try {
      await fetch('https://visits.capping.pro/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.debug('Visit tracking failed:', error);
    }

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      batchDebugger.log('🎯 SINGLE ANALYSIS: Starting', singleAnalysisParams);
      const result = await analyzePitcherVsTeam(singleAnalysisParams);
      batchDebugger.log('✅ SINGLE ANALYSIS: Complete', { 
        predictionCount: result.predictions?.length || 0,
        hasResult: !!result 
      });
      
      if (result.predictions && result.predictions.length > 0) {
        batchDebugger.analyzePredictionStructure(result.predictions[0], 'SINGLE MODE FIRST PREDICTION');
        batchDebugger.trackDataSource(result.predictions, 'Single Analysis API', singleAnalysisParams);
      }
      
      setPredictions(result.predictions || []);
      setAnalysisResults(result);
    } catch (error) {
      batchDebugger.log('❌ SINGLE ANALYSIS: Error', error.message);
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

    // Track visitor engagement when user actually runs batch analysis
    try {
      await fetch('https://visits.capping.pro/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.debug('Visit tracking failed:', error);
    }

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      batchDebugger.log('🚀 BATCH ANALYSIS: Starting', { 
        validMatchups, 
        batchParams,
        matchupCount: validMatchups.length 
      });
      
      const result = await batchAnalysis({
        matchups: validMatchups,
        ...batchParams
      });
      
      batchDebugger.log('✅ BATCH ANALYSIS: Complete', { 
        predictionCount: result.predictions?.length || 0,
        hasResult: !!result,
        resultStructure: result ? Object.keys(result) : []
      });
      
      if (result.predictions && result.predictions.length > 0) {
        batchDebugger.analyzePredictionStructure(result.predictions[0], 'BATCH MODE FIRST PREDICTION');
        batchDebugger.trackDataSource(result.predictions, 'Batch Analysis API', { validMatchups, batchParams });
        
        // Analyze pitcher data variation
        batchDebugger.analyzePitcherDataVariation(result.predictions);
        
        // Compare with any existing single mode data
        const currentPredictions = predictions;
        if (currentPredictions.length > 0) {
          batchDebugger.compareModes(currentPredictions, result.predictions);
        }
      }
      
      setPredictions(result.predictions || []);
      setAnalysisResults(result);
    } catch (error) {
      batchDebugger.log('❌ BATCH ANALYSIS: Error', { 
        error: error.message,
        stack: error.stack,
        matchups: validMatchups 
      });
      setAnalysisError(error.message);
      setPredictions([]);
    } finally {
      setAnalysisLoading(false);
    }
  }, [batchMatchups, batchParams, batchAnalysis, predictions]);

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

  // Auto-populate handlers for batch matchups
  const handleBatchPitcherChange = useCallback(async (index, value) => {
    updateBatchMatchup(index, 'pitcher_name', value);
    
    // Only auto-populate if team is empty and pitcher has meaningful length
    if (value && value.trim().length > 2 && !batchMatchups[index].team_abbr.trim()) {
      try {
        const pitcherData = await startingLineupService.getTeamFromPitcher(value);
        if (pitcherData && pitcherData.opponent) {
          updateBatchMatchup(index, 'team_abbr', pitcherData.opponent);
          console.log(`✅ Batch auto-populated: ${pitcherData.opponent} batters vs ${value}`);
        }
      } catch (error) {
        console.log('Batch auto-populate failed:', error);
      }
    }
  }, [batchMatchups]);

  const handleBatchTeamChange = useCallback(async (index, value) => {
    updateBatchMatchup(index, 'team_abbr', value);
    
    // Only auto-populate if pitcher is empty and team has proper format
    if (value && value.trim().length === 3 && !batchMatchups[index].pitcher_name.trim()) {
      try {
        const matchupData = await startingLineupService.getMatchupFromTeam(value);
        if (matchupData && matchupData.opponentPitcher && matchupData.opponentPitcher !== 'TBD') {
          updateBatchMatchup(index, 'pitcher_name', matchupData.opponentPitcher);
          console.log(`✅ Batch auto-populated: ${value} batters vs ${matchupData.opponentPitcher}`);
        }
      } catch (error) {
        console.log('Batch auto-populate failed:', error);
      }
    }
  }, [batchMatchups]);

  // Auto-fill specific batch matchup
  const handleBatchAutoFill = useCallback(async (index, result) => {
    if (result.pitcher && result.pitcher !== 'TBD') {
      updateBatchMatchup(index, 'pitcher_name', result.pitcher);
    }
    if (result.team) {
      updateBatchMatchup(index, 'team_abbr', result.team);
    }
  }, []);

  // Clear pitcher from specific batch matchup
  const clearBatchMatchup = useCallback((index) => {
    const updated = [...batchMatchups];
    if (updated[index]) {
      updated[index].pitcher_name = '';
      setBatchMatchups(updated);
    }
  }, [batchMatchups]);

  // Fill all batch matchups from today's lineups
  const fillAllFromLineups = useCallback(async () => {
    try {
      const matchups = await startingLineupService.getTodaysMatchups();
      if (matchups && matchups.length > 0) {
        // Create TWO matchups per game: away pitcher vs home team AND home pitcher vs away team
        const lineupMatchups = [];
        matchups.forEach(matchup => {
          // Away pitcher vs Home team batters (include TBD for manual completion)
          if (matchup.awayPitcher) {
            lineupMatchups.push({
              pitcher_name: matchup.awayPitcher,
              team_abbr: matchup.home
            });
          }
          // Home pitcher vs Away team batters (include TBD for manual completion)
          if (matchup.homePitcher) {
            lineupMatchups.push({
              pitcher_name: matchup.homePitcher,
              team_abbr: matchup.away
            });
          }
        });
        setBatchMatchups(lineupMatchups);
        console.log(`✅ Filled ${lineupMatchups.length} matchups from ${matchups.length} games (2 per game)`);
      }
    } catch (error) {
      console.error('Failed to fill from lineups:', error);
    }
  }, []);

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

  // Enhanced handedness resolution using the new handedness resolver
  const [handednessCache, setHandednessCache] = useState(new Map());

  const enhanceHandInformation = useCallback(async (value, prediction, colKey) => {
    // If we already have valid hand information, return it
    if (value && value !== 'UNKNOWN' && value !== 'TBD' && value !== '') {
      return value;
    }

    // Create cache key
    const cacheKey = colKey === 'pitcher_hand' ? 
      `pitcher_${prediction.matchup_pitcher || prediction.pitcher_name}` :
      `batter_${prediction.player_name}_${prediction.team}`;

    // Check cache first
    if (handednessCache.has(cacheKey)) {
      return handednessCache.get(cacheKey);
    }

    try {
      let handednessResult;

      if (colKey === 'pitcher_hand') {
        const pitcherName = prediction.matchup_pitcher || prediction.pitcher_name;
        handednessResult = await handednessResolver.getPitcherHandedness(pitcherName, prediction);
      } else if (colKey === 'batter_hand') {
        handednessResult = await handednessResolver.getBatterHandedness(
          prediction.player_name, 
          prediction.team, 
          prediction
        );
      }

      const finalHandedness = handednessResult?.available ? handednessResult.handedness : 'UNK';
      
      // Cache the result
      setHandednessCache(prev => new Map(prev.set(cacheKey, finalHandedness)));
      
      return finalHandedness;
    } catch (error) {
      console.warn(`Failed to enhance hand info for ${colKey}:`, error);
      return 'UNK';
    }
  }, [handednessCache]);

  // Filter predictions based on dashboard context (moved before early returns)
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

  return (
    <div className="pinheads-playhouse">
      <div className="playhouse-header">
        <h1>🎯 Pinheads Playhouse</h1>
        <p>Advanced Baseball Home Run Analysis - Powered by AI</p>
        {/* Debug Tools - only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-tools">
            <button 
              onClick={() => {
                const logs = batchDebugger.exportLogs();
                console.log('🔍 BATCH DEBUG LOGS EXPORTED:', logs);
                alert('Debug logs exported to console. Check developer tools.');
              }}
              style={{ 
                padding: '4px 8px', 
                fontSize: '12px', 
                backgroundColor: '#ff9800', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '8px'
              }}
              title="Export debug logs to help diagnose batch vs single mode differences"
            >
              🔍 Export Debug Logs
            </button>
            <button 
              onClick={() => {
                batchDebugger.clear();
                console.log('🧹 Debug logs cleared');
              }}
              style={{ 
                padding: '4px 8px', 
                fontSize: '12px', 
                backgroundColor: '#9e9e9e', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '8px',
                marginLeft: '8px'
              }}
              title="Clear debug logs"
            >
              🧹 Clear Logs
            </button>
          </div>
        )}
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
                  onChange={handlePitcherChange}
                  options={pitcherOptions}
                  placeholder="Search for a pitcher..."
                  showSecondary={true}
                />
              ) : (
                <input
                  type="text"
                  value={singleAnalysisParams.pitcherName}
                  onChange={(e) => handlePitcherChange(e.target.value)}
                  placeholder="e.g., MacKenzie Gore"
                />
              )}
            </div>
            <div className="form-group pitcher-search-group">
              <label>Team Abbreviation:</label>
              {teamOptions.length > 0 ? (
                <SearchableDropdown
                  value={singleAnalysisParams.teamAbbr}
                  onChange={handleTeamChange}
                  options={teamOptions}
                  placeholder="Search for a team..."
                  displayKey="label"
                  showSecondary={true}
                />
              ) : (
                <input
                  type="text"
                  value={singleAnalysisParams.teamAbbr}
                  onChange={(e) => handleTeamChange(e.target.value.toUpperCase())}
                  placeholder="e.g., SEA"
                  maxLength="3"
                />
              )}
            </div>
            <div className="form-group lineup-buttons">
              <label>Lineup Tools:</label>
              <div className="lineup-button-row">
                <AutoFillButton
                  onAutoFill={handleAutoFill}
                  currentPitcher={singleAnalysisParams.pitcherName}
                  currentTeam={singleAnalysisParams.teamAbbr}
                  size="small"
                />
                <LineupRefreshButton
                  size="small"
                  showStatus={false}
                />
                <button
                  type="button"
                  onClick={clearSingleMatchup}
                  className="clear-btn"
                  title="Clear both fields"
                >
                  🗑️ Clear
                </button>
              </div>
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
            <div className="batch-header">
              <h4>Matchups</h4>
              <div className="batch-toolbar">
                <button
                  type="button"
                  onClick={fillAllFromLineups}
                  className="fill-lineups-btn"
                  title="Fill with today's starting lineups"
                >
                  📋 Fill from Lineups
                </button>
                <LineupRefreshButton
                  size="small"
                  showStatus={false}
                />
              </div>
            </div>
            {batchMatchups.map((matchup, index) => (
              <div key={index} className="batch-matchup-row">
                <div className="pitcher-search-group" style={{flex: 1}}>
                  {pitcherOptions.length > 0 ? (
                    <SearchableDropdown
                      value={matchup.pitcher_name}
                      onChange={(value) => handleBatchPitcherChange(index, value)}
                      options={pitcherOptions}
                      placeholder="Search pitcher..."
                      showSecondary={true}
                    />
                  ) : (
                    <input
                      type="text"
                      value={matchup.pitcher_name}
                      onChange={(e) => handleBatchPitcherChange(index, e.target.value)}
                      placeholder="Pitcher name"
                    />
                  )}
                </div>
                <div className="pitcher-search-group" style={{flex: 1}}>
                  {teamOptions.length > 0 ? (
                    <SearchableDropdown
                      value={matchup.team_abbr}
                      onChange={(value) => handleBatchTeamChange(index, value)}
                      options={teamOptions}
                      placeholder="Search team..."
                      displayKey="label"
                      showSecondary={true}
                    />
                  ) : (
                    <input
                      type="text"
                      value={matchup.team_abbr}
                      onChange={(e) => handleBatchTeamChange(index, e.target.value.toUpperCase())}
                      placeholder="Team"
                      maxLength="3"
                    />
                  )}
                </div>
                <div className="batch-row-buttons">
                  <AutoFillButton
                    onAutoFill={(result) => handleBatchAutoFill(index, result)}
                    currentPitcher={matchup.pitcher_name}
                    currentTeam={matchup.team_abbr}
                    size="small"
                  />
                  <button
                    type="button"
                    onClick={() => clearBatchMatchup(index)}
                    className="clear-btn"
                    title="Clear pitcher"
                  >
                    🗑️
                  </button>
                  {batchMatchups.length > 1 && (
                    <button 
                      className="remove-btn"
                      onClick={() => removeBatchMatchup(index)}
                      title="Remove this matchup"
                    >
                      ×
                    </button>
                  )}
                </div>
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
            
            {/* Trend Direction Filters */}
            <div className="trend-filters-section">
              <div className="form-group">
                <label>Recent Trend Direction:</label>
                <div className="trend-toggle-group">
                  {['improving', 'stable', 'declining'].map(trend => (
                    <button
                      key={trend}
                      type="button"
                      className={`trend-toggle ${batchParams.recentTrendFilter.includes(trend) ? 'active' : ''}`}
                      onClick={() => {
                        console.log(`🔘 Toggling Recent Trend: ${trend}`);
                        console.log(`🔘 Current recentTrendFilter:`, batchParams.recentTrendFilter);
                        const newFilter = batchParams.recentTrendFilter.includes(trend)
                          ? batchParams.recentTrendFilter.filter(t => t !== trend)
                          : [...batchParams.recentTrendFilter, trend];
                        console.log(`🔘 New recentTrendFilter:`, newFilter);
                        setBatchParams({...batchParams, recentTrendFilter: newFilter});
                      }}
                    >
                      {trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '➡️'} {trend.charAt(0).toUpperCase() + trend.slice(1)}
                    </button>
                  ))}
                </div>
                {batchParams.recentTrendFilter.length > 0 && (
                  <div className="filter-status">
                    Active filters: {batchParams.recentTrendFilter.join(', ')}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Pitcher Trend Direction:</label>
                <div className="trend-toggle-group">
                  {['improving', 'stable', 'declining'].map(trend => (
                    <button
                      key={trend}
                      type="button"
                      className={`trend-toggle ${batchParams.pitcherTrendFilter.includes(trend) ? 'active' : ''}`}
                      onClick={() => {
                        console.log(`🔘 Toggling Pitcher Trend: ${trend}`);
                        console.log(`🔘 Current pitcherTrendFilter:`, batchParams.pitcherTrendFilter);
                        const newFilter = batchParams.pitcherTrendFilter.includes(trend)
                          ? batchParams.pitcherTrendFilter.filter(t => t !== trend)
                          : [...batchParams.pitcherTrendFilter, trend];
                        console.log(`🔘 New pitcherTrendFilter:`, newFilter);
                        setBatchParams({...batchParams, pitcherTrendFilter: newFilter});
                      }}
                    >
                      {trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '➡️'} {trend.charAt(0).toUpperCase() + trend.slice(1)}
                    </button>
                  ))}
                </div>
                {batchParams.pitcherTrendFilter.length > 0 && (
                  <div className="filter-status">
                    Active filters: {batchParams.pitcherTrendFilter.join(', ')}
                  </div>
                )}
              </div>
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
          <div 
            className="column-selector-header"
            onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
          >
            <h4>Table Columns:</h4>
            <span className={`collapse-icon ${isColumnSelectorOpen ? 'open' : ''}`}>
              {isColumnSelectorOpen ? '▼' : '▶'}
            </span>
          </div>
          {isColumnSelectorOpen && (
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
          )}
        </div>
      )}

      {/* Results Table */}
      {predictions.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <div className="results-title-section">
              <h3>Analysis Results</h3>
            </div>
            {analysisResults && (
              <div className="results-summary">
                <span>Total Predictions: {analysisResults.total_predictions || predictions.length}</span>
                {analysisResults.matchup_summaries && (
                  <span>Matchups: {analysisResults.matchup_summaries.length}</span>
                )}
                {/* Show fallback indicator if using league averages */}
                {(analysisResults.used_client_fallback || analysisResults.batch_fallback_info?.used_fallback) && (
                  <div className="fallback-indicator">
                    <span className="fallback-badge">⚠️ League Average Fallback</span>
                    {analysisResults.batch_fallback_info?.used_fallback ? (
                      <span className="fallback-reason">
                        {analysisResults.batch_fallback_info.fallback_count} of {analysisResults.batch_fallback_info.successful_matchups} matchups using fallback
                      </span>
                    ) : (
                      <span className="fallback-reason">{analysisResults.fallback_reason}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fallback Information Panel */}
          {(analysisResults?.used_client_fallback || analysisResults?.batch_fallback_info?.used_fallback) && (
            <div className="fallback-info-panel">
              <div className="icon">⚠️</div>
              <div className="fallback-info-content">
                <h4>📊 Using League Average Projections</h4>
                
                {/* Single Matchup Fallback */}
                {analysisResults.used_client_fallback && !analysisResults.batch_fallback_info && (
                  <div className="fallback-details">
                    <p><strong>Reason:</strong> {analysisResults.fallback_reason}</p>
                    <p><strong>Methodology:</strong> {analysisResults.fallback_info?.methodology || 'League average performance vs typical pitcher profile'}</p>
                  </div>
                )}

                {/* Batch Analysis Fallback */}
                {analysisResults.batch_fallback_info?.used_fallback && (
                  <div className="fallback-details">
                    <p><strong>Batch Analysis Fallback:</strong> {analysisResults.batch_fallback_info.fallback_count} of {analysisResults.batch_fallback_info.successful_matchups} matchups required fallback predictions.</p>
                    <p><strong>Methodology:</strong> {analysisResults.batch_fallback_info.methodology}</p>
                    
                    {/* Show details of which pitchers needed fallback */}
                    {analysisResults.batch_fallback_info.fallback_details && analysisResults.batch_fallback_info.fallback_details.length > 0 && (
                      <div className="fallback-pitcher-list">
                        <strong>Pitchers using fallback:</strong>
                        <ul>
                          {analysisResults.batch_fallback_info.fallback_details.map((detail, index) => (
                            <li key={index}>
                              <strong>{detail.pitcher}</strong> vs {detail.team}: {detail.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Show any complete failures */}
                    {analysisResults.batch_fallback_info.partial_failures && analysisResults.batch_fallback_info.partial_failures.length > 0 && (
                      <div className="failed-matchups">
                        <strong>⚠️ Failed Matchups:</strong>
                        <ul>
                          {analysisResults.batch_fallback_info.partial_failures.map((failure, index) => (
                            <li key={index}>
                              <strong>{failure.pitcher}</strong> vs {failure.team}: {failure.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="confidence-notice">
                  <strong>⚠️ Lower Confidence:</strong> These predictions use league averages rather than specific pitcher data. 
                  Consider them baseline estimates rather than precise matchup analysis.
                </div>
                
                <div className="fallback-stats">
                  <span>Avg HR Score: {analysisResults.analysis_summary?.avg_hr_score?.toFixed(1) || '45.0'}</span>
                  <span>Avg Confidence: {((analysisResults.analysis_summary?.avg_confidence || 0.4) * 100).toFixed(0)}%</span>
                  <span>Data Quality: {analysisResults.analysis_summary?.data_completeness ? 
                    `${(analysisResults.analysis_summary.data_completeness * 100).toFixed(0)}%` : 'Low'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Batch Summary Section */}
          <BatchSummarySection
            summary={batchSummary}
            loading={summaryLoading}
            error={summaryError}
            className="pinheads-batch-summary"
          />

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
                {filteredPredictions.map((prediction, index) => {
                  // Check if THIS SPECIFIC prediction is from fallback
                  const isFallbackPrediction = prediction.is_fallback_prediction || 
                                               prediction.used_fallback ||
                                               prediction.fallback_type === 'league_average';
                  
                  return (
                  <tr 
                    key={index} 
                    className={isFallbackPrediction ? 'fallback-prediction' : ''}
                  >
                    {selectedColumns.map(colKey => {
                      let value = prediction[colKey];
                      let displayValue = value;
                      let className = '';

                      // Add fallback indicator to player name if applicable
                      if (colKey === 'player_name' && isFallbackPrediction) {
                        // Debug: log which predictions are being marked as fallback
                        console.log(`🔍 Fallback player: ${value}`, {
                          is_fallback_prediction: prediction.is_fallback_prediction,
                          used_fallback: prediction.used_fallback,
                          fallback_type: prediction.fallback_type,
                          matchup_pitcher: prediction.matchup_pitcher,
                          matchup_team: prediction.matchup_team
                        });
                        
                        displayValue = (
                          <span>
                            {value}
                            <span className="fallback-indicator">FALLBACK</span>
                          </span>
                        );
                      }
                      
                      // Format different types of values
                      else if (colKey === 'dashboard_badges') {
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
                      } else if (colKey === 'pitcher_hr_per_game') {
                        // Calculate HR per game from home stats
                        const hrTotal = prediction.pitcher_home_hr_total || 0;
                        const games = prediction.pitcher_home_games || 1;
                        value = hrTotal / games;
                        displayValue = formatNumber(value, 2);
                        className = value > 1.5 ? 'value-poor' : value > 1.0 ? 'value-average' : value > 0.5 ? 'value-good' : 'value-excellent';
                      } else if (colKey === 'pitcher_h_per_game') {
                        // Calculate H per game from home stats  
                        const hTotal = prediction.pitcher_home_h_total || 0;
                        const games = prediction.pitcher_home_games || 1;
                        value = hTotal / games;
                        displayValue = formatNumber(value, 1);
                        className = value > 10 ? 'value-poor' : value > 8 ? 'value-average' : value > 6 ? 'value-good' : 'value-excellent';
                      } else if (colKey === 'pitcher_k_per_game') {
                        // Calculate K per game from home stats
                        const kTotal = prediction.pitcher_home_k_total || 0;
                        const games = prediction.pitcher_home_games || 1;
                        value = kTotal / games;
                        displayValue = formatNumber(value, 1);
                        className = value > 8 ? 'value-excellent' : value > 6 ? 'value-good' : value > 4 ? 'value-average' : 'value-poor';
                      } else if (colKey === 'stadium_factor') {
                        // Display stadium park factor (placeholder for now - will be enhanced with actual data)
                        value = prediction.stadium_context?.parkFactor || 1.0;
                        displayValue = formatNumber(value, 2);
                        className = value > 1.1 ? 'value-excellent' : value > 1.05 ? 'value-good' : value < 0.9 ? 'value-poor' : value < 0.95 ? 'value-average' : '';
                      } else if (colKey === 'stadium_category') {
                        // Display stadium category
                        displayValue = prediction.stadium_context?.category || 'Neutral';
                        className = prediction.stadium_context?.isHitterFriendly ? 'value-good' : prediction.stadium_context?.isPitcherFriendly ? 'value-poor' : '';
                      } else if (colKey === 'weather_impact') {
                        // Display weather impact
                        displayValue = prediction.weather_context?.badge || '⛅ Standard';
                        className = prediction.weather_context?.weatherImpact === 'favorable' ? 'value-good' : 
                                   prediction.weather_context?.weatherImpact === 'unfavorable' ? 'value-poor' : '';
                      } else if (colKey === 'wind_factor') {
                        // Display wind factor
                        value = prediction.weather_context?.windFactor?.factor || 1.0;
                        displayValue = formatNumber(value, 2);
                        className = value > 1.1 ? 'value-excellent' : value > 1.05 ? 'value-good' : value < 0.9 ? 'value-poor' : '';
                      } else if (colKey === 'pitcher_form_index') {
                        // Calculate pitcher form index based on recent performance
                        const recentERA = prediction.pitcher_recent_era || prediction.pitcher_era || 4.5;
                        const recentHR = (prediction.pitcher_home_hr_total || 0) / (prediction.pitcher_home_games || 1);
                        value = Math.max(0, 100 - (recentERA * 10) - (recentHR * 20));
                        displayValue = formatNumber(value, 0);
                        className = value > 75 ? 'value-excellent' : value > 60 ? 'value-good' : value > 40 ? 'value-average' : 'value-poor';
                      } else if (colKey === 'pitcher_vulnerability') {
                        // Calculate pitcher vulnerability to HR
                        const hrRate = (prediction.pitcher_home_hr_total || 0) / (prediction.pitcher_home_games || 1);
                        const era = prediction.pitcher_era || 4.5;
                        value = (hrRate * 50) + (era * 5);
                        displayValue = formatNumber(value, 1);
                        className = value > 30 ? 'value-poor' : value > 20 ? 'value-average' : value > 10 ? 'value-good' : 'value-excellent';
                      } else if (colKey === 'pitcher_recent_era') {
                        // Display recent ERA (calculated or fallback to season ERA)
                        value = prediction.pitcher_recent_era || prediction.pitcher_era || 0;
                        displayValue = formatNumber(value, 2);
                        className = value > 5.0 ? 'value-poor' : value > 4.0 ? 'value-average' : value > 3.0 ? 'value-good' : 'value-excellent';
                      } else if (colKey === 'contact_trend' || colKey === 'pitcher_trend_dir' || colKey === 'recent_trend_dir') {
                        displayValue = value || 'N/A';
                      } else if (colKey === 'batter_hand' || colKey === 'pitcher_hand') {
                        // Use existing value or 'UNK' - async resolution happens in background
                        displayValue = (value && value !== 'UNKNOWN' && value !== 'UNK' && value !== '') ? value : 'UNK';
                        
                        // Trigger async handedness resolution in background
                        if (displayValue === 'UNK') {
                          enhanceHandInformation(value, prediction, colKey).then(enhanced => {
                            if (enhanced !== 'UNK' && enhanced !== value) {
                              // Force re-render when handedness is resolved
                              setTimeout(() => {
                                // This will trigger a re-render of the component
                                setHandednessCache(prev => new Map(prev));
                              }, 100);
                            }
                          });
                        }
                      } else if (typeof value === 'number') {
                        displayValue = formatNumber(value, 1);
                        if (colKey === 'ab_due') {
                          className = getValueColorClass(value, colKey);
                        }
                      }

                      // Add tooltip for dashboard context columns
                      let tooltip = '';
                      if (colKey === 'dashboard_badges' && prediction.dashboard_context) {
                        tooltip = prediction.dashboard_context.tooltip_content || '';
                      } else if (colKey === 'context_summary' && prediction.dashboard_context) {
                        const context = prediction.dashboard_context;
                        tooltip = `Confidence Boost: ${context.confidence_boost || 0}%\n` +
                                 `Standout Reasons: ${context.standout_reasons?.join(', ') || 'None'}\n` +
                                 (context.risk_factors?.length > 0 ? `Risk Factors: ${context.risk_factors.join(', ')}` : '');
                      } else if (colKey === 'category' && prediction.dashboard_context?.category) {
                        tooltip = prediction.dashboard_context.category.description || '';
                      }

                      return (
                        <td 
                          key={colKey} 
                          className={className}
                          title={tooltip}
                          style={tooltip ? { cursor: 'help' } : {}}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Matchup Context Section */}
          <MatchupContextSection 
            predictions={filteredPredictions}
            analysisResults={analysisResults}
          />

          {/* Prop Finder Section */}
          <PropFinder 
            predictions={filteredPredictions}
            gameData={analysisResults}
          />
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