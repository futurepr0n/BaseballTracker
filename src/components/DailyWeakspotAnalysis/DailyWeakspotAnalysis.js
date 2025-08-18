import React, { useState, useEffect, useCallback } from 'react';
import MatchupSelector from './components/MatchupSelector';
import AnalysisTabs from './components/AnalysisTabs';
import OpportunityClassifier from './components/OpportunityClassifier';
import ExportTools from './components/ExportTools';
import { useBaseballAnalysis } from '../../services/baseballAnalysisService';
import { weakspotService } from './services/weakspotService';
import { normalizeGamesVenues } from '../../utils/venueNormalizer';
import { normalizeToEnglish, findPlayerInRoster } from '../../utils/universalNameNormalizer';
import GlobalTooltip from '../utils/GlobalTooltip';
import './DailyWeakspotAnalysis.css';

const DailyWeakspotAnalysis = ({ playerData, teamData, gameData, currentDate }) => {
  // Ensure proper date format (YYYY-MM-DD string) without timezone conversion
  const formatDateForInput = (date) => {
    if (!date) {
      // Get current date without timezone issues
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (typeof date === 'string') return date;
    // For Date objects, format manually to avoid timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  // State management
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(currentDate));
  const [selectedGames, setSelectedGames] = useState([]);
  const [weakspotAnalysis, setWeakspotAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [classificationMode, setClassificationMode] = useState('confidence');
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const [currentMatchups, setCurrentMatchups] = useState([]);
  const [rostersData, setRostersData] = useState([]);
  
  // Baseball API integration
  const { 
    initialized, 
    loading: apiLoading, 
    error: apiError, 
    analyzePitcherVsTeam,
    // batchAnalysis,
    service
  } = useBaseballAnalysis();

  // Load rosters data for name normalization
  useEffect(() => {
    const loadRostersData = async () => {
      try {
        const response = await fetch('/data/rosters.json');
        if (response.ok) {
          const rosters = await response.json();
          setRostersData(rosters);
        } else {
          console.warn('Failed to load rosters data for name normalization');
        }
      } catch (error) {
        console.error('Error loading rosters data:', error);
      }
    };

    loadRostersData();
  }, []);

  // Sync with currentDate changes from app-level date selector
  useEffect(() => {
    if (currentDate) {
      setSelectedDate(formatDateForInput(currentDate));
    }
  }, [currentDate]);

  // Load scheduled games for selected date
  useEffect(() => {
    const loadScheduledGames = async () => {
      if (!selectedDate) return;

      try {
        // Use selectedDate directly without timezone conversion
        const dateStr = selectedDate;
        const response = await fetch(`/data/lineups/starting_lineups_${dateStr}.json`);
        
        if (response.ok) {
          const lineupData = await response.json();
          // Normalize venue data to handle object/string inconsistencies
          const normalizedGames = normalizeGamesVenues(lineupData.games || []);
          setSelectedGames(normalizedGames);
        } else {
          // Fallback to game data if lineups not available
          const games = gameData?.filter(game => {
            // Compare dates directly without timezone conversion
            const gameDate = typeof game.date === 'string' ? game.date : game.date.toISOString().split('T')[0];
            return gameDate === dateStr;
          }) || [];
          // Normalize venues for consistency
          const normalizedGames = normalizeGamesVenues(games);
          setSelectedGames(normalizedGames);
        }
      } catch (error) {
        console.error('Error loading scheduled games:', error);
        setSelectedGames([]);
      }
    };

    loadScheduledGames();
  }, [selectedDate, gameData]);

  // Normalize pitcher name using universal name normalizer
  const normalizePitcherName = useCallback((pitcherName) => {
    if (!pitcherName || !rostersData.length) {
      return pitcherName;
    }

    console.log(`🎯 DAILY WEAKSPOT: Normalizing pitcher name "${pitcherName}"`);
    
    // Try to find the player in roster data for accurate name
    const rosterMatch = findPlayerInRoster(pitcherName, rostersData);
    if (rosterMatch) {
      console.log(`🎯 DAILY WEAKSPOT: Found roster match for "${pitcherName}" -> "${rosterMatch.fullName || rosterMatch.name}"`);
      return rosterMatch.fullName || rosterMatch.name;
    }

    // If no roster match, use universal name normalizer
    const normalized = normalizeToEnglish(pitcherName);
    console.log(`🎯 DAILY WEAKSPOT: Normalized "${pitcherName}" -> "${normalized}"`);
    return normalized;
  }, [rostersData]);

  // Enhance results with Baseball API
  const enhanceWithBaseballAPI = useCallback(async (weakspotResults) => {
    const enhancedOpportunities = [];

    for (const opportunity of weakspotResults.opportunities || []) {
      try {
        // Normalize pitcher name for BaseballAPI call
        const normalizedPitcherName = normalizePitcherName(opportunity.pitcher);
        console.log(`🎯 DAILY WEAKSPOT API ENHANCE: Using normalized pitcher name "${normalizedPitcherName}" for API call`);
        
        // Call Baseball API for this pitcher vs opposing team
        const apiResult = await analyzePitcherVsTeam(
          normalizedPitcherName,
          opportunity.opposing_team
        );

        const enhanced = {
          ...opportunity,
          apiEnhanced: true,
          predictions: apiResult.predictions || [],
          confidence_score: apiResult.confidence_score || opportunity.confidence_score,
          additional_metrics: {
            hr_probability: apiResult.predictions?.[0]?.hr_probability,
            hit_probability: apiResult.predictions?.[0]?.hit_probability,
            api_score: apiResult.predictions?.[0]?.hr_score
          }
        };

        enhancedOpportunities.push(enhanced);
      } catch (error) {
        console.warn(`Failed to enhance ${opportunity.pitcher} vs ${opportunity.team}:`, error);
        enhancedOpportunities.push(opportunity);
      }
    }

    return {
      ...weakspotResults,
      opportunities: enhancedOpportunities,
      enhanced_with_api: true
    };
  }, [analyzePitcherVsTeam, normalizePitcherName]);

  // Main analysis function
  const runWeakspotAnalysis = useCallback(async (games = selectedGames) => {
    if (!games || games.length === 0) {
      setAnalysisError('No games available for the selected date');
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
      // Extract pitchers from games - handle both lineup and fallback formats
      const matchups = games.map(game => {
        // Handle lineup data format
        if (game.teams && game.pitchers) {
          const rawAwayPitcher = game.pitchers.away?.name;
          const rawHomePitcher = game.pitchers.home?.name;
          
          const matchup = {
            awayPitcher: normalizePitcherName(rawAwayPitcher),
            awayTeam: game.teams.away?.abbr,
            homePitcher: normalizePitcherName(rawHomePitcher),
            homeTeam: game.teams.home?.abbr,
            gameId: game.gameId,
            venue: game.venue?.name || game.venue,
            gameTime: game.gameTime,
            // Keep original names for debugging
            originalAwayPitcher: rawAwayPitcher,
            originalHomePitcher: rawHomePitcher
          };
          console.log('🎯 DAILY WEAKSPOT: Lineup format matchup (normalized):', matchup);
          return matchup;
        } else {
          // Handle fallback game data format
          const rawAwayPitcher = game.away_pitcher || game.awayPitcher;
          const rawHomePitcher = game.home_pitcher || game.homePitcher;
          
          const matchup = {
            awayPitcher: normalizePitcherName(rawAwayPitcher),
            awayTeam: game.away_team || game.awayTeam,
            homePitcher: normalizePitcherName(rawHomePitcher),
            homeTeam: game.home_team || game.homeTeam,
            gameId: game.id || game.gameId,
            venue: game.venue,
            gameTime: game.time || game.gameTime,
            // Keep original names for debugging
            originalAwayPitcher: rawAwayPitcher,
            originalHomePitcher: rawHomePitcher
          };
          console.log('🎯 DAILY WEAKSPOT: Fallback format matchup (normalized):', matchup);
          return matchup;
        }
      });

      // Store matchups for use in BatterOpportunitySection
      setCurrentMatchups(matchups);

      // Run weakspot analysis using our play-by-play data integration
      // Use selectedDate directly to avoid timezone conversion issues
      const weakspotResults = await weakspotService.runDailyWeakspotAnalysis(
        matchups, 
        selectedDate
      );

      // Enhance with Baseball API if available
      let enhancedResults = weakspotResults;
      if (initialized && service) {
        try {
          enhancedResults = await enhanceWithBaseballAPI(weakspotResults);
        } catch (apiError) {
          console.warn('Failed to enhance with Baseball API:', apiError);
          // Continue with basic results
        }
      }

      console.log('🎯 WEAKSPOT ANALYSIS RESULTS:', enhancedResults);
      console.log('🎯 OPPORTUNITIES COUNT:', enhancedResults.weakspot_opportunities?.length || 0);
      console.log('🎯 MATCHUP ANALYSIS:', enhancedResults.matchup_analysis);
      
      setWeakspotAnalysis(enhancedResults);
      setFilteredOpportunities(enhancedResults.weakspot_opportunities || []);
      
    } catch (error) {
      setAnalysisError(`Analysis failed: ${error.message}`);
      setWeakspotAnalysis(null);
      setFilteredOpportunities([]);
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedGames, selectedDate, initialized, service, enhanceWithBaseballAPI, normalizePitcherName]);


  // Handle classification mode change
  const handleClassificationChange = useCallback((mode) => {
    setClassificationMode(mode);
    
    if (!weakspotAnalysis?.weakspot_opportunities) return;
    
    let filtered = [...weakspotAnalysis.weakspot_opportunities];
    
    switch (mode) {
      case 'confidence':
        filtered.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
        break;
      case 'position':
        filtered.sort((a, b) => (b.position_vulnerability || 0) - (a.position_vulnerability || 0));
        break;
      case 'timing':
        filtered.sort((a, b) => (b.inning_vulnerability || 0) - (a.inning_vulnerability || 0));
        break;
      case 'arsenal':
        filtered.sort((a, b) => (b.arsenal_advantage || 0) - (a.arsenal_advantage || 0));
        break;
      default:
        break;
    }
    
    setFilteredOpportunities(filtered);
  }, [weakspotAnalysis]);

  // Loading states
  if (apiLoading) {
    return (
      <div className="daily-matchup-analysis loading-container">
        <div className="loading-spinner"></div>
        <h2>Loading Analysis System...</h2>
        <p>Initializing baseball data and models...</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="daily-matchup-analysis error-container">
        <h2>System Error</h2>
        <p>{apiError}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  return (
    <div className="daily-matchup-analysis">
      <div className="analysis-header">
        <h1>Daily Weakspot Analysis</h1>
        <p>Comprehensive weakspot and opportunity intelligence for scheduled games</p>
      </div>

      <div className="analysis-content">
        {/* Date and Game Selection */}
        <MatchupSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedGames={selectedGames}
          onGamesChange={setSelectedGames}
          onAnalyze={(selectedGamesList) => runWeakspotAnalysis(selectedGamesList)}
          loading={analysisLoading}
          gamesCount={selectedGames.length}
        />

        {/* Error Display */}
        {analysisError && (
          <div className="analysis-error">
            <h3>Analysis Error</h3>
            <p>{analysisError}</p>
            <button onClick={() => runWeakspotAnalysis()}>Retry Analysis</button>
          </div>
        )}

        {/* Analysis Results */}
        {weakspotAnalysis && (
          <>
            {/* Opportunity Classification */}
            <OpportunityClassifier
              opportunities={filteredOpportunities}
              classificationMode={classificationMode}
              onClassificationChange={handleClassificationChange}
              totalOpportunities={weakspotAnalysis.opportunities?.length || 0}
            />

            {/* Tabbed Analysis Interface */}
            <AnalysisTabs
              analysis={weakspotAnalysis}
              opportunities={filteredOpportunities}
              loading={analysisLoading}
              enhanced={weakspotAnalysis.enhanced_with_api}
              matchups={currentMatchups}
            />

            {/* Export Tools */}
            <ExportTools
              analysis={weakspotAnalysis}
              opportunities={filteredOpportunities}
              selectedDate={selectedDate}
              classificationMode={classificationMode}
            />
          </>
        )}

        {/* Help Section */}
        <div className="analysis-help">
          <h3>How to Use Daily Weakspot Analysis</h3>
          <div className="help-grid">
            <div className="help-item">
              <h4>1. Select Date</h4>
              <p>Choose the game date you want to analyze. The system will load scheduled games and lineups.</p>
            </div>
            <div className="help-item">
              <h4>2. Run Analysis</h4>
              <p>Click "Analyze Matchups" to run comprehensive weakspot analysis on all pitchers for the day.</p>
            </div>
            <div className="help-item">
              <h4>3. Review Opportunities</h4>
              <p>Browse classified opportunities by confidence, position vulnerabilities, timing windows, and arsenal advantages.</p>
            </div>
            <div className="help-item">
              <h4>4. Research & Export</h4>
              <p>Use export tools to save your analysis and compare across different dates for season-long insights.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Tooltip for dashboard card insights */}
      <GlobalTooltip />
    </div>
  );
};

export default DailyWeakspotAnalysis;